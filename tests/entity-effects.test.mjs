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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definitionPath = path.join(root, "assets", "graphics", "entity-effects.json");
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
  rng: labels.get("ENTITY_RNG_STATE"),
  events: labels.get("ENTITY_FRAME_EVENTS"),
  x: labels.get("ENTITY_X"),
  y: labels.get("ENTITY_Y"),
  vy: labels.get("ENTITY_VY"),
  renderId: labels.get("ENTITY_RENDER_ID"),
  screenLo: labels.get("ENTITY_SCREEN_LO"),
  screenHi: labels.get("ENTITY_SCREEN_HI"),
  backing: labels.get("ENTITY_BACKING0"),
  drawnMask: labels.get("ENTITY_DRAWN_MASK"),
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

test("entity descriptor and glyph generation are deterministic and bounded", () => {
  const first = compileEntityEffects(loadEntityEffectsDefinition(definitionPath));
  const second = compileEntityEffects(loadEntityEffectsDefinition(definitionPath));
  assert.deepEqual(first.descriptor, second.descriptor);
  assert.deepEqual(first.glyph, second.glyph);
  assert.equal(renderEntityEffectsCa65Include(first), renderEntityEffectsCa65Include(second));
  assert.equal(first.descriptor.length, 16);
  assert.equal(first.glyph.length, 8);
  assert.deepEqual([...first.descriptor.slice(5, 10)], [4, 8, 1, 0, 8]);
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
  assert.equal(manifest.entityEffects.effectActiveLimit, 0);
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

test("all 22 logical entity rows map through every A2 ring head without divider access", () => {
  for (let head = 0; head < 22; head += 1) {
    for (let logical = 0; logical < 22; logical += 1) {
      const memory = createRuntimeMemory();
      initialiseRows(memory, head);
      initialiseEntity(memory, { y: 24 + logical * 8 });
      runRoutine(memory, "entity_effects_render");
      const pointer = memory[addresses.screenLo] | memory[addresses.screenHi] << 8;
      const expectedRow = 0x4050 + ((head + logical) % 22) * 40;
      assert.equal(pointer, expectedRow + 19,
        `head ${head}, logical ${logical} mapped outside its ring row`);
      assert.ok(pointer >= 0x4050 && pointer <= 0x43bf);
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

test("spawn, WORLD_ROW_ADVANCED movement and bottom despawn are deterministic", () => {
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
  ], [1, 1, 124, 24, 0xca]);
  runRoutine(memory, "entity_effects_update");
  assert.equal(memory[addresses.y], 24, "ordinary frame must not move world debris");
  memory[addresses.events] = 1;
  runRoutine(memory, "entity_effects_update");
  assert.equal(memory[addresses.y], 32);
  memory[addresses.y] = 192;
  memory[addresses.events] = 1;
  runRoutine(memory, "entity_effects_update");
  assert.deepEqual([
    memory[addresses.activeMask], memory[addresses.activeCount], memory[addresses.spawnTimer],
  ], [0, 0, 64]);
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

test("backed overlay stack restores base, shell/projectile, entity and effect in reverse", () => {
  for (const lowerOverlay of [0x66, 0x91]) {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    initialiseEntity(memory, { x: 124, y: 24 });
    const cell = 0x4050 + 19;
    const base = 0x0a;
    memory[cell] = base;
    const lowerBacking = memory[cell];
    memory[cell] = lowerOverlay;
    runRoutine(memory, "entity_effects_render");
    const entityGlyph = memory[cell];
    assert.equal(memory[addresses.backing], lowerOverlay);

    memory[addresses.effectRendered] = 1;
    memory[addresses.effectScreenLo] = cell & 0xff;
    memory[addresses.effectScreenHi] = cell >> 8;
    memory[addresses.effectBacking] = entityGlyph;
    memory[addresses.effectDrawnMask] = 1;
    memory[cell] = 0xfe;

    runRoutine(memory, "erase_transient_effect_overlays");
    assert.equal(memory[cell], entityGlyph, "effect erase must restore entity");
    runRoutine(memory, "erase_interactive_entity_overlays");
    assert.equal(memory[cell], lowerOverlay, "entity erase must restore shell/projectile");
    memory[cell] = lowerBacking;
    assert.equal(memory[cell], base, "lower overlay erase must restore base");
  }
});

test("linked empty engine path remains within 100 CPU cycles", () => {
  assert.equal(manifest.runtimeTiming.entityEffects.emptyPathLimitCpuCycles, 100);
  assert.ok(manifest.runtimeTiming.entityEffects.emptyPathCpuCycles <= 100);
  assert.equal(manifest.runtimeTiming.entityEffects.measurement,
    "inclusive JSR-to-RTS cycles from executed linked release bytes");
});
