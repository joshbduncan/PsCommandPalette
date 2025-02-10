const { Command, CommandTypes } = require("./Command.js");
const { loadActions } = require("./Action.js");
const { loadBuiltins } = require("./Builtin.js");
const { loadMenus } = require("./Menu.js");
const { loadScripts } = require("./Script.js");
const { loadTools } = require("./Tool.js");

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
    get actionCommands() {
        return this.commands.filter((command) => {
            return command.type === CommandTypes.ACTION;
        });
    }

    /**
     * User Selected Startup commands.
     */
    get builtinCommands() {
        return this.commands.filter((command) => {
            return command.type === CommandTypes.BUILTIN;
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
     * Script Commands.
     */
    get scriptCommands() {
        return this.commands.filter((command) => {
            return command.type === CommandTypes.SCRIPT;
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
     * @param {string} query Query string
     * @param {Array.<Command>} commands Commands to filer (defaults to all commands `this.commands`)
     * @param {Array.<CommandTypes>} types Command type to filter for
     * @param {boolean} disabled Should disabled commands be included (defaults to false)
     * @param {boolean} hidden Should user hidden commands be included (defaults to false)
     * @returns {Array.<Command>}
     */
    filterByQuery(
        query,
        commands = this.commands,
        types = [],
        disabled = false,
        hidden = false
    ) {
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
        console.log("Loading commands...");
        const commands = [];

        const toLoad = {
            actionCommands: loadActions,
            builtinCommands: loadBuiltins,
            menuCommands: loadMenus,
            scriptCommands: loadScripts,
            toolCommands: loadTools,
        };

        for (const [key, func] of Object.entries(toLoad)) {
            try {
                console.log(`Loading ${key}...`);
                let loadedCommands = await func();
                commands.push(...loadedCommands);
            } catch (error) {
                console.error("Error loading:", error);
            }
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
