const os = require("os");

const { app } = require("photoshop");
const uxp = require("uxp");

const { entrypoints, shell, storage } = uxp;
const fs = storage.localFileSystem;

const manifest = require("./manifest.json");
const { CommandPalette } = require("./palettes/CommandPalette.js");
const { History } = require("./user/History.js");
const { User } = require("./user/User.js");
const { about, _help, intro } = require("./commands/plugin/commands.js");
const { filterByIds } = require("./utils/query.js");
const { loadCommands } = require("./utils/load.js");
const { sortCommandsByOccurrence } = require("./utils/commands");

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

/////////////////////////
// create data objects //
/////////////////////////
const USER = new User();
const HISTORY = new History();

// TODO: localize menus here and in manifest - https://developer.adobe.com/photoshop/uxp/2022/guides/uxp_guide/uxp-misc/manifest-v4/#menu-localization
entrypoints.setup({
    plugin: {
        create() {
            console.log(`loading plugin ${PLUGIN_NAME} v${PLUGIN_VERSION}`);
        },
    },
    commands: {
        launchPalette: () => launchPalette(),
    },
});

/////////////////////
// plugin commands //
/////////////////////

async function launchPalette() {
    await USER.reload();
    await HISTORY.reload();
    const commands = await loadCommands();

    // TODO: let user specify custom commands, or use most used or most recent
    const startupCommandIDs =
        USER.data.startupCommands.length > 0
            ? USER.data.startupCommands
            : HISTORY.commandIDs;
    const startupCommands = sortCommandsByOccurrence(
        filterByIds(commands, startupCommandIDs)
    );

    const palette = new CommandPalette(commands, startupCommands);
    const result = await palette.show();
    console.log("modal result:", result);

    if (result === "reasonCanceled" || !result) return;

    const { query, command } = result;
    if (!command) {
        console.error("No command selected.");
        return;
    }

    // to allow for external user data file editing, don't write
    // user data when "Reload Plugin Data" command is executed
    if (command.id !== "ps_plugin_reload") {
        HISTORY.add(query, command.id);
        USER.write();
    }

    try {
        await command.execute();
    } catch (error) {
        console.error(error);
    }
}
