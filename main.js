const { entrypoints } = require("uxp");

const { Commands } = require("./src/commands/commands.js");
const { CommandPalette } = require("./src/commandPalette/palette.js");

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

    // execute selected command
    const execution = await command.execute();
    console.log("execution:", execution);
  } catch (error) {
    console.log("palette error:", error);
  }
}
