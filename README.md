# Ps Command Palette

Supercharge your Photoshop workflow with **Ps Command Palette** — quickly access **Menu Commands**, **Tools**, **Actions**, **Scripts**, and more, all from your keyboard.

![ps-command-palette-2025-01-31](https://github.com/user-attachments/assets/1db12a54-4727-40a4-83c0-6f843710fd00)

## Why?

If you've used Alfred or VS Code, you know how powerful a "command palette" can be. Photoshop has tons of keyboard shortcuts, but you can only remember so many. Ps Command Palette makes finding and executing commands effortless with just a few keystrokes.

## Installation

> [!CAUTION]
> This project is experimental and under active development.

### Install via CCX File (Easiest Method)

Download and install the plugin via the included CCX file:  
[ps.command.palette.plugin_PS.ccx](dist/ps.command.palette.plugin_PS.ccx)  
Follow the [Adobe CCX installation guide](https://developer.adobe.com/photoshop/uxp/2022/guides/distribution/distribution-options/#direct-distribution-with-ccx-files).

### Install via UXP Developer Tools (For Developers)

1. Install [UXP Developer Tools](https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/installation/).
2. [Add an existing plugin](https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/plugin-management/#adding-an-existing-plugin).
3. Access the code and debug console.

And, for quick access to Ps Command Palette from your keyboard, I recommend firing the palette via <kbd>Command + Shift + P</kbd> using something like [Keyboard Maestro](https://www.keyboardmaestro.com/main/) (Mac), [BetterTouchTool](https://folivora.ai/) (Mac), or [AutoHotkey](https://www.autohotkey.com/) (Windows).

> [!IMPORTANT]
> Having trouble with installation? Read [Installing a UXP panel (from a CCX file)](https://gregbenzphotography.com/installing-a-uxp-panel-from-ccx) from Greg Benz for some useful tips.

## Features

### 🚀 Menu Commands

Instantly execute over **800 Photoshop menu commands** without touching your mouse.

### 🛠 Tools

Activate over **70 Photoshop tools** directly from your keyboard.

### 🎬 Actions

Find and run any **Photoshop action** in seconds. No more digging through palettes and action sets.

### 📜 Scripts

External script execution via the the Photoshop UXP API is inconsistent at best so this feature has been removed. I suggest loading your scripts into the Photoshop default scripts ([docs](https://helpx.adobe.com/in/photoshop/using/scripting.html#run_a_javascript)) and accessing them via [Menu Commands](#menu-commands).

### 📁 Bookmarks

Save frequently used **files and folders** for instant access.

- *File* bookmarks open directly in Photoshop.
- *Folder* bookmarks open in your file system.

### Custom Pickers

In progress...

### 🔄 Workflows (Coming Soon)

Create automated **multi-step workflows** using Menu Commands, Tools, Actions, Scripts, or even other Workflows.

- Combine multiple scripts into a single action
- Automate repetitive tasks
- Quickly prototype execution steps for new scripts

### 📜 Command History

Use <kbd>Up Arrow</kbd> to cycle through recently executed commands.

> [!NOTE]  
> All executed commands are logged in a JSON file and influence the [search algorithm](#search-algorithm).

### 🔍 Search Algorithm

Search results are ranked using:
- **Fuzzy String Matching** – Finds approximate matches for faster searching.
- **Recency Bias** – Frequently used commands appear higher in results.
- **Query Latching** – Common queries "learn" your preferences, prioritizing commands you use most often.

This system is inspired by the [Alfred](https://www.alfredapp.com) app.

## Future Plans...

Many planned features mirror those in [AiCommandPalette](https://github.com/joshbduncan/AiCommandPalette):

- [ ] caching to speed up launch (right now all menu commands are reloaded every launch, requires undoing any query highlighting)
- [ ] localization
    - [ ] tools
    - [ ] dialogs
    - [ ] panels
    - [ ] palettes
    - [ ] command types
- [ ] command types
    - [x] actions
    - [x] bookmarks (files and folders)
    - [x] custom pickers
        - [ ] create custom picker builder dialog
    - [x] menu commands
    - [x] ~~ scripts (not perfect but works) ~~ suggest executing from File > Scripts menu ([docs](https://helpx.adobe.com/in/photoshop/using/scripting.html#run_a_javascript))
    - [x] tools
    - [ ] workflows
- [x] query history navigation
- [x] improved results
    - [x] fuzzy matching
    - [x] recency bias
    - [x] query latching
- [ ] plugin menu command recording for action/key combo [docs](https://developer.adobe.com/photoshop/uxp/2022/guides/uxp_guide/uxp-misc/manifest-v4/photoshop-manifest/#enablemenurecording)

### Known Issues

- Some menu commands stop executing via API after prolonged Photoshop inactivity (but still work manually).

🐞 If you find a bug please [file an issue](https://github.com/joshbduncan/PsCommandPalette/issues).

### Project Links

- [Documentation-UXP for Adobe Photoshop](https://developer.adobe.com/photoshop/uxp/2022/)
- [Photoshop API—UXP for Adobe Photoshop](https://developer.adobe.com/photoshop/uxp/2022/ps_reference/)
- [UXP API Reference](https://developer.adobe.com/photoshop/uxp/2022/uxp-api/)
- [Adobe Creative Cloud Developer Forums](https://forums.creativeclouddeveloper.com/)
- [Menu: Spectrum Web Components](https://opensource.adobe.com/spectrum-web-components/components/menu/)
- [Icons - Spectrum](https://spectrum.adobe.com/page/icons/)
- [Bolt CEP | Build Extensions Faster — Blog | Hyper Brew](https://hyperbrew.co/blog/bolt-cep-build-extensions-faster/)
- [Bolt UXP](https://github.com/hyperbrew/bolt-uxp)
