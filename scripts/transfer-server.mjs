import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".svg": "image/svg+xml",
};
// A single token budget is shared across all selected response bodies. Per-route
// delays cannot reproduce a cold reader competing with an offline installation.
export function transferServer(root) {
  const directory = resolve(root);
  const streams = new Set();
  let server;
  let port = 0;
  let rate = Infinity;
  let selected = null;
  let tokens = 0;
  let last = performance.now();
  const requests = [];
  const stalled = new Set();
  const compressed = new Set();
  const timer = setInterval(() => {
    const now = performance.now();
    const elapsed = (now - last) / 1000;
    last = now;
    if (!Number.isFinite(rate)) {
      for (const stream of streams) {
        stream.response.end(stream.bytes.subarray(stream.at));
        stream.receipt.sent = stream.bytes.length;
        streams.delete(stream);
      }
      return;
    }
    tokens = Math.min(rate / 8, tokens + rate * elapsed);
    const share = Math.max(1, Math.floor(tokens / Math.max(1, streams.size)));
    for (const stream of streams) {
      if (stream.response.destroyed) {
        streams.delete(stream);
        continue;
      }
      if (tokens < 1) break;
      const end = Math.min(stream.at + share, stream.bytes.length);
      stream.response.write(stream.bytes.subarray(stream.at, end));
      tokens -= end - stream.at;
      stream.at = end;
      stream.receipt.sent = end;
      if (end === stream.bytes.length) {
        stream.response.end();
        streams.delete(stream);
      }
    }
  }, 25);
  timer.unref();
  return {
    requests,
    stalled,
    compressed,
    get base() {
      return `http://127.0.0.1:${port}/traditio/`;
    },
    limit(bytesPerSecond, only = null) {
      rate = bytesPerSecond;
      selected = only ? new Set(only) : null;
      tokens = 0;
      last = performance.now();
    },
    async start() {
      if (server?.listening) return;
      server = createServer(async (req, res) => {
        try {
          const pathname = new URL(req.url, "http://localhost").pathname;
          if (!pathname.startsWith("/traditio/")) {
            res.writeHead(404).end();
            return;
          }
          const name = decodeURIComponent(pathname.slice(10)) || "index.html";
          const path = resolve(directory, name);
          if (!path.startsWith(`${directory}${sep}`)) {
            res.writeHead(404).end();
            return;
          }
          const plain = await readFile(path);
          const body = compressed.has(name) ? gzipSync(plain) : plain;
          const receipt = {
            path: name,
            bytes: plain.length,
            wireBytes: body.length,
            sent: 0,
            at: Date.now(),
            aborted: false,
          };
          requests.push(receipt);
          res.writeHead(200, {
            "Content-Type": mime[extname(path)] || "application/octet-stream",
            "Cache-Control": "no-store",
            ...(compressed.has(name) ? { "Content-Encoding": "gzip" } : {}),
          });
          const stream = { response: res, bytes: body, at: 0, receipt };
          res.on("close", () => {
            receipt.aborted = receipt.sent < body.length;
            streams.delete(stream);
          });
          if (stalled.has(name)) {
            res.write(body.subarray(0, Math.min(32, body.length)));
            receipt.sent = Math.min(32, body.length);
            return;
          }
          if (Number.isFinite(rate) && (!selected || selected.has(name))) streams.add(stream);
          else {
            receipt.sent = body.length;
            res.end(body);
          }
        } catch {
          res.writeHead(404).end();
        }
      });
      await new Promise((r, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", r);
      });
      port = server.address().port;
    },
    async stop() {
      if (!server?.listening) return;
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    },
    async close() {
      clearInterval(timer);
      await this.stop();
    },
  };
}
