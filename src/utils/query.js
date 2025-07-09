const { sortCommandsByOccurrence } = require("./commands");

/**
 * @typedef {Object} CommandFilter
 * @property {string[]} types - Command types to filter for.
 * @property {boolean} disabled - Whether disabled commands should be included. Defaults to false.
 * @property {boolean} hidden - Whether user-hidden commands should be included. Defaults to false.
 */

/**
 * Filters commands based on query and filters.
 * @param {string} query - Query string to filter against.
 * @param {Command[]} commands - Commands to filter.
 * @param {CommandFilter} filters - Filter options.
 * @returns {Command[]} Filtered and sorted commands.
 */
function filterCommandsByQuery(query, commands, filters = {}) {
    /**
     * Determines if a command matches a fuzzy query.
     * @param {Command} command - Command to test.
     * @param {string} query - Query string to match.
     * @returns {boolean} Whether the command matches the query.
     */
    function fuzzyMatch(command, query) {
        const cleanQuery = query.replace(/\s/g, "").toLowerCase();
        const tokens = command.queryString.split("");
        let pos = 0;

        // old code that highlighted matching tokens in the command name
        // since commands are now matched on their queryString they command name
        // and query string may no longer match leading to errors

        // const highlightedTokens = tokens.map((token) => {
        //     if (pos < cleanQuery.length && token.toLowerCase() === cleanQuery[pos]) {
        //         pos++;
        //         return `<strong>${token}</strong>`;
        //     }
        //     return token;
        // });

        // if (pos < cleanQuery.length) return false; // No full match, exit early

        // command.addQueryHighlights(highlightedTokens.join(""));
        // return true;

        for (let i = 0; i < tokens.length && pos < cleanQuery.length; i++) {
            if (tokens[i].toLowerCase() === cleanQuery[pos]) {
                pos++;
            }
        }

        return pos === cleanQuery.length;
    }

    /**
     * Returns a scoring function to sort commands by relevance. Matches closer to the start of the name are given higher weight, with an extra boost for exact prefix matches.
     * @param {string} query - Query used to score matches.
     * @returns {(a: { name: string }, b: { name: string }) => number} Scoring comparator.
     */
    function scoreMatches(query) {
        const queryChunks = query.toLowerCase().split(/\s+/); // split query into an array

        /**
         * Counts weighted matches between a query and command string. Matches earlier in the name are given higher weight.
         * @param {string} queryString - Command query string.
         * @returns {number} Weighted match score.
         */
        const countMatches = (queryString) => {
            const commandQueryStringChunks = queryString.toLowerCase().split(/\s+/);

            return queryChunks.reduce((count, queryChunk) => {
                return (
                    count +
                    commandQueryStringChunks.reduce(
                        (total, commandQueryStringChunk, index) => {
                            if (commandQueryStringChunk.includes(queryChunk)) {
                                let weight = 1 / (index + 1); // base weight: earlier chunks matter more
                                if (commandQueryStringChunk.startsWith(queryChunk)) {
                                    weight += 1; // extra boost for exact prefix matches
                                }
                                if (commandQueryStringChunk == queryChunk) {
                                    weight += 2; // extra boost for exact chunk/word matches
                                }
                                total += weight;
                            }
                            return total;
                        },
                        0
                    )
                );
            }, 0);
        };

        const scoreMatch = (command) => {
            // calculate base score for query chunk matches
            let score = countMatches(command.queryString);

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
         * Comparator function to sort commands by match score.
         * @param {{ name: string }} a - First command to compare.
         * @param {{ name: string }} b - Second command to compare.
         * @returns {number} Sorting value.
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
        // matches.forEach((cmd) => cmd.removeQueryHighlights());
    }

    return matches;
}

/**
 * Returns only enabled commands.
 * @param {Command[]} commands - Commands to filter.
 * @returns {Command[]} Enabled commands.
 */
function enabledCommands(commands) {
    return commands.filter((command) => {
        return command.enabled;
    });
}

/**
 * Returns only disabled commands.
 * @param {Command[]} commands - Commands to filter.
 * @returns {Command[]} Disabled commands.
 */
function disabledCommands(commands) {
    return commands.filter((command) => {
        return !command.enabled;
    });
}

/**
 * Returns commands that match a specific type.
 * @param {Command[]} commands - Commands to filter.
 * @param {string} type - Command type to match.
 * @returns {Command[]} Filtered commands of the specified type.
 */
function commandsByType(commands, type) {
    return commands.filter((command) => {
        return command.type == type;
    });
}

/**
 * Returns commands with a type included in the `types` array.
 * @param {Command[]} commands - Commands to filter.
 * @param {string[]} types - Command types to match.
 * @returns {Command[]} Filtered commands.
 */
function commandsByTypes(commands, types) {
    const result = [];
    for (const type of types) {
        result.push(...commandsByType(commands, type));
    }
    return result;
}

/**
 * Finds a command by ID.
 * @param {Command[]} commands - Commands to filter.
 * @param {string|number} id - ID of the command to find.
 * @returns {Command[]} Matching command(s).
 */
function filterById(commands, id) {
    return commands.filter((command) => command.id === id);
}

/**
 * Finds commands by a list of IDs.
 * @param {Command[]} commands - Commands to filter.
 * @param {string[]|number[]} ids - IDs of the commands to find.
 * @returns {Command[]} Matching commands.
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
