const { core } = require("photoshop");

const { Command, CommandTypes } = require("./Command.js");

/**
 * Create a command palette menu command.
 */
class Menu extends Command {
  /**
   * Crete a command palette menu command.
   * @param { {command: number, title: string, name: string, visible: boolean, enabled: boolean, checked: boolean, path: Array.<string>, menuShortcut: {"shiftKey": boolean, "commandKey": boolean, "optionKey": boolean, "controlKey": boolean}} } obj Menu command object returned from the `menuBarInfo` property
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

  /**
   * Generate a keyboard shortcut combination string.
   * @param { {"shiftKey": Boolean, "commandKey": Boolean, "optionKey": Boolean, "controlKey": Boolean, "keyChar": string} } obj Menu command keyboard shortcut object returned from the `menuBarInfo` property.
   * @returns string
   */
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
    await core.getMenuState({ commandID: this.command });
    return;
  }

  /**
   * Execute the menu command using the `performMenu` method.
   * @returns {Promise}
   */
  async execute() {
    console.log("executing menu command:", this);

    // ensure a menu command is still available since
    // sometimes after long periods between app operations
    // ps will report the command is available (e.g. undo and redo)
    const commandState = await core.getMenuState({ commandID: this.command });
    console.log("menu command state:", commandState);
    if (!commandState[0]) {
      await alertDialog(
        "Command Not Available",
        null,
        "Photoshop is reporting that your selected command not available via the API at this time."
      );
      return;
    }

    try {
      const result = await core.performMenu({ commandID: this.command });

      if (!result.available) {
        await alertDialog(
          "Command Execution Error",
          null,
          "There was an error executing your command."
        );
      }
    } catch (error) {
      console.log("menu command execution error");
      console.log(error);
    }
  }
}

const menuCommandsPatchShortcutKey = {
  5069: {
    // Edit in Quick Mask Mode
    shiftKey: false,
    commandKey: false,
    optionKey: false,
    controlKey: false,
    keyChar: "Q",
  },
  5991: {
    // Standard Screen Mode
    shiftKey: false,
    commandKey: false,
    optionKey: false,
    controlKey: false,
    keyChar: "F",
  },
  5992: {
    // Full Screen Mode With Menu Bar
    shiftKey: false,
    commandKey: false,
    optionKey: false,
    controlKey: false,
    keyChar: "F",
  },
  5993: {
    // Full Screen Mode
    shiftKey: false,
    commandKey: false,
    optionKey: false,
    controlKey: false,
    keyChar: "F",
  },
};

module.exports = {
  Menu,
  menuCommandsPatchShortcutKey,
};
