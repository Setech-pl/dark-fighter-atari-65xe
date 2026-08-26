import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  compileFighterWeapons,
  buildRaiderProjectileGlyphBank,
  createSharedFighterExplosion,
  createViperBurstState,
  loadFighterWeaponsDefinition,
  renderSharedFighterExplosionPmg,
  simulateViperBurst,
  stepSharedFighterExplosion,
  stepViperBurst,
} from "../scripts/fighter-weapons.mjs";
import {
  compileEnemyRoster,
  loadEnemyRosterDefinition,
} from "../scripts/enemy-roster.mjs";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments, readRuntimeBytes } from "../scripts/runtime-image.mjs";
import { loadCapitalHullsDefinition } from "../scripts/capital-hulls.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const roster = compileEnemyRoster(loadEnemyRosterDefinition(
  path.join(root, "assets", "graphics", "enemy-roster.json")), root);
const weapons = compileFighterWeapons(loadFighterWeaponsDefinition(
  path.join(root, "assets", "graphics", "fighter-weapons.json")), roster);
const hulls = loadCapitalHullsDefinition(
  path.join(root, "assets", "graphics", "capital-hulls.json"));
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "dark-fighter.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

function xexBytes(address, length) {
  return readRuntimeBytes(root, address, length);
}

test("assembled gameplay display keeps HUD, divider and 22 ring rows distinct", () => {
  assert.match(source, /PLAYFIELD_DLIST_BYTES\s*=\s*3\+3\+PLAYFIELD_RING_ROWS\*3\+3/);
  assert.match(source, /lda #\$C2[\s\S]+lda #\$44[\s\S]+lda #\$C4[\s\S]+lda #\$41/);
  assert.doesNotMatch(source.slice(
    source.indexOf("build_playfield_display_list:"),
    source.indexOf("rotate_playfield_rows:"),
  ), /lda #\$70/);
  assert.deepEqual(weapons.viewport, {
    activeImageTop: 8,
    hudRows: 1,
    gameplayRows: 23,
    screenColumns: 40,
    leftHpos: 48,
    hudTop: 8,
    hudBottom: 16,
    gameplayTop: 16,
    gameplayBottom: 200,
  });
});

test("Raider PMG drawing clips every frame to the gameplay viewport", () => {
  const raider = roster.implemented[0];
  const visibleCounts = [];
  for (let logicalY = weapons.viewport.gameplayTop - raider.height;
    logicalY < weapons.viewport.gameplayTop; logicalY += 1) {
    const p1 = new Uint8Array(256);
    const p2 = new Uint8Array(256);
    for (let row = 0; row < raider.height; row += 1) {
      const y = logicalY + row;
      if (y < weapons.viewport.gameplayTop || y >= weapons.viewport.gameplayBottom) continue;
      p1[y] = raider.bodyRows[row];
      p2[y] = raider.accentFrameBytes[row];
    }
    assert.equal(p1.subarray(0, weapons.viewport.gameplayTop).some(Boolean), false);
    assert.equal(p2.subarray(0, weapons.viewport.gameplayTop).some(Boolean), false);
    visibleCounts.push(p1.subarray(weapons.viewport.gameplayTop).filter(Boolean).length);
  }
  assert.equal(visibleCounts[0], 0);
  assert.ok(visibleCounts.some((count) => count > 0));
  assert.ok(visibleCounts.at(-1) > visibleCounts.find((count) => count > 0),
    "successive occupied body rows enter progressively instead of appearing fully formed");
  const renderer = source.slice(source.indexOf("draw_enemy:"), source.indexOf("reset_enemy:"));
  assert.match(renderer, /cpy #GAMEPLAY_TOP[\s\S]+bcc @body_next/);
  assert.match(renderer, /cpy #GAMEPLAY_TOP[\s\S]+bcc @accent_done/);
});

test("held FIRE emits an exact ten-shot Viper burst at three-frame intervals", () => {
  const simulation = simulateViperBurst(weapons, 40);
  const allocations = simulation.trace.filter(({ allocationResult }) =>
    allocationResult === "ALLOCATED");
  assert.deepEqual(allocations.slice(0, 10).map(({ frame }) => frame),
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28]);
  assert.equal(allocations[9].burstState, "POST_BURST_COOLDOWN");
  assert.equal(allocations[9].timer, 12);
  assert.equal(allocations[10].frame, 40);
  assert.ok(Math.max(...simulation.trace.map(({ active }) => active.length)) >= 8);
});

test("FIRE release stops new emissions while launched Viper shots remain independent", () => {
  let state = createViperBurstState(weapons);
  state = stepViperBurst(weapons, state, { fireHeld: true, playerX: 100 });
  const launchedX = state.pool[0].x;
  state = stepViperBurst(weapons, state, { fireHeld: false, playerX: 150 });
  assert.equal(state.shotsEmitted, 1);
  assert.equal(state.pool[0].x, launchedX);
  assert.equal(state.pool[0].y, 176);
  assert.equal(state.burstState, "WAITING");
});

test("Viper pool rejection neither overwrites shots nor counts a rejected emission", () => {
  let state = createViperBurstState(weapons);
  state.pool = state.pool.map((_, index) => ({ owner: "VIPER", x: 80 + index, y: 100,
    previousY: 100, width: 1, height: 2, colour: 0x1e }));
  const before = state.pool.map(({ x }) => x);
  state = stepViperBurst(weapons, state, { fireHeld: true });
  assert.equal(state.shotsEmitted, 0);
  assert.deepEqual(state.pool.map(({ x }) => x), before);
  assert.equal(state.burstRemaining, 10);
});

test("fighter projectiles use fixed pools and remain independent of DRAIN and M0-M3", () => {
  assert.deepEqual([weapons.viper.poolSlots, weapons.raider.poolSlots, weapons.totalSlots],
    [10, 9, 19]);
  let state = simulateViperBurst(weapons, 12).state;
  assert.ok(state.pool.some(Boolean));
  state = stepViperBurst(weapons, state, { drain: true });
  assert.equal(state.pool.some(Boolean), true);
  const renderer = source.slice(source.indexOf("render_fighter_projectile_overlays:"),
    source.indexOf("; -----------------------------------------------------------------------------\n; Enemy"));
  assert.doesNotMatch(renderer, /MISSILES|HPOSM|SIZEM|COLPM/);
});

test("Viper fire remains continuous through DRAIN and COMPLETE", () => {
  let held = simulateViperBurst(weapons, 8, { fireHeld: true }).state;
  assert.ok(held.pool.some(Boolean));
  held = stepViperBurst(weapons, held, { fireHeld: true, drain: true });
  assert.equal(held.pool.some(Boolean), true);
  assert.notEqual(held.burstState, "WAITING");
  held = stepViperBurst(weapons, held, { fireHeld: true, sectorComplete: true });
  assert.equal(held.shotsEmitted, 4,
    "COMPLETE preserves the canonical burst cadence rather than forcing a new shot");
  assert.ok(held.pool.some(Boolean));

  let fresh = createViperBurstState(weapons);
  fresh = stepViperBurst(weapons, fresh, { fireHeld: false, drain: true });
  fresh = stepViperBurst(weapons, fresh, { fireHeld: true, drain: true });
  assert.equal(fresh.shotsEmitted, 1);
  const completion = source.slice(source.indexOf("update_sector_completion:"),
    source.indexOf("apply_broadside_player_damage:"));
  const weapon = source.slice(source.indexOf("update_viper_weapon:"),
    source.indexOf("allocate_viper_projectile:"));
  assert.doesNotMatch(completion, /clear_fighter_projectiles/);
  assert.doesNotMatch(weapon, /CAPITAL_SECTOR_STATE|clear_fighter_projectiles/);
});

test("shared fighter explosion has six distinct expanding and fading native phases", () => {
  const explosion = weapons.sharedFighterExplosion;
  assert.deepEqual([
    explosion.frameCount,
    explosion.frameDurationFrames,
    explosion.totalFrames,
    explosion.widthBits,
    explosion.heightScanlines,
    explosion.slots,
  ], [6, 4, 24, 8, 8, 2]);
  const frames = Array.from({ length: explosion.frameCount }, (_, index) =>
    [...explosion.outerBytes.subarray(index * explosion.heightScanlines,
      (index + 1) * explosion.heightScanlines)]);
  assert.equal(new Set(frames.map((frame) => frame.join(","))).size, 6);
  const occupied = frames.map((frame) => frame.reduce((sum, byte) =>
    sum + byte.toString(2).replaceAll("0", "").length, 0));
  assert.ok(occupied[0] < occupied[1] && occupied[1] < occupied[2]);
  assert.ok(occupied[3] >= occupied[2]);
  assert.ok(occupied[4] < occupied[3] && occupied[5] < occupied[4]);
});

test("shared explosion remains fixed, holds every phase four frames, and clears at frame 24", () => {
  let state = createSharedFighterExplosion(weapons, { x: 120, y: 88, owner: "RAIDER" });
  const trace = [];
  for (let visibleFrame = 0; visibleFrame < 24; visibleFrame += 1) {
    trace.push({ ...state });
    state = stepSharedFighterExplosion(weapons, state);
  }
  assert.deepEqual(trace.map(({ frame }) => frame),
    [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
      3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5]);
  assert.ok(trace.every(({ x, y }) => x === 120 && y === 88));
  assert.deepEqual([state.active, state.timer, state.frame], [false, 0, 6]);
});

test("explosion adapters keep a stable centre and clear the full eight-row union", () => {
  const viperCollisionLeft = 124;
  const viperOrigin = viperCollisionLeft - 4;
  const viperY = 184 + 4;
  let state = createSharedFighterExplosion(weapons,
    { x: viperOrigin, y: viperY, owner: "VIPER" });
  let outer = new Uint8Array(256).fill(0xa5);
  let core = new Uint8Array(256).fill(0x5a);
  const beforeGuard = [outer[viperY - 1], core[viperY - 1]];
  const afterGuard = [outer[viperY + 8], core[viperY + 8]];
  const visibleCentres = [];
  for (let frame = 0; frame < 24; frame += 1) {
    ({ outer, core } = renderSharedFighterExplosionPmg(weapons, state, { outer, core }));
    const rows = outer.subarray(viperY, viperY + 8);
    const occupiedColumns = [];
    for (const value of rows) {
      for (let bit = 0; bit < 8; bit += 1) if (value & (0x80 >> bit)) occupiedColumns.push(bit);
    }
    visibleCentres.push((Math.min(...occupiedColumns) + Math.max(...occupiedColumns)) / 2);
    state = stepSharedFighterExplosion(weapons, state);
  }
  ({ outer, core } = renderSharedFighterExplosionPmg(weapons, state, { outer, core }));
  assert.equal(visibleCentres.every((centre) => centre === 3.5), true,
    "every shared radial phase remains centred on the same 8-bit PMG origin");
  assert.deepEqual([...outer.subarray(viperY, viperY + 8)], Array(8).fill(0));
  assert.deepEqual([...core.subarray(viperY, viperY + 8)], Array(8).fill(0));
  assert.deepEqual([outer[viperY - 1], core[viperY - 1]], beforeGuard);
  assert.deepEqual([outer[viperY + 8], core[viperY + 8]], afterGuard);
  assert.match(source,
    /begin_player_fighter_explosion:[\s\S]+sbc #\(\(SHARED_FIGHTER_EXPLOSION_WIDTH_BITS\*2-PLAYER_COLLISION_WIDTH\)\/2\)/);
});

test("assembled PMG renderer shares one explosion bank between Viper and Raider slots", () => {
  const explosion = weapons.sharedFighterExplosion;
  assert.deepEqual([...xexBytes(labels.get("shared_fighter_explosion_masks"),
    explosion.outerBytes.length)], [...explosion.outerBytes]);
  assert.deepEqual([...xexBytes(labels.get("shared_fighter_explosion_core_masks"),
    explosion.coreMasks.length)], [...explosion.coreMasks]);
  const renderer = source.slice(source.indexOf("erase_shared_fighter_explosion_slot:"),
    source.indexOf("update_enemy:"));
  assert.match(renderer, /GAMEPLAY_TOP[\s\S]+GAMEPLAY_BOTTOM/);
  assert.match(renderer, /PLAYER0,y[\s\S]+PLAYER3,y[\s\S]+PLAYER1,y[\s\S]+PLAYER2,y/);
  assert.doesNotMatch(renderer, /COLPM|COLPF|SIZEM|SIZEP|MISSILES/);
  assert.match(source,
    /resolve_enemy_damage:[\s\S]+ENEMY_EXPLODING_STATE[\s\S]+begin_enemy_fighter_explosion/);
  assert.match(source,
    /apply_player_damage:[\s\S]+PLAYER_DYING[\s\S]+begin_player_fighter_explosion/);
  assert.match(source,
    /main_loop:[\s\S]+tick_shared_fighter_explosions[\s\S]+render_shared_fighter_explosions/);
  assert.match(renderer,
    /and #\(SHARED_FIGHTER_EXPLOSION_FRAME_DURATION-1\)[\s\S]+bne @next/);
  assert.match(source,
    /tick_shared_fighter_explosions:[\s\S]+cmp #\$01[\s\S]+erase_shared_fighter_explosion_slot/);
});

test("Viper glyphs and the assembled Raider glyph builder match authoritative runtime masks", () => {
  const memory = new Uint8Array(0x10000);
  const { manifest } = installRuntimeSegments(memory, root);
  const run = (name) => {
    const cpu = new Nmos6502(memory);
    const stop = 0x7fff;
    cpu.push((stop - 1) >> 8);
    cpu.push((stop - 1) & 0xff);
    cpu.pc = labels.get(name);
    for (let steps = 0; steps < 500_000 && cpu.pc !== stop; steps += 1) cpu.step();
    assert.equal(cpu.pc, stop, `${name} did not return`);
  };
  run("copy_charset");
  memory.fill(0xa5, labels.get("FIGHTER_PROJECTILE_ACTIVE"),
    labels.get("FIGHTER_PROJECTILE_STATE_END"));
  run("init_fighter_projectiles");
  assert.equal(memory.subarray(labels.get("FIGHTER_PROJECTILE_ACTIVE"),
    labels.get("FIGHTER_PROJECTILE_STATE_END")).every((byte) => byte === 0), true,
  "the compact reset loop must clear every owned projectile/burst/explosion byte");
  const viperBytes = memory.subarray(0x4400 + weapons.glyphLayout.viperBase * 8,
    0x4400 + (weapons.glyphLayout.viperBase + weapons.glyphs.viper.length) * 8);
  const packed = fs.readFileSync(path.join(root, "build", "broadside-runtime.bin"));
  const runtimeBytes = (label, length) => {
    const offset = labels.get(label) - manifest.broadsideRuntime.runAddress;
    return packed.subarray(offset, offset + length);
  };
  const groupMasks = runtimeBytes("raider_projectile_group_masks", 2);
  const startRows = runtimeBytes("raider_projectile_start_rows", 10);
  const rowCounts = runtimeBytes("raider_projectile_row_counts", 10);
  const raiderBytes = buildRaiderProjectileGlyphBank(weapons,
    new Uint8Array(weapons.glyphs.raider.length * 8).fill(0xa5));
  for (let group = 0; group < 2; group += 1) {
    for (let glyph = 0; glyph < 10; glyph += 1) {
      for (let row = 0; row < rowCounts[glyph]; row += 1) {
        assert.equal(raiderBytes[(group * 10 + glyph) * 8 + startRows[glyph] + row],
          groupMasks[group]);
      }
    }
  }
  assert.deepEqual([...viperBytes], weapons.glyphs.viper.flat());
  assert.deepEqual([...raiderBytes], weapons.glyphs.raider.flat());
  assert.match(source,
    /build_raider_projectile_glyphs:[\s\S]+raider_projectile_start_rows[\s\S]+sta \(dst_ptr\),y/);
  assert.match(source,
    /build_raider_projectile_glyphs:[\s\S]+ldx #\$00[\s\S]+inx[\s\S]+cpx #\(RAIDER_PROJECTILE_GLYPH_COUNT\*8\)[\s\S]+bne @clear/);
  const builder = runtimeBytes("build_raider_projectile_glyphs", 12);
  assert.deepEqual([...builder],
    [0xa9, 0x00, 0xa2, 0x00, 0x9d, 0xd0, 0x46, 0xe8, 0xe0, 0xa0, 0xd0, 0xf8],
  "assembled loop clears all 160 bytes instead of terminating after the first high-bit index");
  assert.equal(weapons.glyphs.viper.some((glyph) => glyph.includes(0xc0)), true);
  assert.equal(weapons.glyphs.raider.some((glyph) => glyph.includes(0xf0)), true);
});

test("Raider inverse screen code selects the intended ANTIC 4 glyph and red bank", () => {
  const charsetBase = 0x4400;
  const glyphIndex = 7;
  const screenByte = 0x80 | (weapons.glyphLayout.raiderBase + glyphIndex);
  const effectiveGlyph = screenByte & 0x7f;
  const glyphAddress = charsetBase + effectiveGlyph * 8;
  const generated = buildRaiderProjectileGlyphBank(weapons,
    new Uint8Array(weapons.glyphs.raider.length * 8));
  const glyphBytes = generated.subarray(glyphIndex * 8, glyphIndex * 8 + 8);

  assert.deepEqual({ screenByte, effectiveGlyph, glyphAddress }, {
    screenByte: 0xe1,
    effectiveGlyph: 0x61,
    glyphAddress: 0x4708,
  });
  assert.deepEqual([...glyphBytes], [0, 0, 0, 0, 0, 0, 0, 0xf0]);
  assert.equal(screenByte >>> 7, 1,
    "inverse ANTIC 4 code maps pixel value 3 to COLPF3 without changing glyph 97");
  assert.equal(weapons.raider.colourRegister, "COLPF3");
  assert.equal(weapons.raider.colourValue, 0x46);
  const renderer = source.slice(source.indexOf("render_fighter_projectile_overlays:"),
    source.indexOf("; -----------------------------------------------------------------------------\n; Enemy"));
  assert.match(renderer,
    /@raider_code:[\s\S]+adc #RAIDER_PROJECTILE_GLYPH_BASE[\s\S]+ora #\$80/);
});

test("actual Viper projectile bank is Atari yellow without changing Viper PMG colours", () => {
  assert.deepEqual([weapons.viper.colourRegister, weapons.viper.colourValue], ["COLPF2", 0x1e]);
  assert.match(source, /GAMEPLAY_COLPF2 = VIPER_PROJECTILE_COLOR/);
  assert.match(source, /lda #GAMEPLAY_COLPF2\s+sta COLPF2/);
  assert.match(source, /lda #\$0E[^\n]*\n\s*sta COLPM0/);
  assert.match(source, /lda #\$28[^\n]*\n\s*sta COLPM3/);
  assert.equal(hulls.glyphs.find(({ name }) => name === "enemy_engine_energy").screenBank,
    "pf3", "enemy engine energy remains in the red bank rather than inheriting yellow");
  assert.equal(hulls.glyphs.find(({ name }) => name === "enemy_launch_flash").screenBank,
    "pf3", "enemy launch flash remains in the red bank rather than inheriting yellow");
});

test("capital shells remain materially longer than both fighter projectile classes", () => {
  const { player, raider, capital } = hulls.broadside.projectileVisuals;
  assert.deepEqual([player.widthHpos, player.height, raider.widthHpos, raider.height],
    [1, 2, 2, 3]);
  assert.deepEqual([capital.widthHpos, capital.height], [8, 6]);
  assert.ok(capital.widthHpos >= player.widthHpos * 2);
  assert.ok(capital.widthHpos >= raider.widthHpos * 2);
  assert.match(source, /render_capital_shell_overlay:[\s\S]+sta \(dst_ptr\),y[\s\S]+iny[\s\S]+sta \(dst_ptr\),y/);
});

test("assembled burst controllers use accepted counts, intervals, speeds and damage", () => {
  assert.deepEqual({
    viperCount: weapons.viper.burstCount,
    viperInterval: weapons.viper.burstIntervalFrames,
    viperSpeed: weapons.viper.speedScanlines,
    viperPost: weapons.viper.postBurstFrames,
    raiderCount: weapons.raider.burstCount,
    raiderInterval: weapons.raider.burstIntervalFrames,
    raiderSpeed: weapons.raider.speedScanlines,
    raiderPost: weapons.raider.postBurstFrames,
    raiderDamage: weapons.raider.damage,
  }, {
    viperCount: 10, viperInterval: 3, viperSpeed: 6, viperPost: 12,
    raiderCount: 10, raiderInterval: 4, raiderSpeed: 5,
    raiderPost: [60, 50, 40], raiderDamage: 10,
  });
  assert.match(source, /update_viper_weapon:[\s\S]+VIPER_BURST_COUNT[\s\S]+VIPER_BURST_INTERVAL/);
  assert.match(source, /update_enemy_weapon_runtime:[\s\S]+RAIDER_BURST_COUNT[\s\S]+RAIDER_BURST_INTERVAL/);
  assert.match(source, /update_fighter_projectiles:[\s\S]+raider_projectile_hits_player[\s\S]+ENEMY_PULSE_DAMAGE_UNITS[\s\S]+apply_player_damage/);
});
