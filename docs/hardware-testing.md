# Hardware acceptance checklist

Use the packed release artifacts from `dist/`. Test both `dark-fighter.xex` and
the bootable `dark-fighter.atr`; do not substitute a debug build or a preview
model. Record emulator/hardware version, medium, joystick, display connection,
and any failure with a photo or capture and reproduction steps.

## Atari800 PAL test

Configure Atari800 as PAL XL/XE with 64 KB RAM, BASIC disabled, joystick in port
1, and normal sound. Repeat the cold-start subset with RAM fill `$A5` and `$5A`
where the harness supports it.

For both XEX and ATR:

- [ ] Loader appears intact for five seconds, then reaches the main menu.
- [ ] Menu, options, top scores, music toggle, and exit screen respond normally.
- [ ] A new game shows `SCORE`, `LIFE`, and `HULL`; values do not corrupt nearby
      characters.
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
      `RF`, emits ten yellow shots at two-frame intervals with the existing
      12-frame post-burst pause, and expires after ten active seconds.
- [ ] Spread Shot capsule is a stable red 2x2 footprint with a black fan symbol.
- [ ] Collecting Spread displays `SP` and produces three yellow Viper projectiles:
      one vertical and two smoothly diverging, symmetric side shots.
- [ ] One held Spread burst contains exactly eight complete salvos. When fewer
      than three Viper slots are free, the next salvo waits; no one- or two-shot
      partial fan appears.
- [ ] Rapid and Spread replace each other; collecting the active type refreshes
      its countdown; neither timer advances during pause.
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
- [ ] New Game resets score, lives, hull, boosters, pickup sequence, projectiles,
      entities, effects, and sector state while preserving the session top score.
- [ ] XEX and ATR show equivalent gameplay behavior for at least 120 seconds
      each.

## Real Atari 65XE via SIO2SD

Use a stock PAL Atari 65XE with 64 KB and boot the ATR through SIO2SD. Also run
the XEX through the owner's normal real-hardware loader path when available.

- [ ] Cold boot succeeds repeatedly after power-off, not only after warm reset.
- [ ] Loader duration, menu transitions, audio, controls, pause, Game Over, and
      New Game match the Atari800 reference.
- [ ] The fixed HUD is stable on the connected PAL display and remains readable
      through heavy combat.
- [ ] Starfield and both hulls scroll smoothly without tearing, missing modules,
      vertical lines, or intermittent engine cells.
- [ ] Dim/bright engine animation is stable and does not alter non-engine hull
      pixels.
- [ ] Rapid Fire and Spread Shot can each be collected, refreshed, replaced, and
      allowed to expire; pause freezes both timers.
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
