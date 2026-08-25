# Runtime headroom report

This report records the measured timing work on `feature/runtime-headroom`.
The CPU comparison is regenerated on every release build under
`runtimeTiming`. The DMA-on trace is generated with:

```sh
npm run runtime:wall-trace -- --atari800-source=<atari800-7.1.2-source> --prepare
```

The command writes `docs/runtime-wall-trace.json`. A release build accepts the
trace only when its SHA-256 identifies the exact generated XEX, then embeds its
result in `dist/dark-fighter-manifest.json`. No physical-headroom value is
handwritten.

## Measurement method and semantics

`scripts/runtime-cycles.mjs` executes the linked resident, STARFIELD,
BROADSIDE, A2 kernel and ENTITY_CODE bytes in `scripts/nmos6502.mjs`. It accounts for NMOS
6502 branch and page-crossing penalties but deliberately excludes ANTIC
stalls. It is a repeatable CPU-only before/after measurement.

`scripts/runtime-wall-trace.mjs` builds a host observer against the verified
official Atari800 7.1.2 source archive (SHA-256
`9602badfd7c45551cb5c4cc77f862af377c43a07caaa0bfc77ac87f9179673e3`). The
observer runs before each emulated opcode and reads Atari800's ANTIC master
clock, scanline/cycle position and host-frame ID. It adds no guest instruction
or cycle and writes its log only after a session.

The measured interval starts at `main_loop_option_poll`, immediately after
`wait_frame`, and ends at `main_loop`, immediately before the next
`wait_frame`. Production settings remain active: `DMACTL=$3E`, `NMIEN=$80`,
both gameplay DLIs, gameplay music and SFX. `-nosound` disables only host audio
playback; guest POKEY state and writes remain active.

The report keeps five meanings separate:

- `cpu_cycles_dma_off`: linked main loop including the released OPTION poll;
- `cpu_comparison_headroom`: 35,568 minus that CPU-only comparison, never a
  physical PAL result;
- `measured_wall_cycles_dma_on`: ANTIC-clock interval with production DMA,
  DLI/NMI and every observed CPU stall;
- `measured_physical_headroom`: 35,568 minus the DMA-on wall result;
- `estimated_additive_cycles`: CPU plus fixed DMA and conservative DLI budget,
  retained only as a diagnostic estimate.

The baseline replay contains 9,040 active frames in ten HARD and MEDIUM
neutral/sweep/evasive sessions. A separate 920-frame HARD sweep replay targets
the known heavy coincidence. Three additional 400-frame EASY/MEDIUM/HARD
sessions measure world, near, far and active-debris cadence. All enter gameplay through production frontend
handlers and use deterministic normal input. Legal coverage includes the full
19-slot fighter-projectile pool, production broadside lifecycle, a live Raider,
both explosion types, both tracked muzzles, gameplay music and overlapping
SFX, plus debris spawn, ring/world movement, contact and despawn. Release data exposes two source-turret lifecycles and the replay observed
at most one simultaneous broadside projectile. The three-slot capacity stress
remains a CPU-only executable scenario and is not admitted to the physical
result because no legal release replay produced it.

## Display-list contract

The display is 24 physical 40-byte rows, but the ring contains only the last
22:

- HUD LMS is fixed at `$4000`;
- divider LMS is fixed at `$4028` and never rotates;
- gameplay ring rows are exactly `$4050-$43BF`;
- each head value 0..21 emits exactly 22 unique, in-range gameplay LMS
  addresses;
- the last gameplay LMS retains the second DLI and the JVB remains fixed.

Historical reports used “23 gameplay rows” as shorthand for the divider plus
22 gameplay rows. The first A2 implementation incorrectly rotated all 23.
The corrected common event first preserves the old divider content in the
recycled ring row, rotates only the 22-row mapping, and regenerates the fixed
divider. `tests/broadside-fire.test.mjs` exhaustively checks all 22 heads, the
fixed HUD/divider addresses, uniqueness and range of gameplay LMS entries,
mapper equivalence, DLI position and JVB. Source and generated display-list
tests separately assert the divider address `$4028`.

## A2 kernel design pass

The corrected pre-kernel A2 heavy frame provided these exclusive CPU costs.
Inclusive parent values are not added again.

