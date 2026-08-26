import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
const timing = manifest.runtimeTiming;

test("linked release replay covers every reviewed runtime timing scenario", () => {
  assert.equal(timing.method,
    "NMOS-6502 execution of linked release bytes with replayed legal gameplay sessions");
  assert.ok(timing.replay.measuredFrames >= 1_000);
  for (const name of [
    "worldNearFullErase",
    "hullEvent",
    "maximumProjectilePool",
    "threeBroadside",
    "liveRaider",
    "activeExplosion",
    "musicWithSfx",
  ]) {
    assert.ok(timing.scenarios[name].mainLoopCpuCycles > 0, `${name} was not measured`);
  }
  assert.equal(timing.scenarios.maximumProjectilePool.projectileOccupancy, 19);
  assert.equal(timing.scenarios.threeBroadside.broadsideOccupancy, 3);
  assert.equal(timing.legalHeavyCombination.origin, "deterministic legal replay");
  assert.ok(timing.legalHeavyCombination.events.includes("hull-copy"));
  assert.ok(timing.legalHeavyCombination.events.includes("music+sfx"));
  assert.ok(timing.scenarios.debrisShotPath.events.includes("active-debris"));
  assert.ok(timing.scenarios.debrisShotPath.events.includes("debris-shot"));
  assert.ok(timing.scenarios.debrisShotPath.viperProjectileOccupancy > 0);
  assert.equal(timing.scenarios.noViperProjectilePath.viperProjectileOccupancy, 0);
  assert.equal(timing.scenarios.noViperProjectilePath.procedureCallCounts
    .entity_viper_projectile_target ?? 0, 0);
  assert.ok(timing.destructibleDebris.noActiveDebrisPathDeltaCpuCycles <=
    timing.destructibleDebris.noActiveDebrisPathLimitCpuCycles);
  assert.ok(timing.destructibleDebris.noActiveViperProjectilePathDeltaCpuCycles <=
    timing.destructibleDebris.noActiveViperProjectilePathLimitCpuCycles);
});

test("DMA-off CPU comparison stays below its executable comparison gate", () => {
  assert.ok(timing.cpuDmaOff.heaviestMainLoopCycles <= timing.thresholdCycles,
    `${timing.cpuDmaOff.heaviestMainLoopCycles} exceeds ${timing.thresholdCycles}`);
  assert.equal(timing.cpu_cycles_dma_off, timing.cpuDmaOff.heaviestMainLoopCycles);
  assert.equal(timing.cpu_comparison_headroom,
    timing.palFrameCycles - timing.cpu_cycles_dma_off);
});

test("additive DMA/DLI estimate is explicit and never reported as physical headroom", () => {
  const estimate = timing.estimatedAdditive;
  assert.equal(estimate.mainLoopCycles, timing.cpuDmaOff.heaviestMainLoopCycles);
  assert.equal(estimate.dma.total, Object.values(estimate.dma)
    .filter((value) => Number.isInteger(value))
    .slice(0, -1)
    .reduce((sum, value) => sum + value, 0));
  assert.deepEqual(estimate.dli.bodyCycles.length, 2);
  assert.equal(estimate.cycles,
    estimate.mainLoopCycles + estimate.dma.total + estimate.dli.conservativeCycles);
  assert.equal(timing.estimated_additive_cycles, estimate.cycles);
  assert.ok(!Object.hasOwn(estimate, "headroomCycles"));
});

test("measured DMA-on fields come only from an artifact-matched Atari800 trace", () => {
  const trace = timing.wallTrace;
  assert.ok(trace, "runtime wall trace is missing");
  assert.equal(timing.measured_wall_cycles_dma_on,
    trace.semantics.measured_wall_cycles_dma_on);
  assert.equal(timing.measured_physical_headroom,
    timing.palFrameCycles - timing.measured_wall_cycles_dma_on);
  assert.equal(trace.artifact.sha256, manifest.artifacts["dark-fighter.xex"].sha256);
  assert.equal(trace.instrumentation.guest_cycles_added, 0);
  assert.equal(trace.instrumentation.production_dma_ctl, 0x3e);
  assert.equal(trace.instrumentation.production_nmi_en, 0x80);
});

test("protected linked segments do not regress beyond the accepted feature baseline", () => {
  for (const segment of timing.protectedSegments) {
    if (segment.reservedMaximumBytes !== null) {
      assert.ok(segment.bytes <= segment.reservedMaximumBytes,
        `${segment.name} overflows its ${segment.reservedMaximumBytes}-byte reservation`);
      assert.equal(segment.freeReservedBytes, segment.reservedMaximumBytes - segment.bytes);
    }
  }
  assert.deepEqual(manifest.runtimeCodeBudget.weaponPickupRapidFire, {
    baselineBytes: 14_316,
    actualBytes: manifest.runtimeCodeBudget.actualBytes,
    actualDeltaBytes: manifest.runtimeCodeBudget.actualBytes - 14_316,
  });
  assert.ok(manifest.runtimeCodeBudget.weaponPickupRapidFire.actualDeltaBytes <= 640,
    `Rapid Fire runtime delta ${manifest.runtimeCodeBudget.weaponPickupRapidFire.actualDeltaBytes} exceeds 640 bytes`);
  assert.ok(manifest.payloadBudget.weaponPickupRapidFire.remainingReserveBytes >= 512);
});

