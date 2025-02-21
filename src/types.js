/**
 * Command type enum.
 */
const CommandTypes = {
    ACTION: "action",
    BOOKMARK: "bookmark",
    BUILTIN: "builtin",
    CUSTOM: "custom",
    MENU: "menu",
    SCRIPT: "script",
    STARTUP: "startup",
    TOOL: "tool",
};

/**
 * Bookmark type enum.
 */
const BookmarkTypes = {
    FILE: "file",
    FOLDER: "folder",
};

module.exports = {
    BookmarkTypes,
    CommandTypes,
};
