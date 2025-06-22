import { Token } from "./Token";
import { RuntimeError, UndefinedException } from "./RuntimeError";
// import Token = token.io.github.yumika.Token;
// import RuntimeError = runtimeerror.io.github.yumika.RuntimeError;
// import UndefinedException = runtimeerror.io.github.yumika.UndefinedException;

// export namespace io.github.yumika {
  export class Environment extends Object {
    enclosing: Environment | null;
    private values: Map<string, Object | null> = new Map();

    constructor(enclosing: Environment|null = null) { 
      super();
      this.enclosing = enclosing; 
    }

    contains(name: string): boolean {
      return this.values.has(name);
    }

    get(name: Token): Object {
      if (this.values.has(name.lexeme)) {
        return this.values.get(name.lexeme)!;
      }

      if (this.enclosing !== null) return this.enclosing.get(name)!;

      throw new UndefinedException(name, "Undefined variable '" + name.lexeme + "'.");
    }

    public forEach(action: (key: string, value: any) => void) {
      for (const [key, value] of this.values) {
        action(key, value);
      }
    }

    assign(name: Token, value: Object): void {
      if (this.values.has(name.lexeme)) {
        this.values.set(name.lexeme, value);
        return;
      }

      if (this.enclosing !== null) {
        this.enclosing.assign(name, value);
        return;
      }

      throw new RuntimeError(name,
        "Undefined variable '" + name.lexeme + "'."
      );
    }

    define(name: string, value: Object | null): void {
      this.values.set(name, value);
    }

    ancestor(distance: number, name: String): Environment {
      let environment = this as Environment;
      for (let i = 0; i < distance; i++) {
        console.assert(environment !== null);
        if (environment.values.has(name.toString())) {
          return environment;
        }
        environment = environment.enclosing!;
      }

      return environment;
    }

    getAt(distance: number, name: string): Object | null | undefined {
      return this.ancestor(distance, name).values.get(name);
    }

    assignAt(distance: number, name: Token | String, value: Object): void {
      if (name instanceof Token) {
        this.ancestor(distance, name.lexeme).values.set(name.lexeme, value);
      } else if (typeof name === 'string' || name instanceof String) {
        this.ancestor(distance, name).values.set(name.toString(), value);
      }
    }

    public toString(): string {
      let result: string = this.values.toString();
      if (this.enclosing !== null) {
        result += " -> " + this.enclosing.toString();
      }

      return result;
    }
  }
// }