import { Command } from "./Command";
import { CustomCommand } from "./CustomCommand";
import { CommandTypes } from "./types";
import { openPalette } from "../palettes/openPalette";
import { confirmDestructiveCommand } from "../dialogs/confirmDestructiveCommand";
import { handleCommandExecutionError } from "../utils/commandExecutionError";
import { showAlert } from "../utils/showAlert";
import { commandsStore } from "../utils/CommandsStore";
import { history } from "../user/History";
import { user } from "../user/User";
import type { PickerItem, PickerRecord } from "../user/User";
import type { UxpClipboard } from "../utils/uxpTypes";

/**
 * Build the `CustomCommand` a picker's sub-palette shows for one
 * `PickerItem`, with a real `execute()` per kind instead of every entry
 * running the same callback:
 * - "command": look up and run an existing global command by id, live off
 *   `commandsStore` (so it reflects whatever's actually loaded, not a
 *   snapshot taken when the picker was authored).
 * - "value": copy the literal string to the clipboard - the closest real
 *   equivalent to a picker "returning" a value, since nothing in this
 *   codebase currently consumes an `execute()` return value.
 * - "picker": recurse into another `PickerRecord` by id, same as the
 *   top-level picker command does.
 */
function buildPickerItemCommand(item: PickerItem, index: number): CustomCommand {
    switch (item.kind) {
        case "command": {
            const target = commandsStore.commands.find((c) => c.id === item.commandId);
            // Reuse the target's own id (not a synthetic `command_<index>_…`
            // one) so the history entry PickerCommand.execute() records is
            // the real command's - its frequency/recency/latch boosts then
            // apply both here and in the top-level palette. A command listed
            // twice in one picker shares that id; both entries run it.
            return new CustomCommand(
                item.commandId,
                item.label ?? target?.name ?? item.commandId,
                target?.description ?? "",
                async () => {
                    if (!target) {
                        await showAlert(
                            `Picker error\n\nCommand "${item.commandId}" was not found.`
                        );
                        return;
                    }
                    await target.execute();
                },
                // carry the target's flag over, so PickerCommand.execute()
                // confirms a destructive command the same as the top-level
                // palette does
                target?.destructive ?? false
            );
        }
        case "value":
            return new CustomCommand(
                `${item.kind}_${index}_${item.label}`,
                item.label,
                item.value,
                async () => {
                    await (navigator.clipboard as unknown as UxpClipboard).writeText({
                        "text/plain": item.value,
                    });
                }
            );
        case "picker": {
            const target = user.data?.pickers.find((p) => p.id === item.pickerId);
            return new CustomCommand(
                `${item.kind}_${index}_${item.pickerId}`,
                item.label ?? target?.name ?? item.pickerId,
                target?.description ?? "",
                async () => {
                    if (!target) {
                        await showAlert(
                            `Picker error\n\nPicker "${item.pickerId}" was not found.`
                        );
                        return;
                    }
                    await new PickerCommand(target).execute();
                }
            );
        }
    }
}

/**
 * A command palette picker command - a user-defined sub-palette
 * (`user.data.pickers`). Recursively opens another palette via
 * `openPalette()` - the same imperative mount/dialog/unmount helper used by
 * the top-level launch, instead of each independently instantiating a
 * palette.
 */
export class PickerCommand extends Command {
    items: PickerRecord["items"];

    constructor({ id, name, description, items }: PickerRecord) {
        super(id, name, CommandTypes.PICKER, description);
        this.items = items;
    }

    /**
     * Open this picker's sub-palette and run (and record in history) the
     * item the user picks.
     */
    override async execute(): Promise<void> {
        try {
            const itemsByCommandId = new Map<string, PickerItem>();
            const pickerCommands = this.items.map((item, index) => {
                const command = buildPickerItemCommand(item, index);
                itemsByCommandId.set(command.id, item);
                return command;
            });

            // Pass pickerCommands as BOTH args - a picker searches only its
            // own fixed commands, never the global live store (openPalette's
            // second, optional arg is precisely that override).
            const result = await openPalette(pickerCommands, pickerCommands);
            if (!result) return;

            const { query, command } = result;
            if (!command) {
                console.error("No command selected.");
                return;
            }

            if (command.destructive && !(await confirmDestructiveCommand(command))) {
                return;
            }

            try {
                await command.execute();
            } catch (error) {
                await handleCommandExecutionError(command, error, query);
            }

            // Record the item actually chosen here, not the PickerCommand
            // selection that led into this sub-palette (main.ts excludes
            // that from history - see its own `historyWrite` comment) - that
            // way history reflects the real action taken instead of "a
            // picker was opened". A "picker" item is itself just navigation
            // into another sub-palette, not a completed action, so it's left
            // unrecorded the same way - the eventual terminal selection
            // inside it records itself, recursively. Recorded even if the
            // command failed, same as main.ts's launchPalette.
            const selectedItem = itemsByCommandId.get(command.id);
            if (selectedItem && selectedItem.kind !== "picker") {
                await history.add(query, command.id).catch((error) => {
                    console.error("Failed to record history:", error);
                });
            }
        } catch (error) {
            console.error(error);
        }
    }
}
