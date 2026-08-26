# Graphics sources

Editable graphics definitions and owner references live here. Generated ca65
includes and review images belong in `build/`; runtime captures and their
provenance belong under `docs/media/`.

## Current runtime sources

- `loader-bitmap.json` describes the mixed ANTIC F/E loader. The converter
  rasterizes exactly 7,680 bytes, packs the current bitmap to 1,997 LZ-10/5
  bytes, and derives the preview from those same pixels.
- `capital-hulls.json` defines both 32x9 expanded hull maps, modular 240-row
  sector sequences, source turrets, broadside timing, hull contact boundaries,
  prow masks, capital explosions, and two engine phases (`dim` and `bright`).
  Each engine phase lasts eight active PAL frames.
- `starfield.json` defines the deterministic far and near layers, corridor
  bounds, glyph ownership, twinkle interval, and fixed seed.
- `fighter-weapons.json` defines the ten-slot Viper and nine-slot Raider pools,
  projectile glyph phases, colours, burst cadence, collision envelopes, Rapid
  Fire, and the all-yellow three-projectile Spread Shot.
- `entity-effects.json` defines debris, transient fragments, the four physical
  interactive slots with active limit two, the six physical effect slots with
  active limit five, and the Rapid Fire and Spread Shot 2x2 capsule glyphs.
- `enemy-roster.json` inventories ten stable enemy identities and emits native
  PMG/descriptors for Raider, Talon, and Scythe. The release enables only Raider;
  Talon and Scythe remain review-only and use no runtime weapon.

`scripts/*.mjs` validate these definitions and generate the includes consumed by
`src/main.s`. Generated Atari bytes must not be edited by hand.

## Owner references

- `loader.png` is the owner-authored composition reference for the Galactica
  profile, `BSG` marking, title, three engine groups, and green studio footer.
- `dark-fighter-screen-concept-v1.png` is the accepted gameplay composition and
  art-direction reference.
- `mainmenu.png` is the accepted menu composition reference; it is not copied or
  traced into runtime pixels.
- Enemy PNG files are design references. Their transparent or chroma-green
  pixels are removed only for review sheets; final Atari PMG masks are authored
  at native resolution.

The project is unofficial, non-commercial Battlestar Galactica fan art. Source
references guide new Atari-native art and are not shipped as runtime data.

## Preview contract

`npm run preview` rebuilds deterministic review images from the same generated
glyphs, maps, palettes, and positions as the runtime. A preview may add labels
outside the simulated Atari screen, but it must not use independent gameplay
coordinates or repaint runtime pixels.

The full-playfield ANTIC 2 prototype is rejected and excluded from XEX/ATR.
Its rationale is retained only in
[`docs/history/antic2-spike.md`](../../docs/history/antic2-spike.md).
