const { QueryBox } = require("./querybox.js");
const { ListBox } = require("./listbox.js");

class CommandPalette {
  constructor(commands) {
    this.commands = commands;
  }

  async open() {
    console.log("opening command palette:", this);

    // setup dialog
    const dialog = document.createElement("dialog");
    dialog.setAttribute("id", "command-palette");
    const form = document.createElement("form");
    const body = document.createElement("sp-body");

    // setup form elements
    const listbox = new ListBox(this.commands);
    const querybox = new QueryBox(listbox);
    const divider = document.createElement("sp-divider");
    divider.setAttribute("id", "query-listbox-divider");
    divider.setAttribute("size", "medium");

    // add elements to the body and the body to the form
    body.appendChild(querybox.element);
    body.appendChild(divider);
    body.appendChild(listbox.element);
    form.appendChild(body);

    // add the form to the dialog
    dialog.appendChild(form);

    // add dialog to the document
    document.body.appendChild(dialog);

    // setup event listeners

    // auto-focus input
    dialog.addEventListener("load", () => {
      setTimeout(() => {
        querybox.element.focus();
      }, 150);
    });

    // listen for command clicked event
    document.addEventListener("paletteCommandCLicked", function (event) {
      console.log("clicked command:", event.detail.command);
      dialog.close({
        query: querybox.element.value,
        command: event.detail.command,
      });
    });

    // allow enter selection
    form.addEventListener("submit", (event) => {
      const selectedIndex = listbox.element.selectedIndex;
      const selectedCommand = listbox.element.children[selectedIndex];
      selectedCommand.click();
      event.preventDefault();
    });

    const result = await dialog.uxpShowModal({
      title: "Ps Command Palette",
      resize: "vertical",
      size: {
        width: 680,
        height: 680,
      },
    });

    console.log("selected menu element:", listbox.element.selectedIndex);

    dialog.remove();
    return result;
  }
}

module.exports = {
  CommandPalette,
};