test("post-loader runtime and future entity ranges are non-overlapping", () => {
  const ranges = timing.memory.runtimeRanges;
  for (let index = 1; index < ranges.length; index += 1) {
    assert.ok(ranges[index - 1].end < ranges[index].start,
      `${ranges[index - 1].name} overlaps ${ranges[index].name}`);
  }
  assert.deepEqual(timing.memory.futureEntityEffectsRange,
    { start: 0x8000, end: 0x8fff, bytes: 0x1000 });
  assert.deepEqual(ranges.find((range) => range.name === "a2-kernel-code"), {
    name: "a2-kernel-code",
    start: 0x9000,
    end: 0x90ff,
    bytes: 256,
    availability: "unconditional",
  });
  assert.deepEqual(ranges.find((range) => range.name === "hybrid-ring-display-state"), {
    name: "hybrid-ring-display-state",
    start: 0x7f10,
    end: 0x7fda,
    bytes: 203,
    availability: "after-loader",
  });
  assert.deepEqual(timing.memory.basicRomConditionalRange,
    { start: 0xa000, end: 0xbfff, reserved: false });
});

test("hybrid ring reservation fits after staging and before entity/effects RAM", () => {
  const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
  const constants = new Map();
  for (const match of source.matchAll(/^([A-Z][A-Z0-9_]*)\s*=\s*\$([0-9A-F]+)$/gmi)) {
    constants.set(match[1], Number.parseInt(match[2], 16));
  }
  assert.equal(constants.get("STARFIELD_STAGING"), 0x7810);
  assert.equal(constants.get("STARFIELD_STAGING_BYTES"), 0x0700);
  assert.match(source, /PLAYFIELD_RING_ROWS\s*=\s*GAMEPLAY_SCREEN_ROWS-1/);
  assert.match(source, /PLAYFIELD_DLIST_BYTES\s*=\s*3\+3\+PLAYFIELD_RING_ROWS\*3\+3/);
  assert.match(source, /PLAYFIELD_DLIST_A\s*=\s*STARFIELD_STAGING\+STARFIELD_STAGING_BYTES/);
  assert.match(source, /PLAYFIELD_RING_STATE_END\s*<=\s*\$7FDD/);
  assert.match(source, /PLAYFIELD_RING_STATE_END\s*<=\s*\$8000/);
  assert.match(source, /GAMEPLAY_SCREEN_ROWS\s*=\s*23/);
  assert.match(source, /PLAYFIELD_RING_ROWS\s*=\s*22/);
  assert.match(source, /GAMEPLAY_DIVIDER_SCREEN\s*=\s*GAMEPLAY_SCREEN/);
  assert.match(source, /GAMEPLAY_RING_SCREEN\s*=\s*GAMEPLAY_DIVIDER_SCREEN\+40/);
});

test("logical gameplay row pointers keep a fixed divider plus 22 linear ring rows", () => {
  const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
  assert.match(source,
    /start_gameplay:[\s\S]+jsr clear_screen\s+jsr init_playfield_row_table\s+jsr init_playfield_display_lists\s+jsr init_state/);
  assert.match(source,
    /init_playfield_row_table:[\s\S]+lda #<GAMEPLAY_RING_SCREEN[\s\S]+sta PLAYFIELD_ROW_LO,x[\s\S]+sta PLAYFIELD_ROW_HI,x[\s\S]+adc #40[\s\S]+cpx #PLAYFIELD_RING_ROWS/);
  assert.match(source,
    /set_gameplay_row_ptr:[\s\S]+beq @divider[\s\S]+lda PLAYFIELD_ROW_LO,x\s+sta dst_ptr[\s\S]+@divider:[\s\S]+lda #<GAMEPLAY_DIVIDER_SCREEN/);
  assert.match(source,
    /initialize_projectile_screen_pointer:[\s\S]+sbc #GAMEPLAY_TOP\s+lsr\s+lsr\s+lsr\s+jsr set_gameplay_row_ptr/);
  assert.doesNotMatch(source.slice(
    source.indexOf("initialize_projectile_screen_pointer:"),
    source.indexOf("render_fighter_projectile_overlays:"),
  ), /sta row_counter\s+lda row_counter/);
  assert.match(source,
    /init_far_star_population:[\s\S]+sta STAR_FAR_ROW,x[\s\S]+sta STAR_FAR_COLUMN,x/);
  assert.match(source,
    /set_far_star_ptr:[\s\S]+lda STAR_FAR_ROW,x\s+jsr set_gameplay_row_ptr[\s\S]+adc STAR_FAR_COLUMN,x/);
});
