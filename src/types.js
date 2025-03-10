/**
 * Command type enum.
 */
const CommandTypes = Object.freeze({
    ACTION: "action",
    API: "photoshop",
    BOOKMARK: "bookmark",
    CUSTOM: "custom",
    MENU: "menu",
    PICKER: "picker",
    PLUGIN: "plugin",
    SCRIPT: "script",
    TOOL: "tool",
});

/**
 * Bookmark type enum.
 */
const BookmarkCommandTypes = Object.freeze({
    FILE: "file",
    FOLDER: "folder",
});

module.exports = {
    BookmarkCommandTypes,
    CommandTypes,
};
