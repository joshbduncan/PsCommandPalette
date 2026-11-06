import { matchQueryParts } from "./matchQuery";

export type HighlightSegment = { text: string; matched: boolean };

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
 * Highlight segments for a command's title (`queryParts`'s last element is
 * always `command.name`).
 *
 * Prefers matching the query against the title on its own: the filter's
 * greedy left-to-right match over every part consumes the query in the
 * earliest part it fits, so for "New Artboard" (parts `Layer`, `New`,
 * `New Artboard`) the query "new" is spent on the `New` path component and
 * the title would get no highlight at all. Only when the query doesn't fit
 * in the title alone does this fall back to the title's slice of that
 * shared match - the right answer for a query that spans path and title
 * (e.g. "sel all" on Select > All highlights just "All").
 */
export function getTitleHighlightSegments(
    queryParts: string[],
    query: string
): HighlightSegment[] {
    const title = queryParts[queryParts.length - 1] ?? "";
    if (!query.replace(/\s/g, "")) {
        return [{ text: title, matched: false }];
    }
    const titleOnly = matchQueryParts([title], query);
    if (titleOnly.matched) {
        return toSegments(title, titleOnly.partMatches[0]);
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
