const { app, core } = require("photoshop");

const _channels = {};

_channels.newAlphaChannel = {
    name: "New Alpha Chanel",
    description: "Create a new alpha channel in the document.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        await core.executeAsModal(
            async () => {
                await doc.channels.add();
            },
            {
                commandName: "Add Alpha Channel",
            }
        );
    },
};

_channels.removeAll = {
    name: "Remove All Channels",
    description: "Remove all Alpha channels in the document.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        await core.executeAsModal(
            async () => {
                await doc.channels.removeAll();
            },
            {
                commandName: "Remove All Channels",
            }
        );
    },
};

module.exports = {
    _channels,
};
