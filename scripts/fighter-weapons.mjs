import fs from "node:fs";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function integer(value, name, minimum, maximum) {
  invariant(Number.isInteger(value) && value >= minimum && value <= maximum,
    `${name} must be an integer from ${minimum} through ${maximum}`);
  return value;
}

function byte(value) {
  return `$${value.toString(16).padStart(2, "0").toUpperCase()}`;
}

function projectileGlyphs(width, horizontalPhases, height) {
  const glyphs = [];
  for (const horizontalPhase of horizontalPhases) {
    for (let verticalPhase = 0; verticalPhase < 8; verticalPhase += 1) {
      const rows = Array(8).fill(0);
      for (let line = 0; line < height && verticalPhase + line < 8; line += 1) {
        for (let pixel = 0; pixel < width; pixel += 1) {
          rows[verticalPhase + line] |= 3 << ((3 - horizontalPhase - pixel) * 2);
        }
      }
      glyphs.push(rows);
    }
    for (let overflowPhase = 8 - height + 1; overflowPhase < 8; overflowPhase += 1) {
      const rows = Array(8).fill(0);
      for (let line = 8 - overflowPhase; line < height; line += 1) {
        for (let pixel = 0; pixel < width; pixel += 1) {
          rows[overflowPhase + line - 8] |= 3 << ((3 - horizontalPhase - pixel) * 2);
        }
      }
      glyphs.push(rows);
    }
  }
  return glyphs;
}

function emitGlyphMacro(name, glyphs) {
  return [
    `.macro ${name}`,
    ...glyphs.map((rows) => `    .byte ${rows.map(byte).join(",")}`),
    ".endmacro",
  ];
}

function binaryMask(value, name) {
  invariant(typeof value === "string" && /^[01]{8}$/.test(value),
    `${name} must be an eight-bit binary mask`);
  return Number.parseInt(value, 2);
}

export function loadFighterWeaponsDefinition(sourcePath) {
  const definition = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  invariant(definition.formatVersion === 1, "Unsupported fighter-weapons formatVersion");
  const viewport = definition.viewport;
  integer(viewport?.activeImageTop, "viewport.activeImageTop", 0, 32);
  integer(viewport?.hudRows, "viewport.hudRows", 1, 4);
  integer(viewport?.gameplayRows, "viewport.gameplayRows", 1, 24);
  invariant(viewport.screenColumns === 40, "Gameplay viewport must remain 40 columns");
  invariant(viewport.leftHpos === 48, "Gameplay HPOS origin must remain 48");

  for (const [id, weapon] of [["viper", definition.viper]]) {
    integer(weapon?.poolSlots, `${id}.poolSlots`, 1, 16);
    invariant(weapon.burstCount === 10, `${id} burst must contain exactly ten shots`);
    integer(weapon.burstIntervalFrames, `${id}.burstIntervalFrames`, 1, 16);
    integer(weapon.speedScanlines, `${id}.speedScanlines`, 1, 16);
    integer(weapon.widthHpos, `${id}.widthHpos`, 1, 2);
    integer(weapon.heightScanlines, `${id}.heightScanlines`, 1, 3);
    integer(weapon.colourValue, `${id}.colourValue`, 0, 255);
  }
  invariant(definition.viper.postBurstFrames === 12,
    "Viper post-burst pause must be 12 PAL frames");
  invariant(definition.viper.colourRegister === "COLPF2" &&
    definition.viper.colourValue === 0x1e,
  "Viper projectiles must use genuine Atari yellow through COLPF2=$1E");
  integer(definition.glyphLayout?.viperBase, "glyphLayout.viperBase", 0, 127);
  integer(definition.glyphLayout?.raiderBase, "glyphLayout.raiderBase", 0, 127);
  const explosion = definition.sharedFighterExplosion;
  invariant(explosion?.frameDurationFrames === 4,
    "Shared fighter explosion frames must last four PAL frames");
  invariant(explosion.heightScanlines === 8 && explosion.widthBits === 8,
    "Shared fighter explosion must remain an 8x8 native PMG mask");
  invariant(Array.isArray(explosion.outerMasks) && explosion.outerMasks.length === 6,
    "Shared fighter explosion must contain six visual phases");
  for (const [frameIndex, frame] of explosion.outerMasks.entries()) {
    invariant(Array.isArray(frame) && frame.length === explosion.heightScanlines,
      `sharedFighterExplosion.outerMasks[${frameIndex}] must contain 8 rows`);
    frame.forEach((mask, row) => binaryMask(mask,
      `sharedFighterExplosion.outerMasks[${frameIndex}][${row}]`));
  }
  invariant(Array.isArray(explosion.coreMasks) && explosion.coreMasks.length === 6,
    "Shared fighter explosion needs one core mask per phase");
  explosion.coreMasks.forEach((mask, index) =>
    integer(mask, `sharedFighterExplosion.coreMasks[${index}]`, 0, 255));
  return definition;
}

