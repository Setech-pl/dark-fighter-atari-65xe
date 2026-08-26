import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAtr, parseXex } from "./formats.mjs";
import { Nmos6502 } from "./nmos6502.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDirectory, "..");

function labelsFromFile(sourcePath) {
  return new Map(fs.readFileSync(sourcePath, "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]));
}

function requiredLabel(labels, name) {
  const address = labels.get(name);
  if (!Number.isInteger(address)) throw new Error(`Missing linked label ${name}`);
  return address;
}

function fixedStateAddress(labels, name) {
  const linked = labels.get(name);
  if (Number.isInteger(linked)) return linked;
  if (name === "BROAD_PLAYER_HEALTH") return 0x4e5d;
  if (name === "PLAYER_LIVES") return 0x4eab;
  throw new Error(`Missing linked state address ${name}`);
}

function runRoutine(memory, labels, name, { a = 0, x = 0, y = 0 } = {}) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = requiredLabel(labels, name);
  cpu.a = a;
  cpu.x = x;
  cpu.y = y;
  for (let steps = 0; steps < 400_000 && cpu.pc !== stop; steps += 1) cpu.step();
  if (cpu.pc !== stop) throw new Error(`${name} did not return`);
  return cpu.cycles;
}

function physicalGameplayAddress(memory, labels, row, column) {
  if (row === 0) return 0x4028 + column;
  const index = row - 1;
  return (memory[requiredLabel(labels, "PLAYFIELD_ROW_LO") + index] |
    memory[requiredLabel(labels, "PLAYFIELD_ROW_HI") + index] << 8) + column;
}

function drawRuntimeHullScene(memory, labels, { head, topPhase }) {
  initialiseRows(memory, labels, head);
  memory.fill(0, 0x4028, 0x4400);
  const dst = requiredLabel(labels, "dst_ptr");
  const phase = requiredLabel(labels, "corridor_phase");
  for (let row = 0; row < 23; row += 1) {
    const address = physicalGameplayAddress(memory, labels, row, 0);
    memory[dst] = address & 0xff;
    memory[dst + 1] = address >> 8;
    memory[phase] = (topPhase - row) & 0xff;
    runRoutine(memory, labels, "draw_hull_row");
  }
}

function loadPayload(root, artifact, manifest) {
  if (artifact === "xex") {
    return parseXex(fs.readFileSync(path.join(root, "dist", "dark-fighter.xex"))).segments[0];
  }
  if (artifact === "atr") {
    return {
      start: manifest.loadAddress,
      data: parseAtr(fs.readFileSync(path.join(root, "dist", "dark-fighter.atr")))
        .body.subarray(0, manifest.payloadBytes),
    };
  }
  throw new Error(`Unknown weapon-pickup trace artifact ${artifact}`);
}

function initialiseRows(memory, labels, head = 0) {
  const lo = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const hi = requiredLabel(labels, "PLAYFIELD_ROW_HI");
  for (let logical = 0; logical < 22; logical += 1) {
    const physical = (head + logical) % 22;
    const address = 0x4050 + physical * 40;
    memory[lo + logical] = address & 0xff;
    memory[hi + logical] = address >> 8;
  }
}

function logicalScreen(memory, labels) {
  const lo = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const hi = requiredLabel(labels, "PLAYFIELD_ROW_HI");
  const screen = new Uint8Array(22 * 40);
  for (let row = 0; row < 22; row += 1) {
    const address = memory[lo + row] | memory[hi + row] << 8;
    screen.set(memory.subarray(address, address + 40), row * 40);
  }
  return screen;
}

function logicalDisplay(memory, labels) {
  const display = new Uint8Array(24 * 40);
  display.set(memory.subarray(0x4000, 0x4050));
  display.set(logicalScreen(memory, labels), 80);
  return display;
}

function initialiseRuntime(root, artifact) {
  const manifest = JSON.parse(fs.readFileSync(
    path.join(root, "dist", "dark-fighter-manifest.json"), "utf8"));
  const labels = labelsFromFile(path.join(root, "build", "dark-fighter.lbl"));
  const memory = new Uint8Array(0x10000);
  const payload = loadPayload(root, artifact, manifest);
  memory.set(payload.data, payload.start);
  for (const routine of [
    "stage_boot_streams", "unpack_boot_broadside_runtime", "unpack_resident_runtime",
    "unpack_entity_runtime", "init_entity_effects", "stage_a2_kernel",
    "unpack_starfield_runtime", "copy_charset", "init_fighter_projectiles",
    "install_entity_effects_glyph",
  ]) runRoutine(memory, labels, routine);
  initialiseRows(memory, labels);
  memory.fill(0, 0x3800, 0x4400);
  memory[requiredLabel(labels, "ENTITY_SPAWN_TIMER_LO")] = 0xff;
  memory[requiredLabel(labels, "player_x")] = 196;
  memory[requiredLabel(labels, "player_y")] = 184;
  memory[requiredLabel(labels, "PLAYER_LIFECYCLE")] = 0;
  memory[fixedStateAddress(labels, "BROAD_PLAYER_HEALTH")] = 10;
  memory[fixedStateAddress(labels, "PLAYER_LIVES")] = 3;
  memory[requiredLabel(labels, "gameplay_fire_gate")] = 1;
  memory[0xd010] = 1;
  return { memory, labels, manifest };
}

function countActive(memory, address, slots) {
  let count = 0;
  for (let slot = 0; slot < slots; slot += 1) if (memory[address + slot] !== 0) count += 1;
  return count;
}

function pickupSnapshot(memory, labels, manifest, fields = {}) {
  const slot = 1;
  const stateAddress = requiredLabel(labels, "ENTITY_STATE") + slot;
  const capsuleState = memory[stateAddress];
  const boosterState = memory[stateAddress + 1];
  const state = capsuleState === 0 ? boosterState : capsuleState;
  const screenAddress = memory[requiredLabel(labels, "ENTITY_SCREEN_LO") + slot] |
    memory[requiredLabel(labels, "ENTITY_SCREEN_HI") + slot] << 8;
  // The resident pickup follows the A2 ring without remapping its physical
  // cells. VX/VY are the authoritative saved bottom-row pointer; deriving it
  // from the advanced logical Y would inspect a different physical row.
  const bottomScreenAddress = screenAddress === 0 ? 0 :
    memory[requiredLabel(labels, "ENTITY_VX") + slot] |
    memory[requiredLabel(labels, "ENTITY_VY") + slot] << 8;
  const timerLow = memory[requiredLabel(labels, "ENTITY_TIMER") +
    (boosterState === 0 ? slot : 2)];
  const timerHigh = memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2];
  const timer = boosterState >= 3 ? timerLow | timerHigh << 8 : timerLow;
  const pickupSlotValue = memory[requiredLabel(labels, "ENTITY_HP") + slot];
  const boosterSlotValue = memory[requiredLabel(labels, "ENTITY_HP") + 2];
  const slotValue = boosterState === 0 ? pickupSlotValue : boosterSlotValue;
  const pickupType = memory[requiredLabel(labels, "ENTITY_TYPE") + slot];
  const nextPickupType = memory[requiredLabel(labels, "ENTITY_TYPE") + 2];
  const subsecond = memory[requiredLabel(labels, "ENTITY_OWNER") +
    (boosterState === 0 ? slot : 2)];
  const hudOffset = labels.get("HUD_RF_OFFSET") ?? 32;
  const screenBase = labels.get("SCREEN") ?? 0x4000;
  const hudCodes = Array.from(memory.subarray(screenBase + hudOffset, screenBase + hudOffset + 4));
  return {
    phase: fields.phase ?? "",
    frame: fields.frame ?? 0,
    kill: fields.kill ?? "",
    damageSource: fields.damageSource ?? "",
    projectileConsumed: fields.projectileConsumed ?? false,
    slotValue,
    qualifiedKillCounter: capsuleState === 0 ? pickupSlotValue : 0,
    rapidSeconds: boosterState === 3 ? boosterSlotValue - 16 : 0,
    spreadSeconds: boosterState === 4 ? boosterSlotValue - 16 : 0,
    capsuleState,
    boosterState,
    pickupType,
    nextPickupType,
    state,
    activeMask: memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")],
    activeCount: memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")],
    x: memory[requiredLabel(labels, "ENTITY_X") + slot],
    y: memory[requiredLabel(labels, "ENTITY_Y") + slot],
    timer,
    timerLow,
    timerHigh,
    subsecond,
    animationFrame: subsecond,
    hudCodes,
    renderId: memory[requiredLabel(labels, "ENTITY_RENDER_ID") + slot],
    a2Head: ((memory[requiredLabel(labels, "PLAYFIELD_ROW_LO")] |
      memory[requiredLabel(labels, "PLAYFIELD_ROW_HI")] << 8) - 0x4050) / 40,
    screenAddress,
    bottomScreenAddress,
    leftCode: screenAddress === 0 ? 0 : memory[screenAddress],
    rightCode: screenAddress === 0 ? 0 : memory[screenAddress + 1],
    bottomLeftCode: bottomScreenAddress === 0 ? 0 : memory[bottomScreenAddress],
    bottomRightCode: bottomScreenAddress === 0 ? 0 : memory[bottomScreenAddress + 1],
    backing: [0, 1, 2, 3].map((index) =>
      memory[requiredLabel(labels, `ENTITY_BACKING${index}`) + slot]),
    drawnMask: memory[requiredLabel(labels, "ENTITY_DRAWN_MASK") + slot],
    effectActiveMask: memory[requiredLabel(labels, "EFFECT_ACTIVE_MASK")],
    effectActiveCount: memory[requiredLabel(labels, "EFFECT_ACTIVE_COUNT")],
    projectileActiveCount: countActive(memory,
      requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE"), 10),
    burstState: memory[requiredLabel(labels, "VIPER_BURST_STATE")],
    burstRemaining: memory[requiredLabel(labels, "VIPER_BURST_REMAINING")],
    burstTimer: memory[requiredLabel(labels, "VIPER_BURST_TIMER")],
    scoreLo: memory[requiredLabel(labels, "score_bcd_lo")],
    scoreHi: memory[requiredLabel(labels, "score_bcd_hi")],
    playerHealth: memory[fixedStateAddress(labels, "BROAD_PLAYER_HEALTH")],
    playerLives: memory[fixedStateAddress(labels, "PLAYER_LIVES")],
    glyphBase: manifest.entityEffects.weaponPickupGlyphIndex,
    screen: logicalScreen(memory, labels),
    display: logicalDisplay(memory, labels),
  };
}

function armLethalViperShot(memory, labels, y = 109) {
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  memory[active] = 1;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_X")] = 127;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_Y")] = y;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y")] = y;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME")] = 10;
}

