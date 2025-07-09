const { app } = require("photoshop");
const { shell, storage } = require("uxp");
const fs = storage.localFileSystem;

const { PickerCommand } = require("../PickerCommand.js");
const { createBookmarkEntry } = require("../BookmarkCommand.js");

// TODO: updates builtin
// TODO: pluginSettings builtin

const pluginCommands = {};

pluginCommands.about = {
    name: "About Ps Command Palette",
    description: "Learn about Ps Command Palette.",
    callback: () => {
        const year = new Date().getFullYear();
        const aboutString = `${PLUGIN_NAME}
Plugin for Photoshop

Version: ${PLUGIN_VERSION}

Developed by Josh Duncan

© ${year} Josh Duncan`;
        app.showAlert(aboutString);
    },
};

pluginCommands.intro = {
    name: "Ps Command Palette Plugin Introduction...",
    description: "How to use the Ps Command Plugin.",
    callback: () => {
        app.showAlert("Not yet implemented");
    },
};

pluginCommands.help = {
    name: "Plugin Help",
    description: "Ps Command Palette online help documentation.",
    callback: async () => {
        await shell.openExternal(
            "https://github.com/joshbduncan/PsCommandPalette/",
            "Ps Command Palette Online Documentation"
        );
    },
};

pluginCommands.reload = {
    name: "Reload Plugin",
    description: "Reload plugin data.",
    callback: async () => {
        try {
            console.log("reloading plugin");
            await USER.reload();
            await HISTORY.reload();
            app.showAlert("Plugin reloaded");
        } catch (error) {
            console.error(error);
        }
    },
};

pluginCommands.data = {
    name: "Show Plugin Data",
    description: "Reveal plugin data files on your system.",
    callback: async () => {
        try {
            const dataFolder = await fs.getDataFolder();
            await shell.openPath(dataFolder.nativePath);
        } catch (error) {
            console.error(error);
        }
    },
};

pluginCommands.clearHistory = {
    name: "Clear Plugin History",
    description: "Clear your command history.",
    callback: async () => {
        console.log("clearing user history");
        // TODO: prompt to ensure
        await HISTORY.clear();
    },
};

pluginCommands.customPicker = {
    name: "Create a Custom Picker Palette",
    description: "Create your own custom command palette picker.",
    callback: async () => {
        // const picker = new PickerCommand(
        //     "boogy_woogy",
        //     "Boggy Woogy Picker",
        //     "Yes and no",
        //     []
        // );
        // await picker.execute();
        app.showAlert("Not yet implemented.");
    },
};

pluginCommands.loadFileBookmarks = {
    name: "Load File Bookmark(s)...",
    description: "Load files for easy access as custom commands.",
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
    description: "Load folder for easy access as a custom command.",
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
};
