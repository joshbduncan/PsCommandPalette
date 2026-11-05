/**
 * Normalizes a query for use as a query-latch key (see `user/History.ts`'s
 * `buildQueryLatches` and `query.ts`'s `scoreCommand`), so "blur", "Blur",
 * " blur", and "blur " are treated as the same learned query instead of
 * four distinct ones. Not used for the raw query stored per history entry -
 * that's kept verbatim (exactly as typed) for history-scroll recall/display.
 */
export function normalizeQuery(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, " ");
}
