import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { toolchain } from "romdev-toolchain-cc65";
import { makeAtr, makeXex, validateBuildDirectory } from "./formats.mjs";
import {
  compileLoaderBitmap,
  loadLoaderBitmapDefinition,
  renderLoaderCa65Include,
} from "./loader-assets.mjs";
import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
  renderCapitalHullsCa65Include,
} from "./capital-hulls.mjs";
import {
  compileEnemyRoster,
  loadEnemyRosterDefinition,
  renderEnemyRosterCa65Include,
} from "./enemy-roster.mjs";
import {
  compileFighterWeapons,
  loadFighterWeaponsDefinition,
  renderFighterWeaponsCa65Include,
} from "./fighter-weapons.mjs";
import {
  compileStarfield,
  loadStarfieldDefinition,
  renderStarfieldCa65Include,
} from "./starfield.mjs";
import {
  compileMenuMusic,
  loadMenuMusicDefinition,
  renderMenuMusicCa65Include,
} from "./menu-music.mjs";
import {
  compileGameplayMusic,
  loadGameplayMusicDefinition,
  renderGameplayMusicCa65Include,
} from "./gameplay-music.mjs";
import {
  compileEntityEffects,
  loadEntityEffectsDefinition,
  renderEntityEffectsCa65Include,
} from "./entity-effects.mjs";
import { packBroadsideLzss, unpackBroadsideLzss } from "./broadside-lzss.mjs";
import { measureRuntimeCycles } from "./runtime-cycles.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const buildDirectory = path.join(rootDirectory, "build");
const distDirectory = path.join(rootDirectory, "dist");
const packageDefinition = JSON.parse(fs.readFileSync(path.join(rootDirectory, "package.json"), "utf8"));
const gameVersion = packageDefinition.version;
const quiet = process.argv.includes("--quiet");
const refreshWallTraceCandidate = process.argv.includes("--refresh-wall-trace-candidate");
const enemyReviewHarness = process.argv.includes("--enemy-review");
const enemyCombatReviewHarness = process.argv.includes("--enemy-combat-review");
const enemyPaletteArgument = process.argv.find((argument) => argument.startsWith("--enemy-palette="));
const enemyPaletteSlug = enemyPaletteArgument?.slice("--enemy-palette=".length);
const enemyPaletteIds = new Map([
  ["cylon-oxblood", "CYLON_OXBLOOD"],
  ["cylon-burgundy", "CYLON_BURGUNDY"],
  ["cylon-scarlet", "CYLON_SCARLET"],
]);
if (enemyPaletteSlug && !enemyPaletteIds.has(enemyPaletteSlug)) {
  throw new Error(`Unknown enemy palette build ${enemyPaletteSlug}`);
}
const isReviewVariant = enemyReviewHarness || enemyCombatReviewHarness || Boolean(enemyPaletteSlug);
const acceptedMenuMusicPayloadBytes = 14314;
// Gameplay music plus its in-game pause controls remain a bounded post-menu feature.
const runtimeHeadroomPayloadLimit = 1536;
const acceptedRuntimeHeadroomPayloadBytes = 15759;
const entityEffectsFoundationPayloadBudget = 1024;
const entityEffectsFoundationPayloadLimit =
  acceptedRuntimeHeadroomPayloadBytes + entityEffectsFoundationPayloadBudget;
const debrisVisualPolishPayloadLimitBytes = 16384;
const debrisVisualPolishEntityCodeBaselineBytes = 564;
const debrisVisualPolishEntityCodeBudgetBytes = 512;
const runtimeHeadroomHistoricalWallGate = 31568;
const entityEffectsBaselineWallCycles = 31440;
const entityEffectsBaselinePhysicalHeadroom = 4128;
const entityEffectsApprovedWallDelta = 600;
const entityEffectsFeatureWallLimit = 32040;
const entityEffectsFeatureMinimumHeadroom = 3528;
const debrisVisualPolishBaselineWallCycles = 32025;
const debrisVisualPolishBaselineHeadroomCycles = 3543;
const debrisVisualPolishApprovedWallDelta = 256;
const debrisVisualPolishWallLimit = 32281;
const debrisVisualPolishMinimumHeadroom = 3287;
const broadsideRuntimeReservedBytes = 0x1a00;
const starfieldStagingAddress = 0x7810;
const starfieldStagingBytes = 0x700;

function ensureDirectory(fsApi, directory) {
  const parts = directory.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    try {
      fsApi.mkdir(current);
    } catch (error) {
      if (error?.errno !== 20) {
        throw error;
      }
    }
  }
}

async function runWasmTool(name, inputFiles, args, outputFiles) {
  const definition = toolchain[name];
  if (!definition) {
    throw new Error(`Unknown cc65 tool: ${name}`);
  }

  const factory = (await import(pathToFileURL(definition.gluePath).href)).default;
  const logLines = [];
  const module = await factory({
    noInitialRun: true,
    print: (line) => logLines.push(String(line)),
    printErr: (line) => logLines.push(String(line)),
  });

  for (const [virtualPath, bytes] of Object.entries(inputFiles)) {
    ensureDirectory(module.FS, path.posix.dirname(virtualPath));
    module.FS.writeFile(virtualPath, bytes);
  }

  for (const virtualPath of outputFiles) {
    ensureDirectory(module.FS, path.posix.dirname(virtualPath));
  }

  const status = module.callMain(args);
  if (status !== 0) {
    throw new Error(`${name} failed with status ${status}\n${logLines.join("\n")}`);
  }

  const outputs = {};
  for (const virtualPath of outputFiles) {
    try {
      outputs[virtualPath] = Buffer.from(module.FS.readFile(virtualPath));
    } catch (error) {
      throw new Error(`${name} did not create ${virtualPath}\n${logLines.join("\n")}`, { cause: error });
    }
  }

  return { outputs, log: logLines.join("\n") };
}

function parseViceLabels(labelText) {
  const labels = new Map();
  for (const line of labelText.split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) {
      labels.set(match[2], Number.parseInt(match[1], 16));
    }
  }
  return labels;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function parseLinkSegmentSize(mapText, name) {
  const match = new RegExp(
    `^${name}\\s+[0-9A-F]+\\s+[0-9A-F]+\\s+([0-9A-F]+)`,
    "mi",
  ).exec(mapText);
  return match ? Number.parseInt(match[1], 16) : undefined;
}

function writeFile(targetPath, bytes) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, bytes);
}

