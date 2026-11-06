// Recompile src/ and re-copy the static files on every change, as one
// process: tsc -w runs as a child and is stopped whenever this script exits
// (Ctrl+C, or a kill from watch.sh), so nothing is left running in the
// background.
//
// Doesn't clean build/ first, unlike `npm run build` - watch.sh has just
// built and loaded the plugin from there, and emptying it would make the
// reload watcher fire on a half-written folder.
import { spawn } from "node:child_process";

// Run TypeScript's own entry script with this Node, not `npx tsc`: npx
// would start tsc as a grandchild that killing npx doesn't stop.
const tsc = spawn(
    process.execPath,
    ["node_modules/typescript/bin/tsc", "-w", "--preserveWatchOutput"],
    { stdio: "inherit" }
);
const copy = spawn(process.execPath, ["scripts/copy-static.mjs", "--watch"], {
    stdio: "inherit",
});
const children = [tsc, copy];

function stop() {
    for (const child of children) {
        if (child.exitCode === null) child.kill();
    }
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
        stop();
        process.exit(0);
    });
}
// If either child dies on its own, stop the other and exit with its code.
for (const child of children) {
    child.on("exit", (code) => {
        stop();
        process.exit(code ?? 1);
    });
}
