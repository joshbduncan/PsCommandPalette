import type { storage } from "uxp";
import type { app } from "photoshop";
import type { KeyboardShortcut } from "./commands";

// @adobe/cc-ext-uxp-types models `storage.File` as a standalone class that
// doesn't extend `storage.Entry`, even though at runtime a File genuinely is
// an Entry (has .name/.nativePath, and is accepted by Folder#renameEntry).
// Use this intersection type wherever a real file handle is stored/passed so
// TS reflects reality instead of fighting the vendor package's gap.
export type FSFile = storage.File & storage.Entry;
export type FSFolder = storage.Folder;

// UXP's `navigator.clipboard` shares its name with the DOM's standard
// Clipboard interface but isn't standard: `writeText` takes a MIME-type-keyed
// object (`{"text/plain": "..."}`), not a plain string, so the ambient DOM
// lib's `Clipboard.writeText(data: string)` signature doesn't match what UXP
// actually expects at runtime. Cast through this type at call sites instead
// of `as any`.
export type UxpClipboard = {
    writeText(text: Record<string, string>): Promise<unknown>;
};

// `Action`/`ActionSet` (from `app.actionTree`) are fully typed in
// @types/photoshop, but aren't part of that package's public export surface
// (only reachable via `actionTree`'s return type) - derive them from it
// instead of falling back to `any` wherever an Action is handled.
export type PhotoshopActionSet = (typeof app.actionTree)[number];
export type PhotoshopAction = PhotoshopActionSet["actions"][number];

// The `menuBarInfo` property fetched via a raw `batchPlay` call
// (load.ts's `fetchLiveMenuCommandData`) isn't modeled anywhere in
// @types/photoshop - `ActionDescriptor`'s index signature just resolves to
// `any`. This is the actual shape, restricted to the fields this codebase
// reads/writes while flattening the tree into `MenuCommandData`.
export type MenuBarInfoNode = {
    kind?: string;
    title: string;
    name: string;
    command: number;
    enabled: boolean;
    visible: boolean;
    checked: boolean;
    menuShortcut?: KeyboardShortcut;
    submenu?: MenuBarInfoNode[];
};

export type UxpShowModalOptions = {
    title?: string;
    resize?: "none" | "both" | "horizontal" | "vertical";
    size?: { width?: number; height?: number };
};

// `uxpShowModal` is a real UXP-provided method on `<dialog>` elements shown
// as a plugin modal, but it isn't declared anywhere in
// @adobe/cc-ext-uxp-types (nor is it part of the standard DOM lib). Augment
// the global `HTMLDialogElement` interface so call sites don't need a cast.
// Resolves with whatever value `dialog.close(value)` was called with, or the
// string "reasonCanceled" if the user dismissed the dialog natively.
declare global {
    interface HTMLDialogElement {
        uxpShowModal(options: UxpShowModalOptions): Promise<unknown>;
        /**
         * UXP's `<dialog>` accepts and round-trips any value here (not just
         * a string, per the standard DOM `close(returnValue?: string)`
         * signature) - `uxpShowModal()` resolves with whatever was passed
         * to `close()`. See dialogs/showModal.ts.
         */
        close(returnValue?: unknown): void;
    }
}
