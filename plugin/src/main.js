const { app, core } = require("photoshop");
const os = require("os");
const uxp = require("uxp");
const { entrypoints } = uxp;

const manifest = require("./manifest.json");
const { CommandPalette } = require("./src/palettes/CommandPalette.js");
const { User } = require("./src/user/User.js");
const { History } = require("./src/user/History.js");
const { Data } = require("./src/commands/Data.js");

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

    try {
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

        try {
            await command.execute();
        } catch (error) {
            console.error(`Error executing command ${command.id}:`, error);
        }
    } catch (error) {
        console.error(error);
        // TODO: Add user alert - https://developer.adobe.com/photoshop/uxp/2022/design/ux-patterns/messaging/
        app.showAlert(error);
    }
}
