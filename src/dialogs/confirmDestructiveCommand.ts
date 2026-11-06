import { showModal } from "./showModal";
import { createElement } from "../utils/dom";
import type { Command } from "../commands/Command";

/**
 * Show a confirm/cancel dialog for a `command.destructive` command before
 * `execute()` runs. The palette otherwise runs whatever's selected on a bare
 * Enter/click - too easy to trigger something like "Clear Plugin History" or
 * "Close Document Without Saving" by accident.
 *
 * @returns true if the user confirmed, false if they cancelled/dismissed.
 */
export async function confirmDestructiveCommand(command: Command): Promise<boolean> {
    if (!command) {
        throw new Error("confirmDestructiveCommand() requires a command");
    }

    const result = await showModal<boolean>(
        ({ dialog, close }) => {
            const cancelButton = createElement(
                "sp-button",
                { variant: "secondary", treatment: "outline", type: "button" },
                "Cancel"
            );
            const confirmButton = createElement(
                "sp-button",
                { variant: "negative" },
                "Confirm"
            );
            const onCancel = () => close(false);
            const onConfirm = () => close(true);
            cancelButton.addEventListener("click", onCancel);
            confirmButton.addEventListener("click", onConfirm);

            dialog.appendChild(
                createElement(
                    "div",
                    {},
                    createElement(
                        "sp-heading",
                        { class: "dialog-heading" },
                        "Are you sure?"
                    ),
                    createElement("sp-divider"),
                    createElement(
                        "sp-body",
                        {},
                        createElement("strong", {}, command.name),
                        command.description ? ` — ${command.description}` : "",
                        " is destructive and can't be undone from the palette."
                    ),
                    createElement(
                        "footer",
                        {},
                        createElement(
                            "sp-button-group",
                            { class: "dialog-buttons" },
                            cancelButton,
                            confirmButton
                        )
                    )
                )
            );

            return () => {
                cancelButton.removeEventListener("click", onCancel);
                confirmButton.removeEventListener("click", onConfirm);
            };
        },
        {
            title: "Confirm",
            resize: "none",
            size: { width: 400, height: undefined },
        }
    );

    return result === true;
}
