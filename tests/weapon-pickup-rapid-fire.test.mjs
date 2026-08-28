import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  compileEntityEffects,
  loadEntityEffectsDefinition,
  renderEntityEffectsCa65Include,
} from "../scripts/entity-effects.mjs";
import {
  compileFighterWeapons,
  loadFighterWeaponsDefinition,
} from "../scripts/fighter-weapons.mjs";
import { compileEnemyRoster, loadEnemyRosterDefinition } from "../scripts/enemy-roster.mjs";
import {
  assertWeaponPickupTraceParity,
  executeHudPresentationTrace,
  executeWeaponBoosterHudTrace,
  executeWeaponPickupCauseTrace,
  executeWeaponPickupBackingTrace,
  executeWeaponPickupCollisionTrace,
  executeWeaponPickupLifecycleTrace,
  executeWeaponPickupTrace,
  executeViperBurstBalanceTrace,
  executeViperProjectileColourTrace,
  executeViperProjectileColourLifecycleTrace,
  weaponPickupTraceCsv,
} from "../scripts/weapon-pickup-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entityPath = path.join(root, "assets", "graphics", "entity-effects.json");
const weaponPath = path.join(root, "assets", "graphics", "fighter-weapons.json");
const rosterPath = path.join(root, "assets", "graphics", "enemy-roster.json");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));

function assets() {
  const entities = compileEntityEffects(loadEntityEffectsDefinition(entityPath));
  const roster = compileEnemyRoster(loadEnemyRosterDefinition(rosterPath));
  return {
    entities,
    weapons: compileFighterWeapons(loadFighterWeaponsDefinition(weaponPath), roster),
  };
}

test("Rapid Fire owns fixed slot one without extending BSS or physical pools", () => {
  const { entities } = assets();
  assert.deepEqual([
    entities.pools.interactiveSlots, entities.pools.interactiveActiveLimit,
    entities.pools.effectSlots, entities.pools.effectActiveLimit,
    entities.pools.stateAddress, entities.pools.stateBytes,
  ], [4, 2, 6, 5, 0x8000, 0x100]);
  assert.deepEqual(entities.weaponPickupRapidFire, {
    slot: 1,
    qualifiedKillsPerDrop: 3,
    pendingFrames: 30,
    movementNumerator: 1,
    movementDenominator: 2,
    safeTopScanline: 40,
    safeBottomScanline: 152,
    widthHpos: 8,
    heightScanlines: 16,
    glyphs: [
      [42, 191, 131, 140, 140, 131, 140, 140],
      [168, 254, 194, 206, 206, 194, 206, 206],
      [131, 140, 140, 140, 140, 140, 191, 42],
      [194, 206, 206, 206, 206, 206, 254, 168],
    ],
    palette: {
      outlineRegister: "COLPF1", outlineValue: 0x84,
      fillRegister: "COLPF2", fillValue: 0x1e,
      letterRegister: "COLBK", letterValue: 0x00,
    },
  });
  assert.equal(manifest.entityEffects.stateBytes, 256);
  assert.equal(manifest.entityEffects.interactiveSlots, 4);
  assert.equal(manifest.entityEffects.effectSlots, 6);
  assert.equal(manifest.entityEffects.weaponPickupGlyphIndex, 120);
  assert.equal(manifest.entityEffects.weaponPickupGlyphCount, 4);
  assert.equal(manifest.entityEffects.glyphCount, 18);
  assert.equal(128 - manifest.entityEffects.glyphIndex - manifest.entityEffects.glyphCount, 0);
});

