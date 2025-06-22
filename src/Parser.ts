
import { YouMeKa } from "./YouMeKa";
import { Token } from "./Token";
import { TokenType } from "./TokenType";
import { 
  Stmt,
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
  WhenClause as WhenClauseStmt,
  While as WhileStmt,
} from "./Stmt";

import { 
  Expr,
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
  SpreadProperty,
  Super as SuperExpr,
  This as ThisExpr,
  Unary as UnaryExpr,
  Undefined as UndefinedExpr,
  Variable as VariableExpr,
  WhenClauses as WhenClausesExpr,
} from "./Expr";
import type { Property } from "./Expr";

import { RuntimeException, RuntimeError } from "./RuntimeError";

export class ParseError extends RuntimeException {}
export class Parser {

  private current: number = 0;

  constructor(private tokens: Token[]) {}

  parse(): (Stmt | null)[] {
    const statements = new Array<Stmt | null>();

    while (!this.isAtEnd()) {
      const statement = this.declaration();
      if (statement === null) 
        throw new RuntimeError(null, "Program error: statement return null");
      statements.push(statement);
    }

    return statements;
  }

  private expression(): Expr {
    return this.assignment();
  }

  private declaration(): Stmt | null {
    try {
      if (this.match(TokenType.CLASS)) return this.classDeclaration();

      if (this.match(TokenType.FUN)) return this._function("function");

      if (this.match(TokenType.VAR)) return this.varDeclaration();

      return this.statement();
    } catch (error) {
      if (error instanceof ParseError) {
        this.synchronize();
        return null;
      }
    }
    return null;
  }

  private classDeclaration(): Stmt {
    const name: Token = this.consume(TokenType.IDENTIFIER, "Expect class name.");

    let superclass: VariableExpr | null = null;
    if (this.match(TokenType.LESS)) {
      this.consume(TokenType.IDENTIFIER, "Expect superclass name.");
      
      superclass = new VariableExpr(this.previous());
    }

    this.consume(TokenType.LEFT_BRACE, "Expect '{' before class body.");

    const methods = new Array<FunctionStmt>();
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      methods.push(this._function("method"));
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after class body.");

    return new QlassStmt(name, superclass, methods);
  }

private statement(): Stmt {
  if (this.match(TokenType.IMPORT)) return this.importStatement();
  if (this.match(TokenType.FOR)) return this.forStatement();
  if (this.match(TokenType.IF)) return this.ifStatement();
  if (this.match(TokenType.CASE)) return this.caseStatement();
  if (this.match(TokenType.PRINT)) return this.printStatement();
  if (this.match(TokenType.PUTS)) return this.putsStatement();
  if (this.match(TokenType.RETURN)) return this.returnStatement();
  if (this.match(TokenType.WHILE)) return this.whileStatement();
  if (this.match(TokenType.LEFT_BRACE)) return new BlockStmt(this.block());

  return this.expressionStatement();
}

private caseStatement(): Stmt {
  const caseExpr = this.expression();
  this.consume(TokenType.LEFT_BRACE, "Expect '{' after case statement.");

  const whenClauses = new Array<WhenClauseStmt>();
  let elseBranch: null | Stmt = null;

  while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
    if (this.match(TokenType.WHEN)) {
      const matchExpr = this.expression();
      this.consume(TokenType.ARROW, "Expect '=>' after 'when' condition.");
      const body = this.statement();
      whenClauses.push(new WhenClauseStmt(matchExpr, body));
    } else if (this.match(TokenType.ELSE)) {
      this.consume(TokenType.ARROW, "Expect 'when' or 'else' in case.");
      elseBranch = this.statement();
    } else {
      throw this.error(this.peek(), "Expect 'when' or 'else' in case.");
    }
  }

  this.consume(TokenType.RIGHT_BRACE, "Expect '}' after case block.");
  return new CaseStmt(caseExpr, whenClauses, elseBranch);

}

