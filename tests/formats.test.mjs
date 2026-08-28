import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { atrConstants, parseAtr, parseXex, validateBuildDirectory } from "../scripts/formats.mjs";
import { unpackBroadsideLzss } from "../scripts/broadside-lzss.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const packageDefinition = JSON.parse(fs.readFileSync(path.join(rootDirectory, "package.json"), "utf8"));

test("generated artifact set is internally consistent", () => {
  const { manifest } = validateBuildDirectory(rootDirectory);
  assert.equal(manifest.gameVersion, packageDefinition.version);
  assert.equal(manifest.target, "Atari 65XE PAL / 64 KB");
  assert.equal(manifest.payloadBytes, 16_384);
  assert.equal(manifest.bootSectors, 128);
  assert.deepEqual(manifest.bootPayloadTrailer, {
    address: 0x5ffc,
    bytes: 4,
    ascii: "DFB1",
    hex: "44464231",
    sourceOwned: true,
  });
});

test("XEX contains a payload segment and RUNAD", () => {
  const xex = fs.readFileSync(path.join(rootDirectory, "dist", "dark-fighter.xex"));
  const { segments } = parseXex(xex);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].start, 0x2000);
  assert.equal(segments[0].end, 0x5fff);
  assert.equal(segments[0].data.subarray(-4).toString("ascii"), "DFB1");
  assert.deepEqual([segments[1].start, segments[1].end], [0x02e0, 0x02e1]);
});

test("ATR uses standard single-density geometry", () => {
  const atr = fs.readFileSync(path.join(rootDirectory, "dist", "dark-fighter.atr"));
  const parsed = parseAtr(atr);
  assert.equal(parsed.magic, atrConstants.magic);
  assert.equal(parsed.sectorSize, 128);
  assert.equal(parsed.body.length, 720 * 128);
  assert.equal(atr.length, 92176);
  assert.equal(parsed.boot.sectorCount, 128);
  assert.equal(parsed.body.subarray(0x3ffc, 0x4000).toString("ascii"), "DFB1");
});

test("resident compaction proof survives and Spread Shot leaves at least 64 source-owned bytes", () => {
  const { manifest, boot, parsedXex, parsedAtr } = validateBuildDirectory(rootDirectory);
  const resident = fs.readFileSync(path.join(rootDirectory, "build", "resident-runtime.bin"));
  const suffix = fs.readFileSync(
    path.join(rootDirectory, "build", "resident-runtime-suffix.bin"),
  );
  const packed = fs.readFileSync(
    path.join(rootDirectory, "build", "resident-runtime-suffix-packed.bin"),
  );
  const layout = manifest.residentRuntime;
  const reserve = manifest.payloadBudget.runtimePayloadCompaction;

  assert.deepEqual([
    resident.length,
    layout.prefixBytes,
    suffix.length,
    packed.length,
    layout.suffixRawBytes - layout.suffixPackedBytes,
  ], [8192, 449, layout.suffixRawBytes, layout.suffixPackedBytes,
    layout.suffixRawBytes - layout.suffixPackedBytes]);
  assert.ok(layout.suffixRawBytes - layout.suffixPackedBytes >= 1100);
  assert.deepEqual(unpackBroadsideLzss(packed), suffix);
  assert.deepEqual(resident.subarray(layout.prefixBytes), suffix);
  assert.deepEqual(
    boot.subarray(layout.packedSourceAddress - manifest.loadAddress,
      layout.packedSourceAddress - manifest.loadAddress + packed.length),
    packed,
  );
  assert.equal(reserve.recoveredReserveBytes, 1097);
  assert.equal(reserve.minimumRecoveredReserveBytes, 1024);
  assert.ok(reserve.reserveBytes >= 64);
  assert.deepEqual(manifest.payloadBudget.weaponPickupRapidFire, {
    baselineReserveBytes: 1097,
    minimumRemainingReserveBytes: 512,
    remainingReserveBytes: reserve.reserveBytes,
    consumedReserveBytes: 1097 - reserve.reserveBytes,
  });
  assert.deepEqual(manifest.payloadBudget.weaponPickupSpreadShot, {
    baselineReserveBytes: 518,
    minimumRemainingReserveBytes: 64,
    remainingReserveBytes: reserve.reserveBytes,
    consumedReserveBytes: 518 - reserve.reserveBytes,
  });
  assert.equal(reserve.reserveEndAddress, 0x5ffb);
  assert.equal(boot.subarray(reserve.reserveAddress - manifest.loadAddress,
    reserve.reserveAddress - manifest.loadAddress + reserve.reserveBytes)
    .every((byte) => byte === 0), true);
  assert.deepEqual(parsedXex.segments[0].data, boot);
  assert.deepEqual(parsedAtr.body.subarray(0, boot.length), boot);
  assert.equal(manifest.entityEffects.stagedSourceAddress, 0x5140);
  assert.ok(manifest.entityEffects.stagedEndAddress <
    manifest.entityEffects.packedSourceAddress);
});
