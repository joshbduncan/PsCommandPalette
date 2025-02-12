const { app, core } = require("photoshop");

const { Command, CommandTypes } = require("./Command.js");
const { cleanTitle, generateKeyboardShortcut } = require("../utils.js");

/**
 * Create a command palette menu command.
 */
class Menu extends Command {
    /**
     * Create a command palette menu command.
     * @param {object} menuCommand Menu command object returned from the `menuBarInfo` property
     */
    constructor(menuCommand) {
        const { name, title, command, path, enabled, visible, checked, menuShortcut } =
            menuCommand;

        const id = `ps_menu_${command}`;
        const note = path.join(" > ");
        const commandName = name || cleanTitle(title.replace(/\.\.\.$/g, ""));

        super(id, commandName, CommandTypes.MENU, note, enabled);

        this.obj = menuCommand;
        this.commandID = menuCommand.command;
        this.visible = menuCommand.visible;
        this.checked = menuCommand.checked;
        this.keyboardShortcut = menuShortcut?.keyChar
            ? generateKeyboardShortcut(menuShortcut)
            : "";
    }

    /**
     * Get the current command title (some titles change based on current context/app state).
     * @returns {Promise<boolean>}
     */
    async getTitle() {
        return core.getMenuCommandTitle({ commandID: this.commandID });
    }

    /**
     * Check the current menu command state.
     * @returns {Promise<boolean>}
     */
    async getState() {
        return core.getMenuCommandState({ commandID: this.commandID });
    }

    /**
     * Execute the menu command using the `performMenu` method.
     * @returns {Promise<void>}
     */
    async execute() {
        // ensure a menu command is still available since
        // sometimes after long periods between app operations
        // ps will report the command is available (e.g. undo and redo)

        const commandState = await this.getState();
        const isAvailable = commandState?.[0];

        if (!isAvailable) {
            app.showAlert(
                "Command Not Available\n\nPhotoshop is reporting that your selected command is not available via the API at this time."
            );
            return;
        }

        const result = await core.performMenuCommand({ commandID: this.commandID });

        if (!result?.available) {
            app.showAlert(
                "Command Execution Error\n\nThere was an error executing your command."
            );
        }

        return result;
    }
}

const menuCommandsPatchShortcutKey = {
    5069: {
        // Edit in Quick Mask Mode
        shiftKey: false,
        commandKey: false,
        optionKey: false,
        controlKey: false,
        keyChar: "Q",
    },
    5991: {
        // Standard Screen Mode
        shiftKey: false,
        commandKey: false,
        optionKey: false,
        controlKey: false,
        keyChar: "F",
    },
    5992: {
        // Full Screen Mode With Menu Bar
        shiftKey: false,
        commandKey: false,
        optionKey: false,
        controlKey: false,
        keyChar: "F",
    },
    5993: {
        // Full Screen Mode
        shiftKey: false,
        commandKey: false,
        optionKey: false,
        controlKey: false,
        keyChar: "F",
    },
};

/**
 * Load menu commands.
 * @returns {Promise<Menu[]>}
 */
async function loadMenus() {
    const menusToIgnore = new Set(["Open Recent"]);
    const menuItemsToIgnore = new Set();

    /**
     * Get all current Photoshop menu commands via batchPlay and the `menuBarInfo` property.
     * @returns {Promise<object>}
     */
    const getMenuBarItems = async () => {
        try {
            const target = {
                _ref: [{ _property: "menuBarInfo" }, { _ref: "application" }],
            };
            const command = { _obj: "get", _target: target };
            return await app.batchPlay([command], {});
        } catch (error) {
            console.error("Error fetching menuBarInfo:", error);
        }
    };

    /**
     * Build `Menu` objects for each Photoshop menu command.
     * @param {object} obj Menu bar info object
     * @param {string[]} path Current menu directory path to `obj`
     * @returns {Menu[]}
     */
    const buildMenus = (obj, path = []) => {
        if (!obj) return [];

        let results = [];

        if (Array.isArray(obj.submenu)) {
            for (const submenu of obj.submenu) {
                const cleanedTitle = cleanTitle(submenu.title);

                if (
                    !menusToIgnore.has(cleanedTitle) &&
                    !menuItemsToIgnore.has(cleanedTitle)
                ) {
                    results.push(...buildMenus(submenu, [...path, cleanedTitle]));
                }
            }
        }

        if (obj.kind === "item") {
            const cleanedTitle = cleanTitle(obj.title);
            const menuPath = [...path];

            const menuObj = {
                ...obj,
                title: cleanedTitle,
                path: menuPath,
                menuShortcut:
                    menuCommandsPatchShortcutKey[obj.command] || obj.menuShortcut,
            };

            // TODO: edit enabled key for Filter Gallery Commands
            // Artistic, Brush Strokes, Distort, Sketch, Stylize, Texture

            results.push(new Menu(menuObj));
        }

        return results;
    };

    const menuBarItems = await getMenuBarItems();
    if (!menuBarItems || !menuBarItems[0]?.menuBarInfo) {
        console.warn("No menu items found.");
        return [];
    }

    const menuCommands = buildMenus(menuBarItems[0].menuBarInfo);
    console.log(`Loaded ${menuCommands.length} menu commands`);
    return menuCommands;
}

module.exports = {
    Menu,
    loadMenus,
    menuCommandsPatchShortcutKey,
};
