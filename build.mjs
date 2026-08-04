import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("./main.ts", import.meta.url);
const outputPath = new URL("./main.js", import.meta.url);

const source = await readFile(sourcePath, "utf8");
if (!source.includes('module.exports = FolderInfoPlugin;')) {
  throw new Error("main.ts does not export FolderInfoPlugin");
}

const banner = "// Generated from main.ts by build.mjs. Do not edit main.js directly.\n";
await writeFile(outputPath, banner + source.replace(/^\uFEFF/, ""), "utf8");
console.log("Built main.js from main.ts");
