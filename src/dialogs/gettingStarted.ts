import { showModal } from "./showModal";

// Static, trusted markup (no user data), so it's set via innerHTML rather
// than built node-by-node.
const CONTENT_HTML = `
<sp-heading class="dialog-heading">Getting Started</sp-heading>
<sp-divider></sp-divider>

<div class="content">
    <p>
        Ps Command Palette puts every Photoshop menu command, tool, action, and
        bookmark right at your fingertips. Type a few letters, hit Enter, done. Your
        mouse can take a nap.
    </p>

    <h3>Opening the Palette</h3>
    <ul>
        <li>
            Click <strong>Launch Command Palette</strong> in the panel (the obvious way)
        </li>
        <li>
            Bind <strong>Launch Ps Command Palette</strong> to a system-wide hotkey with
            something like Keyboard Maestro, BetterTouchTool, or AutoHotkey, so you never
            have to go hunting for the panel again
        </li>
    </ul>

    <h3>Searching</h3>
    <ul>
        <li>Just start typing. Search is fuzzy, so close enough is good enough</li>
        <li>Stuff you use a lot floats to the top on its own</li>
        <li>
            Narrow things down with a hashtag, like <code>#tool blur</code> to only
            show tools. Full lineup:
            <code>#menu</code>
            <code>#tool</code>
            <code>#action</code>
            <code>#bookmark</code>
            <code>#plugin</code>
            <code>#picker</code>
            <code>#photoshop</code>
        </li>
    </ul>

    <h3>Navigating &amp; Running Commands</h3>
    <ul>
        <li>
            <kbd>&uarr;</kbd> / <kbd>&darr;</kbd> or <kbd>Tab</kbd> /
            <kbd>Shift+Tab</kbd> walks through the list
        </li>
        <li><kbd>Enter</kbd> or a click runs whatever's selected</li>
        <li><kbd>Esc</kbd> closes the whole thing</li>
        <li>
            Clear the search box and hit <kbd>&uarr;</kbd> to relive your recent command
            history
        </li>
    </ul>

    <h3>What You Can Search</h3>
    <ul>
        <li><strong>Menu Commands</strong>: all 800+ of them</li>
        <li><strong>Tools</strong>: 70+ ready to grab</li>
        <li><strong>Actions</strong>: whatever's sitting in your Action sets</li>
        <li>
            <strong>Bookmarks</strong>: your favorite files and folders, one
            keystroke away
        </li>
        <li><strong>Custom Pickers</strong>: your own mini palettes</li>
        <li>
            <strong>Plugin Commands</strong>: About, Help, Reload Plugin, the usual
            suspects
        </li>
    </ul>

    <h3>Known Issues</h3>
    <ul>
        <li>
            Some menu commands occasionally stop executing via the API after
            Photoshop's been sitting idle a while (they still work fine from the
            actual menu)
        </li>
        <li>
            Commands aren't greyed out based on whether Photoshop currently says
            they're available - that reporting isn't reliable enough to trust, so
            everything looks the same. If something really can't run, you'll see an
            error when you try it
        </li>
        <li>
            Acting up in general? Search for <strong>Reload Plugin</strong> and run it
            (or grab it from the panel's flyout menu). It's the "have you tried turning
            it off and on again" of this plugin, and it fixes most weirdness
        </li>
    </ul>
</div>

<footer>
    <sp-button-group class="dialog-buttons">
        <sp-button variant="cta" id="getting-started-close">Got it</sp-button>
    </sp-button-group>
</footer>
`;

/** Show the "Getting Started" help dialog. */
export async function showGettingStartedDialog(): Promise<void> {
    await showModal<void>(
        ({ dialog, close }) => {
            const container = document.createElement("div");
            container.className = "getting-started";
            container.innerHTML = CONTENT_HTML;
            dialog.appendChild(container);

            container
                .querySelector("#getting-started-close")
                ?.addEventListener("click", () => close());
        },
        {
            title: "Getting Started",
            resize: "vertical",
            size: { width: 500, height: 550 },
        }
    );
}
