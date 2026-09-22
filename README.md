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
- **Ignored files**: `CLAUDE.md`, `AGENTS.md` and `README.md` are left alone by default. See [Settings](#settings).
- Only Markdown notes are touched. The format is `YYYY-MM-DD HH:mm` in local time.

Notes that already exist when you install the plugin aren't stamped until you edit them, or until you run the command below on them.

## Commands

- **Dated: Add timestamps**: adds `created` and `modified` to the current note if it lacks either, taken from the file system's created and modified times. Existing values are kept.

## Settings

- **Ignored files**: files Dated never stamps, one per line. A bare name such as `README.md` matches that file in any folder. A path such as `Archive/Old.md` matches only that file. A path ending in `/`, such as `Archive/`, matches everything inside that folder. The default list is `CLAUDE.md`, `AGENTS.md` and `README.md`.

## Installation

Manually: download `main.js` and `manifest.json` from the [latest release](https://github.com/spwx/obsidian-dated/releases/latest) into `<vault>/.obsidian/plugins/dated/`, then enable the plugin under **Settings → Community plugins**.

## Development

The source is `src/main.js`. [esbuild](https://esbuild.github.io) bundles it into the `main.js` that ships, which is why `main.js` is not in the repo.

```sh
npm ci        # install
npm run dev   # rebuild on change
npm run build # production build
```

## Releasing

Run the release script with the new version (no `v`), from a clean `main`:

```sh
npm run release -- 1.3.0          # bump, build, commit, tag
npm run release -- 1.3.0 --push   # ...and push main and the tag
```

It bumps `version` in `manifest.json` (and matches `package.json` to it), adds the same version to `versions.json` mapped to the manifest's `minAppVersion`, runs the production build, then commits and tags. The commit message opens in `$EDITOR` prefilled with `Bump to <version>` so the body can describe what changed; `--no-edit` keeps just that line. It refuses to run on a dirty tree, off `main`, when `main` and `origin/main` have diverged, or when the version is not newer than the current one.

Nothing else needs editing by hand — don't set `version` in `manifest.json`, `package.json` or `versions.json` yourself, or the script's checks lose their meaning.

Pushing the tag starts the Release workflow, which builds from source, checks the tag against `manifest.json` and `versions.json`, attests `main.js` and `manifest.json`, and publishes the GitHub release.

That's the whole update process. Obsidian picks up new GitHub releases by itself, so there is nothing to submit or edit anywhere else — the community directory is a one-time submission (see below).

### Raising the minimum Obsidian version

The release script copies `minAppVersion` out of `manifest.json` as it is, so edit that field **before** running it:

```sh
# edit minAppVersion in manifest.json, commit, then:
npm run release -- 1.3.0
```

`versions.json` is what keeps older Obsidian installs working: it maps each released plugin version to the `minAppVersion` that release shipped with, so a user on an older Obsidian is offered the newest release that still supports them, instead of nothing. Old entries are history — never rewrite or prune them.

### Listing in the community directory (one-time)

Only needed once, for the first public release; updates after that are automatic.

1. Push a release, so `main.js` and `manifest.json` are attached to a GitHub release.
2. Submit the plugin at [community.obsidian.md](https://community.obsidian.md), signing in and linking this GitHub repo.
3. Fix anything the automated review flags, then wait for a maintainer.

The directory reads `manifest.json` from the **HEAD of the default branch**, not from the release. So if `id`, `name`, `description` or `author` ever change, push that to `main` — a release alone won't update the listing.

## License

[MIT](LICENSE)
