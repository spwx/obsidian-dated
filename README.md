# Dated

Writes `created` and `modified` date-times into the front matter of your notes, so they survive syncing, copying and git checkouts that reset file timestamps.

```yaml
---
created: 2026-09-19 16:45
modified: 2026-09-19 17:02
---
```

## Behaviour

- **New notes** get both `created` and `modified`, set to the current time.
- **Edited notes** get `modified` updated once you stop typing for 5 seconds, so the file isn't rewritten under the cursor on every keystroke. A missing `created` is filled in at the same time. An existing `created` is never changed.
- **Arriving files**: writes in the first 2 seconds after a file appears (such as a copy finishing) don't count as edits.
- **Templates**: notes inside the core Templates plugin's folder are left alone, so their stamps don't leak into notes made from them.
- Only Markdown notes are touched. The format is `YYYY-MM-DD HH:mm` in local time.

Notes that already exist when you install the plugin aren't stamped until you edit them, or until you run the command below.

## Commands

- **Stamp notes missing timestamps**: adds `created` and `modified` (set to now) to every note that lacks either. Existing values are kept.

## Installation

Manually: download `main.js` and `manifest.json` from the [latest release](https://github.com/spwx/obsidian-dated/releases/latest) into `<vault>/.obsidian/plugins/dated/`, then enable the plugin under **Settings → Community plugins**.

## Development

`main.js` is the source; `npm run build` only syntax-checks it, so the released file is byte-for-byte the one in the repo.

To release, bump `version` in `manifest.json`, commit, then push a tag with the same version (no `v`). The Release workflow attests `main.js` and `manifest.json` and publishes the GitHub release.

```sh
git tag 1.2.0 && git push origin 1.2.0
```

## License

[MIT](LICENSE)
