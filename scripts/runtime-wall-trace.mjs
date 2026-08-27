import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { parseViceLabels } from "./runtime-cycles.mjs";
import { LOADER_DISPLAY_LIST_ADDRESS } from "./loader-assets.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const buildDirectory = path.join(rootDirectory, "build", "runtime-wall-trace");
const reportPath = path.join(rootDirectory, "docs", "runtime-wall-trace.json");
const headerPath = path.join(scriptDirectory, "atari800-wall-trace.h");
const PAL_FRAME_CYCLES = 35_568;
const HISTORICAL_PHYSICAL_GATE_CYCLES = 31_568;
const ENTITY_EFFECTS_BASELINE_WALL_CYCLES = 31_440;
const ENTITY_EFFECTS_BASELINE_HEADROOM_CYCLES = 4_128;
const ENTITY_EFFECTS_APPROVED_DELTA_CYCLES = 600;
const ENTITY_EFFECTS_FEATURE_GATE_CYCLES = 32_040;
const DEBRIS_VISUAL_POLISH_BASELINE_WALL_CYCLES = 32_025;
const DEBRIS_VISUAL_POLISH_BASELINE_HEADROOM_CYCLES = 3_543;
const DEBRIS_VISUAL_POLISH_APPROVED_DELTA_CYCLES = 256;
const DEBRIS_VISUAL_POLISH_FEATURE_GATE_CYCLES = 32_281;
const DEBRIS_VISUAL_POLISH_ACCEPTED_WALL_CYCLES = 32_081;
const DEBRIS_VISUAL_POLISH_ACCEPTED_HEADROOM_CYCLES = 3_487;
const EXPLOSION_FLASH_BASELINE_WALL_CYCLES = 32_081;
const EXPLOSION_FLASH_BASELINE_HEADROOM_CYCLES = 3_487;
const EXPLOSION_FLASH_APPROVED_DELTA_CYCLES = 64;
const EXPLOSION_FLASH_FEATURE_GATE_CYCLES = 32_145;
const EXPLOSION_FLASH_ABSOLUTE_MINIMUM_HEADROOM_CYCLES = 3_200;
const EXPLOSION_FLASH_ACCEPTED_WALL_CYCLES = 32_122;
const EXPLOSION_FLASH_ACCEPTED_HEADROOM_CYCLES = 3_446;
const DESTRUCTIBLE_DEBRIS_BASELINE_WALL_CYCLES = 32_122;
const DESTRUCTIBLE_DEBRIS_BASELINE_HEADROOM_CYCLES = 3_446;
const DESTRUCTIBLE_DEBRIS_TARGET_DELTA_CYCLES = 640;
const DESTRUCTIBLE_DEBRIS_HARD_DELTA_CYCLES = 768;
const DESTRUCTIBLE_DEBRIS_TARGET_GATE_CYCLES = 32_762;
const DESTRUCTIBLE_DEBRIS_HARD_GATE_CYCLES = 32_890;
const DESTRUCTIBLE_DEBRIS_MINIMUM_HEADROOM_CYCLES = 2_800;
const ENEMY_BREAKUP_BASELINE_WALL_CYCLES = 32_719;
const ENEMY_BREAKUP_BASELINE_HEADROOM_CYCLES = 2_849;
const ENEMY_BREAKUP_TARGET_DELTA_CYCLES = 128;
const ENEMY_BREAKUP_HARD_DELTA_CYCLES = 224;
const ENEMY_BREAKUP_TARGET_GATE_CYCLES = 32_847;
const ENEMY_BREAKUP_HARD_GATE_CYCLES = 32_943;
const ENEMY_BREAKUP_MINIMUM_HEADROOM_CYCLES = 2_600;
const WEAPON_PICKUP_BASELINE_WALL_CYCLES = 32_869;
const WEAPON_PICKUP_BASELINE_HEADROOM_CYCLES = 2_699;
const WEAPON_PICKUP_TARGET_DELTA_CYCLES = 128;
const WEAPON_PICKUP_HARD_DELTA_CYCLES = 256;
const WEAPON_PICKUP_TARGET_GATE_CYCLES = 32_997;
const WEAPON_PICKUP_HARD_GATE_CYCLES = 33_125;
const WEAPON_PICKUP_MINIMUM_HEADROOM_CYCLES = 2_400;
const SPREAD_SHOT_BASELINE_WALL_CYCLES = 32_956;
const SPREAD_SHOT_BASELINE_HEADROOM_CYCLES = 2_612;
const SPREAD_SHOT_TARGET_DELTA_CYCLES = 256;
const SPREAD_SHOT_HARD_DELTA_CYCLES = 384;
const SPREAD_SHOT_TARGET_GATE_CYCLES = 33_212;
const SPREAD_SHOT_HARD_GATE_CYCLES = 33_340;
const SPREAD_SHOT_MINIMUM_HEADROOM_CYCLES = 2_200;
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

const cadenceSessions = [0, 1, 2].map((difficulty) => ({
  id: `cadence-${difficulty}-sweep-fire4`,
  difficulty,
  policy: "sweep",
  fireDelay: 4,
  frames: 400,
  kind: "parallax-cadence",
}));

const fighterFlashSessions = [{
  id: "flash-2-neutral-nofire",
  difficulty: 2,
  policy: "neutral",
  fireDelay: 4_000,
  frames: 1_600,
  kind: "fighter-flash-coverage",
}];

const debrisEffectsSessions = [{
  id: "debris-effects-2-sweep-fire4",
  difficulty: 2,
  policy: "sweep",
  fireDelay: 4,
  frames: 1_200,
  kind: "debris-effects-coverage",
}];

const weaponPickupSessions = [{
  id: "weapon-pickup-2-hunt-fire4",
  difficulty: 2,
  policy: "hunt",
  fireDelay: 4,
  frames: 3_200,
  kind: "weapon-pickup-coverage",
}];

const memoryIntegritySessions = ["XEX", "ATR"].flatMap((medium) =>
  ["evasive", "hunt"].map((policy) => ({
    id: `memory-integrity-${medium.toLowerCase()}-2-${policy}-fire4`,
    medium,
    difficulty: 2,
    policy,
    fireDelay: 4,
    frames: 3_000,
    kind: "memory-integrity-120s",
    pauseTest: policy === "hunt",
  })));

const engineDiagnosticSessions = ["XEX", "ATR"].flatMap((medium) =>
  [0xa5, 0x5a].flatMap((coldFill) => [0, 1, 2].flatMap((difficulty) =>
    [["immediate", 0], ["delayed", 800]].map(([startMode, frontendDelay]) => ({
      id: `engine-${medium.toLowerCase()}-${coldFill.toString(16)}-${difficulty}-${startMode}`,
      medium,
      coldFill,
      difficulty,
      policy: "neutral",
      fireDelay: 4_000,
      frames: 150,
      kind: "engine-first-150",
      frontendDelay,
    })))));

const engineRestartSessions = ["XEX", "ATR"].map((medium) => ({
  id: `engine-restart-${medium.toLowerCase()}-a5`,
  medium,
  coldFill: 0xa5,
  difficulty: 2,
  policy: "restart",
  fireDelay: 4_000,
  frames: 3_200,
  kind: "engine-restart-after-game-over",
  engineScreenshotGeneration: 2,
}));

const traceLabels = {
  DFTRACE_PC_ACTIVE: "main_loop_option_poll",
  DFTRACE_PC_END: "main_loop",
  DFTRACE_PC_FRONTEND_POLL: "frontend_input_poll",
  DFTRACE_PC_DLI: "gameplay_dli",
  DFTRACE_PC_WORLD: "advance_starfield_layers",
  DFTRACE_PC_NEAR: "scroll_world_columns",
  DFTRACE_PC_FAR_ERASE: "erase_far_star_overlays",
  DFTRACE_PC_FAR_STEP: "advance_far_stars",
  DFTRACE_PC_HULL: "scroll_hull_columns",
  DFTRACE_PC_BROADSIDE: "update_broadside",
  DFTRACE_PC_FIGHTER_EXPLOSION: "render_shared_fighter_explosions",
  DFTRACE_PC_CAPITAL_EXPLOSION: "render_capital_explosions",
  DFTRACE_PC_MUSIC_TICK: "music_tick_gameplay",
  DFTRACE_PC_ENTITY_SPAWN: "entity_spawn_debris",
  DFTRACE_PC_ENTITY_CONTACT: "entity_damage_applied",
  DFTRACE_PC_ENTITY_DESPAWN: "entity_despawn_debris",
  DFTRACE_PC_ENTITY_SHOT: "entity_debris_shot",
  DFTRACE_PC_EFFECT_SPAWN: "spawn_debris_destruction_effects",
  DFTRACE_PC_EFFECT_ERASE: "erase_transient_effect_overlays",
  DFTRACE_PC_EFFECT_UPDATE: "update_transient_effects",
  DFTRACE_PC_EFFECT_RENDER: "render_transient_effect_overlays",
  DFTRACE_PC_RAIDER_BREAKUP_SPAWN: "materialize_raider_breakup_effects",
  DFTRACE_PC_PICKUP_QUALIFIED_KILL: "weapon_pickup_record_qualified_kill",
  DFTRACE_PC_PICKUP_COLLECT: "weapon_pickup_collect",
  DFTRACE_PC_ENTITY_ERASE: "erase_weapon_pickup_overlay_restore",
  DFTRACE_PC_AFTER_ENTITY_ERASE: "weapon_pickup_erase_done",
  DFTRACE_PC_ENTITY_DRAW: "render_weapon_pickup_overlay",
  DFTRACE_PC_ENGINE_UPDATE: "update_engine_animation",
  DFTRACE_PC_ENGINE_COPY: "copy_engine_animation_phase",
  DFTRACE_PC_GAMEPLAY_INIT: "start_gameplay",
  DFTRACE_PC_ROTATE_START: "rotate_playfield_rows",
  DFTRACE_PC_ROTATE_END: "rotate_playfield_table_shift",
  DFTRACE_DLI_PHASE: "loader_dli_phase",
  DFTRACE_PLAYER_X: "player_x",
  DFTRACE_PLAYER_Y: "player_y",
  DFTRACE_PROJECTILE_ACTIVE: "FIGHTER_PROJECTILE_ACTIVE",
  DFTRACE_PROJECTILE_RENDERED: "FIGHTER_PROJECTILE_RENDERED",
  DFTRACE_PROJECTILE_SCREEN_LO: "FIGHTER_PROJECTILE_SCREEN_LO",
  DFTRACE_PROJECTILE_SCREEN_HI: "FIGHTER_PROJECTILE_SCREEN_HI",
  DFTRACE_PROJECTILE_BACKING_TOP: "FIGHTER_PROJECTILE_BACKUP_TOP",
  DFTRACE_BROAD_STATE: "BROAD_STATE",
  DFTRACE_FAR_ACTIVE: "STAR_FAR_ACTIVE",
  DFTRACE_ENEMY_ACTIVE: "ENEMY_ACTIVE",
  DFTRACE_ENEMY_X: "enemy_x",
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
  DFTRACE_ENTITY_ACTIVE_COUNT: "ENTITY_ACTIVE_COUNT",
  DFTRACE_ENTITY_X: "ENTITY_X",
  DFTRACE_ENTITY_Y: "ENTITY_Y",
  DFTRACE_ENTITY_VX: "ENTITY_VX",
  DFTRACE_ENTITY_VY: "ENTITY_VY",
  DFTRACE_ENTITY_MOVE_ACCUMULATOR: "ENTITY_MOVE_ACCUMULATOR",
  DFTRACE_ENTITY_VERTICAL_ACCUMULATOR: "ENTITY_TIMER",
  DFTRACE_ENTITY_RENDER_ID: "ENTITY_RENDER_ID",
  DFTRACE_ENTITY_ACTIVE_MASK: "ENTITY_ACTIVE_MASK",
  DFTRACE_ENTITY_STATE: "ENTITY_STATE",
  DFTRACE_ENTITY_HP: "ENTITY_HP",
  DFTRACE_ENTITY_TIMER: "ENTITY_TIMER",
  DFTRACE_ENTITY_OWNER: "ENTITY_OWNER",
  DFTRACE_ENTITY_DRAWN_MASK: "ENTITY_DRAWN_MASK",
  DFTRACE_ENTITY_SCREEN_LO: "ENTITY_SCREEN_LO",
  DFTRACE_ENTITY_SCREEN_HI: "ENTITY_SCREEN_HI",
  DFTRACE_ENTITY_BACKING0: "ENTITY_BACKING0",
  DFTRACE_ENTITY_BACKING1: "ENTITY_BACKING1",
  DFTRACE_ENTITY_BACKING2: "ENTITY_BACKING2",
  DFTRACE_ENTITY_BACKING3: "ENTITY_BACKING3",
  DFTRACE_PLAYFIELD_ROW_LO: "PLAYFIELD_ROW_LO",
  DFTRACE_PLAYFIELD_ROW_HI: "PLAYFIELD_ROW_HI",
  DFTRACE_SCORE_LO: "score_bcd_lo",
  DFTRACE_SCORE_HI: "score_bcd_hi",
  DFTRACE_EFFECT_ACTIVE_MASK: "EFFECT_ACTIVE_MASK",
  DFTRACE_EFFECT_ACTIVE_COUNT: "EFFECT_ACTIVE_COUNT",
  DFTRACE_EFFECT_RENDERED_MASK: "EFFECT_RENDERED_MASK",
  DFTRACE_CORRIDOR_PHASE: "corridor_phase",
  DFTRACE_RING_FLAGS: "PLAYFIELD_RING_FLAGS",
  DFTRACE_ACTIVE_DLIST_LO: "PLAYFIELD_ACTIVE_DLIST_LO",
  DFTRACE_NEXT_DLIST_LO: "PLAYFIELD_NEXT_DLIST_LO",
};

