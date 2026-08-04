# Folder Info

Folder Info displays separate file and folder counts beside folders in Obsidian's native File Explorer.

Examples:

- `Research (44 files, 16 folders)`
- `Projects (8 files, 4 folders)`
- `Empty folder (0 files, 0 folders)`

## Features

- Recursive totals or direct-child totals
- Independent file and folder count toggles
- Optional zero counts
- Optional 30%-opacity shading for the counter
- Native full-name tooltip when a folder name is truncated by its counter
- Live refresh after create, delete, and rename operations
- Preserves Obsidian's normal folder rename interface

## Settings

- Count all descendants or direct children
- Show or hide file counts
- Show or hide folder counts
- Shade the folder counter at 30% opacity
- Show or hide the full-name tooltip for truncated folders
- Show or hide zero counts

## Reliability

- Counters are appended without moving Obsidian's native folder-name nodes.
- Legacy counters and wrappers from earlier versions are removed automatically, preventing duplicate labels after updates.
- A non-breaking space guarantees visible separation between the name and counter.
- Counts are indexed from all loaded vault files and folders, including empty folders.
- The plugin refreshes folder rows when File Explorer content is mounted, expanded, renamed, created, or deleted.
- Truncated folder names use the same native hover tooltip style as Full File Extensions, while existing title attributes are preserved.

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
