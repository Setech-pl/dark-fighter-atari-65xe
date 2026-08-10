import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import {
  anticERegisterForBitmapPixel,
  anticFRegisterForBitmapBit,
  compileLoaderBitmap,
  loadLoaderBitmapDefinition,
} from "./loader-assets.mjs";
import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
} from "./capital-hulls.mjs";
import {
  buildCapitalHullsAntic2Charset,
  compileCapitalHullsAntic2Prototype,
  loadCapitalHullsAntic2Prototype,
} from "./capital-hulls-antic2.mjs";
import {
  BROADSIDE_STATES,
  capitalExplosionVisual,
  centeredSpanTop,
  combinedPlayerEnvelope,
  heavyShellVisual,
  hullBoundary,
  missileWidth,
  muzzlePosition,
  playerHullContact,
  sectorRowForSide,
  simulateBroadsideCadence,
  simulateBroadsideSpeedSequence,
  warningVisual,
} from "./broadside.mjs";

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
export const DEFAULT_START_MENU_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "start-menu.png",
);
export const DEFAULT_CAPITAL_HULLS_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "capital-hulls-strip.png",
);
export const DEFAULT_ENEMY_HULL_COLOUR_OPTIONS_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-hull-colour-options.png",
);
export const DEFAULT_BROADSIDE_ANTIC2_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "gameplay-broadside-antic2-prototype.png",
);
export const DEFAULT_CAPITAL_HULLS_ANTIC2_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "capital-hulls-antic2-strip.png",
);
export const DEFAULT_BROADSIDE_COMPARISON_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "broadside-mode-comparison.png",
);
export const DEFAULT_BROADSIDE_FIRE_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "broadside-fire-sequence.png",
);
export const DEFAULT_BROADSIDE_ACCEPTANCE_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "broadside-acceptance-sequence.png",
);
export const DEFAULT_PLAYER_RESPAWN_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "player-respawn-sequence.png",
);
export const DEFAULT_BROADSIDE_CADENCE_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "broadside-cadence-sequence.png",
);
export const DEFAULT_BROADSIDE_SPEED_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "broadside-speed-sequence.png",
);
export const DEFAULT_DIFFICULTY_SPEED_COMPARISON_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "difficulty-speed-comparison.png",
);
export const DEFAULT_FLAGSHIP_SECTOR_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "flagship-sector-sequence.png",
);
export const DEFAULT_HEAVY_SHELL_DETAIL_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "heavy-shell-detail-sequence.png",
);
export const DEFAULT_CAPITAL_EXPLOSION_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "capital-hull-explosion-sequence.png",
);
export const DEFAULT_CAPITAL_EXPLOSION_AUDIO_TRACE_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "capital-explosion-pokey-trace.csv",
);
export const DEFAULT_ENGINE_BANK_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "capital-engine-bank-sequence.png",
);
export const DEFAULT_PROW_SEQUENCE_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "capital-prow-sequence.png",
);
export const DEFAULT_ENEMY_FIGHTER_LIMITS_PREVIEW_PATH = path.join(
  rootDirectory,
  "build",
  "previews",
  "enemy-fighter-corridor-limits.png",
);
const DEFAULT_CAPITAL_HULLS_DEFINITION_PATH = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "capital-hulls.json",
);
const DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "capital-hulls-antic2-prototype.json",
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
  const trimmed = expression.trim();
  if (trimmed.startsWith("<")) {
    return evaluateExpression(trimmed.slice(1), constants) & 0xff;
  }
  if (trimmed.startsWith(">")) {
    return (evaluateExpression(trimmed.slice(1), constants) >>> 8) & 0xff;
  }
  const normalized = normalizeExpression(trimmed, constants);
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
    const wordMatch = /^\.word\s+(.+)$/.exec(line);
    if (!byteMatch && !wordMatch) {
      continue;
    }

    for (const argument of splitByteArguments((byteMatch ?? wordMatch)[1])) {
      if (argument.startsWith('"')) {
        if (wordMatch) {
          throw new Error("Preview source cannot encode a string with .word");
        }
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
        if (byteMatch && (value < -128 || value > 0xff)) {
          throw new Error(`Preview source byte is out of range: ${argument}`);
        }
        if (wordMatch && (value < -32768 || value > 0xffff)) {
          throw new Error(`Preview source word is out of range: ${argument}`);
        }
        bytes.push(value & 0xff);
        if (wordMatch) {
          bytes.push((value >>> 8) & 0xff);
        }
      }
    }
  }

  return Uint8Array.from(bytes);
}

