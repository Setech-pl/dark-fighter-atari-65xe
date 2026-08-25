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
import { parseAtr, parseXex } from "../scripts/formats.mjs";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import {
  assertDebrisDestructionTraceParity,
  assertRaiderBreakupTraceParity,
  executeDebrisDestructionTrace,
  executeRaiderBreakupTrace,
} from "../scripts/debris-destruction-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definitionPath = path.join(root, "assets", "graphics", "entity-effects.json");
const capitalHullsDefinition = JSON.parse(fs.readFileSync(
  path.join(root, "assets", "graphics", "capital-hulls.json"), "utf8"));
const starfieldDefinition = JSON.parse(fs.readFileSync(
  path.join(root, "assets", "graphics", "starfield.json"), "utf8"));
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
const xex = fs.readFileSync(path.join(root, "dist", "dark-fighter.xex"));
const atr = fs.readFileSync(path.join(root, "dist", "dark-fighter.atr"));
const broadsideRuntime = fs.readFileSync(path.join(root, "build", "broadside-runtime.bin"));
const starfieldRuntime = fs.readFileSync(path.join(root, "build", "starfield-runtime.bin"));
const a2KernelRuntime = fs.readFileSync(path.join(root, "build", "a2-kernel-runtime.bin"));
const entityCodeRuntime = fs.readFileSync(path.join(root, "build", "entity-code-runtime.bin"));
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "dark-fighter.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

const addresses = {
  state: 0x8000,
  stateEnd: 0x8100,
  activeMask: labels.get("ENTITY_ACTIVE_MASK"),
  renderedMask: labels.get("ENTITY_RENDERED_MASK"),
  activeCount: labels.get("ENTITY_ACTIVE_COUNT"),
  spawnTimer: labels.get("ENTITY_SPAWN_TIMER_LO"),
  spawnTimerHi: labels.get("ENTITY_SPAWN_TIMER_HI"),
  spawnPhase: labels.get("ENTITY_SPAWN_PHASE"),
  rng: labels.get("ENTITY_RNG_STATE"),
  events: labels.get("ENTITY_FRAME_EVENTS"),
  type: labels.get("ENTITY_TYPE"),
  entityState: labels.get("ENTITY_STATE"),
  flags: labels.get("ENTITY_FLAGS"),
  x: labels.get("ENTITY_X"),
  y: labels.get("ENTITY_Y"),
  vx: labels.get("ENTITY_VX"),
  vy: labels.get("ENTITY_VY"),
  moveAccumulator: labels.get("ENTITY_MOVE_ACCUMULATOR"),
  verticalAccumulator: labels.get("ENTITY_TIMER"),
  renderId: labels.get("ENTITY_RENDER_ID"),
  screenLo: labels.get("ENTITY_SCREEN_LO"),
  screenHi: labels.get("ENTITY_SCREEN_HI"),
  backing: labels.get("ENTITY_BACKING0"),
  backing1: labels.get("ENTITY_BACKING1"),
  drawnMask: labels.get("ENTITY_DRAWN_MASK"),
  hp: labels.get("ENTITY_HP"),
  owner: labels.get("ENTITY_OWNER"),
  effectActiveMask: labels.get("EFFECT_ACTIVE_MASK"),
  effectActiveCount: labels.get("EFFECT_ACTIVE_COUNT"),
  effectPending: labels.get("EFFECT_ALLOCATION_RESULT"),
  effectState: labels.get("EFFECT_STATE"),
  effectType: labels.get("EFFECT_TYPE"),
  effectX: labels.get("EFFECT_X"),
  effectY: labels.get("EFFECT_Y"),
  effectTimer: labels.get("EFFECT_TIMER"),
  effectRenderId: labels.get("EFFECT_RENDER_ID"),
  effectRendered: labels.get("EFFECT_RENDERED_MASK"),
  effectScreenLo: labels.get("EFFECT_SCREEN_LO"),
  effectScreenHi: labels.get("EFFECT_SCREEN_HI"),
  effectBacking: labels.get("EFFECT_BACKING0"),
  effectDrawnMask: labels.get("EFFECT_DRAWN_MASK"),
  rowLo: labels.get("PLAYFIELD_ROW_LO"),
  rowHi: labels.get("PLAYFIELD_ROW_HI"),
  playerX: labels.get("player_x"),
  playerY: labels.get("player_y"),
  playerLifecycle: labels.get("PLAYER_LIFECYCLE") ?? 0x4eaa,
  playerHealth: 0x4e5d,
  damageCooldown: 0x4e5e,
  damageApplied: 0x4e65,
  sectorState: labels.get("CAPITAL_SECTOR_STATE") ?? 0x4ea5,
  sectorDrainRows: (labels.get("CAPITAL_SECTOR_STATE") ?? 0x4ea5) + 1,
  ringFlags: labels.get("PLAYFIELD_RING_FLAGS"),
  raiderRng: labels.get("rng_state"),
  starfieldRng: labels.get("STAR_RNG_STATE") ?? 0x4ed1,
  frameCounter: labels.get("frame_counter"),
  worldAccumulator: labels.get("scroll_accumulator"),
  hullAccumulator: labels.get("HULL_SCROLL_ACCUMULATOR") ?? 0x4e71,
  broadsideTimer: labels.get("BROAD_SCHEDULE_TIMER") ?? 0x4e5b,
  broadsideState: labels.get("BROAD_STATE") ?? 0x4e40,
  broadsideFlashTimer: (labels.get("CAPITAL_SECTOR_STATE") ?? 0x4ea5) - 3,
  capitalExplosionTimer: labels.get("CAPITAL_EXPLOSION_TIMER") ?? 0x4eae,
  fighterExplosionTimer: labels.get("FIGHTER_EXPLOSION_TIMER") ?? 0x54c4,
  fighterExplosionX: labels.get("FIGHTER_EXPLOSION_X"),
  fighterExplosionY: labels.get("FIGHTER_EXPLOSION_Y"),
  projectileActive: labels.get("FIGHTER_PROJECTILE_ACTIVE"),
  projectileX: labels.get("FIGHTER_PROJECTILE_X"),
  projectileY: labels.get("FIGHTER_PROJECTILE_Y"),
  projectilePreviousY: labels.get("FIGHTER_PROJECTILE_PREV_Y"),
  projectileLifetime: labels.get("FIGHTER_PROJECTILE_LIFETIME"),
  enemyActive: labels.get("ENEMY_ACTIVE"),
  enemyArchetype: labels.get("ENEMY_ARCHETYPE"),
  enemyHp: labels.get("ENEMY_HP"),
  enemyPendingDamage: labels.get("ENEMY_PENDING_DAMAGE"),
  enemyPendingSource: labels.get("ENEMY_PENDING_SOURCE"),
  enemyX: labels.get("enemy_x"),
  enemyY: labels.get("enemy_y"),
  scoreLo: labels.get("score_bcd_lo"),
  scoreHi: labels.get("score_bcd_hi"),
  viperBurstTimer: labels.get("VIPER_BURST_TIMER"),
  raiderBurstTimer: labels.get("RAIDER_BURST_TIMER"),
};

function loadRuntime(memory) {
  for (const segment of parseXex(xex).segments) memory.set(segment.data, segment.start);
  memory.set(starfieldRuntime, manifest.starfieldRuntime.runAddress);
  memory.set(broadsideRuntime, manifest.broadsideRuntime.runAddress);
  memory.set(a2KernelRuntime, manifest.a2Kernel.runAddress);
  memory.set(entityCodeRuntime, manifest.entityEffects.codeRunAddress);
}

function createRuntimeMemory(fill = 0) {
  const memory = new Uint8Array(0x10000).fill(fill);
  loadRuntime(memory);
  return memory;
}

function runRoutine(memory, name, { accumulator = 0, beforeExecute } = {}) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.a = accumulator;
  cpu.pc = labels.get(name);
  assert.ok(Number.isInteger(cpu.pc), `missing linked routine ${name}`);
  beforeExecute?.(cpu);
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return cpu.cycles;
}

function initialiseRows(memory, head = 0) {
  for (let logical = 0; logical < 22; logical += 1) {
    const physical = (head + logical) % 22;
    const address = 0x4050 + physical * 40;
    memory[addresses.rowLo + logical] = address & 0xff;
    memory[addresses.rowHi + logical] = address >> 8;
  }
}

