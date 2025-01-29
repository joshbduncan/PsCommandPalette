const { getIcon } = require("../icons.js");

/**
 * Command type enum.
 */
const CommandTypes = {
  MENU: "menu",
  CUSTOM: "custom",
  STARTUP: "startup",
};

/**
 * Create a command palette command.
 */
class Command {
  /**
   * Crete a command palette command.
   * @param {string|number} id Unique command id
   * @param {string} name Command name
   * @param {string} type Command type
   * @param {boolean} enabled Is command enabled for use (defaults to true)
   */
  constructor(id, name, type, enabled = true) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.enabled = enabled;
    this.hint = null;
    this.element = null;
  }

  /**
   * Create an HTML document `sp-menu-item` element for the command.
   * @param {string} displayText Command display title
   * @param {string} description Command description for display (e.g. menu path for menu command)
   * @returns {Element}
   */
  createElement(displayText, description) {
    const menuItem = document.createElement("sp-menu-item");
    menuItem.setAttribute("id", this.id);
    menuItem.setAttribute("command-id", this.id);
    menuItem.textContent = displayText;

    const descriptionLabel = document.createElement("sp-label");
    descriptionLabel.setAttribute("id", `${this.id}-description`);
    descriptionLabel.classList.add("description");
    descriptionLabel.textContent = description;

    const icon = document.createElement("div");
    icon.classList.add("icon");
    icon.innerHTML = getIcon(this.type);

    menuItem.appendChild(descriptionLabel);
    menuItem.appendChild(icon);

    this.element = menuItem;

    this.addEventListeners();

    return menuItem;
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
