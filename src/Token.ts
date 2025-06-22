import { TokenType } from "./TokenType";

// export namespace io.github.yumika {
  export class Token {
    constructor(
      public readonly type: TokenType,
      public readonly lexeme: string,
      public readonly literal: Object | null,
      public line: Number
    ) {}
  }
// }