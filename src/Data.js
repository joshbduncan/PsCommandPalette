const { Command, CommandTypes } = require("./commands/Command.js");
const { loadMenus } = require("./commands/Menu.js");
const { loadTools } = require("./commands/Tool.js");
const { loadActions } = require("./commands/Action.js");

/**
 * Ps Command Palette Commands Data.
 */
class Data {
    /**
     * Create a CommandData object.
     */
    constructor() {
        this.commands = [];
    }

    /**
     * Enabled commands.
     */
    get enabledCommands() {
        return this.commands.filter((command) => {
            return command.enabled;
        });
    }

    /**
     * Disabled commands.
     */
    get disabledCommands() {
        return this.commands.filter((command) => {
            return !command.enabled;
        });
    }

    /**
     * User Selected Startup commands.
     */
    get startupCommands() {
        return this.commands.filter((command) => {
            return USER.data.startupCommands.includes(command.id);
        });
    }

    /**
     * Action Commands.
     */
    get Actions() {
        return this.commands.filter((command) => {
            return command.type === CommandTypes.ACTION;
        });
    }

    /**
     * Menu Commands.
     */
    get menuCommands() {
        return this.commands.filter((command) => {
            return command.type === CommandTypes.MENU;
        });
    }

    /**
     * Tool Commands.
     */
    get toolCommands() {
        return this.commands.filter((command) => {
            return command.type === CommandTypes.TOOL;
        });
    }

    /**
     *
     * @param {Array.<Command>} commands Commands to filer
     * @param {string} query Query string
     * @param {Array.<CommandTypes>} types Command type to filter for
     * @param {boolean} disabled Should disabled commands be included (defaults to false)
     * @param {boolean} hidden Should user hidden commands be included (defaults to false)
     * @returns {Array.<Command>}
     */
    filterByQuery(commands, query, types = [], disabled = false, hidden = false) {
        if (query == "") {
            return [];
        }

        let matches = commands != undefined ? commands : this.commands;

        // filter by types first
        if (types.length > 0) {
            matches = this.commandsByTypes(types);
        }

        //  TODO: determine how to handle disabled commands
        // filter disabled commands
        // if (!disabled) {
        //   matches = matches.filter((command) => {
        //     return command.enabled;
        //   });
        // }

        // filter hidden commands
        if (!hidden && USER.data.hasOwnProperty("hiddenCommands")) {
            matches = matches.filter((command) => {
                return !USER.data.hiddenCommands.includes(command.id);
            });
        }

        // filter by query
        matches = matches.filter((command) => {
            return command.name.toLowerCase().includes(query.toLowerCase());
        });

        return matches;
    }

    // TODO: add getters for other command types

    /**
     * Commands with the type of `type`
     * @param {string} type Command type to match against
     * @returns {Array.<Command>}
     */
    commandsByType(type) {
        return this.commands.filter((command) => {
            return command.type == type;
        });
    }

    /**
     * Command with a type included in `types`.
     * @param {Array.<string>} types Command types to return
     * @returns {Array.<Command>}
     */
    commandsByTypes(types) {
        return this.command.filter((command) => {
            return types.includes(command.types);
        });
    }

    /**
     * Lookup a command by id.
     * @param {string|number} commandID ID of the command to lookup
     * @returns {Command}
     */
    lookupById(commandID) {
        let command;
        for (let i = 0; i < this.commands.length; i++) {
            const element = this.commands[i];
            if (element.id == commandID) {
                command = element;
                break;
            }
        }
        return command;
    }

    /**
     * Load all commands types into the commands set.
     */
    async load() {
        console.log("loading commands...");
        const commands = [];

        // load menu commands
        try {
            const menusCommands = await loadMenus();
            commands.push(...menusCommands);
        } catch (error) {
            console.log("error loading menu commands:", error);
        }

        // load tool commands
        try {
            const toolComands = await loadTools();
            commands.push(...toolComands);
        } catch (error) {
            console.log("error loading tools:", error);
        }

        // load action commands
        try {
            const actionCommands = await loadActions();
            commands.push(...actionCommands);
        } catch (error) {
            console.log("error loading action:", error);
        }

        this.commands = commands;
    }

    /**
     * Reload all command data.
     */
    async reload() {
        this.load();
    }
}

module.exports = {
    Data,
};
