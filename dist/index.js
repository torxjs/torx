"use strict";
/**
 * Created by stephen-ullom 9/5/2021
 * @file Torx templating engine. {@link http://torxjs.com}
 * @author Stephen Ullom
 * @project Torx
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.compile = exports.express = void 0;
var fs = require("fs");
var ts = require("typescript");
var path = require("path");
var torx_error_1 = require("./torx-error");
var AsyncFunction = Object.getPrototypeOf(function () {
    return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/];
    }); });
}).constructor;
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
function express(filePath, options, callback) {
    fs.readFile(filePath, "utf8", function (error, data) {
        if (!error) {
            compile(data, options, filePath)
                .then(function (out) { return callback(null, out); })["catch"](function (error) {
                if (error instanceof torx_error_1.TorxError && !error.fileName) {
                    error.fileName = filePath;
                }
                callback(error);
            });
        }
        else {
            callback(error);
        }
    });
}
exports.express = express;
/**
 * Compile Torx template code
 * @param {string} torx - Torx template code
 * @param {any} [data] - optional values to pass into the template
 * @param {string} [filePath] - the path to the source file
 * @returns {Promise<string>}
 */
function compile(torx, data, filePath) {
    if (data === void 0) { data = {}; }
    if (filePath === void 0) { filePath = ""; }
    return new Promise(function (resolve, reject) {
        if (torx.includes("@")) {
            transpile(torx, data, filePath)
                .then(function (script) {
                var input = [
                    "return (async () => {",
                    generateScriptVariables(data),
                    "let __output = ''; ",
                    "const __include = async (path, data = {}, filePath = '".concat(filePath, "') => {"),
                    "__output += await __data.compileFile(path, data, filePath); ",
                    "}; ",
                    "const file = (path, encoding) => { return __data.readFile(path, encoding, '".concat(filePath, "'); }; "),
                    "const print = (text) => { __output += text; return text; }; ",
                    "print(" + script + "); ",
                    "return __output; ",
                    "})();",
                ];
                var file = input.join("");
                var torx = new AsyncFunction("__data", ts.transpile(file));
                torx({
                    compileFile: compileFile,
                    readFile: readFile
                })
                    .then(function (output) {
                    resolve(output);
                })["catch"](function (error) {
                    reject(error);
                });
            })["catch"](function (error) {
                reject(error);
            });
        }
        else {
            resolve(torx);
        }
    });
}
exports.compile = compile;
/**
 * Compile a Torx file and return the output.
 * @param filePath - file path to Torx file
 * @param data - optional values to pass into the template
 * @param parentPath - path of parent file
 * @returns {Promise<string>}
 */
function compileFile(filePath, data, parentPath) {
    if (data === void 0) { data = {}; }
    return new Promise(function (resolve, reject) {
        if (parentPath) {
            filePath = path.join(path.dirname(parentPath), filePath);
        }
        if (fs.existsSync(filePath)) {
            fs.readFile(filePath, "utf8", function (error, text) {
                if (!error) {
                    compile(text, data, filePath)
                        .then(function (out) {
                        resolve(out);
                    })["catch"](function (error) { return reject(error); });
                }
                else {
                    reject("Could not read file ".concat(filePath));
                }
            });
        }
        else {
            reject("No file exists at '".concat(filePath, "'"));
        }
    });
}
/**
 * Get text content of a file
 */
function readFile(filePath, encoding, parentPath) {
    if (encoding === void 0) { encoding = "utf-8"; }
    if (parentPath) {
        filePath = path.join(path.dirname(parentPath), filePath);
    }
    return fs.readFileSync(filePath, encoding);
}
/**
 * Convert variable data into raw JavaScript.
 */