export function compileFighterWeapons(definition, enemyRoster) {
  const pulse = enemyRoster?.runtime?.weaponPolicy?.singlePulse;
  invariant(pulse?.renderer === "ANTIC4_GLYPH_POOL",
    "Fighter weapons require the Raider ANTIC 4 glyph-pool policy");
  const raider = Object.freeze({
    poolSlots: pulse.poolSlots,
    burstCount: pulse.burstCount,
    burstIntervalFrames: pulse.burstIntervalFrames,
    postBurstFrames: pulse.postBurstFrames,
    speedScanlines: pulse.speed,
    widthHpos: pulse.widthHpos,
    heightScanlines: pulse.height,
    damage: pulse.damage,
    lifetimeFrames: pulse.lifetimeFrames,
    colourRegister: pulse.colourRegister,
    colourValue: pulse.colourValue,
  });
  const viper = definition.viper;
  const activeImageTop = definition.viewport.activeImageTop;
  const hudTop = activeImageTop;
  const hudBottom = hudTop + definition.viewport.hudRows * 8;
  const gameplayTop = hudBottom;
  const gameplayBottom = gameplayTop + definition.viewport.gameplayRows * 8;
  const totalSlots = definition.viper.poolSlots + raider.poolSlots;
  const explosion = Object.freeze({
    frameCount: definition.sharedFighterExplosion.outerMasks.length,
    frameDurationFrames: definition.sharedFighterExplosion.frameDurationFrames,
    totalFrames: definition.sharedFighterExplosion.outerMasks.length *
      definition.sharedFighterExplosion.frameDurationFrames,
    heightScanlines: definition.sharedFighterExplosion.heightScanlines,
    widthBits: definition.sharedFighterExplosion.widthBits,
    outerBytes: Uint8Array.from(definition.sharedFighterExplosion.outerMasks.flatMap(
      (frame) => frame.map((mask) => binaryMask(mask, "sharedFighterExplosion mask")))),
    coreMasks: Uint8Array.from(definition.sharedFighterExplosion.coreMasks),
    slots: 2,
  });
  const viperGlyphs = projectileGlyphs(viper.widthHpos, [0, 1, 2, 3], viper.heightScanlines);
  const raiderGlyphs = projectileGlyphs(raider.widthHpos, [0, 2], raider.heightScanlines);
  invariant(viperGlyphs.length === 36 && raiderGlyphs.length === 20,
    "Fighter projectile phase glyph count changed");
  invariant(definition.glyphLayout.viperBase + viperGlyphs.length <= 59,
    "Viper projectile glyphs must remain below the capital-hull charset allocation");
  invariant(definition.glyphLayout.raiderBase >= 90 &&
    definition.glyphLayout.raiderBase + raiderGlyphs.length <= 128,
  "Raider projectile glyphs must stay in the post-capital charset tail");
  return Object.freeze({
    ...definition,
    raider,
    viewport: Object.freeze({
      ...definition.viewport,
      hudTop,
      hudBottom,
      gameplayTop,
      gameplayBottom,
    }),
    totalSlots,
    stateBytes: totalSlots * 10 + 6 + explosion.slots * 3,
    sharedFighterExplosion: explosion,
    glyphs: Object.freeze({ viper: viperGlyphs, raider: raiderGlyphs }),
  });
}

