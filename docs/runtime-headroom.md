# Current PAL runtime headroom

This is the current performance summary after the accepted PAL headroom
recovery pass, the completed Spread Shot rebuild, and Shield Booster. The local runtime includes
distinct HULL plates, the full BOOST HUD field, and the multi-position TOP
SCORES fix.
The machine-readable source is
[runtime-wall-trace.json](runtime-wall-trace.json), generated from and bound to
the packed boot BIN, XEX, and ATR.

## Current result

| Measure | Current result | Current gate |
| --- | ---: | ---: |
| Initial boot block | 12,160 B / 95 sectors | dynamic BRCNT 1..255 |
| Extension chunks | 5,760 B / 45 sectors | dynamic, manifest-owned |
| Total occupied transport | 17,920 B / 140 sectors | no preallocated empty sectors |
| Additional loader capacity | 44,800 B | at least 8 KiB |
| Free ATR transport | 74,240 B / 580 sectors | reported separately from residency |
| Remaining safe residency | 6,563 B fragmented | 278 B consumed by Shield code |
| XEX size | 18,819 B | artifact format result |
| ATR size | 92,176 B | standard 90 KB single-density image |
| PAL frame | 35,568 cycles | fixed PAL frame |
| Worst measured wall | 32,108 cycles | preferred at most 32,422; hard 32,568 |
| Physical headroom | 3,460 cycles | hard minimum 3,000 |
| Spread delta from accepted 32,040 baseline | 32 cycles | preferred at most 200; hard 500 |
| Shield delta from accepted 32,072 baseline | 36 cycles | preferred at most 350; hard 496 |
| Missed synchronization | 0 | 0 |
| Deadline overruns | 0 | 0 |
| Additional VBI boundaries | 0 | 0 |

The recovery pass started from the artifact-matched 33,020-cycle local worktree
and established the accepted 32,040-cycle / 3,528-cycle Spread baseline. The
completed Spread rebuild adds 32 cycles, and Shield adds another 36 cycles to
the global maximum; both remain inside their preferred budgets. The 32,956-cycle value remains the historical
Rapid-only checkpoint; the 32,025-cycle value remains the historical
entity/debris foundation.

## Heaviest legal frame

The global maximum is HARD session `2-sweep-fire5`, frame 333. It combines
eight Viper projectiles, seven Raider projectiles, one broadside shell, a live
Raider, one interactive entity, a capital explosion, world/hull work, one
gameplay DLI, music, fire SFX, and capital-explosion SFX. The host-only profile
adds no guest instructions or cycles.

| Exclusive subsystem group | Cycles |
| --- | ---: |
| Gameplay DLI service and VBI/synchronization; wait is outside the interval | 246 |
| World, ring playfield, hull, and starfield | 11,882 |
| Broadside update and render | 649 |
| Viper projectile erase, update, weapon control, and render | 5,334 |
| Raider projectile erase, update, weapon control, and render | 5,016 |
| Enemy update and collision resolution | 2,096 |
| Entity/debris | 617 |
| Effects | 3,233 |
| Capsule/interactive controller | 222 |
| Music and sound | 400 |
| Remaining player, lifecycle, hull-contact, sector, and loop work | 2,413 |
| **Measured wall** | **32,108** |

Cross-cutting totals in the JSON record 10,200 mainline render cycles and 1,344
mainline erase/backing cycles. They overlap the exclusive subsystem groups and
must not be added to the wall total.

## Artifact and cold-start evidence

- Boot BIN: `115bf8f4608bef1c38f6b63755718e4d6b78bd96cdb1421e0acb8c94fcb59893`.
- XEX: `b157a4cab2e01b60c63b95406203e3a8e31975c60f7e79f9ac5a5e2282adea77`.
- ATR: `be16f3cd40c5f03c43960ee937b2ceb8eaa8778ce65e58324feb08aea4f0cf95`.
- XEX and ATR cold boots pass with `$A5` and `$5A` fills across
  `$8000-$9FFF`.
