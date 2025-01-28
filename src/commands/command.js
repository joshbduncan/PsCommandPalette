class Command {
  constructor(id) {
    this.id = id;
    this.element;
  }

  createElement(title, description) {
    const menuItem = document.createElement("sp-menu-item");
    menuItem.setAttribute("id", this.id);
    menuItem.setAttribute("command-id", this.id);
    menuItem.textContent = title;

    const descriptionLabel = document.createElement("sp-label");
    descriptionLabel.setAttribute("id", `${this.id}-description`);
    descriptionLabel.classList.add("description");
    descriptionLabel.textContent = description;

    // TODO: add keyboard shortcut
    // <kbd slot="value">⌘S</kbd> or ::after and attr(data-kbd)
    const kbdShortcut = document.createElement("kbd");
    kbdShortcut.innerText = "";

    // TODO: add icon

    menuItem.appendChild(descriptionLabel);
    menuItem.appendChild(kbdShortcut);

    this.element = menuItem;

    this.addEventListeners();
  }

  addEventListeners() {
    this.element.addEventListener("click", (event) => {
      console.log("clicked command:", event.target.value);
      const customEvent = new CustomEvent("paletteCommandCLicked", {
        detail: {
          originalEvent: event,
          command: this,
        },
      });
      document.dispatchEvent(customEvent);
    });
  }

  execute() {
    console.log(`base 'Command' execute for ${this.id}`);
  }
}

module.exports = {
  Command,
};
