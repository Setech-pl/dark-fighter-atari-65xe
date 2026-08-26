import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "dark-fighter.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

const addresses = {
  screen: 0x4000,
  scoreLow: labels.get("score_bcd_lo"),
  scoreHigh: labels.get("score_bcd_hi"),
  topLow: 0x4ed7,
  topHigh: 0x4ed8,
  playerLifecycle: 0x4eaa,
  playerLives: 0x4eab,
  playerHealth: 0x4e5d,
  damageCooldown: 0x4e5e,
  deathTimer: 0x4e5f,
  damageApplied: 0x4e65,
  enemyArchetype: 0x4ecb,
  enemyScores: labels.get("enemy_scores"),
  addScore: labels.get("add_archetype_score"),
  applyPlayerDamage: labels.get("apply_player_damage"),
  updatePlayerDeath: labels.get("update_player_death"),
  initState: labels.get("init_state"),
  drawTop: labels.get("draw_session_top_score"),
};

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

function createRuntimeMemory() {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  return memory;
}

// Focused NMOS 6502 runner for the assembled score and lifecycle paths. It
// executes linked routines, decimal ADC, and selected bounded external calls.
function executeScoreRoutine(memory, startAddress, {
  initialAccumulator = 0,
  externalCalls = new Set(),
} = {}) {
  let accumulator = initialAccumulator;
  let x = 0;
  let stackPointer = 0xff;
  let programCounter = startAddress;
  let carry = false;
  let zero = false;
  let decimal = false;
  let callDepth = 0;
  let instructions = 0;

  const readByte = () => memory[programCounter++ & 0xffff];
  const readWord = () => {
    const low = readByte();
    return low | readByte() << 8;
  };
  const setAccumulator = (value) => {
    accumulator = value & 0xff;
    zero = accumulator === 0;
  };
  const push = (value) => {
    memory[0x100 | stackPointer] = value & 0xff;
    stackPointer = stackPointer - 1 & 0xff;
  };
  const pop = () => {
    stackPointer = stackPointer + 1 & 0xff;
    return memory[0x100 | stackPointer];
  };
  const branch = (condition) => {
    const encoded = readByte();
    if (!condition) return;
    const offset = encoded < 0x80 ? encoded : encoded - 0x100;
    programCounter = programCounter + offset & 0xffff;
  };
  const add = (operand) => {
    const carryIn = Number(carry);
    if (!decimal) {
      const result = accumulator + operand + carryIn;
      carry = result > 0xff;
      setAccumulator(result);
      return;
    }
    let lowDigit = (accumulator & 0x0f) + (operand & 0x0f) + carryIn;
    let highDigit = (accumulator >>> 4) + (operand >>> 4);
    if (lowDigit >= 10) {
      lowDigit -= 10;
      highDigit += 1;
    }
    carry = highDigit >= 10;
    if (carry) highDigit -= 10;
    setAccumulator(highDigit << 4 | lowDigit);
  };
  const compare = (operand) => {
    carry = accumulator >= operand;
    zero = accumulator === operand;
  };

  while (instructions++ < 512) {
    const opcodeAddress = programCounter;
    switch (readByte()) {
      case 0x05: // ORA zp
        setAccumulator(accumulator | memory[readByte()]);
        break;
      case 0x09: // ORA #imm
        setAccumulator(accumulator | readByte());
        break;
      case 0x18: // CLC
        carry = false;
        break;
      case 0x20: { // JSR abs
        const target = readWord();
        if (externalCalls.has(target)) break;
        const returnAddress = programCounter - 1 & 0xffff;
        push(returnAddress >>> 8);
        push(returnAddress);
        callDepth += 1;
        programCounter = target;
        break;
      }
      case 0x29: // AND #imm
        setAccumulator(accumulator & readByte());
        break;
      case 0x48: // PHA
        push(accumulator);
        break;
      case 0x4a: // LSR A
        carry = (accumulator & 1) !== 0;
        setAccumulator(accumulator >>> 1);
        break;
      case 0x38: // SEC
        carry = true;
        break;
      case 0x4c: { // JMP abs
        const target = readWord();
        if (externalCalls.has(target)) return instructions;
        programCounter = target;
        break;
      }
      case 0x60: // RTS
        if (callDepth === 0) return instructions;
        programCounter = (pop() | pop() << 8) + 1 & 0xffff;
        callDepth -= 1;
        break;
      case 0x68: // PLA
        setAccumulator(pop());
        break;
      case 0x69: // ADC #imm
        add(readByte());
        break;
      case 0x7d: { // ADC abs,X
        const address = readWord();
        add(memory[address + x & 0xffff]);
        break;
      }
      case 0x85: // STA zp
        memory[readByte()] = accumulator;
        break;
      case 0x8d: // STA abs
        memory[readWord()] = accumulator;
        break;
      case 0x90: // BCC rel
        branch(!carry);
        break;
      case 0x9d: { // STA abs,X
        const address = readWord();
        memory[address + x & 0xffff] = accumulator;
        break;
      }
      case 0xa2: // LDX #imm
        x = readByte();
        zero = x === 0;
        break;
      case 0xa5: // LDA zp
        setAccumulator(memory[readByte()]);
        break;
      case 0xa9: // LDA #imm
        setAccumulator(readByte());
        break;
      case 0xad: // LDA abs
        setAccumulator(memory[readWord()]);
        break;
      case 0xae: // LDX abs
        x = memory[readWord()];
        zero = x === 0;
        break;
      case 0xb0: // BCS rel
        branch(carry);
        break;
      case 0xbd: { // LDA abs,X
        const address = readWord();
        setAccumulator(memory[address + x & 0xffff]);
        break;
      }
      case 0xc9: // CMP #imm
        compare(readByte());
        break;
      case 0xcd: // CMP abs
        compare(memory[readWord()]);
        break;
      case 0xce: { // DEC abs
        const address = readWord();
        memory[address] = memory[address] - 1 & 0xff;
        zero = memory[address] === 0;
        break;
      }
      case 0xd0: // BNE rel
        branch(!zero);
        break;
      case 0xd8: // CLD
        decimal = false;
        break;
      case 0xe8: // INX
        x = x + 1 & 0xff;
        zero = x === 0;
        break;
      case 0xed: { // SBC abs
        const difference = accumulator - memory[readWord()] - Number(!carry);
        carry = difference >= 0;
        setAccumulator(difference);
        break;
      }
      case 0xf0: // BEQ rel
        branch(zero);
        break;
      case 0xf8: // SED
        decimal = true;
        break;
      default:
        assert.fail(
          `unsupported opcode $${memory[opcodeAddress].toString(16)} ` +
          `at $${opcodeAddress.toString(16)}`,
        );
    }
  }
  assert.fail("assembled score routine exceeded its bounded instruction budget");
}

