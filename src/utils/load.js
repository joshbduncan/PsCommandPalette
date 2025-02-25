const { ActionCommand } = require("../commands/ActionCommand.js");
const { APICommand } = require("../commands/APICommand.js");
const {
    FileBookmarkCommand,
    FolderBookmarkCommand,
} = require("../commands/BookmarkCommand.js");
const { MenuCommand } = require("../commands/MenuCommand.js");
const { PluginCommand } = require("../commands/PluginCommand.js");
const { ScriptCommand } = require("../commands/ScriptCommand.js");
const { ToolCommand } = require("../commands/ToolCommand.js");

const { apiCommands } = require("../commands/api/commands.js");
const { BookmarkCommandTypes, CommandTypes } = require("../types.js");
const { pluginCommands } = require("../commands/plugin/commands.js");

const { cleanTitle, menuCommandsPatchShortcutKeyLUT } = require("./commands.js");

/**
 * Load all commands types into the commands set.
 * @param {string[]} excludedTypes - Command types to exclude during load
 * @returns
 */
async function loadCommands(excludedTypes = []) {
    const commands = [];

    const loadFunctionsLUT = {
        [CommandTypes.ACTION]: loadActionCommands,
        [CommandTypes.API]: loadAPICommands,
        [CommandTypes.BOOKMARK]: loadBookmarkCommands,
        [CommandTypes.MENU]: loadMenuCommands,
        [CommandTypes.PLUGIN]: loadPluginCommands,
        [CommandTypes.SCRIPT]: loadScriptCommands,
        [CommandTypes.TOOL]: loadToolCommands,
    };

    const commandTypesToLoad = Object.values(CommandTypes).filter(
        (type) => !excludedTypes.includes(type)
    );

    for (const type of commandTypesToLoad) {
        // TODO: exclusions from user data should be passed into function as arg
        // if (
        //     Object.hasOwn(USER.data, "disabledCommandTypes") &&
        //     USER.data.disabledCommandTypes.includes(key)
        // ) {
        //     console.log(`skipping command type ${key}`);
        //     continue;
        // }
        try {
            let func = loadFunctionsLUT[type];
            if (!func) continue;
            console.log(`loading ${type} commands`);
            commands.push(...(await func()));
        } catch (error) {
            console.error(error);
        }
    }

    return commands;
}

/////////////////////////////////
// command type load functions //
/////////////////////////////////

/**
 * Load action commands.
 * @returns {Promise<ActionCommand[]>}
 */
async function loadActionCommands() {
    const actionTree = await app.actionTree;
    const actions = new Array(
        actionTree.reduce((count, set) => count + set.actions.length, 0)
    ); // preallocate array

    let index = 0;
    for (const set of actionTree) {
        const parentName = set.name; // cache repeated property access
        for (const action of set.actions) {
            actions[index++] = new ActionCommand(
                `ps_action_${parentName}_${action.name}_${action.id}`,
                action.name,
                `Action Set: ${parentName}`,
                action.play
            );
        }
    }
    return actions;
}

/**
 * Load api commands.
 * @returns {ApiCommand[]}
 */
function loadAPICommands() {
    return Object.entries(apiCommands).map(([key, obj]) =>
        Object.assign(new APICommand(key, obj.name, obj.description), {
            execute: obj.callback,
        })
    );
}

/**
 * Load user bookmark commands.
 * @returns {BookmarkCommand[]}
 */
async function loadBookmarkCommands() {
    return USER.data.bookmarks.map((bookmark) =>
        bookmark.type === BookmarkCommandTypes.FILE
            ? new FileBookmarkCommand({ ...bookmark })
            : new FolderBookmarkCommand({ ...bookmark })
    );
}

/**
 * Load menu commands.
 * @returns {Promise<MenuCommand[]>}
 */
