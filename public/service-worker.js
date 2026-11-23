// The site that used to live on this domain installed a service worker that keeps showing a
// saved copy of it. Browsers re-fetch this file from the network on every visit, so this
// replacement takes over, deletes the saved copy, removes itself and reloads the page.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const pages = await self.clients.matchAll({ type: "window" });
      for (const page of pages) page.navigate(page.url);
    })(),
  );
});
