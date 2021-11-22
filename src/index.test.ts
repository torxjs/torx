import { compile } from "./index";

describe("compile", () => {
  describe("implicit", () => {
    it("@title", async () => {
      const template = "@title";
      const data = { title: "My Title" };
      const result = data.title;
      expect(compile(template, data)).resolves.toEqual(result);
    });

    it("<h1>@title<h1>", () => {
      const template = "<h1>@title<h1>";
      const data = { title: "My Title" };
      const result = `<h1>${data.title}<h1>`;
      expect(compile(template, data)).resolves.toEqual(result);
    });

    it("@getTitle()", () => {
      const template = "@getTitle()";
      const data = { getTitle: () => "My Title" };
      const result = data.getTitle();
      expect(compile(template, data)).resolves.toEqual(result);
    });

    it("@caps('My Title')", () => {
      const template = "@caps('My Title')";
      const data = { caps: (param: string) => param.toUpperCase() };
      const result = "MY TITLE";
      expect(compile(template, data)).resolves.toEqual(result);
    });
  });

  describe("explicit", () => {
    it("@(title)", async () => {
      const template = "@(title)";
      const data = { title: "My Title" };
      const result = data.title;
      expect(compile(template, data)).resolves.toEqual(result);
    });

    it("<h1>@(title)<h1>", () => {
      const template = "<h1>@(title)<h1>";
      const data = { title: "My Title" };
      const result = `<h1>${data.title}<h1>`;
      expect(compile(template, data)).resolves.toEqual(result);
    });
  });
});
