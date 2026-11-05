import * as uxp from "uxp";

import { atomicWriteJSON, recoverFromInterruptedWrite } from "../utils/atomicWriteJSON";
import { normalizeQuery } from "../utils/queryNormalize";
import { runMigrations } from "../utils/schemaMigration";
import { showAlert } from "../utils/showAlert";
import type { FSFile, FSFolder } from "../utils/uxpTypes";

const { storage } = uxp;
const fs = storage.localFileSystem;

const MAX_HISTORY_LENGTH = 1000;

export type HistoryEntry = {
    query: string;
    commandID: string;
    timestamp: number;
};

export const HISTORY_SCHEMA_VERSION = 1;

/** On-disk shape read/written by `load()`/`writeNow()` - `History.data` itself stays a plain `HistoryEntry[]`. */
type HistoryFile = {
    schemaVersion: number;
    updatedAt: number;
    entries: HistoryEntry[];
};

/**
 * Migrations for `runMigrations`, each keyed by the version it migrates
 * FROM. Add the next one here (keyed `HISTORY_SCHEMA_VERSION`, and bump
 * `HISTORY_SCHEMA_VERSION` itself) rather than reshaping the file in place.
 */
const HISTORY_MIGRATIONS: Record<number, (raw: any) => unknown> = {
    // Pre-versioning `history.json` was a bare `HistoryEntry[]` array with
    // no wrapper (and so no `schemaVersion` field to detect) at all.
    0: (raw: unknown): HistoryFile => ({
        schemaVersion: 1,
        updatedAt: Date.now(),
        entries: Array.isArray(raw) ? raw : [],
    }),
};

function migrateHistoryFile(raw: unknown): { data: HistoryFile; migrated: boolean } {
    return runMigrations<HistoryFile>(raw, HISTORY_SCHEMA_VERSION, HISTORY_MIGRATIONS);
}

/**
 * Ps Command Palette user history.
 */
export class History {
    data: HistoryEntry[] = [];
    latches: Record<string, string> | null = null;
    occurrencesLUT: Record<string, number> | null = null;
    recencyLUT: Map<string, number> | null = null;
    fileName = "history.json";
    file: FSFile | null = null;
    /**
     * NOT called by our own `write()` - see `User.onInvalidate` for why.
     */
    onInvalidate: (() => void) | null = null;
    private _dataFolder: FSFolder | null = null;
    /**
     * Serializes writes so concurrent `write()` calls (e.g. rapid-fire
     * `add()`s from quick successive command executions) never run
     * `atomicWriteJSON()` against the same .tmp/.bak filenames at the same
     * time - each write waits for the previous one to fully settle first.
     */
    private writeChain: Promise<void> = Promise.resolve();

    get commandIDs(): string[] {
        return [...new Set(this.data.map((entry) => entry.commandID))];
    }

    async getDataFolder(): Promise<FSFolder> {
        if (!this._dataFolder) {
            this._dataFolder = await fs.getDataFolder();
        }
        return this._dataFolder!;
    }

    /**
     * Validate history data structure and fix common issues.
     * @returns true if data was valid, false if corrections were made
     */
    validateData(): boolean {
        if (!Array.isArray(this.data)) {
            this.data = [];
            return false;
        }

        let isValid = true;
        const validEntries: HistoryEntry[] = [];

        for (const entry of this.data) {
            if (
                entry &&
                typeof entry === "object" &&
                typeof entry.commandID === "string" &&
                typeof entry.query === "string" &&
                typeof entry.timestamp === "number"
            ) {
                validEntries.push(entry);
            } else {
                console.warn("Invalid history entry removed:", entry);
                isValid = false;
            }
        }

        if (validEntries.length !== this.data.length) {
            this.data = validEntries;
            isValid = false;
        }

        return isValid;
    }

    async createBackupOnError(): Promise<void> {
        if (!this.file) return;
        try {
            const backupFile = await this.backup();
            if (backupFile) {
                await showAlert(
                    "User history error\n\nThere was an error reading your user history file so a backup was created. Use the command 'Open Plugin Data Folder' to view the backup file."
                );
            }
        } catch (backupError) {
            console.error("Failed to create history backup:", backupError);
        }
    }

