"use strict";

const { Plugin, PluginSettingTab, Setting, TFile, TFolder } = require("obsidian");

const EXPLORER_SELECTOR = '.workspace-leaf-content[data-type="file-explorer"]';
const FOLDER_SELECTOR = ".nav-folder-title[data-path]";
const CONTENT_SELECTOR = ".nav-folder-title-content";
const INFO_CLASS = "folder-info-count";
const NAME_CLASS = "folder-info-name";
const OWNED_CLASS = "folder-info-owned";
const CONTENT_CLASS = "folder-info-content";

const DEFAULT_SETTINGS = Object.freeze({
  countMode: "recursive",
  showFiles: true,
  showFolders: true,
  showZeroCounts: true,
});

class FolderInfoPlugin extends Plugin {
  constructor(...args) {
    super(...args);
    this.settings = { ...DEFAULT_SETTINGS };
    this.countIndex = new Map();
    this.observer = null;
    this.refreshFrame = null;
    this.countsDirty = true;
  }

  static normalizeSettings(data) {
    const source = data && typeof data === "object" ? data : {};
    return {
      countMode: source.countMode === "direct" ? "direct" : "recursive",
      showFiles: source.showFiles !== false,
      showFolders: source.showFolders !== false,
      showZeroCounts: source.showZeroCounts !== false,
    };
  }

  static buildCountIndex(root) {
    const index = new Map();

    const visit = (folder) => {
      let directFiles = 0;
      let directFolders = 0;
      let recursiveFiles = 0;
      let recursiveFolders = 0;

      const children = Array.isArray(folder?.children) ? folder.children : [];
      for (const child of children) {
        if (child instanceof TFile) {
          directFiles += 1;
          recursiveFiles += 1;
          continue;
        }

        if (child instanceof TFolder) {
          directFolders += 1;
          recursiveFolders += 1;

          const nested = visit(child);
          recursiveFiles += nested.recursiveFiles;
          recursiveFolders += nested.recursiveFolders;
        }
      }

      const counts = {
        directFiles,
        directFolders,
        recursiveFiles,
        recursiveFolders,
      };

      if (typeof folder?.path === "string") {
        index.set(folder.path, counts);
      }

      return counts;
    };

    if (root instanceof TFolder) {
      visit(root);
    }

    return index;
  }

  static selectCounts(counts, countMode) {
    const source = counts ?? {
      directFiles: 0,
      directFolders: 0,
      recursiveFiles: 0,
      recursiveFolders: 0,
    };

    if (countMode === "direct") {
      return {
        files: source.directFiles ?? 0,
        folders: source.directFolders ?? 0,
      };
    }

    return {
      files: source.recursiveFiles ?? 0,
      folders: source.recursiveFolders ?? 0,
    };
  }

  static formatCountLabel(counts, settings) {
    const parts = [];

    if (settings.showFiles) {
      parts.push(`${counts.files} ${counts.files === 1 ? "file" : "files"}`);
    }

    if (settings.showFolders) {
      parts.push(`${counts.folders} ${counts.folders === 1 ? "folder" : "folders"}`);
    }

    return parts.length > 0 ? `(${parts.join(", ")})` : "";
  }

