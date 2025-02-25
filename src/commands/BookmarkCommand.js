const { app, core } = require("photoshop");
const { shell, storage } = require("uxp");
const fs = storage.localFileSystem;

const { Command } = require("./Command.js");
const { BookmarkCommandTypes, CommandTypes } = require("../types.js");

/**
 * Create a command palette bookmark command.
 */
class BookmarkCommand extends Command {
    /**
     * @param {string} id - Unique command id
     * @param {string} name - Bookmark name
     * @param {string} path - Bookmark path
     * @param {string} token - Local persistent storage token
     */
    constructor(id, name, path, token) {
        super(id, name, CommandTypes.BOOKMARK, path);
        this.token = token;
    }

    async handleTokenError(newBookmarkCreator) {
        // Shared token error handling logic
    }
}

/**
 * Create a command palette file bookmark command.
 */
class FileBookmarkCommand extends BookmarkCommand {
    /**
     * @param {object} bookmark
     * @param {string} bookmark.id - Unique command id
     * @param {string} bookmark.name - Bookmark name
     * @param {string} bookmark.path - Bookmark path
     * @param {string} bookmark.token - Local persistent storage token
     */
    constructor({ id, name, path, token }) {
        super(id, name, path, token);
    }

    /**
     * Open the file bookmark in Photoshop.
     * @returns {Promise<void>}
     */
    async execute() {
        let entry;
        try {
            entry = await fs.getEntryForPersistentToken(this.token);

            // try and read the file metadata to ensure it still exists
            await entry.getMetadata();
        } catch (err) {
            await app.showAlert(
                `File access token error\n\nThe access token for ${this.name} has expired. Please locate file or folder to create a new access token.`
            );

            // TODO: prompt user to remove or re-link?

            // prompt the user to reselect the script
            entry = await fs.getFileForOpening({
                allowMultiple: false,
                types: storage.fileTypes.all,
            });

            // return in case user cancels relocation
            if (!entry) return;

            // create a new bookmark object
            const newBookmark = await createBookmarkEntry(entry);

            // delete the old bookmark
            USER.data.bookmarks = USER.data.bookmarks.filter(
                (item) => item.id !== this.id
            );

            // update new bookmark with new id
            newBookmark.id = this.id;

            // add the new updated bookmark
            USER.data.bookmarks.push(newBookmark);

            // write user data
            await USER.write();
        }

        return core.executeAsModal(
            async () => {
                await app.open(entry);
            },
            {
                commandName: "Opening Bookmark",
            }
        );
    }
}

/**
 * Create a command palette Folder bookmark command.
 */
class FolderBookmarkCommand extends BookmarkCommand {
    /**
     * @param {object} bookmark
     * @param {string} bookmark.id - Unique command id
     * @param {string} bookmark.name - Bookmark name
     * @param {string} bookmark.path - Bookmark path
     * @param {string} bookmark.token - Local persistent storage token
     */
    constructor({ id, name, path, token }) {
        super(id, name, path, token);
    }

    /**
     * Open the folder bookmark in the system file explorer.
     * @returns {Promise<string>}
     */
    async execute() {
        let entry;
        try {
            entry = await fs.getEntryForPersistentToken(this.token);

            // try and read the file metadata to ensure it still exists
            await entry.getMetadata();
        } catch (err) {
            await app.showAlert(
                `File access token error\n\nThe access token for ${this.name} has expired. Please locate file or folder to create a new access token.`
            );

            // TODO: prompt user to remove or re-link?

            // prompt the user to reselect the script
            entry = await fs.getFileForOpening({
                allowMultiple: false,
                types: storage.fileTypes.all,
            });

            // return in case user cancels relocation
            if (!entry) return;

            // create a new bookmark object
            const newBookmark = await createBookmarkEntry(entry);

            // delete the old bookmark
            USER.data.bookmarks = USER.data.bookmarks.filter(
                (item) => item.id !== this.id
            );

            // update new bookmark with new id
            newBookmark.id = this.id;

            // add the new updated bookmark
            USER.data.bookmarks.push(newBookmark);

            // write user data
            await USER.write();
        }

        // return in case user cancels relocation
        if (!entry) return;

        // TODO: ensure file/folder is available
        return shell.openPath(entry.nativePath);
    }
}

/**
 * Check if a bookmark is already loaded
 * @param {string} path - Bookmark path
 * @returns {boolean}
 */
const duplicateBookmark = (path) =>
    USER.data.bookmarks.some((item) => item.path === path);

/**
 * Store a bookmark in persistent local storage.
 * @param {storage.File | - storage.Folder} entry File or folder to bookmark
 * @returns {{ id: string, path: string, name: string, type: string, token: string }}
 */
async function createBookmarkEntry(entry) {
    // ensure bookmark isn't already loaded
    if (duplicateBookmark(entry.nativePath)) {
        app.showAlert("Bookmark already exists");
        return;
    }

    // create id
    const id = "ps_bookmark_" + btoa(entry.nativePath);

    // determine type
    const type = entry.isFile ? BookmarkCommandTypes.FILE : BookmarkCommandTypes.FOLDER;

    // create a persistent token
    const token = await fs.createPersistentToken(entry);

    return {
        id: id,
        name: entry.name,
        path: entry.nativePath,
        type: type,
        token: token,
    };
}

module.exports = {
    BookmarkCommand,
    FileBookmarkCommand,
    FolderBookmarkCommand,
    createBookmarkEntry,
};
