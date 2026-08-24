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
  return `$${(value & 0xff).toString(16).padStart(2, "0").toUpperCase()}`;
}

export function loadEntityEffectsDefinition(sourcePath) {
  const definition = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  invariant(definition.formatVersion === 1, "Unsupported entity-effects formatVersion");
  const coordinates = definition.coordinateSystem;
  integer(coordinates?.gameplayTopScanline, "coordinateSystem.gameplayTopScanline", 0, 255);
  integer(coordinates?.gameplayBottomExclusive,
    "coordinateSystem.gameplayBottomExclusive", 1, 256);
  integer(coordinates?.logicalRows, "coordinateSystem.logicalRows", 1, 32);
  invariant(coordinates.gameplayTopScanline === 24,
    "Entity gameplay must begin below the divider at scanline 24");
  invariant(coordinates.gameplayBottomExclusive === 200,
    "Entity gameplay must end after scanline 199");
  invariant(coordinates.logicalRows === 22 &&
    coordinates.gameplayBottomExclusive - coordinates.gameplayTopScanline ===
      coordinates.logicalRows * 8,
  "Entity coordinates must describe exactly 22 eight-scanline ring rows");

  const pools = definition.pools;
  invariant(pools?.interactiveSlots === 4, "Interactive pool must contain four slots");
  invariant(pools.interactiveActiveLimit === 1,
    "First debris slice must enable exactly one interactive entity");
  invariant(pools.effectSlots === 6 && pools.effectActiveLimit === 0,
    "Transient effects must remain disabled in the first slice");
  invariant(pools.stateAddress === 0x8000 && pools.stateBytes === 0x100,
    "Entity/effects state must occupy only $8000-$80FF");
  invariant(pools.codeAddress === 0x9100 && pools.codeReservedBytes === 0x0f00,
    "ENTITY_CODE must occupy only $9100-$9FFF");

  const spawn = definition.spawn;
  integer(spawn?.initialDelayFrames, "spawn.initialDelayFrames", 1, 255);
  integer(spawn?.repeatDelayFrames, "spawn.repeatDelayFrames", 1, 255);
  integer(spawn?.rngSeed, "spawn.rngSeed", 1, 255);
  integer(spawn?.corridorFirstColumn, "spawn.corridorFirstColumn", 0, 39);
  integer(spawn?.corridorEndColumnExclusive,
    "spawn.corridorEndColumnExclusive", 1, 40);
  integer(spawn?.safeFirstColumn, "spawn.safeFirstColumn", 0, 39);
  integer(spawn?.safeEndColumnExclusive, "spawn.safeEndColumnExclusive", 1, 40);

  const motion = definition.debrisMotion;
  integer(motion?.verticalStepNumerator,
    "debrisMotion.verticalStepNumerator", 1, 255);
  integer(motion?.verticalStepDenominator,
    "debrisMotion.verticalStepDenominator", 1, 255);
  invariant(motion.verticalStepNumerator === 3 && motion.verticalStepDenominator === 5,
    "Debris vertical movement must retain its deterministic 3/5 world-row cadence");
  integer(motion?.horizontalStepWorldRows,
    "debrisMotion.horizontalStepWorldRows", 1, 255);
  integer(motion?.maximumHorizontalSteps,
    "debrisMotion.maximumHorizontalSteps", 0, 255);
  invariant(Array.isArray(motion?.trajectories) && motion.trajectories.length === 3,
    "Debris motion must define exactly three trajectories");
  const expectedTrajectories = [
    ["straight", 0], ["slight-left", -4], ["slight-right", 4],
  ];
  motion.trajectories.forEach((trajectory, index) => {
    invariant(trajectory?.id === expectedTrajectories[index][0],
      `debrisMotion.trajectories[${index}] has the wrong id`);
    integer(trajectory.vxSignedHpos,
      `debrisMotion.trajectories[${index}].vxSignedHpos`, -128, 127);
    invariant(trajectory.vxSignedHpos === expectedTrajectories[index][1],
      `${trajectory.id} must use ${expectedTrajectories[index][1]} signed HPOS`);
  });
  invariant(Array.isArray(motion.trajectorySelector) &&
    motion.trajectorySelector.length === 4,
  "Two-bit trajectory selector must contain four deterministic entries");
  const trajectoryIds = new Set(motion.trajectories.map(({ id }) => id));
  invariant(motion.trajectorySelector.every((id) => trajectoryIds.has(id)),
    "Trajectory selector references an unknown profile");
  invariant(trajectoryIds.size === new Set(motion.trajectorySelector).size,
    "Trajectory selector must make all three profiles reachable");

  const verticalStepsToDespawn =
    (coordinates.gameplayBottomExclusive - coordinates.gameplayTopScanline) / 8;
  const worldEventsToDespawn = Math.ceil(
    verticalStepsToDespawn * motion.verticalStepDenominator / motion.verticalStepNumerator,
  );
  invariant(motion.maximumHorizontalSteps ===
    Math.floor((worldEventsToDespawn - 1) / motion.horizontalStepWorldRows),
  "Maximum horizontal steps must cover the complete visible spawn-to-despawn path");
  invariant(spawn.safeFirstColumn ===
    spawn.corridorFirstColumn + motion.maximumHorizontalSteps,
  "Safe spawn left edge must absorb the complete slight-left trajectory");
  invariant(spawn.safeEndColumnExclusive ===
    spawn.corridorEndColumnExclusive - motion.maximumHorizontalSteps - 1,
  "Safe spawn right edge must absorb the complete slight-right trajectory");
  invariant(spawn.safeEndColumnExclusive - spawn.safeFirstColumn === 3,
    "Two-cell debris spawn reduction requires exactly three safe columns");

  const visuals = definition.debrisVisuals;
  invariant(visuals?.tumbleWorldRowsPerPhase === 1,
    "Debris tumbling must toggle on every visible world-row advance");
  invariant(Array.isArray(visuals.variants) && visuals.variants.length === 2,
    "Debris must define exactly two visual variants");
  invariant(visuals.variants.map(({ id }) => id).join(",") ===
    "armour-shard,truss-fragment",
  "Debris variants must retain their stable identities");
  for (const [variantIndex, variant] of visuals.variants.entries()) {
    invariant(Array.isArray(variant.phases) && variant.phases.length === 2,
      `debrisVisuals.variants[${variantIndex}] must contain two phases`);
    for (const [phaseIndex, glyphs] of variant.phases.entries()) {
      invariant(Array.isArray(glyphs) && glyphs.length === 2,
        `debrisVisuals.variants[${variantIndex}].phases[${phaseIndex}] must contain two glyphs`);
      const occupiedPixels = [];
      const selectors = [];
      glyphs.forEach((rows, glyphIndex) => {
        invariant(Array.isArray(rows) && rows.length === 8,
          `debrisVisuals variant ${variantIndex} phase ${phaseIndex} glyph ${glyphIndex} must contain eight rows`);
        rows.forEach((row, rowIndex) => integer(row,
          `debrisVisuals.variants[${variantIndex}].phases[${phaseIndex}][${glyphIndex}][${rowIndex}]`,
          0, 255));
        rows.forEach((row, y) => {
          for (let pixel = 0; pixel < 4; pixel += 1) {
            const selector = row >> (6 - pixel * 2) & 3;
            if (selector !== 0) {
              selectors.push(selector);
              const x = glyphIndex * 8 + pixel * 2;
              occupiedPixels.push([x, y], [x + 1, y]);
            }
          }
        });
      });
      const xs = occupiedPixels.map(([x]) => x);
      const ys = occupiedPixels.map(([, y]) => y);
      invariant(Math.max(...xs) - Math.min(...xs) + 1 >= 15 &&
        Math.max(...ys) - Math.min(...ys) + 1 >= 7,
      `debrisVisuals variant ${variantIndex} phase ${phaseIndex} must occupy at least 15x7 of its 16x8 canvas`);
      invariant(selectors.every((selector) => selector === 2 || selector === 3),
        `debrisVisuals variant ${variantIndex} phase ${phaseIndex} must avoid white star selectors`);
      invariant(variantIndex !== 0 || selectors.length >= 45 && selectors.length <= 48,
        `armour-shard phase ${phaseIndex} must contain 45-48 lit ANTIC pixels`);
      invariant(variantIndex !== 1 || selectors.length >= 43 && selectors.length <= 45,
        `truss-fragment phase ${phaseIndex} must contain 43-45 lit ANTIC pixels and retain openings`);
    }
    invariant(JSON.stringify(variant.phases[0]) !== JSON.stringify(variant.phases[1]),
      `debrisVisuals variant ${variantIndex} phases must remain visibly distinct`);
  }

  invariant(Array.isArray(definition.archetypes) && definition.archetypes.length === 1,
    "First slice must contain exactly one archetype");
  const archetype = definition.archetypes[0];
  invariant(archetype.id === "neutral-debris" && archetype.type === 1,
    "First archetype must be neutral-debris type 1");
  for (const name of [
    "initialState", "flags", "updateProfile", "renderProfile", "collisionCategory",
    "widthHpos", "heightScanlines", "contactDamageUnits", "movementNumerator",
    "movementDenominator", "lifetime", "hitPoints", "spawnPolicy", "sfxEventId",
  ]) integer(archetype[name], `archetypes[0].${name}`, 0, 255);
  integer(archetype.initialVx, "archetypes[0].initialVx", -128, 127);
  integer(archetype.initialVy, "archetypes[0].initialVy", -128, 127);
  invariant(archetype.widthHpos === 8 && archetype.heightScanlines === 8,
    "First debris must occupy exactly two horizontal ANTIC 4 cells");
  invariant((archetype.flags & 0x02) !== 0,
    "Two-cell debris must set the MULTICELL entity flag");
  invariant(archetype.contactDamageUnits === 1,
    "First debris contact must cause one HULL unit of damage");
  invariant(archetype.initialVx === 0 && archetype.initialVy === 8 &&
    archetype.movementNumerator === motion.verticalStepNumerator &&
    archetype.movementDenominator === motion.verticalStepDenominator &&
    archetype.lifetime === 0,
    "Debris descriptor defaults must retain the 3/5 accumulator origin");
  return definition;
}

