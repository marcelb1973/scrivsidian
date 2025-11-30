# Scrivsidian: Obsidian Scrivener import plugin

This is a plugin for [Obsidian](https://obsidian.md "Obsidian - Sharpen your thinking"), to import
[Scrivener](https://www.literatureandlatte.com/scrivener/overview "#1 Novel & Book Writing Software For Writers") projects.

## Features

* Importing (part of) a Scrivener project (`*.scrivx` file)
* Automatically adds numeric prefixes to maintain sort order (when sorting by note name)

## Scrivener features support

### Styles

The Scrivener import currently only supports basic RTF styling (bold, italic, and strikeout).

### Folder binders with text content

Folder binders with text content, will be imported as `0.md` inside the corresponding Obsidian folder.

### Meta data (keyword, status, etc.)

Meta data is currently not processed. Support will be added in a future version.

### Images and other external files

Images and other external files are currently not processed. This may be implemented in a future version.

# Installation

Copy the `main.js`, `manifest.json`, and `styles.css` files from a release into a `scrivsidian/` folder in the
`.obsidian/plugins` folder of your vault.

# Getting started

1. Find or create a folder in your vault, right click it, and select `Import from Scrivener`; this will show the import dialog

2. In the dialog, select the Scrivener project file; the project structure is read and shown

3. Optionally select the sub-tree to import, or leave the default set to the project root

4. Click `Import`; the selected sub-tree is imported and converted to standard Markdown notes

5. Start writing or editing

# Credits

Processing of Scrivener content was copied and adapted from the [rtf2md commandline tool](https://github.com/aredridel/rtf2md).

# License

See [License](LICENSE) for more information.