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
    report.gate.deadline_overrun_frames === 0 && report.gate.missed_frames === 0 &&
    report.gate.extra_vbi_boundaries === 0);
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

test("real Atari800 XEX/ATR cold boots reach visible gameplay by frame 750", () => {
  const smoke = report.boot_smoke;
  assert.equal(smoke.emulator, "Atari800 7.1.2 PAL/XL");
  assert.equal(smoke.frames_observed, 750);
  assert.equal(smoke.duration_seconds_pal, 15);
  assert.equal(smoke.guest_instrumentation_bytes, 0);
  assert.equal(smoke.cold_ram_range, "$8000-$9FFF");
  assert.equal(smoke.sessions.length, 4);
  assert.deepEqual(smoke.sessions.map(({ medium, cold_ram_fill }) =>
    [medium, cold_ram_fill]), [
    ["XEX", 0xa5], ["XEX", 0x5a], ["ATR", 0xa5], ["ATR", 0x5a],
  ]);
  for (const session of smoke.sessions) {
    assert.equal(session.passed, true);
    assert.deepEqual(session.snapshots.map(({ frame }) => frame), [1, 250, 300, 500, 750]);
    const byFrame = new Map(session.snapshots.map((snapshot) => [snapshot.frame, snapshot]));
    assert.ok(byFrame.get(250).loader_timer > byFrame.get(300).loader_timer);
    assert.deepEqual([
      byFrame.get(500).loader_timer,
      byFrame.get(500).game_state,
      byFrame.get(500).dlist,
      byFrame.get(500).charset_address,
      byFrame.get(500).dma_ctl,
      byFrame.get(500).nmi_en,
    ], [0, 1, smoke.expected_addresses.main_menu_dlist, 0x4800, 0x3a, 0x80]);
    assert.deepEqual([
      byFrame.get(750).game_state,
      byFrame.get(750).charset_address,
      byFrame.get(750).dma_ctl,
      byFrame.get(750).nmi_en,
      byFrame.get(750).vdslst,
    ], [6, 0x5000, 0x3e, 0x80, smoke.expected_addresses.gameplay_dli]);
    assert.ok(session.milestones.start < session.milestones.loader);
    assert.ok(session.milestones.loader < session.milestones.menu);
    assert.ok(session.milestones.menu <= session.milestones.frontend_poll);
    assert.ok(session.milestones.frontend_poll < session.milestones.gameplay_init);
    assert.ok(session.milestones.gameplay_init <= session.milestones.main_loop);
    assert.ok(session.milestones.main_loop < 750);
    assert.equal(session.screenshots.length, 5);
    assert.ok(session.screenshots.every(({ bytes, sha256 }) =>
      bytes > 0 && /^[0-9a-f]{64}$/.test(sha256)));
  }
  assert.equal(new Set(smoke.sessions.map(({ artifact }) => artifact.sha256)
    .filter((_, index) => index < 2)).size, 1);
  assert.equal(new Set(smoke.sessions.map(({ artifact }) => artifact.sha256)
    .filter((_, index) => index >= 2)).size, 1);
  assert.equal(smoke.passed, true);
});

