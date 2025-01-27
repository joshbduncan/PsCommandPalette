const { core } = require("photoshop");
const { Command } = require("./command.js");

class MenuCommand extends Command {
  constructor(obj) {
    super(obj.command);

    this.command = obj.command;
    this.title = obj.title;
    this.name = obj.name;
    this.visible = obj.visible;
    this.enabled = obj.enabled;
    this.checked = obj.checked;
    this.menuShortcut = obj.menuShortcut;
    this.path = obj.path;
    this.textContent = this.path.join(" > ");

    this.createElement(this.textContent);
  }

  async getState() {
    console.log("getting command state:", this);
    await core.getMenuCommandState({ commandID: this.command });
    return;
  }

  async execute() {
    console.log("executing menu command:", this);
    return await core.performMenuCommand({ commandID: this.command });
  }
}

module.exports = {
  MenuCommand,
};
