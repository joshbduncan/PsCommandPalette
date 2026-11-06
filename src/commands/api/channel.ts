import * as photoshop from "photoshop";
import { showAlert } from "../../utils/showAlert";
import type { CommandRegistry } from "../registry";

const { app, core, constants } = photoshop;

export const _channel: CommandRegistry = {
    duplicateSelectedChannels: {
        name: "Duplicate Selected Channel(s)",
        description: "Duplicates any selected channels in the document.",
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
                return;
            }

            const activeChannels = doc.activeChannels;
            if (activeChannels.length === 0) {
                await showAlert("No active channels.");
                return;
            }

            await core.executeAsModal(
                async () => {
                    for (const channel of activeChannels) {
                        await channel.duplicate();
                    }
                },
                {
                    commandName: "Duplicate Channel(s)",
                }
            );
        },
    },

    mergeSelectedSpotChannels: {
        name: "Merge Selected Spot Channel(s)",
        description:
            "Merge selected Spot Color channel(s) into the component channels.",
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
                return;
            }

            const activeSpotChannels = doc.activeChannels.filter(
                (channel) => channel.kind == constants.ChannelType.SPOTCOLOR
            );

            if (activeSpotChannels.length === 0) {
                await showAlert("No active spot channels");
                return;
            }

            await core.executeAsModal(
                async () => {
                    for (const channel of activeSpotChannels) {
                        await channel.merge();
                    }
                },
                {
                    commandName: "Merge Spot Channel(s)",
                }
            );
        },
    },

    deleteSelectedChannels: {
        name: "Delete Selected Channel(s)",
        description: "Delete any selected channels.",
        destructive: true,
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
                return;
            }

            const activeChannels = doc.activeChannels;
            if (activeChannels.length === 0) {
                await showAlert("No active channels.");
                return;
            }

            await core.executeAsModal(
                async () => {
                    for (const channel of activeChannels) {
                        await channel.remove();
                    }
                },
                {
                    commandName: "Remove Channel(s)",
                }
            );
        },
    },
};
