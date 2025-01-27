class ListBox {
  constructor(palette) {
    this.palette = palette;
    this.element = document.createElement("sp-menu");
    this.element.setAttribute("id", "listbox");
  }

  filterCommands(query = "", type, enabled) {
    // remove all list items
    this.reset();

    // no need to filter if no parameters were specified
    if (query == "" && type === undefined && enabled === undefined) return;

    let matches = this.palette.commands.data;

    // filter on type
    if (type != undefined) {
      matches = matches.filter((command) => command.type == type);
    }

    // filter on enabled
    if (enabled === undefined || enabled) {
      matches = matches.filter((command) => command.enabled);
    }

    // filter on query
    if (query != "") {
      matches = matches.filter((command) =>
        command.textContent.toLowerCase().includes(query.toLowerCase())
      );
    }

    console.log(`found ${matches.length} matches`);

    // TODO: set selected attribute
    matches.slice(0, 9).forEach((command) => {
      this.element.appendChild(command.element);
    });
  }

  reset() {
    this.element.innerHTML = "";
  }
}

module.exports = {
  ListBox,
};
