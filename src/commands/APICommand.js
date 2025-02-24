const { Command } = require("./Command.js");
const { CommandTypes } = require("../types.js");

/**
 * Create a command palette Photoshop api command.
 */
class APICommand extends Command {
    /**
     * @param {string} id Unique command id
     * @param {string} name Command name
     * @param {string} description Command description displayed below command
     */
    constructor(id, name, description = "") {
        const _id = "ps_api_" + id;
        super(_id, name, CommandTypes.API, description);
    }
}

module.exports = {
    APICommand,
};