private forStatement(): Stmt {
  this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");

  let initializer: Stmt | null;
  if (this.match(TokenType.SEMICOLON)) {
    initializer = null;
  } else if (this.match(TokenType.VAR)) {
    initializer = this.varDeclaration();
  } else {
    initializer = this.expressionStatement();
  }

  let condition: null | Expr = null;
  if (!this.check(TokenType.SEMICOLON)) {
    condition = this.expression();
  }
  this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.");

  let increment: null | Expr = null;
  if (!this.check(TokenType.RIGHT_PAREN)) {
    increment = this.expression();
  }
  this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses.");

  let body = this.statement();

  if (increment != null) {
    body = new BlockStmt(
        Array.from([body, new ExpressionStmt(increment)]));
  }

  if (condition === null) condition = new LiteralExpr(true);
  body = new WhileStmt(condition, body);

  if (initializer != null) {
    body = new BlockStmt(Array.from([initializer, body]));
  }

  return body;
}

private ifStatement(): Stmt {
  this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.");
  const condition = this.expression();
  this.consume(TokenType.RIGHT_PAREN, "Expect ')' after if condition.");

  const thenBranch = this.statement();
  let elseBranch: Stmt | null = null;

  if (this.match(TokenType.ELSE)) {
    elseBranch = this.statement();
  }

  return new IfStmt(condition, thenBranch, elseBranch);
}

private importStatement(): Stmt {
  const pathParts = new Array<Token>();
  const _module = this.consume(TokenType.IDENTIFIER, "Expect module name.");
  let alias = _module;

  pathParts.push(_module);

  while (this.match(TokenType.DOT)) {
    pathParts.push(this.consume(TokenType.IDENTIFIER,
        "Expect identifier after '.'."));
  }

  if (this.match(TokenType.AS)) {
    alias = this.consume(TokenType.IDENTIFIER, "Expect alias after 'as'.");
  }

  this.consume(TokenType.SEMICOLON, "Expect ';' import statement.");
  return new ImportStmt(pathParts, alias);
}

private printStatement(): Stmt {
  const value = this.expression();
  this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
  return new PrintStmt(value);
}

private putsStatement(): Stmt {
  const value = this.expression();
  this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
  return new PutsStmt(value);
}

private returnStatement(): Stmt {
  const keyword = this.previous();
  let value: Expr | null = null;
  if (!this.check(TokenType.SEMICOLON)) {
    value = this.expression();
  }

  this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
  return new ReturnStmt(keyword, value!);
}

private varDeclaration(): Stmt {
  const name = this.consume(TokenType.IDENTIFIER, "Expect variable name.");

  let initializer: Expr | null = null;
  if (this.match(TokenType.EQUAL)) {
    initializer = this.expression();
  }

  this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");

  return new VarStmt(name, initializer);
}

private whileStatement(): Stmt  {
  this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
  const condition = this.expression();
  this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");
  const body = this.statement();

  return new WhileStmt(condition, body);
}

private expressionStatement(): Stmt {
  const expr = this.expression();
  this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
  return new ExpressionStmt(expr);
}

private _function(kind: String): FunctionStmt {
  const name = this.consume(TokenType.IDENTIFIER, "Expect " + kind + " name.");
  this.consume(TokenType.LEFT_PAREN, "Expect '(' after " + kind + " name.");
  const parameters = new Array<Token>();

  let hasVarArgs = false;
  let hasVarKwargs = false;
  let varArgsName: Token | null = null;
  let kwArgsName: Token | null = null;

  if (!this.check(TokenType.RIGHT_PAREN)) {
    do {
      if (parameters.length >= 255) {
        this.error(this.peek(), "Maximum of 255 parameters.");
      }

      if (this.match(TokenType.STAR)) {
        if (this.match(TokenType.STAR)) {
          hasVarArgs = true;
          varArgsName = this.consume(TokenType.IDENTIFIER, "Expect name for variable arguments.");
          parameters.push(varArgsName);
        } else {
          hasVarArgs = true;
          kwArgsName = this.consume(TokenType.IDENTIFIER, "Expect name for keyword arguments.");
          parameters.push(kwArgsName);
        }
      } else {
        parameters.push(
          this.consume(TokenType.IDENTIFIER, "Expect parameter name."));
      }
    } while (this.match(TokenType.COMMA));
  }
  this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");

  this.consume(TokenType.LEFT_BRACE, "Expect '{' before " + kind + " body.");
  const body = this.block();
  return new FunctionStmt(name, parameters, body, hasVarArgs, hasVarKwargs, varArgsName, kwArgsName );
}

private block(): Array<Stmt | null> {
  const statements = new Array<Stmt | null>();

  while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
    statements.push(this.declaration());
  }

  this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
  return statements;
}

