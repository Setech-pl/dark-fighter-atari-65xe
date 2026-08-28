# Current PAL runtime headroom

This is the current performance summary after the accepted PAL headroom
recovery pass and the completed Spread Shot rebuild. The local runtime includes
distinct HULL plates, the full BOOST HUD field, and the multi-position TOP
SCORES fix.
The machine-readable source is
[runtime-wall-trace.json](runtime-wall-trace.json), generated from and bound to
the packed boot BIN, XEX, and ATR.

## Current result

| Measure | Current result | Current gate |
| --- | ---: | ---: |
| Boot payload | 16,384 B / 128 sectors | 16,384 B / 128 sectors |
| Source-owned payload reserve | 73 B | at least 64 B for this stage |
| Formatter padding | 0 B | no hidden reserve claimed |
| XEX size | 16,396 B | artifact format result |
| ATR size | 92,176 B | standard 90 KB single-density image |
| PAL frame | 35,568 cycles | fixed PAL frame |
| Worst measured wall | 32,072 cycles | preferred at most 32,240; hard 32,540 |
| Physical headroom | 3,496 cycles | hard minimum 3,028 |
| Spread delta from accepted 32,040 baseline | 32 cycles | preferred at most 200; hard 500 |
| Missed synchronization | 0 | 0 |
| Deadline overruns | 0 | 0 |
| Additional VBI boundaries | 0 | 0 |

The recovery pass started from the artifact-matched 33,020-cycle local worktree
and established the accepted 32,040-cycle / 3,528-cycle Spread baseline. The
completed rebuild adds 32 cycles to the global maximum and remains inside the
preferred +200-cycle budget. The 32,956-cycle value remains the historical
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
| Gameplay DLI service and VBI/synchronization; wait is outside the interval | 194 |
| World, ring playfield, hull, and starfield | 11,911 |
| Broadside update and render | 648 |
| Viper projectile erase, update, weapon control, and render | 5,338 |
| Raider projectile erase, update, weapon control, and render | 5,016 |
| Enemy update and collision resolution | 2,097 |
| Entity/debris | 590 |
| Effects | 3,262 |
| Capsule/interactive controller | 223 |
| Music and sound | 422 |
| Remaining player, lifecycle, hull-contact, sector, and loop work | 2,371 |
| **Measured wall** | **32,072** |

Cross-cutting totals in the JSON record 10,247 mainline render cycles and 1,344
mainline erase/backing cycles. They overlap the exclusive subsystem groups and
must not be added to the wall total.

## Artifact and cold-start evidence

- Boot BIN: `23d9548db1d0f47509a1bf39217b07809ee6902959a94fc667109ce2a031d614`.
- XEX: `38a6e33a35e86d594f208b2d972b0977aff3e15eb41509185b0a2057a3f96f20`.
- ATR: `b9cd010e4c69555fd2aab0929deff99d8201e1f315c0c9aa302eddc002e22087`.
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
