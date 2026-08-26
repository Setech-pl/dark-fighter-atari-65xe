import fs from "node:fs";
import path from "node:path";

const ATR_MAGIC = 0x0296;
const ATR_HEADER_SIZE = 16;
const ATR_SECTOR_SIZE = 128;
const ATR_SECTOR_COUNT = 720;
const ACCEPTED_MENU_MUSIC_PAYLOAD_BYTES = 14314;
const RUNTIME_HEADROOM_PAYLOAD_LIMIT = 1536;
const ACCEPTED_RUNTIME_HEADROOM_PAYLOAD_BYTES = 15759;
const ENTITY_EFFECTS_FOUNDATION_PAYLOAD_BUDGET = 1024;
const ENTITY_CODE_FOUNDATION_BYTES = 564;
const DEBRIS_VISUAL_POLISH_PAYLOAD_LIMIT = 16384;
const DEBRIS_VISUAL_POLISH_CODE_BUDGET = 512;
const DEBRIS_VISUAL_POLISH_GLYPH_COUNT = 8;
const DEBRIS_VISUAL_POLISH_NEW_GLYPHS = 7;
const DESTRUCTIBLE_DEBRIS_ENTITY_CODE_BASELINE = 714;
const DESTRUCTIBLE_DEBRIS_ENTITY_CODE_BUDGET = 768;
const DESTRUCTIBLE_DEBRIS_TOTAL_GLYPH_COUNT = 10;
const DESTRUCTIBLE_DEBRIS_RUNTIME_CODE_BASELINE = 13697;
const DESTRUCTIBLE_DEBRIS_RUNTIME_CODE_BUDGET = 768;
const EXACT_BOOT_PAYLOAD_BYTES = 16384;
const EXACT_BOOT_SECTORS = 128;
const MINIMUM_RUNTIME_COMPACTION_RESERVE_BYTES = 1024;
const ACCEPTED_RUNTIME_COMPACTION_RESERVE_BYTES = 1097;
const MINIMUM_WEAPON_PICKUP_RESERVE_BYTES = 512;
const SPREAD_SHOT_RUNTIME_BASELINE_BYTES = 14948;
const SPREAD_SHOT_RUNTIME_HARD_DELTA_BYTES = 448;
const SPREAD_SHOT_ENTITY_BASELINE_BYTES = 1444;
const MINIMUM_SPREAD_SHOT_RESERVE_BYTES = 64;
const BOOT_PAYLOAD_TRAILER = Buffer.from([0x44, 0x46, 0x42, 0x31]); // "DFB1"

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function readWord(buffer, offset) {
  invariant(offset >= 0 && offset + 2 <= buffer.length, `Word outside buffer at ${offset}`);
  return buffer.readUInt16LE(offset);
}

export function makeXex(loadAddress, runAddress, payload) {
  invariant(payload.length > 0, "XEX payload is empty");
  const endAddress = loadAddress + payload.length - 1;
  invariant(endAddress <= 0xffff, "XEX payload exceeds the 16-bit address space");

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0xffff, 0);
  header.writeUInt16LE(loadAddress, 2);
  header.writeUInt16LE(endAddress, 4);

  const runRecord = Buffer.alloc(6);
  runRecord.writeUInt16LE(0x02e0, 0);
  runRecord.writeUInt16LE(0x02e1, 2);
  runRecord.writeUInt16LE(runAddress, 4);

  return Buffer.concat([header, payload, runRecord]);
}

export function parseXex(buffer) {
  invariant(buffer.length >= 8, "XEX is too short");
  invariant(readWord(buffer, 0) === 0xffff, "XEX is missing the $FFFF marker");

  const segments = [];
  let offset = 2;
  while (offset < buffer.length) {
    invariant(offset + 4 <= buffer.length, "Truncated XEX segment header");
    let start = readWord(buffer, offset);
    offset += 2;
    if (start === 0xffff) {
      invariant(offset + 4 <= buffer.length, "Truncated XEX segment after marker");
      start = readWord(buffer, offset);
      offset += 2;
    }
    const end = readWord(buffer, offset);
    offset += 2;
    invariant(end >= start, `Invalid XEX segment $${start.toString(16)}-$${end.toString(16)}`);
    const length = end - start + 1;
    invariant(offset + length <= buffer.length, "Truncated XEX segment data");
    segments.push({ start, end, data: buffer.subarray(offset, offset + length) });
    offset += length;
  }

  return { segments };
}

