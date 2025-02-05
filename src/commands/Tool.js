const { core } = require("photoshop");
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
        const id = "ps_tool_" + ref;

        // TODO: check to see if tool availability can be determined from the api
        // TODO: implement tool shortcut key
        super(id, name, CommandTypes.TOOL, description);
        this.ref = ref;
        this.keyboardShortcut = keyboardShortcut;

        this.createElement(this.name, this.description);
    }

    /**
     * Execute the tool command.
     */
    async execute() {
        const target = { _ref: [{ _ref: this.ref }] };
        const command = { _obj: "select", _target: target };
        // TODO: add batchPlay execution error checking https://developer.adobe.com/photoshop/uxp/2022/ps_reference/media/batchplay/#action-references
        const result = await app.batchPlay([command], {});
    }
}

/**
 * Load Photoshop tools from `tools.json`.
 * @returns {Promise.<Array.<Tool>>}
 */
async function loadTools() {
    const pluginFolder = await fs.getPluginFolder();

    const toolCommands = [];
    try {
        const f = await pluginFolder.getEntry("data/tools.json");
        const fileData = await f.read({ format: storage.formats.utf8 });
        const toolData = JSON.parse(fileData);
        toolData.forEach((obj) => {
            let tool = new Tool(
                obj._ref,
                obj.name,
                obj.description,
                obj.keyboardShortcut
            );
            toolCommands.push(tool);
        });
    } catch (error) {
        console.log("error getting tool json data:", error);
    }

    console.log(`loaded ${toolCommands.length} tool commands`);
    return toolCommands;
}

module.exports = {
    Tool,
    loadTools,
};
