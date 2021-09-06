import { TorxError } from "./shared";

export function compile(source: string, data: object): Promise<string> {
    const page = new File(source, data);
    return page.getOutput();
}

class File {

    public text: string;
    public data: object;
    // public sourceLines: Line[];

    constructor(text: string, data: object) {
        this.text = text;
        this.data = data;
        // this.sourceLines = text.split('\n').map(text => new Line(text));
    }

    public getOutput(): Promise<string> {
        return new Promise((resolve, reject) => {
            let symbolPos = this.text.indexOf('@');
            if (symbolPos >= 0) {
                let output = 'print(`' + this.text.substring(0, symbolPos);
                let index = symbolPos;
                do {
                    index++;
                    switch (this.text.charAt(index)) {
                        case '@':
                            output += '@';
                            index++;
                            break;
                        case '(':
                            const groupPair = getMatchingPair(this.text.substring(index));
                            if (groupPair) {
                                output += '` + ' + groupPair.substring(1, groupPair.length - 1) + ' + `';
                                index += groupPair.length;
                            } else {
                                reject(new TorxError(`Missing closing )`, index));
                            }
                            break;
                        case '{':
                            const bracketPair = getMatchingPair(this.text.substring(index));
                            if (bracketPair) {
                                output += '`);' + bracketPair.substring(1, bracketPair.length - 1) + 'print(`';
                                index += bracketPair.length;
                            } else {
                                reject(new TorxError(`Missing closing }`, index));
                            }
                            break;
                        default:
                            const match = this.text.substring(index).match(/^\w+/);
                            if (match) {
                                const word = match[0];
                                if(['function', 'for', 'if'].indexOf(word) >= 0) {
                                    // TODO skip first () group
                                    const openBracketIndex = this.text.indexOf('{', index);
                                    if (openBracketIndex >= 0) {
                                        const controlText = this.text.substring(index, openBracketIndex);
                                        output += '`);' + controlText;
                                        index += controlText.length + 1;
                                        const bracketPair = getMatchingPair(this.text.substring(openBracketIndex));
                                        if (bracketPair) {
                                            // TODO compile inside brackets
                                            output += '{ print(`' + bracketPair.substring(1, bracketPair.length - 1) + '`); } print(`';
                                            index += bracketPair.length;
                                        } else {
                                            reject(new TorxError(`Could not find closing }`, index));
                                        }
                                    } else {
                                        reject(new TorxError(`Expecting {`, index));
                                    }
                                } else {
                                    output += '` + ' + word + ' + `';
                                    index += word.length;
                                }
                            }
                            break;
                    }
                    symbolPos = this.text.indexOf('@', index);
                    if (symbolPos >= 0) {
                        output += `${this.text.substring(index, symbolPos)}`;
                        index = this.text.indexOf('@', symbolPos);
                    }
                } while (symbolPos >= 0);
                output += this.text.substring(index) + '`);';
                resolve(output);
            } else {
                resolve(this.text);
            }
            // Promise.all(this.sourceLines.map((line, index) => {
            //     return new Promise((resolve, reject) => {
            //         line.getOutput().then(out =>
            //             resolve(out)
            //         ).catch((error: TorxError) => 
            //             reject(error.setLineNumber(index + 1))
            //         );
            //     });
            // })).then(output => {
            //     resolve(output.join('\n'));
            // }).catch(error => {
            //     reject(error)
            // });
        });
    }

}

class Line {

    public text: string;

    constructor(text: string) {
        this.text = text;
    }

    public getOutput(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.text.indexOf('@') >= 0) {
                let index = this.text.indexOf('@');
                let output = `print('${this.text.substring(0, index)}`;
                while (this.text.indexOf('@', index) >= 0) {
                    index++;
                    switch (this.text[index]) {
                        case '@':
                            output += '@';
                            index++;
                            break;
                        case '(':
                            const groupPair = getMatchingPair(this.text.substring(index));
                            if (groupPair) {
                                output += `' + ${groupPair.substring(1, groupPair.length - 1)} + '`;
                                index += groupPair.length + 1;
                            } else {
                                reject(new TorxError(`Could not find matching pair for (`, index));
                            }
                            break;
                        case '{':
                            // const bracketPair = getMatchingPair(this.text.substring(index));
                            // if (bracketPair) {
                            //     output += `' + ${bracketPair.substring(1, bracketPair.length - 1)} + '`;
                            //     index += bracketPair.length + 1;
                            // } else {
                            //     reject(new TorxError(`Could not find matching pair for {`, index));
                            // }
                            break;
                        default:
                            const match = this.text.substring(index).match(/^\w+/);
                            if (match) {
                                const word = match[0];
                                console.log(word); // DEV
                                output += `' + ${word} + '`;
                                index += word.length;
                            }
                            break;
                    }
                }
                output += `${this.text.substring(index)}');`;
                resolve(output);
            } else {
                resolve(`print('${this.text}');`);
            }
        });
    }
}

class Pair {
    public open: string;
    public close: string;

    constructor(pair: string) {
        this.open = pair[0];
        this.close = pair[1];
    }
}

/**
 * @param {string} text - should begin with (, { or [
 */

function getMatchingPair(text: string): string {
    const pairs = [
        new Pair('()'),
        new Pair('{}'),
        new Pair('[]')
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