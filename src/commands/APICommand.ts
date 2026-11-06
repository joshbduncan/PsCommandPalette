import { Command } from "./Command";
import { CommandTypes, ID_PREFIXES } from "./types";

/**
 * A command palette Photoshop API command, wrapping a registry entry's
 * `callback` (see `commands/api/*.ts`, merged in `utils/load.ts`).
 */
export class APICommand extends Command {
    private callback: () => unknown;
    // every Photoshop API command (commands/api/*.ts) runs in executeAsModal
    override runsAsModal = true;

    constructor(
        id: string,
        name: string,
        description: string,
        callback: () => unknown,
        destructive = false
    ) {
        super(
            ID_PREFIXES.api + id,
            name,
            CommandTypes.API,
            description,
            true,
            null,
            destructive
        );
        this.callback = callback;
    }

    /**
     * Run the registry entry's callback.
     */
    override async execute(): Promise<unknown> {
        return await this.callback();
    }
}
