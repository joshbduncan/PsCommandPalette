export type ElementAttributes = Record<string, string | number | boolean | undefined>;
export type ElementChild = Node | string | null | undefined | false;

/**
 * Create an element with attributes and children in one call - keeps the
 * imperative dialog/palette builders readable without a UI framework.
 *
 * `false`/`undefined` attribute values are skipped and `true` sets a bare
 * boolean attribute. String children become text nodes (never parsed as
 * HTML), so it's safe to pass user data like command names straight in.
 */
export function createElement(
    tag: string,
    attributes: ElementAttributes = {},
    ...children: ElementChild[]
): HTMLElement {
    if (!tag) {
        throw new Error("createElement() requires a tag name");
    }

    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
        if (value === undefined || value === false) continue;
        element.setAttribute(name, value === true ? "" : String(value));
    }
    appendChildren(element, children);
    return element;
}

/** Append `children` to `parent`, skipping empty values and wrapping strings in text nodes. */
export function appendChildren(parent: Node, children: ElementChild[]): void {
    for (const child of children) {
        if (child === null || child === undefined || child === false) continue;
        parent.appendChild(
            typeof child === "string" ? document.createTextNode(child) : child
        );
    }
}

/**
 * Replace all of `parent`'s children. Use this instead of the native
 * `Element.replaceChildren()`: UXP's DOM appends the new children without
 * removing the old ones, so the palette kept stale rows above fresh results.
 */
export function replaceChildren(parent: Node, children: ElementChild[]): void {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
    appendChildren(parent, children);
}
