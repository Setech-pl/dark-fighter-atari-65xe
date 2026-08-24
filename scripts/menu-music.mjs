import fs from "node:fs";

const CHANNEL_COUNT = 4;
const TOKEN_HOLD = 0x00;
const TOKEN_REST = 0x10;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function byte(value) {
  return `$${value.toString(16).padStart(2, "0").toUpperCase()}`;
}

function integer(value, name, minimum, maximum) {
  invariant(Number.isInteger(value) && value >= minimum && value <= maximum,
    `${name} must be an integer from ${minimum} through ${maximum}`);
  return value;
}

export function loadMenuMusicDefinition(sourcePath) {
  return JSON.parse(fs.readFileSync(sourcePath, "utf8"));
}

export function compileMenuMusic(definition) {
  invariant(definition?.formatVersion === 1, "Unsupported menu-music formatVersion");
  invariant(definition.targetFrameHz === 50, "Menu music must target PAL 50 Hz");
  const framesPerRow = integer(definition.framesPerRow, "framesPerRow", 1, 255);
  const rowsPerPattern = integer(definition.rowsPerPattern, "rowsPerPattern", 1, 255);
  invariant(Array.isArray(definition.channelAllocation) &&
    definition.channelAllocation.length === CHANNEL_COUNT,
  "Menu music must document all four POKEY channels");

  invariant(Array.isArray(definition.frequencies) && definition.frequencies.length === 16,
    "Menu music needs exactly sixteen frequency entries");
  const pitchIndex = new Map();
  const frequencyBytes = definition.frequencies.map((entry, index) => {
    invariant(typeof entry?.id === "string" && entry.id.length > 0,
      `frequencies[${index}] needs an id`);
    invariant(!pitchIndex.has(entry.id), `Duplicate pitch id ${entry.id}`);
    pitchIndex.set(entry.id, index);
    return integer(entry.divider, `frequencies[${index}].divider`, 0, 255);
  });

  invariant(Array.isArray(definition.instruments) && definition.instruments.length > 0 &&
    definition.instruments.length <= 14, "Menu music needs one through fourteen instruments");
  const instrumentIndex = new Map();
  const controlBytes = Array(16).fill(0);
  definition.instruments.forEach((instrument, index) => {
    const tokenId = index + 2;
    invariant(typeof instrument?.id === "string" && instrument.id.length > 0,
      `instruments[${index}] needs an id`);
    invariant(!instrumentIndex.has(instrument.id), `Duplicate instrument id ${instrument.id}`);
    instrumentIndex.set(instrument.id, tokenId);
    controlBytes[tokenId] = integer(instrument.control,
      `instruments[${index}].control`, 0, 255);
  });

  function compileToken(token, path) {
    invariant(typeof token === "string", `${path} must be a string token`);
    if (token === "HOLD") return TOKEN_HOLD;
    if (token === "REST") return TOKEN_REST;
    const separator = token.indexOf(":");
    invariant(separator > 0 && separator < token.length - 1,
      `${path} must be HOLD, REST, or INSTRUMENT:PITCH`);
    const instrument = token.slice(0, separator);
    const pitch = token.slice(separator + 1);
    invariant(instrumentIndex.has(instrument), `${path} has unknown instrument ${instrument}`);
    invariant(pitchIndex.has(pitch), `${path} has unknown pitch ${pitch}`);
    return instrumentIndex.get(instrument) << 4 | pitchIndex.get(pitch);
  }

  invariant(definition.patterns && typeof definition.patterns === "object" &&
    !Array.isArray(definition.patterns), "Menu music patterns must be an object");
  const patternNames = Object.keys(definition.patterns);
  invariant(patternNames.length > 0 && patternNames.length <= 255,
    "Menu music needs one through 255 patterns");
  const patternIndex = new Map(patternNames.map((name, index) => [name, index]));
  const patternBytes = patternNames.map((name) => {
    const rows = definition.patterns[name];
    invariant(Array.isArray(rows) && rows.length === rowsPerPattern,
      `Pattern ${name} must contain ${rowsPerPattern} rows`);
    return Uint8Array.from(rows.flatMap((row, rowIndex) => {
      invariant(Array.isArray(row) && row.length === CHANNEL_COUNT,
        `Pattern ${name} row ${rowIndex} must contain four channels`);
      return row.map((token, channelIndex) =>
        compileToken(token, `patterns.${name}[${rowIndex}][${channelIndex}]`));
    }));
  });

  invariant(Array.isArray(definition.sequence) && definition.sequence.length > 0 &&
    definition.sequence.length <= 255, "Menu music sequence needs one through 255 entries");
  const sequenceBytes = Uint8Array.from(definition.sequence.map((name, index) => {
    invariant(patternIndex.has(name), `sequence[${index}] references unknown pattern ${name}`);
    return patternIndex.get(name);
  }));

  invariant(Array.isArray(definition.form) && definition.form.length === 4,
    "Menu music form must document intro, development, climax, and return");
  const expectedSections = ["INTRO", "DEVELOPMENT", "CLIMAX", "RETURN"];
  let formCursor = 0;
  definition.form.forEach((section, index) => {
    invariant(section?.id === expectedSections[index],
      `Menu music form section ${index} must be ${expectedSections[index]}`);
    invariant(section.sequenceStart === formCursor,
      `Menu music form section ${section.id} must start at ${formCursor}`);
    integer(section.sequenceEnd, `form.${section.id}.sequenceEnd`,
      section.sequenceStart + 1, sequenceBytes.length);
    formCursor = section.sequenceEnd;
  });
  invariant(formCursor === sequenceBytes.length, "Menu music form must cover the full sequence");

  const loopFrames = framesPerRow * rowsPerPattern * sequenceBytes.length;
  const channelMaskBytes = Uint8Array.from([1, 0, 2, 0, 4, 0, 8]);
  const dataBytes = frequencyBytes.length + controlBytes.length + channelMaskBytes.length +
    patternNames.length * 2 + sequenceBytes.length +
    patternBytes.reduce((sum, bytes) => sum + bytes.length, 0);

  return Object.freeze({
    ...definition,
    framesPerRow,
    rowsPerPattern,
    patternNames: Object.freeze(patternNames),
    patternBytes: Object.freeze(patternBytes),
    frequencyBytes: Uint8Array.from(frequencyBytes),
    controlBytes: Uint8Array.from(controlBytes),
    channelMaskBytes,
    sequenceBytes,
    loopFrames,
    loopSeconds: loopFrames / definition.targetFrameHz,
    dataBytes,
    stateBytes: 6,
  });
}

