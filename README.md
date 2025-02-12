# Ps Command Palette

Boost your Adobe Photoshop efficiency with quick access to most **Menu Commands**, **Tools**, **Actions**, and **more**.

> [!NOTE]  
> Currently only works with MENU commands, some TOOLS, and ACTIONS.

![ps-command-palette-2025-01-31](https://github.com/user-attachments/assets/1db12a54-4727-40a4-83c0-6f843710fd00)

## Installation

> [!WARNING] This project is experimental and under active development.

You can install easily the plugin via the included CCX file [ps.command.palette_PS.ccx](dist/ps-command-palette_PS.ccx) and the Creative Cloud App ([docs](https://developer.adobe.com/photoshop/uxp/2022/guides/distribution/distribution-options/#direct-distribution-with-ccx-files)).

You can also install the plugin via [UXP Developer Tools](https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/installation/) by [adding an existing plugin](https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/plugin-management/#adding-an-existing-plugin). This allows you the ability to poke around the code and access the debug console.

## Future Plans...

Below are some of the things I hope to implement. A lot of these are features of the [Command Palette for Adobe Illustrator](<(https://github.com/joshbduncan/AiCommandPalette)>).

- [ ] caching to speed up launch (right now all menu commands are reloaded every launch)
- [ ] access other command types
    - [x] tools
        - [ ] localize tool names
    - [x] actions
    - [ ] scripts - ℹ️ already works with scripts loaded into Ps (e.g. File > Scripts > script.jsx)
    - [ ] custom workflows
    - [ ] bookmarked files and folders
    - [ ] custom pickers
- [x] improved results
    - [x] fuzzy filtering
    - [x] query latching
    - [x] recency bias
- [ ] plugin menu command recording for action/key combo [docs](https://developer.adobe.com/photoshop/uxp/2022/guides/uxp_guide/uxp-misc/manifest-v4/photoshop-manifest/#enablemenurecording)

## Info

General notes, issues, and things I don't want to forget.

### Known Issues

- After an unknown amount of Ps inactivity menu commands that are considered "available" can't be executed via the api even thought they can still be executed in the ui.

### Project Links

- [Documentation-UXP for Adobe Photoshop](https://developer.adobe.com/photoshop/uxp/2022/)
- [Photoshop API—UXP for Adobe Photoshop](https://developer.adobe.com/photoshop/uxp/2022/ps_reference/)
- [UXP API Reference](https://developer.adobe.com/photoshop/uxp/2022/uxp-api/)
- [Adobe Creative Cloud Developer Forums](https://forums.creativeclouddeveloper.com/)
- [Menu: Spectrum Web Components](https://opensource.adobe.com/spectrum-web-components/components/menu/)
- [Icons - Spectrum](https://spectrum.adobe.com/page/icons/)
- [Bolt CEP | Build Extensions Faster — Blog | Hyper Brew](https://hyperbrew.co/blog/bolt-cep-build-extensions-faster/)
- [Bolt UXP](https://github.com/hyperbrew/bolt-uxp)
