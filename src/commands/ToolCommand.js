const { core } = require("photoshop");

const { Command, CommandTypes } = require("./Command.js");

/**
 * Create a command palette tool command.
 */
class ToolCommand extends Command {
  /**
   * Create a command palette tool command.
   * @param {string} _ref Tool batchPlay reference string
   * @param {string} name Tool name
   * @param {string} description Tool description
   * @param {string} keyboardShortcut Tool keyboard shortcut
   */
  constructor(_ref, name, description, keyboardShortcut) {
    const id = "ps_tool_" + _ref;

    // TODO: check to see if tool availability can be determined from the api
    // TODO: implement tool shortcut key
    super(id, name, CommandTypes.TOOL, true);
    this._ref = _ref;
    this.description = description;
    this.keyboardShortcut = keyboardShortcut;

    this.createElement(this.name, this.description);
  }

  async execute() {
    console.log("executing tool command:", this);

    const target = { _ref: [{ _ref: this._ref }] };
    const command = { _obj: "select", _target: target };
    const result = await app.batchPlay([command], {});

    // TODO: add batchplay execution error checking
  }
}

module.exports = {
  ToolCommand,
};