test("four dense R/F glyphs cut tall black letters from a static 2x2 capsule", () => {
  const { entities } = assets();
  assert.equal(entities.pickupGlyphs.length, 32);
  const glyphRows = [...entities.pickupGlyphs].map((row) =>
    [6, 4, 2, 0].map((shift) => row >> shift & 3));
  const selectors = glyphRows.flat();
  assert.ok(selectors.filter(Boolean).length >= 80);
  assert.deepEqual([...new Set(selectors)].sort(), [0, 2, 3]);
  assert.equal(selectors.includes(1), false, "pickup must contain no white COLPF0 pixels");
  const symbols = glyphRows.map((row) => row.map((selector) => "#?sy"[selector]).join(""));
  assert.deepEqual(symbols.slice(0, 8), [
    "#sss", "syyy", "s##y", "s#y#", "s#y#", "s##y", "s#y#", "s#y#",
  ]);
  assert.deepEqual(symbols.slice(8, 16), [
    "sss#", "yyys", "y##s", "y#ys", "y#ys", "y##s", "y#ys", "y#ys",
  ]);
  assert.deepEqual(symbols.slice(16, 24), [
    "s##y", "s#y#", "s#y#", "s#y#", "s#y#", "s#y#", "syyy", "#sss",
  ]);
  assert.deepEqual(symbols.slice(24), [
    "y##s", "y#ys", "y#ys", "y#ys", "y#ys", "y#ys", "yyys", "sss#",
  ]);
  const include = renderEntityEffectsCa65Include(entities);
  assert.match(include, /WEAPON_PICKUP_GLYPH_COUNT = 4/);
  assert.doesNotMatch(include, /WEAPON_PICKUP_PHASE_FRAMES/);
  assert.match(source, /WEAPON_PICKUP_GLYPH_BASE = EFFECT_FRAGMENT_GLYPH_BASE\+EFFECT_FRAGMENT_GLYPH_COUNT/);
  assert.deepEqual(entities.weaponPickupRapidFire.palette, {
    outlineRegister: "COLPF1", outlineValue: 0x84,
    fillRegister: "COLPF2", fillValue: 0x1e,
    letterRegister: "COLBK", letterValue: 0x00,
  });
  const renderer = source.slice(source.indexOf("render_weapon_pickup_overlay:"),
    source.indexOf("; Effects render after"));
  assert.doesNotMatch(renderer, /ENTITY_OWNER\+WEAPON_PICKUP_SLOT|WEAPON_PICKUP_PHASE/);
  assert.match(renderer,
    /lda ENTITY_RENDER_ID\+WEAPON_PICKUP_SLOT[\s\S]+adc #\$01/);
  assert.match(renderer,
    /jsr advance_dst_to_next_ring_row[\s\S]+lda ENTITY_RENDER_ID\+WEAPON_PICKUP_SLOT[\s\S]+adc #\$02/);
  assert.doesNotMatch(renderer, /@render_pickup_pair/);
});

test("release XEX and ATR execute 0→1→2→pending only for consumed Viper kills", () => {
  const xex = executeWeaponPickupTrace({ root, artifact: "xex" });
  const atr = executeWeaponPickupTrace({ root, artifact: "atr" });
  assert.equal(assertWeaponPickupTraceParity(xex, atr), true);
  const kills = xex.records.filter(({ phase }) => phase.startsWith("KILL_"));
  assert.deepEqual(kills.map((record) => [
    record.damageSource, record.projectileConsumed, record.qualifiedKillCounter,
    record.state, record.timer, record.scoreHi, record.scoreLo,
  ]), [
    [0, true, 1, 0, 0, 0, 0x10],
    [0, true, 2, 0, 0, 0, 0x20],
    [0, true, 0, 1, 32, 0, 0x30],
  ]);
  assert.equal(kills.every(({ activeMask, activeCount }) =>
    activeMask === 0 && activeCount === 0), true);
});

test("non-projectile causes and repeated resolution never advance the drop counter", () => {
  const causes = executeWeaponPickupCauseTrace({ root, artifact: "xex" });
  assert.deepEqual(causes.map(({ source, first, second }) => [
    source, first.qualifiedKillCounter, second.qualifiedKillCounter,
    first.state, second.state,
  ]), [
    [1, 1, 1, 0, 0], [2, 1, 1, 0, 0], [3, 1, 1, 0, 0],
    [4, 1, 1, 0, 0], [5, 1, 1, 0, 0],
  ]);
  assert.deepEqual(causes.map(({ first }) => first.scoreLo), [0x10, 0x10, 0, 0, 0]);
});

test("pending is hidden and non-colliding for thirty full frames after Raider breakup", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "xex" });
  const pending = trace.records.filter(({ phase }) => phase === "PENDING");
  assert.equal(pending.length, 30);
  assert.equal(pending.every((record) => record.state === 1 &&
    (record.activeMask & 2) === 0 && record.drawnMask === 0 &&
    record.screenAddress === 0 && record.leftCode === 0 && record.rightCode === 0), true);
  assert.deepEqual([pending[0].timer, pending.at(-1).timer], [30, 1]);
  const firstActive = trace.records.find(({ phase }) => phase === "ACTIVE");
  assert.deepEqual([
    firstActive.state, firstActive.activeMask, firstActive.activeCount,
    firstActive.effectActiveMask, firstActive.effectActiveCount,
  ], [2, 2, 1, 0, 0], "Raider fragments must expire before the capsule is shown");
});

