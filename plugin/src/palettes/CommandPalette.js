/**
 * Create a command palette.
 */
class CommandPalette {
    /**
     * Create a command palette.
     * @param {Command[]} commands Queryable command palette commands
     * @param {string[]} startupCommands Commands displayed when command palette launches
     */
    constructor(commands = DATA.commands, startupCommands = DATA.startupCommands) {
        this.commands = commands;
        this.startupCommands = startupCommands;
        this.dialog = null;
        this.querybox = null;
        this.listbox = null;
    }

    /**
     * Open the command palette dialog modal.
     * @returns {Promise<object>}
     */
    async open() {
        this.dialog = this.createModalDialog();
        const result = await this.dialog.uxpShowModal({
            title: "Ps Command Palette",
            resize: "vertical",
            size: {
                width: 600,
                height: 700,
            },
        });

        this.cleanup();
        return result;
    }

    /**
     * Create the command palette dialog modal HTML element.
     * @returns {HTMLElement}
     */
    createModalDialog() {
        console.log("Creating command palette modal");

        /////////////////////////
        // create modal dialog //
        /////////////////////////

        const dialog = document.createElement("dialog");
        dialog.setAttribute("id", "ps-command-palette");

        // form
        const form = document.createElement("form");

        // querybox
        this.querybox = document.createElement("sp-textfield");
        this.querybox.setAttribute("id", "query");
        this.querybox.setAttribute("type", "search");
        this.querybox.setAttribute("placeholder", "Search for commands...");
        form.appendChild(this.querybox);

        // divider
        const divider = document.createElement("sp-divider");
        divider.setAttribute("id", "query-listbox-divider");
        divider.setAttribute("size", "medium");
        form.appendChild(divider);

        // command list container
        const commandsList = document.createElement("div");
        commandsList.setAttribute("id", "commands-list");
        form.appendChild(commandsList);

        // listbox
        this.listbox = document.createElement("ul");
        this.listbox.setAttribute("id", "commands");
        commandsList.appendChild(this.listbox);

        // add the form to the dialog
        dialog.appendChild(form);

        // add dialog to the document
        document.body.appendChild(dialog);

        this.addEventListeners(dialog);
        this.loadStartupCommands();

        return dialog;
    }

    /**
     * Add event listeners to the modal.
     */
    addEventListeners(dialog) {
        const queryCommands = (event) => this.queryCommands(event);
        const keyboardNavigation = (event) => this.keyboardNavigation(event);

        dialog.addEventListener("load", () => this.querybox.focus());
        this.querybox.addEventListener("input", queryCommands);
        document.addEventListener("paletteCommandSelected", (event) =>
            this.handleCommandSelection(event, dialog)
        );
        dialog.addEventListener("keydown", keyboardNavigation);
        dialog.querySelector("form").addEventListener("submit", (event) => {
            event.preventDefault();
            this.submitCommand();
        });
    }

    /**
     * Query and update the command list based on user input.
     */
    queryCommands(event) {
        const query = event.target.value;
        this.listbox.innerHTML = "";

        const matches = DATA.filterByQuery(event.target.value, this.commands);
        matches.slice(0, 9).forEach((command) => {
            if (!command.element) {
                command.createElement();
            }
            this.listbox.appendChild(command.element);
        });

        this.resetCommandSelection();
    }

    /**
     * Handle keyboard navigation for command selection.
     */
    keyboardNavigation(event) {
        if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
        event.preventDefault();

        const items = this.listbox.children.length;
        if (items === 0) return;

        const previousIndex = this.getSelectedCommand();
        let newIndex = previousIndex;

        if (event.key === "ArrowDown") {
            newIndex = previousIndex >= items - 1 ? 0 : previousIndex + 1;
        } else if (event.key === "ArrowUp") {
            newIndex = previousIndex <= 0 ? items - 1 : previousIndex - 1;
        }

        this.moveCommandSelection(previousIndex, newIndex);
    }

    /**
     * Reset the selected command to the first item if available.
     */
    resetCommandSelection() {
        if (this.listbox.children.length > 0) {
            [...this.listbox.children].forEach((command) =>
                command.removeAttribute("selected")
            );
            this.moveCommandSelection(null, 0);
        }
    }

    /**
     * Get the currently selected command's index.
     * @returns {number}
     */
    getSelectedCommand() {
        return [...this.listbox.children].findIndex((command) =>
            command.hasAttribute("selected")
        );
    }

    /**
     * Change the currently selected command.
     * @param {number|null} previousIndex
     * @param {number} newIndex
     */
    moveCommandSelection(previousIndex, newIndex) {
        if (typeof previousIndex === "number" && this.listbox.children[previousIndex]) {
            this.listbox.children[previousIndex].removeAttribute("selected");
        }
        if (this.listbox.children[newIndex]) {
            this.listbox.children[newIndex].setAttribute("selected", "");
        }
    }

    /**
     * Handle command selection from event.
     */
    handleCommandSelection(event, dialog) {
        dialog.close({
            query: this.querybox.value,
            command: event.detail.command,
        });
    }

    /**
     * Submit the selected command on form submission.
     */
    submitCommand() {
        const selectedIndex = this.getSelectedCommand();
        try {
            if (selectedIndex !== -1) {
                this.listbox.children[selectedIndex].click();
            }
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Load startup commands.
     */
    loadStartupCommands() {
        // TODO: filter out unavailable commands or make them disabled
        console.log("Loading startup commands");

        this.startupCommands.slice(0, 9).forEach((command) => {
            if (command.element === null) {
                command.createElement();
            }
            this.listbox.appendChild(command.element);
        });
        this.resetCommandSelection();
    }

    /**
     * Cleanup event listeners and remove the modal.
     */
    cleanup() {
        document.removeEventListener(
            "paletteCommandSelected",
            this.handleCommandSelection
        );
        this.querybox.removeEventListener("input", this.queryCommands);
        this.dialog.removeEventListener("keydown", this.keyboardNavigation);
        if (this.dialog) {
            this.dialog.remove();
            this.dialog = null;
        }
    }
}

module.exports = {
    CommandPalette,
};
