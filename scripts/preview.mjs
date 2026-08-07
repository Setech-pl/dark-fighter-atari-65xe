import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import {
  compileLoaderBitmap,
  loadLoaderBitmapDefinition,
} from "./loader-assets.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");

const SCREEN_COLUMNS = 40;
const SCREEN_ROWS = 24;
const CHARACTER_HEIGHT = 8;
const ANTIC_PIXELS_PER_BYTE = 4;
const HIGH_RES_PIXELS_PER_COLOR_CLOCK = 2;
const PREVIEW_SCALE = 2;
const PMG_LEFT_EDGE = 48;
const PMG_SCREEN_TOP = 32;

const SOURCE_WIDTH =
  SCREEN_COLUMNS * ANTIC_PIXELS_PER_BYTE * HIGH_RES_PIXELS_PER_COLOR_CLOCK;
const SOURCE_HEIGHT = SCREEN_ROWS * CHARACTER_HEIGHT;

export const PREVIEW_WIDTH = SOURCE_WIDTH * PREVIEW_SCALE;
export const PREVIEW_HEIGHT = SOURCE_HEIGHT * PREVIEW_SCALE;
export const DEFAULT_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "gameplay-screen.png",
);
export const DEFAULT_LOADER_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "loader-screen.png",
);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function stripComment(line) {
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') {
      quoted = !quoted;
    } else if (line[index] === ";" && !quoted) {
      return line.slice(0, index);
    }
  }
  return line;
}

function normalizeExpression(expression, constants) {
  let normalized = expression
    .replace(/\$([0-9a-f]+)/gi, "0x$1")
    .replace(/%([01]+)/g, "0b$1");

  normalized = normalized.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (name) => {
    if (!constants.has(name)) {
      throw new Error(`Unknown ca65 constant in preview source: ${name}`);
    }
    return String(constants.get(name));
  });

  if (!/^[\dA-Fa-fxob()+\-*/|&<>\s]+$/.test(normalized)) {
    throw new Error(`Unsupported ca65 expression in preview source: ${expression}`);
  }
  return normalized;
}

function evaluateExpression(expression, constants) {
  const normalized = normalizeExpression(expression.trim(), constants);
  const value = Function(`"use strict"; return (${normalized});`)();
  if (!Number.isInteger(value)) {
    throw new Error(`Non-integer ca65 expression in preview source: ${expression}`);
  }
  return value;
}

function parseConstants(source) {
  const pending = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = stripComment(rawLine).trim();
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(line);
    if (match) {
      pending.push({ name: match[1], expression: match[2] });
    }
  }

  const constants = new Map();
  while (pending.length > 0) {
    let resolved = 0;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      try {
        const value = evaluateExpression(pending[index].expression, constants);
        constants.set(pending[index].name, value);
        pending.splice(index, 1);
        resolved += 1;
      } catch (error) {
        if (!String(error.message).startsWith("Unknown ca65 constant")) {
          throw error;
        }
      }
    }
    if (resolved === 0) {
      break;
    }
  }
  return constants;
}

function splitByteArguments(argumentsText) {
  const argumentsList = [];
  let start = 0;
  let quoted = false;
  for (let index = 0; index < argumentsText.length; index += 1) {
    const character = argumentsText[index];
    if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      argumentsList.push(argumentsText.slice(start, index).trim());
      start = index + 1;
    }
  }
  argumentsList.push(argumentsText.slice(start).trim());
  return argumentsList.filter(Boolean);
}

