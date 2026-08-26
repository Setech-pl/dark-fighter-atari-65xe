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

The gameplay HUD contains `SCORE`, `LIFE`, and `HULL`.

- A new game starts with three playable Vipers and a full 100% hull.
- The hull has ten health units. Ordinary Raider pulse and debris contact damage
  remove one unit (10%); capital-ship fire removes two units (20%).
- A direct Raider collision destroys the current Viper.
- Losing a Viper plays a 24-frame breakup. If a life remains, the replacement
  Viper receives 250 active frames (5 seconds) of invulnerability and blinks in
  an 8-frame visible/8-frame hidden rhythm.
- Losing the final Viper enters Game Over. New Game resets score, lives, hull,
  sector state, active projectiles, entities, effects, and boosters.
- The session top score persists across New Game and is cleared only by a cold
  program start.

### Combat and scoring

The normal Viper weapon fires a ten-projectile burst at one projectile every
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
The sequence is `Rapid Fire -> Spread Shot -> Rapid Fire -> Spread Shot`; a new
game always starts the sequence with Rapid Fire. A successful kill starts a
30-frame hidden delay before the capsule becomes collectible. The current
three-kill cadence describes shipped behavior, not accepted final balance; a
separate owner-playtest tuning task is recorded in the roadmap.

Capsules are static, non-flickering 2x2-character objects that move with the
world. Picking up the same active type refreshes it. Picking up the other type
replaces it, so Rapid Fire and Spread Shot are mutually exclusive. Pause freezes
their timers; life loss, Game Over, and New Game clear them; a live sector
transition preserves them.

### Rapid Fire — implemented

Rapid Fire lasts exactly 500 active PAL frames (10 seconds). It keeps the
ten-shot burst and 12-frame post-burst pause but reduces the in-burst interval
from three frames to two. Its projectiles use the established rapid-fire red.
The 2x2 capsule uses a steel/yellow casing with a black `RF` symbol.

### Spread Shot — implemented

Spread Shot lasts exactly 500 active PAL frames (10 seconds) and retains the
normal firing cadence; it never combines with Rapid Fire. Each trigger event is
atomic: it either allocates three free Viper slots or creates no projectile.

The volley begins as a compact formation. The centre projectile travels
vertically; the side projectiles start four horizontal-position units from the
centre and move symmetrically left or right by two units per active frame. All
three travel upward at the normal Viper speed, use the yellow Viper weapon
colour, collide with Raider and debris, and obey ordinary score rules. The 2x2
capsule has a bright red casing and a black three-shot fan symbol.

## Planned

### Shield Booster — planned

Shield Booster is the intended third pickup type. Its duration, replacement
rules, visual language, memory cost, and balance must be specified and measured
before implementation. It is not present in the current runtime.

Additional enemy archetypes, longer level structures, bosses, and further
audio/visual polish remain future work. They are not implied by the current
Raider descriptors or review-only asset records.
