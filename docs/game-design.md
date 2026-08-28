# Dark Fighter game design

This document defines the current player-visible rules. Technical implementation
belongs in [architecture.md](architecture.md), numeric memory ownership in
[memory-map.md](memory-map.md), and future work in [roadmap.md](roadmap.md).

## Implemented game

Dark Fighter is an unofficial, non-commercial Battlestar Galactica fan-art
vertical shooter for a stock PAL Atari 65XE. It runs at 50 frames per second.
The player flies a Viper with joystick port 1 and fires with one button.

The frontend contains the title loader, main menu, options, top scores, exit
screen, menu music, and a gameplay-music option. Gameplay can be paused and
resumed. Pause freezes active gameplay simulation and booster countdowns.

### HUD and player lifecycle

The gameplay HUD contains `SCORE`, `LIFE`, and `HULL`. Four low, angular plate
cells follow the full `HULL` label at all times: intact quarters are solid and
damaged quarters remain visible as cracked plates. This indicator never blinks
or disappears.

While Rapid Fire, Spread Shot, or Shield is active, the ten cells to the right show the
full `BOOST` label, one blank separator, and four tall, narrow energy cells.
The bar has four segments above 75% remaining time, three above 50%, two from
25% through 50%, and one below 25%. Only the last segment blinks in an
eight-frame visible/eight-frame hidden rhythm. Expiry restores all ten cells
to their prior blank contents. The optional type glyph is omitted because the
40-column HUD has exactly ten unclaimed cells and one active booster at a time.

- A new game starts with three playable Vipers and a full 100% hull.
- The hull has ten health units. Ordinary Raider pulse and debris contact damage
  remove one unit (10%); capital-ship fire removes two units (20%).
- A direct Raider collision destroys the current Viper.
- Losing a Viper plays a 24-frame breakup. If a life remains, the replacement
  Viper receives 250 active frames (5 seconds) of invulnerability and blinks in
  an 8-frame visible/8-frame hidden rhythm.
- Losing the final Viper enters Game Over. New Game resets score, lives, hull,
  sector state, active projectiles, entities, effects, and boosters.
- TOP SCORES keeps ten packed-BCD results in RAM, ordered from highest to
  lowest. A completed non-zero game is inserted once on the Game Over
  transition; equal scores follow existing equal entries. New Game resets only
  the current score, while a cold program start clears the table.

### Combat and scoring

The normal Viper weapon fires an eight-projectile burst at one projectile every
three active frames, followed by a 12-frame pause. Projectiles travel upward by
six scanlines per active frame. The physical Viper pool has ten slots.

The implemented Raider has one hit point. It uses soft horizontal pursuit with
a readable weave and moves at 80% of the Viper's maximum horizontal speed. Its
single-pulse weapon fires ten shots at four-frame intervals, then waits 60, 50,
or 40 frames on Easy, Medium, or Hard. Raider pulses travel five scanlines per
frame, live for at most 96 frames, and use a separate nine-slot pool.

A Raider is worth 10 points when destroyed by a Viper projectile, player
contact, or Cylon friendly fire. A capital-ship hit or lifecycle cleanup awards
no points. Debris has three hit points, causes 10% hull damage on contact, and
never awards score when destroyed.

Raider and debris destruction use the implemented entity/effects foundation.
Raider breakup has a core, two wing fragments, a central fragment, and a red
eye fragment. Debris destruction has one core plus four fragments. These are
transient effects, not interactive enemies.

### World and difficulty

The world alternates between open space and a broadside corridor formed by a
Colonial capital ship and a Cylon capital ship. The corridor scrolls through
engines, aft, combat, forward, and prow sections, followed by drain, complete,
and open-space transition states. Capital-ship engines alternate between dim
and bright phases, each lasting eight active frames.

Difficulty changes the measured vertical rates:

| Difficulty | World and hull | Near stars | Far stars | Debris |
| --- | ---: | ---: | ---: | ---: |
| Easy | 20 rows/s | 10 rows/s | 5 rows/s | 12 rows/s |
| Medium | 22.5 rows/s | 11.25 rows/s | 5.625 rows/s | 13.5 rows/s |
| Hard | 25 rows/s | 12.5 rows/s | 6.25 rows/s | 15 rows/s |

Broadside warnings, launch flashes, heavy projectiles, hull contact, and
capital explosions are implemented. World, stars, debris, and both hulls keep
their relative rates through sector transitions.

## Implemented boosters

