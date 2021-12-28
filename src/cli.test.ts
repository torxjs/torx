import { getOutPath } from "./cli";

describe("cli", () => {
   describe("getOutPath", () => {
      it("should accept a symantic file name", () => {
         const out = getOutPath("file.extension.torx");
         expect(out).toEqual("file.extension");
      });
      it("should accept an extension name", () => {
         const out = getOutPath("file.torx", "extension");
         expect(out).toEqual("file.extension");
      });
      it("should accept an explicit file name", () => {
         const out = getOutPath("file.torx", "file.extension");
         expect(out).toEqual("file.extension");
      });
      it("should throw errors", () => {
         expect(() => getOutPath("file.extension")).toThrow();
         expect(() => getOutPath("file.name.extension")).toThrow();
         expect(() => getOutPath("file", "extension")).toThrow();
      });
   });
});
