const { app, core } = require("photoshop");
const os = require("os");
const uxp = require("uxp");
const { entrypoints } = uxp;

const manifest = require("./manifest.json");
const { CommandPalette } = require("./src/CommandPalette.js");
const { User } = require("./src/User.js");
const { Data } = require("./src/Data.js");

/////////////////////
// get plugin info //
/////////////////////
const PLUGIN_NAME = manifest.name;
const PLUGIN_VERSION = manifest.version;
const PLUGIN_AUTHOR = manifest.author;
const HOST_NAME = uxp.host.name;
const HOST_VERSION = uxp.host.version;
const HOST_LOCALE = uxp.host.uiLocale;
const HOST_OS = os.platform();
console.log("loading plugin:", PLUGIN_NAME, `v${PLUGIN_VERSION}`);

/////////////////////////
// create data objects //
/////////////////////////
const USER = new User();
USER.load();
const DATA = new Data();

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

async function launchPalette() {
  await DATA.load();

  try {
    // open command palette modal
    const palette = new CommandPalette();
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
      USER.data.history.unshift({
        query: query,
        commandID: command.id,
        timestamp: Date.now(),
      });
      USER.write();
    }

    // execute selected command
    await command.execute();
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
  await USER.reload();
  await DATA.reload();
  window.location.reload();
}
