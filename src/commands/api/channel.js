const { app, core, constants } = require("photoshop");

const _channel = {};

_channel.duplicateSelectedChannels = {
    name: "Duplicate Selected Channel(s)",
    description: "Duplicates any selected channels in the document.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        // check for an active channels
        const activeChannels = doc.activeChannels;
        if (activeChannels.length === 0) {
            app.showAlert("No active channels.");
            return;
        }

        for (const channel of activeChannels) {
            await core.executeAsModal(
                async () => {
                    await channel.duplicate();
                },
                {
                    commandName: "Duplicate Channel",
                }
            );
        }
    },
};

_channel.mergeSelectedSpotChannels = {
    name: "Merge Selected Spot Channel(s)",
    description: "Merge selected Spot Color channel(s) into the component channels.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        const activeSpotChannels = doc.activeChannels.filter((channel) => {
            return channel.kind == constants.ChannelType.SPOTCOLOR;
        });

        console.log(activeSpotChannels);

        if (activeSpotChannels.length === 0) {
            app.showAlert("No active spot channels");
            return;
        }

        for (const channel of activeSpotChannels) {
            await core.executeAsModal(
                async () => {
                    await channel.merge();
                },
                {
                    commandName: "Merge Spot Channel",
                }
            );
        }
    },
};

_channel.deleteSelectedChannels = {
    name: "Delete Selected Channel(s)",
    description: "Delete any selected channels.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        // check for an active channels
        const activeChannels = doc.activeChannels;
        if (activeChannels.length === 0) {
            app.showAlert("No active channels.");
            return;
        }

        for (const channel of activeChannels) {
            await core.executeAsModal(
                async () => {
                    await channel.remove();
                },
                {
                    commandName: "Remove Channel",
                }
            );
        }
    },
};

module.exports = {
    _channel,
};
