import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  beginEnemyDamageFrame,
  createEnemyCombatState,
  createEnemyDamageState,
  ENEMY_DAMAGE_SOURCES,
  enemyFireCooldown,
  enemyPulseSpawnPosition,
  ENEMY_COMBAT_SECTOR_STATES,
  ENEMY_FULLY_VISIBLE_TOP,
  projectileVisualMetrics,
  queueEnemyDamage,
  resolveEnemyDamage,
  createRaiderPursuitState,
  simulateRaiderSoftPursuit,
  simulateEnemyCombatFrames,
  simulateNaturalRaiderFire,
  stepEnemyCombatFrame,
  sweptHorizontalProjectileTargets,
  sweptEnemyPulseHitsPlayer,
} from "../scripts/enemy-combat.mjs";
import {
  compileEnemyRoster,
  ENEMY_WEAPON_PROFILES,
  loadEnemyRosterDefinition,
} from "../scripts/enemy-roster.mjs";
import { parseXex } from "../scripts/formats.mjs";
import {
  createEnemyCombatSequencePreview,
  createEnemyPaletteCandidatePreview,
  createRaiderNaturalFireTrace,
  createProjectileCollisionScoringPreview,
  createProjectileVisualLanguagePreview,
  inspectPng,
  readEnemyCombatSequenceRuntimeState,
  readEnemyPaletteCandidateRuntimeState,
  readGameGraphicsSource,
  readProjectileCollisionScoringRuntimeState,
  readProjectileVisualLanguageRuntimeState,
} from "../scripts/preview.mjs";
import { loadCapitalHullsDefinition } from "../scripts/capital-hulls.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const definitionPath = path.join(rootDirectory, "assets", "graphics", "enemy-roster.json");
const hulls = loadCapitalHullsDefinition(
  path.join(rootDirectory, "assets", "graphics", "capital-hulls.json"),
);
const asset = compileEnemyRoster(loadEnemyRosterDefinition(definitionPath), rootDirectory);
const [raider, talon, bomber] = asset.implemented;
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const xex = fs.readFileSync(path.join(rootDirectory, "dist", "dark-fighter.xex"));
const manifest = JSON.parse(fs.readFileSync(path.join(rootDirectory, "build", "manifest.json"), "utf8"));
const broadsideRuntime = fs.readFileSync(path.join(rootDirectory, "build", "broadside-runtime.bin"));
const labels = new Map(
  fs.readFileSync(path.join(rootDirectory, "build", "dark-fighter.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

function readRuntimeBytes(address, length) {
  const segment = parseXex(xex).segments.find(
    ({ start, end }) => address >= start && address + length - 1 <= end,
  );
  if (segment) return segment.data.subarray(address - segment.start, address - segment.start + length);
  const runtime = manifest.broadsideRuntime;
  if (address >= runtime.runAddress && address + length <= runtime.runAddress + runtime.bytes) {
    return broadsideRuntime.subarray(address - runtime.runAddress, address - runtime.runAddress + length);
  }
  throw new Error(`Runtime address $${address.toString(16)} is outside assembled data`);
}

test("selected Raider palette matches the Cylon hull hue with independent luminance and eye", () => {
  assert.deepEqual(asset.runtime.colourPolicy.candidates, [
    { id: "CYLON_OXBLOOD", value: 0x42 },
    { id: "CYLON_BURGUNDY", value: 0x44 },
    { id: "CYLON_SCARLET", value: 0x48 },
  ]);
  assert.deepEqual(
    [asset.runtime.colourPolicy.bodyValue, asset.runtime.colourPolicy.accentValue],
    [0x44, 0x46],
  );
  const graphics = readGameGraphicsSource(source);
  const body = asset.runtime.colourPolicy.bodyValue;
  const eye = asset.runtime.colourPolicy.accentValue;
  const colonialHull = graphics.hardwareState.get("COLPF1");
  const cylonHull = graphics.hardwareState.get("COLPF3");
  const background = graphics.hardwareState.get("COLBK");
  assert.equal(body & 0xf0, cylonHull & 0xf0,
    "Raider body must use the Cylon hull hue family");
  assert.notEqual(body & 0x0f, cylonHull & 0x0f,
    "Raider and Cylon hull must not share luminance");
  assert.notEqual(body & 0x0f, background & 0x0f,
    "Raider must not share the background luminance");
  assert.notEqual(body & 0xf0, colonialHull & 0xf0,
    "Raider must no longer use the Colonial hull hue family");
  assert.equal((eye & 0x0f) - (body & 0x0f), 2,
    "the red eye remains one GTIA luminance step brighter than the body");
  assert.deepEqual(
    [graphics.hardwareState.get("COLPM0"), graphics.hardwareState.get("COLPM1"),
      graphics.hardwareState.get("COLPM2"), graphics.hardwareState.get("COLPM3")],
    [0x0e, 0x44, 0x46, 0x28],
  );
  assert.match(source,
    /resolve_enemy_damage:[\s\S]+lda #ENEMY_EXPLOSION_CORE_COLOR[\s\S]+sta COLPM1[\s\S]+jsr spawn_raider_breakup_effects/);
  assert.match(source,
    /spawn_raider_breakup_effects:[\s\S]+jsr clear_transient_effects[\s\S]+sta EFFECT_ALLOCATION_RESULT[\s\S]+jmp begin_enemy_fighter_explosion/);
  assert.match(source,
    /materialize_raider_breakup_effects:[\s\S]+jsr spawn_breakup_effects_at[\s\S]+entity_raider_fragment_render_ids/);
  assert.match(source,
    /tick_shared_fighter_explosions:[\s\S]+cpx #FIGHTER_EXPLOSION_ENEMY_SLOT[\s\S]+lda #ENEMY_RUNTIME_BODY_COLOR[\s\S]+sta COLPM1/);
  assert.match(source,
    /start_gameplay:[\s\S]+lda #ENEMY_RUNTIME_BODY_COLOR[\s\S]+sta COLPM1[\s\S]+music_start_gameplay/,
  "a new game must restore the Raider body even after an interrupted explosion");
  assert.match(source, /ENEMY_EXPLOSION_CORE_COLOR = \$84/);
});

test("release Raider uses bounded soft pursuit rather than a player-independent sinusoid", () => {
  const policy = asset.runtime.movementPolicy.raiderSoftPursuit;
  assert.deepEqual(policy, {
    targetSamplingIntervalFrames: 8,
    deadZoneHpos: 3,
    horizontalAccelerationHpos: 1,
    maximumHorizontalVelocityHpos: 1,
    viperReferenceSpeedHposPerFrame: 2,
    movementStepHpos: 2,
    maximumSpeedRatioNumerator: 4,
    maximumSpeedRatioDenominator: 5,
    weaveAmplitudeHpos: 4,
    weavePeriodFrames: 32,
    attackActiveTop: 16,
    attackActiveBottomExclusive: 200,
  });
  const start = createRaiderPursuitState(asset, { x: 128, y: 56 });
  const left = simulateRaiderSoftPursuit(asset, {
    frameCount: 64,
    initialState: start,
    playerXForFrame: () => 88,
  });
  const right = simulateRaiderSoftPursuit(asset, {
    frameCount: 64,
    initialState: start,
    playerXForFrame: () => 160,
  });
  assert.ok(left.trace[15].x < start.x, "sustained left target affects the Raider within 16 PAL frames");
  assert.ok(right.trace[15].x > start.x, "sustained right target affects the Raider within 16 PAL frames");
  assert.notDeepEqual(left.trace.map(({ x }) => x), right.trace.map(({ x }) => x),
    "identical Raider spawn state produces player-dependent trajectories");
  for (const trace of [left.trace, right.trace]) {
    assert.equal(trace.every(({ x }) => x >= raider.logicalBounds[0] &&
      x <= raider.logicalBounds[1]), true);
    assert.equal(trace.every(({ velocityX }) => Math.abs(velocityX) <= 1), true);
  }
});

test("Raider maximum lateral speed is exactly 4/5 of the Viper reference", () => {
  const policy = asset.runtime.movementPolicy.raiderSoftPursuit;
  const initialX = 112;
  const frames = policy.maximumSpeedRatioDenominator;
  const pursuit = simulateRaiderSoftPursuit(asset, {
    frameCount: frames,
    initialState: createRaiderPursuitState(asset, { x: initialX, y: 56 }),
    playerXForFrame: () => 160,
  });
  const raiderDistance = pursuit.trace.reduce((sum, frame) =>
    sum + Math.abs(frame.movedHpos), 0);
  const viperDistance = frames * policy.viperReferenceSpeedHposPerFrame;
  assert.equal(raiderDistance, 8);
  assert.equal(viperDistance, 10);
  assert.equal(raiderDistance * 5, viperDistance * 4);
  assert.deepEqual(pursuit.trace.map(({ moveAccumulator }) => moveAccumulator), [4, 3, 2, 1, 0]);
  assert.deepEqual(pursuit.trace.map(({ movedHpos }) => movedHpos), [0, 2, 2, 2, 2],
    "Raider moves two HPOS on exactly four of each five sustained pursuit frames");
  assert.equal(pursuit.trace.at(-1).x, initialX + raiderDistance);
  assert.deepEqual(manifest.enemyRoster.movementPolicy.raiderSoftPursuit, policy);
  assert.match(source,
    /update_raider_soft_pursuit:[\s\S]+RAIDER_MOVE_ACCUMULATOR[\s\S]+RAIDER_SPEED_NUMERATOR[\s\S]+RAIDER_SPEED_DENOMINATOR/);
});

test("stationary Viper is intercepted while active manoeuvring opens the lateral gap", () => {
  const stationaryPlayerX = 136;
  const idlePursuit = simulateRaiderSoftPursuit(asset, {
    frameCount: 32,
    initialState: createRaiderPursuitState(asset, { x: 88, y: 56 }),
    playerXForFrame: () => stationaryPlayerX,
  });
  assert.equal(idlePursuit.trace.some(({ x }) =>
    x < stationaryPlayerX + 8 && x + raider.visibleWidth > stationaryPlayerX), true,
  "a sustained Raider pursuit must reach an idle Viper envelope");

  const viperStartX = 120;
  const raiderStartX = 100;
  const centreCorrection = (raider.visibleWidth - 8) / 2;
  const activePursuit = simulateRaiderSoftPursuit(asset, {
    frameCount: 5,
    initialState: createRaiderPursuitState(asset, { x: raiderStartX, y: 56 }),
    playerXForFrame: (frame) => viperStartX + (frame + 1) * 2,
  });
  const initialGap = viperStartX - raiderStartX - centreCorrection;
  const finalGap = activePursuit.trace.at(-1).playerX - activePursuit.state.x - centreCorrection;
  assert.equal(finalGap, initialGap + 2,
    "a five-frame maximum-speed Viper manoeuvre must gain two HPOS on the Raider");
});

test("Raider fractional phase resets after spawn, player life, and new game", () => {
  const routines = new Map([
    ["new game", source.slice(source.indexOf("init_state:"), source.indexOf("clear_pmg:"))],
    ["spawn", source.slice(source.indexOf("reset_enemy:"),
      source.indexOf("reset_enemy_fire_cooldown:"))],
    ["player life", source.slice(source.indexOf("clear_fighter_projectiles:"),
      source.indexOf("clear_viper_projectiles:"))],
  ]);
  for (const [pathName, routineSource] of routines) {
    assert.match(routineSource, /lda #\$00[\s\S]+sta RAIDER_MOVE_ACCUMULATOR/,
      `${pathName} must deterministically restart the 4/5 movement phase`);
  }
  assert.match(source.slice(source.indexOf("respawn_player:"),
    source.indexOf("tick_respawn_invulnerability:")), /jsr clear_fighter_projectiles/,
  "player respawn must use the projectile reset path that restarts Raider phase");
});

test("Raider pursuit reverses gradually and preserves a small deterministic weave", () => {
  const reversal = simulateRaiderSoftPursuit(asset, {
    frameCount: 64,
    initialState: createRaiderPursuitState(asset, { x: 128, y: 56 }),
    playerXForFrame: (frame) => frame < 24 ? 88 : 160,
  });
  const sampled = reversal.trace.filter(({ sampled }) => sampled);
  const firstRight = sampled.findIndex(({ velocityX, frame }) => frame >= 24 && velocityX > 0);
  assert.ok(firstRight > 0);
  assert.equal(sampled[firstRight - 1].velocityX, 0,
    "a signed reversal passes through zero for one sample interval");
  const stationary = simulateRaiderSoftPursuit(asset, {
    frameCount: 64,
    initialState: createRaiderPursuitState(asset, { x: 120, y: 56 }),
    playerXForFrame: () => 124,
  });
  assert.ok(new Set(stationary.trace.map(({ x }) => x)).size > 1,
    "a stationary Viper retains the Raider's bounded weave");
  assert.match(source,
    /update_raider_soft_pursuit:[\s\S]+RAIDER_TARGET_SAMPLE_INTERVAL[\s\S]+player_x[\s\S]+enemy_velocity_x/);
});

test("assembled archetype descriptors assign only Raider single-pulse fire", () => {
  assert.deepEqual(asset.implemented.map(({ weaponProfileId }) => weaponProfileId),
    [ENEMY_WEAPON_PROFILES.SINGLE_PULSE, ENEMY_WEAPON_PROFILES.NONE,
      ENEMY_WEAPON_PROFILES.NONE]);
  assert.deepEqual(
    [...readRuntimeBytes(labels.get("enemy_weapon_profiles"), 3)],
    [ENEMY_WEAPON_PROFILES.SINGLE_PULSE, 0, 0],
  );
  assert.deepEqual([...readRuntimeBytes(labels.get("raider_post_burst_frames"), 3)],
    [60, 50, 40]);
  assert.deepEqual(asset.runtime.weaponPolicy.singlePulse, {
    renderer: "ANTIC4_GLYPH_POOL",
    poolSlots: 9,
    burstCount: 10,
    burstIntervalFrames: 4,
    postBurstFrames: [60, 50, 40],
    speed: 5,
    height: 3,
    widthHpos: 2,
    damage: 10,
    lifetimeFrames: 96,
    colourRegister: "COLPF3",
    colourValue: 0x46,
  });
  assert.equal(asset.inventory.slice(3).every(({ implemented }) => implemented === false), true);
});

test("ten-shot burst intervals and post-burst difficulty pauses are exact", () => {
  assert.deepEqual([0, 1, 2].map((difficulty) => enemyFireCooldown(asset, difficulty)),
    [60, 50, 40]);
  for (const [difficulty, postBurst] of [[0, 60], [1, 50], [2, 40]]) {
    const simulation = simulateNaturalRaiderFire(asset, {
      difficulty,
      frameCount: 180,
      initialEnemyY: ENEMY_FULLY_VISIBLE_TOP,
    });
    const allocations = simulation.trace.filter(({ allocationResult }) =>
      allocationResult === "ALLOCATED");
    assert.deepEqual(allocations.slice(0, 10).map(({ frame }) => frame),
      [1, 5, 9, 13, 17, 21, 25, 29, 33, 37]);
    assert.equal(allocations[9].cooldown, postBurst);
    assert.equal(allocations[10]?.frame, 37 + postBurst);
  }
});

test("release Raider enters progressively and naturally reaches burst allocation", () => {
  for (const difficulty of [0, 1, 2]) {
    const { state, trace } = simulateNaturalRaiderFire(asset, {
      difficulty,
      frameCount: 55,
      initialEnemyY: ENEMY_FULLY_VISIBLE_TOP - raider.height,
    });
    const allocation = trace.find(({ allocationResult }) => allocationResult === "ALLOCATED");
    assert.equal(allocation.frame, raider.height);
    assert.equal(allocation.visibility, true);
    assert.equal(allocation.projectileOwner, "RAIDER");
    assert.equal(allocation.renderSlot, "PF0");
    assert.equal(allocation.hpos, 127);
    assert.equal(allocation.activePlayfieldProjectiles.length, 1);
    assert.ok(state.shotsFired >= 10);
  }
  const enemyY = labels.get("enemy_y");
  const initBytes = readRuntimeBytes(labels.get("init_state"),
    labels.get("clear_pmg") - labels.get("init_state"));
  const resetBytes = readRuntimeBytes(labels.get("reset_enemy"),
    labels.get("reset_enemy_fire_cooldown") - labels.get("reset_enemy"));
  assert.notEqual(initBytes.indexOf(Buffer.from([0xa9, 0x02, 0x85, enemyY])), -1,
    "assembled initial lifecycle starts one Raider height above GAMEPLAY_TOP");
  assert.notEqual(resetBytes.indexOf(Buffer.from([0x38, 0xfd])), -1,
    "assembled slot reuse subtracts the active archetype height from GAMEPLAY_TOP");
});

test("natural playfield pulse remains visible while moving five scanlines per frame", () => {
  const { trace } = simulateNaturalRaiderFire(asset, {
    difficulty: 1,
    frameCount: 12,
    initialEnemyY: ENEMY_FULLY_VISIBLE_TOP,
  });
  const allocationIndex = trace.findIndex(({ allocationResult }) => allocationResult === "ALLOCATED");
  const frames = trace.slice(allocationIndex, allocationIndex + 4);
  assert.deepEqual(frames.map(({ activePlayfieldProjectiles }) =>
    activePlayfieldProjectiles.find(({ renderSlot }) => renderSlot === 0)?.y),
  [38, 43, 48, 53]);
  assert.equal(frames.every(({ sizeM }) => sizeM === 0x54), true,
    "fighter playfield rendering leaves every capital SIZEM pair unchanged");
});

test("inactive, exploding, off-screen, and weaponless enemies cannot fire", () => {
  const expired = { ...createEnemyCombatState(asset), fireTimer: 0 };
  for (const context of [
    { enemyActive: false },
    { enemyExploding: true },
    { enemyY: 20 },
    { enemyY: 220 },
    { archetype: talon },
    { archetype: bomber },
  ]) {
    assert.equal(stepEnemyCombatFrame(asset, expired, context).shotsFired, 0);
  }
});

test("pulse origin follows the active frame centre and moves down five scanlines per frame", () => {
  const policy = asset.runtime.weaponPolicy.singlePulse;
  const origin = enemyPulseSpawnPosition(raider, 120, 56, policy);
  assert.deepEqual(origin, {
    x: 120 + Math.floor(raider.visibleWidth / 2) - 1,
    y: 56 + raider.projectileSpawnYOffset,
  });
  let state = { ...createEnemyCombatState(asset), fireTimer: 0 };
  state = stepEnemyCombatFrame(asset, state, { enemyX: 120, enemyY: 56 });
  const spawned = state.pool.find(Boolean);
  assert.deepEqual([spawned.x, spawned.y, spawned.speed, spawned.damage],
    [origin.x, origin.y, 5, 10]);
  state = stepEnemyCombatFrame(asset, state, {
    enemyX: 120,
    enemyY: 56,
    player: { x: 80, y: 200, width: 8, height: 16 },
  });
  assert.equal(state.pool.find(Boolean).y, origin.y + 5);
});

test("swept collision catches between-frame crossings and one pulse causes one ten-point hit", () => {
  const policy = asset.runtime.weaponPolicy.singlePulse;
  assert.equal(sweptEnemyPulseHitsPlayer(
    { x: 127, previousY: 149, y: 154 },
    { x: 124, y: 152, width: 8, height: 16 },
    policy,
  ), true);
  let state = { ...createEnemyCombatState(asset), fireTimer: 0 };
  state = stepEnemyCombatFrame(asset, state, {
    enemyX: 120,
    enemyY: 136,
    player: { x: 124, y: 152, width: 8, height: 16 },
  });
  assert.equal(state.shotsFired, 1);
  state = stepEnemyCombatFrame(asset, state, {
    enemyX: 120,
    enemyY: 136,
    player: { x: 124, y: 152, width: 8, height: 16 },
  });
  assert.deepEqual([state.playerHits, state.playerDamage, state.playerHealth, state.score],
    [1, 10, 90, 0]);
  assert.equal(state.pool[0], null);
  const later = stepEnemyCombatFrame(asset, state, {
    enemyX: 120,
    enemyY: 136,
    player: { x: 124, y: 152, width: 8, height: 16 },
  });
  assert.equal(later.playerDamage, 10, "a consumed pulse cannot hit twice");
});

test("respawn invulnerability consumes intersecting pulses without player damage", () => {
  let state = { ...createEnemyCombatState(asset), fireTimer: 0 };
  state = stepEnemyCombatFrame(asset, state, { enemyX: 120, enemyY: 166 });
  state = stepEnemyCombatFrame(asset, state, {
    enemyX: 120,
    enemyY: 166,
    playerInvulnerable: true,
  });
  assert.deepEqual([state.playerHits, state.playerDamage, state.playerHealth], [1, 0, 100]);
  assert.equal(state.pool[0], null);
});

test("Raider playfield pool cannot overwrite M0 or active capital missiles", () => {
  let state = createEnemyCombatState(asset);
  for (let frame = 0; frame < 40; frame += 1) {
    state = stepEnemyCombatFrame(asset, state, { enemyX: 120, enemyY: 56 });
  }
  assert.equal(state.shotsFired, 10);
  assert.equal(state.pool.length, 9);
  assert.match(source, /MISSILE_M0_MASK = \$03/);
  const fighterRenderer = source.slice(source.indexOf("render_fighter_projectile_overlays:"),
    source.indexOf("; -----------------------------------------------------------------------------\n; Enemy"));
  assert.doesNotMatch(fighterRenderer, /MISSILES|HPOSM|SIZEM|COLPM/);
});

test("EXPLODING and inactive Raiders never fall through to the live PMG renderer", () => {
  const update = source.slice(source.indexOf("update_enemy:"),
    source.indexOf("draw_enemy:"));
  assert.match(update,
    /cmp #ENEMY_EXPLODING_STATE[\s\S]+FIGHTER_EXPLOSION_TIMER\+FIGHTER_EXPLOSION_ENEMY_SLOT[\s\S]+beq @reset\s+rts/);
  assert.match(update,
    /cmp #ENEMY_ACTIVE_STATE[\s\S]+beq @live\s+rts\s+@live:\s+jsr erase_enemy/);
  assert.match(source,
    /reset_enemy:[\s\S]+jsr reset_enemy_fire_cooldown\s+jmp draw_enemy/);
});

test("natural broadside firing uses an independent pool and preserves capital registers", () => {
  const broadside = simulateNaturalRaiderFire(asset, {
    difficulty: 2,
    frameCount: 80,
    initialSizeM: 0x44,
  });
  assert.ok(broadside.state.shotsFired >= 8,
    "capital M1-M3 ownership cannot starve the independent Raider pool");
  assert.equal(broadside.trace.every(({ sizeM }) => sizeM === 0x44), true);
  assert.match(source, /jsr update_broadside[\s\S]+jsr resolve_enemy_damage/);
});

test("natural-fire trace records burst allocation and playfield movement", () => {
  const trace = createRaiderNaturalFireTrace(source, hulls);
  const lines = trace.trimEnd().split("\n");
  assert.match(lines[0],
    /frame,enemy_slot,archetype,visibility,enemy_y,burst_state,shot_index/);
  const openAllocation = lines.find((line) =>
    line.startsWith("OPEN_MEDIUM,1,") && line.includes(",ALLOCATED,RAIDER,PF0,"));
  assert.ok(openAllocation);
  const broadsideAllocation = lines.find((line) =>
    line.startsWith("BROADSIDE_HARD,1,") && line.includes(",ALLOCATED,RAIDER,PF0,"));
  assert.ok(broadsideAllocation);
  assert.match(openAllocation, /PF0:[0-9]+:[0-9]+>[0-9]+:2x3/);
});

test("pulse cleanup is deterministic across drain, complete, death, and respawn paths", () => {
  let state = { ...createEnemyCombatState(asset), fireTimer: 0 };
  state = stepEnemyCombatFrame(asset, state);
  assert.ok(state.pool[0]);
  state = stepEnemyCombatFrame(asset, state, {
    sectorState: ENEMY_COMBAT_SECTOR_STATES.DRAIN,
  });
  assert.equal(state.pool[0], null);
  state = stepEnemyCombatFrame(asset, state, {
    sectorState: ENEMY_COMBAT_SECTOR_STATES.COMPLETE,
  });
  assert.ok(state.pool[0], "ordinary Raider fire resumes after the finite sector exits DRAIN");
  assert.match(source, /update_enemy_weapon_runtime:[\s\S]+cmp #CAPITAL_HULL_STATE_DRAIN[\s\S]+clear_raider_projectiles/);
  assert.match(source, /apply_player_damage:[\s\S]+jsr clear_raider_pulses/);
  assert.match(source, /respawn_player:[\s\S]+jsr clear_fighter_projectiles/);
});

test("runtime routes every fighter hit through canonical damage-source arbitration", () => {
  const broadside = source.slice(source.indexOf("update_broadside:"),
    source.indexOf("schedule_broadside:"));
  assert.match(broadside,
    /@flying:[\s\S]+jmp @targets[\s\S]+capital_shell_collision_flags[\s\S]+and #\$02[\s\S]+DAMAGE_CAPITAL_CYLON[\s\S]+queue_enemy_damage/);
  assert.doesNotMatch(broadside.slice(broadside.indexOf("@raider_pulse:")), /add_ten_points/);
  assert.match(source,
    /update_fighter_projectiles:[\s\S]+DAMAGE_PLAYER_PROJECTILE[\s\S]+jsr queue_enemy_damage/);
  assert.match(source,
    /handle_collisions:[\s\S]+DAMAGE_PLAYER_CONTACT[\s\S]+jsr resolve_enemy_damage/);
  assert.match(source,
    /resolve_enemy_damage:[\s\S]+ENEMY_EXPLODING_STATE[\s\S]+jsr spawn_raider_breakup_effects[\s\S]+cmp #\(DAMAGE_CAPITAL_CYLON\+1\)[\s\S]+jsr add_archetype_score/);
});

test("canonical destruction policy awards descriptor score exactly once", () => {
  for (const [damageSource, expectedScore] of [
    [ENEMY_DAMAGE_SOURCES.PLAYER_PROJECTILE, raider.score],
    [ENEMY_DAMAGE_SOURCES.PLAYER_CONTACT, raider.score],
    [ENEMY_DAMAGE_SOURCES.CAPITAL_CYLON, raider.score],
    [ENEMY_DAMAGE_SOURCES.CAPITAL_COLONIAL, 0],
    [ENEMY_DAMAGE_SOURCES.CLEANUP, 0],
  ]) {
    const enemy = createEnemyDamageState(raider);
    queueEnemyDamage(enemy, raider.hitPoints, damageSource);
    const result = resolveEnemyDamage(enemy);
    assert.deepEqual([result.destroyed, result.score, result.source],
      [true, expectedScore, damageSource]);
    assert.equal(enemy.exploding, true,
      "every accepted lethal source enters the shared fighter explosion lifecycle");
    assert.deepEqual(resolveEnemyDamage(enemy),
      { destroyed: false, score: 0, source: ENEMY_DAMAGE_SOURCES.CLEANUP });
    assert.equal(enemy.destructionCount, 1);
    assert.equal(enemy.scoreAwarded, expectedScore);
  }

  const differentScore = { ...raider, score: 70, hitPoints: 1 };
  const enemy = createEnemyDamageState(differentScore);
  queueEnemyDamage(enemy, 1, ENEMY_DAMAGE_SOURCES.PLAYER_PROJECTILE);
  assert.equal(resolveEnemyDamage(enemy).score, 70,
    "score comes from the active descriptor rather than a Raider literal");
});

test("Cylon capital friendly fire consumes the first shell hit and starts one scored explosion", () => {
  const enemy = createEnemyDamageState(raider);
  queueEnemyDamage(enemy, raider.hitPoints, ENEMY_DAMAGE_SOURCES.CAPITAL_CYLON);
  const first = resolveEnemyDamage(enemy);
  assert.deepEqual(first, {
    destroyed: true,
    score: raider.score,
    source: ENEMY_DAMAGE_SOURCES.CAPITAL_CYLON,
  });
  assert.equal(enemy.exploding, true);
  assert.equal(enemy.destructionCount, 1);
  assert.equal(enemy.scoreAwarded, raider.score);
  assert.deepEqual(resolveEnemyDamage(enemy), {
    destroyed: false,
    score: 0,
    source: ENEMY_DAMAGE_SOURCES.CLEANUP,
  });
  assert.match(source,
    /capital_shell_hits_enemy:[\s\S]+cmp #ENEMY_ACTIVE_STATE[\s\S]+jmp capital_shell_hits_target/);
  assert.match(source,
    /@flying:[\s\S]+DAMAGE_CAPITAL_CYLON[\s\S]+jsr queue_enemy_damage/);
});

test("contact scoring is independent of Viper damage, death, and invulnerability", () => {
  for (const player of [
    { health: 100, invulnerable: false, expectedHealth: 80 },
    { health: 20, invulnerable: false, expectedHealth: 0 },
    { health: 20, invulnerable: true, expectedHealth: 20 },
  ]) {
    const enemy = createEnemyDamageState(raider);
    beginEnemyDamageFrame(enemy);
    queueEnemyDamage(enemy, 1, ENEMY_DAMAGE_SOURCES.PLAYER_CONTACT);
    if (!player.invulnerable) player.health = Math.max(0, player.health - 20);
    const result = resolveEnemyDamage(enemy);
    assert.deepEqual([result.score, player.health], [raider.score, player.expectedHealth]);
  }
  const tough = createEnemyDamageState({ ...raider, hitPoints: 2, score: 90 });
  queueEnemyDamage(tough, 1, ENEMY_DAMAGE_SOURCES.PLAYER_CONTACT);
  assert.deepEqual(resolveEnemyDamage(tough), {
    destroyed: false,
    score: 0,
    source: ENEMY_DAMAGE_SOURCES.PLAYER_CONTACT,
  });
});

test("same-frame lethal credit follows projectile, contact, Cylon, colonial, cleanup priority", () => {
  const enemy = createEnemyDamageState({ ...raider, hitPoints: 5, score: 30 });
  for (const sourceId of [
    ENEMY_DAMAGE_SOURCES.CLEANUP,
    ENEMY_DAMAGE_SOURCES.CAPITAL_COLONIAL,
    ENEMY_DAMAGE_SOURCES.CAPITAL_CYLON,
    ENEMY_DAMAGE_SOURCES.PLAYER_CONTACT,
    ENEMY_DAMAGE_SOURCES.PLAYER_PROJECTILE,
  ]) queueEnemyDamage(enemy, 1, sourceId);
  const result = resolveEnemyDamage(enemy);
  assert.deepEqual(result, {
    destroyed: true,
    score: 30,
    source: ENEMY_DAMAGE_SOURCES.PLAYER_PROJECTILE,
  });
  assert.equal(enemy.destructionCount, 1);
});

test("capital-shell sweep chooses the first spatial target and consumes one hit", () => {
  const raiderTarget = { id: "RAIDER", x: 122, y: 100, width: 16, height: 16, priority: 0 };
  const viperTarget = { id: "VIPER", x: 120, y: 100, width: 8, height: 16, priority: 1 };
  const leftMoving = {
    previousX: 128, x: 126, y: 104,
    width: hulls.broadside.projectileVisuals.capital.widthHpos, height: 6, velocityX: -2,
  };
  assert.equal(sweptHorizontalProjectileTargets(leftMoving, [viperTarget, raiderTarget]).id,
    "RAIDER", "rightmost intersected target is first for a Cylon shell");

  const colonial = {
    previousX: 118, x: 120, y: 104,
    width: hulls.broadside.projectileVisuals.capital.widthHpos, height: 6, velocityX: 2,
  };
  assert.equal(sweptHorizontalProjectileTargets(colonial, [raiderTarget]).id,
    "RAIDER");
  assert.equal(sweptHorizontalProjectileTargets({ ...colonial, x: 110, previousX: 108 },
    [raiderTarget]), null);
});

test("projectile definitions preserve PMG colours and make capital fire materially heavier", () => {
  const visuals = projectileVisualMetrics(hulls);
  assert.deepEqual(
    [visuals.player.color, visuals.raider.color, visuals.colonial.color, visuals.cylon.color],
    [0x1e, 0x46, 0x1e, 0x46],
  );
  assert.deepEqual(
    [visuals.player.renderer, visuals.raider.renderer,
      visuals.colonial.renderer, visuals.cylon.renderer],
    ["ANTIC4_GLYPH_POOL", "ANTIC4_GLYPH_POOL",
      "ANTIC4_PLAYFIELD_OVERLAY", "ANTIC4_PLAYFIELD_OVERLAY"],
  );
  assert.deepEqual(
    [visuals.player.width, visuals.player.height, visuals.raider.width, visuals.raider.height,
      visuals.colonial.width, visuals.colonial.height],
    [1, 2, 2, 3, 8, 6],
  );
  assert.ok(visuals.colonial.width >= visuals.raider.width * 2,
    "capital travel-axis length is at least twice fighter fire");
  assert.ok(visuals.colonial.occupiedPixels > visuals.raider.occupiedPixels * 2);
  assert.equal(visuals.colonial.occupiedPixels, visuals.cylon.occupiedPixels);
  assert.match(source,
    /render_capital_shell_overlay:[\s\S]+CAPITAL_PROJECTILE_CYLON_ATTRIBUTE[\s\S]+sta \(dst_ptr\),y/);
  assert.doesNotMatch(source.slice(source.indexOf("render_capital_shell_overlay:"),
    source.indexOf("draw_broadside_span:")), /COLPM[0-3]|SIZEM/);
  assert.deepEqual(manifest.enemyRoster.projectileVisuals, hulls.broadside.projectileVisuals);
  assert.deepEqual(manifest.enemyRoster.damagePolicy, {
    priority: ["PLAYER_PROJECTILE", "PLAYER_CONTACT", "CAPITAL_CYLON",
      "CAPITAL_COLONIAL", "ENEMY_PROJECTILE", "CLEANUP"],
    scoreAwarding: ["PLAYER_PROJECTILE", "PLAYER_CONTACT", "CAPITAL_CYLON"],
  });
});

test("all three palette review sheets are deterministic source-derived PAL-register evidence", () => {
  for (const [id, value] of [["CYLON_OXBLOOD", 0x42], ["CYLON_BURGUNDY", 0x44],
    ["CYLON_SCARLET", 0x48]]) {
    const state = readEnemyPaletteCandidateRuntimeState(source, id, hulls);
    assert.equal(state.candidate.value, value);
    assert.equal(state.panelDefinitions.length, 4);
    assert.deepEqual(state.panelDefinitions.slice(1).map(({ label }) => label), [
      "LEFT BOUND BESIDE ALLIED HULL",
      "CENTER WITH VIPER AND M0",
      "RIGHT BOUND BESIDE ENEMY HULL",
    ]);
    assert.equal(state.panelDefinitions.slice(1).every(({ enemyX }) =>
      enemyX >= raider.logicalBounds[0] && enemyX <= raider.logicalBounds[1]), true);
    const first = createEnemyPaletteCandidatePreview(source, id, hulls);
    const second = createEnemyPaletteCandidatePreview(source, id, hulls);
    assert.deepEqual(first, second);
    assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [1280, 848]);
  }
});

test("combat review sheet derives burst geometry and playfield ownership from runtime data", () => {
  const state = readEnemyCombatSequenceRuntimeState(source, hulls);
  assert.deepEqual(
    [state.spawnedPulse.x, state.spawnedPulse.y, state.spawnedPulse.renderSlot,
      state.spawnedPulse.damage],
    [state.origin.x, state.origin.y, 0, 10],
  );
  assert.equal(state.panelDefinitions.length, 9);
  assert.deepEqual(state.panelDefinitions.map(({ label }) => label), [
    "RAIDER READY  RED SCANNER",
    "RED BURST SHOT 1  PLAYFIELD",
    "RED BURST PLUS YELLOW VIPER FIRE",
    "PULSE APPROACH  FIVE LINES PER FRAME",
    "VIPER HIT  10 DAMAGE  HEALTH 090",
    "INVULNERABLE INTERSECTION  NO DAMAGE",
    "CAPITAL SHELL PLUS RAIDER BURST",
    "ALLIED CAPITAL SHELL DESTROYS RAIDER",
    "CLEAN POOL  NO GHOST PIXELS",
  ]);
  const first = createEnemyCombatSequencePreview(source, hulls);
  assert.deepEqual(first, createEnemyCombatSequencePreview(source, hulls));
  assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [1920, 1272]);
});

test("projectile visual-language sheet renders all four runtime classes and monochrome forms", () => {
  const state = readProjectileVisualLanguageRuntimeState(source, hulls);
  assert.deepEqual(state.panelDefinitions.map(({ label }) => label), [
    "VIPER PLAYFIELD  BRIGHT YELLOW  1X2",
    "RAIDER PLAYFIELD  SATURATED RED  2X3",
    "COLONIAL CAPITAL  YELLOW GOLD  8X6",
    "CYLON CAPITAL  CRIMSON  8X6",
    "ALL FOUR  SAME NATIVE SCALE",
    "MONO FORM  FIGHTER SHORT  CAPITAL HEAVY",
  ]);
  assert.deepEqual(
    [state.metrics.player.occupiedPixels, state.metrics.raider.occupiedPixels,
      state.metrics.colonial.occupiedPixels, state.metrics.cylon.occupiedPixels],
    [2, 6, 40, 40],
  );
  assert.equal(state.panelDefinitions.filter(({ capitalVisuals }) =>
    capitalVisuals.length > 0).every(({ capitalVisuals }) =>
    capitalVisuals.every(({ renderer }) => renderer === "ANTIC4_PLAYFIELD_OVERLAY")), true);
  assert.equal(state.panelDefinitions.filter(({ capitalVisuals }) =>
    capitalVisuals.length > 0).every(({ capitalVisuals }) =>
    capitalVisuals.every(({ overlay }) => overlay?.cellCount === 2 &&
      overlay.previousCodes.length === 2)), true,
  "runtime-derived preview writes two adjacent ANTIC 4 cells per capital shell");
  const first = createProjectileVisualLanguagePreview(source, hulls);
  assert.deepEqual(first, createProjectileVisualLanguagePreview(source, hulls));
  assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [1280, 1272]);
});

test("collision-scoring sheet uses canonical results and proves first-target consumption", () => {
  const state = readProjectileCollisionScoringRuntimeState(source, hulls);
  assert.equal(state.firstTarget.id, "RAIDER");
  assert.deepEqual(state.panelDefinitions.map(({ result }) => result.score),
    [10, 10, 10, 0, 10, 10, 0, 10]);
  assert.equal(state.panelDefinitions[5].firstTarget, "RAIDER");
  assert.deepEqual(state.panelDefinitions[7].secondResult,
    { destroyed: false, score: 0, source: ENEMY_DAMAGE_SOURCES.CLEANUP });
  const first = createProjectileCollisionScoringPreview(source, hulls);
  assert.deepEqual(first, createProjectileCollisionScoringPreview(source, hulls));
  assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [1280, 1696]);
});
