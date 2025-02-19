const { app, core } = require("photoshop");
const os = require("os");
const uxp = require("uxp");
const { entrypoints, shell, storage } = uxp;
const fs = storage.localFileSystem;

const manifest = require("./manifest.json");
const { CommandPalette } = require("./palettes/CommandPalette.js");
const { User } = require("./user/User.js");
const { History } = require("./user/History.js");
const { Data } = require("./commands/Data.js");
const { about } = require("./commands/Builtin.js");

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

/////////////////////////
// create data objects //
/////////////////////////
const USER = new User();
const HISTORY = new History();
const DATA = new Data();

// TODO: localize menus here and in manifest - https://developer.adobe.com/photoshop/uxp/2021/guides/uxp_guide/uxp-misc/manifest-v4/#menu-localization
entrypoints.setup({
    plugin: {
        create() {
            console.log(`Loading plugin: ${PLUGIN_NAME} v${PLUGIN_VERSION}`);

            ////////////////////
            // load user data //
            ////////////////////
            USER.load();
            HISTORY.load();
        },
    },
    panels: {
        ps_command_palette: {
            create() {
                /////////////////////////
                // add main panel info //
                /////////////////////////
                const year = new Date().getFullYear();
                document.getElementById("main-copyright").innerHTML =
                    `Copyright &copy; ${year} ${PLUGIN_AUTHOR}`;

                document.getElementById("main-plugin-info").textContent =
                    `Plugin Version v${PLUGIN_VERSION}`;

                ////////////////////////////////////
                // add main panel event listeners //
                ////////////////////////////////////

                document
                    .getElementById("btnOpenCommandPalette")
                    .addEventListener("click", launchPalette);
            },
            menuItems: [
                { id: "about", label: "About" },
                { id: "reloadPlugin", label: "Reload Plugin" },
                { id: "pluginData", label: "Plugin Data" },
                { id: "clearHistory", label: "Clear History" },
            ],
            invokeMenu(id) {
                switch (id) {
                    case "about":
                        about();
                        break;
                    case "reloadPlugin":
                        reloadPlugin();
                        break;
                    case "pluginData":
                        pluginData();
                        break;
                    case "clearHistory":
                        clearHistory();
                        break;
                }
            },
        },
    },
    commands: {
        launchPalette: () => launchPalette(),
    },
});

/////////////////////
// plugin commands //
/////////////////////

async function reloadPlugin() {
    try {
        console.log("Reloading plugin:", PLUGIN_NAME, `v${PLUGIN_VERSION}`);
        await USER.reload();
        await HISTORY.reload();
        await DATA.reload();
        app.showAlert("Plugin reloaded");
    } catch (error) {
        console.error(error);
    }
}

async function pluginData() {
    try {
        const dataFolder = await fs.getDataFolder();
        await shell.openPath(dataFolder.nativePath);
    } catch (error) {
        console.error(error);
    }
}

async function clearHistory() {
    try {
        console.log("Clearing user history");
        await HISTORY.clear();
    } catch (error) {
        console.log(error);
    }
}

async function launchPalette() {
    const start = performance.now();
    await DATA.reload();
    const end = performance.now();
    console.log(`Data.load() execution time: ${(end - start).toFixed(3)} ms`);

    const palette = new CommandPalette();
    const result = await palette.open();
    console.log("Modal result:", result);

    if (result === "reasonCanceled" || !result) return;

    const { query, command } = result;
    if (!command) {
        console.error("No command selected.");
        return;
    }

    // to allow for external user data file editing, don't write
    // user data when "Reload Plugin Data" command is executed
    if (command.id !== "ps_builtin_reload") {
        HISTORY.add(query, command.id);
        USER.write();
    }

    try {
        await command.execute();
    } catch (error) {
        console.error(error);
    }
}
