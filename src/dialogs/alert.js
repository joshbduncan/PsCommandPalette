/**
 * Alert types enum.
 */
const AlertTypes = {
    WARNING: "warning",
};

// TODO: use https://opensource.adobe.com/spectrum-web-components/components/alert-dialog/
// or await PhotoshopCore.showAlert({ message: 'Operation successful'})

/**
 * Return an svg icon for an alert dialog.
 * @param {string} type Icon to return
 * @returns SVG icon html content
 */
const alertIcon = (type) => {
    // icons can be found at https://spectrum.adobe.com/page/icons/
    let icon;
    switch (type) {
        case "warning":
            icon =
                '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><defs><style>.fill {fill: #464646;}</style></defs><title>S Menu 18 N</title><rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" /><path class="fill" d="M16.5,1H1.5a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5V1.5A.5.5,0,0,0,16.5,1ZM13.803,7.8535,9,12.657,4.197,7.8535A.5.5,0,0,1,4.55,7h8.9a.5.5,0,0,1,.353.8535Z" /></svg>';
            break;
        default:
            icon = "";
            break;
    }
    return icon;
};

/**
 * Display an alert dialog.
 * @param {string} title Alert dialog title
 * @param {string} message Dialog message
 * @param {string} icon Dialog icon
 */
const alertDialog = async (title, message, icon) => {
    const dialog = document.createElement("dialog");
    const form = document.createElement("form");
    const heading = document.createElement("sp-heading");
    const divider = document.createElement("sp-divider");
    const body = document.createElement("sp-body");
    const footer = document.createElement("footer");
    const okButton = document.createElement("sp-button");

    heading.textContent = title;
    divider.setAttribute("id", "alert-divider");
    divider.setAttribute("size", "medium");
    body.textContent = message;
    okButton.textContent = "Ok";
    okButton.setAttribute("variant", "cta");

    okButton.onclick = () => {
        dialog.close();
    };

    footer.appendChild(okButton);

    form.appendChild(heading);
    form.appendChild(divider);
    form.appendChild(body);
    form.appendChild(footer);
    dialog.appendChild(form);
    document.body.appendChild(dialog);

    const r = await dialog.uxpShowModal({
        title: title,
        resize: "none",
        size: {
            width: 480,
            height: 240,
        },
    });
    console.log(r);
    dialog.remove();
};

module.exports = {
    alertDialog,
};
