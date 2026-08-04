# Upload checklist for v1.0.6

Upload every file from the repository package to the root of the GitHub repository. Before creating the release, the GitHub Code page must visibly show:

- `main.ts`
- `main.js`
- `build.mjs`
- `package.json`
- `package-lock.json`
- `manifest.json`
- `styles.css`
- `README.md`
- `LICENSE`
- `.github/workflows/release.yml`

Verify the tagged commit in a clean checkout:

```bash
npm ci
npm run check
```

Create release `1.0.6` through the included GitHub Actions workflow so `main.js` and `styles.css` receive artifact attestations. Publish the workflow-created draft release without replacing its generated assets.
