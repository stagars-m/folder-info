# Folder Info

Folder Info adds separate file and folder counts beside each folder in Obsidian's native File Explorer.

```text
Research (44 files, 16 folders)
```

## Features

- Counts files and folders separately.
- Supports recursive totals or direct-child totals.
- Can show only files, only folders, or both.
- Can hide zero counts.
- Updates after files or folders are created, deleted, or renamed.
- Keeps the normal inline folder rename field unchanged.

## Privacy and security

Folder Info:

- makes no network requests;
- collects no telemetry;
- does not read note or attachment contents;
- does not write to vault files;
- does not use Node.js or Electron APIs at runtime;
- stores only four local display preferences.

The plugin reads Obsidian's in-memory vault tree to count `TFile` and `TFolder` objects and changes only File Explorer presentation.

## Source and reproducible build

The complete source is in [`src/main.js`](src/main.js). The build is deterministic and has no runtime or build dependencies.

```bash
npm ci
npm run check
```

`package-lock.json` is committed so automated review can reproduce the build. GitHub releases are created by `.github/workflows/release.yml`, which builds from the tagged commit and generates GitHub artifact attestations for `main.js` and `styles.css`.

## Installation

### BRAT

Add:

```text
https://github.com/stagars-m/folder-info
```

### Manual

Copy `main.js`, `manifest.json`, and `styles.css` from a GitHub release into:

```text
<Vault>/.obsidian/plugins/folder-info/
```

Restart Obsidian and enable **Folder Info**.

## License

Folder Info is released under the [MIT License](LICENSE).
