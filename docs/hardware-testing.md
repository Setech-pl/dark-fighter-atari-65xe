# Hardware acceptance checklist

Use the packed release artifacts from `dist/`. Test both `dark-fighter.xex` and
the bootable `dark-fighter.atr`; do not substitute a debug build or a preview
model. Record emulator/hardware version, medium, joystick, display connection,
and any failure with a photo or capture and reproduction steps.

Before manual testing, run the evidence phases in order:

- [ ] `npm run build:candidate` produces a `candidate-awaiting-trace` manifest.
- [ ] `npm run runtime:wall-trace` completes every schema-v2 session, including
      cold RAM `$A5/$5A` and full debris flights on EASY, MEDIUM, and HARD.
- [ ] `npm run build` binds the complete report to the same boot BIN, XEX, and
      ATR hashes.
- [ ] `npm run verify` accepts the final-bound manifest and report hash.
- [ ] The manifest reports ENTITY_CODE staging `$5300-$5CEE`, 325 B before it,
      and 289 B before BROADSIDE; startup consumes it before loader bitmap and
      starfield expansion reuse the same low-memory range.
- [ ] A second unchanged full trace has replay fingerprint
      `a6978c46db70261429115faee7e013c939224a30854c509edfe4129dd06ed5d3`,
      a 32,040-cycle maximum, and 3,528-cycle physical headroom.

## Atari800 PAL test

Configure Atari800 as PAL XL/XE with 64 KB RAM, BASIC disabled, joystick in port
1, and normal sound. Repeat the cold-start subset with RAM fill `$A5` and `$5A`
where the harness supports it.

For both XEX and ATR:

- [ ] Loader appears intact for five seconds, then reaches the main menu.
- [ ] Menu, options, top scores, music toggle, and exit screen respond normally.
- [ ] A new game shows `SCORE`, `LIFE`, and the full `HULL` label followed by
      four low intact plates; fields do not corrupt nearby characters.
- [ ] Viper movement and normal fire remain responsive at 50 FPS PAL; a held
      FIRE input emits exactly eight shots at three-frame intervals, then the
      existing 12-frame post-burst pause.
- [ ] Pause freezes world motion, capital-engine phase, active pickup movement,
      and booster timer; resume restores the exact visible gameplay state.
- [ ] Colonial and Cylon hulls remain continuous through prow, modules, engine
      banks, A2-head changes, and ring wrap.
- [ ] Capital engines alternate only between dim and bright, holding each phase
      for eight active frames.
- [ ] Raider fire, collisions, scoring, debris contact, destructible debris,
      Raider breakup, and debris breakup behave normally.
- [ ] Rapid Fire capsule moves as one stable 2x2 footprint; collection displays
      the full `BOOST` label and four tall energy segments, emits ten yellow shots at two-frame
      intervals with the existing 12-frame post-burst pause, and expires after
      ten active seconds.
- [ ] Spread Shot capsule is a stable red 2x2 footprint with a black fan symbol.
- [ ] Collecting Spread immediately displays the full `BOOST` label and four
      full energy segments and
      produces three yellow Viper projectiles: one vertical and two smoothly
      diverging, symmetric side shots.
- [ ] One held Spread burst contains exactly eight complete salvos. When fewer
      than three Viper slots are free, the next salvo waits; no one- or two-shot
      partial fan appears.
- [ ] Rapid and Spread replace each other; collecting the active type refreshes
      the `BOOST` field and four-segment bar. It steps at the 75%, 50%, and 25% boundaries; below
      25% the last segment blinks for 8 visible and 8 hidden PAL frames. Neither
      timer nor the current blink phase advances during pause.
- [ ] Expiry, life loss, Game Over, and New Game remove `BOOST` and leave all ten
      booster HUD cells empty; a live sector transition preserves the active field.
