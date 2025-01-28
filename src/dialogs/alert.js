const alertDialog = async (title, icon, message) => {
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