test("wall trace covers 9040 legal frames, targeted, cadence and fighter-flash replays", () => {
  assert.equal(report.replay.baseline_measured_frames, 9_040);
  assert.equal(report.replay.targeted_measured_frames, 920);
  assert.equal(report.replay.parallax_cadence_measured_frames, 1_200);
  assert.equal(report.replay.fighter_flash_measured_frames, 1_600);
  assert.equal(report.replay.debris_effects_measured_frames, 1_200);
  assert.equal(report.replay.sessions
    .filter((session) => session.kind === "baseline-9040")
    .reduce((sum, session) => sum + session.measured_frames, 0), 9_040);
  assert.equal(report.replay.sessions
    .filter((session) => session.kind === "targeted-heavy-coincidence")
    .reduce((sum, session) => sum + session.measured_frames, 0), 920);
  assert.equal(report.replay.sessions
    .filter((session) => session.kind === "parallax-cadence")
    .reduce((sum, session) => sum + session.measured_frames, 0), 1_200);
  assert.equal(report.replay.sessions
    .filter((session) => session.kind === "fighter-flash-coverage")
    .reduce((sum, session) => sum + session.measured_frames, 0), 1_600);
  assert.equal(report.replay.sessions
    .filter((session) => session.kind === "debris-effects-coverage")
    .reduce((sum, session) => sum + session.measured_frames, 0), 1_200);
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
  assert.ok(report.coverage.maximum_projectile_pool.maximum_observed >= 18);
  assert.equal(report.coverage.maximum_projectile_pool.legal_capacity, 19);
  assert.equal(report.coverage.broadside_projectiles.pool_capacity, 3);
  assert.equal(report.coverage.broadside_projectiles.release_source_turrets, 2);
  assert.match(report.coverage.broadside_projectiles.classification,
    /no manual RAM fixture|production scheduler/);
  for (const name of [
    "debris_empty_path",
    "debris_one_active",
    "debris_spawn",
    "debris_contact",
    "debris_despawn",
    "debris_bottom_despawn",
    "debris_shot",
    "debris_shot_post_capital",
    "debris_post_capital_sector",
  ]) {
    assert.equal(report.coverage[name].observed, true, `${name} was not observed`);
  }
  assert.deepEqual(report.coverage.debris_visual_variants,
    { observed: true, values: [0, 1] });
  assert.deepEqual(report.coverage.debris_tumbling_phases,
    { observed: true, values: [0, 1] });
  assert.deepEqual(report.coverage.debris_trajectories,
    { observed: true, vx_signed_hpos: [-4, 0, 4] });
  assert.equal(report.coverage.debris_vertical_cadence.observed, true);
  assert.equal(report.coverage.debris_vertical_cadence.invalid_transitions, 0);
  assert.ok(report.coverage.debris_vertical_cadence.vertical_steps > 0);
  assert.ok(report.coverage.debris_vertical_cadence.held_events > 0);
  assert.deepEqual({
    observed: report.coverage.debris_destruction_effects.observed,
    activeMask: report.coverage.debris_destruction_effects.active_mask,
    activeCount: report.coverage.debris_destruction_effects.active_count,
    spawnUpdatedRendered:
      report.coverage.debris_destruction_effects.spawn_updated_and_rendered,
    eraseObserved: report.coverage.debris_destruction_effects.following_frame_erase_observed,
    postCapital: report.coverage.debris_destruction_effects.post_capital_spawn_observed,
  }, {
    observed: true,
    activeMask: 0x1f,
    activeCount: 5,
    spawnUpdatedRendered: true,
    eraseObserved: true,
    postCapital: true,
  });
  assert.deepEqual(report.coverage.parallax_cadence.map((entry) =>
    entry.measured_rows_per_second), [
    { world: 20, near: 10, far: 5, debris: 12 },
    { world: 22.5, near: 11.25, far: 5.625, debris: 13.5 },
    { world: 25, near: 12.5, far: 6.25, debris: 15 },
  ]);
  assert.deepEqual(report.coverage.parallax_cadence.map((entry) =>
    [...new Set(entry.full_debris_flight_frames)]), [[91], [82], [74]]);
  assert.deepEqual(report.coverage.post_capital_transition, {
    session: "2-neutral-fire0",
    open_gameplay_frame: 0,
    drain_frame: 496,
    complete_frame: 565,
    next_open_frame: 652,
    post_capital_spawn_frame: 682,
    post_capital_spawn_active_frame: 683,
    configured_spawn_delay_scheduler_ticks: 32,
    observable_open_to_spawn_frame_delta: 30,
  });
});