function extractLabeledData(source, label, constants, endLabel) {
  const lines = source.split(/\r?\n/);
  const labelPattern = new RegExp(`^${label}:\\s*$`);
  const startIndex = lines.findIndex((line) => labelPattern.test(stripComment(line).trim()));
  if (startIndex < 0) {
    throw new Error(`Missing preview source label: ${label}`);
  }

  let endIndex = startIndex + 1;
  for (; endIndex < lines.length; endIndex += 1) {
    const line = stripComment(lines[endIndex]);
    const foundLabel = /^([A-Za-z_][A-Za-z0-9_]*):\s*$/.exec(line.trim());
    if (
      foundLabel &&
      (endLabel ? foundLabel[1] === endLabel : true)
    ) {
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

function buildGameplayHudCharset(frontendGlyphRows, constants) {
  const charset = new Uint8Array(1024);
  const copyGlyph = (sourceIndex, destinationIndex) => {
    charset.set(
      frontendGlyphRows.subarray(sourceIndex * 7, sourceIndex * 7 + 7),
      destinationIndex * CHARACTER_HEIGHT,
    );
  };
  for (let digit = 0; digit < 10; digit += 1) {
    copyGlyph(digit, requireValue(constants, "CH_ZERO") + digit);
  }
  for (let letter = 0; letter < 26; letter += 1) {
    copyGlyph(10 + letter, requireValue(constants, "CH_HUD_A") + letter);
  }
  charset[requireValue(constants, "CH_SEPARATOR") * CHARACTER_HEIGHT + 7] = 0xff;
  return charset;
}

export function readGameGraphicsSource(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const capitalHulls = compileCapitalHulls(capitalHullsDefinition);
  const constants = parseConstants(source);
  for (const [name, value] of [
    ["CAPITAL_HULL_GLYPH_BASE", capitalHulls.definition.charsetBaseIndex],
    ["CAPITAL_HULL_GLYPH_COUNT", capitalHulls.glyphs.length],
    ["CAPITAL_HULL_SEGMENT_ROWS", capitalHulls.segmentRows],
    ["CAPITAL_HULL_PREVIEW_START_PHASE", capitalHulls.previewStartPhase],
    ["CAPITAL_HULL_MAP_COLUMNS", capitalHulls.mapColumns],
    ["CAPITAL_HULL_PACKED_ROW_BYTES", capitalHulls.packedRowBytes],
  ]) {
    constants.set(name, value);
  }
  const initialState = extractConstantStores(extractRoutine(source, "init_state"), constants);
  const frontendHardwareState = extractConstantStores(
    extractRoutine(source, "start"),
    constants,
  );
  const gameplayHardwareState = new Map(frontendHardwareState);
  const gameplayEntryState = extractConstantStores(
    extractRoutine(source, "start_gameplay"),
    constants,
  );
  const gameplayDliState = extractConstantStores(
    extractRoutine(source, "gameplay_dli"),
    constants,
  );
  for (const register of ["COLPF0", "COLPF1", "COLPF2", "COLPF3"]) {
    gameplayHardwareState.set(
      register,
      requireValue(gameplayDliState, register),
    );
  }
  for (const register of ["SIZEP0", "SIZEP3"]) {
    gameplayHardwareState.set(
      register,
      requireValue(gameplayEntryState, register),
    );
  }

  const baseCharset = extractLabeledData(
    source,
    "charset_data",
    constants,
    "capital_hull_glyphs",
  );
  requireLength("base charset", baseCharset, 59 * CHARACTER_HEIGHT);
  const charset = new Uint8Array(1024);
  charset.set(baseCharset);
  charset.set(
    capitalHulls.glyphBytes,
    capitalHulls.definition.charsetBaseIndex * CHARACTER_HEIGHT,
  );
  const frontendGlyphRows = extractLabeledData(
    source,
    "frontend_glyph_rows",
    constants,
    "frontend_glyph_rows_end",
  );
  requireLength("frontend glyph rows", frontendGlyphRows, 42 * 7);
  const hudCharset = buildGameplayHudCharset(frontendGlyphRows, constants);
  charset.set(
    frontendGlyphRows,
    capitalHulls.definition.charsetBaseIndex * CHARACTER_HEIGHT + capitalHulls.glyphBytes.length,
  );

  const hudHardwareState = new Map(gameplayHardwareState);
  for (const register of ["COLPF1", "COLPF2", "COLBK"]) {
    hudHardwareState.set(register, requireValue(gameplayEntryState, register));
  }

  const gameplayDisplayList = extractLabeledData(
    source,
    "display_list",
    constants,
    "display_list_jvb",
  );
  const gameplayLayout = decodeMainMenuDisplayList(
    gameplayDisplayList,
    requireValue(constants, "SCREEN"),
  );

  const mainMenuHardwareState = new Map(frontendHardwareState);
  const mainMenuPaletteState = extractConstantStores(
    extractRoutine(source, "set_main_menu_palette"),
    constants,
  );
  for (const register of ["COLBK", "COLPF0", "COLPF1", "COLPF2", "COLPF3"]) {
    mainMenuHardwareState.set(
      register,
      requireValue(mainMenuPaletteState, register),
    );
  }
  const menuSceneState = extractConstantStores(
    extractRoutine(source, "draw_main_menu_scene"),
    constants,
  );
  for (const register of ["HPOSP0", "HPOSP2", "HPOSP3", "SIZEP0", "SIZEP3"]) {
    mainMenuHardwareState.set(register, requireValue(menuSceneState, register));
  }
  const frontendHintHardwareState = new Map(mainMenuHardwareState);
  const hintDliState = extractConstantStores(
    extractRoutine(source, "frontend_hint_dli"),
    constants,
  );
  for (const register of ["COLPF1", "COLPF2"]) {
    frontendHintHardwareState.set(register, requireValue(hintDliState, register));
  }

  const graphics = {
    constants,
    hud: extractLabeledData(source, "hud_ascii", constants),
    playerShape: extractLabeledData(source, "player_shape", constants),
    playerEngineShape: extractLabeledData(source, "player_engine_shape", constants),
    enemyShape: extractLabeledData(source, "enemy_shape", constants),
    scannerShape: extractLabeledData(source, "scanner_shape", constants),
    capitalHulls,
    alliedHullRows: capitalHulls.decodedMaps.get("allied"),
    enemyHullRows: capitalHulls.decodedMaps.get("enemy"),
    alliedSectorRows: capitalHulls.sector.sectorScreenRowsBySide.get("allied"),
    enemySectorRows: capitalHulls.sector.sectorScreenRowsBySide.get("enemy"),
    charset,
    hudCharset,
    gameplayDisplayList,
    gameplayLayout,
    initialState,
    hardwareState: gameplayHardwareState,
    hudHardwareState,
    frontendHardwareState,
    mainMenuHardwareState,
    frontendHintHardwareState,
  };

  requireLength("player_shape", graphics.playerShape, requireValue(constants, "PLAYER_H"));
  requireLength(
    "player_engine_shape",
    graphics.playerEngineShape,
    requireValue(constants, "PLAYER_H"),
  );
  requireLength("enemy_shape", graphics.enemyShape, requireValue(constants, "ENEMY_H"));
  requireLength("scanner_shape", graphics.scannerShape, 16);
  requireLength("charset_data", graphics.charset, 1024);
  requireLength("HUD charset", graphics.hudCharset, 1024);

  const gameplayModes = graphics.gameplayLayout.rows.map(({ mode }) => mode);
  if (
    gameplayModes.length !== SCREEN_ROWS ||
    gameplayModes[0] !== 2 || gameplayModes[1] !== 2 ||
    gameplayModes.slice(2).some((mode) => mode !== 4)
  ) {
    throw new Error("Preview source does not contain the expected ANTIC 2 HUD and ANTIC 4 playfield");
  }

  return graphics;
}

function decodeMainMenuDisplayList(bytes, screenAddress) {
  const rows = [];
  let offset = 0;
  let screenOffset = 0;
  let y = 0;

  while (offset < bytes.length && y < SOURCE_HEIGHT) {
    const opcode = bytes[offset];
    offset += 1;
    const mode = opcode & 0x0f;
    if (mode === 0) {
      continue;
    }
    if (![2, 4, 6, 7].includes(mode)) {
      throw new Error(`Unsupported main-menu ANTIC mode ${mode}`);
    }
    if (opcode & 0x40) {
      if (offset + 2 > bytes.length) {
        throw new Error("Truncated main-menu LMS instruction");
      }
      const address = bytes[offset] | (bytes[offset + 1] << 8);
      screenOffset = address - screenAddress;
      offset += 2;
    }
    const columns = mode === 6 || mode === 7 ? 20 : 40;
    const height = mode === 7 ? 16 : 8;
    rows.push({
      index: rows.length,
      mode,
      columns,
      height,
      y,
      screenOffset,
      dli: (opcode & 0x80) !== 0,
    });
    screenOffset += columns;
    y += height;
  }

  if (y !== SOURCE_HEIGHT || screenOffset > 1024) {
    throw new Error("Main-menu display list does not describe a bounded 320x192 screen");
  }
  return { rows, screenBytes: screenOffset };
}

function decodeFrontendScreen(bytes, screenAddress, layout) {
  const records = [];
  let offset = 0;

  while (offset < bytes.length && bytes[offset] !== 0xff) {
    if (offset + 2 > bytes.length) {
      throw new Error("Frontend screen record has a truncated address");
    }
    const address = bytes[offset] | (bytes[offset + 1] << 8);
    offset += 2;
    const textBytes = [];
    while (offset < bytes.length && bytes[offset] !== 0) {
      textBytes.push(bytes[offset]);
      offset += 1;
    }
    if (offset >= bytes.length) {
      throw new Error("Frontend screen record has unterminated text");
    }
    offset += 1;

    const screenOffset = address - screenAddress;
    if (
      screenOffset < 0 ||
      screenOffset >= 1024 ||
      screenOffset + textBytes.length > 1024
    ) {
      throw new Error("Frontend screen record lies outside display memory");
    }
    const displayRow = layout?.rows.find(
      (row) => screenOffset >= row.screenOffset &&
        screenOffset + textBytes.length <= row.screenOffset + row.columns,
    );
    if (layout && !displayRow) {
      throw new Error("Frontend screen record crosses a mixed-mode row boundary");
    }
    records.push({
      address,
      screenOffset,
      row: displayRow?.index,
      y: displayRow?.y,
      mode: displayRow?.mode,
      column: displayRow ? screenOffset - displayRow.screenOffset : undefined,
      text: String.fromCharCode(...textBytes),
      textBytes: Uint8Array.from(textBytes),
    });
  }

  if (offset >= bytes.length || bytes[offset] !== 0xff) {
    throw new Error("Frontend screen data is missing its $FF terminator");
  }
  return records;
}

export function readFrontendGraphicsSource(source) {
  const graphics = readGameGraphicsSource(source);
  const screenAddress = requireValue(graphics.constants, "SCREEN");
  const mainMenuDisplayList = extractLabeledData(
    source,
    "main_menu_display_list",
    graphics.constants,
    "main_menu_display_list_jvb",
  );
  const mainMenuLayout = decodeMainMenuDisplayList(
    mainMenuDisplayList,
    screenAddress,
  );
  const glyphRows = extractLabeledData(
    source,
    "frontend_glyph_rows",
    graphics.constants,
    "frontend_glyph_rows_end",
  );
  requireLength(
    "frontend 6x7 glyph rows",
    glyphRows,
    requireValue(graphics.constants, "FRONTEND_GLYPH_COUNT") * 7,
  );
  const frontendCharset = new Uint8Array(1024);
  const firstGlyph = requireValue(graphics.constants, "CH_FRONT_ZERO");
  for (let glyph = 0; glyph < glyphRows.length / 7; glyph += 1) {
    frontendCharset.set(
      glyphRows.subarray(glyph * 7, glyph * 7 + 7),
      (firstGlyph + glyph) * CHARACTER_HEIGHT,
    );
  }
  const graphicsBase = requireValue(graphics.constants, "FRONTEND_GRAPHICS_BASE");
  frontendCharset.set(
    graphics.charset.subarray(0, 16 * CHARACTER_HEIGHT),
    graphicsBase * CHARACTER_HEIGHT,
  );
  const markerBytes = extractLabeledData(
    source,
    "frontend_marker_positions",
    graphics.constants,
  );
  requireLength("frontend_marker_positions", markerBytes, 18);

  const markerAddresses = [];
  for (let offset = 0; offset < markerBytes.length; offset += 2) {
    markerAddresses.push(markerBytes[offset] | (markerBytes[offset + 1] << 8));
  }

  return {
    ...graphics,
    frontendCharset,
    mainMenuDisplayList,
    mainMenuLayout,
    mainMenuRecords: decodeFrontendScreen(
      extractLabeledData(source, "main_menu_screen_data", graphics.constants),
      screenAddress,
      mainMenuLayout,
    ),
    markerAddresses,
    defaultSelection: requireValue(
      graphics.constants,
      "FRONTEND_DEFAULT_SELECTION",
    ),
  };
}

function nextRandomByte(state) {
  const carry = state & 1;
  let next = state >>> 1;
  if (carry) {
    next ^= 0xb8;
  }
  return next;
}

function writeCanonicalCorridorRow(screen, row, phase, graphics, rngState) {
  const { constants } = graphics;
  const rowStart = row * SCREEN_COLUMNS;
  const space = requireValue(constants, "CH_SPACE");
  screen.fill(space, rowStart, rowStart + SCREEN_COLUMNS);
  const alliedRow = Number.isInteger(phase) && phase >= 0 &&
      phase < graphics.capitalHulls.sector.totalRows
    ? graphics.alliedSectorRows[phase]
    : null;
  const enemyPhase = Number.isInteger(phase) &&
      phase >= graphics.capitalHulls.sector.sidePhaseRows
    ? phase - graphics.capitalHulls.sector.sidePhaseRows
    : null;
  const enemyRow = Number.isInteger(enemyPhase) && enemyPhase >= 0 &&
      enemyPhase < graphics.capitalHulls.sector.totalRows
    ? graphics.enemySectorRows[enemyPhase]
    : null;

  for (let column = 0; column < graphics.capitalHulls.mapColumns; column += 1) {
    if (alliedRow) screen[rowStart + column] = alliedRow[column];
    if (enemyRow) screen[rowStart + 31 + column] = enemyRow[column];
  }

  let nextRngState = rngState;
  for (let column = 8; column < 32; column += 1) {
    if (screen[rowStart + column] !== space) continue;
    nextRngState = nextRandomByte(nextRngState);
    if ((nextRngState & 0x0f) !== 0) continue;
    nextRngState = nextRandomByte(nextRngState);
    screen[rowStart + column] =
      (nextRngState & 0x03) === 0
        ? requireValue(constants, "CH_STAR")
        : requireValue(constants, "CH_DOT");
  }
  return nextRngState;
}

function createCanonicalScreenRuntimeState(
  graphics,
  { sectorPhase = graphics.capitalHulls.sector.previewSectorRow } = {},
) {
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
  const corridorPhase = sectorPhase;

  for (let row = 2; row < SCREEN_ROWS; row += 1) {
    rngState = writeCanonicalCorridorRow(screen, row, null, graphics, rngState);
  }

  const hullBase = requireValue(constants, "CAPITAL_HULL_GLYPH_BASE");
  const hullEnd = hullBase + requireValue(constants, "CAPITAL_HULL_GLYPH_COUNT");
  const space = requireValue(constants, "CH_SPACE");
  const boundaryLeft = new Uint8Array(22);
  const boundaryRight = new Uint8Array(22);
  for (let offset = 0; offset < 22; offset += 1) {
    const left = screen[(offset + 2) * SCREEN_COLUMNS + 8];
    const right = screen[(offset + 2) * SCREEN_COLUMNS + 31];
    const leftIndex = left & 0x7f;
    const rightIndex = right & 0x7f;
    boundaryLeft[offset] = leftIndex >= hullBase && leftIndex < hullEnd ? space : left;
    boundaryRight[offset] = rightIndex >= hullBase && rightIndex < hullEnd ? space : right;
  }

  const zero = requireValue(constants, "CH_ZERO");
  screen.set([zero, zero, zero, zero, zero], 6);
  const visibleScrolls = Math.min(22, sectorPhase);
  const visibleRows = Array.from({ length: 22 }, (_, offset) =>
    offset < visibleScrolls ? sectorPhase - 1 - offset : null);
  const state = {
    screen,
    rngState,
    corridorPhase,
    advances: 0,
    hullAdvances: 0,
    boundaryLeft,
    boundaryRight,
    visibleRows,
    drainRows: 0,
  };
  renderCanonicalHulls(state, graphics);
  return state;
}

function writeCanonicalStarRow(screen, row, graphics, rngState) {
  const rowStart = row * SCREEN_COLUMNS;
  const space = requireValue(graphics.constants, "CH_SPACE");
  screen.fill(space, rowStart + 8, rowStart + 32);
  let nextRngState = rngState;
  for (let column = 8; column < 32; column += 1) {
    nextRngState = nextRandomByte(nextRngState);
    if ((nextRngState & 0x0f) !== 0) continue;
    nextRngState = nextRandomByte(nextRngState);
    screen[rowStart + column] = (nextRngState & 0x03) === 0
      ? requireValue(graphics.constants, "CH_STAR")
      : requireValue(graphics.constants, "CH_DOT");
  }
  return nextRngState;
}

function renderCanonicalHulls(state, graphics) {
  for (let offset = 0; offset < 22; offset += 1) {
    const rowStart = (offset + 2) * SCREEN_COLUMNS;
    state.screen[rowStart + 8] = state.boundaryLeft[offset];
    state.screen[rowStart + 31] = state.boundaryRight[offset];
    state.screen.fill(0, rowStart, rowStart + 8);
    state.screen.fill(0, rowStart + 32, rowStart + 40);
    const sectorRow = state.visibleRows[offset];
    if (sectorRow === null) continue;
    const allied = sectorRow < graphics.capitalHulls.sector.totalRows
      ? graphics.alliedSectorRows[sectorRow]
      : null;
    const enemyRow = sectorRow - graphics.capitalHulls.sector.sidePhaseRows;
    const enemy = enemyRow >= 0 && enemyRow < graphics.capitalHulls.sector.totalRows
      ? graphics.enemySectorRows[enemyRow]
      : null;
    if (allied) {
      state.screen.set(allied.slice(0, 8), rowStart);
      if (allied[8] !== 0) state.screen[rowStart + 8] = allied[8];
    }
    if (enemy) {
      state.screen.set(enemy.slice(1), rowStart + 32);
      if (enemy[0] !== 0) state.screen[rowStart + 31] = enemy[0];
    }
  }
}

function advanceCanonicalScreenRuntimeState(state, graphics) {
  for (let row = 23; row >= 3; row -= 1) {
    for (let column = 9; column <= 30; column += 1) {
      state.screen[row * SCREEN_COLUMNS + column] =
        state.screen[(row - 1) * SCREEN_COLUMNS + column];
    }
  }
  state.boundaryLeft.copyWithin(1, 0, 21);
  state.boundaryRight.copyWithin(1, 0, 21);
  state.rngState = writeCanonicalStarRow(state.screen, 2, graphics, state.rngState);
  state.boundaryLeft[0] = state.screen[2 * SCREEN_COLUMNS + 8];
  state.boundaryRight[0] = state.screen[2 * SCREEN_COLUMNS + 31];
  renderCanonicalHulls(state, graphics);
  state.advances += 1;
}

function advanceCanonicalHullRuntimeState(state, graphics) {
  state.visibleRows.pop();
  if (state.corridorPhase < graphics.capitalHulls.sector.streamRows) {
    state.visibleRows.unshift(state.corridorPhase);
    state.corridorPhase += 1;
  } else {
    state.visibleRows.unshift(null);
    state.drainRows = Math.min(22, (state.drainRows ?? 0) + 1);
  }
  state.hullAdvances += 1;
  renderCanonicalHulls(state, graphics);
}

function createCanonicalScreen(graphics) {
  return createCanonicalScreenRuntimeState(graphics).screen;
}

function encodeFrontendAscii(byte, constants) {
  if (byte === 0x20) return requireValue(constants, "CH_FRONT_SPACE");
  if (byte >= 0x30 && byte <= 0x39) {
    return requireValue(constants, "CH_FRONT_ZERO") + byte - 0x30;
  }
  if (byte >= 0x41 && byte <= 0x5a) {
    return requireValue(constants, "CH_FRONT_A") + byte - 0x41;
  }
  const punctuation = new Map([
    [0x2d, "CH_FRONT_DASH"],
    [0x2e, "CH_FRONT_DOT"],
    [0x2f, "CH_FRONT_SLASH"],
    [0x3a, "CH_FRONT_COLON"],
    [0x3f, "CH_FRONT_QUESTION"],
  ]);
  return requireValue(
    constants,
    punctuation.get(byte) ?? "CH_FRONT_QUESTION",
  );
}

function createStartMenuScreen(graphics, selection) {
  const screen = new Uint8Array(1024);
  const screenAddress = requireValue(graphics.constants, "SCREEN");
  screen.fill(requireValue(graphics.constants, "CH_FRONT_SPACE"));

  for (const record of graphics.mainMenuRecords) {
    const destination = record.address - screenAddress;
    for (let index = 0; index < record.textBytes.length; index += 1) {
      screen[destination + index] = encodeFrontendAscii(
        record.textBytes[index],
        graphics.constants,
      );
    }
  }

  const hangarLayers = [
    ["OUTER", "CH_FRONT_PANEL_SOLID"],
    ["MID", "CH_FRONT_PANEL_FRAME"],
    ["INNER", "CH_FRONT_PANEL_TRUSS"],
    ["BAY", "CH_FRONT_PANEL_EDGE"],
  ];
  for (const [layer, tileName] of hangarLayers) {
    const top = requireValue(graphics.constants, `MAIN_MENU_HANGAR_${layer}_TOP_OFFSET`);
    const bottom = requireValue(graphics.constants, `MAIN_MENU_HANGAR_${layer}_BOTTOM_OFFSET`);
    const last = requireValue(graphics.constants, `MAIN_MENU_HANGAR_${layer}_LAST`);
    const tile = requireValue(graphics.constants, tileName);
    screen.fill(tile, top, top + last + 1);
    screen.fill(tile, bottom, bottom + last + 1);
  }
  const frame = requireValue(graphics.constants, "CH_FRONT_PANEL_FRAME");
  for (const offset of [
    requireValue(graphics.constants, "MAIN_MENU_SCENE_11_OFFSET") + 5,
    requireValue(graphics.constants, "MAIN_MENU_SCENE_13_OFFSET") + 2,
    requireValue(graphics.constants, "MAIN_MENU_SCENE_15_OFFSET") + 2,
    requireValue(graphics.constants, "MAIN_MENU_HANGAR_BAY_BOTTOM_OFFSET") + 5,
  ]) {
    screen[offset] = frame;
  }
  const dimStar = requireValue(graphics.constants, "CH_FRONT_DOT_GRAPHIC");
  const brightStar = requireValue(graphics.constants, "CH_FRONT_STAR");
  for (const index of [0, 2, 4, 6]) {
    screen[requireValue(graphics.constants, `MAIN_MENU_STAR_${index}`)] = dimStar;
  }
  for (const index of [1, 3, 5]) {
    screen[requireValue(graphics.constants, `MAIN_MENU_STAR_${index}`)] = brightStar;
  }
  screen.fill(
    requireValue(graphics.constants, "CH_FRONT_SEPARATOR"),
    requireValue(graphics.constants, "MAIN_MENU_DIVIDER_OFFSET"),
    requireValue(graphics.constants, "MAIN_MENU_DIVIDER_OFFSET") + 40,
  );

  if (!Number.isInteger(selection) || selection < 0 || selection >= 4) {
    throw new Error("Main-menu selection must be an index from 0 through 3");
  }
  const markerAddress = graphics.markerAddresses[selection];
  const markerOffset = markerAddress - screenAddress;
  if (markerOffset < 0 || markerOffset >= screen.length) {
    throw new Error("Default menu marker lies outside display memory");
  }
  screen[markerOffset] =
    requireValue(graphics.constants, "CH_FRONT_MARKER") |
    requireValue(graphics.constants, "ANTIC67_COLOR_PF3");
  const highlightXor = requireValue(
    graphics.constants,
    "MAIN_MENU_HIGHLIGHT_XOR",
  );
  for (let offset = 2; offset <= 11; offset += 1) {
    if (screen[markerOffset + offset] !== 0) {
      screen[markerOffset + offset] ^= highlightXor;
    }
  }
  return screen;
}

function drawAnticScreen(
  colorRegisters,
  screen,
  graphics,
  colorRegistersForRow,
  screenRows = SCREEN_ROWS,
) {
  const initialRegisters = colorRegistersForRow?.(0) ?? colorRegisters;
  const pixels = new Uint8Array(SOURCE_WIDTH * screenRows * CHARACTER_HEIGHT);
  const background = requireValue(initialRegisters, "COLBK");
  pixels.fill(background);

  for (let characterRow = 0; characterRow < screenRows; characterRow += 1) {
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

function drawGameplayMixedScreen(colorRegisters, screen, graphics) {
  const pixels = drawAnticScreen(colorRegisters, screen, graphics);
  drawAntic2Rows({
    pixels,
    pixelHeight: SOURCE_HEIGHT,
    screen,
    charset: graphics.hudCharset,
    registers: graphics.hudHardwareState,
    firstCharacterRow: 0,
    characterRows: 2,
  });
  return pixels;
}

function drawMixedMainMenuScreen(screen, graphics) {
  const pixels = new Uint8Array(SOURCE_WIDTH * SOURCE_HEIGHT);
  let registers = graphics.mainMenuHardwareState;
  pixels.fill(requireValue(registers, "COLBK"));

  for (const row of graphics.mainMenuLayout.rows) {
    const background = requireValue(registers, "COLBK");
    for (let character = 0; character < row.columns; character += 1) {
      const screenCode = screen[row.screenOffset + character];
      if (row.mode === 2) {
        const characterIndex = screenCode & 0x7f;
        const inverse = (screenCode & 0x80) !== 0;
        for (let line = 0; line < 8; line += 1) {
          const pattern = graphics.frontendCharset[characterIndex * 8 + line];
          for (let bit = 0; bit < 8; bit += 1) {
            const bitmapBit = ((pattern >>> (7 - bit)) & 1) ^ Number(inverse);
            pixels[(row.y + line) * SOURCE_WIDTH + character * 8 + bit] =
              anticFRegisterForBitmapBit(registers, bitmapBit);
          }
        }
      } else if (row.mode === 4) {
        const characterIndex = screenCode & 0x7f;
        const playfieldColors = [
          background,
          requireValue(registers, "COLPF0"),
          requireValue(registers, "COLPF1"),
        ];
        const thirdColor = requireValue(
          registers,
          screenCode & 0x80 ? "COLPF3" : "COLPF2",
        );
        for (let line = 0; line < 8; line += 1) {
          const pattern = graphics.frontendCharset[characterIndex * 8 + line];
          for (let pixel = 0; pixel < 4; pixel += 1) {
            const pixelValue = (pattern >>> (6 - pixel * 2)) & 3;
            const color = pixelValue === 3 ? thirdColor : playfieldColors[pixelValue];
            const x = character * 8 + pixel * 2;
            const output = (row.y + line) * SOURCE_WIDTH + x;
            pixels[output] = color;
            pixels[output + 1] = color;
          }
        }
      } else {
        const characterIndex = screenCode & 0x3f;
        const colorBank = screenCode >>> 6;
        const foreground = requireValue(
          registers,
          ["COLPF0", "COLPF1", "COLPF2", "COLPF3"][colorBank],
        );
        const verticalScale = row.mode === 7 ? 2 : 1;
        for (let line = 0; line < 8; line += 1) {
          const pattern = graphics.frontendCharset[characterIndex * 8 + line];
          for (let scaleY = 0; scaleY < verticalScale; scaleY += 1) {
            const y = row.y + line * verticalScale + scaleY;
            for (let bit = 0; bit < 8; bit += 1) {
              const color = pattern & (0x80 >>> bit) ? foreground : background;
              const x = character * 16 + bit * 2;
              const output = y * SOURCE_WIDTH + x;
              pixels[output] = color;
              pixels[output + 1] = color;
            }
          }
        }
      }
    }
    if (row.dli) {
      registers = graphics.frontendHintHardwareState;
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

function overlayCanonicalPmg(pixels, graphics, {
  playerX: playerXOverride,
  playerY: playerYOverride,
  enemyX: enemyXOverride,
  enemyY: enemyYOverride,
  showPlayer = true,
} = {}) {
  const { hardwareState, initialState } = graphics;
  const playerX = playerXOverride ?? requireValue(initialState, "player_x");
  const playerY = playerYOverride ?? requireValue(initialState, "player_y");
  const enemyX = enemyXOverride ?? requireValue(initialState, "enemy_x");
  const enemyY = enemyYOverride ?? requireValue(initialState, "enemy_y");
  const scannerPhase = requireValue(initialState, "scanner_phase") & 0x0f;
  const scannerFrame = new Uint8Array(requireValue(graphics.constants, "ENEMY_H"));
  scannerFrame[5] = graphics.scannerShape[scannerPhase];

  // PRIOR=0 gives lower-numbered players priority. Paint from P3 to P0.
  if (showPlayer) {
    drawPlayer(
      pixels,
      graphics.playerEngineShape,
      playerX,
      playerY,
      requireValue(hardwareState, "SIZEP3"),
      requireValue(hardwareState, "COLPM3"),
    );
  }
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
  if (showPlayer) {
    drawPlayer(
      pixels,
      graphics.playerShape,
      playerX,
      playerY,
      requireValue(hardwareState, "SIZEP0"),
      requireValue(hardwareState, "COLPM0"),
    );
  }
}

function drawMissileSpan(pixels, horizontalPosition, verticalPosition, height, color, size = 1) {
  const left = (horizontalPosition - PMG_LEFT_EDGE) * HIGH_RES_PIXELS_PER_COLOR_CLOCK;
  const top = centeredSpanTop(verticalPosition, height) - PMG_SCREEN_TOP;
  const width = missileWidth(size) * HIGH_RES_PIXELS_PER_COLOR_CLOCK;
  for (let yOffset = 0; yOffset < height; yOffset += 1) {
    const y = top + yOffset;
    if (y < 0 || y >= SOURCE_HEIGHT) continue;
    for (let xOffset = 0; xOffset < width; xOffset += 1) {
      const x = left + xOffset;
      if (x >= 0 && x < SOURCE_WIDTH) pixels[y * SOURCE_WIDTH + x] = color;
    }
  }
}

function overlayStartMenuPmg(pixels, graphics) {
  const { constants, mainMenuHardwareState } = graphics;
  const verticalScale = requireValue(constants, "MAIN_MENU_PLAYER_VERTICAL_SCALE");
  const expandVertically = (shape) => Uint8Array.from(
    [...shape].flatMap((value) => Array(verticalScale).fill(value)),
  );
  const playerX = requireValue(mainMenuHardwareState, "HPOSP0");
  const playerY = requireValue(constants, "MAIN_MENU_PLAYER_Y");

  drawPlayer(
    pixels,
    expandVertically(graphics.playerEngineShape),
    playerX,
    playerY,
    requireValue(mainMenuHardwareState, "SIZEP3"),
    requireValue(mainMenuHardwareState, "COLPM3"),
  );
  drawPlayer(
    pixels,
    Uint8Array.of(
      requireValue(constants, "MAIN_MENU_RED_LIGHT_BITS"),
      requireValue(constants, "MAIN_MENU_RED_LIGHT_BITS"),
    ),
    requireValue(mainMenuHardwareState, "HPOSP2"),
    requireValue(constants, "MAIN_MENU_RED_LIGHT_Y"),
    requireValue(mainMenuHardwareState, "SIZEP2"),
    requireValue(mainMenuHardwareState, "COLPM2"),
  );
  drawPlayer(
    pixels,
    expandVertically(graphics.playerShape),
    playerX,
    playerY,
    requireValue(mainMenuHardwareState, "SIZEP0"),
    requireValue(mainMenuHardwareState, "COLPM0"),
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

function scaleAndConvertToRgb(
  registerPixels,
  sourceWidth = SOURCE_WIDTH,
  sourceHeight = SOURCE_HEIGHT,
) {
  const outputWidth = sourceWidth * PREVIEW_SCALE;
  const outputHeight = sourceHeight * PREVIEW_SCALE;
  const rgb = Buffer.alloc(outputWidth * outputHeight * 3);
  const palette = Array.from({ length: 256 }, (_, value) => atariPalRegisterToRgb(value));

  for (let sourceY = 0; sourceY < sourceHeight; sourceY += 1) {
    for (let sourceX = 0; sourceX < sourceWidth; sourceX += 1) {
      const color = palette[registerPixels[sourceY * sourceWidth + sourceX]];
      for (let scaleY = 0; scaleY < PREVIEW_SCALE; scaleY += 1) {
        const outputY = sourceY * PREVIEW_SCALE + scaleY;
        for (let scaleX = 0; scaleX < PREVIEW_SCALE; scaleX += 1) {
          const outputX = sourceX * PREVIEW_SCALE + scaleX;
          const outputOffset = (outputY * outputWidth + outputX) * 3;
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

function encodePng(rgb, width = PREVIEW_WIDTH, height = PREVIEW_HEIGHT) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const scanlineLength = width * 3;
  const scanlines = Buffer.alloc((scanlineLength + 1) * height);
  for (let y = 0; y < height; y += 1) {
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

export function readGameplayRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const screen = createCanonicalScreen(graphics);
  const registerPixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
  overlayCanonicalPmg(registerPixels, graphics);
  return { graphics, screen, registerPixels };
}

function readGameplayPlayfieldRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  backgroundColor,
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const screen = createCanonicalScreen(graphics);
  const hardwareState = new Map(graphics.hardwareState);
  if (backgroundColor !== undefined) hardwareState.set("COLBK", backgroundColor);
  return {
    graphics,
    screen,
    registerPixels: drawGameplayMixedScreen(hardwareState, screen, graphics),
  };
}

export function createGameplayPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const { registerPixels } = readGameplayRuntimeState(source, capitalHullsDefinition);
  return encodePng(scaleAndConvertToRgb(registerPixels));
}

function createCapitalHullsStripScreen(graphics) {
  const rows = graphics.capitalHulls.segmentRows;
  const screen = new Uint8Array(SCREEN_COLUMNS * rows);
  for (let row = 0; row < rows; row += 1) {
    const rowStart = row * SCREEN_COLUMNS;
    for (let column = 0; column < graphics.capitalHulls.mapColumns; column += 1) {
      screen[rowStart + column] = graphics.alliedHullRows[row][column];
      screen[rowStart + 31 + column] = graphics.enemyHullRows[row][column];
    }
  }
  return screen;
}

export function createCapitalHullsStripPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const { graphics, registerPixels, sourceHeight } = readCapitalHullsStripRuntimeState(
    source,
    capitalHullsDefinition,
  );
  return encodePng(
    scaleAndConvertToRgb(registerPixels, SOURCE_WIDTH, sourceHeight),
    PREVIEW_WIDTH,
    sourceHeight * PREVIEW_SCALE,
  );
}

export function readCapitalHullsStripRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  colpf3Override,
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const screen = createCapitalHullsStripScreen(graphics);
  const sourceHeight = graphics.capitalHulls.segmentRows * CHARACTER_HEIGHT;
  const hardwareState = new Map(graphics.hardwareState);
  if (colpf3Override !== undefined) {
    if (!Number.isInteger(colpf3Override) || colpf3Override < 0 || colpf3Override > 0xff) {
      throw new Error("Enemy hull COLPF3 override must be an Atari colour-register byte");
    }
    hardwareState.set("COLPF3", colpf3Override);
  }
  const registerPixels = drawAnticScreen(
    hardwareState,
    screen,
    graphics,
    undefined,
    graphics.capitalHulls.segmentRows,
  );
  return { graphics, hardwareState, screen, registerPixels, sourceHeight };
}

function createBroadsideAntic2Screen(graphics, prototype) {
  const screen = createCanonicalScreen(graphics);
  let phase = requireValue(graphics.initialState, "corridor_phase");
  for (let characterRow = 2; characterRow < SCREEN_ROWS; characterRow += 1) {
    const segmentRow = phase & (prototype.segmentRows - 1);
    const rowStart = characterRow * SCREEN_COLUMNS;
    screen.set(prototype.decodedMaps.get("allied")[segmentRow], rowStart);
    screen.set(prototype.decodedMaps.get("enemy")[segmentRow], rowStart + 31);
    for (let column = 8; column < 32; column += 1) {
      screen[rowStart + column] &= 0x7f;
    }
    phase = (phase + 1) & 0xff;
  }
  return screen;
}

function drawAntic2Rows({
  pixels,
  pixelHeight,
  screen,
  charset,
  registers,
  firstCharacterRow,
  characterRows,
}) {
  for (
    let characterRow = firstCharacterRow;
    characterRow < firstCharacterRow + characterRows;
    characterRow += 1
  ) {
    for (let column = 0; column < SCREEN_COLUMNS; column += 1) {
      const screenCode = screen[characterRow * SCREEN_COLUMNS + column];
      const characterIndex = screenCode & 0x7f;
      const inverse = (screenCode & 0x80) !== 0;
      for (let characterLine = 0; characterLine < CHARACTER_HEIGHT; characterLine += 1) {
        const y = characterRow * CHARACTER_HEIGHT + characterLine;
        if (y < 0 || y >= pixelHeight) {
          throw new Error("ANTIC 2 prototype row lies outside its simulated playfield");
        }
        const pattern = charset[characterIndex * CHARACTER_HEIGHT + characterLine];
        for (let bit = 0; bit < 8; bit += 1) {
          const bitmapBit = ((pattern >>> (7 - bit)) & 1) ^ Number(inverse);
          pixels[y * SOURCE_WIDTH + column * 8 + bit] =
            anticFRegisterForBitmapBit(registers, bitmapBit);
        }
      }
    }
  }
}

export function readBroadsideAntic2PrototypeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  prototypeDefinition = loadCapitalHullsAntic2Prototype(
    DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  ),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const prototype = compileCapitalHullsAntic2Prototype(
    prototypeDefinition,
    capitalHullsDefinition,
  );
  const charset = buildCapitalHullsAntic2Charset(graphics.charset, prototype);
  const screen = createBroadsideAntic2Screen(graphics, prototype);

  // Runtime already owns a dedicated ANTIC 2 HUD. The rejected spike changes
  // only rows 2-23 to the optional monochrome playfield for comparison.
  const registerPixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
  drawAntic2Rows({
    pixels: registerPixels,
    pixelHeight: SOURCE_HEIGHT,
    screen,
    charset,
    registers: prototype.palette,
    firstCharacterRow: 2,
    characterRows: SCREEN_ROWS - 2,
  });
  overlayCanonicalPmg(registerPixels, graphics);
  return { graphics, prototype, charset, screen, registerPixels };
}

export function createBroadsideAntic2PrototypePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  prototypeDefinition = loadCapitalHullsAntic2Prototype(
    DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  ),
) {
  const { registerPixels } = readBroadsideAntic2PrototypeState(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  return encodePng(scaleAndConvertToRgb(registerPixels));
}

export function createCapitalHullsAntic2StripPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  prototypeDefinition = loadCapitalHullsAntic2Prototype(
    DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  ),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const prototype = compileCapitalHullsAntic2Prototype(
    prototypeDefinition,
    capitalHullsDefinition,
  );
  const charset = buildCapitalHullsAntic2Charset(graphics.charset, prototype);
  const screen = new Uint8Array(SCREEN_COLUMNS * prototype.segmentRows);
  for (let row = 0; row < prototype.segmentRows; row += 1) {
    const rowStart = row * SCREEN_COLUMNS;
    screen.set(prototype.decodedMaps.get("allied")[row], rowStart);
    screen.set(prototype.decodedMaps.get("enemy")[row], rowStart + 31);
  }
  const sourceHeight = prototype.segmentRows * CHARACTER_HEIGHT;
  const registerPixels = new Uint8Array(SOURCE_WIDTH * sourceHeight);
  registerPixels.fill(requireValue(prototype.palette, "COLBK"));
  drawAntic2Rows({
    pixels: registerPixels,
    pixelHeight: sourceHeight,
    screen,
    charset,
    registers: prototype.palette,
    firstCharacterRow: 0,
    characterRows: prototype.segmentRows,
  });
  return encodePng(
    scaleAndConvertToRgb(registerPixels, SOURCE_WIDTH, sourceHeight),
    PREVIEW_WIDTH,
    sourceHeight * PREVIEW_SCALE,
  );
}

function drawComparisonLabel(registerPixels, width, text, x, y, frontend) {
  for (let character = 0; character < text.length; character += 1) {
    const screenCode = encodeFrontendAscii(text.charCodeAt(character), frontend.constants);
    const characterIndex = screenCode & 0x7f;
    for (let line = 0; line < CHARACTER_HEIGHT; line += 1) {
      const pattern = frontend.frontendCharset[characterIndex * CHARACTER_HEIGHT + line];
      for (let bit = 0; bit < 8; bit += 1) {
        if (pattern & (0x80 >>> bit)) {
          registerPixels[(y + line) * width + x + character * 8 + bit] = 0x0e;
        }
      }
    }
  }
}

export function createEnemyHullColourOptionsPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const dark = readCapitalHullsStripRuntimeState(source, capitalHullsDefinition, 0x44);
  const bright = readCapitalHullsStripRuntimeState(source, capitalHullsDefinition, 0x46);
  if (!dark.screen.every((screenCode, index) => screenCode === bright.screen[index])) {
    throw new Error("Enemy colour comparison must use identical hull screen data");
  }

  const comparisonWidth = SOURCE_WIDTH * 2;
  const labelHeight = 16;
  const comparisonHeight = dark.sourceHeight + labelHeight;
  const registerPixels = new Uint8Array(comparisonWidth * comparisonHeight);
  for (let y = 0; y < dark.sourceHeight; y += 1) {
    const destination = (y + labelHeight) * comparisonWidth;
    registerPixels.set(
      dark.registerPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
      destination,
    );
    registerPixels.set(
      bright.registerPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
      destination + SOURCE_WIDTH,
    );
  }
  const frontend = readFrontendGraphicsSource(source);
  drawComparisonLabel(registerPixels, comparisonWidth, "COLPF3 44 DARK", 104, 4, frontend);
  drawComparisonLabel(registerPixels, comparisonWidth, "COLPF3 46 BRIGHT", 412, 4, frontend);
  return encodePng(
    scaleAndConvertToRgb(registerPixels, comparisonWidth, comparisonHeight),
    comparisonWidth * PREVIEW_SCALE,
    comparisonHeight * PREVIEW_SCALE,
  );
}

export function createBroadsideModeComparisonPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
  prototypeDefinition = loadCapitalHullsAntic2Prototype(
    DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  ),
) {
  const current = readGameplayRuntimeState(source, capitalHullsDefinition).registerPixels;
  const proposed = readBroadsideAntic2PrototypeState(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  ).registerPixels;
  const comparisonWidth = SOURCE_WIDTH * 2;
  const labelHeight = 16;
  const comparisonHeight = SOURCE_HEIGHT + labelHeight;
  const registerPixels = new Uint8Array(comparisonWidth * comparisonHeight);

  for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
    const destination = (y + labelHeight) * comparisonWidth;
    registerPixels.set(current.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH), destination);
    registerPixels.set(
      proposed.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
      destination + SOURCE_WIDTH,
    );
  }
  const frontend = readFrontendGraphicsSource(source);
  drawComparisonLabel(registerPixels, comparisonWidth, "CURRENT ANTIC 4", 100, 4, frontend);
  drawComparisonLabel(registerPixels, comparisonWidth, "PROPOSED ANTIC 2", 416, 4, frontend);
  return encodePng(
    scaleAndConvertToRgb(registerPixels, comparisonWidth, comparisonHeight),
    comparisonWidth * PREVIEW_SCALE,
    comparisonHeight * PREVIEW_SCALE,
  );
}

export function readBroadsideFireSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const base = readGameplayRuntimeState(source, capitalHullsDefinition);
  const { graphics } = base;
  const asset = graphics.capitalHulls;
  const turretById = new Map(asset.turrets.map((turret) => [turret.id, turret]));
  const allied = turretById.get("allied_turret_a");
  const enemy = turretById.get("enemy_turret_a");
  const color = (missile) => requireValue(graphics.hardwareState, `COLPM${missile}`);
  const visibleCannonRow = (turret) => {
    for (let offset = 0; offset < 22; offset += 1) {
      const leftRow = asset.sector.previewSectorRow - 1 - offset;
      const sideRow = sectorRowForSide(asset, turret.side, leftRow);
      if (asset.sector.cannonRowsBySide.get(turret.side).includes(sideRow)) return 2 + offset;
    }
    throw new Error(`${turret.id} is not visible at the source-derived preview phase`);
  };
  const alliedMuzzle = muzzlePosition(allied, visibleCannonRow(allied));
  const enemyMuzzle = muzzlePosition(enemy, visibleCannonRow(enemy));
  const enemySecondMuzzle = muzzlePosition(enemy, 5);
  const enemyX = requireValue(graphics.initialState, "enemy_x");
  const enemyY = requireValue(graphics.initialState, "enemy_y");
  const playerX = requireValue(graphics.initialState, "player_x");
  const playerY = requireValue(graphics.initialState, "player_y");
  const enemyBoundary = hullBoundary(asset, "enemy", allied.segmentRow);
  const warningSpan = (turret, muzzle, missile, timer) => {
    const visual = warningVisual({
      state: BROADSIDE_STATES.WARNING,
      owner: turret.side,
      x: muzzle.x,
      y: muzzle.y,
      timer,
    }, asset);
    return { missile, x: visual.x, y: visual.y, height: visual.height, size: visual.size };
  };

  const panelDefinitions = [
    {
      label: "ALLIED MUZZLE WARNING",
      spans: [warningSpan(allied, alliedMuzzle, 2, 8)],
    },
    {
      label: "ENEMY MUZZLE WARNING",
      spans: [warningSpan(enemy, enemyMuzzle, 1, 8)],
    },
    {
      label: "THREE SHELL CROSSING",
      spans: [
        { missile: 1, x: enemyMuzzle.x - asset.broadside.projectileSpeed * 12, y: enemyMuzzle.y,
          height: asset.broadside.flyingHeight },
        { missile: 2, x: alliedMuzzle.x + asset.broadside.projectileSpeed * 18, y: alliedMuzzle.y,
          height: asset.broadside.flyingHeight },
        { missile: 3, x: enemySecondMuzzle.x - asset.broadside.projectileSpeed * 8,
          y: enemySecondMuzzle.y,
          height: asset.broadside.flyingHeight },
      ],
    },
    {
      label: "ALLIED HIT ON FIGHTER",
      spans: [{ missile: 2, x: enemyX, y: enemyY + 4, height: asset.broadside.impactHeight }],
    },
    {
      label: "OPPOSITE HULL IMPACT",
      spans: [{ missile: 3, x: enemyBoundary - 2, y: alliedMuzzle.y,
        height: asset.broadside.impactHeight }],
    },
    {
      label: "PLAYER DAMAGE IMPACT",
      spans: [{ missile: 1, x: playerX, y: playerY + 4, height: asset.broadside.impactHeight }],
    },
  ];

  const columns = 2;
  const rows = 3;
  const labelHeight = 16;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);

  panelDefinitions.forEach((panel, index) => {
    const panelPixels = Uint8Array.from(base.registerPixels);
    for (const span of panel.spans) {
      drawMissileSpan(panelPixels, span.x, span.y, span.height, color(span.missile), span.size ?? 1);
    }
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, panel.label, originX + 68, originY + 4, frontend);
  });
  return { graphics, panelDefinitions, registerPixels, width, height };
}

export function createBroadsideFireSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readBroadsideFireSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

function visibleSectorCannon(asset, side, sectorPhase) {
  const turret = asset.turrets.find((candidate) => candidate.side === side);
  for (let offset = 0; offset < 22; offset += 1) {
    const leftRow = sectorPhase - 1 - offset;
    const sideRow = sectorRowForSide(asset, side, leftRow);
    if (asset.sector.cannonRowsBySide.get(side).includes(sideRow)) {
      return { turret, leftRow, sideRow, screenRow: 2 + offset };
    }
  }
  throw new Error(`${side} cannon is not visible at sector phase ${sectorPhase}`);
}

export function readFlagshipSectorSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const asset = graphics.capitalHulls;
  const panelSpecs = [
    { label: "ENGINES  ROWS 000-031", phase: 24, state: "ENGINES" },
    { label: "AFT  ROWS 032-055", phase: 54, state: "AFT" },
    { label: "COMBAT  ROWS 056-183", phase: asset.sector.previewSectorRow, state: "COMBAT" },
    { label: "FORWARD  ROWS 184-207", phase: 206, state: "FORWARD" },
    { label: "PROW  ROWS 208-239", phase: 230, state: "PROW" },
    { label: "TERMINAL TIPS  THEN EMPTY", phase: 240, state: "PROW" },
    { label: "DRAIN  11 OF 22 ROWS", phase: asset.sector.streamRows, drainRows: 11, state: "DRAIN" },
    { label: "COMPLETE  ALL EFFECTS CLEAR", phase: asset.sector.streamRows, drainRows: 22, state: "COMPLETE" },
  ];
  const columns = 3;
  const rows = 3;
  const labelHeight = 20;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);
  const panelDefinitions = [];

  panelSpecs.forEach((spec, index) => {
    const screenState = createCanonicalScreenRuntimeState(graphics, { sectorPhase: spec.phase });
    for (let drain = 0; drain < (spec.drainRows ?? 0); drain += 1) {
      advanceCanonicalHullRuntimeState(screenState, graphics);
    }
    const panelPixels = drawGameplayMixedScreen(
      graphics.hardwareState,
      screenState.screen,
      graphics,
    );
    overlayCanonicalPmg(panelPixels, graphics);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, spec.label, originX + 54, originY + 5, frontend);
    panelDefinitions.push({ ...spec, screen: Uint8Array.from(screenState.screen) });
  });
  return { graphics, panelDefinitions, registerPixels, width, height };
}

