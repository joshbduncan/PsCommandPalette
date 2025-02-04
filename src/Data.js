const { app } = require("photoshop");
const { storage } = require("uxp");
const fs = storage.localFileSystem;

const { Command, CommandTypes } = require("./commands/Command.js");
const { Action } = require("./commands/Action.js");
const { Menu, menuCommandsPatchShortcutKey } = require("./commands/Menu.js");
const { Tool } = require("./commands/Tool.js");
const { cleanTitle } = require("./utils.js");

/**
 * Ps Command Palette Commands Data.
 */
class Data {
  /**
   * Create a CommandData object.
   */
  constructor() {
    this.commands = [];
  }

  /**
   * Enabled commands.
   */
  get enabledCommands() {
    return this.commands.filter((command) => {
      return command.enabled;
    });
  }

  /**
   * Disabled commands.
   */
  get disabledCommands() {
    return this.commands.filter((command) => {
      return !command.enabled;
    });
  }

  /**
   * User Selected Startup commands.
   */
  get startupCommands() {
    return this.commands.filter((command) => {
      return USER.data.startupCommands.includes(command.id);
    });
  }

  /**
   * Action Commands.
   */
  get Actions() {
    return this.commands.filter((command) => {
      return command.type === CommandTypes.ACTION;
    });
  }

  /**
   * Menu Commands.
   */
  get menuCommands() {
    return this.commands.filter((command) => {
      return command.type === CommandTypes.MENU;
    });
  }

  /**
   * Tool Commands.
   */
  get toolCommands() {
    return this.commands.filter((command) => {
      return command.type === CommandTypes.TOOL;
    });
  }

  /**
   *
   * @param {Array.<Command>} commands Commands to filer
   * @param {string} query Query string
   * @param {Array.<CommandTypes>} types Command type to filter for
   * @param {boolean} disabled Should disabled commands be included (defaults to false)
   * @param {boolean} hidden Should user hidden commands be included (defaults to false)
   * @returns {Array.<Command>}
   */
  filterByQuery(commands, query, types = [], disabled = false, hidden = false) {
    if (query == "") {
      return [];
    }

    let matches = commands != undefined ? commands : this.commands;

    // filter by types first
    if (types.length > 0) {
      matches = this.commandsByTypes(types);
    }

    // filter disabled commands
    if (!disabled) {
      matches = matches.filter((command) => {
        return command.enabled;
      });
    }

    // filter hidden commands
    if (!hidden && USER.data.hasOwnProperty("hiddenCommands")) {
      matches = matches.filter((command) => {
        return !USER.data.hiddenCommands.includes(command.id);
      });
    }

    // filter by query
    matches = matches.filter((command) => {
      return command.name.toLowerCase().includes(query.toLowerCase());
    });

    return matches;
  }

  // TODO: add getters for other command types

  /**
   * Commands with the type of `type`
   * @param {string} type Command type to match against
   * @returns {Array.<Command>}
   */
  commandsByType(type) {
    return this.commands.filter((command) => {
      return command.type == type;
    });
  }

  /**
   * Command with a type included in `types`.
   * @param {Array.<string>} types Command types to return
   * @returns {Array.<Command>}
   */
  commandsByTypes(types) {
    return this.command.filter((command) => {
      return types.includes(command.types);
    });
  }

  /**
   * Lookup a command by id.
   * @param {string|number} commandID ID of the command to lookup
   * @returns {Command}
   */
  lookupById(commandID) {
    let command;
    for (let i = 0; i < this.commands.length; i++) {
      const element = this.commands[i];
      if (element.id == commandID) {
        command = element;
        break;
      }
    }
    return command;
  }

