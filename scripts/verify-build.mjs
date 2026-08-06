import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBuildDirectory } from "./formats.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");

try {
  const { manifest } = validateBuildDirectory(rootDirectory);
  console.log("Dark Fighter artifacts are internally consistent.");
  console.log(`  payload : ${manifest.payloadBytes} bytes`);
  console.log(`  sectors : ${manifest.bootSectors}`);
  console.log(`  load    : $${manifest.loadAddress.toString(16)}`);
  console.log(`  start   : $${manifest.startAddress.toString(16)}`);
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}

