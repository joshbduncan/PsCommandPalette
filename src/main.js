const os = require("os");

const uxp = require("uxp");

const { entrypoints, shell, storage } = uxp;
const fs = storage.localFileSystem;

const manifest = require("./manifest.json");
const { CommandPalette } = require("./palettes/CommandPalette.js");
const { History } = require("./user/History.js");
const { User } = require("./user/User.js");
const { pluginCommands } = require("./commands/plugin/commands.js");
const { filterByIds } = require("./utils/query.js");
const { loadCommands } = require("./utils/load.js");
const { sortCommandsByOccurrence } = require("./utils/commands");

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

// TODO: localize menus here and in manifest - https://developer.adobe.com/photoshop/uxp/2022/guides/uxp_guide/uxp-misc/manifest-v4/#menu-localization
entrypoints.setup({
    plugin: {
        create() {
            console.log(`${PLUGIN_NAME} v${PLUGIN_VERSION} loaded.`);
        },
        destroy() {
            return new Promise(function (resolve, reject) {
                console.log(`${PLUGIN_NAME} v${PLUGIN_VERSION} destroyed.`);
                resolve();
            });
        },
    },
    panels: {
        ps_command_palette: {
            create() {
                return new Promise(function (resolve, reject) {
                    const panel = entrypoints.getPanel("ps_command_palette");
                    console.log(`Panel '${panel.title}' created.`);

                    const year = new Date().getFullYear();
                    document.getElementById("main-copyright").innerHTML =
                        `Copyright &copy; ${year} ${PLUGIN_AUTHOR}`;

                    document.getElementById("main-plugin-info").textContent =
                        `Plugin Version v${PLUGIN_VERSION}`;

                    document
                        .getElementById("btnOpenCommandPalette")
                        .addEventListener("click", launchPalette);

                    // TODO: add settings as menu items - https://www.youtube.com/watch?v=v-x1ZrOtlzQ&list=PLRR5kmVeh43alNtSKHUlmbBjLqezgwzPJ&index=12
                    // TODO: updates builtin
                    // TODO: pluginSettings builtin

                    resolve();
                });
            },
            show() {
                return new Promise(function (resolve, reject) {
                    const panel = entrypoints.getPanel("ps_command_palette");
                    console.log(`Panel '${panel.title}' shown.`);
                    resolve();
                });
            },
            hide() {
                return new Promise(function (resolve, reject) {
                    const panel = entrypoints.getPanel("ps_command_palette");
                    console.log(`Panel '${panel.title}' hidden.`);
                    resolve();
                });
            },
            destroy() {
                return new Promise(function (resolve, reject) {
                    const panel = entrypoints.getPanel("ps_command_palette");
                    console.log(`Panel '${panel.title}' destroyed.`);
                    resolve();
                });
            },
            async invokeMenu(id) {
                const { menuItems } = entrypoints.getPanel("ps_command_palette");

                switch (id) {
                    case "about":
                        pluginCommands.about.callback();
                        break;
                    case "intro":
                        pluginCommands.intro.callback();
                        break;
                    case "help":
                        pluginCommands.help.callback();
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
                        pluginCommands.reload.callback();
                        break;
                    case "pluginData":
                        pluginCommands.data.callback();
                        break;
                    case "clearHistory":
                        pluginCommands.clearHistory.callback();
                        break;
                }
            },
            menuItems: [
                {
                    id: "about",
                    label: "About",
                },
                {
                    id: "intro",
                    label: "Introduction",
                },
                {
                    id: "help",
                    label: "Help",
                },
                {
                    id: "data",
                    label: "Data",
                    submenu: [
                        {
                            id: "clearHistory",
                            label: "Clear History",
                        },
                        {
                            id: "pluginData",
                            label: "View User Data",
                        },
                    ],
                },
                {
                    id: "settings",
                    label: "Settings",
                    submenu: [
                        {
                            id: "customizeStartup",
                            label: "Custom Startup...",
                        },
                        {
                            id: "fuzzyMatch",
                            label: "Fuzzy Query Matching",
                            checked: true,
                        },
                        {
                            id: "queryLatching",
                            label: "Query Latching",
                            checked: true,
                        },
                    ],
                },
                {
                    id: "reloadPlugin",
                    label: "Reload Plugin",
                },
            ],
        },
    },
    commands: {
        launchPalette: () => launchPalette(),
    },
});

/////////////////////
// plugin commands //
/////////////////////

async function launchPalette() {
    await USER.reload();
    await HISTORY.reload();
    const commands = await loadCommands();

    // TODO: let user specify custom commands, or use most used or most recent
    const startupCommandIDs =
        USER.data.startupCommands.length > 0
            ? USER.data.startupCommands
            : HISTORY.commandIDs;
    const startupCommands = sortCommandsByOccurrence(
        filterByIds(commands, startupCommandIDs)
    );

    const palette = new CommandPalette(commands, startupCommands);
    const result = await palette.show();
    console.log("modal result:", result);

    if (result === "reasonCanceled" || !result) return;

    const { query, command } = result;
    if (!command) {
        console.error("No command selected.");
        return;
    }

    // to allow for external user data file editing, don't write
    // user data when "Reload Plugin Data" command is executed
    if (command.id !== "ps_plugin_reload") {
        HISTORY.add(query, command.id);
        USER.write();
    }

    try {
        await command.execute();
    } catch (error) {
        console.error(error);
    }
}
