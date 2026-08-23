import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createCapitalHullsStripPreview,
  createFighterBurstRuntimeTrace,
  createFighterWeaponTransitionTrace,
  createSharedFighterExplosionPreview,
  createSharedFighterExplosionTrace,
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  createGameplayPreview,
  createStartMenuPreview,
  inspectPng,
  readFrontendGraphicsSource,
  readGameGraphicsSource,
} from "../scripts/preview.mjs";
import { loadCapitalHullsDefinition } from "../scripts/capital-hulls.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const capitalHullsDefinition = loadCapitalHullsDefinition(
  path.join(rootDirectory, "assets", "graphics", "capital-hulls.json"),
);

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

test("gameplay preview has the expected enlarged mixed-mode dimensions", () => {
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
  assert.deepEqual(
    [graphics.alliedHullRows.length, graphics.enemyHullRows.length],
    [32, 32],
  );
  assert.equal(graphics.playerShape.length, 16);
  assert.deepEqual(
    ["COLBK", "COLPF0", "COLPF1", "COLPF2", "COLPF3", "COLPM0", "COLPM1", "COLPM2", "COLPM3"].map(
      (name) => graphics.hardwareState.get(name),
    ),
    [0x00, 0x0e, 0x84, 0x1e, 0x46, 0x0e, 0x44, 0x46, 0x28],
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
      "player_shape:\n    .byte %00011000",
      "player_shape:\n    .byte %00010000",
    ),
    replaceOnce(
      source,
      "GAMEPLAY_COLPF1 = $84",
      "GAMEPLAY_COLPF1 = $C4",
    ),
  ];

  for (const variant of variants) {
    assert.notDeepEqual(createGameplayPreview(variant), canonical);
  }

  const changedHulls = structuredClone(capitalHullsDefinition);
  changedHulls.glyphs[0].pixels[0] = "1222";
  assert.notDeepEqual(createGameplayPreview(source, changedHulls), canonical);
});

test("capital-hulls strip preview is deterministic and shows all 32 rows", () => {
  const first = createCapitalHullsStripPreview(source, capitalHullsDefinition);
  const second = createCapitalHullsStripPreview(source, capitalHullsDefinition);
  assert.deepEqual(first, second);
  const info = inspectPng(first);
  assert.deepEqual([info.width, info.height], [640, 512]);
});

test("fighter burst trace is runtime-derived for both weapons and records the Viper hit", () => {
  const trace = createFighterBurstRuntimeTrace(source, capitalHullsDefinition);
  const lines = trace.trimEnd().split("\n");
  assert.equal(lines[0], [
    "weapon", "frame", "source_slot", "burst_state", "shot_index",
    "burst_interval", "post_burst_timer", "allocation_result", "projectile_slot",
    "previous_x", "previous_y", "current_x", "current_y", "visible_width",
    "visible_height", "colour_source", "colour_value", "collision_result",
    "viper_energy_before", "viper_energy_after",
  ].join(","));
  assert.ok(lines.some((line) => line.startsWith("VIPER,") && line.includes(",ALLOCATED,")));
  assert.ok(lines.some((line) => line.startsWith("RAIDER,") && line.includes(",ALLOCATED,")));
  assert.ok(lines.some((line) => line.startsWith("RAIDER,") && line.includes(",VIPER_HIT,100,90")));
  assert.ok(lines.some((line) => line.startsWith("VIPER,") && line.includes(",COLPF2,$1E,")));
  assert.ok(lines.some((line) => line.startsWith("RAIDER,") && line.includes(",COLPF3,$46,")));
});

test("weapon-transition trace covers every PAL frame and preserves held/fresh fire through exit", () => {
  const trace = createFighterWeaponTransitionTrace(source, capitalHullsDefinition);
  const lines = trace.trimEnd().split("\n");
  assert.equal(lines.length, 1 + 181 * 3);
  const records = lines.slice(1).map((line) => {
    const fields = line.split(",");
    return { line, scenario: fields[0], frame: Number(fields[1]), phase: fields[4],
      interpretation: fields[10], calls: Number(fields[11]), allocation: fields[20] };
  });
  assert.ok(records.every(({ calls }) => calls === 1));
  const heldControl = records.filter(({ scenario, allocation }) =>
    scenario === "ORDINARY_HELD_CONTROL" && allocation === "ALLOCATED").map(({ frame }) => frame);
  const heldTransition = records.filter(({ scenario, allocation }) =>
    scenario === "TRANSITION_HELD" && allocation === "ALLOCATED").map(({ frame }) => frame);
  assert.deepEqual(heldTransition, heldControl,
    "sector phases must not add silence beyond the canonical burst cadence");
  assert.ok(records.some(({ scenario, phase, allocation }) =>
    scenario === "TRANSITION_HELD" && phase === "DRAIN" && allocation === "ALLOCATED"));
  for (const frame of [20, 95, 100]) {
    assert.ok(records.some((record) => record.scenario === "TRANSITION_FRESH" &&
      record.frame === frame && record.interpretation === "FRESH_PRESS" &&
      record.allocation === "ALLOCATED"));
  }
});

test("shared fighter-explosion preview and trace use all six runtime phases", () => {
  const first = createSharedFighterExplosionPreview(source, capitalHullsDefinition);
  const second = createSharedFighterExplosionPreview(source, capitalHullsDefinition);
  assert.deepEqual(first, second);
  assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [672, 160]);
  const trace = createSharedFighterExplosionTrace(source, capitalHullsDefinition);
  const lines = trace.trimEnd().split("\n");
  assert.equal(lines.length, 49);
  for (const owner of ["VIPER", "RAIDER"]) {
    const frames = lines.filter((line) => line.startsWith(`${owner},`))
      .map((line) => Number(line.split(",")[2]));
    assert.deepEqual(frames,
      [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
        3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5]);
  }
});
