import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseViceLabels } from "./runtime-cycles.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const buildDirectory = path.join(rootDirectory, "build", "runtime-wall-trace");
const reportPath = path.join(rootDirectory, "docs", "runtime-wall-trace.json");
const headerPath = path.join(scriptDirectory, "atari800-wall-trace.h");
const PAL_FRAME_CYCLES = 35_568;
const PHYSICAL_GATE_CYCLES = 31_568;
const EXPECTED_ATARI800_VERSION = "7.1.2";
const OFFICIAL_SOURCE_ARCHIVE_SHA256 =
  "9602badfd7c45551cb5c4cc77f862af377c43a07caaa0bfc77ac87f9179673e3";

const baselineSessions = [
  { difficulty: 2, policy: "neutral", fireDelay: 0, frames: 760 },
  ...Array.from({ length: 8 }, (_, fireDelay) => ({
    difficulty: 2,
    policy: (fireDelay & 1) !== 0 && fireDelay !== 5 ? "evasive" : "sweep",
    fireDelay,
    frames: 920,
  })),
  { difficulty: 1, policy: "evasive", fireDelay: 3, frames: 920 },
].map((session) => ({
  ...session,
  id: `${session.difficulty}-${session.policy}-fire${session.fireDelay}`,
  kind: "baseline-9040",
}));

const targetedSessions = [{
  id: "targeted-2-sweep-fire4",
  difficulty: 2,
  policy: "sweep",
  fireDelay: 4,
  frames: 920,
  kind: "targeted-heavy-coincidence",
}];

const traceLabels = {
  DFTRACE_PC_ACTIVE: "main_loop_option_poll",
  DFTRACE_PC_END: "main_loop",
  DFTRACE_PC_FRONTEND_POLL: "frontend_input_poll",
  DFTRACE_PC_DLI: "gameplay_dli",
  DFTRACE_PC_WORLD: "scroll_world_columns",
  DFTRACE_PC_FAR_ERASE: "erase_far_star_overlays",
  DFTRACE_PC_HULL: "scroll_hull_columns",
  DFTRACE_PC_BROADSIDE: "update_broadside",
  DFTRACE_PC_FIGHTER_EXPLOSION: "render_shared_fighter_explosions",
  DFTRACE_PC_CAPITAL_EXPLOSION: "render_capital_explosions",
  DFTRACE_PC_MUSIC_TICK: "music_tick_gameplay",
  DFTRACE_PLAYER_X: "player_x",
  DFTRACE_PLAYER_Y: "player_y",
  DFTRACE_PROJECTILE_ACTIVE: "FIGHTER_PROJECTILE_ACTIVE",
  DFTRACE_BROAD_STATE: "BROAD_STATE",
  DFTRACE_FAR_ACTIVE: "STAR_FAR_ACTIVE",
  DFTRACE_ENEMY_ACTIVE: "ENEMY_ACTIVE",
  DFTRACE_FIGHTER_EXPLOSION_TIMER: "FIGHTER_EXPLOSION_TIMER",
  DFTRACE_CAPITAL_EXPLOSION_TIMER: "CAPITAL_EXPLOSION_TIMER",
  DFTRACE_MUSIC_ACTIVE: "MUSIC_ACTIVE",
  DFTRACE_FIRE_TIMER: "fire_timer",
  DFTRACE_HIT_TIMER: "hit_timer",
  DFTRACE_CAPITAL_SOUND_TIMER: "CAPITAL_EXPLOSION_SOUND_TIMER",
  DFTRACE_SOUND_ENABLED: "sound_enabled",
  DFTRACE_PLAYER_LIFECYCLE: "PLAYER_LIFECYCLE",
  DFTRACE_SECTOR_STATE: "CAPITAL_SECTOR_STATE",
  DFTRACE_GAME_STATE: "game_state",
  DFTRACE_FRONTEND_SELECTION: "frontend_selection",
  DFTRACE_FRONTEND_INPUT_ARMED: "frontend_input_armed",
  DFTRACE_DIFFICULTY_SETTING: "DIFFICULTY_SETTING",
  DFTRACE_GAMEPLAY_FRAME: "frame_counter",
  DFTRACE_MUZZLE_SCREEN_HI: "MUZZLE_SCREEN_HI",
};

