import * as uxp from "uxp";
import { user } from "./user/User";
import { history } from "./user/History";
import { commandsStore } from "./utils/CommandsStore";
import { startLoadingCommands, refreshCommandType } from "./utils/load";
import { openPalette } from "./palettes/openPalette";
import { confirmDestructiveCommand } from "./dialogs/confirmDestructiveCommand";
import { handleCommandExecutionError } from "./utils/commandExecutionError";
import { showAlert } from "./utils/showAlert";
import { host, PLUGIN_AUTHOR } from "./user/host";
import { filterByIds } from "./utils/query";
import { sortCommandsByOccurrence } from "./utils/commands";
import { pluginCommands } from "./commands/plugin/commands";
import { CommandTypes, RELOAD_PLUGIN_COMMAND_ID } from "./commands/types";

const { entrypoints } = uxp;

const PANEL_ID = "ps_command_palette";

// Both flags start true so the very first call actually loads from disk.
// Neither `User`/`History`'s own `write()` sets these anymore (see their
// `onInvalidate` doc comments) - a self-write no longer means "stale", so in
// practice these only fire once, at startup. "Reload Plugin" bypasses this
// entirely and calls user.reload()/history.reload() directly. This wiring
// stays in place as the hook a future external-edit detector would use.
let userNeedsReload = true;
let historyNeedsReload = true;

user.onInvalidate = () => {
    userNeedsReload = true;
    console.log("User data invalidated - will reload on next access.");
};
history.onInvalidate = () => {
    historyNeedsReload = true;
    console.log("History data invalidated - will reload on next access.");
};

async function loadUserDataIfNeeded(): Promise<void> {
    try {
        if (userNeedsReload) {
            await user.reload();
            userNeedsReload = false;
        }
        if (historyNeedsReload) {
            await history.reload();
            historyNeedsReload = false;
        }
    } catch (error) {
        console.warn("Failed to load user data:", error);
        // Reset flags on error to retry next time
        userNeedsReload = true;
        historyNeedsReload = true;
    }
}

/**
 * Show the palette and execute whatever the user picks.
 *
 * Opens immediately against whatever `commandsStore` already has loaded -
 * which, since `startLoadingCommands()` is kicked off from `plugin.create()`
 * at plugin-load time rather than here, is typically most or all of it by
 * the time the user actually launches the palette. `CommandPalette`
 * subscribes to the store, so anything still loading (most often just menu commands, on a cold run
 * with no cache yet) appears live as it resolves, with no reopen needed.
 */
export async function launchPalette(): Promise<void> {
    await loadUserDataIfNeeded();

    // Menu commands' enabled/visible/checked state is a snapshot from
    // whenever it was last fetched (plugin load, or the last "Reload
    // Plugin") and goes stale the moment the user changes selection/document
    // state - e.g. Image > Crop staying "disabled" in the palette after
    // making a selection that enables it in Photoshop's own menu bar.
    // Kick off a live re-fetch here, in the background: CommandPalette
    // re-renders on every commandsStore update, so already-visible rows correct
    // themselves as soon as it resolves, typically well before the user
    // finishes typing. Not awaited, so opening the palette itself stays
    // instant off whatever's already cached - refreshCommandType/
    // loadMenuCommandsWithCache dedup concurrent calls, so rapid opens don't
    // pile up redundant `batchPlay` round-trips.
    refreshCommandType(CommandTypes.MENU).catch((error) => {
        console.error("Failed to refresh menu command state:", error);
    });

    const startupCommandIDs =
        user.data && user.data.settings.startupCommands.length > 0
            ? user.data.settings.startupCommands
            : history.commandIDs;

    const startupCommands = sortCommandsByOccurrence(
        filterByIds(commandsStore.commands, startupCommandIDs),
        history
    );

    const result = await openPalette(startupCommands, undefined, startupCommandIDs);
    if (!result) return;

    const { query, command } = result;
    if (!command) {
        console.error("No command selected.");
        return;
    }

    if (command.destructive && !(await confirmDestructiveCommand(command))) {
        return;
    }

    // Add to history for all commands except plugin reload and pickers.
    // Pickers are excluded because their own selection doesn't reflect a
    // completed action - the real one happens inside the sub-palette
    // `command.execute()` opens below, which isn't known yet at this point
    // (and, for a picker, can take arbitrarily long - the user is still
    // choosing). `PickerCommand.execute()` records the actual item chosen
    // once it's known, instead. Kicked off here (not awaited) so it doesn't
    // delay the command the user actually asked for, but caught immediately
    // so a failed write becomes a logged error instead of an unhandled
    // rejection, and awaited below so this function doesn't return before
    // the write has actually settled.
    const historyWrite =
        command.id !== RELOAD_PLUGIN_COMMAND_ID && command.type !== CommandTypes.PICKER
            ? history.add(query, command.id).catch((error) => {
                  console.error("Failed to record history:", error);
              })
            : Promise.resolve();

    try {
        await command.execute();
    } catch (error) {
        await handleCommandExecutionError(command, error, query);
    }

    await historyWrite;
}

