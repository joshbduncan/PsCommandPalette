const { app } = require("photoshop");
const { shell, storage } = require("uxp");
const fs = storage.localFileSystem;

const { createBookmarkEntry } = require("../BookmarkCommand.js");
const { createScriptEntry } = require("../ScriptCommand.js");

// TODO: updates builtin
// TODO: pluginSettings builtin

const pluginCommands = {};

const about = () => {
    const year = new Date().getFullYear();
    const aboutString = `${PLUGIN_NAME}
Plugin for Photoshop

Version: ${PLUGIN_VERSION}

Developed by Josh Duncan

© ${year} Josh Duncan`;
    app.showAlert(aboutString);
};

pluginCommands.about = {
    name: "About Ps Command Palette",
    description: "Learn about Ps Command Palette",
    callback: about,
};

const intro = () => {
    const aboutString = `${PLUGIN_NAME}
Plugin for Photoshop

Introduction not yet implemented.`;
    app.showAlert(aboutString);
};

pluginCommands.intro = {
    name: "Ps Command Palette Plugin Introduction...",
    description: "How to use the Ps Command Plugin",
    callback: intro,
};

const _help = async () => {
    await shell.openExternal(
        "https://github.com/joshbduncan/PsCommandPalette/wiki",
        "Ps Command Palette Help Wiki"
    );
};

pluginCommands.help = {
    name: "Plugin Help",
    description: "Ps Command Palette Help Documentation",
    callback: _help,
};

pluginCommands.loadScripts = {
    name: "Load Script(s)...",
    description: "Load external script files for easy access as custom commands",
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

pluginCommands.loadFileBookmarks = {
    name: "Load File Bookmark(s)...",
    description: "Load files for easy access as custom commands",
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

pluginCommands.loadFolderBookmark = {
    name: "Load Folder Bookmark",
    description: "Load folder for easy access as a custom command",
    callback: async () => {
        const entry = await fs.getFolder();

        const bookmark = await createBookmarkEntry(entry);

        if (!bookmark) return;

        USER.data.bookmarks.push(bookmark);
        USER.write();
    },
};

module.exports = {
    pluginCommands,
    about,
    _help,
    intro,
};