| Work in the heavy frame | Exclusive CPU | Expected wall opportunity before implementation |
| --- | ---: | ---: |
| Shift 44 B of row pointer tables | 496 | about 0.5 K if removed without making reads dearer |
| Build inactive 75 B LMS list in the event frame | 1,125 | about 1.1–1.8 K, plus fewer display-memory/contention stalls |
| Logical-to-physical mapper, 62 calls | 1,969 | only the portion removed from every caller |
| Far erase local work | 653 | part of the combined far specialization |
| Far render local work | 965 | part of the combined far specialization |
| Far advance | 840 | no safe product-preserving removal identified |
| Far pointer setup below mapper | 1,978 | part of the combined far specialization |
| Mapper calls made by far paths | 1,467 | part of the combined far specialization |
| Two-row projectile advance/overlay work | about 535 | less than 1 K; defer unless the gate still fails |
| Projectile render, inclusive | about 3,718 | mostly required drawing; specialize addressing only |
| Projectile erase/update/render passes | 1,150 / 1,720 / 3,718 inclusive | bounded 19-slot contract; no slot or cadence change |

The addressing alternatives were evaluated with all later mapper reads:

| Addressing choice | Event saving | Additional heavy-frame reads | Net CPU result |
| --- | ---: | ---: | ---: |
| Current shifted 22-entry low/high tables | baseline | baseline | fastest measured choice |
| Head with per-read modulo | about 486 | about 826 | about 340 cycles worse |
| Doubled static address table, indexed by `head+Y` | about 484 | about 649 | about 165 cycles worse |

A head index was therefore not adopted. The 44-byte table shift remains: its
one event cost is cheaper than taxing every subsequent star, projectile,
explosion and hull read.

## Staged measured result

Every wall value below is from an artifact-bound DMA-on trace, not a CPU-to-wall
conversion. `missed` combines the 9,040-frame baseline and targeted replay for
that checkpoint.

| Checkpoint | CPU DMA off | Measured DMA-on wall | Physical headroom | Missed | Wall gain |
| --- | ---: | ---: | ---: | ---: | ---: |
| Corrected fixed-divider A2 baseline | 22,494 | 36,464 | -896 | 9 | — |
| 1. Prebuild inactive LMS list in the guaranteed light next frame | 21,431 | 33,942 | 1,626 | 0 | 2,522 |
| 2. Addressing comparison; retain shifted tables | 21,431 | 33,942 | 1,626 | 0 | 0 |
| 3. Ring-specialized far erase/render addressing | 19,845 | 31,583 | 3,985 | 0 | 2,359 |
| 4. Remove redundant projectile pointer scratch round-trip | 19,761 | 31,440 | 4,128 | 0 | 143 |

Stage 1 leaves publication on the same common-event frame. That frame consumes
the list already prepared after the preceding common event, then sets a pending
flag. The following physical frame is guaranteed not to scroll by the asserted
world cadence and prepares the future inactive list there. Stage 3 moves only
the bounded far erase/render address kernels to `$9000`; far count, codes,
parallax and cadence are unchanged. Stage 4 removes one redundant
`STA row_counter` / `LDA row_counter` pair per rendered projectile and changes
neither addressing nor output.

The total measured improvement from the corrected-divider baseline is 5,024
wall cycles and 2,733 CPU cycles. Optimization stopped at the first full-trace
checkpoint that passed the requested gate; no D1/D2 product compromise was
implemented.

## Historical pre-foundation physical gate

The artifact at this checkpoint included the post-feature Raider `4/5` lateral
pursuit limit and Cylon-family `$44` body colour with fixed `$84/$46` enemy explosion.
The staged table above remains the historical A2 optimization record; the
values below preserve that accepted checkpoint and its original 31,568 gate.

| Metric | Final measured or generated value |
| --- | ---: |
| `cpu_cycles_dma_off` | 19,736 |
| `cpu_comparison_headroom` | 15,832 |
| `measured_wall_cycles_dma_on` | 31,399 |
| `measured_physical_headroom` | 4,169 |
| `estimated_additive_cycles` | 32,616 |
| PAL physical frame | 35,568 |
| Gate maximum | 31,568 |
| Baseline 9,040 missed synchronisations | 0 |
| Targeted 920 missed synchronisations | 0 |
| Deadline overruns | 0 |

