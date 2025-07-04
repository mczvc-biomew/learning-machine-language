import {isNumber} from "./object.ts";
import {YmkInstance} from "./YmkInstance.ts";
import {ObjectLiteral, Pair, Variable} from "./Expr.ts";

export function isMap(value: any): value is Map<unknown, unknown> {
  return value instanceof Map;
}

export function isYmkInstance(value: any): value is YmkInstance {
  return value instanceof YmkInstance;
}

export function isPair(value: any) {
  return isMap(value) || isYmkInstance(value);
}

export function repeatString(str: string, times: number) {
  if (times < 0) return "";
  let builder = "";
  for (let i = 0; i < times; i++) {
    builder += str;
  }
  return builder;
}

export function stringifyList(list: Array<any>, depth: number) {
  let sb = "";
  let notEmpty = false;

  if (list.length === 0) return "[Note: empty list]";
  const first = list[0];
  let matchCount = 0;
  for (const item of list) {
    if (item.toString() === first.toString()) {
      matchCount++;
    }
  }
  if (list.length > 9 && matchCount === list.length) {
    sb += repeatString(" ", depth * 2) + '[';
    for (let i = 0; i < 10; i++) {
      sb += `${first.toString()}, `;
    }
    return `${sb}(... ${list.length - 10} more times) ]`;
  }

  sb += `${repeatString(" ", (depth - 1) * 2)}[`;
  for (const element of list) {
    if (isNumber(element)) {
      sb += `${element}, `;
    } else {
      sb += `"${element.toString()}"`;
    }
    if (!notEmpty) { notEmpty = true; }
  }
  if (notEmpty) { sb = sb.substring(0, sb.length - 2); }
  sb += "]";
  return sb;
}

export function stringifyVarArgs(depth: number, ...args: any[]) {
  let builder = '';
  let removeTrailingSpace = false;
  for (const arg of args) {
    builder += `${stringify(arg, depth)} `;
    removeTrailingSpace = true;
  }
  if (removeTrailingSpace) {
    builder.slice(0, builder.length - 1);
  }
  return builder;
}

function indentedBrace(level: number, depth: number){
  return `${stringify(repeatString(' ', level * 2) + '}', depth)}`;
}

function stringifyPairWithIndent(key: any, value: any, level: number,
                                 indent: string, connector: string, separator: string) {
  let builder = '';
  builder += repeatString(indent, level * 2);
  builder += `${stringify(key, level + 1)} ${connector} `;
  builder += `${value}${separator}`;
  return builder;
}

export function stringify(object: any, depth: number) {
  if (object === null) return "null";
  if (object === undefined) return "undefined";

  if (isNumber(object)) {
    let text = object.toString();
    if (text.endsWith(".0")) {
      text = text.substring(0, text.length - 2);
    }

    return text;

  } else if (object instanceof Array) {
    const list = object as Array<Object>;
    return stringifyList(list, depth + 1);

  } else if (object instanceof ObjectLiteral) {
    const objLiteral = object;
    let pairBuilder = '{';

    for (const prop of objLiteral.properties!) {
      if (prop instanceof Pair) {
        pairBuilder += '\n';
        if (prop.value instanceof Variable) {
          pairBuilder += stringifyPairWithIndent(
            prop.key.lexeme, prop.value.name.lexeme,
            depth + 1, '', '->', ';');
        } else {
          pairBuilder += stringify(prop.value, depth);
        }
      }
    }
    pairBuilder += `\n${indentedBrace(depth - 1, depth + 1)}`;
    return pairBuilder;
  } else if (object instanceof YmkInstance) {
    let pairBuilder = '{';
    let removeTrailingComma = false;
    for (const [key, value] of object.getFields().entries()!) {
      pairBuilder += '\n';
      pairBuilder += stringifyPairWithIndent(key,
        stringify(value, isPair(value) ? depth+1 : depth),
        depth, '', '->', ',');
      removeTrailingComma = true;
    }
    removeTrailingComma && (pairBuilder = pairBuilder.slice(0, pairBuilder.length - 1));
    pairBuilder += `\n${indentedBrace(depth - 1, depth)}`;
    return pairBuilder;
  } else if (object instanceof Map) {
    let pairBuilder = '{';
    let removeTrailingComma = false;
    for (const [key, value] of object) {
      pairBuilder += '\n';
      pairBuilder += stringifyPairWithIndent(key,
        stringify(value, isPair(value) ? depth+1 : 0), depth,
          '', '->', ',');
      removeTrailingComma = true;
    }
    removeTrailingComma && (pairBuilder = pairBuilder.slice(0, pairBuilder.length - 1));
    pairBuilder += `\n${indentedBrace(depth - 1, depth)}`;
    return pairBuilder;
  }

  return repeatString(' ', depth * 2) + object.toString();
}

