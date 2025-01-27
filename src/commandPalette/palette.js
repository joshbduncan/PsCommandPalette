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

    // setup queryBox
    const querybox = new QueryBox(this);
    body.appendChild(querybox.element);

    // setup divider
    const divider = document.createElement("sp-divider");
    divider.setAttribute("size", "medium");
    divider.setAttribute("style", "margin:0 0 5px 0");
    body.appendChild(divider);

    // setup listbox
    const listbox = new ListBox(this);
    body.appendChild(listbox.element);

    // add the body to the form
    form.appendChild(body);

    // add the form to the dialog
    dialog.appendChild(form);

    // add dialog to the document
    document.body.appendChild(dialog);

    // setup event listeners

    // listen for command clicked event
    document.addEventListener("paletteCommandCLicked", function (event) {
      console.log("clicked command:", event.detail.command);
      dialog.close({
        query: querybox.element.value,
        command: event.detail.command,
      });
    });

    // auto-focus input
    dialog.addEventListener("load", () => {
      setTimeout(() => {
        querybox.element.focus();
      }, 150);
    });

    // allow enter selection
    form.addEventListener("submit", (event) => {
      const selectedIndex = listbox.element.selectedIndex;
      const selectedCommand = listbox.element.children[selectedIndex];
      selectedCommand.click();
      event.preventDefault();
    });

    querybox.element.addEventListener("input", (event) => {
      console.log(`New value: ${event.target.value}`);
      listbox.filterCommands(event.target.value);
      listbox.element.selectedIndex = 0;
    });

    // allow keyboard listbox menu navigation with end-to-end scrolling
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const items = listbox.element.children.length;
        const cur = listbox.element.selectedIndex;
        console.log("current index:", cur, "items:", items);
        if (cur >= items - 1) {
          listbox.element.selectedIndex = 0;
        } else {
          listbox.element.selectedIndex++;
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const items = listbox.element.children.length;
        const cur = listbox.element.selectedIndex;
        console.log("current index:", cur, "items:", items);
        if (cur <= 0) {
          listbox.element.selectedIndex = items - 1;
        } else {
          listbox.element.selectedIndex--;
        }
      }
    });

    const result = await dialog.uxpShowModal({
      title: "Ps Command Palette",
      resize: "both",
      size: {
        width: 600,
        height: 396,
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
