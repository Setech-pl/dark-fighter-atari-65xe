import crypto from "node:crypto";

export const runtimeArtifactNames = [
  "void-strike-65-boot.bin",
  "void-strike-65.xex",
  "void-strike-65.atr",
];

export function runtimeEvidencePhase(argumentsList) {
  if (argumentsList.includes("--refresh-wall-trace-candidate") ||
      argumentsList.includes("--force")) {
    throw new Error("Unsupported evidence bypass; use the explicit --candidate phase");
  }
  return argumentsList.includes("--candidate") ? "candidate" : "final";
}

export function runtimeArtifactDescriptor(path, bytes) {
  return {
    path,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

export function runtimeArtifactSet({ boot, xex, atr }) {
  return {
    "void-strike-65-boot.bin": runtimeArtifactDescriptor("dist/void-strike-65-boot.bin", boot),
    "void-strike-65.xex": runtimeArtifactDescriptor("dist/void-strike-65.xex", xex),
    "void-strike-65.atr": runtimeArtifactDescriptor("dist/void-strike-65.atr", atr),
  };
}

export function validateRuntimeEvidenceBinding(report, artifacts, options = {}) {
  const requireComplete = options.requireComplete ?? true;
  if (report?.schema_version !== 2) throw new Error("Runtime wall trace schema v2 is required");
  if (requireComplete && (report.evidence?.status !== "complete" ||
      report.evidence?.partial !== false ||
      !Number.isInteger(report.evidence?.required_sessions) ||
      report.evidence.required_sessions <= 0 ||
      report.evidence.completed_sessions !== report.evidence.required_sessions)) {
    throw new Error("Runtime wall trace is partial or incomplete");
  }
  for (const name of runtimeArtifactNames) {
    const expected = artifacts[name];
    const observed = report.artifacts?.[name];
    if (expected === undefined || observed === undefined ||
        observed.path !== expected.path || observed.bytes !== expected.bytes ||
        observed.sha256 !== expected.sha256) {
      throw new Error(`Runtime wall trace binding mismatch for ${name}`);
    }
  }
  const xex = artifacts["void-strike-65.xex"];
  if (report.artifact?.path !== xex.path || report.artifact?.bytes !== xex.bytes ||
      report.artifact?.sha256 !== xex.sha256) {
    throw new Error("Runtime wall trace compatibility XEX binding is inconsistent");
  }
  return true;
}
