# Folder Info

A small Obsidian plugin that shows separate file and folder counts beside every folder in the native File Explorer.

```text
Research (44 files, 16 folders)
Archive (3 files, 0 folders)
Empty (0 files, 0 folders)
```

The default count includes all descendants. You can switch to direct children in the plugin settings.

## Features

- Separate file and folder totals
- Recursive or direct-child counting
- Counts every file type exposed by Obsidian, including Markdown notes and attachments
- Updates after files or folders are created, deleted, or renamed
- Preserves Obsidian's native folder rename field
- Removes every added label when the plugin is disabled
- Works on desktop and mobile without Node.js or Electron APIs

## Settings

- **Count scope**: all descendants or direct children
- **Show file count**
- **Show folder count**
- **Show zero counts**

## Security and privacy

Folder Info is intentionally narrow:

- No network access
- No telemetry
- No note-content or attachment-content reads
- No vault file writes
- No Node.js or Electron APIs
- No dynamic code execution
- No runtime dependencies
- Stores only its four local display preferences

The plugin reads Obsidian's in-memory vault tree and changes File Explorer display markup only.

## Counting scope

Folder Info uses Obsidian's Vault API. It counts files and folders that Obsidian exposes inside the vault. Hidden configuration directories such as `.obsidian` are outside its normal count.

## Install with BRAT

1. Create a public GitHub repository named `folder-info`.
2. Upload the contents of this repository package.
3. Create a GitHub release tagged exactly `1.0.0`.
4. Attach these files individually from the release-assets package:
   - `main.js`
   - `manifest.json`
   - `styles.css`
5. Add the repository URL through BRAT.
6. Enable **Folder Info** under Community plugins.

## Manual install

Copy these files into:

```text
<Your Vault>/.obsidian/plugins/folder-info/
```

```text
main.js
manifest.json
styles.css
```

Reload Obsidian, then enable the plugin.

## Scope and compatibility

The plugin targets Obsidian's native File Explorer. It does not modify alternative explorer views supplied by other plugins.

The File Explorer DOM classes and `data-path` attribute are not part of Obsidian's public plugin API. A future Obsidian interface change may require a selector update. The plugin does not patch Obsidian internals.

## Build and verify

Requires Node.js 18 or newer. The project has no npm dependencies.

```bash
npm run check
```

## License

MIT
