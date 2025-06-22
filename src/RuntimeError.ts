import { Token } from "./Token";

// export namespace io.github.yumika {
export abstract class RuntimeException extends Error {}
export class RuntimeError extends RuntimeException {

  constructor(
    public readonly token: Token | null,
    public readonly message: string) {
    super(message);
  }
}

export class UndefinedException extends RuntimeError {
  constructor(name: Token, message: string) {
    super(name, message);
  }
}

export class ReferenceError extends RuntimeError {
  constructor(name: Token, message: string) {
    super(name, message);
  }
}
// }