const { app } = require("photoshop");
const { MenuCommand } = require("./menuCommand.js");

class Commands {
  constructor() {
    this.data = [];
  }

  lookup(commandID) {
    let command;
    for (let i = 0; i < this.data.length; i++) {
      const element = this.data[i];
      if (element.id == commandID) {
        command = element;
        break;
      }
    }
    return command;
  }

  async loadCommands() {
    console.log("loading commands...");

    // load menu commands
    console.log("loading menu commands");
    try {
      const menuCommands = await loadMenuCommands();
      this.data.push(...menuCommands);
    } catch (error) {
      console.log("error loading menu commands:", error);
    }

    // TODO: load other command types (built-in, tool, action, script, etc.)
    return this;
  }

  async reloadCommands() {
    console.log("reloading commands");
    Object.keys(this.data).forEach((key) => delete obj[key]);
    this.loadCommands();
  }
}

async function loadMenuCommands() {
  function cleanTitle(title) {
    const arr = title.split(" & ");
    arr.forEach((value, index) => {
      arr[index] = value.replace(/&/g, "");
    });
    return arr.length > 1 ? arr.join(" & ") : arr[0];
  }

  async function getMenuBarItems() {
    const target = { _ref: [{ _property: "menuBarInfo" }, { _ref: "application" }] };
    const command = { _obj: "get", _target: target };
    return await app.batchPlay([command], {});
  }

  function buildMenuCommands(obj, path = []) {
    const results = [];

    if (obj.submenu && Array.isArray(obj.submenu)) {
      for (const submenu of obj.submenu) {
        const title = submenu.title.includes("&")
          ? cleanTitle(submenu.title)
          : submenu.title;
        const newPath = [...path, title];
        results.push(...buildMenuCommands(submenu, newPath));
      }
    }

    if (obj.kind === "item") {
      obj.path = path;
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
  Commands,
};
