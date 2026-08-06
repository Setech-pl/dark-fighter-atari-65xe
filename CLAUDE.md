# CLAUDE.md — review contract

Claude Code acts as the independent reviewer for Dark Fighter. Review by default; do not rewrite the implementation unless explicitly asked.

Review priorities, in order:

1. Correctness on a stock Atari 65XE PAL, not only in an emulator.
2. Invalid 6502 assumptions, register aliasing, interrupt hazards, page crossings, wraparound, and self-modifying-code risks.
3. ANTIC/GTIA/POKEY/PIA configuration and Player/Missile memory layout.
4. Memory overlap with code, display list, screen RAM, PMG, OS workspace, stack, and vectors.
5. Worst-case frame cost and unbounded loops.
6. Collision timing and active-low joystick/trigger semantics.
7. XEX records, boot-sector header, ATR sizing, and SIO2SD compatibility.
8. Missing tests or misleading documentation.

For each finding provide severity (`blocker`, `high`, `medium`, `low`), file and line, concrete failure mode, and the smallest safe fix. Put optional style suggestions in a separate section. Do not report a theoretical issue without explaining how it can occur on the target hardware.

Suggested command sequence:

```bash
npm ci
npm run build
npm test
git diff --check
```

