# AGENTS.md - Development Guidelines for Adobe Photoshop Command Palette Plugin

## Build/Test Commands

- `prettier -w src` - Format all source files
- `uxp plugin load` - Load plugin into UXP
- `uxp plugin reload` - Hot reload plugin during development
- `./watch.sh` - Development mode with auto-reload on file changes
- No test framework configured - plugin relies on manual testing in Photoshop

## Code Style Guidelines

- **Language**: JavaScript (ES6+) with UXP runtime
- **Formatting**: Prettier config: 4 spaces, 88 char width, semicolons, double quotes
- **Imports**: CommonJS `require()` and `module.exports` - no ES6 imports
- **Classes**: Use ES6 classes with private fields (`#field`) and JSDoc comments
- **Naming**: camelCase for variables/functions, PascalCase for classes, UPPER_CASE for constants
- **Error Handling**: Throw descriptive errors, use try/catch for async operations
- **Comments**: JSDoc for all public methods, inline comments for complex logic only
- **Files**: One class per file, descriptive filenames matching class names
- **Structure**: Organize by feature (commands/, dialogs/, palettes/, utils/)
- **UXP APIs**: Use `uxp` namespace, `require("uxp")` for platform features
- **DOM**: Standard DOM APIs available, create elements with `document.createElement`
- **Async**: Use async/await, return Promises from UXP entry points
- **Validation**: Always validate required parameters in constructors/methods
