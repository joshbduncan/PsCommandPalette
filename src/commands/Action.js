const { app, core } = require("photoshop");

const { Command, CommandTypes } = require("./Command.js");

/**
 * Create a command palette action command.
 */
class Action extends Command {
    /**
     * Crete a command palette action command.
     * @param {object} obj Action object returned from `app.actionTree`
     */
    constructor(obj) {
        if (!obj || !obj.name || !obj.parent || !obj.id) {
            throw new Error("Invalid action object");
        }

        const id = "ps_action_" + obj.parent.name + "_" + obj.name;
        const description = "Action Set: " + obj.parent.name;

        // TODO: not sure about using _id/id in command id since index can change
        // TODO: implement action shortcut key?
        super(id, obj.name, CommandTypes.ACTION, true);

        this.obj = obj;
        this._id = obj._id;
        this.action_id = obj.id;
        this.parent = obj.parent;
        this.typename = obj.typename;
        this.description = description;
    }

    /**
     * Execute the command.
     */
    async execute() {
        try {
            const result = await core.executeAsModal(() => this.obj.play());
            console.log(`Executed action: ${this.id}`, result);
        } catch (error) {
            console.error(`Error executing action ${this.id}:`, error);
        }
    }
}

/**
 * Load action commands.
 * @returns {Promise.<Array.<Tool>>}
 */
async function loadActions() {
    try {
        const actionSets = await app.actionTree;
        const actionCommands = [];

        actionSets.forEach((set) => {
            set.actions.forEach((obj) => {
                try {
                    const action = new Action(obj);
                    actionCommands.push(action);
                } catch (error) {
                    console.warn(`Skipping invalid action:`, obj, error);
                }
            });
        });

        console.log(`Loaded ${actionCommands.length} action commands`);
        return actionCommands;
    } catch (error) {
        console.error("Error loading actions:", error);
        return [];
    }
}

module.exports = {
    Action,
    loadActions,
};
