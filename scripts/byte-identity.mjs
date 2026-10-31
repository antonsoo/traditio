import assert from "node:assert/strict";
import { createHash } from "node:crypto";

/** Exact byte comparison with bounded diagnostics, even for large native readings. */
export function assertSameBytes(actual, expected, label = "Native artifact") {
  const observed = Buffer.isBuffer(actual) ? actual : Buffer.from(actual);
  const wanted = Buffer.isBuffer(expected) ? expected : Buffer.from(expected);
  if (observed.equals(wanted)) return;
  const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
  assert.fail(
    `${label}: byte mismatch; expected ${wanted.length} bytes, SHA-256 ${hash(wanted)}; observed ${observed.length} bytes, SHA-256 ${hash(observed)}.`,
  );
}
