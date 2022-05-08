# 1.0.0

8 May 2022

-  Rebuild to support TypeScript
-  Add single line comment back as `@/`.
-  Add `file()` to read text from a file.

# 0.2.1

13 Jan 2020

-  Fixed some self-closing tags throwing an error.

# 0.2.0

20 Dec 2020

-  Removed `@//` comments.
-  Fixed implicit expression context.
-  Output file is no longer required in command line:

   ```
   torx file
   ```

# 0.1.0

29 Nov 2020

-  Forked from github.com/eshengsky/saker.
-  Added command line interface:

   ```
   torx template-file output-file
   ```

# 0.0.6

18 May 2019

-  Added include function:

   ```
   @include('filename')
   ```

-  Updated readme.

# 0.0.5

-  Debugging now shows the file name and line number.
-  Bug fixes.

# 0.0.4

-  Added if else/elseif functionality.

# 0.0.3

-  Added quick links to readme.

# 0.0.2

-  Updated readme.
-  Added functions:

   ```html
   @function name(params) {
   <button>@params</button>
   }

   <div>@name('text')</div>
   ```

# 0.0.1

-  Initial release