function killRaiderWithViper(memory, labels) {
  memory[requiredLabel(labels, "ENEMY_ARCHETYPE")] = 0;
  memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 1;
  memory[requiredLabel(labels, "ENEMY_HP")] = 1;
  memory[requiredLabel(labels, "ENEMY_PENDING_DAMAGE")] = 0;
  memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE")] = 5;
  memory[requiredLabel(labels, "enemy_x")] = 124;
  memory[requiredLabel(labels, "enemy_y")] = 40;
  armLethalViperShot(memory, labels, 54);
  runRoutine(memory, labels, "update_fighter_projectiles");
  const damageSource = memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE")];
  const projectileConsumed = memory[requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE")] === 0;
  runRoutine(memory, labels, "resolve_enemy_damage");
  return { damageSource, projectileConsumed };
}

function runBurst(memory, labels, { rapid, onFrame = () => {} }) {
  runRoutine(memory, labels, "clear_viper_projectiles");
  const boosterState = memory[requiredLabel(labels, "ENTITY_STATE") + 2];
  if (rapid && boosterState !== 3) throw new Error("Rapid burst requires collected runtime state");
  if (!rapid) memory[requiredLabel(labels, "ENTITY_STATE") + 2] = 0;
  memory[0xd010] = 0;
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const emissions = [];
  let previousCount = 0;
  for (let frame = 0; frame < 48 && emissions.length < 10; frame += 1) {
    runRoutine(memory, labels, "update_viper_weapon");
    const currentCount = countActive(memory, active, 10);
    if (currentCount > previousCount) emissions.push(frame);
    previousCount = currentCount;
    if (rapid) runRoutine(memory, labels, "update_weapon_booster_active", { x: 3 });
    onFrame({ frame, emitted: emissions.at(-1) === frame });
  }
  memory[0xd010] = 1;
  return emissions;
}

export function executeWeaponPickupTrace({
  root = defaultRoot, artifact = "xex", head = 0, coexistDebris = false,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  initialiseRows(memory, labels, head);
  memory[requiredLabel(labels, "score_bcd_lo")] = 0;
  memory[requiredLabel(labels, "score_bcd_hi")] = 0;
  const records = [];

  for (let kill = 1; kill <= 3; kill += 1) {
    const result = killRaiderWithViper(memory, labels);
    records.push(pickupSnapshot(memory, labels, manifest, {
      phase: `KILL_${kill}`, frame: 0, kill,
      damageSource: result.damageSource, projectileConsumed: result.projectileConsumed,
    }));
    memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = 0;
    runRoutine(memory, labels, "entity_effects_update");
    if (kill === 3 && coexistDebris) runRoutine(memory, labels, "entity_spawn_debris");
  }

  let worldAccumulator = 0;
  // STAR_NEAR_PHASE is the second byte after exported ENEMY_PENDING_SOURCE:
  // GAMEPLAY_RESIDENT_END/STAR_RNG_STATE occupies the first byte.
  const nearPhaseAddress = requiredLabel(labels, "ENEMY_PENDING_SOURCE") + 2;
  let nearPhase = memory[nearPhaseAddress];
  const stepWorld = () => {
    worldAccumulator += 9;
    if (worldAccumulator < 20) return 0;
    worldAccumulator -= 20;
    return 1;
  };
  const publishWorldStep = (event) => {
    if (event !== 0) nearPhase = (nearPhase + 1) & 1;
    memory[nearPhaseAddress] = nearPhase;
    memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = event;
  };
  for (let frame = 0; frame < 30; frame += 1) {
    runRoutine(memory, labels, "entity_effects_erase");
    publishWorldStep(stepWorld());
    runRoutine(memory, labels, "entity_effects_update");
    runRoutine(memory, labels, "entity_effects_render");
    records.push(pickupSnapshot(memory, labels, manifest, { phase: "PENDING", frame }));
  }

  // Forty consecutive ACTIVE frames retain the original review duration. The
  // deterministic Raider is destroyed near the safe top, so native A2 motion
  // remains visible without reaching the despawn boundary before collection.
  for (let frame = 0; frame < 40; frame += 1) {
    runRoutine(memory, labels, "entity_effects_erase");
    publishWorldStep(stepWorld());
    runRoutine(memory, labels, "entity_effects_update");
    runRoutine(memory, labels, "entity_effects_render");
    records.push(pickupSnapshot(memory, labels, manifest, { phase: "ACTIVE", frame }));
  }

  const pickupX = memory[requiredLabel(labels, "ENTITY_X") + 1];
  const pickupY = memory[requiredLabel(labels, "ENTITY_Y") + 1];
  armLethalViperShot(memory, labels);
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_X")] = pickupX;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_Y")] = pickupY + 6;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y")] = pickupY + 6;
  memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 0;
  runRoutine(memory, labels, "update_fighter_projectiles");
  records.push(pickupSnapshot(memory, labels, manifest,
    { phase: "PROJECTILE_IGNORED", frame: 0 }));
  runRoutine(memory, labels, "clear_viper_projectiles");
  runRoutine(memory, labels, "entity_effects_erase");
  memory[requiredLabel(labels, "player_x")] = pickupX;
  memory[requiredLabel(labels, "player_y")] = pickupY;
  memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = 0;
  runRoutine(memory, labels, "entity_effects_update");
  runRoutine(memory, labels, "entity_effects_render");
  records.push(pickupSnapshot(memory, labels, manifest, { phase: "PICKUP", frame: 0 }));

  const rapidTimerFrames = [];
  const rapidBurstFrames = runBurst(memory, labels, {
    rapid: true,
    onFrame: ({ frame, emitted }) => rapidTimerFrames.push(pickupSnapshot(
      memory, labels, manifest, { phase: "RAPID_TIMER", frame, projectileConsumed: emitted })),
  });
  const rapidAfterBurst = pickupSnapshot(memory, labels, manifest,
    { phase: "RAPID_BURST", frame: rapidBurstFrames.at(-1) });
  records.push(rapidAfterBurst);
  const frozenTimer = rapidAfterBurst.timer;
  const pauseFrames = [];
  for (let frame = 0; frame < 10; frame += 1) {
    pauseFrames.push(pickupSnapshot(memory, labels, manifest, { phase: "PAUSE", frame }));
  }
  records.push(pauseFrames.at(-1));
  let activeRapidFrames = rapidBurstFrames.at(-1) + 1;
  while (memory[requiredLabel(labels, "ENTITY_STATE") + 2] === 3) {
    runRoutine(memory, labels, "update_weapon_booster_active", { x: 3 });
    rapidTimerFrames.push(pickupSnapshot(memory, labels, manifest,
      { phase: "RAPID_TIMER", frame: activeRapidFrames }));
    activeRapidFrames += 1;
  }
  records.push(pickupSnapshot(memory, labels, manifest,
    { phase: "EXPIRED", frame: activeRapidFrames }));

  const normal = initialiseRuntime(root, artifact);
  const normalBurstFrames = runBurst(normal.memory, normal.labels, { rapid: false });

  return {
    artifact,
    head,
    records,
    normalBurstFrames,
    rapidBurstFrames,
    rapidTimerFrames,
    pauseFrames,
    frozenTimer,
    activeRapidFrames,
    charset: Uint8Array.from(memory.subarray(0x4400, 0x4800)),
    manifest,
  };
}

