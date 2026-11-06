import * as uxp from "uxp";

import { createBookmarkEntry } from "../BookmarkCommand";
import { user } from "../../user/User";
import { history } from "../../user/History";
import { host, PLUGIN_AUTHOR } from "../../user/host";
import { commandsStore } from "../../utils/CommandsStore";
import { showAlert } from "../../utils/showAlert";
import { showGettingStartedDialog } from "../../dialogs/gettingStarted";
import { CommandTypes } from "../types";
import type { CommandRegistry } from "../registry";
import type { FSFile, FSFolder } from "../../utils/uxpTypes";

// Deferred import: utils/load.ts imports this file (to build PluginCommand
// instances), so importing it back here would be circular at the module
// level. Safe in practice because it's only ever called from inside a
// callback, long after both modules have finished loading - never read at
// this file's own top level.
import { startLoadingCommands, refreshCommandType } from "../../utils/load";

const { shell, storage } = uxp;
const fs = storage.localFileSystem;

// TODO: updates builtin
// TODO: pluginSettings builtin

// The "about"/"reload" keys below are load-bearing beyond this file:
// commands/types.ts's ABOUT_PLUGIN_COMMAND_ID/RELOAD_PLUGIN_COMMAND_ID
// hardcode them (as `${ID_PREFIXES.plugin}about`/`reload`) for main.ts/
// User.ts to reference without a circular import back into this module -
// renaming either key here means updating those constants too.
export const pluginCommands: CommandRegistry = {
    about: {
        name: "About Ps Command Palette",
        description: "Learn about Ps Command Palette.",
        callback: async () => {
            const year = new Date().getFullYear();
            const aboutString = `${host.pluginName}
Plugin for Photoshop

Version: ${host.pluginVersion}

Developed by ${PLUGIN_AUTHOR}

© ${year} ${PLUGIN_AUTHOR}`;
            await showAlert(aboutString);
        },
    },

    intro: {
        name: "Getting Started",
        description: "How to use Ps Command Palette.",
        callback: () => {
            showGettingStartedDialog();
        },
    },

    help: {
        name: "Plugin Help",
        description: "Ps Command Palette online help documentation.",
        callback: async () => {
            await shell.openExternal(
                "https://github.com/joshbduncan/PsCommandPalette/",
                "Ps Command Palette Online Documentation"
            );
        },
    },

    reload: {
        name: "Reload Plugin",
        description: "Reload plugin data.",
        callback: async () => {
            try {
                console.log(`Reloading ${host.pluginName} v${host.pluginVersion}...`);
                await user.reload();
                await history.reload();
                // Re-fetch every command type too - bookmarks/pickers are built
                // from user.data, which just changed, and everything else
                // (menu commands especially) is only ever fetched once at
                // plugin-load time now (see utils/load.ts's
                // startLoadingCommands), not on every palette open. Not
                // awaited - the alert shouldn't wait on the menu fetch - but
                // safe even if an earlier load (or an earlier reload) is
                // still in flight: startLoadingCommands() bumps a generation
                // counter internally, so a late-arriving result from before
                // this reset can't land in the freshly-reset store.
                commandsStore.reset();
                startLoadingCommands({ user });
                await showAlert("Plugin reloaded");
            } catch (error) {
                console.error(error);
            }
        },
    },

    data: {
        name: "Show Plugin Data",
        description: "Reveal plugin data files on your system.",
        callback: async () => {
            try {
                const dataFolder = await fs.getDataFolder();
                await shell.openPath(dataFolder.nativePath, "");
            } catch (error) {
                console.error(error);
            }
        },
    },

    clearHistory: {
        name: "Clear Plugin History",
        description: "Clear your command history.",
        destructive: true,
        callback: async () => {
            await history.clear();
        },
    },

    loadFileBookmarks: {
        name: "Load File Bookmark(s)...",
        description: "Load files for easy access as custom commands.",
        callback: async () => {
            const entries = (await fs.getFileForOpening({
                allowMultiple: true,
                types: storage.fileTypes.all,
            })) as FSFile | FSFile[] | undefined;

            if (!entries || (Array.isArray(entries) && entries.length === 0)) return;

            const bookmarks = [];
            const entryList = Array.isArray(entries) ? entries : [entries];

            for (const entry of entryList) {
                // TODO: limit filetypes to know ps file extensions
                const bookmark = await createBookmarkEntry(entry);

                if (bookmark) {
                    bookmarks.push(bookmark);
                }
            }

            if (bookmarks.length === 0) return;

            await user.addBookmarks(bookmarks);
            await refreshCommandType(CommandTypes.BOOKMARK);
        },
    },

    loadFolderBookmark: {
        name: "Load Folder Bookmark",
        description: "Load folder for easy access as a custom command.",
        callback: async () => {
            const entry = (await fs.getFolder({})) as FSFolder | undefined;
            if (!entry) return;

            const bookmark = await createBookmarkEntry(entry);

            if (!bookmark) return;

            await user.addBookmarks([bookmark]);
            await refreshCommandType(CommandTypes.BOOKMARK);
        },
    },
};
