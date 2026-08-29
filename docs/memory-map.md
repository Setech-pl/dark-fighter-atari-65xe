# Current memory map

This is one current snapshot. Addresses and linked sizes come from
`build/dark-fighter.map`; packed sizes, staging ranges, artifacts, and reserves
come from `build/manifest.json`. Overlapping ranges below have different
lifetime phases and are not additive free memory.

## Linked segments

| Range | Size | Current owner |
| --- | ---: | --- |
| `$0080-$009F` | 32 B | zero-page runtime variables |
| `$0100-$01FF` | 256 B | 6502 stack |
| `$0200-$03FF` | 512 B | OS workspace and vectors |
| `$2000-$30AF` | 4,272 B | resident `CODE` |
| `$30B0-$3F87` | 3,800 B | resident `RODATA` |
| `$5400-$54C9` | 202 B | `PROJECTILES`: 19 fighter slots, burst controllers, and two shared fighter explosions |
| `$552A-$5DE1` | 2,232 B | relocated `STARFIELD` runtime; 2,278 B reserved through `$5E0F` |
| `$5E10-$780F` | 6,656 B | relocated `BROADSIDE`/frontend/enemy/weapon runtime; exact reservation fit |
| `$8000-$80FF` | 256 B | `ENTITY_STATE` BSS |
| `$9000-$90CE` | 207 B | relocated A2 kernel; 256 B reserved through `$90FF` |
| `$9100-$9D74` | 3,189 B | relocated `ENTITY_CODE`, including H3.1 display lists and frontend helpers; 3,840 B reserved through `$9FFF` |
| `$21C1-$2661` | 1,185 B | boot-only `BOOT_STAGE2` overlay; replaced by the resident suffix before runtime |

The linked runtime/code/data budget is `CODE + STARFIELD + BROADSIDE +
A2_KERNEL + ENTITY_CODE = 16,556 B`.

The preceding difficulty-damage change emitted seven bytes: four in
`ENTITY_CODE` and three in resident `RODATA`. The 8 KiB `MAIN` file image is
fixed and fill-backed through `$3FFF`, so the three RODATA bytes consumed three
bytes of existing tail padding rather than enlarging that image. The manifest's
historical linked-runtime metric intentionally sums `CODE`, `STARFIELD`,
`BROADSIDE`, `A2_KERNEL`, and `ENTITY_CODE` (not `RODATA`), so it rose only by
the four ENTITY_CODE bytes, from 16,552 B to 16,556 B.

## Boot transport layout

The production transport is 18,560 bytes in 145 occupied sectors. BRCNT is
dynamic and loads only the 12,800-byte/100-sector initial block at `$2000-$51FF`;
the entry point remains `$201E`. The last-sector envelope is 65 bytes of
source-owned metadata/fill required by sector alignment, not reserved capacity.

| Initial address / ATR sectors | Size | Stored form and startup destination |
| --- | ---: | --- |
| `$2000-$21C0` | 449 B | raw bootstrap prefix |
| `$21C1-$2661` | 1,185 B | stage-2 SIO/CRC/manifest overlay; later restored resident bytes replace it |
| `$2662-$4011` | 6,576 B | packed 7,743-byte resident suffix; staged at `$8100-$9AAF`, restored to `$21C1-$3FFF` |
| `$4012-$46FC` | 1,771 B | packed 2,232-byte starfield/music runtime; staged at `$7810-$7EFA`, expands to `$552A-$5DE1` |
| `$46FD-$47CB` | 207 B | A2 kernel source; staged at `$7F10-$7FDE`, copied to `$9000-$90CE` |
| `$47CC-$51BA` | 2,543 B | packed 3,189-byte entity/effect/H3.1/H4.1 runtime; staged at `$5300-$5CEE`, expands to `$9100-$9D74` |
| `$51BB-$51BE` | 4 B | source-owned `DFB1` trailer |
| `$51BF-$51FF` | 65 B | dynamic `DFI2` initial-sector envelope; remains below ENTITY_CODE staging at `$5300` |
| ATR sectors 101-145 | 5,760 B | external BROADSIDE chunk: 5,661 B LZ plus `DFC2` footer/fill; stage `$8100-$977F`, final `$5E10-$780F` |