async function loadMenuCommands() {
    const menusToIgnore = new Set(["Open Recent"]);
    const menuItemsToIgnore = new Set();

    // some nested menu items have command names like...
    // 'Layer > New > Layer' and 'Layer > Delete > Layer' which each
    // have the command name 'Layer' making querying hard so I plan
    // to patch commands these commands
    const menuItemsToPatchName = {
        7802: () => "Define Variables",
        1099: () => "New Layer",
        1942: () => "New Layer from Background",
        2976: () => "New Group",
        2956: () => "New Group from Layers",
        9220: () => "New Artboard",
        9221: () => "New Artboard from Group",
        9222: () => "New Artboard from Layers",
        1100: (str) => `Delete ${str}`,
        2951: () => "Delete Hidden Layers",
    };

    /**
     * Get all current Photoshop menu commands via batchPlay and the `menuBarInfo` property.
     * @returns {Promise<object>}
     */
    const getMenuBarItems = async () => {
        try {
            return await app.batchPlay(
                [
                    {
                        _obj: "get",
                        _target: [
                            { _property: "menuBarInfo" },
                            { _ref: "application" },
                        ],
                    },
                ],
                {}
            );
        } catch (error) {
            console.error("Error fetching menuBarInfo:", error);
            return null;
        }
    };

    /**
     * Build `Menu` objects for each Photoshop menu command.
     * Uses an iterative approach instead of recursion.
     * @param {object} root - Menu bar info object
     * @returns {MenuCommand[]}
     */
    const buildMenus = (root) => {
        if (!root?.submenu) return [];

        const results = [];
        const stack = [{ node: root, path: [] }]; // Use stack to eliminate deep recursion

        while (stack.length) {
            const { node, path } = stack.pop();

            if (!node) continue;

            if (Array.isArray(node.submenu)) {
                for (const submenu of node.submenu) {
                    const cleanedTitle = cleanTitle(submenu.title);

                    if (
                        !menusToIgnore.has(cleanedTitle) &&
                        !menuItemsToIgnore.has(cleanedTitle)
                    ) {
                        stack.push({ node: submenu, path: [...path, cleanedTitle] });
                    }
                }
            }

            if (node.kind === "item") {
                // patch name if needed
                if (node.command in menuItemsToPatchName) {
                    node.name = menuItemsToPatchName[node.command](node.name);
                }

                // clean title for display
                node.title = cleanTitle(node.title);

                // stringify menu shortcut
                node.menuShortcut =
                    menuCommandsPatchShortcutKeyLUT[node.command] || node.menuShortcut;

                results.push(
                    new MenuCommand({
                        ...node,
                        path: [...path],
                    })
                );
            }
        }
        return results;
    };

    const menuBarItems = await getMenuBarItems();
    if (!menuBarItems?.[0]?.menuBarInfo) {
        console.warn("No menu items found.");
        return [];
    }

    return buildMenus(menuBarItems[0].menuBarInfo);
}

/**
 * Load plugin commands.
 * @returns {PluginCommand[]}
 */
function loadPluginCommands() {
    return Object.entries(pluginCommands).map(([key, obj]) =>
        Object.assign(new PluginCommand(key, obj.name, obj.description), {
            execute: obj.callback,
        })
    );
}

/**
 * Load script commands.
 * @returns {ScriptCommand[]}
 */
async function loadScriptCommands() {
    return USER.data.scripts.map((script) => new ScriptCommand({ ...script }));
}

/**
 * Load tool commands.
 * @returns {ToolCommand[]}
 */
