import { compile } from "./index";

function torxTest(object: { template: string; data?: object; output: string }) {
   expect(compile(object.template, object.data)).resolves.toEqual(object.output);
}

describe("compile", () => {
   describe("plain text", () => {
      it("Title", async () => {
         torxTest({
            template: "Title",
            output: "Title",
         });
      });

      it("name@@domain.com", async () => {
         torxTest({
            template: "name@@domain.com",
            output: "name@domain.com",
         });
      });
   });

   describe("implicit", () => {
      it("@title", async () => {
         torxTest({
            template: "@title",
            data: { title: "My Title" },
            output: "My Title",
         });
      });

      it("<h1>@title<h1>", () => {
         torxTest({
            template: "<h1>@title<h1>",
            data: { title: "My Title" },
            output: "<h1>My Title<h1>",
         });
      });

      it("@getTitle()", () => {
         torxTest({
            template: "@getTitle()",
            data: { getTitle: () => "My Title" },
            output: "My Title",
         });
      });

      it("@caps('My Title')", () => {
         torxTest({
            template: "@caps('My Title')",
            data: { caps: (param: string) => param.toUpperCase() },
            output: "MY TITLE",
         });
      });
   });

   describe("explicit", () => {
      it("@(title)", async () => {
         torxTest({
            template: "@(title)",
            data: { title: "My Title" },
            output: "My Title",
         });
      });

      it("<h1>@(title)<h1>", () => {
         torxTest({
            template: "<h1>@(title)<h1>",
            data: { title: "My Title" },
            output: "<h1>My Title<h1>",
         });
      });
   });
});
