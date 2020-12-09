#!/usr/bin/env node

/**
 * Forked from Saker
 * Copyright © 2017 Sky <eshengsky@163.com>
 * Modified by Slulego
 * MIT Licensed
 */

!function () {
    var isNode = typeof window === 'undefined',
        isProd = false,
        isCLI = !module.parent,
        fs,
        path;

    if (isNode) {
        fs = require('fs');
        path = require('path');
        isProd = process.env.NODE_ENV === 'production';
    }

    /**
     * Configure set.
     * @type {{debug: boolean, defaultLayout: string, partialViewDir: string}}
     */

    var configure = {
        debug: false,
        symbol: '@',
        defaultLayout: 'layout.html',
        partialViewDir: './views/partials/'
    };

    /**
     * The cache for complied result (note: it stored the returned function).
     * @type {{}}
     */

    var cache = {};

    /**
     * Read state enum.
     * @type {{client: number, server: number}}
     */

    var stateEnum = {
        //Frontend code.
        client: 0,

        //Backend code.
        server: 1
    };

    /**
     * String type enum.
     * @type {{markup: number, expression: number, script: number}}
     */

    var modeEnum = {
        //HTML markup.
        markup: 0,

        //JavaScript expression.
        expression: 1,

        //Block JavaScript code.
        script: 2
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
     * @type {{noAt: number, atIf: number, atFor: number, atWhile: number, atDo: number, atSwitch: number, atTry: number, atOther: number}}
     */

    var bracesEnum = {
        //Without '@'.
        noAt: 0,

        //@if Special: maybe follows else if and else in the end.
        atIf: 1,

        //@for
        atFor: 2,

        //@while
        atWhile: 3,

        //@do Special: maybe follows while in the end.
        atDo: 4,

        //@switch
        atSwitch: 5,

        //@try Special: maybe follows catch and finally in the end.
        atTry: 6,

        //@{...}
        atOther: 10
    };

    /**
     * Custom error.
     * @param message
     * @param stack
     * @constructor
     */

    function TorxError(message, stack) {
        this.name = 'TorxError';
        this.message = message;
        this.stack = stack;
    }

    TorxError.prototype = Object.create(Error.prototype);
    TorxError.prototype.constructor = TorxError;

    /**
     * Get file name with extension.
     * @param filePath
     * @returns {*}
     */

    function getFileWithExt(filePath) {
        if (filePath.indexOf('.') === -1) {
            filePath += '.torx';
        }
        return filePath;
    }

    /**
     * Parse processor.
     * @param source
     * @constructor
     */

    var ParseProcessor = function (source) {
        //To be parsed template source string.
        this.source = source;

        //Current parsed position of source.
        this.position = 0;

        //Current read state, server or client.
        this.state = stateEnum.client;

        //Counter for tags, rule: if '<' push, if '</' pop.
        this.tags = [];

        //Counter for quotes.
        this.quotes = [];

        //Counter for braces.
        this.braces = [];

        //Counter for brackets.
        this.brackets = [];
    };

    ParseProcessor.prototype = {

        /**
         * Get the line number for the position.
         * @returns {{row: Number, col: *, source: Array}}
         */

        getLineNum: function (pos) {
            if (pos === undefined) {
                pos = this.position;
            }
            var lines = this.source.substring(0, pos).split(/\r?\n/),
                row = lines.length,
                col = lines.pop().length + 1,
                allLines = this.source.split(/\r?\n/),
                source = [];
            for (var i = -2; i < 2; i++) {
                if (allLines[row + i]) {
                    source.push({
                        row: row + i + 1,
                        code: allLines[row + i]
                    })
                }
            }
            return {
                row: row,
                col: col,
                source: source
            }
        },

        /**
         * Get the stack.
         * @param msg
         * @param pos
         * @returns {string}
         */

        getStackString: function (msg, pos) {
            return 'Torx Syntax Error: ' + msg + ' at position ' + pos.row + ':' + pos.col;
        },

        /**
         * Read text from current position.
         * @returns {string}
         */

        readNextChars: function (len) {
            var result = '';
            if (len) {
                result = this.source.substr(this.position, len);
            } else {
                result = this.source.substr(this.position);
            }
            return result;
        },

        /**
         * Read previous text form last position.
         * @returns {string}
         */

        readPrevChars: function (len) {
            var result = '';
            if (len) {
                result = this.source.slice(this.position - len, this.position);
            } else {
                result = this.source.substr(0, this.position);
            }
            return result;
        },

        /**
         * Self-closing tags type.
         */

        selfClosedTags: ['br', 'hr', 'img', 'input', 'link', 'meta', 'area', 'base', 'col', 'command', 'embed', 'keygen', 'param', 'source', 'track', 'wbr', 'line', 'polyline', 'ellipse', 'rect', 'path'],

        /**
         * Read client markup.
         * @returns {*}
         */

        readMarkup: function () {
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
            this.state = stateEnum.server;
            return result;
        },

        /**
         * Read inline code.
         * @returns {*}
         */

        readLineServerCode: function () {
            var len = this.source.length,
                char,
                result = '';
            if (this.position >= len) {
                return undefined;
            }
            for (; this.position < len; this.position++) {
                char = this.readNextChars(1);

                if (char === '(' && this.quotes.length === 0) {
                    this.brackets.push(this.position);
                } else if (char === ')' && this.quotes.length === 0) {
                    this.brackets.pop();
                }

                //Special characters, except the following, and is not in quotes, all break.
                if (['.', ',', '(', ')', '[', ']', '"', "'", ' '].indexOf(char) === -1 && /\W/.test(char) && this.quotes.length === 0) {
                    break;
                }

                //class="@name" class="@arr.join('')"
                if ((char === '"' || char === "'") && (this.brackets.length === 0 || this.brackets[this.brackets.length - 1] < (this.braces[this.braces.length - 1] || { position: -1 }).position)) {
                    break;
                }

                //class="@name abc" class="@arr.join(' ') abc"
                if (char === ' ' && (this.brackets.length === 0 || this.brackets[this.brackets.length - 1] < (this.braces[this.braces.length - 1] || { position: -1 }).position)) {
                    break;
                }

                //class="@name.toString()abc" class="@arr.join().toString()abc"
                if (char === ')' && [').', ')[', ')]', ')('].indexOf(this.readNextChars(2)) === -1) {
                    result += char;
                    this.position++;
                    break;
                }

                if (char === ']' && ['].', '][', ']]', ']('].indexOf(this.readNextChars(2)) === -1) {
                    result += char;
                    this.position++;
                    break;
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

                result += char;
            }
            //Ready to switch to frontend read mode.
            this.state = stateEnum.client;
            return result;
        },

        /**
         * Read backend block scripts.
         * @returns {*}
         */

        readBlockServerCode: function () {
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
                    let errorMessage = 'In a script block, write scripts without prefix ' + configure.symbol;
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
                        type: this.readPrevChars(1) === configure.symbol ? bracesEnum.atOther : bracesEnum.noAt,
                        position: this.position
                    });
                } else if (char === '}' && this.quotes.length === 0) {
                    braceState = this.braces.pop();
                    //If the '}' matched '{' has prefix @.
                    if (braceState.type > 0) {
                        if (braceState.type === bracesEnum.atIf && (/(?:^}\s*?else\s*?\{)|(?:^}\s*?else\s+if\s*?\([\s\S]+?\)\s*?\{)/.test(this.readNextChars()))) {
                            //If it is 'else' behind '}', that's backend scripts, and handles braces.
                            matched = this.readNextChars().match(/(?:^}\s*?else\s*?\{)|(?:^}\s*?else\s+if\s*?\([\s\S]+?\)\s*?\{)/);
                            result += matched[0];
                            this.position += matched[0].length - 1;
                            this.braces.push({
                                type: bracesEnum.atIf,
                                position: this.position
                            });
                            continue;
                        } else if (braceState.type === bracesEnum.atDo && (/^}\s*?while\s*?\([\s\S]+?\)/.test(this.readNextChars()))) {
                            //If it is 'while' behind '}', that's backend scripts.
                            matched = this.readNextChars().match(/^}\s*?while\s*?\([\s\S]+?\)/);
                            result += matched[0];
                            this.position += matched[0].length - 1;
                            continue;
                        } else if (braceState.type === bracesEnum.atTry && (/(?:^}\s*?catch\([\s\S]+?\)\s*?\{)|(?:^}\s*?finally\s*?\{)/.test(this.readNextChars()))) {
                            //If it is 'catch' or 'finally', that's backend scripts, and handles braces.
                            matched = this.readNextChars().match(/(?:^}\s*?catch\([\s\S]+?\)\s*?\{)|(?:^}\s*?finally\s*?\{)/);
                            result += matched[0];
                            this.position += matched[0].length - 1;
                            this.braces.push({
                                type: bracesEnum.atTry,
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
            this.state = stateEnum.client;
            return result;
        },

        /**
         * Read scripts in @()
         * @returns {*}
         */

        readBracketCode: function () {
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
            this.state = stateEnum.client;
            this.position++;
            if (flag !== 0) {
                let errorMessage = '"(" is missing the closing ")"';
                throw new TorxError(errorMessage, this.getStackString(errorMessage, this.getLineNum(startPosition)));
            }
            return result;
        }
    };

    /**
     * Content processor.
     * @constructor
     */

    var ContentProcessor = function () {
        this.segments = [];
    };

    ContentProcessor.prototype = {

        /**
         * ncode special characters.
         * @param str
         * @returns {string|XML}
         */

        escape: function (str) {
            return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n');

        },

        /**
         * Add segment to array.
         * @param obj
         */

        addSegment: function (obj) {
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
        },

        /**
         * Get scripts string.
         * @returns {string}
         */

        getContent: function () {
            return this.segments.join('\r\n');
        }
    };

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
         * @param filePath
         * @param model
         * @returns {*}
         */

        renderPartialFn: function (filePath, model) {
            filePath = getFileWithExt(filePath);
            filePath = path.join(configure.partialViewDir, filePath);
            var partialTemp = torx.getView(filePath);
            try {
                var html = torx.compile(partialTemp, filePath).call({
                    layout: null
                }, model);
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
            if (processor.state === stateEnum.client) {
                code = processor.readMarkup();
                contentProcessor.addSegment({
                    data: code,
                    type: modeEnum.markup
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
                        processor.state = stateEnum.client;
                        contentProcessor.addSegment({
                            data: configure.symbol,
                            type: modeEnum.markup
                        });
                    }
                    //@//...
                    else if (nextChar === '/' && processor.readNextChars(2) === '//') {
                        matchedText = processor.readNextChars().match(/\/\/.*/)[0];
                        processor.position += matchedText.length;
                        processor.state = stateEnum.client;
                    }
                    //@*...*@
                    else if (nextChar === '*') {
                        if (new RegExp('\\*[\\s\\S]*?\\*' + configure.symbol).test(processor.readNextChars())) {
                            matchedText = processor.readNextChars().match(new RegExp('\\*[\\s\\S]*?\\*' + configure.symbol))[0];
                            processor.position += matchedText.length;
                            processor.state = stateEnum.client;
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
                            type: modeEnum.expression
                        });
                    }
                    //@{...}
                    else if (nextChar === '{') {
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: code,
                            type: modeEnum.script
                        });
                    }
                    //@if(){...}
                    else if (nextChar === 'i' && processor.readNextChars(2) === 'if' && /^if\s*?\([\s\S]+?\)\s*\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^if\s*?\([\s\S]+?\)\s*\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.atIf,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    }
                    //@for(){...}
                    else if (nextChar === 'f' && processor.readNextChars(3) === 'for' && /^for\s*?\([\s\S]+?\)\s*\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^for\s*?\([\s\S]+?\)\s*\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.atFor,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    }
                    //@while(){...}
                    else if (nextChar === 'w' && processor.readNextChars(5) === 'while' && /^while\s*?\([\s\S]+?\)\s*\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^while\s*?\([\s\S]+?\)\s*\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.atWhile,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    }
                    //@do{}
                    else if (nextChar === 'd' && processor.readNextChars(2) === 'do' && /^do\s*?\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^do\s*?\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.atDo,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    }
                    //@switch(){...}
                    else if (nextChar === 's' && processor.readNextChars(6) === 'switch' && /^switch\s*?\([\s\S]+?\)\s*\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^switch\s*?\([\s\S]+?\)\s*\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.atSwitch,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    }
                    //@try{}
                    else if (nextChar === 't' && processor.readNextChars(3) === 'try' && /^try\s*?\{/.test(processor.readNextChars())) {
                        matchedText = processor.readNextChars().match(/^try\s*?\{/)[0];
                        processor.position += matchedText.length;
                        processor.braces.push({
                            type: bracesEnum.atTry,
                            position: processor.position
                        });
                        code = processor.readBlockServerCode();
                        contentProcessor.addSegment({
                            data: matchedText + code,
                            type: modeEnum.script
                        });
                    }
                    //@abc, @_a, @[1,2], @!true
                    else if (/[A-Za-z_[!]/.test(nextChar)) {
                        code = processor.readLineServerCode();
                        contentProcessor.addSegment({
                            data: code,
                            type: modeEnum.expression
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
                        type: modeEnum.script
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
         * @param filePath
         * @param cb
         */

        getView: function (filePath, cb) {
            filePath = getFileWithExt(filePath);
            if (cb) {
                fs.readFile(filePath, function (err, data) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null, data.toString('utf8'));
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
         * Compile the given template string, and return a complied function.
         * @param template
         */

        compile: function (template) {
            var that = this;
            var filePath = arguments[1];
            var contentProcessor = centerProcessor(template);
            var content = contentProcessor.getContent();
            if (configure.debug) {
                // console.log('parsed start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n');
                // console.log(content);
                // console.log('parsed end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n');
            }
            return function (model, cb) {
                if (typeof model === 'function') {
                    cb = model;
                    model = {};
                }
                var _this = this,
                    fn = '',
                    variables = '',
                    thisObj = {
                        model: model,
                        raw: innerHelper.raw,
                        _renderBodyFn: function () {
                            return model.$torx_body$;
                        },
                        _renderPartialFn: innerHelper.renderPartialFn
                    };
                //Assign this.xxx to torx.xxx
                variables += 'var torx = {};\n';
                Object.keys(thisObj).forEach(function (item) {
                    variables += 'torx.' + item + ' = this.' + item + ';\n';
                });
                //Allow @model.xxx to @xxx.
                if (typeof model === 'object' && Object.keys(model).length > 0) {
                    Object.keys(model).forEach(function (item) {
                        variables += 'var ' + item + ' = model.' + item + ';\n';
                    })
                }
                fn += variables;
                fn += 'var $torx_escapeHtml$ = ' + innerHelper.escapeHtml.toString() + ';\n';
                //write、writeLiteral
                fn += 'var _this = this,$torx_data$ = [],\n $torx_writeLiteral$ = function(code) { $torx_data$.push(code); },\n $torx_write$ = function(code){ $torx_writeLiteral$(($torx_escapeHtml$(code))); };\n';
                //renderPartial
                fn += 'this.renderPartial = torx.renderPartial = function(filePath){$torx_data$.push(this._renderPartialFn(filePath, model));};\n';
                //renderBody
                fn += 'this.renderBody = torx.renderBody = function(){model.$renderBodyFlag$ = true;$torx_data$.push(this._renderBodyFn());};\n';
                //debug
                // if(debug){
                //     fn += 'this.debug = torx.debug = function() {if(configure.debug){return console.log.apply(this, arguments);}};\n';
                // } else {
                //     fn += 'this.debug = torx.debug = function() {};\n'
                // }
                //Attach parsed scripts.
                fn += content + '\n';
                fn += 'return $torx_data$.join("");';

                if (cb) {
                    //Async type.
                    setImmediate(function () {
                        var html = '';
                        try {
                            //eval to evaluate js.
                            html = new Function('model', fn).call(thisObj, model);
                        } catch (err) {
                            return cb(new TorxError(err.message, err.stack + (filePath ? ('\n    at template file (' + getFileWithExt(filePath) + ')') : '')));
                        }
                        //Filter <text> tags.
                        html = html.replace(/<text>([\s\S]*?)<\/text>/g, function (a, b) {
                            return b;
                        });

                        if (configure.debug) {
                            // console.log('html start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n');
                            // console.log(html);
                            // console.log('html end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n');
                        }

                        //The browsers.
                        if (!isNode) {
                            return cb(null, html);
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
                            if (model.settings && model.settings.views) {
                                thisObj.layout = path.join(model.settings.views, thisObj.layout);
                            }
                            that.getView(thisObj.layout, function (err, layoutTemp) {
                                if (err) {
                                    cb(err);
                                } else {
                                    thisObj.layout = null;
                                    model.$torx_body$ = html;
                                    try {
                                        var fn = that.compile(layoutTemp, layoutPath);
                                    } catch (err) {
                                        return cb(err);
                                    }
                                    fn.call(thisObj, model, function (err, layoutHtml) {
                                        if (err) {
                                            return cb(err);
                                        }
                                        //Check whether call renderBody function.
                                        if (!model.$renderBodyFlag$) {
                                            let errorMessage = 'Missing renderBody in layout: ' + layoutPath + '.';
                                            cb(new TorxError(errorMessage, errorMessage))
                                        } else {
                                            cb(null, layoutHtml);
                                        }
                                    });
                                }
                            })
                        } else {
                            //layout is set to empty string or just null.
                            cb(null, html);
                        }

                    });
                } else {
                    //Sync type.
                    var html = '';
                    try {
                        html = new Function('model', fn).call(thisObj, model);
                    } catch (err) {
                        throw new TorxError(err.message, err.stack + (filePath ? ('\n    at template file (' + getFileWithExt(filePath) + ')') : ''));
                    }
                    html = html.replace(/<text>([\s\S]*?)<\/text>/g, function (a, b) {
                        return b;
                    });

                    if (configure.debug) {
                        // console.log('html start >>>>>>>>>>>>>>>>>>>\n');
                        // console.log(html);
                        // console.log('html end <<<<<<<<<<<<<<<<<<<<<<\n\n');
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
                        if (model.settings && model.settings.views) {
                            thisObj.layout = path.join(model.settings.views, thisObj.layout);
                        }
                        var layoutTemp = that.getView(thisObj.layout);
                        thisObj.layout = null;
                        model.$torx_body$ = html;
                        var layoutHtml = that.compile(layoutTemp, layoutPath).call(thisObj, model);
                        if (!model.$renderBodyFlag$) {
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
         * Generate html according to file path and data model.
         * @param filePath
         * @param model
         * @param cb
         */

        renderView: function (filePath, model, cb) {
            var callback = function (err, html) {
                if (err) {
                    return cb(err);
                }
                return cb(null, html);
            };
            if (cache[filePath] && isProd) {
                cache[filePath](model, callback)
            } else {
                torx.getView(filePath, function (err, template) {
                    if (err) {
                        return cb(err);
                    }
                    try {
                        var compiled = torx.compile(template, filePath);
                    } catch (err) {
                        return cb(err);
                    }
                    if (isProd) {
                        cache[filePath] = compiled;
                    }
                    compiled(model, callback);
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
        if (isCLI) {
            if (process.argv[2] && process.argv[3]) {

                source = process.argv[2];
                build = process.argv[3];

                if (fs.existsSync(source) || fs.existsSync(source + '.torx')) {

                    configure.defaultLayout = ''

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
            } else if (process.argv[2]) {
                let argument = process.argv[2]
                if (argument == '-v' || argument == '--version') {
                    console.log('torx@' + require('./package.json').version)
                } else {
                    console.error(`Unknown command '${argument}'. \nAcceptable commands are -v, --version, and [source-file] [build-file].`)
                }
            } else {
                console.log('A source file and an output file are required.');
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