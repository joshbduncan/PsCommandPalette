const { app } = require("photoshop");
const { core } = require("photoshop");
const { entrypoints } = require("uxp");

const { alertDialog } = require("./src/dialogs/alert.js");
const { CommandsData } = require("./src/commands/CommandsData.js");
const { CommandPalette } = require("./src/CommandPalette.js");
const { MenuCommand } = require("./src/commands/MenuCommand.js");

// get plugin info
const manifest = require("./manifest.json");
const pluginName = manifest.name;
const pluginVersion = manifest.version;

console.log("loading plugin:", pluginName, `v${pluginVersion}`);

// FIXME: temp user data for testing
const USER_DATA = {};
USER_DATA["startupCommands"] = [1030, 15204, 101];

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
  // load palette commands
  try {
    COMMAND_DATA = new CommandsData();
    await COMMAND_DATA.loadCommands();
    console.log(`loaded ${Object.keys(COMMAND_DATA.commands).length} total commands`);
  } catch (error) {
    // TODO: add alert - https://developer.adobe.com/photoshop/uxp/2022/design/ux-patterns/messaging/
    console.log("load commands error:", error);
  }

  try {
    // open command palette modal
    const palette = new CommandPalette();
    console.log("palette", palette);

    const result = await palette.open();
    console.log("modal result:", result);

    if (result == "reasonCanceled") {
      return;
    }

    const query = result.query;
    const command = result.command;

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
