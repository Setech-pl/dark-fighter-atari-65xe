import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  createGameplayPreview,
  inspectPng,
  readGameGraphicsSource,
} from "../scripts/preview.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");

function replaceOnce(text, original, replacement) {
  const first = text.indexOf(original);
  assert.notEqual(first, -1, `missing source fixture: ${original}`);
  assert.equal(text.indexOf(original, first + original.length), -1, `ambiguous source fixture: ${original}`);
  return `${text.slice(0, first)}${replacement}${text.slice(first + original.length)}`;
}

test("gameplay preview is a structurally valid RGB PNG", () => {
  const png = createGameplayPreview(source);
  const info = inspectPng(png);

  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(info.bitDepth, 8);
  assert.equal(info.colorType, 2);
  assert.deepEqual(info.chunkTypes, ["IHDR", "IDAT", "IEND"]);
});

test("gameplay preview has the expected enlarged ANTIC 4 dimensions", () => {
  const info = inspectPng(createGameplayPreview(source));
  assert.equal(info.width, PREVIEW_WIDTH);
  assert.equal(info.height, PREVIEW_HEIGHT);
  assert.deepEqual([info.width, info.height], [640, 384]);
});

test("gameplay preview output is byte-for-byte deterministic", () => {
  const first = createGameplayPreview(source);
  const second = createGameplayPreview(source);
  assert.deepEqual(first, second);
});

test("preview consumes the canonical charset, screen, PMG, and palette source", () => {
  const graphics = readGameGraphicsSource(source);
  assert.equal(graphics.charset.length, 1024);
  assert.equal(graphics.corridorLeftTiles.length, 48);
  assert.equal(graphics.playerShape.length, 16);
  assert.deepEqual(
    ["COLBK", "COLPF0", "COLPF1", "COLPF2", "COLPF3", "COLPM0", "COLPM1", "COLPM2", "COLPM3"].map(
      (name) => graphics.hardwareState.get(name),
    ),
    [0x00, 0x0e, 0x84, 0x28, 0x46, 0x0e, 0x0c, 0x46, 0x28],
  );

  const canonical = createGameplayPreview(source);
  const variants = [
    replaceOnce(
      source,
      ".byte $AA,$AA,$AA,$AA,$AA,$AA,$AA,$AA",
      ".byte $A9,$AA,$AA,$AA,$AA,$AA,$AA,$AA",
    ),
    replaceOnce(
      source,
      ".byte CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_SOLID, CH_PANEL_EDGE,   CH_PANEL_FRAME,  CH_PANEL_TRUSS",
      ".byte CH_SPACE,       CH_PANEL_STRIPE|$80, CH_PANEL_SOLID, CH_PANEL_EDGE,   CH_PANEL_FRAME,  CH_PANEL_TRUSS",
    ),
    replaceOnce(
      source,
      "player_shape:\n    .byte %00011000",
      "player_shape:\n    .byte %00010000",
    ),
    replaceOnce(
      source,
      "lda #$84                    ; worn steel-blue structures",
      "lda #$C4                    ; worn steel-blue structures",
    ),
  ];

  for (const variant of variants) {
    assert.notDeepEqual(createGameplayPreview(variant), canonical);
  }
});
