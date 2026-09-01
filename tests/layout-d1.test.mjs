import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installBootArtifact } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
const labels = new Map(fs.readFileSync(path.join(root, "build/dark-fighter.lbl"), "utf8")
  .split(/\r?\n/).map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
  .filter(Boolean).map((match) => [match[2], Number.parseInt(match[1], 16)]));
const a2 = fs.readFileSync(path.join(root, "build/a2-kernel-runtime.bin"));
const entity = fs.readFileSync(path.join(root, "build/entity-code-runtime.bin"));
const pickupPhaseRuntime = fs.readFileSync(
  path.join(root, "build/weapon-pickup-phase-runtime.bin"));
const glue = fs.readFileSync(path.join(root, "build/integration-glue.bin"));
const director = fs.readFileSync(path.join(root, "build/encounter-director.bin"));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function run(memory, target, { a = 0, x = 0, y = 0 } = {}) {
  const address = typeof target === "string" ? labels.get(target) : target;
  assert.ok(Number.isInteger(address), `missing routine ${target}`);
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = address; cpu.a = a; cpu.x = x; cpu.y = y;
  const visited = [];
  for (let steps = 0; steps < 300_000 && cpu.pc !== stop; steps += 1) {
    visited.push(cpu.pc);
    assert.notEqual(memory[cpu.pc], 0, `${target} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return { cpu, visited };
}

function stageArtifact(artifact, fill) {
  const memory = new Uint8Array(0x10000).fill(fill);
  installBootArtifact(memory, root, artifact);
  run(memory, "stage_boot_streams");
  const sourceA2 = Buffer.from(memory.subarray(0x7f16, 0x8015));
  const packedEntity = Buffer.from(memory.subarray(
    manifest.entityEffects.packedSourceAddress,
    manifest.entityEffects.packedSourceAddress + manifest.entityEffects.packedBytes,
  ));
  run(memory, "unpack_resident_runtime");
  run(memory, "unpack_entity_runtime");
  assert.deepEqual(Buffer.from(memory.subarray(0x9100, 0x9100 + entity.length)), entity);
  run(memory, "stage_a2_kernel");
  const finalAfterCopy = Buffer.from(memory.subarray(0x9000, 0x90ff));
  assert.deepEqual(Buffer.from(memory.subarray(0x7f16, 0x7f3d)), glue);
  run(memory, "init_entity_effects");
  const finalAfterClear = Buffer.from(memory.subarray(0x9000, 0x90ff));
  run(memory, "unpack_weapon_pickup_phase_runtime");
  assert.deepEqual(Buffer.from(memory.subarray(0x8800, 0x8800 + pickupPhaseRuntime.length)),
    pickupPhaseRuntime);
  run(memory, "unpack_starfield_runtime");
  const finish = labels.get("finish_startup_after_loader");
  const savedFinish = memory[finish];
  memory[finish] = 0x60;
  run(memory, "layout_d_publish_glue");
  memory[finish] = savedFinish;
  return { memory, sourceA2, packedEntity, finalAfterCopy, finalAfterClear };
}

test("Layout D.2 startup order and call bytes are frozen", () => {
  assert.match(source,
    /jsr stage_boot_streams[\s\S]+jsr unpack_entity_runtime\nlayout_d_entity_unpack_complete:\n\s+jsr stage_a2_kernel\n\s+jsr init_entity_effects/);
  assert.doesNotMatch(source, /jsr init_entity_effects\n\s+jsr stage_a2_kernel/);
  const resident = fs.readFileSync(path.join(root, "build/resident-runtime.bin"));
  assert.deepEqual([...resident.subarray(0x40, 0x46)], [0x20, 0x8f, 0x21, 0x20, 0x9e, 0x9a]);
});

test("Layout D.2 exact memory and transport budgets remain frozen", () => {
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 12755);
  assert.equal(manifest.transportCapacity.initialBootBytes, 12800);
  assert.equal(manifest.transportCapacity.totalTransportSectors, 156);
  assert.equal(manifest.transportCapacity.totalTransportBytes, 19968);
  assert.equal(manifest.transportCapacity.stage2.bytes, 1191);
  assert.deepEqual(manifest.transportCapacity.manifest.parsed.records.map((record) =>
    [record.startSector, record.sectorCount, record.packedLength, record.rawLength,
      record.finalDestination]), [
    [101, 44, 5611, 6592, 0x5e10],
    [145, 6, 700, 700, 0x7bd0],
    [151, 1, 41, 39, 0x5259],
    [152, 5, 587, 645, 0x9d75],
  ]);
  assert.equal(manifest.encounterDirector.linkedRuntimeBytes, 16805);
  assert.equal(manifest.encounterDirector.simultaneousResidencyBytes, 18643);
  assert.equal(manifest.encounterDirector.safeResidencyBytes, 3544);
});

test("XEX and ATR preserve full A2, GLUE lifecycle, ENTITY_CODE, DIRECTOR and guard", () => {
  assert.equal(a2.length, 255);
  assert.equal(sha256(a2), "0caf1d924375f01ba3a7107b53670c1c7b02bced2b9a6f546ed9e53e47cc9ea5");
  for (const artifact of ["xex", "atr"]) for (const fill of [0xa5, 0x5a]) {
    const staged = stageArtifact(artifact, fill);
    assert.equal(sha256(staged.sourceA2), sha256(a2), `${artifact} staged A2`);
    assert.equal(sha256(staged.finalAfterCopy), sha256(a2), `${artifact} published A2`);
    assert.equal(sha256(staged.finalAfterClear), sha256(a2), `${artifact} A2 after clear`);
    assert.deepEqual(Buffer.from(staged.memory.subarray(0x4efe, 0x4f25)), glue);
    assert.deepEqual(Buffer.from(staged.memory.subarray(0x9d75, 0x9ffa)), director);
    assert.deepEqual([...staged.memory.subarray(0x9ffa, 0xa000)], Array(6).fill(fill));
    assert.equal(staged.memory[0x90ea], 0xce);
  }
});

test("all 11 A2 entry points retain their frozen opcodes", () => {
  const entries = [
    ["integration_broadside_due", 0x90cf, 0xce],
    ["integration_broadside_release", 0x90e2, 0xa2],
    ["integration_pickup_pending_tick", 0x90ea, 0xce],
    ["render_far_star_next", 0x90c9, 0xe8],
    ["render_far_star_slot", 0x9081, 0xbd],
    ["erase_far_star_next", 0x907b, 0xca],
    ["erase_far_star_slot", 0x9061, 0xbd],
    ["render_far_star_overlays", 0x907f, 0xa2],
    ["build_playfield_display_list", 0x9008, 0x85],
    ["erase_far_star_overlays", 0x905f, 0xa2],
    ["prebuild_next_playfield_display_list", 0x9000, 0xa2],
  ];
  assert.equal(entries.length, 11);
  for (const [name, address, opcode] of entries) {
    assert.equal(labels.get(name), address, name);
    assert.equal(a2[address - 0x9000], opcode, name);
  }
});

test("pickup hook executes $90EA → $90ED → $90FB, decrements 2 to 1 and returns", () => {
  const { memory } = stageArtifact("xex", 0xa5);
  const timer = labels.get("ENTITY_TIMER") + 1;
  memory[timer] = 2;
  const result = run(memory, "integration_pickup_pending_tick");
  assert.equal(memory[timer], 1);
  assert.deepEqual(result.visited, [0x90ea, 0x90ed, 0x90fb]);
});

test("startup writes never intersect a source before its last read", () => {
  const sources = [
    { name: "packed ENTITY_CODE", start: 0x4849, end: 0x5237, lastRead: 1 },
    { name: "GLUE staging", start: 0x5259, end: 0x5280, lastRead: 4 },
    { name: "A2 source", start: 0x7f16, end: 0x8015, created: 1, lastRead: 4 },
    { name: "GLUE holding", start: 0x7f16, end: 0x7f3d, created: 4, lastRead: 6 },
  ];
  const writes = [
    { sequence: 1, start: 0x5300, end: 0x5cef },
    { sequence: 1, start: 0x6c10, end: 0x8015 },
    { sequence: 3, start: 0x9000, end: 0x9c75 },
    { sequence: 4, start: 0x9000, end: 0x90ff },
    { sequence: 4, start: 0x7f16, end: 0x7f3d },
    { sequence: 5, start: 0x8000, end: 0x8100 },
    { sequence: 6, start: 0x4efe, end: 0x4f25 },
  ];
  for (const write of writes) for (const live of sources) {
    const active = write.sequence < live.lastRead && write.sequence > (live.created ?? 0);
    const intersects = write.start < live.end && write.end > live.start;
    assert.equal(active && intersects, false,
      `write ${write.sequence} destroys live ${live.name}`);
  }
});
