import * as photoshop from "photoshop";
import { showAlert } from "../../utils/showAlert";
import type { CommandRegistry } from "../registry";
import { showResizeByPercentageDialog } from "../../dialogs/resizeByPercentage";
import { waitForModalToClose } from "../../dialogs/showModal";

const { app, core, constants } = photoshop;

export const _document: CommandRegistry = {
    closeWithoutSaving: {
        name: "Close Document Without Saving",
        description: "Close the document, discarding all unsaved changes.",
        destructive: true,
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
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
    },

    rasterizeAllLayers: {
        name: "Rasterize All Layers",
        description: "Rasterize all layers.",
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
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
    },

    splitChannels: {
        name: "Split Channels",
        description:
            "Splits the document channels into separate, single-channel documents.",
        // closes the original document, unsaved changes and all
        destructive: true,
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
                return;
            }

            if (doc.mode !== constants.DocumentMode.MULTICHANNEL) {
                await showAlert("Document mode must be multichannel.");
                return;
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
    },

    resizeByPercentage: {
        name: "Resize Document by Percentage",
        description: "Resize the document by a specified percentage.",
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
                return;
            }

            const result = await showResizeByPercentageDialog();

            if (!result || result === 100) return;

            // the resize below runs in executeAsModal right after this dialog
            await waitForModalToClose();

            const percent = Number(result) / 100;
            const width = doc.width * percent;
            const height = doc.height * percent;

            try {
                await core.executeAsModal(
                    async () => await doc.resizeImage(width, height),
                    {
                        commandName: "Resize Image",
                    }
                );
            } catch (error) {
                console.error(error);
                await showAlert(
                    `Resize image error\n\n${error instanceof Error ? error.message : String(error)}`
                );
            }
        },
    },
};