function parseDataLines(lines, constants) {
  const bytes = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = stripComment(lines[index]).trim();
    if (!line) {
      continue;
    }

    const repeatMatch = /^\.repeat\s+(.+)$/.exec(line);
    if (repeatMatch) {
      let depth = 1;
      let endIndex = index + 1;
      for (; endIndex < lines.length; endIndex += 1) {
        const nestedLine = stripComment(lines[endIndex]).trim();
        if (/^\.repeat\b/.test(nestedLine)) {
          depth += 1;
        } else if (/^\.endrepeat\b/.test(nestedLine)) {
          depth -= 1;
          if (depth === 0) {
            break;
          }
        }
      }
      if (depth !== 0) {
        throw new Error("Unterminated .repeat block in preview source");
      }

      const repetitions = evaluateExpression(repeatMatch[1], constants);
      const repeatedBytes = parseDataLines(lines.slice(index + 1, endIndex), constants);
      for (let repetition = 0; repetition < repetitions; repetition += 1) {
        bytes.push(...repeatedBytes);
      }
      index = endIndex;
      continue;
    }

    if (/^\.endrepeat\b/.test(line) || /^\.assert\b/.test(line)) {
      continue;
    }

    const byteMatch = /^\.byte\s+(.+)$/.exec(line);
    if (!byteMatch) {
      continue;
    }

    for (const argument of splitByteArguments(byteMatch[1])) {
      if (argument.startsWith('"')) {
        const text = JSON.parse(argument);
        for (const character of text) {
          const code = character.codePointAt(0);
          if (code > 0x7f) {
            throw new Error("Preview source contains a non-ASCII .byte string");
          }
          bytes.push(code);
        }
      } else {
        const value = evaluateExpression(argument, constants);
        if (value < -128 || value > 0xff) {
          throw new Error(`Preview source byte is out of range: ${argument}`);
        }
        bytes.push(value & 0xff);
      }
    }
  }

  return Uint8Array.from(bytes);
}

function extractLabeledData(source, label, constants) {
  const lines = source.split(/\r?\n/);
  const labelPattern = new RegExp(`^${label}:\\s*$`);
  const startIndex = lines.findIndex((line) => labelPattern.test(stripComment(line).trim()));
  if (startIndex < 0) {
    throw new Error(`Missing preview source label: ${label}`);
  }

  let endIndex = startIndex + 1;
  for (; endIndex < lines.length; endIndex += 1) {
    const line = stripComment(lines[endIndex]);
    if (/^[A-Za-z_][A-Za-z0-9_]*:\s*$/.test(line.trim())) {
      break;
    }
  }
  return parseDataLines(lines.slice(startIndex + 1, endIndex), constants);
}

function extractRoutine(source, label) {
  const lines = source.split(/\r?\n/);
  const labelPattern = new RegExp(`^${label}:\\s*$`);
  const startIndex = lines.findIndex((line) => labelPattern.test(stripComment(line).trim()));
  if (startIndex < 0) {
    throw new Error(`Missing preview source routine: ${label}`);
  }

  let endIndex = startIndex + 1;
  for (; endIndex < lines.length; endIndex += 1) {
    const line = stripComment(lines[endIndex]);
    if (/^[A-Za-z_][A-Za-z0-9_]*:\s*$/.test(line.trim())) {
      break;
    }
  }
  return lines.slice(startIndex + 1, endIndex);
}

function extractConstantStores(lines, constants) {
  const stores = new Map();
  let accumulator;

  for (const rawLine of lines) {
    const line = stripComment(rawLine).trim();
    const loadMatch = /^lda\s+#(.+)$/i.exec(line);
    if (loadMatch) {
      try {
        accumulator = evaluateExpression(loadMatch[1], constants) & 0xff;
      } catch {
        accumulator = undefined;
      }
      continue;
    }

    const storeMatch = /^sta\s+([A-Za-z_][A-Za-z0-9_]*(?:\+\d+)?)$/i.exec(line);
    if (storeMatch) {
      if (accumulator !== undefined && !stores.has(storeMatch[1])) {
        stores.set(storeMatch[1], accumulator);
      }
      continue;
    }

    if (/^(?:jsr|lda|adc|sbc|and|ora|eor|pla|txa|tya|asl|lsr|rol|ror)\b/i.test(line)) {
      accumulator = undefined;
    }
  }

  return stores;
}

function requireValue(map, name) {
  if (!map.has(name)) {
    throw new Error(`Missing preview source value: ${name}`);
  }
  return map.get(name);
}

function requireLength(name, bytes, expectedLength) {
  if (bytes.length !== expectedLength) {
    throw new Error(
      `${name} has ${bytes.length} bytes; expected ${expectedLength} in preview source`,
    );
  }
}

