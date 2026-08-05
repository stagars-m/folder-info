# Folder Info

Folder Info displays compact file and folder counts in a lower-right badge on folders in Obsidian's native File Explorer.

Examples:

- `Research  44 | 16`
- `Projects  8 | 4`
- `Empty folder  0 | 0`

## Features

- Recursive totals or direct-child totals
- Independent file and folder count toggles
- Optional zero counts
- Compact translucent badge with a `|` separator
- Badge font sizes: Normal, Small, and Extra small
- Optional 80%-opacity shading for the badge
- Live refresh after create, delete, and rename operations
- Preserves Obsidian's normal folder rename interface

## Settings

- Count all descendants or direct children
- Show or hide file counts
- Show or hide folder counts
- Choose Normal, Small, or Extra small badge text
- Shade the badge at 80% opacity
- Show or hide zero counts

## Reliability

- Counters are appended without moving Obsidian's native folder-name nodes.
- Legacy counters and wrappers from earlier versions are removed automatically, preventing duplicate labels after updates.
- Counts are indexed from all loaded vault files and folders, including empty folders.
- The plugin refreshes folder rows when File Explorer content is mounted, expanded, renamed, created, or deleted.

## Privacy and security

Folder Info makes no network requests, collects no telemetry, does not read note or attachment contents, and does not write to vault files. It reads only Obsidian's in-memory file and folder tree and stores six local display preferences.

## Source and build

The complete plugin source is the root-level [`main.ts`](main.ts). It intentionally uses JavaScript-compatible TypeScript so the deterministic build has no third-party dependencies.

```bash
npm ci
npm run build
npm test
```

`npm run build` executes the root-level `build.mjs` and creates `main.js` from `main.ts`.

## Release files

Each GitHub release must attach these files individually:

- `main.js`
- `manifest.json`
- `styles.css`

The release tag must exactly match the version in `manifest.json`.

## License

MIT

## Compact badge

Folder counts appear as a translucent badge such as:

```text
44 | 16
```

The first value is the file count and the second is the folder count. Folder-name hover behavior remains native to Obsidian; the plugin does not add another popup.

Badge font-size options are:

- **Normal**: 90% of the folder-name size.
- **Small**: 30% smaller, the default.
- **Extra small**: 50% smaller.
