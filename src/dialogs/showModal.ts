import type { UxpShowModalOptions } from "../utils/uxpTypes";

export type ModalContext<Result> = {
    /** The `<dialog>` element to build the modal's content into. */
    dialog: HTMLDialogElement;
    /** Close the dialog, resolving `showModal`'s promise with `result`. */
    close: (result?: Result) => void;
};

/**
 * Builds a modal's content into `ctx.dialog`. May return a cleanup function
 * (remove listeners, unsubscribe from stores, ...) that runs once the dialog
 * has closed.
 */
export type ModalBuilder<Result> = (ctx: ModalContext<Result>) => (() => void) | void;

/**
 * Show a UXP `uxpShowModal()` dialog whose content is created by `build`,
 * resolving a promise with the value passed to `close()` once it closes
 * (or `undefined` if the user dismissed it natively, e.g. with Escape).
 */
export async function showModal<Result = unknown>(
    build: ModalBuilder<Result>,
    options: UxpShowModalOptions
): Promise<Result | undefined> {
    if (typeof build !== "function") {
        throw new TypeError("showModal() requires a builder function");
    }

    const dialog = document.createElement("dialog");
    // Plain HTML inside the dialog can't rely on inheriting `color` from
    // <body> - that doesn't reliably reach a dynamically-created top-level
    // <dialog> in UXP. Spectrum elements style themselves internally
    // regardless, but set this explicitly so plain text/lists/etc. aren't
    // invisible by default.
    dialog.style.color = "var(--text)";
    document.body.appendChild(dialog);

    const close = (result?: Result) => dialog.close(result);

    let cleanup: (() => void) | void = undefined;
    try {
        cleanup = build({ dialog, close });

        const result = await dialog.uxpShowModal(options);
        // UXP resolves (not rejects) with this string on native dismiss
        // (e.g. Escape) - a truthy value that a plain `if (!result)` check
        // won't catch. Normalize it to undefined here once, for every
        // caller, instead of every dialog needing to know the magic string.
        if (result === "reasonCanceled") return undefined;
        return result;
    } catch (error) {
        console.error(error);
        return undefined;
    } finally {
        try {
            cleanup?.();
        } catch (cleanupError) {
            console.error("Failed to clean up modal:", cleanupError);
        }
        try {
            dialog.remove();
        } catch (cleanupError) {
            console.error("Failed to cleanup dialog:", cleanupError);
        }
    }
}
