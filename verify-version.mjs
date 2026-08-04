import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("./manifest.json", import.meta.url), "utf8"));
const pkg = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
const versions = JSON.parse(await readFile(new URL("./versions.json", import.meta.url), "utf8"));
const requested = process.argv[2] ?? manifest.version;

const errors = [];
if (manifest.version !== requested) errors.push(`manifest.json is ${manifest.version}, expected ${requested}`);
if (pkg.version !== requested) errors.push(`package.json is ${pkg.version}, expected ${requested}`);
if (!Object.prototype.hasOwnProperty.call(versions, requested)) errors.push(`versions.json has no ${requested} entry`);
if (manifest.id !== "folder-info") errors.push(`unexpected plugin id: ${manifest.id}`);

if (errors.length) {
  throw new Error(errors.join("\n"));
}
console.log(`Version ${requested} is consistent`);
