import manifest from "./asset-manifest.json";

export const assets = manifest;
export type Asset = (typeof assets)[number];

export function asset(path: string): Asset {
  const found = assets.find((item) => item.path === path);
  if (!found) throw new Error(`Unknown retained file: ${path}`);
  return found;
}

export async function verifiedBytes(item: Asset, signal?: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch(`${import.meta.env.BASE_URL}${item.path}`, {
    cache: "no-store",
    ...(signal ? { signal } : {}),
  });
  if (!response.ok)
    throw new Error(
      `Could not load ${item.path} (HTTP ${response.status}). Try again when the file is available.`,
    );
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== item.bytes)
    throw new Error(
      `The downloaded ${item.path} does not match this edition. Reload the page before trying again.`,
    );
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (hash !== item.sha256)
    throw new Error(
      `The downloaded ${item.path} failed its source check. No substituted file will be used.`,
    );
  return bytes;
}

export async function dataUrl(item: Asset): Promise<string> {
  const bytes = new Uint8Array(await verifiedBytes(item));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 16_384)
    binary += String.fromCharCode(...bytes.subarray(i, i + 16_384));
  return `data:${item.mime};base64,${btoa(binary)}`;
}
