import { showAlert } from "./showAlert";
import { host } from "../user/host";
import type { Command } from "../commands/Command";

/**
 * Structured diagnostic context for a command-related log line - shared by
 * `handleCommandExecutionError` (below) and MenuCommand's own "reported
 * unavailable" warning, so both carry the same identifying fields instead
 * of each hand-rolling their own subset.
 *
 * Deliberately picks specific fields rather than spreading/logging a
 * `Command` instance wholesale: a `BookmarkCommand`'s `description` is the
 * bookmark's file/folder path, and it also carries a persistent `token` -
 * neither belongs in a log a user might paste into a bug report.
 */
export type CommandLogContext = {
    commandId: string;
    commandType: string;
    commandName: string;
    query?: string;
    hostVersion: string;
};

export function buildCommandLogContext(
    command: Command,
    query?: string
): CommandLogContext {
    return {
        commandId: command.id,
        commandType: command.type,
        commandName: command.name,
        query,
        hostVersion: host.hostVersion,
    };
}

/**
 * Shared handler for an error thrown while running a command - whether it
 * propagates all the way up to the caller of `command.execute()`
 * (main.ts/PickerCommand.ts, which can supply the query that led to this
 * command), or is caught internally by a command that still wants the same
 * user-facing treatment (MenuCommand, which used to only `console.error` a
 * thrown exception and leave the user staring at a palette that just
 * silently closed - it has no query of its own to supply).
 *
 * Logs structured command identity (not just the bare error) so the
 * console trail says what failed and in response to what, and shows a
 * concise alert - without the logging, a thrown error was only ever
 * visible with devtools open.
 */
export async function handleCommandExecutionError(
    command: Command,
    error: unknown,
    query?: string
): Promise<void> {
    console.error("Command execution failed:", {
        ...buildCommandLogContext(command, query),
        error,
    });

    const message = error instanceof Error ? error.message : String(error);
    await showAlert(
        `Command execution error\n\n"${command.name}" failed to run.\n\n${message}`
    );
}