export function compileEntityEffects(definition) {
  const archetype = definition.archetypes[0];
  const descriptor = Uint8Array.from([
    archetype.initialState,
    archetype.flags,
    archetype.updateProfile,
    archetype.renderProfile,
    archetype.collisionCategory,
    archetype.widthHpos,
    archetype.heightScanlines,
    archetype.contactDamageUnits,
    archetype.initialVx,
    archetype.initialVy,
    archetype.movementNumerator,
    archetype.movementDenominator,
    archetype.lifetime,
    archetype.hitPoints,
    archetype.spawnPolicy,
    archetype.sfxEventId,
  ]);
  invariant(descriptor.length === 16, "Entity archetype descriptor must remain 16 bytes");
  const glyphs = Uint8Array.from(
    definition.debrisVisuals.variants.flatMap(({ phases }) =>
      phases.flatMap((phase) => phase.flat())),
  );
  invariant(glyphs.length === 64, "Two 2x1 debris variants must compile to eight glyphs");
  const trajectoryVx = Uint8Array.from(definition.debrisMotion.trajectorySelector.map((id) =>
    definition.debrisMotion.trajectories.find((trajectory) => trajectory.id === id).vxSignedHpos));
  return Object.freeze({
    ...definition,
    descriptor,
    glyphs,
    trajectoryVx,
  });
}