- XEX and ATR each run two 3,000-frame integrity sessions, for 6,000 frames
  (120 PAL seconds) per medium; legal hunt maxima are identical at 30,720
  cycles.
- Gameplay state parity is required between XEX and ATR. DLI order violations,
  missed synchronization, deadline overruns, and extra VBI boundaries are zero.

## Maximum legal pool coverage

| Pool | Physical capacity | Maximum evidenced state |
| --- | ---: | --- |
| Viper projectiles | 10 | Rapid 10/10; Spread steady state 9/10 |
| Raider projectiles | 9 | 9/9 within a legal combined 19/19 state |
| Combined fighter projectiles | 19 | 19/19 in 11 legal replay frames |
| Broadside projectiles | 3 | production scheduler evidence, no RAM fixture |
| Interactive entities | 4 physical / 2 active | active limit exercised |
| Transient effects | 6 physical / 5 active | 5/5 active envelope exercised |

The 19/19 result is observed in ordinary replay state rather than RAM-seeded.
The Viper tests separately prove that continuous Spread holds at 9/10 with no
rejected full salvo, always admits the centre when possible, and creates the
side pair atomically.

## Weapon-mode balance and isolated cost

The packed-XEX 500-frame held-FIRE trace executes the complete Viper erase,
update/collision, control, render/backing path and the booster timer where
applicable. Counts include the established eight/ten-shot burst controller and
12-frame post-burst pause.

| Mode | Salvos / 500 frames | Salvos/s | Projectiles/s | Maximum active | Rejected Spread salvos | Peak isolated pipeline |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Normal | 122 | 12.2 | 12.2 | 8 | n/a | 3,441 cycles |
| Rapid Fire | 170 | 17.0 | 17.0 | 10 | n/a | 4,107 cycles |
| Spread Shot | 49 | 4.9 | 14.7 | 9 | 0 | 3,885 cycles |

Spread's legal maximum projectile lifetime is 28 updates. A nine-frame
candidate reaches the tenth slot with a centre-only transitional salvo; the
selected ten-frame cooldown is therefore the exact minimum that admits every
steady-state volley as three projectiles and keeps the tenth slot reserved.

## Evidence pipeline and method

Runtime evidence has four explicit phases:

1. `npm run build:candidate` creates current packed artifacts and marks the
   manifest `candidate-awaiting-trace`; an older trace is not accepted.
2. `npm run runtime:wall-trace` runs every required legal replay against those
   exact bytes and writes schema v2 with complete session counts and SHA-256
   bindings for boot BIN, XEX, and ATR.
3. `npm run build` performs final binding only when the complete trace matches
   all three artifacts and its gate passes.
4. `npm run verify` rejects candidate manifests, partial traces, stale hashes,
   report-hash drift, and failed gates.

There is no force/bypass mode. Timing is the exact Atari800 7.1.2 ANTIC
master-clock interval from the first instruction after `wait_frame` returns to
the first instruction of the next `wait_frame` call. Production DMA and DLI
behavior remain enabled; guest instrumentation adds zero instructions and zero
cycles.

The three no-fire cadence sessions retain full legal debris flights at every
difficulty: 91 frames on EASY, 82 on MEDIUM, and 74 on HARD. Combat coverage is
kept in separate firing sessions. `five_heaviest_frames` is sorted across all
legal replays and begins with the global maximum.

The DMA-off CPU comparison is 20,063 cycles and the additive estimate is
32,955 cycles; both remain diagnostics only. Physical acceptance uses the
measured 32,072-cycle wall.

The measurement is exact for the stated Atari800 version, not an electrical
measurement of a physical Atari. Real-hardware validation remains required by
[hardware-testing.md](hardware-testing.md). Historical gates and the invalid
34,132-cycle checkpoint are archived under [history/](history/).