function generateScriptVariables(data) {
    var output = "";
    if (data) {
        Object.keys(data).forEach(function (key) {
            if (data[key]) {
                try {
                    var json = JSON.stringify(data[key]);
                    output += "var ".concat(key, " = ").concat(json ? json : data[key], "; ");
                }
                catch (error) {
                    output += "var ".concat(key, " = null; ");
                }
            }
            else {
                output += "var ".concat(key, " = null; ");
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
function transpile(source, data, filePath) {
    var _this = this;
    if (data === void 0) { data = {}; }
    if (filePath === void 0) { filePath = ""; }
    return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
        var symbolPos, output_1, index_1, commentDepth, _loop_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Remove all @/ comments if not @@/
                    source = source.replace(/(?<!@)@\/.*$/gm, "");
                    symbolPos = source.indexOf("@");
                    if (!(symbolPos >= 0)) return [3 /*break*/, 5];
                    output_1 = "`" + source.substring(0, symbolPos);
                    index_1 = symbolPos;
                    commentDepth = 0;
                    _loop_1 = function () {
                        var _b, endOfLine, groupPair, bracketPair, match, word_1, groupIndex, groupText, openBracketIndex, controlText, bracketPair_1, content, parenthisis, script, variable;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    index_1++;
                                    if (!(source.charAt(index_1) === "*")) return [3 /*break*/, 1];
                                    index_1++;
                                    commentDepth++;
                                    return [3 /*break*/, 17];
                                case 1:
                                    if (!(commentDepth > 0)) return [3 /*break*/, 2];
                                    if (source.charAt(index_1 - 2) === "*") {
                                        commentDepth--;
                                    }
                                    return [3 /*break*/, 17];
                                case 2:
                                    _b = source.charAt(index_1);
                                    switch (_b) {
                                        case "@": return [3 /*break*/, 3];
                                        case "/": return [3 /*break*/, 4];
                                        case "(": return [3 /*break*/, 5];
                                        case "{": return [3 /*break*/, 6];
                                    }
                                    return [3 /*break*/, 7];
                                case 3:
                                    output_1 += "@";
                                    index_1++;
                                    return [3 /*break*/, 17];
                                case 4:
                                    if (source.charAt(index_1 + 1) === "/") {
                                        endOfLine = source.indexOf("\n", index_1 + 1);
                                        index_1 = endOfLine;
                                        if (source.charAt(index_1) === "\n") {
                                            index_1++;
                                        }
                                    }
                                    return [3 /*break*/, 17];
                                case 5:
                                    groupPair = getMatchingPair(source.substring(index_1));
                                    if (groupPair) {
                                        output_1 += "` + " + groupPair + " + `";
                                        index_1 += groupPair.length;
                                    }
                                    else {
                                        reject(generateTorxError("Missing closing )", source, index_1));
                                    }
                                    return [3 /*break*/, 17];
                                case 6:
                                    bracketPair = getMatchingPair(source.substring(index_1));
                                    if (bracketPair) {
                                        output_1 += "`);" + bracketPair.substring(1, bracketPair.length - 1) + "print(`";
                                        index_1 += bracketPair.length;
                                        if (source.charAt(index_1) === "\n") {
                                            index_1++;
                                        }
                                    }
                                    else {
                                        reject(generateTorxError("Missing closing }", source, index_1));
                                    }
                                    return [3 /*break*/, 17];
                                case 7:
                                    match = source.substring(index_1).match(/^\w+/);
                                    if (!match) return [3 /*break*/, 15];
                                    word_1 = match[0];
                                    if (!(["function", "for", "if"].indexOf(word_1) >= 0)) return [3 /*break*/, 13];
                                    groupIndex = source.indexOf("(", index_1);
                                    groupText = getMatchingPair(source.substring(groupIndex));
                                    openBracketIndex = source.indexOf("{", groupIndex + groupText.length);
                                    if (!(openBracketIndex >= 0)) return [3 /*break*/, 11];
                                    controlText = source.substring(index_1, openBracketIndex);
                                    output_1 += "`);" + controlText;
                                    index_1 += controlText.length + 1;
                                    bracketPair_1 = getMatchingPair(source.substring(openBracketIndex));
                                    if (!bracketPair_1) return [3 /*break*/, 9];
                                    content = bracketPair_1.substring(1, bracketPair_1.length - 1);
                                    // Remove newline after open bracket
                                    if (content.charAt(0) === "\n") {
                                        content = content.substring(1);
                                    }
                                    // Remove newline after content
                                    if (content.charAt(content.length - 1) === "\n") {
                                        content = content.slice(0, -1);
                                    }
                                    index_1 += bracketPair_1.length - 1;
                                    return [4 /*yield*/, transpile(content, data)
                                            .then(function (script) { return __awaiter(_this, void 0, void 0, function () {
                                            var _a, precedingText, nextBracketIndex, elseText, nextBracketGroup, newContent;
                                            return __generator(this, function (_b) {
                                                switch (_b.label) {
                                                    case 0:
                                                        _a = word_1;
                                                        switch (_a) {
                                                            case "function": return [3 /*break*/, 1];
                                                            case "if": return [3 /*break*/, 2];
                                                        }
                                                        return [3 /*break*/, 6];
                                                    case 1:
                                                        output_1 += "{ return " + script + "; } print(`";
                                                        return [3 /*break*/, 7];
                                                    case 2:
                                                        output_1 += "{ print(" + script;
                                                        precedingText = source.substring(index_1, index_1 + " else ".length);
                                                        _b.label = 3;
                                                    case 3:
                                                        if (!(precedingText === " else ")) return [3 /*break*/, 5];
                                                        nextBracketIndex = source.indexOf("{", index_1);
                                                        elseText = source.substring(index_1, nextBracketIndex + 1);
                                                        nextBracketGroup = void 0;
                                                        if (nextBracketIndex !== -1) {
                                                            output_1 += "); }" + elseText + " print(";
                                                            nextBracketGroup = getMatchingPair(source.substring(nextBracketIndex));
                                                        }
                                                        else {
                                                            return [3 /*break*/, 5];
                                                        }
                                                        newContent = nextBracketGroup.substring(1, bracketPair_1.length - 1);
                                                        return [4 /*yield*/, transpile(newContent, data)
                                                                .then(function (newScript) {
                                                                output_1 += newScript;
                                                            })["catch"](function (error) { return reject(error); })];
                                                    case 4:
                                                        _b.sent();
                                                        index_1 = nextBracketIndex + nextBracketGroup.length;
                                                        precedingText = source.substring(index_1, index_1 + " else ".length);
                                                        return [3 /*break*/, 3];
                                                    case 5:
                                                        output_1 += "); } print(`";
                                                        return [3 /*break*/, 7];
                                                    case 6:
                                                        output_1 += "{ print(" + script + "); } print(`";
                                                        return [3 /*break*/, 7];
                                                    case 7:
                                                        if (source.charAt(index_1) === "\n") {
                                                            index_1++;
                                                        }
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); })["catch"](function (error) { return reject(error); })];
                                case 8:
                                    _c.sent();
                                    return [3 /*break*/, 10];
                                case 9:
                                    reject(generateTorxError("Could not find closing }", source, index_1));
                                    _c.label = 10;
                                case 10: return [3 /*break*/, 12];
                                case 11:
                                    reject(generateTorxError("Expecting {", source, index_1));
                                    _c.label = 12;
                                case 12: return [3 /*break*/, 14];
                                case 13:
                                    if (word_1 === "include") {
                                        parenthisis = getMatchingPair(source.substring(index_1 + word_1.length));
                                        script = parenthisis.slice(1, -1);
                                        output_1 += "`); await __include(" + script + ", '" + filePath + "'); print(`";
                                        index_1 += word_1.length + parenthisis.length;
                                    }
                                    else {
                                        variable = getVariable(source.substring(index_1 + word_1.length));
                                        if (variable) {
                                            output_1 += "` + (" + word_1 + variable + ") + `";
                                            index_1 += word_1.length + variable.length;
                                        }
                                        else {
                                            output_1 += "` + (" + word_1 + ") + `";
                                            index_1 += word_1.length;
                                        }
                                    }
                                    _c.label = 14;
                                case 14: return [3 /*break*/, 16];
                                case 15:
                                    reject(generateTorxError("Unexpected token ".concat(source.charAt(index_1)), source, index_1));
                                    _c.label = 16;
                                case 16: return [3 /*break*/, 17];
                                case 17:
                                    symbolPos = index_1 >= 0 ? source.indexOf("@", index_1) : -1;
                                    if (symbolPos >= 0) {
                                        if (commentDepth === 0) {
                                            output_1 += "".concat(source.substring(index_1, symbolPos));
                                        }
                                        index_1 = source.indexOf("@", symbolPos);
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _a.label = 1;
                case 1: return [5 /*yield**/, _loop_1()];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    if (symbolPos >= 0) return [3 /*break*/, 1];
                    _a.label = 4;
                case 4:
                    if (commentDepth === 0 && index_1 >= 0) {
                        output_1 += source.substring(index_1);
                    }
                    output_1 += "`";
                    resolve(output_1);
                    return [3 /*break*/, 6];
                case 5:
                    resolve("`" + source + "`");
                    _a.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    }); });
}
/**
 * Detect and return a variable or parenthetical group.
 * @param {string} text - detects .word, () or []
 */
function getVariable(text) {
    var firstChar = text.charAt(0);
    if (["(", "["].indexOf(firstChar) >= 0) {
        var pair = getMatchingPair(text);
        return pair + getVariable(text.substring(pair.length));
    }
    else if (firstChar === ".") {
        var word = text.substring(1).match(/\w+/)[0];
        return "." + word + getVariable(text.substring(word.length + 1));
    }
    else {
        return "";
    }
}
/**
 * Gets the surrounding parenthesis or brackets and the text inside them.
 * @param {string} text - should begin with (, { or [
 */
function getMatchingPair(text) {
    var pairs = [
        {
            open: "(",
            close: ")"
        },
        {
            open: "{",
            close: "}"
        },
        {
            open: "[",
            close: "]"
        },
    ];
    if (text.length > 0) {
        var pair = pairs.find(function (p) { return p.open === text[0]; });
        if (pair) {
            var index = 1;
            var depth = 0;
            while (index < text.length) {
                var char = text.charAt(index);
                if (["'", '"', "`"].indexOf(char) >= 0) {
                    var quotedString = getMatchingQuotes(text.substring(index));
                    if (quotedString) {
                        index += quotedString.length - 1;
                    }
                    else {
                        throw new torx_error_1.TorxError("Could not find matching quote for ".concat(char));
                    }
                }
                else if (char === pair.close) {
                    if (depth === 0) {
                        return text.substring(0, index + 1);
                    }
                    else {
                        depth--;
                    }
                }
                else if (char === pair.open) {
                    depth++;
                }
                index++;
            }
            throw new torx_error_1.TorxError("Could not find matching pair for ".concat(pair.open));
        }
        else {
            throw new torx_error_1.TorxError("The character '".concat(text[0], "' is not a matchable pair."));
        }
    }
    else {
        throw new torx_error_1.TorxError("Cannot find matching pair of an empty string.");
    }
}
/**
 * Gets the surrounding quotes and the text inside them.
 * @param {string} text - should begin with ', " or `
 */
function getMatchingQuotes(text) {
    var quotes = ["'", '"', "`"];
    if (text.length > 0) {
        var quote = quotes.find(function (q) { return q === text[0]; });
        if (quote) {
            var index = 1;
            while (index < text.length) {
                var char = text.charAt(index);
                if (char === "\\") {
                    index++;
                }
                else if (char === quote) {
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
function generateTorxError(message, source, index) {
    var leadingText = source.substring(0, index);
    var leadingLines = leadingText.split("\n");
    var lineNumber = leadingLines.length;
    var columnNumber = leadingLines[lineNumber - 1].length;
    return new torx_error_1.TorxError(message, { columnNumber: columnNumber, lineNumber: lineNumber, source: source });
}