private assignment(): Expr  {
  const expr = this.postfix();

  if (this.match(TokenType.EQUAL)) {
    const equals = this.previous();
    const value = this.assignment();

    if (expr instanceof VariableExpr) {
      const name = (expr as VariableExpr).name;
      return new AssignExpr(name, value);
    } else if (expr instanceof ArrayIndexExpr) {
      const array = (expr as ArrayIndexExpr).array;
      if (!(array instanceof VariableExpr)) {
        throw new RuntimeError(equals, "Expect array variable.");
      }
      const name = array.name;
      const index = expr.index;
      return new ArrayAssignExpr(name, array, index, value);
    } else if (expr instanceof GetExpr) {
      const get = expr;
      return new SetExpr(get.object, get.name, value);
    }
    this.error(equals, "Invalid assignment target.");
  }
  return expr;
}

private postfix(): Expr {
  const expr = this.or();

  if (this.match(TokenType.PLUS_PLUS, TokenType.MINUS_MINUS)) {
    const operator = this.previous();
    if (expr instanceof VariableExpr) {
      return new PostfixExpr(expr, operator);
    } else {
      throw this.error(operator, "Only variables can be incremented or decremented.");
    }
  }

  return expr;
}

private or(): Expr {
  let expr = this.and();

  while (this.match(TokenType.OR)) {
    const operator = this.previous();
    const right = this.and();
    expr = new LogicalExpr(expr, operator, right);
  }

  return expr;
}

private and(): Expr {
  let expr = this.equality();

  while (this.match(TokenType.AND)) {
    const operator = this.previous();
    const right = this.equality();
    expr = new LogicalExpr(expr, operator, right);
  }

  return expr;
}

private equality(): Expr {
  let expr = this.comparison();

  while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
    const operator = this.previous();
    const right = this.comparison();
    expr = new BinaryExpr(expr, operator, right);
  }

  return expr;
}

private comparison(): Expr {
  let expr = this.term();

  while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
    const operator = this.previous();
    const right = this.term();
    expr = new BinaryExpr(expr, operator, right);
  }

  return expr;
}

private term(): Expr {
  let expr = this.factor();

  while (this.match(TokenType.MINUS, TokenType.PLUS)) {
    const operator = this.previous();
    const right = this.factor();
    expr = new BinaryExpr(expr, operator, right);
  }

  return expr;
}

private factor(): Expr {
  let expr = this.unary();

  while (this.match(TokenType.SLASH, TokenType.STAR)) {
    const operator = this.previous();
    const right = this.unary();
    expr = new BinaryExpr(expr, operator, right);
  }

  return expr;
}

private unary(): Expr {
  if (this.match(TokenType.BANG, TokenType.NOT, TokenType.MINUS, TokenType.MINUS_MINUS, TokenType.PLUS_PLUS)) {
    const operator = this.previous();
    const right = this.unary();

    if (operator.type === TokenType.MINUS_MINUS || operator.type === TokenType.PLUS_PLUS) {
      if (right instanceof VariableExpr) {
        return new PrefixExpr(right, operator);
      } else {
        throw this.error(operator, "Only variables can be incremented or decremented.");
      }
    }
    return new UnaryExpr(operator, right);
  }

  return this.call();
}

private finishCall(callee: Expr): Expr {
  const _arguments = new Array<Expr>();

  if (!this.check(TokenType.RIGHT_PAREN)) {
    do {
      if (_arguments.length >= 255) {
        this.error(this.peek(), "Maximum of 255 arguments.");
      }
      _arguments.push(this.expression());
    } while (this.match(TokenType.COMMA));
  }

  const paren = this.consume(TokenType.RIGHT_PAREN,
      "Expect ')' after arguments.");
  return new CallExpr(callee, paren, _arguments);
}

private call(): Expr {
  let expr = this.primary();

  while (true) {
    if (this.match(TokenType.LEFT_PAREN)) {
      expr = this.finishCall(expr);
    } else if (this.match(TokenType.LEFT_BRACKET)) {
      const index = this.expression();
      const bracket = this.consume(TokenType.RIGHT_BRACKET, "Expect ']' after index.");
      expr = new ArrayIndexExpr(expr, bracket, index);
    } else if (this.match(TokenType.DOT)) {
      const name = this.consume(TokenType.IDENTIFIER,
          "Expect property name after '.'.");
      expr = new GetExpr(expr, name);
    } else {
      break;
    }
  }
  return expr;
}

