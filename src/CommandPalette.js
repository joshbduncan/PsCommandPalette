const { core } = require("photoshop");

const { Command } = require("./commands/Command");

/**
 * Create a command palette.
 */
class CommandPalette {
  /**
   * Create a command palette.
   * @param {Array.<Command>} commands Queryable command palette commands
   * @param {Array.<string>} startupCommands Commands displayed when command palette launches
   */
  constructor(commands, startupCommands) {
    this.commands = commands != undefined ? commands : DATA.commands;
    this.startupCommands =
      startupCommands != undefined ? startupCommands : DATA.startupCommands;
  }

  /**
   * Open the command palette dialog modal.
   * @returns {Promise.<object>}
   */
  async open() {
    const modal = this.createModalDialog();
    const result = await modal.uxpShowModal({
      title: "Ps Command Palette",
      resize: "vertical",
      size: {
        width: 600,
        height: 700,
      },
    });

    modal.remove();
    return result;
  }

  /**
   * Create the command palette dialog modal HTML element.
   * @returns {Element}
   */
  createModalDialog() {
    console.log("creating command palette modal");

    /////////////////////////
    // create modal dialog //
    /////////////////////////

    // setup dialog
    const dialog = document.createElement("dialog");
    dialog.setAttribute("id", "ps-command-palette");
    const form = document.createElement("form");

    // querybox
    const querybox = document.createElement("sp-textfield");
    querybox.setAttribute("id", "query");
    querybox.setAttribute("type", "search");
    querybox.setAttribute("placeholder", "Search for commands...");
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

    // add the form to the dialog
    dialog.appendChild(form);

    // add dialog to the document
    document.body.appendChild(dialog);

    //////////////////////
    // helper functions //
    //////////////////////

    /**
     * Reset the selected command to the first command if available.
     */
    function resetCommandSelection() {
      if (listbox.children.length > 0) {
        listbox.children.forEach((command) => {
          command.removeAttribute("selected");
        });
        moveCommandSelection(null, 0);
      }
    }

    /**
     * Determine the currently selected command `li` element.
     * @returns number
     */
    function getSelectedCommand() {
      for (let index = 0; index < listbox.children.length; index++) {
        const command = listbox.children[index];
        if (command.hasAttribute("selected")) {
          return index;
        }
      }
    }

    /**
     * Change which command is selected.
     * @param {number} previousIndex Index of currently selected command (before any changes)
     * @param {number} newIndex Index of next command to be selected
     */
    function moveCommandSelection(previousIndex, newIndex) {
      if (typeof previousIndex === "number") {
        listbox.children[previousIndex].removeAttribute("selected");
      }
      listbox.children[newIndex].setAttribute("selected", "");
    }

    /////////////////////////
    // add event listeners //
    /////////////////////////

    /**
     * Auto-focus the querybox input element.
     */
    dialog.addEventListener("load", () => {
      querybox.focus();
    });

    /**
     * Update listed commands on query input.
     */
    querybox.addEventListener("input", (event) => {
      // clear current commands
      listbox.innerHTML = "";

      // query commands for matches
      const matches = DATA.filterByQuery(this.commands, event.target.value);

      // TODO: sort matches

      // load highest scoring matches
      matches.slice(0, 9).forEach((command) => {
        if (command.element === null) {
          command.createElement();
        }
        listbox.appendChild(command.element);
      });

      // select the first item
      resetCommandSelection(listbox);
    });

    /**
     * Listen for the command clicked event.
     */
    document.addEventListener("paletteCommandSelected", function (event) {
      dialog.close({
        query: querybox.value,
        command: event.detail.command,
      });
    });

    /**
     * Allow enter to submit form with currently selected command.
     */
    form.addEventListener("submit", (event) => {
      const selectedIndex = getSelectedCommand();
      const selectedCommand = listbox.children[selectedIndex];
      selectedCommand.click();
      event.preventDefault();
    });

    /**
     * Enable keyboard (up/down arrows) command list navigation with end-to-end scrolling.
     */
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();

        const items = listbox.children.length;
        const previousIndex = getSelectedCommand();
        let newIndex;

        // move the selection
        if (previousIndex >= items - 1) {
          newIndex = 0;
        } else {
          newIndex = previousIndex + 1;
        }

        moveCommandSelection(previousIndex, newIndex);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();

        const items = listbox.children.length;
        const previousIndex = getSelectedCommand();
        let newIndex;

        // move the selection
        if (previousIndex <= 0) {
          newIndex = items - 1;
        } else {
          newIndex = previousIndex - 1;
        }

        moveCommandSelection(previousIndex, newIndex);
      }
    });

    ///////////////////////////
    // load startup commands //
    ///////////////////////////

    // TODO: filter out unavailable commands or make them disabled
    console.log("loading startup commands");

    this.startupCommands.slice(0, 9).forEach((command) => {
      if (command.element === null) {
        command.createElement();
      }
      listbox.appendChild(command.element);
      listbox.selectedIndex = 0;
    });
    resetCommandSelection(listbox);

    /////////////////////////
    // return modal dialog //
    /////////////////////////

    return dialog;
  }
}

module.exports = {
  CommandPalette,
};
