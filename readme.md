# Torx

JavaScript template engine based on Razor syntax.


[Package](https://www.npmjs.com/package/torx) on NPM

[Repository](https://github.com/slulego/torx) on GitHub

[Extension](https://marketplace.visualstudio.com/items?itemName=Slulego.torx) for Visual Studio Code


## Code Blocks

Write server-side JavaScript inside HTML using a code block:

```html
@{
    var title = "Page Title";
    var pages = ["Home", "About", "Contact"];
}
<html>...
```
## Variables
Output variables:

```html
<h1>@title</h1>
```

The result:
```html
<h1>Page Title</h1>
```

Use parentheses when needed.

```html
<strong>Total: @(price + tax)</strong>
```
## Functions

Create helpers:

```html
@function button(label) {
	<button>@label</button>
}

<div>@button('Click Me!')</div>
```

## Controls
Loop everything:
```html
@for (index in pages) {
	<li>@button(pages[index])</li>
}
```

```html
@while (counter > 3) {
	@{ counter++; }
	<a>@counter</a>
}
```


## Conditions
```html
@if (title.length > 0) {
	<h1>@title</h1>
} else {
	<h1>Default Title</h1>
}
```
## Comments
Multiline comment:

```html
@* This is a server-side comment. *@
```

Single line comment:
```html
@// This is also a server-side comment.
```
## Passing Variables

Easily send variables from Node and Express:
```js
res.render('index', { title: 'Page Title' })
```

# Build

Setup a Node server with Express:

``` javascript
const express = require('express')
const torx = require('torx');
const app = express()

app.engine('torx', torx)

app.set('views', './views')
app.set('view engine', 'torx')

app.get('/', function (req, res) {
    res.render('index', { title: "Page Title" })
})

var port = 3000;
app.listen(port, () => console.log('Listening on http://localhost:' + port))
```

## Command Line
```
torx [source.torx] [build.html]
```
# Example

Create a `.torx` file:

```html
@{
    var pages = ["Home", "About", "Contact"];
}

<html>
<body>

	<h1>@(title.toUpperCase() + '!')</h1>

	@function link(label, href) {
		<a href="@href">@label</a>
	}

	@// This is a list of links.
	<ul>
		@for (index in pages) {
			<li @if (pages[index] === 'Home') { style="color: blue;" }>
				@link(pages[index], pages[index].toLowerCase())
			</li>
		}
	</ul>

</body>
</html>
```

# Release History

See the [Changelog](https://github.com/slulego/Torx/blob/master/changelog.md) on GitHub.
