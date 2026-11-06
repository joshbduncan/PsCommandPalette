import { Command } from "./Command";
import { CommandTypes } from "./types";

/**
 * A generic command wrapper around an arbitrary id/name/description/callback,
 * used for one-off/dynamic commands (e.g. picker results) that don't need a
 * dedicated class.
 */
export class CustomCommand extends Command {
    private callback: () => unknown;

    constructor(
        id: string,
        name: string,
        description: string,
        callback: () => unknown,
        destructive = false
    ) {
        super(id, name, CommandTypes.CUSTOM, description, true, null, destructive);
        this.callback = callback.bind(this);
    }

    /**
     * Run the callback this command was constructed with.
     */
    override async execute(): Promise<unknown> {
        return await this.callback();
    }
}
