# Dark Fighter runtime architecture

This document describes the current released runtime. Exact address ownership
is in [memory-map.md](memory-map.md), performance evidence in
[runtime-headroom.md](runtime-headroom.md), and historical experiments in
[history/](history/).

## Target and artifact model

Dark Fighter targets a stock 64 KB Atari 65XE in PAL mode with documented NMOS
6502 instructions. The runtime owns the machine after startup, uses joystick
port 1, and schedules gameplay at 50 frames per second.

The build emits one exact 16,384-byte boot payload. The XEX wraps that payload
with standard segment and run-address records; the standard 90 KB single-density
ATR stores the same payload in 128 boot sectors. Build and
runtime tests bind both media to the same required payload bytes.

## Cold startup and loader

The payload enters at `$201E` with a 449-byte raw bootstrap prefix. The remaining
7,743-byte resident suffix is stored as a 6,457-byte LZ-10/5 stream. Startup
stages it at `$8100-$9A38` (the manifest records the inclusive end address),
expands broadside and relocated modules in dependency order, then
restores the resident image at `$21C1-$3FFF`.

The loader bitmap source is declarative. The build rasterizes 7,680 bytes for a
mixed ANTIC F/E screen and packs them to **1,997 bytes**. It expands to
`$4010-$5E0F`; a second LMS at `$5000` prevents a 4 KiB ANTIC boundary crossing.
A separate 35-byte stream expands the 202-byte loader display list to
`$3800-$38C9` only after the overlapping bitmap source has been consumed.

PMG DMA is disabled during the loader. Two DLIs select the title, ship, and
footer palette zones. The loader remains visible for 250 complete PAL frames
(5 seconds), then disables DMA/NMI, clears only the actual DMA pages
`$3B00-$3FFF`, and builds the frontend and gameplay memory.

Cold staging also copies:

- packed broadside/runtime data to its final `$5E10-$780C` run range;
- packed starfield/music data through `$7810-$7ED2` to `$552A-$5DB8`;
- the 226-byte A2 kernel through `$7F10-$7FF1` to `$9000-$90E1`;
- packed entity/effect code through `$5100-$57E5` to `$9100-$98FE`.

The BSS is exactly `$8000-$80FF` and is initialized deterministically. The
runtime does not use `$A000-$BFFF`; compatibility never assumes that BASIC ROM
has been banked out.

## Frontend and state transitions

After the loader, the program builds dedicated gameplay, frontend, and HUD
charsets. The frontend uses mixed ANTIC text modes and contains the menu,
options, top-scores, exit, pause, and Game Over states. Menu music and gameplay
music are independent deterministic POKEY sequences. OS VBI service remains
disabled after takeover; the production runtime enables only the required DLI
NMI path.

New Game performs a bounded state reset. Life loss resets life-scoped combat
state, while a live sector transition preserves session-scoped score and
booster state. Pause copies the visible screen to a reclaimed staging buffer
and freezes gameplay timers before resuming the same state.

## Display, scrolling, and frame publication

Gameplay uses a fixed ANTIC 2 HUD and divider plus 22 ANTIC 4 logical playfield
rows. Two 75-byte A2 display lists are built and published alternately. The
first DLI selects byte three of the active A2 list before playfield DMA; the
second restores HUD state and leaves the next frame's publication to the JVB.

Logical rows map to a 23-row physical ring. World and hull scroll operations
write the recycled physical row before the new list becomes visible. All A2
heads, row wrap, and the fixed HUD boundary are therefore handled without a
visible partial list.

Capital hulls are two independent 32x9 expanded maps assembled from engines,
aft, combat, forward, and prow modules. The broadside system owns warnings,
launch flashes, heavy projectiles, hull damage, and the sector lifecycle.
Engine pixels have two phases, `dim` and `bright`, held for eight active frames
each. Phase changes update source glyph rows atomically before a recycled base
row is published.

## Gameplay layers and backing

Every visible gameplay row is composed in this order:

`base -> broadside -> projectile -> entity -> effect`

Erase occurs in reverse order:

`effect -> entity -> projectile -> broadside -> base`

