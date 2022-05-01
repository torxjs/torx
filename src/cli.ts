#!/usr/bin/env node

"use strict";

import * as fs from "fs";
import * as torx from ".";
import { performance } from "perf_hooks";

/**
 * Examples:
 * torx [options]
 * torx [path] - Symantic (name.ext.torx)
 * torx [path] [ext] - Extension (name.torx ext)
 * torx [path] [out] - Explicit (name.torx name.ext)
 */

const isCLI = require.main === module;

if (isCLI) {
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
            const startTime = performance.now();
            let out;
            try {
               out = getOutPath(args[0], args[1]);
            } catch (error) {
               console.log("ERROR:", error);
            }
            if (out) {
               createFile(args[0], out)
                  .then(outPath => {
                     const endTime = performance.now();
                     const buildTime = (endTime - startTime).toFixed();
                     console.log(`BUILD: ${outPath} (${buildTime} ms)`);
                  })
                  .catch(error => console.log(error));
            }
            break;
      }
   } else {
      console.log("ERROR: At least source file or argument is required.");
   }
}

/**
 * Compiles and creates the the output file
 * @param sourcePath - the Torx file path
 * @param outPath - the output file path
 */
function createFile(sourcePath: string, outPath: string): Promise<string> {
   return new Promise<string>((resolve, reject) => {
      if (fs.existsSync(sourcePath)) {
         fs.readFile(sourcePath, "utf8", (error, text) => {
            if (!error) {
               torx
                  .compile(text)
                  .then(out => {
                     fs.writeFile(outPath, out, error => {
                        if (!error) {
                           resolve(outPath);
                        } else {
                           reject(error);
                        }
                     });
                  })
                  .catch(error => reject(error));
            } else {
               reject(`Could not read file ${sourcePath}`);
            }
         });
      } else {
         reject(`No file exists at '${sourcePath}'`);
      }
   });
}

/**
 * Generate the out path based on two arguments
 * @param arg1 - file path ending in ".torx"
 * @param arg2 - out file path or file extension
 */
function getOutPath(arg1: string, arg2?: string): string {
   let fileName = arg1.split(".");
   if (!arg2) {
      if (fileName.length >= 3) {
         // Symantic (file.extension.torx)
         if (fileName[fileName.length - 1] === "torx") {
            fileName.pop();
            return fileName.join(".");
         } else {
            throw "A symantic file name must end in '.torx'";
         }
      } else {
         throw "A symantic file name or an out path is required";
      }
   } else {
      if (arg2.indexOf(".") >= 0) {
         // Explicit (file.torx file.extension)
         return arg2;
      } else {
         // Extension (file.torx extension)
         if (fileName[fileName.length - 1] === "torx") {
            fileName.pop();
            fileName.push(arg2);
            return fileName.join(".");
         } else {
            throw "When providing an extension name, the source file must end in '.torx'";
         }
      }
   }
}