export function renderEntityEffectsCa65Include(asset) {
  const { coordinateSystem: coordinates, pools, spawn,
    debrisMotion: motion, debrisVisuals: visuals } = asset;
  return [
    "; Generated from assets/graphics/entity-effects.json by scripts/entity-effects.mjs.",
    "; Do not edit this file by hand.",
    `ENTITY_GAMEPLAY_TOP = ${coordinates.gameplayTopScanline}`,
    `ENTITY_GAMEPLAY_BOTTOM = ${coordinates.gameplayBottomExclusive}`,
    `ENTITY_LOGICAL_ROWS = ${coordinates.logicalRows}`,
    `ENTITY_SLOT_COUNT = ${pools.interactiveSlots}`,
    `ENTITY_ACTIVE_LIMIT = ${pools.interactiveActiveLimit}`,
    `EFFECT_SLOT_COUNT = ${pools.effectSlots}`,
    `EFFECT_ACTIVE_LIMIT = ${pools.effectActiveLimit}`,
    `ENTITY_STATE_ADDRESS = $${pools.stateAddress.toString(16).toUpperCase()}`,
    `ENTITY_STATE_BYTES = $${pools.stateBytes.toString(16).toUpperCase()}`,
    `ENTITY_CODE_ADDRESS = $${pools.codeAddress.toString(16).toUpperCase()}`,
    `ENTITY_CODE_RESERVED_BYTES = $${pools.codeReservedBytes.toString(16).toUpperCase()}`,
    `ENTITY_INITIAL_SPAWN_DELAY = ${spawn.initialDelayFrames}`,
    `ENTITY_REPEAT_SPAWN_DELAY = ${spawn.repeatDelayFrames}`,
    `ENTITY_RNG_SEED = $${spawn.rngSeed.toString(16).padStart(2, "0").toUpperCase()}`,
    `ENTITY_CORRIDOR_SOURCE_FIRST_COLUMN = ${spawn.corridorFirstColumn}`,
    `ENTITY_CORRIDOR_SOURCE_END_COLUMN = ${spawn.corridorEndColumnExclusive}`,
    `ENTITY_SAFE_SPAWN_FIRST_COLUMN = ${spawn.safeFirstColumn}`,
    `ENTITY_SAFE_SPAWN_END_COLUMN = ${spawn.safeEndColumnExclusive}`,
    `ENTITY_SAFE_SPAWN_COLUMNS = ${spawn.safeEndColumnExclusive - spawn.safeFirstColumn}`,
    `ENTITY_VERTICAL_STEP_NUMERATOR = ${motion.verticalStepNumerator}`,
    `ENTITY_VERTICAL_STEP_DENOMINATOR = ${motion.verticalStepDenominator}`,
    `ENTITY_HORIZONTAL_STEP_WORLD_ROWS = ${motion.horizontalStepWorldRows}`,
    `ENTITY_MAX_HORIZONTAL_STEPS = ${motion.maximumHorizontalSteps}`,
    `ENTITY_DEBRIS_VARIANT_COUNT = ${visuals.variants.length}`,
    `ENTITY_DEBRIS_PHASE_COUNT = ${visuals.variants[0].phases.length}`,
    "ENTITY_DEBRIS_GLYPHS_PER_PHASE = 2",
    `ENTITY_DEBRIS_GLYPH_COUNT = ${asset.glyphs.length / 8}`,
    `ENTITY_DEBRIS_GLYPH_BYTES = ${asset.glyphs.length}`,
    "ENTITY_ARCHETYPE_DESCRIPTOR_BYTES = 16",
    "ENTITY_DESC_INITIAL_STATE = 0",
    "ENTITY_DESC_FLAGS = 1",
    "ENTITY_DESC_UPDATE_PROFILE = 2",
    "ENTITY_DESC_RENDER_PROFILE = 3",
    "ENTITY_DESC_COLLISION_CATEGORY = 4",
    "ENTITY_DESC_WIDTH_HPOS = 5",
    "ENTITY_DESC_HEIGHT_SCANLINES = 6",
    "ENTITY_DESC_CONTACT_DAMAGE = 7",
    "ENTITY_DESC_INITIAL_VX = 8",
    "ENTITY_DESC_INITIAL_VY = 9",
    "ENTITY_DESC_MOVEMENT_NUMERATOR = 10",
    "ENTITY_DESC_MOVEMENT_DENOMINATOR = 11",
    "ENTITY_DESC_LIFETIME = 12",
    "ENTITY_DESC_HIT_POINTS = 13",
    "ENTITY_DESC_SPAWN_POLICY = 14",
    "ENTITY_DESC_SFX_EVENT = 15",
    "ENTITY_TYPE_DEBRIS = 1",
    "ENTITY_STATE_ACTIVE = 1",
    "ENTITY_FLAG_WORLD_ATTACHED = $01",
    "ENTITY_FLAG_MULTICELL = $02",
    "ENTITY_FLAG_COLLIDE_PLAYER = $04",
    "ENTITY_FLAG_PERSIST_LIFE = $10",
    "ENTITY_FLAG_CLEAR_ON_SECTOR = $20",
    "ENTITY_COLLISION_PLAYER_DAMAGE = 1",
    `ENTITY_DEBRIS_INITIAL_FLAGS = ${byte(asset.archetypes[0].flags)}`,
    `ENTITY_DEBRIS_VY = ${asset.archetypes[0].initialVy}`,
    "ENTITY_EVENT_WORLD_ROW_ADVANCED = $01",
    ".macro EMIT_ENTITY_ARCHETYPE_DESCRIPTORS",
    `    .byte ${[...asset.descriptor].map(byte).join(",")}`,
    ".endmacro",
    ".macro EMIT_ENTITY_DEBRIS_GLYPHS",
    `    .byte ${[...asset.glyphs].map(byte).join(",")}`,
    ".endmacro",
    ".macro EMIT_ENTITY_TRAJECTORY_VX",
    `    .byte ${[...asset.trajectoryVx].map(byte).join(",")}`,
    ".endmacro",
    "",
  ].join("\n");
}
