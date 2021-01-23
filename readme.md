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
	counter++
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
Torx comments are removed by the server before the template is rendered:

```html
@* This is a server-side comment. *@
```

JavaScript variables work as expected:

```html
<ul>
	@for (var key in array) {
		var item = array[key]
		//array.pop()

		<li>@item</li>
	}
</ul>
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
		torx.renderView('views/pages/index',
		{ title: 'Homepage' },
		function (error, html) {
            if (error) {
                res.writeHead(500, { 'Content-Type': 'text/html' })
                res.end(error.stack)
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' })
                res.end(html)
            }
        })
    })

var port = 3000;
app.listen(port, () => console.log('Listening on http://localhost:' + port))
```

## Command Line
Basic usage:

```
torx [source.torx] [build.html]
```

If the build file is omitted, a `.html` file is created with the original file name.

The `.torx` file extension is not required:
```
torx index
```
The command will create a `index.html` file in the same folder.

Check current version with `torx -v` or `torx --version`

# Example

Create a `.torx` file:

```html
@{
    var pages = ["Home", "About", "Contact"];
	var title = "Home";
}

<html>
<body>

	<h1>@(title.toUpperCase() + '!')</h1>

	@function link(label, href) {
		<a href="@href">@label</a>
	}

	@* This is a list of links. *@
	<ul>
		@for (key in pages) {
			var page = pages[key]
			<li @if (pages[index] === 'Home') { style="color: blue;" }>
				@link(page, page.toLowerCase())
			</li>
		}
	</ul>

</body>
</html>
```

# Release History

See the [Changelog](https://github.com/slulego/Torx/blob/master/changelog.md) on GitHub.