The base layer contains the current starfield and current capital-hull row.
Broadside overlays come next. Fighter projectiles, interactive entities, and
transient effects then save and restore their backing. A cell vacated by an
overlay must contain exactly the byte that the lower layers would have produced
in the same frame.

Spread Shot uses the common projectile path. For overlapping or diagonal
projectiles it composes slot-owned scratch glyphs from the current lower-layer
byte, including a capital hull that moved during the frame. Erase and redraw
are overlap-aware: one departing projectile cannot erase another live
projectile, and the last departing projectile restores the current broadside or
base byte. This contract covers module boundaries, prow, engines, every A2
head, and ring wrap.

## Bounded pools

| Pool | Physical capacity | Release active limit | Purpose |
| --- | ---: | ---: | --- |
| Viper projectiles | 10 | 10 | normal, Rapid Fire, and Spread Shot |
| Raider projectiles | 9 | 9 | single-pulse burst |
| Combined fighter projectiles | 19 | 19 | contiguous physical allocation |
| Broadside projectiles | 3 | production scheduler has 2 source turrets | capital fire |
| Interactive entities | 4 | 2 | debris plus one pickup capsule; controller/reserve slots remain non-rendered |
| Transient effects | 6 | 5 | one core plus four fragments |

Pool scans are bounded by compile-time counts. Spread Shot checks for three free
Viper slots before writing any of them; a rejected attempt preserves the
eight-salvo burst counter and is retried. Normal and Spread initialize an
eight-shot/eight-salvo burst at the normal three-frame interval. Rapid alone
initializes ten shots and uses its two-frame interval. All modes retain the
12-frame post-burst pause. The effects pool is not used for pickup capsules or
persistent projectile state.

## Enemies, debris, and boosters

The released ordinary enemy is the Raider. Its descriptor selects hit points,
score, pursuit profile, weapon profile, and PMG appearance. Raider projectiles
share the fighter-projectile state allocation but use separate slots, red
glyphs, collision ownership, and lifetime rules.

Debris is the implemented interactive entity in slot 0. It has bounded
trajectories, two shapes, two tumble phases, three hit points, contact damage,
and no score award. Its destruction and Raider breakup materialize into the
five-slot active effects envelope and are erased before lower layers move.

Slot 1 owns the sole 2x2 pickup capsule. A qualifying Viper-projectile Raider
kill advances the three-kill drop counter. The next-type bit alternates
successful capsule creation between Rapid Fire and Spread Shot, starting with
Rapid Fire on New Game. Slot 2 holds the non-rendered timed-booster controller
and next-type selector. Rapid Fire and Spread Shot are mutually exclusive,
500-active-frame states.

Rapid Fire uses the existing Viper projectile renderer and yellow colour bank.
Spread Shot uses three logical Viper projectiles: centre, left, and right. All
three use the yellow Viper colour. Side directions are encoded in the existing
render/state byte, avoiding another allocation.

## Character and PMG ownership

The gameplay charset has 128 occupied glyphs. Stars use 1-6, Viper projectile
phases 11-46, Spread Shot composite scratch 47-56, capital hulls 59-89,
Raider/projectile phases 90-109, debris 110-117, fragments 118-119, Rapid Fire
capsule 120-123, and Spread Shot capsule 124-127.

PMG base is `$3800`; active DMA pages are `$3B00-$3FFF`. P0 and P3 form the
Viper, P1 is the Raider, and P2 is its scanner. M1-M3 serve broadside warnings
and impacts. M0 remains reserved; current Viper weapons are ANTIC 4 overlays so
the ten-slot pool and yellow colour are independent of `COLPM0`.

## Determinism and verification

Build inputs are declarative and conversion scripts are deterministic. Runtime
randomness starts from fixed initialization and advances only through defined
gameplay paths. Tests exercise cold RAM fills `$A5` and `$5A`, XEX/ATR payload
parity, all A2 heads, pool saturation, lifecycle resets, overlay backing, and
the measured PAL wall. The machine-readable evidence is generated from the
packed release artifact, not from a separate preview model.

The rejected ANTIC 2 full-playfield experiment is archived in
[history/antic2-spike.md](history/antic2-spike.md); it is not part of this
architecture.
