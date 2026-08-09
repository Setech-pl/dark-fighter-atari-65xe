# Graphics sources

Editable source art and conversion metadata belong here. Every accepted asset should also have an enlarged PNG review sheet and a generated Atari data file created by a documented script.

## Accepted references

- `dark-fighter-screen-concept-v1.png` — accepted composition and art-direction reference for the first gameplay screen. It defines the HUD hierarchy, dark central flight corridor, worn steel-blue structures, red identification stripes, pale player/enemy hulls and amber/cyan weapon accents.
- `loader.png` — owner-authored visual source of truth for the loader composition,
  Galactica profile, `BSG` marking, title treatment, engine light, and green
  studio credit.
- `loader-bitmap.json` — editable Atari-native mixed-mode bitmap composition.
  It describes deterministic drawing primitives, ordered dither patterns, the
  pixel font, landmarks, two LMS addresses, palette zones, timing, and the
  reference checksum. The host compiler rasterizes title and ship rows as
  320-pixel ANTIC F and the studio footer as 160-pixel ANTIC E, always at 40
  bytes per row. It produces exactly 7680 bytes, PackBits-compresses them, and
  derives both ca65 data and `build/previews/loader-screen.png` from that result.
- `mainmenu.png` — zatwierdzona referencja kompozycji i atmosfery main menu.
  Implementacja Atari używa jej wyłącznie do podziału: duży tytuł u góry,
  hangar i myśliwiec po lewej oraz opcje po prawej. Dolny podpis studia z tej
  referencji nie występuje w runtime main menu. PNG nie jest
  skalowane, trasowane ani konwertowane do danych ekranu; oznaczenia i dokładne
  sylwetki z konceptu nie są kopiowane.

The gameplay reference is not copied pixel-for-pixel into video memory.
Gameplay art is redrawn for a 160-color-clock ANTIC 4 playfield and
Player/Missile Graphics. The loader uses 320-pixel ANTIC F for its title and
ship and 160-pixel ANTIC E for the lime studio credit on a true black
background, without PMG. Its silhouette, negative panel gaps, repeated ribs,
and ordered dithering are a deliberate adaptation of `loader.png`, not an
automatic threshold. Both paths preserve deterministic operation on a stock
64 KB Atari 65XE.
