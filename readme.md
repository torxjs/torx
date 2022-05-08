# Torx

The TypeScript template engine for Node.

# Command Line Interface

## Compile

There are a few ways to compile this file.

-  Providing the output file extension.
-  Using a semantic file name.
-  Providing an output file name.

### File Extension

For this example, create a torx file named `index.torx`.
To set the output file extension, just provide it using this format:

> torx [filename] [extension]

Compile to HTML file:

```
torx index.torx html
```

This will create `index.html` in the same directory as `index.torx`.

### Semantic File Name

An alternative method is to name each file with the desired output.
For example `update.sql.torx`.

To compile, no more information is required than the source file name.

> torx [filename]

```
torx update.sql.torx
```

This will omit the `.torx` extension and create `update.sql`

### Out File Path

To explicitly set the output file, provide the full path:

> torx [filename] [output]

Example:

```
torx src/data.torx bin/data.json
```

This will create `data.json` in the bin folder.

## Version

To get the installed version of Torx:

```
torx --version
```

Or use the shorthand

```
torx -v
```
