import { YouMeKa } from "./YouMeKa"
import { Environment } from "./Environment";
import { Token } from "./Token";
import { TokenType } from "./TokenType";
import { YmkUndefined } from "./YmkUndefined";
import { Return } from "./Return";
import { 
  Stmt,
  type Visitor as StmtVisitor,
  Case as CaseStmt,
  Block as BlockStmt,
  Expression as ExpressionStmt,
  If as IfStmt,
  Import as ImportStmt,
  Func as FuncStmt,
  Print as PrintStmt,
  Puts as PutsStmt,
  Return as ReturnStmt,
  Var as VarStmt,
  While as WhileStmt,
  Qlass as QlassStmt,
} from "./Stmt";

import { 
  Expr,
  SpreadProperty,
  type Visitor as ExprVisitor,
  Assign as AssignExpr,
  Block as BlockExpr,
  Call as CallExpr,
  ArrayAssign as ArrayAssignExpr,
  ArrayIndex as ArrayIndexExpr,
  Pair as PairExpr,
  Binary as BinaryExpr,
  Case as CaseExpr,
  Get as GetExpr,
  Grouping as GroupingExpr,
  Lambda as LambdaExpr,
  ListComprehension as ListComprehensionExpr,
  ListLiteral as ListLiteralExpr,
  Literal as LiteralExpr,
  Logical as LogicalExpr,
  NewTypedArray as NewTypedArrayExpr,
  ObjectLiteral as ObjectLiteralExpr,
  Postfix as PostfixExpr,
  Prefix as PrefixExpr,
  Set as SetExpr,
  Spread as SpreadExpr,
  Super as SuperExpr,
  This as ThisExpr,
  Unary as UnaryExpr,
  Undefined as UndefinedExpr,
  Variable as VariableExpr,
  CompoundAssign,
} from "./Expr";

import { 
  type YmkCallable, YmkFunction, YmkLambda, YmkClass,
  isString,
  isYmkClass,
  isYmkInstance,
  isYmkCallable,
  isNumber,
  isBoolean,
} from "./object";
import { YmkInstance } from "./YmkInstance";

import { RuntimeError, ReferenceError, UndefinedException } from "./RuntimeError";

import { Parser } from "./Parser";

import { Scanner } from "./Scanner";

import builtins from "./builtins";

// @ts-ignore
import * as fs from 'fs';

export class Interpreter implements ExprVisitor<Object | undefined | null>, StmtVisitor<VoidFunction | null> {
  globals: Environment;
  private environment: Environment;

  private locals: Map<Expr, Number> = new Map();

  constructor(env: Environment | null = null) {
    if (env === null){
      this.globals = new Environment();
    } else {
      this.globals = env;
    }
    this.environment = this.globals;

    this.initGlobalDefinitions(this.globals);
  }

  initGlobalDefinitions(globalEnv: Environment): void {
    globalEnv.define("undefined", new YmkUndefined());
    globalEnv.define("typeof", {
      arity: () => 1,

      call: (_interpreter: Interpreter, args: Object[]) => {
        const value = args[0];

        return this.getTypeName(value);
      },

      toString: () =>"<native fn typeof>",

    } as YmkCallable);
    builtins(globalEnv);
  }

  getEnvironment(): Environment {
    return this.environment;
  }

  interpret(statements: (Stmt | null)[]): void {
    try {
      for (let statement of statements) {
        this.execute(statement);
      }
    } catch (error) {
      if (error instanceof RuntimeError) {
        YouMeKa.runtimeError(error);
      }
      else throw error;
    }
  }

  private evaluate(expr: Expr): Object {
    return expr.accept(this as unknown as ExprVisitor<Object>);
  }

  private execute(stmt: Stmt | null): void {
    if (stmt === null)
      throw new RuntimeError(null,
    `NullException: statement is null`);
    stmt.accept(this as unknown as StmtVisitor<VoidFunction>);
  }

