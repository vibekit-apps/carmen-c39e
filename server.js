// Zero-dependency server: static files from public/, JSON API from the
// `routes` table below. No npm install needed, so the first build is fast.
// Add express later if you actually need it.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const store = require('./lib/store');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

// ── API routes ────────────────────────────────────────────────────────
// Key is "METHOD /path". Handlers get (req, res) and may be async.
// Anything not matched here falls through to the static files in public/.
//
//   const store = require('./lib/store');
//   'GET /api/items':  (req, res) => json(res, store.read('items')),
//   'POST /api/items': async (req, res) => {
//     const item = await readBody(req);
//     json(res, store.write('items', [...store.read('items'), item]), 201);
//   },
const seed = [{ id: 'case-1', title: 'Interface choreography study', question: 'How do repeated visual cues establish sequence and intent?', createdAt: '2026-09-09T05:48:00Z' }];
function state() {
  const data = store.read('carmen', null);
  return data || { investigations: seed, evidence: [], leads: [] };
}
function save(data) { return store.write('carmen', data); }
function id(prefix) { return `${prefix}-${Date.now().toString(36)}`; }
function publicSearch(query) {
  return new Promise((resolve) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=14`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 Carmen research assistant' } }, (res) => {
      let raw = ''; res.on('data', c => raw += c); res.on('end', () => {
        const results = [...raw.matchAll(/<a href="(https?:\/\/[^"&]+)[^"]*"[^>]*><h3[^>]*>([\s\S]*?)<\/h3>/g)].slice(0, 6).map((m) => ({ url: m[1], title: m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'), source: new URL(m[1]).hostname, description: `Public web result matching “${query}”. Review and confirm before investigating.` }));
        resolve(results);
      });
    }).on('error', () => resolve([]));
  });
}
function analysisFor(item) {
  const text = `${item.notes || ''} ${item.sourceName || ''}`.trim();
  const visual = Boolean(item.image);
  return {
    observations: visual ? 'A user-provided visual asset is attached. Carmen preserves it as raw evidence; automated image recognition is not claimed here.' : (text ? `Captured source context: “${text}”. This establishes the source and investigator’s focus, not visual facts.` : 'A source was captured, but no visual asset or image description was supplied.'),
    objects: visual ? `Visual evidence is available. Source type: ${item.sourceType}.` : `Source type: ${item.sourceType}. Visual evidence is still required to establish visible components.`,
    inferences: text ? 'The supplied context suggests a relationship worth testing. This is a working interpretation, not an established fact.' : 'No structural inference is warranted yet.',
    signature: visual ? 'Structural signature: pending visual interpretation. Confidence: low.' : 'Structural signature: source context only. Confidence: low.',
    unknowns: 'Exact object identities, spatial relationships, sequence, and recurrence across sources remain unanswered.'
  };
}
const routes = {
  'GET /health': (req, res) => json(res, { status: 'ok', uptime: process.uptime() }),
  'GET /api/state': (req, res) => json(res, state()),
  'GET /api/search': async (req, res) => { const query = new URL(req.url, 'http://local').searchParams.get('q') || ''; if (!query.trim()) return json(res, { results: [] }); const results = await publicSearch(query.trim()); json(res, { query, results, provider: 'Public web search' }); },
  'POST /api/investigations': async (req, res) => { const body = await readBody(req); const data = state(); const item = { id: id('case'), title: body.title || 'Untitled investigation', question: body.question || '', createdAt: new Date().toISOString() }; data.investigations.unshift(item); save(data); json(res, item, 201); },
  'POST /api/evidence': async (req, res) => { const body = await readBody(req); const data = state(); const duplicate = data.evidence.find((e) => e.investigationId === body.investigationId && e.url && e.url === body.url); if (duplicate) return json(res, { error: 'That URL is already captured in this investigation.', duplicate }, 409); const item = { id: id('evidence'), investigationId: body.investigationId, sourceType: body.sourceType || 'Web', url: body.url || '', sourceName: body.sourceName || '', notes: body.notes || '', image: body.image || '', createdAt: new Date().toISOString() }; item.analysis = analysisFor(item); data.evidence.unshift(item); data.leads.unshift({ id: id('lead'), investigationId: item.investigationId, question: `What additional visual evidence would test the working reading of this ${item.sourceType} source?`, why: 'The current capture records source context, but not enough direct visual detail to validate a pattern.', evidenceId: item.id, status: 'New' }); save(data); json(res, item, 201); },
  'PATCH /api/leads': async (req, res) => { const body = await readBody(req); const data = state(); const lead = data.leads.find((l) => l.id === body.id); if (!lead) return json(res, { error: 'Lead not found' }, 404); lead.status = body.status; save(data); json(res, lead); },
};

function json(res, data, status = 200) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

/** Parse a JSON request body: `const data = await readBody(req)`. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      // Cap the body so one bad request can't exhaust memory.
      if (raw.length > 8e6) { req.destroy(); reject(new Error('Body too large')); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function sendFile(res, file, data) {
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(data);
}

/**
 * Decode a URL path, or null when the client sent broken percent-encoding.
 *
 * decodeURIComponent THROWS on a malformed escape ('/%E0%A4%A'), and any
 * crawler or fuzzer sends those eventually. Unhandled, it took the whole app
 * down: one bad URL, process exits, the user's site is dead until something
 * restarts it. A truncated escape is a bad request, not a server fault, so it
 * gets a 400 and the server stays up.
 */
function safeDecode(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

function serveStatic(req, res, pathname) {
  const decoded = pathname === '/' ? 'index.html' : safeDecode(pathname);
  if (decoded === null) return json(res, { error: 'Bad request' }, 400);
  const rel = decoded.replace(/^\/+/, '');
  const file = path.join(PUBLIC, rel);
  // Keep resolved paths inside public/ so `..` can't escape the web root.
  if (file !== PUBLIC && !file.startsWith(PUBLIC + path.sep)) return json(res, { error: 'Not found' }, 404);

  fs.readFile(file, (err, data) => {
    if (!err) return sendFile(res, file, data);
    // Extensionless miss = a client-side route; hand back the entry page.
    if (path.extname(rel)) return json(res, { error: 'Not found' }, 404);
    const entry = path.join(PUBLIC, 'index.html');
    fs.readFile(entry, (e, html) => (e ? json(res, { error: 'Not found' }, 404) : sendFile(res, entry, html)));
  });
}

http.createServer(async (req, res) => {
  // EVERY path is inside the try, including static files. It used to early-
  // return into serveStatic before the boundary, so anything that threw there
  // was an uncaught exception and killed the process instead of failing one
  // request.
  let pathname = req.url || '/';
  try {
    ({ pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`));
    const handler = routes[`${req.method} ${pathname}`];
    if (handler) await handler(req, res);
    else serveStatic(req, res, pathname);
  } catch (err) {
    console.error(`${req.method} ${pathname} failed:`, err.message);
    if (!res.headersSent) json(res, { error: 'Server error' }, 500);
  }
}).listen(PORT, () => console.log(`Listening on port ${PORT}`));
