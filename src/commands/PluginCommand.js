const { Command } = require("./Command.js");
const { CommandTypes } = require("../types.js");

/**
 * Create a command palette plugin command.
 */
class PluginCommand extends Command {
    /**
     * @param {string} id Unique command id
     * @param {string} name Command name
     * @param {string} description Command description displayed below command
     */
    constructor(id, name, description = "") {
        const _id = "ps_plugin_" + id;
        super(_id, name, CommandTypes.PLUGIN, description);
    }
}

module.exports = {
    PluginCommand,
};