  /**
   * Load all commands types into the commands set.
   */
  async load() {
    console.log("loading commands...");
    const commands = [];

    // load menu commands
    try {
      const menusCommands = await loadMenus();
      commands.push(...menusCommands);
    } catch (error) {
      console.log("error loading menu commands:", error);
    }

    // load tool commands
    try {
      const toolComands = await loadTools();
      commands.push(...toolComands);
    } catch (error) {
      console.log("error loading tools:", error);
    }

    // load action commands
    try {
      const actionCommands = await loadActions();
      commands.push(...actionCommands);
    } catch (error) {
      console.log("error loading action:", error);
    }

    this.commands = commands;
  }

  /**
   * Reload all command data.
   */
  async reload() {
    this.commands = {};
    this.load();
  }
}

/**
 * Load Photoshop menu items from the `menuBarInfo` property.
 * @returns {Promise.<Array.<Menu>>}
 */
async function loadMenus() {
  const menusToIgnore = ["Open Recent"];
  const menuItemsToIgnore = [];

  /**
   * Get all current Photoshop menu commands via batchPlay and the `menuBarInfo` property.
   * @returns {Promise.<object>}
   */
  async function getMenuBarItems() {
    const target = { _ref: [{ _property: "menuBarInfo" }, { _ref: "application" }] };
    const command = { _obj: "get", _target: target };

    // TODO: add batchPlay execution error checking https://developer.adobe.com/photoshop/uxp/2022/ps_reference/media/batchplay/#action-references
    return await app.batchPlay([command], {});
  }

  /**
   * Build `Menu` objects for each Photoshop menu command.
   * @param {object} obj Menu bar info object
   * @param {Array.<string>} path Current menu directory path to `obj`
   * @returns {Array.<Menu>}
   */
  function buildMenus(obj, path = []) {
    const results = [];

    if (obj.submenu && Array.isArray(obj.submenu)) {
      for (const submenu of obj.submenu) {
        // filter out entire menus known not to work
        if (menusToIgnore.includes(submenu.title)) continue;

        // filter out menu commands known not to work
        if (menuItemsToIgnore.includes(submenu.title)) continue;

        const newPath = [...path, cleanTitle(submenu.title)];
        results.push(...buildMenus(submenu, newPath));
      }
    }

    // set name to title when missing
    if (obj.kind === "item") {
      obj.path = path;
      obj.title = cleanTitle(obj.title);
      if (obj.name === "") {
        obj.name = obj.title;
      }

      // add key combination to commands available in tool bar
      if (obj.command in menuCommandsPatchShortcutKey) {
        obj.menuShortcut = menuCommandsPatchShortcutKey[obj.command];
      }

      let command = new Menu(obj);
      results.push(command);
    }

    return results;
  }

  const menuBarItems = await getMenuBarItems();
  const menuCommands = buildMenus(menuBarItems[0].menuBarInfo);
  console.log(`loaded ${menuCommands.length} menu commands`);
  return menuCommands;
}

/**
 * Load Photoshop tools from `tools.json`.
 * @returns {Promise.<Array.<Tool>>}
 */
async function loadTools() {
  const pluginFolder = await fs.getPluginFolder();

  const toolCommands = [];
  try {
    const f = await pluginFolder.getEntry("data/tools.json");
    const fileData = await f.read({ format: storage.formats.utf8 });
    const toolData = JSON.parse(fileData);
    toolData.forEach((obj) => {
      let tool = new Tool(obj._ref, obj.name, obj.description, obj.keyboardShortcut);
      toolCommands.push(tool);
    });
  } catch (error) {
    console.log("error getting tool json data:", error);
  }

  console.log(`loaded ${toolCommands.length} tool commands`);
  return toolCommands;
}

/**
 * Load Photoshop tools from `tools.json`.
 * @returns {Promise.<Array.<Tool>>}
 */
async function loadActions() {
  const actionSets = await app.actionTree;
  const actionCommands = [];
  actionSets.forEach((set) => {
    set.actions.forEach((obj) => {
      let action = new Action(obj);
      actionCommands.push(action);
    });
  });

  console.log(`loaded ${actionCommands.length} action commands`);
  return actionCommands;
}

module.exports = {
  Data,
};
