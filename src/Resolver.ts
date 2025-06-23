
import { YouMeKa } from "./YouMeKa";
import { 
  Stmt,
  type Visitor as StmtVisitor,
  Block as BlockStmt,
  Case as CaseStmt,
  Qlass as QlassStmt,
  Expression as ExpressionStmt,
  Func as FunctionStmt,
  If as IfStmt,
  Import as ImportStmt,
  Print as PrintStmt,
  Puts as PutsStmt,
  Return as ReturnStmt,
  Var as VarStmt,
  While as WhileStmt,
} from "./Stmt";

import { 
  Expr,
  type Visitor as ExprVisitor,
  Pair,
  Assign as AssignExpr,
  ArrayIndex as ArrayIndexExpr,
  ArrayAssign as ArrayAssignExpr,
  Binary as BinaryExpr,
  Block as BlockExpr,
  Call as CallExpr,
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
  Prefix as PrefixExpr,
  Postfix as PostfixExpr,
  Set as SetExpr,
  Spread as SpreadExpr,
  Super as SuperExpr,
  This as ThisExpr,
  Unary as UnaryExpr,
  Undefined as UndefinedExpr,
  Variable as VariableExpr,
  CompoundAssign,
  Func as FuncExpr,
} from "./Expr";

import { Token } from "./Token";

import { Stack } from "./Stack";

import { Interpreter } from "./Interpreter";

enum FunctionType {
  NONE,
  // function-type-method
  FUNCTION,
  // function-type-initializer
  INITIALIZER,
  METHOD,
  LAMBDA
}
enum ClassType {
  NONE,
  CLASS,
  SUBCLASS
}
export class Resolver implements ExprVisitor<VoidFunction | null>, StmtVisitor<VoidFunction | null>  {

  private scopes = new Stack<Map<String, Boolean>>();

  private currentFunction: FunctionType = FunctionType.NONE;
  private currentClass: ClassType = ClassType.NONE;
  constructor(private interpreter: Interpreter) {}

  resolve(statements: 
    (Stmt | null)[] 
    | Stmt
    | Expr
    | null): void {
    if (Array.isArray(statements)) {
      for (const statement of statements) {
        this.resolve(statement);
      }
    } else if (statements instanceof Stmt) {
      const stmt = statements;
      stmt.accept(this as unknown as StmtVisitor<VoidFunction | null>);
    } else if (statements instanceof Expr) {
      const expr = statements;
      expr.accept(this as unknown as ExprVisitor<VoidFunction | null>)
    }
  }

