# Torx

Torx is the TypeScript template engine for Node.

## Installation

Torx is designed to run from the command line, as an [Express](https://expressjs.com) template engine, or as a Node package.

```
npm install -g torx
```

## Syntax

Execute and render TypeScript variables using the `@` symbol.

```xml
<button>@label</button>
```

Escape `@` by using it twice, `@@`.

```xml
<p>@@username</p>
```

This example creates a square with 5 stripes.

```xml
@{
   const imageSize = 200;
   const stripeHeight = 20;
}
<svg width="@imageSize" height="@imageSize" xmlns="http://www.w3.org/2000/svg">
   @for (let index = 0; index < 5; index++) {
      <rect x="0" y="@(index * stripeHeight * 2)" width="@imageSize" height="@stripeHeight" />
   }
</svg>
```

## Usage

```
torx file.torx out/file.html
```
