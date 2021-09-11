#!/usr/bin/env node

/**
 * Created by Stephen Ullom 9/5/2021
 */

import * as fs from 'fs';
import * as torx from './torx';

import { TorxError } from './shared';

const args = process.argv.slice(2)

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
                compileFile(args[0], args[1]).then(path => {
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

        if (fs.existsSync(sourcePath)) {

            fs.readFile(sourcePath, 'utf8', (error, data) => {
                if (!error) {
                    torx.compile(data, {
                        title: 'Hello Title',
                        list: ['one', 'two', 'three']
                    }).then(out => {
                        // console.log(out); // DEV
                        fs.writeFile(outPath, out, error => {
                            if (!error) {
                                resolve(outPath);
                            } else {
                                reject(error);
                            }
                        });
                        resolve(sourcePath);
                    }).catch((error: TorxError) =>
                        reject(error.setFileName(sourcePath))
                    );
                } else {
                    reject(error);
                }
            });
        } else {
            reject(`No file exists at '${sourcePath}'.`);
        }
    });
}
