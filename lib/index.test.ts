import { compile, TorxError } from "./index";

async function torxTest(object: { template: string | string[]; data?: object; output: string }): Promise<void> {
   let template: string;
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

      it("undefined variable", async () => {
         await torxTest({
            template: "<h1>@name<h1>",
            output: "<h1><h1>",
         });
      });

      it("null variable", async () => {
         await torxTest({
            template: "<h1>@name<h1>",
            data: { name: null },
            output: "<h1><h1>",
         });
      });

      it("optional chaining undefined", async () => {
         await torxTest({
            template: "<h1>@name?.first<h1>",
            output: "<h1><h1>",
         });
      });

      it("optional chaining", async () => {
         await torxTest({
            template: "<h1>@name?.first<h1>",
            data: { name: { first: "John" } },
            output: "<h1>John<h1>",
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

   describe("if", () => {
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

      it("if else twice", async () => {
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
               "}",
            ),
            data: { condition: true },
            output: joinLines("Goodbye", "<a>Link</a>", ""),
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

   describe("include", () => {
      it("empty file", async () => {
         await torxTest({
            template: "@include('./test/test.torx')",
            output: "<h1></h1>",
         });
      });

      it("file with data", async () => {
         await torxTest({
            template: "@include('./test/test.torx')",
            data: { title: "Title" },
            output: "<h1></h1>",
         });
      });
   });

   describe("values", () => {
      it("prints zero and false", async () => {
         await torxTest({
            template: "@count @flag",
            data: { count: 0, flag: false },
            output: "0 false",
         });
      });

      it("passes non-JSON values through", async () => {
         await torxTest({
            template: "@date.getFullYear() @list.length",
            data: { date: new Date(2020, 0, 1), list: [1, 2, 3] },
            output: "2020 3",
         });
      });

      it("awaits promises", async () => {
         await torxTest({
            template: "@load() @(load())",
            data: { load: () => Promise.resolve("done") },
            output: "done done",
         });
      });

      it("ignores data keys that are not identifiers", async () => {
         await torxTest({
            template: "@title",
            data: { title: "ok", "not-valid": 1, class: 2 },
            output: "ok",
         });
      });

      it("stops a member chain at a sentence period", async () => {
         await torxTest({
            template: "Hi @name. Bye",
            data: { name: "Sam" },
            output: "Hi Sam. Bye",
         });
      });
   });

   describe("text escaping", () => {
      it("keeps backticks", async () => {
         await torxTest({
            template: "use `code` @x",
            data: { x: 1 },
            output: "use `code` 1",
         });
      });

      it("keeps backslashes", async () => {
         await torxTest({
            template: "C:\\path\\n @x",
            data: { x: 1 },
            output: "C:\\path\\n 1",
         });
      });

      it("keeps template literal syntax", async () => {
         await torxTest({
            template: "${notCode} @x",
            data: { x: 1 },
            output: "${notCode} 1",
         });
      });

      it("allows apostrophes inside blocks", async () => {
         await torxTest({
            template: "@if (true) {don't}",
            output: "don't",
         });
      });

      it("allows brackets inside strings inside blocks", async () => {
         await torxTest({
            template: "@if (true) {@('}') and @('{')}",
            output: "} and {",
         });
      });
   });

   describe("nested blocks", () => {
      it("function inside function", async () => {
         await torxTest({
            template: "@function outer(a: string) {@function inner(b: string) {<i>@b</i>}<o>@inner(a)</o>}@outer('x')",
            output: "<o><i>x</i></o>",
         });
      });

      it("if inside function", async () => {
         await torxTest({
            template: "@function f(a: boolean) {@if (a) {yes} else {no}}@f(true)@f(false)",
            output: "yesno",
         });
      });

      it("for inside function", async () => {
         await torxTest({
            template: "@function f(n: number) {@for (let i = 0; i < n; i++) {<li>@i</li>}}@f(3)",
            output: "<li>0</li><li>1</li><li>2</li>",
         });
      });

      it("if inside for", async () => {
         await torxTest({
            template: "@for (let i = 0; i < 3; i++) {@if (i % 2) {odd} else {even}}",
            output: "evenoddeven",
         });
      });

      it("for inside for", async () => {
         await torxTest({
            template: "@for (let i = 0; i < 2; i++) {@for (let j = 0; j < 2; j++) {[@i,@j]}}",
            output: "[0,0][0,1][1,0][1,1]",
         });
      });

      it("include inside function", async () => {
         await torxTest({
            template: "@function f(title: string) {<b>@include('./test/test.torx', { title })</b>}@f('A')@f('B')",
            output: "<b><h1>A</h1></b><b><h1>B</h1></b>",
         });
      });
   });

   describe("while and try", () => {
      it("while", async () => {
         await torxTest({
            template: "@{ let i = 0; }@while (i < 3) {@(i++)}",
            output: "012",
         });
      });

      it("try catch", async () => {
         await torxTest({
            template: "@try {@(JSON.parse('bad'))} catch (error) {failed}",
            output: "failed",
         });
      });

      it("try finally", async () => {
         await torxTest({
            template: "@try {A} finally {B}",
            output: "AB",
         });
      });
   });

   describe("whitespace", () => {
      it("trims the newline after the opening bracket and the indent before the closing bracket", async () => {
         await torxTest({
            template: joinLines("<ul>", "@for (const item of list) {", "   <li>@item</li>", "}", "</ul>"),
            data: { list: [1, 2] },
            output: joinLines("<ul>", "   <li>1</li>", "   <li>2</li>", "</ul>"),
         });
      });

      it("drops the indentation before a block", async () => {
         await torxTest({
            template: joinLines("<ul>", "   @for (const item of list) {", "      <li>@item</li>", "   }", "</ul>"),
            data: { list: [1, 2] },
            output: joinLines("<ul>", "      <li>1</li>", "      <li>2</li>", "</ul>"),
         });
      });

      it("keeps text before an inline block", async () => {
         await torxTest({
            template: "a @if (true) {b}",
            output: "a b",
         });
      });

      it("handles windows line endings", async () => {
         await torxTest({
            template: "<ul>\r\n@if (true) {\r\n<li>a</li>\r\n}\r\n</ul>",
            output: "<ul>\r\n<li>a</li>\r\n</ul>",
         });
      });
   });

   describe("errors", () => {
      async function expectError(template: string, message: string, line?: number, column?: number) {
         const error = await compile(template).catch(e => e);
         expect(error).toBeInstanceOf(TorxError);
         expect(error.message).toContain(message);
         if (line !== undefined) {
            expect(error.lineNumber).toBe(line);
            expect(error.columnNumber).toBe(column);
         }
      }

      it("reports an unclosed group", async () => {
         await expectError("@(x", "matching )", 1, 1);
      });

      it("reports an unclosed block with its position", async () => {
         await expectError("<p>\n  @if (x) {\n", "matching }", 2, 10);
      });

      it("reports a missing block", async () => {
         await expectError("@if (x) text", "Expecting {");
      });

      it("reports a stray @", async () => {
         await expectError("a @ b", "Unexpected token");
         await expectError("trailing @", "Unexpected end");
      });

      it("reports an unclosed comment", async () => {
         await expectError("@* never closed", "Missing closing *@");
      });

      it("reports TypeScript syntax errors", async () => {
         await expectError("@{ const = 1; }", "TypeScript:");
      });

      it("reports missing include files", async () => {
         await expectError("@include('./missing.torx')", "No file exists");
      });
   });
});
