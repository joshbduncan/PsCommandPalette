import type { CommandType } from "./types";

/**
 * Base class for a command palette command.
 *
 * Holds no DOM/element state and dispatches no DOM events - rendering and
 * selection are owned entirely by `palettes/renderCommandItem.ts` and
 * `palettes/CommandPalette.ts`. Subclasses only
 * need to set constructor fields and override `execute()`.
 */
export class Command {
    id: string;
    name: string;
    type: CommandType;
    description: string;
    /**
     * Not currently used to gate selection/execution, or to visually
     * distinguish a row in renderCommandItem.ts - both were tried and
     * reverted. For `MenuCommand` this is sourced from Photoshop's
     * `menuBarInfo`, which has demonstrated real staleness/inaccuracy on
     * some Photoshop versions (`core.getMenuCommandState()` is no better -
     * 27.9.1 reported many available commands as unavailable), so it isn't
     * reliable enough to act on either way - blocking interaction made actually-
     * available commands unreachable, and greying the row out just made an
     * otherwise-normal command look broken. Kept on the model as plain data
     * regardless - it becomes meaningful again the moment Photoshop's own
     * reporting can be trusted.
     */
    enabled: boolean;
    /**
     * Segments matched against fuzzy search, in order, treated as one
     * continuous string for matching purposes (see `matchQuery.ts`).
     * Defaults to `[name]`. The last element must always be `name` itself -
     * `highlight.ts`'s title highlighting relies on that to slice out the
     * portion of the match that landed in the title, rather than
     * re-matching the title independently.
     */
    queryParts: string[];
    /** `queryParts.join(" ")` - kept for chunk-based relevance scoring in `query.ts`. */
    queryString: string;
    /**
     * `queryString`, lowercased and split on whitespace into chunks -
     * precomputed once here rather than inside `query.ts`'s `scoreCommand`,
     * which used to re-lowercase and re-split the same string on every
     * pairwise comparison the sort comparator made (O(n log n) recomputes
     * of unchanging data instead of one).
     */
    queryStringChunksLower: string[];
    /** `name.toLowerCase()`, precomputed for the same reason as `queryStringChunksLower`. */
    nameLower: string;
    keyboardShortcut?: string;
    /**
     * Marks a command as hard-to-reverse (e.g. "Clear Plugin History",
     * "Close Document Without Saving") - the palette runs whatever's
     * selected on a bare Enter/click, which makes accidentally triggering
     * one of these unusually easy. `main.ts`/`PickerCommand.ts` show a
     * confirm dialog (`confirmDestructiveCommand`) before calling
     * `execute()` when this is true.
     */
    destructive: boolean;
    /**
     * Whether `execute()` runs in `core.executeAsModal()`. Callers that just
     * closed a dialog (the palette, a confirm) await
     * `waitForModalToClose()` before executing one of these, or Photoshop
     * leaves the closed dialog on screen until the command finishes.
     * Subclasses that use `executeAsModal()` set it to true.
     */
    runsAsModal = false;

    constructor(
        id: string,
        name: string,
        type: CommandType,
        description = "",
        enabled = true,
        queryParts: string[] | null = null,
        destructive = false
    ) {
        if (!id || !name || !type) {
            throw new Error("Command requires a valid ID, name, and type.");
        }

        this.id = id;
        this.name = name;
        this.type = type;
        this.description = description;
        this.enabled = enabled;
        this.queryParts = queryParts && queryParts.length > 0 ? queryParts : [name];
        this.queryString = this.queryParts.join(" ");
        this.queryStringChunksLower = this.queryString.toLowerCase().split(/\s+/);
        this.nameLower = name.toLowerCase();
        this.destructive = destructive;
    }

    /**
     * Execute the command.
     */
    async execute(): Promise<unknown> {
        throw new Error(`Execute method not implemented for command: ${this.id}`);
    }
}
