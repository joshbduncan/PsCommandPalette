# Compile src/ into build/ on every change, and hot reload the plugin in
# Photoshop whenever the build output changes.
npm run build

echo "Loading plugin..."
(cd build && uxp plugin load)

npm run watch &
WATCH_PID=$!
trap 'kill $WATCH_PID' EXIT

echo "Watching plugin..."
nodemon --watch build --exec "cd build && uxp plugin reload" -e js,html,css,json
