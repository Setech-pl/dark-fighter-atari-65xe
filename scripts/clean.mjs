import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");

const generatedFiles = [
  "build/main.o",
  "build/dark-fighter.bin",
  "build/dark-fighter.map",
  "build/dark-fighter.lbl",
  "build/manifest.json",
  "build/loader-screen.inc",
  "build/previews/gameplay-screen.png",
  "build/previews/loader-screen.png",
  "dist/dark-fighter-boot.bin",
  "dist/dark-fighter.xex",
  "dist/dark-fighter.atr",
  "dist/dark-fighter-manifest.json",
  "dist/dark-fighter-0.1.0.zip",
];

for (const relativePath of generatedFiles) {
  fs.rmSync(path.join(rootDirectory, relativePath), { force: true });
}

console.log("Generated Dark Fighter artifacts removed.");
