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
  executeWeaponPickupCauseTrace,
  executeWeaponPickupBackingTrace,
  executeWeaponPickupCollisionTrace,
  executeWeaponPickupLifecycleTrace,
  executeWeaponPickupTrace,
  executeViperProjectileColourTrace,
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
  assert.equal(manifest.entityEffects.glyphCount, 14);
  assert.equal(128 - manifest.entityEffects.glyphIndex - manifest.entityEffects.glyphCount, 4);
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
  assert.doesNotMatch(renderer, /ENTITY_OWNER\+WEAPON_PICKUP_SLOT|ora #\$80|WEAPON_PICKUP_PHASE/);
  assert.match(renderer,
    /lda #WEAPON_PICKUP_GLYPH_BASE[\s\S]+lda #\(WEAPON_PICKUP_GLYPH_BASE\+1\)/);
  assert.match(renderer,
    /jsr advance_dst_to_next_ring_row[\s\S]+lda #\(WEAPON_PICKUP_GLYPH_BASE\+2\)[\s\S]+lda #\(WEAPON_PICKUP_GLYPH_BASE\+3\)/);
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
    bottomRightCode === 123 && renderId === 0 && drawnMask === 15), true);
  assert.doesNotMatch(source.slice(source.indexOf("weapon_pickup_record_qualified_kill:"),
    source.indexOf("weapon_pickup_release_active_mask:")),
  /sta ENTITY_RENDER_ID\+WEAPON_PICKUP_SLOT/,
  "the fixed-slot renderer must not spend state/code on a mutable render ID");
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
  assert.deepEqual(changedHudCells, [32, 33, 34, 35]);
  assert.deepEqual(Array.from(pickup.display.subarray(0, 30)),
    Array.from(before.display.subarray(0, 30)), "SCORE/LIFE/HULL cells must remain byte-exact");
});

test("Rapid Fire lasts 500 active frames, freezes in pause and keeps ten-shot geometry", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "xex" });
  assert.deepEqual(trace.normalBurstFrames, [0, 3, 6, 9, 12, 15, 18, 21, 24, 27]);
  assert.deepEqual(trace.rapidBurstFrames, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
  assert.equal(trace.activeRapidFrames, 500);
  assert.equal(trace.rapidTimerFrames.length, 500);
  assert.deepEqual(trace.rapidTimerFrames.map(({ timer }) => timer),
    Array.from({ length: 500 }, (_, index) => 499 - index));
  assert.deepEqual(trace.rapidTimerFrames[0].hudCodes, [50, 38, 17, 16]);
  assert.deepEqual(trace.rapidTimerFrames[48].hudCodes, [50, 38, 17, 16]);
  assert.deepEqual(trace.rapidTimerFrames[49].hudCodes, [50, 38, 16, 25]);
  assert.deepEqual(trace.rapidTimerFrames[449].hudCodes, [50, 38, 16, 17]);
  assert.deepEqual(trace.rapidTimerFrames[499].hudCodes, [0, 0, 0, 0]);
  const hudChangeFrames = trace.rapidTimerFrames.filter((record, index, frames) =>
    index === 0 || record.hudCodes.join() !== frames[index - 1].hudCodes.join())
    .map(({ frame }) => frame);
  assert.deepEqual(hudChangeFrames, [0, 49, 99, 149, 199, 249, 299, 349, 399, 449, 499]);
  assert.equal(trace.pauseFrames.length, 10);
  assert.equal(trace.pauseFrames.every(({ timer, hudCodes }) =>
    timer === trace.frozenTimer && hudCodes.join() === "50,38,17,16"), true);
  const rapid = trace.records.find(({ phase }) => phase === "RAPID_BURST");
  const paused = trace.records.find(({ phase }) => phase === "PAUSE");
  const expired = trace.records.find(({ phase }) => phase === "EXPIRED");
  assert.equal(paused.timer, rapid.timer);
  assert.deepEqual([expired.state, expired.timer], [0, 0]);
  const { weapons } = assets();
  assert.deepEqual([
    weapons.viper.burstCount, weapons.viper.burstIntervalFrames,
    weapons.viper.rapidFireIntervalFrames, weapons.viper.rapidFireDurationFrames,
    weapons.viper.poolSlots, weapons.viper.speedScanlines,
    weapons.viper.widthHpos, weapons.viper.heightScanlines,
  ], [10, 3, 2, 500, 10, 6, 1, 2]);
});

test("release projectiles capture yellow or red at spawn without changing geometry", () => {
  const xex = executeViperProjectileColourTrace({ root, artifact: "xex" });
  const atr = executeViperProjectileColourTrace({ root, artifact: "atr" });
  assert.deepEqual({ ...xex, artifact: "release" }, { ...atr, artifact: "release" });
  assert.deepEqual([
    xex.normalAtSpawn, xex.normalAfterPickup, xex.rapidAtSpawn,
    xex.rapidAfterExpiry, xex.normalAfterExpiry,
  ], [0x01, 0x01, 0x81, 0x81, 0x01]);
  assert.equal(xex.rapidTimerAtSpawn, 500);
  assert.deepEqual(xex.rendered.map(({ activeRenderId, code, screenCodeAfter }) =>
    [activeRenderId, code, screenCodeAfter]), [[1, 15, 15], [0x81, 0x8f, 0x8f], [1, 15, 15]]);
  assert.deepEqual(xex.rendered.map(({ inverse }) => inverse), [0, 1, 0]);
  assert.equal(new Set(xex.rendered.map(({ glyphCode }) => glyphCode)).size, 1,
    "yellow and red projectiles must use byte-identical glyph geometry");
  assert.deepEqual([xex.normalColour, xex.rapidColour], [0x1e, 0x46]);
  assert.equal(xex.rendered[1].pixelPairs.flat().includes(3), true,
    "powered projectile glyph must exercise the inverse-switched selector 11");
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
  assert.deepEqual(lifecycle.sectorRapid.hudCodes, [50, 38, 17, 16]);
});

test("release trace CSV exposes the authoritative counter, state, timing and score", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "xex" });
  const csv = weaponPickupTraceCsv(trace);
  assert.match(csv, /^artifact,phase,frame,kill,damage_source,projectile_consumed,/);
  assert.match(csv, /xex,KILL_3,0,3,0,1,0,0,0,1,/);
  assert.match(csv, /xex,PICKUP,0,,,0,0,26,10,3,/);
  assert.match(csv, /xex,RAPID_TIMER,499,,,0,0,0,0,0,/);
});
