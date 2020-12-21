#!/usr/bin/env node

/**
 * Created by Slulego 2020
 * Forked from Saker by Sky
 * MIT Licensed
 */

!function () {
    var isNode = typeof window === 'undefined',
        isProd = false,
        isCli = !module.parent,
        fs,
        path;

    if (isNode) {
        fs = require('fs');
        path = require('path');
        isProd = process.env.NODE_ENV === 'production';
    }

    /**
     * Configure set.
     * @type {{debug: boolean, symbol: string, defaultLayout: string, partialViewDir: string}}
     */

    var configure = {
        debug: false,
        symbol: '@',
        defaultLayout: 'layout.torx',
        partialViewDir: './views/partials/'
    };

    /**
     * The cache for complied result (note: it stored the returned function).
     * @type {{}}
     */

    var cache = {};

    /**
     * Read state enum.
     * @type {{CLIENT: number, SERVER: number}}
     */

    const stateEnum = {
        //Frontend code.
        CLIENT: 0,

        //Backend code.
        SERVER: 1
    };

    /**
     * String type enum.
     * @type {{MARKUP: number, EXPRESSION: number, SCRIPT: number}}
     */

    const modeEnum = {
        //HTML markup.
        MARKUP: 0,

        //JavaScript expression.
        EXPRESSION: 1,

        //Block JavaScript code.
        SCRIPT: 2
    };

    /**
     * Quotes type enum.
     * @type {{singleQuotes: number, doubleQuotes: number}}
     */

    var quotesEnum = {
        singleQuotes: 0,
        doubleQuotes: 1
    };

    /**
     * '{' type enum.
     * @type {{NONE: number, IF: number, FOR: number, WHILE: number, DO: number, SWITCH: number, TRY: number, OTHER: number}}
     */

    const bracesEnum = {
        //Without '@'.
        NONE: 0,

        //@if Special: maybe follows else if and else in the end.
        IF: 1,

        //@for
        FOR: 2,

        //@while
        WHILE: 3,

        //@do Special: maybe follows while in the end.
        DO: 4,

        //@switch
        SWITCH: 5,

        //@try Special: maybe follows catch and finally in the end.
        TRY: 6,

        //@{...}
        OTHER: 10
    };

    class TorxError {
        /**
         * Custom error.
         * @param {string} message
         * @param {string} stack
         * @constructor
         */
        constructor(message, stack) {
            this.name = 'TorxError';
            this.message = message;
            this.stack = stack;
        }
    }

    TorxError.prototype = Object.create(Error.prototype);

    /**
     * Add .torx file extension if ommitted.
     * @param {string} filePath
     * @returns {string}
     */

    function getFileWithExt(filePath) {
        if (!filePath.match(/\.\w*$/)) {
            filePath += '.torx';
        }
        return filePath;
    }


    class Position {
        /**
         * Position
         * @param {number} row
         * @param {number} column
         * @param {array} source
         */
        constructor(row, column, source) {
            this.row = row;
            this.column = column;
            this.source = source;
        }
    }

    class ParseProcessor {
        /**
         * Parse processor.
         * @param {string} source
         */
        constructor(source) {
            //To be parsed template source string.
            this.source = source;

            //Current parsed position of source.
            this.position = 0;

            //Current read state, server or client.
            this.state = stateEnum.CLIENT;

            //Counter for tags, rule: if '<' push, if '</' pop.
            this.tags = [];

            //Counter for quotes.
            this.quotes = [];

            //Counter for braces.
            this.braces = [];

            //Counter for brackets.
            this.brackets = [];
        }

        /**
         * Self-closing tags type.
         */

        selfClosedTags = ['br', 'hr', 'img', 'input', 'link', 'meta', 'area', 'base', 'col', 'command', 'embed', 'keygen', 'param', 'source', 'track', 'wbr', 'line', 'polyline', 'ellipse', 'rect', 'path']

        /**
         * Get the line number for the position.
         * @param {number} position
         * @returns {Position}
         */

        getLineNum(position) {

            if (position === undefined) {
                position = this.position;
            }

            var lines = this.source.substring(0, position).split(/\r?\n/),
                row = lines.length,
                col = lines.pop().length + 1,
                allLines = this.source.split(/\r?\n/),
                source = [];

            for (var i = -3; i < 2; i++) {
                if (allLines[row + i]) {
                    source.push({
                        row: row + i + 1,
                        code: allLines[row + i]
                    })
                }
            }

            return new Position(row, col, source);
        }

        // /**
        //  * Get the full line of code
        //  * @param {number} line 
        //  */
        // getLine(line) {

        // }

        /**
         * Get the stack.
         * @param {string} message
         * @param {Position} position
         * @returns {string}
         */

        getStackString(message, position) {

            let lines = ''

            for (const line of position.source) {
                lines += '</br>' + line.row + ': ' + innerHelper.escapeHtml(line.code)
            }

            return 'Torx Syntax Error: ' + message + '\tat (' + position.row + ':' + position.column + ')' + lines;
        }

        /**
         * Read text from current position.
         * @param {number} length
         * @returns {string}
         */

        readNextChars(length) {
            var result = '';
            if (length) {
                result = this.source.substr(this.position, length);
            } else {
                result = this.source.substr(this.position);
            }
            return result;
        }

        /**
         * Read previous text form last position.
         * @param {number} length
         * @returns {string}
         */

        readPrevChars(length) {
            var result = '';
            if (length) {
                result = this.source.slice(this.position - length, this.position);
            } else {
                result = this.source.substr(0, this.position);
            }
            return result;
        }

        /**
         * Read client markup.
         * @returns {*}
         */

        readMarkup() {
            var len = this.source.length,
                char,
                matched,
                result = '';

            if (this.position >= len) {
                return undefined;
            }
            for (; this.position < len; this.position++) {
                char = this.readNextChars(1);
                //Stop if '@', for the code behind '@' must be the server scripts.
                if (char === configure.symbol) {
                    break;
                }

                if (char === '<' && /^<(\w+)/.test(this.readNextChars(50))) {
                    matched = this.readNextChars(50).match(/^<(\w+)/);
                    this.tags.push({
                        type: matched[1],
                        position: this.position
                    });
                }

                //Meet '>' and there is a start tag.
                if (char === '>' && this.tags.length > 0) {
                    //...</div> , <img >
                    if (new RegExp('<(\\\\)?\/' + this.tags[this.tags.length - 1].type + '\\s*>$').test(this.readPrevChars() + char) || this.selfClosedTags.indexOf(this.tags[this.tags.length - 1].type) > -1) {
                        this.tags.pop();
                        result += char;
                        if ((this.tags[this.tags.length - 1] || { position: -1 }).position >= (this.braces[this.braces.length - 1] || { position: -1 }).position) {
                            continue;
                        } else {
                            this.position += 1;
                            //If next char is whitespace.
                            if (this.readNextChars(1).match(/\s/)) {
                                result += this.readNextChars(1);
                                this.position += 1;
                            }
                            break;
                        }
                    }
                }

                result += char;
            }

            //Ready to switch to backend read mode.
            this.state = stateEnum.SERVER;
            return result;
        }

        /**
         * Read inline code.
         * @returns {*}
         */

        readLineServerCode() {
            var len = this.source.length,
                char,
                result = '',
                braces = [],
                brackets = [],
                quotes = [];

            if (this.position >= len) {
                return undefined;
            }

            expression:
            for (; this.position < len; this.position++) {

                char = this.readNextChars(1);

                //Handle quotes.
                if (char === '"' || char === "'") {
                    if (this.readPrevChars(1) !== '\\' && (brackets.length > 0 || braces.length > 0)) {
                        if (quotes.length === 0) {
                            quotes.push({
                                type: char === '"' ? quotesEnum.doubleQuotes : quotesEnum.singleQuotes,
                                position: this.position
                            });
                        } else if (quotes.length > 0) {
                            if (char === '"' && quotes[0].type === quotesEnum.doubleQuotes) {
                                quotes.pop();
                            } else if (char === "'" && quotes[0].type === quotesEnum.singleQuotes) {
                                quotes.pop();
                            }
                        }
                    } else {
                        break
                    }
                }

                // If not inside quotes
                if (quotes.length === 0) {
                    
                    switch (char) {
                        case '(':
                            brackets.push(this.position);
                            break;

                        case ')':
                            if (brackets.length > 0) {
                                brackets.pop()
                            } else {
                                break expression;
                            }
                            if (brackets.length === 0 && [').', ')[', ')('].indexOf(this.readNextChars(2)) === -1) {
                                result += char
                                this.position++
                                break expression
                            }
                            break;

                        case '[':
                            braces.push(this.position)
                            break;

                        case ']':
                            if (braces.length > 0) {
                                braces.pop()
                            }
                            if (braces.length === 0 && ['].', '][', ']('].indexOf(this.readNextChars(2)) === -1) {
                                result += char
                                this.position++
                                break expression
                            }
                            break;
                    }

                    // If not a word or . or inside () or []
                    if (char.match(/[\w\.\[\]\(\)]/) === null && brackets.length === 0 && braces.length === 0) {
                        break expression
                    }
                }

                result += char;
            }

            // console.log(result)

            //Ready to switch to frontend read mode.
            this.state = stateEnum.CLIENT;

            return result;
        }

        /**
         * Read backend block scripts.
         * @returns {*}
         */

        readBlockServerCode() {
            var len = this.source.length,
                char,
                braceState,
                matched,
                result = '';

            if (this.position >= len) {
                return undefined;
            }

            for (; this.position < len; this.position++) {
                char = this.readNextChars(1);
                if (char === configure.symbol) {
                    let errorMessage = 'In a script block, write JavaScript without ' + configure.symbol;
                    throw new TorxError(errorMessage, this.getStackString(errorMessage, this.getLineNum(this.position)));
                }
                //Handle quotes.
                if ((char === '"' || char === "'") && this.readPrevChars(1) !== '\\') {
                    if (this.quotes.length === 0) {
                        this.quotes.push({
                            type: char === '"' ? quotesEnum.doubleQuotes : quotesEnum.singleQuotes,
                            position: this.position
                        });
                    } else if (this.quotes.length > 0) {
                        if (char === '"' && this.quotes[0].type === quotesEnum.doubleQuotes) {
                            this.quotes.pop();
                        } else if (char === "'" && this.quotes[0].type === quotesEnum.singleQuotes) {
                            this.quotes.pop();
                        }
                    }
                }
                //If '<' is not in quotes, indicates it's the start of markup, break loop.
                if (char === '<' && this.quotes.length === 0 &&
                    (this.brackets.length === 0
                        || (this.brackets.length > 0
                            && this.brackets[this.brackets.length - 1] < this.braces[this.braces.length - 1].position)
                    )) {
                    break;
                }
                if (char === '(' && this.quotes.length === 0) {
                    this.brackets.push(this.position);
                } else if (char === ')' && this.quotes.length === 0) {
                    this.brackets.pop();
                }

                if (char === '{' && this.quotes.length === 0) {
                    this.braces.push({
                        type: this.readPrevChars(1) === configure.symbol ? bracesEnum.OTHER : bracesEnum.NONE,
                        position: this.position
                    });
                } else if (char === '}' && this.quotes.length === 0) {
                    braceState = this.braces.pop();
                    //If the '}' matched '{' has prefix @.
                    if (braceState.type > 0) {
                        if (braceState.type === bracesEnum.IF && (/(?:^}\s*?else\s*?\{)|(?:^}\s*?else\s+if\s*?\([\s\S]+?\)\s*?\{)/.test(this.readNextChars()))) {
                            //If it is 'else' behind '}', that's backend scripts, and handles braces.
                            matched = this.readNextChars().match(/(?:^}\s*?else\s*?\{)|(?:^}\s*?else\s+if\s*?\([\s\S]+?\)\s*?\{)/);
                            result += matched[0];
                            this.position += matched[0].length - 1;
                            this.braces.push({
                                type: bracesEnum.IF,
                                position: this.position
                            });
                            continue;
                        } else if (braceState.type === bracesEnum.DO && (/^}\s*?while\s*?\([\s\S]+?\)/.test(this.readNextChars()))) {
                            //If it is 'while' behind '}', that's backend scripts.
                            matched = this.readNextChars().match(/^}\s*?while\s*?\([\s\S]+?\)/);
                            result += matched[0];
                            this.position += matched[0].length - 1;
                            continue;
                        } else if (braceState.type === bracesEnum.TRY && (/(?:^}\s*?catch\([\s\S]+?\)\s*?\{)|(?:^}\s*?finally\s*?\{)/.test(this.readNextChars()))) {
                            //If it is 'catch' or 'finally', that's backend scripts, and handles braces.
                            matched = this.readNextChars().match(/(?:^}\s*?catch\([\s\S]+?\)\s*?\{)|(?:^}\s*?finally\s*?\{)/);
                            result += matched[0];
                            this.position += matched[0].length - 1;
                            this.braces.push({
                                type: bracesEnum.TRY,
                                position: this.position
                            });
                            continue;
                        } else {
                            //Otherwise stop loop.
                            result += char;
                            this.position++;
                            break;
                        }
                    }
                }
                result += char;
            }
            //Ready to switch to frontend read mode.
            this.state = stateEnum.CLIENT;
            return result;
        }

        /**
         * Read scripts in @()
         * @returns {*}
         */

        readBracketCode() {
            var flag = 0,
                result = '',
                char = '';
            var startPosition = this.position;
            while (this.position < this.source.length) {
                char = this.source.substr(this.position, 1);
                if (char === '(') {
                    flag++;
                } else if (char === ')') {
                    flag--;
                }
                result += char;
                if (flag === 0) {
                    break;
                }
                this.position++;
            }
            this.state = stateEnum.CLIENT;
            this.position++;
            if (flag !== 0) {
                let errorMessage = '"(" is missing the closing ")"';
                throw new TorxError(errorMessage, this.getStackString(errorMessage, this.getLineNum(startPosition)));
            }
            return result;
        }
    }

    class ContentProcessor {

        constructor() {
            this.segments = [];
        }

        /**
         * ncode special characters.
         * @param {string} text
         * @returns {string|XML}
         */

        escape(text) {
            return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n');

        }

        /**
         * Add segment to array.
         * @param {object} obj
         */

        addSegment(obj) {
            if (obj.data) {
                switch (obj.type) {
                    case 0:
                        this.segments.push('$torx_writeLiteral$("' + this.escape(obj.data) + '");');
                        break;
                    case 1:
                        this.segments.push('$torx_write$(' + obj.data + ');');
                        break;
                    case 2:
                        this.segments.push(obj.data);
                        break;
                }
            }
        }

        /**
         * Get scripts string.
         * @returns {string}
         */

        getContent() {
            return this.segments.join('\r\n');
        }
    }

    var innerHelper = {

        /**
         * Output raw string.
         * @param val
         * @returns {{str: *, $torx_raw$: boolean}}
         */

        raw: function (val) {
            return {
                str: val,
                $torx_raw$: true
            }
        },

        /**
         * Encode special characters.
         * @param val
         * @returns {XML|string|void|*}
         */

        escapeHtml: function (val) {
            if (val === undefined || val === null) {
                return '';
            }
            //If get an object with 'raw' property, no encode.
            if (val.$torx_raw$) {
                return val.str;
            }
            if (typeof val !== 'string') {
                return val;
            }
            var map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };

            return val.replace(/[&<>"']/g, function (m) {
                return map[m];
            });
        },

        /**
         * Unused now.
         * @param val
         * @returns {XML|string|void|*}
         */

        unescapeHtml: function (val) {
            if (val === undefined || val === null) {
                return '';
            }
            if (typeof val !== 'string') {
                return val;
            }
            var map = {
                '&amp;': '&',
                '&lt;': '<',
                '&gt;': '>',
                '&quot;': '"',
                "&#039;": "'"
            };

            return val.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, function (m) {
                return map[m];
            });
        },

        /**
         * Render a partial view.
         * @param {string} filePath
         * @param {object} data
         * @returns {*}
         */

        renderPartialFn: function (filePath, data) {
            filePath = getFileWithExt(filePath);
            filePath = path.join(configure.partialViewDir, filePath);
            var partialTemp = torx.getView(filePath);
            try {
                var html = torx.compile(partialTemp, filePath).call({
                    layout: null
                }, data);
            } catch (err) {
                throw err;
            }
            return html;
        }
    };

    /**
     * The main processor.
     * @param template
     * @returns {ContentProcessor}
     */

    var centerProcessor = function (template) {
        var code,
            nextChar,
            matchedText,
            processor = new ParseProcessor(template),
            contentProcessor = new ContentProcessor();

        while (processor.position < processor.source.length) {
            if (processor.state === stateEnum.CLIENT) {
                code = processor.readMarkup();
                contentProcessor.addSegment({
                    data: code,
                    type: modeEnum.MARKUP
                });
            } else {
                nextChar = processor.readNextChars(1);
                //Pass the @
                if (nextChar === configure.symbol) {
                    processor.position++;
                    nextChar = processor.readNextChars(1);
                    //@@
                    if (nextChar === configure.symbol) {
                        processor.position++;
                        processor.state = stateEnum.CLIENT;
                        contentProcessor.addSegment({
                            data: configure.symbol,
                            type: modeEnum.MARKUP
                        });
                    }
                    //@//...
                    // else if (nextChar === '/' && processor.readNextChars(2) === '//') {
                    //     matchedText = processor.readNextChars().match(/\/\/.*/)[0];
                    //     processor.position += matchedText.length;
                    //     processor.state = stateEnum.client;
                    // }
                    //@*...*@
                    else if (nextChar === '*') {
                        if (new RegExp('\\*[\\s\\S]*?\\*' + configure.symbol).test(processor.readNextChars())) {
                            matchedText = processor.readNextChars().match(new RegExp('\\*[\\s\\S]*?\\*' + configure.symbol))[0];
                            processor.position += matchedText.length;
                            processor.state = stateEnum.CLIENT;
                        } else {
                            let errorMessage = 'Comments ' + configure.symbol + '* is missing the closing *' + configure.symbol;
                            throw new TorxError(errorMessage, processor.getStackString(errorMessage, processor.getLineNum(processor.position)));
                        }
                    }
                    //@(...)
                    else if (nextChar === '(') {
                        code = processor.readBracketCode();
                        if (/^\(\s*\)$/.test(code)) {
                            code = '';
                        }
                        contentProcessor.addSegment({
                            data: code,
                            type: modeEnum.EXPRESSION
                        });
                    }
                    //@{...}
                    else if (nextChar === '{') {
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: code,
                            type: modeEnum.SCRIPT
                        });
                    }
                    //@if(){...}
                    else if (nextChar === 'i' && processor.readNextChars(2) === 'if' && /^if\s*?\([\s\S]+?\)\s*\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^if\s*?\([\s\S]+?\)\s*\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.IF,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.SCRIPT
                        });
                    }
                    //@for(){...}
                    else if (nextChar === 'f' && processor.readNextChars(3) === 'for' && /^for\s*?\([\s\S]+?\)\s*\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^for\s*?\([\s\S]+?\)\s*\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.FOR,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.SCRIPT
                        });
                    }
                    //@while(){...}
                    else if (nextChar === 'w' && processor.readNextChars(5) === 'while' && /^while\s*?\([\s\S]+?\)\s*\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^while\s*?\([\s\S]+?\)\s*\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.WHILE,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.SCRIPT
                        });
                    }
                    //@do{}
                    else if (nextChar === 'd' && processor.readNextChars(2) === 'do' && /^do\s*?\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^do\s*?\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.DO,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.SCRIPT
                        });
                    }
                    //@switch(){...}
                    else if (nextChar === 's' && processor.readNextChars(6) === 'switch' && /^switch\s*?\([\s\S]+?\)\s*\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^switch\s*?\([\s\S]+?\)\s*\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.SWITCH,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.SCRIPT
                        });
                    }
                    //@try{}
                    else if (nextChar === 't' && processor.readNextChars(3) === 'try' && /^try\s*?\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^try\s*?\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.TRY,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.SCRIPT
                        });
                    }
                    //@abc, @_a, @[1,2], @!true
                    else if (/[A-Za-z_[!]/.test(nextChar)) {
                        code = processor.readLineServerCode();
                        contentProcessor.addSegment({
                            data: code,
                            type: modeEnum.EXPRESSION
                        });
                    }
                    //@ abc, @", @? and other special characters.
                    else {
                        let errorMessage = 'Illegal character after ' + configure.symbol;
                        throw new TorxError(errorMessage, processor.getStackString(errorMessage, processor.getLineNum(processor.position)));
                    }
                } else {
                    code = processor.readBlockServerCode();
                    contentProcessor.addSegment({
                        data: code,
                        type: modeEnum.SCRIPT
                    });
                }
            }
        }
        //Check match.
        if (processor.tags.length > 0) {
            let errorMessage = 'There are unclosed tags';
            throw new TorxError(errorMessage, processor.getStackString(errorMessage, processor.getLineNum(processor.tags[processor.tags.length - 1].position)));
        }
        if (processor.braces.length > 0) {
            let errorMessage = 'There are unmatched braces';
            throw new TorxError(errorMessage, processor.getStackString(errorMessage, processor.getLineNum(processor.braces[processor.braces.length - 1].position)));
        }
        if (processor.brackets.length > 0) {
            let errorMessage = 'There are unmatched brackets';
            throw new TorxError(errorMessage, processor.getStackString(errorMessage, processor.getLineNum(processor.brackets[processor.brackets.length - 1])));
        }
        return contentProcessor;
    };

    var torx = {

        /**
         * Combine config object.
         * @param passObj
         */

        config: function (passObj) {
            for (var item in passObj) {
                if (Object.prototype.hasOwnProperty.call(passObj, item)) {
                    configure[item] = passObj[item];
                }
            }
        },

        /**
         * Get view file according to the file path.
         * @param {string} filePath - file path
         * @param {function} callback
         */

        getView: function (filePath, callback) {
            filePath = getFileWithExt(filePath);
            if (callback) {
                fs.readFile(filePath, function (err, data) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, data.toString('utf8'));
                    }
                })
            } else {
                try {
                    var data = fs.readFileSync(filePath);
                } catch (err) {
                    throw err;
                }
                return data.toString('utf8');
            }
        },

        /**
         * Compile the given Torx string, and return a complied function.
         * @param {string} script
         * @returns {function}
         */

        compile: function (script) {
            var that = this;
            var filePath = arguments[1];
            var contentProcessor = centerProcessor(script);
            var content = contentProcessor.getContent();

            if (configure.debug) {
                console.log('parsed start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n');
                console.log(content);
                console.log('parsed end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n');
            }

            /**
             * @param {object} data
             * @param {function} callback
             */
            return function (data, callback) {
                if (typeof data === 'function') {
                    callback = data;
                    data = {};
                }
                var fs = require('fs')
                var _this = this,
                    fn = '',
                    variables = '',
                    thisObj = {
                        data: data,
                        _renderBodyFn: function () {
                            return data.$torx_body$;
                        },
                        _renderPartialFn: innerHelper.renderPartialFn,
                        html: {
                            raw: innerHelper.raw
                        },
                        system: {
                            readFile: function (url) {
                                return fs.readFileSync(url)
                            }
                        }
                    };
                //Assign this.xxx to torx.xxx
                variables += 'var torx = {};\n';
                Object.keys(thisObj).forEach(function (item) {
                    variables += 'torx.' + item + ' = this.' + item + ';\n';
                });
                //Allow @data.xxx to @xxx.
                if (typeof data === 'object' && Object.keys(data).length > 0) {
                    Object.keys(data).forEach(function (item) {
                        variables += 'var ' + item + ' = data.' + item + ';\n';
                    })
                }

                //torx.renderParial(url)
                //torx.renderBody()
                //torx.escapeHtml()
                //html.raw()x
                //system.readFile()

                fn += variables;
                fn += 'var $torx_escapeHtml$ = ' + innerHelper.escapeHtml.toString() + ';\n';
                //write、writeLiteral
                fn += 'var _this = this,$torx_data$ = [],\n $torx_writeLiteral$ = function(code) { $torx_data$.push(code); },\n $torx_write$ = function(code){ $torx_writeLiteral$(($torx_escapeHtml$(code))); };\n';
                //torx.renderPartial
                fn += 'this.renderPartial = torx.renderPartial = function(url){$torx_data$.push(this._renderPartialFn(url, data));};\n';
                //torx.renderBody
                fn += 'this.renderBody = torx.renderBody = function(){data.$renderBodyFlag$ = true;$torx_data$.push(this._renderBodyFn());};\n';
                //system.readFile
                fn += 'var system = this.system;\n';
                //html.raw
                fn += 'var html = this.html;\n';

                //debug
                // if(debug){
                //     fn += 'this.debug = torx.debug = function() {if(configure.debug){return console.log.apply(this, arguments);}};\n';
                // } else {
                //     fn += 'this.debug = torx.debug = function() {};\n'
                // }
                //Attach parsed scripts.
                fn += content + '\n';
                fn += 'return $torx_data$.join("");';

                if (callback) {
                    //Async type.
                    setImmediate(function () {
                        var html = '';
                        try {
                            //eval to evaluate js.
                            html = new Function('data', fn).call(thisObj, data);
                        } catch (err) {
                            return callback(new TorxError(err.message,
                                err.stack + (filePath ? ('\n\tat template file (' + getFileWithExt(filePath) + ')') : '')));
                        }
                        //Filter <text> tags.
                        html = html.replace(/<text>([\s\S]*?)<\/text>/g, function (a, b) {
                            return b;
                        });

                        if (configure.debug) {
                            console.log('html start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n');
                            console.log(html);
                            console.log('html end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n');
                        }

                        //The browsers.
                        if (!isNode) {
                            return callback(null, html);
                        }

                        //Base on the layout in current scope, to fix thisObj.layout.
                        if (_this.layout !== undefined) {
                            thisObj.layout = _this.layout;
                        }

                        //Not set layout, use default layout.
                        if (thisObj.layout === undefined) {
                            thisObj.layout = configure.defaultLayout;
                        }
                        var layoutPath = thisObj.layout;
                        if (thisObj.layout) {
                            //Indicates this is used in Express framework.
                            if (data.settings && data.settings.views) {
                                thisObj.layout = path.join(data.settings.views, thisObj.layout);
                            }
                            that.getView(thisObj.layout, function (err, layoutTemp) {
                                if (err) {
                                    callback(err);
                                } else {
                                    thisObj.layout = null;
                                    data.$torx_body$ = html;
                                    try {
                                        var fn = that.compile(layoutTemp, layoutPath);
                                    } catch (err) {
                                        return callback(err);
                                    }
                                    fn.call(thisObj, data, function (err, layoutHtml) {
                                        if (err) {
                                            return callback(err);
                                        }
                                        //Check whether call renderBody function.
                                        if (!data.$renderBodyFlag$) {
                                            let errorMessage = 'Missing renderBody in layout: ' + layoutPath + '.';
                                            callback(new TorxError(errorMessage, errorMessage))
                                        } else {
                                            callback(null, layoutHtml);
                                        }
                                    });
                                }
                            })
                        } else {
                            //layout is set to empty string or just null.
                            callback(null, html);
                        }

                    });
                } else {
                    //Sync type.
                    var html = '';
                    try {
                        html = new Function('data', fn).call(thisObj, data);
                    } catch (err) {
                        throw new TorxError(err.message, err.stack + (filePath ? ('\n\tat (' + getFileWithExt(filePath) + ')') : ''));
                    }
                    html = html.replace(/<text>([\s\S]*?)<\/text>/g, function (a, b) {
                        return b;
                    });

                    if (configure.debug) {
                        console.log('html start >>>>>>>>>>>>>>>>>>>\n');
                        console.log(html);
                        console.log('html end <<<<<<<<<<<<<<<<<<<<<<\n\n');
                    }

                    if (!isNode) {
                        return html;
                    }

                    if (_this.layout !== undefined) {
                        thisObj.layout = _this.layout;
                    }

                    if (thisObj.layout === undefined) {
                        thisObj.layout = configure.defaultLayout;
                    }
                    var layoutPath = thisObj.layout;
                    if (thisObj.layout) {
                        if (data.settings && data.settings.views) {
                            thisObj.layout = path.join(data.settings.views, thisObj.layout);
                        }
                        var layoutTemp = that.getView(thisObj.layout);
                        thisObj.layout = null;
                        data.$torx_body$ = html;
                        var layoutHtml = that.compile(layoutTemp, layoutPath).call(thisObj, data);
                        if (!data.$renderBodyFlag$) {
                            throw new TorxError('Missing renderBody in layout: ' + layoutPath + '.', 'Torx Layout Error: Missing renderBody in layout: ' + layoutPath + '.');
                        }
                        return layoutHtml;
                    } else {
                        return html;
                    }
                }
            }
        },

        /**
         * Generate HTML layout and view.
         * @param {string} url
         * @param {object} data
         * @param {function} callback
         */

        renderView: function (url, data, callback) {

            var cb = function (err, html) {
                if (err) {
                    return callback(err);
                }
                return callback(null, html);
            }

            if (cache[url] && isProd) {
                cache[url](data, cb)
            } else {
                torx.getView(url, function (err, template) {
                    if (err) {
                        return callback(err);
                    }
                    try {
                        var compiled = torx.compile(template, url);
                    } catch (err) {
                        return callback(err);
                    }
                    if (isProd) {
                        cache[url] = compiled;
                    }
                    compiled(data, cb);
                })
            }
        },

        /**
         * Generate HTML without a layout.
         * @param {string} url
         * @param {object} data
         * @param {function} callback
         */

        renderPartial: function (url, data, callback) {

            var cb = function (err, html) {
                if (err) {
                    return callback(err);
                }
                return callback(null, html);
            }

            if (cache[url] && isProd) {
                cache[url](data, cb)
            } else {
                torx.config.layout = ''
                torx.getView(url, function (err, template) {
                    if (err) {
                        return callback(err);
                    }
                    try {
                        var compiled = torx.compile(template, url);
                    } catch (err) {
                        return callback(err);
                    }
                    if (isProd) {
                        cache[url] = compiled;
                    }
                    compiled(data, cb);
                })
            }
        }
    };

    /**
     * Expose torx object.
     */

    if (isNode) {
        module.exports = torx;

        /* 
         * Command line interface
         * torx [file-source] [file-output]
        */
        if (isCli) {
            if (process.argv[2]) {

                let argument = process.argv[2]

                if (argument == '-v' || argument == '--version') {

                    console.log('torx@' + require('./package.json').version)

                } else {

                    let source = getFileWithExt(process.argv[2])
                    let build = false

                    if (process.argv[3]) {
                        build = process.argv[3];
                    } else {
                        if (!source.match('.html')) {
                            build = source.replace('.torx', '.html')
                        } else {
                            console.log('An output file is required when using .html as a source.')
                        }
                    }

                    if (fs.existsSync(source) && build) {

                        configure.defaultLayout = ''
                        // configure.debug = true

                        torx.renderView(source, {}, function (error, html) {
                            if (error) {
                                console.log(error)
                            } else {
                                fs.writeFile(build, html, function (err) {
                                    if (err) return console.log(err)
                                    console.log('Build successful', build)
                                })
                            }
                        })

                    } else {
                        console.error(`Source file '${source}' does not exist.`)
                    }
                }

            } else {
                console.log('A source file or argument is required.');
            }
        }
    }
    else {
        window.torx = {
            config: torx.config,
            compile: torx.compile
        }
    }
}();