const { core } = require("photoshop");

const { Command, CommandTypes } = require("./Command.js");
const { cleanTitle, generateKeyboardShortcut } = require("../utils.js");

/**
 * Create a command palette menu command.
 */
class Menu extends Command {
  /**
   * Crete a command palette menu command.
   * @param {object} obj Menu command object returned from the `menuBarInfo` property
   */
  constructor(obj) {
    let name = obj.name;
    if (obj.name === "") {
      name = cleanTitle(obj.title.replace(/\.\.\.$/g, ""));
    }
    const id = "ps_menu_" + obj.command.toString();

    super(id, name, CommandTypes.MENU, obj.enabled);

    this.obj = obj;
    this.commandID = obj.command;
    this.visible = obj.visible;
    this.checked = obj.checked;
    this.keyboardShortcut = "";
    this.description = obj.path.join(" > ");

    if (obj.menuShortcut.hasOwnProperty("keyChar")) {
      this.keyboardShortcut = generateKeyboardShortcut(obj.menuShortcut);
    }

    this.createElement(this.name, this.description);
  }

  /**
   * Get the current command title (some titles change based on current context/app state).
   * @returns {Promise.<boolean>}
   */
  async getTitle() {
    return await core.getMenuCommandTitle({ commandID: this.commandID });
  }

  /**
   * Update the title of the command <li> element.
   */
  async updateTitle() {
    const updatedTitle = await this.getTitle();
    this.element.querySelector(".title").textContent(updatedTitle);
  }

  /**
   * Check the current menu command state.
   * @returns {Promise.<boolean>}
   */
  async getState() {
    return core.getMenuCommandState({ commandID: this.commandID });
  }

  /**
   * Update the state of the command <li> element.
   * @returns {Element} Updated command <li> element
   */
  async updateState() {
    const updatedTitle = await this.getTitle();
    // TODO: update enabled state with a css class
  }

  /**
   * Execute the menu command using the `performMenu` method.
   */
  async execute() {
    // ensure a menu command is still available since
    // sometimes after long periods between app operations
    // ps will report the command is available (e.g. undo and redo)
    const commandState = await core.getMenuCommandState({ commandID: this.commandID });
    if (!commandState[0]) {
      await alertDialog(
        "Command Not Available",
        null,
        "Photoshop is reporting that your selected command not available via the API at this time."
      );
      return;
    }

    try {
      const result = await core.performMenuCommand({ commandID: this.commandID });

      if (!result.available) {
        await alertDialog(
          "Command Execution Error",
          null,
          "There was an error executing your command."
        );
      }
    } catch (error) {
      console.log("menu command execution error:", error);
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