test("debris visual polish preserves foundation history and passes its +256 PAL gate", () => {
  const historical = report.gate.historical_runtime_headroom_gate;
  const foundation = report.gate.entity_effects_foundation;
  const feature = report.gate.debris_visual_polish;
  assert.deepEqual([
    historical.maximum_wall_cycles,
    historical.preserved_for_history,
    historical.replaced,
  ], [31_568, true, false]);
  assert.deepEqual([
    foundation.baseline_wall_cycles,
    foundation.baseline_physical_headroom,
    foundation.approved_delta_cycles,
    foundation.maximum_wall_cycles,
    foundation.minimum_physical_headroom,
  ], [31_440, 4_128, 600, 32_040, 3_528]);
  assert.deepEqual([
    foundation.measured_wall_cycles,
    foundation.measured_physical_headroom,
    foundation.actual_delta_cycles,
    foundation.remaining_approved_cycles,
    foundation.passed,
  ], [32_025, 3_543, 585, 15, true]);
  assert.deepEqual([
    feature.baseline_wall_cycles,
    feature.baseline_physical_headroom,
    feature.approved_delta_cycles,
    feature.maximum_wall_cycles,
    feature.minimum_physical_headroom,
  ], [32_025, 3_543, 256, 32_281, 3_287]);
  assert.equal(feature.actual_delta_cycles,
    feature.measured_wall_cycles - feature.baseline_wall_cycles);
  assert.equal(feature.remaining_approved_cycles,
    feature.maximum_wall_cycles - feature.measured_wall_cycles);
  assert.deepEqual([
    feature.measured_wall_cycles,
    feature.measured_physical_headroom,
  ], [32_081, 3_487]);
  assert.deepEqual([
    feature.empty_path.delta_from_baseline,
    feature.one_active_debris.delta_from_baseline,
    feature.spawn_path.delta_from_baseline,
    feature.contact_path.delta_from_baseline,
  ], [-917, 56, -3_813, -5_896]);
  assert.ok(feature.actual_delta_cycles <= feature.approved_delta_cycles);
  assert.ok(feature.measured_physical_headroom >= feature.minimum_physical_headroom);
  assert.equal(feature.budget_overrun_frames, 0);
  assert.equal(manifest.runtimeTiming.entityEffects.emptyPathCpuCycles <= 123, true);
  assert.equal(manifest.entityEffects.runtimeBudget.debrisVisualPolish.actualDeltaCycles,
    feature.actual_delta_cycles);
});

test("explosion colour flash passes its +64 PAL gate with exact GTIA traces", () => {
  const feature = report.gate.explosion_colour_flash;
  assert.deepEqual([
    feature.baseline_wall_cycles,
    feature.baseline_physical_headroom,
    feature.approved_delta_cycles,
    feature.maximum_wall_cycles,
    feature.delta_limited_minimum_physical_headroom,
    feature.absolute_minimum_physical_headroom,
  ], [32_081, 3_487, 64, 32_145, 3_423, 3_200]);
  assert.equal(feature.actual_delta_cycles,
    feature.measured_wall_cycles - feature.baseline_wall_cycles);
  assert.equal(feature.remaining_approved_cycles,
    feature.maximum_wall_cycles - feature.measured_wall_cycles);
  assert.ok(feature.actual_delta_cycles <= feature.approved_delta_cycles);
  assert.ok(feature.measured_physical_headroom >=
    feature.delta_limited_minimum_physical_headroom);
  assert.equal(feature.budget_overrun_frames, 0);
  assert.deepEqual([feature.measured_wall_cycles, feature.measured_physical_headroom],
    [32_122, 3_446]);
  assert.deepEqual(report.coverage.fighter_colour_flash.enemy_fighter.colbk_values,
    [0x1e, 0x3c, 0x1c, 0x34]);
  assert.deepEqual(report.coverage.fighter_colour_flash.player_death.colbk_values,
    [0x1e, 0x3c, 0x1c, 0x3c, 0x38, 0x34]);
  assert.deepEqual(report.coverage.fighter_colour_flash.colpm_values, {
    colpm0: [0x0e],
    colpm1: [0x44, 0x84],
    colpm2: [0x46],
    colpm3: [0x28],
  });
  assert.deepEqual(manifest.entityEffects.runtimeBudget.explosionColourFlash, {
    baselineWallCycles: 32_081,
    baselinePhysicalHeadroomCycles: 3_487,
    approvedFeatureDeltaCycles: 64,
    featureWallLimitCycles: 32_145,
    deltaLimitedMinimumPhysicalHeadroomCycles: 3_423,
    absoluteMinimumPhysicalHeadroomCycles: 3_200,
    measuredWallCycles: feature.measured_wall_cycles,
    actualDeltaCycles: feature.actual_delta_cycles,
    remainingApprovedCycles: feature.remaining_approved_cycles,
    missedSynchronization: 0,
    deadlineOverruns: 0,
  });
});

