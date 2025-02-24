const { app, core, constants } = require("photoshop");

const _layer = {};

_layer.clearLayer = {
    name: "Clear Selected Layer(s)",
    description:
        "Clears the layer pixels from each selected layer. If no pixel selection is found, select all pixels and clear.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        // check for an active layers
        const activeLayers = doc.activeLayers;
        if (activeLayers.length === 0) {
            app.showAlert("No active layers.");
            return;
        }

        for (const layer of activeLayers) {
            await core.executeAsModal(
                async () => {
                    await layer.clear();
                },
                {
                    commandName: "Clear Layer",
                }
            );
        }
    },
};

module.exports = {
    _layer,
};
