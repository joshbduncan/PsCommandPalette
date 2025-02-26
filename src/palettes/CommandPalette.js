const { CommandTypes } = require("../types.js");

const { filterCommandsByQuery } = require("../utils/query.js");

/**
 * Debounce function to delay execution of a function
 * @param {Function} func - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function}
 */
function debounce(func, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
}

/**
 * Create a command palette.
 */
class CommandPalette {
    /**
     * @param {Command[]} commands - Queryable command palette commands
     * @param {Command[]} startupCommands - Commands displayed at palette launch
     */
    constructor(commands, startupCommands) {
        this.commands = commands;
        this.startupCommands = startupCommands || commands;
        this.debouncedQueryCommands = debounce(this.queryCommands.bind(this), 100);
        this.scrollThroughHistory = true;
        this.historyIndex = 0;
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
        querybox.setAttribute(
            "placeholder",
            "Search for menu commands, tools, actions, and more..."
        );
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

        // info label
        const info = document.createElement("sp-body");
        info.setAttribute("id", "info");
        info.setAttribute("size", "XS");
        info.textContent = "...";

        // add the elements to the dialog
        dialog.appendChild(form);
        dialog.appendChild(info);

        // add dialog to the document
        document.body.appendChild(dialog);

        /////////////////////////
        // add event listeners //
        /////////////////////////

        dialog.addEventListener("keydown", (event) => this.keyboardNavigation(event));
        dialog.addEventListener("load", () => querybox.focus());

        querybox.addEventListener("input", this.debouncedQueryCommands);

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
        this.startupCommands.forEach((command) => {
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
        let query = event.target.value.trim();
        const listbox = document.getElementById("commands");

        listbox.innerHTML = "";

        // check for a history event
        if (!event.detail?.simulated) {
            this.scrollThroughHistory = false;
            this.historyIndex = 0; // reset history index
        }

        let matches = [];
        if (query === "") {
            this.startupCommands.forEach((cmd) => cmd.removeQueryHighlights());
            matches = this.startupCommands;
            this.scrollThroughHistory = true;
        } else {
            const filters = {};

            // extract **FIRST** command type hashtag
            const hashtagTypeRegex = /#(\w+)/;
            const match = query.match(hashtagTypeRegex);
            let _query = query;

            if (match) {
                const type =
                    Object.values(CommandTypes).find((value) => value === match[1]) ||
                    null;

                if (type) {
                    filters.types = [type];
                    _query = _query.replace(hashtagTypeRegex, "").trim();
                }
            }

            matches = filterCommandsByQuery(_query, this.commands, filters);
        }

        matches.forEach((cmd) => listbox.appendChild(cmd.element));

        document.getElementById("info").textContent =
            `Found ${matches.length} matching commands`;

        this.resetCommandSelection();
    }

    /**
     * Handle keyboard navigation for command selection.
     */
    keyboardNavigation(event) {
        const querybox = document.getElementById("query");
        const listbox = document.getElementById("commands");

        if (!["ArrowDown", "ArrowUp", "Tab"].includes(event.key)) return;
        event.preventDefault();

        // allow the user to go back through the history using the arrow key
        if (querybox.value === "" || this.scrollThroughHistory) {
            if (event.key === "ArrowDown") {
                this.historyIndex = 0;
                this.scrollThroughHistory = false;
            } else {
                querybox.value = HISTORY.data[this.historyIndex].query;
                this.historyIndex +=
                    this.historyIndex < HISTORY.data.length - 1 ? 1 : 0;

                querybox.dispatchEvent(
                    new CustomEvent("input", {
                        bubbles: true,
                        detail: { simulated: true }, // let listener know this was simulated
                    })
                );
                return;
            }
        }

        const items = listbox.children.length;
        if (items === 0) return;

        const previousIndex = this.getSelectedCommand();
        let newIndex = previousIndex;

        if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
            newIndex = previousIndex >= items - 1 ? 0 : previousIndex + 1;
        } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
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
     * Change the currently selected command and ensure visibility.
     * @param {number|null} previousIndex
     * @param {number} newIndex
     */
    moveCommandSelection(previousIndex, newIndex) {
        const listbox = document.getElementById("commands");

        if (typeof previousIndex === "number" && listbox.children[previousIndex]) {
            listbox.children[previousIndex].removeAttribute("selected");
        }
        if (listbox.children[newIndex]) {
            const selectedCommand = listbox.children[newIndex];
            selectedCommand.setAttribute("selected", "");

            // Ensure selected command is in view
            selectedCommand.scrollIntoView({
                block: "nearest", // Ensures minimal scrolling
                behavior: "smooth", // Smooth scrolling for a better UX
            });
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
