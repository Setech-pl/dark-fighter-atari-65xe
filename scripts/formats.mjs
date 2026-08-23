import fs from "node:fs";
import path from "node:path";

const ATR_MAGIC = 0x0296;
const ATR_HEADER_SIZE = 16;
const ATR_SECTOR_SIZE = 128;
const ATR_SECTOR_COUNT = 720;
const ACCEPTED_MENU_MUSIC_PAYLOAD_BYTES = 14314;
const RUNTIME_HEADROOM_PAYLOAD_LIMIT = 1536;

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
  invariant(boot[0] === 0, "Boot flag must be zero for disk boot");
  invariant(boot[1] === manifest.bootSectors, "Boot sector count differs from manifest");
  invariant(readWord(boot, 2) === manifest.loadAddress, "Boot load address differs from manifest");
  invariant(readWord(boot, 4) === manifest.bootInitAddress, "Boot init address differs from manifest");
  invariant(
    boot.length - ACCEPTED_MENU_MUSIC_PAYLOAD_BYTES <= RUNTIME_HEADROOM_PAYLOAD_LIMIT,
    "Runtime-headroom feature payload delta exceeds 1536 bytes",
  );
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
  invariant(boot.length === 0x2000 + manifest.broadsideRuntime.packedBytes +
    manifest.starfieldRuntime.packedBytes + manifest.a2Kernel.bytes,
  "Boot payload does not contain both packed relocation tails and the A2 kernel");

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
  invariant(
    parsedAtr.body.subarray(boot.length, loadedBytes).every((byte) => byte === 0),
    "Padding in the final loaded boot sector must be zero",
  );

  return { manifest, boot, xex, atr, parsedXex, parsedAtr };
}

export const atrConstants = {
  magic: ATR_MAGIC,
  headerSize: ATR_HEADER_SIZE,
  sectorSize: ATR_SECTOR_SIZE,
  sectorCount: ATR_SECTOR_COUNT,
};