async function build() {
  fs.mkdirSync(buildDirectory, { recursive: true });
  fs.mkdirSync(distDirectory, { recursive: true });

  const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"));
  const config = fs.readFileSync(path.join(rootDirectory, "cfg", "atari-boot.cfg"));
  const loaderDefinitionPath = path.join(
    rootDirectory,
    "assets",
    "graphics",
    "loader-bitmap.json",
  );
  const loaderDefinition = loadLoaderBitmapDefinition(loaderDefinitionPath);
  const loaderAsset = compileLoaderBitmap(loaderDefinition);
  const loaderInclude = Buffer.from(renderLoaderCa65Include(loaderAsset));
  writeFile(path.join(buildDirectory, "loader-screen.inc"), loaderInclude);
  const capitalHullsDefinitionPath = path.join(
    rootDirectory,
    "assets",
    "graphics",
    "capital-hulls.json",
  );
  const capitalHullsDefinition = loadCapitalHullsDefinition(capitalHullsDefinitionPath);
  const capitalHullsAsset = compileCapitalHulls(capitalHullsDefinition);
  const capitalHullsInclude = Buffer.from(renderCapitalHullsCa65Include(capitalHullsAsset));
  writeFile(path.join(buildDirectory, "capital-hulls.inc"), capitalHullsInclude);
  const enemyRosterDefinitionPath = path.join(
    rootDirectory,
    "assets",
    "graphics",
    "enemy-roster.json",
  );
  const enemyRosterDefinition = loadEnemyRosterDefinition(enemyRosterDefinitionPath);
  const enemyRosterAsset = compileEnemyRoster(enemyRosterDefinition, rootDirectory);
  const paletteCandidateId = enemyPaletteIds.get(enemyPaletteSlug);
  const paletteCandidate = paletteCandidateId
    ? enemyRosterAsset.runtime.colourPolicy.candidates.find(({ id }) => id === paletteCandidateId)
    : null;
  const enemyRosterInclude = Buffer.from(renderEnemyRosterCa65Include(enemyRosterAsset));
  writeFile(path.join(buildDirectory, "enemy-roster.inc"), enemyRosterInclude);
  const fighterWeaponsDefinitionPath = path.join(
    rootDirectory, "assets", "graphics", "fighter-weapons.json",
  );
  const fighterWeaponsAsset = compileFighterWeapons(
    loadFighterWeaponsDefinition(fighterWeaponsDefinitionPath),
    enemyRosterAsset,
  );
  const fighterWeaponsInclude = Buffer.from(
    renderFighterWeaponsCa65Include(fighterWeaponsAsset),
  );
  writeFile(path.join(buildDirectory, "fighter-weapons.inc"), fighterWeaponsInclude);
  const starfieldDefinitionPath = path.join(
    rootDirectory, "assets", "graphics", "starfield.json",
  );
  const starfieldAsset = compileStarfield(loadStarfieldDefinition(starfieldDefinitionPath));
  const starfieldInclude = Buffer.from(renderStarfieldCa65Include(starfieldAsset));
  writeFile(path.join(buildDirectory, "starfield.inc"), starfieldInclude);
  const menuMusicDefinitionPath = path.join(
    rootDirectory, "assets", "music", "menu-theme.json",
  );
  const menuMusicAsset = compileMenuMusic(loadMenuMusicDefinition(menuMusicDefinitionPath));
  const menuMusicInclude = Buffer.from(renderMenuMusicCa65Include(menuMusicAsset));
  writeFile(path.join(buildDirectory, "menu-music.inc"), menuMusicInclude);
  const gameplayMusicDefinitionPath = path.join(
    rootDirectory, "assets", "music", "gameplay-theme.json",
  );
  const gameplayMusicAsset = compileGameplayMusic(
    loadGameplayMusicDefinition(gameplayMusicDefinitionPath),
    menuMusicAsset,
  );
  const gameplayMusicInclude = Buffer.from(
    renderGameplayMusicCa65Include(gameplayMusicAsset),
  );
  writeFile(path.join(buildDirectory, "gameplay-music.inc"), gameplayMusicInclude);
  const entityEffectsDefinitionPath = path.join(
    rootDirectory, "assets", "graphics", "entity-effects.json",
  );
  const entityEffectsAsset = compileEntityEffects(
    loadEntityEffectsDefinition(entityEffectsDefinitionPath),
  );
  const entityEffectsInclude = Buffer.from(
    renderEntityEffectsCa65Include(entityEffectsAsset),
  );
  writeFile(path.join(buildDirectory, "entity-effects.inc"), entityEffectsInclude);

  const assembled = await runWasmTool(
    "ca65",
    {
      "/project/src/main.s": source,
      "/project/build/loader-screen.inc": loaderInclude,
      "/project/build/capital-hulls.inc": capitalHullsInclude,
      "/project/build/enemy-roster.inc": enemyRosterInclude,
      "/project/build/fighter-weapons.inc": fighterWeaponsInclude,
      "/project/build/starfield.inc": starfieldInclude,
      "/project/build/menu-music.inc": menuMusicInclude,
      "/project/build/gameplay-music.inc": gameplayMusicInclude,
      "/project/build/entity-effects.inc": entityEffectsInclude,
    },
    [
      "--cpu",
      "6502",
      "-g",
      ...(enemyReviewHarness ? ["-D", "ENEMY_REVIEW_HARNESS=1"] : []),
      ...(enemyCombatReviewHarness || paletteCandidate
        ? ["-D", "ENEMY_COMBAT_REVIEW_HARNESS=1"] : []),
      ...(paletteCandidate
        ? ["-D", `ENEMY_BODY_COLOR_OVERRIDE=${paletteCandidate.value}`] : []),
      "-I",
      "/project/build",
      "-o",
      "/project/build/main.o",
      "/project/src/main.s",
    ],
    ["/project/build/main.o"],
  );

  const objectFile = assembled.outputs["/project/build/main.o"];
  writeFile(path.join(buildDirectory, "main.o"), objectFile);

  const linked = await runWasmTool(
    "ld65",
    {
      "/project/build/main.o": objectFile,
      "/project/cfg/atari-boot.cfg": config,
    },
    [
      "-C",
      "/project/cfg/atari-boot.cfg",
      "-o",
      "/project/build/dark-fighter.bin",
      "-m",
      "/project/build/dark-fighter.map",
      "-Ln",
      "/project/build/dark-fighter.lbl",
      "/project/build/main.o",
    ],
    [
      "/project/build/dark-fighter.bin",
      "/project/build/dark-fighter.map",
      "/project/build/dark-fighter.lbl",
    ],
  );

  const linkedPayload = Buffer.from(linked.outputs["/project/build/dark-fighter.bin"]);
  const mapFile = linked.outputs["/project/build/dark-fighter.map"];
  const labelFile = linked.outputs["/project/build/dark-fighter.lbl"];
  const labels = parseViceLabels(labelFile.toString("utf8"));
  const startAddress = labels.get("start");
  const bootInitAddress = labels.get("boot_return");
  const broadsideLoadAddress = labels.get("__BROADSIDE_LOAD__");
  const broadsideRunAddress = labels.get("__BROADSIDE_RUN__");
  const broadsideRuntimeBytes = labels.get("__BROADSIDE_SIZE__");
  const starfieldLoadAddress = labels.get("__STARFIELD_LOAD__");
  const starfieldRunAddress = labels.get("__STARFIELD_RUN__");
  const starfieldRuntimeBytes = labels.get("__STARFIELD_SIZE__");
  const a2KernelLoadAddress = labels.get("__A2_KERNEL_LOAD__");
  const a2KernelRunAddress = labels.get("__A2_KERNEL_RUN__");
  const a2KernelBytes = labels.get("__A2_KERNEL_SIZE__");
  const entityCodeLoadAddress = labels.get("__ENTITY_CODE_LOAD__");
  const entityCodeRunAddress = labels.get("__ENTITY_CODE_RUN__");
  const entityCodeBytes = labels.get("__ENTITY_CODE_SIZE__");
  const entityStateRunAddress = labels.get("__ENTITY_STATE_RUN__");
  const entityStateBytes = labels.get("__ENTITY_STATE_SIZE__");
  const codeBytes = parseLinkSegmentSize(mapFile.toString("utf8"), "CODE");
  const rodataBytes = parseLinkSegmentSize(mapFile.toString("utf8"), "RODATA");
  const projectileStateBytes = labels.get("__PROJECTILES_SIZE__");
  const starfieldPackedSourceOperand = labels.get("starfield_packed_source");
  const starfieldPackedSizeOperand = labels.get("starfield_packed_size");
  const a2KernelSourceOperand = labels.get("a2_kernel_source");
  const entityPackedSourceOperand = labels.get("entity_packed_source");
  const loaderPackedAddress = labels.get("loader_bitmap_lzss");
  const musicPlayerStart = labels.get("music_player_start");
  const musicPlayerEnd = labels.get("music_player_end");
  const musicDataStart = labels.get("music_data_start");
  const musicDataEnd = labels.get("music_data_end");
  const gameMusicPlayerStart = labels.get("game_music_player_start");
  const gameMusicPlayerEnd = labels.get("game_music_player_end");
  const gameMusicDataStart = labels.get("game_music_data_start");
  const gameMusicDataEnd = labels.get("game_music_data_end");
  const loadAddress = 0x2000;

  if (!Number.isInteger(startAddress) || !Number.isInteger(bootInitAddress) ||
    !Number.isInteger(broadsideLoadAddress) || !Number.isInteger(broadsideRunAddress) ||
    !Number.isInteger(broadsideRuntimeBytes) || !Number.isInteger(starfieldLoadAddress) ||
    !Number.isInteger(starfieldRunAddress) || !Number.isInteger(starfieldRuntimeBytes) ||
    !Number.isInteger(a2KernelLoadAddress) || !Number.isInteger(a2KernelRunAddress) ||
    !Number.isInteger(a2KernelBytes) ||
    !Number.isInteger(entityCodeLoadAddress) || !Number.isInteger(entityCodeRunAddress) ||
    !Number.isInteger(entityCodeBytes) || !Number.isInteger(entityStateRunAddress) ||
    !Number.isInteger(entityStateBytes) ||
    !Number.isInteger(starfieldPackedSourceOperand) ||
    !Number.isInteger(starfieldPackedSizeOperand) || !Number.isInteger(a2KernelSourceOperand) ||
    !Number.isInteger(entityPackedSourceOperand) ||
    !Number.isInteger(loaderPackedAddress) ||
    !Number.isInteger(musicPlayerStart) || !Number.isInteger(musicPlayerEnd) ||
    !Number.isInteger(musicDataStart) || !Number.isInteger(musicDataEnd) ||
    !Number.isInteger(gameMusicPlayerStart) || !Number.isInteger(gameMusicPlayerEnd) ||
    !Number.isInteger(gameMusicDataStart) || !Number.isInteger(gameMusicDataEnd) ||
    !Number.isInteger(codeBytes) || !Number.isInteger(rodataBytes) ||
    !Number.isInteger(projectileStateBytes)) {
    throw new Error("ld65 label file is missing entry or resident relocation labels");
  }
  if (broadsideLoadAddress !== 0x4000 || broadsideRunAddress !== 0x5e10 ||
    broadsideRuntimeBytes > broadsideRuntimeReservedBytes) {
    throw new Error("Broadside relocation lies outside its reviewed load/run ranges");
  }
  if (starfieldLoadAddress !== 0x5a00 || starfieldRunAddress !== 0x552a ||
    starfieldRuntimeBytes > 0x08e6) {
    throw new Error("Starfield relocation lies outside its reviewed load/run ranges");
  }
  if (a2KernelLoadAddress !== 0x6a00 || a2KernelRunAddress !== 0x9000 ||
    a2KernelBytes < 1 || a2KernelBytes >= 0x0100) {
    throw new Error("A2 kernel lies outside its reviewed $9000-$90FF runtime range");
  }
  if (entityCodeLoadAddress !== 0x6b00 || entityCodeRunAddress !== 0x9100 ||
    entityCodeBytes < 1 || entityCodeBytes > 0x0f00) {
    throw new Error("ENTITY_CODE lies outside its reviewed $9100-$9FFF runtime range");
  }
  if (!isReviewVariant && entityCodeBytes >
    debrisVisualPolishEntityCodeBaselineBytes + debrisVisualPolishEntityCodeBudgetBytes) {
    throw new Error("Debris visual polish exceeds its +512 B ENTITY_CODE budget");
  }
  if (entityStateRunAddress !== 0x8000 || entityStateBytes !== 0x0100) {
    throw new Error("Entity/effects BSS must occupy exactly $8000-$80FF");
  }
  const broadsideRuntime = linkedPayload.subarray(
    broadsideLoadAddress - loadAddress,
    broadsideLoadAddress - loadAddress + broadsideRuntimeBytes,
  );
  const packedBroadsideRuntime = packBroadsideLzss(broadsideRuntime);
  if (!unpackBroadsideLzss(packedBroadsideRuntime).equals(broadsideRuntime)) {
    throw new Error("Broadside LZSS round trip failed");
  }
  const starfieldRuntime = linkedPayload.subarray(
    starfieldLoadAddress - loadAddress,
    starfieldLoadAddress - loadAddress + starfieldRuntimeBytes,
  );
  const a2KernelRuntime = linkedPayload.subarray(
    a2KernelLoadAddress - loadAddress,
    a2KernelLoadAddress - loadAddress + a2KernelBytes,
  );
  const entityCodeRuntime = linkedPayload.subarray(
    entityCodeLoadAddress - loadAddress,
    entityCodeLoadAddress - loadAddress + entityCodeBytes,
  );
  const packedStarfieldRuntime = packBroadsideLzss(starfieldRuntime);
  if (!unpackBroadsideLzss(packedStarfieldRuntime).equals(starfieldRuntime)) {
    throw new Error("Starfield LZSS round trip failed");
  }
  const packedEntityCodeRuntime = packBroadsideLzss(entityCodeRuntime);
  if (!unpackBroadsideLzss(packedEntityCodeRuntime).equals(entityCodeRuntime)) {
    throw new Error("ENTITY_CODE LZSS round trip failed");
  }
  if (packedStarfieldRuntime.length > starfieldStagingBytes) {
    throw new Error(`Packed starfield ${packedStarfieldRuntime.length} B exceeds the reviewed ` +
      `${starfieldStagingBytes} B temporary staging buffer`);
  }
  if (broadsideRunAddress + broadsideRuntimeReservedBytes > starfieldStagingAddress ||
    starfieldStagingAddress + starfieldStagingBytes > 0xc000) {
    throw new Error("Starfield staging overlaps resident RAM or the XL/XE OS ROM window");
  }
  const stagingEnd = starfieldStagingAddress + packedStarfieldRuntime.length;
  const loaderPackedEnd = loaderPackedAddress + loaderAsset.packedBitmap.length;
  const loaderBitmapEnd = loaderAsset.bitmapAddress + loaderAsset.bitmapBytes.length;
  if (starfieldStagingAddress < loaderPackedEnd && stagingEnd > loaderPackedAddress ||
    starfieldStagingAddress < loaderBitmapEnd && stagingEnd > loaderAsset.bitmapAddress) {
    throw new Error("Starfield staging overlaps loader source or bitmap destination");
  }
  const residentMain = Buffer.from(
    linkedPayload.subarray(0, broadsideLoadAddress - loadAddress),
  );
  const packedStarfieldAddress = loadAddress + residentMain.length + packedBroadsideRuntime.length;
  residentMain.writeUInt16LE(
    packedStarfieldAddress,
    starfieldPackedSourceOperand - loadAddress,
  );
  residentMain.writeUInt16LE(
    packedStarfieldRuntime.length,
    starfieldPackedSizeOperand - loadAddress,
  );
  const a2KernelSourceAddress = loadAddress + residentMain.length +
    packedBroadsideRuntime.length + packedStarfieldRuntime.length;
  residentMain.writeUInt16LE(
    a2KernelSourceAddress,
    a2KernelSourceOperand - loadAddress,
  );
  const entityPackedSourceAddress = a2KernelSourceAddress + a2KernelRuntime.length;
  residentMain.writeUInt16LE(
    entityPackedSourceAddress,
    entityPackedSourceOperand - loadAddress,
  );
  const rawPayload = Buffer.concat([
    residentMain,
    packedBroadsideRuntime,
    packedStarfieldRuntime,
    a2KernelRuntime,
    packedEntityCodeRuntime,
  ]);
  if (!isReviewVariant && rawPayload.length > entityEffectsFoundationPayloadLimit) {
    throw new Error(
      `Entity/effects foundation payload is ${rawPayload.length} bytes and exceeds ` +
      `its explicit ${entityEffectsFoundationPayloadLimit}-byte limit ` +
      `(${acceptedRuntimeHeadroomPayloadBytes} baseline + ` +
      `${entityEffectsFoundationPayloadBudget} approved bytes)`,
    );
  }
  if (!isReviewVariant && rawPayload.length > debrisVisualPolishPayloadLimitBytes) {
    throw new Error(
      `Debris visual polish payload is ${rawPayload.length} bytes and exceeds ` +
      `the owner-approved 16384-byte / 128-sector boot limit by ` +
      `${rawPayload.length - debrisVisualPolishPayloadLimitBytes} bytes ` +
      `(resident ${residentMain.length}, broadside ${packedBroadsideRuntime.length}, ` +
      `starfield ${packedStarfieldRuntime.length}, A2 ${a2KernelRuntime.length}, ` +
      `entity ${packedEntityCodeRuntime.length}/${entityCodeRuntime.length} packed/raw)`,
    );
  }

  const bootSectors = Math.ceil(rawPayload.length / 128);
  if (bootSectors < 1 || bootSectors > 255) {
    throw new Error(`Invalid Atari boot sector count: ${bootSectors}`);
  }

  rawPayload[1] = bootSectors;
  if (rawPayload.readUInt16LE(2) !== loadAddress) {
    throw new Error("Assembled boot header has an unexpected load address");
  }
  if (rawPayload.readUInt16LE(4) !== bootInitAddress) {
    throw new Error("Assembled boot header has an unexpected init address");
  }

  const xex = makeXex(loadAddress, startAddress, rawPayload);
  const atr = makeAtr(rawPayload);
  const cpuRuntimeTiming = isReviewVariant ? null : measureRuntimeCycles({
    residentMain,
    loadAddress,
    broadsideRuntime,
    broadsideRunAddress,
    starfieldRuntime,
    starfieldRunAddress,
    a2KernelRuntime,
    a2KernelRunAddress,
    entityCodeRuntime,
    entityCodeRunAddress,
    labels,
    segmentSizes: {
      code: codeBytes,
      rodata: rodataBytes,
      projectiles: projectileStateBytes,
      starfield: starfieldRuntimeBytes,
      broadside: broadsideRuntimeBytes,
      a2Kernel: a2KernelBytes,
      entityCode: entityCodeBytes,
      entityState: entityStateBytes,
    },
  });
  const wallTracePath = path.join(rootDirectory, "docs", "runtime-wall-trace.json");
  let wallTrace = null;
  if (!isReviewVariant && fs.existsSync(wallTracePath)) {
    wallTrace = JSON.parse(fs.readFileSync(wallTracePath, "utf8"));
    if (wallTrace.artifact?.sha256 !== sha256(xex)) {
      if (!refreshWallTraceCandidate) {
        throw new Error("Runtime wall trace belongs to a different XEX artifact");
      }
      wallTrace = null;
    }
  }
  const runtimeTiming = cpuRuntimeTiming === null ? null : {
    ...cpuRuntimeTiming,
    cpu_cycles_dma_off: cpuRuntimeTiming.cpuDmaOff.heaviestMainLoopCycles,
    cpu_comparison_headroom:
      cpuRuntimeTiming.palFrameCycles - cpuRuntimeTiming.cpuDmaOff.heaviestMainLoopCycles,
    measured_wall_cycles_dma_on: wallTrace?.semantics.measured_wall_cycles_dma_on ?? null,
    measured_physical_headroom: wallTrace?.semantics.measured_physical_headroom ?? null,
    estimated_additive_cycles: cpuRuntimeTiming.estimatedAdditive.cycles,
    wallTrace: wallTrace === null ? null : {
      reportPath: "docs/runtime-wall-trace.json",
      reportSha256: sha256(fs.readFileSync(wallTracePath)),
      artifact: wallTrace.artifact,
      emulator: wallTrace.emulator,
      semantics: wallTrace.semantics,
      gate: wallTrace.gate,
      instrumentation: wallTrace.instrumentation,
      replay: {
        baseline_measured_frames: wallTrace.replay.baseline_measured_frames,
        targeted_measured_frames: wallTrace.replay.targeted_measured_frames,
        parallax_cadence_measured_frames:
          wallTrace.replay.parallax_cadence_measured_frames,
      },
    },
  };

  const manifest = {
    formatVersion: 1,
    gameVersion,
    target: "Atari 65XE PAL / 64 KB",
    toolchain: "romdev-toolchain-cc65@0.1.3",
    buildVariant: enemyReviewHarness
      ? "enemy-review"
      : enemyCombatReviewHarness
        ? "enemy-combat-review"
        : paletteCandidate
          ? `enemy-palette-${enemyPaletteSlug}`
          : "release",
    loadAddress,
    startAddress,
    bootInitAddress,
    bootSectors,
    payloadBytes: rawPayload.length,
    payloadBudget: {
      historicalRuntimeHeadroom: {
        baselineBytes: acceptedMenuMusicPayloadBytes,
        approvedDeltaBytes: runtimeHeadroomPayloadLimit,
        limitBytes: acceptedMenuMusicPayloadBytes + runtimeHeadroomPayloadLimit,
        finalBytes: acceptedRuntimeHeadroomPayloadBytes,
        preservedForHistory: true,
      },
      entityEffectsFoundation: {
        baselineBytes: acceptedRuntimeHeadroomPayloadBytes,
        approvedDeltaBytes: entityEffectsFoundationPayloadBudget,
        actualDeltaBytes: rawPayload.length - acceptedRuntimeHeadroomPayloadBytes,
        limitBytes: entityEffectsFoundationPayloadLimit,
        remainingBytes: entityEffectsFoundationPayloadLimit - rawPayload.length,
      },
      debrisVisualPolish: {
        limitBytes: debrisVisualPolishPayloadLimitBytes,
        actualBytes: rawPayload.length,
        remainingBytes: debrisVisualPolishPayloadLimitBytes - rawPayload.length,
        maximumBootSectors: 128,
      },
    },
    broadsideRuntime: {
      loadAddress: broadsideLoadAddress,
      runAddress: broadsideRunAddress,
      bytes: broadsideRuntimeBytes,
      reservedBytes: broadsideRuntimeReservedBytes,
      packedBytes: packedBroadsideRuntime.length,
      compression: "LZ-10/5",
    },
    starfieldRuntime: {
      loadAddress: starfieldLoadAddress,
      runAddress: starfieldRunAddress,
      bytes: starfieldRuntimeBytes,
      reservedBytes: 0x08e6,
      packedBytes: packedStarfieldRuntime.length,
      stagingAddress: starfieldStagingAddress,
      stagingBytes: starfieldStagingBytes,
      compression: "LZ-10/5",
    },
    a2Kernel: {
      loadAddress: a2KernelLoadAddress,
      runAddress: a2KernelRunAddress,
      sourceAddress: a2KernelSourceAddress,
      bytes: a2KernelBytes,
      reservedBytes: 0x0100,
      availability: "unconditional 64 KB RAM",
    },
    entityEffects: {
      source: "assets/graphics/entity-effects.json",
      sourceSha256: sha256(fs.readFileSync(entityEffectsDefinitionPath)),
      stateAddress: entityStateRunAddress,
      stateBytes: entityStateBytes,
      initializedBytes: entityStateBytes,
      liveFieldBytes: 212,
      interactiveSlots: entityEffectsAsset.pools.interactiveSlots,
      interactiveActiveLimit: entityEffectsAsset.pools.interactiveActiveLimit,
      effectSlots: entityEffectsAsset.pools.effectSlots,
      effectActiveLimit: entityEffectsAsset.pools.effectActiveLimit,
      codeLoadAddress: entityCodeLoadAddress,
      codeRunAddress: entityCodeRunAddress,
      codeBytes: entityCodeBytes,
      codeReservedBytes: entityEffectsAsset.pools.codeReservedBytes,
      codeBudget: {
        baselineBytes: debrisVisualPolishEntityCodeBaselineBytes,
        approvedDeltaBytes: debrisVisualPolishEntityCodeBudgetBytes,
        actualDeltaBytes: entityCodeBytes - debrisVisualPolishEntityCodeBaselineBytes,
        limitBytes: debrisVisualPolishEntityCodeBaselineBytes +
          debrisVisualPolishEntityCodeBudgetBytes,
        remainingBytes: debrisVisualPolishEntityCodeBaselineBytes +
          debrisVisualPolishEntityCodeBudgetBytes - entityCodeBytes,
      },
      packedBytes: packedEntityCodeRuntime.length,
      packedSourceAddress: entityPackedSourceAddress,
      compression: "LZ-10/5",
      deterministicFillTestByte: 0xa5,
      gameplayTopScanline: entityEffectsAsset.coordinateSystem.gameplayTopScanline,
      gameplayBottomExclusive: entityEffectsAsset.coordinateSystem.gameplayBottomExclusive,
      logicalRows: entityEffectsAsset.coordinateSystem.logicalRows,
      archetypeCount: entityEffectsAsset.archetypes.length,
      descriptorBytes: entityEffectsAsset.descriptor.length,
      glyphBytes: entityEffectsAsset.glyphs.length,
      glyphIndex: labels.get("ENTITY_DEBRIS_GLYPH_BASE"),
      glyphCount: entityEffectsAsset.glyphs.length / 8,
      newGlyphsFromFoundation: entityEffectsAsset.glyphs.length / 8 - 1,
      runtimeBudget: {
        historicalGateWallCycles: runtimeHeadroomHistoricalWallGate,
        historicalGatePreserved: true,
        baselineWallCycles: entityEffectsBaselineWallCycles,
        baselinePhysicalHeadroomCycles: entityEffectsBaselinePhysicalHeadroom,
        approvedFeatureDeltaCycles: entityEffectsApprovedWallDelta,
        featureWallLimitCycles: entityEffectsFeatureWallLimit,
        minimumPhysicalHeadroomCycles: entityEffectsFeatureMinimumHeadroom,
        measuredWallCycles:
          wallTrace?.gate.entity_effects_foundation?.measured_wall_cycles ?? null,
        actualDeltaCycles:
          wallTrace?.gate.entity_effects_foundation?.actual_delta_cycles ?? null,
        remainingApprovedCycles:
          wallTrace?.gate.entity_effects_foundation?.remaining_approved_cycles ?? null,
        missedSynchronization: wallTrace?.gate.missed_frames ?? null,
        deadlineOverruns: wallTrace?.gate.deadline_overrun_frames ?? null,
        passed: wallTrace?.gate.entity_effects_foundation?.passed ?? null,
        debrisVisualPolish: {
          baselineWallCycles: debrisVisualPolishBaselineWallCycles,
          baselinePhysicalHeadroomCycles: debrisVisualPolishBaselineHeadroomCycles,
          approvedFeatureDeltaCycles: debrisVisualPolishApprovedWallDelta,
          featureWallLimitCycles: debrisVisualPolishWallLimit,
          minimumPhysicalHeadroomCycles: debrisVisualPolishMinimumHeadroom,
          measuredWallCycles: wallTrace?.semantics.measured_wall_cycles_dma_on ?? null,
          actualDeltaCycles: wallTrace === null ? null :
            wallTrace.semantics.measured_wall_cycles_dma_on -
              debrisVisualPolishBaselineWallCycles,
          remainingApprovedCycles: wallTrace === null ? null :
            debrisVisualPolishWallLimit - wallTrace.semantics.measured_wall_cycles_dma_on,
          missedSynchronization: wallTrace?.gate.missed_frames ?? null,
          deadlineOverruns: wallTrace?.gate.deadline_overrun_frames ?? null,
        },
      },
    },
    loaderScreen: {
      mode: "mixed ANTIC F/E",
      source: "assets/graphics/loader-bitmap.json",
      sourceSha256: sha256(fs.readFileSync(loaderDefinitionPath)),
      referenceSha256: loaderDefinition.reference.sha256,
      width: loaderAsset.width,
      height: loaderAsset.height,
      bytesPerRow: loaderAsset.bytesPerRow,
      bitmapAddress: loaderAsset.bitmapAddress,
      secondLmsLine: loaderAsset.secondLmsLine,
      secondLmsAddress: loaderAsset.secondLmsAddress,
      packedBitmapBytes: loaderAsset.packedBitmap.length,
      unpackedBitmapBytes: loaderAsset.bitmapBytes.length,
      dliCount: loaderAsset.dliLines.length,
      durationFrames: loaderAsset.durationFrames,
    },
    capitalHulls: {
      source: "assets/graphics/capital-hulls.json",
      sourceSha256: sha256(fs.readFileSync(capitalHullsDefinitionPath)),
      displayMode: capitalHullsDefinition.displayMode,
      segmentRows: capitalHullsAsset.segmentRows,
      glyphCount: capitalHullsAsset.glyphs.length,
      glyphBytes: capitalHullsAsset.glyphBytes.length,
      packedMapAndMetadataBytes: capitalHullsAsset.packedDataBytes,
      runtimeMapBytes: capitalHullsAsset.runtimeMapBytes,
      turretCount: capitalHullsAsset.turrets.length,
      previewStartPhase: capitalHullsAsset.previewStartPhase,
      contourTransitions: Object.fromEntries(capitalHullsAsset.contourTransitionCounts),
      broadsideScheduleBytes: capitalHullsAsset.scheduleBytes.length,
      flagshipSector: {
        totalRows: capitalHullsAsset.sector.totalRows,
        streamRows: capitalHullsAsset.sector.streamRows,
        visibleRows: capitalHullsAsset.sector.visibleRows,
        moduleRows: capitalHullsAsset.sector.moduleRows,
        sidePhaseRows: capitalHullsAsset.sector.sidePhaseRows,
        sectionRows: Object.fromEntries(capitalHullsAsset.sector.sections.map((section) => [
          section.id,
          section.rows,
        ])),
        moduleSourceBytes: [...capitalHullsAsset.sector.moduleSourceRowsBySide.values()]
          .reduce((sum, bytes) => sum + bytes.length, 0),
        moduleSequenceBytes: [...capitalHullsAsset.sector.moduleSequences.values()]
          .reduce((sum, bytes) => sum + bytes.length, 0),
        engineOverlayBytes: [...capitalHullsAsset.sector.engineOverlayMasks.values()]
          .reduce((sum, bytes) => sum + bytes.length, 0),
        prowOccupancyBytes: [...capitalHullsAsset.sector.prowOccupancyMasks.values()]
          .reduce((sum, bytes) => sum + bytes.length, 0),
        prowCollisionBytes: [...capitalHullsAsset.sector.prowCollisionBoundaries.values()]
          .reduce((sum, bytes) => sum + bytes.length, 0),
        engineAnimationFrames: capitalHullsAsset.sector.engineAnimationFrames,
        engineAnimationBytes: [...capitalHullsAsset.sector.engineGlyphs.values()]
          .reduce((sum, glyph) => sum + glyph.animationBytes.length * 8, 0),
        launchFlashFrames: capitalHullsAsset.sector.launchFlashFrames,
        capitalExplosion: {
          durationFrames: capitalHullsAsset.broadside.capitalExplosion.durationFrames,
          phaseFrames: capitalHullsAsset.broadside.capitalExplosion.phaseFrames,
          footprint: [
            capitalHullsAsset.broadside.capitalExplosion.width,
            capitalHullsAsset.broadside.capitalExplosion.height,
          ],
          pokeyChannel: capitalHullsAsset.broadside.capitalExplosion.soundChannel,
          soundFrames: capitalHullsAsset.broadside.capitalExplosion.soundFrequencyBytes.length,
        },
      },
    },
    enemyRoster: {
      source: "assets/graphics/enemy-roster.json",
      sourceSha256: sha256(fs.readFileSync(enemyRosterDefinitionPath)),
      inventoryCount: enemyRosterAsset.inventory.length,
      implementedCount: enemyRosterAsset.implemented.length,
      releaseArchetype: enemyRosterAsset.runtime.releaseArchetype,
      runtimeArtBytes: enemyRosterAsset.runtimeArtBytes,
      descriptorBytes: enemyRosterAsset.descriptorBytes,
      palette: {
        selectedId: enemyRosterAsset.runtime.colourPolicy.selected,
        releaseBodyValue: enemyRosterAsset.runtime.colourPolicy.bodyValue,
        artifactBodyValue: paletteCandidate?.value ?? enemyRosterAsset.runtime.colourPolicy.bodyValue,
        scannerValue: enemyRosterAsset.runtime.colourPolicy.accentValue,
      },
      movementPolicy: enemyRosterAsset.runtime.movementPolicy,
      weaponPolicy: enemyRosterAsset.runtime.weaponPolicy,
      projectileVisuals: capitalHullsAsset.broadside.projectileVisuals,
      damagePolicy: {
        priority: [
          "PLAYER_PROJECTILE",
          "PLAYER_CONTACT",
          "CAPITAL_CYLON",
          "CAPITAL_COLONIAL",
          "ENEMY_PROJECTILE",
          "CLEANUP",
        ],
        scoreAwarding: ["PLAYER_PROJECTILE", "PLAYER_CONTACT", "CAPITAL_CYLON"],
      },
      anchors: enemyRosterAsset.implemented.map((archetype) => ({
        id: archetype.id,
        reference: archetype.reference,
        height: archetype.height,
        hardwareWidth: archetype.hardwareWidth,
        visibleWidth: archetype.visibleWidth,
        logicalBounds: archetype.logicalBounds,
        hposBounds: archetype.hposBounds,
        frames: archetype.frames,
        releaseEnabled: archetype.releaseEnabled,
      })),
    },
    fighterWeapons: {
      source: "assets/graphics/fighter-weapons.json",
      sourceSha256: sha256(fs.readFileSync(fighterWeaponsDefinitionPath)),
      viewport: fighterWeaponsAsset.viewport,
      dynamicGlyphBase: fighterWeaponsAsset.dynamicGlyphBase,
      poolSlots: {
        viper: fighterWeaponsAsset.viper.poolSlots,
        raider: fighterWeaponsAsset.raider.poolSlots,
        total: fighterWeaponsAsset.totalSlots,
      },
      runtimeStateBytes: fighterWeaponsAsset.stateBytes,
      sharedFighterExplosion: {
        frameCount: fighterWeaponsAsset.sharedFighterExplosion.frameCount,
        frameDurationFrames: fighterWeaponsAsset.sharedFighterExplosion.frameDurationFrames,
        totalFrames: fighterWeaponsAsset.sharedFighterExplosion.totalFrames,
        dimensions: [fighterWeaponsAsset.sharedFighterExplosion.widthBits,
          fighterWeaponsAsset.sharedFighterExplosion.heightScanlines],
        slots: fighterWeaponsAsset.sharedFighterExplosion.slots,
        artBytes: fighterWeaponsAsset.sharedFighterExplosion.outerBytes.length +
          fighterWeaponsAsset.sharedFighterExplosion.coreMasks.length,
      },
      viper: fighterWeaponsAsset.viper,
      raider: fighterWeaponsAsset.raider,
    },
    starfield: {
      source: "assets/graphics/starfield.json",
      sourceSha256: sha256(fs.readFileSync(starfieldDefinitionPath)),
      generationSeed: starfieldAsset.generationSeed,
      corridor: starfieldAsset.corridor,
      farLayer: {
        population: starfieldAsset.farLayer.population,
        rateNumerator: starfieldAsset.farLayer.rateNumerator,
        rateDenominator: starfieldAsset.farLayer.rateDenominator,
        colourRegister: starfieldAsset.farLayer.colourRegister,
        glyphs: starfieldAsset.farLayer.glyphs.map(({ id, screenCode }) => ({ id, screenCode })),
      },
      nearLayer: {
        rateNumerator: starfieldAsset.nearLayer.rateNumerator,
        rateDenominator: starfieldAsset.nearLayer.rateDenominator,
        densityNumerator: starfieldAsset.nearLayer.densityNumerator,
        densityDenominator: starfieldAsset.nearLayer.densityDenominator,
        expectedVisible: starfieldAsset.expectedNearVisible,
        colourRegister: starfieldAsset.nearLayer.colourRegister,
        glyphs: starfieldAsset.nearLayer.glyphs.map(({ id, screenCode }) => ({ id, screenCode })),
      },
      twinkleIntervalFrames: starfieldAsset.twinkle.intervalFrames,
      glyphBytes: starfieldAsset.glyphBytes.length,
      runtimeStateBytes: starfieldAsset.stateBytes,
      pmgBytes: 0,
    },
    menuMusic: {
      source: "assets/music/menu-theme.json",
      sourceSha256: sha256(fs.readFileSync(menuMusicDefinitionPath)),
      title: menuMusicAsset.title,
      originalComposition: menuMusicAsset.originalComposition,
      targetFrameHz: menuMusicAsset.targetFrameHz,
      framesPerRow: menuMusicAsset.framesPerRow,
      rowsPerPattern: menuMusicAsset.rowsPerPattern,
      patternCount: menuMusicAsset.patternNames.length,
      sequencePatterns: menuMusicAsset.sequenceBytes.length,
      loopFrames: menuMusicAsset.loopFrames,
      loopSeconds: menuMusicAsset.loopSeconds,
      channelAllocation: menuMusicAsset.channelAllocation,
      channelMask: 0x0f,
      runtimeCodeBytes: musicPlayerEnd - musicPlayerStart,
      runtimeDataBytes: musicDataEnd - musicDataStart,
      runtimeStateBytes: menuMusicAsset.stateBytes,
    },
    gameplayMusic: {
      source: "assets/music/gameplay-theme.json",
      sourceSha256: sha256(fs.readFileSync(gameplayMusicDefinitionPath)),
      title: gameplayMusicAsset.title,
      originalComposition: gameplayMusicAsset.originalComposition,
      targetFrameHz: gameplayMusicAsset.targetFrameHz,
      framesPerRow: gameplayMusicAsset.framesPerRow,
      rowsPerPattern: gameplayMusicAsset.rowsPerPattern,
      patternCount: gameplayMusicAsset.patternNames.length,
      sequencePatterns: gameplayMusicAsset.sequenceBytes.length,
      loopFrames: gameplayMusicAsset.loopFrames,
      loopSeconds: gameplayMusicAsset.loopSeconds,
      channelAllocation: gameplayMusicAsset.channelAllocation,
      reservedSfxChannels: gameplayMusicAsset.reservedSfxChannels,
      channelMask: 0x03,
      audctlProfile: gameplayMusicAsset.audctlProfile,
      runtimeCodeBytes: gameMusicPlayerEnd - gameMusicPlayerStart,
      runtimeDataBytes: gameMusicDataEnd - gameMusicDataStart,
      runtimeStateBytes: gameplayMusicAsset.stateBytes,
      eventsPerTickLimit: gameplayMusicAsset.eventsPerTickLimit,
      normalFrameCycles: runtimeTiming?.cpuDmaOff.gameplayMusicTickMinimumCycles ?? null,
      worstRowFrameCycles: runtimeTiming?.cpuDmaOff.gameplayMusicTickMaximumCycles ?? null,
      pauseOptionPollCycles: runtimeTiming?.cpuDmaOff.optionPollCycles ?? null,
      cpuWorstFrameCyclesDmaOff: runtimeTiming?.cpu_cycles_dma_off ?? null,
      cpuComparisonHeadroomCycles: runtimeTiming?.cpu_comparison_headroom ?? null,
      measuredWallCyclesDmaOn: runtimeTiming?.measured_wall_cycles_dma_on ?? null,
      measuredPhysicalHeadroomCycles: runtimeTiming?.measured_physical_headroom ?? null,
    },
    runtimeTiming,
    pause: {
      inputRegister: 0xd01f,
      optionMask: 0x04,
      screenBackupAddress: starfieldStagingAddress,
      screenBackupBytes: 0x03c0,
      zeroPageStateBytes: 1,
      activeFramePollCycles: 13,
      simulationTicksWhilePaused: 0,
      menuRows: ["RESUME", "GAME MUSIC: ON/OFF", "QUIT TO MENU"],
      quitConfirmationDefault: "NO",
    },
    artifacts: {
      "dark-fighter-boot.bin": { bytes: rawPayload.length, sha256: sha256(rawPayload) },
      "dark-fighter.xex": { bytes: xex.length, sha256: sha256(xex) },
      "dark-fighter.atr": { bytes: atr.length, sha256: sha256(atr) },
    },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);

  writeFile(path.join(buildDirectory, "dark-fighter.bin"), rawPayload);
  writeFile(path.join(buildDirectory, "broadside-runtime.bin"), broadsideRuntime);
  writeFile(path.join(buildDirectory, "broadside-runtime-packed.bin"), packedBroadsideRuntime);
  writeFile(path.join(buildDirectory, "starfield-runtime.bin"), starfieldRuntime);
  writeFile(path.join(buildDirectory, "starfield-runtime-packed.bin"), packedStarfieldRuntime);
  writeFile(path.join(buildDirectory, "a2-kernel-runtime.bin"), a2KernelRuntime);
  writeFile(path.join(buildDirectory, "entity-code-runtime.bin"), entityCodeRuntime);
  writeFile(path.join(buildDirectory, "entity-code-runtime-packed.bin"), packedEntityCodeRuntime);
  writeFile(path.join(buildDirectory, "dark-fighter.map"), mapFile);
  writeFile(path.join(buildDirectory, "dark-fighter.lbl"), labelFile);
  writeFile(path.join(buildDirectory, "manifest.json"), manifestBytes);
  const artifactDirectory = enemyReviewHarness
    ? path.join(buildDirectory, "enemy-review")
    : enemyCombatReviewHarness
      ? path.join(buildDirectory, "enemy-combat-review")
      : paletteCandidate
        ? path.join(buildDirectory, `enemy-palette-${enemyPaletteSlug}`)
        : distDirectory;
  writeFile(path.join(artifactDirectory, "dark-fighter-boot.bin"), rawPayload);
  writeFile(path.join(artifactDirectory, "dark-fighter.xex"), xex);
  writeFile(path.join(artifactDirectory, "dark-fighter.atr"), atr);
  writeFile(path.join(artifactDirectory, "dark-fighter-manifest.json"), manifestBytes);

  if (!isReviewVariant) validateBuildDirectory(rootDirectory);

  if (!quiet) {
    console.log(`Dark Fighter ${gameVersion} built successfully`);
    console.log(`  payload : ${rawPayload.length} bytes / ${bootSectors} sectors @ $${loadAddress.toString(16)}`);
    console.log(`  entry   : $${startAddress.toString(16)}`);
    console.log(`  XEX     : ${xex.length} bytes`);
    console.log(`  ATR     : ${atr.length} bytes`);
    if (enemyReviewHarness) {
      console.log(`  variant : compile-time enemy review harness`);
      console.log(`  output  : ${path.relative(rootDirectory, artifactDirectory)}`);
    } else if (enemyCombatReviewHarness) {
      console.log(`  variant : deterministic Raider combat review`);
      console.log(`  output  : ${path.relative(rootDirectory, artifactDirectory)}`);
    } else if (paletteCandidate) {
      console.log(`  variant : enemy palette ${paletteCandidate.id} ($${paletteCandidate.value.toString(16).padStart(2, "0")})`);
      console.log(`  output  : ${path.relative(rootDirectory, artifactDirectory)}`);
    }
  }
}

build().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
