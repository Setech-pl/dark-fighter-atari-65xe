import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  compileMenuMusic,
  createMenuMusicState,
  loadMenuMusicDefinition,
  renderMenuMusicCa65Include,
  startMenuMusic,
  stopMenuMusic,
  tickMenuMusic,
} from "../scripts/menu-music.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const definitionPath = path.join(rootDirectory, "assets", "music", "menu-theme.json");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const asset = compileMenuMusic(loadMenuMusicDefinition(definitionPath));
const manifest = JSON.parse(fs.readFileSync(path.join(rootDirectory, "build", "manifest.json")));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function routine(label, nextLabel) {
  const start = source.indexOf(`${label}:`);
  const end = source.indexOf(`${nextLabel}:`, start + label.length + 1);
  assert.notEqual(start, -1, `missing routine ${label}`);
  assert.notEqual(end, -1, `missing routine boundary ${nextLabel}`);
  return source.slice(start, end);
}

test("menu composition compiles deterministically to a 30.72-second PAL pattern loop", () => {
  const second = compileMenuMusic(loadMenuMusicDefinition(definitionPath));
  assert.equal(renderMenuMusicCa65Include(second), renderMenuMusicCa65Include(asset));
  assert.deepEqual(
    [asset.targetFrameHz, asset.framesPerRow, asset.rowsPerPattern,
      asset.patternNames.length, asset.sequenceBytes.length, asset.loopFrames, asset.loopSeconds],
    [50, 8, 16, 7, 12, 1536, 30.72],
  );
  assert.deepEqual(asset.form.map(({ id }) => id),
    ["INTRO", "DEVELOPMENT", "CLIMAX", "RETURN"]);
  assert.equal(asset.dataBytes, 513);
  assert.deepEqual(
    [manifest.menuMusic.targetFrameHz, manifest.menuMusic.loopFrames,
      manifest.menuMusic.runtimeCodeBytes, manifest.menuMusic.runtimeDataBytes,
      manifest.menuMusic.runtimeStateBytes],
    [50, 1536, 216, 513, 6],
  );
});

test("approved clean cinematic menu theme keeps its exact source and POKEY trace", () => {
  assert.equal(
    sha256(fs.readFileSync(definitionPath)),
    "3e76ee37ff3b6fbc22ba575e90f3cb55a14e7894eff3147731d5b06d0b07201c",
    "the owner-approved clean cinematic mix needs fresh acceptance before retuning",
  );
  assert.equal(
    sha256(renderMenuMusicCa65Include(asset)),
    "308eb6f3104ce70f2ead41164cbf12b15acc11411f722efc025051a287c2acec",
    "the approved tempo, patterns, sequence, and POKEY constants must remain exact",
  );

  const state = startMenuMusic(createMenuMusicState(), asset);
  const trace = [];
  for (let frame = 0; frame < asset.loopFrames; frame += 1) {
    if (!tickMenuMusic(state, asset)) continue;
    trace.push([
      frame,
      ...state.channels.flatMap(({ frequency, control }) => [frequency, control]),
      state.audctl,
      0x03, // SKCTL remains at its initialized normal operating value.
    ]);
  }
  assert.equal(trace.length, 192);
  assert.equal(
    sha256(JSON.stringify(trace)),
    "ab7c23447ab396356082d7c55f1ff1073bdd57bee14c635a1707bdcc89daedb5",
    "all approved AUDF1-4, AUDC1-4, AUDCTL, SKCTL row states must remain exact",
  );
});

test("clean cinematic mix gates the drone and stays below nonlinear mix pressure", () => {
  assert.deepEqual(asset.instruments.map(({ control }) => control),
    [0xa1, 0x84, 0x42, 0xa8, 0xa8, 0xc1]);

  const state = startMenuMusic(createMenuMusicState(), asset);
  let activeDroneFrames = 0;
  let maximumVolumeSum = 0;
  for (let frame = 0; frame < asset.loopFrames; frame += 1) {
    tickMenuMusic(state, asset);
    if ((state.channels[0].control & 0x0f) !== 0) activeDroneFrames += 1;
    maximumVolumeSum = Math.max(maximumVolumeSum,
      state.channels.reduce((sum, { control }) => sum + (control & 0x0f), 0));
  }

  assert.equal(activeDroneFrames, 416, "the drone must pulse instead of holding for the full loop");
  assert.equal(maximumVolumeSum, 13, "the four menu voices must retain clean mix headroom");
});

