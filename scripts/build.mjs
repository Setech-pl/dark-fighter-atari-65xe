import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { toolchain } from "romdev-toolchain-cc65";
import { makeAtr, makeXex, validateBuildDirectory } from "./formats.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const buildDirectory = path.join(rootDirectory, "build");
const distDirectory = path.join(rootDirectory, "dist");
const packageDefinition = JSON.parse(fs.readFileSync(path.join(rootDirectory, "package.json"), "utf8"));
const gameVersion = packageDefinition.version;
const quiet = process.argv.includes("--quiet");

function ensureDirectory(fsApi, directory) {
  const parts = directory.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    try {
      fsApi.mkdir(current);
    } catch (error) {
      if (error?.errno !== 20) {
        throw error;
      }
    }
  }
}

async function runWasmTool(name, inputFiles, args, outputFiles) {
  const definition = toolchain[name];
  if (!definition) {
    throw new Error(`Unknown cc65 tool: ${name}`);
  }

  const factory = (await import(pathToFileURL(definition.gluePath).href)).default;
  const logLines = [];
  const module = await factory({
    noInitialRun: true,
    print: (line) => logLines.push(String(line)),
    printErr: (line) => logLines.push(String(line)),
  });

  for (const [virtualPath, bytes] of Object.entries(inputFiles)) {
    ensureDirectory(module.FS, path.posix.dirname(virtualPath));
    module.FS.writeFile(virtualPath, bytes);
  }

  for (const virtualPath of outputFiles) {
    ensureDirectory(module.FS, path.posix.dirname(virtualPath));
  }

  const status = module.callMain(args);
  if (status !== 0) {
    throw new Error(`${name} failed with status ${status}\n${logLines.join("\n")}`);
  }

  const outputs = {};
  for (const virtualPath of outputFiles) {
    try {
      outputs[virtualPath] = Buffer.from(module.FS.readFile(virtualPath));
    } catch (error) {
      throw new Error(`${name} did not create ${virtualPath}\n${logLines.join("\n")}`, { cause: error });
    }
  }

  return { outputs, log: logLines.join("\n") };
}

function parseViceLabels(labelText) {
  const labels = new Map();
  for (const line of labelText.split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) {
      labels.set(match[2], Number.parseInt(match[1], 16));
    }
  }
  return labels;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function writeFile(targetPath, bytes) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, bytes);
}

async function build() {
  fs.mkdirSync(buildDirectory, { recursive: true });
  fs.mkdirSync(distDirectory, { recursive: true });

  const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"));
  const config = fs.readFileSync(path.join(rootDirectory, "cfg", "atari-boot.cfg"));

  const assembled = await runWasmTool(
    "ca65",
    { "/project/src/main.s": source },
    ["--cpu", "6502", "-g", "-o", "/project/build/main.o", "/project/src/main.s"],
    ["/project/build/main.o"],
  );

  const objectFile = assembled.outputs["/project/build/main.o"];
  writeFile(path.join(buildDirectory, "main.o"), objectFile);

  const linked = await runWasmTool(
    "ld65",
    {
      "/project/build/main.o": objectFile,
      "/project/cfg/atari-boot.cfg": config,
    },
    [
      "-C",
      "/project/cfg/atari-boot.cfg",
      "-o",
      "/project/build/dark-fighter.bin",
      "-m",
      "/project/build/dark-fighter.map",
      "-Ln",
      "/project/build/dark-fighter.lbl",
      "/project/build/main.o",
    ],
    [
      "/project/build/dark-fighter.bin",
      "/project/build/dark-fighter.map",
      "/project/build/dark-fighter.lbl",
    ],
  );

  const rawPayload = Buffer.from(linked.outputs["/project/build/dark-fighter.bin"]);
  const mapFile = linked.outputs["/project/build/dark-fighter.map"];
  const labelFile = linked.outputs["/project/build/dark-fighter.lbl"];
  const labels = parseViceLabels(labelFile.toString("utf8"));
  const startAddress = labels.get("start");
  const bootInitAddress = labels.get("boot_return");
  const loadAddress = 0x2000;

  if (!Number.isInteger(startAddress) || !Number.isInteger(bootInitAddress)) {
    throw new Error("ld65 label file is missing exported start or boot_return labels");
  }
  if (rawPayload.length > 0x1000) {
    throw new Error(`Payload is ${rawPayload.length} bytes and crosses the reserved $3000 boundary`);
  }

  const bootSectors = Math.ceil(rawPayload.length / 128);
  if (bootSectors < 1 || bootSectors > 255) {
    throw new Error(`Invalid Atari boot sector count: ${bootSectors}`);
  }

  rawPayload[1] = bootSectors;
  if (rawPayload.readUInt16LE(2) !== loadAddress) {
    throw new Error("Assembled boot header has an unexpected load address");
  }
  if (rawPayload.readUInt16LE(4) !== bootInitAddress) {
    throw new Error("Assembled boot header has an unexpected init address");
  }

  const xex = makeXex(loadAddress, startAddress, rawPayload);
  const atr = makeAtr(rawPayload);

  const manifest = {
    formatVersion: 1,
    gameVersion,
    target: "Atari 65XE PAL / 64 KB",
    toolchain: "romdev-toolchain-cc65@0.1.3",
    loadAddress,
    startAddress,
    bootInitAddress,
    bootSectors,
    payloadBytes: rawPayload.length,
    artifacts: {
      "dark-fighter-boot.bin": { bytes: rawPayload.length, sha256: sha256(rawPayload) },
      "dark-fighter.xex": { bytes: xex.length, sha256: sha256(xex) },
      "dark-fighter.atr": { bytes: atr.length, sha256: sha256(atr) },
    },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);

  writeFile(path.join(buildDirectory, "dark-fighter.bin"), rawPayload);
  writeFile(path.join(buildDirectory, "dark-fighter.map"), mapFile);
  writeFile(path.join(buildDirectory, "dark-fighter.lbl"), labelFile);
  writeFile(path.join(buildDirectory, "manifest.json"), manifestBytes);
  writeFile(path.join(distDirectory, "dark-fighter-boot.bin"), rawPayload);
  writeFile(path.join(distDirectory, "dark-fighter.xex"), xex);
  writeFile(path.join(distDirectory, "dark-fighter.atr"), atr);
  writeFile(path.join(distDirectory, "dark-fighter-manifest.json"), manifestBytes);

  validateBuildDirectory(rootDirectory);

  if (!quiet) {
    console.log(`Dark Fighter ${gameVersion} built successfully`);
    console.log(`  payload : ${rawPayload.length} bytes / ${bootSectors} sectors @ $${loadAddress.toString(16)}`);
    console.log(`  entry   : $${startAddress.toString(16)}`);
    console.log(`  XEX     : ${xex.length} bytes`);
    console.log(`  ATR     : ${atr.length} bytes`);
  }
}

build().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
