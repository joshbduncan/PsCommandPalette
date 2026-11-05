import type { Command } from "../commands/Command";
import { CommandTypes, type CommandType } from "../commands/types";
import { filterCommandsByQuery, filterByIds, type CommandFilter } from "../utils/query";
import { sortCommandsByOccurrence } from "../utils/commands";
import { normalizeQuery } from "../utils/queryNormalize";
import { history } from "../user/History";
import { commandsStore } from "../utils/CommandsStore";
import { createElement } from "../utils/dom";
import { renderCommandItem, setItemSelected } from "./renderCommandItem";
import type { ModalContext } from "../dialogs/showModal";

const DEBOUNCE_MS = 25;
const MAX_RESULTS = 30;
const HASHTAG_TYPE_REGEX = /#(\w+)/g;

// User-facing labels for command types - `CommandTypes` values are
// internal ids (e.g. the API type's id is literally "photoshop"), not
// fit to show directly in loading/status copy.
const TYPE_LABELS: Record<CommandType, string> = {
    [CommandTypes.ACTION]: "actions",
    [CommandTypes.API]: "Photoshop commands",
    [CommandTypes.BOOKMARK]: "bookmarks",
    [CommandTypes.CUSTOM]: "custom commands",
    [CommandTypes.MENU]: "menu commands",
    [CommandTypes.PICKER]: "pickers",
    [CommandTypes.PLUGIN]: "plugin commands",
    [CommandTypes.TOOL]: "tools",
};

export type PaletteResult = { query: string; command: Command };

export type CommandPaletteOptions = {
    /** Shown before the user types anything. */
    startupCommands: Command[];
    /** Static override for a picker sub-palette. Omit to search the live global store. */
    commands?: Command[];
    /** See `openPalette()`'s doc comment - present only for the top-level launch. */
    startupCommandIDs?: string[];
};

type ParsedSearchQuery = {
    /** Hashtags stripped out, for both filtering and highlighting to share. */
    text: string;
    /** Every recognized `#type` hashtag found, deduplicated - all of them apply (no first-match-only limitation). */
    types?: CommandType[];
    /** `#word` hashtags that don't match a known `CommandType`, e.g. `#tools` (typo for `#tool`) - surfaced in the info text rather than silently searched as literal text. */
    unknownTags?: string[];
};

/**
 * Strip every recognized command-type hashtag (e.g. `#tool blur`, or
 * `#tool #action blur` for more than one) out of `query`, once, for both
 * filtering and highlighting to share. Unrecognized hashtags are stripped
 * too (rather than left in as fuzzy text they're unlikely to match) and
 * reported in `unknownTags`.
 */
function parseSearchQuery(query: string): ParsedSearchQuery {
    const tagMatches = [...query.matchAll(HASHTAG_TYPE_REGEX)];
    if (tagMatches.length === 0) return { text: query };

    const knownTypes = Object.values(CommandTypes) as string[];
    const types: CommandType[] = [];
    const unknownTags: string[] = [];

    for (const tagMatch of tagMatches) {
        if (knownTypes.includes(tagMatch[1])) {
            const type = tagMatch[1] as CommandType;
            if (!types.includes(type)) types.push(type);
        } else {
            unknownTags.push(tagMatch[0]);
        }
    }

    const text = query.replace(HASHTAG_TYPE_REGEX, "").trim().replace(/\s+/g, " ");

    return {
        text,
        types: types.length > 0 ? types : undefined,
        unknownTags: unknownTags.length > 0 ? unknownTags : undefined,
    };
}

/**
 * Step from `current` in `direction`, wrapping. Doesn't skip disabled
 * items - `enabled` (menu commands especially, from Photoshop's own
 * `menuBarInfo`) has demonstrated real staleness/inaccuracy on some
 * Photoshop versions, so treating it as reliable enough to gate
 * *navigation* on would make actually-available commands unreachable
 * (see renderCommandItem.ts's comment - rows aren't visually
 * distinguished by `enabled` either, for the same reason).
 */
function nextIndex(current: number, direction: 1 | -1, length: number): number {
    if (length === 0) return current;
    return direction === 1
        ? current >= length - 1
            ? 0
            : current + 1
        : current <= 0
          ? length - 1
          : current - 1;
}