export function createFlagshipSectorSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readFlagshipSectorSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

function renderLabeledGameplayPanels(frontend, panelDefinitions, columns = 3) {
  const labelHeight = 20;
  const rows = Math.ceil(panelDefinitions.length / columns);
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  panelDefinitions.forEach((panel, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panel.pixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, panel.label, originX + 16, originY + 5, frontend);
  });
  return { registerPixels, width, height };
}

function graphicsWithEnginePhase(graphics, phase) {
  const charset = Uint8Array.from(graphics.charset);
  for (const side of ["allied", "enemy"]) {
    const glyph = graphics.capitalHulls.sector.engineGlyphs.get(side);
    charset.set(glyph.animationBytes[phase], glyph.index * CHARACTER_HEIGHT);
  }
  return { ...graphics, charset };
}

export function readEngineBankSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const specs = [
    ...[0, 1, 2].map((phase) => ({ label: `LEFT ENGINE PHASE ${phase}`, phase, sectorPhase: 22 })),
    ...[0, 1, 2].map((phase) => ({ label: `RIGHT ENGINE PHASE ${phase}`, phase, sectorPhase: 30 })),
    { label: "LEFT ENGINE HOUSING TO AFT", phase: 1, sectorPhase: 44 },
    { label: "RIGHT ENGINE HOUSING TO AFT", phase: 1, sectorPhase: 52 },
  ];
  const panelDefinitions = specs.map((spec) => {
    const phaseGraphics = graphicsWithEnginePhase(graphics, spec.phase);
    const screenState = createCanonicalScreenRuntimeState(phaseGraphics, {
      sectorPhase: spec.sectorPhase,
    });
    const pixels = drawGameplayMixedScreen(
      phaseGraphics.hardwareState,
      screenState.screen,
      phaseGraphics,
    );
    overlayCanonicalPmg(pixels, phaseGraphics);
    return { ...spec, pixels, screen: Uint8Array.from(screenState.screen) };
  });
  const frontend = readFrontendGraphicsSource(source);
  return { graphics, panelDefinitions, ...renderLabeledGameplayPanels(frontend, panelDefinitions) };
}

