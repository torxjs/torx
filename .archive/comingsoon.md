# Torx 1.0 Release

The fast and beautiful JavaScript template engine.

## TypeScript

```ts
@function button(label: string) {
    <button>@label</button>
}
```

## API Changes

```ts
renderFile(filename: string, data: object);
```

```js
const torx = require('../')

const output = torx.renderFile('example.torx', { title: 'Example Title' })
```


## Express
```js
app.set('view engine', 'torx')
app.get('/', function (req, res) {
    res.render('index', { title: 'Hey', message: 'Hello there!' })
})
```


## Terminal

Simplest use where index is a torx file and index.html will be generated:
```
torx index
```
Or an output filename can be specified:
```
torx [index.torx] [output.html]
```
The Torx file is not required to have a .torx extension and the output is not required to have an .html extension.
