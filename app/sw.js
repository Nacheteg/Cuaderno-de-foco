/* Cuaderno de Foco · service worker
   Guarda la app en el dispositivo para que abra y funcione sin internet.
   Cuando cambies cualquier archivo de la app, sube el número de VERSION para que se actualice. */
const VERSION='cuaderno-v1.0.0';
const SHELL=[
  './','./index.html','./css/app.css','./js/app.js','./js/reels-engine.js','./manifest.webmanifest',
  './icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png','./icons/favicon-32.png'
];
/* lector de PDF y fuentes: se guardan la primera vez que hay internet */
const EXTERNAL='cuaderno-externo';
const PRECACHE_EXTERNAL=[
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(VERSION);
    await c.addAll(SHELL);
    const x=await caches.open(EXTERNAL);
    await Promise.all(PRECACHE_EXTERNAL.map(u=>x.add(u).catch(()=>{})));
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys())if(k!==VERSION&&k!==EXTERNAL)await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message',e=>{if(e.data==='skipWaiting')self.skipWaiting()});

self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    if(req.mode==='navigate'){
      e.respondWith(caches.match('./index.html').then(r=>r||fetch(req)));
      return;
    }
    e.respondWith(caches.match(req,{ignoreSearch:true}).then(r=>r||fetch(req).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy))}
      return res;
    })));
    return;
  }
  if(/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)||url.hostname==='cdnjs.cloudflare.com'){
    e.respondWith(caches.open(EXTERNAL).then(async c=>{
      const hit=await c.match(req);
      const net=fetch(req).then(res=>{if(res.ok||res.type==='opaque')c.put(req,res.clone());return res}).catch(()=>hit);
      return hit||net;
    }));
  }
});

/* al tocar un aviso, abre la app */
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil((async()=>{
    const all=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of all){if('focus' in c)return c.focus()}
    return self.clients.openWindow('./');
  })());
});
