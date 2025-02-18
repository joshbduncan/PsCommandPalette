const { storage } = require("uxp");
const fs = storage.localFileSystem;

const { Command, CommandTypes } = require("./Command.js");
const { executePSJSScriptFile, executeJSXScriptFile } = require("../utils.js");

/**
 * Create a command palette script command.
 */
class Script extends Command {
    /**
     * Create a command palette script command.
     * @param {Object} script
     * @param {string} script.id Unique command id
     * @param {string} script.name Script name
     * @param {string} script.path Script path
     * @param {string} script.token Local persistent storage token
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
        const type = regex.test(this.name) ? "psjs" : "jsx";
        const func = type === "psjs" ? executePSJSScriptFile : executeJSXScriptFile;

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

            // prompt the user to reselect the script and create a new entry
            const newScript = await createScriptEntry();

            // delete the old script
            USER.data.scripts = USER.data.scripts.filter((item) => item.id !== this.id);

            if (newScript !== undefined) {
                // update new script with new id
                newScript.id = this.id;

                // add the new updated script
                USER.data.scripts.push(newScript);

                // grab the new entry
                entry = await fs.getEntryForPersistentToken(newScript.token);
            } else {
                entry = undefined;
            }

            // write user data
            await USER.write();
        }

        // return in case user cancels relocation
        if (!entry) return;

        // TODO: ensure file is available
        return func(entry);
    }
}

/**
 * Choose, tokenize, and store a script in persistent local storage for later reference.
 * @returns {{ id: string, path: string, name: string, token: string }}
 */
async function createScriptEntry(type) {
    /**
     * Check if a script is already loaded
     * @param {string} path Script path
     * @returns {boolean}
     */
    const duplicateScript = (path) =>
        USER.data.scripts.some((item) => item.path === path);

    const f = await fs.getFileForOpening({
        allowMultiple: false,
        types: storage.fileTypes.all,
    });

    if (!f) return;

    // ensure script isn't already loaded
    if (duplicateScript(f.nativePath)) {
        app.showAlert("Script already exists");
        return;
    }

    // create id
    const id = "ps_script_" + btoa(f.nativePath);

    // create a persistent token
    const token = await fs.createPersistentToken(f);

    return {
        id: id,
        name: f.name,
        path: f.nativePath,
        token: token,
    };
}

/**
 * Load plugin script commands.
 * @returns {Script[]}
 */
async function loadScripts() {
    try {
        return USER.data.scripts.map((script) => new Script({ ...script }));
    } catch (error) {
        console.error(error);
        return [];
    }
}

module.exports = {
    Script,
    createScriptEntry,
    loadScripts,
};
