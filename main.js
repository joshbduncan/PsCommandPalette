const { app } = require("photoshop");
const { core } = require("photoshop");
const uxp = require("uxp");
const { entrypoints } = uxp;

const { alertDialog } = require("./src/dialogs/alert.js");
const { User } = require("./src/User.js");
const { CommandData } = require("./src/commands/CommandData.js");
const { CommandPalette } = require("./src/CommandPalette.js");

/////////////////////
// get plugin info //
/////////////////////
const manifest = require("./manifest.json");
const PLUGIN_NAME = manifest.name;
const PLUGIN_VERSION = manifest.version;
const PLUGIN_AUTHOR = manifest.author;
const HOST_NAME = uxp.host.name;
const HOST_VERSION = uxp.host.version;
console.log("loading plugin:", PLUGIN_NAME, `v${PLUGIN_VERSION}`);

/////////////////////////
// create data objects //
/////////////////////////
const USER = new User();
const COMMAND_DATA = new CommandData();

entrypoints.setup({
  commands: {
    launchPalette: () => launchPalette(),
    reloadPlugin: () => reloadPlugin(),
  },
  panels: {
    ps_command_palette: {
      show() {
        // put any initialization code for your plugin here.
      },
      menuItems: [
        { id: "launchPalette", label: "Open Command Palette" },
        { id: "reloadPlugin", label: "Reload Plugin" },
      ],
      invokeMenu(id) {
        switch (id) {
          case "launchPalette":
            launchPalette();
            break;
          case "reloadPlugin":
            reloadPlugin();
            break;
        }
      },
    },
  },
});

/////////////////////////
// add main panel info //
/////////////////////////
const year = new Date().getFullYear();
document.getElementById(
  "main-copyright"
).textContent = `Copyright ${year} ${PLUGIN_AUTHOR}`;

document.getElementById(
  "main-plugin-info"
).textContent = `Plugin Version ${PLUGIN_VERSION}`;

////////////////////////////////////
// add main panel event listeners //
////////////////////////////////////

document
  .getElementById("btnOpenCommandPalette")
  .addEventListener("click", launchPalette);

document.getElementById("btnReloadPlugin").addEventListener("click", reloadPlugin);

///////////////////////
// command functions //
///////////////////////

async function loadUserData() {
  // load user data
  try {
    await USER.load();
    console.log(USER.data);
  } catch (error) {
    console.log(error);
  }
}

async function loadCommandData() {
  try {
    // load palette commands
    await COMMAND_DATA.loadCommands();
    console.log(`loaded ${Object.keys(COMMAND_DATA.commands).length} total commands`);
  } catch (error) {
    console.log(error);
  }
}

async function loadData() {
  await loadUserData();
  await loadCommandData();
}

async function launchPalette() {
  await loadData();
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
    // TODO: create function for this
    if (query != "") {
      USER.data.history.unshift({ query: query, commandID: command.id });
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

/**
 * Reload the plugin.
 */
async function reloadPlugin() {
  console.log("reloading ps-command-palette");
  await loadData();
  window.location.reload();
}
