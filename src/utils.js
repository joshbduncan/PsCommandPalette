/**
 * Remove nagging "&" characters that are returned from the `menuBarInfo` property.
 * @param {string} title Command title returned from the api
 * @returns {string}
 */
function cleanTitle(title) {
  // FIXME: more elegant solution for other locales
  if (!title.includes("&")) {
    return title;
  }
  const arr = title.split(" & ");
  arr.forEach((value, index) => {
    arr[index] = value.replace(/&/g, "");
  });
  return arr.length > 1 ? arr.join(" & ") : arr[0];
}

/**
 * Generate a keyboard shortcut combination string.
 * @param { {"shiftKey": Boolean, "commandKey": Boolean, "optionKey": Boolean, "controlKey": Boolean, "keyChar": string} } obj Menu command keyboard shortcut object returned from the `menuBarInfo` property.
 * @returns string
 */
function generateKeyboardShortcut(obj) {
  // Control (⌃), Option (⌥), Shift (⇧) Command (⌘)
  // TODO: may need to use escape symbols (see https://brettterpstra.com/2019/04/19/creating-shortcuts-for-mac-symbols-in-html/)
  // TODO: correct order to match adobe ordering (see https://helpx.adobe.com/photoshop/using/default-keyboard-shortcuts.html)
  return (
    (obj.controlKey ? "⌃" : "") +
    (obj.optionKey ? "⌥" : "") +
    (obj.shiftKey ? "⇧" : "") +
    (obj.commandKey ? "⌘" : "") +
    obj.keyChar
  );
}

module.exports = {
  cleanTitle,
  generateKeyboardShortcut,
};
