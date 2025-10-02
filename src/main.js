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

/////////////////////////
// data invalidation flags
/////////////////////////
let USER_NEEDS_RELOAD = true; // Force initial load
let HISTORY_NEEDS_RELOAD = true; // Force initial load

/////////////////////////
// data invalidation callbacks
/////////////////////////
globalThis.invalidateUserData = () => {
    USER_NEEDS_RELOAD = true;
    console.log("User data invalidated - will reload on next access.");
};

globalThis.invalidateHistoryData = () => {
    HISTORY_NEEDS_RELOAD = true;
    console.log("History data invalidated - will reload on next access.");
};

async function loadUserDataIfNeeded() {
    try {
        if (USER_NEEDS_RELOAD) {
            await USER.reload();
            USER_NEEDS_RELOAD = false;
        }
        if (HISTORY_NEEDS_RELOAD) {
            await HISTORY.reload();
            HISTORY_NEEDS_RELOAD = false;
        }
    } catch (error) {
        console.warn("Failed to load user data:", error);
        // Reset flags on error to retry next time
        USER_NEEDS_RELOAD = true;
        HISTORY_NEEDS_RELOAD = true;
    }
}

// TODO: localize menus here and in manifest - https://developer.adobe.com/photoshop/uxp/2022/guides/uxp_guide/uxp-misc/manifest-v4/#menu-localization
entrypoints.setup({
    plugin: {
        async create() {
            console.log(`${PLUGIN_NAME} v${PLUGIN_VERSION} loaded.`);
            // Pre-load user data on plugin startup for faster palette launch
            await loadUserDataIfNeeded();
            console.log("Plugin initialization complete");
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

                    // Add keyboard shortcut for faster access (Cmd/Ctrl + K)
                    document.addEventListener("keydown", (event) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === "k") {
                            event.preventDefault();
                            launchPalette();
                        }
                    });

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
    // Load user data only if invalidated since last access
    await loadUserDataIfNeeded();

    // Show modal immediately with empty commands first, then load in background
    const palette = new CommandPalette([], []);

    // Show loading indicator immediately
    setTimeout(() => {
        const info = document.getElementById("info");
        if (info) {
            info.textContent = "Loading commands...";
        }
    }, 0);

    // Pre-calculate startup command IDs to avoid recalculation
    const startupCommandIDs =
        USER.data.startupCommands.length > 0
            ? USER.data.startupCommands
            : HISTORY.commandIDs;

    // Start loading commands in background immediately
    loadCommands()
        .then((commands) => {
            const startupCommands = sortCommandsByOccurrence(
                filterByIds(commands, startupCommandIDs)
            );

            palette.updateCommands(commands);

            // Update startup commands display if user hasn't started searching
            const querybox = document.getElementById("query");
            if (querybox && querybox.value.trim() === "") {
                const listbox = document.getElementById("commands");
                const info = document.getElementById("info");

                if (listbox && info) {
                    listbox.innerHTML = "";
                    startupCommands.forEach((command) => {
                        if (!command.element) {
                            command.createElement();
                        }
                        listbox.appendChild(command.element);
                    });
                    info.textContent = `${startupCommands.length} matching command(s)`;
                    palette.resetCommandSelection();
                }
            }
        })
        .catch((error) => {
            console.error("Failed to load commands:", error);
            // Show error message in the info area
            const info = document.getElementById("info");
            if (info) {
                info.textContent = "Failed to load commands. Please try again.";
            }
        });

    const result = await palette.show();
    console.log("Ps Command Palette Result:", result);

    if (result === "reasonCanceled" || !result) return;

    const { query, command } = result;
    if (!command) {
        console.error("No command selected.");
        return;
    }

    // Add to history for all commands except plugin reload
    // USER.write() is now called manually by specific commands that need it
    if (command.id !== "ps_plugin_reload") {
        HISTORY.add(query, command.id);
    }

    try {
        await command.execute();
    } catch (error) {
        console.error(error);
    }
}
