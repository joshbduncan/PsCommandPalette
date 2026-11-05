import * as uxp from "uxp";

import { atomicWriteJSON, recoverFromInterruptedWrite } from "../utils/atomicWriteJSON";
import { runMigrations } from "../utils/schemaMigration";
import { showAlert } from "../utils/showAlert";
import type { FSFile, FSFolder } from "../utils/uxpTypes";
import {
    ABOUT_PLUGIN_COMMAND_ID,
    BookmarkCommandTypes,
    CommandTypes,
} from "../commands/types";

const { shell, storage } = uxp;
const fs = storage.localFileSystem;

export type BookmarkRecord = {
    id: string;
    name: string;
    path: string;
    type: "file" | "folder";
    token: string;
};

/**
 * One selectable entry in a picker's sub-palette. A discriminated union so a
 * `PickerRecord` can represent what selecting the entry actually *does* -
 * run an existing global command, hand back a literal value, or descend
 * into another picker - rather than every entry implicitly meaning the same
 * hard-coded action (see `PickerCommand.execute()`).
 */
export type PickerItem =
    | { kind: "command"; commandId: string; label?: string }
    | { kind: "value"; value: string; label: string }
    | { kind: "picker"; pickerId: string; label?: string };

// TODO: build a UI picker builder - there's currently no way for a user to
// actually create/edit a PickerRecord; `user.data.pickers` can only be
// populated by hand-editing user.json.
export type PickerRecord = {
    id: string;
    name: string;
    description?: string;
    items: PickerItem[];
};

export type Settings = {
    disabledCommandTypes: string[];
    hiddenCommands: string[];
    startupCommands: string[];
};

/** Live, in-memory shape held by `User.data` - no persistence envelope (see `UserFile`). */
export type UserData = {
    settings: Settings;
    bookmarks: BookmarkRecord[];
    pickers: PickerRecord[];
};

export const USER_SCHEMA_VERSION = 2;

/** On-disk shape read/written by `load()`/`writeNow()`. */
export type UserFile = UserData & {
    schemaVersion: number;
    updatedAt: number;
};

/**
 * Migrations for `runMigrations`, each keyed by the version it migrates
 * FROM. Add the next one here (keyed `USER_SCHEMA_VERSION`, and bump
 * `USER_SCHEMA_VERSION` itself) rather than reshaping `UserData` in place -
 * that's what leaves existing users' `user.json` unreadable/silently reset.
 */
const USER_MIGRATIONS: Record<number, (raw: any) => unknown> = {
    // Pre-versioning `user.json` had no `schemaVersion` field at all,
    // `disabledCommandTypes`/`hiddenCommands`/`startupCommands` flat at the
    // top level (now grouped under `settings`), and `plugin`/`app`
    // version-stamp fields that only ever duplicated `host.ts`'s live info -
    // dropped rather than migrated, since nothing ever read them back.
    0: (raw: {
        bookmarks?: unknown;
        disabledCommandTypes?: unknown;
        hiddenCommands?: unknown;
        pickers?: unknown;
        startupCommands?: unknown;
    }): UserFile => ({
        schemaVersion: 1,
        updatedAt: Date.now(),
        settings: {
            disabledCommandTypes: Array.isArray(raw?.disabledCommandTypes)
                ? raw.disabledCommandTypes
                : [],
            hiddenCommands: Array.isArray(raw?.hiddenCommands)
                ? raw.hiddenCommands
                : [],
            startupCommands: Array.isArray(raw?.startupCommands)
                ? raw.startupCommands
                : [],
        },
        bookmarks: Array.isArray(raw?.bookmarks) ? raw.bookmarks : [],
        pickers: Array.isArray(raw?.pickers) ? raw.pickers : [],
    }),
    // v1 pickers held a flat `commands: {id, name, description?}[]` list,
    // every entry implicitly running the same hard-coded demo callback
    // (see PickerCommand.ts). Recast each as a `kind: "value"` PickerItem -
    // the closest equivalent to that demo behavior - using the old entry's
    // `id` as the literal value and `name` as its display label.
    1: (raw: {
        pickers?: Array<{
            id: string;
            name: string;
            description?: string;
            commands?: Array<{ id: string; name: string; description?: string }>;
        }>;
    }): UserFile => ({
        ...(raw as unknown as UserFile),
        schemaVersion: 2,
        updatedAt: Date.now(),
        pickers: Array.isArray(raw?.pickers)
            ? raw.pickers.map((picker) => ({
                  id: picker.id,
                  name: picker.name,
                  description: picker.description,
                  items: Array.isArray(picker.commands)
                      ? picker.commands.map((c): PickerItem => ({
                            kind: "value",
                            value: c.id,
                            label: c.name,
                        }))
                      : [],
              }))
            : [],
    }),
};