function initialiseEntity(memory, { x = 124, y = 24 } = {}) {
  runRoutine(memory, "init_entity_effects");
  memory[addresses.activeMask] = 1;
  memory[addresses.activeCount] = 1;
  memory[addresses.x] = x;
  memory[addresses.y] = y;
  memory[addresses.vy] = 8;
  memory[addresses.renderId] = manifest.entityEffects.glyphIndex ?? 110;
  memory[addresses.playerX] = 196;
  memory[addresses.playerY] = 184;
  memory[addresses.playerLifecycle] = 0;
  memory[addresses.sectorState] = 0;
}

function initialiseShootableDebris(memory, { hp = 3, ...options } = {}) {
  initialiseEntity(memory, options);
  memory[addresses.flags] = 0x3f;
  memory[addresses.type] = 1;
  memory[addresses.entityState] = 1;
  memory[addresses.hp] = hp;
}

function armViperProjectile(memory, slot, { x, y, lifetime = 10 }) {
  memory[addresses.projectileActive + slot] = 1;
  memory[addresses.projectileX + slot] = x;
  memory[addresses.projectileY + slot] = y;
  memory[addresses.projectilePreviousY + slot] = y;
  memory[addresses.projectileLifetime + slot] = lifetime;
}

test("entity descriptor and glyph generation are deterministic and bounded", () => {
  const first = compileEntityEffects(loadEntityEffectsDefinition(definitionPath));
  const second = compileEntityEffects(loadEntityEffectsDefinition(definitionPath));
  assert.deepEqual(first.descriptor, second.descriptor);
  assert.deepEqual(first.glyphs, second.glyphs);
  assert.deepEqual(first.trajectoryVx, second.trajectoryVx);
  assert.equal(renderEntityEffectsCa65Include(first), renderEntityEffectsCa65Include(second));
  assert.equal(first.descriptor.length, 16);
  assert.equal(first.glyphs.length, 64);
  assert.deepEqual([...first.trajectoryVx], [0, 0xfc, 4, 0]);
  assert.deepEqual(first.debrisVisuals.variants.map(({ id }) => id),
    ["armour-shard", "truss-fragment"]);
  assert.ok(first.debrisVisuals.variants.every(({ phases }) => phases.length === 2));
  assert.deepEqual(first.raiderBreakup, {
    coreFrames: 5,
    fragmentFrames: 30,
    coreOffsetHpos: 6,
    fragments: [
      { id: "left-wing", phaseGlyphs: ["armour-left-0", "armour-left-1"] },
      { id: "right-wing", phaseGlyphs: ["armour-right-0", "armour-right-1"] },
      { id: "central", phaseGlyphs: ["debris-fragment-0", "debris-fragment-1"] },
      { id: "red-eye", phaseGlyphs: ["raider-pulse-0-red", "raider-pulse-1-red"] },
    ],
  });
  assert.deepEqual([...first.descriptor.slice(5, 10)], [8, 8, 1, 0, 8]);
  assert.equal(first.descriptor[12], 0,
    "ENTITY_TIMER must start at zero for the deterministic 3/5 accumulator");
  for (const [variantIndex, { phases }] of first.debrisVisuals.variants.entries()) {
    for (const [phaseIndex, glyphs] of phases.entries()) {
      const activePixels = [];
      const selectors = [];
      glyphs.forEach((rows, glyphIndex) => {
        rows.forEach((row, y) => {
          for (let pixel = 0; pixel < 4; pixel += 1) {
            const selector = row >> (6 - pixel * 2) & 3;
            if (selector !== 0) {
              selectors.push(selector);
              const x = glyphIndex * 8 + pixel * 2;
              activePixels.push([x, y], [x + 1, y]);
            }
          }
        });
      });
      const xs = activePixels.map(([x]) => x);
      const ys = activePixels.map(([, y]) => y);
      assert.ok(Math.max(...xs) - Math.min(...xs) + 1 >= 15);
      assert.ok(Math.max(...ys) - Math.min(...ys) + 1 >= 7);
      assert.ok(selectors.every((selector) => selector === 2 || selector === 3),
        `variant ${variantIndex} phase ${phaseIndex} reused the white star bank`);
      const previousLitPixels = variantIndex === 0 ? 36 : 34;
      const growth = selectors.length / previousLitPixels - 1;
      assert.ok(growth >= 0.25 && growth <= 0.35,
        `variant ${variantIndex} phase ${phaseIndex} grew ${(growth * 100).toFixed(1)}%`);
      if (variantIndex === 0) assert.ok(selectors.length >= 45 && selectors.length <= 48);
      else assert.ok(selectors.length >= 43 && selectors.length <= 45);
    }
    assert.notDeepEqual(phases[0], phases[1]);
  }
});

test("entity memory and code reservations are exact and do not use BASIC ROM", () => {
  assert.deepEqual([
    manifest.entityEffects.stateAddress,
    manifest.entityEffects.stateBytes,
    manifest.entityEffects.initializedBytes,
    manifest.entityEffects.codeRunAddress,
    manifest.entityEffects.codeReservedBytes,
  ], [0x8000, 0x100, 0x100, 0x9100, 0x0f00]);
  assert.ok(manifest.entityEffects.codeBytes <= manifest.entityEffects.codeReservedBytes);
  assert.equal(manifest.entityEffects.interactiveSlots, 4);
  assert.equal(manifest.entityEffects.interactiveActiveLimit, 1);
  assert.equal(manifest.entityEffects.effectSlots, 6);
  assert.equal(manifest.entityEffects.effectActiveLimit, 5);
  assert.equal(manifest.entityEffects.glyphCount, 10);
  assert.equal(manifest.entityEffects.glyphBytes, 80);
  assert.equal(manifest.entityEffects.newGlyphsFromFoundation, 7);
  assert.equal(manifest.entityEffects.glyphIndex + manifest.entityEffects.glyphCount, 120);
  assert.equal(128 - manifest.entityEffects.glyphIndex - manifest.entityEffects.glyphCount, 8);
  assert.equal(manifest.entityEffects.codeBudget.baselineBytes, 564);
  assert.equal(manifest.entityEffects.codeBudget.approvedDeltaBytes, 512);
  assert.ok(manifest.entityEffects.codeBudget.actualDeltaBytes <= 512);
  assert.match(source, /ENTITY_EFFECT_STATE_END = ENTITY_STATE_ADDRESS\+ENTITY_STATE_BYTES/);
  assert.doesNotMatch(source.slice(source.indexOf('.segment "ENTITY_CODE"')), /\$A000|\$BFFF/);
});

test("$A5 cold RAM is fully and identically initialised for XEX and ATR", () => {
  const payloads = [
    parseXex(xex).segments[0],
    { start: manifest.loadAddress, data: parseAtr(atr).body.subarray(0, manifest.payloadBytes) },
  ];
  const results = [];
  for (const payload of payloads) {
    const memory = new Uint8Array(0x10000).fill(0xa5);
    memory.set(payload.data, payload.start);
    runRoutine(memory, "unpack_entity_runtime");
    assert.deepEqual(
      [...memory.slice(manifest.entityEffects.codeRunAddress,
        manifest.entityEffects.codeRunAddress + manifest.entityEffects.codeBytes)],
      [...entityCodeRuntime],
    );
    runRoutine(memory, "unpack_broadside_runtime");
    assert.deepEqual(
      [...memory.slice(manifest.broadsideRuntime.runAddress,
        manifest.broadsideRuntime.runAddress + broadsideRuntime.length)],
      [...broadsideRuntime],
      "ENTITY_CODE bootstrap must re-arm the shared LZSS decoder for broadside",
    );
    const lowerSentinel = memory[0x7fff];
    const upperSentinel = memory[0x8100];
    runRoutine(memory, "init_entity_effects");
    assert.equal(memory[0x7fff], lowerSentinel);
    assert.equal(memory[0x8100], upperSentinel);
    const state = memory.slice(addresses.state, addresses.stateEnd);
    assert.equal(state.every((byte, index) =>
      byte === (index === 3 ? 32 : index === 6 ? 0x65 : 0)), true);
    results.push(state);
  }
  assert.deepEqual(results[0], results[1]);
});

