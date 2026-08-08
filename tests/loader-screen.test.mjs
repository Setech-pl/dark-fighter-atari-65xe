import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  anticFRegisterForBitmapBit,
  compileLoaderBitmap,
  createLoaderDisplayListBytes,
  encodeLoaderBitmapPixels,
  loadLoaderBitmapDefinition,
  loaderBitmapConstants,
  renderLoaderCa65Include,
  unpackLoaderPackBits,
} from "../scripts/loader-assets.mjs";
import { parseXex } from "../scripts/formats.mjs";
import {
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  createGameplayPreview,
  createLoaderPreview,
  inspectPng,
} from "../scripts/preview.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const definitionPath = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "loader-bitmap.json",
);
const obsoleteDefinitionPath = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "loader-screen.json",
);
const referencePath = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "loader.png",
);
const sourcePath = path.join(rootDirectory, "src", "main.s");
const labelsPath = path.join(rootDirectory, "build", "dark-fighter.lbl");
const mapPath = path.join(rootDirectory, "build", "dark-fighter.map");
const includePath = path.join(rootDirectory, "build", "loader-screen.inc");
const xexPath = path.join(rootDirectory, "dist", "dark-fighter.xex");
const manifestPath = path.join(
  rootDirectory,
  "dist",
  "dark-fighter-manifest.json",
);
const definition = loadLoaderBitmapDefinition(definitionPath);
const compiled = compileLoaderBitmap(definition);
const source = fs.readFileSync(sourcePath, "utf8");

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readLabels() {
  const labels = new Map();
  for (const line of fs.readFileSync(labelsPath, "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) {
      labels.set(match[2], Number.parseInt(match[1], 16));
    }
  }
  return labels;
}

function readXexBytes(address, length) {
  const { segments } = parseXex(fs.readFileSync(xexPath));
  const segment = segments.find(
    ({ start, end }) => address >= start && address + length - 1 <= end,
  );
  assert.ok(segment, `XEX does not contain $${address.toString(16)}`);
  return segment.data.subarray(
    address - segment.start,
    address - segment.start + length,
  );
}

function countPixels({ x, y, width, height }) {
  let set = 0;
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      set += compiled.pixels[row * compiled.width + column];
    }
  }
  return set;
}