  private resolveFunction(func: FunctionStmt, type: FunctionType): void {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;

    this.beginScope();
    for (const param of func.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolve(func.body);
    this.endScope();
    // restore-current-function
    this.currentFunction = enclosingFunction;
  }

  private resolveFunctionExpr(func: FuncExpr, type: FunctionType) {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;

    this.beginScope();
    for (const param of func.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolve(func.body);
    this.endScope();

    this.currentFunction = enclosingFunction;
  }

  public visitBlockStmt(stmt: BlockStmt): VoidFunction | null {
    this.beginScope();
    this.resolve(stmt.statements);
    this.endScope();
    return null;
  }

  public visitCaseStmt(stmt: CaseStmt): VoidFunction | null {
    this.resolve(stmt.expression);
    for (const clause of stmt.whenClauses) {
      this.resolve(clause.match);
      this.resolve(clause.body);
    }
    if (stmt.elseBranch != null) {
      this.resolve(stmt.elseBranch);
    }

    return null;
  }

  public visitQlassStmt(stmt: QlassStmt): VoidFunction | null {
    const enclosingClass = this.currentClass;
    this.currentClass = ClassType.CLASS;

    // set-current-class
    this.declare(stmt.name);
    this.define(stmt.name);

    // inherit-self
    if (stmt.superclass != null &&
        stmt.name.lexeme === stmt.superclass.name.lexeme) {
      YouMeKa.error(stmt.superclass.name,
          "A class can't inherit from itself.");
    }

    if (stmt.superclass != null) {
      // set-current-subclass
      this.currentClass = ClassType.SUBCLASS;
      this.resolve(stmt.superclass);
    }

    // Inheritance begin-super-scope
    if (stmt.superclass != null) {
      this.beginScope();
      this.scopes.peek()?.set("super", true);
    }

    // resolve-methods
    // resolver-begin-this-scope
    this.beginScope();
    this.scopes.peek()?.set("this", true);

    for (const method of stmt.methods) {
      let declaration = FunctionType.METHOD;

      if (method.name.lexeme === "init") {
        declaration = FunctionType.INITIALIZER;
      }

      this.resolveFunction(method, declaration);
    }

    // resolver-end-this-scope
    this.endScope();

    // Inheritance end-super-scope
    if (stmt.superclass != null) this.endScope();

    // restore-current-class
    this.currentClass = enclosingClass;

    return null;
  }

  public visitExpressionStmt(stmt: ExpressionStmt) {
    this.resolve(stmt.expression);
    return null;
  }

  public visitFunctionStmt(stmt: FunctionStmt) {
    this.declare(stmt.name);
    this.define(stmt.name);

    // pass-function-type
    this.resolveFunction(stmt, FunctionType.FUNCTION);
    return null;
  }

  public visitIfStmt(stmt: IfStmt) {
    this.resolve(stmt.condition);
    this.resolve(stmt.thenBranch);
    if (stmt.elseBranch != null) this.resolve(stmt.elseBranch);
    return null;
  }

  public visitImportStmt(stmt: ImportStmt) {
    this.declare(stmt.alias);
    this.define(stmt.alias);
    return null;
  }

  public visitPrintStmt(stmt: PrintStmt) {
    this.resolve(stmt.expression);
    return null;
  }

  public visitPutsStmt(stmt: PutsStmt) {
    this.resolve(stmt.expression);
    return null;
  }

  public visitReturnStmt(stmt: ReturnStmt) {
//     if (this.currentFunction == FunctionType.NONE) {
// //      YouMeKa.error(stmt.keyword, "Can't return from top-level code.");
//     }

    if (stmt.value != null) {
      // Classes return-in-initializer
      if (this.currentFunction == FunctionType.INITIALIZER) {
        YouMeKa.error(stmt.keyword, "Can't return a value from an initializer.");
      }

      this.resolve(stmt.value);
    }
    return null;
  }

  public visitVarStmt(stmt: VarStmt) {
    this.declare(stmt.name);
    if (stmt.initializer != null) {
      this.resolve(stmt.initializer);
    }
    this.define(stmt.name);
    return null;
  }

  public visitWhileStmt(stmt: WhileStmt) {
    this.resolve(stmt.condition);
    this.resolve(stmt.body);
    return null;
  }

  public visitArrayAssignExpr(expr: ArrayAssignExpr) {
    this.resolve(expr.array);
    this.resolve(expr.index);
    this.resolve(expr.value);
    return null;
  }

  public visitListLiteralExpr(expr: ListLiteralExpr) {
    if (expr.elements === null) return null;
    for (const element of expr.elements) {
      this.resolve(element);
    }
    return null;
  }

  public visitSpreadExpr(expr: SpreadExpr) {
    this.resolve(expr.expression);
    return null;
  }

  public visitArrayIndexExpr(expr: ArrayIndexExpr) {
    this.resolve(expr.array);
    this.resolve(expr.index);
    return null;
  }

  public visitAssignExpr(expr: AssignExpr) {
    this.resolve(expr.value);
    this.resolveLocal(expr, expr.name);
    return null;
  }

  public visitBinaryExpr(expr: BinaryExpr) {
    this.resolve(expr.left);
    this.resolve(expr.right);
    return null;
  }

  public visitBlockExpr(expr: BlockExpr) {
    this.resolve(expr.statements);
    return null;
  }

  public visitCallExpr(expr: CallExpr) {
    this.resolve(expr.callee);

    for (const argument of expr.args) {
      this.resolve(argument);
    }

    return null;
  }

  public visitCaseExpr(expr: CaseExpr) {
    this.resolve(expr.expression);
    for (const clause of expr.whenClauses) {
      this.resolve(clause.match);
      this.resolve(clause.result);
    }
    if (expr.elseBranch != null) {
      this.resolve(expr.elseBranch);
    }

    return null;
  }

  public visitCompoundAssignExpr(expr: CompoundAssign) {
    this.resolveLocal(expr, expr.name);
    this.resolve(expr.value);
    return null;
  }

  public visitFunctionExpr(expr: FuncExpr): VoidFunction | null {
    this.resolveFunctionExpr(expr, FunctionType.FUNCTION);
    return null;
  }

  public visitGetExpr(expr: GetExpr) {
    this.resolve(expr.object);
    return null;
  }

  public visitGroupingExpr(expr: GroupingExpr) {
    this.resolve(expr.expression);
    return null;
  }

  public visitLambdaExpr(expr: LambdaExpr) {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = FunctionType.LAMBDA;

    this.beginScope();
    for (const param of expr.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolve(expr.body);
    this.endScope();

    this.currentFunction = enclosingFunction;
    return null;
  }

  public visitListComprehensionExpr(expr: ListComprehensionExpr) {
    this.resolve(expr.iterable);
    if (expr.condition != null)
      this.resolve(expr.condition);
    this.resolve(expr.elementExpr);
    return null;
  }

  public visitLiteralExpr(_expr: LiteralExpr) { return null; }

  public visitLogicalExpr(expr: LogicalExpr) {
    this.resolve(expr.left);
    this.resolve(expr.right);
    return null;
  }

  public visitNewTypedArrayExpr(expr: NewTypedArrayExpr) {
    this.resolve(expr.size);
    return null;
  }

  public visitObjectLiteralExpr(expr: ObjectLiteralExpr) {
    const props = expr.properties;
    if (props === null) return null;
    for (const prop of props) {
      if (prop instanceof Pair) {
        const pair = prop;
        this.resolve(pair.value);
      } else if (prop instanceof SpreadExpr) {
        const spread = prop;
        this.resolve(spread.expression);
      }
    }

    return null;
  }

  public visitPostfixExpr(expr: PostfixExpr) {
    this.resolve(expr.variable);
    return null;
  }

  public visitPrefixExpr(expr: PrefixExpr) {
    this.resolve(expr.variable);
    return null;
  }

  public visitSetExpr(expr: SetExpr) {
    this.resolve(expr.value);
    this.resolve(expr.object);
    return null;
  }

  public visitSuperExpr(expr: SuperExpr) {
    // invalid-super
    if (this.currentClass == ClassType.NONE) {
      YouMeKa.error(expr.keyword,
          "Can't use 'super' outside of a class.");
    } else if (this.currentClass != ClassType.SUBCLASS) {
      YouMeKa.error(expr.keyword,
          "Can't use 'super' in a class with no superclass.");
    }

    this.resolveLocal(expr, expr.keyword);
    return null;
  }

  public visitThisExpr(expr: ThisExpr) {
    // this-outside-of-class
//    if (currentClass == ClassType.NONE) {
//      YouMeKa.error(expr.keyword, "Can't use 'this' outside of a class.");
//      return null;
//    }

    this.resolveLocal(expr, expr.keyword);
    return null;
  }

  public visitUnaryExpr(expr: UnaryExpr) {
    this.resolve(expr.right);
    return null;
  }

  public visitUndefinedExpr(_expr: UndefinedExpr) {
    return null;
  }

  public visitVariableExpr(expr: VariableExpr) {
    if (!this.scopes.isEmpty() &&
    this.scopes.peek()?.get(expr.name.lexeme) === false) {
      YouMeKa.error(expr.name,
          "Can't read local variable in its own initializer.");
    }

    this.resolveLocal(expr, expr.name);
    return null;
  }


  private beginScope(): void { this.scopes.push(new Map<String, Boolean>()); }
  private endScope(): void { this.scopes.pop(); }
  private declare(name: Token): void {
    if (this.scopes.isEmpty()) return;

    const scope = this.scopes.peek();
    // duplicate-variable
    if (scope?.has(name.lexeme)) {
      YouMeKa.error(name,
          "Already declared in this scope.");
    }

    scope?.set(name.lexeme, false);
  }

  private define(name: Token): void {
    if (this.scopes.isEmpty()) return;
    this.scopes.peek()?.set(name.lexeme, true);
  }

  private resolveLocal(expr: Expr, name: Token): void {
    for (let i = this.scopes.size() - 1; i >= 0; i--) {
      if (this.scopes.get(i)?.has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.size() - i);
      }
    }
  }


}
