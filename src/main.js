const os = require("os");

const { app } = require("photoshop");
const uxp = require("uxp");

const { entrypoints, shell, storage } = uxp;
const fs = storage.localFileSystem;

const manifest = require("./manifest.json");
const { CommandPalette } = require("./palettes/CommandPalette.js");
const { History } = require("./user/History.js");
const { User } = require("./user/User.js");
const { about } = require("./commands/Builtin.js");
const { filterByIds } = require("./utils/query.js");
const { loadCommands } = require("./utils/load.js");

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
let COMMANDS = [];

// TODO: localize menus here and in manifest - https://developer.adobe.com/photoshop/uxp/2022/guides/uxp_guide/uxp-misc/manifest-v4/#menu-localization
entrypoints.setup({
    plugin: {
        create() {
            console.log(`loading plugin ${PLUGIN_NAME} v${PLUGIN_VERSION}`);

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
            // TODO: add settings as menu items - https://www.youtube.com/watch?v=v-x1ZrOtlzQ&list=PLRR5kmVeh43alNtSKHUlmbBjLqezgwzPJ&index=12
            menuItems: [
                {
                    id: "about",
                    label: {
                        default: "Export Top Layers...",
                    },
                },
                {
                    id: "data",
                    label: {
                        default: "Data",
                    },
                    submenu: [
                        {
                            id: "clearHistory",
                            label: {
                                default: "Clear History",
                            },
                        },
                        {
                            id: "pluginData",
                            label: {
                                default: "View User Data",
                            },
                        },
                    ],
                },
                {
                    id: "settings",
                    label: {
                        default: "Settings",
                    },
                    submenu: [
                        {
                            id: "customizeStartup",
                            label: {
                                default: "Custom Startup...",
                            },
                        },
                        {
                            id: "fuzzyMatch",
                            label: {
                                default: "Fuzzy Query Matching",
                            },
                            checked: true,
                        },
                        {
                            id: "queryLatching",
                            label: {
                                default: "Query Latching",
                            },
                            checked: true,
                        },
                    ],
                },
                {
                    id: "reloadPlugin",
                    label: {
                        default: "Reload Plugin",
                    },
                },
            ],
            invokeMenu(id) {
                const { menuItems } = entrypoints.getPanel("ps_command_palette");

                switch (id) {
                    case "about":
                        about();
                        break;
                    case "customizeStartup":
                        app.showAlert("Not yet implemented");
                        break;
                    case "fuzzyMatch":
                    case "queryLatching":
                        menuItems.getItem(id).checked = !menuItems.getItem(id).checked;
                        app.showAlert("Not yet implemented");
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
        console.log("reloading plugin");
        await USER.reload();
        await HISTORY.reload();
        COMMANDS = await loadCommands();
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
    console.log("clearing user history");
    await HISTORY.clear();
}

async function launchPalette() {
    const start = performance.now();
    COMMANDS = await loadCommands();
    const end = performance.now();
    console.log(`${COMMANDS.length} commands loaded in ${(end - start).toFixed(3)} ms`);

    const startupCommands = filterByIds(COMMANDS, USER.data.startupCommands);
    const palette = new CommandPalette(COMMANDS, startupCommands);
    const result = await palette.show();
    console.log(`modal result ${result}`);

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
