// Plain-JS entry point loaded by index.html. UXP runs a <script> tag's file
// as a classic script, which gets `require` but no CommonJS `exports` - and
// tsc's CommonJS output for main.ts writes to `exports`, so it can't be the
// <script> itself. Modules loaded through `require()` do get a proper
// CommonJS wrapper, so hand off to the compiled main.js that way.
require("./main.js");
