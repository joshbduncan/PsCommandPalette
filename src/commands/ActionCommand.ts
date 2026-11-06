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

    constructor(action: PhotoshopAction) {
        const id = `${ID_PREFIXES.action}${action.parent.id}_${action.id}_${action.name.replace(/\s/g, "_")}`;
        const description = `${action.parent.name} > ${action.name}`;
        const commandName = action.name;
        const queryParts = [action.parent.name, action.name];

        // TODO: implement action shortcut key?
        super(id, commandName, CommandTypes.ACTION, description, true, queryParts);
        this.play = action.play;
    }

    /**
     * Play the action.
     */
    override async execute(): Promise<unknown> {
        return core.executeAsModal(() => this.play(), {
            commandName: "Executing Action",
        });
    }
}
