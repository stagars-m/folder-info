# Upload checklist for v1.0.4

After uploading, the GitHub **Code** page must visibly show all of these files at the repository root:

- `README.md`
- `LICENSE`
- `main.ts`
- `build.mjs`
- `package.json`
- `package-lock.json`
- `manifest.json`
- `styles.css`
- `.github/workflows/release.yml`

Before creating the release, verify from a clean clone:

```bash
npm ci
npm run check
```

Create release `1.0.4` only after these files are present in the commit referenced by the release tag. Prefer the included GitHub Actions release workflow so `main.js` and `styles.css` receive artifact attestations.
