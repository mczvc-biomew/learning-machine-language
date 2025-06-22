import { YouMeKa } from "./YouMeKa";
import { TokenType } from "./TokenType";
import { Token } from "./Token";

// export namespace io.github.yumika {
  export class Scanner {

    private static keywords: Map<string, TokenType> = new Map([
      ["and", TokenType.AND],
      ["as", TokenType.AS],
      ["case", TokenType.CASE],
      ["class", TokenType.CLASS],
      ["else", TokenType.ELSE],
      ["false", TokenType.FALSE],
      ["fun", TokenType.FUN],
      ["for", TokenType.FOR],
      ["if", TokenType.IF],
      ["import", TokenType.IMPORT],
      ["in", TokenType.IN],
      ["or", TokenType.OR],
      ["new", TokenType.NEW],
      ["not", TokenType.NOT],
      ["null", TokenType.NULL],
      ["print", TokenType.PRINT],
      ["puts", TokenType.PUTS],
      ["return", TokenType.RETURN],
      ["super", TokenType.SUPER],
      ["this", TokenType.THIS],
      ["true", TokenType.TRUE],
      ["undefined", TokenType.UNDEFINED],
      ["var", TokenType.VAR],
      ["when", TokenType.WHEN],
      ["while", TokenType.WHILE],
    ]);

    private source: string;
    private tokens: Token[] = Array<Token>();

    private start =  0;
    private current = 0;
    private line = 1;

    constructor(source: string) {
      this.source = source;
    }

    scanTokens(): Token[] {
      while (!this.isAtEnd()) {
        this.start = this.current;
        this.scanToken();
      }

      this.tokens.push(
        new Token(TokenType.EOF, "", null, this.line));
        return this.tokens;
    }

    private scanToken(): void {
      let c: string = this.advance();
      switch(c) {
        case '[': this.addToken(TokenType.LEFT_BRACKET); break;
        case ']': this.addToken(TokenType.RIGHT_BRACKET); break;
        case '(': this.addToken(TokenType.LEFT_PAREN); break;
        case ')': this.addToken(TokenType.RIGHT_PAREN); break;
        case '{': this.addToken(TokenType.LEFT_BRACE); break;
        case '}': this.addToken(TokenType.RIGHT_BRACE); break;
        case ',': this.addToken(TokenType.COMMA); break;
        case '.':
          if (this.match('.') && this.match('.')) {
            this.addToken(TokenType.DOT_DOT_DOT);
          } else {
            this.addToken(TokenType.DOT);
          }
          break;
        case '|': this.addToken(TokenType.PIPE); break;
        case ':': this.addToken(TokenType.COLON); break;
        case ';': this.addToken(TokenType.SEMICOLON); break;
        case '*': this.addToken(TokenType.STAR); break;
        // two-char-tokens
        case '-':
          this.addToken(this.match('-') ? TokenType.MINUS_MINUS : TokenType.MINUS);
          break;
        case '+':
          this.addToken(this.match('+') ? TokenType.PLUS_PLUS : TokenType.PLUS);
          break;
        case '!':
          this.addToken(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG);
          break;
        case '=':
          this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL
              : (this.match('>') ? TokenType.ARROW : TokenType.EQUAL));
          break;
        case '<':
          this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS);
          break;
        case '>':
          this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
          break;
        //< two-char-tokens
        // slash
        case '/':
          if (this.match('/')) {
            // TODO: add comment to AST
            while (this.peek() != '\n' && !this.isAtEnd()) this.advance();
          } else {
            this.addToken(TokenType.SLASH);
          }
          break;
        // < slash
        // whitespace

        case ' ':
        case '\r':
        case '\t':
          // Ignore whitespace.
          break;

        case '\n':
          this.line++;
          break;
        // < whitespace

        // string start
        case '"': this._string(); break;
        // < string start

        // char-error
        default:
        /* Scanning char-error */
          // digit-start
          if (this.isDigit(c)) {
            this.number();
          // identifier-start
          } else if (this.isAlpha(c)) {
            this.identifier();
          } else {
            YouMeKa.error(this.line, "Unexpected character.");
          }
          // < digit-start
          break;
          // char-error
      }
    }

    private identifier(): void {
      while (this.isAlphaNumber(this.peek())) this.advance();

      const text = this.source.substring(this.start, this.current);
      let type = Scanner.keywords.get(text) || TokenType.IDENTIFIER;
      if (type === null) type = TokenType.IDENTIFIER;
      this.addToken(type);
    }

    private number(): void {
      while (this.isDigit(this.peek())) this.advance();

      // Look for a fractional part.
      if (this.peek() === '.' && this.isDigit(this.peekNext())) {
        this.advance();

        while (this.isDigit(this.peek())) this.advance();
      }

      this.addToken(TokenType.NUMBER,
        Number.parseFloat(this.source.substring(this.start, this.current))
      );
    }

    private _string(): void {
      while (this.peek() !== '"' && !this.isAtEnd()) {
        if (this.peek() !== '\n') this.line++;
        this.advance();
      }

      if (this.isAtEnd()) {
        YouMeKa.error(this.line, "Unterminated string.");
        return;
      }

      this.advance();

      let value = this.source.substring(this.start + 1, this.current -1);
      this.addToken(TokenType.STRING, value);
    }

    private match(expected: string): boolean {
      if (this.isAtEnd()) return false;
      if (this.source.charAt(this.current) !== expected) return false;

      this.current++;
      return true;
    }

    private peek(): string {
      if (this.isAtEnd()) return '\0';
      return this.source.charAt(this.current);
    }

    private peekNext(): string {
      if (this.current + 1 >= this.source.length) return '\0';
      return this.source.charAt(this.current + 1);
    }

    private isAlpha(c: string): boolean {
      return (c >= 'a' && c <= 'z') ||
      (c >= 'A' && c <= 'Z') ||
      c == '_';
    }

    private isAlphaNumber(c: string) {
      return this.isAlpha(c) || this.isDigit(c);
    }

    private isDigit(c: string): boolean {
      return c >= '0' && c <= '9';
    }

    private isAtEnd(): boolean {
      return this.current >= this.source.length;
    }

    private advance(): string {
      return this.source.charAt(this.current++);
    }

    private addToken(type: TokenType, literal: Object | null = null): void {
      const text = this.source.substring(this.start, this.current);
      this.tokens.push(new Token(type, text, literal, this.line));
    }
  }
// }