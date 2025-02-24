const { app, core } = require("photoshop");

const { Command } = require("./Command.js");
const { CommandTypes } = require("../types.js");

const { cleanTitle, generateKeyboardShortcut } = require("../utils/commands.js");

/**
 * Create a command palette menu command.
 */
class MenuCommand extends Command {
    /**
     * @param {object} menuCommand Menu command object returned from the `menuBarInfo` property
     * @param {string} menuCommand.name
     * @param {string} menuCommand.title
     * @param {number} menuCommand.command
     * @param {string[]} menuCommand.path
     * @param {boolean} menuCommand.enabled
     * @param {boolean} menuCommand.visible
     * @param {boolean} menuCommand.checked
     * @param {object} menuCommand.menuShortcut
     */
    constructor({
        name,
        title,
        command,
        path,
        enabled,
        visible,
        checked,
        menuShortcut,
    }) {
        const id = `ps_menu_${command}`;
        const description = path.join(" > ");
        const commandName = name || cleanTitle(title.replace(/\.\.\.$/g, ""));

        super(id, commandName, CommandTypes.MENU, description, enabled);

        this.commandID = command;
        this.visible = visible;
        this.checked = checked;
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
     * Perform menu command.
     * @returns {Promise<void>}
     */
    async execute() {
        try {
            // ensure a menu command is still available since
            // sometimes after long periods between app operations
            // ps will report the command is available (e.g. undo and redo)

            const commandState = await this.getState();
            const isAvailable = commandState?.[0];

            // TODO: determine always unavailable menu command that can be ignored or patched
            if (!isAvailable) {
                app.showAlert(
                    "Command not available\n\nPhotoshop is reporting that your selected command is not available via the API at this time."
                );
                return;
            }

            const result = await core.performMenuCommand({ commandID: this.commandID });

            if (!result?.available) {
                app.showAlert(
                    "Command execution error\n\nThere was an error executing your command."
                );
            }

            return result;
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = {
    MenuCommand,
};
