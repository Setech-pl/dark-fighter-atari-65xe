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
| `$2000-$3122` | 4,387 B | resident `CODE` |
| `$3123-$3FA4` | 3,714 B | resident `RODATA` |
| `$5400-$54C9` | 202 B | `PROJECTILES`: 19 fighter slots, burst controllers, and two shared fighter explosions |
| `$552A-$5DF3` | 2,250 B | relocated `STARFIELD` runtime; 2,278 B reserved through `$5E0F` |
| `$5E10-$77CC` | 6,589 B | relocated `BROADSIDE`/frontend/enemy/weapon runtime; reserved through `$780F` |
| `$8000-$80FF` | 256 B | `ENTITY_STATE` BSS |
| `$8800-$8C7F` | 1,152 B | immutable three-type/eight-phase pickup glyph source bank |
| `$8C80-$8D8A` | 267 B | late phased pickup compositor and exact reverse-erase code |
| `$9000-$90FE` | 255 B | relocated A2 kernel; one byte reserved through `$90FF` |
| `$9100-$9CFC` | 3,069 B | relocated `ENTITY_CODE`, including H3.1 display lists and frontend helpers; reserved through `$9D74` |
| `$9D75-$9FF9` | 645 B | Hybrid Encounter Director code/common/Level 1 data |
| `$9FFA-$9FFF` | 6 B | untouched Director guard |
| `$21C1-$2667` | 1,191 B | boot-only `BOOT_STAGE2` overlay; replaced by the resident suffix before runtime |

The linked production runtime metric is `CODE + STARFIELD + BROADSIDE +
A2_KERNEL + ENTITY_CODE + PICKUP_CODE = 16,817 B`. With the 1,152-byte pickup
phase bank, late-published GLUE, DIRECTOR, and their frozen integration
accounting, simultaneous feature residency is 18,655 B and safe residency is
3,532 B. Relative to the pre-compositor checkpoint, linked code/data grows by
82 B, persistent BSS grows by 0 B, and immutable runtime phase data grows by
1,152 B.

## Boot transport layout

The production Encounter Director transport is 19,968 bytes in 156 occupied
sectors. BRCNT loads the 12,800-byte/100-sector initial block at `$2000-$51FF`;
the entry point remains `$201E`. Initial content is exactly 12,770 B and ends
at `$51E1`; the rest of the last sector is transport padding.

| Initial address / ATR sectors | Size | Stored form and startup destination |
| --- | ---: | --- |
| `$2000-$21C0` | 449 B | raw bootstrap prefix |
| `$21C1-$2667` | 1,191 B | stage-2 SIO/CRC/per-record-end/manifest overlay |
| `$2668-$4017` | 6,576 B | packed resident suffix; staged at `$8100` |
| `$4018-$4717` | 1,792 B | packed 2,250-byte starfield/music runtime; stages at `$7810` and expands to `$552A-$5DF3` |
| `$4718-$4816` | 255 B | A2 source; staged at `$7F16-$8014`, copied to `$9000-$90FE` before entity/effects clear |
| `$4817-$51DD` | 2,503 B | packed 3,069-byte ENTITY_CODE; staged at `$5300-$5CC6`, expands to `$9100-$9CFC` |
| `$51DE-$51E1` | 4 B | source-owned `DFB1` trailer; end of 12,770-byte content |
| ATR sectors 101-144 | 5,632 B | external BROADSIDE record: 5,604 B packed / 6,589 B raw to `$5E10-$77CC` |
| ATR sectors 145-150 | 768 B | pickup phase/code record: 700 B packed / 1,419 B raw, transported to `$7BD0` then preserved at `$4801` and expanded to `$8800` |
| ATR sector 151 | 128 B | GLUE record: 41 B packed / 39 B raw to staging `$5259` |
| ATR sectors 152-156 | 640 B | Director record: 587 B packed / 645 B raw to `$9D75-$9FF9` |

