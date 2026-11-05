/**
 * Canonical fuzzy subsequence match, shared by `query.ts` (filtering) and
 * `highlight.ts` (rendering) so a command's search result and its
 * highlighted characters always agree about what actually matched.
 * Previously each recomputed its own match independently - filtering
 * against `command.queryString` (a menu command's full path + name) while
 * highlighting matched only against `command.name` - so a query that
 * matched purely via a path component produced a visible result row with
 * zero highlighted characters.
 *
 * Matches `query` (whitespace stripped, case-insensitive) against `parts`
 * in order, treating them as one continuous string with no separator
 * between them - a part boundary never lets a query character skip ahead
 * without being consumed.
 *
 * Whitespace within `parts` is skipped explicitly, the same as it's
 * stripped from `query`, rather than left in as a character that happens
 * to never match anything (the query has no whitespace left to compare
 * against once stripped, so a command-side space could never match
 * regardless - but leaving that implicit made the two sides look
 * asymmetric and harder to reason about). Skipping in place, rather than
 * building a whitespace-stripped copy of each part, keeps every matched
 * index aligned with the original (unstripped) part text, which is what
 * `highlight.ts` needs to slice back out for rendering.
 */
export function matchQueryParts(
    parts: string[],
    query: string
): { matched: boolean; partMatches: boolean[][] } {
    const cleanQuery = query.replace(/\s/g, "").toLowerCase();
    const partMatches = parts.map((part) =>
        new Array<boolean>(part.length).fill(false)
    );

    let queryPos = 0;
    for (let p = 0; p < parts.length && queryPos < cleanQuery.length; p++) {
        const part = parts[p];
        for (let i = 0; i < part.length && queryPos < cleanQuery.length; i++) {
            const char = part[i];
            if (/\s/.test(char)) continue;
            if (char.toLowerCase() === cleanQuery[queryPos]) {
                partMatches[p][i] = true;
                queryPos++;
            }
        }
    }

    return { matched: queryPos === cleanQuery.length, partMatches };
}