Only one pickup capsule may exist at a time. A qualifying kill is specifically
a Raider destroyed by a consumed Viper projectile. Broadside fire, player
collision, debris destruction, and lifecycle cleanup do not advance the drop
counter.

The current implementation creates a pickup after every third qualifying kill.
The sequence is `Rapid Fire -> Spread Shot -> Shield -> Rapid Fire`; a new
game always starts the sequence with Rapid Fire. A successful kill starts a
30-frame hidden delay before the capsule becomes collectible. The current
three-kill cadence describes shipped behavior, not accepted final balance; a
separate owner-playtest tuning task is recorded in the roadmap.

Capsules are static, non-flickering 2x2-character objects that move with the
world. Picking up the same active type refreshes it. Picking up another type
replaces it, so Rapid Fire, Spread Shot, and Shield are mutually exclusive.
Pause freezes
their timers; life loss, Game Over, and New Game clear them; a live sector
transition preserves them.

The `BOOST` label and energy bar are driven by the active booster's own timer:
500 frames for Rapid/Spread or 250 for Shield. Picking up any type immediately
shows the full ten-cell
field with four energy segments; refreshing or replacing an active type also
returns it to four segments. Pause freezes both the timer and the current blink
phase.

### Rapid Fire — implemented

Rapid Fire lasts exactly 500 active PAL frames (10 seconds). It expands the
burst to ten projectiles, keeps the 12-frame post-burst pause, and reduces the
in-burst interval from three frames to two. Its projectiles retain the Viper's established
yellow/gold. The 2x2 capsule uses a steel/yellow casing with a black `RF` symbol.

### Spread Shot — implemented

Spread Shot lasts exactly 500 active PAL frames (10 seconds) and retains the
normal eight-salvo burst and 12-frame post-burst pause, but uses a ten-active-
frame cooldown between salvos; it never combines with Rapid Fire. With three
free slots a salvo creates centre, left, and right together. Under transitional
saturation the centre has priority, while the side pair is created together or
not at all. Continuous FIRE produces 49 salvos and 147 projectiles during the
500-frame boost, with no rejected full salvo in steady state and at most nine
simultaneous Spread projectiles in the ten-slot Viper pool.

The volley begins as a compact formation. The centre projectile travels
vertically; the side projectiles start four horizontal-position units from the
centre and move symmetrically left or right by one unit every two active frames.
The phase comes from the existing projectile lifetime, so no extra timer or
projectile-state array is required. All
three travel upward at the normal Viper speed, use the yellow Viper weapon
colour, collide with Raider and debris, and obey ordinary score rules. The 2x2
capsule has a bright red casing and a black three-shot fan symbol.

### Shield Booster — implemented

Shield lasts exactly 250 active PAL frames (5 seconds), keeps the normal weapon,
and uses a separate damage gate rather than extending hit or respawn
invulnerability. It absorbs at most one valid damage event per frame without
changing HULL, LIFE, SCORE, the ordinary damage cooldown, hit flash, or HULL-hit
SFX. The steel-blue/white capsule has a black shield symbol. Its continuous HUD
bar uses a dense cross-core pattern and exact thresholds 188, 126, and 63; the
last segment uses the shared timer's 8+8 blink phase. A solid steel/white Viper
colour pulse is derived from the same timer and never makes the craft disappear.

## Planned

### Nova Missile — planned

Nova Missile is a future boss-only special-weapon pickup, not a member of the
planned Rapid Fire / Spread Shot / Shield drop rotation. It may appear only
during a boss encounter, never in standard sectors or through the qualifying
Raider-kill counter. Its capsule is planned as a large, readable 2x2 missile.

Collecting it arms exactly one missile independently of the current weapon
booster and Shield. A held FIRE input at collection must not launch it: the
player must release FIRE and press it again. That next new press launches Nova
Missile instead of the normal shot, after which the Viper returns to its
preserved normal, Rapid Fire, or Spread Shot weapon state.

A boss hit is planned to trigger a large multi-phase space-detonation: a bright
central flash, yellow-red core, and expanding energy wave. Boss damage is
applied exactly once at detonation; later animation phases cannot deal damage
again. The weapon is intended to cause very high boss damage, but its exact
damage, guidance, speed, spawn condition, and pickup count remain deliberately
unspecified until boss lifecycle, boss HULL, and the large-explosion runtime
budget are designed together. Nova Missile is not present in the current
runtime.

Additional enemy archetypes, longer level structures, bosses, and further
audio/visual polish remain future work. They are not implied by the current
Raider descriptors or review-only asset records.
