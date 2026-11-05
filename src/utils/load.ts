import * as photoshop from "photoshop";

import { ActionCommand } from "../commands/ActionCommand";
import { APICommand } from "../commands/APICommand";
import {
    FileBookmarkCommand,
    FolderBookmarkCommand,
} from "../commands/BookmarkCommand";
import { MenuCommand, type MenuCommandData } from "../commands/MenuCommand";
import { PickerCommand } from "../commands/PickerCommand";
import { PluginCommand } from "../commands/PluginCommand";
import { ToolCommand } from "../commands/ToolCommand";
import type { Command } from "../commands/Command";

import { apiCommands } from "../commands/api/commands";
import { pluginCommands } from "../commands/plugin/commands";
import {
    BookmarkCommandTypes,
    CommandTypes,
    type CommandType,
} from "../commands/types";
import { cleanTitle, menuCommandsPatchShortcutKeyLUT } from "./commands";
import { user as defaultUser, type User } from "../user/User";
import { host } from "../user/host";
import { commandsStore, LOADABLE_COMMAND_TYPES } from "./CommandsStore";
import { readMenuCommandCache, writeMenuCommandCache } from "./menuCommandCache";
import type { MenuBarInfoNode } from "./uxpTypes";
import { showAlert } from "./showAlert";

import * as toolsData from "../tools.json";

const { app } = photoshop;

type LoadContext = { user: User };

// `custom` and `menu` aren't in this LUT: `custom` has no loader
// (CustomCommand is only ever created dynamically, e.g. for picker
// results); `menu` is handled separately by `loadMenuCommandsWithCache`
// below since - unlike every other type - it has two possible sources
// (disk cache, then a live refresh) instead of one.
const loadFunctionsLUT: Partial<
    Record<CommandType, (ctx: LoadContext) => Command[] | Promise<Command[]>>
> = {
    [CommandTypes.ACTION]: loadActionCommands,
    [CommandTypes.API]: loadAPICommands,
    [CommandTypes.BOOKMARK]: loadBookmarkCommands,
    [CommandTypes.PICKER]: loadPickerCommands,
    [CommandTypes.PLUGIN]: loadPluginCommands,
    [CommandTypes.TOOL]: loadToolCommands,
};

// Bumped once per `startLoadingCommands()` call. Every loader captures the
// generation that was current when IT was kicked off and checks it again
// right before writing to `commandsStore` - if a newer call has started in
// the meantime (e.g. "Reload Plugin" firing while the initial plugin-load
// fetch is still in flight), the stale result is dropped instead of
// clobbering data the newer generation already wrote into a freshly-reset
// store. Module-level, not per-store, since it also gates `refreshCommandType`.
let currentGeneration = 0;

/**
 * Kick off loading every command type into `commandsStore`, without waiting
 * for any of them - each type populates the store independently as soon as
 * IT resolves, instead of the vanilla plugin's `loadCommands()` gating the
 * whole flat array behind `Promise.all`. Tools/actions/API/plugin/bookmarks
 * are all fast or synchronous and should be searchable well before menu
 * commands land, even on a cold run with no cache yet.
 *
 * Called once from `main.ts`'s `entrypoints.setup().plugin.create()` -
 * i.e. at Photoshop/plugin-load time, not gated behind the user opening the
 * palette. By the time they actually launch the palette, this is likely
 * already resolved or well underway. Also called again by "Reload Plugin" -
 * the returned promise lets a caller `await` full completion if it ever
 * needs to, but every existing caller still fires it and moves on.
 */
export function startLoadingCommands(
    context: LoadContext = { user: defaultUser }
): Promise<void> {
    const generation = ++currentGeneration;

    commandsStore.beginLoading(LOADABLE_COMMAND_TYPES);

    const loads: Promise<void>[] = [];

    for (const type of LOADABLE_COMMAND_TYPES) {
        if (type === CommandTypes.MENU) continue; // handled below

        const func = loadFunctionsLUT[type];
        if (!func) {
            commandsStore.upsertType(type, []);
            continue;
        }

        loads.push(
            Promise.resolve()
                .then(() => func(context))
                .then((commands) => {
                    if (generation !== currentGeneration) return; // superseded
                    console.log(`${type}: ${commands.length} commands loaded.`);
                    commandsStore.upsertType(type, commands);
                })
                .catch((error) => {
                    if (generation !== currentGeneration) return; // superseded
                    console.error(`Failed to load ${type} commands:`, error);
                    commandsStore.upsertType(type, []);
                })
        );
    }

    loads.push(loadMenuCommandsWithCache());

    return Promise.allSettled(loads).then(() => {});
}

/**
 * Re-run a single command type's loader and replace its slice of
 * `commandsStore`, without touching any other type. For anything that
 * mutates data a loader depends on (e.g. bookmarks added/relinked after
 * `startLoadingCommands()` already ran once at plugin-load time) - without
 * this, the change is only ever picked up by "Reload Plugin" or a full
 * plugin restart.
 */
