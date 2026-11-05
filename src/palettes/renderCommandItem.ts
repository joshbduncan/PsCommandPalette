import type { Command } from "../commands/Command";
import {
    getTitleHighlightSegments,
    getDescriptionHighlightSegments,
    type HighlightSegment,
} from "../utils/highlight";
import { createElement } from "../utils/dom";

export type CommandItemOptions = {
    /** Whether this row is the palette's current selection. */
    selected: boolean;
    /** The (hashtag-stripped) query to highlight fuzzy matches for. */
    query: string;
    /** Called when the row is clicked. */
    onSelect: (command: Command) => void;
};

/**
 * Build a single result row for the palette's listbox.
 *
 * Every row renders identically regardless of `command.enabled`, and
 * selection/execution was never gated on it either. `enabled` (menu
 * commands especially, from Photoshop's own `menuBarInfo`) has demonstrated
 * real staleness/inaccuracy on some Photoshop versions (same category of
 * issue as the `getMenuCommandState` FIXME in MenuCommand.ts) - a row that
 * LOOKED disabled but was actually clickable/runnable (or vice versa) read
 * as broken, so the visual distinction was dropped entirely rather than
 * left half-trustworthy. A genuinely-unavailable command still surfaces via
 * the alert in MenuCommand.execute().
 */
export function renderCommandItem(
    command: Command,
    { selected, query, onSelect }: CommandItemOptions
): HTMLLIElement {
    const header = createElement(
        "div",
        { class: "header" },
        createElement(
            "span",
            { class: "title" },
            ...renderSegments(getTitleHighlightSegments(command.queryParts, query))
        ),
        command.keyboardShortcut &&
            createElement("kbd", { class: "shortcut" }, command.keyboardShortcut)
    );

    const body = createElement(
        "div",
        { class: "body" },
        header,
        command.description &&
            createElement(
                "span",
                { class: "description" },
                ...renderSegments(
                    getDescriptionHighlightSegments(command.description, query)
                )
            )
    );

    const item = createElement(
        "li",
        { id: command.id, class: "command", role: "option" },
        body,
        createElement(
            "div",
            { class: "type-container" },
            createElement("span", { class: "type" }, command.type.toUpperCase())
        )
    ) as HTMLLIElement;
    setItemSelected(item, selected);

    item.addEventListener("click", () => onSelect(command));
    // Keep focus in the query box while clicking a row - keyboard navigation
    // and Enter-to-submit only work while focus stays inside the dialog's
    // form.
    item.addEventListener("mousedown", (event) => event.preventDefault());

    return item;
}

/** Toggle a rendered row's selected state without re-rendering it. */
export function setItemSelected(item: Element, selected: boolean): void {
    item.setAttribute("aria-selected", String(selected));
}

function renderSegments(segments: HighlightSegment[]): (Node | string)[] {
    return segments.map((segment) =>
        segment.matched ? createElement("strong", {}, segment.text) : segment.text
    );
}
