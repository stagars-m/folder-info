"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const test = require("node:test");

const originalLoad = Module._load;
Module._load = function mockedLoad(request, parent, isMain) {
  if (request === "obsidian") {
    return {
      Plugin: class Plugin {},
      PluginSettingTab: class PluginSettingTab {},
      Setting: class Setting {},
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const PluginClass = require("./main.js");
Module._load = originalLoad;

function folder(path, children = [], parent = null) {
  const result = { path, children, parent };
  for (const child of children) child.parent = result;
  return result;
}

function file(path, parent = null) {
  return { path, parent };
}

test("builds direct and recursive counts from the folder tree", () => {
  const nested = folder("Research/Nested", [
    file("Research/Nested/B.md"),
    file("Research/Nested/C.pdf"),
  ]);
  const research = folder("Research", [file("Research/A.md"), nested]);
  const root = folder("", [research, file("Root.md")]);

  const index = PluginClass.buildCountIndex(root);

  assert.deepEqual(index.get("Research"), {
    directFiles: 1,
    directFolders: 1,
    recursiveFiles: 3,
    recursiveFolders: 1,
  });
  assert.deepEqual(index.get("Research/Nested"), {
    directFiles: 2,
    directFolders: 0,
    recursiveFiles: 2,
    recursiveFolders: 0,
  });
});

test("builds counts from all loaded files without relying on Obsidian class identity", () => {
  const root = folder("");
  const research = folder("Research", [], root);
  const nested = folder("Research/Nested", [], research);
  const a = file("Research/A.md", research);
  const b = file("Research/Nested/B.pdf", nested);

  const index = PluginClass.buildCountIndexFromLoadedFiles([
    root,
    research,
    nested,
    a,
    b,
  ]);

  assert.deepEqual(index.get("Research"), {
    directFiles: 1,
    directFolders: 1,
    recursiveFiles: 2,
    recursiveFolders: 1,
  });
  assert.deepEqual(index.get("Research/Nested"), {
    directFiles: 1,
    directFolders: 0,
    recursiveFiles: 1,
    recursiveFolders: 0,
  });
});

test("keeps an index entry for empty folders", () => {
  const root = folder("");
  const empty = folder("Empty", [], root);
  const index = PluginClass.buildCountIndexFromLoadedFiles([root, empty]);

  assert.deepEqual(index.get("Empty"), {
    directFiles: 0,
    directFolders: 0,
    recursiveFiles: 0,
    recursiveFolders: 0,
  });
});

test("selects direct or recursive totals", () => {
  const counts = {
    directFiles: 2,
    directFolders: 1,
    recursiveFiles: 8,
    recursiveFolders: 4,
  };

  assert.deepEqual(PluginClass.selectCounts(counts, "direct"), {
    files: 2,
    folders: 1,
  });
  assert.deepEqual(PluginClass.selectCounts(counts, "recursive"), {
    files: 8,
    folders: 4,
  });
});

test("formats labels with non-breaking spaces inside each count", () => {
  const settings = { showFiles: true, showFolders: true };

  assert.equal(
    PluginClass.formatCountLabel({ files: 44, folders: 16 }, settings),
    "(44\u00a0files, 16\u00a0folders)",
  );
  assert.equal(
    PluginClass.formatCountLabel({ files: 1, folders: 1 }, settings),
    "(1\u00a0file, 1\u00a0folder)",
  );
});

test("can display only files or only folders", () => {
  assert.equal(
    PluginClass.formatCountLabel(
      { files: 3, folders: 2 },
      { showFiles: true, showFolders: false },
    ),
    "(3\u00a0files)",
  );
  assert.equal(
    PluginClass.formatCountLabel(
      { files: 3, folders: 2 },
      { showFiles: false, showFolders: true },
    ),
    "(2\u00a0folders)",
  );
});

test("normalizes missing and partial settings safely", () => {
  assert.deepEqual(PluginClass.normalizeSettings(null), {
    countMode: "recursive",
    showFiles: true,
    showFolders: true,
    showZeroCounts: true,
    shadeFolderInfo: true,
  });

  assert.deepEqual(
    PluginClass.normalizeSettings({ countMode: "direct", showFolders: false }),
    {
      countMode: "direct",
      showFiles: true,
      showFolders: false,
      showZeroCounts: true,
      shadeFolderInfo: true,
    },
  );
});

test("resolves folder paths from title and parent fallbacks", () => {
  const parent = {
    getAttribute(name) {
      return name === "data-path" ? "Research\\Nested" : null;
    },
  };
  const title = {
    dataset: {},
    getAttribute() {
      return null;
    },
    closest() {
      return parent;
    },
    parentElement: null,
  };

  assert.equal(PluginClass.resolveFolderPath(title), "Research/Nested");
});

test("formats an empty label when both count types are disabled", () => {
  assert.equal(
    PluginClass.formatCountLabel(
      { files: 3, folders: 2 },
      { showFiles: false, showFolders: false },
    ),
    "",
  );
});

test("can disable folder info shading", () => {
  assert.equal(
    PluginClass.normalizeSettings({ shadeFolderInfo: false }).shadeFolderInfo,
    false,
  );
});

test("CSS guarantees spacing behavior and 30 percent shading", () => {
  const css = fs.readFileSync("styles.css", "utf8");
  const source = fs.readFileSync("main.ts", "utf8");

  assert.match(css, /folder-info-count[\s\S]*margin:\s*0\s*!important/);
  assert.match(css, /folder-info-shaded[\s\S]*opacity:\s*0\.30/);
  assert.match(source, /NON_BREAKING_SPACE/);
  assert.match(source, /displayText = `\$\{NON_BREAKING_SPACE\}\$\{label\}`/);
});

test("source scans both native file explorer roots and all folder titles", () => {
  const source = fs.readFileSync("main.ts", "utf8");

  assert.match(source, /nav-files-container \.nav-folder-title/);
  assert.match(source, /workspace-leaf-content\[data-type=\\?"file-explorer\\?"\]/);
  assert.match(source, /getAllLoadedFiles/);
});

class FakeClassList {
  constructor(initial = []) {
    this.values = new Set(initial);
  }
  add(...names) {
    names.forEach((name) => this.values.add(name));
  }
  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }
  toggle(name, force) {
    if (force === true) this.values.add(name);
    else if (force === false) this.values.delete(name);
    else if (this.values.has(name)) this.values.delete(name);
    else this.values.add(name);
    return this.values.has(name);
  }
  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor(tagName = "div", classes = []) {
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1;
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.attributes = new Map();
    this.classList = new FakeClassList(classes);
    this._className = classes.join(" ");
    this.textContent = "";
  }
  get className() {
    return this._className;
  }
  set className(value) {
    this._className = String(value);
    this.classList = new FakeClassList(
      this._className.split(/\s+/).filter(Boolean),
    );
  }
  get childNodes() {
    return this.children;
  }
  get firstChild() {
    return this.children[0] ?? null;
  }
  appendChild(child) {
    if (child.parentElement) {
      child.parentElement.children = child.parentElement.children.filter(
        (candidate) => candidate !== child,
      );
    }
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  insertBefore(child, reference) {
    if (child.parentElement) {
      child.parentElement.children = child.parentElement.children.filter(
        (candidate) => candidate !== child,
      );
    }
    child.parentElement = this;
    const index = reference ? this.children.indexOf(reference) : -1;
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    return child;
  }
  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter(
      (child) => child !== this,
    );
    this.parentElement = null;
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "data-path") this.dataset.path = String(value);
  }
  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
  matches(selector) {
    if (selector.startsWith(".")) {
      return this.classList.contains(selector.slice(1));
    }
    return false;
  }
  querySelectorAll(selector) {
    if (selector.includes("input") || selector.includes("textarea") || selector.includes("contenteditable")) {
      return [];
    }

    const matches = [];
    const visit = (element) => {
      for (const child of element.children) {
        if (child.matches(selector)) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  closest(selector) {
    let cursor = this;
    while (cursor) {
      if (
        selector === ".nav-folder[data-path]" &&
        cursor.classList.contains("nav-folder") &&
        cursor.getAttribute("data-path") !== null
      ) {
        return cursor;
      }
      if (selector.startsWith(".") && cursor.classList.contains(selector.slice(1))) {
        return cursor;
      }
      cursor = cursor.parentElement;
    }
    return null;
  }
}

test("applyFolderInfo appends a spaced counter without moving the native folder name", () => {
  const previousHTMLElement = global.HTMLElement;
  const previousDocument = global.document;
  global.HTMLElement = FakeElement;
  global.document = { createElement: (tag) => new FakeElement(tag) };

  try {
    const title = new FakeElement("div", ["nav-folder-title"]);
    title.setAttribute("data-path", "Agent");
    const content = title.appendChild(
      new FakeElement("div", ["nav-folder-title-content"]),
    );
    content.textContent = "Agent";

    const plugin = Object.create(PluginClass.prototype);
    plugin.settings = {
      countMode: "recursive",
      showFiles: true,
      showFolders: true,
      showZeroCounts: true,
      shadeFolderInfo: true,
    };
    plugin.countIndex = new Map([
      [
        "Agent",
        {
          directFiles: 1,
          directFolders: 1,
          recursiveFiles: 1,
          recursiveFolders: 1,
        },
      ],
    ]);

    plugin.applyFolderInfo(title);

    assert.equal(title.children[0], content, "native title content must stay in place");
    assert.equal(title.children.length, 2);
    assert.equal(
      title.children[1].textContent,
      "\u00a0(1\u00a0file, 1\u00a0folder)",
    );
    assert.equal(title.classList.contains("folder-info-owned"), true);
    assert.equal(title.classList.contains("folder-info-shaded"), true);
  } finally {
    global.HTMLElement = previousHTMLElement;
    global.document = previousDocument;
  }
});

test("applyFolderInfo still decorates a visible folder missing from the count index", () => {
  const previousHTMLElement = global.HTMLElement;
  const previousDocument = global.document;
  global.HTMLElement = FakeElement;
  global.document = { createElement: (tag) => new FakeElement(tag) };

  try {
    const title = new FakeElement("div", ["nav-folder-title"]);
    title.setAttribute("data-path", "Mounted Folder");
    title.appendChild(new FakeElement("div", ["nav-folder-title-content"]));

    const plugin = Object.create(PluginClass.prototype);
    plugin.settings = {
      countMode: "recursive",
      showFiles: true,
      showFolders: true,
      showZeroCounts: true,
      shadeFolderInfo: true,
    };
    plugin.countIndex = new Map();

    plugin.applyFolderInfo(title);

    assert.equal(title.children.length, 2);
    assert.equal(
      title.children[1].textContent,
      "\u00a0(0\u00a0files, 0\u00a0folders)",
    );
  } finally {
    global.HTMLElement = previousHTMLElement;
    global.document = previousDocument;
  }
});


test("migrates v1.0.3 nested markup and leaves exactly one counter", () => {
  const previousHTMLElement = global.HTMLElement;
  const previousDocument = global.document;
  global.HTMLElement = FakeElement;
  global.document = { createElement: (tag) => new FakeElement(tag) };

  try {
    const title = new FakeElement("div", ["nav-folder-title", "folder-info-owned"]);
    title.setAttribute("data-path", "Aider");
    const content = title.appendChild(
      new FakeElement("div", ["nav-folder-title-content", "folder-info-content"]),
    );
    const legacyName = content.appendChild(
      new FakeElement("span", ["folder-info-name"]),
    );
    const nativeName = legacyName.appendChild(new FakeElement("span", ["native-name"]));
    nativeName.textContent = "Aider";
    const legacyCounter = content.appendChild(
      new FakeElement("span", ["folder-info-count"]),
    );
    legacyCounter.textContent = "(1 file, 0 folders)";

    const plugin = Object.create(PluginClass.prototype);
    plugin.settings = {
      countMode: "recursive",
      showFiles: true,
      showFolders: true,
      showZeroCounts: true,
      shadeFolderInfo: true,
    };
    plugin.countIndex = new Map([
      [
        "Aider",
        {
          directFiles: 1,
          directFolders: 0,
          recursiveFiles: 1,
          recursiveFolders: 0,
        },
      ],
    ]);

    plugin.applyFolderInfo(title);
    plugin.applyFolderInfo(title);

    const counters = title.querySelectorAll(".folder-info-count");
    assert.equal(counters.length, 1, "refreshes must never duplicate counters");
    assert.equal(counters[0].parentElement, title, "current counter must be a direct title child");
    assert.equal(counters[0].textContent, "\u00a0(1\u00a0file, 0\u00a0folders)");
    assert.equal(content.querySelectorAll(".folder-info-count").length, 0);
    assert.equal(content.querySelectorAll(".folder-info-name").length, 0);
    assert.equal(content.classList.contains("folder-info-content"), false);
    assert.equal(content.children[0], nativeName, "native name node must be restored");
  } finally {
    global.HTMLElement = previousHTMLElement;
    global.document = previousDocument;
  }
});

test("clearFolderInfo removes current and legacy counters idempotently", () => {
  const previousHTMLElement = global.HTMLElement;
  global.HTMLElement = FakeElement;

  try {
    const title = new FakeElement("div", ["nav-folder-title", "folder-info-owned", "folder-info-shaded"]);
    const content = title.appendChild(
      new FakeElement("div", ["nav-folder-title-content", "folder-info-content"]),
    );
    const legacyName = content.appendChild(new FakeElement("span", ["folder-info-name"]));
    const nativeName = legacyName.appendChild(new FakeElement("span", ["native-name"]));
    content.appendChild(new FakeElement("span", ["folder-info-count"]));
    title.appendChild(new FakeElement("span", ["folder-info-count"]));
    title.appendChild(new FakeElement("span", ["folder-info-count"]));

    const plugin = Object.create(PluginClass.prototype);
    plugin.clearFolderInfo(title);
    plugin.clearFolderInfo(title);

    assert.equal(title.querySelectorAll(".folder-info-count").length, 0);
    assert.equal(title.querySelectorAll(".folder-info-name").length, 0);
    assert.equal(content.classList.contains("folder-info-content"), false);
    assert.equal(content.children[0], nativeName);
    assert.equal(title.classList.contains("folder-info-owned"), false);
    assert.equal(title.classList.contains("folder-info-shaded"), false);
  } finally {
    global.HTMLElement = previousHTMLElement;
  }
});
