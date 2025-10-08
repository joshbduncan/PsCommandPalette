const { app } = require("photoshop");

const { ActionCommand } = require("../commands/ActionCommand.js");
const { APICommand } = require("../commands/APICommand.js");
const {
    FileBookmarkCommand,
    FolderBookmarkCommand,
} = require("../commands/BookmarkCommand.js");
const { MenuCommand } = require("../commands/MenuCommand.js");
const { PickerCommand } = require("../commands/PickerCommand.js");
const { PluginCommand } = require("../commands/PluginCommand.js");
const { ToolCommand } = require("../commands/ToolCommand.js");

const { apiCommands } = require("../commands/api/commands.js");
const { BookmarkCommandTypes, CommandTypes } = require("../types.js");
const { pluginCommands } = require("../commands/plugin/commands.js");

const { cleanTitle, menuCommandsPatchShortcutKeyLUT } = require("./commands.js");

/**
 * Load all commands types into the commands set.
 * @param {string[]} excludedTypes - Command types to exclude during load
 * @returns
 */
async function loadCommands(excludedTypes = []) {
    const commands = [];

    const loadFunctionsLUT = {
        [CommandTypes.ACTION]: loadActionCommands,
        [CommandTypes.API]: loadAPICommands,
        [CommandTypes.BOOKMARK]: loadBookmarkCommands,
        [CommandTypes.MENU]: loadMenuCommands,
        [CommandTypes.PICKER]: loadPickerCommands,
        [CommandTypes.PLUGIN]: loadPluginCommands,
        [CommandTypes.TOOL]: loadToolCommands,
    };

    const commandTypesToLoad = Object.values(CommandTypes).filter(
        (type) => !excludedTypes.includes(type)
    );

    console.group("loadCommands");
    const start = performance.now();

    // Load all command types in parallel instead of sequentially
    const commandPromises = commandTypesToLoad.map(async (type) => {
        // TODO: exclusions from user data should be passed into function as arg
        // if (
        //     Object.hasOwn(USER.data, "disabledCommandTypes") &&
        //     USER.data.disabledCommandTypes.includes(key)
        // ) {
        //     console.log(`Skipping Command Type: ${key}`);
        //     continue;
        // }
        try {
            let func = loadFunctionsLUT[type];
            if (!func) return { type, commands: [], time: 0 };

            const typeStart = performance.now();
            console.log(`Loading ${type} commands...`);
            const commands = await func();
            const typeEnd = performance.now();

            console.log(
                `${type}: ${commands.length} commands in ${(typeEnd - typeStart).toFixed(1)}ms.`
            );
            return { type, commands, time: typeEnd - typeStart };
        } catch (error) {
            console.error(`Failed to load ${type} commands:`, error);
            return { type, commands: [], time: 0 };
        }
    });

    // Wait for all command types to load in parallel
    const results = await Promise.all(commandPromises);

    // Extract commands and log individual timings
    results.forEach(({ type, commands: typeCommands, time }) => {
        commands.push(...typeCommands);
    });

    const end = performance.now();
    console.groupEnd();
    console.log(
        `${commands.length} total commands loaded in ${(end - start).toFixed(1)}ms.`
    );

    return commands;
}

/////////////////////////////////
// command type load functions //
/////////////////////////////////

/**
 * Load action commands.
 * @returns {Promise<ActionCommand[]>}
 */
async function loadActionCommands() {
    const actionTree = await app.actionTree;
    const actions = new Array(
        actionTree.reduce((count, set) => count + set.actions.length, 0)
    ); // preallocate array

    let index = 0;
    for (const set of actionTree) {
        const parentName = set.name; // cache repeated property access
        for (const action of set.actions) {
            actions[index++] = new ActionCommand(action);
        }
    }
    return actions;
}

/**
 * Load api commands.
 * @returns {ApiCommand[]}
 */
function loadAPICommands() {
    return Object.entries(apiCommands).map(([key, obj]) =>
        Object.assign(new APICommand(key, obj.name, obj.description), {
            execute: obj.callback,
        })
    );
}

/**
 * Load user bookmark commands.
 * @returns {BookmarkCommand[]}
 */
async function loadBookmarkCommands() {
    if (!USER.data?.bookmarks) return [];
    return USER.data.bookmarks.map((bookmark) =>
        bookmark.type === BookmarkCommandTypes.FILE
            ? new FileBookmarkCommand({ ...bookmark })
            : new FolderBookmarkCommand({ ...bookmark })
    );
}

