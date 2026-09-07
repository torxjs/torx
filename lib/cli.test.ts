import { parseArgs, run } from "./cli";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

describe("cli", () => {
   describe("parseArgs", () => {
      it("accepts an input file", () => {
         expect(parseArgs(["page.torx"])).toMatchObject({ input: "page.torx", help: false, version: false });
      });

      it("accepts --out and --data in any order", () => {
         expect(parseArgs(["-o", "page.html", "page.torx", "--data", "data.json"])).toMatchObject({
            input: "page.torx",
            out: "page.html",
            data: "data.json",
         });
      });

      it("accepts help and version flags", () => {
         expect(parseArgs(["-h"]).help).toBe(true);
         expect(parseArgs(["--version"]).version).toBe(true);
      });

      it("rejects a second positional argument", () => {
         expect(() => parseArgs(["page.torx", "page.html"])).toThrow();
      });

      it("rejects unknown options and missing option values", () => {
         expect(() => parseArgs(["--watch", "page.torx"])).toThrow();
         expect(() => parseArgs(["page.torx", "-o"])).toThrow();
         expect(() => parseArgs(["page.torx", "-o", "-d", "data.json"])).toThrow();
      });
   });

   describe("run", () => {
      let directory: string;
      let log: jest.SpyInstance;
      let error: jest.SpyInstance;
      let stdout: jest.SpyInstance;

      beforeEach(() => {
         directory = fs.mkdtempSync(path.join(os.tmpdir(), "torx-"));
         log = jest.spyOn(console, "log").mockImplementation(() => undefined);
         error = jest.spyOn(console, "error").mockImplementation(() => undefined);
         stdout = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
      });

      afterEach(() => {
         fs.rmSync(directory, { recursive: true, force: true });
         jest.restoreAllMocks();
      });

      it("prints to stdout by default", async () => {
         const input = path.join(directory, "page.torx");
         fs.writeFileSync(input, "<h1>@title</h1>");
         const data = path.join(directory, "data.json");
         fs.writeFileSync(data, JSON.stringify({ title: "Hello" }));
         await expect(run([input, "-d", data])).resolves.toBe(0);
         expect(stdout).toHaveBeenCalledWith("<h1>Hello</h1>");
      });

      it("writes the output file and creates its directory", async () => {
         const input = path.join(directory, "page.torx");
         fs.writeFileSync(input, "@(1 + 1)");
         const out = path.join(directory, "dist", "page.html");
         await expect(run([input, "-o", out])).resolves.toBe(0);
         expect(fs.readFileSync(out, "utf8")).toBe("2");
         expect(log).toHaveBeenCalledWith(expect.stringContaining("BUILD:"));
      });

      it("returns 1 with an error for a missing file", async () => {
         await expect(run([path.join(directory, "missing.torx")])).resolves.toBe(1);
         expect(error).toHaveBeenCalledWith(expect.stringContaining("No file exists"));
      });

      it("returns 1 with a position for a template error", async () => {
         const input = path.join(directory, "bad.torx");
         fs.writeFileSync(input, "<p>\n@if (x) {\n");
         await expect(run([input])).resolves.toBe(1);
         expect(error).toHaveBeenCalledWith(expect.stringContaining(`${input}:2:8`));
      });

      it("returns 1 when no input is given", async () => {
         await expect(run([])).resolves.toBe(1);
      });
   });
});