export function executeViperProjectileColourTrace({
  root = defaultRoot, artifact = "xex",
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const xAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const yAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const previousYAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
  const lifetimeAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const screenLow = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHigh = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  const setProjectile = (slot, x) => {
    memory[xAddress + slot] = x;
    memory[yAddress + slot] = 100;
    memory[previousYAddress + slot] = 100;
    memory[lifetimeAddress + slot] = 10;
  };

  runRoutine(memory, labels, "allocate_viper_projectile");
  const normalAtSpawn = memory[active];
  setProjectile(0, 100);
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const normalDisplay = logicalDisplay(memory, labels);
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");
  runRoutine(memory, labels, "weapon_pickup_collect");
  const rapidTimerAtSpawn = memory[requiredLabel(labels, "ENTITY_TIMER") + 2] |
    memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2] << 8;
  const normalAfterPickup = memory[active];
  const hudDuringRapid = Array.from(memory.subarray(0x4000 + 32, 0x4000 + 36));
  runRoutine(memory, labels, "allocate_viper_projectile");
  const rapidAtSpawn = memory[active + 1];
  setProjectile(0, 100);
  setProjectile(1, 112);
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const rapidDisplay = logicalDisplay(memory, labels);
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");

  memory[requiredLabel(labels, "ENTITY_TIMER") + 2] = 1;
  memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2] = 0;
  memory[requiredLabel(labels, "ENTITY_OWNER") + 2] = 1;
  memory[requiredLabel(labels, "ENTITY_HP") + 2] = 17;
  runRoutine(memory, labels, "update_weapon_booster_active", { x: 3 });
  const rapidAfterExpiry = memory[active + 1];
  runRoutine(memory, labels, "allocate_viper_projectile");
  const normalAfterExpiry = memory[active + 2];

  for (let slot = 0; slot < 3; slot += 1) setProjectile(slot, 100 + slot * 12);
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const rendered = Array.from({ length: 3 }, (_, slot) => {
    const address = memory[screenLow + slot] | memory[screenHigh + slot] << 8;
    const code = memory[address];
    const glyphCode = code & 0x7f;
    const glyphBytes = Array.from(memory.subarray(0x4400 + glyphCode * 8,
      0x4400 + glyphCode * 8 + 8));
    return {
      slot,
      address,
      activeRenderId: memory[active + slot],
      screenCodeBefore: memory[requiredLabel(labels, "FIGHTER_PROJECTILE_BACKUP_TOP") + slot],
      code,
      screenCodeAfter: memory[address],
      glyphCode,
      inverse: code >> 7,
      glyphBytes,
      pixelPairs: glyphBytes.map((byte) =>
        [6, 4, 2, 0].map((shift) => byte >> shift & 3)),
    };
  });
  return {
    artifact,
    normalAtSpawn,
    normalAfterPickup,
    rapidAtSpawn,
    rapidAfterExpiry,
    normalAfterExpiry,
    rapidTimerAtSpawn,
    a2Head: ((memory[requiredLabel(labels, "PLAYFIELD_ROW_LO")] |
      memory[requiredLabel(labels, "PLAYFIELD_ROW_HI")] << 8) - 0x4050) / 40,
    rendered,
    normalDisplay: Array.from(normalDisplay),
    rapidDisplay: Array.from(rapidDisplay),
    screen: logicalScreen(memory, labels),
    display: logicalDisplay(memory, labels),
    charset: Array.from(memory.subarray(0x4400, 0x4800)),
    hudDuringRapid,
    normalColour: manifest.fighterWeapons.viper.colourValue,
    rapidColour: manifest.fighterWeapons.viper.rapidFireColourValue,
  };
}

