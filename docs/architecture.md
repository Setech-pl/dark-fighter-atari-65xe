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
ATR stores the same payload in 128 boot sectors. Candidate, trace, final-binding,
and verify phases bind the boot BIN, XEX, and ATR by exact size and SHA-256.

## Cold startup and loader

The payload enters at `$201E` with a 449-byte raw bootstrap prefix. The remaining
7,743-byte resident suffix is stored as a 6,515-byte LZ-10/5 stream. Startup
stages it at `$8100-$9A53` (the manifest records the inclusive end address),
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

- packed broadside/runtime data to its final `$5E10-$77B8` run range;
- packed starfield/music data through `$7810-$7EFA` to `$552A-$5DE1`;
- the 207-byte A2 kernel through `$7F10-$7FDE` to `$9000-$90CE`;
- packed entity/effect code through `$5140-$5852` to `$9100-$9929`.

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

TOP SCORES owns ten two-byte packed-BCD records in RAM. The final score is
inserted exactly once when the player lifecycle enters Game Over; a first-to-last
scan preserves descending order, places ties after existing equals, and shifts
both BCD fields together. The renderer reads all ten records rather than
synthesizing nine zero rows. The worst insertion executes once at Game Over and
costs 516 NMOS 6502 cycles; it is outside the visible gameplay loop and VBI. No
disk persistence is performed.

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

Pool scans are bounded by compile-time counts. Spread Shot admits its centre
whenever at least one Viper slot is free and admits the two side shots only as
an atomic pair. Its ten-frame cooldown is the minimum safe value for the
28-update maximum legal projectile lifetime: nine frames can reach a
centre-only tenth slot, while ten frames holds the steady state to three full
salvos and nine projectiles. Normal and Spread initialize an eight-shot/eight-
salvo burst; Normal uses a three-frame interval, Spread ten, and Rapid alone
initializes ten shots at two frames. All modes retain the 12-frame post-burst
pause. The effects pool is not used for pickup capsules or persistent
projectile state.

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

The fixed ANTIC 2 HUD uses cells `$4019-$401C` for four permanent HULL plates.
Glyph 5 is a low intact plate and glyph 12 a low cracked plate; the stored
0-10 health value selects solid quarters at thresholds 3, 5, 8, and 10. The
full `HULL` label stays at cells 20-23 and the plate field never blinks or
disappears.

Cells `$401E-$4027` are the complete ten-cell booster presentation: `BOOST`, a
blank separator, and four tall energy glyphs at cells `$4024-$4027`. The
optional type glyph is not allocated because no twelfth free cell exists.
Glyph 7 supplies the narrow vertical energy shape. Segment thresholds are
exact quarters of the same 16-bit 500-frame booster timer. Below 25%, timer bit
3 supplies the 8+8 blink phase, so pause freezes the indicator naturally. Ten
writable backing bytes at `$5E06-$5E0F` preserve and restore the complete prior
field across refresh, replacement, expiry, life loss, and teardown. No PMG,
bitmap overlay, DLI, palette, or gameplay-charset allocation is involved.

Rapid Fire uses the existing Viper projectile renderer and yellow colour bank.
Spread Shot uses three logical Viper projectiles: centre, left, and right. All
three use the yellow Viper colour. Side directions are encoded in the existing
render/state byte, and the parity of the existing lifetime supplies their
one-HPOS-per-two-updates fixed phase, avoiding another allocation.

## Character and PMG ownership

The gameplay charset has 128 occupied glyphs. Stars use 1-6, Viper projectile
phases 11-46, Spread Shot composite scratch 47-56, capital hulls 59-89,
Raider/projectile phases 90-109, debris 110-117, fragments 118-119, Rapid Fire
capsule 120-123, and Spread Shot capsule 124-127.

The separate `$5000-$53FF` HUD charset keeps glyph 0 as the blank/separator,
uses glyphs 5 and 12 for the two low HULL plate states, and glyph 7 for the tall
BOOST energy cell. Digits and letters retain their existing allocations and
colours.

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
packed runtime, not from a separate preview model. `build:candidate`
deliberately publishes a manifest that cannot pass final verification. The
trace generator must complete every required replay and bind the exact boot
BIN, XEX, and ATR. A normal build then creates the final binding, including the
report hash; `verify` rejects a candidate manifest, a partial session set, an
artifact mismatch, a failed gate, or later report drift. No force flag can
bypass these phases.

The wall profiler observes exported zero-byte address symbols from the host
emulator. It adds no guest instructions, writes no release state, and records a
disjoint subsystem split for the global maximum. Separate legal no-fire cadence
sessions prove a complete debris lifecycle on EASY, MEDIUM, and HARD while
combat sessions retain firing coverage.

The rejected ANTIC 2 full-playfield experiment is archived in
[history/antic2-spike.md](history/antic2-spike.md); it is not part of this
architecture.
