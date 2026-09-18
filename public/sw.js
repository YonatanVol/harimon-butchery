/**
 * The shop's service worker. It exists so the shop can be installed on a phone and so a lost connection
 * says something useful instead of showing the browser's error page.
 *
 * It deliberately caches almost nothing: only Next's hashed, immutable build files and one offline page.
 * Prices, stock and delivery windows are never served from a cache — a butcher's shop must not show
 * yesterday's price because the phone remembered it.
 */

const VERSION = "harimon-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages always come from the shop. Only when the network fails does the offline page step in.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r ?? Response.error())));
    return;
  }

  // Build files carry a hash in their name, so a cached copy can never be the wrong one.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
