# TODO

## Panel flyout: Settings submenu

Removed until they work. They used to sit under **Settings** in the panel's flyout menu and only showed "Not yet implemented". To bring one back, re-add it to `menuItems` and add its case to `invokeMenu()` in `src/main.ts`.

- [ ] **Custom Startup…**: choose which commands the palette shows when the search box is empty. Should edit `user.data.settings.startupCommands`, which already works when set by hand in `user.json` (empty means recent commands).
- [ ] **Fuzzy Query Matching** (checkable): turn fuzzy matching on or off. Needs a persisted setting, plus a non-fuzzy matching path in `utils/matchQuery.ts`/`utils/query.ts`.
- [ ] **Query Latching** (checkable): turn query latching on or off. Needs a persisted setting checked by the `LATCHED_QUERY_BOOST` scoring in `utils/query.ts`.

## Plugin commands

- [ ] **Create a Custom Picker Palette**: a picker builder, so users can create and edit pickers without hand-editing `user.json`. Removed from the palette until it exists. It was the `customPicker` entry in `src/commands/plugin/commands.ts`. Pickers themselves (`user.data.pickers`, `PickerCommand`) already work.