export async function refreshCommandType(
    type: CommandType,
    context: LoadContext = { user: defaultUser }
): Promise<void> {
    if (type === CommandTypes.MENU) {
        await loadMenuCommandsWithCache();
        return;
    }

    const generation = currentGeneration;
    const func = loadFunctionsLUT[type];
    if (!func) return;

    try {
        const commands = await func(context);
        if (generation !== currentGeneration) return; // superseded
        commandsStore.upsertType(type, commands);
    } catch (error) {
        console.error(`Failed to refresh ${type} commands:`, error);
    }
}

// Shared by every in-flight `loadMenuCommandsWithCache()` call so concurrent
// callers (e.g. two rapid "Reload Plugin" invocations) await the same fetch
// instead of each firing their own `batchPlay(menuBarInfo)` round-trip and
// their own overlapping cache write.
let menuLoadInFlight: Promise<void> | null = null;

// Set after a failed live menu fetch has been reported, so a persistent
// failure alerts once instead of on every palette open (each one runs a
// background refresh). Cleared by the next successful fetch.
let menuFetchFailureReported = false;

/**
 * Menu commands: hydrate the store instantly from a cached, host-version-
 * matched list if one exists (palette is fully searchable, including menu
 * commands, before the live fetch even starts), then kick off the real
 * `batchPlay` fetch in true background and replace the store's menu slice
 * (and the on-disk cache) once it resolves.
 *
 * A failed live fetch keeps whatever the store already has and never
 * touches the disk cache - caching a failed (empty) result would wipe menu
 * commands from every later session too - and tells the user once.
 *
 * Not generation-gated like the other loaders: the data it fetches ("the
 * current live menu tree") doesn't depend on `LoadContext`, so there's
 * nothing generation-specific about it - any caller wants the same result,
 * which is exactly what makes the in-flight dedup above safe.
 */
function loadMenuCommandsWithCache(): Promise<void> {
    if (menuLoadInFlight) return menuLoadInFlight;

    menuLoadInFlight = (async () => {
        const cached = await readMenuCommandCache(host.hostVersion);
        if (cached) {
            console.log(`menu: ${cached.length} commands loaded from cache.`);
            commandsStore.upsertType(CommandTypes.MENU, cached.map(toMenuCommand));
        }

        let fresh: MenuCommandData[];
        try {
            fresh = await fetchLiveMenuCommandData();
        } catch (error) {
            console.error("Failed to load menu commands:", error);
            // Only end the "loading" state - never replace menu commands the
            // store already holds (from the cache or an earlier fetch).
            if (commandsStore.loadingTypes.includes(CommandTypes.MENU)) {
                commandsStore.upsertType(CommandTypes.MENU, []);
            }
            if (!menuFetchFailureReported) {
                menuFetchFailureReported = true;
                const hasMenuCommands = commandsStore.commands.some(
                    (command) => command.type === CommandTypes.MENU
                );
                await showAlert(
                    "Menu commands error\n\nPhotoshop's menu commands couldn't be loaded" +
                        (hasMenuCommands
                            ? ", so the palette is showing the last loaded list."
                            : ".") +
                        " Try 'Reload Plugin' if this keeps happening."
                );
            }
            return;
        }

        menuFetchFailureReported = false;
        console.log(`menu: ${fresh.length} commands loaded live.`);
        commandsStore.upsertType(CommandTypes.MENU, fresh.map(toMenuCommand));
        await writeMenuCommandCache(host.hostVersion, fresh);
    })().finally(() => {
        menuLoadInFlight = null;
    });

    return menuLoadInFlight;
}

function toMenuCommand(data: MenuCommandData): MenuCommand {
    return new MenuCommand(data);
}

/////////////////////////////////
// command type load functions //
/////////////////////////////////

async function loadActionCommands(): Promise<Command[]> {
    const actionTree = app.actionTree;
    const actions: Command[] = new Array(
        actionTree.reduce((count, set) => count + set.actions.length, 0)
    );

    let index = 0;
    for (const set of actionTree) {
        for (const action of set.actions) {
            actions[index++] = new ActionCommand(action);
        }
    }
    return actions;
}

function loadAPICommands(): Command[] {
    return Object.entries(apiCommands).map(
        ([key, obj]) =>
            new APICommand(
                key,
                obj.name,
                obj.description,
                obj.callback,
                obj.destructive
            )
    );
}

async function loadBookmarkCommands({ user }: LoadContext): Promise<Command[]> {
    if (!user.data?.bookmarks) return [];
    return user.data.bookmarks.map((bookmark) =>
        bookmark.type === BookmarkCommandTypes.FILE
            ? new FileBookmarkCommand({ ...bookmark })
            : new FolderBookmarkCommand({ ...bookmark })
    );
}

