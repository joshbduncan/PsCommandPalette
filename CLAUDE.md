# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A UXP (Unified Extensibility Platform) panel plugin for Adobe Photoshop. It shows a VS Code/Alfred-style "command palette" (launched via the panel's button, or an OS-level keyboard shortcut tool bound to the `launchPalette` command entrypoint - there is no in-panel Cmd/Ctrl+K shortcut) for fuzzy-searching and executing Photoshop menu commands, tools, actions, and user bookmarks without leaving the keyboard.

Written in plain TypeScript - no UI framework and no bundler. `tsc` compiles `src/` to CommonJS in `build/` (`tsconfig.json`), and `scripts/copy-static.mjs` copies the non-TS files (`index.html`, `index.js`, `style.css`, `manifest.json`, `tools.json`, `icons/`) alongside. `build/` is an ordinary UXP plugin folder: UXP Developer Tool loads and packages it as a CCX. `src/manifest.json` is hand-maintained (manifest v6, Photoshop ≥ 24.2.0). Panel flyout menus (`menuItems`/`invokeMenu`) register via the JS-side `entrypoints.setup()` call in `src/main.ts`, not in the manifest.

## Commands

- `npm install` — install dev dependencies (TypeScript, type packages, Prettier)
- `npm run build` — compile into `build/`
- `npm run watch` — recompile on change (`./watch.sh` also hot reloads via the `uxp` CLI)
- `npm run check` — type-check (`tsc --noEmit`); should report zero errors
- `npm run format` — format all source files (also runs via the pre-commit hook)

There is no test framework — verification is manual, inside Photoshop via UXP Developer Tool. To test a change, rebuild, reload `build/manifest.json` in UDT, open the palette, search, select a command, confirm it executes and, for anything touching persisted data, that `user.json`/`history.json`/`menu-commands-cache.json` (in the UXP plugin data folder) are written correctly.

## Architecture

### Entry point and state

`src/main.ts` is the plugin entry: `index.html` loads the tiny plain-JS `src/index.js`, which `require()`s the compiled `main.js` (a `<script>` tag runs as a classic script with no CommonJS `exports`, which tsc's output needs - so `main.js` can't be the `<script>` itself). It calls `entrypoints.setup()` (plugin lifecycle, the panel and its flyout menu, and the `launchPalette` command entrypoint), wires the panel's launch button, and owns `launchPalette()`.

Cross-module singletons are explicitly imported wherever needed (no implicit/bare globals): `src/user/User.ts` (`User` class + `user` instance, persisted `user.json`), `src/user/History.ts` (`History` class + `history` instance, persisted `history.json`), `src/user/host.ts` (plugin/host identity, computed once at module load from `manifest.json` and `uxp.host`), `src/utils/CommandsStore.ts` (the live command list — see Performance below). `User`/`History` expose an `onInvalidate` callback field (set by `main.ts`) instead of a `globalThis` callback.

Feature code imports UXP/Photoshop modules directly as namespaces (`import * as uxp from "uxp"`, `import * as photoshop from "photoshop"`), which `tsc` emits as plain `require()` calls.

### Command model

`src/commands/Command.ts` is the base class every palette entry extends: `id`, `name`, `type` (see `CommandTypes` in `commands/types.ts`), `description`, `enabled`, `queryParts`/`queryString` (what fuzzy search matches against, defaults to `name`), `destructive`, `execute()`. **No DOM/rendering code lives here** — rendering is owned entirely by `src/palettes/renderCommandItem.ts`; a `Command` is pure data + behavior. All id prefixes live in `ID_PREFIXES` (`commands/types.ts`).

Concrete command types, one file each in `src/commands/`:

- `MenuCommand` — wraps a Photoshop menu item; `execute()` calls `core.performMenuCommand`. Constructed from a plain, JSON-serializable `MenuCommandData` shape (also what gets disk-cached — see Performance).
- `ToolCommand` — wraps a Photoshop tool; `execute()` selects it via `batchPlay`. Static data source is `src/tools.json`.
- `ActionCommand` — wraps a Photoshop Action (from `app.actionTree`); `execute()` plays it via `core.executeAsModal`.
- `APICommand` / `PluginCommand` — thin wrappers around entries in a plain command registry object (`{ key: { name, description, callback, destructive? } }`); `utils/load.ts` turns each registry entry into a command instance. API command registries live in `src/commands/api/*.ts`, merged in `api/commands.ts` via `commands/registry.ts`'s `mergeRegistries` (throws on duplicate keys); plugin-level commands (about, reload, clear history, load bookmarks, etc.) live in `src/commands/plugin/commands.ts`. Add new Photoshop API actions by adding an entry to one of the `commands/api/*.ts` files, not by hand-rolling a new `Command` subclass.
- `FileBookmarkCommand` / `FolderBookmarkCommand` (`commands/BookmarkCommand.ts`) — user bookmarks persisted in `user.data.bookmarks`; opens a file in Photoshop or a folder in the OS file browser.
- `PickerCommand` — a user-defined sub-palette (`user.data.pickers`); `execute()` calls `openPalette()` recursively (same helper the top-level launch uses).
- `CustomCommand` — generic wrapper around an arbitrary id/name/description/callback, used for one-off/dynamic commands (e.g. picker results).

Commands marked `destructive` go through `dialogs/confirmDestructiveCommand.ts` before `execute()`; execution failures go through `utils/commandExecutionError.ts`.

### Loading and querying