The gate passes by 169 cycles. Crossing one Atari800 host/VBI boundary is not
itself a missed synchronization because active work begins near scanline 224.
The trace records 4,836 such baseline intervals and 516 targeted intervals;
none crosses an extra boundary and every following active loop starts at the
next legal synchronization opportunity.

The five heaviest measured baseline frames are:

| Session/frame | DMA-on wall | Physical headroom |
| --- | ---: | ---: |
| `2-sweep-fire4` / 337 | 31,399 | 4,169 |
| `2-sweep-fire5` / 263 | 31,209 | 4,359 |
| `2-sweep-fire4` / 263 | 30,501 | 5,067 |
| `2-sweep-fire0` / 177 | 30,211 | 5,357 |
| `2-evasive-fire1` / 283 | 29,522 | 6,046 |

The maximum has 16 active fighter projectiles, 22 rendered far stars, one
tracked muzzle, a live Raider, a capital explosion, gameplay music, fire SFX
and capital SFX. Its events include common world/far/hull work, broadside
update, fighter/capital explosion render and a music tick. The targeted replay
reproduces the same 31,399-cycle frame.

## Entity/effects foundation feature gate

The foundation keeps the historical 31,568 checkpoint visible and adds the
owner-approved budget contract: baseline 31,440 wall cycles, at most +600,
final wall at most 32,040, and physical headroom at least 3,528. The linked
empty engine path is capped separately at 100 CPU cycles.

| Metric/path | Measured value | Delta from 31,440 baseline |
| --- | ---: | ---: |
| Linked empty skeleton, DMA off | 93 CPU | n/a |
| One-active-debris wrapper, DMA off | 325 CPU | n/a |
| Spawn wrapper, DMA off | 370 CPU | n/a |
| Successful-contact wrapper, DMA off | 397 CPU | n/a |
| Heaviest empty-path wall frame | 31,346 | -94 |
| Heaviest one-active-debris wall frame | 32,025 | +585 |
| Heaviest spawn wall frame | 27,737 | -3,703 |
| Heaviest contact wall frame | 22,087 | -9,353 |

Final measured physical headroom is 3,543 cycles. The feature consumes 585 of
the approved 600 cycles and leaves 15. Both the 9,040-frame baseline and the
separate 920-frame targeted replay record zero missed synchronisations, zero
extra VBI boundaries and zero deadline overruns. The heaviest frame retains a
live Raider, 16 fighter projectiles, 22 far stars, one muzzle, capital
explosion, music plus fire/capital SFX, and one active debris at Y=176.

The trace observes 44 debris spawns, 11 successful contacts and 44 despawns;
33 despawns are the natural Y=192 to off-screen path rather than contact.
Exhaustive linked-byte tests separately cover every logical row 0..21 for
every ring head 0..21, including reverse overlay restoration. Thus ring wrap,
spawn, hit and bottom despawn are all covered without manually seeding the
DMA-on timing result.

## Debris visual-polish feature gate

The visual-polish checkpoint uses the measured foundation result as its
baseline: 32,025 wall cycles and 3,543 cycles of physical headroom. Its
owner-revised contract permits at most +256 cycles, caps the final wall at
32,281, and requires at least 3,287 cycles of physical headroom. Effects remain at
active limit zero, so no active-effects path is admitted to the result.

| Metric/path | Measured value | Delta from 32,025 foundation |
| --- | ---: | ---: |
| Linked empty skeleton, DMA off | 78 CPU | n/a |
| One-active-debris wrapper, DMA off | 356 CPU | n/a |
| Spawn wrapper, DMA off | 405 CPU | n/a |
| Successful-contact wrapper, DMA off | 446 CPU | n/a |
| Heaviest empty-path wall frame | 31,108 | -917 |
| Heaviest one-active-debris wall frame | 32,081 | +56 |
| Heaviest spawn wall frame | 28,212 | -3,813 |
| Heaviest contact wall frame | 26,129 | -5,896 |

Final measured physical headroom is 3,487 cycles. The measured delta is +56,
leaving the result 200 cycles below the wall gate. The 9,040-frame baseline,
920-frame targeted replay and three 400-frame cadence replays record zero
missed synchronisations, zero extra VBI boundaries and zero deadline overruns.
The heaviest legal frame still includes one active debris together with a live
Raider, 16 fighter projectiles, 22 far stars, one tracked muzzle, a capital
explosion, gameplay music and overlapping fire/capital SFX.