test("all four 2x1 debris phases map both cells through every logical row and A2 ring head", () => {
  for (let head = 0; head < 22; head += 1) {
    for (let logical = 0; logical < 22; logical += 1) {
      for (const glyphOffset of [0, 2, 4, 6]) {
        const memory = createRuntimeMemory();
        initialiseRows(memory, head);
        initialiseEntity(memory, { y: 24 + logical * 8 });
        memory[addresses.flags] = 0x37;
        memory[addresses.renderId] = manifest.entityEffects.glyphIndex + glyphOffset;
        runRoutine(memory, "entity_effects_render");
        const pointer = memory[addresses.screenLo] | memory[addresses.screenHi] << 8;
        const expectedRow = 0x4050 + ((head + logical) % 22) * 40;
        assert.equal(pointer, expectedRow + 19,
          `glyph ${glyphOffset}, head ${head}, logical ${logical} mapped outside its ring row`);
        assert.equal(memory[pointer], manifest.entityEffects.glyphIndex + glyphOffset);
        assert.equal(memory[pointer + 1], manifest.entityEffects.glyphIndex + glyphOffset + 1);
        assert.equal(memory[addresses.drawnMask], 3);
        assert.ok(pointer + 1 <= expectedRow + 39,
          "both cells crossed a physical row boundary");
        assert.ok(pointer >= 0x4050 && pointer <= 0x43bf);
      }
    }
  }
});

test("divider and HUD coordinates cannot render or collide", () => {
  for (const y of [8, 15, 16, 23, 200, 255]) {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    initialiseEntity(memory, { x: 124, y });
    memory[addresses.playerX] = 124;
    memory[addresses.playerY] = 16;
    memory[addresses.playerHealth] = 10;
    runRoutine(memory, "entity_effects_render");
    assert.equal(memory[addresses.renderedMask], 0, `Y=${y} rendered outside gameplay`);
    runRoutine(memory, "entity_collide_player");
    assert.equal(memory[addresses.playerHealth], 10, `Y=${y} collided outside gameplay`);
    assert.equal(memory[addresses.activeMask], 1);
  }
});

function nextEntityRng(value) {
  const shifted = value << 1 & 0xff;
  return (value & 0x80) === 0 ? shifted : shifted ^ 0x1d;
}

test("spawn deterministically selects two variants, two phases and three trajectories", () => {
  const observedVariants = new Set();
  const observedPhases = new Set();
  const observedTrajectories = new Set();
  for (let seed = 1; seed <= 255; seed += 1) {
    const first = createRuntimeMemory();
    const second = createRuntimeMemory();
    for (const memory of [first, second]) {
      initialiseRows(memory);
      runRoutine(memory, "init_entity_effects");
      memory[addresses.rng] = seed;
      memory[addresses.spawnTimer] = 1;
      memory[addresses.sectorState] = 0;
      memory[addresses.playerX] = 196;
      memory[addresses.playerY] = 184;
      runRoutine(memory, "entity_effects_update");
    }
    const selection = nextEntityRng(seed);
    const positionRandom = nextEntityRng(selection);
    const glyphOffset = (selection & 3) * 2;
    const expectedVx = [0, 0xfc, 4, 0][selection >> 2 & 3];
    let columnOffset = positionRandom & 0x03;
    if (columnOffset === 3) columnOffset = 1;
    assert.deepEqual([
      first[addresses.renderId], first[addresses.vx], first[addresses.x], first[addresses.rng],
      first[addresses.hp],
    ], [manifest.entityEffects.glyphIndex + glyphOffset, expectedVx,
      120 + columnOffset * 4, positionRandom, 3]);
    assert.deepEqual(
      [...first.slice(addresses.state, addresses.stateEnd)],
      [...second.slice(addresses.state, addresses.stateEnd)],
    );
    observedVariants.add(glyphOffset >> 2);
    observedPhases.add(glyphOffset >> 1 & 1);
    observedTrajectories.add(expectedVx);
  }
  assert.deepEqual([...observedVariants].sort(), [0, 1]);
  assert.deepEqual([...observedPhases].sort(), [0, 1]);
  assert.deepEqual([...observedTrajectories].sort((a, b) => a - b), [0, 4, 0xfc]);
});

test("X, Y and tumbling phase change only on WORLD_ROW_ADVANCED", () => {
  const memory = createRuntimeMemory();
  initialiseRows(memory);
  runRoutine(memory, "init_entity_effects");
  memory[addresses.spawnTimer] = 1;
  memory[addresses.sectorState] = 0;
  memory[addresses.playerX] = 196;
  memory[addresses.playerY] = 184;
  runRoutine(memory, "entity_effects_update");
  assert.deepEqual([
    memory[addresses.activeMask], memory[addresses.activeCount],
    memory[addresses.x], memory[addresses.y], memory[addresses.rng],
    memory[addresses.renderId], memory[addresses.vx],
  ], [1, 1, 124, 24, 0x89, manifest.entityEffects.glyphIndex + 4, 4]);
  const initialGlyph = memory[addresses.renderId];
  runRoutine(memory, "entity_effects_update");
  assert.deepEqual([
    memory[addresses.x], memory[addresses.y], memory[addresses.renderId],
    memory[addresses.moveAccumulator],
  ], [124, 24, initialGlyph, 0], "ordinary frame must not move or tumble world debris");
  const expectedY = [24, 32, 32, 40];
  const expectedVerticalAccumulator = [3, 1, 4, 2];
  for (let event = 1; event <= 4; event += 1) {
    memory[addresses.events] = 1;
    runRoutine(memory, "entity_effects_update");
    assert.equal(memory[addresses.y], expectedY[event - 1]);
    assert.equal(memory[addresses.verticalAccumulator], expectedVerticalAccumulator[event - 1]);
    assert.equal(memory[addresses.renderId], initialGlyph + (event & 1 ? 2 : 0));
    assert.equal(memory[addresses.x], event < 4 ? 124 : 128);
    assert.equal(memory[addresses.moveAccumulator], event < 4 ? event : 0);
  }
  memory[addresses.y] = 192;
  memory[addresses.verticalAccumulator] = 2;
  const xBeforeDespawn = memory[addresses.x];
  const phaseBeforeDespawn = memory[addresses.renderId];
  memory[addresses.events] = 1;
  runRoutine(memory, "entity_effects_update");
  assert.deepEqual([
    memory[addresses.activeMask], memory[addresses.activeCount], memory[addresses.spawnTimer],
  ], [0, 0, 64]);
  assert.equal(memory[addresses.x], xBeforeDespawn);
  assert.equal(memory[addresses.renderId], phaseBeforeDespawn);
});

test("all deterministic trajectories remain inside the inner corridor through despawn", () => {
  for (let seed = 1; seed <= 255; seed += 1) {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    runRoutine(memory, "init_entity_effects");
    memory[addresses.rng] = seed;
    memory[addresses.spawnTimer] = 1;
    memory[addresses.sectorState] = 0;
    memory[addresses.playerX] = 196;
    memory[addresses.playerY] = 184;
    runRoutine(memory, "entity_effects_update");
    while (memory[addresses.activeMask] !== 0) {
      assert.ok(memory[addresses.x] >= 84 && memory[addresses.x] + 8 <= 172,
        `seed ${seed} escaped the inner corridor at X=${memory[addresses.x]}`);
      memory[addresses.events] = 1;
      runRoutine(memory, "entity_effects_update");
    }
  }
});

test("debris advances exactly three vertical rows in five world events", () => {
  const memory = createRuntimeMemory();
  initialiseRows(memory);
  initialiseEntity(memory, { x: 124, y: 24 });
  memory[addresses.verticalAccumulator] = 0;
  const rows = [];
  for (let event = 0; event < 12; event += 1) {
    memory[addresses.events] = 1;
    runRoutine(memory, "entity_effects_update");
    rows.push(memory[addresses.y]);
  }
  assert.deepEqual(rows, [24, 32, 32, 40, 48, 48, 56, 56, 64, 72, 72, 80]);
});

