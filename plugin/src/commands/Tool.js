const { Command, CommandTypes } = require("./Command.js");

/**
 * Create a command palette tool command.
 */
class Tool extends Command {
    /**
     * Create a command palette tool command.
     * @param {string} ref Tool batchPlay reference string
     * @param {string} name Tool name
     * @param {string} note Note displayed below tool
     * @param {string} keyboardShortcut Tool keyboard shortcut
     */
    constructor(ref, name, note, keyboardShortcut) {
        if (!ref || !name) {
            throw new Error("Tool requires a valid reference and name.");
        }

        // TODO: check to see if tool availability can be determined from the api
        // TODO: implement tool shortcut key
        const id = "ps_tool_" + ref;
        super(id, name, CommandTypes.TOOL, note);

        this.ref = ref;
        this.keyboardShortcut = keyboardShortcut;
    }

    /**
     * Execute the tool command.
     */
    async execute() {
        try {
            const target = { _ref: [{ _ref: this.ref }] };
            const command = { _obj: "select", _target: target };

            const result = await app.batchPlay([command], {});

            if (!result || result.length === 0) {
                throw new Error(`Tool activation failed for: ${this.name}`);
            }
        } catch (error) {
            console.error(`Error activating tool "${this.name}":`, error);
        }
    }
}