The trace observes 74 spawns, 10 successful contacts, 71 despawns and 61 natural
bottom despawns. Across 5,441 active-debris frames it observes both visual
variants, both tumbling phases and all signed trajectories -4/0/+4 HPOS. The
same trace contains 1,509 active-debris frames after the capital sector in
`OPEN`, so late-game timing is not inferred from an empty pool. The
active transitions contain 2,598 true world events: 1,514 vertical steps,
1,084 intentional holds and zero invalid transitions, matching the
deterministic three-of-five accumulator. Cadence traces measure exact
world/near/far/debris rates of 20/10/5/12, 22.5/11.25/5.625/13.5 and
25/12.5/6.25/15 rows/s for EASY/MEDIUM/HARD. Complete debris flights take
91/82/74 frames (1.82/1.64/1.48 s).

The linked-byte suite separately exhausts all 255 nonzero entity RNG seeds,
all four 2×1 phases at every A2 ring head, byte-exact two-cell backing, exact
four-event lateral accumulation, half-open 16×8 collision boundaries, safe
full paths and reverse layer erasure. The production transition replay reaches
`DRAIN` at frame 496, `COMPLETE` at 565, the next `OPEN` at 652 and a new
post-capital spawn event at 682 after the normal scheduler delay.

## Explosion colour-flash feature gate

The accepted debris visual-polish result is the baseline: 32,081 measured
wall cycles and 3,487 cycles of physical headroom. The colour-flash contract
permits at most +64 cycles, caps the final wall at 32,145 and also keeps the
absolute 3,200-cycle headroom floor. The stricter delta-derived headroom is
3,423 cycles.

The final artifact measures 32,122 wall cycles, a +41 delta, leaving 3,446
cycles of physical headroom and 23 cycles of the feature allowance. Across
the 9,040-frame baseline, 920-frame targeted replay, three 400-frame cadence
replays and a separate 1,600-frame no-FIRE lifecycle replay there are zero
missed synchronisations, zero extra VBI boundaries and zero deadline overruns.

The lifecycle replay observes all four enemy timer values and all six Viper
timer values from legal gameplay. End-of-frame hardware snapshots record exact
`COLBK` sequences `$1E,$3C,$1C,$34` and
`$1E,$3C,$1C,$3C,$38,$34`, followed by `$00`. `COLPM0/2/3` remain
`$0E/$46/$28`; `COLPM1` retains only its pre-existing `$44` body and `$84`
local-explosion states. The host tracer records these registers without adding
guest instructions or cycles.

## Destructible-debris feature gate

The accepted yellow-red flash artifact is the baseline: 32,122 measured wall
cycles and 3,446 cycles of physical headroom. The owner-revised complete
feature target is at most +640 cycles and the hard limit is +768, giving wall
gates 32,762 and 32,890; physical headroom must remain at least 2,800.
Separate linked-byte limits retain the inactive-debris dispatcher at +32 CPU
cycles and the no-active-Viper path at +48.

The owner-visible failure had two concrete causes. The previously reviewed
release artifacts still contained the one-hit implementation with effect
active limit zero; the first transient-effects candidate exceeded the fixed
16,384-byte boot-payload gate and therefore never reached those XEX/ATR files.
Its host preview was a separate state model, so active-slot assertions did not
prove artifact output. In addition, that rejected candidate used sparse
one-to-three-pixel fragments which initially mapped to the same character cell
and overwrote one another. The current acceptance harness executes the packed
XEX and ATR bootstrap bytes, hits debris through the released projectile
resolver, and renders exact runtime screen codes and charset data.

| Metric/path | Measured value | Feature limit |
| --- | ---: | ---: |
| Linked legal-heavy main loop, DMA off | 20,364 CPU | comparison only |
| No active debris dispatcher delta | +18 CPU | +32 |
| No active Viper projectile delta | 0 CPU | +48 |
| Final destruction path, DMA off | 910 CPU | bounded five-effect spawn |
| Full effects wrappers, DMA off | 1,648 CPU | core + four fragments |
| Heaviest observed five-effect wall frame | 27,405 | 32,890 |
| Final worst wall | 32,719 | 32,890 |
| Final physical headroom | 2,849 | minimum 2,800 |