export function executeWeaponPickupBackingTrace({
  root = defaultRoot, artifact = "xex", head = 0, pickupType = "rapid",
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  initialiseRows(memory, labels, head);
  const slot = 1;
  if (pickupType !== "rapid" && pickupType !== "spread") {
    throw new Error(`Unknown weapon pickup type ${pickupType}`);
  }
  const renderId = pickupType === "rapid" ?
    manifest.entityEffects.weaponPickupGlyphIndex :
    manifest.entityEffects.spreadPickupGlyphIndex | 0x80;
  memory[requiredLabel(labels, "ENTITY_STATE") + slot] = 2;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 2;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")] = 1;
  memory[requiredLabel(labels, "ENTITY_X") + slot] = 112;
  memory[requiredLabel(labels, "ENTITY_Y") + slot] = 104;
  memory[requiredLabel(labels, "ENTITY_RENDER_ID") + slot] = renderId;

  const rowLow = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const rowHigh = requiredLabel(labels, "PLAYFIELD_ROW_HI");
  const logicalTopRow = Math.floor((104 - 24 + 4) / 8);
  const column = Math.floor((112 - 48 + 2) / 4);
  const addressForRow = (logicalRow) =>
    (memory[rowLow + logicalRow] | memory[rowHigh + logicalRow] << 8) + column;
  const top = addressForRow(logicalTopRow);
  const bottom = addressForRow(logicalTopRow + 1);
  const original = [0x0a, 0x1b, 0x2c, 0x3d];
  memory[top] = original[0];
  memory[top + 1] = original[1];
  memory[bottom] = original[2];
  memory[bottom + 1] = original[3];

  runRoutine(memory, labels, "render_interactive_entity_overlays");
  const rendered = pickupSnapshot(memory, labels, manifest, { phase: "BACKED", frame: 0 });
  runRoutine(memory, labels, "weapon_pickup_release_active_mask");
  return {
    artifact,
    head,
    top,
    bottom,
    original,
    rendered,
    restored: [memory[top], memory[top + 1], memory[bottom], memory[bottom + 1]],
    drawnMaskAfterErase: memory[requiredLabel(labels, "ENTITY_DRAWN_MASK") + slot],
    renderedMaskAfterErase: memory[requiredLabel(labels, "ENTITY_RENDERED_MASK")],
    topLatchAfterErase: memory[requiredLabel(labels, "ENTITY_SCREEN_HI") + slot],
  };
}

export function executeWeaponPickupCollisionTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const cases = [
    ["top_left", 112, 104, true],
    ["bottom_right_inside", 119, 119, true],
    ["player_left_overlap", 105, 104, true],
    ["left_outside", 104, 104, false],
    ["right_outside", 120, 104, false],
    ["above_overlap", 112, 90, true],
    ["above_outside", 112, 89, false],
    ["below_outside", 112, 120, false],
  ];
  return cases.map(([name, playerX, playerY, hit]) => {
    const { memory, labels, manifest } = initialiseRuntime(root, artifact);
    const slot = 1;
    memory[requiredLabel(labels, "ENTITY_STATE") + slot] = 2;
    memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 2;
    memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")] = 1;
    memory[requiredLabel(labels, "ENTITY_X") + slot] = 112;
    memory[requiredLabel(labels, "ENTITY_Y") + slot] = 104;
    memory[requiredLabel(labels, "player_x")] = playerX;
    memory[requiredLabel(labels, "player_y")] = playerY;
    runRoutine(memory, labels, "weapon_pickup_collide_player");
    const snapshot = pickupSnapshot(memory, labels, manifest, { phase: name, frame: 0 });
    return { name, playerX, playerY, expectedHit: hit, collected: snapshot.state >= 3, snapshot };
  });
}

export function executeWeaponPickupCauseTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const results = [];
  for (const source of [1, 2, 3, 4, 5]) {
    const { memory, labels, manifest } = initialiseRuntime(root, artifact);
    memory[requiredLabel(labels, "ENTITY_HP") + 1] = 1;
    memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 1;
    memory[requiredLabel(labels, "ENEMY_ARCHETYPE")] = 0;
    memory[requiredLabel(labels, "ENEMY_HP")] = 1;
    memory[requiredLabel(labels, "ENEMY_PENDING_DAMAGE")] = 1;
    memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE")] = source;
    memory[requiredLabel(labels, "enemy_x")] = 124;
    memory[requiredLabel(labels, "enemy_y")] = 95;
    runRoutine(memory, labels, "resolve_enemy_damage");
    const first = pickupSnapshot(memory, labels, manifest,
      { phase: "CAUSE", frame: 0, damageSource: source });
    runRoutine(memory, labels, "resolve_enemy_damage");
    const second = pickupSnapshot(memory, labels, manifest,
      { phase: "CAUSE_REPEAT", frame: 1, damageSource: source });
    results.push({ source, first, second });
  }
  return results;
}

export function executeWeaponPickupLifecycleTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const runCase = (name, state, routines, { active = false, counter = 0, lifecycle = 0 } = {}) => {
    const { memory, labels, manifest } = initialiseRuntime(root, artifact);
    const controllerSlot = state >= 3 ? 2 : 1;
    memory[requiredLabel(labels, "ENTITY_STATE") + controllerSlot] = state;
    memory[requiredLabel(labels, "ENTITY_HP") + controllerSlot] = state >= 3 ? 26 : counter;
    memory[requiredLabel(labels, "ENTITY_TIMER") + controllerSlot] = 0xf4;
    memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + controllerSlot] = 1;
    memory[requiredLabel(labels, "ENTITY_OWNER") + controllerSlot] = 50;
    memory[requiredLabel(labels, "PLAYER_LIFECYCLE")] = lifecycle;
    if (state >= 3) runRoutine(memory, labels, "show_weapon_booster_hud");
    if (active) {
      memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 2;
      memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")] = 1;
    }
    for (const routine of Array.isArray(routines) ? routines : [routines]) {
      runRoutine(memory, labels, routine);
    }
    return pickupSnapshot(memory, labels, manifest, { phase: name, frame: 0 });
  };
  return {
    newGame: runCase("NEW_GAME", 3, ["clear_screen", "init_entity_effects"], { counter: 2 }),
    lifeLoss: runCase("LIFE_LOSS", 3, "clear_transient_effects", { lifecycle: 1 }),
    gameOver: runCase("GAME_OVER", 2, "clear_transient_effects",
      { active: true, lifecycle: 1 }),
    sectorPending: runCase("SECTOR_PENDING", 1, "entity_begin_sector_complete"),
    sectorActive: runCase("SECTOR_ACTIVE", 2, "entity_begin_sector_complete", { active: true }),
    sectorRapid: runCase("SECTOR_RAPID", 3, "entity_begin_sector_complete"),
    newGameSpread: runCase("NEW_GAME_SPREAD", 4, ["clear_screen", "init_entity_effects"]),
    lifeLossSpread: runCase("LIFE_LOSS_SPREAD", 4, "clear_transient_effects", { lifecycle: 1 }),
    gameOverSpread: runCase("GAME_OVER_SPREAD", 4, "clear_transient_effects", { lifecycle: 1 }),
    sectorSpread: runCase("SECTOR_SPREAD", 4, "entity_begin_sector_complete"),
  };
}

function viperProjectileSnapshot(memory, labels, fields = {}) {
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const x = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const y = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const rendered = requiredLabel(labels, "FIGHTER_PROJECTILE_RENDERED");
  const screenLow = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHigh = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  return {
    ...fields,
    slots: Array.from({ length: 10 }, (_, slot) => ({
      slot,
      active: memory[active + slot],
      x: memory[x + slot],
      y: memory[y + slot],
      rendered: memory[rendered + slot],
      screenAddress: memory[screenLow + slot] | memory[screenHigh + slot] << 8,
    })),
    screen: logicalScreen(memory, labels),
    display: logicalDisplay(memory, labels),
  };
}

function advanceWeaponPickupToActive(memory, labels, frames = []) {
  for (let frame = 0; frame <= 30; frame += 1) {
    runRoutine(memory, labels, "entity_effects_erase");
    memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = 0;
    runRoutine(memory, labels, "entity_effects_update");
    runRoutine(memory, labels, "entity_effects_render");
    frames.push(frame);
  }
}

function collectVisibleWeaponPickup(memory, labels) {
  const slot = 1;
  memory[requiredLabel(labels, "player_x")] =
    memory[requiredLabel(labels, "ENTITY_X") + slot];
  memory[requiredLabel(labels, "player_y")] =
    memory[requiredLabel(labels, "ENTITY_Y") + slot];
  memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = 0;
  runRoutine(memory, labels, "entity_effects_update");
  memory[requiredLabel(labels, "player_x")] = 196;
  memory[requiredLabel(labels, "player_y")] = 184;
}

export function executeSpreadShotTrace({
  root = defaultRoot, artifact = "xex", head = 0,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  initialiseRows(memory, labels, head);
  const initialCharset = Uint8Array.from(memory.subarray(0x4400, 0x4800));
  const drops = [];
  const killRecords = [];
  const triggerDrop = (cycle) => {
    for (let kill = 1; kill <= 3; kill += 1) {
      const result = killRaiderWithViper(memory, labels);
      memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = 0;
      runRoutine(memory, labels, "entity_effects_update");
      killRecords.push(pickupSnapshot(memory, labels, manifest, {
        phase: `CYCLE_${cycle}_KILL_${kill}`, frame: 0, kill,
        damageSource: result.damageSource, projectileConsumed: result.projectileConsumed,
      }));
    }
    const drop = pickupSnapshot(memory, labels, manifest,
      { phase: `DROP_${cycle}`, frame: 0 });
    drops.push(drop);
    return drop;
  };

  triggerDrop(1);
  advanceWeaponPickupToActive(memory, labels);
  runRoutine(memory, labels, "entity_effects_render");
  const rapidCapsule = pickupSnapshot(memory, labels, manifest,
    { phase: "RAPID_CAPSULE", frame: 0 });
  collectVisibleWeaponPickup(memory, labels);
  const rapidPickup = pickupSnapshot(memory, labels, manifest,
    { phase: "RAPID_PICKUP", frame: 0 });
  runRoutine(memory, labels, "weapon_pickup_release");

  triggerDrop(2);
  advanceWeaponPickupToActive(memory, labels);
  const spreadCapsuleFrames = [];
  let capsuleHead = head;
  for (let frame = 0; frame < 8; frame += 1) {
    runRoutine(memory, labels, "entity_effects_erase");
    const nearRowAdvanced = frame % 2;
    if (nearRowAdvanced) {
      capsuleHead = (capsuleHead + 21) % 22;
      initialiseRows(memory, labels, capsuleHead);
    }
    memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = nearRowAdvanced;
    memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE") + 2] = nearRowAdvanced ? 0 : 1;
    runRoutine(memory, labels, "entity_effects_update");
    runRoutine(memory, labels, "entity_effects_render");
    spreadCapsuleFrames.push(pickupSnapshot(memory, labels, manifest,
      { phase: "SPREAD_CAPSULE", frame }));
  }
  collectVisibleWeaponPickup(memory, labels);
  const spreadPickup = pickupSnapshot(memory, labels, manifest,
    { phase: "SPREAD_PICKUP", frame: 0 });

  memory[requiredLabel(labels, "player_x")] = 124;
  memory[requiredLabel(labels, "player_y")] = 184;
  runRoutine(memory, labels, "clear_viper_projectiles");
  runRoutine(memory, labels, "allocate_viper_projectile");
  const trajectoryFrames = [viperProjectileSnapshot(memory, labels,
    { phase: "SPREAD_VOLLEY", frame: 0 })];
  const spreadTimerFrames = [];
  for (let frame = 0; frame < 51; frame += 1) {
    runRoutine(memory, labels, "erase_fighter_projectile_overlays");
    runRoutine(memory, labels, "update_fighter_projectiles");
    runRoutine(memory, labels, "render_fighter_projectile_overlays");
    runRoutine(memory, labels, "update_weapon_booster_active", { x: 4 });
    if (frame < 8) trajectoryFrames.push(viperProjectileSnapshot(memory, labels,
      { phase: "SPREAD_VOLLEY", frame: frame + 1 }));
    spreadTimerFrames.push(pickupSnapshot(memory, labels, manifest,
      { phase: "SPREAD_TIMER", frame }));
  }
  const projectilesAfterCleanup = viperProjectileSnapshot(memory, labels,
    { phase: "SPREAD_CLEAN", frame: 51 });
  const frozenTimer = spreadTimerFrames.at(-1).timer;
  const pauseFrames = Array.from({ length: 10 }, (_, frame) =>
    pickupSnapshot(memory, labels, manifest, { phase: "SPREAD_PAUSE", frame }));
  for (let frame = 51; frame < 500; frame += 1) {
    runRoutine(memory, labels, "update_weapon_booster_active", { x: 4 });
    spreadTimerFrames.push(pickupSnapshot(memory, labels, manifest,
      { phase: "SPREAD_TIMER", frame }));
  }
  const spreadExpired = pickupSnapshot(memory, labels, manifest,
    { phase: "SPREAD_EXPIRED", frame: 500 });
  triggerDrop(3);

  return {
    artifact,
    head,
    drops,
    killRecords,
    rapidCapsule,
    rapidPickup,
    spreadCapsuleFrames,
    spreadPickup,
    trajectoryFrames,
    spreadTimerFrames,
    pauseFrames,
    frozenTimer,
    spreadExpired,
    projectilesAfterCleanup,
    initialCharset,
    charset: Uint8Array.from(memory.subarray(0x4400, 0x4800)),
    manifest,
  };
}

export function executeSpreadShotPoolTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const runCase = (occupied) => {
    const { memory, labels } = initialiseRuntime(root, artifact);
    const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
    memory[requiredLabel(labels, "ENTITY_STATE") + 2] = 4;
    for (let slot = 0; slot < occupied; slot += 1) memory[active + slot] = 1;
    const before = Array.from(memory.subarray(active, active + 10));
    runRoutine(memory, labels, "allocate_viper_projectile");
    const after = Array.from(memory.subarray(active, active + 10));
    return {
      occupied,
      before,
      after,
      activeCount: after.filter(Boolean).length,
      projectiles: viperProjectileSnapshot(memory, labels).slots,
    };
  };
  return {
    artifact,
    empty: runCase(0),
    sevenOccupied: runCase(7),
    eightOccupied: runCase(8),
    full: runCase(10),
  };
}

export function executeSpreadShotCollisionTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const raider = (() => {
    const { memory, labels } = initialiseRuntime(root, artifact);
    const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
    memory[requiredLabel(labels, "ENTITY_STATE") + 2] = 4;
    memory[requiredLabel(labels, "player_x")] = 124;
    memory[requiredLabel(labels, "player_y")] = 184;
    runRoutine(memory, labels, "allocate_viper_projectile");
    memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 1;
    memory[requiredLabel(labels, "ENEMY_ARCHETYPE")] = 0;
    memory[requiredLabel(labels, "ENEMY_HP")] = 3;
    memory[requiredLabel(labels, "ENEMY_PENDING_DAMAGE")] = 0;
    memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE")] = 5;
    memory[requiredLabel(labels, "enemy_x")] = 120;
    memory[requiredLabel(labels, "enemy_y")] = 170;
    memory[requiredLabel(labels, "score_bcd_lo")] = 0;
    memory[requiredLabel(labels, "score_bcd_hi")] = 0;
    runRoutine(memory, labels, "update_fighter_projectiles");
    const pendingDamage = memory[requiredLabel(labels, "ENEMY_PENDING_DAMAGE")];
    const consumed = Array.from(memory.subarray(active, active + 3));
    runRoutine(memory, labels, "resolve_enemy_damage");
    const scoreAfterFirstResolve = memory[requiredLabel(labels, "score_bcd_lo")];
    runRoutine(memory, labels, "resolve_enemy_damage");
    return {
      pendingDamage,
      consumed,
      enemyState: memory[requiredLabel(labels, "ENEMY_ACTIVE")],
      scoreAfterFirstResolve,
      scoreAfterSecondResolve: memory[requiredLabel(labels, "score_bcd_lo")],
    };
  })();

  const debris = Array.from({ length: 3 }, (_, selectedSlot) => {
    const { memory, labels } = initialiseRuntime(root, artifact);
    const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
    const projectileX = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
    memory[requiredLabel(labels, "ENTITY_STATE") + 2] = 4;
    memory[requiredLabel(labels, "player_x")] = 124;
    memory[requiredLabel(labels, "player_y")] = 184;
    runRoutine(memory, labels, "allocate_viper_projectile");
    for (let slot = 0; slot < 3; slot += 1) {
      if (slot !== selectedSlot) memory[active + slot] = 0;
    }
    const direction = memory[active + selectedSlot] & 0x60;
    const nextX = memory[projectileX + selectedSlot] + (direction === 0x40 ? -2 :
      direction === 0x20 ? 2 : 0);
    memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 1;
    memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")] = 1;
    memory[requiredLabel(labels, "ENTITY_STATE")] = 1;
    memory[requiredLabel(labels, "ENTITY_FLAGS")] = 0x3f;
    memory[requiredLabel(labels, "ENTITY_X")] = nextX;
    memory[requiredLabel(labels, "ENTITY_Y")] = 176;
    memory[requiredLabel(labels, "ENTITY_HP")] = 3;
    runRoutine(memory, labels, "update_fighter_projectiles");
    return {
      selectedSlot,
      direction,
      projectileConsumed: memory[active + selectedSlot] === 0,
      debrisHp: memory[requiredLabel(labels, "ENTITY_HP")],
      score: memory[requiredLabel(labels, "score_bcd_lo")],
    };
  });
  return { artifact, raider, debris };
}

