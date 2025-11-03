# Scrivsidian: Obsidian Scrivener import plugin

This is a plugin for [Obsidian](https://obsidian.md "Obsidian - Sharpen your thinking"), to import
[Scrivener](https://www.literatureandlatte.com/scrivener/overview "#1 Novel & Book Writing Software For Writers") projects.

## Features

* Importing (part of) a Scrivener project (`*.scrivx` file)
* Include Scrivener metadata
* Optionally import into a new or existing [Longform](https://github.com/kevboh/longform) project

# Installation

Copy the `main.js`, `manifest.json`, and `styles.css` files from a release into a `scrivsidian/` folder in the
`.obsidian/plugins` folder of your vault.

# Getting started

1. Find or create a folder in your vault, right click it, and select `Import from Scrivener`; this will show the import dialog.

2. In the dialog, select the Scrivener project file; the project structure is read and shown.

3. Optionally select the sub-tree to import, or leave the default set to the project root.

4. Click `Import`; the selected sub-tree is imported and converted to standard Markdown notes. If the vault folder is a `Longform` project, the `Longform` meta data will also be set.

5. Start writing or editing.

# License

See [License](LICENSE) for more information.