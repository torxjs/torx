#!/usr/bin/env node

/**
 * Created by Stephen Ullom 2021
 */

const fs = require('fs');
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
                compileFile(args[0], args[1]);
            } else {
                logError(`Unknown command "${args[0]}".`);
            }
            break;
    }
} else {
    logError('At least source file or argument is required.');
}

function compileFile(src: string, out: string): void {
    let sourceName = src;
    let sourceExtension = 'torx';
    let outFileName = out;

    const matchFileName = /(?<name>.*)\.(?<extension>.*)/.exec(src);
    if (matchFileName) {
        sourceName = matchFileName.groups.name;
        sourceExtension = matchFileName.groups.extension;
    }

    if (!out.includes('.')) {
        outFileName = `${sourceName}.${out}`;
    }

    console.log(`src ${sourceName}.${sourceExtension}`); // DEV
    console.log(`out ${outFileName}`); // DEV
}

function logError(message: string): void {
    console.log('ERROR:', message); // DEV
}

// if (process.argv[2]) {

//     let argument = process.argv[2]

//     if (argument == '-v' || argument == '--version') {

//         console.log('torx@' + require('./package.json').version)

//     } else {

//         let source = getFileWithExt(process.argv[2])
//         let build = false

//         if (process.argv[3]) {
//             build = process.argv[3];
//         } else {
//             if (!source.match('.html')) {
//                 build = source.replace('.torx', '.html')
//             } else {
//                 console.log('An output file is required when using .html as a source.')
//             }
//         }

//         if (fs.existsSync(source) && build) {

//             configure.defaultLayout = ''
//             // configure.debug = true

//             torx.renderFile(source, {}, function (error, html) {
//                 if (error) {
//                     console.log(error)
//                 } else {
//                     fs.writeFile(build, html, function (err) {
//                         if (err) return console.log(err)
//                         console.log('Build successful', build)
//                     })
//                 }
//             })

//         } else {
//             console.error(`Source file '${source}' does not exist.`)
//         }
//     }
// } else {
//     console.log('A source file or argument is required.');
// }