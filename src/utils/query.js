const { sortCommandsByOccurrence } = require("./commands");

/**
 * @typedef {Object} CommandFilter
 * @property {string[]} types - Command types to filter for.
 * @property {boolean} disabled - Whether disabled commands should be included. Defaults to false.
 * @property {boolean} hidden - Whether user-hidden commands should be included. Defaults to false.
 */

// Scoring constants for query matching
const SCORING = {
    PREFIX_BOOST: 1,
    EXACT_WORD_BOOST: 2,
    EXACT_NAME_BOOST: 5,
    LATCHED_QUERY_BOOST: 10,
    FREQUENT_COMMAND_BOOST: 2.5,
};

/**
 * Filters commands based on query and filters.
 * @param {string} query - Query string to filter against.
 * @param {Command[]} commands - Commands to filter.
 * @param {CommandFilter} filters - Filter options.
 * @returns {Command[]} Filtered and sorted commands.
 */
function filterCommandsByQuery(query, commands, filters = {}) {
    // Input validation
    if (!Array.isArray(commands)) {
        console.warn("filterCommandsByQuery: commands must be an array");
        return [];
    }

    if (typeof query !== "string") {
        console.warn("filterCommandsByQuery: query must be a string");
        query = "";
    }

    if (typeof filters !== "object" || filters === null) {
        console.warn("filterCommandsByQuery: filters must be an object");
        filters = {};
    }
    /**
     * Determines if a command matches a fuzzy query.
     * @param {Command} command - Command to test.
     * @param {string} query - Query string to match.
     * @returns {boolean} Whether the command matches the query.
     */
    function fuzzyMatch(command, query) {
        const cleanQuery = query.replace(/\s/g, "").toLowerCase();
        const queryString = command.queryString.toLowerCase();
        let queryPos = 0;

        for (let i = 0; i < queryString.length && queryPos < cleanQuery.length; i++) {
            if (queryString[i] === cleanQuery[queryPos]) {
                queryPos++;
            }
        }

        return queryPos === cleanQuery.length;
    }

    /**
     * Returns a scoring function to sort commands by relevance. Matches closer to the start of the name are given higher weight, with an extra boost for exact prefix matches.
     * @param {string} query - Query used to score matches.
     * @returns {(a: { name: string }, b: { name: string }) => number} Scoring comparator.
     */
    function scoreMatches(query) {
        const lowerQuery = query.toLowerCase();
        const queryChunks = lowerQuery.split(/\s+/); // split query into an array

        /**
         * Counts weighted matches between a query and command string. Matches earlier in the name are given higher weight.
         * @param {string} queryString - Command query string.
         * @returns {number} Weighted match score.
         */
        const countMatches = (queryString) => {
            const lowerCommandString = queryString.toLowerCase();
            const commandQueryStringChunks = lowerCommandString.split(/\s+/);

            let totalScore = 0;

            for (const queryChunk of queryChunks) {
                for (let index = 0; index < commandQueryStringChunks.length; index++) {
                    const commandQueryStringChunk = commandQueryStringChunks[index];

                    if (commandQueryStringChunk.includes(queryChunk)) {
                        let weight = 1 / (index + 1); // base weight: earlier chunks matter more

                        if (commandQueryStringChunk.startsWith(queryChunk)) {
                            weight += SCORING.PREFIX_BOOST; // extra boost for exact prefix matches
                        }

                        if (commandQueryStringChunk === queryChunk) {
                            weight += SCORING.EXACT_WORD_BOOST; // extra boost for exact chunk/word matches
                        }

                        totalScore += weight;
                    }
                }
            }

            return totalScore;
        };

        // Pre-calculate expensive values once
        const historySize = HISTORY.recencyLUT?.size || 1;
        const latchedCommandId = HISTORY.latches?.[query];
        const occurrencesLUT = HISTORY.occurrencesLUT || {};
        const recencyLUT = HISTORY.recencyLUT || new Map();

        const scoreMatch = (command) => {
            // calculate base score for query chunk matches
            let score = countMatches(command.queryString);

            // boost for exact match (use cached lowerQuery)
            if (command.name.toLowerCase() === lowerQuery) {
                score += SCORING.EXACT_NAME_BOOST;
            }

            // boost for latched query (use cached latchedCommandId)
            if (latchedCommandId === command.id) {
                score += SCORING.LATCHED_QUERY_BOOST;
            }

            // boost for recent command (use cached recencyLUT and historySize)
            const recencyScore = recencyLUT.get(command.id);
            if (recencyScore) {
                score += recencyScore / historySize;
            }

            // boost for often used command (use cached occurrencesLUT)
            if (occurrencesLUT[command.id]) {
                score += SCORING.FREQUENT_COMMAND_BOOST;
            }

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

    // Combine all filters in a single pass for better performance
    const typeSet =
        filters.types && filters.types.length > 0 ? new Set(filters.types) : null;
    const hiddenCommands =
        !filters.hidden && USER.data?.hiddenCommands
            ? new Set(USER.data.hiddenCommands)
            : null;

    let matches = commands.filter((command) => {
        // Type filter
        if (typeSet && !typeSet.has(command.type)) {
            return false;
        }

        // Hidden commands filter
        if (hiddenCommands && hiddenCommands.has(command.id)) {
            return false;
        }

        // Disabled commands filter (when implemented)
        if (!filters.disabled && !command.enabled) {
            return false;
        }

        return true;
    });

    // fuzzy match by query and sort by chunk matches
    if (query !== "") {
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
 * Returns only enabled commands.
 * @param {Command[]} commands - Commands to filter.
 * @returns {Command[]} Enabled commands.
 */
function enabledCommands(commands) {
    if (!Array.isArray(commands)) {
        console.warn("enabledCommands: commands must be an array");
        return [];
    }
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
    if (!Array.isArray(commands)) {
        console.warn("disabledCommands: commands must be an array");
        return [];
    }
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
    if (!Array.isArray(commands)) {
        console.warn("commandsByType: commands must be an array");
        return [];
    }
    if (typeof type !== "string") {
        console.warn("commandsByType: type must be a string");
        return [];
    }
    return commands.filter((command) => {
        return command.type === type;
    });
}

/**
 * Returns commands with a type included in the `types` array.
 * @param {Command[]} commands - Commands to filter.
 * @param {string[]} types - Command types to match.
 * @returns {Command[]} Filtered commands.
 */
function commandsByTypes(commands, types) {
    if (!Array.isArray(commands)) {
        console.warn("commandsByTypes: commands must be an array");
        return [];
    }
    if (!Array.isArray(types)) {
        console.warn("commandsByTypes: types must be an array");
        return [];
    }
    const typeSet = new Set(types);
    return commands.filter((command) => typeSet.has(command.type));
}

/**
 * Finds a command by ID.
 * @param {Command[]} commands - Commands to filter.
 * @param {string|number} id - ID of the command to find.
 * @returns {Command[]} Matching command(s).
 */
function filterById(commands, id) {
    if (!Array.isArray(commands)) {
        console.warn("filterById: commands must be an array");
        return [];
    }
    if (id === null || id === undefined) {
        console.warn("filterById: id cannot be null or undefined");
        return [];
    }
    return commands.filter((command) => command.id === id);
}

/**
 * Finds commands by a list of IDs.
 * @param {Command[]} commands - Commands to filter.
 * @param {string[]|number[]} ids - IDs of the commands to find.
 * @returns {Command[]} Matching commands.
 */
function filterByIds(commands, ids) {
    if (!Array.isArray(commands)) {
        console.warn("filterByIds: commands must be an array");
        return [];
    }
    if (!Array.isArray(ids)) {
        console.warn("filterByIds: ids must be an array");
        return [];
    }
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
