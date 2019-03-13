# Torx (Alpha)

Connect Node to web pages.



Write server-side JavaScript inside HTML using a code block:

```html
@{
    title = 'My Tools';
    tools = ['Hammer', 'Wrench', 'Screw Driver'];
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

Pass variables easily from node and express.
```js
res.render('index', {
	title: 'My Tools',
})
```

Use parenthisis to output complex values.

```html
<h1>@( title.toUpperCase() + '!' )</h1>
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
    tools = ['Hammer', 'Wrench', 'Screw Driver'];
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
        tools: ['Hammer', 'Wrench', 'Screw Driver']
    })
})
var port = 3000;
app.listen(port, () => console.log('Listening on http://localhost:' + port))
```