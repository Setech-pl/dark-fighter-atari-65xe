import fs from "node:fs";

export function loadFrontendH31Definition(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function compileFrontendH31(definition) {
  if (definition.format !== "void-strike-65-frontend-h31-v1") {
    throw new Error("Unsupported frontend H3.1 asset format");
  }
  if (definition.fontRowsHex.length !== 43) {
    throw new Error("Frontend H3.1 must define glyphs 1-43");
  }
  const fontRows = Buffer.concat(definition.fontRowsHex.map((hex, index) => {
    const rows = Buffer.from(hex, "hex");
    if (rows.length !== 7) throw new Error(`Frontend glyph ${index + 1} must have seven rows`);
    return rows;
  }));
  const extendedGlyphs = Buffer.from(definition.extendedGlyphsHex, "hex");
  if (definition.extendedGlyphBase !== 48 || extendedGlyphs.length !== 16 * 8) {
    throw new Error("Frontend H3.1 extended glyph range must be 48-63");
  }
  if (definition.maximumAntic67Glyph !== 63 ||
      definition.player_fighterGlyphs.join(",") !== "58,59,60,61,62,63") {
    throw new Error("Frontend H3.1 glyph ownership contract changed");
  }
  return { fontRows, extendedGlyphs, definition };
}

function ca65Bytes(bytes) {
  const lines = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    lines.push(`    .byte ${[...bytes.subarray(offset, offset + 16)]
      .map((value) => `$${value.toString(16).padStart(2, "0").toUpperCase()}`).join(",")}`);
  }
  return lines.join("\n");
}

export function renderFrontendH31Ca65Include(asset) {
  return `; Generated from assets/graphics/frontend-h31.json.\n` +
    `.macro EMIT_FRONTEND_H31_FONT_ROWS\n${ca65Bytes(asset.fontRows)}\n.endmacro\n\n` +
    `.macro EMIT_FRONTEND_H31_EXTENDED_GLYPHS\n${ca65Bytes(asset.extendedGlyphs)}\n.endmacro\n`;
}
