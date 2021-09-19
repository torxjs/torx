#!/usr/bin/env node

'use strict';

import * as torx from '.';
import { TorxError } from './shared';

const args = process.argv.slice(2);

if (args[0]) {
    switch (args[0]) {
        case '-v':
        case '--version':
            console.log('torx@' + require('../package.json').version)
            break;
        case '-h':
        case '--help':
            console.log('\nUsage: torx [options] [path] [ext]');
            console.log('\nOptions: ');
            console.log('  -v, --version   print torx version');
            console.log('  -h, --help      command line options\n');
            break;
        default:
            if (args[1]) {
                torx.compileFile(args[0], args[1]).then(path => {
                    console.log('BUILD:', path);
                }).catch((error: TorxError) => {
                    return error.log();
                });
            } else {
                console.log(`ERROR: Unknown command "${args[0]}".`);
            }
            break;
    }
} else {
    console.log('ERROR: At least source file or argument is required.');
}
