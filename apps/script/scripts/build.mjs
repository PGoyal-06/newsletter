// Bundles src/ into dist/Code.js for Apps Script, copies the manifest, and fails the
// build if any entry point is missing from the bundle's globals.
import { build } from "esbuild";
import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import vm from "node:vm";

const ENTRY_POINTS = ["doGet", "onTimer", "installTriggers"];

// Top level declarations so the editor's Run menu lists each entry point. They are
// hoisted, then the bundle above overwrites each one with the real function.
const STUB_MARKER = "/*@stub*/";
const footer = [
  "// Editor stubs: replaced at load by the bundle above.",
  ...ENTRY_POINTS.map((name) => `function ${name}() { ${STUB_MARKER} }`),
].join("\n");

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await build({
  entryPoints: ["src/main.ts"],
  outfile: "dist/Code.js",
  bundle: true,
  format: "iife",
  target: "es2019",
  minify: false,
  treeShaking: true,
  footer: { js: footer },
  logLevel: "warning",
});

await copyFile("appsscript.json", "dist/appsscript.json");

// Post build check: load the bundle in a sandbox and confirm every entry point is
// the real function, not a stub and not missing.
const code = await readFile("dist/Code.js", "utf8");
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const broken = ENTRY_POINTS.filter((name) => {
  const fn = sandbox[name];
  return typeof fn !== "function" || fn.toString().includes(STUB_MARKER);
});
if (broken.length > 0) {
  console.error(`Build check failed: entry points not assigned to globalThis: ${broken.join(", ")}`);
  process.exit(1);
}
console.log(`Built dist/Code.js, entry points OK: ${ENTRY_POINTS.join(", ")}`);
