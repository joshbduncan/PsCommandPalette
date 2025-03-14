/**
 * Create a command palette command.
 */
class Command {
    #element;

    /**
     * @param {string} id - Unique command id
     * @param {string} name - Command name
     * @param {string} type - Command type
     * @param {string} description - Command description displayed below command
     * @param {boolean} enabled - Is command enabled for use (defaults to true)
     */
    constructor(id, name, type, description = "", enabled = true) {
        if (!id || !name || !type) {
            throw new Error("Command requires a valid ID, name, and type.");
        }

        this.id = id;
        this.name = name;
        this.type = type;
        this.description = description;
        this.enabled = enabled;
    }

    get element() {
        if (!this.#element) this.createElement();
        return this.#element;
    }

    /**
     * Create an HTML document `sp-menu-item` element for the command.
     * @returns {HTMLElement}
     */
    createElement() {
        // list item
        const listItem = document.createElement("li");
        listItem.setAttribute("id", this.id);
        listItem.classList.add("command");

        // TODO: re-enable after editing filter gallery commands
        if (!this.enabled) {
            listItem.setAttribute("disabled", "");
        }

        // body
        const body = document.createElement("div");
        body.classList.add("body");

        // header
        const header = document.createElement("div");
        header.classList.add("header");
        body.appendChild(header);

        // title
        const title = document.createElement("span");
        title.classList.add("title");
        title.textContent = this.name;
        header.appendChild(title);

        // shortcut
        if (this.keyboardShortcut) {
            const shortcut = document.createElement("kbd");
            shortcut.classList.add("shortcut");
            shortcut.textContent = this.keyboardShortcut;
            header.appendChild(shortcut);
        }

        // description
        if (this.description) {
            const description = document.createElement("span");
            description.classList.add("description");
            description.textContent = this.description;
            body.appendChild(description);
        }

        // type container
        const typeContainer = document.createElement("div");
        typeContainer.classList.add("type-container");

        // type
        const type = document.createElement("span");
        type.classList.add("type");
        type.textContent = this.type.toUpperCase();
        typeContainer.appendChild(type);

        listItem.appendChild(body);
        listItem.appendChild(typeContainer);

        this.#element = listItem;

        // add command element event listeners
        this.element.addEventListener("click", (event) => {
            document.dispatchEvent(
                new CustomEvent("commandSelected", {
                    detail: {
                        originalEvent: event,
                        command: this,
                    },
                })
            );
        });
    }

    /**
     * Add fuzzy query token match highlights to the command element title.
     * @param {string} innerHTML - HTML string with fuzzy query token matches using '<strong>' elements.
     */
    addQueryHighlights(innerHTML) {
        this.element.querySelector(".title").innerHTML = innerHTML;
    }

    /**
     * Remove any fuzzy query token match highlights from the command element title.
     */
    removeQueryHighlights() {
        this.element.querySelector(".title").textContent = this.name;
    }

    /**
     * Execute the command.
     */
    execute() {
        throw new Error(`Execute method not implemented for command: ${this.id}`);
    }
}

module.exports = {
    Command,
};
