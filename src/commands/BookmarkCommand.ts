import * as uxp from "uxp";
import * as photoshop from "photoshop";
import * as os from "os";

import { Command } from "./Command";
import {
    BookmarkCommandTypes,
    CommandTypes,
    ID_PREFIXES,
    type BookmarkCommandType,
} from "./types";
import { user } from "../user/User";
import type { BookmarkRecord } from "../user/User";
import type { FSFile, FSFolder } from "../utils/uxpTypes";
import { showAlert } from "../utils/showAlert";

// Deferred import: utils/load.ts imports this file (to build
// File/FolderBookmarkCommand instances), so importing it back here would be
// circular at the module level. Safe in practice because it's only ever
// called from inside execute(), long after both modules have finished
// loading - never read at this file's own top level.
import { refreshCommandType } from "../utils/load";

const { app, core } = photoshop;
const { shell, storage } = uxp;
const fs = storage.localFileSystem;

/**
 * Relink an expired bookmark: create a fresh persistent token for `entry`,
 * replace the persisted bookmark (same id, new path/token/name), and
 * refresh the bookmark slice of `commandsStore` so the change is reflected
 * immediately - not just after "Reload Plugin" or a restart.
 *
 * `expectedType` guards against relinking a bookmark to the wrong kind of
 * entry (e.g. a folder bookmark relinked to a file) - `createBookmarkEntry`
 * derives `type` from whatever `entry` actually turns out to be, not from
 * what the caller intended to prompt for, so a mismatched entry (a picker
 * call prompting for the wrong kind, or a future caller passing the wrong
 * thing) is caught here regardless of how it happened, rather than only at
 * whichever specific call site remembered to prevent it upstream.
 */
async function relinkBookmark(
    id: string,
    entry: FSFile | FSFolder,
    expectedType: BookmarkCommandType
): Promise<void> {
    const newBookmark = await createBookmarkEntry(entry, id);
    if (!newBookmark) return;

    if (newBookmark.type !== expectedType) {
        await showAlert(
            `Relink error\n\nThe selected ${newBookmark.type} doesn't match this bookmark's original type (${expectedType}). Relink canceled.`
        );
        return;
    }

    await user.replaceBookmark(id, newBookmark);
    await refreshCommandType(CommandTypes.BOOKMARK);
}

/**
 * Base command palette bookmark command.
 */
export class BookmarkCommand extends Command {
    token: string;

    constructor(id: string, name: string, path: string, token: string) {
        super(id, name, CommandTypes.BOOKMARK, path);
        this.token = token;
    }
}

/**
 * A command palette file bookmark command.
 */
export class FileBookmarkCommand extends BookmarkCommand {
    constructor({ id, name, path, token }: BookmarkRecord) {
        super(id, name, path, token);
    }

    /**
     * Open the file bookmark in Photoshop.
     */
    async execute(): Promise<unknown> {
        let entry: FSFile | undefined;
        try {
            entry = (await fs.getEntryForPersistentToken(this.token)) as FSFile;

            // try and read the file metadata to ensure it still exists
            await entry.getMetadata();
        } catch (err) {
            await showAlert(
                `File access token error\n\nThe access token for ${this.name} has expired. Please locate file or folder to create a new access token.`
            );

            // TODO: prompt user to remove or re-link?

            // prompt the user to reselect the script
            entry = (await fs.getFileForOpening({
                allowMultiple: false,
                types: storage.fileTypes.all,
            })) as FSFile | undefined;

            // return in case user cancels relocation
            if (!entry) return;

            await relinkBookmark(this.id, entry, BookmarkCommandTypes.FILE);
        }

        return core.executeAsModal(
            async () => {
                // `app.open()` wants the DOM-lib `File` type per its (misleading)
                // vendor typings, not our `storage.File`-based `FSFile` - a real
                // cross-package type mismatch, not a stand-in for "could be
                // anything" the way `entry`'s old `FSFile | FSFolder` union was.
                // Routing through `unknown` documents that instead of an
                // unqualified `as any`.
                await app.open(entry as unknown as File);
            },
            {
                commandName: "Opening Bookmark",
            }
        );
    }
}

/**
 * A command palette folder bookmark command.
 */
