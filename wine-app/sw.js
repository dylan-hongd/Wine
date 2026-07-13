/* Dylan's Wine Cellar — Service Worker
   앱 셸(정적 파일)만 캐시합니다. Supabase API·타일·CDN 요청은 항상 네트워크로 통과시켜
   로그인/데이터가 오프라인 캐시로 꼬이지 않게 합니다. */
const CACHE = 'cellar-shell-v1';
const SHELL = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                     // 쓰기 요청은 통과
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // Supabase/CDN/타일은 통과(캐시 안 함)

  // 앱 셸: 캐시 우선, 없으면 네트워크(그리고 캐시에 저장)
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit)
    )
  );
});
