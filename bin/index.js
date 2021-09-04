#!/usr/bin/env node
"use strict";
exports.__esModule = true;
var fs = require("fs");
var torx = require("./torx");
var args = process.argv.slice(2);
if (args[0]) {
    switch (args[0]) {
        case '-v':
        case '--version':
            console.log('torx@' + require('./package.json').version);
            break;
        case '--help':
            break;
        default:
            if (args[1]) {
                compileFile(args[0], args[1]).then(function (path) {
                    console.log('BUILD:', path);
                })["catch"](function (error) {
                    return logError(error);
                });
            }
            else {
                logError("Unknown command \"" + args[0] + "\".");
            }
            break;
    }
}
else {
    logError('At least source file or argument is required.');
}
function compileFile(src, out) {
    return new Promise(function (resolve, reject) {
        var sourcePath;
        var sourceName = src;
        var sourceExtension = 'torx';
        var outPath = out;
        var matchFileName = /(?<name>.*)\.(?<extension>.*)/.exec(src);
        if (matchFileName) {
            sourceName = matchFileName.groups.name;
            sourceExtension = matchFileName.groups.extension;
        }
        if (!out.includes('.')) {
            outPath = sourceName + "." + out;
        }
        sourcePath = sourceName + "." + sourceExtension;
        torx.compile('hello').then(function (out) {
            console.log(out);
        });
        if (fs.existsSync(sourcePath)) {
        }
    });
}
function logError(message) {
    console.log('ERROR:', message);
}
