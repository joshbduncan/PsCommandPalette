const { storage } = require("uxp");
const fs = storage.localFileSystem;
const shell = require("uxp").shell;

const { Command, CommandTypes } = require("./Command.js");

/**
 * Create a command palette builtin command.
 */
class Builtin extends Command {
    /**
     * Create a command palette builtin command.
     * @param {string} id Unique command id
     * @param {string} name Command name
     * @param {string} note Note displayed below command
     * @param {boolean} enabled Is command enabled for use (defaults to true)
     */
    constructor(id, name, note = "", enabled = true) {
        const _id = "ps_builtin_" + id;
        super(_id, name, CommandTypes.BUILTIN, note);
    }
}

//////////////////////
// builtin commands //
//////////////////////

// TODO: help builtin
// TODO: updates builtin
// TODO: pluginSettings builtin
// TODO: viewUserData builtin

const builtinCommands = {};

builtinCommands.about = {
    name: "About Ps Command Palette",
    note: "Ps Command Palette > About...",
    callback: () => {
        const year = new Date().getFullYear();
        const aboutString = `${PLUGIN_NAME}
    Plugin for Photoshop
    
    Version: ${PLUGIN_VERSION}
    
    Developed by Josh Duncan
    
    © ${year} Josh Duncan`;
        app.showAlert(aboutString);
    },
};

builtinCommands.help = {
    name: "Plugin Help",
    note: "Ps Command Palette > Plugin Help...",
    callback: async () => {
        await shell.openExternal(
            "https://github.com/joshbduncan/PsCommandPalette/wiki",
            "Ps Command Palette Help Wiki"
        );
    },
};

builtinCommands.reload = {
    name: "Reload Plugin",
    note: "Ps Command Palette > Reload Plugin",
    callback: async () => {
        console.log("Reloading plugin:", PLUGIN_NAME, `v${PLUGIN_VERSION}`);
        await USER.reload();
        await HISTORY.reload();
        await DATA.reload();
        app.showAlert("Plugin reloaded.");
    },
};

builtinCommands.openUserDataFolder = {
    name: "Open Plugin User Data Folder",
    note: "Ps Command Palette > Open Plugin User Data Folder",
    callback: async () => {
        USER.reveal();
    },
};

/**
 * Load builtin commands.
 * @returns {Array.<Builtin>}
 */
function loadBuiltins() {
    return Object.entries(builtinCommands).map(([key, obj]) =>
        Object.assign(new Builtin(key, obj.name, obj.note), {
            execute: obj.callback,
        })
    );
}

module.exports = {
    Builtin,
    loadBuiltins,
};