export function readGameGraphicsSource(source) {
  const constants = parseConstants(source);
  const initialState = extractConstantStores(extractRoutine(source, "init_state"), constants);
  const hardwareState = extractConstantStores(extractRoutine(source, "start"), constants);

  const graphics = {
    constants,
    hud: extractLabeledData(source, "hud_ascii", constants),
    playerShape: extractLabeledData(source, "player_shape", constants),
    playerEngineShape: extractLabeledData(source, "player_engine_shape", constants),
    enemyShape: extractLabeledData(source, "enemy_shape", constants),
    scannerShape: extractLabeledData(source, "scanner_shape", constants),
    corridorRowOffsets: extractLabeledData(source, "corridor_row_offsets", constants),
    corridorLeftTiles: extractLabeledData(source, "corridor_left_tiles", constants),
    corridorRightTiles: extractLabeledData(source, "corridor_right_tiles", constants),
    charset: extractLabeledData(source, "charset_data", constants),
    initialState,
    hardwareState,
  };

  requireLength("player_shape", graphics.playerShape, requireValue(constants, "PLAYER_H"));
  requireLength(
    "player_engine_shape",
    graphics.playerEngineShape,
    requireValue(constants, "PLAYER_H"),
  );
  requireLength("enemy_shape", graphics.enemyShape, requireValue(constants, "ENEMY_H"));
  requireLength("scanner_shape", graphics.scannerShape, 16);
  requireLength("corridor_row_offsets", graphics.corridorRowOffsets, 8);
  requireLength("corridor_left_tiles", graphics.corridorLeftTiles, 48);
  requireLength("corridor_right_tiles", graphics.corridorRightTiles, 48);
  requireLength("charset_data", graphics.charset, 1024);

  if (
    !/\.byte\s+\$44,<SCREEN,>SCREEN\s+;\s*ANTIC 4 \+ LMS/.test(source) ||
    !/\.repeat\s+23\s*\n\s*\.byte\s+\$04\s*\n\s*\.endrepeat/.test(source)
  ) {
    throw new Error("Preview source does not contain the expected 40x24 ANTIC 4 display list");
  }

  return graphics;
}

function nextRandomByte(state) {
  const carry = state & 1;
  let next = state >>> 1;
  if (carry) {
    next ^= 0xb8;
  }
  return next;
}

function createCanonicalScreen(graphics) {
  const { constants, initialState } = graphics;
  const screen = new Uint8Array(SCREEN_COLUMNS * SCREEN_ROWS);
  screen.fill(requireValue(constants, "CH_SPACE"));

  for (let index = 0; index < graphics.hud.length && graphics.hud[index] !== 0; index += 1) {
    screen[index] = (graphics.hud[index] - 0x20) & 0xff;
  }
  screen.fill(
    requireValue(constants, "CH_SEPARATOR"),
    SCREEN_COLUMNS,
    SCREEN_COLUMNS * 2,
  );

  let rngState = requireValue(initialState, "rng_state");
  let corridorPhase = requireValue(initialState, "corridor_phase");

  for (let row = 2; row < SCREEN_ROWS; row += 1) {
    const rowStart = row * SCREEN_COLUMNS;
    const tileOffset = graphics.corridorRowOffsets[corridorPhase & 0x07];

    for (let column = 0; column < 6; column += 1) {
      screen[rowStart + column] = graphics.corridorLeftTiles[tileOffset + column];
      screen[rowStart + 34 + column] = graphics.corridorRightTiles[tileOffset + column];
    }

    for (let column = 6; column < 34; column += 1) {
      rngState = nextRandomByte(rngState);
      if ((rngState & 0x0f) !== 0) {
        screen[rowStart + column] = requireValue(constants, "CH_SPACE");
        continue;
      }

      rngState = nextRandomByte(rngState);
      screen[rowStart + column] =
        (rngState & 0x03) === 0
          ? requireValue(constants, "CH_STAR")
          : requireValue(constants, "CH_DOT");
    }
    corridorPhase = (corridorPhase + 1) & 0xff;
  }

  const zero = requireValue(constants, "CH_ZERO");
  screen.set([zero, zero, zero, zero, zero], 6);
  return screen;
}