function migrateUserFile(raw: unknown): { data: UserFile; migrated: boolean } {
    return runMigrations<UserFile>(raw, USER_SCHEMA_VERSION, USER_MIGRATIONS);
}

const REQUIRED_ARRAY_FIELDS = [
    "bookmarks",
    "pickers",
] as const satisfies readonly (keyof UserData)[];

const REQUIRED_SETTINGS_ARRAY_FIELDS = [
    "disabledCommandTypes",
    "hiddenCommands",
    "startupCommands",
] as const satisfies readonly (keyof Settings)[];

// Nested-record validators for `validateData()` - quarantine malformed
// entries individually instead of trusting an array wholesale or discarding
// it entirely (mirrors History.validateData()'s per-entry filtering). Left
// unvalidated, a malformed record here surfaces much later and far from its
// actual cause: a thrown error deep in a Command constructor, an
// unrecognized bookmark `type` silently treated as a folder, a duplicate id
// colliding DOM ids in the palette list, etc.

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.length > 0;
}

function isValidBookmark(value: unknown): value is BookmarkRecord {
    if (!value || typeof value !== "object") return false;
    const b = value as Record<string, unknown>;
    return (
        isNonEmptyString(b.id) &&
        isNonEmptyString(b.name) &&
        isNonEmptyString(b.path) &&
        isNonEmptyString(b.token) &&
        (b.type === BookmarkCommandTypes.FILE || b.type === BookmarkCommandTypes.FOLDER)
    );
}

function isValidPickerItem(value: unknown): value is PickerItem {
    if (!value || typeof value !== "object") return false;
    const item = value as Record<string, unknown>;
    const hasValidLabel = item.label === undefined || typeof item.label === "string";

    switch (item.kind) {
        case "command":
            return isNonEmptyString(item.commandId) && hasValidLabel;
        case "value":
            return isNonEmptyString(item.value) && isNonEmptyString(item.label);
        case "picker":
            return isNonEmptyString(item.pickerId) && hasValidLabel;
        default:
            return false;
    }
}

function isValidPicker(value: unknown): value is PickerRecord {
    if (!value || typeof value !== "object") return false;
    const p = value as Record<string, unknown>;
    return (
        isNonEmptyString(p.id) &&
        isNonEmptyString(p.name) &&
        (p.description === undefined || typeof p.description === "string") &&
        Array.isArray(p.items) &&
        p.items.every(isValidPickerItem)
    );
}

function isValidDisabledCommandType(value: unknown): value is string {
    return (
        typeof value === "string" &&
        (Object.values(CommandTypes) as string[]).includes(value)
    );
}

/** Drop entries whose `id` duplicates an earlier one - first occurrence wins. */
function dedupeById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
}

/**
 * Ps Command Palette user data.
 */
export class User {
    data: UserData | null = null;
    fileName = "user.json";
    file: FSFile | null = null;
    /**
     * NOT called by our own `write()` - this instance's in-memory state is
     * always the freshest available right after it writes, so treating our
     * own write as "invalidated" would just discard that state and trigger
     * a pointless reload from the file we ourselves just wrote (this is
     * exactly what the vanilla plugin's `globalThis.invalidateUserData()`
     * did, on every single write). Reserved as an extension point for a
     * future detector of genuine external edits (e.g. the user hand-editing
     * `user.json` - the "Show Plugin Data" command opens that file's
     * folder, so this is a real if rare scenario) - not currently wired to
     * anything.
     */
    onInvalidate: (() => void) | null = null;
    private _dataFolder: FSFolder | null = null;
    /**
     * Serializes writes so concurrent `write()` calls never run
     * `atomicWriteJSON()` against the same .tmp/.bak filenames at the same
     * time - see `History.writeChain` for the same pattern/reasoning.
     */
    private writeChain: Promise<void> = Promise.resolve();

