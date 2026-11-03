import manifest from "./asset-manifest.json";
import sourceSets from "./source-sets.json";
import { readTransfer } from "./transfer.mjs";

export const assets = manifest;
export type Asset = (typeof assets)[number];
export type ByteIdentity = Pick<Asset, "path" | "bytes" | "sha256">;

export function asset(path: string): Asset {
  const found = assets.find((item) => item.path === path);
  if (!found) throw new Error(`Unknown retained file: ${path}`);
  return found;
}

// A new edition in another lesson must not be mislabeled as a Gaius casebook page.
export const ownershipPages = sourceSets.ownership.map(asset);

export async function verifiedBytes(
  item: ByteIdentity,
  signal?: AbortSignal,
  onProgress?: (received: number, total: number) => void,
  onResponse?: (response: Response) => void,
): Promise<ArrayBuffer> {
  try {
    return await readVerifiedFile(item, signal, onProgress, onResponse);
  } catch (error) {
    // Some browser reads bypass the worker. Discovered failures must also
    // invalidate the page's previous offline-readiness claim.
    if (!signal?.aborted) window.dispatchEvent(new Event("traditio:asset-failure"));
    throw error;
  }
}

export async function readVerifiedFile(
  item: ByteIdentity,
  signal?: AbortSignal,
  onProgress?: (received: number, total: number) => void,
  onResponse?: (response: Response) => void,
): Promise<ArrayBuffer> {
  let bytes: ArrayBuffer;
  const activity = new EventTarget();
  const controller = navigator.serviceWorker?.controller;
  const expectedEdition = document.querySelector<HTMLMetaElement>(
    'meta[name="traditio-edition"]',
  )?.content;
  const path = new URL(`${import.meta.env.BASE_URL}${item.path}`, location.href).pathname;
  let receivedByWorker = 0;
  let lastReported = -1;
  let mostReceived = 0;
  const report = (received: number, total: number) => {
    mostReceived = Math.max(mostReceived, received);
    if (mostReceived !== lastReported) {
      lastReported = mostReceived;
      onProgress?.(mostReceived, total);
    }
  };
  const workerProgress = (event: MessageEvent<unknown>) => {
    if (!controller || event.source !== controller) return;
    const value = event.data as {
      type?: unknown;
      edition?: unknown;
      url?: unknown;
      received?: unknown;
      total?: unknown;
    } | null;
    if (
      value?.type !== "asset-transfer-progress" ||
      value.edition !== expectedEdition ||
      value.url !== path ||
      value.total !== item.bytes ||
      !Number.isSafeInteger(value.received) ||
      typeof value.received !== "number" ||
      value.received <= receivedByWorker ||
      value.received > item.bytes
    )
      return;
    // A verified worker buffers the file before exposing its Response. Its real
    // byte progress is activity even though this page has no response headers yet.
    receivedByWorker = value.received;
    activity.dispatchEvent(new Event("progress"));
    report(value.received, item.bytes);
  };
  navigator.serviceWorker?.addEventListener("message", workerProgress);
  try {
    // Default-cache reads also work in offline Firefox. Identity comes from the
    // retained length and SHA-256, independently of the HTTP cache's freshness.
    bytes = await readTransfer(`${import.meta.env.BASE_URL}${item.path}`, {
      bytes: item.bytes,
      signal,
      onProgress: report,
      activity,
      onResponse,
    });
  } catch (error) {
    if (error instanceof Error && /^HTTP /.test(error.message))
      throw new Error(
        `Could not load ${item.path} (${error.message}). Try again when the file is available.`,
      );
    throw error;
  } finally {
    navigator.serviceWorker?.removeEventListener("message", workerProgress);
  }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  signal?.throwIfAborted();
  if (hash !== item.sha256)
    throw new Error(
      `The downloaded ${item.path} failed its source check. No substituted file will be used.`,
    );
  return bytes;
}

export async function dataUrl(item: Asset, signal?: AbortSignal): Promise<string> {
  const bytes = new Uint8Array(await verifiedBytes(item, signal));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 16_384)
    binary += String.fromCharCode(...bytes.subarray(i, i + 16_384));
  return `data:${item.mime};base64,${btoa(binary)}`;
}
