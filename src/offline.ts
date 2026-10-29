export function installOffline(status: HTMLElement): void {
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
  let request = 0;
  async function inspect(): Promise<void> {
    const id = ++request;
    const controller = navigator.serviceWorker.controller;
    if (!controller) {
      status.textContent = "Preparing this edition for offline reading…";
      return;
    }
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
      status.textContent =
        value?.edition === expected && value?.complete === true
          ? "This edition is available offline, including every source page."
          : "This edition is not fully available offline. Connect and reload, or save a casebook.";
    };
    controller.postMessage({ type: "inventory", repair: navigator.onLine }, [channel.port2]);
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => {
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
