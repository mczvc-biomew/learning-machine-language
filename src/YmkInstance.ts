import { Token } from "./Token";
import { isString, YmkClass } from "./object";
import { RuntimeError } from "./RuntimeError";

export class YmkInstance extends Object {
  private fields: Map<String, Object> = new Map();

  constructor(
    
    private klass: YmkClass) 
  { super(); }

  containsField(name: string) {
    return this.fields.has(name);
  }

  get(name: Token | String): Object | undefined {
    if (name instanceof Token)
      return this.get(name.lexeme);
    else if (isString(name)) {
      if (this.fields.has(name)){
        return this.fields.get(name)!;
      }

      const method = this.klass.findMethod(name.toString());

      if (method !== null) return method.bind(this);

      throw new RuntimeError(null,
        `GET: Undefined property '${name}'.`);

    }
    return undefined;
  }

  getFields(): Map<String, Object> {
    return this.fields;
  }

  set(name: Token | String, value: Object): void {
    if (name instanceof Token)
      this.fields.set(name.lexeme, value);
    else if (isString(name)) 
      this.fields.set(name, value);
  }
  putAll(map: Map<String, Object>): void {
    map.forEach((value, key) => {
      this.fields.set(key, value);
    });
  }

  toString(): string {
    return `${this.klass.name} instance = ${this.fields}`;
  }


}
