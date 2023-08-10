import { compile } from "./index";

async function torxTest(object: { template: string | string[]; data?: object; output: string }): Promise<void> {
   let template;
   if (Array.isArray(object.template)) {
      template = object.template.join("");
   } else {
      template = object.template;
   }
   await expect(compile(template, object.data)).resolves.toEqual(object.output);
}

function joinLines(...text: string[]) {
   return text.join("\n");
}

describe("compile", () => {
   describe("basic", () => {
      it("text only", async () => {
         await torxTest({
            template: "Title",
            output: "Title",
         });
      });

      it("escape @", async () => {
         await torxTest({
            template: "name@@domain.com",
            output: "name@domain.com",
         });
      });
   });

   describe("single line comment", () => {
      it("comment only", async () => {
         await torxTest({
            template: "@/ @title inside comment",
            output: "",
         });
      });

      it("escape comment", async () => {
         await torxTest({
            template: "<h1>@@/ this is not a comment /@@</h1>",
            output: "<h1>@/ this is not a comment /@</h1>",
         });
      });

      it("comment inside element", async () => {
         await torxTest({
            template: "<h1>There is no @/ @title inside\ncomment</h1>",
            output: "<h1>There is no \ncomment</h1>",
         });
      });
   });

   describe("multiline comment", () => {
      it("comment only", async () => {
         await torxTest({
            template: "@* @title inside comment *@",
            output: "",
         });
      });

      it("comment inside element", async () => {
         await torxTest({
            template: "<h1>There is no @* @title inside comment *@</h1>",
            data: { title: "My Title" },
            output: "<h1>There is no </h1>",
         });
      });
   });

   describe("implicit", () => {
      it("variable only", async () => {
         await torxTest({
            template: "@title",
            data: { title: "My Title" },
            output: "My Title",
         });
      });

      it("variable inside element", async () => {
         await torxTest({
            template: "<h1>@title<h1>",
            data: { title: "My Title" },
            output: "<h1>My Title<h1>",
         });
      });

      it("call function from data", async () => {
         await torxTest({
            template: "@getTitle()",
            data: { getTitle: () => "My Title" },
            output: "My Title",
         });
      });

      it("call function from data with parameter", async () => {
         await torxTest({
            template: "@caps('My Title')",
            data: { caps: (param: string) => param.toUpperCase() },
            output: "MY TITLE",
         });
      });
   });

   describe("explicit", () => {
      it("variable using parentheses", async () => {
         await torxTest({
            template: "@(title)",
            data: { title: "My Title" },
            output: "My Title",
         });
      });

      it("variable using parentheses inside element", async () => {
         await torxTest({
            template: "<h1>@(title)</h1>",
            data: { title: "My Title" },
            output: "<h1>My Title</h1>",
         });
      });
   });

   fdescribe("if", () => {
      it("compact if", async () => {
         await torxTest({
            template: "@if(condition){Hello}",
            data: { condition: true },
            output: "Hello",
         });
      });

      it("compact if else", async () => {
         await torxTest({
            template: "@if(condition){Hello}else{Goodbye}",
            data: { condition: false },
            output: "Goodbye",
         });
      });

      it("compact if else if", async () => {
         await torxTest({
            template: "@if(condition){Hello}else if(condition2){Goodbye}",
            data: { condition: false, condition2: true },
            output: "Goodbye",
         });
      });

      it("compact if else if else", async () => {
         await torxTest({
            template: "@if(condition){Hello}else if(condition2){Goodbye}else{Finally}",
            data: { condition: false, condition2: false },
            output: "Finally",
         });
      });

      it("if with spaces", async () => {
         await torxTest({
            template: "@if ( condition ) { Hello }",
            data: { condition: true },
            output: " Hello ",
         });
      });

      it("if else with spaces", async () => {
         await torxTest({
            template: "@if ( condition ) { Hello } else { Goodbye }",
            data: { condition: false },
            output: " Goodbye ",
         });
      });

      fit("if else twice", async () => {
         await torxTest({
            template: joinLines(
               "@if (!condition) {",
               "Hello",
               "} else {",
               "Goodbye",
               "}",
               "<a>Link</a>",
               "@if (!condition) {",
               "Finally",
               "}"
            ),
            data: { condition: true },
            output: joinLines("", "Goodbye", "<a>Link</a>", ""),
         });
      });

      it("if with brackets inside group", async () => {
         await torxTest({
            template: "@if(condition({value:true})){Hello}",
            data: { condition: () => true },
            output: "Hello",
         });
      });

      it("if with spaces and brackets inside group", async () => {
         await torxTest({
            template: "@if ( condition( { value: true } ) ) { Hello }",
            data: { condition: () => true },
            output: " Hello ",
         });
      });
   });

   describe("function", () => {
      it("compact function only", async () => {
         await torxTest({
            template: "@function button(label:string){<button>@label</button>}@button('Hello')",
            data: { condition: true },
            output: "<button>Hello</button>",
         });
      });

      it("function with spaces and brackets in group", async () => {
         await torxTest({
            template: [
               "@function button(value: { label: string })",
               "{<button>@value.label</button>}",
               "@button({ label: 'Hello' })",
            ],
            data: { condition: true },
            output: "<button>Hello</button>",
         });
      });
   });
});