/**
 * The command palette's search box + results list, built into a modal
 * `<dialog>` by `mount()` (see `openPalette()`).
 *
 * With no static `commands` list (the top-level launch), it searches the
 * live `commandsStore` and re-renders every time a command type finishes
 * loading - so the dialog can open instantly against whatever's already
 * loaded, and anything still in flight (usually menu commands on a cold
 * run) appears without a reopen.
 */
export class CommandPalette {
    #options: CommandPaletteOptions;

    #rawQuery = "";
    #debouncedQuery = "";
    #searchQuery: ParsedSearchQuery = { text: "" };
    #filteredCommands: Command[] = [];
    #visibleCommands: Command[] = [];
    #selectedIndex = 0;
    // The query the list was last rendered for - null until the first
    // render, so that one always counts as a query change.
    #renderedQuery: string | null = null;
    // -1 = not currently viewing a history entry; 0 = the most recent
    // unique query, counting up toward older ones.
    #historyIndex = -1;
    #debounceTimer: ReturnType<typeof setTimeout> | undefined;

    #close: ((result?: PaletteResult) => void) | null = null;
    #querybox: HTMLInputElement | null = null;
    #listbox: HTMLUListElement | null = null;
    #info: HTMLElement | null = null;

    /**
     * @param options - startup commands, plus an optional static command
     * list / live startup command IDs (see `CommandPaletteOptions`).
     */
    constructor(options: CommandPaletteOptions) {
        if (!options || !Array.isArray(options.startupCommands)) {
            throw new TypeError("Startup commands must be an array");
        }
        if (options.commands && !Array.isArray(options.commands)) {
            throw new TypeError("Commands must be an array");
        }
        this.#options = options;
    }

    /**
     * Build the palette into `dialog` and wire up its listeners.
     * @returns A cleanup function that removes every listener/subscription.
     */
    mount({ dialog, close }: ModalContext<PaletteResult>): () => void {
        this.#close = close;
        dialog.id = "ps-command-palette";

        const querybox = createElement("sp-textfield", {
            id: "query",
            type: "search",
            placeholder: "Search for menu commands, tools, actions, and more...",
        }) as HTMLInputElement;
        const listbox = createElement("ul", { id: "commands" }) as HTMLUListElement;
        const info = createElement("sp-body", { id: "info", size: "XS" });

        const form = createElement(
            "form",
            { id: "command-palette-form" },
            querybox,
            createElement("sp-divider", {
                id: "query-listbox-divider",
                size: "medium",
            }),
            createElement("div", { id: "commands-list" }, listbox)
        );
        dialog.appendChild(form);
        dialog.appendChild(info);

        this.#querybox = querybox;
        this.#listbox = listbox;
        this.#info = info;

        const handleInput = (event: Event) => {
            // genuine user typing always breaks out of history-scroll mode
            this.#historyIndex = -1;
            this.setQuery((event.target as HTMLInputElement).value);
        };
        const handleSubmit = (event: Event) => {
            event.preventDefault();
            this.submitCommand();
        };
        const handleKeydown = (event: KeyboardEvent) => this.handleKeydown(event);
        // Keydown handling (arrow/Tab nav, and native Enter-submits-form) only
        // works while focus is somewhere inside `dialog` - if a mouse
        // interaction ever moves focus outside it, both break at once. Pull
        // focus back to the query box whenever that happens.
        const handleFocusOut = () => {
            requestAnimationFrame(() => {
                if (!dialog.contains(document.activeElement)) {
                    querybox.focus();
                }
            });
        };
        // UXP fires "load" on the dialog once uxpShowModal() has actually
        // presented it (not a standard <dialog> event, but the real signal in
        // the UXP runtime).
        const handleDialogLoad = () => querybox.focus();

        querybox.addEventListener("input", handleInput);
        form.addEventListener("submit", handleSubmit);
        dialog.addEventListener("keydown", handleKeydown);
        dialog.addEventListener("focusout", handleFocusOut);
        dialog.addEventListener("load", handleDialogLoad);
        // Fallback in case "load" doesn't fire for some reason - focusing
        // twice is harmless.
        requestAnimationFrame(() => querybox.focus());

        // Only the top-level launch searches the live store - a picker
        // sub-palette's fixed command list has nothing to subscribe to.
        const unsubscribe = this.#options.commands
            ? () => {}
            : commandsStore.subscribe(() => this.refresh());

        this.refresh();

        return () => {
            clearTimeout(this.#debounceTimer);
            unsubscribe();
            querybox.removeEventListener("input", handleInput);
            form.removeEventListener("submit", handleSubmit);
            dialog.removeEventListener("keydown", handleKeydown);
            dialog.removeEventListener("focusout", handleFocusOut);
            dialog.removeEventListener("load", handleDialogLoad);
            this.#close = null;
        };
    }

    /**
     * Update the raw query and (debounced) re-filter. Debounces filtering,
     * not the input itself, so the textbox stays instantly responsive while
     * the (potentially large) result re-filter lags slightly behind.
     */
    private setQuery(value: string): void {
        this.#rawQuery = value;
        clearTimeout(this.#debounceTimer);
        this.#debounceTimer = setTimeout(() => {
            this.#debouncedQuery = this.#rawQuery;
            this.#searchQuery = parseSearchQuery(this.#debouncedQuery);
            this.refresh();
        }, DEBOUNCE_MS);
    }