export class FolderBookmarkCommand extends BookmarkCommand {
    constructor({ id, name, path, token }: BookmarkRecord) {
        super(id, name, path, token);
    }

    /**
     * Open the folder bookmark in the system file explorer.
     */
    async execute(): Promise<unknown> {
        let entry: FSFolder | undefined;
        try {
            entry = (await fs.getEntryForPersistentToken(this.token)) as FSFolder;

            // try and read the file metadata to ensure it still exists
            await entry.getMetadata();
        } catch (err) {
            await showAlert(
                `File access token error\n\nThe access token for ${this.name} has expired. Please locate file or folder to create a new access token.`
            );

            // TODO: prompt user to remove or re-link?

            // prompt the user to reselect the folder
            entry = (await fs.getFolder({})) as FSFolder | undefined;

            // return in case user cancels relocation
            if (!entry) return;

            await relinkBookmark(this.id, entry, BookmarkCommandTypes.FOLDER);
        }

        // return in case user cancels relocation
        if (!entry) return;

        // TODO: ensure file/folder is available
        return shell.openPath(entry.nativePath, "");
    }
}

/**
 * Normalizes a native path for duplicate-bookmark comparison (and bookmark
 * `id` generation, below). macOS and Windows filesystems are case-
 * insensitive (though case-preserving) by default, so two `nativePath`
 * strings differing only in case still refer to the same file/folder there
 * - lowercase before comparing. Linux filesystems are case-sensitive, so
 * paths are left as-is there.
 */
const normalizePathForComparison = (path: string): string =>
    os.platform() === "linux" ? path : path.toLowerCase();

/**
 * FNV-1a over `path`'s UTF-8 bytes, run twice with different seeds and
 * concatenated for a 64-bit-ish digest - collision risk is negligible for a
 * user's bookmark list. Used (via `hashPath`, below) in place of
 * `btoa(path)` for bookmark ids: `btoa` throws on paths containing
 * characters outside Latin-1 (e.g. non-Latin folder/file names),
 * reversibly embeds the whole path in the id, and produces ids as long as
 * the path itself. A hash is one-way, fixed-length, and Unicode-safe.
 * Not used for duplicate detection - `duplicateBookmark`, below, compares
 * paths directly.
 */
const fnv1a = (bytes: Uint8Array, seed: number): number => {
    let hash = seed;
    for (const byte of bytes) {
        hash ^= byte;
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
};

const hashPath = (path: string): string => {
    const bytes = new TextEncoder().encode(path);
    const a = fnv1a(bytes, 0x811c9dc5);
    const b = fnv1a(bytes, 0x9e3779b9);
    return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
};

/**
 * Check if a bookmark for `path` is already loaded, ignoring the bookmark
 * `ignoreId` (the one being relinked - see `createBookmarkEntry`).
 */
const duplicateBookmark = (path: string, ignoreId?: string): boolean => {
    const normalizedPath = normalizePathForComparison(path);
    return (
        user.data?.bookmarks.some(
            (item) =>
                item.id !== ignoreId &&
                normalizePathForComparison(item.path) === normalizedPath
        ) ?? false
    );
};

/**
 * Store a bookmark in persistent local storage.
 *
 * @param replacingId - the id of a bookmark this entry is relinking.
 * Excluded from the duplicate check, so relinking an expired token to the
 * same file/folder (the usual case) isn't refused as "already exists".
 */
export async function createBookmarkEntry(
    entry: FSFile | FSFolder,
    replacingId?: string
): Promise<BookmarkRecord | undefined> {
    // ensure bookmark isn't already loaded
    if (duplicateBookmark(entry.nativePath, replacingId)) {
        await showAlert("Bookmark already exists");
        return;
    }

    // create id - normalized so two case-variant paths for the same
    // file/folder (see `normalizePathForComparison`) always produce the
    // same id, rather than depending on the duplicate check above always
    // being what stands between them and two different ids for one target.
    const id =
        ID_PREFIXES.bookmark + hashPath(normalizePathForComparison(entry.nativePath));

    // determine type
    const type = entry.isFile ? BookmarkCommandTypes.FILE : BookmarkCommandTypes.FOLDER;

    // create a persistent token
    const token = await fs.createPersistentToken(entry);

    return {
        id,
        name: entry.name,
        path: entry.nativePath,
        type,
        token,
    };
}