test("destructible debris passes PAL, inactive-path and linked-code budgets", () => {
  const feature = report.gate.destructible_debris;
  assert.deepEqual([
    feature.baseline_wall_cycles,
    feature.baseline_physical_headroom,
    feature.target_delta_cycles,
    feature.hard_delta_cycles,
    feature.target_wall_cycles,
    feature.maximum_wall_cycles,
    feature.minimum_physical_headroom,
  ], [32_122, 3_446, 640, 768, 32_762, 32_890, 2_800]);
  assert.deepEqual([feature.measured_wall_cycles, feature.measured_physical_headroom],
    [32_719, 2_849], "the accepted destructible-debris checkpoint must remain frozen");
  assert.equal(feature.actual_delta_cycles,
    feature.measured_wall_cycles - feature.baseline_wall_cycles);
  assert.ok(feature.measured_wall_cycles <= feature.maximum_wall_cycles);
  assert.ok(feature.measured_physical_headroom >= feature.minimum_physical_headroom);
  assert.equal(feature.target_overrun_frames, 0);
  assert.equal(feature.hard_overrun_frames, 0);
  assert.ok(feature.no_active_debris_path_delta_cpu_cycles <= 32);
  assert.equal(feature.no_active_viper_projectile_path_delta_cpu_cycles, 0);
  assert.equal(feature.passed, true);
  assert.ok(feature.debris_shot_path.events.includes("debris-shot"));
  assert.deepEqual(manifest.entityEffects.runtimeBudget.destructibleDebris, {
    baselineWallCycles: 32_122,
    baselinePhysicalHeadroomCycles: 3_446,
    targetDeltaCycles: 640,
    hardDeltaCycles: 768,
    targetWallLimitCycles: 32_762,
    hardWallLimitCycles: 32_890,
    minimumPhysicalHeadroomCycles: 2_800,
    measuredWallCycles: feature.measured_wall_cycles,
    actualDeltaCycles: feature.actual_delta_cycles,
    remainingTargetCycles: feature.remaining_target_cycles,
    remainingHardCycles: feature.remaining_hard_cycles,
    missedSynchronization: 0,
    deadlineOverruns: 0,
  });
  assert.equal(manifest.runtimeCodeBudget.baselineBytes, 13_697);
  assert.equal(manifest.runtimeCodeBudget.approvedDeltaBytes, 768);
  assert.ok(manifest.runtimeCodeBudget.actualDeltaBytes <= 768);
});

test("enemy breakup passes the hard PAL gate and executes the five-slot runtime path", () => {
  const feature = report.gate.enemy_breakup_effects;
  assert.deepEqual([
    feature.baseline_wall_cycles,
    feature.baseline_physical_headroom,
    feature.target_delta_cycles,
    feature.hard_delta_cycles,
    feature.target_wall_cycles,
    feature.maximum_wall_cycles,
    feature.minimum_physical_headroom,
  ], [32_719, 2_849, 128, 224, 32_847, 32_943, 2_600]);
  assert.deepEqual([
    feature.measured_wall_cycles,
    feature.measured_physical_headroom,
    feature.actual_delta_cycles,
    feature.remaining_target_cycles,
    feature.remaining_hard_cycles,
  ], [32_869, 2_699, 150, -22, 74]);
  assert.equal(feature.target_overrun_frames > 0, true);
  assert.equal(feature.hard_overrun_frames, 0);
  assert.equal(feature.passed, true);
  assert.equal(report.gate.passed, true);
  assert.equal(report.gate.missed_frames, 0);
  assert.equal(report.gate.deadline_overrun_frames, 0);
  assert.equal(report.gate.extra_vbi_boundaries, 0);
  assert.deepEqual([
    report.coverage.raider_breakup_effects.observed,
    report.coverage.raider_breakup_effects.active_mask,
    report.coverage.raider_breakup_effects.active_count,
    report.coverage.raider_breakup_effects.spawn_updated_and_rendered,
    report.coverage.raider_breakup_effects.full_screen_flash_preserved,
  ], [true, 0x1f, 5, true, true]);
  assert.ok(report.coverage.raider_breakup_effects.spawner_frames > 0);
  assert.ok(report.coverage.raider_breakup_effects.yellow_death_then_red_materialisation_frames > 0);
  assert.deepEqual(manifest.entityEffects.runtimeBudget.enemyBreakupEffects, {
    baselineWallCycles: 32_719,
    baselinePhysicalHeadroomCycles: 2_849,
    targetDeltaCycles: 128,
    hardDeltaCycles: 224,
    targetWallLimitCycles: 32_847,
    hardWallLimitCycles: 32_943,
    minimumPhysicalHeadroomCycles: 2_600,
    measuredWallCycles: 32_869,
    actualDeltaCycles: 150,
    remainingTargetCycles: -22,
    remainingHardCycles: 74,
    missedSynchronization: 0,
    deadlineOverruns: 0,
  });
  assert.deepEqual(manifest.runtimeCodeBudget.enemyBreakupEffects, {
    baselineBytes: 14_184,
    actualBytes: 14_192,
    actualDeltaBytes: 8,
    approvedDeltaBytes: 512,
    remainingBytes: 504,
  });
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
