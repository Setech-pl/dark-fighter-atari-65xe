# AGENTS.md — Dark Fighter

## Mission

Build a complete, unofficial Battlestar Galactica fan-art vertical space shooter
for a stock Atari 65XE PAL with 64 KB RAM. This is a hobbyist, non-commercial
project. It is not affiliated with, endorsed by, or presented as an official
product of the owners of Battlestar Galactica. The deliverable must work in an
emulator and on real hardware through SIO2SD.

## Fixed constraints

- Target: Atari 65XE PAL, 64 KB RAM, 6502C.
- Timing target: 50 frames per second.
- Input: joystick in port 1, single fire button.
- Distribution: `dark-fighter.xex` and bootable `dark-fighter.atr`.
- Build hosts: macOS Intel and Windows.
- Code: documented NMOS 6502 instructions only.
- Art direction: military, worn, dark science-fiction based on the Battlestar
  Galactica ecosystem. The project owner has permanently approved fan-art use of
  BSG ships, silhouettes, names, factions, markings, UI references, music
  motifs, and lore, including Galactica and the `BSG` marking on the loader
  screen.

## Engineering rules

1. Keep changes small, reviewable, and buildable.
2. Run `npm run build` and `npm test` after every functional change.
3. Never hand-edit `build/` or `dist/`; they are generated.
4. Update `docs/memory-map.md` whenever a reserved address or memory range changes.
5. Keep visible-frame work deterministic and bounded. Record approximate worst-case cycles for routines added to the main loop or VBI.
6. Avoid OS calls after takeover unless the call is explicitly documented and tested with interrupts/display state.
7. Treat emulator success as necessary but not sufficient. Preserve a real-hardware test path and do not rely on emulator-only behavior.
8. Keep source assets and conversion steps. Do not commit only generated Atari bytes when an editable source can exist.
9. Battlestar Galactica elements may be used as non-commercial fan art under
   the project owner's standing approval. Preserve supplied references and
   explicit owner decisions faithfully; do not silently replace them with an
   original alternative. Project-specific additions may remain original, but
   they must not imply official status, affiliation, or endorsement.
10. Do not add dependencies without explaining why the standard library or existing toolchain is insufficient.

## Definition of done for a change

- assembles and links without warnings;
- XEX and ATR validation passes;
- no overlap with reserved memory ranges;
- input and timing behavior are defined for PAL;
- documentation reflects user-visible or architectural changes;
- code review notes distinguish confirmed bugs from optional improvements.