test("active capsule renders one static 2x2 code block continuously and cannot be shot", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "xex" });
  const active = trace.records.filter(({ phase }) => phase === "ACTIVE");
  assert.equal(active.length, 40);
  assert.equal(active.slice(0, 32).every(({
    leftCode, rightCode, bottomLeftCode, bottomRightCode, renderId, drawnMask,
  }) => leftCode === 120 && rightCode === 121 && bottomLeftCode === 122 &&
    bottomRightCode === 123 && renderId === 120 && drawnMask === 15), true);
  assert.equal(active.every(({
    leftCode, rightCode, bottomLeftCode, bottomRightCode, animationFrame, drawnMask,
  }) => leftCode === 120 && rightCode === 121 && bottomLeftCode === 122 &&
    bottomRightCode === 123 && animationFrame === 0 && drawnMask === 15), true);
  assert.ok(new Set(active.map(({ y }) => y)).size >= 6,
    "static RF codes must remain continuously drawn while the capsule moves");
  const ignored = trace.records.find(({ phase }) => phase === "PROJECTILE_IGNORED");
  assert.deepEqual([
    ignored.state, ignored.activeMask, ignored.projectileActiveCount,
  ], [2, 2, 1]);
});

test("pickup movement inherits the native A2 near-ring cadence without catch-up", () => {
  const { entities } = assets();
  assert.deepEqual([
    entities.weaponPickupRapidFire.movementNumerator,
    entities.weaponPickupRapidFire.movementDenominator,
    entities.debrisMotion.verticalStepNumerator,
    entities.debrisMotion.verticalStepDenominator,
  ], [1, 2, 3, 5]);
  assert.match(source,
    /update_weapon_pickup_active:[\s\S]+@motion:[\s\S]+lda STAR_NEAR_PHASE[\s\S]+lda ENTITY_FRAME_EVENTS[\s\S]+adc #ENTITY_DEBRIS_VY/);
  assert.doesNotMatch(source,
    /update_weapon_pickup_active:[\s\S]+@motion:[\s\S]+WEAPON_PICKUP_MOVE_NUMERATOR/);
  const active = executeWeaponPickupTrace({ root, artifact: "xex" }).records
    .filter(({ phase }) => phase === "ACTIVE");
  const changes = active.slice(1).filter((record, index) => record.y !== active[index].y);
  assert.ok(changes.length >= 2 && changes.every((record) =>
    record.y - active[0].y > 0 && (record.y - active[0].y) % 8 === 0));
});

test("debris and the reserved pickup coexist without allocator overwrite for every A2 head", () => {
  for (let head = 0; head < 22; head += 1) {
    const trace = executeWeaponPickupTrace({ root, artifact: "xex", head, coexistDebris: true });
    const firstActive = trace.records.find(({ phase }) => phase === "ACTIVE");
    assert.deepEqual([firstActive.activeMask, firstActive.activeCount], [3, 2]);
    const logicalRow = Math.floor((firstActive.y - 24) / 8);
    const expectedRow = 0x4050 + ((head + logicalRow) % 22) * 40;
    const expectedBottomRow = 0x4050 + ((head + logicalRow + 1) % 22) * 40;
    assert.ok(firstActive.screenAddress >= expectedRow && firstActive.screenAddress + 1 < expectedRow + 40);
    assert.ok(firstActive.bottomScreenAddress >= expectedBottomRow &&
      firstActive.bottomScreenAddress + 1 < expectedBottomRow + 40);
    assert.deepEqual([
      firstActive.leftCode, firstActive.rightCode,
      firstActive.bottomLeftCode, firstActive.bottomRightCode,
    ], [120, 121, 122, 123]);
  }
});

test("four-cell backing restores byte-exact data in reverse layer order at every A2 head", () => {
  for (let head = 0; head < 22; head += 1) {
    const xex = executeWeaponPickupBackingTrace({ root, artifact: "xex", head });
    const atr = executeWeaponPickupBackingTrace({ root, artifact: "atr", head });
    assert.deepEqual({ ...xex, artifact: "release" }, { ...atr, artifact: "release" });
    assert.deepEqual([
      xex.rendered.leftCode, xex.rendered.rightCode,
      xex.rendered.bottomLeftCode, xex.rendered.bottomRightCode,
      xex.rendered.drawnMask,
    ], [120, 121, 122, 123, 15]);
    assert.deepEqual(xex.rendered.backing, xex.original);
    assert.deepEqual(xex.restored, xex.original);
    assert.deepEqual([
      xex.drawnMaskAfterErase, xex.renderedMaskAfterErase, xex.topLatchAfterErase,
    ], [0, 0, 0]);
    assert.notEqual(xex.top, xex.bottom);
  }
});

test("release collision covers the complete half-open 8-HPOS by 16-scanline capsule", () => {
  const xex = executeWeaponPickupCollisionTrace({ root, artifact: "xex" });
  const atr = executeWeaponPickupCollisionTrace({ root, artifact: "atr" });
  assert.deepEqual({ artifact: "release", cases: xex }, { artifact: "release", cases: atr });
  assert.equal(xex.every(({ expectedHit, collected }) => expectedHit === collected), true);
  assert.match(source,
    /cmp #\(ENTITY_GAMEPLAY_BOTTOM-\(WEAPON_PICKUP_HEIGHT_SCANLINES-8\)\)/);
});

test("pickup collection is single-shot and changes neither score, HULL nor LIFE", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "xex" });
  const before = trace.records.filter(({ phase }) => phase === "ACTIVE").at(-1);
  const pickup = trace.records.find(({ phase }) => phase === "PICKUP");
  assert.deepEqual([
    pickup.state, pickup.activeMask, pickup.activeCount, pickup.timer,
  ], [3, 0, 0, 500]);
  assert.deepEqual([
    pickup.scoreHi, pickup.scoreLo, pickup.playerHealth, pickup.playerLives,
  ], [before.scoreHi, before.scoreLo, before.playerHealth, before.playerLives]);
  const changedHudCells = Array.from({ length: 40 }, (_, offset) => offset)
    .filter((offset) => pickup.display[offset] !== before.display[offset]);
  assert.deepEqual(changedHudCells, [30, 31, 32, 33, 34, 36, 37, 38, 39]);
  assert.equal(pickup.display[35], 0, "BOOST separator must remain a blank cell");
  assert.deepEqual(Array.from(pickup.display.subarray(0, 30)),
    Array.from(before.display.subarray(0, 30)), "SCORE/LIFE/HULL and separator cells must remain byte-exact");
});

