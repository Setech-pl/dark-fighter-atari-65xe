import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  createGameplayPreview,
  createStartMenuPreview,
  inspectPng,
  readFrontendGraphicsSource,
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

test("start-menu preview is deterministic, 640x384, and source-derived", () => {
  const frontend = readFrontendGraphicsSource(source);
  assert.deepEqual(
    frontend.mainMenuRecords.filter(({ mode }) => mode === 6).map(({ text }) => text),
    ["START GAME", "OPTIONS", "TOP SCORES", "EXIT"],
  );
  assert.equal(frontend.mainMenuRecords.at(-1).text, "UP/DOWN MOVE  FIRE SELECT");
  assert.equal(frontend.mainMenuRecords[0].text, "DARK FIGHTER");
  assert.equal(frontend.mainMenuRecords[0].mode, 7);
  assert.equal(frontend.mainMenuRecords.at(-1).mode, 2);
  assert.equal(frontend.mainMenuRecords.some(({ text }) => text.includes("SETECH")), false);
  assert.equal(frontend.defaultSelection, 0);

  const first = createStartMenuPreview(source);
  const second = createStartMenuPreview(source);
  assert.deepEqual(first, second);
  assert.deepEqual(
    [inspectPng(first).width, inspectPng(first).height],
    [PREVIEW_WIDTH, PREVIEW_HEIGHT],
  );
  assert.deepEqual([PREVIEW_WIDTH, PREVIEW_HEIGHT], [640, 384]);

  const changedLabel = replaceOnce(source, '.byte "START GAME",0', '.byte "START GAMA",0');
  assert.notDeepEqual(createStartMenuPreview(changedLabel), first);
  const changedTitle = replaceOnce(
    source,
    ".byte $78,$CC,$CC,$FC,$CC,$CC,$CC ; A",
    ".byte $70,$CC,$CC,$FC,$CC,$CC,$CC ; A",
  );
  assert.notDeepEqual(createStartMenuPreview(changedTitle), first);
  const changedHangar = replaceOnce(
    source,
    "MAIN_MENU_HANGAR_OUTER_LAST = 20",
    "MAIN_MENU_HANGAR_OUTER_LAST = 19",
  );
  assert.notDeepEqual(createStartMenuPreview(changedHangar), first);
  const changedCraft = replaceOnce(
    source,
    "player_shape:\n    .byte %00011000",
    "player_shape:\n    .byte %00010000",
  );
  assert.notDeepEqual(createStartMenuPreview(changedCraft), first);
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
  assert.equal(graphics.frontendHardwareState.get("COLPF3"), 0xd8);
  assert.match(
    source.slice(source.indexOf("init_screen:"), source.indexOf("; -----------------------------------------------------------------------------\n; Player and input")),
    /sbc #\$20\s+sta SCREEN,x/,
    "runtime HUD placement must stay aligned with the canonical gameplay preview",
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