private primary(): Expr {
  if (this.match(TokenType.FALSE)) return new LiteralExpr(false);
  if (this.match(TokenType.TRUE)) return new LiteralExpr(true);
  if (this.match(TokenType.NULL)) return new LiteralExpr(null);
  if (this.match(TokenType.UNDEFINED)) return new UndefinedExpr();

  if (this.match(TokenType.NEW)) return this.newObject();

  if (this.match(TokenType.NUMBER, TokenType.STRING)) {
    return new LiteralExpr(this.previous().literal);
  }

  if (this.match(TokenType.SUPER)) {
    const keyword = this.previous();
    this.consume(TokenType.DOT, "Expect '.' after 'super'.");
    const method = this.consume(TokenType.IDENTIFIER,
        "Expect superclass method name.");
    return new SuperExpr(keyword, method);
  }

  if (this.match(TokenType.THIS)) return new ThisExpr(this.previous());

  if (this.match(TokenType.IDENTIFIER)) {
    return new VariableExpr(this.previous());
  }

  if (this.match(TokenType.LEFT_PAREN)) {
    const expr = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
    return new GroupingExpr(expr);
  }

  if (this.match(TokenType.LEFT_BRACKET)) {
    if (this.match(TokenType.RIGHT_BRACKET)) {
      return new ListLiteralExpr(null);
    }
    return this.listLiteral();
  }
  if (this.match(TokenType.LEFT_BRACE)) {
    if (this.match(TokenType.RIGHT_BRACE)) {
      return new ObjectLiteralExpr(null);
    }
    if (this.match(TokenType.DOT_DOT_DOT) || this.match(TokenType.IDENTIFIER) || this.match(TokenType.STRING)) {
      return this.objectLiteral();
    }
  }

  if (this.match(TokenType.CASE)) return this.caseExpression();

  if (this.check(TokenType.PIPE)) {
    return this.lambda();
  }

  throw this.error(this.peek(), "Expect expression.");
}

private caseExpression(): Expr {
  const caseExpr = this.expression();
  this.consume(TokenType.LEFT_BRACE, "Expect '{' after 'case'.");

  const whenClauses = new Array<WhenClausesExpr>();
  let elseBranch: Expr | null = null;

  while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
    if (this.match(TokenType.WHEN)) {
      const match = this.expression();
      this.consume(TokenType.ARROW, "Expect '=>' after 'when'.");
      const result = this.expression();
      this.consume(TokenType.SEMICOLON, "Expect ';' after case branch.");
      whenClauses.push(new WhenClausesExpr(match, result));
    } else if (this.match(TokenType.ELSE)) {
      this.consume(TokenType.ARROW, "Expect '=>' after 'else'.");
      elseBranch = this.expression();
      this.consume(TokenType.SEMICOLON, "Expect ';' after else branch.");
    } else {
      throw this.error(this.peek(), "Expect 'when' or 'else' in case.");
    }
  }

  this.consume(TokenType.RIGHT_BRACE, "Expect '}' after case expression.");
  return new CaseExpr(caseExpr, whenClauses, elseBranch);
}

private lambda(): Expr {
  const parameters = new Array<Token>();
  // Handle |x| ...
  if (this.match(TokenType.PIPE)) {
    if (!this.check(TokenType.PIPE)) {
      do {
        if (parameters.length >= 255) {
          this.error(this.peek(), "Maximum of 255 parameters.");
        }
        parameters.push(this.consume(TokenType.IDENTIFIER, "Expect parameter name."));
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.PIPE, "Expect '|' after parameters.");
  } else {
    throw this.error(this.peek(), "Expect lambda parameters.");
  }
  let body: Expr;
  if (this.match(TokenType.LEFT_BRACE)) {
    const block = this.block();
    body = new BlockExpr(block);
  } else {
    body = this.expression();
  }
  return new LambdaExpr(parameters, body);
}

private newObject(): Expr {
  const klass = this.consume(TokenType.IDENTIFIER, "Expect class name");
  if (this.check(TokenType.LEFT_BRACKET)) {
    return this.newTypedArrayExpression();
  } else {
    // @TODO: implement new class operator
    throw new RuntimeError(klass,
      "new expects '['");
    // return null;
  }
}

private newTypedArrayExpression(): Expr {
  const type = this.previous();// consume(IDENTIFIER, "Expect type name after 'new'.");
  this.consume(TokenType.LEFT_BRACKET, "Expect '[' after type.");
  const sizeExpr = this.expression();
  this.consume(TokenType.RIGHT_BRACKET, "Expect ']' after array size.");

  return new NewTypedArrayExpr(type, sizeExpr);
}

private listComprehension(): Expr {
  let element: Expr | null = this.expression();

  if (this.match(TokenType.FOR)) {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");
    const variable = this.consume(TokenType.IDENTIFIER, "Expect identifier");

    this.consume(TokenType.IN, "Expect 'in'");

    const iterable = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')'");

    let condition: Expr | null = null;
    if (this.match(TokenType.IF)) {
      condition = this.expression();
    }
    this.consume(TokenType.RIGHT_BRACKET, "Expect ']' after list comprehension");

    return new ListComprehensionExpr(element, variable, iterable, condition);
  } else {
    const elements = new Array<Expr>();
    elements.push(element);
    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        if (this.match(TokenType.DOT_DOT_DOT)) {
//            Expr spreadExpr = expression();
          if (element === null) {
            elements.push(new SpreadExpr(this.expression()));
          }
        } else {
          if (element === null) {
            elements.push(this.expression());
          }
        }
        element = null;
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_BRACKET, "Expect ']' after array elements.");
    return new ListLiteralExpr(elements);
  }
}

