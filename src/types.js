/**
 * @typedef {Object} CommandTypes
 * @readonly
 * @enum {string}
 * @property {string} ACTION - Action command type
 * @property {string} API - Photoshop API command type
 * @property {string} BOOKMARK - Bookmark command type
 * @property {string} CUSTOM - Custom command type
 * @property {string} MENU - Menu command type
 * @property {string} PICKER - Picker command type
 * @property {string} PLUGIN - Plugin command type
 * @property {string} TOOL - Tool command type
 */
const CommandTypes = Object.freeze({
    ACTION: "action",
    API: "photoshop",
    BOOKMARK: "bookmark",
    CUSTOM: "custom",
    MENU: "menu",
    PICKER: "picker",
    PLUGIN: "plugin",
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
