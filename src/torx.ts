import { TorxError } from "./shared";
import * as ts from "typescript";

export function compile(source: string, data: object): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const page = new TorxFile(source, data);
        page.getScript().then(script => {
            let input = '';
            Object.keys(data).forEach(key => {
                const json = JSON.stringify(data[key]);
                input += `var ${key} = ${json ? json : data[key]}; `;
            });
            input += `var __output__ = ''; function print(text) { __output__ += text; return text; } print(`;
            input += script;
            input += '); return __output__;';
            const js = ts.transpile(input);
            console.log(input + '\n\n-----\n'); // DEV
            const torx = new Function(js);
            resolve(torx());
        }).catch(error => {
            if (error instanceof TorxError) {
                reject(error);
            } else {
                reject(error);
            }
        });
    })

}

class TorxFile {

    public text: string;
    public data: object;

    constructor(text: string, data: object) {
        this.text = text;
        this.data = data;
    }

    public getScript(): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                resolve(getScript(this.text));
            } catch (error) {
                reject(error);
            }
        });
    }

}

function getScript(text: string): string {
    let symbolPos = text.indexOf('@');
    if (symbolPos >= 0) {
        let output = '`' + text.substring(0, symbolPos);
        let index = symbolPos;
        do {
            index++;
            switch (text.charAt(index)) {
                case '@':
                    output += '@';
                    index++;
                    break;
                case '(':
                    const groupPair = getMatchingPair(text.substring(index));
                    if (groupPair) {
                        output += '` + ' + groupPair + ' + `';
                        index += groupPair.length;
                    } else {
                        throw new TorxError(`Missing closing )`, index);
                    }
                    break;
                case '{':
                    const bracketPair = getMatchingPair(text.substring(index));
                    if (bracketPair) {
                        output += '`);' + bracketPair.substring(1, bracketPair.length - 1) + 'print(`';
                        index += bracketPair.length;
                        if (text.charAt(index) === '\n') {
                            index++;
                        }
                    } else {
                        throw new TorxError(`Missing closing }`, index);
                    }
                    break;
                default:
                    const match = text.substring(index).match(/^\w+/);
                    if (match) {
                        const word = match[0];
                        if (['function', 'for', 'if', 'while'].indexOf(word) >= 0) {
                            // TODO: skip first (params) group
                            const openBracketIndex = text.indexOf('{', index);
                            if (openBracketIndex >= 0) {
                                const controlText = text.substring(index, openBracketIndex);
                                output += '`);' + controlText;
                                index += controlText.length + 1;
                                const bracketPair = getMatchingPair(text.substring(openBracketIndex));
                                if (bracketPair) {
                                    const script = getScript(bracketPair.substring(1, bracketPair.length - 1));
                                    if (word === 'function') {
                                        output += '{ return ' + script + '; } print(`';
                                    } else {
                                        output += '{ return ' + script + ' } print(`';
                                    }
                                    index += bracketPair.length;
                                    if (text.charAt(index) === '\n') {
                                        index++;
                                    }
                                } else {
                                    throw new TorxError(`Could not find closing }`, index);
                                }
                            } else {
                                throw new TorxError(`Expecting {`, index);
                            }
                        } else {
                            const variable = getVariable(text.substring(index + word.length));
                            if (variable) {
                                output += '` + (' + word + variable + ' || \'\') + `';
                                index += word.length + variable.length;
                            } else {
                                output += '` + (' + word + ' || \'\') + `';
                                index += word.length;
                            }
                        }
                    }
                    break;
            }
            symbolPos = text.indexOf('@', index);
            if (symbolPos >= 0) {
                output += `${text.substring(index, symbolPos)}`;
                index = text.indexOf('@', symbolPos);
            }
        } while (symbolPos >= 0);
        output += text.substring(index) + '`';
        return output;
    } else {
        return text;
    }
}

/**
 * @param {string} text - detects .word, () or []
 */
function getVariable(text: string): string {
    const firstChar = text.charAt(0);
    if (['(', '['].indexOf(firstChar) >= 0) {
        const pair = getMatchingPair(text);
        return pair + getVariable(text.substring(pair.length));
    } else if (firstChar === '.') {
        const word = text.substring(1).match(/\w+/)[0];
        return '.' + word + getVariable(text.substring(word.length + 1));
    } else {
        return '';
    }
}

/**
 * @param {string} text - should begin with (, { or [
 */
function getMatchingPair(text: string): string {
    const pairs = [
        {
            open: '(',
            close: ')'
        },
        {
            open: '{',
            close: '}'
        },
        {
            open: '[',
            close: ']'
        }
    ];
    if (text.length > 0) {
        const pair = pairs.find(p => p.open === text[0]);
        if (pair) {
            let index = 1;
            let depth = 0;
            while (index < text.length) {
                const char = text.charAt(index);
                if (['\'', '"', '`'].indexOf(char) >= 0) {
                    const quotedString = getMatchingQuotes(text.substring(index));
                    if (quotedString) {
                        index += quotedString.length - 1;
                    } else {
                        console.log(`Could not find matching quote for ${char}`);
                        return null;
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
            console.log(`Could not find matching pair for ${pair.open}`);
            return null;
        } else {
            console.log(`The character '${text[0]}' is not a matchable pair.`);
            return null;
        }
    } else {
        console.log('Cannot find matching pair of an empty string.');
        return null;
    }
}

/**
 * @param {string} text - should begin with ', " or `
 */
function getMatchingQuotes(text: string): string {
    const quotes = ['\'', '"', '`'];
    if (text.length > 0) {
        const quote = quotes.find(q => q === text[0]);
        if (quote) {
            let index = 1;
            while (index < text.length) {
                const char = text.charAt(index);
                if (char === '\\') {
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