The `DFMC` v1 manifest is 30 B for the current one record and reserves 142 B
inside stage-2 for at most eight records. The ATR has 575 free sectors
(73,600 B). With the current eight-record/50-sector-per-chunk loader limits,
seven further chunks provide 44,800 B additional transport capacity. Runtime
residency has a 6,841-byte architectural ceiling and 5,631 B currently remain.
The capacity model uses the 15,346-byte pre-Shield linked-runtime checkpoint as
its common reference. The accepted `e63cbf2` image was 15,624 B, so it had
already consumed 278 B of that capacity and left 6,563 B. H3.1 raises the
linked runtime to 16,556 B: a 932-byte net increase over `e63cbf2`, and a
1,210-byte cumulative charge against the common reference. Therefore the
remaining safe residency is `6,841 - 1,210 = 5,631 B`. The manifest does not
identify the 278-byte checkpoint charge as a standalone legacy-frontend
footprint, so it must not be reported as one.

## Loader-time ownership

| Range | Size | Loader role |
| --- | ---: | --- |
| `$3315-$3337` | 35 B | packed 202-byte loader display-list source |
| `$37B8-$3F84` | 1,997 B | packed loader-bitmap source |
| `$3800-$38C9` | 202 B | expanded loader display list after its overlapping source has been consumed |
| `$4010-$4FFF` | 4,080 B | bitmap lines 0-101 |
| `$5000-$5E0F` | 3,600 B | bitmap lines 102-191 via second LMS at `$5000` |

The raw mixed ANTIC F/E bitmap is 7,680 B. PMG and PMG DMA are disabled during
this lifetime.

## Post-loader low and display memory

| Range | Size | Gameplay/frontend owner |
| --- | ---: | --- |
| `$3800-$3AFF` | 768 B | non-DMA resident/loader data in the PMG base window |
| `$3B00-$3FFF` | 1,280 B | active single-line PMG DMA pages |
| `$4000-$43FF` | 1,024 B | shared gameplay/frontend screen RAM |
| `$4400-$47FF` | 1,024 B | gameplay charset |
| `$4800-$4BFF` | 1,024 B | frontend charset |
| `$4C00-$4D1F` | 288 B | expanded Colonial hull map, 32x9 |
| `$4D20-$4E3F` | 288 B | expanded Cylon hull map, 32x9 |
| `$4E40-$4E70` | 49 B | persistent runtime state through difficulty setting |
| `$4E71-$4ECA` | 90 B | hull scroll, backing, sector, lifecycle, music, muzzle, score, and two-phase engine state |
| `$4ECB-$4ED6` | 12 B | Raider, damage, and starfield scalar state |
| `$4ED7-$4ED8` | 2 B | compatibility pad retaining established music/muzzle addresses |
| `$4ED9-$4EE9` | 17 B | menu/gameplay music and tracked-muzzle state |
| `$4EEA-$4EFD` | 20 B | ten TOP SCORES records as parallel packed-BCD low/high arrays |
| `$4EFE-$4FFF` | 258 B | unassigned after loader |
| `$5000-$53FF` | 1,024 B | dedicated gameplay HUD charset |
| `$54CA-$5529` | 96 B | 24 far-star records |
| `$5DE2-$5E05` | 36 B | free tail of the starfield reservation |
| `$5E06-$5E0F` | 10 B | exact prior-content backing for HUD cells `$401E-$4027` while BOOST is active |
| `$7803-$780F` | 13 B | free tail of the broadside reservation |
| `$7810-$7BCF` | 960 B | pause-screen backup after cold staging is consumed |
| `$7BD0-$7F0F` | 832 B | unassigned remainder of the cold starfield staging reservation |
| `$7F10-$7F5A` | 75 B | A2 display list A |
| `$7F5B-$7FA5` | 75 B | A2 display list B |
| `$7FA6-$7FD1` | 44 B | 22 low and 22 high logical-to-physical row bytes |
| `$7FD2-$7FDA` | 9 B | A2 list/ring state |
| `$7FDB-$7FFF` | 37 B | unassigned |

