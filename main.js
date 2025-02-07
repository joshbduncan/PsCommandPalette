const { app, core } = require("photoshop");
const os = require("os");
const uxp = require("uxp");
const { entrypoints } = uxp;

const manifest = require("./manifest.json");
const { CommandPalette } = require("./src/CommandPalette.js");
const { User } = require("./src/User.js");
const { History } = require("./src/History.js");
const { Data } = require("./src/Data.js");

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
    await DATA.load();

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

        HISTORY.add(query, command.id);
        USER.write();

        await command.execute();
    } catch (error) {
        console.error("Palette error:", error);
        // TODO: Add user alert - https://developer.adobe.com/photoshop/uxp/2022/design/ux-patterns/messaging/
        app.showAlert(error);
    }
}
