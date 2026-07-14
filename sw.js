/* Dylan's Wine Cellar — Service Worker (v2)
   - HTML(문서)은 '네트워크 우선' → 새로 배포하면 항상 최신이 뜨고, 오프라인일 때만 캐시 사용.
   - 지도 라이브러리(Leaflet / markercluster CDN)는 '캐시 우선' → 한 번 받으면 이후엔 CDN이 흔들려도 안정적으로 로드.
   - Supabase API / 지도 타일 등은 항상 네트워크로 통과. */
const CACHE = 'cellar-shell-v3';
const LIB   = 'cellar-lib-v3';
const SHELL = [
  './', './index.html', './config.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-512-maskable.png', './apple-touch-icon.png'
];
const LIB_HOSTS = ['cdnjs.cloudflare.com','cdn.jsdelivr.net','unpkg.com'];
const isLib = (u)=> LIB_HOSTS.includes(u.hostname) && /(leaflet|markercluster)/i.test(u.pathname);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c)=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys)=>Promise.all(
      keys.filter((k)=>k!==CACHE && k!==LIB).map((k)=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = (url.origin === self.location.origin);
  const isDoc = req.mode === 'navigate' ||
                (sameOrigin && /\.(html)$/i.test(url.pathname)) ||
                (sameOrigin && (url.pathname === '/' || url.pathname.endsWith('/')));

  // 1) 문서(HTML): 네트워크 우선 → 최신 보장, 실패 시 캐시
  if (isDoc) {
    e.respondWith(
      fetch(req).then((res)=>{
        const copy = res.clone();
        caches.open(CACHE).then((c)=>c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=> caches.match(req).then((hit)=> hit || caches.match('./index.html')))
    );
    return;
  }

  // 2) 지도 라이브러리(CDN): 캐시 우선(있으면 즉시), 없으면 네트워크로 받아 캐시
  if (isLib(url)) {
    e.respondWith(
      caches.match(req).then((hit)=> hit || fetch(req).then((res)=>{
        const copy = res.clone();
        caches.open(LIB).then((c)=>c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=> hit))
    );
    return;
  }

  // 3) 같은 출처 정적 자산(아이콘/매니페스트/config): 캐시 우선
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then((hit)=> hit || fetch(req).then((res)=>{
        const copy = res.clone();
        caches.open(CACHE).then((c)=>c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=>hit))
    );
    return;
  }
  // 4) 그 외(Supabase API, 지도 타일 등): 통과
});
