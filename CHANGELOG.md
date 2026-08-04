# Changelog

## 1.0.5

- Remove duplicate counters and folder-name wrappers left in the File Explorer DOM by older Folder Info versions.
- Make startup, refresh, disable, and repeated updates idempotent: each folder row can contain at most one current counter.
- Preserve the smaller counter font, reliable spacing, broad folder-row detection, and 0.30 shaded opacity from 1.0.4.

## 1.0.4

- Fix missing separation between folder names and counters with a literal non-breaking space.
- Fix missing counters on some folders by indexing all loaded vault entries rather than relying on class identity.
- Detect folder paths from both title and parent DOM attributes.
- Detect folder rows across all native File Explorer containers and refresh when explorer content is mounted dynamically.
- Stop wrapping or moving Obsidian's native folder-name nodes.
- Set shaded counter opacity to 0.30.

## 1.0.3

- Add an optional Shade folder info setting.
