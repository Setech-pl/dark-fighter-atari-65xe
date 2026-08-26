import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  advancePlayerLifecycle,
  applyPlayerDamage,
  createBroadsideState,
  PLAYER_LIFECYCLE_STATES,
  SHARED_FIGHTER_EXPLOSION_TOTAL,
} from "../scripts/broadside.mjs";
import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
} from "../scripts/capital-hulls.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const labels = new Map(
  fs
    .readFileSync(path.join(rootDirectory, "build", "dark-fighter.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);
const definitionPath = path.join(
  rootDirectory,
  "assets",
  "graphics",
  "capital-hulls.json",
);
const asset = compileCapitalHulls(loadCapitalHullsDefinition(definitionPath));

function block(startLabel, endLabel) {
  const start = source.indexOf(`${startLabel}:`);
  const end = source.indexOf(`${endLabel}:`, start + startLabel.length + 1);
  assert.notEqual(start, -1, `missing ${startLabel}`);
  assert.notEqual(end, -1, `missing ${endLabel}`);
  return source.slice(start, end);
}

function createRuntimeMemory() {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, rootDirectory);
  return memory;
}

function executeGameOverFormatter(memory) {
  let accumulator = 0;
  let x = 0;
  let stackPointer = 0xff;
  let programCounter = labels.get("draw_game_over_scores");
  let carry = false;
  let callDepth = 0;
  let instructions = 0;

  const readByte = () => memory[programCounter++ & 0xffff];
  const readWord = () => readByte() | readByte() << 8;
  const push = (value) => {
    memory[0x100 | stackPointer] = value & 0xff;
    stackPointer = stackPointer - 1 & 0xff;
  };
  const pop = () => {
    stackPointer = stackPointer + 1 & 0xff;
    return memory[0x100 | stackPointer];
  };

  while (instructions++ < 128) {
    const opcodeAddress = programCounter;
    switch (readByte()) {
      case 0x18: // CLC
        carry = false;
        break;
      case 0x20: { // JSR abs
        const returnAddress = programCounter + 1 & 0xffff;
        const target = readWord();
        push(returnAddress >>> 8);
        push(returnAddress);
        callDepth += 1;
        programCounter = target;
        break;
      }
      case 0x29: // AND #imm
        accumulator &= readByte();
        break;
      case 0x48: // PHA
        push(accumulator);
        break;
      case 0x4a: // LSR A
        carry = (accumulator & 1) !== 0;
        accumulator >>>= 1;
        break;
      case 0x60: // RTS
        if (callDepth === 0) return instructions;
        programCounter = (pop() | pop() << 8) + 1 & 0xffff;
        callDepth -= 1;
        break;
      case 0x68: // PLA
        accumulator = pop();
        break;
      case 0x69: { // ADC #imm
        const result = accumulator + readByte() + Number(carry);
        carry = result > 0xff;
        accumulator = result & 0xff;
        break;
      }
      case 0x9d: { // STA abs,X
        const address = readWord();
        memory[address + x & 0xffff] = accumulator;
        break;
      }
      case 0xa2: // LDX #imm
        x = readByte();
        break;
      case 0xa5: // LDA zp
        accumulator = memory[readByte()];
        break;
      case 0xad: // LDA abs
        accumulator = memory[readWord()];
        break;
      case 0xe8: // INX
        x = x + 1 & 0xff;
        break;
      default:
        assert.fail(
          `unsupported opcode $${memory[opcodeAddress].toString(16)} ` +
          `at $${opcodeAddress.toString(16)}`,
        );
    }
  }
  assert.fail("Game Over formatter exceeded its instruction budget");
}

function stepFrontendGate(armed, { stickNeutral, fireReleased }) {
  if (stickNeutral && fireReleased) return { armed: true, dispatched: false };
  if (!armed) return { armed: false, dispatched: false };
  return { armed: false, dispatched: true };
}

test("last-life death enters GAME OVER once after all 24 explosion frames", () => {
  const state = createBroadsideState(asset);
  state.lives = 1;
  state.health = 10;

  assert.equal(applyPlayerDamage(state, asset, 10, 25, 1), true);
  assert.equal(state.lives, 0);
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.DYING);
  assert.equal(state.deathTimer, SHARED_FIGHTER_EXPLOSION_TOTAL);

  const transitions = [];
  for (let frame = 0; frame < SHARED_FIGHTER_EXPLOSION_TOTAL - 1; frame += 1) {
    transitions.push(advancePlayerLifecycle(state, asset));
  }
  assert.deepEqual(transitions, Array(23).fill("dying"));
  assert.equal(advancePlayerLifecycle(state, asset), "game-over");
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.GAME_OVER);
  assert.equal(advancePlayerLifecycle(state, asset), "unchanged");

  const lifecycle = block("update_player_death", "respawn_player");
  assert.match(lifecycle,
    /PLAYER_DYING[\s\S]+dec BROAD_DEATH_TIMER[\s\S]+beq @finished[\s\S]+PLAYER_LIVES[\s\S]+beq @game_over/);
  assert.match(lifecycle,
    /@game_over:[\s\S]+PLAYER_GAME_OVER[\s\S]+sta PLAYER_LIFECYCLE[\s\S]+clear_player_collision_latches[\s\S]+sec/);
});

