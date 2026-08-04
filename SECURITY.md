# Security

## Design

Folder Info has no network functionality, telemetry, analytics, content parsing, vault writes, Node.js APIs, Electron APIs, or runtime dependencies.

It reads only Obsidian's in-memory file and folder objects to calculate counts. It does not call `Vault.read()`, `Vault.cachedRead()`, adapter read methods, or write methods.

The plugin stores four local display preferences through Obsidian's plugin data API.

## Reporting a vulnerability

Open a private GitHub security advisory for the repository. Do not include private vault content in a public issue.
