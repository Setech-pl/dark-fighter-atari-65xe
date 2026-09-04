Historical record — not a current source of truth.

# Memory and payload checkpoints

Use [../memory-map.md](../memory-map.md) for current addresses and sizes. This
record explains values removed from current documents.

- An earlier loader build packed the 7,680-byte bitmap to 2,027 bytes and used
  the then-current source placement `$370F-$3EF9`. The current stream is smaller
  and has a different source range.
- Before the accepted Spread Shot backing/trajectory correction, reports listed
  285 source-owned reserve bytes and a 1,744-byte entity-code body ending at
  `$97CF`. Those were valid only for that earlier binary.
- Old prose used several inconsistent resident-suffix staging ends, including
  `$99A3`, `$9AA3`, and `$9A3D`. They must not be treated as historical runtime
  evidence because they mixed typos with older layouts. The current inclusive
  end is derived from the manifest and packed byte count.

Historical payload and PAL checkpoint totals are retained separately in
[runtime-checkpoints.md](runtime-checkpoints.md).