The `DFMC` v1 manifest is 78 B for the current four records and reserves space
inside stage-2 for at most eight records. The ATR has 564 free sectors
(72,192 B). Runtime and transport budgets remain separate; current safe
residency is 3,532 B. The older 15,346-byte capacity reference remains useful
only as history; the production gate is the exact 16,817-byte linked runtime
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
| `$4800-$4BFF` | 1,024 B | frontend charset; `$4801-$4ABC` temporarily preserves the 700-byte packed pickup stream before frontend construction |
| `$4C00-$4D1F` | 288 B | expanded Colonial hull map, 32x9 |
| `$4D20-$4E3F` | 288 B | expanded Cylon hull map, 32x9 |
| `$4E40-$4E70` | 49 B | persistent runtime state through difficulty setting |
| `$4E71-$4ECA` | 90 B | hull scroll, backing, sector, lifecycle, music, muzzle, score, and two-phase engine state |
| `$4ECB-$4ED6` | 12 B | Raider, damage, and starfield scalar state |
| `$4ED7-$4ED8` | 2 B | allied/enemy fixed-divider versus ring muzzle-domain state; consumes the former compatibility pad without shifting later state |
| `$4ED9-$4EE9` | 17 B | menu/gameplay music and tracked-muzzle state |
| `$4EEA-$4EFD` | 20 B | ten TOP SCORES records as parallel packed-BCD low/high arrays |
| `$4EFE-$4F24` | 39 B | late-published integration glue |
| `$4F25-$4FFF` | 219 B | unassigned after loader |
| `$5000-$53FF` | 1,024 B | dedicated gameplay HUD charset |
| `$54CA-$5529` | 96 B | 24 far-star records |
| `$5DF4-$5E05` | 18 B | free tail of the starfield reservation |
| `$5E06-$5E0F` | 10 B | exact prior-content backing for HUD cells `$401E-$4027` while BOOST is active |
| `$77CD-$780F` | 67 B | free tail of the broadside reservation |
| `$7810-$7BCF` | 960 B | pause-screen backup after cold staging is consumed |
| `$7BD0-$7E8B` | 700 B | external pickup transport destination until copied to `$4801`; released before starfield staging overwrites it |
| `$7E8C-$7F0F` | 132 B | unassigned remainder of the cold starfield staging reservation |
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
| `$8100-$9AA5` | 6,566 B | cold-start resident-suffix staging only |
| `$8100-$812F` | 48 B | exact physical-screen pointers for 24 rendered far stars after cold startup |
| `$8130-$87FF` | 1,744 B | unowned after cold startup |
| `$8800-$8C7F` | 1,152 B | immutable pickup phase bank: three types × eight phases × six glyphs × eight bytes |
| `$8C80-$8D8A` | 267 B | pickup compositor, mapper, backing, and exact reverse erase |
| `$8D8B-$8FFF` | 629 B | unowned after cold startup |
| `$9000-$90FE` | 255 B | A2 kernel |
| `$90FF` | 1 B | free A2 reservation tail |
| `$9100-$9CFC` | 3,069 B | entity/effect/booster/projectile-composite and H3.1 frontend runtime |
| `$9CFD-$9D74` | 120 B | free tail of the ENTITY_CODE reservation |
| `$9D75-$9FF9` | 645 B | Hybrid Encounter Director |
| `$9FFA-$9FFF` | 6 B | untouched guard; not available capacity |
| `$A000-$BFFF` | 8,192 B | deliberately unused BASIC-ROM window |
| `$C000-$FFFF` | 16,384 B | OS ROM and I/O; not gameplay RAM |

Cold startup initializes every byte of `$8000-$80FF`. No current code, state,
charset, loader data, or staging buffer uses `$A000-$BFFF`.

## Boot-only ENTITY_CODE staging lifecycle

The packed ENTITY_CODE source is `$4817-$51DD`; the complete initial content
ends exclusively at `$51E2`. ENTITY_CODE staging is `$5300-$5CC6` (2,503 B),
so the source-to-staging margin is 290 B. Its end-exclusive address `$5CC7` is
329 B below BROADSIDE at `$5E10`. The packed stream is copied only after the
initial block is resident, expanded to `$9100-$9CFC`, and then released. The
later starfield destination `$552A-$5DF3` overlaps the released staging range
over `$552A-$5CC6` (1,949 B); it is never live concurrently with the packed
ENTITY_CODE source. Loader-resident RAM after startup remains 0 B.

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

Glyphs 126-127 are currently free.

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
| 120-125 | dynamic six-glyph compositor bank for the selected Rapid, Spread, or Shield vertical phase |
| 126-127 | free |

Build-time range assertions, linker overlap checks, payload parity tests, and
cold-RAM tests are the enforcement mechanism for this snapshot.