const bootTraceLabels = {
  DFBOOT_PC_START: "start",
  DFBOOT_PC_LOADER: "show_loader",
  DFBOOT_PC_MENU: "enter_main_menu",
  DFBOOT_PC_FRONTEND: "frontend_input_poll",
  DFBOOT_PC_GAMEPLAY: "start_gameplay",
  DFBOOT_PC_MAIN: "main_loop",
  DFBOOT_LOADER_TIMER: "loader_frame_count",
  DFBOOT_GAME_STATE: "game_state",
  DFBOOT_MAIN_MENU_DLIST: "main_menu_display_list",
  DFBOOT_FRONTEND_DLIST_END: "frontend_display_lists_end",
};

const numericCsvFields = new Set([
  "frame", "start_clock", "end_clock", "next_start_clock", "wall_cycles",
  "start_host_frame", "end_host_frame", "next_start_host_frame", "start_scanline",
  "start_cycle", "end_scanline", "end_cycle", "host_vbi_boundaries",
  "extra_vbi_boundaries", "missed_frames", "dli_nmis", "dma_ctl", "nmi_en",
  "projectiles", "broadside", "far_rendered", "live_raider", "fighter_explosion",
  "capital_explosion", "music_active", "fire_sfx", "hit_sfx", "capital_sfx",
  "sound_enabled", "player_lifecycle", "sector_state", "gameplay_frame",
  "difficulty", "active_muzzles", "entity_active", "entity_x", "entity_y",
  "entity_vx", "entity_move_accumulator", "entity_vertical_accumulator",
  "entity_render_id", "events",
  "colbk", "colpm0", "colpm1", "colpm2", "colpm3", "colpf0", "colpf1",
  "colpf2", "colpf3", "viper_explosion_timer", "enemy_explosion_timer",
  "effect_active_mask", "effect_active_count", "effect_rendered_mask",
  "entity_active_mask", "pickup_state", "pickup_booster_state", "pickup_counter", "pickup_x", "pickup_y",
  "pickup_timer_lo", "pickup_timer_hi", "pickup_animation", "pickup_render_id",
  "pickup_drawn_mask", "score_lo", "score_hi", "rapid_projectiles",
  "viper_projectiles",
  "rapid_projectile_slot", "rapid_projectile_address", "rapid_projectile_screen_code",
  "rapid_projectile_backing", "dli_sequence_violations",
  "maximum_dlis_per_host_frame", "pause_test_completed", "pause_timer_before",
  "pause_timer_after", "pause_engine_timer_before", "pause_engine_timer_after",
  "pause_engine_phase_before", "pause_engine_phase_after", "pause_host_frames",
]);
for (const name of [
  "pickup_prev_x", "pickup_prev_y", "pickup_prev_render_row",
  "pickup_prev_render_phase", "pickup_render_row", "pickup_render_phase",
  "pickup_vscroll", "pickup_a2_head", "pickup_erase_calls", "pickup_draw_calls",
  "pickup_erase_scanline", "pickup_erase_cycle", "pickup_draw_scanline",
  "pickup_draw_cycle",
  "pickup_glyph_cells_before", "pickup_glyph_cells_after",
  "pickup_footprints_before", "pickup_footprints_after",
  "pickup_first_overwrite_pc", "pickup_first_overwrite_address",
  "pickup_first_overwrite_value", "pickup_first_overwrite_scanline",
  "engine_timer", "engine_phase", "corridor_phase", "ring_flags",
  "engine_vscroll", "engine_a2_head", "engine_allied_cells",
  "engine_enemy_cells", "engine_copy_calls", "engine_copy_scanline",
  "engine_copy_cycle", "engine_first_write_pc", "engine_first_write_address",
  "engine_first_write_old", "engine_first_write_new",
  "engine_first_write_scanline", "engine_first_write_cycle",
  "engine_charset_hash",
  "engine_displayed_dlist_lo", "engine_published_dlist_lo",
  "engine_active_dlist_lo", "engine_next_dlist_lo", "engine_row0_address",
  "engine_displayed_row0_address", "engine_active_row0_address",
  "engine_first_dlist_write_pc", "engine_first_dlist_write_address",
  "engine_first_dlist_write_old", "engine_first_dlist_write_new",
  "engine_first_dlist_write_scanline", "engine_first_dlist_write_cycle",
  "engine_first_recycled_write_pc", "engine_first_recycled_write_address",
  "engine_first_recycled_write_old", "engine_first_recycled_write_new",
  "engine_first_recycled_write_scanline", "engine_first_recycled_write_cycle",
  "engine_playfield_select_calls", "engine_playfield_select_scanline",
  "engine_playfield_select_cycle", "engine_playfield_select_dlist",
  "engine_playfield_select_active_lo", "gameplay_generation",
]) numericCsvFields.add(name);
for (const prefix of ["engine_divider", "engine_recycled"]) {
  for (let index = 0; index < 8; ++index) numericCsvFields.add(`${prefix}${index}`);
}
for (const prefix of [
  "pickup_old_address", "pickup_old_backing", "pickup_old_before_erase",
  "pickup_old_after_erase", "pickup_new_address", "pickup_new_backing",
  "pickup_new_after_draw",
]) {
  for (let index = 0; index < 4; ++index) numericCsvFields.add(`${prefix}${index}`);
}
let cpuReferenceByFrame = new Map();

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC32_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) crc = CRC32_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return chunk;
}

function decodeAtari800Screenshot(bytes) {
  invariant(bytes.subarray(0, 8).equals(PNG_SIGNATURE), "Atari800 screenshot is not PNG");
  let offset = 8;
  let header;
  let palette;
  const data = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") header = chunk;
    else if (type === "PLTE") palette = chunk;
    else if (type === "IDAT") data.push(chunk);
    offset += length + 12;
    if (type === "IEND") break;
  }
  invariant(header?.[8] === 8 && header?.[9] === 3 && header?.[12] === 0 && palette,
    "Atari800 screenshot must be non-interlaced eight-bit indexed PNG");
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const raw = zlib.inflateSync(Buffer.concat(data));
  invariant(raw.length === (width + 1) * height, "Atari800 screenshot has invalid rows");
  const indices = Buffer.alloc(width * height);
  const paeth = (left, above, upperLeft) => {
    const prediction = left + above - upperLeft;
    const dl = Math.abs(prediction - left);
    const da = Math.abs(prediction - above);
    const du = Math.abs(prediction - upperLeft);
    return dl <= da && dl <= du ? left : da <= du ? above : upperLeft;
  };
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (width + 1)];
    for (let x = 0; x < width; x += 1) {
      const encoded = raw[y * (width + 1) + x + 1];
      const left = x > 0 ? indices[y * width + x - 1] : 0;
      const above = y > 0 ? indices[(y - 1) * width + x] : 0;
      const upperLeft = x > 0 && y > 0 ? indices[(y - 1) * width + x - 1] : 0;
      const predictor = [0, left, above, Math.floor((left + above) / 2),
        paeth(left, above, upperLeft)][filter];
      invariant(predictor !== undefined, `Unsupported Atari800 PNG filter ${filter}`);
      indices[y * width + x] = (encoded + predictor) & 0xff;
    }
  }
  const rgb = Buffer.alloc(width * height * 3);
  for (let index = 0; index < indices.length; index += 1) {
    const paletteOffset = indices[index] * 3;
    rgb[index * 3] = palette[paletteOffset];
    rgb[index * 3 + 1] = palette[paletteOffset + 1];
    rgb[index * 3 + 2] = palette[paletteOffset + 2];
  }
  return { width, height, rgb };
}

function encodeRgbPng(rgb, width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const stride = width * 3;
  const rows = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    rgb.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function writeScreenshotContact(paths, outputPath, columns) {
  const frames = paths.map((framePath) =>
    decodeAtari800Screenshot(fs.readFileSync(framePath)));
  invariant(frames.length > 0 && frames.every(({ width, height }) =>
    width === frames[0].width && height === frames[0].height),
  "Contact sheet screenshots must share exact dimensions");
  const rows = Math.ceil(frames.length / columns);
  const width = frames[0].width * columns;
  const height = frames[0].height * rows;
  const rgb = Buffer.alloc(width * height * 3);
  frames.forEach((frame, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    for (let y = 0; y < frame.height; y += 1) {
      frame.rgb.copy(rgb,
        ((row * frame.height + y) * width + column * frame.width) * 3,
        y * frame.width * 3, (y + 1) * frame.width * 3);
    }
  });
  const png = encodeRgbPng(rgb, width, height);
  fs.writeFileSync(outputPath, png);
  return {
    path: path.relative(rootDirectory, outputPath),
    frames: frames.length,
    columns,
    width,
    height,
    bytes: png.length,
    sha256: sha256(png),
  };
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
    [1 << 7, "debris-spawn"],
    [1 << 8, "debris-contact"],
    [1 << 9, "debris-despawn"],
    [1 << 10, "near-copy"],
    [1 << 11, "far-step"],
    [1 << 12, "debris-shot"],
    [1 << 13, "debris-destruction-spawn"],
    [1 << 14, "effect-erase"],
    [1 << 15, "effect-update"],
    [1 << 16, "effect-render"],
    [1 << 17, "raider-breakup-spawn"],
    [1 << 18, "pickup-qualified-kill"],
    [1 << 19, "pickup-collect"],
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
      entity_active: row.entity_active,
      entity_x: row.entity_x,
      entity_y: row.entity_y,
      entity_vx_signed: row.entity_vx < 0x80 ? row.entity_vx : row.entity_vx - 0x100,
      entity_move_accumulator: row.entity_move_accumulator,
      entity_vertical_accumulator: row.entity_vertical_accumulator,
      entity_render_id: row.entity_render_id,
      entity_active_mask: row.entity_active_mask,
      weapon_pickup: {
        state: row.pickup_state,
        booster_state: row.pickup_booster_state,
        qualified_kill_counter: row.pickup_counter,
        x: row.pickup_x,
        y: row.pickup_y,
        timer: row.pickup_timer_lo | row.pickup_timer_hi << 8,
        timer_low: row.pickup_timer_lo,
        timer_high: row.pickup_timer_hi,
        animation_frame: row.pickup_animation,
        render_id: row.pickup_render_id,
        drawn_mask: row.pickup_drawn_mask,
      },
      viper_projectiles: row.viper_projectiles,
      rapid_viper_projectiles: row.rapid_projectiles,
      score_bcd: [row.score_hi, row.score_lo],
      effect_active_mask: row.effect_active_mask,
      effect_active_count: row.effect_active_count,
      effect_rendered_mask: row.effect_rendered_mask,
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
    medium: session.medium ?? "XEX",
    difficulty: session.difficulty,
    policy: session.policy,
    fire_delay: session.fireDelay,
    measured_frames: rows.length,
    maximum_wall_cycles: maximum.wall_cycles,
    deadline_overrun_frames: rows.filter((row) => row.missed_frames > 0).length,
    missed_frames: rows.reduce((sum, row) => sum + row.missed_frames, 0),
  };
}

