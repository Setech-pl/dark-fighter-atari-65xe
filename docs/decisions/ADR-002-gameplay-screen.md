# ADR-002: mixed ANTIC and Player/Missile gameplay screen

Status: accepted

## Context

The accepted composition combines a fixed text HUD, scrolling capital hulls,
stars, fighters, pickups, effects, and many projectiles. A full bitmap would
consume too much RAM and make smooth scrolling harder on a stock 65XE.

## Decision

- The fixed HUD and divider use ANTIC 2 with a dedicated RAM charset.
- The 27-row scrolling ring uses ANTIC 4 with a separate gameplay charset; a
  fixed divider row above it completes the 28-row gameplay raster.
- The playfield palette is black, cold white/steel, amber/yellow, and a switched
  red/burgundy bank.
- P0 and P3 form the Viper; P1 is the Raider and P2 its red scanner.
- M0 remains reserved for a possible player weapon. Current Viper projectiles
  use restored ANTIC 4 overlays so their ten-slot pool and yellow colour do not
  inherit `COLPM0`.
- New independently coloured moving objects require fresh PMG, memory, and PAL
  timing evidence before multiplexing is considered.

## Consequences

The layout keeps the accepted visual hierarchy without a full-frame bitmap.
PMG capacity remains explicitly bounded, while character overlays support
stable multi-projectile weapons and backing restoration over moving hulls.
