# Dark Fighter runtime architecture

This document describes the current released runtime. Exact address ownership
is in [memory-map.md](memory-map.md), performance evidence in
[runtime-headroom.md](runtime-headroom.md), and historical experiments in
[history/](history/).

## Target and artifact model

Dark Fighter targets a stock 64 KB Atari 65XE in PAL mode with documented NMOS
6502 instructions. The runtime owns the machine after startup, uses joystick
port 1, and schedules gameplay at 50 frames per second.

The build emits a dynamic initial boot block plus a versioned `DFMC` extension
manifest. The standard 90 KB single-density ATR stores only the sectors actually
used; the XEX emits the same initial block, direct final-address extension
segments, and a separate XEX entry record. Candidate, trace, final-binding, and
verify phases bind the boot BIN, XEX, and ATR by exact size and SHA-256.

## Cold startup and loader

The 100-sector initial block enters at `$201E` with a 449-byte raw bootstrap
prefix. A 1,185-byte stage-2 overlay runs at `$21C1-$2661`; after it validates
the complete manifest, it reads extension sectors through standard OS SIOV
while OS IRQ/NMI and disk services are still available. Each chunk is fully
read, CRC16-CCITT checked, and only then copied or decompressed to its manifest-
controlled destination. Any failure blanks DMA, selects a fixed red error
background, and halts before partially loaded code can execute.

The first production migration moves the 5,661-byte packed BROADSIDE stream to
sectors 101-145. ATR stages its 5,760-byte sector image at `$8100-$977F`, checks
CRC `$05D8`, and expands 6,656 bytes to `$5E10-$780F`. The last BROADSIDE source
read makes `$8100` reusable; only then does startup copy the packed resident
suffix and stages it at `$8100-$9A9A`. The 7,743-byte suffix is stored as a
6,555-byte LZ-10/5 stream
and restores `$21C1-$3FFF`, overwriting all stage-2 code and its maximum
eight-record manifest. No loader byte remains resident or enters gameplay.

The manifest uses 16-bit sector numbers, supports eight sequential chunks, and
accepts RAW or LZ records. The current 100-sector initial block plus one 45-sector
extension use 145 sectors. Seven additional 50-sector chunks provide 44,800 B
of format/loader growth without padding; the ATR itself has 73,600 B free.

### DFMC v1 byte format

| Offset | Bytes | Meaning |
| ---: | ---: | --- |
| 0 | 4 | ASCII `DFMC` |
| 4 | 1 | format version, currently 1 |
| 5 | 1 | header size, 12 |
| 6 | 1 | chunk count, 1..8 |
| 7 | 1 | record size, 16 |
| 8 | 2 | total occupied ATR sectors, little-endian |
| 10 | 2 | actual manifest length, little-endian |
| 12 | 16 × count | sequential chunk records |
| final 2 | 2 | CRC16-CCITT of every preceding manifest byte, little-endian |

Each 16-byte record stores, in order: 16-bit start sector, 16-bit sector count,
16-bit packed length, 16-bit raw length, 16-bit final destination, 16-bit CRC of
the complete sector image, one-byte type (`0=RAW`, `1=LZ`), one-byte controlled
staging identifier, and a 16-bit staging address. All words are little-endian.
Production record 0 is `{101,45,5661,6656,$5E10,$05D8,1,1,$8100}`.

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

- validated external broadside/runtime data to `$5E10-$780F` before takeover;
- packed starfield/music data through `$7810-$7EFA` to `$552A-$5DE1`;
- the 207-byte A2 kernel through `$7F10-$7FDE` to `$9000-$90CE`;
- packed entity/effect/frontend code through boot-only staging at `$5300-$5CEE`
  to the resident `$9100-$9FFF` range. The staging write begins only after the
  initial packed source ending at `$51A5` has been consumed. Its end-exclusive
  `$5CEF` remains 289 bytes below the BROADSIDE destination at `$5E10`.

The initial packed sources end exclusively at `$51A6`, leaving 346 bytes before
the `$5300` staging start. Startup copies ENTITY_CODE there, expands the stream
to its current live `$9100-$9D74` range, and immediately releases the staging
range. `unpack_loader_bitmap` may then overwrite it while preparing the loader;
after the loader display completes, `unpack_starfield_runtime` expands to
`$552A-$5DE1`, overlapping 1,989 bytes of the already inactive ENTITY_CODE
staging range. This ordering is mandatory; the overlap is temporal, not
simultaneous residency.

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

