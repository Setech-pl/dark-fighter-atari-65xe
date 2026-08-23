import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const report = JSON.parse(fs.readFileSync(
  path.join(root, "docs", "runtime-wall-trace.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));

test("wall trace keeps CPU comparison, measured wall time and additive estimate distinct", () => {
  const values = report.semantics;
  assert.equal(values.cpu_comparison_headroom,
    report.gate.pal_frame_cycles - values.cpu_cycles_dma_off);
  assert.equal(values.measured_physical_headroom,
    report.gate.pal_frame_cycles - values.measured_wall_cycles_dma_on);
  assert.equal(report.gate.measured_wall_cycles_dma_on,
    values.measured_wall_cycles_dma_on);
  assert.equal(report.gate.passed,
    values.measured_wall_cycles_dma_on <= report.gate.maximum_wall_cycles &&
    report.gate.deadline_overrun_frames === 0 && report.gate.missed_frames === 0);
  assert.notEqual(values.estimated_additive_cycles, values.measured_wall_cycles_dma_on);
});

test("wall trace is artifact-bound and adds no guest timing work", () => {
  assert.equal(report.artifact.sha256, manifest.artifacts["dark-fighter.xex"].sha256);
  assert.equal(report.instrumentation.start_label, "main_loop_option_poll");
  assert.equal(report.instrumentation.end_label, "main_loop");
  assert.equal(report.instrumentation.guest_instructions_added, 0);
  assert.equal(report.instrumentation.guest_cycles_added, 0);
  assert.equal(report.instrumentation.logging_during_measured_path, false);
  assert.equal(report.instrumentation.production_dma_ctl, 0x3e);
  assert.equal(report.instrumentation.production_nmi_en, 0x80);
});

test("wall trace covers 9040 legal frames and a separate targeted replay", () => {
  assert.equal(report.replay.baseline_measured_frames, 9_040);
  assert.equal(report.replay.targeted_measured_frames, 920);
  assert.equal(report.replay.sessions
    .filter((session) => session.kind === "baseline-9040")
    .reduce((sum, session) => sum + session.measured_frames, 0), 9_040);
  assert.equal(report.replay.sessions
    .filter((session) => session.kind === "targeted-heavy-coincidence")
    .reduce((sum, session) => sum + session.measured_frames, 0), 920);
  assert.equal(report.ten_heaviest_frames_in_9040_replay.length, 10);
  assert.equal(report.five_heaviest_frames.length, 5);
  assert.equal(report.replay.targeted_heaviest.frame,
    report.replay.baseline_heaviest.frame);
  assert.equal(report.replay.targeted_heaviest.wall_cycles,
    report.replay.baseline_heaviest.wall_cycles);
  assert.deepEqual(report.replay.targeted_heaviest.start,
    report.replay.baseline_heaviest.start);
  assert.deepEqual(report.replay.targeted_heaviest.end,
    report.replay.baseline_heaviest.end);
  assert.deepEqual(report.replay.targeted_heaviest.state,
    report.replay.baseline_heaviest.state);
});

test("wall trace records the required legal runtime coverage without incoherent RAM seeding", () => {
  for (const name of [
    "world_near_with_far_erase",
    "hull_event",
    "active_muzzles",
    "live_raider",
    "fighter_explosion",
    "capital_explosion",
    "music_with_sfx_preemption",
  ]) {
    assert.equal(report.coverage[name].observed, true, `${name} was not observed`);
  }
  assert.equal(report.coverage.maximum_projectile_pool.maximum_observed, 19);
  assert.equal(report.coverage.maximum_projectile_pool.legal_capacity, 19);
  assert.equal(report.coverage.broadside_projectiles.pool_capacity, 3);
  assert.equal(report.coverage.broadside_projectiles.release_source_turrets, 2);
  assert.match(report.coverage.broadside_projectiles.classification,
    /no manual RAM fixture|production scheduler/);
});

test("ten heaviest frames retain exact clock positions, VBI IDs and state", () => {
  for (const frame of report.ten_heaviest_frames_in_9040_replay) {
    assert.ok(frame.end.clock > frame.start.clock);
    assert.equal(frame.end.clock - frame.start.clock, frame.wall_cycles);
    assert.ok(frame.next_start.clock > frame.end.clock);
    assert.ok(frame.end.host_frame >= frame.start.host_frame);
    assert.ok(frame.next_start.host_frame >= frame.end.host_frame);
    assert.equal(frame.dma_ctl, 0x3e);
    assert.equal(frame.nmi_en, 0x80);
    assert.equal(frame.state.music_active, true);
    assert.equal(frame.state.sound_enabled, true);
    assert.ok(frame.cpu_dma_off_reference?.main_loop_cycles > 0);
  }
});
