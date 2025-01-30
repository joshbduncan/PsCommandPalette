const { app } = require("photoshop");
const { core } = require("photoshop");
const { entrypoints } = require("uxp");

const { alertDialog } = require("./src/dialogs/alert.js");
const { User } = require("./src/User.js");
const { CommandData } = require("./src/commands/CommandData.js");
const { CommandPalette } = require("./src/CommandPalette.js");

// get plugin info
const manifest = require("./manifest.json");
const PLUGIN_NAME = manifest.name;
const PLUGIN_VERSION = manifest.version;

// setup data objects
const USER = new User();
const COMMAND_DATA = new CommandData();

console.log("loading plugin:", PLUGIN_NAME, `v${PLUGIN_VERSION}`);

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
  // load user data
  await USER.load();
  console.log(USER.data);

  // load palette commands
  await COMMAND_DATA.loadCommands();
  console.log(`loaded ${Object.keys(COMMAND_DATA.commands).length} total commands`);

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

    // add result to history
    if (query != "") {
      USER.data.history.push({ query: query, commandID: command.id });
      USER.write();
    }

    // execute selected command
    const execution = await command.execute();
    console.log("execution:", execution);

    if (!execution.available) {
      await alertDialog(
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