    /**
     * Return a default object of sample user data.
     */
    get defaultData(): UserData {
        return {
            settings: {
                disabledCommandTypes: [], // TODO: allow command types to be disabled all together
                hiddenCommands: [], // TODO: build out skips for hidden commands
                startupCommands: [ABOUT_PLUGIN_COMMAND_ID], // TODO: add default plugin startup commands with about, docs, etc.
            },
            bookmarks: [],
            pickers: [],
        };
    }

    /**
     * Validate user data structure and fix common issues.
     * @returns true if data was valid, false if corrections were made
     */
    validateData(): boolean {
        if (!this.data || typeof this.data !== "object") {
            this.data = this.defaultData;
            return false;
        }

        let isValid = true;

        for (const prop of REQUIRED_ARRAY_FIELDS) {
            if (!Array.isArray(this.data[prop])) {
                (this.data[prop] as unknown[]) = [];
                isValid = false;
            }
        }

        if (!this.data.settings || typeof this.data.settings !== "object") {
            this.data.settings = this.defaultData.settings;
            isValid = false;
        }

        for (const prop of REQUIRED_SETTINGS_ARRAY_FIELDS) {
            if (!Array.isArray(this.data.settings[prop])) {
                (this.data.settings[prop] as unknown[]) = [];
                isValid = false;
            }
        }

        const validBookmarks = dedupeById(this.data.bookmarks.filter(isValidBookmark));
        if (validBookmarks.length !== this.data.bookmarks.length) {
            console.warn(
                `Removed ${this.data.bookmarks.length - validBookmarks.length} invalid/duplicate bookmark(s).`
            );
            this.data.bookmarks = validBookmarks;
            isValid = false;
        }

        const validPickers = dedupeById(this.data.pickers.filter(isValidPicker));
        if (validPickers.length !== this.data.pickers.length) {
            console.warn(
                `Removed ${this.data.pickers.length - validPickers.length} invalid/duplicate picker(s).`
            );
            this.data.pickers = validPickers;
            isValid = false;
        }

        const validStartupCommands =
            this.data.settings.startupCommands.filter(isNonEmptyString);
        if (validStartupCommands.length !== this.data.settings.startupCommands.length) {
            console.warn("Removed invalid startup command ID(s).");
            this.data.settings.startupCommands = validStartupCommands;
            isValid = false;
        }

        const validHiddenCommands =
            this.data.settings.hiddenCommands.filter(isNonEmptyString);
        if (validHiddenCommands.length !== this.data.settings.hiddenCommands.length) {
            console.warn("Removed invalid hidden command ID(s).");
            this.data.settings.hiddenCommands = validHiddenCommands;
            isValid = false;
        }

        const validDisabledCommandTypes =
            this.data.settings.disabledCommandTypes.filter(isValidDisabledCommandType);
        if (
            validDisabledCommandTypes.length !==
            this.data.settings.disabledCommandTypes.length
        ) {
            console.warn("Removed invalid disabled command type(s).");
            this.data.settings.disabledCommandTypes = validDisabledCommandTypes;
            isValid = false;
        }

        return isValid;
    }

    async getDataFolder(): Promise<FSFolder> {
        if (!this._dataFolder) {
            this._dataFolder = await fs.getDataFolder();
        }
        return this._dataFolder!;
    }

    async createBackupOnError(): Promise<void> {
        if (!this.file) return;
        try {
            const backupFile = await this.backup();
            if (backupFile) {
                await showAlert(
                    "User data error\n\nThere was an error reading your user data file so a backup was created. Use the command 'Open Plugin Data Folder' to view the backup file."
                );
            }
        } catch (backupError) {
            console.error("Failed to create backup:", backupError);
        }
    }

    /** Strips the persistence envelope (`schemaVersion`/`updatedAt`) off a migrated file into the live `UserData` shape. */
    private applyMigratedFile(file: UserFile): void {
        const { schemaVersion: _schemaVersion, updatedAt: _updatedAt, ...data } = file;
        this.data = data;
    }

