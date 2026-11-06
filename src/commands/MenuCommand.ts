import * as photoshop from "photoshop";
import { Command } from "./Command";
import { CommandTypes, ID_PREFIXES } from "./types";
import {
    cleanTitle,
    generateKeyboardShortcut,
    type KeyboardShortcut,
} from "../utils/commands";
import {
    handleCommandExecutionError,
    buildCommandLogContext,
} from "../utils/commandExecutionError";
import { showAlert } from "../utils/showAlert";

const { app, core } = photoshop;

// performMenuCommand() spuriously reports simple, always-available commands
// (e.g. File > New) as unavailable right after the palette's modal dialog
// closes, then runs them fine moments later. An unavailable result means
// the command did not run, so retrying it can't run it twice.
const UNAVAILABLE_RETRY_DELAYS_MS = [50, 150, 300];

/** Resolve after `ms` milliseconds. */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type MenuCommandData = {
    name: string;
    title: string;
    command: number;
    path: string[];
    enabled: boolean;
    visible: boolean;
    checked: boolean;
    menuShortcut?: KeyboardShortcut;
};

/**
 * A command palette menu command, wrapping a Photoshop menu item returned
 * from the `menuBarInfo` property.
 */
export class MenuCommand extends Command {
    commandID: number;
    visible: boolean;
    checked: boolean;

    constructor({
        name,
        title,
        command,
        path,
        enabled,
        visible,
        checked,
        menuShortcut,
    }: MenuCommandData) {
        const id = `${ID_PREFIXES.menu}${command}`;
        const description = path.join(" > ");
        const commandName = name || cleanTitle(title.replace(/\.\.\.$/g, ""));
        const queryParts = [...path.slice(0, -1), commandName];

        super(id, commandName, CommandTypes.MENU, description, enabled, queryParts);

        this.commandID = command;
        this.visible = visible;
        this.checked = checked;
        this.keyboardShortcut = menuShortcut?.keyChar
            ? generateKeyboardShortcut(menuShortcut)
            : "";
    }

    /**
     * Get the current command title (some titles change based on current
     * context/app state).
     */
    async getTitle(): Promise<string> {
        return core.getMenuCommandTitle({ commandID: this.commandID });
    }

    /**
     * Check the current menu command state.
     */
    async getState(): Promise<unknown> {
        return core.getMenuCommandState({ commandID: this.commandID });
    }

    /**
     * Perform menu command.
     */
    override async execute(): Promise<unknown> {
        try {
            // ensure a menu command is still available since sometimes after long
            // periods between app operations ps will report the command is
            // available (e.g. undo and redo)

            // TODO: determine always unavailable menu command that can be ignored or patched
            // FIXME: disabled because 27.9.1 is reporting many commands are not available
            // const commandState: any = await this.getState();
            // const isAvailable = commandState?.[0];
            // if (!isAvailable) {
            //     app.showAlert(
            //         "Command not available\n\nPhotoshop is reporting that your selected command is not available via the API at this time."
            //     );
            //     return;
            // }

            let result = await core.performMenuCommand({
                commandID: this.commandID,
            });
            let retries = 0;
            for (const ms of UNAVAILABLE_RETRY_DELAYS_MS) {
                if (result?.available) break;
                await delay(ms);
                retries++;
                result = await core.performMenuCommand({ commandID: this.commandID });
            }
            if (retries > 0 && result?.available) {
                console.log(
                    `MenuCommand "${this.name}" ran after ${retries} retry(s).`
                );
            }

            if (!result?.available) {
                // This is Photoshop's own API reporting the command didn't
                // execute - not a thrown error, so it never reaches the
                // catch block below. Log it explicitly so there's a
                // diagnostic trail (structured command identity + the full
                // result Photoshop returned) instead of just a silent alert.
                console.warn("MenuCommand reported unavailable:", {
                    ...buildCommandLogContext(this),
                    result,
                });
                // Photoshop's API doesn't expose *why* a command is
                // unavailable (confirmed - neither this result nor
                // getMenuCommandState() carries a reason, see the FIXME
                // above), so this can only name what failed and offer the
                // single most common cause, not diagnose the actual one.
                const noOpenDocument = app.documents.length === 0;
                await showAlert(
                    `Command execution error\n\n"${this.name}" (${this.description}) did not run.` +
                        (noOpenDocument
                            ? "\n\nNo document is currently open - that's the most common reason a command reports unavailable."
                            : "\n\nPhotoshop reported this command as unavailable, most often because it doesn't apply to the current selection/state.")
                );
            }

            return result;
        } catch (error) {
            await handleCommandExecutionError(this, error);
            return undefined;
        }
    }
}
