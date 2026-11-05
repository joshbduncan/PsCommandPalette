import { showModal } from "../dialogs/showModal";
import { CommandPalette, type PaletteResult } from "./CommandPalette";
import type { Command } from "../commands/Command";

export type { PaletteResult };

/**
 * Show the command palette and resolve with the selected command (or
 * `undefined` if the user cancelled/dismissed the dialog).
 *
 * Shared by the top-level launch (main entry) and `PickerCommand.execute()`
 * - both just call this instead of each independently instantiating a
 * palette.
 *
 * @param startupCommands - shown before the user types anything. For the
 * top-level launch this is only the *initial* snapshot - pass
 * `startupCommandIDs` too so the component can keep re-deriving it from the
 * live store as commands change (see that param's own doc comment).
 * @param commands - the full searchable set. Omit to search the live,
 * incrementally-populated global `commandsStore` (the top-level launch);
 * pass an explicit static list for a picker sub-palette, which searches
 * only its own fixed commands, not the global store.
 * @param startupCommandIDs - the IDs `startupCommands` was resolved from.
 * When present, `CommandPalette` re-resolves these IDs against the
 * live store on every store update instead of trusting the initial
 * snapshot - otherwise the empty-query view would never notice e.g. a menu
 * command's `enabled` state changing while the palette sits open. Omit for
 * a picker sub-palette, whose fixed command list has no live store to
 * re-resolve against.
 */
export async function openPalette(
    startupCommands: Command[],
    commands?: Command[],
    startupCommandIDs?: string[]
): Promise<PaletteResult | undefined> {
    const palette = new CommandPalette({
        startupCommands,
        commands,
        startupCommandIDs,
    });
    return showModal<PaletteResult>((ctx) => palette.mount(ctx), {
        title: "Ps Command Palette",
        resize: "none",
        size: { width: 650, height: 550 },
    });
}
