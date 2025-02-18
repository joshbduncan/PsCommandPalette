const { Command, CommandTypes } = require("./Command.js");
const { loadActions } = require("./Action.js");
const { loadBookmarks } = require("./Bookmark.js");
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
     * User Action Commands.
     */
    get actionCommands() {
        return this.commands.filter((command) => {
            return command.type === CommandTypes.ACTION;
        });
    }

    /**
     * User Bookmark commands.
     */
    get builtinCommands() {
        return this.commands.filter((command) => {
            return command.type === CommandTypes.BUILTIN;
        });
    }

    /**
     * Builtin Plugin commands.
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
     * User Startup commands.
     */
    get startupCommands() {
        return this.commands.filter((command) => {
            return USER.data.startupCommands.includes(command.id);
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
     * @param {Command[]} commands Commands to filer (defaults to all commands `this.commands`)
     * @param {CommandTypes[]} types Command types to filter for
     * @param {boolean} disabled Should disabled commands be included (defaults to false)
     * @param {boolean} hidden Should user hidden commands be included (defaults to false)
     * @returns {Command[]}
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
        if (!hidden && Object.hasOwn(USER.data, "hiddenCommands")) {
            matches = matches.filter((command) => {
                return !USER.data.hiddenCommands.includes(command.id);
            });
        }

        /**
         * Fuzzy match commands against a search `query`.
         * @param {Command} command Command to match against
         * @param {string} query Search query string
         * @returns {boolean}
         */
        function fuzzyMatch(command, query) {
            const cleanQuery = query.replace(/\s/g, "").toLowerCase();
            const tokens = command.name.split("");
            let pos = 0;

            const highlightedTokens = tokens.map((token) => {
                if (
                    pos < cleanQuery.length &&
                    token.toLowerCase() === cleanQuery[pos]
                ) {
                    pos++;
                    return `<strong>${token}</strong>`;
                }
                return token;
            });

            if (pos < cleanQuery.length) return false; // No full match, exit early

            command.addQueryHighlights(highlightedTokens.join(""));
            return true;
        }

        /**
         * Creates a sorting function that sorts commands by the number of matching chunks in their name.
         * Matches closer to the start of the name are given higher weight, with an extra boost for exact prefix matches.
         * @param {string} query Search query used for comparison
         * @returns {(a: { name: string }, b: { name: string }) => number} Sorting function
         */
        function scoreMatches(query) {
            const queryChunks = query.toLowerCase().split(/\s+/); // Split query into an array

            /**
             * Counts matches between the query chunks and name chunks.
             * Matches earlier in the name are given higher weight.
             * @param {string} name Command name to check against
             * @returns {number} Weighted match count
             */
            const countMatches = (name) => {
                const nameChunks = name.toLowerCase().split(/\s+/);

                return queryChunks.reduce((count, queryChunk) => {
                    return (
                        count +
                        nameChunks.reduce((total, nameChunk, index) => {
                            if (nameChunk.includes(queryChunk)) {
                                let weight = 1 / (index + 1); // Base weight: earlier chunks matter more
                                if (nameChunk.startsWith(queryChunk)) {
                                    weight += 1; // Extra boost for exact prefix matches
                                }
                                total += weight;
                            }
                            return total;
                        }, 0)
                    );
                }, 0);
            };

            const scoreMatch = (command) => {
                // calculate base score for query chunk matches
                let score = countMatches(command.name);

                // boost for latched query
                if (
                    HISTORY.latches.hasOwnProperty(query) &&
                    HISTORY.latches[query] == command.id
                ) {
                    score += 10;
                }

                // boost for recent command
                if (HISTORY.recent.hasOwnProperty(command.id)) {
                    score += 5;
                }

                return score;
            };

            /**
             * Comparison function for sorting command for the palette.
             * @param {{ name: string }} a First command to compare
             * @param {{ name: string }} b Second command to compare
             * @returns {number} Negative if `a` should be before `b`, positive if `b` should be before `a`.
             */
            return (a, b) => scoreMatch(b) - scoreMatch(a); // sort descending
        }

        // fuzzy match by query and sort by chunk matches
        matches = matches
            .filter((command) => fuzzyMatch(command, query))
            .sort(scoreMatches(query));

        return matches;
    }

    // TODO: add getters for other command types

    /**
     * Commands with the type of `type`
     * @param {string} type Command type to match against
     * @returns {Command[]}
     */
    commandsByType(type) {
        return this.commands.filter((command) => {
            return command.type == type;
        });
    }

    /**
     * Command with a type included in `types`.
     * @param {string[]} types Command types to return
     * @returns {Command[]}
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
            [CommandTypes.ACTION]: loadActions,
            [CommandTypes.BOOKMARK]: loadBookmarks,
            [CommandTypes.BUILTIN]: loadBuiltins,
            [CommandTypes.MENU]: loadMenus,
            [CommandTypes.SCRIPT]: loadScripts,
            [CommandTypes.TOOL]: loadTools,
        };

        for (const [key, func] of Object.entries(toLoad)) {
            if (
                Object.hasOwn(USER.data, "disabledCommandTypes") &&
                USER.data.disabledCommandTypes.includes(key)
            ) {
                console.log("Skipping command type:", key);
                continue;
            }
            try {
                console.log(`Loading ${key} commands...`);
                let loadedCommands = await func();
                commands.push(...loadedCommands);
            } catch (error) {
                console.error(`Error loading ${key} commands:`, error);
            }
        }

        console.log(`Loaded ${commands.length} commands`);
        this.commands = commands;
    }

    /**
     * Reload all command data.
     */
    async reload() {
        await this.load();
    }
}

module.exports = {
    Data,
};