test("LIFE saturates at zero and dead-state damage cannot consume it again", () => {
  const state = createBroadsideState(asset);
  state.lives = 1;
  state.health = 10;
  assert.equal(applyPlayerDamage(state, asset, 10, 25, 1), true);
  assert.equal(state.lives, 0);
  state.damageCooldown = 0;
  assert.equal(applyPlayerDamage(state, asset, 10, 25, 2), false);
  assert.equal(state.lives, 0);

  const corruptedZeroLife = createBroadsideState(asset);
  corruptedZeroLife.lives = 0;
  corruptedZeroLife.health = 10;
  assert.equal(applyPlayerDamage(corruptedZeroLife, asset, 10, 25, 3), true);
  assert.equal(corruptedZeroLife.lives, 0);

  assert.match(block("apply_player_damage", "update_hud_status"),
    /lda PLAYER_LIVES\s+beq [^\n]+\s+dec PLAYER_LIVES/);
});

test("GAME OVER leaves the gameplay loop before control, combat, spawn, and scoring", () => {
  const mainLoop = block("main_loop", "wait_frame");
  assert.match(mainLoop,
    /jsr update_player_death\s+bcc @lifecycle_ready\s+jsr clear_pmg\s+jsr silence_audio\s+jsr enter_game_over\s+jmp frontend_loop/);
  assert.ok(mainLoop.indexOf("jmp frontend_loop") < mainLoop.indexOf("@lifecycle_ready:"));

  const frontendLoop = block("frontend_loop", "dispatch_frontend_input");
  for (const gameplayRoutine of [
    "read_input",
    "update_enemy",
    "handle_collisions",
    "update_viper_weapon",
    "update_enemy_weapon",
    "update_starfield",
    "handle_player_hull_contact",
    "update_sector_completion",
    "add_archetype_score",
  ]) {
    assert.doesNotMatch(frontendLoop, new RegExp(`jsr ${gameplayRoutine}`));
  }
  assert.match(block("enter_game_over", "enter_frontend_state"),
    /lda #STATE_GAME_OVER\s+bne enter_frontend_state/);
  assert.match(block("enter_frontend_state", "enter_exited_state"),
    /lda #\$00[\s\S]+sta frontend_input_armed[\s\S]+sta DMACTL[\s\S]+sta GRACTL[\s\S]+sta NMIEN/);
});

test("GAME OVER renders final SCORE and TOP from packed BCD without changing them", () => {
  assert.match(source,
    /game_over_screen_data:[\s\S]+"GAME OVER",0[\s\S]+"SCORE 000000",0[\s\S]+"TOP SCORE 000000",0[\s\S]+"FIRE TO CONTINUE",0/);
  assert.match(block("render_frontend_state", "draw_main_menu_scene"),
    /cmp #STATE_GAME_OVER[\s\S]+jmp draw_game_over_scores/);

  const memory = createRuntimeMemory();
  const screen = 0x4000;
  const scoreDigits = screen + 9 * 40 + 20;
  const topDigits = screen + 12 * 40 + 22;
  const frontendZero = 1;
  const scoreLow = labels.get("score_bcd_lo");
  const scoreHigh = labels.get("score_bcd_hi");
  const topLow = 0x4ed7;
  const topHigh = 0x4ed8;

  memory.fill(frontendZero, scoreDigits, scoreDigits + 6);
  memory.fill(frontendZero, topDigits, topDigits + 6);
  memory[scoreHigh] = 0x12;
  memory[scoreLow] = 0x34;
  memory[topHigh] = 0x56;
  memory[topLow] = 0x78;

  const instructions = executeGameOverFormatter(memory);
  assert.deepEqual([...memory.subarray(scoreDigits, scoreDigits + 6)], [1, 1, 2, 3, 4, 5]);
  assert.deepEqual([...memory.subarray(topDigits, topDigits + 6)], [1, 1, 6, 7, 8, 9]);
  assert.deepEqual([memory[scoreHigh], memory[scoreLow]], [0x12, 0x34]);
  assert.deepEqual([memory[topHigh], memory[topLow]], [0x56, 0x78]);
  assert.ok(instructions < 96);
  assert.doesNotMatch(block("draw_game_over_scores", "player_contacts_enemy"),
    /sta (?:score_bcd|TOP_SCORE)/);
});

test("held FIRE cannot skip GAME OVER; release then a fresh press returns to menu", () => {
  assert.match(block("frontend_loop", "dispatch_frontend_input"),
    /cmp #\$0F[\s\S]+lda TRIG0\s+beq @active_input[\s\S]+sta frontend_input_armed[\s\S]+@active_input:[\s\S]+lda frontend_input_armed\s+beq frontend_loop[\s\S]+sta frontend_input_armed[\s\S]+jsr dispatch_frontend_input/);
  assert.match(block("dispatch_frontend_input", "handle_main_menu_input"),
    /cmp #STATE_GAME_OVER\s+beq handle_game_over_input/);
  assert.match(block("handle_game_over_input", "handle_exit_input"),
    /lda TRIG0\s+bne @done\s+jmp enter_main_menu/);

  let gate = { armed: false, dispatched: false };
  gate = stepFrontendGate(gate.armed, { stickNeutral: true, fireReleased: false });
  assert.deepEqual(gate, { armed: false, dispatched: false }, "held death FIRE is ignored");
  gate = stepFrontendGate(gate.armed, { stickNeutral: true, fireReleased: true });
  assert.deepEqual(gate, { armed: true, dispatched: false }, "release arms the screen");
  gate = stepFrontendGate(gate.armed, { stickNeutral: true, fireReleased: false });
  assert.deepEqual(gate, { armed: false, dispatched: true }, "fresh FIRE is dispatched once");
});