export function makeAtr(bootPayload) {
  invariant(bootPayload.length > 0, "ATR boot payload is empty");
  invariant(bootPayload.length <= 255 * ATR_SECTOR_SIZE, "Boot payload needs more than 255 sectors");
  invariant(bootPayload.length % ATR_SECTOR_SIZE === 0,
    "ATR boot payload must occupy complete source-owned sectors; formatter padding is forbidden");

  const bodySize = ATR_SECTOR_SIZE * ATR_SECTOR_COUNT;
  const body = Buffer.alloc(bodySize);
  bootPayload.copy(body, 0);

  const header = Buffer.alloc(ATR_HEADER_SIZE);
  const paragraphs = bodySize / 16;
  header.writeUInt16LE(ATR_MAGIC, 0);
  header.writeUInt16LE(paragraphs & 0xffff, 2);
  header.writeUInt16LE(ATR_SECTOR_SIZE, 4);
  header.writeUInt16LE((paragraphs >>> 16) & 0xffff, 6);

  return Buffer.concat([header, body]);
}

export function parseAtr(buffer) {
  invariant(buffer.length >= ATR_HEADER_SIZE + ATR_SECTOR_SIZE, "ATR is too short");
  const magic = readWord(buffer, 0);
  const paragraphs = readWord(buffer, 2) | (readWord(buffer, 6) << 16);
  const sectorSize = readWord(buffer, 4);
  const body = buffer.subarray(ATR_HEADER_SIZE);

  invariant(magic === ATR_MAGIC, `Invalid ATR magic $${magic.toString(16)}`);
  invariant(sectorSize === ATR_SECTOR_SIZE, `Unsupported ATR sector size ${sectorSize}`);
  invariant(body.length === paragraphs * 16, "ATR paragraph count does not match file length");

  return {
    magic,
    paragraphs,
    sectorSize,
    body,
    boot: {
      flags: body[0],
      sectorCount: body[1],
      loadAddress: readWord(body, 2),
      initAddress: readWord(body, 4),
    },
  };
}

