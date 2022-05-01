import { compile } from "./index";

async function torxTest(object: { template: string; data?: object; output: string }): Promise<void> {
   await expect(compile(object.template, object.data)).resolves.toEqual(object.output);
}

describe("compile", () => {
   describe("plain text", () => {
      it("Title", async () => {
         await torxTest({
            template: "Title",
            output: "Title",
         });
      });

      it("name@@domain.com", async () => {
         await torxTest({
            template: "name@@domain.com",
            output: "name@domain.com",
         });
      });
   });

   describe("implicit", () => {
      it("@title", async () => {
         await torxTest({
            template: "@title",
            data: { title: "My Title" },
            output: "My Title",
         });
      });

      it("<h1>@title<h1>", async () => {
         await torxTest({
            template: "<h1>@title<h1>",
            data: { title: "My Title" },
            output: "<h1>My Title<h1>",
         });
      });

      it("@getTitle()", async () => {
         await torxTest({
            template: "@getTitle()",
            data: { getTitle: () => "My Title" },
            output: "My Title",
         });
      });

      it("@caps('My Title')", async () => {
         await torxTest({
            template: "@caps('My Title')",
            data: { caps: (param: string) => param.toUpperCase() },
            output: "MY TITLE",
         });
      });
   });

   describe("explicit", () => {
      it("@(title)", async () => {
         await torxTest({
            template: "@(title)",
            data: { title: "My Title" },
            output: "My Title",
         });
      });

      it("<h1>@(title)</h1>", async () => {
         await torxTest({
            template: "<h1>@(title)</h1>",
            data: { title: "My Title" },
            output: "<h1>My Title</h1>",
         });
      });
   });

   describe("single line comment", () => {
      it("@// @title inside comment", async () => {
         await torxTest({
            template: "@// @title inside comment",
            data: { title: "My Title" },
            output: "",
         });
      });

      it("<h1>There is no @// @title inside\\ncomment</h1>", async () => {
         await torxTest({
            template: "<h1>There is no @// @title inside\ncomment</h1>",
            data: { title: "My Title" },
            output: "<h1>There is no \ncomment</h1>",
         });
      });
   });

   describe("multiline comment", () => {
      it("@* @title inside comment *@", async () => {
         await torxTest({
            template: "@* @title inside comment *@",
            data: { title: "My Title" },
            output: "",
         });
      });

      it("<h1>There is no @* @title inside comment *@</h1>", async () => {
         await torxTest({
            template: "<h1>There is no @* @title inside comment *@</h1>",
            data: { title: "My Title" },
            output: "<h1>There is no </h1>",
         });
      });
   });
});