const numericCsvFields = new Set([
  "frame", "start_clock", "end_clock", "next_start_clock", "wall_cycles",
  "start_host_frame", "end_host_frame", "next_start_host_frame", "start_scanline",
  "start_cycle", "end_scanline", "end_cycle", "host_vbi_boundaries",
  "extra_vbi_boundaries", "missed_frames", "dli_nmis", "dma_ctl", "nmi_en",
  "projectiles", "broadside", "far_rendered", "live_raider", "fighter_explosion",
  "capital_explosion", "music_active", "fire_sfx", "hit_sfx", "capital_sfx",
  "sound_enabled", "player_lifecycle", "sector_state", "gameplay_frame",
  "difficulty", "active_muzzles", "events",
]);
let cpuReferenceByFrame = new Map();

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDirectory,
    env: options.env ?? process.env,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(" ")} failed with status ${result.status}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join("\n"));
  }
  return result;
}

function prepareAtari800(sourceDirectory) {
  const configurePath = path.join(sourceDirectory, "configure");
  const cpuPath = path.join(sourceDirectory, "src", "cpu.c");
  const destinationHeader = path.join(sourceDirectory, "src", "darkfighter_trace.h");
  invariant(fs.existsSync(configurePath), `Atari800 configure is missing: ${configurePath}`);
  invariant(fs.existsSync(cpuPath), `Atari800 cpu.c is missing: ${cpuPath}`);
  const configureText = fs.readFileSync(path.join(sourceDirectory, "configure.ac"), "utf8");
  invariant(configureText.includes(`AC_INIT(Atari800, ${EXPECTED_ATARI800_VERSION},`),
    `Expected Atari800 ${EXPECTED_ATARI800_VERSION} source`);

  fs.copyFileSync(headerPath, destinationHeader);
  let cpuText = fs.readFileSync(cpuPath, "utf8");
  if (!cpuText.includes('#include "darkfighter_trace.h"')) {
    const includeAnchor = "#endif /* ASAP */\n";
    invariant(cpuText.includes(includeAnchor), "Atari800 cpu.c include anchor changed");
    cpuText = cpuText.replace(includeAnchor,
      `${includeAnchor}\n#include "darkfighter_trace.h"\n`);
  }
  if (!cpuText.includes("DFTrace_Observe(GET_PC());")) {
    const executeAnchor = "\t\tCPU_delayed_nmi = 0;\n";
    invariant(cpuText.includes(executeAnchor), "Atari800 CPU execution anchor changed");
    cpuText = cpuText.replace(executeAnchor,
      `${executeAnchor}\t\tDFTrace_Observe(GET_PC());\n`);
  }
  fs.writeFileSync(cpuPath, cpuText);

  if (!fs.existsSync(path.join(sourceDirectory, "Makefile"))) {
    run(configurePath, ["--disable-sdltest", "--disable-riodevice"], { cwd: sourceDirectory });
  }
  run("make", ["-j4"], { cwd: sourceDirectory });
}

function parseCsv(csvText, sessionDefinition) {
  const lines = csvText.trim().split(/\r?\n/);
  invariant(lines.length === sessionDefinition.frames + 1,
    `${sessionDefinition.id} emitted ${lines.length - 1}/${sessionDefinition.frames} frames`);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    invariant(values.length === headers.length,
      `${sessionDefinition.id} emitted a malformed CSV row`);
    const row = { trace_kind: sessionDefinition.kind };
    for (let index = 0; index < headers.length; index += 1) {
      const name = headers[index];
      row[name] = numericCsvFields.has(name) ? Number(values[index]) : values[index];
    }
    return row;
  });
}

