# Mobile Starter

An installable phone app: PWA shell, bottom tab bar, JSON API, and durable
storage. No framework, no build step, no `npm install`.

## What's inside

```
mobile/
  server.js             # static files from public/ + JSON API + /health
  lib/store.js          # atomic JSON storage (temp file + rename)
  public/index.html     # app bar, three tab screens, bottom tab bar
  public/styles.css     # design tokens, safe-area insets, tab bar
  public/app.js         # tab switching, install prompt, SW registration
  public/sw.js          # offline fallback only, never caches CSS/JS
```

## Run it

```
npm start          # http://localhost:3000
```

## Add it to your home screen

- **iPhone**: Share, then "Add to Home Screen".
- **Android/Chrome**: an Install button appears in the app.

It then opens full screen with its own icon, no browser chrome.

The manifest and the app icon are added by the platform from your app's name,
so there is no `manifest.json` in here to edit. Rename the app and the
home-screen label follows. (Running locally there is no manifest, which is
expected.)

## Add a screen

Add a `<section class="screen" id="screen-stats">` to `index.html` and a tab
button with `data-screen="stats"`. That is it, `app.js` picks it up.

## Add an API route

Add to the `routes` table in `server.js`:

```js
const store = require('./lib/store');
'GET /api/items': (req, res) => json(res, store.read('items')),
```

## A note on the service worker

`public/sw.js` deliberately does not cache CSS, JS or API responses. This app
redeploys on every change, and a caching worker would show you the previous
version of your own app. Network always wins; the cache is only there so the app
still opens with no connection.
