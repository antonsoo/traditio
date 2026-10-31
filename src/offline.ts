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
  let request = 0;
  async function inspect(): Promise<void> {
    const id = ++request;
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
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      if (id === request)
        status.textContent =
          "Offline availability could not be confirmed. Save a casebook for a portable copy.";
    }, 12_000);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      clearTimeout(timeout);
      channel.port1.close();
      if (id !== request || controller !== navigator.serviceWorker.controller) return;
      const value = event.data as { edition?: unknown; complete?: unknown; files?: unknown } | null;
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
    worker.postMessage({ type: "inventory", repair: navigator.onLine }, [channel.port2]);
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    void inspect();
  });
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.source !== navigator.serviceWorker.controller) return;
    const value = event.data as { type?: unknown; edition?: unknown } | null;
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
      const watched = new WeakSet<ServiceWorker>();
      function watch(worker: ServiceWorker | null): void {
        if (!worker || watched.has(worker)) return;
        watched.add(worker);
        worker.addEventListener("statechange", () => {
          if (worker.state === "redundant" && !navigator.serviceWorker.controller) {
            ++request;
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
      return inspect();
    })
    .catch(() => {
      status.textContent =
        "Offline installation did not complete. The casebook is a separate portable copy.";
    });
}