export function executeSpreadShotHullArtifactTrace({
  root = defaultRoot, artifact = "xex", head = 0, topPhase = 128,
  faction = "colonial", selectedSlot = 0, frames = 12,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  runRoutine(memory, labels, "unpack_capital_hull_maps");
  runRoutine(memory, labels, "init_broadside");
  drawRuntimeHullScene(memory, labels, { head, topPhase });

  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const projectileX = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const projectileY = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const previousY = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
  const lifetime = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const rendered = requiredLabel(labels, "FIGHTER_PROJECTILE_RENDERED");
  const backupTop = requiredLabel(labels, "FIGHTER_PROJECTILE_BACKUP_TOP");
  const screenLow = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHigh = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  const directionIds = [0x41, 0x11, 0x21];
  const startColumns = faction === "colonial" ? [7, 6, 5] : [36, 35, 34];
  const startX = 48 + startColumns[selectedSlot] * 4 + 2;
  memory[active + selectedSlot] = directionIds[selectedSlot];
  memory[projectileX + selectedSlot] = startX;
  memory[projectileY + selectedSlot] = 151;
  memory[previousY + selectedSlot] = 151;
  memory[lifetime + selectedSlot] = 64;
  memory[rendered + selectedSlot] = 0;

  const initialCharset = Array.from(memory.subarray(0x4400, 0x4800));
  const records = [];
  for (let frame = 0; frame < frames && memory[active + selectedSlot] !== 0; frame += 1) {
    const reference = logicalDisplay(memory, labels);
    runRoutine(memory, labels, "render_fighter_projectile_overlays");
    const address = memory[screenLow + selectedSlot] |
      memory[screenHigh + selectedSlot] << 8;
    const backingCode = memory[backupTop + selectedSlot];
    const code = memory[address];
    const backingGlyph = Array.from(memory.subarray(
      0x4400 + (backingCode & 0x7f) * 8,
      0x4400 + (backingCode & 0x7f) * 8 + 8,
    ));
    const projectileGlyph = Array.from(memory.subarray(
      0x4400 + (code & 0x7f) * 8,
      0x4400 + (code & 0x7f) * 8 + 8,
    ));
    const during = logicalDisplay(memory, labels);
    const charsetDuring = Array.from(memory.subarray(0x4400, 0x4800));
    const changedOffsets = [];
    for (let index = 0; index < during.length; index += 1) {
      if (during[index] !== reference[index]) changedOffsets.push(index);
    }
    runRoutine(memory, labels, "erase_fighter_projectile_overlays");
    const afterErase = logicalDisplay(memory, labels);
    let restoreMismatches = 0;
    for (let index = 0; index < afterErase.length; index += 1) {
      if (afterErase[index] !== reference[index]) restoreMismatches += 1;
    }
    records.push({
      frame,
      x: memory[projectileX + selectedSlot],
      y: memory[projectileY + selectedSlot],
      address,
      backingCode,
      projectileCode: code,
      inverse: code >> 7,
      backingGlyph,
      projectileGlyph,
      backingPixelsPreserved: projectileGlyph.every((byte, index) =>
        [6, 4, 2, 0].every((shift) =>
          ((backingGlyph[index] >> shift) & 3) === 0 ||
          ((byte >> shift) & 3) !== 0)),
      changedOffsets,
      restoreMismatches,
      reference: Array.from(reference),
      during: Array.from(during),
      charsetDuring,
      afterErase: Array.from(afterErase),
    });
    runRoutine(memory, labels, "update_fighter_projectiles");
  }
  return {
    artifact,
    head,
    topPhase,
    faction,
    selectedSlot,
    manifestArtifact: manifest.artifacts[`dark-fighter.${artifact}`],
    initialCharset,
    finalCharset: Array.from(memory.subarray(0x4400, 0x4800)),
    records,
  };
}

export function executeSpreadShotHullVolleyTrace({
  root = defaultRoot, artifact = "xex", head = 21, topPhase = 128,
  faction = "colonial", frames = 12,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  runRoutine(memory, labels, "unpack_capital_hull_maps");
  runRoutine(memory, labels, "init_broadside");
  drawRuntimeHullScene(memory, labels, { head, topPhase });

  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const projectileX = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const projectileY = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const previousY = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
  const lifetime = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const rendered = requiredLabel(labels, "FIGHTER_PROJECTILE_RENDERED");
  const backupTop = requiredLabel(labels, "FIGHTER_PROJECTILE_BACKUP_TOP");
  const screenLow = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHigh = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  const directionIds = [0x41, 0x11, 0x21];
  const startColumns = faction === "colonial" ? [7, 6, 5] : [36, 35, 34];
  for (let slot = 0; slot < 3; slot += 1) {
    memory[active + slot] = directionIds[slot];
    memory[projectileX + slot] = 48 + startColumns[slot] * 4 + 2;
    memory[projectileY + slot] = 151;
    memory[previousY + slot] = 151;
    memory[lifetime + slot] = 64;
    memory[rendered + slot] = 0;
  }

  const records = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const reference = logicalDisplay(memory, labels);
    const renderCycles = runRoutine(memory, labels, "render_fighter_projectile_overlays");
    const during = logicalDisplay(memory, labels);
    const charsetDuring = Array.from(memory.subarray(0x4400, 0x4800));
    const projectiles = Array.from({ length: 3 }, (_, slot) => {
      const address = memory[screenLow + slot] | memory[screenHigh + slot] << 8;
      return {
        slot,
        active: memory[active + slot],
        x: memory[projectileX + slot],
        y: memory[projectileY + slot],
        address,
        backingCode: memory[backupTop + slot],
        projectileCode: memory[address],
        inverse: memory[address] >> 7,
      };
    });
    const eraseCycles = runRoutine(memory, labels, "erase_fighter_projectile_overlays");
    const afterErase = logicalDisplay(memory, labels);
    let restoreMismatches = 0;
    for (let offset = 0; offset < reference.length; offset += 1) {
      if (afterErase[offset] !== reference[offset]) restoreMismatches += 1;
    }
    records.push({
      frame,
      projectiles,
      renderCycles,
      eraseCycles,
      restoreMismatches,
      reference: Array.from(reference),
      during: Array.from(during),
      charsetDuring,
      afterErase: Array.from(afterErase),
    });
    runRoutine(memory, labels, "update_fighter_projectiles");
  }
  return {
    artifact,
    head,
    topPhase,
    faction,
    manifest,
    manifestArtifact: manifest.artifacts[`dark-fighter.${artifact}`],
    records,
  };
}

export function executeSpreadShotOverlapTrace({
  root = defaultRoot, artifact = "xex", head = 21,
} = {}) {
  const { memory, labels } = initialiseRuntime(root, artifact);
  runRoutine(memory, labels, "unpack_capital_hull_maps");
  runRoutine(memory, labels, "init_broadside");
  drawRuntimeHullScene(memory, labels, { head, topPhase: 136 });
  const reference = logicalDisplay(memory, labels);
  const initialCharset = Array.from(memory.subarray(0x4400, 0x4800));
  let displayOffset = -1;
  for (let row = 2; row < 24 && displayOffset < 0; row += 1) {
    for (let column = 32; column < 40; column += 1) {
      const code = reference[row * 40 + column] & 0x7f;
      if (code >= 59 && code < 90) {
        displayOffset = row * 40 + column;
        break;
      }
    }
  }
  if (displayOffset < 0) throw new Error("Overlap trace could not find a Cylon hull cell");
  const row = Math.floor(displayOffset / 40);
  const column = displayOffset % 40;
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const projectileX = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const projectileY = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const previousY = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
  const lifetime = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const xPositions = [48 + column * 4, 48 + column * 4 + 2];
  for (let slot = 0; slot < 2; slot += 1) {
    memory[active + slot] = slot === 0 ? 0x41 : 0x21;
    memory[projectileX + slot] = xPositions[slot];
    const y = 16 + (row - 1) * 8 + 3;
    memory[projectileY + slot] = y;
    memory[previousY + slot] = y;
    memory[lifetime + slot] = 32;
  }
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const both = logicalDisplay(memory, labels);
  const bothCode = both[displayOffset];
  const bothGlyph = Array.from(memory.subarray(
    0x4400 + (bothCode & 0x7f) * 8,
    0x4400 + (bothCode & 0x7f) * 8 + 8,
  ));
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");
  const afterBothErase = logicalDisplay(memory, labels);
  memory[active] = 0;
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const oneRemaining = logicalDisplay(memory, labels);
  const oneCode = oneRemaining[displayOffset];
  const oneGlyph = Array.from(memory.subarray(
    0x4400 + (oneCode & 0x7f) * 8,
    0x4400 + (oneCode & 0x7f) * 8 + 8,
  ));
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");
  return {
    artifact,
    head,
    row,
    column,
    displayOffset,
    reference: Array.from(reference),
    both: Array.from(both),
    bothCode,
    bothGlyph,
    afterBothErase: Array.from(afterBothErase),
    oneRemaining: Array.from(oneRemaining),
    oneCode,
    oneGlyph,
    afterFinalErase: Array.from(logicalDisplay(memory, labels)),
    initialCharset,
    finalCharset: Array.from(memory.subarray(0x4400, 0x4800)),
  };
}

export function executeWeaponBoosterReplacementTrace({
  root = defaultRoot, artifact = "xex",
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  const type = requiredLabel(labels, "ENTITY_TYPE") + 1;
  const state = requiredLabel(labels, "ENTITY_STATE") + 2;
  const collect = (pickupType, phase) => {
    memory[type] = pickupType;
    runRoutine(memory, labels, "weapon_pickup_collect");
    return pickupSnapshot(memory, labels, manifest, { phase, frame: 0 });
  };
  const rapid = collect(0, "RAPID");
  memory[requiredLabel(labels, "ENTITY_TIMER") + 2] = 123;
  memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2] = 0;
  const spreadReplacesRapid = collect(1, "SPREAD_REPLACES_RAPID");
  memory[requiredLabel(labels, "ENTITY_TIMER") + 2] = 77;
  const spreadRefresh = collect(1, "SPREAD_REFRESH");
  memory[state] = 4;
  const rapidReplacesSpread = collect(0, "RAPID_REPLACES_SPREAD");
  return { artifact, rapid, spreadReplacesRapid, spreadRefresh, rapidReplacesSpread };
}

export function assertSpreadShotTraceParity(left, right) {
  const normalize = ({ artifact, ...trace }) => JSON.stringify(trace, (_key, value) =>
    value instanceof Uint8Array ? Array.from(value) : value);
  if (normalize(left) !== normalize(right)) {
    throw new Error(`Spread Shot runtime differs between ${left.artifact} and ${right.artifact}`);
  }
  return true;
}

export function spreadShotTraceCsv(trace) {
  const header = [
    "artifact", "phase", "frame", "state", "pickup_type", "next_pickup_type",
    "render_id", "x", "y", "timer", "hud", "projectile_count",
    "slot0_id", "slot0_x", "slot0_y", "slot1_id", "slot1_x", "slot1_y",
    "slot2_id", "slot2_x", "slot2_y",
  ];
  const rows = [];
  const addPickup = (record) => rows.push([
    trace.artifact, record.phase, record.frame, record.state, record.pickupType,
    record.nextPickupType, record.renderId, record.x, record.y, record.timer,
    record.hudCodes.join("/"), record.projectileActiveCount,
    "", "", "", "", "", "", "", "", "",
  ]);
  const addProjectile = (record) => {
    const slots = record.slots.slice(0, 3);
    rows.push([
      trace.artifact, record.phase, record.frame, 4, 1, 0, "", "", "", "", "",
      slots.filter(({ active }) => active !== 0).length,
      ...slots.flatMap(({ active, x, y }) => [active, x, y]),
    ]);
  };
  trace.drops.forEach(addPickup);
  trace.spreadCapsuleFrames.forEach(addPickup);
  addPickup(trace.spreadPickup);
  trace.trajectoryFrames.forEach(addProjectile);
  addProjectile(trace.projectilesAfterCleanup);
  for (const index of [0, 49, 449, 499]) addPickup(trace.spreadTimerFrames[index]);
  addPickup(trace.spreadExpired);
  return `${header.join(",")}\n${rows.map((row) => row.join(",")).join("\n")}\n`;
}

export function weaponPickupTraceCsv(trace) {
  const fields = [
    "artifact", "phase", "frame", "kill", "damage_source", "projectile_consumed",
    "qualified_kill_counter", "slot_value", "rapid_seconds", "state", "active_mask",
    "active_count", "x", "y", "timer", "subsecond", "render_id", "left_code",
    "right_code", "bottom_left_code", "bottom_right_code", "top_screen_address",
    "bottom_screen_address", "backing_0", "backing_1", "backing_2", "backing_3",
    "hud_0", "hud_1", "hud_2", "hud_3", "drawn_mask",
    "effects_active_mask", "effects_active_count", "projectiles", "burst_state",
    "burst_remaining", "burst_timer", "score",
  ];
  const rows = [fields.join(",")];
  for (const record of [...trace.records, ...trace.rapidTimerFrames, ...trace.pauseFrames]) {
    rows.push([
      trace.artifact, record.phase, record.frame, record.kill, record.damageSource,
      Number(record.projectileConsumed), record.qualifiedKillCounter, record.slotValue,
      record.rapidSeconds, record.state,
      record.activeMask, record.activeCount, record.x, record.y, record.timer,
      record.subsecond, record.renderId, record.leftCode, record.rightCode,
      record.bottomLeftCode, record.bottomRightCode, record.screenAddress,
      record.bottomScreenAddress, ...record.backing,
      ...record.hudCodes, record.drawnMask, record.effectActiveMask, record.effectActiveCount,
      record.projectileActiveCount, record.burstState, record.burstRemaining,
      record.burstTimer,
      `${record.scoreHi.toString(16).padStart(2, "0")}${record.scoreLo.toString(16).padStart(2, "0")}`,
    ].join(","));
  }
  return `${rows.join("\n")}\n`;
}

export function assertWeaponPickupTraceParity(left, right) {
  const normalize = ({ artifact, ...trace }) => ({
    ...trace,
    records: trace.records.map((record) => ({
      ...record, screen: Array.from(record.screen), display: Array.from(record.display),
    })),
    rapidTimerFrames: trace.rapidTimerFrames.map((record) => ({
      ...record, screen: Array.from(record.screen), display: Array.from(record.display),
    })),
    pauseFrames: trace.pauseFrames.map((record) => ({
      ...record, screen: Array.from(record.screen), display: Array.from(record.display),
    })),
    charset: Array.from(trace.charset),
  });
  if (JSON.stringify(normalize(left)) !== JSON.stringify(normalize(right))) {
    throw new Error(`Weapon pickup runtime differs between ${left.artifact} and ${right.artifact}`);
  }
  return true;
}
