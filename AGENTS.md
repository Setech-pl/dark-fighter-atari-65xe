# AGENTS.md — Void Strike 65

## Mission

Build a complete vertical space shooter for a stock Atari 65XE PAL with 64 KB
RAM. This is a hobbyist, non-commercial project. The deliverable must work in
an emulator and on real hardware through SIO2SD.

## Fixed constraints

- Target: Atari 65XE PAL, 64 KB RAM, 6502C.
- Timing target: 50 frames per second.
- Input: joystick in port 1, single fire button.
- Distribution: `void-strike-65.xex` and bootable `void-strike-65.atr`.
- Build hosts: macOS Intel and Windows.
- Code: documented NMOS 6502 instructions only.
- Art direction: military, worn, dark science-fiction with readable ship
  silhouettes, faction colours, markings, UI references, and music motifs.

## Engineering rules

Before making project decisions, start with `docs/README.md` and follow its source-of-truth map.

1. Keep changes small, reviewable, and buildable.
2. Run `npm run build` and `npm test` after every functional change.
3. Never hand-edit `build/` or `dist/`; they are generated.
4. Update `docs/memory-map.md` whenever a reserved address or memory range changes.
5. Keep visible-frame work deterministic and bounded. Record approximate worst-case cycles for routines added to the main loop or VBI.
6. Avoid OS calls after takeover unless the call is explicitly documented and tested with interrupts/display state.
7. Treat emulator success as necessary but not sufficient. Preserve a real-hardware test path and do not rely on emulator-only behavior.
8. Keep source assets and conversion steps. Do not commit only generated Atari bytes when an editable source can exist.
9. Preserve supplied references and explicit owner decisions faithfully; do
   not silently replace them with an alternative. Project-specific additions
   must not imply official status, affiliation, or endorsement.
10. Do not add dependencies without explaining why the standard library or existing toolchain is insufficient.

## Definition of done for a change

- assembles and links without warnings;
- XEX and ATR validation passes;
- no overlap with reserved memory ranges;
- input and timing behavior are defined for PAL;
- documentation reflects user-visible or architectural changes;
- code review notes distinguish confirmed bugs from optional improvements.