The final wall delta is +597 cycles, leaving 43 cycles to the target gate and
171 to the hard gate. The complete 13,960-frame replay is composed of the
9,040-frame baseline, 920 targeted frames, 1,200 cadence frames, 1,600
fighter-flash frames and 1,200 destruction-effect frames. The Atari800
observer records 18 final-hit spawns and 90 frames with the exact active mask
`$1F`, count 5 and rendered mask `$1F`; it observes update and render in the
spawn frame and reverse erase in the following frame. At least one such spawn
occurs after the capital sector. Missed synchronisations, deadline overruns and
extra VBI boundaries are all zero.

The target resolver keeps debris neutral. Its ascending Viper scan consumes
only the lowest matching projectile in a frame, selects the first lower edge
reached by upward flight when debris and Raider both intersect, and gives
debris an exact tie. `ENTITY_HP` begins at 3; the first two hits reuse
`ENTITY_OWNER` for exactly two local inverse frames, while the final hit spawns
one five-frame core and four 30-frame collisionless fragments. Fixed local
steps separate all four fragments from the first rendered frame and produce a
span over four columns and two rows by frame 12. Slot 0 renders before slots
1..4; erase scans admitted slots 4..0, preserving exact backing at every A2 head. Shot removal
bypasses enemy damage, score and fighter-flash paths. The existing spawn
timer's temporary 65 marker falls to the normal 64-frame repeat delay in the
same frame.

Linked runtime code totals 14,184 B versus the 13,697 B accepted-flash
baseline (+487 B). ENTITY_CODE itself is 728 B versus the accepted 714 B
(+14 B). The fixed BSS page remains `$8000-$80FF`: four physical interactive
slots with active limit one, and six physical effect slots with active limit
five.

## Enemy-breakup-effects feature gate

The accepted destructible-debris artifact is the baseline: 32,719 measured
wall cycles and 2,849 cycles of physical headroom. The target delta is +128
and the hard delta is +224, giving gates 32,847/32,943; physical headroom must
remain at least 2,600. The no-active-explosion path is separately limited to
the accepted empty wrapper plus 32 linked CPU cycles, or 123.

| Metric/path | Measured value | Feature limit |
| --- | ---: | ---: |
| No active explosion wrappers, DMA off | 113 CPU | 123 |
| Raider five-slot materialisation, DMA off | 464 CPU | bounded spawn |
| Full effects wrappers, DMA off | 1,919 CPU | core + four fragments |
| Final worst wall | 32,869 | target 32,847 / hard 32,943 |
| Final physical headroom | 2,699 | minimum 2,600 |

The final wall delta is +150 cycles. It exceeds the preferred target by 22
but remains 74 below the explicit hard limit. The complete trace records zero
missed synchronisations, zero deadline overruns and zero extra VBI boundaries.
It observes 216 executions of the actual Raider materialiser with active mask
`$1F`, active count 5, update and render in the same frame; 215 have the
directly preceding yellow `$1E` death frame and the expected `$3C`
materialisation frame. Four real Atari800 boot-smoke sessions (XEX/ATR × cold
RAM `$A5/$5A`) still enter gameplay by frame 505 and run through frame 750.

All canonical destruction sources converge after their existing score-source
arbitration. `erase_enemy` removes the PMG hull and hitbox before the accepted
PMG explosion, SFX and full-screen flash start. A two-step latch defers only
the backed character effect by one PAL frame so the death path does not also
pay five-slot update/render during a world/hull copy. The next frame places a
five-frame core at the captured PMG origin plus six HPOS and updates four
30-frame fragments before their first render. The render-ID template identifies
left wing, right wing, red eye and centre while reusing glyphs 110–119 and the
existing Raider pulse phase; no glyph or gameplay RNG was added.

Newest-event-wins is symmetric. Frame-start reverse erase invalidates the old
backing, and either spawner clears the pending latch plus all six existing
`EFFECT_STATE` bytes before publishing slots 0..4. The physical sixth slot
remains inactive. Pause freezes the latch and TTL; new game, life loss, sector
completion and Game Over use the same clear policy. Linked runtime code is
14,192 B, only +8 B from the 14,184 B accepted baseline. `ENTITY_CODE` is
725 B, +11 B from 714; BSS remains exactly `$8000-$80FF`.

## Size and memory checkpoints

