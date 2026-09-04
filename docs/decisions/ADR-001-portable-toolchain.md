# ADR-001: portable ca65/ld65 toolchain

Status: accepted

## Context

The project must build on Intel macOS and Windows. Native cc65 packages and ATR
tools differ across hosts and versions.

## Decision

Use the pinned `romdev-toolchain-cc65` package containing WebAssembly builds of
`ca65` and `ld65`. Node.js scripts mount inputs in the toolchain's virtual file
system, collect the linker output, and build XEX/ATR without host-specific
binary utilities.

## Consequences

- Supported hosts produce deterministic output from the locked dependencies.
- The build requires Node.js 24 or newer and `npm install`/`npm ci`.
- Homebrew, Chocolatey, Python, and a system cc65 install are not required.
- A native ca65/ld65 compatibility path may be added later only if it preserves
  byte-identical output and validation.
