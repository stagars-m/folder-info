# Upload checklist for v1.0.3

The previous review commit was missing the nested `src/` and `scripts/` directories. Version 1.0.3 places the two required files at the repository root to make incomplete uploads obvious.

After uploading, the GitHub **Code** page must visibly show all of these files at the top level:

- `main.ts`
- `build.mjs`
- `package.json`
- `package-lock.json`
- `manifest.json`
- `styles.css`
- `LICENSE`

Before creating the release, open GitHub's web editor or clone the repository and verify:

```bash
npm ci
npm run build
npm test
```

Create release `1.0.3` only after the files above are present in the commit that the tag will reference.
