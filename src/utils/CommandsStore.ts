import { CommandTypes, type CommandType } from "../commands/types";
import type { Command } from "../commands/Command";

export type CommandsStoreListener = () => void;

/**
 * The live, incrementally-populated set of loadable commands.
 *
 * Each command type's loader calls `upsertType()` independently as soon as
 * IT resolves - fast/synchronous types (tools, actions, API, plugin,
 * bookmarks) show up well before the slow one (menu commands, gated behind
 * a single `batchPlay` IPC round-trip - see load.ts / menuCommandCache.ts
 * for why that's the one worth caching).
 *
 * Anything that needs to react to changes (the open palette) calls
 * `subscribe()` and re-renders whenever a type finishes loading - no manual
 * "was the user mid-query, re-run the filter" bookkeeping needed.
 */
export class CommandsStore {
    #byType: Partial<Record<CommandType, Command[]>> = {};
    #loadingTypes: CommandType[] = [];
    #commands: Command[] | null = null;
    #listeners = new Set<CommandsStoreListener>();

    /** Every loaded command, across all types (flattened once per change). */
    get commands(): Command[] {
        if (this.#commands === null) {
            this.#commands = Object.values(this.#byType).flat();
        }
        return this.#commands;
    }

    /** Command types whose loaders haven't resolved yet. */
    get loadingTypes(): readonly CommandType[] {
        return this.#loadingTypes;
    }

    /**
     * Call `listener` after every change to the store.
     * @returns A function that removes the listener again.
     */
    subscribe(listener: CommandsStoreListener): () => void {
        if (typeof listener !== "function") {
            throw new TypeError("CommandsStore listener must be a function");
        }
        this.#listeners.add(listener);
        return () => {
            this.#listeners.delete(listener);
        };
    }

    /** Mark `types` as in-flight, e.g. before kicking off their loader promises. */
    beginLoading(types: CommandType[]): void {
        this.#loadingTypes = [...new Set([...this.#loadingTypes, ...types])];
        this.notify();
    }

    /** Replace a single type's slice of the command list. */
    upsertType(type: CommandType, commands: Command[]): void {
        this.#byType = { ...this.#byType, [type]: commands };
        this.#commands = null;
        if (this.#loadingTypes.includes(type)) {
            this.#loadingTypes = this.#loadingTypes.filter((t) => t !== type);
        }
        this.notify();
    }

    /** Clear everything (e.g. on "Reload Plugin"). */
    reset(): void {
        this.#byType = {};
        this.#commands = null;
        this.#loadingTypes = [];
        this.notify();
    }

    /**
     * Call every subscribed listener. A listener that throws is logged and
     * skipped, so one broken subscriber can't stop the others updating.
     */
    private notify(): void {
        for (const listener of this.#listeners) {
            try {
                listener();
            } catch (error) {
                console.error("CommandsStore listener failed:", error);
            }
        }
    }
}

export const commandsStore = new CommandsStore();

/** All command types that ever get loaded up front (excludes `custom`, which is only ever created dynamically). */
export const LOADABLE_COMMAND_TYPES: CommandType[] = Object.values(CommandTypes).filter(
    (type) => type !== CommandTypes.CUSTOM
);