private listLiteral(): Expr {
  if (this.check(TokenType.DOT_DOT_DOT)) {
    const elements = new Array<Expr>();
    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        if (this.match(TokenType.DOT_DOT_DOT)) {
          const spreadExpr = this.expression();
          elements.push(new SpreadExpr(spreadExpr));
        } else {
          elements.push(this.expression());
        }
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_BRACKET, "Expect ']' after array elements.");
    return new ListLiteralExpr(elements);
  } else {
    return this.listComprehension();
  }

}

private objectLiteral(): Expr {
  const properties = new Array<Property>();

  let key: Token | null = this.previous();
  while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
    if (this.checkPrevious(TokenType.DOT_DOT_DOT) || this.match(TokenType.DOT_DOT_DOT)) {
      const spreadExpr = this.expression();
      properties.push(new SpreadProperty(spreadExpr));
    } else if (this.check(TokenType.COLON) || this.check(TokenType.IDENTIFIER) || this.check(TokenType.STRING)) {
      if (key === null) {
        if (this.match(TokenType.IDENTIFIER) || this.match(TokenType.STRING)) {
          key = this.previous();
        } else {
          throw new RuntimeError(key, "Expect property name.");
        }
      }
      this.consume(TokenType.COLON, "Expect ':' after property name.");
      const value = this.expression();
      properties.push(new Pair(key, value));
    } //else {
//        throw error(peek(), "Expect property name.");
//      }
    key = null;
    if (!this.match(TokenType.COMMA))
      break;
  }
  this.consume(TokenType.RIGHT_BRACE, "Expect '}' after object literal.");
  return new ObjectLiteralExpr(properties);
}

private match(...types: TokenType[]): boolean {
  for (const type of types) {
    if (this.check(type)) {
      this.advance();
      return true;
    }
  }

  return false;
}

private consume(type: TokenType, message: string): Token  {
  if (this.check(type)) return this.advance();

  throw this.error(this.peek(), message);
}

private check(type: TokenType): boolean {
  if (this.isAtEnd()) return false;
  return this.peek().type === type;
}

private checkPrevious(type: TokenType): boolean {
  if (this.isAtEnd()) return false;
  return this.previous().type === type;
}

private advance(): Token {
  if (!this.isAtEnd()) this.current++;
  return this.previous();
}

private isAtEnd(): boolean { return this.peek().type === TokenType.EOF; }

private peek(): Token { return this.tokens[this.current]; }

private previous(): Token { return this.tokens[this.current - 1]; }

private error(token: Token, message: string): ParseError {
  YouMeKa.error(token, message);
  return new ParseError();
}

private synchronize(): void {
  this.advance();

  while (!this.isAtEnd()) {
    if (this.previous().type === TokenType.SEMICOLON) return;

    switch (this.peek().type) {
      case TokenType.CLASS:
      case TokenType.FUN:
      case TokenType.VAR:
      case TokenType.FOR:
      case TokenType.IF:
      case TokenType.WHILE:
      case TokenType.PRINT:
      case TokenType.RETURN:
        return;
    }

    this.advance();
  }
}


}