export function createEngineBankSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readEngineBankSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readProwSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const specs = [
    ["FORWARD TO LEFT PROW", 214],
    ["BROAD BOW SHOULDERS", 222],
    ["DISTINCT MID TAPER", 230],
    ["LEFT TERMINAL WEDGE", 240],
    ["RIGHT TERMINAL SPEAR", 248],
    ["BOTH TIPS THEN EMPTY", 249],
  ];
  const panelDefinitions = specs.map(([label, sectorPhase]) => {
    const screenState = createCanonicalScreenRuntimeState(graphics, { sectorPhase });
    const pixels = drawGameplayMixedScreen(graphics.hardwareState, screenState.screen, graphics);
    overlayCanonicalPmg(pixels, graphics);
    return { label, sectorPhase, pixels, screen: Uint8Array.from(screenState.screen) };
  });
  const frontend = readFrontendGraphicsSource(source);
  return { graphics, panelDefinitions, ...renderLabeledGameplayPanels(frontend, panelDefinitions) };
}

export function createProwSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readProwSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readEnemyFighterLimitsRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const minimum = requireValue(graphics.constants, "ENEMY_X_MIN");
  const maximum = requireValue(graphics.constants, "ENEMY_X_MAX");
  const visibleWidth = requireValue(graphics.constants, "ENEMY_VISIBLE_WIDTH");
  const corridorLeft = requireValue(graphics.constants, "CORRIDOR_LEFT_HPOS");
  const corridorRight = requireValue(graphics.constants, "CORRIDOR_RIGHT_HPOS");
  const enemyY = 112;
  const panelDefinitions = [
    { label: `LEFT LIMIT LOGICAL HPOS ${minimum}`, enemyX: minimum },
    { label: `RIGHT LIMIT LOGICAL HPOS ${maximum}`, enemyX: maximum },
  ].map((spec) => {
    const screenState = createCanonicalScreenRuntimeState(graphics, {
      sectorPhase: graphics.capitalHulls.sector.previewSectorRow,
    });
    const pixels = drawGameplayMixedScreen(graphics.hardwareState, screenState.screen, graphics);
    overlayCanonicalPmg(pixels, graphics, { enemyX: spec.enemyX, enemyY });
    return { ...spec, enemyY, pixels, screen: Uint8Array.from(screenState.screen) };
  });
  return {
    graphics,
    minimum,
    maximum,
    visibleWidth,
    corridorLeft,
    corridorRight,
    envelopes: [
      { origin: minimum, left: minimum, rightExclusive: minimum + visibleWidth },
      { origin: maximum, left: maximum, rightExclusive: maximum + visibleWidth },
    ],
    panelDefinitions,
    ...renderLabeledGameplayPanels(readFrontendGraphicsSource(source), panelDefinitions, 2),
  };
}

export function createEnemyFighterLimitsPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readEnemyFighterLimitsRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readHeavyShellDetailSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const base = readGameplayRuntimeState(source, capitalHullsDefinition);
  const { graphics } = base;
  const asset = graphics.capitalHulls;
  const allied = visibleSectorCannon(asset, "allied", asset.sector.previewSectorRow);
  const enemy = visibleSectorCannon(asset, "enemy", asset.sector.previewSectorRow);
  const alliedMuzzle = muzzlePosition(allied.turret, allied.screenRow);
  const enemyMuzzle = muzzlePosition(enemy.turret, enemy.screenRow);
  const flashCode = (side) => asset.glyphs.find(({ name }) =>
    name === `${side}_launch_flash`).screenCode;
  const shellSpan = (missile, owner, x, y, frame) => {
    const visual = heavyShellVisual({
      state: BROADSIDE_STATES.FLYING,
      missile,
      owner,
      x,
      y,
    }, asset, frame);
    return { missile, ...visual };
  };
  const panels = [
    {
      label: "ALLIED HOT WARNING  FRAME 24",
      spans: [{ missile: 2, ...warningVisual({
        state: BROADSIDE_STATES.WARNING,
        owner: "allied",
        x: alliedMuzzle.x,
        y: alliedMuzzle.y,
        timer: 1,
      }, asset) }],
    },
    {
      label: "ALLIED LAUNCH FLASH  FRAME 25",
      flash: { ...allied, code: flashCode("allied") },
      spans: [shellSpan(2, "allied", alliedMuzzle.x, alliedMuzzle.y, 0)],
    },
    {
      label: "ALLIED SLUG COMPACT  FRAME 27",
      flash: { ...allied, code: flashCode("allied") },
      spans: [shellSpan(2, "allied", alliedMuzzle.x + 4, alliedMuzzle.y, 1)],
    },
    {
      label: "ALLIED SLUG FULL  FRAME 29",
      spans: [shellSpan(2, "allied", alliedMuzzle.x + 8, alliedMuzzle.y, 3)],
    },
    {
      label: "ENEMY LAUNCH FLASH  FRAME 25",
      flash: { ...enemy, code: flashCode("enemy") },
      spans: [shellSpan(1, "enemy", enemyMuzzle.x, enemyMuzzle.y, 0)],
    },
    {
      label: "HEAVY IMPACT  FIVE FRAME STATE",
      spans: [{ missile: 3, x: 168, y: alliedMuzzle.y, height: asset.broadside.impactHeight,
        size: 1 }],
    },
  ];
  const columns = 3;
  const rows = 2;
  const labelHeight = 20;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);

  panels.forEach((panel, index) => {
    const screen = Uint8Array.from(base.screen);
    if (panel.flash) {
      screen[panel.flash.screenRow * SCREEN_COLUMNS + panel.flash.turret.muzzleColumn] =
        panel.flash.code;
    }
    const panelPixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
    overlayCanonicalPmg(panelPixels, graphics);
    for (const span of panel.spans) {
      drawMissileSpan(
        panelPixels,
        span.x,
        span.y,
        span.height,
        requireValue(graphics.hardwareState, `COLPM${span.missile}`),
        span.size ?? 1,
      );
    }
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, panel.label, originX + 44, originY + 5, frontend);
  });
  return { graphics, panelDefinitions: panels, registerPixels, width, height };
}

