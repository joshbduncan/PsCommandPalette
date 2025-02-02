const { app } = require("photoshop");
const { storage } = require("uxp");
const fs = storage.localFileSystem;

const { Command, CommandTypes } = require("./commands/Command.js");
const { ActionCommand } = require("./commands/ActionCommand.js");
const { MenuCommand } = require("./commands/MenuCommand.js");
const { ToolCommand } = require("./commands/ToolCommand.js");

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

  get startupCommands() {
    return this.commands.filter((command) => {
      return USER.data.startupCommands.includes(command.id);
    });
  }

  /**
   * Action Commands
   */
  get ActionCommands() {
    return this.commands.filter((command) => {
      return command.type === CommandTypes.ACTION;
    });
  }

  /**
   * Menu Commands
   */
  get menuCommands() {
    return this.commands.filter((command) => {
      return command.type === CommandTypes.MENU;
    });
  }

  /**
   * Tool Commands
   */
  get toolCommands() {
    return this.commands.filter((command) => {
      return command.type === CommandTypes.TOOL;
    });
  }

  filterByQuery(commands, query, types = [], enabled = true) {
    if (query == "") {
      return [];
    }

    let matches = commands != undefined ? commands : this.commands;

    // filter by types first
    if (types.length > 0) {
      matches = this.commandsByTypes(types);
    }

    // filter enabled or all
    if (enabled) {
      matches = matches.filter((command) => {
        return command.enabled;
      });
    }

    // filter by query
    matches = matches.filter((command) => {
      return command.name.toLowerCase().includes(query.toLowerCase());
    });

    console.log("matching commands:", matches.length);

    return matches;
  }

  // TODO: add getters for other command types

  /**
   * Commands with the type of `type`
   * @param {String} type Command type to match against
   * @returns {Array.<Command>}
   */
  commandsByType(type) {
    return this.commands.filter((command) => {
      return command.type == type;
    });
  }

  /**
   * Command with a type included in `types`.
   * @param {Array.<String>} types Command types to return
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
  async loadCommands() {
    console.log("loading commands...");
    const commands = [];

    // load menu commands
    try {
      const menusCommands = await loadMenuCommands();
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
      console.log("error loading menu commands:", error);
    }

    this.commands = commands;
  }
}

/**
 * Load Photoshop menu items from the `menuBarInfo` property.
 * @returns {Promise.<Array.<MenuCommand>>}
 */
async function loadMenuCommands() {
  console.log("loading menu commands");
  const menusToIgnore = ["Open Recent"];
  const menuItemsToIgnore = [];

  /**
   * Remove nagging "&" characters that are returned from the `menuBarInfo` property.
   * @param {string} title Command title returned from the api
   * @returns {string}
   */
  function cleanTitle(title) {
    if (!title.includes("&")) {
      return title;
    }
    const arr = title.split(" & ");
    arr.forEach((value, index) => {
      arr[index] = value.replace(/&/g, "");
    });
    return arr.length > 1 ? arr.join(" & ") : arr[0];
  }

  /**
   * Get all current Photoshop menu commands via batchPlay and the `menuBarInfo` property.
   * @returns {Promise.<object>}
   */
  async function getMenuBarItems() {
    const target = { _ref: [{ _property: "menuBarInfo" }, { _ref: "application" }] };
    const command = { _obj: "get", _target: target };
    return await app.batchPlay([command], {});
  }

  /**
   * Build `MenuCommand` objects for each Photoshop menu command.
   * @param {object} obj Menu bar info object
   * @param {Array.<String>} path Current menu directory path to `obj`
   * @returns {Array.<MenuCommand>}
   */
  function buildMenuCommands(obj, path = []) {
    const results = [];

    if (obj.submenu && Array.isArray(obj.submenu)) {
      for (const submenu of obj.submenu) {
        // filter out entire menus known not to work
        if (menusToIgnore.includes(submenu.title)) continue;

        // filter out menu commands known not to work
        if (menuItemsToIgnore.includes(submenu.title)) continue;

        const newPath = [...path, cleanTitle(submenu.title)];
        results.push(...buildMenuCommands(submenu, newPath));
      }
    }

    if (obj.kind === "item") {
      obj.path = path;
      obj.title = cleanTitle(obj.title);
      if (obj.name === "") {
        obj.name = obj.title;
      }
      let command = new MenuCommand(obj);
      results.push(command);
    }

    return results;
  }

  const menuBarItems = await getMenuBarItems();
  const menuCommands = buildMenuCommands(menuBarItems[0].menuBarInfo);
  console.log(`loaded ${menuCommands.length} menu commands`);
  return menuCommands;
}

/**
 * Load Photoshop tools from `tools.json`.
 * @returns {Promise.<Array.<ToolCommand>>}
 */
async function loadTools() {
  const pluginFolder = await fs.getPluginFolder();
  console.log("loading tool json data:", pluginFolder.nativePath);

  const toolCommands = [];
  try {
    const f = await pluginFolder.getEntry("data/tools.json");
    const fileData = await f.read({ format: storage.formats.utf8 });
    const toolData = JSON.parse(fileData);
    console.log("tool data file loaded:", toolData);

    toolData.forEach((obj) => {
      let tool = new ToolCommand(
        obj._ref,
        obj.name,
        obj.description,
        obj.keyboardShortcut
      );
      toolCommands.push(tool);
    });
  } catch (error) {
    console.log("error getting tool json data");
    console.log(error);
  }

  console.log(`loaded ${toolCommands.length} tool commands`);
  return toolCommands;
}

/**
 * Load Photoshop tools from `tools.json`.
 * @returns {Promise.<Array.<ToolCommand>>}
 */
async function loadActions() {
  console.log("loading action data");

  const actionSets = await app.actionTree;
  const actionCommands = [];

  const ActionCommands = [];
  actionSets.forEach((set) => {
    set.actions.forEach((obj) => {
      let action = new ActionCommand(obj);
      actionCommands.push(action);
    });
  });

  console.log(`loaded ${actionCommands.length} action commands`);
  return actionCommands;
}

module.exports = {
  Data: Data,
};