    async load(): Promise<void> {
        console.log("Loading user history...");
        try {
            const dataFolder = await this.getDataFolder();
            this.file = (await dataFolder.getEntry(this.fileName)) as FSFile;
            const fileData = await this.file.read({ format: storage.formats.utf8 });
            const { data: file, migrated } = migrateHistoryFile(
                JSON.parse(fileData as string)
            );
            this.data = file.entries;

            if (!this.validateData()) {
                console.warn("History validation failed, saving corrected version");
                await this.write();
            } else if (migrated) {
                console.warn("History upgraded to the current schema, saving...");
                await this.write(true);
            }
        } catch (error: any) {
            if (error.code === "ENOENT" || error.name === "EntryNotFoundError") {
                console.log(
                    "History file not found, checking for an interrupted-write recovery candidate..."
                );
                const recovered = await recoverFromInterruptedWrite(
                    await this.getDataFolder(),
                    this.fileName
                );
                let recoveredRaw: unknown = null;
                try {
                    recoveredRaw = recovered ? JSON.parse(recovered) : null;
                } catch {
                    recoveredRaw = null;
                }

                if (recoveredRaw && typeof recoveredRaw === "object") {
                    console.warn(
                        "Recovered history from a `.bak`/`.tmp` file left by an interrupted write."
                    );
                    this.data = migrateHistoryFile(recoveredRaw).data.entries;
                    this.validateData();
                    await this.write(true);
                } else {
                    console.log(
                        "No recovery candidate found, starting with empty history"
                    );
                    this.data = [];
                }
            } else if (error instanceof SyntaxError) {
                console.error("History file corrupted (JSON parse error):", error);
                await this.createBackupOnError();
                this.data = [];
            } else {
                console.error("History load error:", error);
                await this.createBackupOnError();
                this.data = [];
            }
        }

        // Always rebuild lookup tables after loading
        this.buildQueryLatches();
        this.buildRecencyLUT();
        this.buildOccurrencesLUT();
    }

    /**
     * Build a lookup table assigning scores based on history position (most
     * recent = highest). `this.data` is stored newest-first, so the FIRST
     * occurrence of a commandID encountered while iterating forward is its
     * most recent use, and should win.
     */
    buildRecencyLUT(): void {
        const lut = new Map<string, number>();
        for (let i = 0; i < this.data.length; i++) {
            const { commandID } = this.data[i];
            if (!lut.has(commandID)) {
                lut.set(commandID, this.data.length - i);
            }
        }
        this.recencyLUT = lut;
    }

    /**
     * Build a lookup table of total occurrences of each command in the history.
     */
    buildOccurrencesLUT(): void {
        this.occurrencesLUT = this.data.reduce(
            (obj: Record<string, number>, { commandID }) => {
                obj[commandID] = (obj[commandID] || 0) + 1;
                return obj;
            },
            {}
        );
    }

    /**
     * Determines the most frequently associated commandID for each query in
     * the history. If multiple commandIDs have the same frequency, the one
     * that appears first (most recent) takes precedence. Keyed by
     * `normalizeQuery(query)` rather than the raw stored query, so "blur",
     * "Blur", and " blur " all latch to the same commandID instead of being
     * tracked as separate queries.
     */
    buildQueryLatches(): void {
        const queryMap = new Map<string, Map<string, number>>();
        for (const { query, commandID } of this.data) {
            const normalizedQuery = normalizeQuery(query);
            // skip commands ran from startupCommands (empty/whitespace-only query)
            if (normalizedQuery === "") continue;
            if (!queryMap.has(normalizedQuery)) {
                queryMap.set(normalizedQuery, new Map());
            }
            const cmdMap = queryMap.get(normalizedQuery)!;
            cmdMap.set(commandID, (cmdMap.get(commandID) || 0) + 1);
        }

        const latches: Record<string, string> = {};

        for (const [query, cmdMap] of queryMap.entries()) {
            let maxCount = -1;
            let mostFrequentCommand: string | null = null;

            for (const [commandID, count] of cmdMap.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    mostFrequentCommand = commandID;
                }
            }
            if (mostFrequentCommand) {
                latches[query] = mostFrequentCommand;
            }
        }

