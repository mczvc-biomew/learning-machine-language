
import { 
  Func as FuncStmt,
 } from "./Stmt";
import { YmkInstance } from "./YmkInstance";

import { 
  Lambda as LambdaExpr,
} from "./Expr";

import { Return } from "./Return";

import { Environment } from "./Environment";

import { Interpreter } from "./Interpreter";

import { RuntimeError } from "./RuntimeError";

  export interface YmkCallable extends Object {
    arity(): number;
    call(interpreter: Interpreter, _arguments: Object[]): Object | undefined | null;
  }

  export class YmkClass implements YmkCallable {
    constructor(
      public readonly name: string,
      public superclass: YmkClass | null,
      public methods: Map<String, YmkFunction>)
    {}

    findMethod(name: string): YmkFunction | null {
      if (this.methods.has(name)) {
        return this.methods.get(name)!;
      }

      if (this.superclass != null) {
        return this.superclass.findMethod(name);
      }

      return null;
    }

    toString(): string { return this.name; }

    public call(interpreter: Interpreter,
      _arguments: Object[]
    ) {
      const instance = new YmkInstance(this);
      const initializer = this.findMethod("init");
      if (initializer !== null) {
        initializer.bind(instance).call(interpreter, _arguments);
      }

      return instance;
    }

    arity(): number {
      const initializer = this.findMethod("init");
      if (initializer === null) return 0;
      return initializer.arity();
    }

  }

  export class YmkFunction implements YmkCallable {

    constructor(
      private declaration: FuncStmt,
      private closure: Environment,
      private isInitializer: boolean) {}
    
    bind(instance: YmkInstance): YmkFunction {
      const environment = new Environment(this.closure);
      environment.define("this", instance);

      return new YmkFunction(this.declaration,
        environment, this.isInitializer);
    }

    toString(): string {
      return `<fn ${this.declaration.name.lexeme}>`
    }

    arity(): number { return this.declaration.params.length }

    call(interpreter: Interpreter, _arguments: Object[]): Object | undefined | null {
      const environment = new Environment(this.closure);
      const normalParamCount = this.declaration.params.length;
      // standard args
      // Normal arguments
      for (let i = 0; i < normalParamCount && i < _arguments.length; i++) {
        environment.define(this.declaration.params[i].lexeme, _arguments[i]);
      }
      if (this.declaration.hasVarArgs && this.declaration.varArgsName === null) {
        throw new RuntimeError(null,
          "Must have var-args name.");
      }
      if (this.declaration.hasVarKwargs && this.declaration.kwArgsName === null) {
        throw new RuntimeError(null,
          "Must have kwargs name.");
      }

      // *args
      if (this.declaration.hasVarArgs) {
        const varArgs = new Array<Object>();
        for (let i = normalParamCount; i < _arguments.length; i++) {
          varArgs.push(_arguments[i]);
        }
        environment.define(this.declaration.varArgsName!.lexeme, varArgs);
      }

      // **kwargs (last arg is expected to be Map<String, Object>)
      if (this.declaration.hasVarKwargs) {
        const lastArg = _arguments[_arguments.length - 1];
        if (!(lastArg instanceof Map)) {
          throw new RuntimeError(this.declaration.varArgsName,
            "**kwargs must be passed as Map.");
        }
        environment.define(this.declaration.kwArgsName!.lexeme, lastArg);
      }

      try {
        interpreter.executeBlock(this.declaration.body, environment);
      // catch-return 
      } catch (error) {
        if (error instanceof Return) {
          const returnValue: Return = error as Return;
          // Classes early-return-this
          if (this.isInitializer) return this.closure.getAt(0, "this");

          return returnValue.value;
        }

        // Classes return-this
        if (this.isInitializer) return this.closure.getAt(0, "this");

        return null;
      }
    }

  }

  export class YmkLambda implements YmkCallable {
    constructor(public readonly declaration: LambdaExpr,
      public readonly closure: Environment,
      public readonly thisContext: Object | null
    ) { }

    arity(): number { return this.declaration.params.length }
    bind(newThis: Object): YmkLambda {
      return new YmkLambda(this.declaration, this.closure, newThis);
    }

    call(interpreter: Interpreter, _arguments: Object[]) {
      const environment = new Environment(this.closure);

      for (let i = 0; i < this.declaration.params.length; i++) {
        environment.define(this.declaration.params[i].lexeme, _arguments[i]);
      }
      if (this.thisContext != null) {
        environment.define("this", this.thisContext);
      }
      return interpreter.evaluateExpr(this.declaration.body, environment);
    }

    toString(): string { return '<lambda fn>'; }
  }


export class YmkEnv implements YmkCallable {
  public arity() { return 0; }
  public call(interpreter: Interpreter, _args: Object[]): Object {
    return interpreter.getEnvironment();
  }
}

export function isString(obj: Object): obj is string {
  return typeof obj === 'string' || obj instanceof String;
}

export function isNumber(obj: Object): obj is number {
  return typeof obj === 'number' || obj instanceof Number;
}

export function isBoolean(obj: Object): obj is boolean {
  return typeof obj === 'boolean' || obj instanceof Number;
}


export function isYmkCallable(obj: any): obj is YmkCallable {
  return 'arity' in obj && 'call' in obj;
}

export function isYmkFunction(obj: any): obj is YmkFunction {
  return 'arity' in obj && 'bind' in obj && 'call' in obj;
}

export function isYmkClass(obj: any): obj is YmkClass {
  return 'name' in obj && 'superclass' in obj && 'methods' in obj && 'findMethod' in obj && 'call' in obj && 'arity' in obj;
}

export function isYmkInstance(obj: any): obj is YmkInstance {
  return (obj instanceof YmkInstance);
}