    private get liveCommands(): Command[] {
        return this.#options.commands ?? commandsStore.commands;
    }

    /**
     * The empty-query view. `startupCommands` itself is only a one-time
     * snapshot resolved before the dialog opened (see main.ts's
     * launchPalette) - without re-resolving `startupCommandIDs` against the
     * live store here, the empty-query view would never notice e.g. a menu
     * command's `enabled` state changing while the palette sits open.
     * Picker sub-palettes have no `startupCommandIDs`, so they fall back to
     * the static snapshot as-is.
     */
    private get liveStartupCommands(): Command[] {
        const { startupCommandIDs, startupCommands } = this.#options;
        return startupCommandIDs
            ? sortCommandsByOccurrence(
                  filterByIds(this.liveCommands, startupCommandIDs),
                  history
              )
            : startupCommands;
    }

    /**
     * Unique, non-empty history queries, most recent first - deduped on
     * `normalizeQuery` (so "blur"/"Blur"/" blur " count as one entry) but
     * recalled using the original text of the most recent occurrence of
     * each. Startup-command selections record an empty query in history,
     * which is excluded here rather than surfaced as a blank "entry".
     */
    private get recentQueries(): string[] {
        const seen = new Set<string>();
        const queries: string[] = [];
        for (const entry of history.data) {
            const key = normalizeQuery(entry.query);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            queries.push(entry.query);
        }
        return queries;
    }

    /** Re-filter against the current query/commands and re-render the list and info text. */
    private refresh(): void {
        if (this.#debouncedQuery === "") {
            this.#filteredCommands = this.liveStartupCommands;
        } else {
            const filters: CommandFilter = {};
            // TODO: should disabled commands be included in the results
            filters.disabled = true;
            if (this.#searchQuery.types) {
                filters.types = this.#searchQuery.types;
            }
            this.#filteredCommands = filterCommandsByQuery(
                this.#searchQuery.text,
                this.liveCommands,
                filters
            );
        }

        // A new query starts back at the top result. A live store update
        // under the same query (a type finishing loading, the background
        // menu refresh) keeps the user's selection on the same command if
        // it's still listed, rather than yanking it back to row 0.
        const previousId = this.#visibleCommands[this.#selectedIndex]?.id;
        const queryChanged = this.#debouncedQuery !== this.#renderedQuery;
        this.#renderedQuery = this.#debouncedQuery;

        this.#visibleCommands = this.#filteredCommands.slice(0, MAX_RESULTS);
        const keptIndex =
            queryChanged || previousId === undefined
                ? -1
                : this.#visibleCommands.findIndex((c) => c.id === previousId);
        this.#selectedIndex = Math.max(keptIndex, 0);