        this.latches = latches;
    }

    /**
     * Reload all user history from disk.
     */
    async reload(): Promise<void> {
        this.data = [];
        this.latches = null;
        this.occurrencesLUT = null;
        this.recencyLUT = null;
        this.file = null;
        this._dataFolder = null;
        await this.load();
    }

    /**
     * Write user history to disk using atomic write with backup. Queued
     * behind any write already in progress - see `writeChain`.
     * @param force - write even if `data` is empty. Used by `clear()` so an
     * intentional clear actually reaches disk; the empty-data guard otherwise
     * exists to avoid clobbering good on-disk data with an accidentally-empty
     * in-memory state.
     */
    write(force = false): Promise<void> {
        const run = this.writeChain.then(
            () => this.writeNow(force),
            () => this.writeNow(force) // previous write failed - still attempt this one
        );
        // Never let the shared chain itself become a rejected promise, or
        // every write queued after a failure would be silently skipped.
        this.writeChain = run.catch(() => {});
        return run;
    }

    private async writeNow(force: boolean): Promise<void> {
        if (
            !force &&
            (!this.data || !Array.isArray(this.data) || this.data.length === 0)
        ) {
            return;
        }

        if (!this.validateData()) {
            console.warn(
                "History data validation failed during write, using corrected data"
            );
        }

        console.log("Writing user history");
        try {
            const dataFolder = await this.getDataFolder();

            // Snapshot `this.data` now (not whenever this write actually
            // reaches the front of the queue) - by the time it's our turn,
            // `this.data` already reflects every add() that happened before
            // us anyway, since mutation is synchronous.
            const dataToWrite: HistoryFile = {
                schemaVersion: HISTORY_SCHEMA_VERSION,
                updatedAt: Date.now(),
                entries: [...this.data],
            };

            this.file = await atomicWriteJSON(
                dataFolder,
                this.fileName,
                dataToWrite,
                this.file
            );

            // Rebuild lookup tables after successful write
            this.buildQueryLatches();
            this.buildRecencyLUT();
            this.buildOccurrencesLUT();

            console.log("History data written successfully");
            // Deliberately not calling onInvalidate() here - this instance's
            // in-memory data/lookup tables are already the freshest possible
            // state (we just wrote them), so scheduling a reload from disk
            // would only discard that state and re-read what we just wrote.
            // onInvalidate is reserved for a future actual-external-edit
            // detector, not "we wrote, so we must be stale."
        } catch (error) {
            console.error("History data write failed:", error);
            await showAlert(
                "User history error\n\nThere was an error writing your user history file."
            );
            throw error;
        }
    }

    /**
     * Backup the user history file.
     */
    async backup(): Promise<FSFile | undefined> {
        if (!this.file) return;

        try {
            const dataFolder = await this.getDataFolder();
            const f = this.file;
            const backupName = `${f.name}.bak`;

            await dataFolder.renameEntry(f, backupName, { overwrite: true });
            console.log(`Backing up user history file to ${f.nativePath}.`);

            return f;
        } catch (error) {
            console.error(error);
            await showAlert(
                "User history error\n\nAn error occurred while backing up your user history file."
            );
        }
    }

    /**
     * Add an item to the user command history. Returns the write's promise
     * so callers can await/catch it - `write()`'s internal queue is what
     * actually prevents concurrent `add()`s from racing each other's files.
     */
    add(query: string, commandID: string): Promise<void> {
        this.data.unshift({
            query,
            commandID,
            timestamp: Date.now(),
        });

        if (this.data.length > MAX_HISTORY_LENGTH) {
            this.data = this.data.slice(0, MAX_HISTORY_LENGTH);
        }

        return this.write();
    }

    /**
     * Clear all history, on disk and in memory.
     */
    async clear(): Promise<void> {
        this.data = [];
        // force:true - write()'s empty-data guard would otherwise silently skip
        // this write, and a subsequent reload() would then read the stale file
        // straight back into memory (the vanilla plugin's "Clear History" was a
        // no-op on disk because of this).
        await this.write(true);
        await showAlert("History cleared!");
    }
}

// Explicit singleton, replacing the vanilla plugin's `const HISTORY = new
// History()` implicit-global pattern (main.js declared it, other files read
// it by bare name with no import). Import `{ history }` from this module.
export const history = new History();