test("music start, stop, and restart reset the sequence and every POKEY register model", () => {
  const state = createMenuMusicState();
  startMenuMusic(state, asset);
  assert.deepEqual(
    [state.active, state.sequenceIndex, state.patternRow, state.rowTimer, state.channelMask],
    [true, 0, 0, 1, 0x0f],
  );
  assert.equal(tickMenuMusic(state, asset), true);
  assert.deepEqual(state.channels[0], { frequency: 0, control: 0 });
  assert.deepEqual(state.channels[1], { frequency: 244, control: 0x84 });

  stopMenuMusic(state);
  assert.equal(state.active, false);
  assert.equal(state.audctl, 0);
  assert.ok(state.channels.every(({ frequency, control }) => frequency === 0 && control === 0));

  startMenuMusic(state, asset);
  assert.deepEqual(
    [state.sequenceIndex, state.patternRow, state.rowTimer, state.channelMask],
    [0, 0, 1, 0x0f],
  );
  assert.equal(tickMenuMusic(state, asset), true);
  assert.deepEqual(state.channels[0], { frequency: 0, control: 0 });

  stopMenuMusic(state);
  startMenuMusic(state, asset, { soundEnabled: false });
  assert.equal(state.active, false);
});

test("music_tick advances on exact eight-frame PAL boundaries without drift", () => {
  const state = startMenuMusic(createMenuMusicState(), asset);
  const eventFrames = [];
  for (let frame = 0; frame < asset.loopFrames; frame += 1) {
    if (tickMenuMusic(state, asset)) eventFrames.push(frame);
  }
  assert.equal(eventFrames.length, asset.rowsPerPattern * asset.sequenceBytes.length);
  assert.deepEqual(eventFrames.slice(0, 5), [0, 8, 16, 24, 32]);
  assert.equal(eventFrames.at(-1), asset.loopFrames - asset.framesPerRow);
  assert.deepEqual(
    [state.sequenceIndex, state.patternRow, state.rowTimer],
    [0, 0, 1],
  );
  assert.equal(tickMenuMusic(state, asset), true, "the loop restarts without a gap");
});

test("channel mask leaves future gameplay channels available for SFX", () => {
  const state = startMenuMusic(createMenuMusicState(), asset, { channelMask: 0x09 });
  tickMenuMusic(state, asset);
  for (let frame = 0; frame < asset.framesPerRow; frame += 1) tickMenuMusic(state, asset);
  assert.notEqual(state.channels[0].control, 0);
  assert.equal(state.channels[1].control, 0);
  assert.equal(state.channels[2].control, 0);
  assert.equal(state.channels[3].control, 0, "intro row deliberately starts the motif at rest");
});

test("assembly starts only in the main menu and stops before gameplay initializes SFX", () => {
  assert.match(source,
    /jsr show_loader[\s\S]+jsr unpack_starfield_runtime[\s\S]+jmp finish_startup_after_loader[\s\S]+finish_startup_after_loader:[\s\S]+sta sound_enabled[\s\S]+jsr music_init[\s\S]+jsr enter_main_menu/);
  assert.match(routine("frontend_loop", "dispatch_frontend_input"),
    /cmp #STATE_MAIN_MENU\s+bne[\s\S]+jsr music_tick[\s\S]+lda STICK0[\s\S]+lda TRIG0/);
  assert.match(routine("enter_frontend_state", "enter_exited_state"),
    /cmp #STATE_MAIN_MENU[\s\S]+jsr music_stop[\s\S]+jsr music_start_menu/);
  const gameplay = routine("start_gameplay", "main_loop");
  assert.match(gameplay,
    /sta gameplay_fire_gate\s+sta pause_option_latched\s+jsr music_stop[\s\S]+lda sound_enabled/);
  assert.doesNotMatch(gameplay, /music_tick|music_start_menu/);
  assert.match(routine("handle_game_over_input", "handle_exit_input"), /jmp enter_main_menu/);
});

test("music_stop clears AUDF1-4, AUDC1-4, and AUDCTL through silence_audio", () => {
  assert.match(routine("music_stop", "music_tick"), /jmp silence_audio/);
  const silence = routine("silence_audio", "hud_ascii");
  for (const register of [
    "AUDF1", "AUDC1", "AUDF2", "AUDC2", "AUDF3", "AUDC3", "AUDF4", "AUDC4", "AUDCTL",
  ]) {
    assert.match(silence, new RegExp(`sta ${register}`));
  }
});
