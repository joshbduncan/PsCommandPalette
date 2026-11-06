import type { Command } from "../commands/Command";
import type { CommandType } from "../commands/types";
import { sortCommandsByOccurrence } from "./commands";
import { matchQueryParts } from "./matchQuery";
import { normalizeQuery } from "./queryNormalize";
import { user as defaultUser, type User } from "../user/User";
import { history as defaultHistory, type History } from "../user/History";

export type CommandFilter = {
    /** Command types to filter for. */
    types?: CommandType[];
    /** Whether disabled commands should be included. Defaults to false. */
    disabled?: boolean;
    /** Whether user-hidden commands should be included. Defaults to false. */
    hidden?: boolean;
};

export type QueryContext = {
    user: User;
    history: History;
};

// Scoring constants for query matching
const SCORING = {
    PREFIX_BOOST: 1,
    EXACT_WORD_BOOST: 2,
    EXACT_NAME_BOOST: 5,
    LATCHED_QUERY_BOOST: 10,
    /** Boost for the most recently run command, scaled down linearly for older ones. */
    RECENCY_BOOST_MAX: 1,
    /** Ceiling for the "previously used" boost below - never exceeded, however often a command has run. */
    PREVIOUSLY_USED_BOOST_MAX: 2.5,
    /** Occurrence count at which the boost reaches its ceiling. */
    PREVIOUSLY_USED_SATURATION: 50,
};

/**
 * Determines if a command matches a fuzzy query. Delegates to
 * `matchQueryParts` (shared with `highlight.ts`) so highlighting can
 * reflect exactly what this filter matched, rather than recomputing an
 * independent (and potentially inconsistent) match later.
 */
function fuzzyMatch(command: Command, query: string): boolean {
    return matchQueryParts(command.queryParts, query).matched;
}

/**
 * Returns a function scoring a single command's relevance to `query`.
 * Matches closer to the start of the name are given higher weight, with an
 * extra boost for exact prefix matches. Called once per candidate (see
 * `filterCommandsByQuery`) rather than from inside a sort comparator, which
 * would call it O(n log n) times over the same unchanging inputs.
 */
function scoreCommand(query: string, { history }: QueryContext) {
    const lowerQuery = query.toLowerCase();
    const queryChunks = lowerQuery.split(/\s+/); // split query into an array

    /**
     * Counts weighted matches between a query and a command's precomputed
     * lowercase chunks. Matches earlier in the name are given higher weight.
     */
    const countMatches = (commandQueryStringChunks: string[]): number => {
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
    // recencyLUT values run from 1 (oldest entry) up to history.data.length
    // (newest), so divide by the entry count - not the number of unique
    // commands, which let the boost grow with history length and outrank an
    // exact name match.
    const historyLength = history.data.length || 1;
    const latchedCommandId = history.latches?.[normalizeQuery(query)];
    const occurrencesLUT = history.occurrencesLUT || {};
    const recencyLUT = history.recencyLUT || new Map<string, number>();

    return (command: Command): number => {
        // calculate base score for query chunk matches
        let score = countMatches(command.queryStringChunksLower);

        // boost for exact match (use cached lowerQuery/nameLower)
        if (command.nameLower === lowerQuery) {
            score += SCORING.EXACT_NAME_BOOST;
        }

        // boost for latched query (use cached latchedCommandId)
        if (latchedCommandId === command.id) {
            score += SCORING.LATCHED_QUERY_BOOST;
        }

        // boost for recent command (use cached recencyLUT and historyLength)
        const recencyScore = recencyLUT.get(command.id);
        if (recencyScore) {
            score += SCORING.RECENCY_BOOST_MAX * (recencyScore / historyLength);
        }

        // boost for previously used command (use cached occurrencesLUT) -
        // log2 so a command run once and one run 200 times aren't scored
        // identically, but bounded (capped at PREVIOUSLY_USED_BOOST_MAX,
        // reached once occurrences hit PREVIOUSLY_USED_SATURATION) so heavy
        // usage still can't drown out text relevance.
        const occurrenceCount = occurrencesLUT[command.id] || 0;
        if (occurrenceCount > 0) {
            score +=
                SCORING.PREVIOUSLY_USED_BOOST_MAX *
                Math.min(
                    1,
                    Math.log2(occurrenceCount + 1) /
                        Math.log2(SCORING.PREVIOUSLY_USED_SATURATION + 1)
                );
        }

        return score;
    };
}

/**
 * Deterministic tie-breaker for commands with an identical score - without
 * this, equal-scoring commands kept whatever order `commands` happened to
 * arrive in (e.g. command-type load order), which isn't meaningful and
 * isn't guaranteed stable across runs.
 */
function compareTies(a: Command, b: Command): number {
    return (
        a.name.localeCompare(b.name) ||
        a.type.localeCompare(b.type) ||
        a.id.localeCompare(b.id)
    );
}

/**
 * Sorts `commands` by relevance to `query`, descending. Scores each command
 * exactly once up front (as `{ command, score, originalIndex }` records)
 * instead of recomputing them from inside the sort comparator.
 */
function sortByRelevance(
    commands: Command[],
    query: string,
    context: QueryContext
): Command[] {
    const scoreCandidate = scoreCommand(query, context);

    return commands
        .map((command, originalIndex) => ({
            command,
            score: scoreCandidate(command),
            originalIndex,
        }))
        .sort((a, b) => b.score - a.score || compareTies(a.command, b.command))
        .map((record) => record.command);
}

/**
 * Filters commands based on query and filters.
 */
export function filterCommandsByQuery(
    query: string,
    commands: Command[],
    filters: CommandFilter = {},
    context: QueryContext = { user: defaultUser, history: defaultHistory }
): Command[] {
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

    const { user, history } = context;

    // Combine all filters in a single pass for better performance
    const typeSet =
        filters.types && filters.types.length > 0 ? new Set(filters.types) : null;
    const hiddenCommands =
        !filters.hidden && user.data?.settings.hiddenCommands
            ? new Set(user.data.settings.hiddenCommands)
            : null;
    const disabledTypes =
        user.data?.settings.disabledCommandTypes &&
        user.data.settings.disabledCommandTypes.length > 0
            ? new Set(user.data.settings.disabledCommandTypes)
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

        // Disabled command types filter - excluded even under an explicit
        // `#type` scope, same as a hidden command staying hidden regardless
        // of `filters.types`.
        if (disabledTypes && disabledTypes.has(command.type)) {
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
        matches = sortByRelevance(
            matches.filter((command) => fuzzyMatch(command, query)),
            query,
            context
        );
    } else {
        // TODO: sort by most used or most recent
        matches = sortCommandsByOccurrence(matches, history);
    }

    return matches;
}

/**
 * Finds commands by a list of IDs, returned in `ids`' order (not
 * `commands`' order) - `ids` is typically a user-arranged list (e.g.
 * `user.data.startupCommands`), so preserving its order rather than
 * whatever order the full command store happens to hold is what callers
 * actually want. Duplicate/unmatched IDs are silently skipped.
 */
export function filterByIds(commands: Command[], ids: string[]): Command[] {
    if (!Array.isArray(commands)) {
        console.warn("filterByIds: commands must be an array");
        return [];
    }
    if (!Array.isArray(ids)) {
        console.warn("filterByIds: ids must be an array");
        return [];
    }

    const commandsById = new Map(commands.map((command) => [command.id, command]));
    const seen = new Set<string>();
    const result: Command[] = [];

    for (const id of ids) {
        if (seen.has(id)) continue;
        const command = commandsById.get(id);
        if (command) {
            seen.add(id);
            result.push(command);
        }
    }

    return result;
}