function awardOnePoint({ scoreLow, scoreHigh, topLow, topHigh }) {
  const memory = createRuntimeMemory();
  memory[addresses.enemyArchetype] = 0;
  memory[addresses.enemyScores] = 0x01;
  memory[addresses.scoreLow] = scoreLow;
  memory[addresses.scoreHigh] = scoreHigh;
  memory[addresses.topLow] = topLow;
  memory[addresses.topHigh] = topHigh;
  const instructions = executeScoreRoutine(memory, addresses.addScore);
  return { memory, instructions };
}

test("all score writes use one BCD award path while source ownership stays unchanged", () => {
  assert.ok(Object.values(addresses).every(Number.isInteger));
  assert.match(source,
    /TOP_SCORE_BCD_LO\s*=\s*STARFIELD_STATE_END[\s\S]+TOP_SCORE_BCD_HI\s*=\s*TOP_SCORE_BCD_LO\+\$01/);
  assert.match(routine("add_archetype_score"),
    /adc enemy_scores,x[\s\S]+sta score_bcd_hi[\s\S]+jsr update_top_score[\s\S]+jmp update_score_display/);
  assert.match(routine("resolve_enemy_damage"),
    /cmp #\(DAMAGE_CAPITAL_CYLON\+1\)\s+bcs @no_score\s+pha\s+jsr add_archetype_score\s+pla\s+cmp #DAMAGE_PLAYER_PROJECTILE\s+bne @no_score\s+lda ENTITY_STATE\+WEAPON_PICKUP_SLOT\s+bne @no_score\s+jsr weapon_pickup_record_qualified_kill/);
  assert.match(routine("init_state"), /sta score_bcd_lo\s+sta score_bcd_hi/);
  assert.doesNotMatch(routine("init_state"), /TOP_SCORE/);
  assert.match(routine("finish_startup_after_loader"),
    /sta TOP_SCORE_BCD_LO\s+sta TOP_SCORE_BCD_HI/);
  assert.equal((source.match(/sta score_bcd_lo/g) ?? []).length, 2);
  assert.equal((source.match(/sta score_bcd_hi/g) ?? []).length, 2);
});

test("assembled decimal score code carries 9 to 10 and 99 to 100", () => {
  const cases = [
    {
      name: "0009 + 1",
      input: { scoreLow: 0x09, scoreHigh: 0x00, topLow: 0x08, topHigh: 0x00 },
      score: [0x10, 0x00],
      top: [0x10, 0x00],
      hud: [16, 16, 16, 17, 16],
    },
    {
      name: "0099 + 1",
      input: { scoreLow: 0x99, scoreHigh: 0x00, topLow: 0x99, topHigh: 0x00 },
      score: [0x00, 0x01],
      top: [0x00, 0x01],
      hud: [16, 16, 17, 16, 16],
    },
    {
      name: "0199 + 1 exceeds TOP 0199",
      input: { scoreLow: 0x99, scoreHigh: 0x01, topLow: 0x99, topHigh: 0x01 },
      score: [0x00, 0x02],
      top: [0x00, 0x02],
      hud: [16, 16, 18, 16, 16],
    },
  ];

  for (const expected of cases) {
    const { memory, instructions } = awardOnePoint(expected.input);
    assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]],
      expected.score, `${expected.name} score`);
    assert.deepEqual([memory[addresses.topLow], memory[addresses.topHigh]],
      expected.top, `${expected.name} TOP`);
    assert.deepEqual([...memory.subarray(addresses.screen + 6, addresses.screen + 11)],
      expected.hud, `${expected.name} HUD screen codes`);
    assert.ok(instructions < 128, `${expected.name} remains bounded`);
  }
});