  resolve(expr: Expr, depth: number): void {
    this.locals.set(expr, depth);
  }
  resolveLogical(expr: Expr, depth: number): boolean {
    if (expr instanceof VariableExpr) {
      this.resolve(expr, depth);
      return true;
    }
    if (expr instanceof BinaryExpr) {
      const leftResult = this.resolveLogical((expr as BinaryExpr).left, depth);
      const rightResult = this.resolveLogical((expr as BinaryExpr).right, depth);
      return leftResult || rightResult;
    } else if (expr instanceof UnaryExpr) {
      return this.resolveLogical((expr as UnaryExpr).right, depth);
    }

    return false;
  }

  executeBlock(statements: (Stmt | null)[], environment: Environment): void {
    const previous = this.environment;
    try {
      this.environment = environment;

      for (const statement of statements) {
        this.execute(statement);
      }
    } finally {
      this.environment = previous;
    }
  }

  evaluateExpr(expr: Expr, environment: Environment): Object {
    const previous = this.environment;
    try {
      this.environment = environment;
      return this.evaluate(expr);
    } finally {
      this.environment = previous;
    }
  }


  visitBlockStmt(stmt: BlockStmt): VoidFunction | null {
    this.executeBlock(stmt.statements,
      new Environment(this.environment));
    return null;
  }

  visitCaseStmt(stmt: CaseStmt): VoidFunction | null {
    const value = this.evaluate(stmt.expression);

    for (const clause of stmt.whenClauses) {
      const match = this.evaluate(clause.match);
      if (this.isEqual(value, match)) {
        this.execute(clause.body);
        return null;
      }
    }

    if (stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch);
    }