export function createHeavyShellDetailSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readHeavyShellDetailSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

function applyCapitalExplosionToScreen(screen, asset, {
  side = "enemy",
  screenRow = 10,
  timer,
} = {}) {
  const visual = capitalExplosionVisual(asset, timer);
  const targetRow = screen.slice(screenRow * SCREEN_COLUMNS,
    (screenRow + 1) * SCREEN_COLUMNS);
  let firstColumn;
  if (side === "allied") {
    let lastHullColumn = 7;
    while (lastHullColumn > 0 && targetRow[lastHullColumn] === 0) lastHullColumn -= 1;
    firstColumn = Math.max(0, lastHullColumn - visual.width + 1);
  } else {
    firstColumn = 32;
    while (firstColumn < 39 && targetRow[firstColumn] === 0) firstColumn += 1;
    firstColumn = Math.min(40 - visual.width, firstColumn);
  }
  const topRow = screenRow - 1;
  const glyphEnd = asset.definition.charsetBaseIndex + asset.glyphs.length;
  for (let row = 0; row < visual.height; row += 1) {
    for (let column = 0; column < visual.width; column += 1) {
      const screenIndex = (topRow + row) * SCREEN_COLUMNS + firstColumn + column;
      const underlying = screen[screenIndex] & 0x7f;
      const effectCode = visual.cells[row * visual.width + column];
      if (effectCode !== 0 && underlying >= asset.definition.charsetBaseIndex &&
          underlying < glyphEnd) {
        screen[screenIndex] = effectCode;
      }
    }
  }
  return { ...visual, side, screenRow, topRow, firstColumn };
}

export function readCapitalHullExplosionSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const asset = graphics.capitalHulls;
  const base = createCanonicalScreenRuntimeState(graphics, {
    sectorPhase: asset.sector.previewSectorRow,
  });
  const labels = [
    "FRAME 00  WHITE AMBER CORE",
    "FRAME 04  RED EXPANSION",
    "FRAME 08  LARGE RED FIREBALL",
    "FRAME 12  RED BREAKUP",
    "FRAME 16  FADING EMBERS",
    "FRAME 20  FINAL EMBERS",
  ];
  const columns = 3;
  const rows = 2;
  const labelHeight = 20;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);
  const panelDefinitions = [];

  labels.forEach((label, index) => {
    const screen = Uint8Array.from(base.screen);
    const timer = asset.broadside.capitalExplosion.durationFrames -
      index * asset.broadside.capitalExplosion.phaseFrames;
    const explosion = applyCapitalExplosionToScreen(screen, asset, {
      side: "enemy",
      screenRow: 10,
      timer,
    });
    const pixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
    overlayCanonicalPmg(pixels, graphics);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        pixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, label, originX + 44, originY + 5, frontend);
    panelDefinitions.push({ label, timer, explosion, screen });
  });
  return { graphics, panelDefinitions, registerPixels, width, height };
}

export function createCapitalHullExplosionSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readCapitalHullExplosionSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function createCapitalExplosionPokeyTrace(
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const effect = compileCapitalHulls(capitalHullsDefinition).broadside.capitalExplosion;
  const lines = ["pal_frame,AUDF4,AUDC4,AUDCTL,volume"];
  for (let frame = 0; frame < effect.durationFrames; frame += 1) {
    const frequency = effect.soundFrequencyBytes[frame];
    const control = effect.soundControlBytes[frame];
    lines.push(`${frame},${frequency},${control},${effect.soundAudctl},${control & 0x0f}`);
  }
  lines.push(`${effect.durationFrames},0,0,0,0`);
  return `${lines.join("\n")}\n`;
}

export function readBroadsideAcceptanceSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const base = readGameplayPlayfieldRuntimeState(source, capitalHullsDefinition);
  const { graphics } = base;
  const asset = graphics.capitalHulls;
  const turretById = new Map(asset.turrets.map((turret) => [turret.id, turret]));
  const allied = turretById.get("allied_turret_a");
  const enemy = turretById.get("enemy_turret_a");
  const visibleRows = Array.from({ length: 22 }, (_, offset) =>
    asset.sector.previewSectorRow - 1 - offset);
  const cannonScreenRow = (turret) => {
    const offset = visibleRows.findIndex((leftRow) => {
      const sideRow = sectorRowForSide(asset, turret.side, leftRow);
      return asset.sector.cannonRowsBySide.get(turret.side).includes(sideRow);
    });
    if (offset < 0) throw new Error(`${turret.id} is missing from the preview sector phase`);
    return 2 + offset;
  };
  const alliedMuzzle = muzzlePosition(allied, cannonScreenRow(allied));
  const enemyMuzzle = muzzlePosition(enemy, cannonScreenRow(enemy));
  const color = (missile) => requireValue(graphics.hardwareState, `COLPM${missile}`);
  const warningSpan = (turret, muzzle, missile, timer) => {
    const visual = warningVisual({
      state: BROADSIDE_STATES.WARNING,
      owner: turret.side,
      x: muzzle.x,
      y: muzzle.y,
      timer,
    }, asset);
    return { missile, x: visual.x, y: visual.y, height: visual.height, size: visual.size };
  };
  const envelope = combinedPlayerEnvelope(graphics.playerShape, graphics.playerEngineShape);
  const contactState = { visibleRows, envelope };
  const alliedContact = playerHullContact(asset, {
    ...contactState,
    playerX: 48,
    playerY: 112,
  });
  const enemyContact = playerHullContact(asset, {
    ...contactState,
    playerX: 200,
    playerY: 144,
  });
  const panelDefinitions = [
    { label: "ALLIED EARLY WARNING", spans: [warningSpan(allied, alliedMuzzle, 2, 25)] },
    { label: "ALLIED MEDIUM WARNING", spans: [warningSpan(allied, alliedMuzzle, 2, 17)] },
    { label: "ALLIED HOT WARNING", spans: [warningSpan(allied, alliedMuzzle, 2, 8)] },
    {
      label: "ALLIED LAUNCH SAME PATH",
      spans: [{
        missile: 2,
        x: alliedMuzzle.x,
        y: alliedMuzzle.y,
        height: asset.broadside.flyingHeight,
        size: 1,
      }],
    },
    { label: "ENEMY EARLY WARNING", spans: [warningSpan(enemy, enemyMuzzle, 1, 25)] },
    { label: "ENEMY HOT WARNING", spans: [warningSpan(enemy, enemyMuzzle, 1, 8)] },
    {
      label: "ALLIED HULL CONTACT",
      player: { x: alliedContact.clampedX, y: 112 },
      contact: alliedContact,
    },
    {
      label: "ENEMY HULL CONTACT",
      player: { x: enemyContact.clampedX, y: 144 },
      contact: enemyContact,
    },
    {
      label: "PLAYER DAMAGE FEEDBACK",
      player: { x: alliedContact.clampedX, y: 112 },
      contact: alliedContact,
      backgroundColor: 0x42,
    },
    {
      label: "ZERO HEALTH TRANSITION",
      player: { x: alliedContact.clampedX, y: 112, visible: false },
      contact: alliedContact,
    },
  ];

  const columns = 2;
  const rows = 5;
  const labelHeight = 16;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);

  panelDefinitions.forEach((panel, index) => {
    const playfield = panel.backgroundColor === undefined
      ? base
      : readGameplayPlayfieldRuntimeState(source, capitalHullsDefinition, panel.backgroundColor);
    const panelPixels = Uint8Array.from(playfield.registerPixels);
    overlayCanonicalPmg(panelPixels, graphics, {
      playerX: panel.player?.x,
      playerY: panel.player?.y,
      showPlayer: panel.player?.visible !== false,
    });
    for (const span of panel.spans ?? []) {
      drawMissileSpan(panelPixels, span.x, span.y, span.height, color(span.missile), span.size ?? 1);
    }
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, panel.label, originX + 60, originY + 4, frontend);
  });
  return { graphics, panelDefinitions, registerPixels, width, height };
}

export function createBroadsideAcceptanceSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readBroadsideAcceptanceSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readPlayerRespawnSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const base = readGameplayPlayfieldRuntimeState(source, capitalHullsDefinition);
  const { graphics } = base;
  const asset = graphics.capitalHulls;
  const frontend = readFrontendGraphicsSource(source);
  const visibleRows = Array.from({ length: 22 }, (_, offset) =>
    asset.sector.previewSectorRow - 1 - offset);
  const envelope = combinedPlayerEnvelope(graphics.playerShape, graphics.playerEngineShape);
  const playerX = requireValue(graphics.constants, "PLAYER_RESPAWN_X");
  const playerY = requireValue(graphics.constants, "PLAYER_RESPAWN_Y");
  const contactState = { visibleRows, envelope, playerY };
  const centeredContact = playerHullContact(asset, { ...contactState, playerX });
  const alliedContact = playerHullContact(asset, { ...contactState, playerX: PMG_LEFT_EDGE });
  const enemyContact = playerHullContact(asset, { ...contactState, playerX: 200 });
  const bullet = {
    x: playerX + 8,
    y: playerY - 4,
    height: 1,
    size: 0,
  };
  const panels = [
    { label: "CENTER LEFT ROW PASS  NO HIT", player: { x: playerX, y: playerY },
      contact: centeredContact },
    { label: "CENTER RIGHT ROW PASS  NO HIT", player: { x: playerX, y: playerY },
      contact: centeredContact },
    { label: "REAL LEFT CONTACT  ONE LIFE EVENT",
      player: { x: alliedContact.clampedX, y: playerY }, contact: alliedContact },
    { label: "REAL RIGHT CONTACT  ONE LIFE EVENT",
      player: { x: enemyContact.clampedX, y: playerY }, contact: enemyContact },
    { label: "DEATH FRAME 006  PLAYER HIDDEN", player: { x: playerX, y: playerY, visible: false } },
    { label: "RESPAWN FRAME 000  X124 Y184", player: { x: playerX, y: playerY } },
    { label: "INVULN FRAME 007  VISIBLE M0 ACTIVE", player: { x: playerX, y: playerY }, bullet },
    { label: "INVULN FRAME 008  HIDDEN M0 ACTIVE",
      player: { x: playerX, y: playerY, visible: false }, bullet },
    { label: "INVULN FRAME 249  LAST PROTECTED",
      player: { x: playerX, y: playerY, visible: false } },
    { label: "FRAME 250  VISIBLE ALIVE NEXT HIT", player: { x: playerX, y: playerY } },
  ];
  const columns = 2;
  const rows = 5;
  const labelHeight = 20;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);

  panels.forEach((panel, index) => {
    const panelPixels = Uint8Array.from(base.registerPixels);
    overlayCanonicalPmg(panelPixels, graphics, {
      playerX: panel.player.x,
      playerY: panel.player.y,
      showPlayer: panel.player.visible !== false,
    });
    if (panel.bullet) {
      drawMissileSpan(
        panelPixels,
        panel.bullet.x,
        panel.bullet.y,
        panel.bullet.height,
        requireValue(graphics.hardwareState, "COLPM0"),
        panel.bullet.size,
      );
    }
    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    drawComparisonLabel(registerPixels, width, panel.label, originX + 36, originY + 5, frontend);
  });
  return { graphics, panelDefinitions: panels, registerPixels, width, height };
}

