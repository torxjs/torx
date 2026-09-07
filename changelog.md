# 2.0.0

7 September 2026

Breaking changes:

- The command line takes one input file and explicit options: `torx <input.torx> [-o <out>] [-d <data.json>]`. Without `--out` the result is printed to stdout. The `name.ext.torx` and `torx file.torx ext` shorthands are removed.
- `0` and `false` now print as `0` and `false` instead of nothing. Only `undefined` and `null` print as empty text.
- Block whitespace: the newline after `{`, the indentation before `}` and the indentation before a block on its own line are removed for `if`, `else`, `for`, `while`, `try` and `function` blocks alike.
- The command line exits with code 1 on errors and writes them to stderr.

Fixes:

- Blocks nested inside `@function` (functions, `if`, `for`, `include`) produced empty output.
- Backticks, backslashes and `${` in template text broke the compiled script.
- Apostrophes inside a block, such as `@if (x) {don't}`, threw a quote error.
- `@name.` at the end of a sentence grabbed the next word as a property.
- Data values were passed through JSON, which dropped functions, dates and class instances. They are now passed by reference.
- `@include` with a single argument passed the parent file path as the data object.
- Syntax errors crashed the process instead of being reported. Errors now carry the file, line and column.
- Windows line endings were converted to `\n`.

Added:

- `@while`, `@try`, `catch` and `finally` blocks.
- `@include` inside functions and anywhere else, since template functions are async.
- Promises returned by data functions are awaited before printing.
- TypeScript syntax errors in the template are reported as a `TorxError`.
- `TorxError` is exported and extends `Error`.
- TypeScript 5, Jest 29, strict mode.

# 2.0.0 (2023-10-07)

- Command line interface overhaul.
- Add `--watch` option.
- Add `--dry-run` option.

# 1.2.1

- Fix include bug.

# 1.2.0

7 October 2023

- No longer errors if `undefined` or `null`.
- Add support for optional chaining `name?.first`.

# 1.1.5

9 August 2023

- Fix multiple ifs bug.

# 1.1.4

9 August 2023

- Fix changes not published.

# 1.1.3

9 August 2023

- Fix if else bug.

# 1.1.2

13 May 2023

- Fix types not exporting.
- Export `torx.compileFile()`

# 1.1.1

22 May 2022

- Fix `torx.compile()` parameters not optional.

# 1.1.0

22 May 2022

- `@include()` and `file()` now use relative file paths.

# 1.0.0

8 May 2022

- Rebuild to support TypeScript.
- Add single line comment back as `@/`.
- Add `file()` to read text from a file.

# 0.2.1

13 Jan 2020

- Fixed some self-closing tags throwing an error.

# 0.2.0

20 Dec 2020

- Removed `@//` comments.
- Fixed implicit expression context.
- Output file is no longer required in command line:

   ```
   torx file
   ```

# 0.1.0

29 Nov 2020

- Forked from github.com/eshengsky/saker.
- Added command line interface:

   ```
   torx template-file output-file
   ```

# 0.0.6

18 May 2019

- Added include function:

   ```
   @include('filename')
   ```

- Updated readme.

# 0.0.5

- Debugging now shows the file name and line number.
- Bug fixes.

# 0.0.4

- Added if else/elseif functionality.

# 0.0.3

- Added quick links to readme.

# 0.0.2

- Updated readme.
- Added functions:

   ```html
   @function name(params) {
   <button>@params</button>
   }

   <div>@name('text')</div>
   ```

# 0.0.1

- Initial release
