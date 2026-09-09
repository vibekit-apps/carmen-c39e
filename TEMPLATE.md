# Template: Mobile

An installable phone app. Zero dependencies, so it boots with no `npm install`.
It is a shell to build ON, not a placeholder to delete.

## What's already built and wired (do NOT rebuild it)

```
server.js          zero-dep HTTP server: static files + JSON API + /health
lib/store.js       durable JSON storage, atomic writes (temp file + rename)
public/index.html  app bar + 3 tab screens + bottom tab bar
public/styles.css  design tokens — edit :root, don't re-invent a palette
public/app.js      tab switching, install prompt, service worker registration
public/sw.js       offline fallback ONLY (read the warning below)
```

- **This app installs to the home screen, and you do NOT wire that up.** The
  platform injects the manifest, the app icon, `theme-color` and the
  `apple-mobile-web-app-*` tags at the proxy, built from this app's real name
  with its own generated icon. **Never add a `<link rel="manifest">` or a
  `manifest.json`**: the platform steps aside the moment a page declares one,
  so a static manifest would replace the user's real app name and icon with a
  hardcoded placeholder on every install. Renaming the app is enough; the
  home-screen label follows automatically.
- **NEVER make the service worker cache CSS, JS or API responses.** This app is
  redeployed on every change, and a caching worker would serve the old build to
  a user who just asked for a new one. `public/sw.js` is deliberately
  network-first with a single offline fallback. Leave it that way.
- **Add screens as `<section class="screen">` plus a `.tab` button** with a
  matching `data-screen`. `app.js` wires them automatically, there is no router
  to touch. Three tabs is a starting point, not a rule: rename them to whatever
  the app is actually about.
- **Keep navigation in the bottom tab bar.** It is thumb-reachable, which is why
  phone apps put it there. Don't replace it with a hamburger or a top nav.
- **No dependencies, no `npm install`.** Keep it that way unless the app
  genuinely needs a package; every dependency costs the user an install on every
  build.
- **Add API routes to the `routes` table in `server.js`** (`'GET /api/items'`).
  There is a worked example in the comment above it.
- **Persist with `lib/store.js`**, don't hand-roll `fs.writeFileSync` — a
  non-atomic write corrupts the user's data when a container restarts mid-write.
- `/health` exists and the platform uses it. Don't remove it.

## Where things go

| Adding | Put it in |
|---|---|
| A screen | a `<section class="screen">` + a `.tab` button in `public/index.html` |
| An API endpoint | the `routes` table in `server.js` |
| Saved data | `lib/store.js` via `store.read` / `store.write` |
| Styling | `public/styles.css` (tokens first) |
| The app's name/icon | nothing to edit — the platform derives both from the app's name |
| Shared logic | a new file in `lib/` |

## Safe areas

`index.html` ships `viewport-fit=cover` and the CSS pads with
`env(safe-area-inset-*)`. Any new fixed-position element must respect those
insets or it will sit under the notch or the home indicator on a real phone.
