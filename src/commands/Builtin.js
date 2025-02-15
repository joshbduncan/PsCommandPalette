const { app } = require("photoshop");
const { storage } = require("uxp");
const fs = storage.localFileSystem;
const shell = require("uxp").shell;

const { Command, CommandTypes } = require("./Command.js");
const { executePSJSScriptFile, executeJSXScriptFile } = require("../utils.js");

/**
 * Create a command palette builtin command.
 */
class Builtin extends Command {
    /**
     * Create a command palette builtin command.
     * @param {string} id Unique command id
     * @param {string} name Command name
     * @param {string} note Note displayed below command
     */
    constructor(id, name) {
        const _id = "ps_builtin_" + id;
        const note = "Ps Command Palette > Builtin > " + name;
        super(_id, name, CommandTypes.BUILTIN, note);
    }
}

//////////////////////
// builtin commands //
//////////////////////

// TODO: help builtin
// TODO: updates builtin
// TODO: pluginSettings builtin

const builtinCommands = {};

const about = () => {
    const year = new Date().getFullYear();
    const aboutString = `${PLUGIN_NAME}
Plugin for Photoshop

Version: ${PLUGIN_VERSION}

Developed by Josh Duncan

© ${year} Josh Duncan`;
    app.showAlert(aboutString);
};

builtinCommands.about = {
    name: "About Ps Command Palette",
    note: "Ps Command Palette > About...",
    callback: about,
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

const reloadPlugin = async () => {
    console.log("Reloading plugin:", PLUGIN_NAME, `v${PLUGIN_VERSION}`);
    await USER.reload();
    await HISTORY.reload();
    await DATA.reload();
    app.showAlert("Plugin reloaded");
};
builtinCommands.reload = {
    name: "Reload Plugin Data",
    note: "Ps Command Palette > Reload Plugin Data",
    callback: reloadPlugin,
};

builtinCommands.openUserDataFolder = {
    name: "Open Plugin Data Folder",
    note: "Ps Command Palette > Open Plugin Data Folder",
    callback: async () => {
        USER.reveal();
    },
};

builtinCommands.runPSJSScript = {
    name: "Run PSJS Script File",
    note: "Ps Command Palette > Run PSJS Script File...",
    callback: async () => {
        const f = await fs.getFileForOpening({
            allowMultiple: false,
            types: storage.fileTypes.all,
        });
        if (!f) {
            return;
        }
        await executePSJSScriptFile(f);
    },
};

builtinCommands.runJSXScript = {
    name: "Run JSX (ExtendScript) Script File",
    note: "Ps Command Palette > Run JSX (ExtendScript) Script File...",
    callback: async () => {
        const f = await fs.getFileForOpening({
            allowMultiple: false,
            types: storage.fileTypes.all,
        });
        if (!f) {
            return;
        }
        await executeJSXScriptFile(f);
    },
};

/**
 * Load builtin commands.
 * @returns {Builtin[]}
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
    builtinCommands,
    about,
    reloadPlugin,
    loadBuiltins,
};
