const { app, core } = require("photoshop");
const os = require("os");
const uxp = require("uxp");
const { entrypoints } = uxp;

const manifest = require("./manifest.json");
const { CommandPalette } = require("./palettes/CommandPalette.js");
const { User } = require("./user/User.js");
const { History } = require("./user/History.js");
const { Data } = require("./commands/Data.js");

/////////////////////
// get plugin info //
/////////////////////
const PLUGIN_NAME = manifest.name;
const PLUGIN_VERSION = manifest.version;
const PLUGIN_AUTHOR = manifest.author;
const HOST_NAME = uxp.host.name;
const HOST_VERSION = uxp.host.version;
const HOST_LOCALE = uxp.host.uiLocale;
const HOST_OS = os.platform();
console.log("Loading plugin:", PLUGIN_NAME, `v${PLUGIN_VERSION}`);

/////////////////////////
// create data objects //
/////////////////////////
const USER = new User();
const HISTORY = new History();
const DATA = new Data();

////////////////////
// load user data //
////////////////////
USER.load();
HISTORY.load();

// TODO: localize menus here and in manifest - https://developer.adobe.com/photoshop/uxp/2021/guides/uxp_guide/uxp-misc/manifest-v4/#menu-localization
entrypoints.setup({
    commands: {
        launchPalette: () => launchPalette(),
    },
});

///////////////////////
// command functions //
///////////////////////

async function launchPalette() {
    const start = performance.now();
    await DATA.reload();
    const end = performance.now();
    console.log(`Data.load() execution time: ${(end - start).toFixed(3)} ms`);

    const palette = new CommandPalette();
    const result = await palette.open();
    console.log("Modal result:", result);

    if (result === "reasonCanceled" || !result) return;

    const { query, command } = result;
    if (!command) {
        console.error("No command selected.");
        return;
    }

    // to allow for external user data file editing, don't write
    // user data when "Reload Plugin Data" command is executed
    if (command.id !== "ps_builtin_reload") {
        HISTORY.add(query, command.id);
        USER.write();
    }

    await command.execute();
}
