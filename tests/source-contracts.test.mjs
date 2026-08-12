import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");

test("source keeps the documented PAL and PMG hardware contract", () => {
  const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
  assert.match(source, /PMG_BASE\s*=\s*\$3800/);
  assert.match(source, /SCREEN\s*=\s*\$4000/);
  assert.match(source, /CHARSET\s*=\s*\$4400/);
  assert.match(source, /FRONTEND_CHARSET\s*=\s*\$4800/);
  assert.match(source, /HUD_CHARSET\s*=\s*\$5000/);
  assert.match(source, /sta CHBASE/);
  assert.match(source, /\.byte \$C2,<SCREEN,>SCREEN\s+; ANTIC 2 HUD \+ LMS \+ DLI/);
  assert.match(source, /\.repeat 22\s+\.byte \$04\s+\.endrepeat/);
  assert.match(source, /\.byte \$84\s+; final ANTIC 4 row \+ DLI/);
  assert.match(source, /\.byte \$47,<SCREEN,>SCREEN\s+; ANTIC 7 title/);
  assert.match(source, /\.byte \$02\s+; 40-column ANTIC 2 control hint/);
  assert.match(source, /lda #\$3E\s+; normal playfield, single-line PMG DMA/);
  assert.match(source, /lda #\$70\s*\n@wait_for_line:/);
});

test("accepted gameplay screen reference and its mapping decision are versioned", () => {
  assert.ok(fs.existsSync(path.join(rootDirectory, "assets", "graphics", "dark-fighter-screen-concept-v1.png")));
  assert.ok(fs.existsSync(path.join(rootDirectory, "docs", "decisions", "ADR-002-gameplay-screen.md")));
});

test("linker allows loader-only PMG tail but protects screen memory", () => {
  const config = fs.readFileSync(path.join(rootDirectory, "cfg", "atari-boot.cfg"), "utf8");
  assert.match(config, /MAIN:\s+start = \$2000, size = \$2000/);
  assert.match(config, /BOOTTAIL:\s+start = \$4000/);
  assert.match(config, /BROADSIDE_RAM:\s+start = \$5E10/);
});