## BSS and high relocated runtime

| Range | Size | Current owner |
| --- | ---: | --- |
| `$8000-$805F` | 96 B | four physical interactive-entity slots plus global state; release active limit 2 |
| `$8060-$807F` | 32 B | initialized alignment/reserve |
| `$8080-$80F3` | 116 B | six physical effect slots plus global state; release active limit 5 |
| `$80F4-$80FF` | 12 B | initialized BSS tail |
| `$8100-$9A79` | 6,522 B | cold-start resident-suffix staging only |
| `$8100-$812F` | 48 B | exact physical-screen pointers for 24 rendered far stars after cold startup |
| `$8130-$8FFF` | 3,792 B | unowned after cold startup; retained reservation, not current gameplay state |
| `$9000-$90CE` | 207 B | A2 kernel |
| `$90CF-$90FF` | 49 B | free A2 reservation tail |
| `$9100-$9D74` | 3,189 B | entity/effect/booster/projectile-composite and H3.1 frontend runtime |
| `$9D75-$9FFF` | 651 B | free entity-code reservation tail after cold staging |
| `$A000-$BFFF` | 8,192 B | deliberately unused BASIC-ROM window |
| `$C000-$FFFF` | 16,384 B | OS ROM and I/O; not gameplay RAM |

Cold startup initializes every byte of `$8000-$80FF`. No current code, state,
charset, loader data, or staging buffer uses `$A000-$BFFF`.

## Boot-only ENTITY_CODE staging lifecycle

The packed initial sources end exclusively at `$51BB`. ENTITY_CODE staging is
`$5300-$5CEE` (2,543 B), so the pre-staging margin is 325 B. Its end-exclusive
address `$5CEF` is 289 B below BROADSIDE at `$5E10`. The packed stream is copied
only after the initial block is resident, expanded to `$9100-$9D74`, and then
released. The later starfield destination `$552A-$5DE1` overlaps the released
staging range over `$552A-$5CEE` (1,989 B); it is never live concurrently with
the packed ENTITY_CODE source. Loader-resident RAM after startup remains 0 B.

## PMG ownership

| Range | Owner after loader |
| --- | --- |
| `$3B00-$3BFF` | missiles: M0 reserved for player weapon; M1-M3 broadside warning/impact |
| `$3C00-$3CFF` | P0 Viper hull |
| `$3D00-$3DFF` | P1 Raider |
| `$3E00-$3EFF` | P2 Raider scanner |
| `$3F00-$3FFF` | P3 Viper engine |

Current Viper projectiles are ANTIC 4 overlays. The shared fighter allocation is
ten Viper slots plus nine Raider slots; broadside owns a separate three-slot
pool.

## Gameplay charset allocation

All 128 glyphs are allocated.

| Glyphs | Owner |
| --- | --- |
| 0 | blank |
| 1-6 | far/near stars |
| 7-10 | Viper body helpers |
| 11-46 | Viper projectile phases |
| 47-56 | Spread Shot overlap-composite scratch |
| 57-58 | gameplay helpers |
| 59-89 | capital hulls |
| 90-109 | Raider and Raider-projectile phases |
| 110-117 | debris |
| 118-119 | transient fragments |
| 120-123 | Rapid Fire capsule |
| 124-127 | dynamic Spread Shot or Shield capsule; erase precedes glyph ownership transfer |

Build-time range assertions, linker overlap checks, payload parity tests, and
cold-RAM tests are the enforcement mechanism for this snapshot.
