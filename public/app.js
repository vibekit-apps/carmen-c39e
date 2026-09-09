// Tab switching, the install prompt, and the service worker. That is all.
// No framework, no build step, no bundle to keep in sync.

// ── Tabs ───────────────────────────────────────────────────────────
const tabs = document.querySelectorAll('.tab');
const screens = document.querySelectorAll('.screen');

function show(name) {
  screens.forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  tabs.forEach((t) => {
    const on = t.dataset.screen === name;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });
  // Each tab starts at the top, the way a native tab bar behaves.
  window.scrollTo(0, 0);
}
tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.screen)));

// ── Title ──────────────────────────────────────────────────────────
// Name the app after its subdomain until the agent gives it a real one, so a
// fresh build never says "Your app" on a page the user is already sharing.
const sub = location.hostname.split('.')[0];
if (sub && sub !== 'localhost' && !/^\d+$/.test(sub)) {
  const pretty = sub.replace(/-[a-z0-9]{4}$/i, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  if (pretty) {
    document.getElementById('app-name').textContent = pretty;
    document.title = pretty;
  }
}

// ── Install ────────────────────────────────────────────────────────
// Two different worlds. Chrome fires beforeinstallprompt and gives us a real
// button. iOS Safari has no such event and never will, so the only honest move
// there is to tell the user where the Share button is. Both are hidden once the
// app is already installed, since display-mode:standalone means we ARE the
// installed app and offering to install it again is nonsense.
const card = document.getElementById('install-card');
const btn = document.getElementById('install-btn');
const copy = document.getElementById('install-copy');
const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

let deferred = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  if (!installed) { card.hidden = false; btn.hidden = false; }
});

btn.addEventListener('click', async () => {
  if (!deferred) return;
  deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  card.hidden = true;
});

if (!installed && isIOS) {
  copy.textContent = 'Tap the Share button, then "Add to Home Screen". It opens full screen with its own icon.';
  card.hidden = false;
}

// ── Service worker ─────────────────────────────────────────────────
// See sw.js: network always wins, the cache is an offline fallback only.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
