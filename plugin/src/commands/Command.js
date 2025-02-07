/**
 * Command type enum.
 */
const CommandTypes = {
    ACTION: "action",
    BUILTIN: "builtin",
    CUSTOM: "custom",
    MENU: "menu",
    STARTUP: "startup",
    TOOL: "tool",
};

/**
 * Create a command palette command.
 */
class Command {
    /**
     * Create a command palette command.
     * @param {string} id Unique command id
     * @param {string} name Command name
     * @param {string} type Command type
     * @param {string} note Note displayed below command
     * @param {boolean} enabled Is command enabled for use (defaults to true)
     */
    constructor(id, name, type, note = "", enabled = true) {
        if (!id || !name || !type) {
            throw new Error("Command requires a valid ID, name, and type.");
        }

        this.id = id;
        this.name = name;
        this.type = type;
        this.note = note;
        this.enabled = enabled;
        this.element = null;
    }

    /**
     * Create an HTML document `sp-menu-item` element for the command.
     * @returns {HTMLElement}
     */
    createElement() {
        if (this.element) return this.element;

        // list item
        const listItem = document.createElement("li");
        listItem.setAttribute("id", this.id);
        listItem.classList.add("command");

        // TODO: re-enable after editing filter gallery commands
        // if (!this.enabled) {
        //     listItem.setAttribute("disabled", "");
        // }

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

        // note
        if (this.note) {
            const note = document.createElement("span");
            note.classList.add("note");
            note.textContent = this.note;
            body.appendChild(note);
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

        this.element = listItem;

        this.addEventListeners();
        return listItem;
    }

    /**
     * Add all command related event listeners.
     */
    addEventListeners() {
        if (!this.element) {
            console.error("Command element not created before adding event listeners.");
            return;
        }

        this.element.addEventListener("click", (event) => {
            document.dispatchEvent(
                new CustomEvent("paletteCommandSelected", {
                    detail: {
                        originalEvent: event,
                        command: this,
                    },
                })
            );
        });
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
    CommandTypes,
};
