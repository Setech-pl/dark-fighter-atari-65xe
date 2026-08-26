import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { generateShowcase } from "../scripts/github-showcase.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const read = (relativePath) => fs.readFileSync(path.join(rootDirectory, relativePath));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(read("docs/media/manifest.json"));

function pngDimensions(bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(bytes.toString("ascii", 12, 16), "IHDR");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

test("showcase manifest binds every image to the current packed release", () => {
  assert.equal(manifest.formatVersion, 1);
  assert.equal(manifest.runtimeEvidence.xex.sha256, sha256(read("dist/dark-fighter.xex")));
  assert.equal(manifest.runtimeEvidence.atr.sha256, sha256(read("dist/dark-fighter.atr")));
  assert.equal(manifest.runtimeEvidence.wallTrace.sha256,
    sha256(read("docs/runtime-wall-trace.json")));
  assert.deepEqual([manifest.gameplay.length, manifest.assetSheets.length], [8, 4]);

  let totalBytes = 0;
  for (const item of [...manifest.gameplay, ...manifest.assetSheets]) {
    const bytes = read(item.path);
    assert.equal(bytes.length, item.bytes, `${item.path} byte count`);
    assert.equal(sha256(bytes), item.sha256, `${item.path} checksum`);
    assert.deepEqual(pngDimensions(bytes), [item.width, item.height], `${item.path} dimensions`);
    assert.ok(bytes.length < 1_000_000, `${item.path} should remain below 1 MB`);
    totalBytes += bytes.length;
  }
  assert.ok(totalBytes < 5_000_000, "showcase media should remain below 5 MB");
  for (const frame of manifest.gameplay) {
    assert.equal(frame.source_medium, "XEX");
    assert.equal(frame.emulator, "Atari800 7.1.2 PAL XL");
    assert.deepEqual([frame.width, frame.height], [320, 240]);
    assert.match(frame.source_sha256, /^[0-9a-f]{64}$/);
  }
});

test("showcase and asset sheets regenerate without ignored capture files", () => {
  const first = generateShowcase();
  const firstBytes = first.assetSheets.map(({ path: relativePath }) => read(relativePath));
  const second = generateShowcase();
  const secondBytes = second.assetSheets.map(({ path: relativePath }) => read(relativePath));
  assert.deepEqual(first, second);
  assert.deepEqual(firstBytes, secondBytes);
  assert.deepEqual(first.assetSheets.map(({ sha256: checksum }) => checksum),
    manifest.assetSheets.map(({ sha256: checksum }) => checksum));
  assert.ok(first.assetSheets.every(({ sources }) => sources.length > 0));
});

test("public README is English, complete, and free of stale status language", () => {
  const readme = read("README.md").toString("utf8");
  const prose = readme.replace(/\s+/g, " ");
  const requiredHeadings = [
    "# Dark Fighter",
    "## Gameplay gallery",
    "## The story",
    "## What you can play now",
    "## Engineering an Atari game today",
    "## Development workflow",
    "### Git and SDLC",
    "## Art direction and asset sets",
    "## Build and play",
    "## Current release and continuing development",
    "## Credits and disclaimer",
  ];
  for (const heading of requiredHeadings) assert.ok(readme.includes(heading), heading);
  assert.match(readme, /Dark Fighter began in 1990/);
  assert.match(prose, /5¼-inch floppy disks using an Atari computer and SIO2SD/);
  assert.match(prose, /completed a full playable release with AI-assisted engineering/);
  assert.match(prose, /The tools changed\. The target did not/);
  assert.match(prose, /return to programming for the joy of making a machine do/);
  assert.match(prose, /commit and push happen only after owner acceptance/);
  assert.doesNotMatch(readme,
    /\bMVP\b|vertical[ -]slice|\bslice\b|proof[ -]of[ -]concept|\bPoC\b|\bprototype\b/i);
  assert.doesNotMatch(readme, /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/);
  for (const image of readme.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
    assert.notEqual(image[1].trim(), "", `missing alt text for ${image[2]}`);
  }
});

test("README links resolve and Mermaid blocks match their editable English sources", () => {
  const readme = read("README.md").toString("utf8");
  for (const link of readme.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = decodeURIComponent(link[1].split("#", 1)[0]);
    if (target === "" || /^[a-z]+:/i.test(target)) continue;
    assert.ok(fs.existsSync(path.resolve(rootDirectory, target)), `broken README link: ${target}`);
  }

  const blocks = [...readme.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((match) => match[1].trim());
  const diagrams = [
    read("docs/diagrams/development-workflow.mmd").toString("utf8").trim(),
    read("docs/diagrams/git-feature-lifecycle.mmd").toString("utf8").trim(),
  ];
  assert.deepEqual(blocks, diagrams);
  for (const diagram of diagrams) {
    assert.match(diagram, /^flowchart LR\n/);
    assert.doesNotMatch(diagram, /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/);
    assert.equal((diagram.match(/\[/g) ?? []).length, (diagram.match(/\]/g) ?? []).length);
  }
  assert.doesNotMatch(read("scripts/github-showcase.mjs").toString("utf8"),
    /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/);
});
