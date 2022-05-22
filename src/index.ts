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

const AsyncFunction: FunctionConstructor = Object.getPrototypeOf(async function () {}).constructor;

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
export function express(filePath: string, options: any, callback: Function) {
   fs.readFile(filePath, "utf8", (error, data) => {
      if (!error) {
         compile(data, options, filePath)
            .then(out => callback(null, out))
            .catch(error => {
               if (error instanceof TorxError && !error.fileName) {
                  error.fileName = filePath;
               }
               callback(error);
            });
      } else {
         callback(error);
      }
   });
}

/**
 * Compile Torx template code
 * @param {string} torx - Torx template code
 * @param {any} data - optional values to pass into the template
 * @param {string} filePath - the path to the source file
 * @returns {Promise<string>}
 */
export function compile(torx: string, data = {}, filePath = ""): Promise<string> {
   return new Promise<string>((resolve, reject) => {
      if (torx.includes("@")) {
         transpile(torx, data, filePath)
            .then(script => {
               const input = [
                  "return (async () => {",
                  generateScriptVariables(data),
                  "let __output = ''; ",
                  `const __include = async (path, data = {}, filePath = '${filePath}') => {`,
                  `__output += await __data.compileFile(path, data, filePath); `,
                  `}; `,
                  `const file = (path, encoding) => { return __data.readFile(path, encoding, '${filePath}'); }; `,
                  "const print = (text) => { __output += text; return text; }; ",
                  "print(" + script + "); ",
                  "return __output; ",
                  "})();",
               ];
               const file = input.join("");
               const torx = new AsyncFunction("__data", ts.transpile(file));
               // Without TypeScript
               // torx = new AsyncFunction("__data", file);
               torx({
                  compileFile,
                  readFile,
               })
                  .then(output => {
                     resolve(output);
                  })
                  .catch(error => {
                     reject(error);
                  });
            })
            .catch(error => {
               reject(error);
            });
      } else {
         resolve(torx);
      }
   });
}

/**
 * Compile a Torx file and return the output.
 * @param filePath - file path to Torx file
 * @param data - optional values to pass into the template
 * @param parentPath - path of parent file
 * @returns {Promise<string>}
 */
function compileFile(filePath: string, data = {}, parentPath?: string): Promise<string> {
   return new Promise((resolve, reject) => {
      if (parentPath) {
         filePath = path.join(path.dirname(parentPath), filePath);
      }
      if (fs.existsSync(filePath)) {
         fs.readFile(filePath, "utf8", (error, text) => {
            if (!error) {
               compile(text, data, filePath)
                  .then(out => {
                     resolve(out);
                  })
                  .catch(error => reject(error));
            } else {
               reject(`Could not read file ${filePath}`);
            }
         });
      } else {
         reject(`No file exists at '${filePath}'`);
      }
   });
}

/**
 * Get text content of a file
 */
function readFile(filePath: string, encoding: any = "utf-8", parentPath?: string): Buffer {
   if (parentPath) {
      filePath = path.join(path.dirname(parentPath), filePath);
      // throw "parent " + parentPath + " - " + filePath;
   }
   return fs.readFileSync(filePath, encoding);
}

/**
 * Convert variable data into raw JavaScript.
 */
function generateScriptVariables(data: any): string {
   let output = "";
   if (data) {
      Object.keys(data).forEach(key => {
         if (data[key]) {
            try {
               const json = JSON.stringify(data[key]);
               output += `var ${key} = ${json ? json : data[key]}; `;
            } catch (error) {
               output += `var ${key} = null; `;
            }
         } else {
            output += `var ${key} = null; `;
         }
      });
   }
   return output;
}

/**
 * Transpile a Torx document into TypeScript.
 * @param {string} source - text containing Torx syntax
 * @param {any} data - data to include in the scope
 * @param {string} filepath - source file path
 */