The production H3.1 frontend uses one 1 KiB charset at `$4800` and limits all
ANTIC 6/7 screen codes to glyphs 0-63. Large headings use ANTIC 7, menu/data
rows use ANTIC 6, structural rows use ANTIC 4, and the two small control hints
use ANTIC 2. Main Menu and Options each have one DLI to select the monochrome
hint palette; TOP SCORES and Game Over use no DLI. The menu Viper is a 3x2
ANTIC 4 character figure in glyphs 58-63, so frontend PMG remains disabled.

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
and no score award. Player/debris contact uses the full 16-HPOS width of the
double-width Viper PMG, while retaining the existing vertical player envelope
and 8x8 debris box. Its single accepted damage event indexes a three-byte
Easy/Medium/Hard table containing 2/5/7 HULL units, then uses the canonical
atomic saturating damage/death/HUD path. Its destruction and Raider breakup
materialize into the five-slot active effects envelope and are erased before
lower layers move. The difficulty lookup replaces the former immediate load
with `LDX abs` plus `LDA abs,X`: +6 CPU cycles only after a geometric overlap
passes the earlier latch check, with no cost on inactive or collision-miss
paths and no persistent-RAM allocation.

Slot 1 owns the sole 2x2 pickup capsule. A qualifying Viper-projectile Raider
kill advances the three-kill drop counter. The next-type selector rotates
successful capsule creation through Rapid Fire, Spread Shot, and Shield,
starting with Rapid Fire on New Game. Slot 2 holds the non-rendered timed-
booster controller and next-type selector. All three states are mutually
exclusive. Rapid Fire and Spread Shot last 500 active frames; Shield lasts 250.

The fixed ANTIC 2 HUD uses cells `$4019-$401C` for four permanent HULL plates.
Glyph 5 is a low intact plate and glyph 12 a low cracked plate; the stored
0-10 health value selects solid quarters at thresholds 3, 5, 8, and 10. The
full `HULL` label stays at cells 20-23 and the plate field never blinks or
disappears.

Cells `$401E-$4027` are the complete ten-cell booster presentation: `BOOST`, a
blank separator, and four tall energy glyphs at cells `$4024-$4027`. The
optional type glyph is not allocated because no twelfth free cell exists.
Glyph 7 supplies the narrow vertical weapon-energy shape; Shield uses the
formally reserved dense cross-core glyph 8. Segment thresholds are exact
quarters of the active type's 16-bit timer (500 or 250 frames). Below 25%,
timer bit 3 supplies the 8+8 blink phase, so pause freezes the indicator naturally. Ten
writable backing bytes at `$5E06-$5E0F` preserve and restore the complete prior
field across refresh, replacement, expiry, life loss, and teardown. No PMG,
bitmap overlay, DLI, palette, or gameplay-charset allocation is involved.

Rapid Fire uses the existing Viper projectile renderer and yellow colour bank.
Spread Shot uses three logical Viper projectiles: centre, left, and right. All
three use the yellow Viper colour. Side directions are encoded in the existing
render/state byte, and the parity of the existing lifetime supplies their
one-HPOS-per-two-updates fixed phase, avoiding another allocation.

Shield leaves the normal weapon cadence active. Its separate state is checked
after `PLAYER_ALIVE` and before the ordinary 25-frame damage cooldown. A valid
absorption consumes the frame's one damage event without changing HULL, LIFE,
SCORE, hit flash, cooldown, or HULL-hit SFX. Raider shots disappear, broadside
shots enter their established impact state, debris is consumed, and Raider or
hull-contact side effects retain their prior behavior. The Shield timer also
drives a solid COLPM0/COLPM3 steel/white pulse; it never hides the Viper and is
therefore distinct from respawn invulnerability.

## Character and PMG ownership

The gameplay charset has 128 occupied glyphs. Stars use 1-6, Viper projectile
phases 11-46, Spread Shot composite scratch 47-56, capital hulls 59-89,
Raider/projectile phases 90-109, debris 110-117, fragments 118-119, Rapid Fire
capsule 120-123, and a single-owner dynamic Spread/Shield capsule bank 124-127.

The separate `$5000-$53FF` HUD charset keeps glyph 0 as the blank/separator,
uses glyphs 5 and 12 for the two low HULL plate states, glyph 7 for weapon
energy, and glyph 8 for the distinct continuous Shield bar. Digits and letters
retain their existing allocations and colours.

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
