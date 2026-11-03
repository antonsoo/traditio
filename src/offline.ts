import { readVerifiedFile } from "./assets";

export function installOffline(status: HTMLElement, saveEditable: HTMLElement): void {
  if (import.meta.env.DEV) {
    status.textContent = "Offline installation is available in the production build.";
    return;
  }
  if (!("serviceWorker" in navigator)) {
    status.textContent =
      "This browser cannot install an offline edition. Save a casebook to read offline.";
    return;
  }
  const expected = document.querySelector<HTMLMetaElement>(
    'meta[name="traditio-edition"]',
  )?.content;
  if (!expected) {
    status.textContent =
      "This page has no edition identity. Save editable work and reopen a production edition before using offline retention.";
    return;
  }
  let editionNotice: HTMLElement | undefined;
  function showEditionNotice(mismatch: boolean): void {
    if (!mismatch) {
      editionNotice?.remove();
      editionNotice = undefined;
      return;
    }
    if (editionNotice) return;
    editionNotice = document.createElement("aside");
    editionNotice.className = "edition-notice";
    editionNotice.setAttribute("aria-labelledby", "edition-notice-title");
    const title = document.createElement("h2");
    title.id = "edition-notice-title";
    title.textContent = "Two editions are open.";
    const explanation = document.createElement("p");
    explanation.textContent =
      "Save editable work in each open lesson, close every Traditio tab, then reopen while connected. Reopen your saved records to continue. Illustrated readings may be unavailable until then.";
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save editable work from this lesson";
    save.addEventListener("click", () => saveEditable.click());
    editionNotice.append(title, explanation, save);
    document.querySelector("main")?.prepend(editionNotice);
  }
  const watched = new WeakSet<ServiceWorker>();
  let request = 0;
  let hasBeenReady = false;
  let pending: (() => void) | undefined;
  type Progress = {
    type?: unknown;
    edition?: unknown;
    phase?: unknown;
    checked?: unknown;
    files?: unknown;
    received?: unknown;
    totalBytes?: unknown;
    complete?: unknown;
    reason?: unknown;
    manifest?: unknown;
    transferMode?: unknown;
  };
  function progressText(value: Progress): string | null {
    if (
      value.edition !== expected ||
      typeof value.checked !== "number" ||
      typeof value.files !== "number" ||
      value.files < 1 ||
      value.checked < 0 ||
      value.checked > value.files
    )
      return null;
    if (value.phase === "check")
      return `Checking saved lessons and sources: ${value.checked} of ${value.files} files.`;
    if (
      (value.phase === "install" || value.phase === "repair") &&
      typeof value.received === "number" &&
      typeof value.totalBytes === "number" &&
      value.totalBytes > 0
    ) {
      const percent = Math.max(
        0,
        Math.min(100, Math.floor((100 * value.received) / value.totalBytes)),
      );
      return `${value.phase === "install" ? "Saving" : "Repairing"} lessons and sources: ${percent}% received. Offline readiness still needs verification.`;
    }
    return null;
  }
  type FileIdentity = { url: string; hash: string; bytes: number };
  function inventory(value: Progress): FileIdentity[] | null {
    if (
      value.transferMode !== "client-batches" ||
      !Array.isArray(value.manifest) ||
      value.manifest.length !== value.files ||
      value.manifest.length > 2048
    )
      return null;
    const files: FileIdentity[] = [];
    for (const item of value.manifest) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.url !== "string" ||
        typeof item.hash !== "string" ||
        !/^[a-f0-9]{64}$/.test(item.hash) ||
        !Number.isSafeInteger(item.bytes) ||
        item.bytes < 0 ||
        item.bytes > 64 * 1024 * 1024
      )
        return null;
      const url = new URL(item.url, location.href);
      if (
        url.origin !== location.origin ||
        !url.pathname.startsWith(import.meta.env.BASE_URL) ||
        url.search ||
        url.hash
      )
        return null;
      files.push({ url: url.pathname, hash: item.hash, bytes: item.bytes });
    }
    return new Set(files.map((f) => f.url)).size === files.length ? files : null;
  }
  async function retain(
    files: FileIdentity[],
    signal: AbortSignal,
    progress: (text: string) => void,
  ): Promise<void> {
    const cache = await caches.open(`traditio-${expected}`);
    const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
    let saved = 0;
    for (let index = 0; index < files.length; index++) {
      signal.throwIfAborted();
      const file = files[index];
      if (!file) continue;
      const response = await cache.match(file.url);
      let matches = false;
      if (response?.ok) {
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength === file.bytes) {
          const digest = Array.from(
            new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
            (b) => b.toString(16).padStart(2, "0"),
          ).join("");
          matches = digest === file.hash;
        }
      }
      if (!matches) {
        let headers = new Headers();
        const bytes = await readVerifiedFile(
          {
            path: file.url.slice(import.meta.env.BASE_URL.length),
            bytes: file.bytes,
            sha256: file.hash,
          },
          signal,
          (received) => {
            const text = progressText({
              edition: expected,
              phase: hasBeenReady ? "repair" : "install",
              checked: index,
              files: files.length,
              received: saved + received,
              totalBytes,
            });
            if (text) progress(text);
          },
          (response) => {
            headers = new Headers(response.headers);
          },
        );
        signal.throwIfAborted();
        headers.delete("Content-Encoding");
        headers.delete("Content-Length");
        headers.delete("Content-Range");
        await cache.put(file.url, new Response(bytes, { headers }));
      }
      saved += file.bytes;
      const text = progressText({
        edition: expected,
        phase: hasBeenReady ? "repair" : "install",
        checked: index + 1,
        files: files.length,
        received: saved,
        totalBytes,
      });
      if (text) progress(text);
    }
  }
  async function inspect(): Promise<void> {
    const id = ++request;
    pending?.();
    pending = undefined;
    const controller = navigator.serviceWorker.controller;
    // A newly introduced route can remain uncontrolled while the new worker
    // waits for older tabs. Ask the active worker which edition is saved too.
    const worker =
      controller ||
      (await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL))?.active;
    if (id !== request || controller !== navigator.serviceWorker.controller) return;
    if (!worker) {
      status.textContent = "Preparing this edition for offline reading…";
      return;
    }
    status.textContent = "Checking this edition’s offline files…";
    const channel = new MessageChannel();
    let quietTimer = 0;
    let hardTimer = 0;
    const cleanup = () => {
      clearTimeout(quietTimer);
      clearTimeout(hardTimer);
      channel.port1.close();
      if (pending === cleanup) pending = undefined;
    };
    pending = cleanup;
    const timeout = () => {
      cleanup();
      if (id === request)
        status.textContent =
          "Offline availability could not be confirmed. Save editable work and reconnect, then reload to try again.";
    };
    const activity = () => {
      clearTimeout(quietTimer);
      quietTimer = window.setTimeout(timeout, 30_000);
    };
    activity();
    hardTimer = window.setTimeout(timeout, 315_000);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      if (id !== request || controller !== navigator.serviceWorker.controller) {
        cleanup();
        return;
      }
      const value = event.data as Progress | null;
      if (value?.type === "progress") {
        const text = progressText(value);
        if (text) {
          status.textContent = text;
          activity();
        }
        return;
      }
      cleanup();
      const files = value ? inventory(value) : null;
      if (
        value &&
        value.edition === expected &&
        value.complete === false &&
        files &&
        navigator.onLine
      ) {
        const job = new AbortController();
        const timer = window.setTimeout(
          () => job.abort(new DOMException("Offline saving took too long", "TimeoutError")),
          300_000,
        );
        const stop = () => {
          clearTimeout(timer);
          job.abort();
          if (pending === stop) pending = undefined;
        };
        pending = stop;
        void retain(files, job.signal, (text) => {
          if (id === request) status.textContent = text;
        })
          .then(() => {
            if (id === request) void inspect();
          })
          .catch(() => {
            if (id === request)
              status.textContent =
                "This edition is not fully available offline. Save editable work before reloading to continue saving its remaining files.";
          })
          .finally(() => {
            clearTimeout(timer);
            if (pending === stop) pending = undefined;
          });
        return;
      }
      if (value && value.edition === expected && value.complete === true && controller)
        hasBeenReady = true;
      const mismatch = typeof value?.edition === "string" && value.edition !== expected;
      showEditionNotice(mismatch);
      status.textContent = mismatch
        ? "This page and the saved edition differ. Save editable work in each lesson, close every Traditio tab, then reopen while connected."
        : value?.edition === expected && value?.complete === true && !controller
          ? "This edition’s files are saved. Save editable work before reloading to use them offline."
          : value?.edition === expected && value?.complete === true
            ? "This edition is available offline, including every source page."
            : "This edition is not fully available offline. Connect and reload, or save a casebook.";
    };
    worker.postMessage({ type: "inventory", repair: false }, [channel.port2]);
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    void inspect();
  });
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent<unknown>) => {
    const value = event.data as Progress | null;
    if (
      value?.type === "edition-install-failed" &&
      value.edition === expected &&
      event.source &&
      watched.has(event.source as ServiceWorker)
    ) {
      pending?.();
      ++request;
      status.textContent =
        "Offline installation did not complete. Save editable work before reloading to try again. The partial offline edition has been removed.";
      return;
    }
    if (
      value?.type === "edition-progress" &&
      event.source &&
      watched.has(event.source as ServiceWorker)
    ) {
      const worker = event.source as ServiceWorker;
      const text = progressText(value);
      if (text && worker.state === "installing") status.textContent = text;
      return;
    }
    if (event.source !== navigator.serviceWorker.controller) return;
    if (
      (value?.type === "inventory-invalidated" || value?.type === "inventory-restored") &&
      value.edition === expected
    )
      void inspect();
  });
  window.addEventListener("traditio:asset-failure", () => {
    void inspect();
  });
  window.addEventListener("online", () => {
    void inspect();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void inspect();
  });
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
    .then((registration) => {
      function watch(worker: ServiceWorker | null): void {
        if (!worker || watched.has(worker)) return;
        watched.add(worker);
        worker.addEventListener("statechange", () => {
          if (worker.state === "redundant" && !navigator.serviceWorker.controller) {
            ++request;
            pending?.();
            status.textContent =
              "Offline installation did not complete. Reconnect and reload to try again, or save a casebook.";
          } else void inspect();
        });
      }
      registration.addEventListener("updatefound", () => {
        watch(registration.installing);
      });
      // The first updatefound event can precede register() resolving.
      watch(registration.installing);
      watch(registration.active);
      watch(registration.waiting);
      return inspect();
    })
    .catch(() => {
      status.textContent =
        "Offline installation did not complete. The casebook is a separate portable copy.";
    });
}
