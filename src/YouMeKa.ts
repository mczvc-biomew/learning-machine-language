import * as fs from 'fs';
import * as readline from 'readline';

import { Interpreter } from "./Interpreter";

import { Token } from "./Token";

import { TokenType } from "./TokenType";

import { RuntimeError } from "./RuntimeError";

import { Scanner } from "./Scanner";

import { Parser } from "./Parser";

import { Resolver } from "./Resolver";
import { isNumber } from './object';

export class YouMeKa {
  private static interpreter: Interpreter = new Interpreter();

  static hadError: boolean = false;
  static hadRuntimeError = false;

  public static async main(args: string[]): Promise<void> {
    console.log("Hello and welcome!\n");

    if (args.length > 1) {
      console.log("Usage: ymk [script]");
      // @ts-ignore
      process.exit(64);
    } else if (args.length === 1) {
      await this.runFile(args[0]);
    } else {
      this.runPrompt();
    }
  }

  private static async runFile(fileName: string): Promise<void> {
    try {
      const content = await fs.promises.readFile(fileName, 'utf8');
      YouMeKa.run(content);
      if (YouMeKa.hadError)
        // @ts-ignore
        process.exit(65);
      if (YouMeKa.hadRuntimeError) {
        // @ts-ignore
        process.exit(70);
      }
    } catch (error) {
      console.error(error);
      // @ts-ignore
      process.exit(1);
    }
  }

  private static runPrompt() {
    const rl = readline.createInterface({
      // @ts-ignore
      input: process.stdin,
      // @ts-ignore
      output: process.stdout,
    });

    rl.setPrompt('ymk> ');
    rl.prompt();

    rl.on('line', (line: string) => {
      YouMeKa.run(line);
      YouMeKa.hadError = false;
      rl.prompt();
    });

    rl.on('close', () => {
      // @ts-ignore
      process.exit(0);
    });
  }

  private static run(source: string) {
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const statements = parser.parse();

    if (YouMeKa.hadError) return;

    const resolver = new Resolver(YouMeKa.interpreter);
    resolver.resolve(statements);

    if (YouMeKa.hadError) return;

    YouMeKa.interpreter.interpret(statements);
  }

  static error(line: number | Token, message: string): void {
    if (isNumber(line)) {
      this.report(Number(line), "", message);
    } else if (line instanceof Token) {
      const token = line;
      if (token.type === TokenType.EOF) {
        YouMeKa.report(Number(token.line), " at end", message);
      } else {
        YouMeKa.report(Number(token.line), ` at '${token.lexeme}'`, message);
      }
    }
  }

  private static report(line: number, where: string, message: string) {
    console.error(`[line ${line}] Error ${where}: ${message}`);
    this.hadError = true;
  }

  static runtimeError(error: RuntimeError) {
    console.error(error.message +
      ((error.token !== null) ? `\n[line ${error.token?.line}].`: "."));
    this.hadRuntimeError = true;
  }

}

export default async function() {
  // @ts-ignore
  await YouMeKa.main(process.argv.slice(2));
};