const { storage } = require("uxp");
const fs = storage.localFileSystem;

const { Command, CommandTypes } = require("./Command.js");

/**
 * Create a command palette tool command.
 */
class Tool extends Command {
    /**
     * Create a command palette tool command.
     * @param {string} ref Tool batchPlay reference string
     * @param {string} name Tool name
     * @param {string} description Tool description
     * @param {string} keyboardShortcut Tool keyboard shortcut
     */
    constructor(ref, name, description, keyboardShortcut) {
        if (!ref || !name) {
            throw new Error("Tool requires a valid reference and name.");
        }

        // TODO: check to see if tool availability can be determined from the api
        // TODO: implement tool shortcut key
        const id = "ps_tool_" + ref;
        super(id, name, CommandTypes.TOOL, description);

        this.ref = ref;
        this.keyboardShortcut = keyboardShortcut;
    }

    /**
     * Execute the tool command.
     */
    async execute() {
        try {
            const target = { _ref: [{ _ref: this.ref }] };
            const command = { _obj: "select", _target: target };

            const result = await app.batchPlay([command], {});

            if (!result || result.length === 0) {
                throw new Error(`Tool activation failed for: ${this.name}`);
            }

            console.log(`Executed tool: ${this.name}`);
        } catch (error) {
            console.error(`Error activating tool "${this.name}":`, error);
        }
    }
}

/**
 * Load tool commands.
 * @returns {Promise.<Array.<Tool>>}
 */
async function loadTools() {
    try {
        const pluginFolder = await fs.getPluginFolder();
        const fileEntry = await pluginFolder.getEntry("data/tools.json");

        if (!fileEntry) {
            throw new Error("tools.json file not found.");
        }

        const fileData = await fileEntry.read({ format: storage.formats.utf8 });

        let toolData;
        try {
            toolData = JSON.parse(fileData);
        } catch (error) {
            throw new Error(`Error parsing tools.json: ${error.message}`);
        }

        if (!Array.isArray(toolData)) {
            throw new Error("Invalid tools.json format: Expected an array.");
        }

        const toolCommands = toolData.map((obj) => {
            const tool = new Tool(
                obj._ref,
                obj.name,
                obj.description,
                obj.keyboardShortcut
            );
            tool.createElement();
            return tool;
        });

        console.log(`Loaded ${toolCommands.length} tool commands.`);
        return toolCommands;
    } catch (error) {
        console.error("Error loading tools:", error);
        return [];
    }
}

module.exports = {
    Tool,
    loadTools,
};