function transpile(source: string, data = {}, filePath = ""): Promise<string> {
   return new Promise<string>(async (resolve, reject) => {
      // Remove all @/ comments if not @@/
      source = source.replace(/(?<!@)@\/.*$/gm, "");
      let symbolPos = source.indexOf("@");
      if (symbolPos >= 0) {
         let output = "`" + source.substring(0, symbolPos);
         let index = symbolPos;
         let commentDepth = 0;
         do {
            index++;
            if (source.charAt(index) === "*") {
               index++;
               commentDepth++;
            } else if (commentDepth > 0) {
               if (source.charAt(index - 2) === "*") {
                  commentDepth--;
               }
            } else {
               switch (source.charAt(index)) {
                  case "@":
                     output += "@";
                     index++;
                     break;
                  case "/":
                     if (source.charAt(index + 1) === "/") {
                        const endOfLine = source.indexOf("\n", index + 1);
                        index = endOfLine;
                        if (source.charAt(index) === "\n") {
                           index++;
                        }
                     }
                     break;
                  case "(":
                     const groupPair = getMatchingPair(source.substring(index));
                     if (groupPair) {
                        output += "` + " + groupPair + " + `";
                        index += groupPair.length;
                     } else {
                        reject(generateTorxError("Missing closing )", source, index));
                     }
                     break;
                  case "{":
                     const bracketPair = getMatchingPair(source.substring(index));
                     if (bracketPair) {
                        output += "`);" + bracketPair.substring(1, bracketPair.length - 1) + "print(`";
                        index += bracketPair.length;
                        if (source.charAt(index) === "\n") {
                           index++;
                        }
                     } else {
                        reject(generateTorxError("Missing closing }", source, index));
                     }
                     break;
                  default:
                     const match = source.substring(index).match(/^\w+/);
                     if (match) {
                        const word = match[0];
                        if (["function", "for", "if"].indexOf(word) >= 0) {
                           // Make sure the () group is ignored
                           const groupIndex = source.indexOf("(", index);
                           const groupText = getMatchingPair(source.substring(groupIndex));
                           const openBracketIndex = source.indexOf("{", groupIndex + groupText.length);
                           if (openBracketIndex >= 0) {
                              const controlText = source.substring(index, openBracketIndex);
                              output += "`);" + controlText;
                              index += controlText.length + 1;
                              const bracketPair = getMatchingPair(source.substring(openBracketIndex));
                              if (bracketPair) {
                                 let content = bracketPair.substring(1, bracketPair.length - 1);
                                 // Remove newline after open bracket
                                 if (content.charAt(0) === "\n") {
                                    content = content.substring(1);
                                 }
                                 // Remove newline after content
                                 if (content.charAt(content.length - 1) === "\n") {
                                    content = content.slice(0, -1);
                                 }
                                 index += bracketPair.length - 1;

                                 await transpile(content, data)
                                    .then(async script => {
                                       switch (word) {
                                          case "function":
                                             output += "{ return " + script + "; } print(`";

                                             break;
                                          case "if":
                                             output += "{ print(" + script;
                                             let precedingText = source.substring(index, index + " else ".length);
                                             while (precedingText === " else ") {
                                                const nextBracketIndex = source.indexOf("{", index);
                                                const elseText = source.substring(index, nextBracketIndex + 1);
                                                let nextBracketGroup;
                                                if (nextBracketIndex !== -1) {
                                                   output += "); }" + elseText + " print(";
                                                   nextBracketGroup = getMatchingPair(
                                                      source.substring(nextBracketIndex)
                                                   );
                                                } else {
                                                   break;
                                                }
                                                let newContent = nextBracketGroup.substring(1, bracketPair.length - 1);
                                                await transpile(newContent, data)
                                                   .then(newScript => {
                                                      output += newScript;
                                                   })
                                                   .catch(error => reject(error));
                                                index = nextBracketIndex + nextBracketGroup.length;
                                                precedingText = source.substring(index, index + " else ".length);
                                             }
                                             output += "); } print(`";
                                             break;
                                          default:
                                             output += "{ print(" + script + "); } print(`";

                                             break;
                                       }
                                       if (source.charAt(index) === "\n") {
                                          index++;
                                       }
                                    })
                                    .catch(error => reject(error));
                              } else {
                                 reject(generateTorxError("Could not find closing }", source, index));
                              }
                           } else {
                              reject(generateTorxError("Expecting {", source, index));
                           }
                        } else if (word === "include") {
                           const parenthisis = getMatchingPair(source.substring(index + word.length));
                           const script = parenthisis.slice(1, -1);
                           output += "`); await __include(" + script + ", '" + filePath + "'); print(`";
                           index += word.length + parenthisis.length;
                        } else {
                           const variable = getVariable(source.substring(index + word.length));
                           if (variable) {
                              output += "` + (" + word + variable + ") + `";
                              index += word.length + variable.length;
                           } else {
                              output += "` + (" + word + ") + `";
                              index += word.length;
                           }
                        }
                     } else {
                        reject(generateTorxError(`Unexpected token ${source.charAt(index)}`, source, index));
                     }
                     break;
               }
            }
            symbolPos = index >= 0 ? source.indexOf("@", index) : -1;
            if (symbolPos >= 0) {
               if (commentDepth === 0) {
                  output += `${source.substring(index, symbolPos)}`;
               }
               index = source.indexOf("@", symbolPos);
            }
         } while (symbolPos >= 0);
         if (commentDepth === 0 && index >= 0) {
            output += source.substring(index);
         }
         output += "`";
         resolve(output);
      } else {
         resolve("`" + source + "`");
      }
   });
}

