import { Command } from "./Command";
import { CommandTypes, ID_PREFIXES } from "./types";

/**
 * A command palette plugin command, wrapping a registry entry's `callback`
 * (see `commands/plugin/commands.ts`).
 */
export class PluginCommand extends Command {
    private callback: () => unknown;

    constructor(
        id: string,
        name: string,
        description: string,
        callback: () => unknown,
        destructive = false
    ) {
        super(
            ID_PREFIXES.plugin + id,
            name,
            CommandTypes.PLUGIN,
            description,
            true,
            null,
            destructive
        );
        this.callback = callback;
    }

    override async execute(): Promise<unknown> {
        return await this.callback();
    }
}
