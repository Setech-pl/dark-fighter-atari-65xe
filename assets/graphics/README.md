# Graphics sources

Editable source art and conversion metadata belong here. Every accepted asset should also have an enlarged PNG review sheet and a generated Atari data file created by a documented script.

## Accepted references

- `dark-fighter-screen-concept-v1.png` — accepted composition and art-direction reference for the first gameplay screen. It defines the HUD hierarchy, dark central flight corridor, worn steel-blue structures, red identification stripes, pale player/enemy hulls and amber/cyan weapon accents.
- `loader.png` — owner-authored visual source of truth for the loader composition,
  Galactica profile, `BSG` marking, title treatment, engine light, and green
  studio credit.
- `loader-bitmap.json` — editable Atari-native 320×192 monochrome composition.
  It describes deterministic drawing primitives, ordered dither patterns, the
  pixel font, landmarks, two LMS addresses, palette zones, timing, and the
  reference checksum. The host compiler rasterizes these instructions MSB
  first into exactly 7680 bytes, PackBits-compresses them, and derives both
  ca65 data and `build/previews/loader-screen.png` from that one result.

The gameplay reference is not copied pixel-for-pixel into video memory.
Gameplay art is redrawn for a 160-color-clock ANTIC 4 playfield and
Player/Missile Graphics. The loader instead uses a 320-pixel ANTIC F bitmap
without PMG. Its full-resolution silhouette, negative panel gaps, repeated
ribs, and ordered dithering are a deliberate 1-bit adaptation of `loader.png`,
not an automatic threshold. Both paths preserve deterministic operation on a
stock 64 KB Atari 65XE.
