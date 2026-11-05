import * as photoshop from "photoshop";
import { Command } from "./Command";
import { CommandTypes, ID_PREFIXES } from "./types";
import type { PhotoshopAction } from "../utils/uxpTypes";

const { core } = photoshop;

/**
 * A command palette action command, wrapping a Photoshop Action.
 */
export class ActionCommand extends Command {
    private play: () => Promise<void>;
    /**
     * Set name + action name, independent of `action.id`/`action.parent.id`
     * (Photoshop's own "internal ID ... used internally" - not documented as
     * surviving a set/action being deleted and recreated, or a restart).
     * Not currently consulted anywhere - reserved for a future fallback
     * lookup if a persisted command id (history/startup/hidden-commands)
     * stops resolving because the underlying ids shifted.
     */
    signature: string;

    constructor(action: PhotoshopAction) {
        const id = `${ID_PREFIXES.action}${action.parent.id}_${action.id}_${action.name.replace(/\s/g, "_")}`;
        const description = `${action.parent.name} > ${action.name}`;
        const commandName = action.name;
        const queryParts = [action.parent.name, action.name];

        // TODO: implement action shortcut key?
        super(id, commandName, CommandTypes.ACTION, description, true, queryParts);
        this.play = action.play;
        this.signature = `${action.parent.name}::${action.name}`;
    }

    /**
     * Play the action.
     */
    async execute(): Promise<unknown> {
        return core.executeAsModal(() => this.play(), {
            commandName: "Executing Action",
        });
    }
}
