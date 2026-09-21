const CACHE_NAME = 'AttendFrame-cache-v1';
const ASSETS = [
  './',
  './Class Schedule.html',
  './manifest.json',
  './html2canvas_min.js',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 注意：原来用 cache.addAll(ASSETS) 是"全部成功才生效"的原子操作——
      // 只要列表里任何一个资源（比如某个图标）请求失败，addAll 会整体抛错，
      // 外层又用 .catch(()=>{}) 把这个错误默默吞掉，结果就是缓存里其实什么都没存进去，
      // 这正是"装上 PWA 后完全无法离线使用"的根本原因。
      // 改成逐个添加，即使某一项失败，其余资源仍然能正常离线可用，并把失败原因打印出来方便排查。
      const results = await Promise.allSettled(ASSETS.map((url) => cache.add(url)));
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error('[SW] 预缓存失败:', ASSETS[i], r.reason);
        }
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
