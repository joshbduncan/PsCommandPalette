import * as photoshop from "photoshop";
import { showAlert } from "../../utils/showAlert";
import type { CommandRegistry } from "../registry";

const { app, core, constants } = photoshop;

export const _guides: CommandRegistry = {
    verticalCenterGuide: {
        name: "Add Vertical Center Guide",
        description:
            "Add a guide centered vertically on the document or active pixel selection.",
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
                return;
            }

            let top = 0;
            let bottom = doc.height;

            if (doc.selection.bounds) {
                top = doc.selection.bounds.top;
                bottom = doc.selection.bounds.bottom;
            }

            const centerY = (bottom - top) / 2 + top;

            await core.executeAsModal(
                async () => {
                    await doc.guides.add(constants.Direction.HORIZONTAL, centerY);
                },
                {
                    commandName: "Add Guide",
                }
            );
        },
    },

    horizontalCenterGuide: {
        name: "Add Horizontal Center Guide",
        description:
            "Add a guide centered horizontally on the document or active pixel selection.",
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
                return;
            }

            let left = 0;
            let right = doc.width;

            if (doc.selection.bounds) {
                left = doc.selection.bounds.left;
                right = doc.selection.bounds.right;
            }

            const centerX = (right - left) / 2 + left;

            await core.executeAsModal(
                async () => {
                    await doc.guides.add(constants.Direction.VERTICAL, centerX);
                },
                {
                    commandName: "New Guide",
                }
            );
        },
    },

    centerGuides: {
        name: "Add Center Crosshair Guides",
        description:
            "Add crosshair guides centered on the active pixel selection (or document).",
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
                return;
            }

            let left = 0;
            let right = doc.width;
            let top = 0;
            let bottom = doc.height;

            if (doc.selection.bounds) {
                left = doc.selection.bounds.left;
                right = doc.selection.bounds.right;
                top = doc.selection.bounds.top;
                bottom = doc.selection.bounds.bottom;
            }

            const centerX = (right - left) / 2 + left;
            const centerY = (bottom - top) / 2 + top;

            await core.executeAsModal(
                async () => {
                    await doc.guides.add(constants.Direction.VERTICAL, centerX);
                    await doc.guides.add(constants.Direction.HORIZONTAL, centerY);
                },
                {
                    commandName: "New Guides",
                }
            );
        },
    },

    selectionBoundsGuides: {
        name: "Add Selection Bounds Guides",
        description:
            "Add top, right, bottom, and left guides at the active pixel selection bounds.",
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
                return;
            }

            if (!doc.selection.bounds) {
                await showAlert("No pixels selected.");
                return;
            }

            await core.executeAsModal(
                async () => {
                    await doc.guides.add(
                        constants.Direction.VERTICAL,
                        doc.selection.bounds!.left
                    );
                    await doc.guides.add(
                        constants.Direction.VERTICAL,
                        doc.selection.bounds!.right
                    );
                    await doc.guides.add(
                        constants.Direction.HORIZONTAL,
                        doc.selection.bounds!.top
                    );
                    await doc.guides.add(
                        constants.Direction.HORIZONTAL,
                        doc.selection.bounds!.bottom
                    );
                },
                {
                    commandName: "New Guides",
                }
            );
        },
    },
};
