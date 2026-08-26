# Dark Fighter roadmap

This roadmap separates the current product from the next approved work. It has
no delivery dates. Player-visible current rules are in
[game-design.md](game-design.md); old milestone cards are archived in
[history/roadmap-checkpoints.md](history/roadmap-checkpoints.md).

## Current release state

The repository currently contains:

- a deterministic XEX and bootable ATR for stock PAL Atari 65XE hardware;
- loader, main menu, options, top scores, exit, pause, Game Over, and New Game;
- menu music, gameplay music, and gameplay sound effects;
- `SCORE`, `LIFE`, and `HULL` HUD state;
- parallax starfield and the scrolling Colonial/Cylon broadside sector;
- two-phase dim/bright capital-engine animation;
- the Raider, its projectile weapon, damage, score, and breakup;
- interactive debris, destructible debris, contact damage, and breakup effects;
- bounded entity and effects pools with reverse erase;
- Rapid Fire Booster;
- Spread Shot Booster, including the accepted backing/erase correction,
  all-yellow Viper fan, and symmetric readable trajectory;
- deterministic cold-RAM, XEX/ATR parity, memory-integrity, and PAL wall traces.

## Immediate work

1. **Documentation current-state cleanup** — this branch. Establish the
   documentation map, remove contradictory current values, archive historical
   checkpoints, and add narrow anti-drift contracts.
2. **Shield Booster** — design and measure the third pickup type without
   assuming memory, timing, duration, or stacking behavior before review.
3. **Pickup drop-cadence tuning** — use owner playtest feedback to revisit the
   current every-third-qualifying-Raider-kill cadence. The present value is
   implemented behavior, not accepted final balance; this task must change it
   explicitly rather than editing documentation alone.

## Later work

Later work remains subject to owner prioritization and fresh memory/timing
measurement:

- additional enemy archetypes from the existing review roster;
- level progression and authored encounter data;
- mines, additional capital-ship attack patterns, and bosses;
- further sound, music, feedback, and presentation polish;
- physical Atari/SIO2SD acceptance and release packaging.

No item here authorizes a larger pool, another DLI, use of BASIC-ROM memory, or
a change to the 50 FPS PAL contract without a measured design review.
