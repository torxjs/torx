#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { performance } from "perf_hooks";
import { compileFile, TorxError } from ".";

/**
 * Usage:
 *   torx <input.torx>                       print the output to stdout
 *   torx <input.torx> -o <output>           write the output to a file
 *   torx <input.torx> -d <data.json>        pass values from a JSON file into the template
 */

export interface CliOptions {
   input?: string;
   out?: string;
   data?: string;
   help: boolean;
   version: boolean;
}

export const HELP_TEXT = [
   "Usage: torx <input.torx> [options]",
   "",
   "Compile a Torx template. The output is printed to stdout unless --out is given.",
   "",
   "Options:",
   "  -o, --out <path>    write the output to this file",
   "  -d, --data <path>   JSON file with values available in the template",
   "  -v, --version       print the torx version",
   "  -h, --help          print this help",
   "",
   "Examples:",
   "  torx page.html.torx -o page.html",
   "  torx email.torx -d customer.json -o email.html",
   "  torx page.html.torx > page.html",
].join("\n");

/**
 * Parse command line arguments. Throws a string describing the first invalid argument.
 * @param args - arguments after the program name
 */
export function parseArgs(args: string[]): CliOptions {
   const options: CliOptions = { help: false, version: false };
   for (let index = 0; index < args.length; index++) {
      const arg = args[index];
      switch (arg) {
         case "-h":
         case "--help":
            options.help = true;
            break;
         case "-v":
         case "--version":
            options.version = true;
            break;
         case "-o":
         case "--out":
         case "-d":
         case "--data": {
            const value = args[index + 1];
            if (value === undefined || value.startsWith("-")) {
               throw `${arg} requires a file path`;
            }
            if (arg === "-o" || arg === "--out") {
               options.out = value;
            } else {
               options.data = value;
            }
            index++;
            break;
         }
         default:
            if (arg.startsWith("-")) {
               throw `Unknown option '${arg}'`;
            }
            if (options.input !== undefined) {
               throw `Unexpected argument '${arg}'. Use --out to set the output path.`;
            }
            options.input = arg;
            break;
      }
   }
   return options;
}

/**
 * Read and parse the JSON data file.
 */
function readData(dataPath: string): any {
   let text: string;
   try {
      text = fs.readFileSync(dataPath, "utf8");
   } catch {
      throw `Could not read data file '${dataPath}'`;
   }
   try {
      return JSON.parse(text);
   } catch (error: any) {
      throw `Could not parse '${dataPath}' as JSON: ${error?.message ?? error}`;
   }
}

/**
 * Turn any thrown value into a message for the terminal.
 */
function formatError(error: unknown): string {
   if (error instanceof TorxError) {
      return error.toString();
   }
   if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
   }
   return String(error);
}

/**
 * Run the command line interface.
 * @param args - arguments after the program name
 * @returns the process exit code
 */
export async function run(args: string[]): Promise<number> {
   let options: CliOptions;
   try {
      options = parseArgs(args);
   } catch (error) {
      console.error(`ERROR: ${formatError(error)}\n`);
      console.error(HELP_TEXT);
      return 1;
   }
   if (options.help) {
      console.log(HELP_TEXT);
      return 0;
   }
   if (options.version) {
      console.log("torx@" + require("../package.json").version);
      return 0;
   }
   if (!options.input) {
      console.error("ERROR: An input file is required.\n");
      console.error(HELP_TEXT);
      return 1;
   }

   const startTime = performance.now();
   try {
      const data = options.data ? readData(options.data) : {};
      const output = await compileFile(options.input, data);
      if (options.out) {
         fs.mkdirSync(path.dirname(options.out), { recursive: true });
         fs.writeFileSync(options.out, output);
         const buildTime = (performance.now() - startTime).toFixed();
         console.log(`BUILD: ${options.out} (${buildTime} ms)`);
      } else {
         process.stdout.write(output);
      }
      return 0;
   } catch (error) {
      console.error("ERROR: " + formatError(error));
      return 1;
   }
}

if (require.main === module) {
   run(process.argv.slice(2)).then(code => {
      process.exitCode = code;
   });
}
