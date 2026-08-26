# ADR-003: mixed ANTIC F/E bitmap loader

Status: accepted

## Context

The owner reference `assets/graphics/loader.png` contains a large title, a long
Galactica profile with `BSG` marking, three engine groups, and a green studio
footer. The first tile-based adaptation could not preserve enough horizontal
detail. XEX, ATR, Atari800, and a stock PAL 65XE need one deterministic path.

## Decision

- Lines 0-163 use 320-pixel ANTIC F; lines 164-191 use 160-pixel ANTIC E. Both
  consume 40 bytes per row.
- `loader-bitmap.json` is the editable source. The build rasterizes exactly
  7,680 bytes and packs the current result to 1,997 bytes with bounded LZ-10/5.
- The raw bitmap occupies `$4010-$5E0F`; a second LMS at `$5000` prevents any
  40-byte line from crossing a 4 KiB boundary.
- Two DLIs change palette registers at the title/ship and ship/footer zones.
- PMG DMA remains off. The image is shown for 250 complete PAL frames, then the
  runtime disables loader DMA/NMI and builds frontend/gameplay memory.

## Current memory lifetime

The packed bitmap stream is `$3831-$3FFD`. A separate 35-byte packed display
list source at `$33CA-$33EC` expands to 202 bytes at `$3800-$38C9` only after
the overlapping bitmap source is consumed. After the loader, only PMG DMA pages
`$3B00-$3FFF` are cleared; resident data below `$3B00` is preserved.

## Consequences

The loader gives the owner reference enough horizontal definition while keeping
one portable declarative source and deterministic generated output. It adds no
work to the gameplay frame after handoff.
