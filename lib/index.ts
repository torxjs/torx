/**
 * Created by stephen-ullom 9/5/2021
 * @file Torx templating engine. {@link http://torxjs.com}
 * @author Stephen Ullom
 * @project Torx
 */

import * as fs from "fs";
import * as ts from "typescript";
import * as path from "path";

import { TorxError } from "./torx-error";

export { TorxError } from "./torx-error";

const AsyncFunction: FunctionConstructor = Object.getPrototypeOf(async function () {}).constructor;

/** Keywords that start a control block: `@if (...) { ... }` */
const CONTROL_KEYWORDS = ["if", "for", "while", "function", "try"];

/** Words that continue a control block after its closing bracket. */
const CONTINUATION_PATTERN = /^\s*(else\s+if|else|catch|finally)(?=[\s({])/;

const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;

const RESERVED_WORDS = new Set([
   "await",
   "break",
   "case",
   "catch",
   "class",
   "const",
   "continue",
   "debugger",
   "default",
   "delete",
   "do",
   "else",
   "enum",
   "export",
   "extends",
   "false",
   "finally",
   "for",
   "function",
   "if",
   "implements",
   "import",
   "in",
   "instanceof",
   "interface",
   "let",
   "new",
   "null",
   "package",
   "private",
   "protected",
   "public",
   "return",
   "static",
   "super",
   "switch",
   "this",
   "throw",
   "true",
   "try",
   "typeof",
   "var",
   "void",
   "while",
   "with",
   "yield",
]);

/**
 * Callback for Express.
 * @callback expressCallback
 * @param {any} error
 * @param {string} response
 */

/**
 * Torx template engine for Express.
 * @param {string} filePath
 * @param {any} options
 * @param {expressCallback} callback
 */
export function express(filePath: string, options: any, callback: (error: any, output?: string) => void): void {
   compileFile(filePath, options)
      .then(output => callback(null, output))
      .catch(error => callback(error));
}

/**
 * Compile Torx template code
 * @param {string} torx - Torx template code
 * @param {any} [data] - optional values to pass into the template
 * @param {string} [filePath] - the path to the source file
 * @returns {Promise<string>}
 */
export async function compile(torx: string, data: any = {}, filePath = ""): Promise<string> {
   if (!torx.includes("@")) {
      return torx;
   }
   const script = await transpile(torx, { filePath, root: torx, offset: 0 });
   const filePathLiteral = JSON.stringify(filePath);
   const input = [
      "return (async () => {",
      generateScriptVariables(data),
      "let __output = ''; ",
      "const print = (text) => { __output += text; return text; }; ",
      "const __value = async (value) => (await value) ?? ''; ",
      `const __include = (path, data = {}) => __data.compileFile(path, data, ${filePathLiteral}); `,
      `const file = (path, encoding) => __data.readFile(path, encoding, ${filePathLiteral}); `,
      "print(" + script + "); ",
      "return __output; ",
      "})();",
   ];
   const result = ts.transpileModule(input.join(""), {
      reportDiagnostics: true,
      compilerOptions: {
         target: ts.ScriptTarget.ES2020,
         module: ts.ModuleKind.ESNext,
      },
   });
   const diagnostic = result.diagnostics?.[0];
   if (diagnostic) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      throw new TorxError(`TypeScript: ${message}`, { fileName: filePath || undefined });
   }
   const torxFunction = new AsyncFunction("__data", result.outputText);
   try {
      return await torxFunction({ data: data ?? {}, compileFile, readFile });
   } catch (error) {
      if (error instanceof TorxError && !error.fileName && filePath) {
         error.fileName = filePath;
      }
      throw error;
   }
}

/**
 * Compile a Torx file and return the output.
 * @param filePath - file path to Torx file
 * @param data - optional values to pass into the template
 * @param parentFilePath - path of parent file, used to resolve a relative filePath
 * @returns {Promise<string>}
 */
export async function compileFile(filePath: string, data: any = {}, parentFilePath?: string): Promise<string> {
   if (parentFilePath) {
      filePath = path.join(path.dirname(parentFilePath), filePath);
   }
   let text: string;
   try {
      text = await fs.promises.readFile(filePath, "utf8");
   } catch (error: any) {
      if (error?.code === "ENOENT") {
         throw new TorxError(`No file exists at '${filePath}'`, { fileName: parentFilePath });
      }
      throw new TorxError(`Could not read file '${filePath}': ${error?.message ?? error}`, {
         fileName: parentFilePath,
      });
   }
   try {
      return await compile(text, data, filePath);
   } catch (error) {
      if (error instanceof TorxError && !error.fileName) {
         error.fileName = filePath;
      }
      throw error;
   }
}

/**
 * Get text content of a file, relative to the template that calls it.
 */
function readFile(filePath: string, encoding: BufferEncoding = "utf-8", parentPath?: string): string {
   if (parentPath) {
      filePath = path.join(path.dirname(parentPath), filePath);
   }
   return fs.readFileSync(filePath, encoding);
}

/**
 * Declare each data key as a variable in the template scope.
 * Values are read from the data object at runtime, so functions, dates and
 * other non-JSON values are passed through unchanged.
 */
function generateScriptVariables(data: any): string {
   let output = "";
   if (data && typeof data === "object") {
      Object.keys(data).forEach(key => {
         if (IDENTIFIER_PATTERN.test(key) && !RESERVED_WORDS.has(key)) {
            output += `var ${key} = __data.data[${JSON.stringify(key)}]; `;
         }
      });
   }
   return output;
}

/** Where a piece of template text sits inside the original source. */
interface TranspileContext {
   filePath: string;
   /** The complete source, for error messages. */
   root: string;
   /** Index of the current text within root. */
   offset: number;
}

/**
 * Escape text so it can be placed inside a JavaScript template literal.
 */
function escapeText(text: string): string {
   return text.replace(/[\\`]/g, "\\$&").replace(/\$\{/g, "\\${").replace(/\r/g, "\\r");
}

/**
 * Remove the newline that follows an opening bracket and the indentation
 * that precedes a closing bracket, so block content lines up with the output.
 */
function trimBlockContent(content: string): string {
   return content.replace(/^\r?\n/, "").replace(/(\r?\n)[ \t]*$/, "$1");
}

/**
 * Length of a newline at the start of the text, or 0.
 */
function newlineLength(text: string): number {
   const match = text.match(/^\r?\n/);
   return match ? match[0].length : 0;
}

/**
 * Transpile a Torx document into a TypeScript expression.
 * @param {string} source - text containing Torx syntax
 * @param {TranspileContext} context - source position and file information
 */
async function transpile(source: string, context: TranspileContext): Promise<string> {
   const fail = (message: string, index: number): TorxError => generateTorxError(message, context, index);
   const pairAt = (index: number, mode: PairMode): string => {
      try {
         return getMatchingPair(source.substring(index), mode);
      } catch (error) {
         throw fail(error instanceof Error ? error.message : String(error), index);
      }
   };
   const nested = (content: string, offset: number): Promise<string> =>
      transpile(content, { ...context, offset: context.offset + offset });
   // Drop the indentation before a block that starts its own line, so it is not repeated in the output
   const dropIndent = (symbolPos: number): void => {
      const lineStart = source.lastIndexOf("\n", symbolPos - 1) + 1;
      const indent = source.substring(lineStart, symbolPos);
      if (indent.length > 0 && /^[ \t]+$/.test(indent) && output.endsWith(indent)) {
         output = output.slice(0, -indent.length);
      }
   };

   let output = "`";
   let index = 0;
   let commentDepth = 0;
   let commentStart = 0;

   while (index < source.length) {
      const symbolPos = source.indexOf("@", index);
      if (symbolPos < 0) {
         if (commentDepth === 0) {
            output += escapeText(source.substring(index));
         }
         index = source.length;
         break;
      }
      if (commentDepth === 0) {
         output += escapeText(source.substring(index, symbolPos));
      }
      index = symbolPos + 1;
      const char = source.charAt(index);

      if (char === "*") {
         // Begin multiline comment
         if (commentDepth === 0) {
            commentStart = symbolPos;
         }
         commentDepth++;
         index++;
         continue;
      }
      if (commentDepth > 0) {
         if (source.charAt(symbolPos - 1) === "*") {
            // End multiline comment
            commentDepth--;
         }
         continue;
      }

      switch (char) {
         case "@": {
            // Escape with @@
            output += "@";
            index++;
            break;
         }
         case "/": {
            // Single line comment
            const endOfLine = source.indexOf("\n", index);
            index = endOfLine < 0 ? source.length : endOfLine;
            break;
         }
         case "(": {
            // Explicit expression
            const group = pairAt(index, "code");
            output += "` + (await __value(" + group + ")) + `";
            index += group.length;
            break;
         }
         case "{": {
            // Code block
            dropIndent(symbolPos);
            const block = pairAt(index, "code");
            output += "`); " + block.substring(1, block.length - 1) + " print(`";
            index += block.length;
            index += newlineLength(source.substring(index));
            break;
         }
         default: {
            const match = source.substring(index).match(/^[A-Za-z_$][\w$]*/);
            if (!match) {
               throw fail(char ? `Unexpected token '${char}' after @` : "Unexpected end of template after @", index);
            }
            const word = match[0];
            if (CONTROL_KEYWORDS.includes(word)) {
               dropIndent(symbolPos);
               // Find the opening bracket, skipping the (...) group so brackets inside it are ignored
               let openBracketIndex: number;
               if (word === "try") {
                  openBracketIndex = source.indexOf("{", index);
               } else {
                  const groupIndex = source.indexOf("(", index);
                  if (groupIndex < 0) {
                     throw fail(`Expecting ( after @${word}`, index);
                  }
                  const groupText = pairAt(groupIndex, "code");
                  openBracketIndex = source.indexOf("{", groupIndex + groupText.length);
               }
               if (openBracketIndex < 0) {
                  throw fail(`Expecting { after @${word}`, index);
               }
               const controlText = source.substring(index, openBracketIndex);
               const bracketPair = pairAt(openBracketIndex, "text");
               const content = trimBlockContent(bracketPair.substring(1, bracketPair.length - 1));
               index = openBracketIndex + bracketPair.length;
               const script = await nested(content, openBracketIndex + 1);

               switch (word) {
                  case "function": {
                     // Functions collect their own output and return it
                     output +=
                        "`); async " +
                        controlText +
                        "{ let __output = ''; const print = (text) => { __output += text; return text; }; " +
                        `print(${script}); return __output; } print(\``;
                     break;
                  }
                  case "if":
                  case "try": {
                     output += "`); " + controlText + `{ print(${script}); }`;
                     // Continue with else, else if, catch and finally blocks
                     let continuation = source.substring(index).match(CONTINUATION_PATTERN);
                     while (continuation) {
                        let cursor = index + continuation[0].length;
                        const nextChar = source.substring(cursor).match(/^\s*(.)/)?.[1];
                        if (nextChar === "(") {
                           const groupIndex = source.indexOf("(", cursor);
                           cursor = groupIndex + pairAt(groupIndex, "code").length;
                        }
                        const nextBracketIndex = source.indexOf("{", cursor);
                        if (nextBracketIndex < 0 || source.substring(cursor, nextBracketIndex).trim() !== "") {
                           throw fail(`Expecting { after ${continuation[1]}`, cursor);
                        }
                        const nextText = source.substring(index, nextBracketIndex);
                        const nextPair = pairAt(nextBracketIndex, "text");
                        const nextContent = trimBlockContent(nextPair.substring(1, nextPair.length - 1));
                        const nextScript = await nested(nextContent, nextBracketIndex + 1);
                        output += nextText + `{ print(${nextScript}); }`;
                        index = nextBracketIndex + nextPair.length;
                        continuation = source.substring(index).match(CONTINUATION_PATTERN);
                     }
                     output += " print(`";
                     break;
                  }
                  default: {
                     // for, while
                     output += "`); " + controlText + `{ print(${script}); } print(\``;
                     break;
                  }
               }
               index += newlineLength(source.substring(index));
            } else if (word === "include") {
               // Include another template
               const argsIndex = index + word.length;
               if (source.charAt(argsIndex) !== "(") {
                  throw fail("Expecting ( after @include", argsIndex);
               }
               const args = pairAt(argsIndex, "code");
               output += "` + (await __include" + args + ") + `";
               index = argsIndex + args.length;
            } else {
               // Implicit expression: @name, @name.first, @list[0], @fn(arg)
               const chain = getVariable(source.substring(index + word.length));
               const expression = word + chain;
               output += `\` + (await __value(typeof ${word} !== 'undefined' ? (${expression}) : undefined)) + \``;
               index += expression.length;
            }
            break;
         }
      }
   }

   if (commentDepth > 0) {
      throw fail("Missing closing *@", commentStart);
   }
   return output + "`";
}

/**
 * Detect and return a member chain following a variable name.
 * @param {string} text - detects .word, ?.word, (), [] in any combination
 */
function getVariable(text: string): string {
   const firstChar = text.charAt(0);
   if (firstChar === "(" || firstChar === "[") {
      const pair = getMatchingPair(text, "code");
      return pair + getVariable(text.substring(pair.length));
   }
   const member = text.match(/^(\?\.|\.)([A-Za-z_$][\w$]*)/);
   if (member) {
      return member[0] + getVariable(text.substring(member[0].length));
   }
   if (text.startsWith("?.") && (text.charAt(2) === "(" || text.charAt(2) === "[")) {
      const pair = getMatchingPair(text.substring(2), "code");
      return "?." + pair + getVariable(text.substring(2 + pair.length));
   }
   return "";
}

/**
 * "code" treats quotes and comments as JavaScript.
 * "text" treats the content as template text, where only @ expressions are code.
 */
type PairMode = "code" | "text";

const PAIRS: { [open: string]: string } = { "(": ")", "{": "}", "[": "]" };

/**
 * Gets the surrounding parenthesis or brackets and the text inside them.
 * @param {string} text - should begin with (, { or [
 * @param {PairMode} mode - how to treat the content
 */
function getMatchingPair(text: string, mode: PairMode = "code"): string {
   if (text.length === 0) {
      throw new TorxError("Cannot find matching pair of an empty string.");
   }
   const open = text[0];
   const close = PAIRS[open];
   if (!close) {
      throw new TorxError(`The character '${open}' is not a matchable pair.`);
   }
   let index = 1;
   let depth = 0;
   while (index < text.length) {
      const char = text.charAt(index);
      if (mode === "code") {
         if (char === "'" || char === '"' || char === "`") {
            const quotedString = getMatchingQuotes(text.substring(index));
            if (!quotedString) {
               throw new TorxError(`Could not find matching quote for ${char}`);
            }
            index += quotedString.length;
            continue;
         }
         if (char === "/" && text.charAt(index + 1) === "/") {
            const endOfLine = text.indexOf("\n", index);
            index = endOfLine < 0 ? text.length : endOfLine;
            continue;
         }
         if (char === "/" && text.charAt(index + 1) === "*") {
            const endOfComment = text.indexOf("*/", index + 2);
            index = endOfComment < 0 ? text.length : endOfComment + 2;
            continue;
         }
      } else if (char === "@") {
         index += skipTextExpression(text.substring(index));
         continue;
      }
      if (char === close) {
         if (depth === 0) {
            return text.substring(0, index + 1);
         }
         depth--;
      } else if (char === open) {
         depth++;
      }
      index++;
   }
   throw new TorxError(`Could not find matching ${close} for ${open}`);
}

/**
 * Length of the @ expression at the start of text, so brackets inside it are not counted.
 */
function skipTextExpression(text: string): number {
   const next = text.charAt(1);
   if (next === "@") {
      return 2;
   }
   if (next === "*") {
      const end = text.indexOf("*@", 2);
      return end < 0 ? text.length : end + 2;
   }
   if (next === "/") {
      const endOfLine = text.indexOf("\n", 1);
      return endOfLine < 0 ? text.length : endOfLine;
   }
   if (next === "(" || next === "{" || next === "[") {
      return 1 + getMatchingPair(text.substring(1), "code").length;
   }
   const word = text.substring(1).match(/^[A-Za-z_$][\w$]*/);
   if (word) {
      if (CONTROL_KEYWORDS.includes(word[0]) || word[0] === "include") {
         // The block or arguments that follow are matched by the caller
         return 1 + word[0].length;
      }
      return 1 + word[0].length + getVariable(text.substring(1 + word[0].length)).length;
   }
   return 1;
}

/**
 * Gets the surrounding quotes and the text inside them.
 * @param {string} text - should begin with ', " or `
 */
function getMatchingQuotes(text: string): string | null {
   const quote = text[0];
   if (quote !== "'" && quote !== '"' && quote !== "`") {
      return null;
   }
   let index = 1;
   while (index < text.length) {
      const char = text.charAt(index);
      if (char === "\\") {
         index++;
      } else if (char === quote) {
         return text.substring(0, index + 1);
      }
      index++;
   }
   return null;
}

/**
 * Create an error that points at a position in the original source.
 * @param {string} message - error message to display
 * @param {TranspileContext} context - source and offset of the current text
 * @param {number} index - location within the current text
 */
function generateTorxError(message: string, context: TranspileContext, index: number): TorxError {
   const leadingText = context.root.substring(0, context.offset + index);
   const leadingLines = leadingText.split("\n");
   const lineNumber = leadingLines.length;
   const columnNumber = leadingLines[lineNumber - 1].length;
   return new TorxError(message, {
      columnNumber,
      lineNumber,
      source: context.root,
      fileName: context.filePath || undefined,
   });
}