/**
 * Fetch the live menu command tree via `batchPlay`'s `menuBarInfo` property
 * and flatten it into plain, JSON-serializable `MenuCommandData` - the raw
 * shape `MenuCommand`'s constructor accepts, so the exact same data can come
 * from either this live fetch or the disk cache and produce identical
 * `MenuCommand` instances either way.
 *
 * This one `batchPlay` call (returning Photoshop's entire ~800-item menu
 * tree in a single atomic IPC round-trip) is the actual bottleneck - past
 * attempts to speed this up by optimizing the JS-side tree-walk below
 * didn't move the needle, because the walk was never the slow part.
 *
 * @throws if the `batchPlay` call fails or returns no menu commands - a
 * real menu bar always has hundreds, so an empty result is a failed fetch,
 * not "no menus".
 */
async function fetchLiveMenuCommandData(): Promise<MenuCommandData[]> {
    const menusToIgnore = new Set(["Open Recent"]);
    const menuItemsToIgnore = new Set<string>();

    // Pre-compile patch lookup as Map for faster access
    const menuItemsToPatchName = new Map<number, (str: string) => string>([
        [7802, () => "Define Variables"],
        [1099, () => "New Layer"],
        [1942, () => "New Layer from Background"],
        [2976, () => "New Group"],
        [2956, () => "New Group from Layers"],
        [9220, () => "New Artboard"],
        [9221, () => "New Artboard from Group"],
        [9222, () => "New Artboard from Layers"],
        [1100, (str) => `Delete ${str}`],
        [2951, () => "Delete Hidden Layers"],
    ]);

    /**
     * Get all current Photoshop menu commands via batchPlay and the
     * `menuBarInfo` property. Lets a `batchPlay` error propagate - see
     * this function's `@throws`.
     */
    const getMenuBarItems = () =>
        app.batchPlay(
            [
                {
                    _obj: "get",
                    _target: [{ _property: "menuBarInfo" }, { _ref: "application" }],
                },
            ],
            {}
        );

    /**
     * Flatten the menu tree into `MenuCommandData`. Uses an iterative
     * approach instead of recursion.
     */
    const buildMenus = (root: MenuBarInfoNode | undefined): MenuCommandData[] => {
        if (!root?.submenu) return [];

        const results: MenuCommandData[] = [];
        const stack: { node: MenuBarInfoNode; path: string[] }[] = [
            { node: root, path: [] },
        ];

        while (stack.length > 0) {
            const { node, path } = stack.pop()!;

            if (!node) continue;
            if (!Array.isArray(node.submenu) && node.kind !== "item") continue;

            if (Array.isArray(node.submenu)) {
                for (const submenu of node.submenu) {
                    const cleanedTitle = cleanTitle(submenu.title);

                    if (
                        !menusToIgnore.has(cleanedTitle) &&
                        !menuItemsToIgnore.has(cleanedTitle)
                    ) {
                        stack.push({ node: submenu, path: [...path, cleanedTitle] });
                    }
                }
            }

            if (node.kind === "item") {
                // patch name if needed - use Map.has() for faster lookup
                if (menuItemsToPatchName.has(node.command)) {
                    node.name = menuItemsToPatchName.get(node.command)!(node.name);
                }

                // clean title for display
                node.title = cleanTitle(node.title);

                // stringify menu shortcut
                node.menuShortcut =
                    menuCommandsPatchShortcutKeyLUT[node.command] || node.menuShortcut;

                results.push({
                    name: node.name,
                    title: node.title,
                    command: node.command,
                    path: [...path],
                    enabled: node.enabled,
                    visible: node.visible,
                    checked: node.checked,
                    menuShortcut: node.menuShortcut,
                });
            }
        }
        return results;
    };

    const menuBarItems = await getMenuBarItems();
    const commands = buildMenus(menuBarItems?.[0]?.menuBarInfo as MenuBarInfoNode);
    if (commands.length === 0) {
        throw new Error("Photoshop returned no menu commands (menuBarInfo was empty).");
    }
    return commands;
}

async function loadPickerCommands({ user }: LoadContext): Promise<Command[]> {
    if (!user.data?.pickers) return [];
    return user.data.pickers.map((picker) => new PickerCommand({ ...picker }));
}

function loadPluginCommands(): Command[] {
    return Object.entries(pluginCommands).map(
        ([key, obj]) =>
            new PluginCommand(
                key,
                obj.name,
                obj.description,
                obj.callback,
                obj.destructive
            )
    );
}

function loadToolCommands(): Command[] {
    return toolsData.tools.map(
        (tool) =>
            new ToolCommand(
                tool._ref,
                tool.name,
                tool.description,
                tool.keyboardShortcut ?? undefined
            )
    );
}