const tools = [
    {
        _ref: "moveTool",
        name: "Move tool",
        note: "Moves a selection or layer.",
        keyboardShortcut: "V",
    },
    {
        _ref: "artboardTool",
        name: "Artboard tool",
        note: "Creates, moves, or resizes multiple canvases.",
        keyboardShortcut: "V",
    },
    {
        _ref: "marqueeRectTool",
        name: "Rectangular Marquee tool",
        note: "Makes a selection in the shape of a rectangle.",
        keyboardShortcut: "M",
    },
    {
        _ref: "marqueeEllipTool",
        name: "Elliptical Marquee tool",
        note: "Make oval and circular selections.",
        keyboardShortcut: "M",
    },
    {
        _ref: "marqueeSingleRowTool",
        name: "Single Row Marquee tool",
        note: "Makes a horizontal selection that's a single pixel high.",
        keyboardShortcut: null,
    },
    {
        _ref: "marqueeSingleColumnTool",
        name: "Single Column Marquee tool",
        note: "Makes a vertical selection that's a single pixel wide.",
        keyboardShortcut: null,
    },
    {
        _ref: "lassoTool",
        name: "Lasso tool",
        note: "Makes freehand selections.",
        keyboardShortcut: "L",
    },
    {
        _ref: "polySelTool",
        name: "Polygonal Lasso tool",
        note: "Make selections by connecting straight lines.",
        keyboardShortcut: "L",
    },
    {
        _ref: "magneticLassoTool",
        name: "Magnetic Lasso tool",
        note: "Make selections that snap to edges in an image as you drag.",
        keyboardShortcut: "L",
    },
    {
        _ref: "quickSelectTool",
        name: "Quick Selection tool",
        note: "Makes a selection by finding and following the edges in an image.",
        keyboardShortcut: "W",
    },
    {
        _ref: "magicWandTool",
        name: "Magic Wand tool",
        note: "Select an area based on its color.",
        keyboardShortcut: "W",
    },
    {
        _ref: "cropTool",
        name: "Crop tool",
        note: "Trims or expands the edges of an image.",
        keyboardShortcut: "C",
    },
    {
        _ref: "perspectiveCropTool",
        name: "Perspective Crop tool",
        note: "Crops an image to correct distortions caused by perspective.",
        keyboardShortcut: "C",
    },
    {
        _ref: "sliceTool",
        name: "Slice tool",
        note: "Cuts an image into smaller sections suitable for web design.",
        keyboardShortcut: "C",
    },
    {
        _ref: "sliceSelectTool",
        name: "Slice Select tool",
        note: "Selects, moves, and resizes slices of an image.",
        keyboardShortcut: "C",
    },
    {
        _ref: "framedGroupTool",
        name: "Frame Tool",
        note: "Creates placeholder frames for images.",
        keyboardShortcut: "K",
    },
    {
        _ref: "eyedropperTool",
        name: "Eyedropper tool",
        note: "Samples colors from an image.",
        keyboardShortcut: "I",
    },
    {
        _ref: "colorSamplerTool",
        name: "Color Sampler tool",
        note: "Displays values for colors in an image.",
        keyboardShortcut: "I",
    },
    {
        _ref: "rulerTool",
        name: "Ruler tool",
        note: "Measures distances and angles in an image.",
        keyboardShortcut: "I",
    },
    {
        _ref: "textAnnotTool",
        name: "Note tool",
        note: "Creates text notes that you can attach to an image or file.",
        keyboardShortcut: "I",
    },
    {
        _ref: "countTool",
        name: "Count tool",
        note: "Counts the number of objects in an image.",
        keyboardShortcut: "I",
    },
    {
        _ref: "spotHealingBrushTool",
        name: "Spot Healing Brush tool",
        note: "Removes marks and blemishes.",
        keyboardShortcut: "J",
    },
    {
        _ref: "magicStampTool",
        name: "Healing Brush tool",
        note: "Repair imperfections by painting with pixels from another part of the image.",
        keyboardShortcut: "J",
    },
    {
        _ref: "patchSelection",
        name: "Patch tool",
        note: "Replace a selected area with pixels from another part of the image.",
        keyboardShortcut: "J",
    },
    {
        _ref: "recomposeSelection",
        name: "Content-Aware Move tool",
        note: "Selects and moves part of an image and automatically fills the area left behind.",
        keyboardShortcut: "J",
    },
    {
        _ref: "redEyeTool",
        name: "Red Eye tool",
        note: "Fixes the red-eye effect caused by a camera flash.",
        keyboardShortcut: "J",
    },
    {
        _ref: "paintbrushTool",
        name: "Brush tool",
        note: "Paints custom brush strokes.",
        keyboardShortcut: "B",
    },
    {
        _ref: "pencilTool",
        name: "Pencil tool",
        note: "Paints hard-edged brush strokes.",
        keyboardShortcut: "B",
    },
    {
        _ref: "colorReplacementBrushTool",
        name: "Color Replacement tool",
        note: "Paints the selected color over an existing color.",
        keyboardShortcut: "B",
    },
    {
        _ref: "wetBrushTool",
        name: "Mixer Brush tool",
        note: "Simulates real painting techniques, such as blending colors and varying paint wetness.",
        keyboardShortcut: "B",
    },
    {
        _ref: "cloneStampTool",
        name: "Clone Stamp tool",
        note: "Paints with pixels from another part of the image.",
        keyboardShortcut: "S",
    },
    {
        _ref: "patternStampTool",
        name: "Pattern Stamp tool",
        note: "Paints using a chosen pattern.",
        keyboardShortcut: "S",
    },
    {
        _ref: "historyBrushTool",
        name: "History Brush tool",
        note: "Restores parts of an image to an earlier state.",
        keyboardShortcut: "Y",
    },
    {
        _ref: "artBrushTool",
        name: "Art History Brush tool",
        note: "Paints stylized strokes with pixels from an earlier state of the image.",
        keyboardShortcut: "Y",
    },
    {
        _ref: "eraserTool",
        name: "Eraser tool",
        note: "Changes pixels to the background color or makes them transparent.",
        keyboardShortcut: "E",
    },
    {
        _ref: "backgroundEraserTool",
        name: "Background Eraser tool",
        note: "Erases the pixels of a sampled color.",
        keyboardShortcut: "E",
    },
    {
        _ref: "magicEraserTool",
        name: "Magic Eraser tool",
        note: "Erases similarly colored areas with a single click.",
        keyboardShortcut: "E",
    },
    {
        _ref: "gradientTool",
        name: "Gradient tool",
        note: "Creates a gradual blend between colors.",
        keyboardShortcut: "G",
    },
    {
        _ref: "bucketTool",
        name: "Paint Bucket tool",
        note: "Fill areas of similar color with the foreground color.",
        keyboardShortcut: "G",
    },
    {
        _ref: "blurTool",
        name: "Blur tool",
        note: "Blurs areas in an image.",
        keyboardShortcut: null,
    },
    {
        _ref: "sharpenTool",
        name: "Sharpen tool",
        note: "Sharpens the soft edges in an image.",
        keyboardShortcut: null,
    },
    {
        _ref: "smudgeTool",
        name: "Smudge tool",
        note: "Smear and blend colors together.",
        keyboardShortcut: null,
    },
    {
        _ref: "dodgeTool",
        name: "Dodge tool",
        note: "Lightens areas in an image.",
        keyboardShortcut: "O",
    },
    {
        _ref: "burnInTool",
        name: "Burn tool",
        note: "Selectively darken areas in an image",
        keyboardShortcut: "O",
    },
    {
        _ref: "saturationTool",
        name: "Sponge tool",
        note: "Changes the color saturation of areas in an image.",
        keyboardShortcut: "O",
    },
    {
        _ref: "penTool",
        name: "Pen tool",
        note: "Makes and changes paths or shapes with anchor points and handles.",
        keyboardShortcut: "P",
    },
    {
        _ref: "freeformPenTool",
        name: "Freeform Pen tool",
        note: "Adds anchor points as you draw paths or shapes.",
        keyboardShortcut: "P",
    },
    {
        _ref: "curvaturePenTool",
        name: "Curvature Pen Tool",
        note: "Makes or changes paths or shapes using points.",
        keyboardShortcut: "P",
    },
    {
        _ref: "addKnotTool",
        name: "Add Anchor Point tool",
        note: "Adds anchor points to your paths.",
        keyboardShortcut: null,
    },
    {
        _ref: "deleteKnotTool",
        name: "Delete Anchor Point tool",
        note: "Deletes anchor points and reshapes paths.",
        keyboardShortcut: null,
    },
    {
        _ref: "convertKnotTool",
        name: "Convert Point tool",
        note: "Edits shapes and paths by converting smooth and corner anchor points.",
        keyboardShortcut: null,
    },
    {
        _ref: "typeCreateOrEditTool",
        name: "Horizontal Type tool",
        note: "Adds horizontal type.",
        keyboardShortcut: "T",
    },
    {
        _ref: "typeVerticalCreateOrEditTool",
        name: "Vertical Type tool",
        note: "Adds vertical type.",
        keyboardShortcut: "T",
    },
    {
        _ref: "typeVerticalCreateMaskTool",
        name: "Vertical Type Mask tool",
        note: "Creates a selection in the shape of vertical type.",
        keyboardShortcut: "T",
    },
    {
        _ref: "typeCreateMaskTool",
        name: "Horizontal Type Mask tool",
        note: "Creates a selection in the shape of horizontal type.",
        keyboardShortcut: "T",
    },
    {
        _ref: "pathComponentSelectTool",
        name: "Path Selection tool",
        note: "Selects a whole path.",
        keyboardShortcut: "",
    },
    {
        _ref: "directSelectTool",
        name: "Direct Selection tool",
        note: "Select and adjust points and segments in a path or shape.",
        keyboardShortcut: "A",
    },
    {
        _ref: "rectangleTool",
        name: "Rectangle Tool",
        note: "Draws rectangles.",
        keyboardShortcut: "U",
    },
    {
        _ref: "ellipseTool",
        name: "Ellipse tool",
        note: "Draw oval and circular shapes.",
        keyboardShortcut: "U",
    },
    {
        _ref: "polygonTool",
        name: "Polygon tool",
        note: "Draws polygons.",
        keyboardShortcut: "U",
    },
    {
        _ref: "lineTool",
        name: "Line tool",
        note: "Draws lines.",
        keyboardShortcut: "U",
    },
    {
        _ref: "customShapeTool",
        name: "Custom Shape tool",
        note: "Draws shapes from a custom shape list.",
        keyboardShortcut: "U",
    },
    {
        _ref: "handTool",
        name: "Hand tool",
        note: "Pans over different parts of an image.",
        keyboardShortcut: "H",
    },
    {
        _ref: "rotateTool",
        name: "Rotate View tool",
        note: "Rotates the view of an image.",
        keyboardShortcut: "R",
    },
    {
        _ref: "zoomTool",
        name: "Zoom tool",
        note: "Zoom in and out on an image.",
        keyboardShortcut: "Z",
    },
    {
        _ref: "adjustmentBrushTool",
        name: "Adjustment Brush tool",
        note: "Create local adjustment layers.",
        keyboardShortcut: "B",
    },
    {
        _ref: "selectionBrushTool",
        name: "Selection Brush tool",
        note: "Make selections with single or multiple brush strokes, ideal for trackpad users, and for adding and removing content with generative fill..",
        keyboardShortcut: "L",
    },
    {
        _ref: "triangleTool",
        name: "Triangle tool",
        note: "Draw three-sided shapes.",
        keyboardShortcut: "U",
    },
    {
        _ref: "removeTool",
        name: "Remove tool",
        note: "Easily remove distractions such as objects, people, and imperfections.",
        keyboardShortcut: "J",
    },
];

/**
 * Load tool commands.
 * @returns {Promise.<Array.<Tool>>}
 */
function loadTools() {
    try {
        const toolCommands = tools.map((obj) => {
            const tool = new Tool(obj._ref, obj.name, obj.note, obj.keyboardShortcut);
            tool.createElement();
            return tool;
        });
        console.log(`Loaded ${toolCommands.length} tool commands.`);
        return toolCommands;
    } catch (error) {
        console.error("Error loading tools:", error);
        return [];
    }
}

module.exports = {
    Tool,
    loadTools,
};
