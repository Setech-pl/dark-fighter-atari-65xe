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
  assert.deepEqual(
    [manifest.gameplay.length, manifest.assetSheets.length, manifest.concepts.length],
    [9, 4, 2],
  );

  let totalBytes = 0;
  for (const item of [...manifest.gameplay, ...manifest.assetSheets]) {
    const bytes = read(item.path);
    assert.equal(bytes.length, item.bytes, `${item.path} byte count`);
    assert.equal(sha256(bytes), item.sha256, `${item.path} checksum`);
    assert.deepEqual(pngDimensions(bytes), [item.width, item.height], `${item.path} dimensions`);
    assert.ok(bytes.length < 1_000_000, `${item.path} should remain below 1 MB`);
    totalBytes += bytes.length;
  }
  totalBytes += manifest.concepts.reduce((sum, { bytes }) => sum + bytes, 0);
  assert.ok(totalBytes < 5_000_000, "showcase media should remain below 5 MB");
  for (const frame of manifest.gameplay) {
    assert.equal(frame.source_medium, "XEX");
    assert.equal(frame.emulator, "Atari800 7.1.2 PAL XL");
    assert.deepEqual([frame.width, frame.height], [320, 240]);
    assert.match(frame.source_sha256, /^[0-9a-f]{64}$/);
  }
  const spread = manifest.gameplay.find(({ path: relativePath }) =>
    relativePath.endsWith("09-spread-shot-active.png"));
  assert.ok(spread, "showcase must include an authentic Spread Shot Atari800 frame");
  assert.equal(spread.source, "build/runtime-wall-trace/weapon-pickup-spread-projectiles-atari800.png");
  assert.equal(spread.frame,
    JSON.parse(read("docs/runtime-wall-trace.json")).coverage
      .weapon_pickup_spread_shot.screenshot.capture_frame);
});

test("showcase and asset sheets regenerate without ignored capture files", () => {
  const conceptBytes = manifest.concepts.map(({ path: relativePath }) => read(relativePath));
  const first = generateShowcase();
  const firstBytes = first.assetSheets.map(({ path: relativePath }) => read(relativePath));
  const second = generateShowcase();
  const secondBytes = second.assetSheets.map(({ path: relativePath }) => read(relativePath));
  assert.deepEqual(first, second);
  assert.deepEqual(firstBytes, secondBytes);
  assert.deepEqual(manifest.concepts.map(({ path: relativePath }) => read(relativePath)), conceptBytes);
  assert.deepEqual(first.assetSheets.map(({ sha256: checksum }) => checksum),
    manifest.assetSheets.map(({ sha256: checksum }) => checksum));
  assert.ok(first.assetSheets.every(({ sources }) => sources.length > 0));
});

test("owner-supplied concept art is preserved and never classified as gameplay", () => {
  const gameplayPaths = new Set(manifest.gameplay.map(({ path: relativePath }) => relativePath));
  assert.deepEqual(manifest.concepts.map(({ path: relativePath }) => relativePath), [
    "docs/media/concepts/dark-fighter-concept-from-floppy-to-stars.jpg",
    "docs/media/concepts/dark-fighter-concept-gauntlet-run.jpg",
  ]);
  for (const concept of manifest.concepts) {
    const bytes = read(concept.path);
    assert.equal(bytes.length, concept.bytes, `${concept.path} byte count`);
    assert.equal(sha256(bytes), concept.sha256, `${concept.path} checksum`);
    assert.equal(concept.classification, "owner-supplied AI-assisted concept art");
    assert.equal(concept.runtime_capture, false);
    assert.equal(concept.deterministic_runtime_capture, false);
    assert.match(concept.caption, /Concept art/);
    assert.match(concept.caption, /Not an in-game screenshot/);
    assert.equal(gameplayPaths.has(concept.path), false);
    assert.equal("source_medium" in concept, false);
    assert.equal("emulator" in concept, false);
  }
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
  assert.match(readme,
    /Concept art — From Floppy to the Stars[\s\S]*Not an in-game screenshot\./);
  assert.match(readme, /Concept art — Gauntlet Run[\s\S]*Not an in-game screenshot\./);
  assert.ok(readme.indexOf("dark-fighter-concept-from-floppy-to-stars.jpg") >
    readme.indexOf("## The story"));
  assert.ok(readme.indexOf("dark-fighter-concept-from-floppy-to-stars.jpg") <
    readme.indexOf("## What you can play now"));
  assert.ok(readme.indexOf("dark-fighter-concept-gauntlet-run.jpg") >
    readme.indexOf("### Art direction and concepts"));
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