export function createPlayerRespawnSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readPlayerRespawnSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readBroadsideSpeedSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const snapshots = simulateBroadsideSpeedSequence(graphics.capitalHulls);
  const screenState = createCanonicalScreenRuntimeState(graphics);
  const columns = 3;
  const rows = 2;
  const labelHeight = 24;
  const cellHeight = SOURCE_HEIGHT + labelHeight;
  const width = SOURCE_WIDTH * columns;
  const height = cellHeight * rows;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);
  const panelDefinitions = [];

  snapshots.forEach((snapshot, index) => {
    while (screenState.advances < snapshot.world.advances) {
      advanceCanonicalScreenRuntimeState(screenState, graphics);
    }
    while (screenState.hullAdvances < snapshot.world.hullAdvances) {
      advanceCanonicalHullRuntimeState(screenState, graphics);
    }
    if (screenState.corridorPhase !== snapshot.world.corridorPhase) {
      throw new Error("Speed preview screen and world simulation lost their corridor phase");
    }
    const screen = Uint8Array.from(screenState.screen);
    const panelPixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
    overlayCanonicalPmg(panelPixels, graphics);
    const warning = snapshot.warning.visual;
    drawMissileSpan(
      panelPixels,
      warning.x,
      warning.y,
      warning.height,
      requireValue(graphics.hardwareState, `COLPM${snapshot.warning.missile}`),
      warning.size,
    );
    drawMissileSpan(
      panelPixels,
      snapshot.projectile.x,
      snapshot.projectile.y,
      graphics.capitalHulls.broadside.flyingHeight,
      requireValue(graphics.hardwareState, `COLPM${snapshot.projectile.missile}`),
      1,
    );

    const column = index % columns;
    const row = Math.floor(index / columns);
    const originX = column * SOURCE_WIDTH;
    const originY = row * cellHeight;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (originY + labelHeight + y) * width + originX,
      );
    }
    const frame = String(snapshot.frame).padStart(2, "0");
    const worldRow = String(snapshot.world.advances).padStart(2, "0");
    const phase = String(snapshot.world.corridorPhase).padStart(2, "0");
    drawComparisonLabel(
      registerPixels,
      width,
      `PAL ${frame}  WORLD ROW ${worldRow}  PHASE ${phase}`,
      originX + 32,
      originY + 2,
      frontend,
    );
    drawComparisonLabel(
      registerPixels,
      width,
      `WORLD ${snapshot.worldScrolled ? "STEP" : "HOLD"}  HULL ${snapshot.hullScrolled ? "STEP" : "HOLD"}`,
      originX + 80,
      originY + 13,
      frontend,
    );
    panelDefinitions.push({ ...snapshot, screen });
  });

  return { graphics, panelDefinitions, registerPixels, width, height };
}

export function createBroadsideSpeedSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readBroadsideSpeedSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readDifficultySpeedComparisonRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const frontend = readFrontendGraphicsSource(source);
  const difficulties = ["easy", "medium", "hard"];
  const frames = 20;
  const labelHeight = 40;
  const width = SOURCE_WIDTH * difficulties.length;
  const height = SOURCE_HEIGHT + labelHeight;
  const registerPixels = new Uint8Array(width * height);
  const panelDefinitions = [];

  difficulties.forEach((difficulty, index) => {
    const snapshots = simulateBroadsideSpeedSequence(
      graphics.capitalHulls,
      { frames, difficulty },
    );
    const initial = snapshots[0];
    const final = snapshots.at(-1);
    const eventFrames = snapshots.filter(({ scrolled }) => scrolled).map(({ frame }) => frame);
    const screenState = createCanonicalScreenRuntimeState(graphics);
    while (screenState.advances < final.world.advances) {
      advanceCanonicalScreenRuntimeState(screenState, graphics);
    }
    while (screenState.hullAdvances < final.world.hullAdvances) {
      advanceCanonicalHullRuntimeState(screenState, graphics);
    }
    if (screenState.corridorPhase !== final.world.corridorPhase) {
      throw new Error(`${difficulty} preview lost its source-derived corridor phase`);
    }
    const screen = Uint8Array.from(screenState.screen);
    const panelPixels = drawGameplayMixedScreen(graphics.hardwareState, screen, graphics);
    overlayCanonicalPmg(panelPixels, graphics);
    const warning = final.warning.visual;
    drawMissileSpan(
      panelPixels,
      warning.x,
      warning.y,
      warning.height,
      requireValue(graphics.hardwareState, `COLPM${final.warning.missile}`),
      warning.size,
    );
    drawMissileSpan(
      panelPixels,
      final.projectile.x,
      final.projectile.y,
      graphics.capitalHulls.broadside.flyingHeight,
      requireValue(graphics.hardwareState, `COLPM${final.projectile.missile}`),
      1,
    );

    const originX = index * SOURCE_WIDTH;
    for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
      registerPixels.set(
        panelPixels.subarray(y * SOURCE_WIDTH, (y + 1) * SOURCE_WIDTH),
        (labelHeight + y) * width + originX,
      );
    }
    const eventChunks = [eventFrames.slice(0, 5), eventFrames.slice(5)];
    const rate = graphics.capitalHulls.broadside.worldScrollRates[difficulty];
    const displacement = final.world.advances * CHARACTER_HEIGHT;
    const projectileDisplacement = Math.abs(final.projectile.x - initial.projectile.x);
    drawComparisonLabel(registerPixels, width,
      `${difficulty.toUpperCase()} ${rate}/20 WORLD ${String(final.world.advances).padStart(2, "0")} HULL ${String(final.world.hullAdvances).padStart(2, "0")}`,
      originX + 8, 1, frontend);
    eventChunks.forEach((events, chunkIndex) => {
      const prefix = chunkIndex === 0 ? "EVENT " : "      ";
      drawComparisonLabel(registerPixels, width,
        `${prefix}${events.map((frame) => String(frame).padStart(2, "0")).join(" ")}`,
        originX + 8, 11 + chunkIndex * 10, frontend);
    });
    drawComparisonLabel(registerPixels, width,
      `WARN ${String(final.warning.timer).padStart(2, "0")} SHOT ${String(projectileDisplacement).padStart(3, "0")} PAL FRAMES`,
      originX + 8, 31, frontend);
    panelDefinitions.push({
      difficulty,
      rate,
      frames,
      eventFrames,
      initial,
      final,
      displacement,
      projectileDisplacement,
      screen,
    });
  });

  return { graphics, panelDefinitions, registerPixels, width, height };
}

export function createDifficultySpeedComparisonPreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readDifficultySpeedComparisonRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

function drawCadenceEvents(registerPixels, width, simulation, y, timelineX, timelineWidth,
  hardwareState) {
  const eventX = (frame) => timelineX + Math.floor(
    (frame - 1) * (timelineWidth - 1) / (simulation.frames - 1),
  );
  for (const warning of simulation.warningStarts) {
    const launch = simulation.launches.find((candidate) =>
      candidate.frame >= warning.frame && candidate.missile === warning.missile &&
      candidate.turretId === warning.turretId);
    const colour = requireValue(hardwareState, `COLPM${warning.missile}`);
    const startX = eventX(warning.frame);
    for (let xOffset = 0; xOffset < 2; xOffset += 1) {
      for (let yOffset = -2; yOffset < 5; yOffset += 1) {
        registerPixels[(y + yOffset) * width + startX + xOffset] = colour;
      }
    }
    if (!launch) continue;
    const endX = eventX(launch.frame);
    for (let x = startX; x <= endX; x += 1) {
      for (let offset = 0; offset < 3; offset += 1) {
        registerPixels[(y + offset) * width + x] = colour;
      }
    }
    for (let offset = -2; offset < 6; offset += 1) {
      registerPixels[(y + offset) * width + endX] = colour;
    }
  }
}

function drawCadenceScrollTicks(registerPixels, width, frames, scrollEvents, y, timelineX,
  timelineWidth, colour) {
  for (const frame of scrollEvents) {
    const x = timelineX + Math.floor((frame - 1) * (timelineWidth - 1) / (frames - 1));
    registerPixels[y * width + x] = colour;
  }
}

function cadenceSummaryLabel(prefix, asset, simulation) {
  const twoDigits = (value) => String(value).padStart(2, "0");
  const threeDigits = (value) => String(Math.round(value)).padStart(3, "0");
  return `${prefix} ${asset.broadside.hullScrollRates.hard}/` +
    `${asset.broadside.hullScrollRateDenominator}  ` +
    `${twoDigits(simulation.warningStats.count)} WARN ` +
    `${twoDigits(simulation.launchStats.count)} LAUNCH  GAP ` +
    `${threeDigits(simulation.warningStats.minimumGap)} ` +
    `${threeDigits(simulation.warningStats.averageGap)}`;
}

export function readBroadsideCadenceSequenceRuntimeState(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const graphics = readGameGraphicsSource(source, capitalHullsDefinition);
  const baselineDefinition = JSON.parse(JSON.stringify(capitalHullsDefinition));
  baselineDefinition.broadside.hullScrollRateDenominator = 80;
  baselineDefinition.broadside.scheduleDelayScale = 1;
  baselineDefinition.broadside.scheduleCalmFrames = 0;
  const baselineAsset = compileCapitalHulls(baselineDefinition);
  const finalAsset = graphics.capitalHulls;
  const baseline = simulateBroadsideCadence(baselineAsset, { frames: 1000 });
  const final = simulateBroadsideCadence(finalAsset, { frames: 1000 });
  const width = SOURCE_WIDTH * 2;
  const height = 128;
  const registerPixels = new Uint8Array(width * height);
  const frontend = readFrontendGraphicsSource(source);
  const timelineX = 16;
  const timelineWidth = width - timelineX * 2;
  const steel = requireValue(graphics.hardwareState, "COLPF1");

  drawComparisonLabel(registerPixels, width, `${baseline.frames} PAL FRAME CADENCE`,
    232, 4, frontend);
  drawComparisonLabel(registerPixels, width,
    cadenceSummaryLabel("BEFORE", baselineAsset, baseline), 16, 20, frontend);
  drawCadenceEvents(registerPixels, width, baseline, 42, timelineX, timelineWidth,
    graphics.hardwareState);
  drawCadenceScrollTicks(registerPixels, width, baseline.frames,
    baseline.scrollEvents, 50, timelineX, timelineWidth, steel);

  drawComparisonLabel(registerPixels, width,
    cadenceSummaryLabel("FINAL", finalAsset, final), 16, 64, frontend);
  drawCadenceEvents(registerPixels, width, final, 86, timelineX, timelineWidth,
    graphics.hardwareState);
  drawCadenceScrollTicks(registerPixels, width, final.frames,
    final.scrollEvents, 94, timelineX, timelineWidth, steel);
  drawComparisonLabel(registerPixels, width, "BARS WARNING TO LAUNCH   LOWER TICKS HULL SCROLL",
    112, 108, frontend);

  return { baseline, final, registerPixels, width, height };
}

export function createBroadsideCadenceSequencePreview(
  source,
  capitalHullsDefinition = loadCapitalHullsDefinition(DEFAULT_CAPITAL_HULLS_DEFINITION_PATH),
) {
  const state = readBroadsideCadenceSequenceRuntimeState(source, capitalHullsDefinition);
  return encodePng(
    scaleAndConvertToRgb(state.registerPixels, state.width, state.height),
    state.width * PREVIEW_SCALE,
    state.height * PREVIEW_SCALE,
  );
}

