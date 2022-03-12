# Torx.js CLI

## Compile

Create a torx file named `index.torx`

The src is the torx file path. The file extension can be ommitted.

The out can either be a file extension or a full path.

```
torx <src> <out>
```

---

The simpliest way: `torx <src> <extension>`

```
torx index html
```
Compiles to the file `index.html`

---

Specify a file name: `torx <src> <out>`

```
torx index build.json
```

Compiles to the file `build.json`

---

## Version

Output the installed version of Torx.js
```
torx --version
```

Or use the shorthand
```
torx -v
```
