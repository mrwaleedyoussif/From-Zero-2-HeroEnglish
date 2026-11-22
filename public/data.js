// The old site on this domain was saved in some browsers (offline copy). That copy loads
// /data.js, so this file clears the saved copy and opens LinguaPath instead.
(async () => {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = (await globalThis.caches?.keys()) ?? [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    // Nothing saved, or the browser blocks it — just move on.
  }
  location.replace("/en");
})();
