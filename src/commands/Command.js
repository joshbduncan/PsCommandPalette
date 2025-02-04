const { getIcon } = require("../icons.js");

/**
 * Command type enum.
 */
const CommandTypes = {
  ACTION: "action",
  MENU: "menu",
  TOOL: "tool",
  CUSTOM: "custom",
  STARTUP: "startup",
};

/**
 * Create a command palette command.
 */
class Command {
  /**
   * Crete a command palette command.
   * @param {string} id Unique command id
   * @param {string} name Command name
   * @param {string} type Command type
   * @param {boolean} enabled Is command enabled for use (defaults to true)
   */
  constructor(id, name, type, description = "", enabled = true) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.description = description;
    this.enabled = enabled;
    this.element = null;
  }

  /**
   * Create an HTML document `sp-menu-item` element for the command.
   * @returns {Element}
   */
  createElement() {
    // list item
    const listItem = document.createElement("li");
    listItem.setAttribute("id", this.id);
    listItem.classList.add("command");

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
    if (this.hasOwnProperty("keyboardShortcut")) {
      const shortcut = document.createElement("kbd");
      shortcut.classList.add("shortcut");
      shortcut.textContent = this.keyboardShortcut;
      header.appendChild(shortcut);
    }

    // description
    const descriptionLabel = document.createElement("span");
    descriptionLabel.classList.add("description");
    descriptionLabel.textContent = this.description;
    body.appendChild(descriptionLabel);

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
    this.element.addEventListener("click", (event) => {
      const customEvent = new CustomEvent("paletteCommandSelected", {
        detail: {
          originalEvent: event,
          command: this,
        },
      });
      document.dispatchEvent(customEvent);
    });
  }

  /**
   * Execute the command.
   */
  execute() {
    console.log(`base 'Command' execute for ${this.id}`);
  }
}

module.exports = {
  Command,
  CommandTypes,
};