/**
 * Detect and return a variable or parenthetical group.
 * @param {string} text - detects .word, () or []
 */
function getVariable(text: string): string {
   const firstChar = text.charAt(0);
   if (["(", "["].indexOf(firstChar) >= 0) {
      const pair = getMatchingPair(text);
      return pair + getVariable(text.substring(pair.length));
   } else if (firstChar === ".") {
      const word = text.substring(1).match(/\w+/)[0];
      return "." + word + getVariable(text.substring(word.length + 1));
   } else {
      return "";
   }
}

/**
 * Gets the surrounding parenthesis or brackets and the text inside them.
 * @param {string} text - should begin with (, { or [
 */
function getMatchingPair(text: string): string {
   const pairs = [
      {
         open: "(",
         close: ")",
      },
      {
         open: "{",
         close: "}",
      },
      {
         open: "[",
         close: "]",
      },
   ];
   if (text.length > 0) {
      const pair = pairs.find(p => p.open === text[0]);
      if (pair) {
         let index = 1;
         let depth = 0;
         while (index < text.length) {
            const char = text.charAt(index);
            if (["'", '"', "`"].indexOf(char) >= 0) {
               const quotedString = getMatchingQuotes(text.substring(index));
               if (quotedString) {
                  index += quotedString.length - 1;
               } else {
                  throw new TorxError(`Could not find matching quote for ${char}`);
               }
            } else if (char === pair.close) {
               if (depth === 0) {
                  return text.substring(0, index + 1);
               } else {
                  depth--;
               }
            } else if (char === pair.open) {
               depth++;
            }
            index++;
         }
         throw new TorxError(`Could not find matching pair for ${pair.open}`);
      } else {
         throw new TorxError(`The character '${text[0]}' is not a matchable pair.`);
      }
   } else {
      throw new TorxError("Cannot find matching pair of an empty string.");
   }
}

/**
 * Gets the surrounding quotes and the text inside them.
 * @param {string} text - should begin with ', " or `
 */
function getMatchingQuotes(text: string): string {
   const quotes = ["'", '"', "`"];
   if (text.length > 0) {
      const quote = quotes.find(q => q === text[0]);
      if (quote) {
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
      }
   }
   return null;
}

/**
 * Get the column number and line number from a source and index.
 * @param {string} message - error message to display
 * @param {string} source - text containing multiple lines
 * @param {number} index - location to get line number from
 */
function generateTorxError(message: string, source: string, index: number): TorxError {
   const leadingText = source.substring(0, index);
   const leadingLines = leadingText.split("\n");
   const lineNumber = leadingLines.length;
   const columnNumber = leadingLines[lineNumber - 1].length;
   return new TorxError(message, { columnNumber, lineNumber, source });
}
