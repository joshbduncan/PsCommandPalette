const { core } = require("photoshop");

const { Command, CommandTypes } = require("./Command.js");

/**
 * Create a command palette action command.
 */
class Action extends Command {
  /**
   * Crete a command palette action command.
   * @param { {_id: number, id: number, index: number, name: string, parent: {_id: number, actions: Array.<Object>, id: number, index: number, name: string, typename: string}, typename: string} } obj Action object returned from `app.actionTree`
   */
  constructor(obj) {
    const id = "ps_action_" + obj.parent.name + "_" + obj.name;

    // TODO: not sure about using _id/id in command id since index can change
    // TODO: implement action shortcut key?
    super(id, obj.name, CommandTypes.ACTION, true);
    this.obj = obj;
    this._id = obj._id;
    this.action_id = obj.id;
    this.parent = obj.parent;
    this.typename = obj.typename;
    this.description = "Action Set: " + obj.parent.name;

    this.createElement(this.name, this.description);
  }

  /**
   * Execute the command.
   */
  async execute() {
    console.log("executing action command:", this);

    const result = await core.executeAsModal(() => this.obj.play());
    console.log("action result:", result);
  }
}

module.exports = {
  Action,
};
