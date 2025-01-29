const { core } = require("photoshop");
const { Command, CommandTypes } = require("./Command.js");

/**
 * Create a command palette menu command.
 */
class MenuCommand extends Command {
  /**
   * Crete a command palette menu command.
   * @param { {command: number, title: string, name: string, visible: boolean, enabled: boolean, checked: boolean, path: Array.<String>, menuShortcut: {"shiftKey": boolean, "commandKey": boolean, "optionKey": boolean, "controlKey": boolean}} } obj Menu command object returned from the `menuBarInfo` property
   */
  constructor(obj) {
    const name = obj.name === "" ? obj.title.replace(/\.\.\.$/g, "") : obj.name;

    super(obj.command, name, CommandTypes.MENU, obj.enabled);

    this.command = obj.command;
    this.title = obj.title;
    this.visible = obj.visible;
    this.checked = obj.checked;
    this.menuShortcut = obj.menuShortcut;
    this.path = obj.path;
    this.description = this.path.join(" > ");

    this.createElement(this.name, this.description);
  }

  /**
   * Check the current menu command state.
   * @returns {Promise.<boolean>}
   */
  async getState() {
    console.log("getting command state:", this);
    await core.getMenuCommandState({ commandID: this.command });
    return;
  }

  /**
   * Execute the menu command using the `performMenuCommand` method.
   * @returns {Promise}
   */
  async execute() {
    console.log("executing menu command:", this);

    // ensure a menu command is still available since
    // sometimes after long periods between app operations
    // ps will report the command is available (e.g. undo and redo)
    const commandState = await core.getMenuCommandState({ commandID: this.id });
    console.log("menu command state:", commandState);
    if (!commandState[0]) {
      await alertDialog(
        "Command Not Available",
        null,
        "Photoshop is reporting that your selected command not available via the API at this time."
      );
      return;
    }

    return await core.performMenuCommand({ commandID: this.command });
  }
}

module.exports = {
  MenuCommand,
};
