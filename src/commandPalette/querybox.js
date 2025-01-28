class QueryBox {
  constructor(listbox) {
    this.listbox = listbox;
    this.element = document.createElement("sp-textfield");
    this.element.setAttribute("id", "query");
    this.element.setAttribute("type", "search");
    this.element.setAttribute("placeholder", "Search for commands...");

    this.addEventListeners();
  }

  addEventListeners() {
    // update commands on query input
    this.element.addEventListener("input", (event) => {
      console.log(`New value: ${event.target.value}`);
      this.listbox.filterCommands(event.target.value);
      this.listbox.element.selectedIndex = 0;
    });
  }

  reset() {
    this.element.value = "";
  }
}

module.exports = {
  QueryBox,
};
