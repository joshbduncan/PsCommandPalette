import * as photoshop from "photoshop";
import { Command } from "./Command";
import { CommandTypes, ID_PREFIXES } from "./types";

const { app } = photoshop;

/**
 * A command palette tool command.
 */
export class ToolCommand extends Command {
    ref: string;

    constructor(
        ref: string,
        name: string,
        description: string,
        keyboardShortcut?: string
    ) {
        if (!ref || !name) {
            throw new Error("Tool requires a valid reference and name.");
        }

        // TODO: check to see if tool availability can be determined from the api
        const id = ID_PREFIXES.tool + ref;
        super(id, name, CommandTypes.TOOL, description);

        this.ref = ref;
        this.keyboardShortcut = keyboardShortcut;
    }

    /**
     * Activate the tool.
     */
    async execute(): Promise<unknown> {
        const target = { _ref: [{ _ref: this.ref }] };
        const command = { _obj: "select", _target: target };
        return await app.batchPlay([command], {});
    }
}
