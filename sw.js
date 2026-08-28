const CACHE_NAME = 'world-platform-v2-20260828';

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.webmanifest',
  './images/logo_1.png',
  './images/logo_2.png',
  './images/sample.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png'
];


// ==========================================
// 설치
// ==========================================
self.addEventListener('install', event => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())

  );

});


// ==========================================
// 활성화
// ==========================================
self.addEventListener('activate', event => {

  event.waitUntil(

    caches.keys()
      .then(keys => {

        return Promise.all(

          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))

        );

      })
      .then(() => self.clients.claim())

  );

});


// ==========================================
// 가져오기
// ==========================================
self.addEventListener('fetch', event => {

  if(event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 외부 사이트는 Service Worker가 처리하지 않음
  if(url.origin !== self.location.origin) return;


  // ==========================================
  // HTML / JS / CSS
  // 항상 최신 파일 우선
  // ==========================================
  if(
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ){

    event.respondWith(

      fetch(event.request)
        .then(response => {

          // 정상적으로 최신 파일을 가져왔다면
          // 캐시도 최신 파일로 교체
          if(response && response.ok){

            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, copy);
              });

          }

          return response;

        })
        .catch(() => {

          // 인터넷 연결이 안 될 때만 캐시 사용
          return caches.match(event.request);

        })

    );

    return;
  }


  // ==========================================
  // 이미지 / manifest 등
  // 캐시 우선
  // ==========================================
  event.respondWith(

    caches.match(event.request)
      .then(cached => {

        if(cached){
          return cached;
        }

        return fetch(event.request)
          .then(response => {

            if(response && response.ok){

              const copy = response.clone();

              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, copy);
                });

            }

            return response;

          });

      })

  );

});
