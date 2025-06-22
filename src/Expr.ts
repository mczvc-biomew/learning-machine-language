import { Token } from "./Token"
import { Stmt } from "./Stmt";

// export namespace io.github.yumika {
  export abstract class Expr {
    public abstract accept<R>(visitor: Visitor<R>): R;
  }

  export interface Visitor<R> {
    visitArrayAssignExpr(expr: ArrayAssign): R;
    visitArrayIndexExpr(expr: ArrayIndex): R;
    visitAssignExpr(expr: Assign): R;
    visitBinaryExpr(expr: Binary): R;
    visitBlockExpr(expr: Block): R;
    visitCaseExpr(expr: Case): R;
    visitCallExpr(expr: Call): R;
    visitGetExpr(expr: Get): R;
    visitGroupingExpr(expr: Grouping): R;
    visitLambdaExpr(expr: Lambda): R;
    visitListComprehensionExpr(expr: ListComprehension): R;
    visitListLiteralExpr(expr: ListLiteral): R;
    visitLiteralExpr(expr: Literal): R;
    visitLogicalExpr(expr: Logical): R;
    visitNewTypedArrayExpr(expr: NewTypedArray): R;
    visitObjectLiteralExpr(expr: ObjectLiteral): R;
    visitPostfixExpr(expr: Postfix): R;
    visitPrefixExpr(expr: Prefix): R;
    visitSetExpr(expr: Set): R;
    visitSpreadExpr(expr: Spread): R;
    visitSuperExpr(expr: Super): R;
    visitThisExpr(expr: This): R;
    visitUnaryExpr(expr: Unary): R;
    visitUndefinedExpr(expr: Undefined): R;
    visitVariableExpr(expr: Variable): R;

  }

  export class ListLiteral extends Expr {
    constructor(
      public readonly elements: Array<Expr> | null
    ) { super(); }

    public accept<R>(visitor: Visitor<R>):R {
      return visitor.visitListLiteralExpr(this);
    }
  }

  export class Spread extends Expr {
    constructor(
      public readonly expression: Expr
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitSpreadExpr(this);
    }
  }

  export class ArrayIndex extends Expr {
    constructor(
      public readonly array: Expr,
      public readonly bracket: Token,
      public readonly index: Expr
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitArrayIndexExpr(this);
    }
  }

  export class ArrayAssign extends Expr {
    constructor(
      public readonly name: Token, 
      public readonly array: Expr, 
      public readonly index: Expr,
      public readonly value: Expr) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitArrayAssignExpr(this);
    }
  }

  export class Assign extends Expr {
    constructor(
      public readonly name: Token,
      public readonly value: Expr
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitAssignExpr(this);
    }
  }

  export class Binary extends Expr {
    constructor(
      public readonly left: Expr,
      public readonly operator: Token,
      public readonly right: Expr
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitBinaryExpr(this);
    }
  }

  export class Block extends Expr {
    constructor(
      public readonly statements: Array<Stmt | null>
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitBlockExpr(this);
    }
  }

  export class Call extends Expr {
    constructor(
      public readonly callee: Expr,
      public readonly paren: Token,
      public readonly args: Array<Expr>
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitCallExpr(this);
    }
  }

  export class Case extends Expr {
    constructor(
      public readonly expression: Expr,
      public readonly whenClauses: Array<WhenClauses>,
      public readonly elseBranch: Expr | null
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitCaseExpr(this);
    }

  }

  export class WhenClauses {
    constructor(
      public readonly match: Expr,
      public readonly result: Expr
    ) {}
  }

  export class Get extends Expr {
    constructor(
      public readonly object: Expr,
      public readonly name: Token
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitGetExpr(this);
    }
  }

  export class Grouping extends Expr {
    constructor(
      public readonly expression: Expr
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitGroupingExpr(this);
    }
  }

  export class Lambda extends Expr {
    constructor(
      public readonly params: Array<Token>,
      public readonly body: Expr
    ) { super(); }
    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitLambdaExpr(this);
    }
  }

  export class ListComprehension extends Expr {
    constructor(
      public readonly elementExpr: Expr,
      public readonly variable: Token,
      public readonly iterable: Expr,
      public readonly condition: Expr | null
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitListComprehensionExpr(this);
    }
  }

  export class Literal extends Expr {
    constructor(
      public readonly value: Object | null
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitLiteralExpr(this);
    }
  }

  export class Logical extends Expr {
    constructor(
      public readonly left: Expr,
      public readonly operator: Token,
      public readonly right: Expr
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitLogicalExpr(this);
    }
  }

  export class NewTypedArray extends Expr {
    constructor(
      public readonly type: Token,
      public readonly size: Expr
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitNewTypedArrayExpr(this);
    }
  }

  export class ObjectLiteral extends Expr {
    constructor(
      public readonly properties: Array<Property> | null
    ) { super(); }
    
    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitObjectLiteralExpr(this);
    }
  }

  export interface Property {}

  export class Pair implements Property {
    constructor(
      public readonly key: Token,
      public readonly value: Expr
    ) { }
  }

  export class SpreadProperty implements Property {
    constructor(
      public readonly expression: Expr
    ) {}
  }

  export class Postfix extends Expr {
    constructor(
      public readonly variable: Variable,
      public readonly operator: Token
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitPostfixExpr(this);
    }
  }

  export class Prefix extends Expr {
    constructor(
      public readonly variable: Variable,
      public readonly operator: Token
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitPrefixExpr(this);
    }
  }

  export class Set extends Expr {
    constructor(
      public readonly object: Expr,
      public readonly name: Token,
      public readonly value: Expr
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitSetExpr(this);
    }
  }

  export class Super extends Expr {
    constructor(
      public readonly keyword: Token,
      public readonly method: Token
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitSuperExpr(this);
    }
  }

  export class This extends Expr {
    constructor(
      public readonly keyword: Token
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitThisExpr(this);
    }
  }

  export class Unary extends Expr {
    constructor(
      public readonly operator: Token,
      public readonly right: Expr
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitUnaryExpr(this);
    }
  }

  export class Undefined extends Expr {
    constructor() { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitUndefinedExpr(this);
    }

    public toString(): String {
      return "undefined";
    }
  }

  export class Variable extends Expr {
    constructor(
      public readonly name: Token
    ) { super(); }

    public accept<R>(visitor: Visitor<R>): R {
      return visitor.visitVariableExpr(this);
    }

    public toString(): String {
      return super.toString() + "_<Variable: " +
      this.name.lexeme + "(" + this.name.literal + ")>";
    }
  }




// };

// export type Property = io.github.yumika.Property