function runBootSmoke({ emulatorPath, labels, xexPath, atrPath }) {
  const outputDirectory = path.join(buildDirectory, "boot-smoke");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const addressEnvironment = {};
  for (const [environmentName, labelName] of Object.entries(bootTraceLabels)) {
    const address = labels.get(labelName);
    invariant(Number.isInteger(address), `Boot-smoke label ${labelName} is missing`);
    addressEnvironment[environmentName] = `0x${address.toString(16)}`;
  }
  const expected = {
    start: labels.get("start"),
    loader_dlist: LOADER_DISPLAY_LIST_ADDRESS,
    main_menu_dlist: labels.get("main_menu_display_list"),
    playfield_dlist_a: labels.get("PLAYFIELD_DLIST_A"),
    playfield_dlist_b: labels.get("PLAYFIELD_DLIST_B"),
    playfield_dlist_bytes: 75,
    loader_dli: labels.get("loader_dli"),
    frontend_dli: labels.get("frontend_hint_dli"),
    gameplay_dli: labels.get("gameplay_dli"),
  };
  invariant(Object.values(expected).every(Number.isInteger),
    "Boot-smoke expected-address labels are incomplete");

  const definitions = [];
  for (const artifact of [
    { id: "xex", path: xexPath, arguments: ["-run", xexPath] },
    { id: "atr", path: atrPath, arguments: [atrPath] },
  ]) {
    for (const fill of [0xa5, 0x5a]) {
      definitions.push({ ...artifact, fill, id: `${artifact.id}-${fill.toString(16)}` });
    }
  }

  const sessions = definitions.map((definition) => {
    const outputPath = path.join(outputDirectory, `${definition.id}.json`);
    const screenshotPrefix = path.join(outputDirectory, definition.id);
    run(emulatorPath, [
      "-xe", "-pal", "-nobasic", "-nosound", "-turbo", "-no-video-accel", "-no-vsync",
      ...definition.arguments,
    ], {
      env: {
        ...process.env,
        SDL_VIDEODRIVER: process.env.SDL_VIDEODRIVER ?? "dummy",
        ...addressEnvironment,
        DFBOOT_OUTPUT: outputPath,
        DFBOOT_ARTIFACT: definition.id,
        DFBOOT_RAM_FILL: String(definition.fill),
        DFBOOT_SCREENSHOT_PREFIX: screenshotPrefix,
      },
    });
    const result = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    invariant(result.artifact === definition.id && result.cold_ram_fill === definition.fill,
      `${definition.id} boot-smoke identity differs from its invocation`);
    invariant(result.snapshots.map(({ frame }) => frame).join(",") === "1,250,300,500,750",
      `${definition.id} did not capture all five required PAL frames`);
    const byFrame = new Map(result.snapshots.map((snapshot) => [snapshot.frame, snapshot]));
    const loader250 = byFrame.get(250);
    const loader300 = byFrame.get(300);
    const menu = byFrame.get(500);
    const gameplay = byFrame.get(750);
    for (const snapshot of [loader250, loader300]) {
      invariant(snapshot.game_state === 0 && snapshot.dlist === expected.loader_dlist &&
        snapshot.charset_address === 0xe000 && snapshot.dma_ctl === 0x22 &&
        snapshot.nmi_en === 0x80 && snapshot.vdslst === expected.loader_dli,
      `${definition.id} loader display/VBI state is invalid at frame ${snapshot.frame}`);
    }
    invariant(loader250.loader_timer > loader300.loader_timer && loader300.loader_timer > 0,
      `${definition.id} loader countdown did not advance between frames 250 and 300`);
    invariant(menu.loader_timer === 0 && menu.game_state === 1 &&
      menu.dlist === expected.main_menu_dlist && menu.charset_address === 0x4800 &&
      menu.pm_base === 0x3800 && menu.dma_ctl === 0x3a && menu.nmi_en === 0x80 &&
      menu.vdslst === expected.frontend_dli,
    `${definition.id} did not reach a valid visible main menu by frame 500`);
    invariant(gameplay.game_state === 6 && gameplay.charset_address === 0x5000 &&
      gameplay.pm_base === 0x3800 && gameplay.dma_ctl === 0x3e &&
      gameplay.nmi_en === 0x80 && gameplay.vdslst === expected.gameplay_dli &&
      gameplay.dlist >= expected.playfield_dlist_a &&
      gameplay.dlist < expected.playfield_dlist_b + expected.playfield_dlist_bytes,
    `${definition.id} did not reach the legal gameplay display/VBI path by frame 750`);
    const milestones = result.milestones;
    invariant(Object.values(milestones).every((frame) => frame !== 0xffffffff) &&
      milestones.start < milestones.loader && milestones.loader < milestones.menu &&
      milestones.menu <= milestones.frontend_poll &&
      milestones.frontend_poll < milestones.gameplay_init &&
      milestones.gameplay_init <= milestones.main_loop && milestones.main_loop < 750,
    `${definition.id} did not execute the complete loader-to-gameplay handoff`);
    if (definition.id.startsWith("xex")) {
      invariant(menu.runad === expected.start,
        `${definition.id} XEX RUNAD does not point at the game entry`);
    } else {
      invariant(menu.dosvec === expected.start,
        `${definition.id} ATR DOSVEC does not point at the game entry`);
    }
    const screenshots = [1, 250, 300, 500, 750].map((frame) => {
      const screenshotPath = `${screenshotPrefix}-frame${String(frame).padStart(3, "0")}.png`;
      invariant(fs.existsSync(screenshotPath),
        `${definition.id} screenshot is missing for frame ${frame}`);
      const bytes = fs.readFileSync(screenshotPath);
      return {
        frame,
        path: path.relative(rootDirectory, screenshotPath),
        bytes: bytes.length,
        sha256: sha256(bytes),
      };
    });
    return {
      id: definition.id,
      medium: definition.id.startsWith("xex") ? "XEX" : "ATR",
      cold_ram_fill: definition.fill,
      artifact: {
        path: path.relative(rootDirectory, definition.path),
        bytes: fs.statSync(definition.path).size,
        sha256: sha256(fs.readFileSync(definition.path)),
      },
      snapshots: result.snapshots,
      milestones,
      screenshots,
      passed: true,
    };
  });

  const gameplayScreenshots = sessions.map((session) =>
    session.screenshots.find(({ frame }) => frame === 750).sha256);
  invariant(new Set(gameplayScreenshots).size === 1,
    "XEX/ATR or cold-RAM fills produced different frame-750 gameplay images");
  const menuScreenshots = sessions.map((session) =>
    session.screenshots.find(({ frame }) => frame === 500).sha256);
  invariant(new Set(menuScreenshots).size === 1,
    "XEX/ATR or cold-RAM fills produced different frame-500 main-menu images");

  const evidence = {
    emulator: "Atari800 7.1.2 PAL/XL",
    frames_observed: 750,
    duration_seconds_pal: 15,
    guest_instrumentation_bytes: 0,
    cold_ram_range: "$8000-$9FFF",
    input: "production joystick path; FIRE pressed on host frames 501-506",
    expected_addresses: expected,
    sessions,
    xex_atr_frame_500_parity_sha256: menuScreenshots[0],
    xex_atr_frame_750_parity_sha256: gameplayScreenshots[0],
    passed: sessions.every(({ passed }) => passed),
  };
  fs.writeFileSync(path.join(outputDirectory, "report.json"),
    `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

function main() {
  const sourceDirectory = path.resolve(argumentValue("atari800-source") ??
    process.env.ATARI800_TRACE_SOURCE ?? "/tmp/atari800-7.1.2");
  const shouldPrepare = process.argv.includes("--prepare");
  const bootSmokeOnly = process.argv.includes("--boot-smoke-only");
  const smokeFramesArgument = argumentValue("smoke-frames");
  const smokeFrames = smokeFramesArgument === undefined ? null : Number(smokeFramesArgument);
  const onlySession = argumentValue("only-session");
  invariant(smokeFrames === null || Number.isInteger(smokeFrames) && smokeFrames > 0,
    "--smoke-frames must be a positive integer");
  if (shouldPrepare) prepareAtari800(sourceDirectory);

  const emulatorPath = path.join(sourceDirectory, "src", "atari800");
  invariant(fs.existsSync(emulatorPath),
    `Instrumented Atari800 is missing: ${emulatorPath}; rerun with --prepare`);
  const labelPath = path.join(rootDirectory, "build", "dark-fighter.lbl");
  const manifestPath = path.join(rootDirectory, "dist", "dark-fighter-manifest.json");
  const xexPath = path.join(rootDirectory, "dist", "dark-fighter.xex");
  const atrPath = path.join(rootDirectory, "dist", "dark-fighter.atr");
  for (const requiredPath of [labelPath, manifestPath, xexPath, atrPath]) {
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
  const capitalSoundTimer = labels.get("CAPITAL_EXPLOSION_SOUND_TIMER");
  invariant(Number.isInteger(capitalSoundTimer),
    "Trace label CAPITAL_EXPLOSION_SOUND_TIMER is missing");
  addressEnvironment.DFTRACE_ENGINE_TIMER = `0x${(capitalSoundTimer + 1).toString(16)}`;
  addressEnvironment.DFTRACE_ENGINE_PHASE = `0x${(capitalSoundTimer + 2).toString(16)}`;

  fs.mkdirSync(buildDirectory, { recursive: true });
  const bootSmoke = runBootSmoke({ emulatorPath, labels, xexPath, atrPath });
  console.log(`Boot smoke: ${bootSmoke.sessions.length} XEX/ATR cold-start sessions passed`);
  if (bootSmokeOnly) {
    console.log(`Report: ${path.relative(rootDirectory,
      path.join(buildDirectory, "boot-smoke", "report.json"))}`);
    return;
  }
  const allRows = [];
  const summaries = [];
  const pickupScreenshotPath = path.join(buildDirectory, "weapon-pickup-static-atari800.png");
  const rapidScreenshotPath = path.join(buildDirectory,
    "weapon-pickup-rapid-projectiles-atari800.png");
  const spreadScreenshotPath = path.join(buildDirectory,
    "weapon-pickup-spread-projectiles-atari800.png");
  const pickupSequencePrefix = path.join(buildDirectory, "weapon-pickup-frame");
  if (fs.existsSync(pickupScreenshotPath)) fs.unlinkSync(pickupScreenshotPath);
  if (fs.existsSync(rapidScreenshotPath)) fs.unlinkSync(rapidScreenshotPath);
  if (fs.existsSync(spreadScreenshotPath)) fs.unlinkSync(spreadScreenshotPath);
  for (let index = 0; index < 16; ++index) {
    const framePath = `${pickupSequencePrefix}-${index.toString().padStart(2, "0")}.png`;
    if (fs.existsSync(framePath)) fs.unlinkSync(framePath);
  }
  let sessionsToRun = smokeFrames === null
    ? [...baselineSessions, ...targetedSessions, ...cadenceSessions, ...fighterFlashSessions,
      ...debrisEffectsSessions, ...weaponPickupSessions, ...memoryIntegritySessions]
      .concat(engineDiagnosticSessions, engineRestartSessions)
    : [{ ...baselineSessions[0], id: "observer-smoke", kind: "observer-smoke", frames: smokeFrames }];
  if (onlySession !== undefined) {
    sessionsToRun = sessionsToRun.filter(({ id }) => id === onlySession);
    invariant(sessionsToRun.length === 1, `Unknown trace session: ${onlySession}`);
  }
  for (const session of sessionsToRun) {
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
	  ...(session.coldFill === undefined ? {} : { DFTRACE_RAM_FILL: String(session.coldFill) }),
	  ...(session.frontendDelay === undefined ? {} : {
	    DFTRACE_FRONTEND_DELAY: String(session.frontendDelay),
	  }),
      ...(session.pauseTest ? { DFTRACE_PAUSE_TEST: "1" } : {}),
      ...(session.kind === "weapon-pickup-coverage" ? {
        DFTRACE_PICKUP_SCREENSHOT: pickupScreenshotPath,
        DFTRACE_PICKUP_SEQUENCE_PREFIX: pickupSequencePrefix,
        DFTRACE_RAPID_SCREENSHOT: rapidScreenshotPath,
        DFTRACE_SPREAD_SCREENSHOT: spreadScreenshotPath,
      } : {}),
	  ...(session.kind === "engine-first-150" ? {
	    DFTRACE_ENGINE_SCREENSHOT_PREFIX: path.join(buildDirectory, session.id),
	  } : {}),
	  ...(session.kind === "engine-restart-after-game-over" ? {
	    DFTRACE_ENGINE_SCREENSHOT_PREFIX: path.join(buildDirectory, session.id),
	    DFTRACE_ENGINE_SCREENSHOT_GENERATION: String(session.engineScreenshotGeneration),
	  } : {}),
    };
    const artifactArguments = session.medium === "ATR" ? [atrPath] : ["-run", xexPath];
    run(emulatorPath, [
      "-xe", "-pal", "-nobasic", "-nosound", "-turbo", "-no-video-accel", "-no-vsync",
      ...artifactArguments,
    ], { env: environment });
    const rows = parseCsv(fs.readFileSync(outputPath, "utf8"), session);
    allRows.push(...rows);
    summaries.push(sessionSummary(session, rows));
    console.log(`${session.id}: ${rows.length} frames, max ` +
      `${maximumRow(rows, (row) => row.wall_cycles).wall_cycles} wall cycles`);
  }
  if (smokeFrames === null && sessionsToRun.some(({ kind }) => kind === "weapon-pickup-coverage")) {
    invariant(fs.existsSync(pickupScreenshotPath),
      "Atari800 did not render a visible Rapid Fire capsule during the pickup replay");
    invariant(fs.existsSync(rapidScreenshotPath),
      "Atari800 did not render a yellow Rapid Fire Viper projectile during the pickup replay");
    invariant(fs.existsSync(spreadScreenshotPath),
      "Atari800 did not render a three-projectile Spread Shot fan during the pickup replay");
  }
  if (smokeFrames !== null) {
    console.log(`Observer smoke completed: ${smokeFrames} gameplay frames`);
    return;
  }
  if (onlySession !== undefined) {
    console.log(`Focused trace completed: ${onlySession}`);
    return;
  }

  const baselineRows = allRows.filter((row) => row.trace_kind === "baseline-9040");
  const targetedRows = allRows.filter((row) => row.trace_kind === "targeted-heavy-coincidence");
  const cadenceRows = allRows.filter((row) => row.trace_kind === "parallax-cadence");
  const fighterFlashRows = allRows.filter((row) => row.trace_kind === "fighter-flash-coverage");
  const debrisEffectsRows = allRows.filter((row) => row.trace_kind === "debris-effects-coverage");
  const weaponPickupRows = allRows.filter((row) => row.trace_kind === "weapon-pickup-coverage");
  const memoryIntegrityRows = allRows.filter((row) => row.trace_kind === "memory-integrity-120s");
  const engineRows = allRows.filter((row) => row.trace_kind === "engine-first-150");
  const engineRestartRows = allRows.filter((row) =>
    row.trace_kind === "engine-restart-after-game-over");
  invariant(baselineRows.length === 9_040,
    `Baseline trace measured ${baselineRows.length}/9040 frames`);
  invariant(targetedRows.length === 920,
    `Targeted trace measured ${targetedRows.length}/920 frames`);
  invariant(cadenceRows.length === 1_200,
    `Parallax trace measured ${cadenceRows.length}/1200 frames`);
  invariant(fighterFlashRows.length === 1_600,
    `Fighter-flash trace measured ${fighterFlashRows.length}/1600 frames`);
  invariant(debrisEffectsRows.length === 1_200,
    `Debris-effects trace measured ${debrisEffectsRows.length}/1200 frames`);
  invariant(weaponPickupRows.length === 3_200,
    `Weapon-pickup trace measured ${weaponPickupRows.length}/3200 frames`);
  invariant(memoryIntegrityRows.length === 12_000,
    `XEX/ATR memory-integrity traces measured ${memoryIntegrityRows.length}/12000 frames`);
  invariant(engineRows.length === engineDiagnosticSessions.length * 150,
    `Engine startup traces measured ${engineRows.length}/${engineDiagnosticSessions.length * 150} frames`);
  invariant(engineRestartRows.length === engineRestartSessions.length * 3_200,
    `Engine restart traces measured ${engineRestartRows.length}/6400 frames`);
  for (const session of memoryIntegritySessions) {
    invariant(memoryIntegrityRows.filter((row) => row.session === session.id).length === 3_000,
      `${session.medium}/${session.policy} integrity segment did not execute 60 seconds`);
  }
  const engineSessionEvidence = engineDiagnosticSessions.map((session) => {
    const rows = engineRows.filter((row) => row.session === session.id);
    const screenshotPaths = Array.from({ length: 150 }, (_, frame) =>
      path.join(buildDirectory, `${session.id}-${String(frame).padStart(3, "0")}.png`));
    invariant(screenshotPaths.every((screenshotPath) => fs.existsSync(screenshotPath)),
      `${session.id} did not save all 150 consecutive Atari800 screenshots`);
    invariant(rows.length === 150, `${session.id} did not execute 150 gameplay frames`);
    invariant(rows[0].engine_phase === 0 && rows[0].engine_timer === 7,
      `${session.id} did not start from deterministic engine phase 0/timer 8`);
    invariant(rows.every((row) => row.engine_phase === 0 || row.engine_phase === 1),
      `${session.id} observed an engine phase outside 0..1`);
    const transitions = [];
    for (let index = 1; index < rows.length; index += 1) {
      const previous = rows[index - 1];
      const row = rows[index];
      if (row.engine_phase !== previous.engine_phase) {
        invariant(previous.engine_timer === 1 && row.engine_timer === 8 &&
          row.engine_phase === (previous.engine_phase ^ 1) && row.engine_copy_calls === 1,
        `${session.id} phase transition at frame ${row.frame} was not one atomic 8-frame toggle`);
        transitions.push(row.frame);
      } else {
        invariant(row.engine_copy_calls === 0,
          `${session.id} copied engine glyphs without a phase transition at frame ${row.frame}`);
      }
    }
    invariant(transitions.length >= 18 && transitions.every((frame, index) =>
      index === 0 || frame - transitions[index - 1] === 8),
    `${session.id} did not preserve the exact 8+8 PAL engine cadence`);
    const selectedRows = rows.filter((row) => row.engine_playfield_select_calls > 0);
    invariant(selectedRows.length > 0 && selectedRows.every((row) =>
      row.engine_playfield_select_calls === 1 &&
      row.engine_playfield_select_dlist === 0x7f00 + row.engine_playfield_select_active_lo + 3),
    `${session.id} first DLI did not select byte three of the active A2 list`);
    return {
      id: session.id,
      medium: session.medium,
      cold_ram_fill: session.coldFill,
      difficulty: session.difficulty,
      start_mode: session.frontendDelay === 0 ? "immediate" : "delayed-menu",
      measured_frames: rows.length,
      first_transition_frame: transitions[0],
      transition_frames: transitions,
      phase_values: [...new Set(rows.map((row) => row.engine_phase))].sort(),
      charset_hashes: [...new Set(rows.map((row) => row.engine_charset_hash))],
      a2_heads: [...new Set(rows.map((row) => row.engine_a2_head))].sort((a, b) => a - b),
      first_recycled_base_write: rows.find((row) =>
        row.engine_first_recycled_write_pc !== 0) ? {
          frame: rows.find((row) => row.engine_first_recycled_write_pc !== 0).frame,
          pc: rows.find((row) => row.engine_first_recycled_write_pc !== 0)
            .engine_first_recycled_write_pc,
          address: rows.find((row) => row.engine_first_recycled_write_pc !== 0)
            .engine_first_recycled_write_address,
        } : null,
      screenshots: 150,
      screenshot_sequence_sha256: sha256(Buffer.concat(screenshotPaths.map((screenshotPath) =>
        fs.readFileSync(screenshotPath)))),
    };
  });
  for (const session of engineSessionEvidence.filter(({ medium }) => medium === "XEX")) {
    const peer = engineSessionEvidence.find((candidate) => candidate.medium === "ATR" &&
      candidate.cold_ram_fill === session.cold_ram_fill &&
      candidate.difficulty === session.difficulty && candidate.start_mode === session.start_mode);
    invariant(peer?.screenshot_sequence_sha256 === session.screenshot_sequence_sha256,
      `${session.id} screenshot sequence differs between XEX and ATR`);
  }
  const engineRestartEvidence = engineRestartSessions.map((session) => {
    const rows = engineRestartRows.filter((row) => row.session === session.id);
    const restartedRows = rows.filter((row) => row.gameplay_generation === 2).slice(0, 150);
    const screenshotPaths = Array.from({ length: 150 }, (_, frame) =>
      path.join(buildDirectory, `${session.id}-${String(frame).padStart(3, "0")}.png`));
    invariant(new Set(rows.map((row) => row.gameplay_generation)).has(2),
      `${session.id} did not reach a second game after GAME OVER`);
    invariant(restartedRows.length === 150,
      `${session.id} did not execute 150 frames of the restarted game`);
    invariant(restartedRows[0].engine_phase === 0 && restartedRows[0].engine_timer === 7,
      `${session.id} restarted game did not initialise engine phase 0/timer 8`);
    invariant(screenshotPaths.every((screenshotPath) => fs.existsSync(screenshotPath)),
      `${session.id} did not save 150 restarted-game screenshots`);
    const transitions = [];
    for (let index = 1; index < restartedRows.length; ++index) {
      const previous = restartedRows[index - 1];
      const row = restartedRows[index];
      if (row.engine_phase !== previous.engine_phase) {
        invariant(previous.engine_timer === 1 && row.engine_timer === 8 &&
          row.engine_phase === (previous.engine_phase ^ 1) && row.engine_copy_calls === 1,
        `${session.id} restarted cadence was not an atomic 8-frame toggle`);
        transitions.push(index);
      }
    }
    invariant(transitions.length >= 18 && transitions.every((frame, index) =>
      index === 0 || frame - transitions[index - 1] === 8),
    `${session.id} restarted game did not preserve 8+8 cadence`);
    return {
      id: session.id,
      medium: session.medium,
      cold_ram_fill: session.coldFill,
      gameplay_generations: [...new Set(rows.map((row) => row.gameplay_generation))],
      first_restarted_row: rows.findIndex((row) => row.gameplay_generation === 2),
      restarted_frames_checked: restartedRows.length,
      restarted_first_phase: restartedRows[0].engine_phase,
      restarted_first_timer: restartedRows[0].engine_timer,
      transition_frames: transitions,
      screenshots: screenshotPaths.length,
      screenshot_sequence_sha256: sha256(Buffer.concat(screenshotPaths.map((screenshotPath) =>
        fs.readFileSync(screenshotPath)))),
    };
  });
  invariant(engineRestartEvidence[0].screenshot_sequence_sha256 ===
    engineRestartEvidence[1].screenshot_sequence_sha256,
  "Restarted-game screenshot sequence differs between XEX and ATR");
  const engineContactSession = "engine-xex-a5-0-immediate";
  const engineScreenshotPath = (frame) => path.join(buildDirectory,
    `${engineContactSession}-${String(frame).padStart(3, "0")}.png`);
  const engineFirstContact = writeScreenshotContact(
    Array.from({ length: 32 }, (_, frame) => engineScreenshotPath(frame)),
    path.join(buildDirectory, "capital-engines-first-32-contact.png"), 8);
  const engineCycleContact = writeScreenshotContact(
    Array.from({ length: 32 }, (_, index) => engineScreenshotPath(23 + index)),
    path.join(buildDirectory, "capital-engines-two-cycles-contact.png"), 8);
  const engineCompactTracePath = path.join(buildDirectory, "capital-engines-first-150.csv");
  const engineCompactRows = engineRows.filter((row) => row.session === engineContactSession);
  fs.writeFileSync(engineCompactTracePath, [
    "frame,gameState,sectorPhase,worldRowAdvanced,vscroll,a2Head,logicalHullRow,enginePhase,phaseCounter,screenRow0,displayedRow0,activeRow0,alliedCells,enemyCells,firstWritePC,firstWriteAddress,firstWriteOld,firstWriteNew",
    ...engineCompactRows.map((row) => [
      row.frame, 6, row.sector_state, (row.events & 1) !== 0 ? 1 : 0,
      row.engine_vscroll, row.engine_a2_head, row.corridor_phase,
      row.engine_phase, row.engine_timer, row.engine_row0_address,
      row.engine_displayed_row0_address, row.engine_active_row0_address,
      row.engine_allied_cells, row.engine_enemy_cells, row.engine_first_write_pc,
      row.engine_first_write_address, row.engine_first_write_old, row.engine_first_write_new,
    ].join(",")),
  ].join("\n") + "\n");
  const engineRuntimeEvidence = {
    source_session: engineContactSession,
    first_32_contact: engineFirstContact,
    two_cycles_contact: engineCycleContact,
    compact_trace: {
      path: path.relative(rootDirectory, engineCompactTracePath),
      rows: engineCompactRows.length,
      bytes: fs.statSync(engineCompactTracePath).size,
      sha256: sha256(fs.readFileSync(engineCompactTracePath)),
    },
    xex_atr_screenshot_parity: true,
  };
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
  const targetedReferenceHeaviest = maximumRow(baselineRows.filter((row) =>
    row.session === "2-sweep-fire4"), (row) => row.wall_cycles);
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
  const topFiveAll = [...allRows]
    .sort((left, right) => right.wall_cycles - left.wall_cycles)
    .slice(0, 5)
    .map((row) => frameState(row));
  const deadlineOverruns = allRows.filter((row) => row.missed_frames > 0);
  const baselineDeadlineOverruns = baselineRows.filter((row) => row.missed_frames > 0);
  const targetedDeadlineOverruns = targetedRows.filter((row) => row.missed_frames > 0);
  const dliSequenceViolations = Math.max(...allRows.map((row) =>
    row.dli_sequence_violations));
  const maximumDlisPerHostFrame = Math.max(...allRows.map((row) =>
    row.maximum_dlis_per_host_frame));
  invariant(dliSequenceViolations === 0,
    `DLI phase/order violations observed: ${dliSequenceViolations}`);
  invariant(maximumDlisPerHostFrame <= 2,
    `More than two gameplay DLIs occurred in one host frame: ${maximumDlisPerHostFrame}`);
  const integrityByMedium = Object.fromEntries(["XEX", "ATR"].map((medium) => [
    medium,
    memoryIntegrityRows.filter((row) => row.session.includes(`-${medium.toLowerCase()}-`)),
  ]));
  const integrityState = (row) => [
    row.gameplay_frame, row.events, row.projectiles, row.broadside, row.live_raider,
    row.entity_active_mask, row.entity_x, row.entity_y, row.entity_render_id,
    row.effect_active_mask, row.pickup_state, row.pickup_booster_state,
    row.pickup_counter, row.pickup_x,
    row.pickup_y, row.pickup_timer_lo, row.pickup_timer_hi, row.score_lo, row.score_hi,
    row.rapid_projectiles, row.viper_projectiles,
  ];
  invariant(integrityByMedium.XEX.every((row, index) =>
    JSON.stringify(integrityState(row)) === JSON.stringify(integrityState(integrityByMedium.ATR[index]))),
  "XEX and ATR 120-second memory-integrity state traces diverged");
  const integrityCollections = memoryIntegrityRows.filter((row) =>
    (row.events & (1 << 19)) !== 0);
  invariant(integrityCollections.length >= 10,
    `Long XEX/ATR traces completed only ${integrityCollections.length}/10 weapon-booster cycles`);
  const integrityPauseRows = memoryIntegrityRows.filter((row) => row.pause_test_completed !== 0);
  invariant(["XEX", "ATR"].every((medium) => integrityPauseRows.some((row) =>
    row.session.includes(`-${medium.toLowerCase()}-`) &&
      row.pause_timer_before === row.pause_timer_after &&
      row.pause_engine_timer_before === row.pause_engine_timer_after &&
      row.pause_engine_phase_before === row.pause_engine_phase_after &&
      row.pause_host_frames >= 25)),
  "XEX/ATR integrity replay did not freeze Spread Shot and engine cadence across OPTION pause");
  const maximumBroadside = Math.max(...allRows.map((row) => row.broadside));
  const emptyEntityRows = allRows.filter((row) => row.entity_active === 0 &&
    row.pickup_state === 0 &&
    row.effect_active_count === 0 &&
    (row.events & ((1 << 7) | (1 << 13) | (1 << 17))) === 0);
  const activeEntityRows = allRows.filter((row) => (row.entity_active_mask & 1) !== 0 &&
    (row.events & (1 << 8)) === 0);
  const spawnRows = allRows.filter((row) => (row.events & (1 << 7)) !== 0);
  const contactRows = allRows.filter((row) => (row.events & (1 << 8)) !== 0);
  const despawnRows = allRows.filter((row) => (row.events & (1 << 9)) !== 0);
  const shotRows = allRows.filter((row) => (row.events & (1 << 12)) !== 0);
  const effectSpawnRows = allRows.filter((row) => (row.events & (1 << 13)) !== 0);
  const raiderBreakupRows = allRows.filter((row) => (row.events & (1 << 17)) !== 0);
  const pickupQualifiedKillRows = weaponPickupRows.filter((row) =>
    (row.events & (1 << 18)) !== 0);
  const pickupCollectRows = weaponPickupRows.filter((row) =>
    (row.events & (1 << 19)) !== 0);
  const pickupPendingRows = weaponPickupRows.filter((row) => row.pickup_state === 1);
  const pickupActiveRows = weaponPickupRows.filter((row) => row.pickup_state === 2);
  const pickupRapidRows = weaponPickupRows.filter((row) => row.pickup_booster_state === 3);
  const pickupSpreadRows = weaponPickupRows.filter((row) => row.pickup_booster_state === 4);
  const pickupActiveTransitions = pickupActiveRows.flatMap((row) => {
    const previous = weaponPickupRows.find((candidate) => candidate.session === row.session &&
      candidate.frame === row.frame - 1 && candidate.pickup_state === 2);
    return previous === undefined ? [] : [{ previous, row }];
  });
  let pickupMaximumStationaryRun = 0;
  let pickupStationaryRun = 0;
  let pickupPreviousTransition = null;
  for (const { previous, row } of pickupActiveTransitions) {
    if (pickupPreviousTransition === null ||
      previous.session !== pickupPreviousTransition.session ||
      previous.frame !== pickupPreviousTransition.frame) pickupStationaryRun = 0;
    if (row.pickup_y === previous.pickup_y) pickupStationaryRun += 1;
    else pickupStationaryRun = 0;
    pickupMaximumStationaryRun = Math.max(pickupMaximumStationaryRun,
      pickupStationaryRun);
    pickupPreviousTransition = row;
  }
  const rapidProjectileRows = weaponPickupRows.filter((row) => row.rapid_projectiles > 0);
  const spreadVolleyRows = weaponPickupRows.filter((row) =>
    row.pickup_booster_state === 4 && row.viper_projectiles >= 3);
  const activeCapsuleThreeProjectileRows = weaponPickupRows.filter((row) =>
    row.pickup_state === 2 && row.viper_projectiles >= 3);
  const activeCapsuleDuringBoosterRows = weaponPickupRows.filter((row) =>
    row.pickup_state === 2 && row.pickup_booster_state >= 3);
  // The projectile's screen code follows its 0..7 vertical phase and one of
  // four HPOS sub-cell variants. Every Viper code keeps D7 clear so selector 3
  // stays on the yellow COLPF2 bank; $0f is only one valid phase.
  const rapidProjectileVisibleRows = rapidProjectileRows.filter((row) =>
    (row.rapid_projectile_screen_code & 0x80) === 0 &&
      row.rapid_projectile_screen_code >= 11 &&
      row.rapid_projectile_screen_code < 47 &&
      row.rapid_projectile_address >= 0x4050 && row.rapid_projectile_address < 0x43c0);
  const rapidScreenshotRow = rapidProjectileVisibleRows.find((row) =>
    row.rapid_projectiles >= 3 && row.effect_active_count === 0);
  const spreadScreenshotRow = spreadVolleyRows.find((row) => row.effect_active_count === 0);
  const pickupScreenshotCandidates = pickupActiveRows.filter((row) =>
    row.entity_active_mask === 2 && (row.pickup_drawn_mask & 15) === 15 &&
      row.effect_active_count === 0);
  const pickupScreenshotRow = pickupScreenshotCandidates.find((row, index, rows) =>
    index > 0 && rows[index - 1].frame + 1 === row.frame);
  const capsuleTripleHeaviest = maximumRow(activeCapsuleThreeProjectileRows,
    (row) => row.wall_cycles);
  const pickupPendingRuns = [];
  let pickupPendingRun = [];
  for (const row of weaponPickupRows) {
    if (row.pickup_state === 1) pickupPendingRun.push(row);
    else if (pickupPendingRun.length > 0) {
      pickupPendingRuns.push(pickupPendingRun);
      pickupPendingRun = [];
    }
  }
  if (pickupPendingRun.length > 0) pickupPendingRuns.push(pickupPendingRun);
  const pickupPendingTransitions = pickupPendingRuns.map((run) => ({
    run,
    next: weaponPickupRows.find((row) => row.session === run.at(-1).session &&
      row.frame === run.at(-1).frame + 1),
  }));
  const pickupCompletedPendingRuns = pickupPendingTransitions.filter(({ next }) =>
    next?.pickup_state === 2);
  const pickupCreatedRenderIds = pickupPendingRuns.map((run) => run[0].pickup_render_id);
  const rowsBySessionFrame = new Map(allRows.map((row) => [
    `${row.session}:${row.frame}`, row,
  ]));
  const pickupReleaseRows = weaponPickupRows.filter((row) => row.pickup_state !== 2 &&
    rowsBySessionFrame.get(`${row.session}:${row.frame - 1}`)?.pickup_state === 2);
  const raiderFlashPairs = raiderBreakupRows.filter((row) => {
    const deathFrame = rowsBySessionFrame.get(`${row.session}:${row.frame - 1}`);
    return deathFrame?.colbk === 0x1e && row.colbk === 0x3c;
  });
  const fullEffectRows = allRows.filter((row) =>
    row.effect_active_mask === 0x1f && row.effect_active_count === 5);
  const bottomDespawnRows = despawnRows.filter((row) =>
    (row.events & ((1 << 8) | (1 << 12))) === 0);
  invariant(emptyEntityRows.length > 0, "Trace did not observe the empty entity/effects path");
  invariant(activeEntityRows.length > 0, "Trace did not observe one active debris");
  invariant(spawnRows.length > 0, "Trace did not observe debris spawn");
  invariant(contactRows.length > 0, "Trace did not observe successful debris contact");
  invariant(bottomDespawnRows.length > 0,
    "Trace did not observe debris leaving the bottom after ring/world advancement");
  invariant(shotRows.length > 0,
    "Trace did not observe a Viper projectile destroying active debris");
  invariant(shotRows.some((row) => row.sector_state === 7),
    "Trace did not observe a Viper projectile destroying post-capital debris");
  invariant(effectSpawnRows.length > 0,
    "Trace did not execute the debris destruction effect spawner");
  invariant(fullEffectRows.length > 0,
    "Trace did not observe one core plus four active fragments");
  invariant(effectSpawnRows.every((row) =>
    row.effect_active_mask === 0x1f && row.effect_active_count === 5 &&
    (row.events & (1 << 15)) !== 0 && (row.events & (1 << 16)) !== 0),
  "Final-hit frame did not update and render all five spawned effects");
  invariant(fullEffectRows.some((row) => (row.events & (1 << 14)) !== 0),
    "Active debris fragments were never erased on the following frame");
  invariant(effectSpawnRows.some((row) => row.sector_state === 7),
    "Trace did not spawn the five-slot destruction effect after the capital sector");
  invariant(raiderBreakupRows.length > 0,
    "Trace did not execute the Raider breakup spawner");
  invariant(raiderBreakupRows.every((row) =>
    row.effect_active_mask === 0x1f && row.effect_active_count === 5 &&
    (row.events & ((1 << 15) | (1 << 16))) === ((1 << 15) | (1 << 16))),
  "Raider death did not update and render all five local effects in its spawn frame");
  invariant(raiderFlashPairs.length > 0,
    "Trace did not preserve the accepted yellow-to-red full-screen flash across deferred breakup");
  invariant(pickupQualifiedKillRows.length >= 3,
    "Atari800 replay did not execute three qualifying Raider projectile deaths");
  invariant(pickupCompletedPendingRuns.length > 0 &&
    pickupCompletedPendingRuns.every(({ run }) => run.length - 1 === 30) &&
    pickupPendingTransitions.every(({ run, next }) => next === undefined ||
      next.pickup_state === 2 ||
      next.pickup_state === next.pickup_booster_state && run.length - 1 < 30),
  `Atari800 pending spans/transitions were ${pickupPendingTransitions.map(({ run, next }) =>
    `${run.length - 1}->${next?.pickup_state ?? "end"}`).join(",")}; every uninterrupted span must be 30 frames`);
  invariant(pickupPendingRows.every((row) =>
    (row.entity_active_mask & 2) === 0 && (row.pickup_drawn_mask & 15) === 0),
  "Pending weapon pickup became visible or interactive");
  invariant(pickupActiveRows.length > 0 && pickupActiveRows.every((row) =>
    (row.entity_active_mask & 2) !== 0 && (row.pickup_drawn_mask & 15) === 15 &&
      (row.pickup_render_id === 120 || row.pickup_render_id === 252)),
  "Atari800 replay did not continuously draw one static Rapid/Spread render ID");
  invariant(pickupActiveRows.every((row) =>
    row.pickup_footprints_before <= 1 && row.pickup_footprints_after === 1 &&
      row.pickup_glyph_cells_before <= 4 && row.pickup_glyph_cells_after === 4 &&
      row.pickup_draw_calls === 3),
  "Atari800 replay observed a duplicate/partial booster footprint or missed a layer fence");
  invariant(pickupActiveTransitions.every(({ previous, row }) =>
    row.pickup_x === previous.pickup_x &&
      (row.pickup_y === previous.pickup_y || row.pickup_y === previous.pickup_y + 8) &&
      row.pickup_new_address0 === previous.pickup_new_address0 &&
      row.pickup_new_address1 === previous.pickup_new_address1 &&
      row.pickup_new_address2 === previous.pickup_new_address2 &&
      row.pickup_new_address3 === previous.pickup_new_address3),
  "Booster native-ring motion changed X, caught up, or allocated a second physical footprint");
  invariant(pickupMaximumStationaryRun <= 3,
    `Booster native-ring motion held for ${pickupMaximumStationaryRun + 1} active frames`);
  invariant(pickupReleaseRows.length > 0 && pickupReleaseRows.every((row) =>
    row.pickup_erase_calls === 1 && row.pickup_footprints_after === 0 &&
      row.pickup_glyph_cells_after === 0),
  "Booster release did not restore its exact single resident footprint in the release frame");
  invariant(pickupScreenshotRow,
    "Atari800 replay did not reach the isolated static pickup screenshot state");
  invariant(pickupCollectRows.length >= 3 && pickupRapidRows.length > 0 &&
    pickupSpreadRows.length > 0 &&
    pickupCollectRows.every((row, index, rows) =>
      index === 0 || row.frame > rows[index - 1].frame + 1),
  "Atari800 replay did not collect each visible pickup once and enter both booster modes");
  invariant(pickupCreatedRenderIds.length >= 3 &&
    pickupCreatedRenderIds.every((renderId, index) => renderId === (index & 1 ? 252 : 120)),
  `Atari800 created capsule cycle was ${pickupCreatedRenderIds.join("→")}, expected 120→252 alternation`);
  invariant(pickupRapidRows[0].pickup_timer_lo === 0xf4 &&
    pickupRapidRows[0].pickup_timer_hi === 1,
  "Atari800 replay did not load the exact 500-frame Rapid Fire timer");
  invariant(pickupSpreadRows[0].pickup_timer_lo === 0xf4 &&
    pickupSpreadRows[0].pickup_timer_hi === 1,
  "Atari800 replay did not load the exact 500-frame Spread Shot timer");
  invariant(rapidProjectileRows.length > 0 && rapidProjectileRows.every((row) =>
    row.rapid_projectile_slot < 10 && row.pickup_booster_state === 3) &&
    rapidProjectileVisibleRows.length > 0,
  "Atari800 replay did not preserve yellow Rapid Fire projectile screen codes");
  invariant(rapidScreenshotRow,
    "Atari800 replay did not isolate three visible yellow Rapid Fire projectiles without transient effects");
  invariant(spreadVolleyRows.length > 0,
    "Atari800 replay did not execute a logical three-projectile Spread volley");
  invariant(spreadScreenshotRow,
    "Atari800 replay did not isolate a visible three-projectile Spread fan");
  invariant(activeCapsuleThreeProjectileRows.length > 0,
    "Atari800 replay did not observe three Viper projectiles with one active capsule");
  invariant(activeCapsuleDuringBoosterRows.length > 0,
    "Atari800 replay did not create a collectible capsule during an active booster");
  const emptyEntityMaximum = maximumRow(emptyEntityRows, (row) => row.wall_cycles);
  const activeEntityMaximum = maximumRow(activeEntityRows, (row) => row.wall_cycles);
  const spawnMaximum = maximumRow(spawnRows, (row) => row.wall_cycles);
  const contactMaximum = maximumRow(contactRows, (row) => row.wall_cycles);
  const shotMaximum = maximumRow(shotRows, (row) => row.wall_cycles);
  const enemyBreakupTargetOverruns = allRows.filter((row) =>
    row.wall_cycles > ENEMY_BREAKUP_TARGET_GATE_CYCLES);
  const enemyBreakupHardOverruns = allRows.filter((row) =>
    row.wall_cycles > ENEMY_BREAKUP_HARD_GATE_CYCLES);
  const spreadShotTargetOverruns = allRows.filter((row) =>
    row.wall_cycles > SPREAD_SHOT_TARGET_GATE_CYCLES);
  const spreadShotHardOverruns = allRows.filter((row) =>
    row.wall_cycles > SPREAD_SHOT_HARD_GATE_CYCLES);
  const noActiveDebrisPathDelta =
    manifest.runtimeTiming.destructibleDebris.noActiveDebrisPathDeltaCpuCycles;
  const noActiveViperPathDelta =
    manifest.runtimeTiming.destructibleDebris.noActiveViperProjectilePathDeltaCpuCycles;
  invariant(noActiveDebrisPathDelta <= 32,
    "Linked no-active-debris path exceeded its +32-cycle limit");
  invariant(noActiveViperPathDelta <= 48,
    "Linked no-active-Viper-projectile path exceeded its +48-cycle limit");
  const activeDebrisRows = activeEntityRows.filter((row) =>
    row.entity_render_id >= manifest.entityEffects.glyphIndex &&
      row.entity_render_id < manifest.entityEffects.glyphIndex +
        manifest.entityEffects.debrisGlyphCount);
  const activeGlyphOffsets = activeDebrisRows
    .map((row) => row.entity_render_id - manifest.entityEffects.glyphIndex);
  const observedVariants = [...new Set(activeGlyphOffsets.map((offset) => offset >> 2))].sort();
  const observedPhases = [...new Set(activeGlyphOffsets.map((offset) => offset >> 1 & 1))].sort();
  const observedTrajectories = [...new Set(activeDebrisRows.map((row) =>
    row.entity_vx < 0x80 ? row.entity_vx : row.entity_vx - 0x100))].sort((a, b) => a - b);
  invariant(observedVariants.join(",") === "0,1", "Trace did not observe both debris variants");
  invariant(observedPhases.join(",") === "0,1", "Trace did not observe both tumbling phases");
  invariant(observedTrajectories.join(",") === "-4,0,4",
    "Trace did not observe all three debris trajectories");
  invariant(activeDebrisRows.every((row) => row.entity_x >= 84 && row.entity_x + 8 <= 172),
    "Trace observed debris outside the source-derived inner corridor");
  const postCapitalActiveRows = allRows.filter((row) =>
    row.sector_state === 7 && (row.entity_active_mask & 1) !== 0);
  invariant(allRows.some((row) => row.sector_state === 6),
    "Trace did not observe capital-sector COMPLETE reconstruction");
  invariant(postCapitalActiveRows.length > 0,
    "Trace did not observe active debris after the capital sector");
  let postCapitalTransition = null;
  for (const session of new Set(allRows.map((row) => row.session))) {
    const rows = allRows.filter((row) => row.session === session);
    const drainIndex = rows.findIndex((row) => row.sector_state === 5);
    const completeIndex = rows.findIndex((row, index) =>
      index > drainIndex && row.sector_state === 6);
    const openIndex = rows.findIndex((row, index) =>
      index > completeIndex && row.sector_state === 7);
    const spawnIndex = rows.findIndex((row, index) =>
      index >= openIndex && row.sector_state === 7 && (row.events & (1 << 7)) !== 0);
    const activeIndex = rows.findIndex((row, index) =>
      index > spawnIndex && row.sector_state === 7 && row.entity_active === 1);
    if (drainIndex > 0 && completeIndex > drainIndex && openIndex > completeIndex &&
        spawnIndex >= openIndex && activeIndex > spawnIndex &&
        rows.slice(0, drainIndex).some((row) => row.sector_state < 5)) {
      postCapitalTransition = {
        session,
        open_gameplay_frame: rows.slice(0, drainIndex).find((row) => row.sector_state < 5).frame,
        drain_frame: rows[drainIndex].frame,
        complete_frame: rows[completeIndex].frame,
        next_open_frame: rows[openIndex].frame,
        post_capital_spawn_frame: rows[spawnIndex].frame,
        post_capital_spawn_active_frame: rows[activeIndex].frame,
        configured_spawn_delay_scheduler_ticks: 32,
        observable_open_to_spawn_frame_delta:
          rows[spawnIndex].frame - rows[openIndex].frame,
      };
      break;
    }
  }
  invariant(postCapitalTransition !== null,
    "Trace did not observe open gameplay -> DRAIN -> COMPLETE -> next OPEN -> active debris");
  const verticalCadence = {
    active_transitions: 0,
    world_events: 0,
    vertical_steps: 0,
    held_events: 0,
    invalid_transitions: 0,
  };
  const isCompletedDebrisRow = (row) => (row.entity_active_mask & 1) !== 0 &&
    row.entity_render_id >= manifest.entityEffects.glyphIndex &&
    row.entity_render_id < manifest.entityEffects.glyphIndex +
      manifest.entityEffects.debrisGlyphCount;
  for (let index = 1; index < allRows.length; index += 1) {
    const previous = allRows[index - 1];
    const current = allRows[index];
    if (previous.session !== current.session || !isCompletedDebrisRow(previous) ||
        !isCompletedDebrisRow(current)) continue;
    verticalCadence.active_transitions += 1;
    // End-of-frame snapshots attribute each state transition to current.events.
    const worldAdvanced = (current.events & (1 << 0)) !== 0;
    if (!worldAdvanced) {
      if (previous.entity_vertical_accumulator !== current.entity_vertical_accumulator ||
          previous.entity_y !== current.entity_y || previous.entity_x !== current.entity_x ||
          previous.entity_render_id !== current.entity_render_id) {
        verticalCadence.invalid_transitions += 1;
      }
      continue;
    }
    verticalCadence.world_events += 1;
    let expectedAccumulator = previous.entity_vertical_accumulator + 3;
    const moved = expectedAccumulator >= 5;
    if (moved) expectedAccumulator -= 5;
    const expectedY = previous.entity_y + (moved ? 8 : 0);
    const offset = previous.entity_render_id - manifest.entityEffects.glyphIndex;
    const expectedGlyph = manifest.entityEffects.glyphIndex +
      (offset & 2 ? offset - 2 : offset + 2);
    let expectedMoveAccumulator = previous.entity_move_accumulator;
    let expectedX = previous.entity_x;
    const vx = previous.entity_vx < 0x80 ? previous.entity_vx : previous.entity_vx - 0x100;
    if (vx !== 0) {
      expectedMoveAccumulator += 1;
      if (expectedMoveAccumulator === 4) {
        expectedMoveAccumulator = 0;
        expectedX += vx;
      }
    }
    if (current.entity_vertical_accumulator !== expectedAccumulator ||
        current.entity_y !== expectedY || current.entity_render_id !== expectedGlyph ||
        current.entity_move_accumulator !== expectedMoveAccumulator ||
        current.entity_x !== expectedX) {
      verticalCadence.invalid_transitions += 1;
    }
    if (moved) verticalCadence.vertical_steps += 1;
    else verticalCadence.held_events += 1;
  }
  invariant(verticalCadence.world_events > 0 && verticalCadence.vertical_steps > 0 &&
    verticalCadence.held_events > 0 && verticalCadence.invalid_transitions === 0,
  "Trace did not preserve the exact debris 3/5 vertical cadence");

  const expectedLayerSpeeds = [
    { difficulty: 0, world: 20, near: 10, far: 5, debris: 12 },
    { difficulty: 1, world: 22.5, near: 11.25, far: 5.625, debris: 13.5 },
    { difficulty: 2, world: 25, near: 12.5, far: 6.25, debris: 15 },
  ];
  const parallaxCadence = expectedLayerSpeeds.map((expected) => {
    const rows = cadenceRows.filter((row) => row.difficulty === expected.difficulty);
    const seconds = rows.length / 50;
    const worldSteps = rows.filter((row) => (row.events & (1 << 0)) !== 0).length;
    const nearSteps = rows.filter((row) => (row.events & (1 << 10)) !== 0).length;
    const farSteps = rows.filter((row) => (row.events & (1 << 11)) !== 0).length;
    const measured = {
      world: worldSteps / seconds,
      near: nearSteps / seconds,
      far: farSteps / seconds,
      debris: worldSteps / seconds * 3 / 5,
    };
    invariant(measured.world === expected.world && measured.near === expected.near &&
      measured.far === expected.far && measured.debris === expected.debris,
    `Difficulty ${expected.difficulty} parallax cadence diverged from its exact trace rate`);

    let spawnFrame = null;
    const flightFrames = [];
    for (const row of rows) {
      if ((row.events & (1 << 7)) !== 0) spawnFrame = row.frame;
      if (spawnFrame !== null && (row.events & ((1 << 8) | (1 << 12))) !== 0) {
        spawnFrame = null;
      }
      if (spawnFrame !== null && (row.events & (1 << 9)) !== 0 &&
          (row.events & ((1 << 8) | (1 << 12))) === 0) {
        flightFrames.push(row.frame - spawnFrame);
        spawnFrame = null;
      }
    }
    invariant(flightFrames.length > 0,
      `Difficulty ${expected.difficulty} trace did not include a full debris flight`);
    return {
      difficulty: expected.difficulty,
      measured_frames: rows.length,
      measured_seconds: seconds,
      world_steps: worldSteps,
      near_steps: nearSteps,
      far_steps: farSteps,
      measured_rows_per_second: measured,
      full_debris_flight_frames: flightFrames,
      full_debris_flight_seconds: flightFrames.map((frames) => frames / 50),
    };
  });

  const enemyFlashSequence = [0x1e, 0x3c, 0x1c, 0x34];
  const playerFlashSequence = [0x1e, 0x3c, 0x1c, 0x3c, 0x38, 0x34];
  const enemyFlashRows = fighterFlashRows.filter((row) =>
    row.viper_explosion_timer < 19 && row.enemy_explosion_timer >= 21);
  const playerFlashRows = fighterFlashRows.filter((row) => row.viper_explosion_timer >= 19);
  invariant([...new Set(enemyFlashRows.map((row) => row.enemy_explosion_timer))]
    .sort((left, right) => right - left).join(",") === "24,23,22,21",
  "PAL trace did not observe every enemy fighter flash timer value");
  invariant([...new Set(playerFlashRows.map((row) => row.viper_explosion_timer))]
    .sort((left, right) => right - left).join(",") === "24,23,22,21,20,19",
  "PAL trace did not observe every Viper death flash timer value");
  invariant(enemyFlashRows.every((row) =>
    row.colbk === enemyFlashSequence[24 - row.enemy_explosion_timer]),
  "PAL trace observed an incorrect enemy fighter COLBK sequence");
  invariant(playerFlashRows.every((row) =>
    row.colbk === playerFlashSequence[24 - row.viper_explosion_timer]),
  "PAL trace observed an incorrect Viper death COLBK sequence");
  invariant(fighterFlashRows.filter((row) =>
    row.viper_explosion_timer > 0 && row.viper_explosion_timer < 19)
    .every((row) => row.colbk === 0),
  "PAL trace observed a background flash after the Viper death profile restored base");
  invariant([...enemyFlashSequence, ...playerFlashSequence].every((color) => color !== 0x84),
    "Fighter flash reused the accepted $84 local explosion colour");

  const flashRegisterCoverage = {
    enemy_fighter: {
      observed: true,
      active_frames: enemyFlashSequence.length,
      timer_values: [24, 23, 22, 21],
      colbk_values: enemyFlashSequence,
      observations: enemyFlashRows.length,
    },
    player_death: {
      observed: true,
      active_frames: playerFlashSequence.length,
      timer_values: [24, 23, 22, 21, 20, 19],
      colbk_values: playerFlashSequence,
      observations: playerFlashRows.length,
    },
    colpm_values: Object.fromEntries(["colpm0", "colpm1", "colpm2", "colpm3"].map((name) => [
      name,
      [...new Set(fighterFlashRows.map((row) => row[name]))].sort((left, right) => left - right),
    ])),
    colpf_values: Object.fromEntries(["colpf0", "colpf1", "colpf2", "colpf3"].map((name) => [
      name,
      [...new Set(fighterFlashRows.map((row) => row[name]))].sort((left, right) => left - right),
    ])),
  };

  const report = {
    schema_version: 2,
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
      model_arguments: [
        "-xe", "-pal", "-nobasic", "-nosound", "-turbo", "-no-video-accel", "-no-vsync",
      ],
      audio_note: "-nosound disables host playback only; guest sound/music state and POKEY register writes remain active",
    },
    boot_smoke: bootSmoke,
    semantics: {
      cpu_cycles_dma_off: cpuCycles,
      cpu_comparison_headroom: PAL_FRAME_CYCLES - cpuCycles,
      measured_wall_cycles_dma_on: heaviest.wall_cycles,
      measured_physical_headroom: PAL_FRAME_CYCLES - heaviest.wall_cycles,
      estimated_additive_cycles: estimatedAdditive,
    },
    gate: {
      pal_frame_cycles: PAL_FRAME_CYCLES,
      maximum_wall_cycles: SPREAD_SHOT_HARD_GATE_CYCLES,
      historical_runtime_headroom_gate: {
        maximum_wall_cycles: HISTORICAL_PHYSICAL_GATE_CYCLES,
        preserved_for_history: true,
        replaced: false,
        note: "The feature gate is additional; this historical checkpoint remains explicit.",
      },
      entity_effects_foundation: {
        baseline_wall_cycles: ENTITY_EFFECTS_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: ENTITY_EFFECTS_BASELINE_HEADROOM_CYCLES,
        approved_delta_cycles: ENTITY_EFFECTS_APPROVED_DELTA_CYCLES,
        maximum_wall_cycles: ENTITY_EFFECTS_FEATURE_GATE_CYCLES,
        minimum_physical_headroom: PAL_FRAME_CYCLES - ENTITY_EFFECTS_FEATURE_GATE_CYCLES,
        measured_wall_cycles: 32_025,
        measured_physical_headroom: 3_543,
        actual_delta_cycles: 585,
        remaining_approved_cycles: 15,
        budget_overrun_frames: 0,
        passed: true,
      },
      debris_visual_polish: {
        baseline_wall_cycles: DEBRIS_VISUAL_POLISH_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: DEBRIS_VISUAL_POLISH_BASELINE_HEADROOM_CYCLES,
        approved_delta_cycles: DEBRIS_VISUAL_POLISH_APPROVED_DELTA_CYCLES,
        maximum_wall_cycles: DEBRIS_VISUAL_POLISH_FEATURE_GATE_CYCLES,
        minimum_physical_headroom:
          PAL_FRAME_CYCLES - DEBRIS_VISUAL_POLISH_FEATURE_GATE_CYCLES,
        measured_wall_cycles: DEBRIS_VISUAL_POLISH_ACCEPTED_WALL_CYCLES,
        measured_physical_headroom: DEBRIS_VISUAL_POLISH_ACCEPTED_HEADROOM_CYCLES,
        actual_delta_cycles:
          DEBRIS_VISUAL_POLISH_ACCEPTED_WALL_CYCLES -
            DEBRIS_VISUAL_POLISH_BASELINE_WALL_CYCLES,
        remaining_approved_cycles:
          DEBRIS_VISUAL_POLISH_FEATURE_GATE_CYCLES -
            DEBRIS_VISUAL_POLISH_ACCEPTED_WALL_CYCLES,
        budget_overrun_frames: 0,
        empty_path: {
          maximum_wall_cycles: 31_108,
          delta_from_baseline: -917,
        },
        one_active_debris: {
          maximum_wall_cycles: DEBRIS_VISUAL_POLISH_ACCEPTED_WALL_CYCLES,
          delta_from_baseline: 56,
        },
        spawn_path: {
          maximum_wall_cycles: 28_212,
          delta_from_baseline: -3_813,
        },
        contact_path: {
          maximum_wall_cycles: 26_129,
          delta_from_baseline: -5_896,
        },
      },
      explosion_colour_flash: {
        baseline_wall_cycles: EXPLOSION_FLASH_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: EXPLOSION_FLASH_BASELINE_HEADROOM_CYCLES,
        approved_delta_cycles: EXPLOSION_FLASH_APPROVED_DELTA_CYCLES,
        maximum_wall_cycles: EXPLOSION_FLASH_FEATURE_GATE_CYCLES,
        delta_limited_minimum_physical_headroom:
          EXPLOSION_FLASH_BASELINE_HEADROOM_CYCLES -
            EXPLOSION_FLASH_APPROVED_DELTA_CYCLES,
        absolute_minimum_physical_headroom:
          EXPLOSION_FLASH_ABSOLUTE_MINIMUM_HEADROOM_CYCLES,
        measured_wall_cycles: EXPLOSION_FLASH_ACCEPTED_WALL_CYCLES,
        measured_physical_headroom: EXPLOSION_FLASH_ACCEPTED_HEADROOM_CYCLES,
        actual_delta_cycles:
          EXPLOSION_FLASH_ACCEPTED_WALL_CYCLES - EXPLOSION_FLASH_BASELINE_WALL_CYCLES,
        remaining_approved_cycles:
          EXPLOSION_FLASH_FEATURE_GATE_CYCLES - EXPLOSION_FLASH_ACCEPTED_WALL_CYCLES,
        budget_overrun_frames: 0,
        passed: true,
      },
      destructible_debris: {
        baseline_wall_cycles: DESTRUCTIBLE_DEBRIS_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: DESTRUCTIBLE_DEBRIS_BASELINE_HEADROOM_CYCLES,
        target_delta_cycles: DESTRUCTIBLE_DEBRIS_TARGET_DELTA_CYCLES,
        hard_delta_cycles: DESTRUCTIBLE_DEBRIS_HARD_DELTA_CYCLES,
        target_wall_cycles: DESTRUCTIBLE_DEBRIS_TARGET_GATE_CYCLES,
        maximum_wall_cycles: DESTRUCTIBLE_DEBRIS_HARD_GATE_CYCLES,
        minimum_physical_headroom: DESTRUCTIBLE_DEBRIS_MINIMUM_HEADROOM_CYCLES,
        measured_wall_cycles: ENEMY_BREAKUP_BASELINE_WALL_CYCLES,
        measured_physical_headroom: ENEMY_BREAKUP_BASELINE_HEADROOM_CYCLES,
        actual_delta_cycles:
          ENEMY_BREAKUP_BASELINE_WALL_CYCLES - DESTRUCTIBLE_DEBRIS_BASELINE_WALL_CYCLES,
        remaining_target_cycles:
          DESTRUCTIBLE_DEBRIS_TARGET_GATE_CYCLES - ENEMY_BREAKUP_BASELINE_WALL_CYCLES,
        remaining_hard_cycles:
          DESTRUCTIBLE_DEBRIS_HARD_GATE_CYCLES - ENEMY_BREAKUP_BASELINE_WALL_CYCLES,
        target_overrun_frames: 0,
        hard_overrun_frames: 0,
        no_active_debris_path_delta_cpu_cycles: noActiveDebrisPathDelta,
        no_active_debris_path_limit_cpu_cycles: 32,
        no_active_viper_projectile_path_delta_cpu_cycles: noActiveViperPathDelta,
        no_active_viper_projectile_path_limit_cpu_cycles: 48,
        debris_shot_path: frameState(shotMaximum),
        passed: true,
      },
      enemy_breakup_effects: {
        baseline_wall_cycles: ENEMY_BREAKUP_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: ENEMY_BREAKUP_BASELINE_HEADROOM_CYCLES,
        target_delta_cycles: ENEMY_BREAKUP_TARGET_DELTA_CYCLES,
        hard_delta_cycles: ENEMY_BREAKUP_HARD_DELTA_CYCLES,
        target_wall_cycles: ENEMY_BREAKUP_TARGET_GATE_CYCLES,
        maximum_wall_cycles: ENEMY_BREAKUP_HARD_GATE_CYCLES,
        minimum_physical_headroom: ENEMY_BREAKUP_MINIMUM_HEADROOM_CYCLES,
        measured_wall_cycles: WEAPON_PICKUP_BASELINE_WALL_CYCLES,
        measured_physical_headroom: WEAPON_PICKUP_BASELINE_HEADROOM_CYCLES,
        actual_delta_cycles:
          WEAPON_PICKUP_BASELINE_WALL_CYCLES - ENEMY_BREAKUP_BASELINE_WALL_CYCLES,
        remaining_target_cycles:
          ENEMY_BREAKUP_TARGET_GATE_CYCLES - WEAPON_PICKUP_BASELINE_WALL_CYCLES,
        remaining_hard_cycles:
          ENEMY_BREAKUP_HARD_GATE_CYCLES - WEAPON_PICKUP_BASELINE_WALL_CYCLES,
        target_overrun_frames: 4,
        hard_overrun_frames: 0,
        raider_spawn_frames: 216,
        passed: true,
      },
      weapon_pickup_rapid_fire: {
        baseline_wall_cycles: WEAPON_PICKUP_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: WEAPON_PICKUP_BASELINE_HEADROOM_CYCLES,
        target_delta_cycles: WEAPON_PICKUP_TARGET_DELTA_CYCLES,
        hard_delta_cycles: WEAPON_PICKUP_HARD_DELTA_CYCLES,
        target_wall_cycles: WEAPON_PICKUP_TARGET_GATE_CYCLES,
        maximum_wall_cycles: WEAPON_PICKUP_HARD_GATE_CYCLES,
        minimum_physical_headroom: WEAPON_PICKUP_MINIMUM_HEADROOM_CYCLES,
        measured_wall_cycles: SPREAD_SHOT_BASELINE_WALL_CYCLES,
        measured_physical_headroom: SPREAD_SHOT_BASELINE_HEADROOM_CYCLES,
        actual_delta_cycles: SPREAD_SHOT_BASELINE_WALL_CYCLES -
          WEAPON_PICKUP_BASELINE_WALL_CYCLES,
        remaining_target_cycles: WEAPON_PICKUP_TARGET_GATE_CYCLES -
          SPREAD_SHOT_BASELINE_WALL_CYCLES,
        remaining_hard_cycles: WEAPON_PICKUP_HARD_GATE_CYCLES -
          SPREAD_SHOT_BASELINE_WALL_CYCLES,
        target_overrun_frames: 0,
        hard_overrun_frames: 0,
        qualified_kill_events: pickupQualifiedKillRows.length,
        pending_frames: pickupPendingRows.length,
        pending_partial_kill_frame_included: true,
        pending_complete_frame_runs: pickupCompletedPendingRuns.map(({ run }) => run.length - 1),
        pending_lifecycle_interrupted_frame_runs: pickupPendingTransitions
          .filter(({ run, next }) => next !== undefined && next.pickup_state !== 2 &&
            next.pickup_state === next.pickup_booster_state && run.length - 1 < 30)
          .map(({ run }) => run.length - 1),
        active_frames: pickupActiveRows.length,
        maximum_simultaneous_footprints: Math.max(...pickupActiveRows.map((row) =>
          Math.max(row.pickup_footprints_before, row.pickup_footprints_after))),
        maximum_pickup_glyph_cells: Math.max(...pickupActiveRows.map((row) =>
          Math.max(row.pickup_glyph_cells_before, row.pickup_glyph_cells_after))),
        layer_fences_per_active_frame: 3,
        maximum_stationary_active_frames: pickupMaximumStationaryRun + 1,
        logical_step_scanlines: 8,
        physical_address_changes_during_native_motion: 0,
        release_frames: pickupReleaseRows.length,
        rapid_frames: pickupRapidRows.length,
        pickup_events: pickupCollectRows.length,
        passed: SPREAD_SHOT_BASELINE_WALL_CYCLES <= WEAPON_PICKUP_HARD_GATE_CYCLES &&
          SPREAD_SHOT_BASELINE_HEADROOM_CYCLES >= WEAPON_PICKUP_MINIMUM_HEADROOM_CYCLES,
      },
      weapon_pickup_spread_shot: {
        baseline_wall_cycles: SPREAD_SHOT_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: SPREAD_SHOT_BASELINE_HEADROOM_CYCLES,
        target_delta_cycles: SPREAD_SHOT_TARGET_DELTA_CYCLES,
        hard_delta_cycles: SPREAD_SHOT_HARD_DELTA_CYCLES,
        target_wall_cycles: SPREAD_SHOT_TARGET_GATE_CYCLES,
        maximum_wall_cycles: SPREAD_SHOT_HARD_GATE_CYCLES,
        minimum_physical_headroom: SPREAD_SHOT_MINIMUM_HEADROOM_CYCLES,
        measured_wall_cycles: heaviest.wall_cycles,
        measured_physical_headroom: PAL_FRAME_CYCLES - heaviest.wall_cycles,
        actual_delta_cycles: heaviest.wall_cycles - SPREAD_SHOT_BASELINE_WALL_CYCLES,
        remaining_target_cycles: SPREAD_SHOT_TARGET_GATE_CYCLES - heaviest.wall_cycles,
        remaining_hard_cycles: SPREAD_SHOT_HARD_GATE_CYCLES - heaviest.wall_cycles,
        target_overrun_frames: spreadShotTargetOverruns.length,
        hard_overrun_frames: spreadShotHardOverruns.length,
        rapid_frames: pickupRapidRows.length,
        spread_frames: pickupSpreadRows.length,
        pickup_events: pickupCollectRows.length,
        created_capsule_render_ids: pickupCreatedRenderIds,
        collected_states: pickupCollectRows.map((row) => row.pickup_state),
        spread_volley_frames: spreadVolleyRows.length,
        active_capsule_three_projectile_frames: activeCapsuleThreeProjectileRows.length,
        active_capsule_during_booster_frames: activeCapsuleDuringBoosterRows.length,
        worst_legal_capsule_three_projectiles: frameState(capsuleTripleHeaviest),
        passed: heaviest.wall_cycles <= SPREAD_SHOT_HARD_GATE_CYCLES &&
          PAL_FRAME_CYCLES - heaviest.wall_cycles >= SPREAD_SHOT_MINIMUM_HEADROOM_CYCLES &&
          spreadShotHardOverruns.length === 0 && deadlineOverruns.length === 0,
      },
      memory_integrity: {
        xex_frames: integrityByMedium.XEX.length,
        atr_frames: integrityByMedium.ATR.length,
        duration_seconds_pal_per_artifact: 120,
        pickup_rf_cycles: integrityCollections.length,
        dli_sequence_violations: dliSequenceViolations,
        maximum_dlis_per_host_frame: maximumDlisPerHostFrame,
        pause_sessions: [...new Set(integrityPauseRows.map((row) => row.session))].map((session) => {
          const row = integrityPauseRows.find((candidate) => candidate.session === session);
          return {
            session,
            timer_before: row.pause_timer_before,
            timer_after: row.pause_timer_after,
            engine_timer_before: row.pause_engine_timer_before,
            engine_timer_after: row.pause_engine_timer_after,
            engine_phase_before: row.pause_engine_phase_before,
            engine_phase_after: row.pause_engine_phase_after,
            paused_host_frames: row.pause_host_frames,
          };
        }),
        xex_atr_state_parity: true,
        passed: dliSequenceViolations === 0 && maximumDlisPerHostFrame === 2,
      },
      capital_engine_regression: {
        sessions: engineSessionEvidence,
        restart_sessions: engineRestartEvidence,
        evidence: engineRuntimeEvidence,
        measured_frames: engineRows.length,
        restart_measured_frames: engineRestartRows.length,
        active_frames_per_phase: 8,
        full_cycle_frames: 16,
        full_cycle_hz_pal: 3.125,
        startup_phase: 0,
        phase_count: 2,
        first_dli_selects_active_list_offset: 3,
        screenshots_per_session: 150,
        passed: true,
      },
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
      passed: heaviest.wall_cycles <= SPREAD_SHOT_HARD_GATE_CYCLES &&
        PAL_FRAME_CYCLES - heaviest.wall_cycles >=
          SPREAD_SHOT_MINIMUM_HEADROOM_CYCLES &&
        spreadShotHardOverruns.length === 0 && deadlineOverruns.length === 0 &&
        allRows.every((row) => row.extra_vbi_boundaries === 0) &&
        dliSequenceViolations === 0 && maximumDlisPerHostFrame === 2,
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
      parallax_cadence_measured_frames: cadenceRows.length,
      fighter_flash_measured_frames: fighterFlashRows.length,
      debris_effects_measured_frames: debrisEffectsRows.length,
      weapon_pickup_measured_frames: weaponPickupRows.length,
      memory_integrity_measured_frames: memoryIntegrityRows.length,
      engine_startup_measured_frames: engineRows.length,
      engine_restart_measured_frames: engineRestartRows.length,
      input: "production frontend/options handlers followed by deterministic held-FIRE neutral/sweep/evasive/hunt joystick policies",
      sessions: summaries,
      baseline_heaviest: frameState(baselineHeaviest),
      targeted_reference_heaviest: frameState(targetedReferenceHeaviest),
      targeted_heaviest: frameState(targetedHeaviest),
    },
    coverage: {
      world_near_with_far_erase: coverageRecord(allRows,
        (row) => (row.events & (1 << 0)) !== 0 && (row.events & (1 << 1)) !== 0 &&
          (row.events & (1 << 10)) !== 0 && (row.events & (1 << 11)) !== 0),
      hull_event: coverageRecord(allRows, (row) => (row.events & (1 << 2)) !== 0),
      active_muzzles: coverageRecord(allRows, (row) => row.active_muzzles > 0),
      maximum_projectile_pool: {
        scope: "combined active Viper and Raider fighter-projectile slots in legal Atari800 replays",
        combined_physical_capacity: 19,
        maximum_combined_active_observed:
          Math.max(...allRows.map((row) => row.projectiles)),
        full_combined_capacity_observed:
          allRows.some((row) => row.projectiles === 19),
        full_combined_capacity_matching_frames:
          allRows.filter((row) => row.projectiles === 19).length,
        heaviest_at_full_combined_capacity:
          allRows.some((row) => row.projectiles === 19)
            ? frameState(maximumRow(allRows.filter((row) => row.projectiles === 19),
              (row) => row.wall_cycles))
            : null,
        component_physical_capacities: {
          viper: 10,
          raider: 9,
        },
        evidence_note: "The combined capacity is a physical allocation. This report records 18 as the maximum naturally observed combined active count and does not claim an unobserved 19/19 state.",
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
      debris_empty_path: coverageRecord(allRows, (row) => row.entity_active === 0 &&
        (row.events & (1 << 7)) === 0),
      debris_one_active: coverageRecord(allRows, (row) =>
        (row.entity_active_mask & 1) !== 0),
      debris_spawn: coverageRecord(allRows, (row) => (row.events & (1 << 7)) !== 0),
      debris_contact: coverageRecord(allRows, (row) => (row.events & (1 << 8)) !== 0),
      debris_despawn: coverageRecord(allRows, (row) => (row.events & (1 << 9)) !== 0),
      debris_shot: coverageRecord(allRows, (row) => (row.events & (1 << 12)) !== 0),
      debris_destruction_effects: {
        ...coverageRecord(fullEffectRows, () => true),
        spawner_frames: effectSpawnRows.length,
        active_frames: fullEffectRows.length,
        active_mask: 0x1f,
        active_count: 5,
        spawn_updated_and_rendered: effectSpawnRows.every((row) =>
          (row.events & ((1 << 15) | (1 << 16))) === ((1 << 15) | (1 << 16))),
        following_frame_erase_observed: fullEffectRows.some((row) =>
          (row.events & (1 << 14)) !== 0),
        post_capital_spawn_observed: effectSpawnRows.some((row) => row.sector_state === 7),
      },
      raider_breakup_effects: {
        ...coverageRecord(raiderBreakupRows, () => true),
        spawner_frames: raiderBreakupRows.length,
        active_mask: 0x1f,
        active_count: 5,
        spawn_updated_and_rendered: raiderBreakupRows.every((row) =>
          (row.events & ((1 << 15) | (1 << 16))) === ((1 << 15) | (1 << 16))),
        full_screen_flash_preserved: raiderFlashPairs.length > 0,
        yellow_death_then_red_materialisation_frames: raiderFlashPairs.length,
      },
      weapon_pickup_rapid_fire: {
        qualified_kills: pickupQualifiedKillRows.map((row) => frameState(row)),
        pending: coverageRecord(pickupPendingRows, () => true),
        active: coverageRecord(pickupActiveRows, () => true),
        collected: pickupCollectRows.map((row) => frameState(row)),
        rapid: coverageRecord(pickupRapidRows, () => true),
        screenshot: {
          path: path.relative(rootDirectory, pickupScreenshotPath),
          bytes: fs.statSync(pickupScreenshotPath).size,
          sha256: sha256(fs.readFileSync(pickupScreenshotPath)),
          capture_frame: pickupScreenshotRow.frame,
          capture_host_frame: pickupScreenshotRow.end_host_frame,
          capture_state: frameState(pickupScreenshotRow),
          first_visible_frame: pickupActiveRows.find((row) =>
            (row.pickup_drawn_mask & 15) === 15 && row.effect_active_count === 0)?.frame,
        },
        yellow_projectiles: {
          ...coverageRecord(rapidProjectileRows, () => true),
          viper_screen_code_frames: rapidProjectileVisibleRows.length,
          other_code_or_occluded_frames:
            rapidProjectileRows.length - rapidProjectileVisibleRows.length,
          viper_screen_code_percent:
            Math.round(rapidProjectileVisibleRows.length * 10_000 /
              rapidProjectileRows.length) / 100,
          screen_code_minimum: Math.min(...rapidProjectileVisibleRows.map((row) =>
            row.rapid_projectile_screen_code)),
          screen_code_maximum: Math.max(...rapidProjectileVisibleRows.map((row) =>
            row.rapid_projectile_screen_code)),
          all_screen_codes_select_colpf2: rapidProjectileVisibleRows.every((row) =>
            (row.rapid_projectile_screen_code & 0x80) === 0),
          colour_register: "COLPF2",
          colour_value: 0x1e,
          screenshot: {
            path: path.relative(rootDirectory, rapidScreenshotPath),
            bytes: fs.statSync(rapidScreenshotPath).size,
            sha256: sha256(fs.readFileSync(rapidScreenshotPath)),
            capture_frame: rapidScreenshotRow.frame,
            capture_host_frame: rapidScreenshotRow.end_host_frame,
            capture_state: frameState(rapidScreenshotRow),
          },
        },
      },
      weapon_pickup_spread_shot: {
        collected_states: pickupCollectRows.map((row) => row.pickup_state),
        spread: coverageRecord(pickupSpreadRows, () => true),
        logical_three_projectile_volley: coverageRecord(spreadVolleyRows, () => true),
        screenshot: {
          path: path.relative(rootDirectory, spreadScreenshotPath),
          bytes: fs.statSync(spreadScreenshotPath).size,
          sha256: sha256(fs.readFileSync(spreadScreenshotPath)),
          capture_frame: spreadScreenshotRow.frame,
          capture_host_frame: spreadScreenshotRow.end_host_frame,
          capture_state: frameState(spreadScreenshotRow),
        },
        active_capsule_with_three_viper_projectiles:
          coverageRecord(activeCapsuleThreeProjectileRows, () => true),
        active_capsule_during_booster:
          coverageRecord(activeCapsuleDuringBoosterRows, () => true),
        worst_legal_capsule_three_projectiles: frameState(capsuleTripleHeaviest),
      },
      debris_shot_post_capital: coverageRecord(allRows, (row) =>
        row.sector_state === 7 && (row.events & (1 << 12)) !== 0),
      debris_bottom_despawn: coverageRecord(allRows, (row) =>
        (row.events & (1 << 9)) !== 0 &&
          (row.events & ((1 << 8) | (1 << 12))) === 0),
      debris_post_capital_sector: coverageRecord(allRows, (row) =>
        row.sector_state === 7 && (row.entity_active_mask & 1) !== 0),
      post_capital_transition: postCapitalTransition,
      parallax_cadence: parallaxCadence,
      debris_vertical_cadence: {
        observed: verticalCadence.invalid_transitions === 0,
        ...verticalCadence,
      },
      debris_visual_variants: {
        observed: observedVariants.length === 2,
        values: observedVariants,
      },
      debris_tumbling_phases: {
        observed: observedPhases.length === 2,
        values: observedPhases,
      },
      debris_trajectories: {
        observed: observedTrajectories.length === 3,
        vx_signed_hpos: observedTrajectories,
      },
      fighter_colour_flash: flashRegisterCoverage,
    },
    ten_heaviest_frames_in_9040_replay: topTenBaseline,
    five_heaviest_frames_scope: "all measured legal runtime replays",
    five_heaviest_frames: topFiveAll.map((frame) => ({
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
