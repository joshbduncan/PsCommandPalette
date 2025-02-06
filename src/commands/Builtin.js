const { storage } = require("uxp");
const fs = storage.localFileSystem;

const { Command, CommandTypes } = require("./Command.js");

/**
 * Create a command palette builtin command.
 */
class Builtin extends Command {
    /**
     * Create a command palette builtin command.
     * @param {string} id Unique command id
     * @param {string} name Command name
     * @param {string} description Command description (displayed below command)
     * @param {boolean} enabled Is command enabled for use (defaults to true)
     */
    constructor(id, name, description = "", enabled = true) {
        const _id = "ps_builtin_" + id;
        super(_id, name, CommandTypes.BUILTIN, description);
    }
}

//////////////////////
// builtin commands //
//////////////////////

// TODO: help builtin
// TODO: updates builtin
// TODO: pluginSettings builtin
// TODO: viewUserData builtin

/**
 * About plugin.
 */
const about = new Builtin(
    "about",
    "About Ps Command Palette",
    "Ps Command Palette > About..."
);
about.execute = () => {
    const year = new Date().getFullYear();
    const aboutString = `${PLUGIN_NAME}
Plugin for Photoshop

Version: ${PLUGIN_VERSION}

Developed by Josh Duncan

© ${year} Josh Duncan`;
    app.showAlert(aboutString);
};

/**
 * Reload plugin.
 */
const reload = new Builtin(
    "reload",
    "Reload Plugin",
    "Ps Command Palette > Reload Plugin"
);
reload.execute = async () => {
    console.log("Reloading plugin:", PLUGIN_NAME, `v${PLUGIN_VERSION}`);
    await USER.reload();
    await HISTORY.reload();
    await DATA.reload();
    app.showAlert("Plugin reloaded.");
};

/**
 * Load builtin commands.
 * @returns {Array.<Builtin>}
 */
function loadBuiltins() {
    return [about, reload];
}

module.exports = {
    Builtin,
    loadBuiltins,
};
