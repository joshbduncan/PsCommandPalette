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
     * @param {string} note Note displayed below command
     */
    constructor(file, note) {
        const id = "ps_script_" + file.nativePath;
        super(id, file.name, CommandTypes.SCRIPT, note || file.nativePath);
        this.file = file;
    }

    /**
     * Execute the script.
     * @returns {Promise<void>}
     */
    async execute() {
        try {
            // determine script type
            const regex = /\.psjs$/i;
            const type = regex.test(this.file.name) ? "psjs" : "jsx";
            const func = type === "psjs" ? executePSJSScriptFile : executeJSXScriptFile;
            return func(this.file);
        } catch (error) {
            console.error(error);
        }
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
        const scriptsFolder = await pluginFolder.getEntry("scripts/");
        if (!scriptsFolder) {
            throw new Error("Scripts folder not found.");
        }

        const entries = await scriptsFolder.getEntries();
        const scriptFiles = entries.filter((file) => file.isFile);

        const pluginScripts = scriptFiles.map((file) => {
            const script = new Script(
                file,
                "Ps Command Palette > Scripts > " + file.name
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
