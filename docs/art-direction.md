# Void Strike 65 art direction

Void Strike 65 is worn military science fiction rendered within stock Atari
65XE constraints. It is unofficial and non-commercial, and must not imply
official affiliation or endorsement.

## Visual language

- Space is black, with restrained star density and clear combat silhouettes.
- Allied machinery uses cold steel, pale highlights, dark seams, and warm
  engine accents.
- Hostile machinery uses dark metal, burgundy/red hull accents, and a distinct red
  scanner and weapon language.
- Damage uses short, local flashes and fragments; it must not repaint the global
  palette or obscure the HUD.
- Pixel shapes favor readable mass, panel rhythm, and negative space over tiny
  lettering or decorative noise.

The loader preserves the owner-approved capital-ship profile, three engine
groups, title, and studio footer. It uses mixed ANTIC F/E with two
palette-zone DLIs. Gameplay does not add another DLI or PMG multiplexing merely
for a local colour effect.

The production frontend follows the accepted H3.1 Showcase Tactical Lite
system. `VOID STRIKE 65`, section headings, and score values use amber `$1E`;
ordinary data uses white `$0E`; structural accents use steel `$84`; active
actions use green `$D8`; and the Game Over alert replaces steel with `$46`.
No screen uses a fifth foreground colour. The custom angular font and 3x2 menu
Player Fighter share one `$4800` charset and remain readable at native Atari scale.

## Gameplay palette ownership

The fixed HUD remains legible and visually separate from the ANTIC 4 gameplay
field. Stars, hulls, Player Fighter weapon pixels, Hostile weapon pixels, pickups, and
effects use existing playfield banks and PMG registers. A local object must not
change the global palette in a way that recolours other objects.

Player Fighter weapon colours are:

- normal projectile: yellow (`$1E`);
- Spread Shot centre, left, and right projectiles: the same yellow Player Fighter colour;
- Rapid Fire projectile: the established Player Fighter yellow/gold (`$1E`).

Hostile Interceptor pulses remain red (`$46`) and retain their wider shape. Spread
Shot side projectiles must be identified by their symmetric fan geometry, not
by borrowing the Hostile weapon colour.

## Capital ships and engines

Both capital hulls must remain continuous through prow, forward modules, combat
modules, aft modules, and engines. Overlays may not leave blank segments,
vertical lines, stale glyphs, or wrap artifacts.

The accepted H4 gameplay set keeps the existing PMG and character footprints:
the Player Fighter reads as a narrow top-down fighter, the Interceptor retains a crescent
silhouette and three scanner phases, and capital armour uses the fixed glyph
range 59-89. H4.1 debris remains two characters by eight scanlines in glyphs
110-117, with four asymmetric white/steel silhouettes. Fighter and capital
explosions retain exactly six phases and their existing timing.

The accepted H4.2 C INDUSTRIAL capital set keeps CLEAN's stable mass plates but
adds bounded construction detail: horizontal allied ribs, service seams and
hatches, plus deeper enemy channels and apertures. Detail must form connected
ship structure across neighbouring glyphs; checkerboards, dithering, and
singleton surface noise remain prohibited.

Engine banks have exactly two phases: `dim` and `bright`. Each phase lasts eight
active PAL frames, producing a 16-frame loop. The phases change only the engine
pixels while preserving the established hull silhouette and backing behavior.

## Pickups

Pickup capsules are large 8x16-scanline objects. Eight generated vertical
phases keep the silhouette coherent while it crosses character rows: phase
zero occupies 2x2 cells and shifted phases occupy 2x3 cells. Exactly one final
footprint may be visible for each active logical slot; the image must not hold
for several frames and then jump by eight scanlines.

- **Rapid Fire:** steel/yellow casing with a black `RF` symbol. It must remain
  readable against space and either capital hull.
- **Spread Shot:** bright red casing with a black fan/three-projectile symbol.
- **Shield:** steel-blue `$84` outline, bright `$0E` fill, and a black shield
  symbol. Its dense cross-core BOOST bar and solid steel/white Player Fighter pulse must
  remain distinguishable from both weapon boosters and respawn blinking.
  The dark symbol is formed by the capsule interior, not white text.
Pickup erase restores the exact physical cells and lower-layer bytes saved by
the previous frame, never a pointer recalculated from the new ring phase.
Capsule glyph codes must not enter backing or wrap-copy sources. Visual review
therefore covers empty space, both hulls, module boundaries, prow, engine banks,
and display-list wrap.
When the P0/P3 Player Fighter overlaps a capsule, set hull or engine bits remain in the
foreground. Zero bits in the Player Fighter PMG masks are transparent and must leave the
capsule visible; a restored black playfield rectangle or clipped capsule edge
is never an acceptable substitute for pixel-level overlap.

## Motion and effects

Spread Shot begins as a compact Player Fighter salvo and opens into an immediately
readable medium-width, symmetric fan. Side shots move smoothly by equal and
opposite horizontal increments while all three continue upward at the normal
weapon speed. Normal and Spread use the normal eight-event burst envelope;
Rapid uses a longer ten-shot burst as well as its faster in-burst cadence.

Breakups are brief and local. Debris uses two shapes and two tumble phases;
Interceptor breakup preserves the recognizable wings, central body, and red eye.
Transient effects are erased in reverse layer order and may not damage hulls,
stars, HUD characters, or the gameplay charset.

Editable declarative sources under `assets/graphics/` remain authoritative for
generated Atari art. Runtime captures are unenhanced emulator output and must
never be replaced by concept art or a hand-corrected mockup.
