// Delete build/ before a full build. tsc never removes outputs, so without
// this a renamed or deleted .ts file leaves its old .js behind in build/ -
// and UXP Developer Tool packages everything in build/ into the CCX.
import { rmSync } from "node:fs";

rmSync("build", { recursive: true, force: true });
console.log("Removed build/");
