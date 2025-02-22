const { core } = require("photoshop");

const { Command } = require("./Command.js");
const { CommandTypes } = require("../types.js");

/**
 * Create a command palette action command.
 */
class Action extends Command {
    /**
     * @param {string} id Action command id
     * @param {string} name Action name
     * @param {string} note Action note
     * @param {function} playFunc Action play function
     */
    constructor(id, name, note, playFunction) {
        // TODO: not sure about using _id/id in command id since index can change
        // TODO: implement action shortcut key?
        super(id, name, CommandTypes.ACTION, note);
        this.play = playFunction;
    }

    /**
     * Play the action.
     * @returns {Promise<void>}
     */
    async execute() {
        return core.executeAsModal(() => this.play(), {
            commandName: "Executing Action",
        });
    }
}

module.exports = {
    Action,
};
