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
| `$2000-$3093` | 4,244 B | resident `CODE` |
| `$3094-$3F68` | 3,797 B | resident `RODATA` |
| `$5400-$54C9` | 202 B | `PROJECTILES`: 19 fighter slots, burst controllers, and two shared fighter explosions |
| `$552A-$5DB8` | 2,191 B | relocated `STARFIELD` runtime; 2,278 B reserved through `$5E0F` |
| `$5E10-$780C` | 6,653 B | relocated `BROADSIDE`/frontend/enemy/weapon runtime; 6,656 B reserved through `$780F` |
| `$8000-$80FF` | 256 B | `ENTITY_STATE` BSS |
| `$9000-$90E1` | 226 B | relocated A2 kernel; 256 B reserved through `$90FF` |
| `$9100-$9912` | 2,067 B | relocated `ENTITY_CODE`; 3,840 B reserved through `$9FFF` |

The linked runtime/code/data budget is `CODE + STARFIELD + BROADSIDE +
A2_KERNEL + ENTITY_CODE = 15,381 B`.

## Boot payload layout

The boot payload is exactly 16,384 bytes loaded at `$2000-$5FFF` in 128 sectors.
Its entry point is `$201E`.

| Payload range on entry | Size | Stored form and startup destination |
| --- | ---: | --- |
| `$2000-$21C0` | 449 B | raw bootstrap prefix |
| `$21C1-$3AFF` | 6,463 B | packed 7,743-byte resident suffix; staged at `$8100-$9A3E`, restored to `$21C1-$3FFF` |
| `$3B00-$50FE` | 5,631 B | packed 6,653-byte broadside runtime; expands to `$5E10-$780C` |
| `$50FF-$57C1` | 1,731 B | packed 2,191-byte starfield/music runtime; staged at `$7810-$7ED2`, expands to `$552A-$5DB8` |
| `$57C2-$58A3` | 226 B | A2 kernel source; staged at `$7F10-$7FF1`, copied to `$9000-$90E1` |
| `$58A4-$5F9D` | 1,786 B | packed 2,067-byte entity/effect code; staged at `$5100-$57F9`, expands to `$9100-$9912` |
| `$5F9E-$5FFB` | 94 B | source-owned zero-filled reserve |
| `$5FFC-$5FFF` | 4 B | source-owned `DFB1` trailer |

The 94-byte range is real payload reserve, not formatter padding. Formatter
padding is zero.

## Loader-time ownership

| Range | Size | Loader role |
| --- | ---: | --- |
| `$33CA-$33EC` | 35 B | packed 202-byte loader display-list source |
| `$3831-$3FFD` | 1,997 B | packed loader-bitmap source |
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
| `$4ECB-$4EE9` | 31 B | Raider, damage, starfield, score/music, and muzzle state |
| `$4EEA-$4FFF` | 278 B | unassigned after loader |
| `$5000-$53FF` | 1,024 B | dedicated gameplay HUD charset |
| `$54CA-$5529` | 96 B | 24 far-star records |
| `$5DB9-$5E0F` | 87 B | free tail of the starfield reservation |
| `$780D-$780F` | 3 B | free tail of the broadside reservation |
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
| `$8100-$9A3E` | 6,463 B | cold-start resident-suffix staging only |
| `$8100-$8FFF` | 3,840 B | unowned after cold startup; retained reservation, not current gameplay state |
| `$9000-$90E1` | 226 B | A2 kernel |
| `$90E2-$90FF` | 30 B | free A2 reservation tail |
| `$9100-$9912` | 2,067 B | entity/effect/booster/projectile-composite runtime |
| `$9913-$9FFF` | 1,773 B | free entity-code reservation tail after cold staging |
| `$A000-$BFFF` | 8,192 B | deliberately unused BASIC-ROM window |
| `$C000-$FFFF` | 16,384 B | OS ROM and I/O; not gameplay RAM |

Cold startup initializes every byte of `$8000-$80FF`. No current code, state,
charset, loader data, or staging buffer uses `$A000-$BFFF`.

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
| 124-127 | Spread Shot capsule |

Build-time range assertions, linker overlap checks, payload parity tests, and
cold-RAM tests are the enforcement mechanism for this snapshot.
