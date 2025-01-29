const { app } = require("photoshop");
const { core } = require("photoshop");
const { entrypoints } = require("uxp");

const { alertDialog } = require("./src/dialogs/alert.js");
const { CommandsModel } = require("./src/commands/CommandsModel.js");
const { CommandPalette } = require("./src/CommandPalette.js");
const { MenuCommand } = require("./src/commands/MenuCommand.js");

console.log("loading plugin: ps-command-palette plugin");

// FIXME: temp user data for testing
const userData = {
  startupCommands: [1030, 15204, 101],
};

entrypoints.setup({
  commands: {
    launchPalette: () => launchPalette(),
    reloadPlugin: () => reloadPlugin(),
  },
});

reloadPlugin = () => {
  console.log("reloading ps-command-palette");
  window.location.reload();
};

async function launchPalette() {
  let commands;

  // load palette commands
  try {
    commands = new CommandsModel();
    await commands.loadCommands();
    console.log(`loaded ${Object.keys(commands.commands).length} total commands`);
  } catch (error) {
    // TODO: add alert - https://developer.adobe.com/photoshop/uxp/2022/design/ux-patterns/messaging/
    console.log("load commands error:", error);
  }

  try {
    // open command palette modal
    const palette = new CommandPalette(commands);
    console.log("palette", palette);

    const result = await palette.open();
    console.log("modal result:", result);

    if (result == "reasonCanceled") {
      return;
    }

    const query = result.query;
    const command = result.command;

    // ensure a menu command is still available since
    // sometimes after long periods between app operations
    // ps will report the command is available (e.g. undo and redo)
    if (command instanceof MenuCommand) {
      const commandState = await core.getMenuCommandState({ commandID: command.id });
      console.log("menu command state:", commandState);
      if (!commandState[0]) {
        await alertDialog(
          "Command Not Available",
          null,
          "Photoshop is reporting that your selected command not available at this time."
        );
        return;
      }
    }

    // execute selected command
    const execution = await command.execute();
    console.log("execution:", execution);

    if (!execution.available) {
      const z = await alertDialog(
        "Command Execution Error",
        null,
        "There was an error executing your command."
      );
    }
  } catch (error) {
    // TODO: add alert - https://developer.adobe.com/photoshop/uxp/2022/design/ux-patterns/messaging/
    console.log("palette error:", error);
  }
}
