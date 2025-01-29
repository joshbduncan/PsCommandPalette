class CommandPalette {
  constructor(commands) {
    this.commands = commands;
  }

  async open() {
    console.log("opening command palette:", this);

    const modal = this.createModalDialog();
    console.log("command palette document object:", modal);

    const result = await modal.uxpShowModal({
      title: "Ps Command Palette",
      resize: "vertical",
      size: {
        width: 680,
        height: 680,
      },
    });

    modal.remove();
    return result;
  }

  createModalDialog() {
    console.log("creating command palette modal");

    /////////////////////////
    // create modal dialog //
    /////////////////////////

    // setup dialog
    const dialog = document.createElement("dialog");
    dialog.setAttribute("id", "ps-command-palette");
    const form = document.createElement("form");
    const body = document.createElement("sp-body");

    // querybox
    const querybox = document.createElement("sp-textfield");
    querybox.setAttribute("id", "query");
    querybox.setAttribute("type", "search");
    querybox.setAttribute("placeholder", "Search for commands...");
    body.appendChild(querybox);

    // divider
    const divider = document.createElement("sp-divider");
    divider.setAttribute("id", "query-listbox-divider");
    divider.setAttribute("size", "medium");
    body.appendChild(divider);

    // listbox
    const listbox = document.createElement("sp-menu");
    listbox.setAttribute("id", "listbox");
    body.appendChild(listbox);

    // add body to the form and form to the dialog
    form.appendChild(body);
    dialog.appendChild(form);

    // add dialog to the document
    document.body.appendChild(dialog);

    /////////////////////////
    // add event listeners //
    /////////////////////////

    // auto-focus querybox input
    dialog.addEventListener("load", () => {
      setTimeout(() => {
        querybox.focus();
      }, 100);
    });

    // update commands on query input
    querybox.addEventListener("input", (event) => {
      console.log("query:", event.target.value);

      // clear current commands
      listbox.innerHTML = "";

      // query commands for matches
      const matches = this.commands.filterByQuery(event.target.value);

      // TODO: sort matches

      // load highest scoring matches
      matches.slice(0, 9).forEach((command) => {
        if (command.element === null) {
          command.createElement();
        }
        listbox.appendChild(command.element);
      });

      // select the first item
      listbox.selectedIndex = 0;
    });

    // listen for command clicked event
    document.addEventListener("paletteCommandCLicked", function (event) {
      console.log("clicked command:", event.detail.command);
      dialog.close({
        query: querybox.value,
        command: event.detail.command,
      });
    });

    // allow enter to submit form with currently selected command
    form.addEventListener("submit", (event) => {
      const selectedIndex = listbox.selectedIndex;
      const selectedCommand = listbox.children[selectedIndex];
      selectedCommand.click();
      event.preventDefault();
    });

    // allow keyboard listbox menu navigation with end-to-end scrolling
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const items = listbox.children.length;
        const cur = listbox.selectedIndex;

        // move the selection
        if (cur >= items - 1) {
          listbox.selectedIndex = 0;
        } else {
          listbox.selectedIndex++;
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const items = listbox.children.length;
        const cur = listbox.selectedIndex;

        // move the selection
        if (cur <= 0) {
          listbox.selectedIndex = items - 1;
        } else {
          listbox.selectedIndex--;
        }
      }
    });

    ///////////////////////////
    // load startup commands //
    ///////////////////////////

    // FIXME: temp adding elements on creation for testing
    console.log("loading startup commands");
    this.commands.startupCommands.forEach((command) => {
      if (command.element === null) {
        command.createElement();
      }
      listbox.appendChild(command.element);
      listbox.selectedIndex = 0;
    });

    /////////////////////////
    // return modal dialog //
    /////////////////////////

    return dialog;
  }
}

module.exports = {
  CommandPalette,
};
