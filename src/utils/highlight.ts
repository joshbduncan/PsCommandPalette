import { matchQueryParts } from "./matchQuery";

export type HighlightSegment = { text: string; matched: boolean };

/**
 * The vanilla plugin had `Command.addQueryHighlights()`/
 * `removeQueryHighlights()` for this (imperative innerHTML mutation) but
 * never actually called them from anywhere - this is a genuinely new,
 * wired-up feature, not a straight port.
 */

/** Group a per-character matched-flag array into contiguous runs for rendering `<strong>` around matched characters. */
function toSegments(text: string, matchedChars: boolean[]): HighlightSegment[] {
    if (text.length === 0) return [{ text: "", matched: false }];

    const segments: HighlightSegment[] = [];
    let segmentStart = 0;
    let segmentMatched = matchedChars[0] ?? false;

    for (let i = 1; i < text.length; i++) {
        const isMatch = matchedChars[i] ?? false;
        if (isMatch !== segmentMatched) {
            segments.push({
                text: text.slice(segmentStart, i),
                matched: segmentMatched,
            });
            segmentStart = i;
            segmentMatched = isMatch;
        }
    }

    segments.push({ text: text.slice(segmentStart), matched: segmentMatched });
    return segments;
}

/**
 * Highlight segments for a command's title. Uses the same
 * `matchQueryParts` match `fuzzyMatch` uses for filtering (see
 * `query.ts`/`matchQuery.ts`) rather than an independent re-match against
 * the title alone - `queryParts`'s last element is always `command.name`,
 * so slicing out its portion of the shared match reflects exactly whether
 * (and where) the query landed in the title versus elsewhere, e.g. a menu
 * path component. Previously a query that matched purely via the path
 * produced a visible result row with zero highlighted title characters.
 */
export function getTitleHighlightSegments(
    queryParts: string[],
    query: string
): HighlightSegment[] {
    const title = queryParts[queryParts.length - 1] ?? "";
    if (!query.replace(/\s/g, "")) {
        return [{ text: title, matched: false }];
    }
    const { partMatches } = matchQueryParts(queryParts, query);
    return toSegments(title, partMatches[partMatches.length - 1] ?? []);
}

/**
 * Highlight segments for a command's description (e.g. a menu path).
 * Matched independently against the description text itself, split on the
 * " > " convention every description that has one uses - the description
 * isn't reliably reconstructable from `queryParts` verbatim (e.g.
 * `MenuCommand`'s description keeps the raw, un-cleaned leaf title, while
 * `queryParts` substitutes the cleaned command name), so this can't reuse
 * the title's exact match positions. It still runs through the same
 * canonical `matchQueryParts` algorithm.
 */
export function getDescriptionHighlightSegments(
    description: string,
    query: string
): HighlightSegment[] {
    if (!description || !query.replace(/\s/g, "")) {
        return [{ text: description, matched: false }];
    }

    const parts = description.split(" > ");
    const { partMatches } = matchQueryParts(parts, query);

    const segments: HighlightSegment[] = [];
    parts.forEach((part, i) => {
        if (i > 0) segments.push({ text: " > ", matched: false });
        segments.push(...toSegments(part, partMatches[i]));
    });
    return segments;
}
