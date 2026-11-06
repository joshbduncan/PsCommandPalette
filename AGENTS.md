# AGENTS.md - Development Guidelines for Adobe Photoshop Command Palette Plugin

## Build/Test Commands

- `npm run build` - Delete `build/`, compile `src/` into it with `tsc`, and copy static files (index.html, the plain-JS `index.js` loader, css, manifest, tools.json, icons)
- `npm run watch` - Recompile/copy on every change (`scripts/watch.mjs`; doesn't clean `build/`)
- `npm run check` - Type-check only (`tsc --noEmit`)
- `npm run format` - Format `src/` and `scripts/` (also runs via the pre-commit hook)
- `./watch.sh` - Development mode: build, `uxp plugin load`, then watch plus `uxp plugin reload` on output changes (needs `uxp` and `nodemon` on PATH)
- Load/package `build/manifest.json` in UXP Developer Tool (UDT does not compile TypeScript itself)
- No test framework configured - plugin relies on manual testing in Photoshop

## Code Style Guidelines

- **Language**: TypeScript (strict), compiled by plain `tsc` to CommonJS - no framework, no bundler
- **Formatting**: Prettier config: 4 spaces, 88 char width, semicolons, double quotes
- **Imports**: ES `import`/`export` syntax (emitted as `require()`); import UXP/Photoshop modules as namespaces (`import * as uxp from "uxp"`), no default imports
- **Classes**: ES classes with private fields (`#field`); use the TS `private` keyword for private methods/accessors; JSDoc comments
- **Naming**: camelCase for variables/functions, PascalCase for classes, UPPER_CASE for constants
- **Error Handling**: Throw descriptive errors, use try/catch for async operations; route command failures through `handleCommandExecutionError`
- **Comments**: JSDoc for all public methods, inline comments for complex logic only
- **Files**: One class per file, descriptive filenames matching class names
- **Structure**: Organize by feature (commands/, dialogs/, palettes/, user/, utils/)
- **UXP APIs**: Use the `uxp` namespace for platform features; UXP type gaps are patched in `src/utils/uxpTypes.ts`
- **DOM**: Standard DOM APIs, build elements with `createElement()` from `src/utils/dom.ts`; show modals via `showModal()` (`src/dialogs/showModal.ts`)
- **Async**: Use async/await, return Promises from UXP entry points
- **Validation**: Always validate required parameters in constructors/methods
- **CSS**: UXP's CSS engine throws `CssSyntaxError` on comments inside a rule body - put comments above rules
