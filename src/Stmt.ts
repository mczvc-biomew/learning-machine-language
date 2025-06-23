import { Expr, Variable as VariableExpr } from "./Expr";
import { Token } from "./Token";

export abstract class Stmt {
  public abstract accept<R>(visitor: Visitor<R>): R;
}

export interface Visitor<R> {
  visitBlockStmt(stmt: Block): R;
  visitCaseStmt(stmt: Case): R;
  visitExpressionStmt(stmt: Expression): R;
  visitFunctionStmt(stmt: Func): R;
  visitIfStmt(stmt: If): R;
  visitImportStmt(stmt: Import): R;
  visitPrintStmt(stmt: Print): R;
  visitPutsStmt(stmt: Puts): R;
  visitQlassStmt(stmt: Qlass): R;
  visitReturnStmt(stmt: Return): R;
  visitVarStmt(stmt: Var): R;
  visitWhileStmt(stmt: While): R;
}

export class Block extends Stmt {
  constructor(
    public readonly statements: Array<Stmt | null>
  ) { super(); }

  public accept<R>(visitor: Visitor<R>): R {
    return visitor.visitBlockStmt(this);
  }
}

export class Case extends Stmt {
  constructor(
    public readonly expression: Expr,
    public whenClauses: WhenClause[],
    public elseBranch: Stmt | null
  ) { super(); }

  public accept<R>(visitor: Visitor<R>): R {
    return visitor.visitCaseStmt(this);
  }
}

export class WhenClause {
  constructor(
    public readonly match: Expr,
    public readonly body: Stmt
  ) { }
}

export class Qlass extends Stmt {
  constructor(
    public readonly name: Token,
    public superclass: VariableExpr | null,
    public readonly methods: Array<Func>
  ) { super(); }

  public accept<R>(visitor: Visitor<R>): R {
    return visitor.visitQlassStmt(this);
  }
}

export class Expression extends Stmt {
  constructor(
    public readonly expression: Expr
  ) { super(); }

  public accept<R>(visitor: Visitor<R>): R {
    return visitor.visitExpressionStmt(this);
  }
}

export class Func extends Stmt {
  constructor(
    public readonly name: Token,
    public readonly params: Array<Token>,
    public readonly body: Array<Stmt | null>,
    public readonly hasVarArgs = false,
    public readonly hasVarKwargs = false,
    public readonly varArgsName: Token | null = null,
    public readonly kwArgsName: Token | null = null
  ) { super(); }

  public accept<R>(visitor: Visitor<R>): R {
    return visitor.visitFunctionStmt(this);
  }
}

export class If extends Stmt {
  constructor(
    public readonly condition: Expr,
    public readonly thenBranch: Stmt,
    public readonly elseBranch: Stmt | null
  ) { super(); }

  public accept<R>(visitor: Visitor<R>): R {
    return visitor.visitIfStmt(this);
  }
}

export class Import extends Stmt {
  constructor(
    public readonly pathParts: Array<Token>,
    public readonly alias: Token
  ) { super(); }

  public accept<R>(visitor: Visitor<R>): R {
    return visitor.visitImportStmt(this);
  }
}

export class Print extends Stmt {
  constructor(
    public readonly expression: Expr
  ) { super(); }

  public accept<R>(visitor: Visitor<R>): R {
    return visitor.visitPrintStmt(this);
  }
}

export class Puts extends Stmt {
  constructor(
    public readonly expression: Expr
  ) { super(); }

  public accept<R>(visitor: Visitor<R>): R {
    return visitor.visitPutsStmt(this);
  }
}

export class Return extends Stmt {
  constructor(
    public readonly keyword: Token,
    public readonly value: Expr
  ) { super(); }

  public accept<R>(visitor: Visitor<R>): R {
    return visitor.visitReturnStmt(this);
  }
}

export class Var extends Stmt {
  constructor(
    public readonly name: Token,
    public readonly initializer: Expr | null
  ) { super(); }

  public accept<R>(visitor: Visitor<R>): R {
    return visitor.visitVarStmt(this);
  }
}

export class While extends Stmt {
  constructor(
    public readonly condition: Expr,
    public readonly body: Stmt
  ) { super(); }

  public accept<R>(visitor: Visitor<R>): R {
    return visitor.visitWhileStmt(this);
  }
}
