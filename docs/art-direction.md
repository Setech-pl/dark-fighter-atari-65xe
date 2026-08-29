# Dark Fighter art direction

Dark Fighter is worn military science fiction rendered within stock Atari
65XE constraints. It is unofficial, non-commercial Battlestar Galactica fan
art and must not imply official affiliation or endorsement.

## Visual language

- Space is black, with restrained star density and clear combat silhouettes.
- Colonial machinery uses cold steel, pale highlights, dark seams, and warm
  engine accents.
- Cylon machinery uses dark metal, burgundy/red hull accents, and a distinct red
  scanner and weapon language.
- Damage uses short, local flashes and fragments; it must not repaint the global
  palette or obscure the HUD.
- Pixel shapes favor readable mass, panel rhythm, and negative space over tiny
  lettering or decorative noise.

The loader preserves the owner-approved Galactica profile, `BSG` marking,
three engine groups, title, and studio footer. It uses mixed ANTIC F/E with two
palette-zone DLIs. Gameplay does not add another DLI or PMG multiplexing merely
for a local colour effect.

The production frontend follows the accepted H3.1 Showcase Tactical Lite
system. `DARK FIGHTER`, section headings, and score values use amber `$1E`;
ordinary data uses white `$0E`; structural accents use steel `$84`; active
actions use green `$D8`; and the Game Over alert replaces steel with `$46`.
No screen uses a fifth foreground colour. The custom angular font and 3x2 menu
Viper share one `$4800` charset and remain readable at native Atari scale.

## Gameplay palette ownership

The fixed HUD remains legible and visually separate from the ANTIC 4 gameplay
field. Stars, hulls, Viper weapon pixels, Cylon weapon pixels, pickups, and
effects use existing playfield banks and PMG registers. A local object must not
change the global palette in a way that recolours other objects.

Viper weapon colours are:

- normal projectile: yellow (`$1E`);
- Spread Shot centre, left, and right projectiles: the same yellow Viper colour;
- Rapid Fire projectile: the established Viper yellow/gold (`$1E`).

Cylon Raider pulses remain red (`$46`) and retain their wider shape. Spread
Shot side projectiles must be identified by their symmetric fan geometry, not
by borrowing the Cylon weapon colour.

## Capital ships and engines

Both capital hulls must remain continuous through prow, forward modules, combat
modules, aft modules, and engines. Overlays may not leave blank segments,
vertical lines, stale glyphs, or wrap artifacts.

The accepted H4 gameplay set keeps the existing PMG and character footprints:
the Viper reads as a narrow top-down fighter, the Raider retains a crescent
silhouette and three scanner phases, and capital armour uses the fixed glyph
range 59-89. H4.1 debris remains two characters by eight scanlines in glyphs
110-117, with four asymmetric white/steel silhouettes. Fighter and capital
explosions retain exactly six phases and their existing timing.

Engine banks have exactly two phases: `dim` and `bright`. Each phase lasts eight
active PAL frames, producing a 16-frame loop. The phases change only the engine
pixels while preserving the established hull silhouette and backing behavior.

## Pickups

Pickup capsules are large, static 2x2-character objects. Their movement comes
from world scrolling; the four-cell footprint does not flicker or alternate
between old and new positions.

- **Rapid Fire:** steel/yellow casing with a black `RF` symbol. It must remain
  readable against space and either capital hull.
- **Spread Shot:** bright red casing with a black fan/three-projectile symbol.
- **Shield:** steel-blue `$84` outline, bright `$0E` fill, and a black shield
  symbol. Its dense cross-core BOOST bar and solid steel/white Viper pulse must
  remain distinguishable from both weapon boosters and respawn blinking.
  The dark symbol is formed by the capsule interior, not white text.
Pickup and projectile erase must restore the current lower layer. Visual review
therefore covers empty space, both hulls, module boundaries, prow, engine banks,
and display-list wrap.

## Motion and effects

Spread Shot begins as a compact Viper salvo and opens into an immediately
readable medium-width, symmetric fan. Side shots move smoothly by equal and
opposite horizontal increments while all three continue upward at the normal
weapon speed. Normal and Spread use the normal eight-event burst envelope;
Rapid uses a longer ten-shot burst as well as its faster in-burst cadence.

Breakups are brief and local. Debris uses two shapes and two tumble phases;
Raider breakup preserves the recognizable wings, central body, and red eye.
Transient effects are erased in reverse layer order and may not damage hulls,
stars, HUD characters, or the gameplay charset.

Editable declarative sources under `assets/graphics/` remain authoritative for
generated Atari art. Runtime captures are unenhanced emulator output and must
never be replaced by concept art or a hand-corrected mockup.
