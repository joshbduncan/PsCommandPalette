# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-06

### Added

- The palette opens instantly. Commands load in the background as soon as the plugin loads, and the menu command list is cached on disk, so menu commands are searchable straight away and refreshed each time the palette opens.
- Fuzzy-match highlighting in result titles.
- Filter by more than one command type at once (e.g. `#tool #action blur`), and a notice when a `#filter` isn't recognized.
- A confirmation before running destructive commands: Close Document Without Saving, Delete Selected Channel(s), Clear Selected Layer(s), Split Channels and Clear Plugin History.
- Loading and "no matching commands" messages in the results list.
- An alert when Photoshop's menu commands can't be loaded.

### Changed

- Rewritten in TypeScript. Requires Photoshop 24.2.0 or later.
- With an empty search box, the palette shows your recent commands (or your own `startupCommands`, if set).
- The most recently run command no longer outranks a much better text match.
- Up/Down in an empty search box now move both ways through your recent searches, skipping duplicates.
- A redesigned Getting Started dialog replaces the plugin introduction.
- User data and history are saved more safely (atomic writes with a backup), and older files are migrated automatically.

### Fixed

- Menu commands that Photoshop wrongly reports as unavailable (e.g. File > New right after the palette closes) are retried automatically.
- The palette no longer stays on screen, blank, while a long action runs.
- Clear Plugin History now actually clears the history file.
- Relinking an expired bookmark to the same file or folder works.

### Removed

- The placeholder Settings submenu (Custom Startup, Fuzzy Query Matching, Query Latching) and the placeholder Create a Custom Picker Palette command. They're tracked in `TODO.md`.

## [0.1.0] - 2025-10-07

### Added

- This changlog!

### Changed

- Updated tools to PS version 26.10.0