    async load(): Promise<void> {
        console.log("Loading user data...");
        try {
            const dataFolder = await this.getDataFolder();
            this.file = (await dataFolder.getEntry(this.fileName)) as FSFile;
            const fileData = await this.file.read({ format: storage.formats.utf8 });
            const { data: file, migrated } = migrateUserFile(
                JSON.parse(fileData as string)
            );
            this.applyMigratedFile(file);

            if (!this.validateData()) {
                console.warn("Data validation failed, saving corrected version");
                await this.write();
            } else if (migrated) {
                console.warn("User data upgraded to the current schema, saving...");
                await this.write();
            }
        } catch (error: any) {
            if (error.code === "ENOENT" || error.name === "EntryNotFoundError") {
                console.log(
                    "User data file not found, checking for an interrupted-write recovery candidate..."
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
                        "Recovered user data from a `.bak`/`.tmp` file left by an interrupted write."
                    );
                    this.applyMigratedFile(migrateUserFile(recoveredRaw).data);
                    this.validateData();
                    await this.write();
                } else {
                    console.log("No recovery candidate found, using defaults.");
                    this.data = this.defaultData;
                }
            } else if (error instanceof SyntaxError) {
                console.error("User data file corrupted (JSON parse error):", error);
                await this.createBackupOnError();
                this.data = this.defaultData;
            } else {
                console.error("User data load error:", error);
                await this.createBackupOnError();
                this.data = this.defaultData;
            }
        }
    }

    async reload(): Promise<void> {
        this.data = null;
        this.file = null;
        this._dataFolder = null;
        await this.load();
    }

    /**
     * Write user data to disk using atomic write with backup. Queued behind
     * any write already in progress - see `writeChain`.
     */
    write(): Promise<void> {
        const run = this.writeChain.then(
            () => this.writeNow(),
            () => this.writeNow() // previous write failed - still attempt this one
        );
        // Never let the shared chain itself become a rejected promise, or
        // every write queued after a failure would be silently skipped.
        this.writeChain = run.catch(() => {});
        return run;
    }

    private async writeNow(): Promise<void> {
        if (!this.data || Object.keys(this.data).length === 0) {
            return;
        }

        if (!this.validateData()) {
            console.warn(
                "User data validation failed during write, using corrected data"
            );
        }

        console.log("Writing user data.");
        try {
            const dataFolder = await this.getDataFolder();
            // Snapshot for serialization only - `schemaVersion`/`updatedAt`
            // are persistence envelope metadata, not functional app state,
            // so they're added here rather than mutated onto `this.data`
            // itself.
            const dataToWrite: UserFile = {
                ...this.data,
                schemaVersion: USER_SCHEMA_VERSION,
                updatedAt: Date.now(),
            };

            this.file = await atomicWriteJSON(
                dataFolder,
                this.fileName,
                dataToWrite,
                this.file
            );

            console.log("User data written successfully.");
            // Deliberately not calling onInvalidate() here - see the
            // matching comment in History.writeNow() for why.
        } catch (error) {
            console.error("User data write failed:", error);
            await showAlert(
                "User data error\n\nThere was an error writing your user data file."
            );
            throw error;
        }
    }

    /**
     * Add one or more bookmarks and persist the change. The one authoritative
     * place bookmarks get added, so nothing forgets to write (or await it).
     */
    async addBookmarks(bookmarks: BookmarkRecord[]): Promise<void> {
        if (!this.data || bookmarks.length === 0) return;
        this.data.bookmarks.push(...bookmarks);
        await this.write();
    }

    /**
     * Replace a bookmark in place (same `id`, new path/token/name) and
     * persist the change - used when relinking an expired bookmark token.
     */
    async replaceBookmark(id: string, bookmark: BookmarkRecord): Promise<void> {
        if (!this.data) return;
        this.data.bookmarks = this.data.bookmarks.filter((item) => item.id !== id);
        this.data.bookmarks.push({ ...bookmark, id });
        await this.write();
    }

    /**
     * Backup the user data file.
     */
    async backup(): Promise<FSFile | undefined> {
        if (!this.file) return;

        try {
            const dataFolder = await this.getDataFolder();
            const f = this.file;
            const backupName = `${f.name}.bak`;

            await dataFolder.renameEntry(f, backupName, { overwrite: true });
            console.log(`Backing up user data file to ${f.nativePath}.`);

            return f;
        } catch (error) {
            console.error(error);
            await showAlert(
                "User data error\n\nAn error occurred while backing up your user data file."
            );
        }
    }

    /**
     * Open the user data folder in the file system explorer.
     */
    async reveal(): Promise<void> {
        try {
            const dataFolder = await this.getDataFolder();
            await shell.openPath(dataFolder.nativePath, "");
        } catch (error) {
            console.error(error);
        }
    }
}

// Explicit singleton, replacing the vanilla plugin's `const USER = new User()`
// implicit-global pattern (main.js declared it, other files read it by bare
// name with no import). Import `{ user }` from this module instead.
export const user = new User();