  async onload() {
    this.settings = FolderInfoPlugin.normalizeSettings(await this.loadData());
    this.addSettingTab(new FolderInfoSettingTab(this.app, this));

    this.observer = new MutationObserver(() => this.scheduleRefresh(false));

    this.register(() => {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      if (this.refreshFrame !== null) {
        window.cancelAnimationFrame(this.refreshFrame);
        this.refreshFrame = null;
      }

      this.restoreNativeFolders();
    });

    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.connectExplorerObservers();
        this.scheduleRefresh(false);
      }),
    );

    this.registerEvent(this.app.vault.on("create", () => this.scheduleRefresh(true)));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh(true)));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRefresh(true)));

    this.addCommand({
      id: "refresh-folder-counts",
      name: "Refresh folder counts",
      callback: () => {
        this.countsDirty = true;
        this.connectExplorerObservers();
        this.refreshAllFolders();
      },
    });

    this.app.workspace.onLayoutReady(() => {
      this.countsDirty = true;
      this.connectExplorerObservers();
      this.refreshAllFolders();
    });
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    await this.saveData(this.settings);
    this.scheduleRefresh(false);
  }

  connectExplorerObservers() {
    if (!this.observer) return;

    this.observer.disconnect();
    document.querySelectorAll(EXPLORER_SELECTOR).forEach((explorer) => {
      this.observer.observe(explorer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-path", "class"],
      });
    });
  }

  scheduleRefresh(rebuildCounts) {
    if (rebuildCounts) {
      this.countsDirty = true;
    }

    if (this.refreshFrame !== null) return;

    this.refreshFrame = window.requestAnimationFrame(() => {
      this.refreshFrame = null;
      this.refreshAllFolders();
    });
  }

  rebuildCountIndex() {
    this.countIndex = FolderInfoPlugin.buildCountIndex(this.app.vault.getRoot());
    this.countsDirty = false;
  }

  refreshAllFolders() {
    if (this.countsDirty) {
      this.rebuildCountIndex();
    }

    document
      .querySelectorAll(`${EXPLORER_SELECTOR} ${FOLDER_SELECTOR}`)
      .forEach((title) => this.applyFolderInfo(title));
  }

  applyFolderInfo(title) {
    if (!(title instanceof HTMLElement)) return;

    const path = title.dataset.path;
    if (typeof path !== "string") return;

    const isRenaming = Boolean(
      title.querySelector('input, textarea, [contenteditable="true"]'),
    );

    if (isRenaming) {
      this.clearFolderInfo(title);
      return;
    }

    const content = title.querySelector(CONTENT_SELECTOR);
    if (!(content instanceof HTMLElement)) return;

    const selected = FolderInfoPlugin.selectCounts(
      this.countIndex.get(path),
      this.settings.countMode,
    );

    const displayedTotal =
      (this.settings.showFiles ? selected.files : 0) +
      (this.settings.showFolders ? selected.folders : 0);
    const shouldShow =
      (this.settings.showFiles || this.settings.showFolders) &&
      (this.settings.showZeroCounts || displayedTotal > 0);

    if (!shouldShow) {
      this.clearFolderInfo(title);
      return;
    }

    const label = FolderInfoPlugin.formatCountLabel(selected, this.settings);
    if (!label) {
      this.clearFolderInfo(title);
      return;
    }

    let name = content.querySelector(`:scope > .${NAME_CLASS}`);
    let info = content.querySelector(`:scope > .${INFO_CLASS}`);

    if (!(name instanceof HTMLElement)) {
      name = document.createElement("span");
      name.className = NAME_CLASS;

      const nativeNodes = Array.from(content.childNodes).filter((node) => node !== info);
      for (const node of nativeNodes) {
        name.appendChild(node);
      }

      content.insertBefore(name, info ?? null);
    }

    if (!(info instanceof HTMLElement)) {
      info = document.createElement("span");
      info.className = INFO_CLASS;
      info.setAttribute("aria-hidden", "true");
      content.appendChild(info);
    }

    if (info.textContent !== label) {
      info.textContent = label;
    }

    title.classList.add(OWNED_CLASS);
    content.classList.add(CONTENT_CLASS);
  }

  clearFolderInfo(title) {
    if (!(title instanceof HTMLElement)) return;

    const content = title.querySelector(CONTENT_SELECTOR);
    if (content instanceof HTMLElement) {
      content.querySelectorAll(`:scope > .${INFO_CLASS}`).forEach((element) => element.remove());

      const name = content.querySelector(`:scope > .${NAME_CLASS}`);
      if (name instanceof HTMLElement) {
        while (name.firstChild) {
          content.insertBefore(name.firstChild, name);
        }
        name.remove();
      }

      content.classList.remove(CONTENT_CLASS);
    }

    title.classList.remove(OWNED_CLASS);
  }

  restoreNativeFolders() {
    document
      .querySelectorAll(`${EXPLORER_SELECTOR} ${FOLDER_SELECTOR}`)
      .forEach((title) => this.clearFolderInfo(title));
  }
}

class FolderInfoSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Count scope")
      .setDesc("Count everything below each folder, or only its immediate children.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("recursive", "All descendants")
          .addOption("direct", "Direct children")
          .setValue(this.plugin.settings.countMode)
          .onChange((value) => this.plugin.updateSetting("countMode", value)),
      );

    new Setting(containerEl)
      .setName("Show file count")
      .setDesc("Include all file types that Obsidian exposes in the vault, not only Markdown notes.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showFiles)
          .onChange((value) => this.plugin.updateSetting("showFiles", value)),
      );

    new Setting(containerEl)
      .setName("Show folder count")
      .setDesc("Include the number of folders in the selected count scope.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showFolders)
          .onChange((value) => this.plugin.updateSetting("showFolders", value)),
      );

    new Setting(containerEl)
      .setName("Show zero counts")
      .setDesc("Show (0 files, 0 folders) beside empty folders.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showZeroCounts)
          .onChange((value) => this.plugin.updateSetting("showZeroCounts", value)),
      );
  }
}

module.exports = FolderInfoPlugin;
