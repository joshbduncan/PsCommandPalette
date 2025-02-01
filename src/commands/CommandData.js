const { app } = require("photoshop");
const { MenuCommand } = require("./MenuCommand.js");
const { Command } = require("./Command.js");

/**
 * Ps Command Palette Commands Data.
 */
class CommandData {
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
   * Menu Commands
   */
  get menuCommands() {
    return this.commands.filter((command) => {
      return command.type === "menu";
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
    console.log("loading menu commands");
    try {
      const menuCommands = await loadMenuCommands();
      commands.push(...menuCommands);
    } catch (error) {
      console.log("error loading menu commands:", error);
    }

    this.commands = commands;
  }
}

/**
 * Load all current menu commands via batchPlay and the `menuBarInfo` property.
 * @returns {Promise.<Array.<Command>>}
 */
async function loadMenuCommands() {
  const menusToIgnore = ["Open Recent"];
  const menuItemsToIgnore = [];

  /**
   * Remove naggy "&" characters that are returned from the `menuBarInfo` property.
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

module.exports = {
  CommandData: CommandData,
};