test("EASY, MEDIUM and HARD keep world speed while far/near/debris use exact 25/50/60% rates", () => {
  const denominator = capitalHullsDefinition.broadside.worldScrollRateDenominator;
  assert.equal(denominator, 20);
  assert.deepEqual(capitalHullsDefinition.broadside.worldScrollRates,
    { easy: 8, medium: 9, hard: 10 });
  assert.deepEqual(capitalHullsDefinition.broadside.hullScrollRates,
    capitalHullsDefinition.broadside.worldScrollRates);
  assert.deepEqual([
    starfieldDefinition.nearLayer.rateNumerator,
    starfieldDefinition.nearLayer.rateDenominator,
    starfieldDefinition.farLayer.rateNumerator,
    starfieldDefinition.farLayer.rateDenominator,
  ], [1, 2, 1, 4]);

  const measured = {};
  for (const [difficulty, numerator] of
    Object.entries(capitalHullsDefinition.broadside.worldScrollRates)) {
    const worldRowsPerSecond = 50 * numerator / denominator;
    const nearRowsPerSecond = worldRowsPerSecond / 2;
    const farRowsPerSecond = worldRowsPerSecond / 4;
    const debrisRowsPerSecond = worldRowsPerSecond * 3 / 5;
    assert.ok(farRowsPerSecond < nearRowsPerSecond &&
      nearRowsPerSecond < debrisRowsPerSecond &&
      debrisRowsPerSecond < worldRowsPerSecond);

    let worldAccumulator = 0;
    let nearAccumulator = 0;
    const stepFrame = () => {
      let worldAdvanced = false;
      let nearAdvanced = false;
      worldAccumulator += numerator;
      if (worldAccumulator >= denominator) {
        worldAccumulator -= denominator;
        worldAdvanced = true;
        nearAccumulator += starfieldDefinition.nearLayer.rateNumerator;
        if (nearAccumulator >= starfieldDefinition.nearLayer.rateDenominator) {
          nearAccumulator -= starfieldDefinition.nearLayer.rateDenominator;
          nearAdvanced = true;
        }
      }
      return { worldAdvanced, nearAdvanced };
    };
    for (let frame = 1; frame <= 32; frame += 1) {
      stepFrame();
    }
    const spawnWorldAccumulator = worldAccumulator;
    const spawnNearAccumulator = nearAccumulator;
    const framesFor = (numerator, denominator) => {
      worldAccumulator = spawnWorldAccumulator;
      nearAccumulator = spawnNearAccumulator;
      let phase = 0;
      let frames = 0;
      let steps = 0;
      while (steps < 22) {
        frames += 1;
        const { worldAdvanced } = stepFrame();
        if (worldAdvanced) {
          phase += numerator;
          if (phase >= denominator) {
            phase -= denominator;
            steps += 1;
          }
        }
      }
      return frames;
    };
    measured[difficulty] = {
      worldRowsPerSecond,
      nearRowsPerSecond,
      farRowsPerSecond,
      debrisRowsPerSecond,
      rejectedCandidateDebrisRowsPerSecond: worldRowsPerSecond * 3 / 4,
      rejectedCandidateFrames: framesFor(3, 4),
      finalFrames: framesFor(3, 5),
    };
  }
  assert.deepEqual(measured, {
    easy: {
      worldRowsPerSecond: 20, nearRowsPerSecond: 10, farRowsPerSecond: 5,
      debrisRowsPerSecond: 12, rejectedCandidateDebrisRowsPerSecond: 15,
      rejectedCandidateFrames: 73, finalFrames: 91,
    },
    medium: {
      worldRowsPerSecond: 22.5, nearRowsPerSecond: 11.25, farRowsPerSecond: 5.625,
      debrisRowsPerSecond: 13.5, rejectedCandidateDebrisRowsPerSecond: 16.875,
      rejectedCandidateFrames: 66, finalFrames: 82,
    },
    hard: {
      worldRowsPerSecond: 25, nearRowsPerSecond: 12.5, farRowsPerSecond: 6.25,
      debrisRowsPerSecond: 15, rejectedCandidateDebrisRowsPerSecond: 18.75,
      rejectedCandidateFrames: 60, finalFrames: 74,
    },
  });
  assert.match(source,
    /advance_starfield_layers:\s+lda #ENTITY_EVENT_WORLD_ROW_ADVANCED\s+sta ENTITY_FRAME_EVENTS/);
  assert.doesNotMatch(source.slice(source.indexOf("rotate_playfield_rows:"),
    source.indexOf("init_starfield_state:")), /sta ENTITY_FRAME_EVENTS/,
  "WORLD_ROW_ADVANCED must follow legacy world, not the slower near/ring step");
  assert.match(source,
    /scroll_world_columns:[\s\S]+jsr rotate_playfield_rows[\s\S]+cmp #CAPITAL_HULL_STATE_COMPLETE[\s\S]+jsr entity_complete_scroll_tick/,
  "COMPLETE must count 22 actual ring rotations independently of the debris world event");
});

test("entity selection and movement do not mutate other RNG or gameplay cadence state", () => {
  const memory = createRuntimeMemory();
  initialiseRows(memory);
  runRoutine(memory, "init_entity_effects");
  const protectedState = new Map([
    [addresses.raiderRng, 0x37],
    [addresses.starfieldRng, 0xa7],
    [addresses.frameCounter, 0x5c],
    [addresses.worldAccumulator, 0x09],
    [addresses.hullAccumulator, 0x0b],
    [addresses.broadsideTimer, 0x31],
    [addresses.viperBurstTimer, 0x07],
    [addresses.raiderBurstTimer, 0x13],
  ]);
  for (const [address, value] of protectedState) memory[address] = value;
  memory[addresses.spawnTimer] = 1;
  memory[addresses.sectorState] = 0;
  memory[addresses.playerX] = 196;
  memory[addresses.playerY] = 184;
  runRoutine(memory, "entity_effects_update");
  runRoutine(memory, "entity_effects_render");
  runRoutine(memory, "entity_effects_erase");
  memory[addresses.events] = 1;
  runRoutine(memory, "entity_effects_update");
  for (const [address, value] of protectedState) {
    assert.equal(memory[address], value, `entity engine changed cadence/RNG byte $${address.toString(16)}`);
  }
});

test("pause, new game, life loss, full sector transition and Game Over preserve entity semantics", () => {
  const startGameplay = source.slice(source.indexOf("start_gameplay:"),
    source.indexOf("start_gameplay_end:"));
  assert.match(startGameplay, /jsr init_state[\s\S]+jsr init_entity_effects/,
    "a fresh START GAME must reset entity state through the existing reset path");

  const pause = source.slice(source.indexOf("enter_pause:"), source.indexOf("resume_gameplay:"));
  assert.doesNotMatch(pause, /entity_effects_(?:erase|update|render)|init_entity_effects/,
    "pause must not mutate or reset entity state");

  const respawn = source.slice(source.indexOf("respawn_player:"),
    source.indexOf("tick_respawn_invulnerability:"));
  assert.doesNotMatch(respawn, /init_entity_effects|entity_despawn_debris/,
    "same-sector life loss must not reset or remove debris");

  const mainLoop = source.slice(source.indexOf("main_loop:"),
    source.indexOf("main_loop_option_poll"));
  assert.match(mainLoop,
    /jsr update_player_death[\s\S]+bcc @lifecycle_ready[\s\S]+jsr enter_game_over[\s\S]+jmp frontend_loop[\s\S]+@lifecycle_ready:[\s\S]+jsr entity_effects_update/,
    "terminal Game Over must leave gameplay before the entity update");

  const emptyDuringDrain = createRuntimeMemory();
  initialiseRows(emptyDuringDrain);
  runRoutine(emptyDuringDrain, "init_entity_effects");
  emptyDuringDrain[addresses.spawnTimer] = 1;
  emptyDuringDrain[addresses.sectorState] = 5;
  runRoutine(emptyDuringDrain, "entity_effects_update");
  assert.deepEqual([
    emptyDuringDrain[addresses.activeMask], emptyDuringDrain[addresses.spawnTimer],
    emptyDuringDrain[addresses.rng],
  ], [0, 64, 101], "DRAIN must defer a new spawn without consuming entity RNG");

  const transition = createRuntimeMemory();
  initialiseRows(transition);
  runRoutine(transition, "init_entity_effects");
  const protectedState = new Map([
    [addresses.raiderRng, 0x37],
    [addresses.viperBurstTimer, 0x07],
    [addresses.raiderBurstTimer, 0x13],
  ]);
  transition[addresses.starfieldRng] = 0xa7;
  for (const [address, value] of protectedState) transition[address] = value;
  transition[addresses.sectorState] = 5;
  transition[addresses.spawnTimer] = 1;
  runRoutine(transition, "entity_effects_update");
  assert.deepEqual([
    transition[addresses.activeMask], transition[addresses.spawnTimer],
    transition[addresses.rng], transition[addresses.spawnPhase],
  ], [0, 64, 101, 0]);

  transition[addresses.sectorDrainRows] = 23;
  transition.fill(0, addresses.broadsideState, addresses.broadsideState + 3);
  transition.fill(0, addresses.broadsideFlashTimer, addresses.broadsideFlashTimer + 3);
  transition.fill(0, addresses.capitalExplosionTimer, addresses.capitalExplosionTimer + 2);
  transition.fill(0, addresses.fighterExplosionTimer, addresses.fighterExplosionTimer + 2);
  runRoutine(transition, "update_sector_completion");
  assert.deepEqual([
    transition[addresses.sectorState], transition[addresses.spawnTimerHi],
  ], [6, 22]);
  transition[addresses.spawnTimer] = 1;
  runRoutine(transition, "entity_effects_update");
  assert.deepEqual([
    transition[addresses.activeMask], transition[addresses.spawnTimer],
    transition[addresses.rng],
  ], [0, 64, 101], "COMPLETE must defer without consuming entity RNG");

  for (let row = 1; row <= 21; row += 1) {
    runRoutine(transition, "scroll_world_columns");
    assert.equal(transition[addresses.sectorState], 6,
      `COMPLETE ended before reconstruction row ${row + 1}`);
  }
  runRoutine(transition, "scroll_world_columns");
  assert.deepEqual([
    transition[addresses.sectorState], transition[addresses.spawnTimerHi],
    transition[addresses.spawnTimer], transition[addresses.activeMask],
    transition[addresses.rng],
  ], [7, 0, 32, 0, 101],
  "OPEN must re-arm normal delay without clearing the pool or consuming RNG");
  const postReconstructionStarRng = transition[addresses.starfieldRng];
  assert.notEqual(postReconstructionStarRng, 0xa7,
    "22 normal ring rotations must retain normal starfield RNG progression");
  for (let frame = 1; frame <= 31; frame += 1) {
    runRoutine(transition, "entity_effects_update");
    assert.equal(transition[addresses.activeMask], 0,
      `post-sector debris spawned early on delay frame ${frame}`);
  }
  runRoutine(transition, "entity_effects_update");
  assert.equal(transition[addresses.activeMask], 1,
    "the next legal open-space sector did not resume deterministic debris spawning");
  assert.equal(transition[addresses.rng], nextEntityRng(nextEntityRng(101)));
  assert.equal(transition[addresses.starfieldRng], postReconstructionStarRng,
    "the post-sector entity delay must not reset or advance starfield RNG");
  for (const [address, value] of protectedState) {
    assert.equal(transition[address], value,
      `capital-sector re-arm changed unrelated state at $${address.toString(16)}`);
  }

  const activeDuringDrain = createRuntimeMemory();
  initialiseRows(activeDuringDrain);
  initialiseEntity(activeDuringDrain, { x: 124, y: 24 });
  activeDuringDrain[addresses.sectorState] = 5;
  activeDuringDrain[addresses.vx] = 4;
  activeDuringDrain[addresses.moveAccumulator] = 3;
  activeDuringDrain[addresses.verticalAccumulator] = 0;
  activeDuringDrain[addresses.events] = 1;
  runRoutine(activeDuringDrain, "entity_effects_update");
  assert.deepEqual([
    activeDuringDrain[addresses.activeMask], activeDuringDrain[addresses.x],
    activeDuringDrain[addresses.y], activeDuringDrain[addresses.renderId],
  ], [1, 128, 24, manifest.entityEffects.glyphIndex + 2],
  "an already-active debris must retain its existing sector-transition lifecycle");
});

test("phase and position changes preserve backing across A2 ring wrap without ghosts", () => {
  const memory = createRuntimeMemory();
  initialiseRows(memory, 21);
  initialiseEntity(memory, { x: 140, y: 24 });
  memory[addresses.vx] = 4;
  memory[addresses.moveAccumulator] = 3;
  memory[addresses.renderId] = manifest.entityEffects.glyphIndex;
  const oldCell = 0x4050 + 21 * 40 + 23;
  memory[oldCell] = 0x91;
  memory[oldCell + 1] = 0x92;
  runRoutine(memory, "entity_effects_render");
  assert.equal(memory[oldCell], manifest.entityEffects.glyphIndex);
  assert.equal(memory[oldCell + 1], manifest.entityEffects.glyphIndex + 1);
  assert.deepEqual([
    memory[addresses.backing], memory[addresses.backing1], memory[addresses.drawnMask],
  ], [0x91, 0x92, 3]);

  runRoutine(memory, "entity_effects_erase");
  assert.equal(memory[oldCell], 0x91, "old ring cell must restore its exact lower overlay");
  assert.equal(memory[oldCell + 1], 0x92,
    "right old ring cell must restore before the left cell");
  initialiseRows(memory, 0);
  memory[addresses.verticalAccumulator] = 2;
  memory[addresses.events] = 1;
  runRoutine(memory, "entity_effects_update");
  assert.deepEqual([
    memory[addresses.x], memory[addresses.y], memory[addresses.renderId],
    memory[addresses.moveAccumulator],
  ], [144, 32, manifest.entityEffects.glyphIndex + 2, 0]);
  const newCell = 0x4050 + 40 + 24;
  memory[newCell] = 0x66;
  memory[newCell + 1] = 0x67;
  runRoutine(memory, "entity_effects_render");
  assert.equal(memory[newCell], manifest.entityEffects.glyphIndex + 2);
  assert.equal(memory[newCell + 1], manifest.entityEffects.glyphIndex + 3);
  assert.equal(memory[addresses.backing], 0x66);
  assert.equal(memory[addresses.backing1], 0x67);
  assert.equal(memory[oldCell], 0x91, "phase/position change left a ghost glyph");
  assert.equal(memory[oldCell + 1], 0x92, "right phase cell left a ghost glyph");
  runRoutine(memory, "entity_effects_erase");
  assert.equal(memory[newCell], 0x66, "new ring cell must restore exact backing");
  assert.equal(memory[newCell + 1], 0x67, "new right cell must restore exact backing");
});

test("debris damage uses the canonical one-event gate and invulnerability does not consume it", () => {
  const vulnerable = createRuntimeMemory();
  initialiseEntity(vulnerable, { x: 124, y: 184 });
  vulnerable[addresses.playerX] = 124;
  vulnerable[addresses.playerY] = 184;
  vulnerable[addresses.playerHealth] = 10;
  vulnerable[addresses.damageCooldown] = 0;
  vulnerable[addresses.damageApplied] = 0;
  runRoutine(vulnerable, "entity_effects_update");
  assert.deepEqual([
    vulnerable[addresses.playerHealth], vulnerable[addresses.damageApplied],
    vulnerable[addresses.activeMask], vulnerable[addresses.activeCount],
  ], [9, 1, 0, 0]);

  const invulnerable = createRuntimeMemory();
  initialiseEntity(invulnerable, { x: 124, y: 184 });
  invulnerable[addresses.playerX] = 124;
  invulnerable[addresses.playerY] = 184;
  invulnerable[addresses.playerHealth] = 10;
  invulnerable[addresses.playerLifecycle] = 2;
  invulnerable[addresses.damageCooldown] = 0;
  invulnerable[addresses.damageApplied] = 0;
  runRoutine(invulnerable, "entity_effects_update");
  assert.deepEqual([
    invulnerable[addresses.playerHealth], invulnerable[addresses.damageApplied],
    invulnerable[addresses.activeMask], invulnerable[addresses.activeCount],
  ], [10, 0, 1, 1]);

  const alreadyDamaged = createRuntimeMemory();
  initialiseEntity(alreadyDamaged, { x: 124, y: 184 });
  alreadyDamaged[addresses.playerX] = 124;
  alreadyDamaged[addresses.playerY] = 184;
  alreadyDamaged[addresses.playerHealth] = 10;
  alreadyDamaged[addresses.damageApplied] = 1;
  runRoutine(alreadyDamaged, "entity_effects_update");
  assert.deepEqual([
    alreadyDamaged[addresses.playerHealth], alreadyDamaged[addresses.activeMask],
  ], [10, 1]);
});

test("debris collision covers the full visible 16x8 box with half-open edges", () => {
  const collideAt = (playerX, playerY) => {
    const memory = createRuntimeMemory();
    initialiseEntity(memory, { x: 124, y: 184 });
    memory[addresses.playerX] = playerX;
    memory[addresses.playerY] = playerY;
    memory[addresses.playerHealth] = 10;
    memory[addresses.damageCooldown] = 0;
    memory[addresses.damageApplied] = 0;
    runRoutine(memory, "entity_collide_player");
    return [memory[addresses.playerHealth], memory[addresses.activeMask]];
  };

  assert.deepEqual(collideAt(131, 184), [9, 0],
    "the second debris cell must participate in collision");
  assert.deepEqual(collideAt(132, 184), [10, 1],
    "the exclusive right edge must not collide");
  assert.deepEqual(collideAt(117, 184), [9, 0],
    "the first visible HPOS must collide with the player's last HPOS");
  assert.deepEqual(collideAt(116, 184), [10, 1],
    "the exclusive left edge must not collide");
  assert.deepEqual(collideAt(124, 191), [9, 0],
    "the eighth visible scanline must collide");
  assert.deepEqual(collideAt(124, 192), [10, 1],
    "the exclusive bottom edge must not collide");
});

test("three Viper hits destroy every debris form while score and enemy paths remain unchanged", () => {
  for (const renderId of [110, 112, 114, 116]) {
    for (const vx of [0, 0xfc, 4]) {
      const memory = createRuntimeMemory();
      initialiseRows(memory);
      initialiseShootableDebris(memory, { x: 124, y: 100 });
      memory[addresses.renderId] = renderId;
      memory[addresses.vx] = vx;
      memory[addresses.scoreLo] = 0x42;
      memory[addresses.scoreHi] = 0x07;
      memory[addresses.enemyPendingDamage] = 0;
      memory[addresses.fighterExplosionTimer] = 0;
      for (let hit = 1; hit <= 3; hit += 1) {
        armViperProjectile(memory, 0, { x: 127, y: 106 });
        runRoutine(memory, "update_fighter_projectiles");
        assert.equal(memory[addresses.projectileActive], 0,
          `hit ${hit} did not consume its projectile`);
        assert.deepEqual([memory[addresses.scoreLo], memory[addresses.scoreHi]], [0x42, 0x07]);
        assert.deepEqual([
          memory[addresses.enemyPendingDamage], memory[addresses.fighterExplosionTimer],
        ], [0, 0], `hit ${hit} entered an enemy/full-screen explosion path`);
        if (hit < 3) {
          assert.deepEqual([
            memory[addresses.hp], memory[addresses.activeMask], memory[addresses.activeCount],
            memory[addresses.owner], memory[addresses.effectActiveCount],
          ], [3 - hit, 1, 1, 3, 0]);
          runRoutine(memory, "entity_effects_update");
        }
      }
      assert.deepEqual([
        memory[addresses.hp], memory[addresses.activeMask], memory[addresses.activeCount],
        memory[addresses.spawnTimer], memory[addresses.effectActiveMask],
        memory[addresses.effectActiveCount],
      ], [0, 0, 0, 65, 0x1f, 5],
      `render ${renderId}, vx ${vx} did not spawn one core plus four fragments`);
      runRoutine(memory, "entity_effects_update");
      assert.equal(memory[addresses.spawnTimer], 64,
        "shot destruction must enter the ordinary full repeat delay");
    }
  }
});

test("Viper collision covers the half-open 2x1 footprint and swept upper boundary", () => {
  const hit = ({ x, y }) => {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    initialiseShootableDebris(memory, { x: 124, y: 100, hp: 1 });
    armViperProjectile(memory, 0, { x, y });
    runRoutine(memory, "update_fighter_projectiles");
    return [memory[addresses.activeMask], memory[addresses.projectileActive]];
  };
  for (let x = 124; x < 132; x += 1) assert.deepEqual(hit({ x, y: 106 }), [0, 0]);
  assert.deepEqual(hit({ x: 123, y: 106 }), [1, 1], "left edge must be half-open");
  assert.deepEqual(hit({ x: 132, y: 106 }), [1, 1], "right edge must be half-open");
  for (let row = 0; row < 8; row += 1) {
    assert.deepEqual(hit({ x: 124, y: 106 + row }), [0, 0],
      `visible debris row ${row} was not shootable`);
  }
  assert.deepEqual(hit({ x: 124, y: 99 }), [0, 0],
    "a six-scanline step plus the two-line projectile must catch the exact swept boundary");
  assert.deepEqual(hit({ x: 124, y: 98 }), [1, 1],
    "the scanline above the swept boundary must miss");
});

test("lowest matching Viper slot is consumed once and every higher slot remains active", () => {
  const memory = createRuntimeMemory();
  initialiseRows(memory);
  initialiseShootableDebris(memory, { x: 124, y: 100 });
  armViperProjectile(memory, 0, { x: 112, y: 106 });
  armViperProjectile(memory, 2, { x: 124, y: 106 });
  armViperProjectile(memory, 5, { x: 124, y: 106 });
  runRoutine(memory, "update_fighter_projectiles");
  assert.deepEqual([
    memory[addresses.projectileActive + 0],
    memory[addresses.projectileActive + 2],
    memory[addresses.projectileActive + 5],
    memory[addresses.activeMask], memory[addresses.hp],
  ], [1, 0, 1, 1, 2]);
  assert.equal(memory[addresses.projectileLifetime + 5], 9,
    "the preserved higher slot must advance exactly once without being consumed");
});

test("debris and Raider arbitration follows upward first-contact order with debris ties", () => {
  const collide = (enemyY) => {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    initialiseShootableDebris(memory, { x: 124, y: 100, hp: 1 });
    memory[addresses.enemyActive] = 1;
    memory[addresses.enemyArchetype] = 0;
    memory[addresses.enemyHp] = 1;
    memory[addresses.enemyPendingDamage] = 0;
    memory[addresses.enemyX] = 124;
    memory[addresses.enemyY] = enemyY;
    armViperProjectile(memory, 0, { x: 127, y: 109 });
    runRoutine(memory, "update_fighter_projectiles");
    return {
      debris: memory[addresses.activeMask],
      projectile: memory[addresses.projectileActive],
      enemyDamage: memory[addresses.enemyPendingDamage],
    };
  };
  assert.deepEqual(collide(93), { debris: 0, projectile: 0, enemyDamage: 0 },
    "debris with the greater bottom edge must be met first");
  assert.deepEqual(collide(94), { debris: 0, projectile: 0, enemyDamage: 0 },
    "an exact bottom-edge tie must resolve to debris");
  assert.deepEqual(collide(95), { debris: 1, projectile: 0, enemyDamage: 1 },
    "the lower Raider must receive the one consumed projectile first");
});

test("shot resolution precedes player contact while an unshot debris still deals one damage", () => {
  const shot = createRuntimeMemory();
  initialiseRows(shot);
  initialiseShootableDebris(shot, { x: 124, y: 100, hp: 1 });
  shot[addresses.playerX] = 124;
  shot[addresses.playerY] = 100;
  shot[addresses.playerHealth] = 10;
  shot[addresses.damageCooldown] = 0;
  shot[addresses.damageApplied] = 0;
  armViperProjectile(shot, 0, { x: 124, y: 106 });
  runRoutine(shot, "update_fighter_projectiles");
  runRoutine(shot, "entity_effects_update");
  assert.deepEqual([
    shot[addresses.activeMask], shot[addresses.projectileActive],
    shot[addresses.playerHealth], shot[addresses.damageCooldown],
  ], [0, 0, 10, 0], "the shot must remove debris before its player-contact update");

  const contact = createRuntimeMemory();
  initialiseRows(contact);
  initialiseShootableDebris(contact, { x: 124, y: 100 });
  contact[addresses.playerX] = 124;
  contact[addresses.playerY] = 100;
  contact[addresses.playerHealth] = 10;
  contact[addresses.damageCooldown] = 0;
  contact[addresses.damageApplied] = 0;
  runRoutine(contact, "entity_effects_update");
  assert.deepEqual([contact[addresses.activeMask], contact[addresses.playerHealth]], [0, 9],
    "unshot debris must retain canonical apply_player_damage(1)");
});

test("Raider and broadside projectiles cannot enter the debris target path", () => {
  const memory = createRuntimeMemory();
  initialiseRows(memory);
  initialiseShootableDebris(memory, { x: 124, y: 100 });
  const raiderSlot = 10;
  memory[addresses.projectileActive + raiderSlot] = 2;
  memory[addresses.projectileX + raiderSlot] = 124;
  memory[addresses.projectileY + raiderSlot] = 94;
  memory[addresses.projectilePreviousY + raiderSlot] = 94;
  memory[addresses.projectileLifetime + raiderSlot] = 10;
  runRoutine(memory, "update_fighter_projectiles");
  assert.deepEqual([
    memory[addresses.activeMask], memory[addresses.projectileActive + raiderSlot],
  ], [1, 2]);
  const projectileUpdate = source.slice(source.indexOf("update_fighter_projectiles:"),
    source.indexOf("update_viper_weapon:"));
  assert.match(projectileUpdate,
    /@viper_slot:[\s\S]+jsr entity_viper_projectile_target[\s\S]+@raider_slot:/);
  assert.doesNotMatch(projectileUpdate.slice(projectileUpdate.indexOf("@raider_slot:")),
    /entity_viper_projectile_target/);
  assert.doesNotMatch(source.slice(source.indexOf("update_broadside:"),
    source.indexOf("schedule_broadside:")), /entity_viper_projectile_target/);
});

test("shot destruction after reverse erase leaves no glyph at any A2 ring head", () => {
  for (let head = 0; head < 22; head += 1) {
    for (const renderId of [110, 112, 114, 116]) {
      const memory = createRuntimeMemory();
      initialiseRows(memory, head);
      initialiseShootableDebris(memory, { x: 124, y: 104, hp: 1 });
      memory[addresses.renderId] = renderId;
      const logical = (104 - 24) >> 3;
      const cell = 0x4050 + ((head + logical) % 22) * 40 + 19;
      memory[cell] = 0x31;
      memory[cell + 1] = 0x32;
      runRoutine(memory, "entity_effects_render");
      runRoutine(memory, "entity_effects_erase");
      armViperProjectile(memory, 0, { x: 124, y: 110 });
      runRoutine(memory, "update_fighter_projectiles");
      memory[addresses.events] = 0;
      runRoutine(memory, "entity_effects_update");
      runRoutine(memory, "entity_effects_render");
      assert.equal(memory[addresses.effectActiveCount], 5);
      for (let frame = 1; frame <= 30; frame += 1) {
        runRoutine(memory, "entity_effects_erase");
        memory[addresses.events] = 0;
        runRoutine(memory, "entity_effects_update");
        runRoutine(memory, "entity_effects_render");
      }
      assert.deepEqual([memory[cell], memory[cell + 1]], [0x31, 0x32],
        `head ${head}, glyph ${renderId} left a backed ghost after effect expiry`);
      assert.deepEqual([
        memory[addresses.renderedMask], memory[addresses.drawnMask],
        memory[addresses.effectRendered], memory[addresses.effectActiveCount],
      ], [0, 0, 0, 0]);
    }
  }
});

test("executed XEX and ATR traces show five rendered effects and a visible 30-frame split", () => {
  const xexTrace = executeDebrisDestructionTrace({ root, artifact: "xex" });
  const atrTrace = executeDebrisDestructionTrace({ root, artifact: "atr" });
  assert.equal(assertDebrisDestructionTraceParity(xexTrace, atrTrace), true);
  const find = (phase, frame) => xexTrace.records.find((record) =>
    record.phase === phase && record.frame === frame);
  assert.deepEqual([
    find("PRE_HIT", 0).debrisHp,
    find("HIT_1", 0).debrisHp,
    find("HIT_2", 0).debrisHp,
    find("FINAL", 0).debrisHp,
  ], [3, 2, 1, 0]);
  assert.deepEqual([
    find("HIT_1", 0).debrisHitFlashTimer,
    find("HIT_1", 1).debrisHitFlashTimer,
    find("HIT_2", 0).debrisHitFlashTimer,
    find("HIT_2", 1).debrisHitFlashTimer,
  ], [2, 1, 2, 1], "each nonlethal flash must render for exactly two PAL frames");
  assert.equal(find("HIT_1", 0).projectileActive, 0);
  assert.equal(find("HIT_2", 0).projectileActive, 0);

  const first = find("FINAL", 0);
  assert.deepEqual([
    first.debrisActive, first.debrisState, first.projectileActive,
    first.effectActiveMask, first.effectActiveCount,
  ], [0, 0, 0, 0x1f, 5]);
  assert.deepEqual(first.effects.map(({ slot, type, ttl }) => [slot, type, ttl]),
    [[0, 1, 5], [1, 2, 30], [2, 2, 30], [3, 2, 30], [4, 2, 30]]);
  const firstFragments = first.effects.slice(1);
  assert.equal(new Set(firstFragments.map(({ screenAddress }) => screenAddress)).size, 4,
    "all four fragments must occupy distinct rendered cells immediately");
  assert.ok(firstFragments.every(({ drawn, screenCode }) => drawn === 1 && screenCode !== 0));

  const positions = (frame) => new Map(find("FINAL", frame).effects
    .filter(({ slot }) => slot > 0).map(({ slot, x, y }) => [slot, { x, y }]));
  const p0 = positions(0);
  const p4 = positions(4);
  const p12 = positions(12);
  for (const slot of [1, 2, 3, 4]) {
    const horizontalSign = slot & 1 ? -1 : 1;
    const verticalSign = slot < 3 ? -1 : 1;
    assert.ok((p4.get(slot).x - p0.get(slot).x) * horizontalSign > 0);
    assert.ok((p12.get(slot).x - p4.get(slot).x) * horizontalSign > 0);
    assert.ok((p4.get(slot).y - p0.get(slot).y) * verticalSign > 0);
    assert.ok((p12.get(slot).y - p4.get(slot).y) * verticalSign > 0);
  }
  assert.ok(Math.max(...[...p12.values()].map(({ x }) => x)) -
    Math.min(...[...p12.values()].map(({ x }) => x)) >= 16,
  "frame 12 must span at least four character columns");
  assert.ok(Math.max(...[...p12.values()].map(({ y }) => y)) -
    Math.min(...[...p12.values()].map(({ y }) => y)) >= 16,
  "frame 12 must span at least two character rows");

  for (let frame = 0; frame < 30; frame += 1) {
    const fragments = find("FINAL", frame).effects.filter(({ slot }) => slot > 0);
    assert.equal(fragments.length, 4, `frame ${frame} lost a fragment early`);
    assert.ok(find("FINAL", frame).rendered, `frame ${frame} skipped effect render`);
  }
  assert.equal(find("FINAL", 4).effects.length, 5);
  assert.equal(find("FINAL", 5).effects.length, 4, "core must expire after five frames");
  assert.deepEqual([
    find("FINAL", 30).effectActiveMask, find("FINAL", 30).effectActiveCount,
    find("FINAL", 31).effectActiveMask, find("FINAL", 31).effectActiveCount,
  ], [0, 0, 0, 0]);
  assert.ok(find("FINAL", 31).screen.every((code) => code === 0),
    "the final reverse erase must leave no ghost screen code");
  for (let glyph = 118; glyph < 120; glyph += 1) {
    const lit = [...xexTrace.charset.slice(glyph * 8, glyph * 8 + 8)]
      .reduce((count, row) => count + [6, 4, 2, 0]
        .filter((shift) => (row >> shift & 3) !== 0).length, 0);
    assert.ok(lit >= 4 && lit <= 7, `fragment glyph ${glyph} has ${lit} lit pixels`);
  }
});

test("every canonical Raider death spawns one local breakup without changing score policy", () => {
  for (const [sourceId, scoreLo] of [[0, 0x52], [1, 0x52], [2, 0x52], [3, 0x42], [5, 0x42]]) {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    runRoutine(memory, "init_entity_effects");
    memory[addresses.enemyArchetype] = 0;
    memory[addresses.enemyActive] = 1;
    memory[addresses.enemyHp] = 1;
    memory[addresses.enemyPendingDamage] = 1;
    memory[addresses.enemyPendingSource] = sourceId;
    memory[addresses.enemyX] = 124;
    memory[addresses.enemyY] = 88;
    memory[addresses.scoreLo] = 0x42;
    memory[addresses.scoreHi] = 0x07;
    memory.fill(0xff, 0x3d00 + 88, 0x3d00 + 102);
    memory.fill(0xff, 0x3e00 + 88, 0x3e00 + 102);
    runRoutine(memory, "resolve_enemy_damage");
    assert.deepEqual([
      memory[addresses.enemyActive], memory[addresses.fighterExplosionTimer + 1],
      memory[addresses.effectActiveMask], memory[addresses.effectActiveCount],
      memory[addresses.effectPending], memory[addresses.scoreLo], memory[addresses.scoreHi],
    ], [2, 24, 0, 0, 2, scoreLo, 0x07], `damage source ${sourceId}`);
    assert.ok(memory.subarray(0x3d00 + 88, 0x3d00 + 102).every((value) => value === 0));
    assert.ok(memory.subarray(0x3e00 + 88, 0x3e00 + 102).every((value) => value === 0));
    assert.deepEqual([
      memory[addresses.fighterExplosionX + 1], memory[addresses.fighterExplosionY + 1],
    ], [124, 91], "PMG origin must be captured before the deferred local effect");
    runRoutine(memory, "entity_effects_update");
    assert.deepEqual([
      memory[addresses.effectPending], memory[addresses.effectActiveMask],
    ], [1, 0], "the death frame must only advance the bounded defer latch");
    runRoutine(memory, "entity_effects_update");
    assert.deepEqual([
      memory[addresses.effectPending], memory[addresses.effectActiveMask],
      memory[addresses.effectActiveCount], memory[addresses.effectX], memory[addresses.effectY],
    ], [0, 0x1f, 5, 130, 91], "the next PAL frame must materialise the centred effect");
    assert.deepEqual([...memory.subarray(addresses.effectType, addresses.effectType + 5)],
      [1, 2, 2, 2, 2], "Raider reuses the collisionless core/fragment renderer types");
    assert.deepEqual([...memory.subarray(addresses.effectRenderId, addresses.effectRenderId + 5)],
      [110, 111, 113, 0xdb, 119], "four fragment identities must use linked render IDs");
  }
});

test("executed Raider breakup is one-frame deferred, radial, thirty frames and XEX/ATR exact", () => {
  const xexTrace = executeRaiderBreakupTrace({ root, artifact: "xex" });
  const atrTrace = executeRaiderBreakupTrace({ root, artifact: "atr" });
  assert.equal(assertRaiderBreakupTraceParity(xexTrace, atrTrace), true);
  const frame = (index) => xexTrace.records.find((record) =>
    record.phase === "BREAKUP" && record.frame === index);
  assert.deepEqual([
    xexTrace.records[0].enemyActive, frame(0).enemyActive,
    frame(0).effectPending, frame(0).effectActiveMask, frame(0).effectActiveCount,
    frame(1).effectPending, frame(1).effectActiveMask, frame(1).effectActiveCount,
  ], [1, 2, 1, 0, 0, 0, 0x1f, 5]);
  assert.deepEqual([frame(0).colbk, frame(1).colbk, frame(2).colbk, frame(3).colbk, frame(4).colbk],
    [0x1e, 0x3c, 0x1c, 0x34, 0x00], "accepted full-screen profile changed");
  assert.deepEqual(frame(1).effects.map(({ slot, type, ttl, renderId }) =>
    [slot, type, ttl, renderId]), [
    [0, 1, 5, 110],
    [1, 2, 30, 111],
    [2, 2, 30, 113],
    [3, 2, 30, 0xdb],
    [4, 2, 30, 119],
  ]);
  assert.equal(new Set(frame(1).effects.slice(1).map(({ screenAddress }) => screenAddress)).size, 4,
    "all four fragments must render in distinct cells in the materialisation frame");
  const centre = { x: frame(1).effects[0].x + 4, y: frame(1).effects[0].y + 4 };
  const distance = (effect) => Math.abs(effect.x - centre.x) + Math.abs(effect.y - centre.y);
  for (const slot of [1, 2, 3, 4]) {
    const at0 = frame(1).effects.find((effect) => effect.slot === slot);
    const at4 = frame(4).effects.find((effect) => effect.slot === slot);
    const at12 = frame(12).effects.find((effect) => effect.slot === slot);
    assert.ok(distance(at4) > distance(at0));
    assert.ok(distance(at12) > distance(at4));
  }
  for (let index = 1; index <= 30; index += 1) {
    assert.equal(frame(index).effects.filter(({ slot }) => slot > 0).length, 4);
    assert.ok(frame(index).rendered, `frame ${index} expired before render`);
  }
  assert.equal(frame(5).effects.some(({ slot }) => slot === 0), true);
  assert.equal(frame(6).effects.some(({ slot }) => slot === 0), false);
  assert.deepEqual([frame(30).effectActiveMask, frame(31).effectActiveMask], [0x1e, 0]);
  assert.ok(frame(31).screen.every((code) => code === 0));
  assert.deepEqual([xexTrace.records[0].scoreLo, frame(31).scoreLo], [0x42, 0x52]);
});

test("newest debris or Raider breakup safely replaces the previous five-slot event", () => {
  const spawnRaider = (memory) => {
    memory[addresses.enemyArchetype] = 0;
    memory[addresses.enemyX] = 124;
    memory[addresses.enemyY] = 88;
    runRoutine(memory, "spawn_raider_breakup_effects");
  };
  const spawnDebris = (memory) => {
    memory[addresses.x] = 124;
    memory[addresses.y] = 104;
    memory[addresses.renderId] = 116;
    runRoutine(memory, "spawn_debris_destruction_effects");
  };
  const advanceRaiderDefer = (memory) => {
    runRoutine(memory, "entity_effects_update");
    runRoutine(memory, "entity_effects_update");
  };
  for (let head = 0; head < 22; head += 1) {
    for (const [first, second, expected] of [
      [spawnRaider, spawnDebris, [116, 118, 118, 118, 118]],
      [spawnDebris, spawnRaider, [110, 111, 113, 0xdb, 119]],
    ]) {
      const memory = createRuntimeMemory();
      initialiseRows(memory, head);
      runRoutine(memory, "init_entity_effects");
      memory.fill(0x2a, 0x4050, 0x43c0);
      first(memory);
      if (first === spawnRaider) advanceRaiderDefer(memory);
      else runRoutine(memory, "entity_effects_update");
      runRoutine(memory, "entity_effects_render");
      runRoutine(memory, "entity_effects_erase");
      assert.equal(memory[addresses.effectRendered], 0);
      second(memory);
      if (second === spawnRaider) advanceRaiderDefer(memory);
      assert.deepEqual([...memory.subarray(addresses.effectRenderId, addresses.effectRenderId + 5)],
        expected);
      if (second !== spawnRaider) runRoutine(memory, "entity_effects_update");
      runRoutine(memory, "entity_effects_render");
      runRoutine(memory, "entity_effects_erase");
      assert.ok(memory.subarray(0x4050, 0x43c0).every((value) => value === 0x2a),
        `ring head ${head} retained a replacement ghost`);
    }
  }

  const sameFrame = createRuntimeMemory();
  initialiseRows(sameFrame);
  runRoutine(sameFrame, "init_entity_effects");
  spawnDebris(sameFrame);
  spawnRaider(sameFrame);
  assert.deepEqual([
    sameFrame[addresses.effectActiveMask], sameFrame[addresses.effectActiveCount],
    sameFrame[addresses.effectPending],
  ], [0, 0, 2]);
  advanceRaiderDefer(sameFrame);
  assert.deepEqual([
    sameFrame[addresses.effectActiveMask], sameFrame[addresses.effectActiveCount],
    ...sameFrame.subarray(addresses.effectRenderId, addresses.effectRenderId + 5),
  ], [0x1f, 5, 110, 111, 113, 0xdb, 119]);
});

test("backed overlay stack restores base, shell/projectile, entity and effect in reverse", () => {
  for (const lowerOverlay of [0x66, 0x91]) {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    initialiseEntity(memory, { x: 124, y: 24 });
    const cell = 0x4050 + 19;
    const base = 0x0a;
    const baseRight = 0x0b;
    memory[cell] = base;
    memory[cell + 1] = baseRight;
    const lowerBacking = memory[cell];
    const lowerBackingRight = memory[cell + 1];
    memory[cell] = lowerOverlay;
    memory[cell + 1] = lowerOverlay + 1;
    runRoutine(memory, "entity_effects_render");
    const entityGlyph = memory[cell];
    const entityGlyphRight = memory[cell + 1];
    assert.equal(memory[addresses.backing], lowerOverlay);
    assert.equal(memory[addresses.backing1], lowerOverlay + 1);

    memory[addresses.effectRendered] = 1;
    memory[addresses.effectScreenLo] = (cell + 1) & 0xff;
    memory[addresses.effectScreenHi] = (cell + 1) >> 8;
    memory[addresses.effectBacking] = entityGlyphRight;
    memory[addresses.effectDrawnMask] = 1;
    memory[cell + 1] = 0xfe;

    runRoutine(memory, "erase_transient_effect_overlays");
    assert.equal(memory[cell], entityGlyph, "effect erase must leave the adjacent entity cell");
    assert.equal(memory[cell + 1], entityGlyphRight, "effect erase must restore entity");
    runRoutine(memory, "erase_interactive_entity_overlays");
    assert.equal(memory[cell], lowerOverlay, "entity erase must restore shell/projectile");
    assert.equal(memory[cell + 1], lowerOverlay + 1,
      "right entity cell must restore its own shell/projectile backing");
    memory[cell] = lowerBacking;
    memory[cell + 1] = lowerBackingRight;
    assert.equal(memory[cell], base, "lower overlay erase must restore base");
    assert.equal(memory[cell + 1], baseRight, "right lower overlay must restore base");
  }
});

test("linked empty engine path remains within the accepted +32 CPU-cycle slice", () => {
  assert.equal(manifest.runtimeTiming.entityEffects.emptyPathLimitCpuCycles, 123);
  assert.ok(manifest.runtimeTiming.entityEffects.emptyPathCpuCycles <= 123);
  assert.equal(manifest.runtimeTiming.entityEffects.measurement,
    "inclusive JSR-to-RTS cycles from executed linked release bytes");
});
