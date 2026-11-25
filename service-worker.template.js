const CACHE='radio-cassette-__REVISION__';
const ASSETS=__ASSETS__;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('radio-cassette-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 const path=url.pathname==='/'||url.pathname==='/radiocassette.html'?'/index.html':url.pathname;
 if(!ASSETS.includes(path))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(path))||fetch(request)));
});
