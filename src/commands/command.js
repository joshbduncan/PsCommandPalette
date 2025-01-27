class Command {
  constructor(id) {
    this.id = id;
    this.element;
  }

  createElement(textContent) {
    const command = document.createElement("sp-menu-item");
    command.setAttribute("command-id", this.id);
    command.textContent = textContent;
    this.element = command;
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
