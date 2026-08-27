# Current PAL runtime headroom

This is the current performance summary for the accepted Spread Shot runtime.
The machine-readable source is [runtime-wall-trace.json](runtime-wall-trace.json),
generated from the packed release XEX and checked against the ATR payload.

## Current result

| Measure | Current result | Limit |
| --- | ---: | ---: |
| Boot payload | 16,384 B / 128 sectors | 16,384 B / 128 sectors |
| Source-owned payload reserve | 120 B | at least 64 B |
| Formatter padding | 0 B | no hidden reserve claimed |
| XEX size | 16,396 B | artifact format result |
| ATR size | 92,176 B | standard 90 KB single-density image |
| PAL frame | 35,568 cycles | fixed PAL frame |
| Worst measured wall | 33,074 cycles | at most 33,340 |
| Physical headroom | 2,494 cycles | at least 2,200 |
| Missed synchronization | 0 | 0 |
| Deadline overruns | 0 | 0 |
| Additional VBI boundaries | 0 | 0 |

The 32,956-cycle figure in the report is the accepted Rapid Fire measurement
used as the baseline for the Spread Shot delta. It is not the Spread Shot
baseline state. The current Spread Shot runtime measures 33,074 cycles: a
+118-cycle delta, 138 cycles inside its +256 target and 266 cycles inside its
+384 hard limit.

## Artifact and cold-start evidence

- The trace is bound to `dist/dark-fighter.xex` by SHA-256.
- XEX and ATR cold boots are tested with `$A5` and `$5A` fills across
  `$8000-$9FFF`.
- XEX and ATR each run two 3,000-frame integrity sessions, for 6,000 frames
  (120 PAL seconds) per medium.
- Gameplay state parity is required between XEX and ATR.
- DLI order violations are zero and no host frame contains more than the two
  production gameplay DLIs.

## Maximum legal pool coverage

| Pool | Physical capacity | Maximum evidenced state |
| --- | ---: | --- |
| Viper projectiles | 10 | 10/10 in linked runtime pool tests |
| Raider projectiles | 9 | bounded nine-slot implementation |
| Combined fighter projectiles | 19 | 18/19 naturally observed in legal Atari800 replays |
| Broadside projectiles | 3 | production scheduler evidence, no RAM fixture |
| Interactive entities | 4 physical / 2 active | active limit exercised |
| Transient effects | 6 physical / 5 active | 5/5 active effect envelope exercised |

The combined value 19 is physical allocation: ten Viper slots plus nine Raider
slots. The report did not observe a natural 19/19 frame and therefore records
`full_combined_capacity_observed: false`; 18 is the maximum combined active
count actually seen. Separate runtime tests prove full use of the ten-slot
Viper component, including atomic three-projectile Spread volleys. A synthetic
RAM-seeded 19/19 frame is intentionally excluded from the production wall.

The worst Spread Shot coverage frame contains an active capsule, a legal
three-projectile Viper volley, a live Raider, and active broadside state. The
effects and entity limits are exercised in their dedicated legal replays.

## Measurement method

`npm run runtime:wall-trace` builds the production bytes, boots Atari800 7.1.2
in PAL/XL mode, and replays bounded deterministic joystick policies. Timing is
the exact ANTIC master-clock interval from the first instruction after
`wait_frame` returns to the first instruction of the next `wait_frame` call.
Production DMA and DLI behavior remain enabled; guest instrumentation adds zero
instructions and zero cycles to the measured path.

The report keeps three quantities distinct:

- the 20,490-cycle DMA-off CPU comparison from static NMOS 6502 analysis;
- the 33,074-cycle measured DMA-on wall used for acceptance;
- a conservative additive estimate retained only as a diagnostic comparison.

`ten_heaviest_frames_in_9040_replay` is deliberately scoped to the original
9,040-frame baseline replay. `five_heaviest_frames` is sorted across all
measured legal runtime replays, so its first entry is the global 33,074-cycle
maximum.

The measurement is exact for the stated Atari800 version, not an electrical
measurement of a physical Atari. Real-hardware validation remains required by
[hardware-testing.md](hardware-testing.md).

Historical gates and milestone measurements are archived in
[history/runtime-checkpoints.md](history/runtime-checkpoints.md).
