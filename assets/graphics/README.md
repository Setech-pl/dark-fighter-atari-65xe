# Graphics sources

Editable source art and conversion metadata belong here. Every accepted asset should also have an enlarged PNG review sheet and a generated Atari data file created by a documented script.

## Accepted references

- `dark-fighter-screen-concept-v1.png` — accepted composition and art-direction reference for the first gameplay screen. It defines the HUD hierarchy, dark central flight corridor, worn steel-blue structures, red identification stripes, pale player/enemy hulls and amber/cyan weapon accents.

The reference is not copied pixel-for-pixel into video memory. Runtime art is redrawn for a 160-color-clock ANTIC 4 playfield and Player/Missile Graphics. This keeps silhouettes readable and preserves a deterministic 50 FPS path on a stock 64 KB Atari 65XE.
