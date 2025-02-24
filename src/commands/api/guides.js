const { app, core, constants } = require("photoshop");

const _guides = {};
const subCategory = "Guides";

_guides.verticalCenterGuide = {
    name: "Add Vertical Center Guide",
    description:
        "Add a guide centered vertically on the document or active pixel selection.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        let top = 0;
        let bottom = doc.height;

        // check for an active selection
        if (doc.selection.bounds) {
            top = doc.selection.bounds.top;
            bottom = doc.selection.bounds.bottom;
        }

        // calculate the center for x and y
        const centerY = (bottom - top) / 2 + top;

        // add the guide
        await core.executeAsModal(
            async () => {
                doc.guides.add(constants.Direction.HORIZONTAL, centerY);
            },
            {
                commandName: "Add Guide",
            }
        );
    },
};

_guides.horizontalCenterGuide = {
    name: "Add Horizontal Center Guide",
    description:
        "Add a guide centered horizontally on the document or active pixel selection.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        let left = 0;
        let right = doc.width;

        // check for an active selection
        if (doc.selection.bounds) {
            left = doc.selection.bounds.left;
            right = doc.selection.bounds.right;
        }

        // calculate the center for x and y
        const centerX = (right - left) / 2 + left;

        // add the guide
        await core.executeAsModal(
            async () => {
                doc.guides.add(constants.Direction.VERTICAL, centerX);
            },
            {
                commandName: "New Guide",
            }
        );
    },
};

_guides.centerGuides = {
    name: "Add Center Crosshair Guides",
    description:
        "Add two guides centered horizontally and vertically on the document or active pixel selection.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        let left = 0;
        let right = doc.width;
        let top = 0;
        let bottom = doc.height;

        // check for an active selection
        if (doc.selection.bounds) {
            left = doc.selection.bounds.left;
            right = doc.selection.bounds.right;
            top = doc.selection.bounds.top;
            bottom = doc.selection.bounds.bottom;
        }

        // calculate the center for x and y
        const centerX = (right - left) / 2 + left;
        const centerY = (bottom - top) / 2 + top;

        // add the guide
        await core.executeAsModal(
            async () => {
                doc.guides.add(constants.Direction.VERTICAL, centerX);
                doc.guides.add(constants.Direction.HORIZONTAL, centerY);
            },
            {
                commandName: "New Guides",
            }
        );
    },
};

_guides.selectionBoundsGuides = {
    name: "Add Selection Bounds Guides",
    description:
        "Add top, right, bottom, and left guides at the active pixel selection bounds.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        // check for an active selection
        if (!doc.selection.bounds) {
            app.showAlert("No pixels selected.");
            return;
        }

        // add the guide
        await core.executeAsModal(
            async () => {
                doc.guides.add(constants.Direction.VERTICAL, doc.selection.bounds.left);
                doc.guides.add(
                    constants.Direction.VERTICAL,
                    doc.selection.bounds.right
                );
                doc.guides.add(
                    constants.Direction.HORIZONTAL,
                    doc.selection.bounds.top
                );
                doc.guides.add(
                    constants.Direction.HORIZONTAL,
                    doc.selection.bounds.bottom
                );
            },
            {
                commandName: "New Guides",
            }
        );
    },
};

module.exports = {
    _guides,
};