/**
 * Handle a panel flyout menu click. Routes to the matching `pluginCommands`
 * callback for the real actions; "customizeStartup"/"fuzzyMatch"/
 * "queryLatching" are unimplemented (they just alert "Not yet implemented" -
 * fuzzyMatch/queryLatching also toggle their own checkmark, but don't
 * actually change any behavior yet).
 */
async function invokeMenu(id: string): Promise<void> {
    const panel = entrypoints.getPanel(PANEL_ID);

    switch (id) {
        case "about":
            pluginCommands.about.callback();
            break;
        case "intro":
            pluginCommands.intro.callback();
            break;
        case "help":
            pluginCommands.help.callback();
            break;
        case "customizeStartup":
            await showAlert("Not yet implemented");
            break;
        case "fuzzyMatch":
        case "queryLatching": {
            const item = panel.menuItems.getItem(id);
            item.checked = !item.checked;
            await showAlert("Not yet implemented");
            break;
        }
        case "reloadPlugin":
            pluginCommands.reload.callback();
            break;
        case "pluginData":
            pluginCommands.data.callback();
            break;
        case "clearHistory":
            pluginCommands.clearHistory.callback();
            break;
    }
}

// Guards `setupEntrypoints()` below against running more than once -
// intended to be called exactly once (at the bottom of this file), but nothing
// stops a second call if UXP/module hot-reload behavior ever re-executes
// that module-level code without a full plugin restart. `entrypoints.setup()`
// re-registering the same handlers a second time isn't something to risk
// finding out about at runtime.
let entrypointsSetUp = false;

/**
 * Wire up UXP's entrypoints: plugin lifecycle, the panel (incl. its flyout
 * menu), and the `launchPalette` command entrypoint (for external OS-level
 * hotkey binding - see README). Called once at the bottom of this file; safe to
 * call again (a no-op) if that ever changes.
 */
export function setupEntrypoints(): void {
    if (entrypointsSetUp) return;
    entrypointsSetUp = true;

    entrypoints.setup({
        plugin: {
            async create() {
                console.log("Ps Command Palette loaded.");
                // Pre-load user data on plugin startup for faster palette launch
                await loadUserDataIfNeeded();
                // Kick off command loading now (not gated behind the user opening
                // the palette) - see startLoadingCommands' own doc comment.
                startLoadingCommands({ user });
                console.log("Plugin initialization complete");
            },
            destroy() {
                console.log("Ps Command Palette destroyed.");
            },
        },
        panels: {
            [PANEL_ID]: {
                create() {
                    setupPanel();
                },
                show() {},
                hide() {},
                destroy() {},
                invokeMenu: (id: string) => invokeMenu(id),
                menuItems: [
                    { id: "about", label: "About" },
                    { id: "intro", label: "Getting Started" },
                    { id: "help", label: "Help" },
                    {
                        id: "data",
                        label: "Data",
                        submenu: [
                            { id: "clearHistory", label: "Clear History" },
                            { id: "pluginData", label: "View User Data" },
                        ],
                    },
                    {
                        id: "settings",
                        label: "Settings",
                        submenu: [
                            { id: "customizeStartup", label: "Custom Startup..." },
                            {
                                id: "fuzzyMatch",
                                label: "Fuzzy Query Matching",
                                checked: true,
                            },
                            {
                                id: "queryLatching",
                                label: "Query Latching",
                                checked: true,
                            },
                        ],
                    },
                    { id: "reloadPlugin", label: "Reload Plugin" },
                ],
            },
        },
        commands: {
            launchPalette: {
                run: () => launchPalette(),
            },
        },
    });
}

/**
 * Fill in the panel markup from index.html and wire up its launch button.
 * There is no in-panel Cmd/Ctrl+K keyboard shortcut; the only other way to
 * invoke launchPalette is an OS-level hotkey tool bound to this plugin's
 * `launchPalette` command entrypoint (see README).
 */
function setupPanel(): void {
    const copyright = document.getElementById("main-copyright");
    if (copyright) {
        copyright.textContent = `Copyright © ${new Date().getFullYear()} ${PLUGIN_AUTHOR}`;
    }

    const pluginInfo = document.getElementById("main-plugin-info");
    if (pluginInfo) {
        pluginInfo.textContent = `Plugin Version v${host.pluginVersion}`;
    }

    document
        .getElementById("btnOpenCommandPalette")
        ?.addEventListener("click", () => launchPalette());
}

setupEntrypoints();
