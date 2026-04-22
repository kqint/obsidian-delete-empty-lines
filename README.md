# Obsidian Delete Empty Lines

Delete or compress empty lines in your notes. Supports processing the entire document or only the selected content.

[中文文档](./README.zh-CN.md)

## Demo

![Demo](assets/demo.gif)

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

### Installation using BRAT (Recommended)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin from Community Plugins.
2. Open BRAT settings, click `Add Beta plugin` in `Beta plugin list`, add this repository in `Repository`:
   `kqint/obsidian-delete-empty-lines`, and install the latest version.
3. Enable the plugin in Community Plugins.
4. Updates will be automatically installed.

### Manual

1. Download `main.js` and `manifest.json` from [releases/latest](https://github.com/kqint/obsidian-delete-empty-lines/releases/latest).
2. Copy `main.js` and `manifest.json` to:
   `.obsidian/plugins/delete-empty-lines/`
3. Restart Obsidian and enable the plugin in Community Plugins.


## Internationalization

Translation source files are in `locales/`:

- `locales/en.json`
- `locales/zh-CN.json`

Build command bundles these locale files into `main.js`:

```bash
npm run build
```

To add a new language:

1. Copy `locales/en.json` to a new file like `locales/ja.json`.
2. Translate all values.
3. Add that language option in `src/main.ts` and run `npm run build`.


## License

[MIT](./LICENSE)
