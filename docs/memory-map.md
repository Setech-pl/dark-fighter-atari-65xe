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
| `$2000-$3123` | 4,388 B | resident `CODE` |
| `$3124-$3FFB` | 3,800 B | resident `RODATA` |
| `$5400-$54C9` | 202 B | `PROJECTILES`: 19 fighter slots, burst controllers, and two shared fighter explosions |
| `$552A-$5DF0` | 2,247 B | relocated `STARFIELD` runtime; 2,278 B reserved through `$5E0F` |
| `$5E10-$780F` | 6,656 B | relocated `BROADSIDE`/frontend/enemy/weapon runtime; exact reservation fit |
| `$8000-$80FF` | 256 B | `ENTITY_STATE` BSS |
| `$9000-$90FE` | 255 B | relocated A2 kernel; one byte reserved through `$90FF` |
| `$9100-$9D74` | 3,189 B | relocated `ENTITY_CODE`, including H3.1 display lists and frontend helpers; 3,840 B reserved through `$9FFF` |
| `$9D75-$9FF9` | 645 B | Hybrid Encounter Director code/common/Level 1 data |
| `$9FFA-$9FFF` | 6 B | untouched Director guard |
| `$21C1-$2667` | 1,191 B | boot-only `BOOT_STAGE2` overlay; replaced by the resident suffix before runtime |

The linked production runtime metric is `CODE + STARFIELD + BROADSIDE +
A2_KERNEL + ENTITY_CODE = 16,735 B`. With the late-published GLUE, DIRECTOR,
and their frozen integration accounting, simultaneous feature residency is
17,421 B and safe residency is 4,766 B.

The preceding difficulty-damage change emitted seven bytes: four in
`ENTITY_CODE` and three in resident `RODATA`. The 8 KiB `MAIN` file image is
fixed and fill-backed through `$3FFF`, so the three RODATA bytes consumed three
bytes of existing tail padding rather than enlarging that image. The manifest's
historical linked-runtime metric intentionally sums `CODE`, `STARFIELD`,
`BROADSIDE`, `A2_KERNEL`, and `ENTITY_CODE` (not `RODATA`), so it rose only by
the four ENTITY_CODE bytes, from 16,552 B to 16,556 B.

## Boot transport layout

The production Encounter Director transport is 19,456 bytes in 152 occupied
sectors. BRCNT loads the 12,928-byte/101-sector initial block at `$2000-$527F`;
the entry point remains `$201E`. Initial content is exactly 12,889 B and ends
immediately before the 39-byte GLUE transport staging range.

| Initial address / ATR sectors | Size | Stored form and startup destination |
| --- | ---: | --- |
| `$2000-$21C0` | 449 B | raw bootstrap prefix |
| `$21C1-$2667` | 1,191 B | stage-2 SIO/CRC/per-record-end/manifest overlay |
| `$2668-$4069` | 6,658 B | packed 7,743-byte resident suffix; staged at `$8100-$9B01` |
| `$406A-$4764` | 1,787 B | packed 2,247-byte starfield/music runtime; stages at `$7810` and expands to `$552A-$5DF0` |
| `$4765-$4863` | 255 B | A2 source; staged at `$7F16-$8014`, copied to `$9000-$90FE` before entity/effects clear |
| `$4864-$5254` | 2,545 B | packed 3,189-byte ENTITY_CODE; staged at `$5300-$5CF0`, expands to `$9100-$9D74` |
| `$5255-$5258` | 4 B | source-owned `DFB1` trailer; end of 12,889-byte content |
| `$5259-$527F` | 39 B | GLUE transport staging, held at `$7F16-$7F3C`, late-published to `$4EFE-$4F24` |
| ATR sectors 102-146 | 5,760 B | external BROADSIDE record: 5,671 B packed / 6,656 B raw to `$5E10-$780F` |
| ATR sector 147 | 128 B | GLUE record: 41 B packed / 39 B raw to staging `$5259` |
| ATR sectors 148-152 | 640 B | Director record: 587 B packed / 645 B raw to `$9D75-$9FF9` |

The `DFMC` v1 manifest is 62 B for the current three records and reserves 142 B
inside stage-2 for at most eight records. The ATR has 568 free sectors
(72,704 B). Runtime and transport budgets remain separate; current safe
residency is 4,766 B. The older 15,346-byte capacity reference remains useful
only as history; the production gate is the exact 16,735-byte linked runtime
and its explicit simultaneous-residency accounting.

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
| `$4EFE-$4F24` | 39 B | late-published integration glue |
| `$4F25-$4FFF` | 219 B | unassigned after loader |
| `$5000-$53FF` | 1,024 B | dedicated gameplay HUD charset |
| `$54CA-$5529` | 96 B | 24 far-star records |
| `$5DFD-$5E05` | 9 B | free tail of the starfield reservation |
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
| `$80F4-$80FF` | 12 B | persistent Encounter Director state, initialized after the entity/effects clear |
| `$8100-$9AFA` | 6,650 B | cold-start resident-suffix staging only |
| `$8100-$812F` | 48 B | exact physical-screen pointers for 24 rendered far stars after cold startup |
| `$8130-$8FFF` | 3,792 B | unowned after cold startup; retained reservation, not current gameplay state |
| `$9000-$90FE` | 255 B | A2 kernel |
| `$90FF` | 1 B | free A2 reservation tail |
| `$9100-$9D74` | 3,189 B | entity/effect/booster/projectile-composite and H3.1 frontend runtime |
| `$9D75-$9FF9` | 645 B | Hybrid Encounter Director |
| `$9FFA-$9FFF` | 6 B | untouched guard; not available capacity |
| `$A000-$BFFF` | 8,192 B | deliberately unused BASIC-ROM window |
| `$C000-$FFFF` | 16,384 B | OS ROM and I/O; not gameplay RAM |

Cold startup initializes every byte of `$8000-$80FF`. No current code, state,
charset, loader data, or staging buffer uses `$A000-$BFFF`.

## Boot-only ENTITY_CODE staging lifecycle

The packed initial sources end exclusively at `$5255`. ENTITY_CODE staging is
`$5300-$5CF0` (2,545 B), so the pre-staging margin is 171 B. Its end-exclusive
address `$5CF1` is 287 B below BROADSIDE at `$5E10`. The packed stream is copied
only after the initial block is resident, expanded to `$9100-$9D74`, and then
released. The later starfield destination `$552A-$5DF0` overlaps the released
staging range over `$552A-$5CF0` (1,991 B); it is never live concurrently with
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
