import * as photoshop from "photoshop";
import { showAlert } from "../../utils/showAlert";
import type { CommandRegistry } from "../registry";

const { app, core } = photoshop;

export const _channels: CommandRegistry = {
    newAlphaChannel: {
        name: "New Alpha Channel",
        description: "Create a new alpha channel in the document.",
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
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
    },

    removeAll: {
        name: "Remove All Channels",
        description: "Remove all Alpha channels in the document.",
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
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
    },
};