export function renderMenuMusicCa65Include(asset) {
  const lines = [
    "; Generated from assets/music/menu-theme.json by scripts/menu-music.mjs.",
    "; Do not edit this file by hand.",
    `MUSIC_PAL_HZ = ${asset.targetFrameHz}`,
    `MUSIC_FRAMES_PER_ROW = ${asset.framesPerRow}`,
    `MUSIC_PATTERN_ROWS = ${asset.rowsPerPattern}`,
    `MUSIC_PATTERN_COUNT = ${asset.patternNames.length}`,
    `MUSIC_SEQUENCE_LENGTH = ${asset.sequenceBytes.length}`,
    "MUSIC_MENU_CHANNEL_MASK = $0F",
    `MUSIC_TOKEN_HOLD = ${byte(TOKEN_HOLD)}`,
    `MUSIC_TOKEN_REST = ${byte(TOKEN_REST)}`,
    ".macro EMIT_MENU_MUSIC_DATA",
    "music_data_start:",
    "music_frequency_table:",
    `    .byte ${[...asset.frequencyBytes].map(byte).join(",")}`,
    "music_control_table:",
    `    .byte ${[...asset.controlBytes].map(byte).join(",")}`,
    "music_channel_masks:",
    `    .byte ${[...asset.channelMaskBytes].map(byte).join(",")}`,
    "music_pattern_lo:",
    `    .byte ${asset.patternNames.map((name) => `<music_pattern_${name}`).join(",")}`,
    "music_pattern_hi:",
    `    .byte ${asset.patternNames.map((name) => `>music_pattern_${name}`).join(",")}`,
    "music_sequence:",
    `    .byte ${[...asset.sequenceBytes].map(byte).join(",")}`,
  ];
  asset.patternNames.forEach((name, index) => {
    lines.push(`music_pattern_${name}:`);
    const bytes = asset.patternBytes[index];
    for (let offset = 0; offset < bytes.length; offset += CHANNEL_COUNT) {
      lines.push(`    .byte ${[...bytes.subarray(offset, offset + CHANNEL_COUNT)]
        .map(byte).join(",")}`);
    }
  });
  lines.push(
    "music_data_end:",
    `.assert music_data_end-music_data_start = ${asset.dataBytes}, error, \"menu music data size changed\"`,
    ".endmacro",
    "",
  );
  return lines.join("\n");
}

export function createMenuMusicState() {
  return {
    active: false,
    rowTimer: 0,
    sequenceIndex: 0,
    patternRow: 0,
    channelMask: 0,
    audctl: 0,
    channels: Array.from({ length: CHANNEL_COUNT }, () => ({ frequency: 0, control: 0 })),
  };
}

export function stopMenuMusic(state) {
  state.active = false;
  state.rowTimer = 0;
  state.sequenceIndex = 0;
  state.patternRow = 0;
  state.channelMask = 0;
  state.audctl = 0;
  for (const channel of state.channels) Object.assign(channel, { frequency: 0, control: 0 });
  return state;
}

export function startMenuMusic(state, asset, { soundEnabled = true, channelMask = 0x0f } = {}) {
  stopMenuMusic(state);
  if (!soundEnabled) return state;
  state.active = true;
  state.rowTimer = 1;
  state.channelMask = channelMask & 0x0f;
  return state;
}

export function tickMenuMusic(state, asset) {
  if (!state.active) return false;
  state.rowTimer -= 1;
  if (state.rowTimer > 0) return false;
  state.rowTimer = asset.framesPerRow;

  const patternIndex = asset.sequenceBytes[state.sequenceIndex];
  const rowOffset = state.patternRow * CHANNEL_COUNT;
  const tokens = asset.patternBytes[patternIndex].subarray(rowOffset, rowOffset + CHANNEL_COUNT);
  tokens.forEach((token, channelIndex) => {
    const channel = state.channels[channelIndex];
    if (!(state.channelMask & 1 << channelIndex)) {
      channel.control = 0;
    } else if (token === TOKEN_REST) {
      channel.control = 0;
    } else if (token !== TOKEN_HOLD) {
      channel.frequency = asset.frequencyBytes[token & 0x0f];
      channel.control = asset.controlBytes[token >>> 4];
    }
  });

  state.patternRow += 1;
  if (state.patternRow === asset.rowsPerPattern) {
    state.patternRow = 0;
    state.sequenceIndex += 1;
    if (state.sequenceIndex === asset.sequenceBytes.length) state.sequenceIndex = 0;
  }
  return true;
}