export function renderFighterWeaponsCa65Include(asset) {
  const { viewport, viper, raider, sharedFighterExplosion: explosion } = asset;
  return [
    "; Generated from assets/graphics/fighter-weapons.json by scripts/fighter-weapons.mjs.",
    "; Do not edit this file by hand.",
    `HUD_TOP = ${viewport.hudTop}`,
    `HUD_BOTTOM = ${viewport.hudBottom}`,
    `GAMEPLAY_TOP = ${viewport.gameplayTop}`,
    `GAMEPLAY_BOTTOM = ${viewport.gameplayBottom}`,
    `GAMEPLAY_SCREEN_ROWS = ${viewport.gameplayRows}`,
    `GAMEPLAY_SCREEN_COLUMNS = ${viewport.screenColumns}`,
    `GAMEPLAY_LEFT_HPOS = ${viewport.leftHpos}`,
    `VIPER_PROJECTILE_GLYPH_BASE = ${asset.glyphLayout.viperBase}`,
    `RAIDER_PROJECTILE_GLYPH_BASE = ${asset.glyphLayout.raiderBase}`,
    "VIPER_PROJECTILE_GLYPH_STRIDE = 9",
    "RAIDER_PROJECTILE_GLYPH_STRIDE = 10",
    `VIPER_PROJECTILE_GLYPH_COUNT = ${asset.glyphs.viper.length}`,
    `RAIDER_PROJECTILE_GLYPH_COUNT = ${asset.glyphs.raider.length}`,
    `VIPER_PROJECTILE_SLOT_COUNT = ${viper.poolSlots}`,
    `RAIDER_PROJECTILE_SLOT_COUNT = ${raider.poolSlots}`,
    `FIGHTER_PROJECTILE_SLOT_COUNT = ${asset.totalSlots}`,
    `RAIDER_PROJECTILE_SLOT_BASE = ${viper.poolSlots}`,
    "WEAPON_BURST_WAITING = 0",
    "WEAPON_BURST_FIRING = 1",
    "WEAPON_BURST_POST = 2",
    `VIPER_BURST_COUNT = ${viper.burstCount}`,
    `VIPER_BURST_INTERVAL = ${viper.burstIntervalFrames}`,
    `VIPER_POST_BURST_PAUSE = ${viper.postBurstFrames}`,
    `VIPER_PROJECTILE_SPEED = ${viper.speedScanlines}`,
    `VIPER_PROJECTILE_WIDTH_HPOS = ${viper.widthHpos}`,
    `VIPER_PROJECTILE_HEIGHT = ${viper.heightScanlines}`,
    `VIPER_PROJECTILE_COLOR = ${byte(viper.colourValue)}`,
    `RAIDER_BURST_COUNT = ${raider.burstCount}`,
    `RAIDER_BURST_INTERVAL = ${raider.burstIntervalFrames}`,
    `RAIDER_POST_BURST_EASY = ${raider.postBurstFrames[0]}`,
    `RAIDER_POST_BURST_MEDIUM = ${raider.postBurstFrames[1]}`,
    `RAIDER_POST_BURST_HARD = ${raider.postBurstFrames[2]}`,
    `RAIDER_PROJECTILE_SPEED = ${raider.speedScanlines}`,
    `RAIDER_PROJECTILE_WIDTH_HPOS = ${raider.widthHpos}`,
    `RAIDER_PROJECTILE_HEIGHT = ${raider.heightScanlines}`,
    `RAIDER_PROJECTILE_DAMAGE = ${raider.damage}`,
    `RAIDER_PROJECTILE_LIFETIME = ${raider.lifetimeFrames}`,
    `RAIDER_PROJECTILE_COLOR = ${byte(raider.colourValue)}`,
    `SHARED_FIGHTER_EXPLOSION_FRAME_COUNT = ${explosion.frameCount}`,
    `SHARED_FIGHTER_EXPLOSION_FRAME_DURATION = ${explosion.frameDurationFrames}`,
    `SHARED_FIGHTER_EXPLOSION_TOTAL = ${explosion.totalFrames}`,
    `SHARED_FIGHTER_EXPLOSION_HEIGHT = ${explosion.heightScanlines}`,
    `SHARED_FIGHTER_EXPLOSION_WIDTH_BITS = ${explosion.widthBits}`,
    `SHARED_FIGHTER_EXPLOSION_SLOT_COUNT = ${explosion.slots}`,
    "",
    ...emitGlyphMacro("EMIT_VIPER_PROJECTILE_GLYPHS", asset.glyphs.viper),
    "",
    ...emitGlyphMacro("EMIT_VIPER_PROJECTILE_GLYPHS_HEAD", asset.glyphs.viper.slice(0, 5)),
    "",
    ...emitGlyphMacro("EMIT_VIPER_PROJECTILE_GLYPHS_TAIL", asset.glyphs.viper.slice(5)),
    "",
    ...emitGlyphMacro("EMIT_RAIDER_PROJECTILE_GLYPHS", asset.glyphs.raider),
    "",
    `.macro EMIT_SHARED_FIGHTER_EXPLOSION_MASKS\n    .byte ${[...explosion.outerBytes].map(byte).join(",")}\n.endmacro`,
    `.macro EMIT_SHARED_FIGHTER_EXPLOSION_CORE_MASKS\n    .byte ${[...explosion.coreMasks].map(byte).join(",")}\n.endmacro`,
    "",
  ].join("\n");
}

