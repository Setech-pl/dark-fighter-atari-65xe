import fs from "node:fs";

import { compileCapitalHulls } from "./capital-hulls.mjs";

const CHARACTER_BYTES = 8;
const CHARSET_BYTES = 1024;
const REQUIRED_MODE = "ANTIC 2";

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseByte(value, name) {
  invariant(typeof value === "string" && /^\$[0-9A-Fa-f]{2}$/.test(value),
    `${name} must use ca65 byte notation such as $0A`);
  return Number.parseInt(value.slice(1), 16);
}

function parseWord(value, name) {
  invariant(typeof value === "string" && /^\$[0-9A-Fa-f]{4}$/.test(value),
    `${name} must use ca65 word notation such as $5000`);
  return Number.parseInt(value.slice(1), 16);
}

function compileOneBitGlyph(sourceGlyph, name) {
  invariant(sourceGlyph && sourceGlyph.name === name,
    `ANTIC 2 prototype must define ${name} in base-glyph order`);
  invariant(Array.isArray(sourceGlyph.pixels) && sourceGlyph.pixels.length === CHARACTER_BYTES,
    `ANTIC 2 glyph ${name} must contain exactly eight rows`);
  const pixels = sourceGlyph.pixels.map((row, rowIndex) => {
    invariant(typeof row === "string" && row.length === 8 && !/[^01]/.test(row),
      `ANTIC 2 glyph ${name} row ${rowIndex} must contain eight one-bit pixels`);
    return row;
  });
  return {
    name,
    pixels,
    bytes: Uint8Array.from(pixels.map((row) => Number.parseInt(row, 2))),
  };
}

export function loadCapitalHullsAntic2Prototype(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function compileCapitalHullsAntic2Prototype(definition, capitalHullsDefinition) {
  invariant(definition?.formatVersion === 1, "Unsupported ANTIC 2 prototype formatVersion");
  invariant(definition.displayMode === REQUIRED_MODE,
    `ANTIC 2 prototype displayMode must be ${REQUIRED_MODE}`);
  invariant(definition.baseDefinition === "assets/graphics/capital-hulls.json",
    "ANTIC 2 prototype must identify the canonical capital-hull source");

  const capitalHulls = compileCapitalHulls(capitalHullsDefinition);
  invariant(definition.charsetBaseIndex === capitalHulls.definition.charsetBaseIndex,
    "ANTIC 2 prototype charsetBaseIndex must match the canonical hull asset");

  invariant(Array.isArray(definition.glyphs),
    "ANTIC 2 prototype must define high-resolution glyphs");
  const prototypeGlyphs = new Map(definition.glyphs.map((glyph) => [glyph.name, glyph]));
  const canonicalMapGlyphs = new Set(
    [...capitalHulls.rowsBySide.values()].flat(2).filter((name) => name !== "space"),
  );
  const glyphs = capitalHulls.glyphs.filter(({ name }) => canonicalMapGlyphs.has(name))
    .map((baseGlyph) => ({
    ...compileOneBitGlyph(prototypeGlyphs.get(baseGlyph.name), baseGlyph.name),
    index: baseGlyph.index,
    tags: [...baseGlyph.tags],
    faction: baseGlyph.faction,
    }));

  invariant(Array.isArray(definition.starGlyphs) && definition.starGlyphs.length === 2,
    "ANTIC 2 prototype must define the canonical star and dot glyphs");
  const starGlyphs = definition.starGlyphs.map((sourceGlyph) => {
    invariant(Number.isInteger(sourceGlyph.index) && sourceGlyph.index >= 0 && sourceGlyph.index < 128,
      `ANTIC 2 star glyph ${sourceGlyph.name} has an invalid index`);
    return {
      ...compileOneBitGlyph(sourceGlyph, sourceGlyph.name),
      index: sourceGlyph.index,
    };
  });
  invariant(new Set(starGlyphs.map(({ index }) => index)).size === starGlyphs.length,
    "ANTIC 2 star glyph indices must be distinct");

  const proposedCharsetAddress = parseWord(
    definition.proposedCharsetAddress,
    "proposedCharsetAddress",
  );
  invariant((proposedCharsetAddress & 0x03ff) === 0,
    "Proposed ANTIC 2 charset must be aligned to a 1 KB CHBASE boundary");
  const palette = new Map(Object.entries(definition.palette ?? {}).map(([name, value]) => [
    name,
    parseByte(value, `palette.${name}`),
  ]));
  for (const name of ["COLBK", "COLPF1", "COLPF2"]) {
    invariant(palette.has(name), `ANTIC 2 prototype palette is missing ${name}`);
  }
  invariant(palette.get("COLBK") === 0 && palette.get("COLPF2") === 0,
    "ANTIC 2 prototype requires a genuinely black background and neutral hue");

  const screenCodes = new Map([["space", 0]]);
  for (const glyph of glyphs) screenCodes.set(glyph.name, glyph.index);
  const decodedMaps = new Map();
  for (const side of ["allied", "enemy"]) {
    decodedMaps.set(side, capitalHulls.rowsBySide.get(side).map((row) =>
      row.map((name) => {
        invariant(screenCodes.has(name), `${side} map references unknown ANTIC 2 glyph ${name}`);
        return screenCodes.get(name);
      })));
  }

  return {
    definition,
    capitalHulls,
    glyphs,
    glyphBytes: Uint8Array.from(glyphs.flatMap(({ bytes }) => [...bytes])),
    starGlyphs,
    starGlyphBytes: Uint8Array.from(starGlyphs.flatMap(({ bytes }) => [...bytes])),
    decodedMaps,
    turrets: capitalHulls.turrets,
    segmentRows: capitalHulls.segmentRows,
    mapColumns: capitalHulls.mapColumns,
    previewStartPhase: capitalHulls.previewStartPhase,
    proposedCharsetAddress,
    proposedCharsetBytes: CHARSET_BYTES,
    palette,
    sourceGlyphBytes: glyphs.length * CHARACTER_BYTES + starGlyphs.length * CHARACTER_BYTES,
  };
}

export function buildCapitalHullsAntic2Charset(baseCharset, prototype) {
  invariant(baseCharset.length === CHARSET_BYTES,
    "ANTIC 2 prototype requires the complete 1024-byte gameplay charset as its base");
  const charset = Uint8Array.from(baseCharset);
  for (const glyph of [...prototype.glyphs, ...prototype.starGlyphs]) {
    charset.set(glyph.bytes, glyph.index * CHARACTER_BYTES);
  }
  return charset;
}
