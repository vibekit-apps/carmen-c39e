// Service worker: the minimum that makes this installable, and NOTHING more.
//
// READ THIS BEFORE ADDING CACHING. This app is edited live by an AI agent and
// redeployed constantly. A normal cache-first worker would serve the OLD build
// after every change, so the user asks for something, we ship it, and their
// phone still shows yesterday's app. That is far worse than having no worker at
// all, and it looks exactly like "the agent ignored me".
//
// So: network ALWAYS wins. The cache holds one thing, the last good shell, and
// it is only ever read when the network genuinely fails (tunnel, plane, dead
// wifi). Nothing else is cached, so nothing else can go stale.
const CACHE = 'shell-v1';
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  // Take over immediately instead of waiting for every tab to close, so a
  // redeploy is live on the next load rather than the next cold start.
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only navigations are handled. CSS, JS, images and API calls go straight to
  // the network with no interception, which is what keeps edits instant.
  if (request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Refresh the offline copy whenever the network gives us a good one.
        const copy = response.clone();
        caches.open(CACHE).then((c) => c.put(OFFLINE_URL, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(OFFLINE_URL).then((hit) => hit || Response.error()))
  );
});
