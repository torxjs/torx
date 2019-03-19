# Torx (Alpha)

Connect Node to web pages.



Write server-side JavaScript inside HTML using a code block:

```html
@{
    title = 'Buy Tools';
    tools = ['Hammer', 'Wrench', 'Drill'];
}
<html>...
```

Output variables:

```html
<h1>@title</h1>
```

The result:
```html
<h1>My Tools</h1>
```

Create helper functions:

```html
@function button(label) {
	<button>@label</button>
}

<div>@button('I like tools!')</div>
```

Loop everything:
```html
<ul>
	@for (index in tools) {
		<li>@button(tools[index])</li>
	}
</ul>
```

Pass variables easily from Node.
```js
res.render('index', {
	title: 'My Tools'
})
```

Use parentheses when needed.

```html
<strong>Total: @( price + (price * 0.07) )</strong>
```

Loop html just like in JavaScript:

```html
@for (tool in tools) {
    <li>@tool</li>
}
```

Conditions:
```html
@if (title.length > 0) {
    <h1>@title</h1>
}
```

Make comments anywhere:

```html
@* These are my tools *@
```
# Example using Express:

The file extension is `.torx`

`index.torx`

```html
@{
    title = 'My Tools';
    tools = ['Hammer', 'Wrench', 'Drill'];
}

<html>
<body>

    <h1>@(title.toUpperCase() + '!')</h1>

    @* These are my tools *@
	<ul>
		@for (tool in tools) {
			<li @if (tools[tool] === 'Wrench') { style="color: blue;" }>
				@tools[tool]
			</li>
		}
    </ul>

</body>
</html>
```
`app.js`

``` javascript
const express = require('express')
const torx = require('torx');
const app = express()

app.engine('torx', torx)

app.set('views', './views') // Specify the views directory
app.set('view engine', 'torx') // Register the template engine

app.get('/', function (req, res) {
    res.render('index', {
        title: 'My Tools',
        tools: ['Hammer', 'Wrench', 'Drill']
    })
})
var port = 3000;
app.listen(port, () => console.log('Listening on http://localhost:' + port))
```