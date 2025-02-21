const { app } = require("photoshop");
const { shell, storage } = require("uxp");
const fs = storage.localFileSystem;

const { Command } = require("./Command.js");
const { CommandTypes } = require("../types.js");
const { createBookmarkEntry } = require("./Bookmark.js");
const { createScriptEntry } = require("./Script.js");

/**
 * Create a command palette builtin command.
 */
class Builtin extends Command {
    /**
     * @param {string} id Unique command id
     * @param {string} name Command name
     * @param {string} note Note displayed below command
     */
    constructor(id, name) {
        const _id = "ps_builtin_" + id;
        const note = "Ps Command Palette > Builtin > " + name;
        super(_id, name, CommandTypes.BUILTIN, note);
    }
}

//////////////////////
// builtin commands //
//////////////////////

// TODO: help builtin
// TODO: updates builtin
// TODO: pluginSettings builtin

const builtinCommands = {};

const about = () => {
    const year = new Date().getFullYear();
    const aboutString = `${PLUGIN_NAME}
Plugin for Photoshop

Version: ${PLUGIN_VERSION}

Developed by Josh Duncan

© ${year} Josh Duncan`;
    app.showAlert(aboutString);
};

builtinCommands.about = {
    name: "About Ps Command Palette",
    note: "Ps Command Palette > About...",
    callback: about,
};

builtinCommands.help = {
    name: "Plugin Help",
    note: "Ps Command Palette > Plugin Help...",
    callback: async () => {
        await shell.openExternal(
            "https://github.com/joshbduncan/PsCommandPalette/wiki",
            "Ps Command Palette Help Wiki"
        );
    },
};

builtinCommands.loadScripts = {
    name: "Load Script(s)...",
    note: "Ps Command Palette > Load Script(s)...",
    callback: async () => {
        const entries = await fs.getFileForOpening({
            allowMultiple: true,
            types: storage.fileTypes.all,
        });

        if (!entries || entries.length === 0) return;

        const scripts = [];

        for (const entry of entries) {
            // TODO: limit filetypes to know script extensions
            const script = await createScriptEntry(entry);

            if (script) {
                scripts.push(script);
            }
        }

        USER.data.scripts.push(...scripts);
        USER.write();
    },
};

builtinCommands.loadFileBookmarks = {
    name: "Load File Bookmark(s)...",
    note: "Ps Command Palette > Load File Bookmark(s)...",
    callback: async () => {
        const entries = await fs.getFileForOpening({
            allowMultiple: true,
            types: storage.fileTypes.all,
        });

        if (!entries || entries.length === 0) return;

        const bookmarks = [];

        for (const entry of entries) {
            // TODO: limit filetypes to know ps file extensions
            const bookmark = await createBookmarkEntry(entry);

            if (bookmark) {
                bookmarks.push(bookmark);
            }
        }

        USER.data.bookmarks.push(...bookmarks);
        USER.write();
    },
};

builtinCommands.loadFolderBookmark = {
    name: "Load Folder Bookmark",
    note: "Ps Command Palette > Load Folder Bookmark",
    callback: async () => {
        const entry = await fs.getFolder();

        const bookmark = await createBookmarkEntry(entry);

        if (!bookmark) return;

        USER.data.bookmarks.push(bookmark);
        USER.write();
    },
};

module.exports = {
    Builtin,
    builtinCommands,
    about,
};
