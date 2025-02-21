const { Command } = require("./Command.js");
const { CommandTypes } = require("../types.js");

/**
 * Create a command palette tool command.
 */
class Tool extends Command {
    /**
     * @param {string} ref Tool batchPlay reference string
     * @param {string} name Tool name
     * @param {string} note Note displayed below tool
     * @param {string} keyboardShortcut Tool keyboard shortcut
     */
    constructor(ref, name, note, keyboardShortcut) {
        if (!ref || !name) {
            throw new Error("Tool requires a valid reference and name.");
        }

        // TODO: check to see if tool availability can be determined from the api
        const id = "ps_tool_" + ref;
        super(id, name, CommandTypes.TOOL, note);

        this.ref = ref;
        this.keyboardShortcut = keyboardShortcut;
    }

    /**
     * Activate the tool.
     * @returns {Promise}
     */
    async execute() {
        const target = { _ref: [{ _ref: this.ref }] };
        const command = { _obj: "select", _target: target };
        return await app.batchPlay([command], {});
    }
}

module.exports = {
    Tool,
};
