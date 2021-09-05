#!/usr/bin/env node

/**
 * Created by Stephen Ullom 2021
 */

import * as fs from 'fs';
import * as torx from './torx';

const args = process.argv.slice(2)

if (args[0]) {
    switch (args[0]) {
        case '-v':
        case '--version':
            console.log('torx@' + require('./package.json').version)
            break;
        case '--help':
            // TODO: show commands
            break;
        default:
            if (args[1]) {
                compileFile(args[0], args[1]).then(path => {
                    console.log('BUILD:', path);
                }).catch(error =>
                    logError(error)
                );
            } else {
                logError(`Unknown command "${args[0]}".`);
            }
            break;
    }
} else {
    logError('At least source file or argument is required.');
}

function compileFile(src: string, out: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let sourcePath;
        let sourceName = src;
        let sourceExtension = 'torx';
        let outPath = out;

        const matchFileName = /(?<name>.*)\.(?<extension>.*)/.exec(src);
        if (matchFileName) {
            sourceName = matchFileName.groups.name;
            sourceExtension = matchFileName.groups.extension;
        }

        if (!out.includes('.')) {
            outPath = `${sourceName}.${out}`;
        }

        sourcePath = `${sourceName}.${sourceExtension}`;

        torx.compile(`
            <html>
                <h1>@title</h1>
                <p>@(2 + 2)</p>
                <p>person@@mail.com</p>
            </html>
        `, {
            title: 'Hello Title',
            list: ['one', 'two', 'three']
        }).then(out => {
            console.log(out); // DEV
        });
        if (fs.existsSync(sourcePath)) {
            // fs.writeFile(outPath, 'TODO', error => {
            //     if (!error) {
            //         resolve(outPath);
            //     } else {
            //         reject(error);
            //     }
            // });
        }
    });
}

function logError(message: string): void {
    console.log('ERROR:', message);
}