const { Notice, Plugin, TFile, moment } = require("obsidian");

const CREATED = "created";
const MODIFIED = "modified";
const FORMAT = "YYYY-MM-DD HH:mm";
// Wait for a pause in edits before touching the file, so we don't rewrite it
// under the cursor on every keystroke.
const DELAY_MS = 5000;
// Writes right after a file appears (ours, or a copy finishing) aren't edits.
const ARRIVAL_MS = 2000;

module.exports = class Dated extends Plugin {
  onload() {
    this.timers = new Map();
    this.arrivals = new Map();
    this.writing = new Set();
    this.register(() => this.timers.forEach(clearTimeout));

    this.addCommand({
      id: "stamp-missing",
      name: "Stamp notes missing timestamps",
      callback: () => this.stampMissing(),
    });

    // Vault fires "create" for every existing file while indexing at startup;
    // only listen once that's done so we stamp genuinely new files.
    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(
        this.app.vault.on("create", (file) => {
          if (!this.tracked(file)) return;
          this.arrivals.set(file.path, Date.now());
          this.stamp(file, fillMissing(moment().format(FORMAT)));
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
                fillMissing(now)(fm);
                if (fm[MODIFIED] !== now) fm[MODIFIED] = now;
              });
            }, DELAY_MS)
          );
        })
      );
    });
  }

  async stampMissing() {
    const now = moment().format(FORMAT);
    const files = this.app.vault.getMarkdownFiles().filter((file) => {
      if (!this.tracked(file)) return false;
      const fm = this.frontmatter(file);
      return fm?.[CREATED] == null || fm[MODIFIED] == null;
    });
    for (const file of files) await this.stamp(file, fillMissing(now));
    new Notice(`Dated: stamped ${files.length} note(s).`);
  }

  tracked(file) {
    if (!(file instanceof TFile) || file.extension !== "md") return false;
    // Leave templates alone so their stamps don't leak into new notes.
    const folder = this.app.internalPlugins?.getPluginById?.("templates")
      ?.instance?.options?.folder;
    return !(folder && file.path.startsWith(folder.replace(/\/$/, "") + "/"));
  }

  frontmatter(file) {
    return this.app.metadataCache.getFileCache(file)?.frontmatter;
  }

  stamp(file, fn) {
    this.writing.add(file.path);
    return this.app.fileManager
      .processFrontMatter(file, fn)
      .catch((err) => console.error("dated:", file.path, err))
      .finally(() => this.writing.delete(file.path));
  }
};

function fillMissing(now) {
  return (fm) => {
    if (fm[CREATED] == null) fm[CREATED] = now;
    if (fm[MODIFIED] == null) fm[MODIFIED] = now;
  };
}