test("assembled TOP=max(TOP,SCORE) never lowers an existing session record", () => {
  const { memory } = awardOnePoint({
    scoreLow: 0x99,
    scoreHigh: 0x00,
    topLow: 0x00,
    topHigh: 0x02,
  });
  assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]], [0x00, 0x01]);
  assert.deepEqual([memory[addresses.topLow], memory[addresses.topHigh]], [0x00, 0x02]);

  const actualAward = createRuntimeMemory();
  assert.equal(actualAward[addresses.enemyScores], 0x10,
    "the release Raider keeps its descriptor-owned ten-point award");
  actualAward[addresses.enemyArchetype] = 0;
  actualAward[addresses.scoreLow] = 0;
  actualAward[addresses.scoreHigh] = 0;
  actualAward[addresses.topLow] = 0;
  actualAward[addresses.topHigh] = 0;
  executeScoreRoutine(actualAward, addresses.addScore);
  assert.deepEqual([actualAward[addresses.scoreLow], actualAward[addresses.scoreHigh]],
    [0x10, 0x00]);
  assert.deepEqual([actualAward[addresses.topLow], actualAward[addresses.topHigh]],
    [0x10, 0x00]);
});

test("assembled death and respawn preserve whole-game SCORE before the next award", () => {
  const memory = createRuntimeMemory();
  const externalCalls = new Set([
    "play_hit_sound",
    "erase_bullet",
    "clear_raider_pulses",
    "begin_player_fighter_explosion",
    "update_hud_status",
    "erase_player",
    "clear_fighter_projectiles",
    "clear_player_collision_latches",
    "clear_transient_effects",
    "draw_player",
  ].map((label) => labels.get(label)));

  memory[addresses.scoreLow] = 0x23;
  memory[addresses.scoreHigh] = 0x01;
  memory[addresses.topLow] = 0x23;
  memory[addresses.topHigh] = 0x01;
  memory[addresses.playerLifecycle] = 0;
  memory[addresses.playerLives] = 3;
  memory[addresses.playerHealth] = 1;
  memory[addresses.damageCooldown] = 0;
  memory[addresses.damageApplied] = 0;

  executeScoreRoutine(memory, addresses.applyPlayerDamage, {
    initialAccumulator: 1,
    externalCalls,
  });
  assert.equal(memory[addresses.playerLifecycle], 1, "lethal damage enters DYING");
  assert.equal(memory[addresses.playerLives], 2, "lethal damage consumes exactly one life");
  assert.equal(memory[addresses.deathTimer], 24, "the full explosion lifecycle is retained");
  assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]], [0x23, 0x01]);
  assert.deepEqual([memory[addresses.topLow], memory[addresses.topHigh]], [0x23, 0x01]);

  for (let frame = 0; frame < 24; frame += 1) {
    executeScoreRoutine(memory, addresses.updatePlayerDeath, { externalCalls });
  }
  assert.equal(memory[addresses.playerLifecycle], 2,
    "the completed explosion enters RESPAWN_INVULNERABLE");
  assert.equal(memory[addresses.playerLives], 2);
  assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]], [0x23, 0x01]);
  assert.deepEqual([memory[addresses.topLow], memory[addresses.topHigh]], [0x23, 0x01]);

  memory[addresses.enemyArchetype] = 0;
  assert.equal(memory[addresses.enemyScores], 0x10);
  executeScoreRoutine(memory, addresses.addScore);
  assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]], [0x33, 0x01]);
  assert.deepEqual([memory[addresses.topLow], memory[addresses.topHigh]], [0x33, 0x01]);

  const newGameCalls = new Set([
    "init_fighter_projectiles",
    "init_starfield_state",
    "reset_enemy_fire_cooldown",
  ].map((label) => labels.get(label)));
  executeScoreRoutine(memory, addresses.initState, { externalCalls: newGameCalls });
  assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]], [0, 0]);
  assert.deepEqual([memory[addresses.topLow], memory[addresses.topHigh]], [0x33, 0x01]);

  assert.doesNotMatch(routine("respawn_player"), /score_bcd|TOP_SCORE|init_state/);
  assert.doesNotMatch(routine("update_player_death"), /score_bcd|TOP_SCORE|init_state/);
  assert.doesNotMatch(routine("main_loop"), /reset_score_after_player_death/);
  assert.match(routine("start_gameplay"), /jsr init_state/);
});

