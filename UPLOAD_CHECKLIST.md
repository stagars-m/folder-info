# Upload checklist for 1.0.1

Upload every file and folder in this repository package to the root of `stagars-m/folder-info`, including hidden `.github`.

Before releasing, the GitHub Code tab must show:

- `.github/workflows/release.yml`
- `src/main.js`
- `tests/plugin.test.cjs`
- `scripts/build.mjs`
- `package.json`
- `package-lock.json`
- `LICENSE`
- `README.md`
- `manifest.json`
- `styles.css`
- `versions.json`

Do not manually upload release assets for 1.0.1. Use **Actions → Release Obsidian plugin → Run workflow**. Enter `1.0.1`. The workflow creates a draft release with attested assets. Review it, then publish it.