function drawAnticScreen(colorRegisters, screen, graphics, colorRegistersForRow) {
  const initialRegisters = colorRegistersForRow?.(0) ?? colorRegisters;
  const pixels = new Uint8Array(SOURCE_WIDTH * SOURCE_HEIGHT);
  const background = requireValue(initialRegisters, "COLBK");
  pixels.fill(background);

  for (let characterRow = 0; characterRow < SCREEN_ROWS; characterRow += 1) {
    const rowRegisters = colorRegistersForRow?.(characterRow) ?? colorRegisters;
    const rowBackground = requireValue(rowRegisters, "COLBK");
    const playfieldColors = [
      rowBackground,
      requireValue(rowRegisters, "COLPF0"),
      requireValue(rowRegisters, "COLPF1"),
    ];
    const normalThirdColor = requireValue(rowRegisters, "COLPF2");
    const inverseThirdColor = requireValue(rowRegisters, "COLPF3");

    for (let column = 0; column < SCREEN_COLUMNS; column += 1) {
      const screenCode = screen[characterRow * SCREEN_COLUMNS + column];
      const characterIndex = screenCode & 0x7f;
      const thirdColor = screenCode & 0x80 ? inverseThirdColor : normalThirdColor;

      for (let characterLine = 0; characterLine < CHARACTER_HEIGHT; characterLine += 1) {
        const pattern = graphics.charset[characterIndex * CHARACTER_HEIGHT + characterLine];
        const y = characterRow * CHARACTER_HEIGHT + characterLine;
        const rowStart = y * SOURCE_WIDTH;

        for (let pixel = 0; pixel < ANTIC_PIXELS_PER_BYTE; pixel += 1) {
          const pixelValue = (pattern >>> (6 - pixel * 2)) & 0x03;
          const registerValue =
            pixelValue === 3 ? thirdColor : playfieldColors[pixelValue];
          const x =
            (column * ANTIC_PIXELS_PER_BYTE + pixel) *
            HIGH_RES_PIXELS_PER_COLOR_CLOCK;
          pixels[rowStart + x] = registerValue;
          pixels[rowStart + x + 1] = registerValue;
        }
      }
    }
  }

  return pixels;
}

function playerWidthInColorClocks(sizeValue) {
  if (sizeValue === 0) {
    return 1;
  }
  if (sizeValue === 1) {
    return 2;
  }
  if (sizeValue === 3) {
    return 4;
  }
  throw new Error(`Unsupported GTIA player size in preview source: ${sizeValue}`);
}

function drawPlayer(pixels, shape, horizontalPosition, verticalPosition, size, color) {
  const colorClockWidth = playerWidthInColorClocks(size);
  const pixelWidth = colorClockWidth * HIGH_RES_PIXELS_PER_COLOR_CLOCK;
  const left = (horizontalPosition - PMG_LEFT_EDGE) * HIGH_RES_PIXELS_PER_COLOR_CLOCK;
  const top = verticalPosition - PMG_SCREEN_TOP;

  for (let row = 0; row < shape.length; row += 1) {
    const y = top + row;
    if (y < 0 || y >= SOURCE_HEIGHT) {
      continue;
    }

    for (let bit = 0; bit < 8; bit += 1) {
      if ((shape[row] & (0x80 >>> bit)) === 0) {
        continue;
      }
      const xStart = left + bit * pixelWidth;
      for (let offset = 0; offset < pixelWidth; offset += 1) {
        const x = xStart + offset;
        if (x >= 0 && x < SOURCE_WIDTH) {
          pixels[y * SOURCE_WIDTH + x] = color;
        }
      }
    }
  }
}

function overlayCanonicalPmg(pixels, graphics) {
  const { hardwareState, initialState } = graphics;
  const playerX = requireValue(initialState, "player_x");
  const playerY = requireValue(initialState, "player_y");
  const enemyX = requireValue(initialState, "enemy_x");
  const enemyY = requireValue(initialState, "enemy_y");
  const scannerPhase = requireValue(initialState, "scanner_phase") & 0x0f;
  const scannerFrame = new Uint8Array(requireValue(graphics.constants, "ENEMY_H"));
  scannerFrame[5] = graphics.scannerShape[scannerPhase];

  // PRIOR=0 gives lower-numbered players priority. Paint from P3 to P0.
  drawPlayer(
    pixels,
    graphics.playerEngineShape,
    playerX,
    playerY,
    requireValue(hardwareState, "SIZEP3"),
    requireValue(hardwareState, "COLPM3"),
  );
  drawPlayer(
    pixels,
    scannerFrame,
    enemyX,
    enemyY,
    requireValue(hardwareState, "SIZEP2"),
    requireValue(hardwareState, "COLPM2"),
  );
  drawPlayer(
    pixels,
    graphics.enemyShape,
    enemyX,
    enemyY,
    requireValue(hardwareState, "SIZEP1"),
    requireValue(hardwareState, "COLPM1"),
  );
  drawPlayer(
    pixels,
    graphics.playerShape,
    playerX,
    playerY,
    requireValue(hardwareState, "SIZEP0"),
    requireValue(hardwareState, "COLPM0"),
  );
}

