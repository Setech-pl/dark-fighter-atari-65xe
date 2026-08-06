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
  assert.match(source, /lda #\$3E\s+; normal playfield, single-line PMG DMA/);
  assert.match(source, /lda #\$70\s*\n@wait_for_line:/);
});

test("linker rejects code growth into reserved runtime graphics RAM", () => {
  const config = fs.readFileSync(path.join(rootDirectory, "cfg", "atari-boot.cfg"), "utf8");
  assert.match(config, /MAIN: start = \$2000, size = \$1000/);
});

