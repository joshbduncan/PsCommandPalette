const { app, core } = require("photoshop");
const { storage } = require("uxp");
const fs = storage.localFileSystem;

/**
 * Remove nagging "&" characters that are returned from the `menuBarInfo` property.
 * @param {string} title Command title returned from the api
 * @returns {string}
 */
const cleanTitle = (title) => {
    return title.replace(/(\S)&/g, "$1").replace(/&(\S)/g, "$1").trim();
};

/**
 * @typedef {object} KeyboardShortcut
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

const menuCommandsPatchShortcutKeyLUT = {
    5069: {
        // Edit in Quick Mask Mode
        shiftKey: false,
        commandKey: false,
        optionKey: false,
        controlKey: false,
        keyChar: "Q",
    },
    5991: {
        // Standard Screen Mode
        shiftKey: false,
        commandKey: false,
        optionKey: false,
        controlKey: false,
        keyChar: "F",
    },
    5992: {
        // Full Screen Mode With Menu Bar
        shiftKey: false,
        commandKey: false,
        optionKey: false,
        controlKey: false,
        keyChar: "F",
    },
    5993: {
        // Full Screen Mode
        shiftKey: false,
        commandKey: false,
        optionKey: false,
        controlKey: false,
        keyChar: "F",
    },
};

/**
 * Execute a PSJS script file.
 * @param {storage.File} entry UXP storage file entry
 */
async function executePSJSScriptFile(entry) {
    // FIXME: Error executing PSJS script file /Users/jbd/Desktop/s.psjs: Error: invalid argument
    await core.executeAsModal(await app.open(entry), {
        commandName: "Executing External PSJS Script File",
    });
}

/**
 * Execute a JSX ExtendScript script file.
 * @param {storage.File} entry UXP storage file entry
 */
async function executeJSXScriptFile(entry) {
    try {
        let command = [
            {
                _obj: "AdobeScriptAutomation Scripts",
                javaScript: {
                    _kind: "local",
                    _path: await fs.createSessionToken(entry),
                },
                javaScriptMessage: "undefined",
                _options: {
                    dialogOptions: "dontDisplay",
                },
            },
        ];
        await core.executeAsModal(
            app.batchPlay(command, {
                commandName: "Executing External JSX Script File",
            })
        );
    } catch (error) {
        console.error(`Error executing JSX script file ${entry.nativePath}:`, error);
    }
}

module.exports = {
    cleanTitle,
    executePSJSScriptFile,
    executeJSXScriptFile,
    generateKeyboardShortcut,
    menuCommandsPatchShortcutKeyLUT,
};