export function readStartMenuRuntimeState(source, selection) {
  const graphics = readFrontendGraphicsSource(source);
  const effectiveSelection = selection ?? graphics.defaultSelection;
  const screen = createStartMenuScreen(graphics, effectiveSelection);
  const registerPixels = drawMixedMainMenuScreen(screen, graphics);
  overlayStartMenuPmg(registerPixels, graphics);
  return { graphics, screen, registerPixels, selection: effectiveSelection };
}

export function createStartMenuPreview(source) {
  const { registerPixels } = readStartMenuRuntimeState(source);
  return encodePng(scaleAndConvertToRgb(registerPixels));
}

export function readLoaderRuntimeState(loaderDefinition) {
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
    for (
      let byteColumn = 0;
      byteColumn < loaderAsset.bytesPerRow;
      byteColumn += 1
    ) {
      const value = memory[sourceAddress + byteColumn];
      if (zone.displayMode === "ANTIC F") {
        for (let bit = 0; bit < 8; bit += 1) {
          registerPixels[y * SOURCE_WIDTH + byteColumn * 8 + bit] =
            anticFRegisterForBitmapBit(
              zone.values,
              value & (0x80 >>> bit),
            );
        }
      } else {
        for (let pixel = 0; pixel < 4; pixel += 1) {
          const bitmapPixel = (value >> (6 - pixel * 2)) & 3;
          const registerValue = anticERegisterForBitmapPixel(
            zone.values,
            bitmapPixel,
          );
          const x = byteColumn * 8 + pixel * 2;
          registerPixels[y * SOURCE_WIDTH + x] = registerValue;
          registerPixels[y * SOURCE_WIDTH + x + 1] = registerValue;
        }
      }
    }
  }
  return { loaderAsset, registerPixels };
}

export function createLoaderPreview(loaderDefinition) {
  const { registerPixels } = readLoaderRuntimeState(loaderDefinition);
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

export function generateStartMenuPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  outputPath = DEFAULT_START_MENU_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const png = createStartMenuPreview(source);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateCapitalHullsStripPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_CAPITAL_HULLS_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createCapitalHullsStripPreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateEnemyHullColourOptionsPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_ENEMY_HULL_COLOUR_OPTIONS_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createEnemyHullColourOptionsPreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateBroadsideAntic2PrototypePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  capitalHullsDefinitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  prototypeDefinitionPath = DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  outputPath = DEFAULT_BROADSIDE_ANTIC2_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const capitalHullsDefinition = loadCapitalHullsDefinition(capitalHullsDefinitionPath);
  const prototypeDefinition = loadCapitalHullsAntic2Prototype(prototypeDefinitionPath);
  const png = createBroadsideAntic2PrototypePreview(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateCapitalHullsAntic2StripPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  capitalHullsDefinitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  prototypeDefinitionPath = DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  outputPath = DEFAULT_CAPITAL_HULLS_ANTIC2_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const capitalHullsDefinition = loadCapitalHullsDefinition(capitalHullsDefinitionPath);
  const prototypeDefinition = loadCapitalHullsAntic2Prototype(prototypeDefinitionPath);
  const png = createCapitalHullsAntic2StripPreview(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateBroadsideModeComparisonPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  capitalHullsDefinitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  prototypeDefinitionPath = DEFAULT_CAPITAL_HULLS_ANTIC2_DEFINITION_PATH,
  outputPath = DEFAULT_BROADSIDE_COMPARISON_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const capitalHullsDefinition = loadCapitalHullsDefinition(capitalHullsDefinitionPath);
  const prototypeDefinition = loadCapitalHullsAntic2Prototype(prototypeDefinitionPath);
  const png = createBroadsideModeComparisonPreview(
    source,
    capitalHullsDefinition,
    prototypeDefinition,
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateBroadsideFireSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_BROADSIDE_FIRE_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createBroadsideFireSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateBroadsideAcceptanceSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_BROADSIDE_ACCEPTANCE_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createBroadsideAcceptanceSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generatePlayerRespawnSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_PLAYER_RESPAWN_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createPlayerRespawnSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateBroadsideCadenceSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_BROADSIDE_CADENCE_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createBroadsideCadenceSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateBroadsideSpeedSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_BROADSIDE_SPEED_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createBroadsideSpeedSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateDifficultySpeedComparisonPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_DIFFICULTY_SPEED_COMPARISON_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createDifficultySpeedComparisonPreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateFlagshipSectorSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_FLAGSHIP_SECTOR_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createFlagshipSectorSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateHeavyShellDetailSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_HEAVY_SHELL_DETAIL_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createHeavyShellDetailSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateCapitalHullExplosionSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_CAPITAL_EXPLOSION_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createCapitalHullExplosionSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateCapitalExplosionPokeyTrace({
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_CAPITAL_EXPLOSION_AUDIO_TRACE_PATH,
} = {}) {
  const definition = loadCapitalHullsDefinition(definitionPath);
  const trace = createCapitalExplosionPokeyTrace(definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  return { outputPath, bytes: Buffer.byteLength(trace), frames: definition.broadside.capitalExplosion.durationFrames };
}

export function generateEngineBankSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_ENGINE_BANK_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createEngineBankSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateProwSequencePreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_PROW_SEQUENCE_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createProwSequencePreview(source, definition);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  return { outputPath, bytes: png.length, ...inspectPng(png) };
}

export function generateEnemyFighterLimitsPreview({
  sourcePath = path.join(rootDirectory, "src", "main.s"),
  definitionPath = DEFAULT_CAPITAL_HULLS_DEFINITION_PATH,
  outputPath = DEFAULT_ENEMY_FIGHTER_LIMITS_PREVIEW_PATH,
} = {}) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const definition = loadCapitalHullsDefinition(definitionPath);
  const png = createEnemyFighterLimitsPreview(source, definition);
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

    const capitalHullsResult = generateCapitalHullsStripPreview();
    console.log(`Capital-hulls strip preview generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, capitalHullsResult.outputPath)}`);
    console.log(
      `  size: ${capitalHullsResult.width}x${capitalHullsResult.height}, ${capitalHullsResult.bytes} bytes`,
    );

    const enemyHullColoursResult = generateEnemyHullColourOptionsPreview();
    console.log(`Enemy-hull colour comparison generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, enemyHullColoursResult.outputPath)}`);
    console.log(
      `  size: ${enemyHullColoursResult.width}x${enemyHullColoursResult.height}, ${enemyHullColoursResult.bytes} bytes`,
    );

    const broadsideAntic2Result = generateBroadsideAntic2PrototypePreview();
    console.log(`ANTIC 2 broadside gameplay prototype generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, broadsideAntic2Result.outputPath)}`);
    console.log(
      `  size: ${broadsideAntic2Result.width}x${broadsideAntic2Result.height}, ${broadsideAntic2Result.bytes} bytes`,
    );

    const capitalHullsAntic2Result = generateCapitalHullsAntic2StripPreview();
    console.log(`ANTIC 2 capital-hulls strip generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, capitalHullsAntic2Result.outputPath)}`);
    console.log(
      `  size: ${capitalHullsAntic2Result.width}x${capitalHullsAntic2Result.height}, ${capitalHullsAntic2Result.bytes} bytes`,
    );

    const comparisonResult = generateBroadsideModeComparisonPreview();
    console.log(`Broadside mode comparison generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, comparisonResult.outputPath)}`);
    console.log(
      `  size: ${comparisonResult.width}x${comparisonResult.height}, ${comparisonResult.bytes} bytes`,
    );

    const broadsideFireResult = generateBroadsideFireSequencePreview();
    console.log(`Broadside-fire sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, broadsideFireResult.outputPath)}`);
    console.log(
      `  size: ${broadsideFireResult.width}x${broadsideFireResult.height}, ${broadsideFireResult.bytes} bytes`,
    );

    const broadsideAcceptanceResult = generateBroadsideAcceptanceSequencePreview();
    console.log(`Broadside acceptance sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, broadsideAcceptanceResult.outputPath)}`);
    console.log(
      `  size: ${broadsideAcceptanceResult.width}x${broadsideAcceptanceResult.height}, ${broadsideAcceptanceResult.bytes} bytes`,
    );

    const playerRespawnResult = generatePlayerRespawnSequencePreview();
    console.log(`Player-respawn sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, playerRespawnResult.outputPath)}`);
    console.log(
      `  size: ${playerRespawnResult.width}x${playerRespawnResult.height}, ${playerRespawnResult.bytes} bytes`,
    );

    const broadsideCadenceResult = generateBroadsideCadenceSequencePreview();
    console.log(`Broadside cadence sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, broadsideCadenceResult.outputPath)}`);
    console.log(
      `  size: ${broadsideCadenceResult.width}x${broadsideCadenceResult.height}, ${broadsideCadenceResult.bytes} bytes`,
    );

    const broadsideSpeedResult = generateBroadsideSpeedSequencePreview();
    console.log(`Broadside speed sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, broadsideSpeedResult.outputPath)}`);
    console.log(
      `  size: ${broadsideSpeedResult.width}x${broadsideSpeedResult.height}, ${broadsideSpeedResult.bytes} bytes`,
    );

    const difficultySpeedResult = generateDifficultySpeedComparisonPreview();
    console.log(`Difficulty-speed comparison generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, difficultySpeedResult.outputPath)}`);
    console.log(
      `  size: ${difficultySpeedResult.width}x${difficultySpeedResult.height}, ${difficultySpeedResult.bytes} bytes`,
    );

    const flagshipSectorResult = generateFlagshipSectorSequencePreview();
    console.log(`Flagship-sector sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, flagshipSectorResult.outputPath)}`);
    console.log(
      `  size: ${flagshipSectorResult.width}x${flagshipSectorResult.height}, ${flagshipSectorResult.bytes} bytes`,
    );

    const heavyShellResult = generateHeavyShellDetailSequencePreview();
    console.log(`Heavy-shell detail sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, heavyShellResult.outputPath)}`);
    console.log(
      `  size: ${heavyShellResult.width}x${heavyShellResult.height}, ${heavyShellResult.bytes} bytes`,
    );

    const capitalExplosionResult = generateCapitalHullExplosionSequencePreview();
    console.log(`Capital-hull explosion sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, capitalExplosionResult.outputPath)}`);
    console.log(
      `  size: ${capitalExplosionResult.width}x${capitalExplosionResult.height}, ${capitalExplosionResult.bytes} bytes`,
    );

    const capitalExplosionAudioResult = generateCapitalExplosionPokeyTrace();
    console.log(`Capital-explosion POKEY trace generated successfully`);
    console.log(`  CSV : ${path.relative(rootDirectory, capitalExplosionAudioResult.outputPath)}`);
    console.log(
      `  span: ${capitalExplosionAudioResult.frames} PAL frames, ${capitalExplosionAudioResult.bytes} bytes`,
    );

    const engineBankResult = generateEngineBankSequencePreview();
    console.log(`Capital-engine bank sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, engineBankResult.outputPath)}`);
    console.log(
      `  size: ${engineBankResult.width}x${engineBankResult.height}, ${engineBankResult.bytes} bytes`,
    );

    const prowResult = generateProwSequencePreview();
    console.log(`Capital-prow sequence generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, prowResult.outputPath)}`);
    console.log(
      `  size: ${prowResult.width}x${prowResult.height}, ${prowResult.bytes} bytes`,
    );

    const fighterLimitsResult = generateEnemyFighterLimitsPreview();
    console.log(`Enemy-fighter corridor-limit preview generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, fighterLimitsResult.outputPath)}`);
    console.log(
      `  size: ${fighterLimitsResult.width}x${fighterLimitsResult.height}, ${fighterLimitsResult.bytes} bytes`,
    );

    const startMenuResult = generateStartMenuPreview();
    console.log(`Start-menu preview generated successfully`);
    console.log(`  PNG : ${path.relative(rootDirectory, startMenuResult.outputPath)}`);
    console.log(
      `  size: ${startMenuResult.width}x${startMenuResult.height}, ${startMenuResult.bytes} bytes`,
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
