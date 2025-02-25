const { sortCommandsByOccurrence } = require("./commands");

/**
 * @typedef {Object} CommandFilter
 * @property {string[]} types Command types to filter for
 * @property {boolean} disabled Should disabled commands be included (defaults to false)
 * @property {boolean} hidden Should user hidden commands be included (defaults to false)
 */

/**
 * Filter commands by query.
 * @param {string} query - Query string
 * @param {Command[]} commands - Commands to filter
 * @param {CommandFilter} filters - Command filter options
 * @returns {Command[]}
 */
function filterCommandsByQuery(query, commands, filters = {}) {
    /**
     * Fuzzy match commands against a search `query`.
     * @param {Command} command - Command to match against
     * @param {string} query - Search query string
     * @returns {boolean}
     */
    function fuzzyMatch(command, query) {
        const cleanQuery = query.replace(/\s/g, "").toLowerCase();
        const tokens = command.name.split("");
        let pos = 0;

        const highlightedTokens = tokens.map((token) => {
            if (pos < cleanQuery.length && token.toLowerCase() === cleanQuery[pos]) {
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
     * @param {string} query - Search query used for comparison
     * @returns {(a: { name: string }, b: { name: string }) => number} Sorting function
     */
    function scoreMatches(query) {
        const queryChunks = query.toLowerCase().split(/\s+/); // split query into an array

        /**
         * Counts matches between the query chunks and name chunks.
         * Matches earlier in the name are given higher weight.
         * @param {string} name - Command name to check against
         * @returns {number} Weighted match count
         */
        const countMatches = (name) => {
            const nameChunks = name.toLowerCase().split(/\s+/);

            return queryChunks.reduce((count, queryChunk) => {
                return (
                    count +
                    nameChunks.reduce((total, nameChunk, index) => {
                        if (nameChunk.includes(queryChunk)) {
                            let weight = 1 / (index + 1); // base weight: earlier chunks matter more
                            if (nameChunk.startsWith(queryChunk)) {
                                weight += 1; // extra boost for exact prefix matches
                            }
                            if (nameChunk == queryChunk) {
                                weight += 2; // extra boost for exact chunk/word matches
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

            // boost for exact match
            score += command.name.toLowerCase() == query.toLowerCase() ? 5 : 0;

            // boost for latched query
            score += HISTORY.latches?.[query] === command.id ? 10 : 0;

            // boost for recent command
            score +=
                (HISTORY.recencyLUT?.get(command.id) ?? 0) /
                (HISTORY.recencyLUT?.size || 1);

            // boost for often used command
            // TODO: maybe calculate boost based on the frequency
            score += HISTORY.occurrencesLUT?.[command.id] ? 2.5 : 0;

            return score;
        };

        /**
         * Comparison function for sorting commands for the palette.
         * @param {{ name: - string }} a First command to compare
         * @param {{ name: - string }} b Second command to compare
         * @returns {number} Negative if `a` should be before `b`, positive if `b` should be before `a`.
         */

        return (a, b) => scoreMatch(b) - scoreMatch(a); // sort descending
    }

    let matches = commands;

    // filter by types first
    if (filters.types && filters.types.length > 0) {
        matches = commandsByTypes(commands, filters.types);
    }

    //  TODO: determine how to handle disabled commands
    // filter disabled commands
    // if (!filters.disabled) {
    //     matches = matches.filter((command) => {
    //         return command.enabled;
    //     });
    // }

    // filter hidden commands
    if (!filters.hidden && Object.hasOwn(USER.data, "hiddenCommands")) {
        matches = matches.filter((command) => {
            return !USER.data.hiddenCommands.includes(command.id);
        });
    }

    // fuzzy match by query and sort by chunk matches
    if (query != "") {
        matches = matches
            .filter((command) => fuzzyMatch(command, query))
            .sort(scoreMatches(query));
    } else {
        // TODO: sort by most used or most recent
        matches = sortCommandsByOccurrence(matches);
    }

    return matches;
}

/**
 * Get enabled commands.
 * @param {Command[]} commands - Commands to filter
 * @returns {Command[]}
 */
function enabledCommands(commands) {
    return commands.filter((command) => {
        return command.enabled;
    });
}

/**
 * Get disabled commands.
 * @param {Command[]} commands - Commands to filter
 * @returns {Command[]}
 */
function disabledCommands(commands) {
    return commands.filter((command) => {
        return !command.enabled;
    });
}

/**
 * Commands with the type of `type`
 * @param {Command[]} commands - Commands to filter
 * @param {string} type - Command type to match
 * @returns {Command[]}
 */
function commandsByType(commands, type) {
    return commands.filter((command) => {
        return command.type == type;
    });
}

/**
 * Command with a type included in `types`.
 * @param {Command[]} commands - Commands to filter
 * @param {string[]} types - Command types to match
 * @returns {Command[]}
 */
function commandsByTypes(commands, types) {
    const result = [];
    for (const type of types) {
        result.push(...commandsByType(commands, type));
    }
    return result;
}

/**
 * Lookup a command by id.
 * @param {Command[]} commands - Commands to filter
 * @param {string|number} id - ID of the command to lookup
 * @returns {Command}
 */
function filterById(commands, id) {
    return commands.filter((command) => command.id === id);
}

/**
 * Lookup a command by id.
 * @param {Command[]} commands - Commands to filter
 * @param {string|number} commandID - IDs of the commands to lookup
 * @returns {Command}
 */
function filterByIds(commands, ids) {
    return commands.filter((command) => ids.includes(command.id));
}

module.exports = {
    commandsByType,
    commandsByTypes,
    disabledCommands,
    enabledCommands,
    filterById,
    filterByIds,
    filterCommandsByQuery,
};
