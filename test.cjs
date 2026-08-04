"use strict";

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

class MockTFile {
  constructor(path) {
    this.path = path;
  }
}

class MockTFolder {
  constructor(path, children = []) {
    this.path = path;
    this.children = children;
  }
}

const originalLoad = Module._load;
Module._load = function mockedLoad(request, parent, isMain) {
  if (request === "obsidian") {
    return {
      Plugin: class Plugin {},
      PluginSettingTab: class PluginSettingTab {},
      Setting: class Setting {},
      TFile: MockTFile,
      TFolder: MockTFolder,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const PluginClass = require("./main.js");
Module._load = originalLoad;

test("builds direct and recursive counts in one tree traversal", () => {
  const nested = new MockTFolder("Research/Nested", [
    new MockTFile("Research/Nested/B.md"),
    new MockTFile("Research/Nested/C.pdf"),
  ]);
  const research = new MockTFolder("Research", [
    new MockTFile("Research/A.md"),
    nested,
  ]);
  const root = new MockTFolder("", [research, new MockTFile("Root.md")]);

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

test("formats plural and singular labels", () => {
  const settings = {
    showFiles: true,
    showFolders: true,
  };

  assert.equal(
    PluginClass.formatCountLabel({ files: 44, folders: 16 }, settings),
    "(44 files, 16 folders)",
  );
  assert.equal(
    PluginClass.formatCountLabel({ files: 1, folders: 1 }, settings),
    "(1 file, 1 folder)",
  );
});

test("can display only files or only folders", () => {
  assert.equal(
    PluginClass.formatCountLabel(
      { files: 3, folders: 2 },
      { showFiles: true, showFolders: false },
    ),
    "(3 files)",
  );
  assert.equal(
    PluginClass.formatCountLabel(
      { files: 3, folders: 2 },
      { showFiles: false, showFolders: true },
    ),
    "(2 folders)",
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

test("CSS shades counters only when the setting class is present", () => {
  const fs = require("node:fs");
  const css = fs.readFileSync("styles.css", "utf8");

  assert.match(css, /folder-info-count[\s\S]*color:\s*inherit/);
  assert.match(css, /folder-info-shaded \.folder-info-count[\s\S]*color:\s*var\(--text-muted\)/);
});
