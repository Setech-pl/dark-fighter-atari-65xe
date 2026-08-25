import fs from "node:fs";
import path from "node:path";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function loadRuntimeSegments(rootDirectory) {
  const manifest = JSON.parse(fs.readFileSync(
    path.join(rootDirectory, "build", "manifest.json"), "utf8",
  ));
  const definitions = [
    ["resident", "resident-runtime.bin", manifest.residentRuntime.runAddress,
      manifest.residentRuntime.rawBytes],
    ["starfield", "starfield-runtime.bin", manifest.starfieldRuntime.runAddress,
      manifest.starfieldRuntime.bytes],
    ["broadside", "broadside-runtime.bin", manifest.broadsideRuntime.runAddress,
      manifest.broadsideRuntime.bytes],
    ["a2Kernel", "a2-kernel-runtime.bin", manifest.a2Kernel.runAddress,
      manifest.a2Kernel.bytes],
    ["entityCode", "entity-code-runtime.bin", manifest.entityEffects.codeRunAddress,
      manifest.entityEffects.codeBytes],
  ];
  const segments = definitions.map(([name, fileName, start, expectedBytes]) => {
    const data = fs.readFileSync(path.join(rootDirectory, "build", fileName));
    invariant(data.length === expectedBytes,
      `${name} runtime image is ${data.length} B; expected ${expectedBytes} B`);
    return { name, start, end: start + data.length - 1, data };
  });
  return { manifest, segments };
}

export function installRuntimeSegments(memory, rootDirectory) {
  invariant(memory.length >= 0x10000, "Runtime memory must cover the 6502 address space");
  const runtime = loadRuntimeSegments(rootDirectory);
  for (const segment of runtime.segments) memory.set(segment.data, segment.start);
  return runtime;
}

export function readRuntimeBytes(rootDirectory, address, length) {
  invariant(Number.isInteger(address) && Number.isInteger(length) && length >= 0,
    "Runtime byte range must use non-negative integer addresses and lengths");
  const { segments } = loadRuntimeSegments(rootDirectory);
  const segment = segments.find(({ start, end }) =>
    address >= start && address + length - 1 <= end);
  invariant(segment,
    `Runtime address $${address.toString(16)} + ${length} B is outside assembled segments`);
  return segment.data.subarray(address - segment.start, address - segment.start + length);
}
