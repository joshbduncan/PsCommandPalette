const { core } = require("photoshop");

const { Command } = require("./Command.js");
const { CommandTypes } = require("../types.js");

/**
 * Create a command palette action command.
 */
class ActionCommand extends Command {
    /**
     * @param {Action} action - Action command id
     */
    constructor(action) {
        const id = `ps_action_${action.parent.id}_${action.id}_${action.name.replace(/\s/g, "_")}`;
        const description = `${action.parent.name} > ${action.name}`;
        const commandName = action.name;
        const queryString = `${action.parent.name} ${action.name}`;

        // TODO: not sure about using _id/id in command id since index can change
        // TODO: implement action shortcut key?
        super(id, commandName, CommandTypes.ACTION, description, true, queryString);
        this.play = action.play;
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
    ActionCommand,
};
