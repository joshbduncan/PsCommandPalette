const { app, core } = require("photoshop");

const { Command } = require("./Command.js");
const { CustomCommand } = require("./CustomCommand.js");
const { CommandTypes } = require("../types.js");
const { CommandPalette } = require("../palettes/CommandPalette.js");

/**
 * Create a command palette picker command.
 */
class PickerCommand extends Command {
    /**
     * @param {object} picker
     * @param {string} picker.id - Unique command id
     * @param {string} picker.name - Picker name
     * @param {string} picker.description Picker description
     * @param {Command[]} picker.commands - Queryable picker commands
     */
    constructor({ id, name, description, commands }) {
        super(id, name, CommandTypes.PICKER, description);
        this.commands = commands;
    }

    /**
     * Perform menu command.
     * @returns {Promise<void>}
     */
    async execute() {
        try {
            const pickerCommands = this.commands.map(
                ({ id, name, description }) =>
                    new CustomCommand(id, name, description, function () {
                        app.showAlert(`selected item\n'${this.name}'`);
                    })
            );

            const picker = new CommandPalette(pickerCommands);
            const result = await picker.show();
            console.log(`picker result ${JSON.stringify(result, null, 2)}`);

            if (result === "reasonCanceled" || !result) return;

            const { query, command } = result;
            if (!command) {
                console.error("No command selected.");
                return;
            }
            await command.execute();

            // TODO: maybe add to history???
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = {
    PickerCommand,
};