test("weapon boosters use four proportional ANTIC 2 segments with a timer-derived warning blink", () => {
  const xex = executeWeaponBoosterHudTrace({ root, artifact: "xex" });
  const atr = executeWeaponBoosterHudTrace({ root, artifact: "atr" });
  const summary = (trace) => ({
    hudOffset: trace.hudOffset,
    hudCells: trace.hudCells,
    hudSegmentsOffset: trace.hudSegmentsOffset,
    fullCode: trace.fullCode,
    fullGlyph: trace.fullGlyph,
    samples: trace.samples,
    paused: trace.paused,
    refreshed: trace.refreshed,
    expired: trace.expired,
    backingBeforeRefresh: trace.backingBeforeRefresh,
    backingAfterRefresh: trace.backingAfterRefresh,
    changedScreenOffsets: trace.changedScreenOffsets,
  });
  assert.deepEqual(summary(xex), summary(atr), "XEX and ATR HUD execution must match");
  assert.deepEqual([
    xex.hudOffset, xex.hudCells, xex.hudSegmentsOffset, xex.hudSegments,
    xex.fullCode, xex.fullGlyph,
  ], [30, 10, 36, 4, 7, [0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0xff]]);
  assert.deepEqual(Object.fromEntries(xex.samples.map(({ name, hudCodes }) =>
    [name, hudCodes])), {
    "100%": [7, 7, 7, 7],
    "76%": [7, 7, 7, 7],
    "75%": [7, 7, 7, 0],
    "51%": [7, 7, 7, 0],
    "50%": [7, 7, 0, 0],
    "26%": [7, 7, 0, 0],
    "25%": [7, 7, 0, 0],
    "below-25-visible": [7, 0, 0, 0],
    "blink-visible": [7, 0, 0, 0],
    "blink-hidden-boundary": [0, 0, 0, 0],
    "blink-hidden": [0, 0, 0, 0],
    "blink-visible-resumed": [7, 0, 0, 0],
  });
  assert.deepEqual(xex.paused.map(({ timer, hudCodes }) => [timer, hudCodes]),
    Array.from({ length: 16 }, () => [112, [0, 0, 0, 0]]),
    "pause must freeze both the timer and its current hidden blink phase");
  assert.deepEqual([
    xex.activation.state, xex.activation.timer, xex.activation.hudCodes,
    xex.refreshed.state, xex.refreshed.timer, xex.refreshed.hudCodes,
  ], [3, 500, [7, 7, 7, 7], 4, 500, [7, 7, 7, 7]]);
  assert.deepEqual([
    xex.backingBeforeRefresh, xex.backingAfterRefresh,
    xex.expired.state, xex.expired.timer, xex.expired.hudRegionCodes,
  ], [xex.originalHud, xex.originalHud, 0, 0, xex.originalHud]);
  assert.deepEqual(xex.changedScreenOffsets,
    [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
    "activation must not write outside the ten-cell BOOST field");
  assert.equal(xex.samples.every(({ hudRegionCodes }) =>
    hudRegionCodes.slice(0, 6).join() === "34,47,47,51,52,0"), true,
  "the full BOOST label and separator must remain stable while active");
  assert.equal(xex.samples.every(({ hudCodes }) => hudCodes.every((code) =>
    code === 0 || code === xex.fullCode)), true,
  "energy cells may contain only blank or the BOOST segment glyph");
});

test("HULL plates and the ten-cell BOOST field remain distinct at native screen codes", () => {
  const xex = executeHudPresentationTrace({ root, artifact: "xex" });
  const atr = executeHudPresentationTrace({ root, artifact: "atr" });
  const comparable = ({ artifact: _artifact, manifest: _manifest, ...trace }) => trace;
  assert.deepEqual(comparable(xex), comparable(atr));
  assert.deepEqual([
    xex.hullOffset, xex.hullSegments, xex.boosterOffset, xex.boosterCells,
    xex.boosterSegmentsOffset, xex.boosterSegments,
  ], [25, 4, 30, 10, 36, 4]);
  assert.deepEqual([xex.hullOffset - 1, xex.hullOffset + xex.hullSegments,
    xex.boosterSegmentsOffset - 1], [24, 29, 35],
  "the three HULL/BOOST separators must each occupy exactly one cell");
  assert.equal(xex.frames.every(({ display }) =>
    [24, 29, 35].every((column) => display[column] === 0)), true,
  "all three separator cells must stay blank in every rendered state");
  assert.equal(xex.lifecycleDisplays.every(({ display }) =>
    [24, 29, 35].every((column) => display[column] === 0)), true,
  "expiration, new game and respawn must preserve all separator cells");
  assert.equal(xex.frames.every(({ display }) => display.length === 40), true,
  "HUD snapshots must remain exactly inside $4000-$4027");
  assert.equal(xex.frames.every(({ display, hullCodes, boosterCodes }) =>
    display.slice(25, 29).join() === hullCodes.join() &&
    display.slice(30, 40).join() === boosterCodes.join()), true,
  "HULL and BOOST writers must stay inside their disjoint fields");
  assert.deepEqual([
    xex.hullFullGlyph, xex.hullDamagedGlyph, xex.boosterFullGlyph,
  ], [
    [0, 0, 0, 0x3c, 0x7e, 0xff, 0x7e, 0xff],
    [0, 0, 0, 0x3c, 0x42, 0x5a, 0x24, 0xff],
    [0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0xff],
  ]);
  assert.deepEqual(xex.frames.map(({ name, health, timer, boosterState,
    hullCodes, boosterCodes }) =>
    [name, health, timer, boosterState, hullCodes, boosterCodes]), [
    ["full-hull-no-booster", 10, 0, 0, [5, 5, 5, 5], Array(10).fill(0)],
    ["full-hull-full-boost", 10, 500, 3, [5, 5, 5, 5],
      [34, 47, 47, 51, 52, 0, 7, 7, 7, 7]],
    ["partial-hull-half-boost", 7, 250, 3, [5, 5, 12, 12],
      [34, 47, 47, 51, 52, 0, 7, 7, 0, 0]],
    ["critical-hull-blinking-boost", 1, 111, 3, [12, 12, 12, 12],
      [34, 47, 47, 51, 52, 0, 7, 0, 0, 0]],
  ]);
});

test("Rapid Fire lasts 500 active frames and keeps its ten-shot accelerated burst", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "xex" });
  assert.deepEqual(trace.normalBurstFrames, [0, 3, 6, 9, 12, 15, 18, 21]);
  assert.deepEqual(trace.rapidBurstFrames, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
  assert.equal(trace.activeRapidFrames, 500);
  assert.equal(trace.rapidTimerFrames.length, 500);
  assert.deepEqual(trace.rapidTimerFrames.map(({ timer }) => timer),
    Array.from({ length: 500 }, (_, index) => 499 - index));
  assert.deepEqual(trace.rapidTimerFrames[0].hudCodes, [7, 7, 7, 7]);
  assert.deepEqual(trace.rapidTimerFrames[123].hudCodes, [7, 7, 7, 7]);
  assert.deepEqual(trace.rapidTimerFrames[124].hudCodes, [7, 7, 7, 0]);
  assert.deepEqual(trace.rapidTimerFrames[249].hudCodes, [7, 7, 0, 0]);
  assert.deepEqual(trace.rapidTimerFrames[374].hudCodes, [7, 7, 0, 0]);
  assert.deepEqual(trace.rapidTimerFrames[375].hudCodes, [7, 0, 0, 0]);
  assert.deepEqual(trace.rapidTimerFrames[380].hudCodes, [0, 0, 0, 0]);
  assert.deepEqual(trace.rapidTimerFrames[388].hudCodes, [7, 0, 0, 0]);
  assert.deepEqual(trace.rapidTimerFrames[499].hudCodes, [0, 0, 0, 0]);
  const hudChangeFrames = trace.rapidTimerFrames.filter((record, index, frames) =>
    index === 0 || record.hudCodes.join() !== frames[index - 1].hudCodes.join())
    .map(({ frame }) => frame);
  assert.deepEqual(hudChangeFrames,
    [0, 124, 249, 375, 380, 388, 396, 404, 412, 420, 428, 436, 444, 452,
      460, 468, 476, 484, 492]);
  assert.equal(trace.pauseFrames.length, 10);
  assert.equal(trace.pauseFrames.every(({ timer, hudCodes }) =>
    timer === trace.frozenTimer && hudCodes.join() === "7,7,7,7"), true);
  const rapid = trace.records.find(({ phase }) => phase === "RAPID_BURST");
  const paused = trace.records.find(({ phase }) => phase === "PAUSE");
  const expired = trace.records.find(({ phase }) => phase === "EXPIRED");
  assert.equal(paused.timer, rapid.timer);
  assert.deepEqual([expired.state, expired.timer], [0, 0]);
  const { weapons } = assets();
  assert.deepEqual([
    weapons.viper.burstCount, weapons.viper.rapidFireBurstCount,
    weapons.viper.spreadShotBurstCount, weapons.viper.burstIntervalFrames,
    weapons.viper.rapidFireIntervalFrames, weapons.viper.rapidFireDurationFrames,
    weapons.viper.poolSlots, weapons.viper.speedScanlines,
    weapons.viper.widthHpos, weapons.viper.heightScanlines,
  ], [8, 10, 8, 3, 2, 500, 10, 6, 1, 2]);
});

