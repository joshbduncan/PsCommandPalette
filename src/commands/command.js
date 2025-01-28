const CommandTypes = {
  MENU: "menu",
  CUSTOM: "custom",
  STARTUP: "startup",
};

const commandIcon = (type) => {
  // icons can be found at https://spectrum.adobe.com/page/icons/
  let icon;
  switch (type) {
    case "menu":
      icon =
        '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><defs><style>.fill {fill: #464646;}</style></defs><title>S Menu 18 N</title><rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" /><path class="fill" d="M16.5,1H1.5a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5V1.5A.5.5,0,0,0,16.5,1ZM13.803,7.8535,9,12.657,4.197,7.8535A.5.5,0,0,1,4.55,7h8.9a.5.5,0,0,1,.353.8535Z" /></svg>';
      break;
    case "star":
      icon =
        '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><defs><style>.fill {fill: #464646;}</style></defs><title>S Star 18 N</title><rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" /><path class="fill" d="M9.2385.2965,11.4,6.0145l6.106.289a.255.255,0,0,1,.15.454l-4.77,3.823,1.612,5.8965a.255.255,0,0,1-.386.2805L9,13.4025l-5.11,3.355a.255.255,0,0,1-.386-.2805l1.612-5.8965L.346,6.7575a.255.255,0,0,1,.15-.454L6.6,6.0145,8.7615.2965a.255.255,0,0,1,.477,0Z" /></svg>';
    default:
      icon =
        '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><defs><style>.fill {fill: #464646;}</style></defs><title>S RealTimeCustomerProfile 18 N</title><rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" /><path class="fill" d="M9,.5A8.5,8.5,0,1,0,17.5,9,8.5,8.5,0,0,0,9,.5Zm5.491,13.59161a5.41289,5.41289,0,0,0-3.11213-1.56415.65361.65361,0,0,1-.5655-.65569V10.9256a.65656.65656,0,0,1,.16645-.42218A4.99536,4.99536,0,0,0,12.12006,7.3855c0-2.36029-1.25416-3.67963-3.14337-3.67963s-3.179,1.36835-3.179,3.67963A5.05147,5.05147,0,0,0,6.9892,10.5047a.655.655,0,0,1,.16656.42206v.94165a.64978.64978,0,0,1-.57006.65539,5.43158,5.43158,0,0,0-3.11963,1.5205,7.49965,7.49965,0,1,1,11.025.04731Z" /></svg>';
      break;
  }
  return icon;
};

class Command {
  constructor(id, type) {
    this.id = id;
    this.type = type;
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

    // TODO: figure out how to capture keyboard shortcuts
    // <kbd slot="value">⌘S</kbd> or ::after and attr(data-kbd)
    // const kbdShortcut = document.createElement("kbd");
    // kbdShortcut.innerText = "";

    // TODO: add icon
    // <sp-icon name="ui:Arrow100"></sp-icon>
    const icon = document.createElement("div");
    // icon.setAttribute("name", "ui:Star");
    icon.classList.add("icon");
    icon.innerHTML = commandIcon(this.type);

    menuItem.appendChild(descriptionLabel);
    // menuItem.appendChild(kbdShortcut);
    menuItem.appendChild(icon);

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
  CommandTypes,
};