function hslToRgb(hueDegrees, saturation, lightness) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hue = (((hueDegrees % 360) + 360) % 360) / 60;
  const intermediate = chroma * (1 - Math.abs((hue % 2) - 1));
  const sectors = [
    [chroma, intermediate, 0],
    [intermediate, chroma, 0],
    [0, chroma, intermediate],
    [0, intermediate, chroma],
    [intermediate, 0, chroma],
    [chroma, 0, intermediate],
  ];
  const [red, green, blue] = sectors[Math.floor(hue) % 6];
  const match = lightness - chroma / 2;
  return [red + match, green + match, blue + match].map((component) =>
    Math.max(0, Math.min(255, Math.round(component * 255))),
  );
}

function atariPalRegisterToRgb(registerValue) {
  const hue = (registerValue >>> 4) & 0x0f;
  const luminance = registerValue & 0x0e;
  const lightness = 0.04 + (luminance / 14) * 0.86;

  if (hue === 0) {
    const gray = Math.round(lightness * 255);
    return [gray, gray, gray];
  }

  // PAL hue order used by the Atari color registers, expressed as a full
  // deterministic wheel. Analog output and emulator palettes vary.
  const hueAngles = [
    0, 52, 34, 16, 354, 326, 294, 258,
    226, 204, 184, 164, 136, 108, 82, 62,
  ];
  return hslToRgb(hueAngles[hue], 0.68, lightness);
}

