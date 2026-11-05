import type { Command } from "../commands/Command";
import type { History } from "../user/History";

/**
 * Remove nagging "&" characters that are returned from the `menuBarInfo` property.
 */
export const cleanTitle = (title: string): string => {
    return title.replace(/(\S)&/g, "$1").replace(/&(\S)/g, "$1").trim();
};

export type KeyboardShortcut = {
    shiftKey: boolean;
    commandKey: boolean;
    optionKey: boolean;
    controlKey: boolean;
    keyChar: string;
};

/**
 * Generate a keyboard shortcut combination string.
 */
export const generateKeyboardShortcut = (
    keyboardShortcut: KeyboardShortcut
): string => {
    const { shiftKey, controlKey, optionKey, commandKey, keyChar } = keyboardShortcut;
    const modifiers = [
        shiftKey ? "⇧" : "",
        controlKey ? "⌃" : "",
        optionKey ? "⌥" : "",
        commandKey ? "⌘" : "",
    ];
    return [...modifiers, keyChar].filter(Boolean).join("");
};

/** Known-broken menu shortcuts patched by commandID, keyed to the real key. */
export const menuCommandsPatchShortcutKeyLUT: Record<number, KeyboardShortcut> = {
    5069: {
        // Edit in Quick Mask Mode
        shiftKey: false,
        commandKey: false,
        optionKey: false,
        controlKey: false,
        keyChar: "Q",
    },
    5991: {
        // Standard Screen Mode
        shiftKey: false,
        commandKey: false,
        optionKey: false,
        controlKey: false,
        keyChar: "F",
    },
    5992: {
        // Full Screen Mode With Menu Bar
        shiftKey: false,
        commandKey: false,
        optionKey: false,
        controlKey: false,
        keyChar: "F",
    },
    5993: {
        // Full Screen Mode
        shiftKey: false,
        commandKey: false,
        optionKey: false,
        controlKey: false,
        keyChar: "F",
    },
};

/**
 * Sort commands by total usage score, then by name.
 */
export function sortCommandsByOccurrence(
    commands: Command[],
    history: History
): Command[] {
    return commands.slice().sort((a, b) => {
        const scoreA = history.occurrencesLUT?.[a.id] || 0;
        const scoreB = history.occurrencesLUT?.[b.id] || 0;

        // sort by occurrence score (higher first), then by name (alphabetically)
        return scoreB - scoreA || a.name.localeCompare(b.name);
    });
}

/**
 * Sort commands by HISTORY recency score, then by name.
 */
export function sortCommandsByRecency(
    commands: Command[],
    history: History
): Command[] {
    return commands.slice().sort((a, b) => {
        const scoreA = history.recencyLUT?.get(a.id) || 0;
        const scoreB = history.recencyLUT?.get(b.id) || 0;

        // sort by recency score (higher first), then by name (alphabetically)
        return scoreB - scoreA || a.name.localeCompare(b.name);
    });
}
