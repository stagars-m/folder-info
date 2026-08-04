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
- Optional light-gray shading for the counter
- Live refresh after create, delete, and rename operations
- Preserves Obsidian's normal folder rename interface

## Settings

- Count all descendants or direct children
- Show or hide file counts
- Show or hide folder counts
- Shade the folder counter in a lighter color
- Show or hide zero counts

## Privacy and security

Folder Info makes no network requests, collects no telemetry, does not read note or attachment contents, and does not write to vault files. It reads only Obsidian's in-memory file and folder tree and stores five local display preferences.

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