/**
 * Load menu commands.
 * @returns {Promise<MenuCommand[]>}
 */
async function loadMenuCommands() {
    const menusToIgnore = new Set(["Open Recent"]);
    const menuItemsToIgnore = new Set();

    // Pre-compile patch lookup as Map for faster access
    const menuItemsToPatchName = new Map([
        [7802, () => "Define Variables"],
        [1099, () => "New Layer"],
        [1942, () => "New Layer from Background"],
        [2976, () => "New Group"],
        [2956, () => "New Group from Layers"],
        [9220, () => "New Artboard"],
        [9221, () => "New Artboard from Group"],
        [9222, () => "New Artboard from Layers"],
        [1100, (str) => `Delete ${str}`],
        [2951, () => "Delete Hidden Layers"],
    ]);

    /**
     * Get all current Photoshop menu commands via batchPlay and the `menuBarInfo` property.
     * @returns {Promise<object>}
     */
    const getMenuBarItems = async () => {
        try {
            return await app.batchPlay(
                [
                    {
                        _obj: "get",
                        _target: [
                            { _property: "menuBarInfo" },
                            { _ref: "application" },
                        ],
                    },
                ],
                {}
            );
        } catch (error) {
            console.error("Error fetching menuBarInfo:", error);
            return null;
        }
    };

    /**
     * Build `Menu` objects for each Photoshop menu command.
     * Uses an iterative approach instead of recursion.
     * @param {object} root - Menu bar info object
     * @returns {MenuCommand[]}
     */
    const buildMenus = (root) => {
        if (!root?.submenu) return [];

        const results = [];
        const stack = [{ node: root, path: [] }]; // Use stack to eliminate deep recursion

        while (stack.length > 0) {
            const { node, path } = stack.pop();

            // Early return for invalid nodes
            if (!node) continue;

            // Early return if node has no submenu and isn't an item
            if (!Array.isArray(node.submenu) && node.kind !== "item") continue;

            if (Array.isArray(node.submenu)) {
                for (const submenu of node.submenu) {
                    const cleanedTitle = cleanTitle(submenu.title);

                    if (
                        !menusToIgnore.has(cleanedTitle) &&
                        !menuItemsToIgnore.has(cleanedTitle)
                    ) {
                        stack.push({ node: submenu, path: [...path, cleanedTitle] });
                    }
                }
            }

            if (node.kind === "item") {
                // patch name if needed - use Map.has() for faster lookup
                if (menuItemsToPatchName.has(node.command)) {
                    node.name = menuItemsToPatchName.get(node.command)(node.name);
                }

                // clean title for display
                node.title = cleanTitle(node.title);

                // stringify menu shortcut
                node.menuShortcut =
                    menuCommandsPatchShortcutKeyLUT[node.command] || node.menuShortcut;

                results.push(
                    new MenuCommand({
                        ...node,
                        path: [...path],
                    })
                );
            }
        }
        return results;
    };

    const menuBarItems = await getMenuBarItems();
    if (!menuBarItems?.[0]?.menuBarInfo) {
        console.warn("No menu items found.");
        return [];
    }

    return buildMenus(menuBarItems[0].menuBarInfo);
}

/**
 * Load custom picker commands.
 * @returns {PickerCommand[]}
 */
async function loadPickerCommands() {
    if (!USER.data?.pickers) return [];
    return USER.data.pickers.map((picker) => new PickerCommand({ ...picker }));
}

/**
 * Load plugin commands.
 * @returns {PluginCommand[]}
 */
function loadPluginCommands() {
    return Object.entries(pluginCommands).map(([key, obj]) =>
        Object.assign(new PluginCommand(key, obj.name, obj.description), {
            execute: obj.callback,
        })
    );
}

/**
 * Load script commands.
 * @returns {ScriptCommand[]}
 */
async function loadScriptCommands() {
    if (!USER.data?.scripts) return [];
    return USER.data.scripts.map((script) => new ScriptCommand({ ...script }));
}

/**
 * Load tool commands.
 * @returns {ToolCommand[]}
 */
function loadToolCommands() {
    // Load static tool data from external JSON file for faster parsing
    const tools = require("../tools.json");
    return tools.tools.map((tool) => {
        return new ToolCommand(
            tool._ref,
            tool.name,
            tool.description,
            tool.keyboardShortcut
        );
    });
}

module.exports = {
    loadCommands,
};
