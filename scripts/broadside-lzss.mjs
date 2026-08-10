// Literal runs use commands $01-$7F. Match commands are 1LLLLLDD followed by
// the low distance byte: length=L+3, distance=((DD<<8)|low)+1. Zero terminates.
export function packBroadsideLzss(bytes) {
  const output = [];
  let input = 0;
  let literals = [];
  const flushLiterals = () => {
    for (let offset = 0; offset < literals.length; offset += 127) {
      const run = literals.slice(offset, offset + 127);
      output.push(run.length, ...run);
    }
    literals = [];
  };

  while (input < bytes.length) {
    let bestLength = 0;
    let bestDistance = 0;
    const windowStart = Math.max(0, input - 1024);
    for (let candidate = input - 1; candidate >= windowStart; candidate -= 1) {
      if (bytes[candidate] !== bytes[input]) continue;
      let length = 1;
      while (length < 34 && input + length < bytes.length &&
        bytes[candidate + length] === bytes[input + length]) {
        length += 1;
      }
      if (length > bestLength) {
        bestLength = length;
        bestDistance = input - candidate;
      }
    }
    if (bestLength >= 3) {
      flushLiterals();
      const distance = bestDistance - 1;
      output.push(
        0x80 | ((bestLength - 3) << 2) | (distance >>> 8),
        distance & 0xff,
      );
      input += bestLength;
    } else {
      literals.push(bytes[input++]);
      if (literals.length === 127) flushLiterals();
    }
  }
  flushLiterals();
  output.push(0);
  return Buffer.from(output);
}

export function unpackBroadsideLzss(bytes) {
  const output = [];
  let input = 0;
  while (input < bytes.length) {
    const command = bytes[input++];
    if (command === 0) return Buffer.from(output);
    if ((command & 0x80) === 0) {
      if (input + command > bytes.length) throw new Error("Truncated broadside literal run");
      for (let index = 0; index < command; index += 1) output.push(bytes[input++]);
      continue;
    }
    if (input >= bytes.length) throw new Error("Truncated broadside match");
    const distance = 1 + ((command & 0x03) << 8) + bytes[input++];
    const length = 3 + ((command & 0x7c) >>> 2);
    if (distance > output.length) throw new Error("Broadside match precedes output");
    for (let index = 0; index < length; index += 1) {
      output.push(output[output.length - distance]);
    }
  }
  throw new Error("Broadside stream has no terminator");
}
