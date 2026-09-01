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
The post-loader frontend uses the accepted Showcase Tactical Lite hierarchy:
large display headings, wide 20-column options/data, one restrained steel
structure, amber values, and green only for the active action. TOP SCORES
continues to show the ten live RAM records, and Game Over shows the live final
and top scores rather than demonstration data.

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
- The hull has ten health units. An ordinary Raider pulse removes one unit
  (10%), while capital-ship fire removes two units (20%). Debris contact removes
  a fixed two, five, or seven units on Easy, Medium, or Hard (20%/50%/70% of
  maximum HULL); it never computes a percentage of remaining HULL. Debris
  contact tests the Viper's complete double-width 16-HPOS visible envelope;
  its vertical contract and the debris 8x8 hitbox remain unchanged.
- An accepted direct Raider collision destroys the current Viper at any HULL
  from one through ten. Shield absorbs it; respawn invulnerability, the shared
  post-hit cooldown, and an earlier same-frame damage event retain their normal
  gates. The Raider still follows its established scored breakup lifecycle.
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
no points. Debris has three hit points, causes fixed 20%/50%/70% maximum-hull
damage on Easy/Medium/Hard contact, and never awards score when destroyed.

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

| Difficulty | World/scene and hull | Far stars | Debris |
| --- | ---: | ---: | ---: |
| Easy | 20 rows/s | 5 rows/s | 12 rows/s |
| Medium | 22.5 rows/s | 5.625 rows/s | 13.5 rows/s |
| Hard | 25 rows/s | 6.25 rows/s | 15 rows/s |

Broadside warnings, launch flashes, heavy projectiles, hull contact, and
capital explosions are implemented. World, stars, debris, and both hulls keep
their relative rates through sector transitions. Once the last capital row has
left the screen, the ordinary full-width background still advances at the
listed world rate. Far-star overlays retain their 25% logical parallax step;
no capital lifecycle state changes the physical scene cadence.

## Implemented boosters

Only one pickup capsule may exist at a time. A qualifying kill is specifically
a Raider destroyed by a consumed Viper projectile. Broadside fire, player
collision, debris destruction, and lifecycle cleanup do not advance the drop
counter.

The current implementation creates a pickup after every third qualifying kill.
The sequence is `Rapid Fire -> Spread Shot -> Shield -> Rapid Fire`; a new
game always starts the sequence with Rapid Fire. A successful kill creates the
capsule wholly above the playfield at Y=8. Its 30-frame PENDING delay, including
any admission retry, remains at that off-screen coordinate. Admission publishes
the capsule at the first fully visible position, Y=24; it then crosses every
scanline phase through Y=190 and releases its slot at exactly Y=192. Thus
PENDING cannot consume any collectible screen travel. The current three-kill
cadence describes shipped behavior, not accepted final balance; a separate
owner-playtest tuning task is recorded in the roadmap.

Each type is one logical slot and exactly one non-flickering visual capsule.
Its shifted 8x16 source occupies a 2x2 footprint at phase zero and a 2x3
footprint between character rows. HARD moves it exactly two scanlines per PAL
frame; EASY and MEDIUM retain their slower fractional rates without an
eight-scanline jump. The collection hitbox follows the same effective visual
Y. During contact the Viper's opaque hull/engine pixels remain in front, while
transparent PMG pixels reveal the capsule until the single accepted collection
removes it. Picking up the same active type
refreshes it. Picking up another type
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

## Encounter Director Level 1

The production Hybrid Encounter Director advances from world rows rather than
wall-clock time. Level 1 is exactly 3,712 rows with contiguous, end-exclusive
phase boundaries:

| Phase | World rows | EASY time | MEDIUM time | HARD time |
| --- | ---: | ---: | ---: | ---: |
| Intro | 0-128 | 0.0-6.4 s | 0.0-5.7 s | 0.0-5.1 s |
| Raider training | 128-576 | 6.4-28.8 s | 5.7-25.6 s | 5.1-23.0 s |
| Debris field | 576-1056 | 28.8-52.8 s | 25.6-46.9 s | 23.0-42.2 s |
| Mixed pressure | 1056-1664 | 52.8-83.2 s | 46.9-74.0 s | 42.2-66.6 s |
| Recovery | 1664-1856 | 83.2-92.8 s | 74.0-82.5 s | 66.6-74.2 s |
| Capital/broadside escalation | 1856-2752 | 92.8-137.6 s | 82.5-122.3 s | 74.2-110.1 s |
| Recovery | 2752-2944 | 137.6-147.2 s | 122.3-130.8 s | 110.1-117.8 s |
| Final approach | 2944-3712 | 147.2-185.6 s | 130.8-165.0 s | 117.8-148.5 s |

The intensity budgets are 3/4/5 for EASY/MEDIUM/HARD. The Director has a
private deterministic RNG and does not consume the game's existing random
state. It owns admission policy and budgets while the existing Raider, debris,
broadside, pickup, object-pool, and destruction lifecycles retain object
ownership. With no boss consumer, `BOSS_HANDOFF` closes admissions and pickup
state, enters DRAIN, lets active objects expire, and emits exactly one
`LEVEL COMPLETE`; it never creates a boss.

The Layout D.2 behavioral correction makes BROADSIDE admission transactional:
failed pool or muzzle attempts leave intensity unchanged, a committed projectile
charges exactly two units, and its lifecycle releases exactly two. Natural
final-approach handoff from post-capital OPEN enters DRAIN, preserves active
objects until their normal cleanup, and leaves the single COMPLETE state terminal.

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
