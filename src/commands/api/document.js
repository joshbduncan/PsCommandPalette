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

_document.resizeByPercentage = {
    name: "Resize Document by Percentage",
    description: "Resize the document by a specified percentage.",
    callback: async () => {
        // check for an active document
        const doc = app.activeDocument;
        if (!doc) {
            app.showAlert("No active documents.");
            return;
        }

        // build dialog
        const dialog = document.createElement("dialog");
        const form = document.createElement("form");

        const heading = document.createElement("sp-heading");
        heading.innerText = "Scale Image by Percent";
        heading.style.marginTop = "0";
        dialog.appendChild(heading);

        const divider = document.createElement("sp-divider");
        divider.style.margin = "8px 0";
        form.appendChild(divider);

        const body = document.createElement("sp-body");
        body.textContent = "What percentage would you like to scale the image by?";
        form.appendChild(body);

        const percentageLabel = document.createElement("sp-label");
        percentageLabel.innerHTML = "Enter an exact percentage amount...";
        form.appendChild(percentageLabel);

        const percentage = document.createElement("sp-textfield");
        percentage.setAttribute("id", "input-percentage");
        percentage.value = "100%";
        percentage.style.width = "100%";
        form.appendChild(percentage);

        const actionButtonsLabel = document.createElement("sp-label");
        actionButtonsLabel.innerHTML = "or use a quick pick option...";
        actionButtonsLabel.style.marginTop = "6px";
        form.appendChild(actionButtonsLabel);

        const actionGroup = document.createElement("sp-action-group");
        actionGroup.style.display = "flex";

        const actionButtons = ["25", "50", "75", "125", "150", "175", "200"];
        actionButtons.forEach((item) => {
            let button = document.createElement("sp-action-button");
            button.setAttribute("id", `action-button-${item}`);
            button.textContent = `${item}%`;
            button.onclick = function () {
                dialog.close(item);
            };
            actionGroup.appendChild(button);
        });
        form.appendChild(actionGroup);

        const footer = document.createElement("footer");

        const buttonGroup = document.createElement("sp-button-group");
        buttonGroup.style.marginTop = "24px";

        const cancelButton = document.createElement("sp-button");
        cancelButton.setAttribute("variant", "secondary");
        cancelButton.setAttribute("treatment", "outline");
        cancelButton.textContent = "Cancel";
        buttonGroup.appendChild(cancelButton);

        const okButton = document.createElement("sp-button");
        okButton.setAttribute("variant", "cta");
        okButton.textContent = "Scale Image";
        buttonGroup.appendChild(okButton);

        footer.appendChild(buttonGroup);
        form.appendChild(footer);

        okButton.onclick = () => {
            // validate input
            const value = parseFloat(percentage.value);
            if (isNaN(value)) {
                app.showAlert("Invalid numeric entry\n\nDefault value inserted.");
                percentage.value = "100%";
                return;
            }
            dialog.close(value);
        };

        cancelButton.onclick = () => {
            dialog.close();
        };

        dialog.appendChild(form);
        document.body.appendChild(dialog);

        form.onsubmit = function (event) {
            event.preventDefault();
            okButton.click();
        };

        // show dialog and process results
        try {
            const result = await dialog.uxpShowModal({
                title: "Resize Image By Percent",
                resize: "none",
                size: {
                    width: 450,
                    height: undefined,
                },
            });
            if (!result || result === 100) return;

            // calculate new dimensions
            let width = doc.width * (result / 100);
            let height = doc.height * (result / 100);

            // resize image
            await core.executeAsModal(
                async () => await doc.resizeImage(width, height),
                {
                    commandName: "Resize Image",
                }
            );
        } catch (error) {
            app.showAlert(error);
            console.error(error);
        } finally {
            dialog.remove();
        }
    },
};

module.exports = {
    _document,
};
