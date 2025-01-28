class ListBox {
  constructor(commands) {
    this.commands = commands;
    this.element = document.createElement("sp-menu");
    this.element.setAttribute("id", "listbox");

    this.addEventListeners();

    this.loadStartupCommands();
  }

  loadStartupCommands() {
    const startupCommandIDs = [1030, 15204, 101];
    let startupCommands = this.commands.data;

    for (let i = 0; i < this.commands.data.length; i++) {
      const element = this.commands.data[i];
    }

    startupCommands = startupCommands.filter((command) =>
      startupCommandIDs.includes(command.id)
    );

    console.log("startupCommands:", startupCommands);

    startupCommands.slice(0, 9).forEach((command, index) => {
      // const kbdContent = index === 0 ? "↩" : `⌘${index + 1}`;
      // command.element.getElementsByTagName("kbd")[0].textContent = kbdContent;
      this.element.appendChild(command.element);
    });

    this.element.selectedIndex = 0;
  }

  addEventListeners() {
    // allow keyboard listbox menu navigation with end-to-end scrolling
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const items = this.element.children.length;
        const cur = this.element.selectedIndex;

        // update the current kbd shortcut
        // const curChild = this.element.children[this.element.selectedIndex];
        // curChild.getElementsByTagName("kbd")[0].textContent = `⌘${cur + 1}`;

        // move the selection
        if (cur >= items - 1) {
          this.element.selectedIndex = 0;
        } else {
          this.element.selectedIndex++;
        }

        // update the new kbd shortcut
        // const activeChild = this.element.children[this.element.selectedIndex];
        // activeChild.getElementsByTagName("kbd")[0].textContent = "↩";
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const items = this.element.children.length;
        const cur = this.element.selectedIndex;

        // update the current kbd shortcut
        // const curChild = this.element.children[this.element.selectedIndex];
        // curChild.getElementsByTagName("kbd")[0].textContent = `⌘${cur + 1}`;

        // move the selection
        if (cur <= 0) {
          this.element.selectedIndex = items - 1;
        } else {
          this.element.selectedIndex--;
        }

        // update the current kbd shortcut
        // const activeChild = this.element.children[this.element.selectedIndex];
        // activeChild.getElementsByTagName("kbd")[0].textContent = "↩";
      }
    });
  }

  filterCommands(query = "", type, enabled) {
    // remove all list items
    this.reset();

    // no need to filter if no parameters were specified
    if (query == "" && type === undefined && enabled === undefined) return;

    let matches = this.commands.data;

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

    matches.slice(0, 9).forEach((command, index) => {
      // const kbdContent = index === 0 ? "↩" : `⌘${index + 1}`;
      // command.element.getElementsByTagName("kbd")[0].textContent = kbdContent;
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
