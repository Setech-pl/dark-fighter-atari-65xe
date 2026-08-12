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

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const asset = compileCapitalHulls(loadCapitalHullsDefinition(
  path.join(rootDirectory, "assets", "graphics", "capital-hulls.json"),
));

const CH_ZERO = 16;
const LIFE_OFFSET = 18;
const HULL_HUNDREDS_OFFSET = 26;
const HULL_TENS_OFFSET = 27;

function hudStatusBytes(state) {
  assert.ok(Number.isInteger(state.lives) && state.lives >= 0 && state.lives <= 9);
  assert.ok(Number.isInteger(state.health) && state.health >= 0 && state.health <= 100);
  assert.equal(state.health % 10, 0, "runtime health units must convert exactly to percent");
  const bytes = new Map([[LIFE_OFFSET, CH_ZERO + state.lives]]);
  if (state.health === 100) {
    bytes.set(HULL_HUNDREDS_OFFSET, CH_ZERO + 1);
    bytes.set(HULL_TENS_OFFSET, CH_ZERO);
  } else {
    bytes.set(HULL_HUNDREDS_OFFSET, 0);
    bytes.set(HULL_TENS_OFFSET,
      state.health === 0 ? 0 : CH_ZERO + state.health / 10);
  }
  return bytes;
}

function statusText(state) {
  return `LIFE ${state.lives} HULL ${state.health}%`;
}

test("HUD template removes placeholder ARM/FUEL and exposes independent LIFE and HULL", () => {
  assert.match(source, /hud_ascii:\s*\.byte "SCORE 00000  LIFE 3  HULL 100%"/);
  assert.doesNotMatch(source, /hud_ascii:[\s\S]*?\.byte [^\n]*\b(?:ARM|FUEL)\b/);
  assert.match(source,
    /update_hud_status:[\s\S]+lda PLAYER_LIVES[\s\S]+sta SCREEN\+HUD_LIFE_DIGIT_OFFSET[\s\S]+lda BROAD_PLAYER_HEALTH/);
  assert.match(source,
    /apply_player_damage:[\s\S]+sta BROAD_PLAYER_HEALTH[\s\S]+dec PLAYER_LIVES[\s\S]+jmp update_hud_status/);
  assert.match(source,
    /respawn_player:[\s\S]+PLAYER_HEALTH_UNITS[\s\S]+sta BROAD_PLAYER_HEALTH[\s\S]+jsr update_hud_status/);
  assert.ok([LIFE_OFFSET, HULL_HUNDREDS_OFFSET, HULL_TENS_OFFSET]
    .every((offset) => offset >= 0 && offset < 40), "status bytes must remain in HUD row zero");
});

test("canonical damage and lifecycle drive LIFE 3→2 and HULL 100→0→100", () => {
  const state = createBroadsideState(asset);
  assert.equal(statusText(state), "LIFE 3 HULL 100%");
  assert.deepEqual([...hudStatusBytes(state)], [[18, 19], [26, 17], [27, 16]]);

  assert.equal(applyPlayerDamage(state, asset, 10, 25, 1), true,
    "ordinary enemy projectile damage must use the canonical gate");
  assert.equal(statusText(state), "LIFE 3 HULL 90%");
  state.damageCooldown = 0;
  assert.equal(applyPlayerDamage(state, asset, 20, 25, 2), true,
    "capital-shell/contact damage must use the same canonical gate");
  assert.equal(statusText(state), "LIFE 3 HULL 70%");

  state.health = 10;
  state.damageCooldown = 0;
  assert.equal(applyPlayerDamage(state, asset, 10, 25, 3), true);
  assert.equal(statusText(state), "LIFE 2 HULL 0%");
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.DYING);

  for (let frame = 0; frame < SHARED_FIGHTER_EXPLOSION_TOTAL - 1; frame += 1) {
    assert.equal(advancePlayerLifecycle(state, asset), "dying");
    assert.equal(statusText(state), "LIFE 2 HULL 0%",
      "explosion frames cannot decrement life or restore hull");
  }
  assert.equal(advancePlayerLifecycle(state, asset), "respawn");
  assert.equal(statusText(state), "LIFE 2 HULL 100%");
  assert.equal(state.respawnInvulnerabilityTimer, 250);
});

test("final playable life reaches LIFE 0 / HULL 0 and the existing Game Over path", () => {
  const state = createBroadsideState(asset);
  state.lives = 1;
  state.health = 10;
  assert.equal(applyPlayerDamage(state, asset, 10, 25, 500), true);
  assert.equal(statusText(state), "LIFE 0 HULL 0%");
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.DYING);
  for (let frame = 0; frame < SHARED_FIGHTER_EXPLOSION_TOTAL - 1; frame += 1) {
    advancePlayerLifecycle(state, asset);
    assert.equal(state.lives, 0);
  }
  assert.equal(advancePlayerLifecycle(state, asset), "game-over");
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.GAME_OVER);
  assert.equal(state.lives, 0);
  assert.equal(state.health, 0);
});
