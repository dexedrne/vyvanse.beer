// Substituted by the production build. Each deployment has one complete, immutable shell.
const SHELL = __SHELL_FILES__;
const VERSION = __SHELL_VERSION__;
const PREFIX = 'vyvanse-shell-';
const CACHE = PREFIX + VERSION;
const FILES = new Set(SHELL);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  // Keep the previous worker until the visitor chooses Update or all old windows close.
});
self.addEventListener('message', e => {
  if (e.data?.type === 'vyvanse:update') e.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function navigation(request) {
  const cache = await caches.open(CACHE);
  const installed = await cache.match('/');
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 2500);
  try {
    const response = await fetch(request, { signal: abort.signal, cache: 'no-store' });
    if (response.ok) {
      // A waiting deploy's unhashed art/models belong with its own HTML. Stay on this complete
      // shell until that worker activates; registration still checks for updates on every start.
      if (installed && await installed.clone().text() !== await response.clone().text()) return installed;
      return response;
    }
  } catch { /* offline or slow network: the complete installed shell starts instantly */ }
  finally { clearTimeout(timeout); }
  return installed || await cache.match('/offline.html') || Response.error();
}

async function asset(request) {
  const cache = await caches.open(CACHE);
  // These are exact same-origin static shell files. Their bytes do not vary by Origin;
  // ignoring that server header lets module requests reuse the no-Origin precache entry.
  const response = await cache.match(request, { ignoreVary: true });
  if (!response) return fetch(request);
  // Safari asks for byte ranges for the music. Cache only the complete file; slice on read.
  const range = request.headers?.get('range');
  if (!range) return response;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return fetch(request);
  const data = await response.arrayBuffer();
  const start = match[1] ? Number(match[1]) : Math.max(0, data.byteLength - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), data.byteLength - 1) : data.byteLength - 1;
  if (start > end || start >= data.byteLength) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${data.byteLength}` } });
  const headers = new Headers(response.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${data.byteLength}`);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(end - start + 1));
  return new Response(data.slice(start, end + 1), { status: 206, headers });
}

self.addEventListener('fetch', e => {
  const request = e.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
    e.respondWith(navigation(request));
  } else if (!url.search && FILES.has(url.pathname)) {
    e.respondWith(asset(request));
  }
  // Games (even same-origin frames), external quotes, wallets and API calls stay on the network.
});
