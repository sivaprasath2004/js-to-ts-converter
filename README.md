
# JS → TS/TSX Converter CLI

**A CLI tool to convert JavaScript (JS/JSX) files to fully TypeScript-compliant TS/TSX files.**  

This tool automatically:  
- Adds type annotations for variables and function parameters  
- Converts destructured function parameters to `params: any` with destructuring inside the function  
- Skips type annotations on `for...in` and `for...of` loop variables  
- Infers basic types for literals, arrays, and objects  
- Detects JSX in files and outputs `.tsx` files  
- Removes `.js`, `.jsx`, `.ts`, `.tsx` extensions from import statements  

---

## Features

- ✅ Converts JS/JSX files to TS/TSX  
- ✅ Automatically infers types for variables  
- ✅ Fixes destructured function parameters  
- ✅ Fully TypeScript-compliant output  
- ✅ Preserves JSX when present  
- ✅ Cleans import statements (removes file extensions)  

---

## Installation

Install globally via npm:

```bash
npm install -g js-to-ts-converter-cli
````

Or test locally:

```bash
npm link
```

---

## Usage

Convert a single file:

```bash
js-to-ts-converter ./src/utils.js
```

Convert a folder:

```bash
js-to-ts-converter ./src
```

Output files are generated in the `tsConverter` folder inside the source directory.

---

## Examples

### JS File: `utils.js`

```js
function add({ a, b }) {
  return a + b;
}

const multiply = (x, y) => x * y;

import App from './App.js';
```

### Converted TS File: `tsConverter/utils.ts`

```ts
function add(params: any): any {
  const { a, b } = params;
  return a + b;
}

const multiply = (x: any, y: any): any => x * y;

import App from './App';
```

---

## Notes

* Detects JSX automatically: converts `.js` to `.tsx` if JSX is present
* Works with `.js`, `.jsx`, `.ts`, `.tsx` files
* Skips folders like `node_modules`, `public`, `web_pack`, `.erb`

---

