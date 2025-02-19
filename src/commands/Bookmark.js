const { app, core } = require("photoshop");
const { shell, storage } = require("uxp");
const fs = storage.localFileSystem;

const { Command, CommandTypes } = require("./Command.js");

/**
 * Bookmark type enum.
 */
const BookmarkTypes = {
    FILE: "file",
    FOLDER: "folder",
};

/**
 * Create a command palette bookmark command.
 */
class Bookmark extends Command {
    /**
     * @param {string} id Unique command id
     * @param {string} name Bookmark name
     * @param {string} path Bookmark path
     * @param {string} token Local persistent storage token
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
class FileBookmark extends Bookmark {
    /**
     * @param {object} bookmark
     * @param {string} bookmark.id Unique command id
     * @param {string} bookmark.name Bookmark name
     * @param {string} bookmark.path Bookmark path
     * @param {string} bookmark.token Local persistent storage token
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

            // prompt the user to reselect the bookmark and create a new entry
            const newBookmark = await createBookmarkEntry(BookmarkTypes.FILE);

            // delete the old bookmark
            USER.data.bookmarks = USER.data.bookmarks.filter(
                (item) => item.id !== this.id
            );

            if (newBookmark !== undefined || newBookmark !== null) {
                // update new bookmark with new id
                newBookmark.id = this.id;

                // add the new updated bookmark
                USER.data.bookmarks.push(newBookmark);

                // grab the new entry
                entry = await fs.getEntryForPersistentToken(newBookmark.token);
            } else {
                entry = undefined;
            }

            // write user data
            await USER.write();
        }

        // return in case user cancels relocation
        if (!entry) return;

        // TODO: ensure file/folder is available
        return await core.executeAsModal(async () => await app.open(entry), {
            commandName: "Opening Bookmark",
        });
    }
}

/**
 * Create a command palette Folder bookmark command.
 */
class FolderBookmark extends Bookmark {
    /**
     * @param {object} bookmark
     * @param {string} bookmark.id Unique command id
     * @param {string} bookmark.name Bookmark name
     * @param {string} bookmark.path Bookmark path
     * @param {string} bookmark.token Local persistent storage token
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

            // prompt the user to reselect the bookmark and create a new entry
            const newBookmark = await createBookmarkEntry(BookmarkTypes.FOLDER);

            // delete the old bookmark
            USER.data.bookmarks = USER.data.bookmarks.filter(
                (item) => item.id !== this.id
            );

            if (newBookmark !== undefined || newBookmark !== null) {
                // update new bookmark with new id
                newBookmark.id = this.id;

                // add the new updated bookmark
                USER.data.bookmarks.push(newBookmark);

                // grab the new entry
                entry = await fs.getEntryForPersistentToken(newBookmark.token);
            } else {
                entry = undefined;
            }

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
 * Choose, tokenize, and store a bookmark in persistent local storage for later reference.
 * @param {"file" | "folder"} type The type of bookmark to create
 * @returns {{ id: string, path: string, name: string, type: string, token: string }}
 */
async function createBookmarkEntry(type) {
    /**
     * Allow the user to choose a bookmark with a system open dialog.
     * @param {"file" | "folder"} type The type of bookmark to choose
     * @returns {storage.Entry}
     */
    async function chooseBookmark(type) {
        const actions = {
            [BookmarkTypes.FOLDER]: async () => await fs.getFolder(),
            [BookmarkTypes.FILE]: async () =>
                await fs.getFileForOpening({
                    allowMultiple: false,
                    types: storage.fileTypes.all,
                }),
        };
        return actions[type]();
    }

    /**
     * Check if a bookmark is already loaded
     * @param {string} path Bookmark path
     * @returns {boolean}
     */
    const duplicateBookmark = (path) =>
        USER.data.bookmarks.some((item) => item.path === path);

    const f = await chooseBookmark(type);

    if (!f) return;

    // ensure bookmark isn't already loaded
    if (duplicateBookmark(f.nativePath)) {
        app.showAlert("Bookmark already exists");
        return;
    }

    // create id
    const id = "ps_bookmark_" + btoa(f.nativePath);

    // create a persistent token
    const token = await fs.createPersistentToken(f);

    return {
        id: id,
        name: f.name,
        path: f.nativePath,
        type: type,
        token: token,
    };
}

/**
 * Load user bookmark commands.
 * @returns {Bookmark[]}
 */
async function loadBookmarks() {
    try {
        return USER.data.bookmarks.map((bookmark) =>
            bookmark.type === BookmarkTypes.FILE
                ? new FileBookmark({ ...bookmark })
                : new FolderBookmark({ ...bookmark })
        );
    } catch (error) {
        console.error(error);
        return [];
    }
}

module.exports = {
    Bookmark,
    BookmarkTypes,
    createBookmarkEntry,
    loadBookmarks,
};
