import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function readText(path) {
  return readFileSync(join(root, path), "utf8");
}

function listTextFiles(dir = root) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    if ([".git", "node_modules", "icons"].includes(entry)) {
      continue;
    }

    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      files.push(...listTextFiles(path));
    } else if (!/\.(png|jpg|jpeg|webp|gif|ico)$/i.test(entry)) {
      files.push(path);
    }
  }

  return files;
}

test("manifest uses only the requested permissions and no host permissions", () => {
  const manifest = readJson("manifest.json");

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "storage", "downloads"]);
  assert.deepEqual(manifest.host_permissions, []);
});

test("runtime capture code avoids network, navigation, and automation APIs", () => {
  const runtimeSource = [
    "popup.js",
    "contentScript.js",
    "parser.js",
    "storage.js",
    "csv.js"
  ].map(readText).join("\n");

  assert.doesNotMatch(runtimeSource, /fetch\s*\(/);
  assert.doesNotMatch(runtimeSource, /XMLHttpRequest/);
  assert.doesNotMatch(runtimeSource, /chrome\.tabs\.create/);
  assert.doesNotMatch(runtimeSource, /window\.open/);
  assert.doesNotMatch(runtimeSource, /location\.(assign|replace)/);
  assert.doesNotMatch(runtimeSource, /\.click\s*\(/);
  assert.doesNotMatch(runtimeSource, /document\.cookie/);
});

test("README includes public release sections", () => {
  const readme = readText("README.md");
  const requiredSections = [
    "## Why This Exists",
    "## What It Does",
    "## What It Does Not Do",
    "## Screenshots",
    "## Installation For Users",
    "## Usage",
    "## Privacy",
    "## Responsible Use",
    "## Permissions Explained",
    "## Development",
    "## Project Structure",
    "## Testing",
    "## Manual QA Checklist",
    "## Release Checklist",
    "## Roadmap",
    "## Contributing",
    "## Security",
    "## License"
  ];

  for (const section of requiredSections) {
    assert.match(readme, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("repository text does not include external web URLs", () => {
  for (const file of listTextFiles()) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /https?:\/\//, file);
  }
});
