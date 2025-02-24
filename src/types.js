/**
 * Command type enum.
 */
const CommandTypes = {
    ACTION: "action",
    BOOKMARK: "bookmark",
    EXTENSION: "extension",
    MENU: "menu",
    PLUGIN: "plugin",
    SCRIPT: "script",
    TOOL: "tool",
};

/**
 * Bookmark type enum.
 */
const BookmarkCommandTypes = {
    FILE: "file",
    FOLDER: "folder",
};

module.exports = {
    BookmarkCommandTypes,
    CommandTypes,
};
