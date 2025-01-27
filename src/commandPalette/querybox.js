class QueryBox {
  constructor(palette) {
    this.palette = palette;
    this.element = document.createElement("sp-textfield");
    this.element.setAttribute("id", "query");
    this.element.setAttribute("type", "search");
    this.element.setAttribute("placeholder", "Search for commands...");
  }

  reset() {
    this.element.value = "";
  }
}

module.exports = {
  QueryBox,
};
