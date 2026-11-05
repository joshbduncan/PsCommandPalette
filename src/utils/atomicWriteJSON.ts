import * as uxp from "uxp";

import type { FSFile, FSFolder } from "./uxpTypes";

const { storage } = uxp;

/**
 * Write `data` as JSON to `fileName` inside `dataFolder` using an atomic
 * write: write to a `.tmp` file, back up any existing file to `.bak`
 * (best-effort), then rename the `.tmp` file into place.
 *
 * "Atomic" describes the intent, not a guarantee `renameEntry` has actually
 * been confirmed to provide on every UXP host/platform - if the final
 * rename below fails (crash, disk error) after the old canonical file has
 * already been moved to `.bak`, there's a real window with no canonical
 * file on disk. The rollback below closes that window when the failure
 * happens within this same call; `recoverFromInterruptedWrite` covers the
 * case where the whole process was killed before the rollback itself could
 * run.
 *
 * @returns the new file handle for the written file.
 */
export async function atomicWriteJSON(
    dataFolder: FSFolder,
    fileName: string,
    data: unknown,
    existingFile: FSFile | null
): Promise<FSFile> {
    const tempFileName = `${fileName}.tmp`;
    const backupFileName = `${fileName}.bak`;

    const tempFile = (await dataFolder.createEntry(tempFileName, {
        type: storage.types.file,
        overwrite: true,
    })) as FSFile;

    const jsonData = JSON.stringify(data, null, 2);
    await tempFile.write(jsonData, { append: false });

    let backedUp = false;
    if (existingFile) {
        try {
            await dataFolder.renameEntry(existingFile, backupFileName, {
                overwrite: true,
            });
            backedUp = true;
        } catch (backupError) {
            console.warn(`Could not create backup for ${fileName}:`, backupError);
            // Continue with write even if backup fails
        }
    }

    try {
        return (await dataFolder.renameEntry(tempFile, fileName, {
            overwrite: true,
        })) as FSFile;
    } catch (renameError) {
        // The old canonical file is already gone (moved to `.bak` above) -
        // without restoring it, this failure would leave neither a
        // canonical file nor the new data in place, and the next load()
        // would read that as "no file, first run" and silently discard real
        // data that's still sitting right there in `.bak`.
        if (backedUp) {
            try {
                const backupEntry = (await dataFolder.getEntry(
                    backupFileName
                )) as FSFile;
                await dataFolder.renameEntry(backupEntry, fileName, {
                    overwrite: true,
                });
            } catch (restoreError) {
                console.error(
                    `Failed to restore ${fileName} from its backup after a failed write:`,
                    restoreError
                );
            }
        }
        throw renameError;
    }
}

/**
 * Recovers file contents when the canonical `fileName` is missing (e.g. an
 * `ENOENT` on load) by checking for leftovers from an `atomicWriteJSON`
 * write that was interrupted before completing - the same failure window
 * as the rollback above, for when the crash killed the whole process
 * before that rollback could run. Tries `.bak` (the last known-good file
 * before the interrupted write) first, then `.tmp` (the interrupted
 * write's own data, which may or may not have finished writing).
 *
 * @returns the recovered file's raw contents, or `null` if neither
 * candidate exists or is readable.
 */
export async function recoverFromInterruptedWrite(
    dataFolder: FSFolder,
    fileName: string
): Promise<string | null> {
    for (const suffix of [".bak", ".tmp"]) {
        try {
            const candidate = (await dataFolder.getEntry(
                `${fileName}${suffix}`
            )) as FSFile;
            return (await candidate.read({ format: storage.formats.utf8 })) as string;
        } catch {
            // candidate doesn't exist, or couldn't be read - try the next one
        }
    }
    return null;
}
