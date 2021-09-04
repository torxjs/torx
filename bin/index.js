#!/usr/bin/env node
var fs = require('fs');
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
                compileFile(args[0], args[1]);
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
    var sourceName = src;
    var sourceExtension = 'torx';
    var outFileName = out;
    var matchFileName = /(?<name>.*)\.(?<extension>.*)/.exec(src);
    if (matchFileName) {
        sourceName = matchFileName.groups.name;
        sourceExtension = matchFileName.groups.extension;
    }
    if (!out.includes('.')) {
        outFileName = sourceName + "." + out;
    }
    console.log("src " + sourceName + "." + sourceExtension);
    console.log("out " + outFileName);
}
function logError(message) {
    console.log('ERROR:', message);
}
