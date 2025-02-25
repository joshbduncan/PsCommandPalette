const { app, core } = require("photoshop");
const { storage } = require("uxp");
const fs = storage.localFileSystem;

const { Command } = require("../commands/Command.js");

/**
 * Remove nagging "&" characters that are returned from the `menuBarInfo` property.
 * @param {string} title - Command title returned from the api
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
 * @param {KeyboardShortcut} keyboardShortcut - Menu command keyboard shortcut object returned from the menuBarInfo property.
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
 * Sort commands by total usage score, then by name.
 * @param {Command[]} commands - - Array of command objects
 * @returns {Command[]}
 */
function sortCommandsByOccurrence(commands) {
    return commands.slice().sort((a, b) => {
        scoreA = HISTORY.occurrencesLUT?.[a.id] || 0;
        scoreB = HISTORY.occurrencesLUT?.[b.id] || 0;

        // sort by recency score (higher first), then by name (alphabetically)
        return scoreB - scoreA || a.name.localeCompare(b.name);
    });
}

/**
 * Sort commands by HISTORY recency score, then by name.
 * @param {Command[]} commands - - Array of command objects
 * @returns {Command[]}
 */
function sortCommandsByRecency(commands) {
    return commands.slice().sort((a, b) => {
        const scoreA = HISTORY.recencyLUT?.[a.id] || 0;
        const scoreB = HISTORY.recencyLUT?.[b.id] || 0;

        // sort by recency score (higher first), then by name (alphabetically)
        return scoreB - scoreA || a.name.localeCompare(b.name);
    });
}

/**
 * Execute a PSJS script file.
 * @param {storage.File} entry - UXP storage file entry
 * @returns {Promise<void>}
 */
async function executePSJSScriptFile(entry) {
    // FIXME: Error executing PSJS script file /Users/jbd/Desktop/s.psjs: Error: invalid argument

    // should be able to be written this way but it only executes once every so often

    // return await core.executeAsModal(
    //     async () => {
    //         return await app.open(entry);
    //     },
    //     {
    //         commandName: "Executing External PSJS Script File",
    //     }
    // );

    // using this method because at least work more times than not but throws the invalid argument error
    let f = async (entry) => {
        return await app.open(entry);
    };
    return await core.executeAsModal(await f(entry), {
        commandName: "Executing External PSJS Script File",
    });
}

/**
 * Execute a JSX ExtendScript script file.
 * @param {storage.File} entry - UXP storage file entry
 * @returns {Promise<void>}
 */
async function executeJSXScriptFile(entry) {
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
    return await core.executeAsModal(
        app.batchPlay(command, {
            commandName: "Executing External JSX Script File",
        })
    );
}

module.exports = {
    cleanTitle,
    executePSJSScriptFile,
    executeJSXScriptFile,
    generateKeyboardShortcut,
    menuCommandsPatchShortcutKeyLUT,
    sortCommandsByOccurrence,
    sortCommandsByRecency,
};
