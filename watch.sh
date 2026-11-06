#!/usr/bin/env bash
# Build into build/ and load the plugin into Photoshop, then recompile on
# every change and hot reload the plugin whenever build/ changes. Needs the
# UXP CLI (`uxp`, from @adobe/uxp-devtools-cli) and `nodemon` on your PATH.
set -euo pipefail

for tool in uxp nodemon; do
    if ! command -v "$tool" >/dev/null; then
        echo "watch.sh needs '$tool' on your PATH." >&2
        exit 1
    fi
done

npm run build

echo "Loading plugin..."
(cd build && uxp plugin load)

# Run the watcher directly (not via `npm run watch`) so $WATCH_PID is the
# watcher itself, which stops tsc when killed.
node scripts/watch.mjs &
WATCH_PID=$!
trap 'kill "$WATCH_PID" 2>/dev/null || true' EXIT

echo "Watching plugin..."
nodemon --watch build --exec "cd build && uxp plugin reload" -e js,html,css,json
