const { app } = require("photoshop");

const { Command } = require("./Command.js");
const { CommandTypes } = require("../types.js");

/**
 * Create a command palette custom command.
 */
class CustomCommand extends Command {
    /**
     * @param {string} id - Unique command id
     * @param {string} name - Custom command name
     * @param {string} description Custom command description
     * @param {Function} callback Custom command execute function
     */
    constructor(id, name, description, callback) {
        super(id, name, CommandTypes.CUSTOM, description);
        this.callback = callback.bind(this);
    }

    /**
     * Execute the custom command
     * @returns {Promise<void>}
     */
    async execute() {
        if (this.callback) {
            return await this.callback();
        }
    }
}

module.exports = {
    CustomCommand,
};
