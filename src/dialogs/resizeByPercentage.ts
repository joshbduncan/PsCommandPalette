import { showModal } from "./showModal";
import { createElement } from "../utils/dom";

const DEFAULT_PERCENTAGE = "100%";
const QUICK_PICKS = ["25", "50", "75", "125", "150", "175", "200"];

/**
 * Ask the user how much to scale the image by.
 *
 * @returns The typed percentage (a number) or the chosen quick-pick value (a
 * numeric string) - either way it's used in `value / 100` arithmetic by the
 * caller - or `undefined` if the user cancelled.
 */
export function showResizeByPercentageDialog(): Promise<string | number | undefined> {
    return showModal<string | number>(
        ({ dialog, close }) => {
            const input = createElement("sp-textfield", {
                id: "input-percentage",
                value: DEFAULT_PERCENTAGE,
            }) as HTMLInputElement;
            const error = createElement("sp-body", { size: "XS", class: "error" });
            error.style.display = "none";

            const submit = (event: Event) => {
                event.preventDefault();
                const value = parseFloat(input.value);
                if (isNaN(value) || value <= 0) {
                    error.textContent =
                        "Enter a percentage greater than 0. Default value inserted.";
                    error.style.display = "";
                    input.value = DEFAULT_PERCENTAGE;
                    return;
                }
                close(value);
            };
            const cancel = () => close(undefined);

            const quickPicks = QUICK_PICKS.map((item) => {
                const button = createElement(
                    "sp-action-button",
                    { id: `action-button-${item}` },
                    `${item}%`
                );
                button.addEventListener("click", () => close(item));
                return button;
            });

            const cancelButton = createElement(
                "sp-button",
                { variant: "secondary", treatment: "outline", type: "button" },
                "Cancel"
            );
            cancelButton.addEventListener("click", cancel);

            const form = createElement(
                "form",
                {},
                createElement(
                    "sp-heading",
                    { class: "dialog-heading" },
                    "Scale Image by Percent"
                ),
                createElement("sp-divider"),
                createElement(
                    "sp-body",
                    {},
                    "What percentage would you like to scale the image by?"
                ),
                createElement("sp-label", {}, "Enter an exact percentage amount..."),
                input,
                error,
                createElement(
                    "sp-label",
                    { class: "quick-pick-label" },
                    "or use a quick pick option..."
                ),
                createElement(
                    "sp-action-group",
                    { class: "quick-picks" },
                    ...quickPicks
                ),
                createElement(
                    "footer",
                    {},
                    createElement(
                        "sp-button-group",
                        { class: "dialog-buttons" },
                        cancelButton,
                        createElement(
                            "sp-button",
                            { variant: "cta", type: "submit" },
                            "Scale Image"
                        )
                    )
                )
            );
            form.addEventListener("submit", submit);
            dialog.appendChild(form);
        },
        {
            title: "Resize Image By Percent",
            resize: "none",
            size: { width: 450, height: undefined },
        }
    );
}
