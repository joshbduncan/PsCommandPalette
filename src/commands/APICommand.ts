import { Command } from "./Command";
import { CommandTypes, ID_PREFIXES } from "./types";

/**
 * A command palette Photoshop API command, wrapping a registry entry's
 * `callback` (see `commands/api/*.ts`, merged in `utils/load.ts`).
 */
export class APICommand extends Command {
    private callback: () => unknown;

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

    override async execute(): Promise<unknown> {
        return await this.callback();
    }
}
