// Copy the non-TypeScript plugin files from src/ into build/ (tsc only emits
// the compiled .js). Pass --watch to keep re-copying them as they change.
import { cpSync, mkdirSync, watch } from "node:fs";
import { join } from "node:path";

const SRC = "src";
const OUT = "build";
const STATIC = [
    "index.html",
    "index.js",
    "style.css",
    "manifest.json",
    "tools.json",
    "icons",
];

function copyStatic() {
    mkdirSync(OUT, { recursive: true });
    for (const entry of STATIC) {
        cpSync(join(SRC, entry), join(OUT, entry), { recursive: true });
    }
}

copyStatic();
console.log(`Copied static files to ${OUT}/`);

if (process.argv.includes("--watch")) {
    for (const entry of STATIC) {
        watch(join(SRC, entry), { recursive: true }, () => {
            copyStatic();
            console.log(`${entry} changed - copied static files to ${OUT}/`);
        });
    }
}
