import assert from "node:assert/strict";
import test from "node:test";
import { assertSameBytes } from "../scripts/byte-identity.mjs";

test("a changed multi-megabyte reading fails with bounded diagnostics", () => {
  const expected = Buffer.alloc(2 * 1024 * 1024, 65);
  const actual = Buffer.from(expected);
  assertSameBytes(actual, expected);
  actual[actual.length - 1] = 66;
  assert.throws(
    () => assertSameBytes(actual, expected, "Retained reading"),
    (error) =>
      error.message.length < 400 &&
      /Retained reading: byte mismatch/.test(error.message) &&
      /expected 2097152 bytes, SHA-256 [a-f0-9]{64}; observed 2097152 bytes, SHA-256 [a-f0-9]{64}/.test(
        error.message,
      ),
  );
});