        this.renderList();
        this.renderInfo();
    }

    private renderList(): void {
        const listbox = this.#listbox;
        if (!listbox) return;

        if (this.#visibleCommands.length === 0) {
            listbox.replaceChildren(
                createElement("li", { class: "empty-state" }, this.emptyStateText)
            );
            return;
        }

        const onSelect = (command: Command) => this.selectCommand(command);
        const fragment = document.createDocumentFragment();
        this.#visibleCommands.forEach((command, index) => {
            fragment.appendChild(
                renderCommandItem(command, {
                    selected: index === this.#selectedIndex,
                    query: this.#searchQuery.text,
                    onSelect,
                })
            );
        });
        listbox.replaceChildren(fragment);
        this.scrollSelectedIntoView();
    }

    /** What an empty list says instead of rendering as a blank box. */
    private get emptyStateText(): string {
        if (!this.#options.commands && commandsStore.loadingTypes.length > 0) {
            return "Loading commands…";
        }
        if (this.#debouncedQuery === "") {
            return "Start typing to search menu commands, tools, actions, and more.";
        }
        return "No matching commands.";
    }

    private renderInfo(): void {
        if (!this.#info) return;

        const count = this.#filteredCommands.length;
        const resultText = count === 1 ? "1 result" : `${count} results`;

        // Only meaningful when reading the live global store (not a picker's
        // static override) - `commandsStore.loadingTypes` doesn't apply to a
        // picker's own fixed command list.
        const loadingTypes = commandsStore.loadingTypes;
        const countText =
            !this.#options.commands && loadingTypes.length > 0
                ? `${resultText} (loading ${loadingTypes.map((type) => TYPE_LABELS[type]).join(", ")}…)`
                : resultText;

        const { unknownTags } = this.#searchQuery;
        if (!unknownTags) {
            this.#info.textContent = countText;
            return;
        }

        // Surface a mistyped/unrecognized `#type` hashtag (e.g. `#tools` for
        // `#tool`) explicitly, rather than letting it silently fall through
        // to an unfiltered (or seemingly empty) result list with no
        // indication why the filter didn't apply.
        const label = unknownTags.length === 1 ? "filter" : "filters";
        this.#info.textContent = `Unknown ${label}: ${unknownTags.join(", ")} — ${countText}`;
    }

    private setSelectedIndex(index: number): void {
        const items = this.#listbox?.children;
        if (items) {
            const previous = items[this.#selectedIndex];
            if (previous) setItemSelected(previous, false);
            const next = items[index];
            if (next) setItemSelected(next, true);
        }
        this.#selectedIndex = index;
        this.scrollSelectedIntoView();
    }

    /**
     * Keep the selected row scrolled into view as selection moves. Instant,
     * not smooth: holding an arrow key would otherwise queue one animation
     * per keypress and the list would visibly lag behind the selection.
     */
    private scrollSelectedIntoView(): void {
        const el = this.#listbox?.children[this.#selectedIndex] as
            HTMLElement | undefined;
        el?.scrollIntoView({ block: "nearest", behavior: "auto" });
    }

    private recallHistoryQuery(index: number): void {
        this.#historyIndex = index;
        const query = this.recentQueries[index];
        if (this.#querybox) this.#querybox.value = query;
        this.setQuery(query);
    }

    private handleKeydown(event: KeyboardEvent): void {
        if (event.key === "Escape") {
            // sp-textfield[type="search"] has its own native "Escape clears
            // the field" behavior, which fires an input event and can win
            // out before/instead of the dialog's own close-on-Escape - so
            // don't rely on that, close explicitly.
            event.preventDefault();
            this.#close?.();
            return;
        }

        if (!["ArrowDown", "ArrowUp", "Tab"].includes(event.key)) return;
        event.preventDefault();

        // Only Up/Down drive history traversal, bidirectionally, over
        // `recentQueries` - Tab/Shift+Tab always navigate results instead,
        // even with an empty query, rather than being overloaded with two
        // different meanings depending on history-scroll state. History mode
        // starts from an empty query box and lasts until the user types (a
        // recalled entry fills the box, so the empty check alone would only
        // ever allow recalling the newest entry).
        const inHistoryMode = this.#rawQuery === "" || this.#historyIndex >= 0;
        if (inHistoryMode && event.key === "ArrowUp") {
            const recentQueries = this.recentQueries;
            if (recentQueries.length === 0) return;
            this.recallHistoryQuery(
                Math.min(this.#historyIndex + 1, recentQueries.length - 1)
            );
            return;
        }
        if (inHistoryMode && event.key === "ArrowDown") {
            // Step back toward more recent entries, then exit history mode
            // entirely once already at the newest one.
            if (this.#historyIndex > 0) {
                this.recallHistoryQuery(this.#historyIndex - 1);
                return;
            }
            this.#historyIndex = -1;
            // falls through to normal result navigation below
        }

        const length = this.#visibleCommands.length;
        if (length === 0) return;

        if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
            this.setSelectedIndex(nextIndex(this.#selectedIndex, 1, length));
        } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
            this.setSelectedIndex(nextIndex(this.#selectedIndex, -1, length));
        }
    }

    private selectCommand(command: Command): void {
        this.#close?.({ query: this.#rawQuery, command });
    }

    private submitCommand(): void {
        const command = this.#visibleCommands[this.#selectedIndex];
        if (command) this.selectCommand(command);
    }
}
