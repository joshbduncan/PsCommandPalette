/**
 * Shared step-by-step schema migration runner for `User`/`History`'s
 * persisted files (see their `*_SCHEMA_VERSION`/`*_MIGRATIONS` constants).
 * Every on-disk file written before schema versioning existed has no
 * `schemaVersion` field at all, so a missing field is treated as version 0
 * - the implicit starting point every legacy file migrates from.
 */

export type Migration<T> = (raw: any) => T;

/**
 * Runs `migrations` (each keyed by the version it migrates FROM) starting
 * at `raw`'s own version, one step at a time, until reaching
 * `targetVersion` or hitting a version with no registered migration (in
 * which case the caller's own `validateData()`-style repair is left to
 * patch up whatever shape remains, same as it already does for a
 * same-version file with malformed fields).
 *
 * @returns the migrated value, and whether any migration actually ran (so
 * callers can decide whether the upgraded shape needs to be persisted back
 * to disk immediately, instead of silently re-migrating on every future load).
 */
export function runMigrations<T extends { schemaVersion: number }>(
    raw: unknown,
    targetVersion: number,
    migrations: Record<number, Migration<unknown>>
): { data: T; migrated: boolean } {
    let version =
        typeof (raw as { schemaVersion?: unknown })?.schemaVersion === "number"
            ? (raw as { schemaVersion: number }).schemaVersion
            : 0;
    let value: unknown = raw;
    let migrated = false;

    while (version < targetVersion) {
        const migrate = migrations[version];
        if (!migrate) break;
        value = migrate(value);
        migrated = true;
        version =
            typeof (value as { schemaVersion?: unknown })?.schemaVersion === "number"
                ? (value as { schemaVersion: number }).schemaVersion
                : version + 1;
    }

    return { data: value as T, migrated };
}
