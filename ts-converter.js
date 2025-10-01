
const fs = require("fs");
const path = require("path");
const babelParser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generate = require("@babel/generator").default;

const SKIP_DIRS = ["node_modules", "public", "web_pack", ".erb"];
const OUT_ROOT = "tsConverter";
let OUT_PUT_PATH = "";


function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
 
function inferType(node) {
  if (!node) return "any";
  switch (node.type) {
    case "NumericLiteral": return "number";
    case "StringLiteral": return "string";
    case "BooleanLiteral": return "boolean";
    case "ArrayExpression": return "any[]";
    case "ObjectExpression": return "Record<string, any>";
    default: return "any";
  }
}

function rewriteDestructuredParam(path, param) {
  if (param.type === "ObjectPattern" || param.type === "ArrayPattern") {
    const paramName = t.identifier("params");
    paramName.typeAnnotation = t.tsTypeAnnotation(t.tsAnyKeyword());

    const body = path.node.body.body || [];
    const destructuring = t.variableDeclaration("const", [
      t.variableDeclarator(param, paramName)
    ]);
    body.unshift(destructuring);
    path.node.body.body = body;

    return paramName;
  }
  return param;
}


function handleParam(path) {
  path.node.params = path.node.params.map(param => {
    if (param.type === "Identifier") {
      if (!param.typeAnnotation) param.typeAnnotation = t.tsTypeAnnotation(t.tsAnyKeyword());
      return param;
    }
    return rewriteDestructuredParam(path, param);
  });

  if (!path.node.returnType) path.node.returnType = t.tsTypeAnnotation(t.tsAnyKeyword());
}

function convertFile(jsFile, outFile) {
  const src = fs.readFileSync(jsFile, "utf8");
  let ast;
  try {
    ast = babelParser.parse(src, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "classProperties"]
    });
  } catch (e) {
    console.error("Parse error:", jsFile, e.message);
    return;
  }

  let hasJSX = false;

  traverse(ast, {
    VariableDeclarator(path) {
      const parent = path.parentPath.parent;
      if (parent && (parent.type === "ForInStatement" || parent.type === "ForOfStatement")) return;

      if (!path.node.id.typeAnnotation) {
        const tname = inferType(path.node.init);
        let tsType;
        if (tname === "number") tsType = t.tsNumberKeyword();
        else if (tname === "string") tsType = t.tsStringKeyword();
        else if (tname === "boolean") tsType = t.tsBooleanKeyword();
        else if (tname === "any[]") tsType = t.tsArrayType(t.tsAnyKeyword());
        else if (tname.startsWith("Record")) tsType = t.tsTypeReference(t.identifier("Record<string, any>"));
        else tsType = t.tsAnyKeyword();
        path.node.id.typeAnnotation = t.tsTypeAnnotation(tsType);
      }
    },

    Function(path) { handleParam(path); },
    ArrowFunctionExpression(path) { handleParam(path); },

    ForInStatement(path) {
      if (path.node.left.type === "VariableDeclaration") path.node.left.declarations[0].id.typeAnnotation = null;
    },
    ForOfStatement(path) {
      if (path.node.left.type === "VariableDeclaration") path.node.left.declarations[0].id.typeAnnotation = null;
    },

    JSXElement() {
      hasJSX = true;
    },

   ImportDeclaration(path) {
    path.node.source.value = path.node.source.value.replace(/\.(js|ts|jsx|tsx)$/, "");
  },
  });

  const { code } = generate(ast, { retainLines: true, compact: false, comments: true });
 
  if (hasJSX) outFile = outFile.replace(/\.ts$/, ".tsx");

  ensureDir(outFile);
  fs.writeFileSync(outFile, code, "utf8");
  console.log("✔ Converted:", jsFile, "→", outFile);
} 

function processPath(input) {
  const stat = fs.statSync(input);

  if (stat.isDirectory()) {
    OUT_PUT_PATH = input;
    walkDir(input);
  } 
  else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(input)) {
    OUT_PUT_PATH = path.dirname(input);

    const outFile = path.join(
      OUT_PUT_PATH,
      OUT_ROOT,
      path.relative(".", input).replace(/\.(js|jsx|ts|tsx)$/, ".ts")
    );

    convertFile(input, outFile);
  } else console.warn("Skipped:", input);
}
 
function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (SKIP_DIRS.some(skip => fullPath.includes(skip))) continue;

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walkDir(fullPath);
    } 
    else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(file)) {
      const outFile = path.join(
        OUT_PUT_PATH,
        OUT_ROOT,
        path.relative(OUT_PUT_PATH, fullPath).replace(/\.(js|jsx|ts|tsx)$/, ".ts")
      );
      convertFile(fullPath, outFile);
    }
  }
} 

const target = process.argv[2];
if (!target) {
  console.error("Usage: node ts-converter.js <file.js|folder>");
  process.exit(1);
}
processPath(target);
