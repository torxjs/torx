/**
 * Created by stephen-ullom 9/5/2021
 * @file Torx templating engine. {@link http://torxjs.com}
 * @author Stephen Ullom
 * @project Torx
 */

import * as fs from "fs";
import * as ts from "typescript";
import { TorxError } from "./torx-error";

export function express(filePath: string, options: any, callback: Function) {
   fs.readFile(filePath, "utf8", (error, data) => {
      if (!error) {
         compile(data, options)
            .then(out => callback(null, out))
            .catch((error: TorxError) => callback(error));
      } else {
         callback(error);
      }
   });
}

export function compileFile(filePath: string, data = {}): Promise<string> {
   return new Promise((resolve, reject) => {
      if (fs.existsSync(filePath)) {
         fs.readFile(filePath, "utf8", (error, text) => {
            if (!error) {
               compile(text, data)
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

export function compile(source: string, data: object = {}): Promise<string> {
   return new Promise<string>((resolve, reject) => {
      if (source.includes("@")) {
         transpile(source, data)
            .then(async script => {
               const input = [
                  "(async function() {",
                  generateScriptVariables(data),
                  "var __output__ = ''; ",
                  "var __include = async (path, data) => { __output__ += await compileFile(path, data); }; ",
                  "var __print = (text) => { __output__ += text; return text; }; ",
                  "__print(" + script + "); ",
                  "return __output__; ",
                  "})();",
               ];
               const js = ts.transpile(input.join(""));
               // const torx = new Function(js);
               const result = await eval(js);
               resolve(result);
            })
            .catch(error => {
               reject(error);
            });
      } else {
         resolve(source);
      }
   });
}

function transpileFile(filePath: string, data?: any): Promise<string> {
   return new Promise((resolve, reject) => {
      if (fs.existsSync(filePath)) {
         fs.readFile(filePath, "utf8", (error, fileData) => {
            if (!error) {
               // transpile(data, filePath).then(out => {
               transpile(fileData, data)
                  .then(out => {
                     resolve(out);
                  })
                  .catch(
                     // TODO: Fix filePath
                     (error: TorxError) => reject(error.setFileName(filePath))
                  );
            } else {
               reject(new TorxError(`Could not read file ${filePath}`));
            }
         });
      } else {
         reject(new TorxError(`No file exists at '${filePath}'`));
      }
   });
}

/**
 * Returns a string that declares JavaScript variables
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
 * Convert a Torx document into JavaScript
 * @param {string} source - Text containing Torx syntax
 * @param {any} data - Data to include in the scope
 * @param {string} filePath - Useful for including files with a relative path?
 */
function transpile(source: string, data: any = {}): Promise<string> {
   return new Promise<string>(async (resolve, reject) => {
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
                        output += "`);" + bracketPair.substring(1, bracketPair.length - 1) + "__print(`";
                        index += bracketPair.length;
                     } else {
                        reject(generateTorxError("Missing closing }", source, index));
                     }
                     break;
                  default:
                     const match = source.substring(index).match(/^\w+/);
                     if (match) {
                        const word = match[0];
                        if (["function", "for", "if"].indexOf(word) >= 0) {
                           // TODO: skip first (params) group
                           const openBracketIndex = source.indexOf("{", index);
                           if (openBracketIndex >= 0) {
                              const controlText = source.substring(index, openBracketIndex);
                              output += "`);" + controlText;
                              index += controlText.length + 1;
                              const bracketPair = getMatchingPair(source.substring(openBracketIndex));
                              if (bracketPair) {
                                 await transpile(bracketPair.substring(1, bracketPair.length - 1), data)
                                    .then(script => {
                                       if (word === "function") {
                                          output += "{ return " + script + "; } __print(`";
                                       } else {
                                          output += "{ __print(" + script + "); } __print(`";
                                       }
                                       index += bracketPair.length;
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
                           output += "`); await __include(" + script + "); __print(`";
                           index += word.length + parenthisis.length;
                        } else {
                           const variable = getVariable(source.substring(index + word.length));
                           if (variable) {
                              output += "` + (" + word + variable + " || '') + `";
                              index += word.length + variable.length;
                           } else {
                              output += "` + (" + word + " || '') + `";
                              index += word.length;
                           }
                        }
                     }
                     break;
               }
            }
            symbolPos = source.indexOf("@", index);
            if (symbolPos >= 0) {
               if (commentDepth === 0) {
                  output += `${source.substring(index, symbolPos)}`;
               }
               index = source.indexOf("@", symbolPos);
            }
         } while (symbolPos >= 0);
         if (commentDepth === 0) {
            output += source.substring(index);
         }
         output += "`";
         resolve(output);
      } else {
         resolve(source);
      }
   });
}

/**
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
 * Get the column number and line number from a source and index
 * @param {string} message - The error message to display
 * @param {string} source - The text containing multiple lines
 * @param {number} index - Location to get line number from
 */
function generateTorxError(message: string, source: string, index: number): TorxError {
   const leadingText = source.substring(0, index);
   const leadingLines = leadingText.split("\n");
   const lineNumber = leadingLines.length;
   const columnNumber = leadingLines[lineNumber - 1].length;
   return new TorxError(message, columnNumber, lineNumber);
}