function loadToolCommands() {
    const tools = [
        {
            _ref: "moveTool",
            name: "Move tool",
            description: "Moves a selection or layer.",
            keyboardShortcut: "V",
        },
        {
            _ref: "artboardTool",
            name: "Artboard tool",
            description: "Creates, moves, or resizes multiple canvases.",
            keyboardShortcut: "V",
        },
        {
            _ref: "marqueeRectTool",
            name: "Rectangular Marquee tool",
            description: "Makes a selection in the shape of a rectangle.",
            keyboardShortcut: "M",
        },
        {
            _ref: "marqueeEllipTool",
            name: "Elliptical Marquee tool",
            description: "Make oval and circular selections.",
            keyboardShortcut: "M",
        },
        {
            _ref: "marqueeSingleRowTool",
            name: "Single Row Marquee tool",
            description: "Makes a horizontal selection that's a single pixel high.",
            keyboardShortcut: null,
        },
        {
            _ref: "marqueeSingleColumnTool",
            name: "Single Column Marquee tool",
            description: "Makes a vertical selection that's a single pixel wide.",
            keyboardShortcut: null,
        },
        {
            _ref: "lassoTool",
            name: "Lasso tool",
            description: "Makes freehand selections.",
            keyboardShortcut: "L",
        },
        {
            _ref: "polySelTool",
            name: "Polygonal Lasso tool",
            description: "Make selections by connecting straight lines.",
            keyboardShortcut: "L",
        },
        {
            _ref: "magneticLassoTool",
            name: "Magnetic Lasso tool",
            description: "Make selections that snap to edges in an image as you drag.",
            keyboardShortcut: "L",
        },
        {
            _ref: "quickSelectTool",
            name: "Quick Selection tool",
            description:
                "Makes a selection by finding and following the edges in an image.",
            keyboardShortcut: "W",
        },
        {
            _ref: "magicWandTool",
            name: "Magic Wand tool",
            description: "Select an area based on its color.",
            keyboardShortcut: "W",
        },
        {
            _ref: "cropTool",
            name: "Crop tool",
            description: "Trims or expands the edges of an image.",
            keyboardShortcut: "C",
        },
        {
            _ref: "perspectiveCropTool",
            name: "Perspective Crop tool",
            description: "Crops an image to correct distortions caused by perspective.",
            keyboardShortcut: "C",
        },
        {
            _ref: "sliceTool",
            name: "Slice tool",
            description: "Cuts an image into smaller sections suitable for web design.",
            keyboardShortcut: "C",
        },
        {
            _ref: "sliceSelectTool",
            name: "Slice Select tool",
            description: "Selects, moves, and resizes slices of an image.",
            keyboardShortcut: "C",
        },
        {
            _ref: "framedGroupTool",
            name: "Frame Tool",
            description: "Creates placeholder frames for images.",
            keyboardShortcut: "K",
        },
        {
            _ref: "eyedropperTool",
            name: "Eyedropper tool",
            description: "Samples colors from an image.",
            keyboardShortcut: "I",
        },
        {
            _ref: "colorSamplerTool",
            name: "Color Sampler tool",
            description: "Displays values for colors in an image.",
            keyboardShortcut: "I",
        },
        {
            _ref: "rulerTool",
            name: "Ruler tool",
            description: "Measures distances and angles in an image.",
            keyboardShortcut: "I",
        },
        {
            _ref: "textAnnotTool",
            name: "Note tool",
            description: "Creates text notes that you can attach to an image or file.",
            keyboardShortcut: "I",
        },
        {
            _ref: "countTool",
            name: "Count tool",
            description: "Counts the number of objects in an image.",
            keyboardShortcut: "I",
        },
        {
            _ref: "spotHealingBrushTool",
            name: "Spot Healing Brush tool",
            description: "Removes marks and blemishes.",
            keyboardShortcut: "J",
        },
        {
            _ref: "magicStampTool",
            name: "Healing Brush tool",
            description:
                "Repair imperfections by painting with pixels from another part of the image.",
            keyboardShortcut: "J",
        },
        {
            _ref: "patchSelection",
            name: "Patch tool",
            description:
                "Replace a selected area with pixels from another part of the image.",
            keyboardShortcut: "J",
        },
        {
            _ref: "recomposeSelection",
            name: "Content-Aware Move tool",
            description:
                "Selects and moves part of an image and automatically fills the area left behind.",
            keyboardShortcut: "J",
        },
        {
            _ref: "redEyeTool",
            name: "Red Eye tool",
            description: "Fixes the red-eye effect caused by a camera flash.",
            keyboardShortcut: "J",
        },
        {
            _ref: "paintbrushTool",
            name: "Brush tool",
            description: "Paints custom brush strokes.",
            keyboardShortcut: "B",
        },
        {
            _ref: "pencilTool",
            name: "Pencil tool",
            description: "Paints hard-edged brush strokes.",
            keyboardShortcut: "B",
        },
        {
            _ref: "colorReplacementBrushTool",
            name: "Color Replacement tool",
            description: "Paints the selected color over an existing color.",
            keyboardShortcut: "B",
        },
        {
            _ref: "wetBrushTool",
            name: "Mixer Brush tool",
            description:
                "Simulates real painting techniques, such as blending colors and varying paint wetness.",
            keyboardShortcut: "B",
        },
        {
            _ref: "cloneStampTool",
            name: "Clone Stamp tool",
            description: "Paints with pixels from another part of the image.",
            keyboardShortcut: "S",
        },
        {
            _ref: "patternStampTool",
            name: "Pattern Stamp tool",
            description: "Paints using a chosen pattern.",
            keyboardShortcut: "S",
        },
        {
            _ref: "historyBrushTool",
            name: "History Brush tool",
            description: "Restores parts of an image to an earlier state.",
            keyboardShortcut: "Y",
        },
        {
            _ref: "artBrushTool",
            name: "Art History Brush tool",
            description:
                "Paints stylized strokes with pixels from an earlier state of the image.",
            keyboardShortcut: "Y",
        },
        {
            _ref: "eraserTool",
            name: "Eraser tool",
            description:
                "Changes pixels to the background color or makes them transparent.",
            keyboardShortcut: "E",
        },
        {
            _ref: "backgroundEraserTool",
            name: "Background Eraser tool",
            description: "Erases the pixels of a sampled color.",
            keyboardShortcut: "E",
        },
        {
            _ref: "magicEraserTool",
            name: "Magic Eraser tool",
            description: "Erases similarly colored areas with a single click.",
            keyboardShortcut: "E",
        },
        {
            _ref: "gradientTool",
            name: "Gradient tool",
            description: "Creates a gradual blend between colors.",
            keyboardShortcut: "G",
        },
        {
            _ref: "bucketTool",
            name: "Paint Bucket tool",
            description: "Fill areas of similar color with the foreground color.",
            keyboardShortcut: "G",
        },
        {
            _ref: "blurTool",
            name: "Blur tool",
            description: "Blurs areas in an image.",
            keyboardShortcut: null,
        },
        {
            _ref: "sharpenTool",
            name: "Sharpen tool",
            description: "Sharpens the soft edges in an image.",
            keyboardShortcut: null,
        },
        {
            _ref: "smudgeTool",
            name: "Smudge tool",
            description: "Smear and blend colors together.",
            keyboardShortcut: null,
        },
        {
            _ref: "dodgeTool",
            name: "Dodge tool",
            description: "Lightens areas in an image.",
            keyboardShortcut: "O",
        },
        {
            _ref: "burnInTool",
            name: "Burn tool",
            description: "Selectively darken areas in an image",
            keyboardShortcut: "O",
        },
        {
            _ref: "saturationTool",
            name: "Sponge tool",
            description: "Changes the color saturation of areas in an image.",
            keyboardShortcut: "O",
        },
        {
            _ref: "penTool",
            name: "Pen tool",
            description:
                "Makes and changes paths or shapes with anchor points and handles.",
            keyboardShortcut: "P",
        },
        {
            _ref: "freeformPenTool",
            name: "Freeform Pen tool",
            description: "Adds anchor points as you draw paths or shapes.",
            keyboardShortcut: "P",
        },
        {
            _ref: "curvaturePenTool",
            name: "Curvature Pen Tool",
            description: "Makes or changes paths or shapes using points.",
            keyboardShortcut: "P",
        },
        {
            _ref: "addKnotTool",
            name: "Add Anchor Point tool",
            description: "Adds anchor points to your paths.",
            keyboardShortcut: null,
        },
        {
            _ref: "deleteKnotTool",
            name: "Delete Anchor Point tool",
            description: "Deletes anchor points and reshapes paths.",
            keyboardShortcut: null,
        },
        {
            _ref: "convertKnotTool",
            name: "Convert Point tool",
            description:
                "Edits shapes and paths by converting smooth and corner anchor points.",
            keyboardShortcut: null,
        },
        {
            _ref: "typeCreateOrEditTool",
            name: "Horizontal Type tool",
            description: "Adds horizontal type.",
            keyboardShortcut: "T",
        },
        {
            _ref: "typeVerticalCreateOrEditTool",
            name: "Vertical Type tool",
            description: "Adds vertical type.",
            keyboardShortcut: "T",
        },
        {
            _ref: "typeVerticalCreateMaskTool",
            name: "Vertical Type Mask tool",
            description: "Creates a selection in the shape of vertical type.",
            keyboardShortcut: "T",
        },
        {
            _ref: "typeCreateMaskTool",
            name: "Horizontal Type Mask tool",
            description: "Creates a selection in the shape of horizontal type.",
            keyboardShortcut: "T",
        },
        {
            _ref: "pathComponentSelectTool",
            name: "Path Selection tool",
            description: "Selects a whole path.",
            keyboardShortcut: "",
        },
        {
            _ref: "directSelectTool",
            name: "Direct Selection tool",
            description: "Select and adjust points and segments in a path or shape.",
            keyboardShortcut: "A",
        },
        {
            _ref: "rectangleTool",
            name: "Rectangle Tool",
            description: "Draws rectangles.",
            keyboardShortcut: "U",
        },
        {
            _ref: "ellipseTool",
            name: "Ellipse tool",
            description: "Draw oval and circular shapes.",
            keyboardShortcut: "U",
        },
        {
            _ref: "polygonTool",
            name: "Polygon tool",
            description: "Draws polygons.",
            keyboardShortcut: "U",
        },
        {
            _ref: "lineTool",
            name: "Line tool",
            description: "Draws lines.",
            keyboardShortcut: "U",
        },
        {
            _ref: "customShapeTool",
            name: "Custom Shape tool",
            description: "Draws shapes from a custom shape list.",
            keyboardShortcut: "U",
        },
        {
            _ref: "handTool",
            name: "Hand tool",
            description: "Pans over different parts of an image.",
            keyboardShortcut: "H",
        },
        {
            _ref: "rotateTool",
            name: "Rotate View tool",
            description: "Rotates the view of an image.",
            keyboardShortcut: "R",
        },
        {
            _ref: "zoomTool",
            name: "Zoom tool",
            description: "Zoom in and out on an image.",
            keyboardShortcut: "Z",
        },
        {
            _ref: "adjustmentBrushTool",
            name: "Adjustment Brush tool",
            description: "Create local adjustment layers.",
            keyboardShortcut: "B",
        },
        {
            _ref: "selectionBrushTool",
            name: "Selection Brush tool",
            description:
                "Make selections with single or multiple brush strokes, ideal for trackpad users, and for adding and removing content with generative fill..",
            keyboardShortcut: "L",
        },
        {
            _ref: "triangleTool",
            name: "Triangle tool",
            description: "Draw three-sided shapes.",
            keyboardShortcut: "U",
        },
        {
            _ref: "removeTool",
            name: "Remove tool",
            description:
                "Easily remove distractions such as objects, people, and imperfections.",
            keyboardShortcut: "J",
        },
    ];
    return tools.map((tool) => {
        return new ToolCommand(
            tool._ref,
            tool.name,
            tool.description,
            tool.keyboardShortcut
        );
    });
}

module.exports = {
    loadCommands,
};
