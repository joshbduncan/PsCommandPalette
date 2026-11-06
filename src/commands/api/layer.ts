import * as photoshop from "photoshop";
import { showAlert } from "../../utils/showAlert";
import type { CommandRegistry } from "../registry";

const { app, core } = photoshop;

export const _layer: CommandRegistry = {
    clearLayer: {
        name: "Clear Selected Layer(s)",
        description:
            "Clears the layer pixels from each selected layer. If no pixel selection is found, select all pixels and clear.",
        destructive: true,
        callback: async () => {
            const doc = app.activeDocument;
            if (!doc) {
                await showAlert("No active documents.");
                return;
            }

            const activeLayers = doc.activeLayers;
            if (activeLayers.length === 0) {
                await showAlert("No active layers.");
                return;
            }

            await core.executeAsModal(
                async () => {
                    for (const layer of activeLayers) {
                        await layer.clear();
                    }
                },
                {
                    commandName: "Clear Layer(s)",
                }
            );
        },
    },
};
