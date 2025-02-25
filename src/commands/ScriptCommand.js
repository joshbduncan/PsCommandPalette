const { storage } = require("uxp");
const fs = storage.localFileSystem;

const { Command } = require("./Command.js");
const { CommandTypes } = require("../types.js");

const { executePSJSScriptFile, executeJSXScriptFile } = require("../utils/commands.js");

/**
 * Create a command palette script command.
 */
class ScriptCommand extends Command {
    /**
     * @param {object} script
     * @param {string} script.id - Unique command id
     * @param {string} script.name - Script name
     * @param {string} script.path - Script path
     * @param {string} script.token - Local persistent storage token
     */
    constructor({ id, name, path, token }) {
        super(id, name, CommandTypes.SCRIPT, path);
        this.token = token;
    }

    /**
     * Execute the script.
     * @returns {Promise<void>}
     */
    async execute() {
        // determine script type
        const regex = /\.psjs$/i;
        const func = regex.test(this.name)
            ? executePSJSScriptFile
            : executeJSXScriptFile;

        let entry;
        try {
            entry = await fs.getEntryForPersistentToken(this.token);

            // try and read the file metadata to ensure it still exists
            await entry.getMetadata();
        } catch (err) {
            await app.showAlert(
                `File access token error\n\nThe access token for ${this.name} has expired. Please locate file or folder to create a new access token.`
            );

            // TODO: prompt user to remove or re-link?

            // prompt the user to reselect the script
            entry = await fs.getFileForOpening({
                allowMultiple: false,
                types: storage.fileTypes.all,
            });

            // return in case user cancels relocation
            if (!entry) return;

            // create a new script object
            const newScript = await createScriptEntry(entry);

            // delete the old script
            USER.data.scripts = USER.data.scripts.filter((item) => item.id !== this.id);

            // update new script with new id
            newScript.id = this.id;

            // add the new updated script
            USER.data.scripts.push(newScript);

            // write user data
            await USER.write();
        }

        return await func(entry);
    }
}

/**
 * Choose, tokenize, and store a script in persistent local storage for later reference.
 * @param {storage.File} path - Script file entry object
 * @returns {{ id: string, path: string, name: string, token: string }}
 */
async function createScriptEntry(entry) {
    /**
     * Check if a script is already loaded
     * @param {string} path - Script path
     * @returns {boolean}
     */
    const duplicateScript = (path) =>
        USER.data.scripts.some((item) => item.path === path);

    // ensure script isn't already loaded
    if (duplicateScript(entry.nativePath)) {
        app.showAlert("Script already exists");
        return;
    }

    // create id
    const id = "ps_script_" + btoa(entry.nativePath);

    // create a persistent token
    const token = await fs.createPersistentToken(entry);

    return {
        id: id,
        name: entry.name,
        path: entry.nativePath,
        token: token,
    };
}

module.exports = {
    ScriptCommand,
    createScriptEntry,
};
