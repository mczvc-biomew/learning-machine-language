import type { Environment } from "./Environment";
import type { Interpreter } from "./Interpreter";
import { isString, isYmkCallable, isYmkFunction, YmkEnv, type YmkCallable } from "./object";
import { RuntimeError } from "./RuntimeError";
import { YmkInstance } from "./YmkInstance";

export default function(globalEnv: Environment) {

    globalEnv.define("env", new YmkEnv());
    globalEnv.define("isNumber", isTypeOf(Number));
    globalEnv.define("isString", isTypeOf(String));
    globalEnv.define("isBoolean", isTypeOf(Boolean));
    globalEnv.define("isArray", isTypeOf(Array));
    globalEnv.define("isFunction", isTypeOfFunction());
    globalEnv.define("isObject", isTypeOf(YmkInstance));
    globalEnv.define("str", {
      arity: () => -2,
      call: (_interpreter: Interpreter, args: Object[]) => {
        let result = "";
        let isEmpty = true;
        for (const argument of args) {
          result += `${argument.toString()} `;
          if (isEmpty) {
            isEmpty = false;
          }
        }
        if (!isEmpty) {
          result = result.substring(0, result.length - 1);
        }
        return result;
      }
    } as YmkCallable);
    globalEnv.define("length", {
      arity: () => 1,
      call: (_interpreter: Interpreter, args: Object[]) => {
        const value = args[0];
        if (Array.isArray(value)) {
          return value.length;
        } else if (isString(value)) {
          return value.length;
        } else if (value instanceof Map) {
          return value.size;
        } else {
          throw new RuntimeError(null, "Argument doesn't have a length.");
        }
      }
    } as YmkCallable);
    globalEnv.define("clock", {
      arity: () => 0,
      call: (_interpreter: Interpreter, _args: Object[]) => 0.0,
      toString: () => "<native fn>"
    } as YmkCallable);

    globalEnv.define("exit", {
      arity: () => 0,
      call: (_interpreter: Interpreter, _args: Object[]) => {
        // @ts-ignore
          process.exit(0);
        return null;
      },
      toString: () => "<native fn>"
    } as YmkCallable);
}

function isTypeOf(cls: any): YmkCallable {
  return {
    arity: () => 1,
    call: (_interpreter: Interpreter, args: Object[]): Object => args[0] instanceof cls,
    toString: (): string => `<native fn is${cls.name}>`
  };
}

function isTypeOfFunction(): YmkCallable {
  return {
    arity: () => 1,
    call: (_interpreter: Interpreter, args: Object[]): Object =>
        isYmkCallable(args[0]) || isYmkFunction(args[0]),
    toString: () => '<native fn is Function>'
  }
}
