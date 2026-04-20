# Obsidian Delete Empty Lines

Delete or compress empty lines in your notes, for either the whole document or the current selection.

[中文文档](./README-zh.md)

## Features

- Full document processing
- Selection-only processing
- Configurable maximum consecutive empty lines
- Optional handling of whitespace-only lines
- Internationalized UI (`English` and `简体中文`)

## Commands

- Compress empty lines (Full document, keep {count})
- Compress empty lines (Selection, keep {count})

The `{count}` value follows your settings.

## Context Menu

- If text is selected: show selection command
- If no text is selected: show full document command


## Installation

### Manual

1. Download the latest release files.
2. Copy `main.js`, `manifest.json`, and the `locales/` folder to:
   `.obsidian/plugins/delete-empty-lines/`
3. Restart Obsidian and enable the plugin in Community Plugins.


## Internationalization

Translation files are in `locales/`:

- `locales/en.json`
- `locales/zh.json`

To add a new language:

1. Copy `locales/en.json` to a new file like `locales/ja.json`.
2. Translate all values.
3. Add that language option in the plugin settings UI.


## License

[MIT](./LICENSE)