function decodeEvents(bits) {
  return [
    [1 << 0, "world-copy"],
    [1 << 1, "far-erase"],
    [1 << 2, "hull-copy"],
    [1 << 3, "broadside-update"],
    [1 << 4, "fighter-explosion-render"],
    [1 << 5, "capital-explosion-render"],
    [1 << 6, "music-tick"],
  ].filter(([mask]) => (bits & mask) !== 0).map(([, name]) => name);
}

function frameState(row, includeCpuReference = false) {
  const cpuSession = row.session.replace(/^targeted-/, "");
  const cpuReference = cpuReferenceByFrame.get(`${cpuSession}:${row.frame}`);
  return {
    trace_kind: row.trace_kind,
    session: row.session,
    frame: row.frame,
    gameplay_frame: row.gameplay_frame,
    difficulty: row.difficulty,
    wall_cycles: row.wall_cycles,
    physical_headroom: PAL_FRAME_CYCLES - row.wall_cycles,
    start: {
      clock: row.start_clock,
      host_frame: row.start_host_frame,
      scanline: row.start_scanline,
      cycle: row.start_cycle,
    },
    end: {
      clock: row.end_clock,
      host_frame: row.end_host_frame,
      scanline: row.end_scanline,
      cycle: row.end_cycle,
    },
    next_start: {
      clock: row.next_start_clock,
      host_frame: row.next_start_host_frame,
    },
    host_vbi_boundaries: row.host_vbi_boundaries,
    extra_vbi_boundaries: row.extra_vbi_boundaries,
    missed_frames: row.missed_frames,
    dli_nmis: row.dli_nmis,
    dma_ctl: row.dma_ctl,
    nmi_en: row.nmi_en,
    state: {
      projectiles: row.projectiles,
      broadside: row.broadside,
      far_rendered: row.far_rendered,
      active_muzzles: row.active_muzzles,
      live_raider: Boolean(row.live_raider),
      fighter_explosion: Boolean(row.fighter_explosion),
      capital_explosion: Boolean(row.capital_explosion),
      music_active: Boolean(row.music_active),
      fire_sfx: Boolean(row.fire_sfx),
      hit_sfx: Boolean(row.hit_sfx),
      capital_sfx: Boolean(row.capital_sfx),
      sound_enabled: Boolean(row.sound_enabled),
      player_lifecycle: row.player_lifecycle,
      sector_state: row.sector_state,
    },
    events: decodeEvents(row.events),
    cpu_dma_off_reference: includeCpuReference && cpuReference ? {
      main_loop_cycles: cpuReference.mainLoopCpuCycles,
      active_cycles: cpuReference.activeCpuCycles,
      inclusive_procedure_cycles: cpuReference.procedureCycles,
      note: "Procedure values are inclusive and may be nested; they must not be summed.",
    } : null,
  };
}

function maximumRow(rows, selector) {
  return rows.reduce((maximum, row) =>
    maximum === undefined || selector(row) > selector(maximum) ? row : maximum, undefined);
}

function coverageRecord(rows, predicate) {
  const matching = rows.filter(predicate);
  const maximum = matching.length === 0 ? undefined : maximumRow(matching, (row) => row.wall_cycles);
  return {
    observed: matching.length > 0,
    matching_frames: matching.length,
    heaviest: maximum ? frameState(maximum) : null,
  };
}

function sessionSummary(session, rows) {
  const maximum = maximumRow(rows, (row) => row.wall_cycles);
  return {
    id: session.id,
    kind: session.kind,
    difficulty: session.difficulty,
    policy: session.policy,
    fire_delay: session.fireDelay,
    measured_frames: rows.length,
    maximum_wall_cycles: maximum.wall_cycles,
    deadline_overrun_frames: rows.filter((row) => row.missed_frames > 0).length,
    missed_frames: rows.reduce((sum, row) => sum + row.missed_frames, 0),
  };
}