export function createSharedFighterExplosion(asset, { x, y, owner = "RAIDER" }) {
  const explosion = asset.sharedFighterExplosion;
  invariant(Number.isInteger(x) && Number.isInteger(y),
    "Shared fighter explosion requires a stable integer centre");
  return { active: true, owner, x, y, timer: explosion.totalFrames, frame: 0 };
}

export function stepSharedFighterExplosion(asset, state) {
  if (!state.active) return { ...state };
  const timer = state.timer - 1;
  if (timer <= 0) return { ...state, active: false, timer: 0,
    frame: asset.sharedFighterExplosion.frameCount };
  const elapsed = asset.sharedFighterExplosion.totalFrames - timer;
  return { ...state, timer,
    frame: Math.floor(elapsed / asset.sharedFighterExplosion.frameDurationFrames) };
}

export function renderSharedFighterExplosionPmg(asset, state, {
  outer = new Uint8Array(256),
  core = new Uint8Array(256),
} = {}) {
  invariant(outer.length === 256 && core.length === 256,
    "Shared fighter explosion PMG buffers must contain 256 scanlines");
  const nextOuter = Uint8Array.from(outer);
  const nextCore = Uint8Array.from(core);
  const explosion = asset.sharedFighterExplosion;
  for (let row = 0; row < explosion.heightScanlines; row += 1) {
    const y = state.y + row;
    if (y < asset.viewport.gameplayTop || y >= asset.viewport.gameplayBottom) continue;
    nextOuter[y] = 0;
    nextCore[y] = 0;
  }
  if (!state.active || state.frame >= explosion.frameCount) {
    return { outer: nextOuter, core: nextCore };
  }
  const frameOffset = state.frame * explosion.heightScanlines;
  const coreMask = explosion.coreMasks[state.frame];
  for (let row = 0; row < explosion.heightScanlines; row += 1) {
    const y = state.y + row;
    if (y < asset.viewport.gameplayTop || y >= asset.viewport.gameplayBottom) continue;
    const mask = explosion.outerBytes[frameOffset + row];
    nextOuter[y] = mask;
    nextCore[y] = mask & coreMask;
  }
  return { outer: nextOuter, core: nextCore };
}

