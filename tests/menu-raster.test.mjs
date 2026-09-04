import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const report = JSON.parse(fs.readFileSync(
  path.join(rootDirectory, "docs", "menu-raster-trace.json"), "utf8"));
const canonicalRaster =
  "ba90172fad6c1c799a14b74dfddc55946e0ed49308dbf24c5bb5fc4afcc4bb04";

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

test("native menu raster is exact for XEX/ATR and four cold RAM fills", () => {
  assert.equal(report.passed, true);
  assert.deepEqual(report.cold_ram_fills, [0x00, 0xa5, 0x5a, 0xff]);
  assert.equal(report.sessions.length, 8);
  assert.deepEqual(report.sessions.map(({ id }) => id), [
    "xex-00", "xex-a5", "xex-5a", "xex-ff",
    "atr-00", "atr-a5", "atr-5a", "atr-ff",
  ]);
  assert.equal(report.expected.canonical_raster_sha256, canonicalRaster);

  for (const session of report.sessions) {
    assert.equal(session.passed, true, session.id);
    assert.equal(session.transitions_completed, 3, session.id);
    assert.equal(session.pause_entries, 3, session.id);
    assert.equal(session.pause_latch_failures, 0, session.id);
    assert.equal(session.checks.length, 10, session.id);
    assert.equal(
      session.artifact.sha256,
      sha256(path.join(rootDirectory, session.artifact.path)),
      `${session.id} evidence must describe the current artifact`,
    );
    for (const check of session.checks) {
      assert.deepEqual([
        check.screen_difference,
        check.charset_difference,
        check.display_list_difference,
      ], [-1, -1, -1], `${session.id} menu generation ${check.generation}`);
      assert.deepEqual(check.registers.grafp, [0, 0, 0, 0]);
      assert.equal(check.registers.grafm, 0);
      assert.equal(check.registers.chbase, 0x4800);
      assert.equal(check.registers.dmactl, 0x22);
      assert.equal(check.registers.gractl, 0);
      assert.equal(check.registers.prior, 0);
      assert.equal(check.pmg_nonzero, 0);
      assert.equal(check.screenshot_sha256, canonicalRaster);
      assert.ok(check.brightest_run.horizontal < 32,
        `${session.id} contains a horizontal white stripe`);
      assert.ok(check.brightest_run.vertical < 32,
        `${session.id} contains a vertical white stripe`);
    }
  }
});

test("menu stays exact for 500 frames and after three production pause-quit returns", () => {
  for (const session of report.sessions) {
    const keys = new Set(session.checks.map(({ generation, menu_age: age }) =>
      `${generation}:${age}`));
    for (const key of [
      "0:3", "0:20", "0:500", "1:3", "1:20", "2:3", "2:20",
      "3:3", "3:20", "3:500",
    ]) assert.ok(keys.has(key), `${session.id} lacks checkpoint ${key}`);
  }
});

test("menu evidence preserves the audited boot streams and independent charsets", () => {
  const audit = report.memory_audit;
  assert.equal(audit.passed, true);
  assert.equal(audit.no_live_source_overwrite, true);
  assert.deepEqual(audit.live_source_overwrites, []);
  assert.deepEqual(audit.boot_stage_streams, [
    { source: 0x4766, destination: 0x7f16, bytes: 255 },
    { source: 0x4865, destination: 0x5348, bytes: 2543 },
    { source: 0x8c80, destination: 0x4801, bytes: 888 },
    { source: 0x2668, destination: 0x8100, bytes: 6653 },
    { source: 0x4065, destination: 0x7810, bytes: 1793 },
  ]);
  assert.deepEqual(audit.dfmc_records, [
    { start_sector: 102, sectors: 45, packed_bytes: 5639, raw_bytes: 6643,
      destination: 0x5e10, staging_id: 1 },
    { start_sector: 147, sectors: 8, packed_bytes: 888, raw_bytes: 888,
      destination: 0x8c80, staging_id: 2 },
    { start_sector: 155, sectors: 2, packed_bytes: 229, raw_bytes: 234,
      destination: 0x5259, staging_id: 2 },
    { start_sector: 157, sectors: 5, packed_bytes: 585, raw_bytes: 645,
      destination: 0x9d75, staging_id: 2 },
  ]);
  assert.deepEqual(audit.ranges.a2_runtime,
    { start: 0x9000, end_exclusive: 0x90ff });
  assert.deepEqual(audit.ranges.glue_holding,
    { start: 0x7f16, end_exclusive: 0x8000 });
  assert.deepEqual(audit.ranges.frontend_screen,
    { start: 0x4000, end_exclusive: 0x4400 });
  assert.deepEqual(audit.ranges.gameplay_charset,
    { start: 0x4400, end_exclusive: 0x4800 });
  assert.deepEqual(audit.ranges.frontend_charset,
    { start: 0x4800, end_exclusive: 0x4c00 });
  assert.deepEqual(audit.glyph_126_127, {
    gameplay_charset_addresses: [0x47f0, 0x47ff],
    frontend_charset_addresses: [0x4bf0, 0x4bff],
    frontend_max_used_glyph: 63,
    separate_charsets: true,
    frontend_full_charset_restored: true,
  });
});
