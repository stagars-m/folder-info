"use strict";

const { Plugin, PluginSettingTab, Setting } = require("obsidian");

const EXPLORER_SELECTOR =
  '.workspace-leaf-content[data-type="file-explorer"], .nav-files-container';
const FOLDER_SELECTOR = ".nav-folder-title";
const CONTENT_SELECTOR = ".nav-folder-title-content";
const INFO_CLASS = "folder-info-count";
const LEGACY_NAME_CLASS = "folder-info-name";
const LEGACY_CONTENT_CLASS = "folder-info-content";
const OWNED_CLASS = "folder-info-owned";
const SHADE_CLASS = "folder-info-shaded";
const NON_BREAKING_SPACE = "\u00a0";
const TOOLTIP_OWNED_DATA = "folderInfoTooltipOwned";
const TOOLTIP_HAD_ORIGINAL_DATA = "folderInfoHadOriginalTitle";
const TOOLTIP_ORIGINAL_DATA = "folderInfoOriginalTitle";

const DEFAULT_SETTINGS = Object.freeze({
  countMode: "recursive",
  showFiles: true,
  showFolders: true,
  showZeroCounts: true,
  shadeFolderInfo: true,
  showTooltip: true,
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
      shadeFolderInfo: source.shadeFolderInfo !== false,
      showTooltip: source.showTooltip !== false,
    };
  }

  static normalizeVaultPath(path) {
    if (typeof path !== "string") return "";
    return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  }

  static parentPath(path) {
    const normalized = FolderInfoPlugin.normalizeVaultPath(path);
    const separator = normalized.lastIndexOf("/");
    return separator < 0 ? "" : normalized.slice(0, separator);
  }

  static folderNameFromPath(path) {
    const normalized = FolderInfoPlugin.normalizeVaultPath(path);
    if (!normalized) return "";
    const separator = normalized.lastIndexOf("/");
    return separator < 0 ? normalized : normalized.slice(separator + 1);
  }

  static isContentTruncated(content) {
    if (!content || typeof content !== "object") return false;
    const scrollWidth = Number(content.scrollWidth);
    const clientWidth = Number(content.clientWidth);
    return Number.isFinite(scrollWidth) &&
      Number.isFinite(clientWidth) &&
      clientWidth > 0 &&
      scrollWidth > clientWidth;
  }

  static isFolderLike(entry) {
    return Boolean(entry && typeof entry.path === "string" && Array.isArray(entry.children));
  }

  static isFileLike(entry) {
    return Boolean(entry && typeof entry.path === "string" && !Array.isArray(entry.children));
  }

  static emptyCounts() {
    return {
      directFiles: 0,
      directFolders: 0,
      recursiveFiles: 0,
      recursiveFolders: 0,
    };
  }

  static buildCountIndexFromLoadedFiles(entries) {
    const index = new Map();
    const loaded = Array.isArray(entries) ? entries : [];

    const ensure = (path) => {
      const normalized = FolderInfoPlugin.normalizeVaultPath(path);
      if (!index.has(normalized)) {
        index.set(normalized, FolderInfoPlugin.emptyCounts());
      }
      return index.get(normalized);
    };

    const incrementAncestors = (startPath, key) => {
      let cursor = FolderInfoPlugin.normalizeVaultPath(startPath);
      while (true) {
        ensure(cursor)[key] += 1;
        if (cursor === "") break;
        cursor = FolderInfoPlugin.parentPath(cursor);
      }
    };

    ensure("");

    // Register every folder before counting. This guarantees that empty folders
    // and folders rendered by the native explorer receive an index entry.
    for (const entry of loaded) {
      if (FolderInfoPlugin.isFolderLike(entry)) {
        ensure(entry.path);
      }
    }

    for (const entry of loaded) {
      const path = FolderInfoPlugin.normalizeVaultPath(entry?.path);
      if (!path) continue;

      const parent = FolderInfoPlugin.normalizeVaultPath(
        typeof entry?.parent?.path === "string"
          ? entry.parent.path
          : FolderInfoPlugin.parentPath(path),
      );

      if (FolderInfoPlugin.isFolderLike(entry)) {
        ensure(parent).directFolders += 1;
        incrementAncestors(parent, "recursiveFolders");
      } else if (FolderInfoPlugin.isFileLike(entry)) {
        ensure(parent).directFiles += 1;
        incrementAncestors(parent, "recursiveFiles");
      }
    }

    return index;
  }

  static buildCountIndex(root) {
    const entries = [];

    const visit = (folder) => {
      const children = Array.isArray(folder?.children) ? folder.children : [];
      for (const child of children) {
        entries.push(child);
        if (FolderInfoPlugin.isFolderLike(child)) {
          visit(child);
        }
      }
    };

    if (FolderInfoPlugin.isFolderLike(root)) {
      entries.push(root);
      visit(root);
    }

    return FolderInfoPlugin.buildCountIndexFromLoadedFiles(entries);
  }

  static selectCounts(counts, countMode) {
    const source = counts ?? FolderInfoPlugin.emptyCounts();

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

  static formatCountPart(value, singular, plural) {
    return `${value}${NON_BREAKING_SPACE}${value === 1 ? singular : plural}`;
  }

  static formatCountLabel(counts, settings) {
    const parts = [];

    if (settings.showFiles) {
      parts.push(FolderInfoPlugin.formatCountPart(counts.files, "file", "files"));
    }

    if (settings.showFolders) {
      parts.push(
        FolderInfoPlugin.formatCountPart(counts.folders, "folder", "folders"),
      );
    }

    return parts.length > 0 ? `(${parts.join(", ")})` : "";
  }

  static resolveFolderPath(title) {
    if (!title || typeof title !== "object") return "";

    const candidates = [
      title.dataset?.path,
      typeof title.getAttribute === "function" ? title.getAttribute("data-path") : null,
      typeof title.closest === "function"
        ? title.closest(".nav-folder[data-path]")?.getAttribute?.("data-path")
        : null,
      title.parentElement?.dataset?.path,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string") {
        return FolderInfoPlugin.normalizeVaultPath(candidate);
      }
    }

    return "";
  }

  static unwrapElement(element) {
    if (!(element instanceof HTMLElement) || !element.parentElement) return;

    const parent = element.parentElement;
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    element.remove();
  }

  static cleanLegacyMarkup(title, preserveDirectCounter = true) {
    if (!(title instanceof HTMLElement)) return null;

    const content = title.querySelector(CONTENT_SELECTOR);
    let directCounter = null;

    title.querySelectorAll(`.${INFO_CLASS}`).forEach((counter) => {
      const isDirect = counter.parentElement === title;
      if (
        preserveDirectCounter &&
        isDirect &&
        directCounter === null &&
        counter instanceof HTMLElement
      ) {
        directCounter = counter;
        return;
      }
      counter.remove();
    });

    if (content instanceof HTMLElement) {
      content
        .querySelectorAll(`.${LEGACY_NAME_CLASS}`)
        .forEach((name) => FolderInfoPlugin.unwrapElement(name));
      content.classList.remove(LEGACY_CONTENT_CLASS);
    }

    return directCounter;
  }

  static mutationTouchesExplorer(mutations) {
    const records = Array.isArray(mutations) ? mutations : Array.from(mutations ?? []);

    const elementTouchesExplorer = (node) => {
      if (!node || node.nodeType !== 1) return false;
      return Boolean(
        node.matches?.(EXPLORER_SELECTOR) ||
          node.matches?.(FOLDER_SELECTOR) ||
          node.closest?.(EXPLORER_SELECTOR) ||
          node.querySelector?.(EXPLORER_SELECTOR) ||
          node.querySelector?.(FOLDER_SELECTOR),
      );
    };

    return records.some((record) => {
      if (elementTouchesExplorer(record.target)) return true;
      return [...(record.addedNodes ?? []), ...(record.removedNodes ?? [])].some(
        elementTouchesExplorer,
      );
    });
  }

  async onload() {
    this.settings = FolderInfoPlugin.normalizeSettings(await this.loadData());
    this.addSettingTab(new FolderInfoSettingTab(this.app, this));

    // Purge markup left by older plugin versions before rendering new counters.
    // This makes hot updates and BRAT reinstalls idempotent.
    this.restoreNativeFolders();

    this.observer = new MutationObserver((mutations) => {
      if (FolderInfoPlugin.mutationTouchesExplorer(mutations)) {
        this.scheduleRefresh(false);
      }
    });

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
        this.connectExplorerObserver();
        this.scheduleRefresh(false);
      }),
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.scheduleRefresh(false)),
    );

    this.registerEvent(this.app.vault.on("create", () => this.scheduleRefresh(true)));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh(true)));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRefresh(true)));

    this.addCommand({
      id: "refresh-folder-counts",
      name: "Refresh folder counts",
      callback: () => {
        this.countsDirty = true;
        this.connectExplorerObserver();
        this.refreshAllFolders();
      },
    });

    this.app.workspace.onLayoutReady(() => {
      this.countsDirty = true;
      this.connectExplorerObserver();
      this.refreshAllFolders();
    });
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    await this.saveData(this.settings);
    this.scheduleRefresh(false);
  }

  connectExplorerObserver() {
    if (!this.observer) return;

    this.observer.disconnect();
    const root = document.body ?? document.documentElement;
    if (root) {
      this.observer.observe(root, {
        childList: true,
        subtree: true,
      });
    }
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
    const loadedFiles = this.app.vault.getAllLoadedFiles?.();
    if (Array.isArray(loadedFiles)) {
      this.countIndex = FolderInfoPlugin.buildCountIndexFromLoadedFiles(loadedFiles);
    } else {
      this.countIndex = FolderInfoPlugin.buildCountIndex(this.app.vault.getRoot());
    }
    this.countsDirty = false;
  }

  getFolderTitles() {
    const found = new Set();
    document
      .querySelectorAll(
        '.workspace-leaf-content[data-type="file-explorer"] .nav-folder-title, .nav-files-container .nav-folder-title',
      )
      .forEach((title) => found.add(title));
    return found;
  }

  refreshAllFolders() {
    if (this.countsDirty) {
      this.rebuildCountIndex();
    }

    this.getFolderTitles().forEach((title) => this.applyFolderInfo(title));
  }

  applyFolderInfo(title) {
    if (!(title instanceof HTMLElement)) return;

    const path = FolderInfoPlugin.resolveFolderPath(title);
    const hasPath = path !== "" || title.getAttribute("data-path") === "";
    if (!hasPath) return;

    const isRenaming = Boolean(
      title.querySelector('input, textarea, [contenteditable="true"]'),
    );

    if (isRenaming) {
      this.clearFolderInfo(title);
      return;
    }

    const content = title.querySelector(CONTENT_SELECTOR);
    if (!(content instanceof HTMLElement)) return;

    // v1.0.3 placed its counter inside the native title content and wrapped
    // the folder name. Remove that legacy structure before adding one current
    // counter as a direct child of the folder title.
    let info = FolderInfoPlugin.cleanLegacyMarkup(title, true);

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

    if (!(info instanceof HTMLElement)) {
      info = document.createElement("span");
      info.className = INFO_CLASS;
      info.setAttribute("aria-hidden", "true");
      title.appendChild(info);
    }

    // A literal non-breaking space makes the separation reliable even when a
    // theme resets margins or gaps on File Explorer rows.
    const displayText = `${NON_BREAKING_SPACE}${label}`;
    if (info.textContent !== displayText) {
      info.textContent = displayText;
    }

    title.classList.add(OWNED_CLASS);
    title.classList.toggle(SHADE_CLASS, this.settings.shadeFolderInfo);

    const folderName =
      FolderInfoPlugin.folderNameFromPath(path) || content.textContent?.trim() || "";
    this.applyTooltip(title, content, folderName);
  }

  applyTooltip(title, content, folderName) {
    const shouldShow =
      this.settings.showTooltip !== false &&
      folderName !== "" &&
      FolderInfoPlugin.isContentTruncated(content);

    if (!shouldShow) {
      this.restoreTooltip(title);
      return;
    }

    if (title.dataset[TOOLTIP_OWNED_DATA] !== "true") {
      title.dataset[TOOLTIP_OWNED_DATA] = "true";
      title.dataset[TOOLTIP_HAD_ORIGINAL_DATA] = title.hasAttribute("title")
        ? "true"
        : "false";
      title.dataset[TOOLTIP_ORIGINAL_DATA] = title.getAttribute("title") ?? "";
    }

    if (title.getAttribute("title") !== folderName) {
      title.setAttribute("title", folderName);
    }
  }

  restoreTooltip(title) {
    if (!(title instanceof HTMLElement)) return;
    if (title.dataset[TOOLTIP_OWNED_DATA] !== "true") return;

    if (title.dataset[TOOLTIP_HAD_ORIGINAL_DATA] === "true") {
      title.setAttribute(
        "title",
        title.dataset[TOOLTIP_ORIGINAL_DATA] ?? "",
      );
    } else {
      title.removeAttribute("title");
    }

    delete title.dataset[TOOLTIP_OWNED_DATA];
    delete title.dataset[TOOLTIP_HAD_ORIGINAL_DATA];
    delete title.dataset[TOOLTIP_ORIGINAL_DATA];
  }

  clearFolderInfo(title) {
    if (!(title instanceof HTMLElement)) return;

    // Remove current counters, duplicate counters, and the nested counter/name
    // wrappers used by v1.0.3. Repeated cleanup is safe.
    FolderInfoPlugin.cleanLegacyMarkup(title, false);
    this.restoreTooltip(title);
    title.classList.remove(OWNED_CLASS, SHADE_CLASS);
  }

  restoreNativeFolders() {
    const titles = new Set(this.getFolderTitles());

    document.querySelectorAll(FOLDER_SELECTOR).forEach((title) => titles.add(title));
    document.querySelectorAll(`.${INFO_CLASS}`).forEach((counter) => {
      const title = counter.closest?.(FOLDER_SELECTOR);
      if (title) titles.add(title);
    });

    titles.forEach((title) => this.clearFolderInfo(title));
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
      .setName("Shade folder info")
      .setDesc("Show the counter at 30% opacity. Turn this off to use the normal folder-name color.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.shadeFolderInfo)
          .onChange((value) => this.plugin.updateSetting("shadeFolderInfo", value)),
      );

    new Setting(containerEl)
      .setName("Show full folder name on hover")
      .setDesc("Show a native tooltip when the folder name is shortened by the counter.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showTooltip)
          .onChange((value) => this.plugin.updateSetting("showTooltip", value)),
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
