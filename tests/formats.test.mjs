import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { atrConstants, parseAtr, parseXex, validateBuildDirectory } from "../scripts/formats.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const packageDefinition = JSON.parse(fs.readFileSync(path.join(rootDirectory, "package.json"), "utf8"));

test("generated artifact set is internally consistent", () => {
  const { manifest } = validateBuildDirectory(rootDirectory);
  assert.equal(manifest.gameVersion, packageDefinition.version);
  assert.equal(manifest.target, "Atari 65XE PAL / 64 KB");
  assert.ok(manifest.payloadBytes > 6);
  assert.ok(manifest.bootSectors >= 1 && manifest.bootSectors <= 255);
});

test("XEX contains a payload segment and RUNAD", () => {
  const xex = fs.readFileSync(path.join(rootDirectory, "dist", "dark-fighter.xex"));
  const { segments } = parseXex(xex);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].start, 0x2000);
  assert.deepEqual([segments[1].start, segments[1].end], [0x02e0, 0x02e1]);
});

test("ATR uses standard single-density geometry", () => {
  const atr = fs.readFileSync(path.join(rootDirectory, "dist", "dark-fighter.atr"));
  const parsed = parseAtr(atr);
  assert.equal(parsed.magic, atrConstants.magic);
  assert.equal(parsed.sectorSize, 128);
  assert.equal(parsed.body.length, 720 * 128);
  assert.equal(atr.length, 92176);
});
