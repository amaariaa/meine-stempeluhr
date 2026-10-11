const FABULA_SW_VERSION="1.9.5.5";

self.addEventListener("install",event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith("story-studio-")||k.startsWith("fabula-")||k.startsWith("iskra-")||k.startsWith("litterum-")).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message",event=>{
  if(event.data?.type==="SKIP_WAITING")self.skipWaiting();
});

// Minimaler Netzwerk-Handler für eine sauber installierbare PWA.
// Es wird bewusst NICHT zwischengespeichert: neue Litterum-Versionen kommen weiterhin direkt vom Server
// und die App belegt dadurch praktisch keinen zusätzlichen Offline-Speicher.
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request));
});
