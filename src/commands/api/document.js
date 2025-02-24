const { app, core, constants } = require("photoshop");

const _document = {};
const subCategory = "Document";

_document.closeWithoutSaving = {
    name: "Close Document Without Saving",
    description: "Close the document, discarding all unsaved changes.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        await core.executeAsModal(
            async () => {
                await doc.closeWithoutSaving();
            },
            {
                commandName: "Close Document",
            }
        );
    },
};

_document.rasterizeAllLayers = {
    name: "Rasterize All Layers",
    description: "Rasterize all layers.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        await core.executeAsModal(
            async () => {
                await doc.rasterizeAllLayers();
            },
            {
                commandName: "Rasterize All Layers",
            }
        );
    },
};

_document.splitChannels = {
    name: "Split Channels",
    description:
        "Splits the document channels into separate, single-channel documents.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        // check for multichannel document
        if (doc.mode != constants.DocumentMode.MULTICHANNEL) {
            app.showAlert("Document mode must be multichannel.");
        }

        await core.executeAsModal(
            async () => {
                await doc.splitChannels();
            },
            {
                commandName: "Split Channels",
            }
        );
    },
};

module.exports = {
    _document,
};