function scaleAndConvertToRgb(registerPixels) {
  const rgb = Buffer.alloc(PREVIEW_WIDTH * PREVIEW_HEIGHT * 3);
  const palette = Array.from({ length: 256 }, (_, value) => atariPalRegisterToRgb(value));

  for (let sourceY = 0; sourceY < SOURCE_HEIGHT; sourceY += 1) {
    for (let sourceX = 0; sourceX < SOURCE_WIDTH; sourceX += 1) {
      const color = palette[registerPixels[sourceY * SOURCE_WIDTH + sourceX]];
      for (let scaleY = 0; scaleY < PREVIEW_SCALE; scaleY += 1) {
        const outputY = sourceY * PREVIEW_SCALE + scaleY;
        for (let scaleX = 0; scaleX < PREVIEW_SCALE; scaleX += 1) {
          const outputX = sourceX * PREVIEW_SCALE + scaleX;
          const outputOffset = (outputY * PREVIEW_WIDTH + outputX) * 3;
          rgb[outputOffset] = color[0];
          rgb[outputOffset + 1] = color[1];
          rgb[outputOffset + 2] = color[2];
        }
      }
    }
  }
  return rgb;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function encodePng(rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(PREVIEW_WIDTH, 0);
  header.writeUInt32BE(PREVIEW_HEIGHT, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const scanlineLength = PREVIEW_WIDTH * 3;
  const scanlines = Buffer.alloc((scanlineLength + 1) * PREVIEW_HEIGHT);
  for (let y = 0; y < PREVIEW_HEIGHT; y += 1) {
    const outputOffset = y * (scanlineLength + 1);
    scanlines[outputOffset] = 0;
    rgb.copy(scanlines, outputOffset + 1, y * scanlineLength, (y + 1) * scanlineLength);
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });
  return Buffer.concat([
    PNG_SIGNATURE,
    makePngChunk("IHDR", header),
    makePngChunk("IDAT", compressed),
    makePngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function createGameplayPreview(source) {
  const graphics = readGameGraphicsSource(source);
  const screen = createCanonicalScreen(graphics);
  const registerPixels = drawAnticScreen(graphics.hardwareState, screen, graphics);
  overlayCanonicalPmg(registerPixels, graphics);
  return encodePng(scaleAndConvertToRgb(registerPixels));
}

export function createLoaderPreview(loaderDefinition) {
  const loaderAsset = compileLoaderBitmap(loaderDefinition);
  const memory = new Uint8Array(0x10000);
  const firstPartBytes =
    loaderAsset.secondLmsLine * loaderAsset.bytesPerRow;
  memory.set(
    loaderAsset.bitmapBytes.subarray(0, firstPartBytes),
    loaderAsset.bitmapAddress,
  );
  memory.set(
    loaderAsset.bitmapBytes.subarray(firstPartBytes),
    loaderAsset.secondLmsAddress,
  );

  const registerPixels = new Uint8Array(SOURCE_WIDTH * SOURCE_HEIGHT);
  for (let y = 0; y < loaderAsset.height; y += 1) {
    const zone = loaderAsset.paletteZones.find(
      ({ startLine, endLine }) => y >= startLine && y <= endLine,
    );
    if (!zone) {
      throw new Error(`Loader preview line ${y} has no palette zone`);
    }
    const sourceAddress =
      y < loaderAsset.secondLmsLine
        ? loaderAsset.bitmapAddress + y * loaderAsset.bytesPerRow
        : loaderAsset.secondLmsAddress +
          (y - loaderAsset.secondLmsLine) * loaderAsset.bytesPerRow;
    const background = zone.values.get("COLPF2");
    for (
      let byteColumn = 0;
      byteColumn < loaderAsset.bytesPerRow;
      byteColumn += 1
    ) {
      const value = memory[sourceAddress + byteColumn];
      for (let bit = 0; bit < 8; bit += 1) {
        registerPixels[y * SOURCE_WIDTH + byteColumn * 8 + bit] =
          value & (0x80 >>> bit) ? zone.foregroundValue : background;
      }
    }
  }
  return encodePng(scaleAndConvertToRgb(registerPixels));
}

export function inspectPng(png) {
  if (!png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("Invalid PNG signature");
  }

  const chunks = [];
  let offset = PNG_SIGNATURE.length;
  while (offset < png.length) {
    if (offset + 12 > png.length) {
      throw new Error("Truncated PNG chunk");
    }
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcOffset = dataEnd;
    if (crcOffset + 4 > png.length) {
      throw new Error("Truncated PNG chunk data");
    }
    const data = png.subarray(dataStart, dataEnd);
    const expectedCrc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
    if (png.readUInt32BE(crcOffset) !== expectedCrc) {
      throw new Error(`Invalid PNG CRC for ${type}`);
    }
    chunks.push({ type, data });
    offset = crcOffset + 4;
    if (type === "IEND") {
      break;
    }
  }

  if (offset !== png.length) {
    throw new Error("Unexpected bytes after PNG IEND");
  }
  const header = chunks.find((chunk) => chunk.type === "IHDR");
  const dataChunks = chunks.filter((chunk) => chunk.type === "IDAT");
  const endChunks = chunks.filter((chunk) => chunk.type === "IEND");
  if (!header || dataChunks.length === 0 || endChunks.length !== 1) {
    throw new Error("PNG is missing required chunks");
  }

  const raw = zlib.inflateSync(Buffer.concat(dataChunks.map((chunk) => chunk.data)));
  const width = header.data.readUInt32BE(0);
  const height = header.data.readUInt32BE(4);
  if (
    header.data.length !== 13 ||
    header.data[8] !== 8 ||
    header.data[9] !== 2 ||
    raw.length !== (width * 3 + 1) * height
  ) {
    throw new Error("PNG has an unexpected RGB layout");
  }
  for (let y = 0; y < height; y += 1) {
    if (raw[y * (width * 3 + 1)] !== 0) {
      throw new Error("PNG uses an unexpected scanline filter");
    }
  }

  return {
    width,
    height,
    bitDepth: header.data[8],
    colorType: header.data[9],
    chunkTypes: chunks.map((chunk) => chunk.type),
  };
}

export function generateGameplayPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const png = createGameplayPreview(source);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateLoaderPreview({
  definitionPath = path.join(
    rootDirectory,
    "assets",
    "graphics",
    "loader-bitmap.json",
  ),
  outputPath = DEFAULT_LOADER_PREVIEW_PATH,
} = {}) {
  const definition = loadLoaderBitmapDefinition(definitionPath);
  const png = createLoaderPreview(definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const gameplayResult = generateGameplayPreview();
    console.log(`Gameplay preview generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, gameplayResult.outputPath)}`);
    console.log(
      `  size: ${gameplayResult.width}x${gameplayResult.height}, ${gameplayResult.bytes} bytes`,
    );

    const loaderResult = generateLoaderPreview();
    console.log(`Loader preview generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, loaderResult.outputPath)}`);
    console.log(
      `  size: ${loaderResult.width}x${loaderResult.height}, ${loaderResult.bytes} bytes`,
    );
  } catch (error) {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  }
}