test("packed runtime distinguishes 8-shot normal, 10-shot Rapid and 8-salvo Spread", () => {
  const xex = executeViperBurstBalanceTrace({ root, artifact: "xex" });
  const atr = executeViperBurstBalanceTrace({ root, artifact: "atr" });
  assert.deepEqual({ ...xex, artifact: "release" }, { ...atr, artifact: "release" });
  const summary = xex.traces.map((mode) => [
    mode.mode, mode.expectedBurst, mode.intervalFrames, mode.postBurstFrames,
    mode.firstBurstSalvos, mode.firstBurstProjectiles, mode.emittedProjectiles,
    mode.maximumPoolOccupancy,
  ]);
  assert.deepEqual(summary, [
    ["NORMAL", 8, 3, 12, 8, 8, 21, 8],
    ["RAPID", 10, 2, 12, 10, 10, 30, 10],
    ["SPREAD", 8, 10, 12, 8, 24, 24, 9],
  ]);
  const firstBurstFrames = (mode) => mode.records
    .filter(({ allocatedProjectiles }) => allocatedProjectiles > 0)
    .slice(0, mode.expectedBurst)
    .map(({ frame }) => frame);
  assert.deepEqual(firstBurstFrames(xex.traces[0]), [0, 3, 6, 9, 12, 15, 18, 21]);
  assert.deepEqual(firstBurstFrames(xex.traces[1]),
    [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
  assert.deepEqual(firstBurstFrames(xex.traces[2]), [0, 10, 20, 30, 40, 50, 60, 70]);
});

test("Normal and Rapid projectiles render through the Viper yellow bank", () => {
  const xex = executeViperProjectileColourTrace({ root, artifact: "xex" });
  const atr = executeViperProjectileColourTrace({ root, artifact: "atr" });
  assert.deepEqual({ ...xex, artifact: "release" }, { ...atr, artifact: "release" });
  assert.deepEqual([
    xex.normalAtSpawn, xex.normalAfterPickup, xex.rapidAtSpawn,
    xex.rapidAfterExpiry, xex.normalAfterExpiry,
  ], [0x01, 0x01, 0x01, 0x01, 0x01]);
  assert.equal(xex.rapidTimerAtSpawn, 500);
  assert.deepEqual(xex.rendered.map(({ activeRenderId, code, screenCodeAfter }) =>
    [activeRenderId, code, screenCodeAfter]), [[1, 15, 15], [1, 15, 15], [1, 15, 15]]);
  assert.deepEqual(xex.rendered.map(({ inverse }) => inverse), [0, 0, 0]);
  assert.equal(new Set(xex.rendered.map(({ glyphCode }) => glyphCode)).size, 1,
    "Normal and Rapid projectiles must use byte-identical glyph geometry");
  assert.deepEqual([xex.normalColour, xex.rapidColour], [0x1e, 0x1e]);
  assert.equal(xex.rendered.every(({ colourRegister, colourValue }) =>
    colourRegister === "COLPF2" && colourValue === 0x1e), true);
  assert.deepEqual([
    xex.raiderRendered.activeRenderId, xex.raiderRendered.inverse,
    xex.raiderRendered.colourRegister, xex.raiderRendered.colourValue,
  ], [2, 1, "COLPF3", 0x46]);
  const { weapons } = assets();
  assert.deepEqual([
    weapons.viper.widthHpos, weapons.viper.heightScanlines,
    weapons.viper.speedScanlines, weapons.viper.poolSlots,
  ], [1, 2, 6, 10]);
  const collisionPath = source.slice(source.indexOf("update_fighter_projectiles:"),
    source.indexOf("allocate_viper_projectile:"));
  assert.match(collisionPath, /lda FIGHTER_PROJECTILE_ACTIVE,x\s+beq @viper_next/);
  assert.doesNotMatch(collisionPath, /FIGHTER_PROJECTILE_RAPID_COLOR|and #\$7F/);
});

test("packed XEX and ATR keep every implemented Viper lifecycle path yellow under cold RAM", () => {
  for (const coldFill of [0xa5, 0x5a]) {
    const xex = executeViperProjectileColourLifecycleTrace({
      root, artifact: "xex", coldFill,
    });
    const atr = executeViperProjectileColourLifecycleTrace({
      root, artifact: "atr", coldFill,
    });
    assert.deepEqual({ ...xex, artifact: "release" }, { ...atr, artifact: "release" });
    assert.deepEqual(xex.palette, { COLPF2: 0x1e, COLPF3: 0x46 });
    assert.deepEqual(xex.captures.map(({ phase, boosterState, projectiles }) => [
      phase,
      boosterState,
      projectiles.length,
      projectiles.every(({ inverse, colourRegister, colourValue }) =>
        inverse === 0 && colourRegister === "COLPF2" && colourValue === 0x1e),
    ]), [
      ["NORMAL", 0, 1, true],
      ["RAPID", 3, 1, true],
      ["SPREAD", 4, 3, true],
      ["PAUSE_BEFORE", 3, 1, true],
      ["PAUSE_RESUME", 3, 1, true],
      ["SECTOR_TRANSITION", 4, 3, true],
      ["RAPID_EXPIRED", 0, 1, true],
      ["SPREAD_EXPIRED", 0, 1, true],
      ["LIFE_LOSS", 0, 1, true],
      ["NEW_GAME", 0, 1, true],
    ]);
    assert.deepEqual([
      xex.raider.activeRenderId, xex.raider.inverse,
      xex.raider.colourRegister, xex.raider.colourValue,
    ], [2, 1, "COLPF3", 0x46]);
  }
});

test("new game, life loss and Game Over clear RF while a live sector transition preserves it", () => {
  const lifecycle = executeWeaponPickupLifecycleTrace({ root, artifact: "xex" });
  for (const record of [lifecycle.newGame, lifecycle.lifeLoss, lifecycle.gameOver,
    lifecycle.sectorPending, lifecycle.sectorActive]) {
    assert.deepEqual([record.state, record.activeMask, record.activeCount], [0, 0, 0]);
    assert.deepEqual(record.hudCodes, [0, 0, 0, 0]);
  }
  assert.deepEqual([
    lifecycle.newGame.qualifiedKillCounter,
    lifecycle.sectorRapid.state, lifecycle.sectorRapid.timer,
  ], [0, 3, 500]);
  assert.deepEqual(lifecycle.sectorRapid.hudCodes, [7, 7, 7, 7]);
});

test("release trace CSV exposes the authoritative counter, state, timing and score", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "xex" });
  const csv = weaponPickupTraceCsv(trace);
  assert.match(csv, /^artifact,phase,frame,kill,damage_source,projectile_consumed,/);
  assert.match(csv, /xex,KILL_3,0,3,0,1,0,0,0,1,/);
  assert.match(csv, /xex,PICKUP,0,,,0,0,0,0,3,/);
  assert.match(csv, /xex,RAPID_TIMER,499,,,0,0,0,0,0,/);
});
