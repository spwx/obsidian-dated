const {
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  moment,
} = require("obsidian");

const CREATED = "created";
const MODIFIED = "modified";
const FORMAT = "YYYY-MM-DD HH:mm";
// Wait for a pause in edits before touching the file, so we don't rewrite it
// under the cursor on every keystroke.
const DELAY_MS = 5000;
// Writes right after a file appears (ours, or a copy finishing) aren't edits.
const ARRIVAL_MS = 2000;

const DEFAULT_SETTINGS = {
  // Notes written for tools rather than people; stamps would just be noise.
  ignore: ["CLAUDE.md", "AGENTS.md", "README.md"],
};

module.exports = class Dated extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new DatedSettingTab(this.app, this));

    this.timers = new Map();
    this.arrivals = new Map();
    this.writing = new Set();
    this.register(() => this.timers.forEach(clearTimeout));

    this.addCommand({
      id: "add-timestamps",
      name: "Add timestamps",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || !this.tracked(file)) return false;
        if (!checking) this.addTimestamps(file);
        return true;
      },
    });

    // Vault fires "create" for every existing file while indexing at startup;
    // only listen once that's done so we stamp genuinely new files.
    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(
        this.app.vault.on("create", (file) => {
          if (!this.tracked(file)) return;
          this.arrivals.set(file.path, Date.now());
          this.stamp(file, fillMissing(file, moment().format(FORMAT)));
        })
      );
      this.registerEvent(
        this.app.vault.on("modify", (file) => {
          if (!this.tracked(file) || this.writing.has(file.path)) return;
          if (Date.now() - (this.arrivals.get(file.path) ?? 0) < ARRIVAL_MS) return;
          this.arrivals.delete(file.path);
          clearTimeout(this.timers.get(file.path));
          this.timers.set(
            file.path,
            setTimeout(() => {
              this.timers.delete(file.path);
              const now = moment().format(FORMAT);
              // Our own write fires "modify" again; the values then match,
              // so this is a no-op and doesn't loop.
              const fm = this.frontmatter(file);
              if (fm?.[MODIFIED] === now && fm[CREATED] != null) return;
              this.stamp(file, (fm) => {
                fillMissing(file, now)(fm);
                if (fm[MODIFIED] !== now) fm[MODIFIED] = now;
              });
            }, DELAY_MS)
          );
        })
      );
    });
  }

  async addTimestamps(file) {
    const fm = this.frontmatter(file);
    if (fm?.[CREATED] != null && fm[MODIFIED] != null) {
      new Notice("Dated: this note already has timestamps.");
      return;
    }
    await this.stamp(file, fillMissing(file, moment().format(FORMAT)));
    new Notice("Dated: timestamps added.");
  }

  tracked(file) {
    if (!(file instanceof TFile) || file.extension !== "md") return false;
    if (this.settings.ignore.some((pattern) => ignores(pattern, file))) {
      return false;
    }
    // Leave templates alone so their stamps don't leak into new notes.
    const folder = this.app.internalPlugins?.getPluginById?.("templates")
      ?.instance?.options?.folder;
    return !(folder && file.path.startsWith(folder.replace(/\/$/, "") + "/"));
  }

  frontmatter(file) {
    return this.app.metadataCache.getFileCache(file)?.frontmatter;
  }

  saveSettings() {
    return this.saveData(this.settings);
  }

  stamp(file, fn) {
    this.writing.add(file.path);
    return this.app.fileManager
      .processFrontMatter(file, fn)
      .catch((err) => console.error("dated:", file.path, err))
      .finally(() => this.writing.delete(file.path));
  }
};

class DatedSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName("Ignored files")
      .setDesc(
        "One per line. A bare name (README.md) matches that file in any " +
          "folder; a path (Archive/Old.md) matches that file only; a path " +
          "ending in / (Archive/) matches everything inside that folder."
      )
      .addTextArea((text) => {
        text.inputEl.rows = 6;
        text.setValue(this.plugin.settings.ignore.join("\n")).onChange(
          async (value) => {
            this.plugin.settings.ignore = value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          }
        );
      });
  }
}

function ignores(pattern, file) {
  if (pattern.endsWith("/")) return file.path.startsWith(pattern);
  if (pattern.includes("/")) return file.path === pattern;
  return file.name === pattern;
}

// A missing stamp is backfilled from the file system, which is closer to the
// truth than "now" for notes that predate the plugin. Falls back to now when
// the vault adapter has no stat (or it's zero).
function fillMissing(file, now) {
  return (fm) => {
    if (fm[CREATED] == null) fm[CREATED] = fsTime(file.stat?.ctime, now);
    if (fm[MODIFIED] == null) fm[MODIFIED] = fsTime(file.stat?.mtime, now);
  };
}

function fsTime(ms, now) {
  return ms ? moment(ms).format(FORMAT) : now;
}
