import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseXex } from "../scripts/formats.mjs";
import {
  readFrontendGraphicsSource,
  readStartMenuRuntimeState,
} from "../scripts/preview.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const xex = fs.readFileSync(path.join(rootDirectory, "dist", "dark-fighter.xex"));
const map = fs.readFileSync(path.join(rootDirectory, "build", "dark-fighter.map"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(rootDirectory, "build", "manifest.json")));
const broadsideRuntime = fs.readFileSync(
  path.join(rootDirectory, "build", "broadside-runtime.bin"),
);
const labels = new Map(
  fs
    .readFileSync(path.join(rootDirectory, "build", "dark-fighter.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

function readXexBytes(address, length) {
  const segment = parseXex(xex).segments.find(
    ({ start, end }) => address >= start && address + length - 1 <= end,
  );
  assert.ok(segment, `XEX does not contain $${address.toString(16)}`);
  return segment.data.subarray(
    address - segment.start,
    address - segment.start + length,
  );
}

function readBroadsideRuntimeBytes(address, length) {
  const offset = address - manifest.broadsideRuntime.runAddress;
  assert.ok(offset >= 0 && offset + length <= broadsideRuntime.length);
  return broadsideRuntime.subarray(offset, offset + length);
}

function routine(label) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${label}:`);
  assert.notEqual(start, -1, `missing routine ${label}`);
  let end = start + 1;
  while (
    end < lines.length &&
    !/^[A-Za-z_][A-Za-z0-9_]*:\s*$/.test(lines[end].replace(/;.*/, "").trim())
  ) {
    end += 1;
  }
  return lines.slice(start + 1, end).join("\n");
}

test("boot enters an explicit seven-state frontend/game state machine", () => {
  assert.match(source, /STATE_LOADER\s*=\s*0/);
  assert.match(source, /STATE_MAIN_MENU\s*=\s*1/);
  assert.match(source, /STATE_OPTIONS\s*=\s*2/);
  assert.match(source, /STATE_TOP_SCORES\s*=\s*3/);
  assert.match(source, /STATE_EXIT_CONFIRM\s*=\s*4/);
  assert.match(source, /STATE_EXITED\s*=\s*5/);
  assert.match(source, /STATE_GAMEPLAY\s*=\s*6/);
  assert.match(source, /jsr show_loader[\s\S]+jsr enter_main_menu\s+jmp frontend_loop/);
});

test("main menu labels are exact, ordered, and default to START GAME", () => {
  const frontend = readFrontendGraphicsSource(source);
  const menuRows = frontend.mainMenuRecords.filter(({ mode }) => mode === 6);
  assert.deepEqual(
    menuRows.map(({ text }) => text),
    ["START GAME", "OPTIONS", "TOP SCORES", "EXIT"],
  );
  const title = frontend.mainMenuRecords.find(({ mode }) => mode === 7);
  assert.deepEqual(
    [title.text, title.column, title.y],
    ["DARK FIGHTER", 4, 0],
  );
  assert.equal(frontend.defaultSelection, 0);
  assert.equal(frontend.markerAddresses.length, 9);
});

test("frontend uses distinct clean 6x7 glyphs within ANTIC 6/7 indices", () => {
  const frontend = readFrontendGraphicsSource(source);
  const { constants, frontendCharset } = frontend;
  const glyph = (character) => {
    const index = constants.get("CH_FRONT_A") + character.charCodeAt(0) - 0x41;
    return [...frontendCharset.subarray(index * 8, index * 8 + 8)];
  };
  for (let index = 1; index <= constants.get("CH_FRONT_MARKER"); index += 1) {
    const rows = frontendCharset.subarray(index * 8, index * 8 + 8);
    assert.equal(rows[7], 0, `glyph ${index} needs a blank eighth row`);
    assert.ok([...rows].every((row) => (row & 0x03) === 0));
  }
  for (const [left, right] of [["E","F"],["O","D"],["R","P"],["I","T"]]) {
    assert.notDeepEqual(glyph(left), glyph(right), `${left}/${right} must remain distinct`);
  }
  assert.ok(constants.get("CH_FRONT_MARKER") < 64);
});

test("UP and DOWN move once per neutral release and wrap at both bounds", () => {
  assert.match(
    routine("frontend_loop"),
    /cmp #\$0F[\s\S]+lda TRIG0[\s\S]+sta frontend_input_armed/,
  );
  assert.match(
    routine("move_selection_up"),
    /lda frontend_selection[\s\S]+bne[\s\S]+stx frontend_selection[\s\S]+dec frontend_selection/,
  );
  assert.match(
    routine("move_selection_down"),
    /cpx frontend_selection[\s\S]+lda #\$00[\s\S]+sta frontend_selection[\s\S]+inc frontend_selection/,
  );
});

test("an idle main menu has no path to gameplay without a gated FIRE event", () => {
  assert.doesNotMatch(routine("frontend_loop"), /start_gameplay|main_loop/);
  assert.match(
    routine("handle_main_menu_input"),
    /lda TRIG0\s+bne @done[\s\S]+lda frontend_selection\s+bne[\s\S]+jmp start_gameplay/,
  );
  assert.doesNotMatch(routine("render_frontend_state"), /start_gameplay|main_loop/);
});

test("frontend text records explicitly test the byte returned by the reader", () => {
  assert.match(
    routine("render_frontend_data"),
    /@text:\s+jsr read_frontend_data\s+cmp #\$00\s+beq @record/,
    "pointer advancement changes CPU flags, so the terminator needs its own comparison",
  );
});

test("FIRE is release-gated across screens and into gameplay", () => {
  assert.match(routine("enter_frontend_state"), /sta frontend_input_armed/);
  assert.match(routine("start_gameplay"), /sta gameplay_fire_gate/);
  assert.match(
    routine("read_input"),
    /lda gameplay_fire_gate[\s\S]+lda TRIG0[\s\S]+beq @done[\s\S]+sta gameplay_fire_gate/,
  );
});

test("menu actions use explicit transitions and one gameplay reset path", () => {
  const mainInput = routine("handle_main_menu_input");
  assert.match(mainInput, /jmp start_gameplay/);
  assert.match(mainInput, /jmp enter_options/);
  assert.match(mainInput, /jmp enter_top_scores/);
  assert.match(mainInput, /jmp enter_exit_confirmation/);

  const startGameplay = routine("start_gameplay");
  for (const resetCall of [
    "silence_audio",
    "clear_pmg",
    "clear_screen",
    "init_state",
    "init_screen",
    "draw_player",
    "draw_enemy",
    "update_score_display",
  ]) {
    assert.match(startGameplay, new RegExp(`jsr ${resetCall}`));
  }
  assert.doesNotMatch(routine("frontend_loop"), /update_enemy|handle_collisions|update_sound/);
});

test("SOUND defaults ON, toggles in RAM, and OFF silences all POKEY channels", () => {
  assert.match(source, /lda #\$01\s+sta sound_enabled\s+; options default: SOUND ON/);
  assert.match(routine("toggle_sound"), /eor #\$01\s+sta sound_enabled/);
  assert.match(routine("toggle_sound"), /jsr silence_audio/);
  const silence = routine("silence_audio");
  for (const register of ["AUDC1", "AUDC2", "AUDC3", "AUDC4", "AUDCTL"]) {
    assert.match(silence, new RegExp(`sta ${register}`));
  }
  assert.match(routine("allocate_viper_projectile"), /lda sound_enabled\s+beq @accepted/);
  assert.match(routine("play_hit_sound"), /lda sound_enabled\s+beq @done/);
  assert.match(
    routine("update_sound"),
    /lda sound_enabled[\s\S]+jsr silence_audio\s+jmp @damage/,
    "SOUND OFF must preserve the gameplay damage-flash update",
  );
});

test("OPTIONS persists a MEDIUM-default difficulty and wraps LEFT/RIGHT", () => {
  const constants = readFrontendGraphicsSource(source).constants;
  const difficultyAddress = constants.get("DIFFICULTY_SETTING");
  assert.equal(difficultyAddress, 0x4e70);
  assert.deepEqual(
    [constants.get("DIFFICULTY_EASY"), constants.get("DIFFICULTY_MEDIUM"),
      constants.get("DIFFICULTY_HARD"), constants.get("DIFFICULTY_DEFAULT")],
    [0, 1, 2, 1],
  );
  assert.match(source, /options_screen_data:[\s\S]+"SOUND: OFF"[\s\S]+"DIFFICULTY: MEDIUM"[\s\S]+"BACK"/);
  assert.match(routine("handle_options_input"), /jmp handle_options_input_resident/);
  assert.match(routine("handle_options_input_resident"),
    /ldx #\$02[\s\S]+beq @sound_row[\s\S]+beq @difficulty_row[\s\S]+jmp enter_main_menu/);
  assert.match(routine("handle_options_input_resident"),
    /and #\$04[\s\S]+select_previous_difficulty[\s\S]+and #\$08[\s\S]+select_next_difficulty/);
  assert.match(routine("select_previous_difficulty"),
    /lda DIFFICULTY_SETTING[\s\S]+lda #DIFFICULTY_HARD[\s\S]+sbc #\$01/);
  assert.match(routine("select_next_difficulty"),
    /cmp #DIFFICULTY_HARD[\s\S]+lda #DIFFICULTY_EASY[\s\S]+adc #\$01/);
  assert.match(routine("set_difficulty"), /sta DIFFICULTY_SETTING[\s\S]+jmp draw_difficulty_value/);
  assert.match(routine("render_frontend_state"),
    /jsr draw_sound_value[\s\S]+jsr draw_difficulty_value[\s\S]+jmp update_frontend_marker/);

  const startBytes = readXexBytes(labels.get("start"), 160);
  assert.notEqual(startBytes.indexOf(Buffer.from([
    0xa9, 0x01, 0x8d, difficultyAddress & 0xff, difficultyAddress >> 8,
  ])), -1, "boot must store MEDIUM in persistent RAM");
  const setBytes = readBroadsideRuntimeBytes(labels.get("set_difficulty"), 6);
  assert.deepEqual([...setBytes.subarray(0, 3)], [
    0x8d, difficultyAddress & 0xff, difficultyAddress >> 8,
  ]);
  assert.doesNotMatch(routine("enter_frontend_state"), /DIFFICULTY_SETTING/);
  assert.doesNotMatch(routine("init_state"), /DIFFICULTY_SETTING/);
});

test("TOP SCORES renders exactly ten default rows and returns only on FIRE", () => {
  assert.match(
    source,
    /top_score_row_template:[\s\S]+CH_FRONT_DASH,CH_FRONT_DASH,CH_FRONT_DASH/,
  );
  assert.match(routine("draw_top_score_rows"), /cpx #10\s+bne @row/);
  assert.match(routine("draw_top_score_rows"), /cpx #\$09\s+beq @ten/);
  assert.match(routine("handle_top_scores_input"), /lda TRIG0[\s\S]+jmp enter_main_menu/);
  assert.doesNotMatch(source, /jsr SIOV|initials_entry|save_high_scores/i);
});

test("ANTIC 6 attributes route the selected marker and full label to $D8", () => {
  const defaultState = readStartMenuRuntimeState(source, 0);
  const movedState = readStartMenuRuntimeState(source, 1);
  const { constants, mainMenuHardwareState } = defaultState.graphics;
  const screenAddress = constants.get("SCREEN");
  const highlight = constants.get("KAWASAKI_GREEN");

  assert.equal(highlight, 0xd8);
  assert.equal(mainMenuHardwareState.get("COLPF3"), highlight);
  assert.equal(defaultState.selection, 0);

  const labelCodes = (state, selection) => {
    const marker = state.graphics.markerAddresses[selection] - screenAddress;
    return [...state.screen.subarray(marker + 2, marker + 12)].filter(Boolean);
  };
  assert.ok(labelCodes(defaultState, 0).every((code) => (code & 0xc0) === 0xc0));
  assert.ok(labelCodes(defaultState, 1).every((code) => (code & 0xc0) === 0x00));
  assert.ok(labelCodes(movedState, 0).every((code) => (code & 0xc0) === 0x00));
  assert.ok(labelCodes(movedState, 1).every((code) => (code & 0xc0) === 0xc0));

  const recordColors = (state, record) => {
    const colors = new Set();
    const sourceWidth = 320;
    const cellWidth = record.mode === 6 || record.mode === 7 ? 16 : 8;
    const height = record.mode === 7 ? 16 : 8;
    for (let y = record.y; y < record.y + height; y += 1) {
      for (
        let x = record.column * cellWidth;
        x < (record.column + record.text.length) * cellWidth;
        x += 1
      ) {
        const color = state.registerPixels[y * sourceWidth + x];
        colors.add(color);
      }
    }
    return colors;
  };
  const menuRecords = defaultState.graphics.mainMenuRecords.filter(
    ({ mode }) => mode === 6,
  );
  assert.deepEqual(recordColors(defaultState, menuRecords[0]), new Set([0x00, 0xd8]));
  assert.deepEqual(recordColors(defaultState, menuRecords[1]), new Set([0x00, 0x0e]));
  assert.deepEqual(recordColors(movedState, menuRecords[0]), new Set([0x00, 0x0e]));
  assert.deepEqual(recordColors(movedState, menuRecords[1]), new Set([0x00, 0xd8]));

  const defaultMarker = defaultState.graphics.markerAddresses[0] - screenAddress;
  assert.equal(
    defaultState.screen[defaultMarker],
    constants.get("CH_FRONT_MARKER") | constants.get("ANTIC67_COLOR_PF3"),
  );
  assert.equal(defaultState.screen[defaultMarker] & 0xc0, 0xc0);

  const selectedRecord = menuRecords[0];
  let blackPixels = 0;
  for (let y = selectedRecord.y; y < selectedRecord.y + 8; y += 1) {
    for (let x = selectedRecord.column * 16; x < 19 * 16; x += 1) {
      blackPixels += defaultState.registerPixels[y * 320 + x] === 0 ? 1 : 0;
    }
  }
  assert.ok(blackPixels > 0, "selected ANTIC 6 row must retain black glyph backgrounds");

  const updateBytes = readXexBytes(labels.get("update_frontend_marker"), 96);
  const toggleBytes = readXexBytes(labels.get("toggle_main_menu_highlight"), 32);
  assert.notEqual(updateBytes.indexOf(Buffer.from([0x09, 0xc0])), -1);
  assert.notEqual(toggleBytes.indexOf(Buffer.from([0x49, 0xc0])), -1);

  assert.match(routine("handle_main_menu_input"), /jsr toggle_main_menu_highlight[\s\S]+jmp move_selection_up/);
  assert.match(routine("handle_main_menu_input"), /jsr toggle_main_menu_highlight[\s\S]+jmp move_selection_down/);
  assert.match(routine("toggle_main_menu_highlight"), /eor #MAIN_MENU_HIGHLIGHT_XOR/);
});

test("main-menu studio credit is removed while loader studio source remains", () => {
  const frontend = readFrontendGraphicsSource(source);
  assert.equal(
    frontend.mainMenuRecords.some(({ text }) => text.includes("SETECH")),
    false,
  );
  const loader = JSON.parse(
    fs.readFileSync(
      path.join(rootDirectory, "assets", "graphics", "loader-bitmap.json"),
      "utf8",
    ),
  );
  assert.ok(
    loader.elements.some(
      ({ name, text }) => name === "studio" && text === "SETECH GAME STUDIO",
    ),
  );
});

test("EXIT defaults to NO and reaches a stable, silent reset-only state", () => {
  assert.match(routine("enter_exit_confirmation"), /lda #STATE_EXIT_CONFIRM/);
  assert.equal(
    readFrontendGraphicsSource(source).defaultSelection,
    0,
  );
  const exited = routine("enter_exited_state");
  assert.match(exited, /jsr silence_audio/);
  assert.match(exited, /@wait:\s+jsr wait_frame\s+jmp @wait/);
  assert.match(source, /\.byte "DARK FIGHTER ENDED",0/);
  assert.match(source, /\.byte "PRESS RESET TO RESTART",0/);
  assert.doesNotMatch(exited, /DOSVEC|SIOV/);
  assert.doesNotMatch(source, /jmp \(DOSVEC\)|jsr SIOV/);
});

test("frontend charset and transient loader tail stay in their bounded ranges", () => {
  const charsetStart = labels.get("charset_data");
  const hullGlyphStart = labels.get("capital_hull_glyphs");
  const frontendStart = labels.get("frontend_glyph_source");
  const frontendEnd = labels.get("frontend_glyph_rows_end");
  const charsetEnd = labels.get("charset_data_end");
  assert.ok(Number.isInteger(charsetStart));
  assert.equal(hullGlyphStart, charsetStart + 59 * 8);
  assert.ok(frontendStart > hullGlyphStart);
  assert.ok(frontendEnd <= charsetEnd);
  assert.equal(charsetEnd, charsetStart + 0x400);

  const rodata = /RODATA\s+([0-9A-F]+)\s+([0-9A-F]+)\s+([0-9A-F]+)/i.exec(map);
  const zeroPage = /ZEROPAGE\s+([0-9A-F]+)\s+([0-9A-F]+)\s+([0-9A-F]+)/i.exec(map);
  assert.ok(rodata);
  assert.ok(zeroPage);
  assert.ok(Number.parseInt(rodata[2], 16) < 0x4000);
  assert.ok(Number.parseInt(zeroPage[2], 16) < 0x0100);
  assert.ok(labels.get("draw_main_menu_hangar") < charsetStart);
  assert.ok(labels.get("frontend_glyph_rows") >= frontendStart);
  assert.ok(labels.get("main_menu_display_list") < labels.get("loader_bitmap_lzss"));
  assert.ok(labels.get("loader_bitmap_lzss") < labels.get("loader_display_list"));
  assert.ok(labels.get("loader_display_list") < 0x4000);

  const constants = readFrontendGraphicsSource(source).constants;
  assert.equal(constants.get("SCREEN"), 0x4000);
  assert.equal(constants.get("CHARSET"), 0x4400);
  assert.equal(constants.get("FRONTEND_CHARSET"), 0x4800);
  assert.equal(constants.get("FRONTEND_CHARSET") - constants.get("CHARSET"), 0x400);
  assert.equal(constants.get("CAPITAL_HULL_RUNTIME_ALLIED"), 0x4c00);
  assert.equal(constants.get("CAPITAL_HULL_RUNTIME_ENEMY"), 0x4d20);
  assert.equal(constants.get("CAPITAL_HULL_RUNTIME_END"), 0x4e40);
  assert.match(source, /jsr show_loader[\s\S]+jsr clear_pmg[\s\S]+jsr copy_frontend_charset/);
});

test("mixed display list, screen offsets, title, menu, and hint are bounded", () => {
  const state = readStartMenuRuntimeState(source);
  const { constants, mainMenuLayout } = state.graphics;
  assert.equal(mainMenuLayout.screenBytes, constants.get("MAIN_MENU_SCREEN_BYTES"));
  assert.equal(mainMenuLayout.screenBytes, 820);
  assert.equal(
    mainMenuLayout.rows.reduce((height, row) => height + row.height, 0),
    192,
  );
  assert.deepEqual(
    mainMenuLayout.rows.map(({ mode }) => mode),
    [7,4,4,4,6,4,6,4,6,4,6,4,4,4,4,4,4,4,4,4,4,2,4],
  );
  assert.deepEqual(
    mainMenuLayout.rows.filter(({ dli }) => dli).map(({ index }) => index),
    [20],
  );

  const title = state.graphics.mainMenuRecords.find(({ text }) => text === "DARK FIGHTER");
  assert.deepEqual([title.mode, title.column, title.text.length], [7, 4, 12]);
  const menuRecords = state.graphics.mainMenuRecords.filter(({ mode }) => mode === 6);
  assert.equal(menuRecords.length, 4);
  for (const record of menuRecords) {
    assert.equal(record.column, 9);
    assert.ok(record.column + record.text.length <= 20);
  }
  const hint = state.graphics.mainMenuRecords.find(({ mode }) => mode === 2);
  assert.deepEqual(
    [hint.text, hint.column, hint.text.length],
    ["UP/DOWN MOVE  FIRE SELECT", 7, 25],
  );
  const visibleColors = (record, cellWidth, height) => {
    const colors = new Set();
    for (let y = record.y; y < record.y + height; y += 1) {
      for (
        let x = record.column * cellWidth;
        x < (record.column + record.text.length) * cellWidth;
        x += 1
      ) {
        colors.add(state.registerPixels[y * 320 + x]);
      }
    }
    return colors;
  };
  assert.deepEqual(visibleColors(title, 16, 16), new Set([0x00, 0x0e]));
  assert.deepEqual(visibleColors(hint, 8, 8), new Set([0x00, 0x0e]));

  for (const layer of ["OUTER", "MID", "INNER", "BAY"]) {
    assert.ok(constants.get(`MAIN_MENU_HANGAR_${layer}_LAST`) < 21);
    for (const edge of ["TOP", "BOTTOM"]) {
      const screenOffset = constants.get(`MAIN_MENU_HANGAR_${layer}_${edge}_OFFSET`);
      const row = mainMenuLayout.rows.find((candidate) => candidate.screenOffset === screenOffset);
      assert.equal(row.mode, 4);
    }
  }
  for (let index = 0; index < 7; index += 1) {
    const offset = constants.get(`MAIN_MENU_STAR_${index}`);
    const row = mainMenuLayout.rows.find(
      (candidate) => offset >= candidate.screenOffset &&
        offset < candidate.screenOffset + candidate.columns,
    );
    assert.equal(row.mode, 4);
  }

  const assembledDisplayList = readXexBytes(
    labels.get("main_menu_display_list"),
    state.graphics.mainMenuDisplayList.length,
  );
  assert.deepEqual(assembledDisplayList, Buffer.from(state.graphics.mainMenuDisplayList));

  const textDisplayList = readXexBytes(labels.get("frontend_text_display_list"), 32);
  assert.equal(textDisplayList[3] & 0x0f, 2);
  assert.ok([...textDisplayList.subarray(6, 29)].every((opcode) => opcode === 2));

  const hintDli = readXexBytes(labels.get("frontend_hint_dli"), 32);
  assert.notEqual(
    hintDli.indexOf(Buffer.from([
      0xa9,0x0e,0x8d,0x17,0xd0,
      0xa9,0x00,0x8d,0x18,0xd0,
    ])),
    -1,
  );
});

test("menu PMG craft is bounded, main-menu-only, and gameplay setup is restored", () => {
  const state = readStartMenuRuntimeState(source);
  const { constants, mainMenuHardwareState, hardwareState } = state.graphics;
  const left = (mainMenuHardwareState.get("HPOSP0") - 48) * 2;
  const width = 8 * 8;
  const top = constants.get("MAIN_MENU_PLAYER_Y") - 32;
  const height = 16 * constants.get("MAIN_MENU_PLAYER_VERTICAL_SCALE");
  const markerLeft = 7 * 16;
  assert.ok(left >= 0 && left + width <= markerLeft);
  assert.ok(top >= 48 && top + height <= 136);
  assert.equal(mainMenuHardwareState.get("SIZEP0"), 3);
  assert.equal(mainMenuHardwareState.get("SIZEP3"), 3);
  assert.equal(constants.get("MAIN_MENU_PLAYER_VERTICAL_SCALE"), 2);
  assert.match(
    routine("draw_main_menu_scene"),
    /sta PLAYER3\+1,y[\s\S]+iny\s+iny\s+inx/,
  );

  const frontendEntry = routine("enter_frontend_state");
  assert.match(frontendEntry, /sta GRACTL[\s\S]+sta NMIEN[\s\S]+jsr select_frontend_display/);
  assert.match(frontendEntry, /cpx #STATE_MAIN_MENU[\s\S]+lda #\$02[\s\S]+sta GRACTL[\s\S]+sta NMIEN/);
  assert.equal(hardwareState.get("SIZEP0"), 1);
  assert.equal(hardwareState.get("SIZEP3"), 1);
  assert.equal(hardwareState.get("COLPF2"), 0x1e);
  assert.equal(hardwareState.get("COLPF3"), 0x46);
  assert.match(routine("start_gameplay"), /jsr clear_pmg/);
  assert.match(
    routine("start_gameplay"),
    /sta NMIEN[\s\S]+lda #<display_list[\s\S]+sta DLISTL[\s\S]+lda #<gameplay_dli[\s\S]+lda #>HUD_CHARSET[\s\S]+sta CHBASE/,
  );
  assert.match(
    routine("gameplay_dli"),
    /lda #>CHARSET[\s\S]+sta CHBASE[\s\S]+lda #>HUD_CHARSET[\s\S]+sta CHBASE/,
  );
  assert.match(
    routine("select_frontend_display"),
    /cmp #STATE_MAIN_MENU[\s\S]+main_menu_display_list[\s\S]+frontend_text_display_list/,
  );
});
