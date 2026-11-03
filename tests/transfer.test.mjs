import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { gzipSync } from "node:zlib";
import { readTransfer } from "../src/transfer.mjs";

let base;
const payload = Buffer.from(
  "A source whose network compression is not its retained identity. ".repeat(20),
);
const server = createServer((req, res) => {
  const path = req.url;
  if (path === "/gzip") {
    const bytes = gzipSync(payload);
    res.writeHead(200, { "Content-Encoding": "gzip", "Content-Length": bytes.length });
    res.end(bytes);
    return;
  }
  if (path === "/headers") {
    const timer = setTimeout(() => res.end("late"), 500);
    res.on("close", () => clearTimeout(timer));
    return;
  }
  res.writeHead(200, { "Content-Type": "application/octet-stream" });
  if (path === "/overflow") {
    res.end(Buffer.alloc(500));
    return;
  }
  if (path === "/short") {
    res.end(Buffer.alloc(5));
    return;
  }
  if (path === "/stall") {
    res.write(Buffer.alloc(10));
    return;
  }
  let sent = 0;
  const timer = setInterval(() => {
    const chunk = path === "/trickle" ? 1 : 10;
    res.write(Buffer.alloc(chunk, sent));
    sent += chunk;
    if (sent >= 50) {
      clearInterval(timer);
      res.end();
    }
  }, 25);
  res.on("close", () => clearInterval(timer));
});
before(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
});
test("active chunks survive an inactivity window shorter than the whole transfer", async () => {
  const samples = [];
  const bytes = new Uint8Array(
    await readTransfer(`${base}/progress`, {
      bytes: 50,
      idleMs: 80,
      totalMs: 1000,
      onProgress: (received) => samples.push(received),
    }),
  );
  assert.deepEqual(
    [...bytes],
    [0, 10, 20, 30, 40].flatMap((value) => Array(10).fill(value)),
  );
  assert.ok(samples.some((n) => n > 0 && n < 50));
  assert.equal(samples.at(-1), 50);
});
test("stalled headers and a stalled body time out instead of waiting indefinitely", async () => {
  for (const path of ["headers", "stall"])
    await assert.rejects(
      readTransfer(`${base}/${path}`, { bytes: 50, idleMs: 70, totalMs: 1000 }),
      /no new data arrived/,
    );
});
test("a trickle cannot evade the separate total deadline", async () => {
  await assert.rejects(
    readTransfer(`${base}/trickle`, { bytes: 50, idleMs: 80, totalMs: 140 }),
    /in total/,
  );
});
test("short and oversized chunked bodies cannot become a retained file", async () => {
  await assert.rejects(readTransfer(`${base}/short`, { bytes: 50 }), /incomplete body/);
  await assert.rejects(readTransfer(`${base}/overflow`, { bytes: 50 }), /too many bytes/);
});
test("HTTP compression does not replace the decoded byte identity", async () => {
  assert.deepEqual(
    Buffer.from(await readTransfer(`${base}/gzip`, { bytes: payload.length })),
    payload,
  );
});
test("caller cancellation retains its reason and stops an active read", async () => {
  const controller = new AbortController();
  const reason = new Error("The reader selected another page.");
  const timer = setTimeout(() => controller.abort(reason), 60);
  try {
    await assert.rejects(
      readTransfer(`${base}/trickle`, { bytes: 50, signal: controller.signal }),
      (e) => e === reason,
    );
  } finally {
    clearTimeout(timer);
  }
});
test("progress from a verifying intermediary keeps a pending response alive", async () => {
  const activity = new EventTarget();
  const timer = setInterval(() => activity.dispatchEvent(new Event("progress")), 25);
  try {
    const bytes = await readTransfer(`${base}/headers`, {
      bytes: 4,
      idleMs: 100,
      totalMs: 1200,
      activity,
    });
    assert.equal(Buffer.from(bytes).toString(), "late");
  } finally {
    clearInterval(timer);
  }
});
test("intermediary progress still cannot defeat the total deadline", async () => {
  const activity = new EventTarget();
  const timer = setInterval(() => activity.dispatchEvent(new Event("progress")), 25);
  try {
    await assert.rejects(
      readTransfer(`${base}/headers`, { bytes: 4, idleMs: 100, totalMs: 180, activity }),
      /in total/,
    );
  } finally {
    clearInterval(timer);
  }
});