test("loader reference PNG is present and unchanged", () => {
  const reference = fs.readFileSync(referencePath);
  assert.deepEqual(
    [...reference.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  );
  assert.equal(reference.readUInt32BE(16), 1402);
  assert.equal(reference.readUInt32BE(20), 1122);
  assert.equal(sha256(reference), definition.reference.sha256);
  assert.equal(
    sha256(reference),
    "da740dc90db7b2822d73a8aa191c364e523cd0c65b669a2664b5923e83960036",
  );
});

test("ANTIC F source is exactly 320x192 with 40 MSB-first bytes per row", () => {
  assert.deepEqual(
    [compiled.width, compiled.height, compiled.bytesPerRow],
    [320, 192, 40],
  );
  assert.equal(compiled.bitmapBytes.length, 7680);
  assert.equal(loaderBitmapConstants.bytes, 7680);

  const pixels = new Uint8Array(320 * 192);
  pixels[0] = 1;
  pixels[7] = 1;
  pixels[8] = 1;
  const encoded = encodeLoaderBitmapPixels(pixels);
  assert.deepEqual([...encoded.subarray(0, 2)], [0x81, 0x80]);
});

test("PackBits round-trip is exact and ends at the bitmap boundary", () => {
  const unpacked = unpackLoaderPackBits(compiled.packedBitmap);
  assert.equal(unpacked.length, 7680);
  assert.deepEqual(unpacked, compiled.bitmapBytes);
  assert.equal(compiled.bitmapAddress, 0x4010);
  assert.equal(compiled.bitmapAddress + unpacked.length, 0x5e10);

  const guard = new Uint8Array(unpacked.length + 2);
  guard[0] = 0xa5;
  guard[guard.length - 1] = 0x5a;
  guard.set(unpacked, 1);
  assert.equal(guard[0], 0xa5);
  assert.equal(guard[guard.length - 1], 0x5a);
});

test("both LMS ranges preserve 40-byte rows across 4 KB boundaries", () => {
  assert.equal(compiled.secondLmsLine, 102);
  assert.equal(compiled.bitmapAddress + 102 * 40, 0x5000);
  assert.equal(compiled.secondLmsAddress + 90 * 40, 0x5e10);

  for (let line = 0; line < 192; line += 1) {
    const address =
      line < compiled.secondLmsLine
        ? compiled.bitmapAddress + line * 40
        : compiled.secondLmsAddress +
          (line - compiled.secondLmsLine) * 40;
    assert.ok((address & 0x0fff) + 39 <= 0x0fff, `line ${line} crosses 4 KB`);
  }
});

test("bitmap has non-empty title, detailed hull, three engines, BSG, and studio", () => {
  assert.ok(countPixels(compiled.landmarks.title) > 1800);
  assert.ok(countPixels(compiled.landmarks.ship) > 5000);
  assert.ok(countPixels(compiled.landmarks.marking) > 100);
  assert.ok(countPixels(compiled.landmarks.studio) > 250);
  for (const engine of compiled.landmarks.engineBands) {
    assert.ok(countPixels(engine) > 400);
  }

  const rearBands = [
    { x: 10, y: 55, width: 32, height: 19 },
    { x: 10, y: 82, width: 32, height: 28 },
    { x: 14, y: 120, width: 28, height: 23 },
  ];
  for (const engine of rearBands) {
    assert.ok(countPixels(engine) > 60);
  }
});

test("three ANTIC F zones use black luminance-zero backgrounds and $EC studio", () => {
  assert.deepEqual(
    compiled.paletteZones.map(({ startLine, endLine, foregroundValue }) => [
      startLine,
      endLine,
      foregroundValue,
    ]),
    [
      [0, 39, 0x1e],
      [40, 163, 0x0a],
      [164, 191, 0xec],
    ],
  );
  assert.deepEqual(compiled.dliLines, [39, 163]);
  for (const zone of compiled.paletteZones) {
    assert.equal(zone.values.get("COLBK"), 0x00);
    assert.equal(zone.values.get("COLPF2") & 0x0f, 0);
    assert.equal(anticFRegisterForBitmapBit(zone.values, 1), zone.foregroundValue);
    assert.equal(anticFRegisterForBitmapBit(zone.values, 0), zone.values.get("COLPF2"));
  }
  const [title, ship, studio] = compiled.paletteZones;
  assert.equal(title.values.get("COLPF1"), 0x1e);
  assert.equal(anticFRegisterForBitmapBit(title.values, 1), 0x1e);
  assert.equal(ship.values.get("COLPF1"), 0x0a);
  assert.equal(anticFRegisterForBitmapBit(ship.values, 1), 0x0a);
  assert.equal(studio.values.get("COLPF1"), 0xec);
  assert.equal(studio.values.get("COLPF2"), 0xe0);
  assert.equal(anticFRegisterForBitmapBit(studio.values, 1), 0xec);
});

test("studio bitmap set pixels use the assembled COLPF1=$EC DLI mapping", () => {
  const labels = readLabels();
  const dliAddress = labels.get("loader_dli");
  assert.ok(Number.isInteger(dliAddress));
  const dliBytes = readXexBytes(dliAddress, 64);
  const studioWrites = Buffer.from([
    0xa9, 0xec, 0x8d, 0x17, 0xd0,
    0xa9, 0xe0, 0x8d, 0x18, 0xd0,
  ]);
  assert.notEqual(
    dliBytes.indexOf(studioWrites),
    -1,
    "loader DLI must write COLPF1=$EC then COLPF2=$E0",
  );

  const studio = compiled.paletteZones[2];
  assert.deepEqual([studio.startLine, studio.endLine], [164, 191]);
  let studioSetPixel = -1;
  for (let y = studio.startLine; y <= studio.endLine && studioSetPixel < 0; y += 1) {
    const row = compiled.pixels.subarray(y * compiled.width, (y + 1) * compiled.width);
    if (row.includes(1)) {
      studioSetPixel = y;
    }
  }
  assert.notEqual(studioSetPixel, -1, "studio band must contain set bitmap pixels");
  assert.equal(anticFRegisterForBitmapBit(studio.values, 1), 0xec);
  assert.equal(anticFRegisterForBitmapBit(studio.values, 0), 0xe0);

  const titlePalette = source.slice(
    source.indexOf("set_loader_title_palette:"),
    source.indexOf("loader_dli:"),
  );
  assert.match(titlePalette, /lda #LOADER_TITLE_COLPF1\s+sta COLPF1/);
  assert.match(titlePalette, /lda #LOADER_TITLE_COLPF2\s+sta COLPF2/);
  const dliSource = source.slice(
    source.indexOf("loader_dli:"),
    source.indexOf("unpack_loader_bitmap:"),
  );
  assert.match(dliSource, /pha[\s\S]+sta WSYNC[\s\S]+pla\s+rti/);
  assert.match(dliSource, /lda #LOADER_STUDIO_COLPF1\s+sta COLPF1/);
  assert.match(dliSource, /lda #LOADER_STUDIO_COLPF2\s+sta COLPF2/);
});

test("generated include is canonical and contains no ANTIC 4 loader assets", () => {
  assert.equal(
    fs.readFileSync(includePath, "utf8"),
    renderLoaderCa65Include(compiled),
  );
  assert.equal(fs.existsSync(obsoleteDefinitionPath), false);
  assert.doesNotMatch(source, /copy_loader_charset|loader_charset_data/);
  assert.doesNotMatch(source, /loader_screen_packbits|unpack_loader_screen/);
});

test("assembled display list contains 192 ANTIC F lines, two LMS, DLI, and self-JVB", () => {
  const labels = readLabels();
  const displayListAddress = labels.get("loader_display_list");
  assert.ok(Number.isInteger(displayListAddress));
  const expected = createLoaderDisplayListBytes(compiled, displayListAddress);
  assert.equal(expected.length, 202);
  assert.deepEqual(
    readXexBytes(displayListAddress, expected.length),
    Buffer.from(expected),
  );

  let offset = 3;
  let modeLines = 0;
  let lmsCount = 0;
  const dliLines = [];
  for (let line = 0; line < 192; line += 1) {
    const opcode = expected[offset];
    assert.equal(opcode & 0x0f, 0x0f);
    modeLines += 1;
    offset += 1;
    if (opcode & 0x80) {
      dliLines.push(line);
    }
    if (opcode & 0x40) {
      const lmsAddress = expected[offset] | (expected[offset + 1] << 8);
      assert.equal(
        lmsAddress,
        line === 0 ? compiled.bitmapAddress : compiled.secondLmsAddress,
      );
      lmsCount += 1;
      offset += 2;
    }
  }
  assert.equal(modeLines, 192);
  assert.equal(lmsCount, 2);
  assert.deepEqual(dliLines, [39, 163]);
  assert.deepEqual(
    [...expected.subarray(offset)],
    [0x41, displayListAddress & 0xff, displayListAddress >> 8],
  );
});

test("XEX and ATR use the current packed bitmap source", () => {
  const labels = readLabels();
  const packedAddress = labels.get("loader_bitmap_packbits");
  assert.ok(Number.isInteger(packedAddress));
  assert.deepEqual(
    readXexBytes(packedAddress, compiled.packedBitmap.length),
    Buffer.from(compiled.packedBitmap),
  );

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.loaderScreen.mode, "ANTIC F");
  assert.equal(manifest.loaderScreen.source, "assets/graphics/loader-bitmap.json");
  assert.equal(manifest.loaderScreen.unpackedBitmapBytes, 7680);
  assert.equal(
    manifest.loaderScreen.packedBitmapBytes,
    compiled.packedBitmap.length,
  );
});

test("loader still owns exactly 250 full PAL frames and enters the main menu", () => {
  assert.ok(source.indexOf("jsr show_loader") < source.indexOf("jsr enter_main_menu"));
  assert.ok(source.indexOf("jsr enter_main_menu") < source.indexOf("start_gameplay:"));
  assert.match(source, /lda #LOADER_DURATION_FRAMES\s+sta loader_frame_count/);
  assert.match(
    source,
    /jsr wait_frame_start\s+jsr set_loader_title_palette\s+dec loader_frame_count\s+bne @frame/,
  );
  assert.match(source, /sta WSYNC/);
  assert.match(source, /pla\s+rti/);
  assert.match(source, /lda #\$00\s+sta NMIEN\s+sta DMACTL\s+rts/);
  assert.match(source, /jsr show_loader[\s\S]+jsr clear_pmg[\s\S]+jsr copy_charset/);
  assert.match(source, /jsr enter_main_menu\s+jmp frontend_loop/);
});

test("loader memory stays below active PMG data and uses transient graphics RAM", () => {
  const map = fs.readFileSync(mapPath, "utf8");
  const mainEnd = /RODATA\s+[0-9A-F]+\s+([0-9A-F]+)/i.exec(map);
  assert.ok(mainEnd);
  assert.ok(Number.parseInt(mainEnd[1], 16) < 0x3b00);
  assert.equal(compiled.bitmapAddress, 0x4010);
  assert.equal(compiled.bitmapAddress + compiled.bitmapBytes.length - 1, 0x5e0f);
});

test("loader integration preserves the accepted gameplay preview exactly", () => {
  const preview = createGameplayPreview(source);
  assert.equal(
    sha256(preview),
    "a105e05a40558e9c5d3f100d5eac6bd603471136bc57a3ccb965231b4ebaa91d",
  );
  assert.deepEqual(
    [inspectPng(preview).width, inspectPng(preview).height],
    [640, 384],
  );
});

test("loader preview is deterministic 2x RGB generated from the ANTIC F bitmap", () => {
  const first = createLoaderPreview(definition);
  const second = createLoaderPreview(
    loadLoaderBitmapDefinition(definitionPath),
  );
  assert.deepEqual(first, second);

  const info = inspectPng(first);
  assert.deepEqual(
    [info.width, info.height],
    [PREVIEW_WIDTH, PREVIEW_HEIGHT],
  );
  assert.deepEqual([info.width, info.height], [640, 384]);
  assert.equal(info.bitDepth, 8);
  assert.equal(info.colorType, 2);
});
