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
- **Edited notes** get `modified` updated once you stop typing for 5 seconds, so the file isn't rewritten under the cursor on every keystroke. A missing `created` is filled in at the same time, from the file system's created time. An existing `created` is never changed.
- **Arriving files**: writes in the first 2 seconds after a file appears (such as a copy finishing) don't count as edits.
- **Templates**: notes inside the core Templates plugin's folder are left alone, so their stamps don't leak into notes made from them.
- Only Markdown notes are touched. The format is `YYYY-MM-DD HH:mm` in local time.

Notes that already exist when you install the plugin aren't stamped until you edit them, or until you run the command below on them.

## Commands

- **Dated: Add timestamps**: adds `created` and `modified` to the current note if it lacks either, taken from the file system's created and modified times. Existing values are kept.

## Installation

Manually: download `main.js` and `manifest.json` from the [latest release](https://github.com/spwx/obsidian-dated/releases/latest) into `<vault>/.obsidian/plugins/dated/`, then enable the plugin under **Settings → Community plugins**.

## Development

The source is `src/main.js`. [esbuild](https://esbuild.github.io) bundles it into the `main.js` that ships, which is why `main.js` is not in the repo.

```sh
npm ci        # install
npm run dev   # rebuild on change
npm run build # production build
```

To release, bump the version and push the tag:

```sh
npm version 1.3.0   # updates package.json, manifest.json and versions.json,
                    # then commits and tags 1.3.0 (no "v", per .npmrc)
git push --follow-tags
```

The Release workflow checks the tag against `manifest.json` and `versions.json`, builds from source, attests `main.js` and `manifest.json`, and publishes the GitHub release.

## License

[MIT](LICENSE)
