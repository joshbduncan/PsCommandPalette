const { app, core } = require("photoshop");

const { Command, CommandTypes } = require("./Command.js");

/**
 * Create a command palette action command.
 */
class Action extends Command {
    /**
     * Crete a command palette action command.
     * @param {object} action Action object returned from `app.actionTree`
     */
    constructor(action) {
        if (!action || !action.name || !action.parent || !action.id) {
            throw new Error("Invalid action object");
        }

        const id =
            "ps_action_" + action.parent.name + "_" + action.name + "_" + action.id;
        const note = "Action Set: " + action.parent.name;

        // TODO: not sure about using _id/id in command id since index can change
        // TODO: implement action shortcut key?
        super(id, action.name, CommandTypes.ACTION, true);

        this.obj = action;
        this._id = action._id;
        this.action_id = action.id;
        this.parent = action.parent;
        this.typename = action.typename;
        this.note = note;
    }

    /**
     * Play the action.
     * @returns {Promise<void>}
     */
    async execute() {
        return core.executeAsModal(() => this.obj.play(), {
            commandName: "Executing Action",
        });
    }
}

/**
 * Load action commands.
 * @returns {Promise<Action[]>}
 */
async function loadActions() {
    const actionSets = await app.actionTree;
    return actionSets.flatMap((set) => set.actions.map((action) => new Action(action)));
}

module.exports = {
    Action,
    loadActions,
};
