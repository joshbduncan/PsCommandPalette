/**
 * Create a command palette.
 */
class CommandPalette {
    /**
     * @param {Command[]} commands Queryable command palette commands
     * @param {string[]} startupCommands Commands displayed when command palette launches
     */
    constructor(commands = DATA.commands, startupCommands = DATA.startupCommands) {
        this.commands = commands;
        this.startupCommands = startupCommands;
    }

    /**
     * Show the command palette dialog modal.
     * @returns {Promise<object>}
     */
    async show() {
        const dialog = this.createModalDialog();
        try {
            return await dialog.uxpShowModal({
                title: "Ps Command Palette",
                resize: "vertical",
                size: {
                    width: 600,
                    height: 700,
                },
            });
        } catch (error) {
            console.error(error);
        } finally {
            dialog.remove();
        }
    }

    /**
     * Create the command palette dialog modal HTML element.
     * @returns {HTMLElement}
     */
    createModalDialog() {
        /////////////////////////
        // create modal dialog //
        /////////////////////////

        const dialog = document.createElement("dialog");
        dialog.setAttribute("id", "ps-command-palette");

        // form
        const form = document.createElement("form");
        form.setAttribute("id", "command-palette-form");

        // querybox
        const querybox = document.createElement("sp-textfield");
        querybox.setAttribute("id", "query");
        querybox.setAttribute("type", "search");
        querybox.setAttribute("placeholder", "Search for commands...");
        form.appendChild(querybox);

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
        const listbox = document.createElement("ul");
        listbox.setAttribute("id", "commands");
        commandsList.appendChild(listbox);

        // add the form to the dialog
        dialog.appendChild(form);

        // add dialog to the document
        document.body.appendChild(dialog);

        /////////////////////////
        // add event listeners //
        /////////////////////////

        dialog.addEventListener("keydown", (event) => this.keyboardNavigation(event));
        dialog.addEventListener("load", () => querybox.focus());

        querybox.addEventListener("input", (event) => this.queryCommands(event));

        document.addEventListener("commandSelected", (event) =>
            this.commandSelection(event)
        );

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            this.submitCommand();
        });

        ///////////////////////////
        // load startup commands //
        ///////////////////////////

        // TODO: filter out unavailable commands or make them disabled
        this.startupCommands.slice(0, 9).forEach((command) => {
            if (command.element === null) {
                command.createElement();
            }
            listbox.appendChild(command.element);
        });
        this.resetCommandSelection();

        return dialog;
    }

    /**
     * Query and update the command list based on user input.
     */
    queryCommands(event) {
        const query = event.target.value.trim();
        const listbox = document.getElementById("commands");

        listbox.innerHTML = "";

        const matches =
            query === ""
                ? (this.startupCommands.forEach((cmd) => cmd.removeQueryHighlights()),
                  this.startupCommands)
                : DATA.filterByQuery(query, this.commands);

        matches.slice(0, 9).forEach((cmd) => listbox.appendChild(cmd.element));

        this.resetCommandSelection();
    }

    /**
     * Handle keyboard navigation for command selection.
     */
    keyboardNavigation(event) {
        const listbox = document.getElementById("commands");

        if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
        event.preventDefault();

        const items = listbox.children.length;
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
        const listbox = document.getElementById("commands");

        if (listbox.children.length > 0) {
            [...listbox.children].forEach((command) =>
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
        const listbox = document.getElementById("commands");

        return [...listbox.children].findIndex((command) =>
            command.hasAttribute("selected")
        );
    }

    /**
     * Change the currently selected command.
     * @param {number|null} previousIndex
     * @param {number} newIndex
     */
    moveCommandSelection(previousIndex, newIndex) {
        const listbox = document.getElementById("commands");

        if (typeof previousIndex === "number" && listbox.children[previousIndex]) {
            listbox.children[previousIndex].removeAttribute("selected");
        }
        if (listbox.children[newIndex]) {
            listbox.children[newIndex].setAttribute("selected", "");
        }
    }

    /**
     * Handle command selection from event.
     */
    commandSelection(event) {
        const dialog = document.getElementById("ps-command-palette");
        const querybox = document.getElementById("query");
        dialog.close({
            query: querybox.value,
            command: event.detail.command,
        });
    }

    /**
     * Submit the selected command on form submission.
     */
    submitCommand() {
        const listbox = document.getElementById("commands");
        const selectedIndex = this.getSelectedCommand();

        try {
            if (selectedIndex !== -1) {
                listbox.children[selectedIndex].click();
            }
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = {
    CommandPalette,
};
