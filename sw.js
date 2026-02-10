// HP Serial Check — Service Worker (PWA 완전 오프라인 지원)
const CACHE_NAME = 'hp-serial-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // 바코드/QR 코드 리더
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js',
  // Tesseract.js 코어
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  // Tesseract.js worker (런타임에 로드됨)
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
  // Tesseract WASM 코어
  'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
  // 영어 OCR 학습 데이터
  'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz'
];

// 설치: 모든 리소스 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 하나씩 캐싱 (일부 실패해도 계속 진행)
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] 캐싱 실패:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// 활성화: 이전 버전 캐시 제거
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 캐시 우선, 없으면 네트워크 → 캐시에 저장
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // 캐시에 있으면 즉시 반환 + 백그라운드에서 업데이트
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {});
        return cached;
      }
      // 캐시에 없으면 네트워크에서 가져와서 캐싱
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