- [ ] Shield is a steel-blue/white 2x2 capsule with a black shield symbol. Its
      250-frame timer survives sector transitions, freezes during pause, and is
      cleared by life loss, Game Over, and New Game.
- [ ] Shield absorbs Raider shots, broadside impacts, debris, Raider contact,
      and hull contact without changing HULL, LIFE, SCORE, hit cooldown, flash,
      or HULL-hit SFX; at most one absorption is accepted per frame.
- [ ] The dense continuous Shield HUD bar uses boundaries 188/126/63 and the
      Viper remains solid while COLPM0/COLPM3 pulse steel/white at the left,
      centre, and right side of the corridor.
- [ ] At native 320-pixel width, HULL plates remain low and angular while BOOST
      cells remain tall and narrow; the two indicators are distinguishable
      without relying on colour. Damaged HULL plates never blink or disappear.
- [ ] Spread projectiles cross empty space and successive Colonial hull segments
      without vertical lines, blank cells, ghosts, or stale projectile glyphs.
- [ ] Repeat over the Cylon prow, midship modules, engine section, module
      boundaries, A2-head changes, and wrap with the same clean backing result.
- [ ] Overlapping projectiles do not erase a projectile that remains in the
      cell; the final departure restores the current hull or starfield byte.
- [ ] No combat state corrupts the HUD, gameplay charset, loader data, or the
      opposite capital ship.
- [ ] Losing a life clears life-scoped weapon state and respawns with the
      expected blink; losing the last life reaches Game Over.
- [ ] Finish consecutive games with 890, 690, then 750 points. After each
      Game Over, enter TOP SCORES through the menu and verify `890`; then
      `890, 690`; then `890, 750, 690` without restarting the program.
- [ ] New Game resets score, lives, hull, boosters, pickup sequence, projectiles,
      entities, effects, and sector state while preserving all ten TOP SCORES
      records.
- [ ] XEX and ATR show equivalent gameplay behavior for at least 120 seconds
      each.

## Real Atari 65XE via SIO2SD

Use a stock PAL Atari 65XE with 64 KB and boot the ATR through SIO2SD. Also run
the XEX through the owner's normal real-hardware loader path when available.

- [ ] Cold boot succeeds repeatedly after power-off, not only after warm reset.
- [ ] The 100-sector OS boot read is followed by standard-speed SIOV reads of
      sectors 101-145; no SIO turbo support is required.
- [ ] A deliberately truncated or CRC-corrupted test ATR stops on the fixed red
      loader error screen and never enters partially loaded code.
- [ ] Loader duration, menu transitions, audio, controls, pause, Game Over, and
      New Game match the Atari800 reference.
- [ ] The fixed HUD is stable on the connected PAL display and remains readable
      through heavy combat.
- [ ] Starfield and both hulls scroll smoothly without tearing, missing modules,
      vertical lines, or intermittent engine cells.
- [ ] Dim/bright engine animation is stable and does not alter non-engine hull
      pixels.
- [ ] Rapid Fire, Spread Shot, and Shield can each be collected, refreshed,
      replaced in the fixed rotation, and allowed to expire; pause freezes all timers.
- [ ] All three Spread Shot projectiles are yellow and form a clear symmetric
      fan without flicker or sudden horizontal jumps.
- [ ] Normal, Rapid Fire, and Spread Shot Viper projectiles all remain yellow;
      Raider projectiles retain their separate Cylon red/purple bank.
- [ ] Spread projectiles pass over both capital ships, including prow, midship,
      engines, module boundaries, and wrap, with exact backing restoration.
- [ ] Long combat produces no ghosts, HUD damage, charset corruption, stuck
      tones, unexpected reset, or slowdown.
- [ ] SIO2SD can reboot the ATR after Game Over and after a power cycle.

## Failure classification

Classify a failure as artifact/boot, timing/synchronization, display/backing,
input, gameplay state, or audio. Preserve the failing artifact hashes. Emulator
success is necessary but does not close real-hardware acceptance.
