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
    const id = "ps_menu_" + obj.command.toString();

    super(id, name, CommandTypes.MENU, obj.enabled);

    this.command = obj.command;
    this.title = obj.title;
    this.visible = obj.visible;
    this.checked = obj.checked;
    this.menuShortcut = obj.menuShortcut;
    this.keyboardShortcut = "";
    this.path = obj.path;
    this.description = this.path.join(" > ");

    if (this.menuShortcut.hasOwnProperty("keyChar")) {
      this.keyboardShortcut = this.generateKeyboardShortcut(this.menuShortcut);
    }

    this.createElement(this.name, this.description);
  }

  generateKeyboardShortcut(obj) {
    // Control (⌃), Option (⌥), Shift (⇧) Command (⌘)
    // TODO: may need to use escape symbols (see https://brettterpstra.com/2019/04/19/creating-shortcuts-for-mac-symbols-in-html/)
    // TODO: correct order to match adobe ordering (see https://helpx.adobe.com/photoshop/using/default-keyboard-shortcuts.html)
    let shortcut = "";
    if (obj.controlKey) {
      shortcut += "⌃";
    }
    if (obj.optionKey) {
      shortcut += "⌥";
    }
    if (obj.shiftKey) {
      shortcut += "⇧";
    }
    if (obj.commandKey) {
      shortcut += "⌘";
    }

    return shortcut + obj.keyChar;
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
    const commandState = await core.getMenuCommandState({ commandID: this.command });
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
