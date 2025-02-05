const { app, core } = require("photoshop");

const { Command, CommandTypes } = require("./Command.js");
const { alertDialog } = require("../dialogs/alert.js");
const { cleanTitle, generateKeyboardShortcut } = require("../utils.js");

/**
 * Create a command palette menu command.
 */
class Menu extends Command {
    /**
     * Crete a command palette menu command.
     * @param {object} obj Menu command object returned from the `menuBarInfo` property
     */
    constructor(obj) {
        let name = obj.name;
        if (obj.name === "") {
            name = cleanTitle(obj.title.replace(/\.\.\.$/g, ""));
        }
        const id = "ps_menu_" + obj.command.toString();
        const description = obj.path.join(" > ");

        super(id, name, CommandTypes.MENU, description, obj.enabled);

        this.obj = obj;
        this.commandID = obj.command;
        this.visible = obj.visible;
        this.checked = obj.checked;
        this.keyboardShortcut = "";

        if (obj.menuShortcut.hasOwnProperty("keyChar")) {
            this.keyboardShortcut = generateKeyboardShortcut(obj.menuShortcut);
        }

        this.createElement(this.name, this.description);
    }

    /**
     * Get the current command title (some titles change based on current context/app state).
     * @returns {Promise.<boolean>}
     */
    async getTitle() {
        return await core.getMenuCommandTitle({ commandID: this.commandID });
    }

    /**
     * Check the current menu command state.
     * @returns {Promise.<boolean>}
     */
    async getState() {
        return core.getMenuCommandState({ commandID: this.commandID });
    }

    /**
     * Execute the menu command using the `performMenu` method.
     */
    async execute() {
        // ensure a menu command is still available since
        // sometimes after long periods between app operations
        // ps will report the command is available (e.g. undo and redo)
        const commandState = await this.getState();
        if (!commandState[0]) {
            await alertDialog(
                "Command Not Available",
                null,
                "Photoshop is reporting that your selected command not available via the API at this time."
            );
            return;
        }

        try {
            const result = await core.performMenuCommand({
                commandID: this.commandID,
            });

            if (!result.available) {
                await alertDialog(
                    "Command Execution Error",
                    null,
                    "There was an error executing your command."
                );
            }
        } catch (error) {
            console.log("menu command execution error:", error);
        }
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
 * Load Photoshop menu items from the `menuBarInfo` property.
 * @returns {Promise.<Array.<Menu>>}
 */
async function loadMenus() {
    const menusToIgnore = ["Open Recent"];
    const menuItemsToIgnore = [];

    /**
     * Get all current Photoshop menu commands via batchPlay and the `menuBarInfo` property.
     * @returns {Promise.<object>}
     */
    const getMenuBarItems = async () => {
        const target = {
            _ref: [{ _property: "menuBarInfo" }, { _ref: "application" }],
        };
        const command = { _obj: "get", _target: target };

        // TODO: add batchPlay execution error checking https://developer.adobe.com/photoshop/uxp/2022/ps_reference/media/batchplay/#action-references
        return await app.batchPlay([command], {});
    };

    /**
     * Build `Menu` objects for each Photoshop menu command.
     * @param {object} obj Menu bar info object
     * @param {Array.<string>} path Current menu directory path to `obj`
     * @returns {Array.<Menu>}
     */
    const buildMenus = (obj, path = []) => {
        const results = [];

        if (obj.submenu && Array.isArray(obj.submenu)) {
            for (const submenu of obj.submenu) {
                // filter out entire menus known not to work
                if (menusToIgnore.includes(submenu.title)) continue;

                // filter out menu commands known not to work
                if (menuItemsToIgnore.includes(submenu.title)) continue;

                const newPath = [...path, cleanTitle(submenu.title)];
                results.push(...buildMenus(submenu, newPath));
            }
        }

        // set name to title when missing
        if (obj.kind === "item") {
            obj.path = path;
            let cleanedTitle = cleanTitle(obj.title);
            obj.title = cleanedTitle;

            // add key combination to commands available in tool bar
            if (obj.command in menuCommandsPatchShortcutKey) {
                obj.menuShortcut = menuCommandsPatchShortcutKey[obj.command];
            }

            let command = new Menu(obj);
            results.push(command);
        }

        return results;
    };

    const menuBarItems = await getMenuBarItems();
    const menuCommands = buildMenus(menuBarItems[0].menuBarInfo);
    console.log(`loaded ${menuCommands.length} menu commands`);
    return menuCommands;
}

module.exports = {
    Menu,
    loadMenus,
    menuCommandsPatchShortcutKey,
};
