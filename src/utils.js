const { app, core } = require("photoshop");
const { storage } = require("uxp");
const fs = storage.localFileSystem;

/**
 * Return an svg icon matching `name`.
 * @param {string} name Icon to return
 * @returns {string} SVG icon html content
 */
const iconMap = {
    menu: `
        <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18">
            <defs><style>.fill {fill: #464646;}</style></defs>
            <title>S Menu 18 N</title>
            <rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" />
            <path class="fill" d="M16.5,1H1.5a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5V1.5A.5.5,0,0,0,16.5,1ZM13.803,7.8535,9,12.657,4.197,7.8535A.5.5,0,0,1,4.55,7h8.9a.5.5,0,0,1,.353.8535Z" />
        </svg>
    `,
    star: `
        <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18">
            <defs><style>.fill {fill: #464646;}</style></defs>
            <title>S Star 18 N</title>
            <rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" />
            <path class="fill" d="M9.2385.2965,11.4,6.0145l6.106.289a.255.255,0,0,1,.15.454l-4.77,3.823,1.612,5.8965a.255.255,0,0,1-.386.2805L9,13.4025l-5.11,3.355a.255.255,0,0,1-.386-.2805l1.612-5.8965L.346,6.7575a.255.255,0,0,1,.15-.454L6.6,6.0145,8.7615.2965a.255.255,0,0,1,.477,0Z" />
        </svg>
    `,
    default: `
        <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18">
            <defs><style>.fill {fill: #464646;}</style></defs>
            <title>S RealTimeCustomerProfile 18 N</title>
            <rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" />
            <path class="fill" d="M9,.5A8.5,8.5,0,1,0,17.5,9,8.5,8.5,0,0,0,9,.5Zm5.491,13.59161a5.41289,5.41289,0,0,0-3.11213-1.56415.65361.65361,0,0,1-.5655-.65569V10.9256a.65656.65656,0,0,1,.16645-.42218A4.99536,4.99536,0,0,0,12.12006,7.3855c0-2.36029-1.25416-3.67963-3.14337-3.67963s-3.179,1.36835-3.179,3.67963A5.05147,5.05147,0,0,0,6.9892,10.5047a.655.655,0,0,1,.16656.42206v.94165a.64978.64978,0,0,1-.57006.65539,5.43158,5.43158,0,0,0-3.11963,1.5205,7.49965,7.49965,0,1,1,11.025.04731Z" />
        </svg>
    `,
};

/**
 * Returns an SVG icon for the given name.
 * @param {string} name - The name of the icon to retrieve.
 * @returns {string} - The SVG HTML string of the requested icon, or a default icon.
 */
const getIcon = (name) => {
    return iconMap[name] || iconMap["default"];
};

/**
 * Remove nagging "&" characters that are returned from the `menuBarInfo` property.
 * @param {string} title Command title returned from the api
 * @returns {string}
 */
const cleanTitle = (title) => {
    return title.replace(/(\S)&/g, "$1").replace(/&(\S)/g, "$1").trim();
};

/**
 * @typedef {Object} KeyboardShortcut
 * @property {boolean} shiftKey
 * @property {boolean} commandKey
 * @property {boolean} optionKey
 * @property {boolean} controlKey
 * @property {string} keyChar
 */

/**
 * Generate a keyboard shortcut combination string.
 * @param {KeyboardShortcut} keyboardShortcut Menu command keyboard shortcut object returned from the menuBarInfo property.
 * @returns string
 */
const generateKeyboardShortcut = (keyboardShortcut) => {
    const { shiftKey, controlKey, optionKey, commandKey, keyChar } = keyboardShortcut;
    const modifiers = [
        shiftKey ? "⇧" : "",
        controlKey ? "⌃" : "",
        optionKey ? "⌥" : "",
        commandKey ? "⌘" : "",
    ];
    return [...modifiers, keyChar].filter(Boolean).join("");
};

/**
 * Execute a PSJS script file.
 * @param {storage.File} f UXP storage file entry
 */
const executePSJSScriptFile = async (f) => {
    try {
        await core.executeAsModal(async () => {
            app.open(f);
        });
    } catch (error) {
        console.error(`Error executing PSJS script file ${f.nativePath}:`, error);
    }
};

/**
 * Execute a JSX ExtendScript script file.
 * @param {storage.File} f UXP storage file entry
 */
const executeJSXScriptFile = async (f) => {
    try {
        let fileToken = await fs.createSessionToken(f);
        let command = [
            {
                _obj: "AdobeScriptAutomation Scripts",
                javaScript: {
                    _kind: "local",
                    _path: fileToken,
                },
                javaScriptMessage: "undefined",
                _options: {
                    dialogOptions: "dontDisplay",
                },
            },
        ];
        await core.executeAsModal(async () => {
            app.batchPlay(command, { commandName: "External JSX Script" });
        });
    } catch (error) {
        console.error(`Error executing JSX script file ${f.nativePath}:`, error);
    }
};

module.exports = {
    getIcon,
    cleanTitle,
    generateKeyboardShortcut,
    executePSJSScriptFile,
    executeJSXScriptFile,
};