export function buildRaiderProjectileGlyphBank(asset, initialBytes) {
  const expectedLength = asset.glyphs.raider.length * 8;
  invariant(initialBytes.length === expectedLength,
    `Raider projectile glyph bank must contain ${expectedLength} bytes`);
  const bytes = Uint8Array.from(initialBytes);
  bytes.fill(0);
  for (let group = 0; group < 2; group += 1) {
    const mask = group === 0 ? 0xf0 : 0x0f;
    for (let glyph = 0; glyph < 10; glyph += 1) {
      const rows = asset.glyphs.raider[group * 10 + glyph];
      for (let row = 0; row < 8; row += 1) {
        if (rows[row] !== 0) bytes[(group * 10 + glyph) * 8 + row] = mask;
      }
    }
  }
  return bytes;
}

export function createViperBurstState(asset) {
  return {
    frame: 0,
    burstState: "WAITING",
    burstRemaining: 0,
    timer: 0,
    shotsEmitted: 0,
    pool: Array(asset.viper.poolSlots).fill(null),
  };
}

export function stepViperBurst(asset, state, {
  fireHeld = true,
  playerX = 124,
  playerY = 184,
  gameplayActive = true,
  drain = false,
  sectorComplete = false,
} = {}) {
  const next = {
    ...state,
    frame: state.frame + 1,
    pool: state.pool.map((shot) => shot && { ...shot }),
  };
  for (let index = 0; index < next.pool.length; index += 1) {
    const shot = next.pool[index];
    if (!shot) continue;
    shot.previousY = shot.y;
    shot.y -= asset.viper.speedScanlines;
    if (shot.y < asset.viewport.gameplayTop) next.pool[index] = null;
  }
  if (!gameplayActive) {
    next.pool.fill(null);
    next.burstState = "WAITING";
    next.burstRemaining = 0;
    next.timer = 0;
    return next;
  }
  // DRAIN and COMPLETE remain ordinary playable PAL frames for the Viper
  // weapon. They stop hull/cannon generation, not fighter fire. Keeping both
  // options explicit makes the natural transition test cover the release path.
  void drain;
  void sectorComplete;
  if (!fireHeld) {
    next.burstState = "WAITING";
    next.burstRemaining = 0;
    next.timer = 0;
    return next;
  }
  if (next.burstState === "WAITING") {
    next.burstState = "FIRING_BURST";
    next.burstRemaining = asset.viper.burstCount;
    next.timer = 0;
  } else if (next.burstState === "POST_BURST_COOLDOWN") {
    if (next.timer > 0) next.timer -= 1;
    if (next.timer > 0) return next;
    next.burstState = "FIRING_BURST";
    next.burstRemaining = asset.viper.burstCount;
  }
  if (next.timer > 0) next.timer -= 1;
  if (next.timer > 0) return next;
  const slot = next.pool.findIndex((shot) => shot === null);
  if (slot < 0) return next;
  next.pool[slot] = {
    owner: "VIPER",
    x: playerX + 4,
    y: playerY - asset.viper.heightScanlines,
    previousY: playerY - asset.viper.heightScanlines,
    width: asset.viper.widthHpos,
    height: asset.viper.heightScanlines,
    colour: asset.viper.colourValue,
  };
  next.shotsEmitted += 1;
  next.burstRemaining -= 1;
  if (next.burstRemaining === 0) {
    next.burstState = "POST_BURST_COOLDOWN";
    next.timer = asset.viper.postBurstFrames;
  } else {
    next.timer = asset.viper.burstIntervalFrames;
  }
  return next;
}

export function simulateViperBurst(asset, frameCount, options = {}) {
  let state = createViperBurstState(asset);
  const trace = [];
  for (let frame = 1; frame <= frameCount; frame += 1) {
    const before = state.shotsEmitted;
    state = stepViperBurst(asset, state, options);
    trace.push({
      frame,
      burstState: state.burstState,
      burstRemaining: state.burstRemaining,
      timer: state.timer,
      allocationResult: state.shotsEmitted > before ? "ALLOCATED" : "NONE",
      shotsEmitted: state.shotsEmitted,
      active: state.pool.filter(Boolean).map((shot) => ({ ...shot })),
    });
  }
  return { state, trace };
}
