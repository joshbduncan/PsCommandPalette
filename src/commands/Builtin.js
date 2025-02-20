const { app } = require("photoshop");
const { storage } = require("uxp");
const fs = storage.localFileSystem;
const shell = require("uxp").shell;

const { Command, CommandTypes } = require("./Command.js");
const { BookmarkTypes, createBookmarkEntry } = require("./Bookmark.js");
const { createScriptEntry } = require("./Script.js");
const { executePSJSScriptFile, executeJSXScriptFile } = require("../utils.js");

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

// TODO: allow multiple selection
builtinCommands.loadScript = {
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
            const script = await createScriptEntry(entry);

            if (script) {
                scripts.push(script);
            }
        }

        USER.data.scripts.push(...scripts);
        USER.write();
    },
};

// TODO: allow multiple selection
builtinCommands.createFileBookmark = {
    name: "Add File Bookmark",
    note: "Ps Command Palette > Add File Bookmark",
    callback: async () => {
        const bookmark = await createBookmarkEntry(BookmarkTypes.FILE);

        if (!bookmark) return;

        USER.data.bookmarks.push(bookmark);
        USER.write();
    },
};

builtinCommands.createFolderBookmark = {
    name: "Add Folder Bookmark",
    note: "Ps Command Palette > Add Folder Bookmark",
    callback: async () => {
        const bookmark = await createBookmarkEntry(BookmarkTypes.FOLDER);

        if (!bookmark) return;

        USER.data.bookmarks.push(bookmark);
        USER.write();
    },
};

/**
 * Load builtin commands.
 * @returns {Builtin[]}
 */
function loadBuiltins() {
    return Object.entries(builtinCommands).map(([key, obj]) =>
        Object.assign(new Builtin(key, obj.name, obj.note), {
            execute: obj.callback,
        })
    );
}

module.exports = {
    Builtin,
    builtinCommands,
    about,
    loadBuiltins,
};
