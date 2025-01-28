const { app } = require("photoshop");
const { core } = require("photoshop");
const { entrypoints } = require("uxp");

const { alertDialog } = require("./src/dialogs/alert.js");
const { Commands } = require("./src/commands/commands.js");
const { CommandPalette } = require("./src/commandPalette/palette.js");
const { MenuCommand } = require("./src/commands/menuCommand.js");

console.log("loading ps-command-palette");

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
  console.log("launching palette");

  // load palette commands
  const commands = new Commands();
  await commands.loadCommands();
  console.log(`loaded ${Object.keys(commands.data).length} total commands`);

  try {
    // open command palette modal
    let palette = new CommandPalette(commands);
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
