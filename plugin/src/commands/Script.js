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
     * @param {storage.File} file Script file entry
     * @param {string} name Command name
     * @param {string} note Note displayed below command
     */
    constructor(file, name, note) {
        const id = "ps_script_" + file.nativePath;
        const _name = name === undefined ? file.name : name;
        const _note = note === undefined ? file.nativePath : note;
        super(id, _name, CommandTypes.SCRIPT, note);
        this.file = file;
    }

    /**
     * Execute the script command.
     * @returns {Promise<void>}
     */
    async execute() {
        // determine script type
        const regex = /\.psjs$/i;
        const type = regex.test(this.file.name) ? "psjs" : "jsx";
        const func = type === "psjs" ? executePSJSScriptFile : executeJSXScriptFile;
        return func(this.file);
    }
}

/**
 * Load plugin script commands.
 * @returns {Script[]}
 */
async function loadScripts() {
    try {
        const scripts = [];
        // load included scripts
        const pluginFolder = await fs.getPluginFolder();
        const scriptsFolder = await pluginFolder.getEntry("src/scripts/");
        if (!scriptsFolder) {
            throw new Error("Scripts folder not found.");
        }

        const entries = await scriptsFolder.getEntries();
        const scriptFiles = entries.filter((entry) => entry.isFile);

        const pluginScripts = scriptFiles.map((entry) => {
            const script = new Script(
                entry,
                undefined,
                "Ps Command Palette > Scripts > " + entry.name
            );
            return script;
        });

        scripts.push(...pluginScripts);

        // TODO: load user scripts

        return scripts;
    } catch (error) {
        console.error(error);
        return [];
    }
}

module.exports = {
    Script,
    loadScripts,
};