`src/utils/load.ts`'s `startLoadingCommands()` kicks off every command type's loader **without awaiting any of them** — each type calls `commandsStore.upsertType(type, commands)` independently as soon as it resolves (see Performance below). A module-level generation counter drops results from a superseded load (e.g. "Reload Plugin" firing mid-load). `refreshCommandType(type)` reloads one type (e.g. after adding a bookmark).

`src/utils/query.ts`'s `filterCommandsByQuery` does fuzzy subsequence matching (`utils/matchQuery.ts`) against `command.queryParts`, then scores each match once and sorts using `SCORING` weights that reward prefix matches, exact word/name matches, "query latching" (a normalized query that previously resolved to a specific command, `history.latches`), recency (`history.recencyLUT`), and log-scaled frequency (`history.occurrencesLUT`). A query can be scoped to one or more command types with `#type` hashtags (e.g. `#tool blur`); `palettes/CommandPalette.ts` parses them out once for both filtering and highlighting, and reports unknown hashtags in the info line.

### Palette UI

`src/palettes/CommandPalette.ts` builds the search box, results list and info line into a modal dialog with plain DOM (`createElement()` from `src/utils/dom.ts`), and re-renders the list (capped at `MAX_RESULTS`) whenever the debounced query or the store changes. `src/palettes/renderCommandItem.ts` builds one row, including fuzzy-match highlighting (`utils/highlight.ts`). Rows use direct `click` listeners plus `mousedown` preventDefault so focus stays in the query box.

`src/dialogs/showModal.ts` is the shared helper for every UXP `uxpShowModal()` dialog: the caller's builder function fills in the `<dialog>` and may return a cleanup function, which runs after close. It normalizes UXP's native-dismiss resolution value (the string `"reasonCanceled"`) to `undefined` for every caller, once. The confirm, Getting Started and Resize by Percentage dialogs in `src/dialogs/` all use it.

`openPalette(startupCommands, commands?, startupCommandIDs?)` (`src/palettes/openPalette.ts`) is the single entry point for showing the palette. Passing `commands` explicitly (as `PickerCommand` does) searches only that static list; omitting it (the top-level launch) makes the palette `subscribe()` to the live `commandsStore`, and `startupCommandIDs` lets it re-resolve the empty-query list against the store on every update.

### Performance: prefetch + incremental + disk cache

The palette isn't slow because of JS — it's the single atomic `batchPlay` IPC round-trip that fetches Photoshop's entire ~800-item menu tree (`menuBarInfo`) in `load.ts`'s `fetchLiveMenuCommandData()`. The fix is architectural, all in `src/utils/load.ts`, `src/utils/menuCommandCache.ts` and `src/utils/CommandsStore.ts`:

1. **Prefetch at plugin load**, not at palette-open. `startLoadingCommands()` is called from `main.ts`'s `plugin.create()`. By the time the user actually launches the palette, it's typically already resolved or well underway.
2. **Per-type incremental updates.** Each loader independently calls `commandsStore.upsertType()` as soon as it resolves — fast/synchronous types (tools, actions, API, plugin, bookmarks) show up well before the slow one — and the store notifies its subscribers (the open palette) on every change.
3. **Menu-command disk cache, stale-while-revalidate** (`menuCommandCache.ts` + `load.ts`'s `loadMenuCommandsWithCache`). On load, hydrate the store instantly from `menu-commands-cache.json` if present and host-version-matched, then fetch live in the background and overwrite both the store and the cache file once it resolves. Concurrent calls share one in-flight fetch. First-ever run (no cache) degrades gracefully to a live-only fetch.
4. **Open instantly.** `launchPalette()` opens the dialog against whatever the store already has and kicks off a background `refreshCommandType(MENU)` so menu enabled/checked state catches up while the palette is open.

### Persistence

`User` and `History` persist JSON to the UXP plugin data folder (`storage.localFileSystem.getDataFolder()`), sharing an atomic-write helper (`src/utils/atomicWriteJSON.ts`): write to `.tmp`, rename any existing file to `.bak` (best-effort), atomically rename `.tmp` into place, restore `.bak` if that fails, and `recoverFromInterruptedWrite()` on the next load. Both serialize writes through a write chain. Follow this same pattern (reuse `atomicWriteJSON`) for any new persisted data — `menuCommandCache.ts` already does.

Both files carry a schema version and run migrations on load (`utils/schemaMigration.ts`). `validateData()` repairs missing/malformed fields and nested records against known-good defaults; `load()`/`reload()` handle missing files (first run), JSON corruption, and other read errors by backing up the bad file and falling back to defaults.

### UXP ambient type gaps

`@adobe/cc-ext-uxp-types` (types only, the source of the `uxp`/`os` module types) has real gaps: `storage.File` isn't modeled as extending `storage.Entry` even though it is one at runtime, and `uxpShowModal` isn't declared at all. `src/utils/uxpTypes.ts` documents and works around both (`FSFile`/`FSFolder` intersection types, a global `HTMLDialogElement.uxpShowModal` augmentation) — reach for those instead of scattering `as any` when a UXP API call doesn't type-check as expected.

## Code style

- Strict TypeScript, ES `import` syntax compiled by `tsc` to CommonJS. No framework, no bundler.
- Prettier-enforced: 4-space indent, 88 char width, semicolons, double quotes (see `.prettierrc`).
- Private fields use `#field`; private methods/accessors use the TS `private` keyword.
- One class per file, filename matches.
- Organize by feature: `commands/` (Command classes + registries), `dialogs/` (modal dialogs), `palettes/` (palette UI), `user/` (persisted user data + host info), `utils/` (pure logic and shared helpers).
- UXP's CSS engine throws `CssSyntaxError` on a comment inside a rule body — put CSS comments above the rule.
