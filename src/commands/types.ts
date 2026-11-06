export const CommandTypes = {
    ACTION: "action",
    API: "photoshop",
    BOOKMARK: "bookmark",
    CUSTOM: "custom",
    MENU: "menu",
    PICKER: "picker",
    PLUGIN: "plugin",
    TOOL: "tool",
} as const;

export type CommandType = (typeof CommandTypes)[keyof typeof CommandTypes];

export const BookmarkCommandTypes = {
    FILE: "file",
    FOLDER: "folder",
} as const;

export type BookmarkCommandType =
    (typeof BookmarkCommandTypes)[keyof typeof BookmarkCommandTypes];

/**
 * `command.id` prefixes, one per command type that has a fixed one
 * (PickerCommand/CustomCommand ids are user-defined/dynamically composed,
 * not prefixed). Centralized here rather than each Command subclass
 * hardcoding its own literal, since a couple of specific derived ids
 * (below) are also referenced from outside the subclass that builds them.
 */
export const ID_PREFIXES = {
    action: "ps_action_",
    api: "ps_api_",
    bookmark: "ps_bookmark_",
    menu: "ps_menu_",
    plugin: "ps_plugin_",
    tool: "ps_tool_",
} as const;

// Specific well-known plugin command ids referenced outside of
// commands/plugin/commands.ts itself (main.ts, User.ts's default
// startup commands) - defined from ID_PREFIXES here, rather than in
// plugin/commands.ts, since User.ts is imported *by* plugin/commands.ts and
// importing back would be circular. Must stay in sync with
// pluginCommands.ts's `reload`/`about` registry keys.
export const RELOAD_PLUGIN_COMMAND_ID = `${ID_PREFIXES.plugin}reload`;
export const ABOUT_PLUGIN_COMMAND_ID = `${ID_PREFIXES.plugin}about`;