test("assembled Game Over transition preserves the final SCORE and TOP", () => {
  const memory = createRuntimeMemory();
  memory[addresses.playerLifecycle] = 1;
  memory[addresses.playerLives] = 0;
  memory[addresses.deathTimer] = 1;
  memory[addresses.scoreLow] = 0x23;
  memory[addresses.scoreHigh] = 0x01;
  memory[addresses.topLow] = 0x23;
  memory[addresses.topHigh] = 0x01;
  executeScoreRoutine(memory, addresses.updatePlayerDeath, {
    externalCalls: new Set([labels.get("clear_player_collision_latches")]),
  });
  assert.equal(memory[addresses.playerLifecycle], 3);
  assert.deepEqual([memory[addresses.scoreLow], memory[addresses.scoreHigh]], [0x23, 0x01]);
  assert.deepEqual([memory[addresses.topLow], memory[addresses.topHigh]], [0x23, 0x01]);
});

test("assembled TOP formatter writes the current session record on screen entry", () => {
  const memory = createRuntimeMemory();
  memory[addresses.topLow] = 0x00;
  memory[addresses.topHigh] = 0x01;
  memory.fill(1, addresses.screen + 5 * 40 + 21, addresses.screen + 5 * 40 + 27);
  executeScoreRoutine(memory, addresses.drawTop);
  assert.deepEqual(
    [...memory.subarray(addresses.screen + 5 * 40 + 21, addresses.screen + 5 * 40 + 27)],
    [1, 1, 1, 2, 1, 1],
    "packed BCD 0100 must render as six frontend screen codes for 000100",
  );
  assert.match(routine("render_frontend_state"),
    /cmp #STATE_TOP_SCORES[\s\S]+jmp draw_top_score_rows/);
  assert.match(routine("draw_top_score_rows"), /jmp draw_session_top_score/);
});
