/**
 * Command type enum.
 */
const CommandTypes = {
    ACTION: "action",
    API: "extension",
    BOOKMARK: "bookmark",
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