    return null;
  }

  visitQlassStmt(stmt: QlassStmt): VoidFunction | null {
    let superclass: Object | null = null;
    if (stmt.superclass !== null) {
      superclass = this.evaluate(stmt.superclass);
      if (!(isYmkClass(superclass))) {
        throw new RuntimeError(stmt.superclass.name,
          "Superclass must be a class.");
      }
    }

    // Inheritance interpret-superclass
    this.environment.define(stmt.name.lexeme, null);

    // Inheritace begin-superclass-environment
    if (stmt.superclass !== null) {
      this.environment = new Environment(this.environment);
      this.environment.define("super", superclass);
    }

    // interpret-methods
    const methods = new Map<String, YmkFunction>();
    for (const method of stmt.methods) {
      const func: YmkFunction = new YmkFunction(
        method, this.environment,
      method.name.lexeme === "init");
      methods.set(method.name.lexeme, func);
    }

    // Inheritance interpreter-construct-class
    const klass = new YmkClass(stmt.name.lexeme,
      superclass as YmkClass, methods);

    if (superclass !== null)
      this.environment = this.environment.enclosing!;

    this.environment.assign(stmt.name, klass);
    return null;
  }

  visitExpressionStmt(stmt: ExpressionStmt): VoidFunction | null {
    this.evaluate(stmt.expression);
    return null;
  }

  visitFunctionStmt(stmt: FuncStmt): VoidFunction | null {
    const func = new YmkFunction(stmt, this.environment, false);

    this.environment.define(stmt.name.lexeme, func);
    return null;
  }

  visitIfStmt(stmt: IfStmt): VoidFunction | null {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch);
    }

    return null;
  }

  visitImportStmt(stmt: ImportStmt): VoidFunction | null {
    let path = '';
    const aliasName = stmt.alias.lexeme;

    for (let i = 0; i < stmt.pathParts.length; i++) {
      path += stmt.pathParts[i].lexeme;
      if (i < stmt.pathParts.length - 1) {
        path += '/';
      }
    }

    // @ts-ignore
    let sourcePath = process.cwd() + '/' + this.resolveModulePath(path);

    let source;
    try {
      source = fs.readFileSync(sourcePath, "utf8");

    } catch (error) {
      throw new RuntimeError(null,
        `Cannot read module '${sourcePath}'.`);
    }

    let statements = new Parser(new Scanner(source).scanTokens()).parse();

    const moduleEnv = new Environment(); // isolated

    const moduleInterpreter = new Interpreter(moduleEnv);
    for (const s of statements) {
      moduleInterpreter.interpret([s]);
    }

    const moduleKlass = new YmkClass("Module", null,
      new Map());
    const namespace = new YmkInstance(moduleKlass);
    moduleEnv.forEach((k, v) => namespace.set(k, v));
    this.environment.define(aliasName, namespace);

    return null;
  }

  private resolveModulePath(importPath: string): string {
    // Normalize to use forward slashes
    const normalized = importPath.replace('.', '/');

    const extensions = ['.lm', '.matt', '.luqas'];

    for (const ext of extensions) {
      const candidate = `${normalized}${ext}`;
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    throw new RuntimeError(null,
      `Module '${importPath}' not found.`);
  }

  visitPrintStmt(stmt: PrintStmt): VoidFunction | null {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
    return null;
  }

  visitPutsStmt(stmt: PutsStmt): VoidFunction | null {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
    return null;
  }

  visitReturnStmt(stmt: ReturnStmt): VoidFunction | null {
    let value: Object | null = null;
    if (stmt.value !== null) value = this.evaluate(stmt.value);

    throw new Return(value);
  }

  visitVarStmt(stmt: VarStmt): VoidFunction | null {
    let value: null | Object = null;
    if (stmt.initializer !== null) {
      value = this.evaluate(stmt.initializer);
    }

    this.environment.define(stmt.name.lexeme, value);
    return null;
  }

  visitWhileStmt(stmt: WhileStmt): VoidFunction | null {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }

    return null;
  }

  visitListLiteralExpr(expr: ListLiteralExpr): Object {

    const result = new Array<Object>();

    if (expr.elements == null) return result;
    for (const element of expr.elements) {
      if (element instanceof SpreadExpr) {
        const spread = element as SpreadExpr;
        const spreadValue = this.evaluate(spread);
        if (Array.isArray(spreadValue)) {
          const list = spreadValue as [];
          result.push(...list);
        } else {
          throw new RuntimeError(null,
              "Spread target must be a list.");
        }
      } else {
        result.push(this.evaluate(element));
      }
    }
    return result;
  }

  visitArrayAssignExpr(expr: ArrayAssignExpr): Object {

    const arrayOrMapOrObjInstance = this.evaluate(expr.array);
    const index = this.evaluate(expr.index);
    const value = this.evaluate(expr.value);

    if (!(Array.isArray(arrayOrMapOrObjInstance) || arrayOrMapOrObjInstance instanceof Map || isYmkInstance(arrayOrMapOrObjInstance) )) {
      throw new RuntimeError(null, "Can only index arrays or object literals.");
    } else if (Array.isArray(arrayOrMapOrObjInstance)) {
      if (!isNumber(index)) {
        throw new RuntimeError(null, "Index must be a number.");
      }
    } else if (arrayOrMapOrObjInstance instanceof Map) {
      if (!(isString(index))) {
        throw new RuntimeError(null, "Key must be a valid.");
      }
    }
    if (!(isNumber(value) || isString(value) || Array.isArray(value)|| value instanceof Map)) {
      throw new RuntimeError(expr.name, "Value must be a number, string, or array.");
    }

    if (Array.isArray(arrayOrMapOrObjInstance)) {
      const i = Number(index);
      const list = arrayOrMapOrObjInstance as Array<Object>;
      list.push(i, value);

      return value;
    } else if (arrayOrMapOrObjInstance instanceof Map) {
      const key = index.toString();
      const map = arrayOrMapOrObjInstance as Map<String, Object>;
      map.set(key, value);

      return value;
    } else if (isYmkInstance(arrayOrMapOrObjInstance)) {
      const instance = arrayOrMapOrObjInstance as unknown as YmkInstance;
      const key = index.toString();
      instance.set(key, value);

      return value;
    }

    throw new RuntimeError(expr.name, "Cannot assign an array element to non-array.");
  }

  visitArrayIndexExpr(expr: ArrayIndexExpr): Object | null | undefined {

    const arrayOrMapOrObjInstance = this.evaluate(expr.array);
    const index = this.evaluate(expr.index);

    if (!(Array.isArray(arrayOrMapOrObjInstance) || arrayOrMapOrObjInstance instanceof Map || isYmkInstance(arrayOrMapOrObjInstance) )) {
      throw new RuntimeError(expr.bracket, "Can only index arrays or objects.");
    } else if (Array.isArray(arrayOrMapOrObjInstance)) {
      if (!isNumber(index)) {
        throw new RuntimeError(expr.bracket, "Index must be a number.");
      }
    } else if (arrayOrMapOrObjInstance instanceof Map) {
      if ( !( typeof index === 'string' || isString(index)) ) {
        throw new RuntimeError(expr.bracket, "Key must be a valid.");
      }
    }

    if ( Array.isArray(arrayOrMapOrObjInstance) ) {
      const list = arrayOrMapOrObjInstance as [];
      const i = Number(index);
      if (i < 0 || i >= list.length) {
        throw new RuntimeError(expr.bracket, "Array index out of bounds.");
      }

      return list[i];
    } else if (arrayOrMapOrObjInstance instanceof Map) {
      const map = arrayOrMapOrObjInstance as Map<any, any>;
      const key = index.toString();
      if (!(map.has(key))) {
        throw new RuntimeError(expr.bracket, "Object doesn't contain key: " + key);
      }

      return map.get(key);
    } else if (arrayOrMapOrObjInstance instanceof YmkInstance) {
     const instance = arrayOrMapOrObjInstance as YmkInstance;
      const key = index.toString();
      if (!instance.containsField(key)) {
        throw new RuntimeError(expr.bracket,
            "Object doesn't contain field: " + key);
      }
      return instance.get(key);
    }
    throw new RuntimeError(expr.bracket, "Cannot recognize object type.");
  }

  visitAssignExpr(expr: AssignExpr): Object {
    const value = this.evaluate(expr.value);

    // Resolving and Binding resolved-assign
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      this.environment.assignAt(Number(distance), expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }

    return value;
  }

  visitBinaryExpr(expr: BinaryExpr): Object {

    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      // binary-equality
      case TokenType.BANG_EQUAL: return !this.isEqual(left, right);
      case TokenType.EQUAL_EQUAL: return this.isEqual(left, right);
      // binary-comparison
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) > Number(right);
      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) >= Number(right);
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) < Number(right);
      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) <= Number(right);
      case TokenType.MINUS:
        // check-minus-operand
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) - Number(right);
      case TokenType.PLUS:
        let retValue = this.binaryAdd(left, right);

        if (retValue) return retValue;

        if (expr.left instanceof VariableExpr && expr.right instanceof VariableExpr) {
          const leftVar = this.evaluate(expr.left);
          const rightVar = this.evaluate(expr.right);
          retValue = this.binaryAdd(leftVar, rightVar);
        }
        if (retValue) return retValue;
        // string-number-wrong-type
        throw new RuntimeError(expr.operator,
            "Operands must be two numbers or two strings.");

      case TokenType.SLASH:
        // check-slash-operand
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) / Number(right);
      case TokenType.STAR:
        // check-star-operand
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) * Number(right);
    }

    // Unreachable.
    throw new RuntimeError(expr.operator,
      "Unrecognized operator");
  }

  binaryAdd(left: Object, right: Object) {
    if (isNumber(left) && isNumber(right)) {
      return left + right;
    }

    if (isString(left) && isString(right)) {
      return left + right;
    }
  }

  visitBlockExpr(expr: BlockExpr): Object {
    try {
      this.executeBlock(expr.statements,
        new Environment(this.environment));
    } catch (error) {
      if (error instanceof Return) {
        return error.value!;
      } else {
        throw error;
      }
    }
    return this.globals.getAt(0, "undefined")!;
  }

  visitCallExpr(expr: CallExpr): Object | undefined | null {

    const callee = this.evaluate(expr.callee);

    const _arguments = new Array<Object>();
    for (const argument of expr.args) {
      _arguments.push(this.evaluate(argument));
    }

    // check-is-callable
    if (!(isYmkCallable(callee))) {
      throw new RuntimeError(expr.paren,
          "Can only call functions and classes.");
    }

    const func = callee as YmkCallable;
    // check-arity
    if (func.arity() != -2 && _arguments.length != func.arity()) {
      throw new RuntimeError(expr.paren, "Expected " +
          func.arity() + " arguments but got " +
          _arguments.length + ".");
    }

    return func.call(this, _arguments);
  }

  visitCaseExpr(expr: CaseExpr): Object | null | undefined {

    const value = this.evaluate(expr.expression);

    for (const clause of expr.whenClauses) {
      const match = this.evaluate(clause.match);
      if (this.isEqual(value, match)) {
        return this.evaluate(clause.result);
      }
    }

    if (expr.elseBranch != null) {
      return this.evaluate(expr.elseBranch);
    }

    return null;
  }

  visitCompoundAssignExpr(expr: CompoundAssign) {
    const oldValue = this.environment.get(expr.name);
    const right = this.evaluate(expr.value);

    if (!isNumber(oldValue) || !isNumber(right)) {
      throw new RuntimeError(expr.operator, 
        "Operands must be numbers.");
    }

    const left = Number(oldValue);
    const rightValue = Number(right);
    let result: number;

    switch (expr.operator.type) {
      case TokenType.PLUS_EQUAL:
        result = left + rightValue;
        break;
      case TokenType.MINUS_EQUAL:
        result = left - rightValue;
        break;
      default:
        throw new RuntimeError(expr.operator,
          "Unknown compound assignment.");
    }

    this.environment.assign(expr.name, result);
    return result;
  }

  visitGetExpr(expr: GetExpr): Object | null | undefined {

    if (expr.object instanceof ThisExpr) {
      this.resolve(expr.object, 0);
    }

    const object = this.evaluate(expr.object);

    // @TODO: implement this functionality
    if ("__class__" === expr.name.lexeme) {
      return this.getTypeName(object);
    }

    if (isYmkInstance(object)) {
      return (object as YmkInstance).get(expr.name);
    }

    if (object instanceof Map) {
      const getValue = (object as Map<String, Object>).get(expr.name.lexeme);
      return  getValue;
    }

    throw new RuntimeError(expr.name,
      "Only instances have properties.");
  }

  visitGroupingExpr(expr: GroupingExpr): Object | null | undefined {
    return this.evaluate(expr.expression);
  }

  visitLambdaExpr(expr: LambdaExpr): Object | null | undefined {

    let thisContext: Object | null | undefined = null;
    if (this.environment.contains("this")) {
      thisContext = this.environment.getAt(0, "this");
    }
    this.resolveLogical(expr.body, 1);
    return new YmkLambda(expr, this.environment, thisContext === undefined ? null : thisContext);
  }

  visitListComprehensionExpr(expr: ListComprehensionExpr): Object | null | undefined {

    const iterable = this.evaluate(expr.iterable);
    if (!(Array.isArray(iterable))) {
      throw new RuntimeError(expr.variable,
          "Expected iterable in list comprehension.");
    }
    const result = new Array<Object>();
    const source = Array.from(iterable);
    for (const item of source) {
      const loopEnv = new Environment(this.environment);
      // scoped loop
      loopEnv.define(expr.variable.lexeme, item);
      if (expr.condition != null) {

        if (!this.resolveLogical(expr.condition, 0)) {
          throw new RuntimeError(expr.variable,
              "Currently supports binary and unary expressions.");
        }
        const cond = this.evaluateWithEnv(expr.condition, loopEnv);
        if (!isNumber(cond) && (!isBoolean(cond) || !!!cond))
          continue;
      }
      this.resolve(expr.elementExpr, 0);
      const value = this.evaluateWithEnv(expr.elementExpr, loopEnv);
      result.push(value);
    }
    return result;
  }

  visitLiteralExpr(expr: LiteralExpr): Object | null | undefined { return expr.value; }

  visitLogicalExpr(expr: LogicalExpr): Object | null | undefined {
    const left = this.evaluate(expr.left);

    if (expr.operator.type === TokenType.OR) {
      if (this.isTruthy(left)) return left;
    } else {
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }

  visitNewTypedArrayExpr(expr: NewTypedArrayExpr): Object | null | undefined {

    const sizeVal = this.evaluate(expr.size);

    if (!isNumber(sizeVal)) {
      throw new RuntimeError(expr.type, "Array size must be a number.");
    }

    const size = Number(sizeVal);
    if (size < 0) {
      throw new RuntimeError(expr.type, "Array size cannot be negative.");
    }

    const typeName = expr.type.lexeme;

    let defaultValue;
    switch (typeName) {
      case "int": case "number":
        defaultValue =  0.0;
        break;
      case "string":
        defaultValue = "";
        break;
      case "bool": case "boolean":
        defaultValue = false;
        break;
      default:
        defaultValue = null;
    };

    const result = new Array<Object | null>(size).fill(defaultValue);
    return result;
  }

  visitObjectLiteralExpr(expr: ObjectLiteralExpr): Object | null | undefined {

    const objectLiteralKlass = new YmkClass("Object", null, new Map());
    const self = new YmkInstance(objectLiteralKlass);

    if (expr.properties == null) return self;

    for (const prop of expr.properties) {
      if (prop instanceof PairExpr) {
        const pair = prop as PairExpr;
        const value = this.evaluate(pair.value);
        if (value instanceof YmkLambda) {
          const valueLambda = value as YmkLambda;
          const lambda = valueLambda.bind(self);
          self.set(pair.key, lambda);
        } else {
          self.set(pair.key, value);
        }
      } else if (prop instanceof SpreadProperty) {
        const spread = prop as SpreadProperty;
        this.resolveLogical(spread.expression, 0);
        const spreadValue = this.evaluate(spread.expression);
        if (spreadValue instanceof Map) {
          const map = spreadValue as Map<any, any>;
          for (const [key, value] of map.entries()) {
            self.set(key.toString(), value);
          }
        } else if (spreadValue instanceof YmkInstance) {
          const instance = spreadValue as YmkInstance;
          self.putAll(instance.getFields());
        } else {
          const v = spread.expression as VariableExpr;
          throw new RuntimeError(
              v ? v.name : null,
              "Spread target must be an object or map.");
        }
      }
    }
    return self;
  }

  visitPostfixExpr(expr: PostfixExpr): Object | null | undefined {

    const value = this.environment.get(expr.variable.name);
    if (!isNumber(value)) {
      throw new RuntimeError(expr.operator, "Operand must be number.");
    }

    const original = Number(value);
    let updated = original;

    switch (expr.operator.type) {
      case TokenType.PLUS_PLUS: updated = original + 1; break;
      case TokenType.MINUS_MINUS: updated = original - 1; break;
      default:
        throw new RuntimeError(expr.operator,
            "Unknown postfix operator.");
    }
    this.environment.assign(expr.variable.name, updated);
    return original;
  }

  visitPrefixExpr(expr: PrefixExpr): Object | null | undefined {

    const value = this.environment.get(expr.variable.name);
    if (!isNumber(value)) {
      throw new RuntimeError(expr.operator, "Operand must be a number.");
    }

    const current = Number(value);
    let updated = current;

    switch (expr.operator.type) {
      case TokenType.PLUS_PLUS: updated = current + 1; break;
      case TokenType.MINUS_MINUS: updated = current - 1; break;
      default:
        throw new RuntimeError(expr.operator, "Unknown prefix operator.");
    }
    this.environment.assign(expr.variable.name, updated);
    return updated;
  }

  visitSetExpr(expr: SetExpr): Object | null | undefined {

    const object = this.evaluate(expr.object);

    if (!(object instanceof YmkInstance)) {
      throw new RuntimeError(expr.name,
          "Only instances have fields.");
    }

    const value = this.evaluate(expr.value);
    (object as YmkInstance).set(expr.name, value);
    return value;
  }

  visitSpreadExpr(expr: SpreadExpr): Object | null | undefined {

    let result: Object[] | undefined;

    this.resolveLogical(expr.expression, 0);
    const spreadValue = this.evaluate(expr.expression);
    if (Array.isArray(spreadValue)) {
      const list = spreadValue as [];
      result = Array.from(list);
    } else {
      throw new RuntimeError(
          null, "Spread target must be a list.");
    }
    return result;
  }

  visitSuperExpr(expr: SuperExpr): Object | null | undefined {

    const distance = this.locals.get(expr);
    const superclass = this.environment.getAt(
        Number(distance!), "super") as YmkClass;

    const object = this.environment.getAt(
        Number(distance!) -  1, "this") as YmkInstance;

    const method = superclass.findMethod(expr.method.lexeme);

    if (method === null) {
      throw new RuntimeError(expr.method,
          "Undefined property '" + expr.method.lexeme + "'.");
    }

    return method.bind(object);
  }

  visitThisExpr(expr: ThisExpr): Object | null | undefined {
    return this.lookUpVariable(expr.keyword, expr);
  }

  visitUnaryExpr(expr: UnaryExpr): Object | null | undefined {

    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.NOT:
      case TokenType.BANG:
        return !this.isTruthy(right);
      case TokenType.MINUS:
        this.checkNumberOperand(expr.operator, right);
        return -Number(right);
    }

    return null;
  }

  visitUndefinedExpr(_expr: UndefinedExpr): Object | null | undefined {
    return this.globals.getAt(0, "undefined");
  }

  visitVariableExpr(expr: VariableExpr): Object | null | undefined {
    return this.lookUpVariable(expr.name, expr);
  }

  private evaluateWithEnv(expr: Expr, env: Environment): Object {
    const previous = this.environment;
    try {
      this.environment = env;
      return this.evaluate(expr);
    } finally {
      this.environment = previous;
    }
  }

  private lookUpVariable(name: Token, expr: Expr) {
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      const value = this.environment.getAt(Number(distance!), name.lexeme);
      return value;
    } else {
      try {
        return this.globals.get(name);
      } catch (error) {
        if (error instanceof UndefinedException) {
          throw new ReferenceError(name,
            `Uncaught ReferenceError: ${name.lexeme} is not defined.`);
        }
      }
    }
  }

  private checkNumberOperand(operator: Token, operand: Object): void {
    if (isNumber(operand)) return;
    throw new RuntimeError(operator, "Operand must be a number.");
  }

  private checkNumberOperands(operator: Token,
    left: Object, right: Object
  ) {
    if (isNumber(left) && isNumber(right)) return;
    throw new RuntimeError(operator, "Operands must be numbers.");
  }

  private getTypeName(value: Object): string {
    if (value === null) return "null";
    if (isNumber(value)) return "Number";
    if (isString(value)) return "String";
    if (isBoolean(value)) return "Boolean";
    if (Array.isArray(value)) return "Array";
    if (value instanceof YmkLambda || value instanceof YmkFunction) return "Function";
    if (value instanceof YmkInstance) return "Object";

    return "Unknown";
  }

  private isTruthy(object: Object): boolean {
    if (object === null) return false;
    if (isBoolean(object)) return object;
    return true;
  }

  private isEqual(a: Object, b: Object): boolean {
    if (a === null && b === null) return true;
    if (a === null) return false;

    return this.equals(a, b);
  }

  private equals(a: any, b: any): boolean {
    if (a === b) {
      return true;
    }
    if (a === null || b === null || typeof a !== b) {
      return false;
    }
    if (typeof a ==='object') {
      if (Array.isArray(a)) {
        if (!Array.isArray(b)) {
          return false;
        }
        return a.length === b.length && a.every((value, index) => this.equals(value, b[index]));
      } else {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        return keysA.length === keysB.length && keysA.every((key => this.equals(a[key], b[key])));
      }
    }
    return a === b;
  }

  private stringifyList(list: Array<any>) {
    let sb = "";
    let notEmpty = false;
    sb += "[";
    for (const element of list) {
      if (isNumber(element)) {
        sb += `${element}, `;
      } else {
        sb += `"${element.toString()}"`;
      }
      if (!notEmpty) {
        notEmpty = true;
      }
    }
    if (notEmpty) {
      sb = sb.substring(0, sb.length - 2);
    }
    sb += "]";
    return sb;
  }

  private stringify(object: Object) {

    if (object === null) return "null";

    if (isNumber(object)) {
      let text = object.toString();
      if (text.endsWith(".0")) {
        text = text.substring(0, text.length - 2);
      }

      return text;
    } else if (object instanceof Array) {
      const list = object as Array<Object>;
      return this.stringifyList(list);
    }

    return object.toString();
  }

}