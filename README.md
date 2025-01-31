# Ps Command Palette

Boost your Adobe Photoshop efficiency with quick access to most **Menu Commands**, **Tools**, and **more**.

![ps-command-palette-2025-01-31](https://github.com/user-attachments/assets/1db12a54-4727-40a4-83c0-6f843710fd00)

> [!WARNING]
> This project is experimental and under active development. It will be losely based off of my other project [Ai Command Palette](https://github.com/joshbduncan/AiCommandPalette).

## Known Issues

- After an unknown amount of Ps inactivity menu commands that are considered "available" can't be executed via the api even thought they can still be executed in the ui.

## To-dos

- [ ] load other command types (tools, actions, custom, etc.)
    - [ ] add getters for other command types
- [x] save query history
- [ ] implement fuzzy filter for querybox (with history scoring)
- [ ] capture keyboard shortcut combinations in modal (not looking good)
- [ ] figure out workflows
- [ ] update plugin icons
- [ ] add icon to alert modal
- [ ] add dialog with <sp-code> to display user data json file, maybe with save button (view user data) [docs](https://spectrum.adobe.com/page/code/)
- [ ] enable menu recording for action/key combo [docs](https://developer.adobe.com/photoshop/uxp/2022/guides/uxp_guide/uxp-misc/manifest-v4/photoshop-manifest/#enablemenurecording)

## Project Links

* [Documentation-UXP for Adobe Photoshop](https://developer.adobe.com/photoshop/uxp/2022/)
* [Photoshop API—UXP for Adobe Photoshop](https://developer.adobe.com/photoshop/uxp/2022/ps\_reference/)
* [https://developer.adobe.com/photoshop/uxp/2022/uxp-api/](https://developer.adobe.com/photoshop/uxp/2022/uxp-api/)
* [Adobe Creative Cloud Developer Forums](https://forums.creativeclouddeveloper.com/)
* [Menu: Spectrum Web Components](https://opensource.adobe.com/spectrum-web-components/components/menu/)
* [Icons - Spectrum](https://spectrum.adobe.com/page/icons/)
* [Bolt CEP | Build Extensions Faster — Blog | Hyper Brew](https://hyperbrew.co/blog/bolt-cep-build-extensions-faster/)
* [hyperbrew/bolt-cep: A lightning-fast boilerplate for building Adobe CEP Extensions in React, Vue, or Svelte built on Vite + TypeScript + Sass](https://github.com/hyperbrew/bolt-cep)
