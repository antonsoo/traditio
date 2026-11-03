// @ts-check
/**
 * Read a known static file without confusing slow progress with a stalled body.
 * Keep this function self-contained: the offline builder embeds the same code.
 * @param {string} url
 * @param {{bytes: number, signal?: AbortSignal | undefined, idleMs?: number, totalMs?: number, cache?: RequestCache, onProgress?: ((received: number, total: number) => void) | undefined, onResponse?: ((response: Response) => void) | undefined, activity?: EventTarget}} options
 * @returns {Promise<ArrayBuffer>}
 */
export async function readTransfer(url, options) {
  const { bytes: expected, signal, onProgress, onResponse } = options;
  const idleMs = options.idleMs ?? 15_000;
  const totalMs = options.totalMs ?? 180_000;
  if (!Number.isSafeInteger(expected) || expected < 0 || expected > 64 * 1024 * 1024)
    throw new RangeError("The retained file size is invalid.");
  const controller = new AbortController();
  const cancelled = () => controller.abort(signal?.reason);
  let timeoutKind = "";
  /** @param {"idle" | "total"} kind */
  const timeout = (kind) => {
    timeoutKind = kind;
    controller.abort(new DOMException("The transfer took too long", "TimeoutError"));
  };
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let idleTimer;
  const activity = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => timeout("idle"), idleMs);
  };
  const totalTimer = setTimeout(() => timeout("total"), totalMs);
  if (signal?.aborted) cancelled();
  else signal?.addEventListener("abort", cancelled, { once: true });
  activity();
  options.activity?.addEventListener("progress", activity);
  let reader;
  try {
    const response = await fetch(url, {
      cache: options.cache ?? "default",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    onResponse?.(response);
    const declared = response.headers.get("Content-Length");
    if (
      !response.headers.get("Content-Encoding") &&
      declared !== null &&
      Number(declared) !== expected
    )
      throw new Error("The downloaded file does not match this edition (length).");
    const output = new Uint8Array(expected);
    let received = 0;
    onProgress?.(received, expected);
    if (response.body) {
      reader = response.body.getReader();
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        if (!next.value.byteLength) continue;
        if (received + next.value.byteLength > expected)
          throw new Error("The downloaded file does not match this edition (too many bytes).");
        output.set(next.value, received);
        received += next.value.byteLength;
        activity();
        onProgress?.(received, expected);
      }
    } else {
      const body = new Uint8Array(await response.arrayBuffer());
      if (body.byteLength !== expected)
        throw new Error("The downloaded file does not match this edition (length).");
      output.set(body);
      received = body.byteLength;
    }
    controller.signal.throwIfAborted();
    if (received !== expected)
      throw new Error("The downloaded file does not match this edition (incomplete body).");
    onProgress?.(received, expected);
    return output.buffer;
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? new DOMException("Canceled", "AbortError");
    if (timeoutKind) {
      const explanation =
        timeoutKind === "idle"
          ? `no new data arrived for ${idleMs / 1000} seconds`
          : `the file exceeded ${totalMs / 1000} seconds in total`;
      throw new Error(
        `The source took too long: ${explanation}. Your work has been kept; check the connection and try again.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(idleTimer);
    clearTimeout(totalTimer);
    signal?.removeEventListener("abort", cancelled);
    options.activity?.removeEventListener("progress", activity);
    // Also stop a rejected oversized response, rather than leaving it downloading.
    controller.abort();
    reader?.releaseLock();
  }
}
