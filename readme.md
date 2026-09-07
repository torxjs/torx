# Torx

Torx is a TypeScript template engine for Node. Templates are plain text files where `@` switches into TypeScript, in the style of Razor. Anything TypeScript can do, a template can do: typed functions, loops, async data, includes of other templates.

## Installation

```
npm install torx
```

Install globally to use the command line:

```
npm install -g torx
```

## Syntax

Print a value with `@`.

```torx
<h1>@title</h1>
<p>@user.name, @user?.email, @items[0], @format(date)</p>
```

Undefined and null values print as empty text. Promises are awaited.

Use parentheses for any expression.

```torx
<p>@(price * quantity) @(items.length > 0 ? "some" : "none")</p>
```

Escape `@` by writing it twice.

```torx
<p>name@@domain.com</p>
```

### Code blocks

Run TypeScript without printing anything.

```torx
@{
   const imageSize: number = 200;
   const stripeHeight = imageSize / 5;
}
```

Inside a code block, call `print()` to add text to the output.

### Control blocks

`if`, `else if`, `else`, `for`, `while`, `try`, `catch` and `finally` work as in TypeScript. The block body is template text, so it can contain more `@` expressions and nested blocks.

```torx
@if (user) {
   <p>Welcome back, @user.name</p>
} else {
   <p>Please sign in</p>
}

<ul>
   @for (const item of items) {
      <li>@item</li>
   }
</ul>
```

The newline after `{` and the indentation before `}` are removed, so blocks line up with the surrounding text.

### Functions

Define reusable pieces with typed parameters. Functions can be nested and can contain any other block.

```torx
@function button(label: string, primary = false) {
   <button class="@(primary ? 'primary' : '')">@label</button>
}

@button("Save", true)
@button("Cancel")
```

### Include

Render another template, with its own data. Paths are relative to the current file.

```torx
@include("./partials/header.torx", { title: "Home" })
```

Read a file as text with `file()`.

```torx
<style>@file("./styles.css")</style>
```

### Comments

```torx
@/ single line comment
@* multiline
   comment *@
```

## Command line

```
torx <input.torx> [options]

Options:
  -o, --out <path>    write the output to this file
  -d, --data <path>   JSON file with values available in the template
  -v, --version       print the torx version
  -h, --help          print this help
```

The output is printed to stdout unless `--out` is given, so it can be piped.

```
torx page.html.torx -o page.html
torx email.torx -d customer.json -o email.html
torx page.html.torx > page.html
```

## Node

```ts
import { compile, compileFile } from "torx";

const html = await compile("<h1>@title</h1>", { title: "Hello" });
const page = await compileFile("./views/page.torx", { title: "Hello" });
```

Errors are thrown as `TorxError` with `fileName`, `lineNumber` and `columnNumber` when the position is known. `error.toString()` prints the offending line with a pointer.

## Express

```ts
import express from "express";
import * as torx from "torx";

const app = express();
app.engine("torx", torx.express);
app.set("view engine", "torx");
app.set("views", "./views");

app.get("/", (request, response) => {
   response.render("index", { title: "Home" });
});
```
