# AGENTS.md — Dark Fighter

## Mission

Build a complete, original vertical space shooter for a stock Atari 65XE PAL with 64 KB RAM. The deliverable must work in an emulator and on real hardware through SIO2SD.

## Fixed constraints

- Target: Atari 65XE PAL, 64 KB RAM, 6502C.
- Timing target: 50 frames per second.
- Input: joystick in port 1, single fire button.
- Distribution: `dark-fighter.xex` and bootable `dark-fighter.atr`.
- Build hosts: macOS Intel and Windows.
- Code: documented NMOS 6502 instructions only.
- Art direction: original military, worn, dark science-fiction. Battlestar Galactica (2004) is a mood reference, never a source of copied ships, names, UI, music, or lore.

## Engineering rules

1. Keep changes small, reviewable, and buildable.
2. Run `npm run build` and `npm test` after every functional change.
3. Never hand-edit `build/` or `dist/`; they are generated.
4. Update `docs/memory-map.md` whenever a reserved address or memory range changes.
5. Keep visible-frame work deterministic and bounded. Record approximate worst-case cycles for routines added to the main loop or VBI.
6. Avoid OS calls after takeover unless the call is explicitly documented and tested with interrupts/display state.
7. Treat emulator success as necessary but not sufficient. Preserve a real-hardware test path and do not rely on emulator-only behavior.
8. Keep source assets and conversion steps. Do not commit only generated Atari bytes when an editable source can exist.
9. All game names, factions, silhouettes, audio themes, and UI labels must remain original.
10. Do not add dependencies without explaining why the standard library or existing toolchain is insufficient.

## Definition of done for a change

- assembles and links without warnings;
- XEX and ATR validation passes;
- no overlap with reserved memory ranges;
- input and timing behavior are defined for PAL;
- documentation reflects user-visible or architectural changes;
- code review notes distinguish confirmed bugs from optional improvements.

