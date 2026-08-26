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

function runRoutine(memory, labels, name, { x = 0 } = {}) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = requiredLabel(labels, name);
  cpu.x = x;
  for (let steps = 0; steps < 400_000 && cpu.pc !== stop; steps += 1) cpu.step();
  if (cpu.pc !== stop) throw new Error(`${name} did not return`);
  return cpu.cycles;
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
  const state = memory[stateAddress];
  const screenAddress = memory[requiredLabel(labels, "ENTITY_SCREEN_LO") + slot] |
    memory[requiredLabel(labels, "ENTITY_SCREEN_HI") + slot] << 8;
  // The resident pickup follows the A2 ring without remapping its physical
  // cells. VX/VY are the authoritative saved bottom-row pointer; deriving it
  // from the advanced logical Y would inspect a different physical row.
  const bottomScreenAddress = screenAddress === 0 ? 0 :
    memory[requiredLabel(labels, "ENTITY_VX") + slot] |
    memory[requiredLabel(labels, "ENTITY_VY") + slot] << 8;
  const timerLow = memory[requiredLabel(labels, "ENTITY_TIMER") + slot];
  const timerHigh = memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + slot];
  const timer = state === 3 ? timerLow | timerHigh << 8 : timerLow;
  const slotValue = memory[requiredLabel(labels, "ENTITY_HP") + slot];
  const subsecond = memory[requiredLabel(labels, "ENTITY_OWNER") + slot];
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
    qualifiedKillCounter: state === 0 ? slotValue : 0,
    rapidSeconds: state === 3 ? slotValue - 16 : 0,
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
  const pickupState = memory[requiredLabel(labels, "ENTITY_STATE") + 1];
  if (rapid && pickupState !== 3) throw new Error("Rapid burst requires collected runtime state");
  if (!rapid) memory[requiredLabel(labels, "ENTITY_STATE") + 1] = 0;
  memory[0xd010] = 0;
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const emissions = [];
  let previousCount = 0;
  for (let frame = 0; frame < 48 && emissions.length < 10; frame += 1) {
    runRoutine(memory, labels, "update_viper_weapon");
    const currentCount = countActive(memory, active, 10);
    if (currentCount > previousCount) emissions.push(frame);
    previousCount = currentCount;
    if (rapid) runRoutine(memory, labels, "update_weapon_pickup_active", { x: 3 });
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
  while (memory[requiredLabel(labels, "ENTITY_STATE") + 1] === 3) {
    runRoutine(memory, labels, "update_weapon_pickup_active", { x: 3 });
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
  const rapidTimerAtSpawn = memory[requiredLabel(labels, "ENTITY_TIMER") + 1] |
    memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 1] << 8;
  const normalAfterPickup = memory[active];
  const hudDuringRapid = Array.from(memory.subarray(0x4000 + 32, 0x4000 + 36));
  runRoutine(memory, labels, "allocate_viper_projectile");
  const rapidAtSpawn = memory[active + 1];
  setProjectile(0, 100);
  setProjectile(1, 112);
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const rapidDisplay = logicalDisplay(memory, labels);
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");

  memory[requiredLabel(labels, "ENTITY_TIMER") + 1] = 1;
  memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 1] = 0;
  memory[requiredLabel(labels, "ENTITY_OWNER") + 1] = 1;
  memory[requiredLabel(labels, "ENTITY_HP") + 1] = 17;
  runRoutine(memory, labels, "update_weapon_pickup_active", { x: 3 });
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
  root = defaultRoot, artifact = "xex", head = 0,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  initialiseRows(memory, labels, head);
  const slot = 1;
  memory[requiredLabel(labels, "ENTITY_STATE") + slot] = 2;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 2;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")] = 1;
  memory[requiredLabel(labels, "ENTITY_X") + slot] = 112;
  memory[requiredLabel(labels, "ENTITY_Y") + slot] = 104;
  memory[requiredLabel(labels, "ENTITY_RENDER_ID") + slot] =
    manifest.entityEffects.weaponPickupGlyphIndex;

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
    return { name, playerX, playerY, expectedHit: hit, collected: snapshot.state === 3, snapshot };
  });
}

export function executeWeaponPickupCauseTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const results = [];
  for (const source of [1, 2, 3, 4, 5]) {
    const { memory, labels, manifest } = initialiseRuntime(root, artifact);
    memory[requiredLabel(labels, "ENTITY_HP") + 1] = 1;
    memory[requiredLabel(labels, "ENEMY_ARCHETYPE")] = 0;
    memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 1;
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
    memory[requiredLabel(labels, "ENTITY_STATE") + 1] = state;
    memory[requiredLabel(labels, "ENTITY_HP") + 1] = state === 3 ? 26 : counter;
    memory[requiredLabel(labels, "ENTITY_TIMER") + 1] = 0xf4;
    memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 1] = 1;
    memory[requiredLabel(labels, "ENTITY_OWNER") + 1] = 50;
    memory[requiredLabel(labels, "PLAYER_LIFECYCLE")] = lifecycle;
    if (state === 3) runRoutine(memory, labels, "show_rapid_fire_hud");
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
  };
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