function main() {
  const sourceDirectory = path.resolve(argumentValue("atari800-source") ??
    process.env.ATARI800_TRACE_SOURCE ?? "/tmp/atari800-7.1.2");
  const shouldPrepare = process.argv.includes("--prepare");
  if (shouldPrepare) prepareAtari800(sourceDirectory);

  const emulatorPath = path.join(sourceDirectory, "src", "atari800");
  invariant(fs.existsSync(emulatorPath),
    `Instrumented Atari800 is missing: ${emulatorPath}; rerun with --prepare`);
  const labelPath = path.join(rootDirectory, "build", "dark-fighter.lbl");
  const manifestPath = path.join(rootDirectory, "dist", "dark-fighter-manifest.json");
  const xexPath = path.join(rootDirectory, "dist", "dark-fighter.xex");
  for (const requiredPath of [labelPath, manifestPath, xexPath]) {
    invariant(fs.existsSync(requiredPath), `Build input is missing: ${requiredPath}`);
  }
  const labels = parseViceLabels(fs.readFileSync(labelPath, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const addressEnvironment = {};
  for (const [environmentName, labelName] of Object.entries(traceLabels)) {
    const address = labels.get(labelName);
    invariant(Number.isInteger(address), `Trace label ${labelName} is missing`);
    addressEnvironment[environmentName] = `0x${address.toString(16)}`;
  }

  fs.mkdirSync(buildDirectory, { recursive: true });
  const allRows = [];
  const summaries = [];
  for (const session of [...baselineSessions, ...targetedSessions]) {
    const outputPath = path.join(buildDirectory, `${session.id}.csv`);
    const environment = {
      ...process.env,
      SDL_VIDEODRIVER: process.env.SDL_VIDEODRIVER ?? "dummy",
      ...addressEnvironment,
      DFTRACE_FRAMES: String(session.frames),
      DFTRACE_FIRE_DELAY: String(session.fireDelay),
      DFTRACE_DIFFICULTY: String(session.difficulty),
      DFTRACE_POLICY: session.policy,
      DFTRACE_SESSION: session.id,
      DFTRACE_OUTPUT: outputPath,
    };
    run(emulatorPath, [
      "-xe", "-pal", "-nobasic", "-nosound", "-turbo",
      "-run", xexPath,
    ], { env: environment });
    const rows = parseCsv(fs.readFileSync(outputPath, "utf8"), session);
    allRows.push(...rows);
    summaries.push(sessionSummary(session, rows));
    console.log(`${session.id}: ${rows.length} frames, max ` +
      `${maximumRow(rows, (row) => row.wall_cycles).wall_cycles} wall cycles`);
  }

  const baselineRows = allRows.filter((row) => row.trace_kind === "baseline-9040");
  const targetedRows = allRows.filter((row) => row.trace_kind === "targeted-heavy-coincidence");
  invariant(baselineRows.length === 9_040,
    `Baseline trace measured ${baselineRows.length}/9040 frames`);
  invariant(targetedRows.length === 920,
    `Targeted trace measured ${targetedRows.length}/920 frames`);
  invariant(allRows.every((row) => row.dma_ctl === 0x3e),
    "Trace observed gameplay DMACTL other than $3E");
  invariant(allRows.every((row) => row.nmi_en === 0x80),
    "Trace observed gameplay NMIEN other than DLI-on $80");
  invariant(allRows.every((row) => row.sound_enabled === 1 && row.music_active === 1),
    "Trace observed gameplay sound or music disabled");
  invariant(allRows.some((row) => row.dli_nmis > 0), "Trace observed no DLI NMI");

  const heaviest = maximumRow(allRows, (row) => row.wall_cycles);
  const baselineHeaviest = maximumRow(baselineRows, (row) => row.wall_cycles);
  const targetedHeaviest = maximumRow(targetedRows, (row) => row.wall_cycles);
  const cpuCycles = manifest.runtimeTiming.cpu_cycles_dma_off ??
    manifest.runtimeTiming.cpuDmaOff.heaviestMainLoopCycles;
  const estimatedAdditive = manifest.runtimeTiming.estimated_additive_cycles ??
    manifest.runtimeTiming.fullPalFrame.conservativeCycles;
  cpuReferenceByFrame = new Map((manifest.runtimeTiming.cpuReferenceFrames ?? []).map((frame) => [
    `${frame.session}:${frame.frame}`,
    frame,
  ]));
  const topTenBaseline = [...baselineRows]
    .sort((left, right) => right.wall_cycles - left.wall_cycles)
    .slice(0, 10)
    .map((row) => frameState(row, true));
  const deadlineOverruns = allRows.filter((row) => row.missed_frames > 0);
  const baselineDeadlineOverruns = baselineRows.filter((row) => row.missed_frames > 0);
  const targetedDeadlineOverruns = targetedRows.filter((row) => row.missed_frames > 0);
  const maximumBroadside = Math.max(...allRows.map((row) => row.broadside));

  const report = {
    schema_version: 1,
    method: "Atari800 ANTIC master-clock observation at guest-PC boundaries; no guest logging or instrumentation instructions",
    artifact: {
      path: "dist/dark-fighter.xex",
      bytes: fs.statSync(xexPath).size,
      sha256: sha256(fs.readFileSync(xexPath)),
    },
    emulator: {
      name: "Atari800",
      version: EXPECTED_ATARI800_VERSION,
      official_source_archive_sha256: OFFICIAL_SOURCE_ARCHIVE_SHA256,
      source_patch: "scripts/atari800-wall-trace.h plus one observer call before each emulated opcode",
      model_arguments: ["-xe", "-pal", "-nobasic", "-nosound", "-turbo"],
      audio_note: "-nosound disables host playback only; guest sound/music state and POKEY register writes remain active",
    },
    semantics: {
      cpu_cycles_dma_off: cpuCycles,
      cpu_comparison_headroom: PAL_FRAME_CYCLES - cpuCycles,
      measured_wall_cycles_dma_on: heaviest.wall_cycles,
      measured_physical_headroom: PAL_FRAME_CYCLES - heaviest.wall_cycles,
      estimated_additive_cycles: estimatedAdditive,
    },
    gate: {
      pal_frame_cycles: PAL_FRAME_CYCLES,
      maximum_wall_cycles: PHYSICAL_GATE_CYCLES,
      measured_wall_cycles_dma_on: heaviest.wall_cycles,
      measured_physical_headroom: PAL_FRAME_CYCLES - heaviest.wall_cycles,
      deadline_overrun_frames: deadlineOverruns.length,
      missed_frames: deadlineOverruns.reduce((sum, row) => sum + row.missed_frames, 0),
      baseline_9040_deadline_overrun_frames: baselineDeadlineOverruns.length,
      baseline_9040_missed_frames:
        baselineDeadlineOverruns.reduce((sum, row) => sum + row.missed_frames, 0),
      targeted_deadline_overrun_frames: targetedDeadlineOverruns.length,
      targeted_missed_frames:
        targetedDeadlineOverruns.reduce((sum, row) => sum + row.missed_frames, 0),
      baseline_9040_active_frames_crossing_host_vbi:
        baselineRows.filter((row) => row.host_vbi_boundaries > 0).length,
      baseline_9040_host_vbi_boundary_crossings:
        baselineRows.reduce((sum, row) => sum + row.host_vbi_boundaries, 0),
      targeted_active_frames_crossing_host_vbi:
        targetedRows.filter((row) => row.host_vbi_boundaries > 0).length,
      targeted_host_vbi_boundary_crossings:
        targetedRows.reduce((sum, row) => sum + row.host_vbi_boundaries, 0),
      active_frames_crossing_host_vbi: allRows.filter((row) => row.host_vbi_boundaries > 0).length,
      host_vbi_boundary_crossings:
        allRows.reduce((sum, row) => sum + row.host_vbi_boundaries, 0),
      extra_vbi_boundaries: allRows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0),
      passed: heaviest.wall_cycles <= PHYSICAL_GATE_CYCLES && deadlineOverruns.length === 0,
    },
    instrumentation: {
      start_label: "main_loop_option_poll",
      start_semantics: "first instruction after wait_frame returns, before the released OPTION poll",
      end_label: "main_loop",
      end_semantics: "first instruction of the next wait_frame call",
      guest_instructions_added: 0,
      guest_cycles_added: 0,
      logging_during_measured_path: false,
      production_dma_ctl: 0x3e,
      production_nmi_en: 0x80,
      nmi_note: "The release deliberately enables both gameplay DLIs and leaves OS VBI NMI disabled; Atari800_nframes supplies the host/VBI boundary identifier.",
      raw_trace_directory: "build/runtime-wall-trace",
    },
    replay: {
      baseline_measured_frames: baselineRows.length,
      targeted_measured_frames: targetedRows.length,
      input: "production frontend/options handlers followed by deterministic held-FIRE neutral/sweep/evasive joystick policies",
      sessions: summaries,
      baseline_heaviest: frameState(baselineHeaviest),
      targeted_heaviest: frameState(targetedHeaviest),
    },
    coverage: {
      world_near_with_far_erase: coverageRecord(allRows,
        (row) => (row.events & 0x07) === 0x07),
      hull_event: coverageRecord(allRows, (row) => (row.events & (1 << 2)) !== 0),
      active_muzzles: coverageRecord(allRows, (row) => row.active_muzzles > 0),
      maximum_projectile_pool: {
        ...coverageRecord(allRows, (row) => row.projectiles === 19),
        maximum_observed: Math.max(...allRows.map((row) => row.projectiles)),
        legal_capacity: 19,
      },
      broadside_projectiles: {
        ...coverageRecord(allRows, (row) => row.broadside === maximumBroadside),
        maximum_observed: maximumBroadside,
        pool_capacity: 3,
        release_source_turrets: 2,
        three_slot_legal_coincidence_observed: maximumBroadside === 3,
        classification: maximumBroadside === 3
          ? "observed through the production scheduler"
          : "not observed in the legal release replay; no manual RAM fixture was admitted to the DMA-on result",
      },
      live_raider: coverageRecord(allRows, (row) => row.live_raider !== 0),
      fighter_explosion: coverageRecord(allRows, (row) => row.fighter_explosion !== 0),
      capital_explosion: coverageRecord(allRows, (row) => row.capital_explosion !== 0),
      music_with_sfx_preemption: coverageRecord(allRows, (row) => row.music_active !== 0 &&
        (row.fire_sfx !== 0 || row.hit_sfx !== 0 || row.capital_sfx !== 0)),
    },
    ten_heaviest_frames_in_9040_replay: topTenBaseline,
    five_heaviest_frames: topTenBaseline.slice(0, 5).map((frame) => ({
      session: frame.session,
      frame: frame.frame,
      wall_cycles: frame.wall_cycles,
      physical_headroom: frame.physical_headroom,
    })),
    limitations: [
      "This is exact emulated ANTIC master-clock timing for Atari800 7.1.2, not an electrical measurement from a physical 65XE.",
      "The bounded deterministic replay is reproducible coverage, not a proof over every possible joystick history.",
      "Atari800 host-frame boundaries occur at the PAL frame wrap; the gameplay scheduler synchronises at VCOUNT $70, so missed_frames is derived from the exact next start host-frame ID.",
      "The release enables DLI NMI ($80), not OS VBI NMI ($40); enabling OS VBI would change the accepted production runtime.",
    ],
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Measured DMA-on maximum: ${report.semantics.measured_wall_cycles_dma_on} cycles`);
  console.log(`Measured physical headroom: ${report.semantics.measured_physical_headroom} cycles`);
  console.log(`Deadline overruns: ${report.gate.deadline_overrun_frames}; ` +
    `missed frames: ${report.gate.missed_frames}`);
  console.log(`Report: ${path.relative(rootDirectory, reportPath)}`);
  if (!report.gate.passed) process.exitCode = 1;
}

main();
