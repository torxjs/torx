#!/usr/bin/env node

"use strict";

import * as fs from "fs";
import * as torx from ".";

const args = process.argv.slice(2);

if (args[0]) {
   switch (args[0]) {
      case "-v":
      case "--version":
         console.log("torx@" + require("../package.json").version);
         break;
      case "-h":
      case "--help":
         console.log("\nUsage: torx [options] [path] [ext]");
         console.log("\nOptions: ");
         console.log("  -v, --version   print torx version");
         console.log("  -h, --help      command line options\n");
         break;
      default:
         if (args[1]) {
            writeFile(args[0], args[1]);
         } else {
            console.log(`ERROR: Unknown command "${args[0]}".`);
         }
         break;
   }
} else {
   console.log("ERROR: At least source file or argument is required.");
}

function writeFile(src: string, out: string): void {
   let sourcePath;
   let sourceName = src;
   let sourceExtension = "torx";
   let outPath = out;
   const matchFileName = /(?<name>.*)\.(?<extension>.*)/.exec(src);
   if (matchFileName) {
      sourceName = matchFileName.groups.name;
      sourceExtension = matchFileName.groups.extension;
   }
   if (!out.includes(".")) {
      outPath = `${sourceName}.${out}`;
   }
   sourcePath = `${sourceName}.${sourceExtension}`;
   torx
      .compileFile(sourcePath)
      .then((text) => {
         fs.writeFile(outPath, text, (error) => {
            if (!error) {
               console.log("BUILD:", outPath);
            } else {
               console.log(error);
            }
         });
      })
      .catch((error) => console.log(error));
}