export function validateBuildDirectory(rootDirectory) {
  const distDirectory = path.join(rootDirectory, "dist");
  const manifestPath = path.join(distDirectory, "dark-fighter-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const boot = fs.readFileSync(path.join(distDirectory, "dark-fighter-boot.bin"));
  const xex = fs.readFileSync(path.join(distDirectory, "dark-fighter.xex"));
  const atr = fs.readFileSync(path.join(distDirectory, "dark-fighter.atr"));

  invariant(boot.length === manifest.payloadBytes, "Manifest payload size differs from boot binary");
  invariant(boot.length === EXACT_BOOT_PAYLOAD_BYTES,
    "Release boot payload must be exactly 16384 bytes");
  invariant(manifest.bootSectors === EXACT_BOOT_SECTORS,
    "Release boot image must load exactly 128 sectors");
  invariant(boot.subarray(-BOOT_PAYLOAD_TRAILER.length).equals(BOOT_PAYLOAD_TRAILER),
    "Release boot payload is missing its source-owned DFB1 trailer");
  invariant(manifest.bootPayloadTrailer?.address === 0x5ffc &&
    manifest.bootPayloadTrailer.bytes === BOOT_PAYLOAD_TRAILER.length &&
    manifest.bootPayloadTrailer.hex === BOOT_PAYLOAD_TRAILER.toString("hex") &&
    manifest.bootPayloadTrailer.sourceOwned === true,
  "Manifest does not describe the source-owned boot trailer at $5FFC-$5FFF");
  invariant(boot[0] === 0, "Boot flag must be zero for disk boot");
  invariant(boot[1] === manifest.bootSectors, "Boot sector count differs from manifest");
  invariant(readWord(boot, 2) === manifest.loadAddress, "Boot load address differs from manifest");
  invariant(readWord(boot, 4) === manifest.bootInitAddress, "Boot init address differs from manifest");
  invariant(manifest.payloadBudget?.historicalRuntimeHeadroom?.baselineBytes ===
    ACCEPTED_MENU_MUSIC_PAYLOAD_BYTES &&
    manifest.payloadBudget.historicalRuntimeHeadroom.approvedDeltaBytes ===
      RUNTIME_HEADROOM_PAYLOAD_LIMIT,
  "Historical runtime-headroom payload gate is missing");
  invariant(boot.length - ACCEPTED_RUNTIME_HEADROOM_PAYLOAD_BYTES <=
    ENTITY_EFFECTS_FOUNDATION_PAYLOAD_BUDGET,
  "Entity/effects foundation exceeds its explicit payload budget");
  invariant(manifest.broadsideRuntime?.loadAddress === 0x4000,
    "Broadside relocation source must begin at $4000");
  invariant(manifest.broadsideRuntime?.runAddress === 0x5e10,
    "Broadside runtime must begin at reclaimed RAM $5E10");
  invariant(manifest.broadsideRuntime?.bytes <= manifest.broadsideRuntime?.reservedBytes,
    "Broadside runtime exceeds its reserved relocation block");
  invariant(manifest.starfieldRuntime?.runAddress === 0x552a,
    "Starfield runtime must begin in the reviewed pre-broadside gap $552A");
  invariant(manifest.starfieldRuntime?.bytes <= manifest.starfieldRuntime?.reservedBytes,
    "Starfield runtime exceeds its reserved relocation block");
  invariant(manifest.starfieldRuntime?.packedBytes <= manifest.starfieldRuntime?.stagingBytes,
    "Packed starfield exceeds temporary staging storage");
  invariant(manifest.a2Kernel?.runAddress === 0x9000,
    "A2 kernel must run in unconditional RAM at $9000");
  invariant(manifest.a2Kernel?.bytes > 0 &&
    manifest.a2Kernel.bytes <= manifest.a2Kernel.reservedBytes,
  "A2 kernel exceeds its reserved runtime block");
  invariant(manifest.entityEffects?.stateAddress === 0x8000 &&
    manifest.entityEffects.stateBytes === 0x0100 &&
    manifest.entityEffects.initializedBytes === 0x0100,
  "Entity/effects BSS must be exactly and explicitly initialised at $8000-$80FF");
  invariant(manifest.entityEffects.interactiveSlots === 4 &&
    manifest.entityEffects.interactiveActiveLimit === 2 &&
    manifest.entityEffects.effectSlots === 6 &&
    manifest.entityEffects.effectActiveLimit === 5,
  "Rapid Fire must coexist with debris without expanding either physical pool");
  invariant(manifest.entityEffects?.codeRunAddress === 0x9100 &&
    manifest.entityEffects.codeBytes > 0 &&
    manifest.entityEffects.codeBytes <= manifest.entityEffects.codeReservedBytes,
  "ENTITY_CODE exceeds its $9100-$9FFF runtime reservation");
  invariant(
    manifest.entityEffects.codeBudget?.baselineBytes === ENTITY_CODE_FOUNDATION_BYTES &&
    manifest.entityEffects.codeBudget?.approvedDeltaBytes === DEBRIS_VISUAL_POLISH_CODE_BUDGET &&
    manifest.entityEffects.codeBudget?.destructibleDebris?.baselineBytes ===
      DESTRUCTIBLE_DEBRIS_ENTITY_CODE_BASELINE &&
    manifest.entityEffects.codeBudget.destructibleDebris.approvedDeltaBytes ===
      DESTRUCTIBLE_DEBRIS_ENTITY_CODE_BUDGET &&
    manifest.entityEffects.codeBudget.weaponPickupSpreadShot.baselineBytes ===
      SPREAD_SHOT_ENTITY_BASELINE_BYTES &&
    manifest.entityEffects.codeBudget.weaponPickupSpreadShot.actualDeltaBytes <=
      SPREAD_SHOT_RUNTIME_HARD_DELTA_BYTES,
  "Spread Shot exceeds its +448 B ENTITY_CODE/runtime budget");
  invariant(manifest.entityEffects.debrisGlyphCount === DEBRIS_VISUAL_POLISH_GLYPH_COUNT &&
    manifest.entityEffects.glyphCount === DESTRUCTIBLE_DEBRIS_TOTAL_GLYPH_COUNT + 8 &&
    manifest.entityEffects.effectGlyphCount === 2 &&
    manifest.entityEffects.weaponPickupGlyphCount === 4 &&
    manifest.entityEffects.weaponPickupGlyphIndex === 120 &&
    manifest.entityEffects.spreadPickupGlyphCount === 4 &&
    manifest.entityEffects.spreadPickupGlyphIndex === 124 &&
    manifest.entityEffects.newGlyphsFromFoundation === DEBRIS_VISUAL_POLISH_NEW_GLYPHS,
  "Weapon pickups must retain debris/effects and use exactly glyphs 120-127");
  invariant(manifest.payloadBytes === DEBRIS_VISUAL_POLISH_PAYLOAD_LIMIT &&
    manifest.bootSectors === EXACT_BOOT_SECTORS &&
    manifest.payloadBudget?.debrisVisualPolish?.limitBytes ===
      DEBRIS_VISUAL_POLISH_PAYLOAD_LIMIT,
  "Debris visual polish exceeds the owner-approved 16384-byte / 128-sector boot limit");
  invariant(manifest.payloadBudget?.destructibleDebris?.limitBytes ===
    DEBRIS_VISUAL_POLISH_PAYLOAD_LIMIT &&
    manifest.runtimeCodeBudget?.baselineBytes ===
      DESTRUCTIBLE_DEBRIS_RUNTIME_CODE_BASELINE &&
    manifest.runtimeCodeBudget.approvedDeltaBytes === DESTRUCTIBLE_DEBRIS_RUNTIME_CODE_BUDGET,
  "Historical destructible-debris payload/runtime metadata changed");
  const compaction = manifest.payloadBudget?.runtimePayloadCompaction;
  invariant(compaction?.recoveredReserveBytes === ACCEPTED_RUNTIME_COMPACTION_RESERVE_BYTES &&
    compaction.baselineReserveBytes === ACCEPTED_RUNTIME_COMPACTION_RESERVE_BYTES &&
    compaction.minimumRecoveredReserveBytes === MINIMUM_RUNTIME_COMPACTION_RESERVE_BYTES &&
    compaction.sourceOwned === true && compaction.fillByte === 0,
  "Runtime payload compaction baseline does not preserve its accepted reserve proof");
  const rapidFire = manifest.payloadBudget?.weaponPickupRapidFire;
  invariant(rapidFire?.baselineReserveBytes === ACCEPTED_RUNTIME_COMPACTION_RESERVE_BYTES &&
    rapidFire.minimumRemainingReserveBytes === MINIMUM_WEAPON_PICKUP_RESERVE_BYTES &&
    rapidFire.remainingReserveBytes === compaction.reserveBytes &&
    rapidFire.consumedReserveBytes ===
      rapidFire.baselineReserveBytes - rapidFire.remainingReserveBytes,
  "Rapid Fire historical source-owned payload metadata changed");
  const spreadShot = manifest.payloadBudget?.weaponPickupSpreadShot;
  invariant(spreadShot?.baselineReserveBytes === 518 &&
    spreadShot.minimumRemainingReserveBytes === MINIMUM_SPREAD_SHOT_RESERVE_BYTES &&
    spreadShot.remainingReserveBytes === compaction.reserveBytes &&
    spreadShot.remainingReserveBytes >= MINIMUM_SPREAD_SHOT_RESERVE_BYTES &&
    spreadShot.consumedReserveBytes ===
      spreadShot.baselineReserveBytes - spreadShot.remainingReserveBytes,
  "Spread Shot exceeds its source-owned payload reserve");
  invariant(manifest.runtimeCodeBudget?.weaponPickupSpreadShot?.baselineBytes ===
    SPREAD_SHOT_RUNTIME_BASELINE_BYTES &&
    manifest.runtimeCodeBudget.weaponPickupSpreadShot.actualDeltaBytes <=
      SPREAD_SHOT_RUNTIME_HARD_DELTA_BYTES,
  "Spread Shot exceeds its linked runtime hard budget");
  invariant(manifest.residentRuntime?.loadAddress === 0x2000 &&
    manifest.residentRuntime.runAddress === 0x2000 &&
    manifest.residentRuntime.rawBytes === 0x2000 &&
    manifest.residentRuntime.prefixBytes + manifest.residentRuntime.suffixRawBytes === 0x2000 &&
    manifest.residentRuntime.suffixPackedBytes < manifest.residentRuntime.suffixRawBytes,
  "Resident runtime suffix compaction metadata is inconsistent");
  invariant(boot.length === manifest.residentRuntime.prefixBytes +
    manifest.residentRuntime.suffixPackedBytes + manifest.broadsideRuntime.packedBytes +
    manifest.starfieldRuntime.packedBytes + manifest.a2Kernel.bytes +
    manifest.entityEffects.packedBytes + compaction.reserveBytes +
    BOOT_PAYLOAD_TRAILER.length,
  "Boot payload does not contain the compacted runtime, relocation tails and reserve");
  invariant(compaction.reserveAddress === manifest.loadAddress +
    manifest.residentRuntime.prefixBytes + manifest.residentRuntime.suffixPackedBytes +
    manifest.broadsideRuntime.packedBytes + manifest.starfieldRuntime.packedBytes +
    manifest.a2Kernel.bytes + manifest.entityEffects.packedBytes &&
    compaction.reserveEndAddress === manifest.bootPayloadTrailer.address - 1,
  "Runtime payload reserve does not occupy the documented pre-trailer range");
  const reserveOffset = compaction.reserveAddress - manifest.loadAddress;
  invariant(boot.subarray(reserveOffset, reserveOffset + compaction.reserveBytes)
    .every((byte) => byte === compaction.fillByte),
  "Runtime payload reserve is not the source-owned zero-filled range from the manifest");

  const parsedXex = parseXex(xex);
  invariant(parsedXex.segments.length === 2, "XEX must contain the payload and RUNAD segments");
  const payloadSegment = parsedXex.segments[0];
  const runSegment = parsedXex.segments[1];
  invariant(payloadSegment.start === manifest.loadAddress, "XEX payload load address is wrong");
  invariant(payloadSegment.data.equals(boot), "XEX payload differs from boot binary");
  invariant(runSegment.start === 0x02e0 && runSegment.end === 0x02e1, "XEX RUNAD record is missing");
  invariant(readWord(runSegment.data, 0) === manifest.startAddress, "XEX RUNAD differs from start label");

  const parsedAtr = parseAtr(atr);
  invariant(atr.length === 92176, "ATR is not a standard 90 KB single-density image");
  invariant(parsedAtr.boot.flags === 0, "ATR boot flag must be zero");
  invariant(parsedAtr.boot.sectorCount === manifest.bootSectors, "ATR boot sector count is wrong");
  invariant(parsedAtr.boot.loadAddress === manifest.loadAddress, "ATR boot load address is wrong");
  invariant(parsedAtr.boot.initAddress === manifest.bootInitAddress, "ATR init address is wrong");
  invariant(parsedAtr.body.subarray(0, boot.length).equals(boot), "ATR payload differs from boot binary");

  const loadedBytes = manifest.bootSectors * ATR_SECTOR_SIZE;
  invariant(loadedBytes === boot.length,
    "ATR loader sector count must not imply formatter-supplied payload padding");

  return { manifest, boot, xex, atr, parsedXex, parsedAtr };
}

export const atrConstants = {
  magic: ATR_MAGIC,
  headerSize: ATR_HEADER_SIZE,
  sectorSize: ATR_SECTOR_SIZE,
  sectorCount: ATR_SECTOR_COUNT,
};
