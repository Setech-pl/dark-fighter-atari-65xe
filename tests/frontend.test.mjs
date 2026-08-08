import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  readFrontendGraphicsSource,
  readStartMenuRuntimeState,
} from "../scripts/preview.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const map = fs.readFileSync(path.join(rootDirectory, "build", "dark-fighter.map"), "utf8");
const labels = new Map(
  fs
    .readFileSync(path.join(rootDirectory, "build", "dark-fighter.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

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
  assert.deepEqual(
    frontend.mainMenuRecords.slice(0, 5).map(({ text }) => text),
    ["DARK FIGHTER", "START GAME", "OPTIONS", "TOP SCORES", "EXIT"],
  );
  assert.equal(frontend.defaultSelection, 0);
  assert.equal(frontend.markerAddresses.length, 8);
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
  assert.match(routine("fire_bullet"), /lda sound_enabled\s+beq @done/);
  assert.match(routine("play_hit_sound"), /lda sound_enabled\s+beq @done/);
  assert.match(
    routine("update_sound"),
    /lda sound_enabled[\s\S]+jsr silence_audio\s+jmp @damage/,
    "SOUND OFF must preserve the gameplay damage-flash update",
  );
});

test("TOP SCORES renders exactly ten default rows and returns only on FIRE", () => {
  assert.match(source, /top_score_row_template:[\s\S]+CH_DASH,CH_DASH,CH_DASH/);
  assert.match(routine("draw_top_score_rows"), /cpx #10\s+bne @row/);
  assert.match(routine("draw_top_score_rows"), /cpx #\$09\s+beq @ten/);
  assert.match(routine("handle_top_scores_input"), /lda TRIG0[\s\S]+jmp enter_main_menu/);
  assert.doesNotMatch(source, /jsr SIOV|initials_entry|save_high_scores/i);
});

test("main-menu highlight is exact Kawasaki green and follows selection", () => {
  const defaultState = readStartMenuRuntimeState(source, 0);
  const movedState = readStartMenuRuntimeState(source, 1);
  const { constants, frontendHardwareState } = defaultState.graphics;
  const screenAddress = constants.get("SCREEN");
  const highlight = constants.get("KAWASAKI_GREEN");

  assert.equal(highlight, 0xec);
  assert.equal(frontendHardwareState.get("COLPF3"), highlight);
  assert.equal(defaultState.selection, 0);

  const labelCodes = (state, selection) => {
    const marker = state.graphics.markerAddresses[selection] - screenAddress;
    return [...state.screen.subarray(marker + 2, marker + 12)].filter(Boolean);
  };
  assert.ok(labelCodes(defaultState, 0).every((code) => (code & 0x80) !== 0));
  assert.ok(labelCodes(defaultState, 1).every((code) => (code & 0x80) === 0));
  assert.ok(labelCodes(movedState, 0).every((code) => (code & 0x80) === 0));
  assert.ok(labelCodes(movedState, 1).every((code) => (code & 0x80) !== 0));

  const rowColors = (state, row, column, width) => {
    const colors = new Set();
    const sourceWidth = 320;
    for (let y = row * 8; y < row * 8 + 8; y += 1) {
      for (let x = column * 8; x < (column + width) * 8; x += 1) {
        const color = state.registerPixels[y * sourceWidth + x];
        if (color !== 0) {
          colors.add(color);
        }
      }
    }
    return colors;
  };
  assert.deepEqual(rowColors(defaultState, 9, 15, 10), new Set([0xec]));
  assert.deepEqual(rowColors(defaultState, 11, 16, 7), new Set([0x0e]));
  assert.deepEqual(rowColors(movedState, 9, 15, 10), new Set([0x0e]));
  assert.deepEqual(rowColors(movedState, 11, 16, 7), new Set([0xec]));

  assert.match(routine("handle_main_menu_input"), /jsr toggle_main_menu_highlight[\s\S]+jmp move_selection_up/);
  assert.match(routine("handle_main_menu_input"), /jsr toggle_main_menu_highlight[\s\S]+jmp move_selection_down/);
  assert.match(routine("toggle_main_menu_highlight"), /eor #MAIN_MENU_HIGHLIGHT_XOR/);
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

test("frontend data reuses unused charset bytes without crossing RAM ranges", () => {
  const charsetStart = labels.get("charset_data");
  const frontendStart = labels.get("frontend_charset_data");
  const frontendEnd = labels.get("frontend_charset_data_end");
  assert.ok(Number.isInteger(charsetStart));
  assert.ok(frontendStart >= charsetStart + 59 * 8);
  assert.ok(frontendEnd <= charsetStart + 0x400);

  const rodata = /RODATA\s+([0-9A-F]+)\s+([0-9A-F]+)\s+([0-9A-F]+)/i.exec(map);
  const zeroPage = /ZEROPAGE\s+([0-9A-F]+)\s+([0-9A-F]+)\s+([0-9A-F]+)/i.exec(map);
  assert.ok(rodata);
  assert.ok(zeroPage);
  assert.ok(Number.parseInt(rodata[2], 16) < 0x3b00);
  assert.ok(Number.parseInt(zeroPage[2], 16) < 0x0100);
});