| Checkpoint | Payload | XEX | ATR |
| --- | ---: | ---: | ---: |
| ETAP 1 / before | 15,431 B | 15,443 B | 92,176 B |
| ETAP 2 | 15,506 B | 15,518 B | 92,176 B |
| ETAP 3 | 15,513 B | 15,525 B | 92,176 B |
| ETAP 4 / before A2 | 15,558 B | 15,570 B | 92,176 B |
| Initial A2 hybrid ring | 15,576 B | 15,588 B | 92,176 B |
| Final A2 kernel pass | 15,754 B | 15,766 B | 92,176 B |
| Pre-foundation / Raider `4/5` + Cylon `$44` | 15,759 B | 15,771 B | 92,176 B |
| Entity/effects foundation + one debris | 16,299 B | 16,311 B | 92,176 B |
| Debris visual polish + owner retest glyphs | 16,384 B | 16,396 B | 92,176 B |
| Explosion colour flash | 16,384 B | 16,396 B | 92,176 B |
| Destructible debris + boot handoff guard | 16,384 B | 16,396 B | 92,176 B |
| Raider local breakup | 16,384 B | 16,396 B | 92,176 B |

The final payload occupies exactly 128 boot sectors with zero formatter
padding. Its 16,380-byte linked/packed core is followed by a source-owned
four-byte `DFB1` trailer at `$5FFC-$5FFF`; build and validation now reject any
other core length, sector count or trailer instead of truncating or padding the
image. The on-disk header can technically encode up to 255 sectors, but the
release invariant is exactly 128; loader code and media format are unchanged.

The boot regression was not a failed countdown or an incorrect `$201E`
handoff. Growth had placed `main_menu_display_list` at `$37E8`, so its 63-byte
menu/text block crossed ANTIC's 1 KiB display-list-counter boundary at
`$37FF/$3800`; the counter wrapped and fetched unrelated bytes. The legacy
`clear_pmg` routine at `$27B2` also wrote all eight pages `$3800-$3FFF`,
destroying the part above `$3800`. The current repaired lists live at `$31EC-$322A`
inside one counter window, and `clear_pmg` writes only actual single-line PMG
DMA pages `$3B00-$3FFF`. Link-time guards cover both constraints. Four real
Atari800 PAL/XL boot-smoke runs (XEX/ATR × cold RAM `$A5/$5A`) capture frames
1, 250, 300, 500 and 750; all reach the visible menu and then gameplay through
production FIRE input, with identical XEX/ATR images at frames 500 and 750.

Final protected use is MAIN 8,191/8,192 B (CODE 4,426 B plus RODATA 3,765 B), PROJECTILES 202/298 B,
STARFIELD 2,160/2,278 B, BROADSIDE 6,655/6,656 B, A2 kernel 226/256 B,
ENTITY_STATE 256/256 B and ENTITY_CODE 725/3,840 B. Packed staging uses
1,699/1,792 B until unpacking; the separate ENTITY_CODE boot tail is 651 B.
A2 display/ring state owns
203 B at `$7F10-$7FDA`. The kernel is copied identically by XEX and cold-boot
ATR startup into unconditional 64 KiB RAM at `$9000-$90E1`; `$90E2-$90FF`
remains free. Startup explicitly clears every byte `$8000-$80FF` and loads
ENTITY_CODE at `$9100-$93D4`; `$8100-$8FFF` and `$93D5-$9FFF` remain reserved
and untouched. `$A000-$BFFF` is excluded.
ENTITY_CODE grows from the 564 B foundation checkpoint to 725 B (+161 B),
and only +11 B from the accepted 714 B feature baseline. Debris uses exactly
eight glyphs 110–117 (seven new from foundation), effects use two fragment
glyphs 118–119, and eight glyphs 120–127 remain free.

## Limitations

- Exact Atari800 ANTIC timing is emulated timing, not an electrical
  measurement from a physical 65XE.
- Bounded deterministic replay is reproducible coverage, not a proof over
  every possible joystick history.
- Release `NMIEN=$80` enables gameplay DLI NMI and deliberately leaves OS VBI
  NMI off. Atari800 host-frame IDs provide the VBI boundary identifier without
  changing release behavior.
- Atari800 cannot prove PORTB/BASIC-ROM behavior after cold ATR boot or on
  physical SIO2SD hardware. The new code does not depend on that window.
- Real 65XE/SIO2SD gameplay remains the final hardware acceptance path.
