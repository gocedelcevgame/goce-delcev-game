// WPA educational games - controlled public playtest cache.
const CACHE_NAME = 'wpa-goce-playtest-2.5.7';
const ASSETS = [
  "./living-world.js",
  "./living-world.css",
  "./assets/ambience/songbirds.mp3",
  "./assets/ambience/brook.mp3",
  "./assets/ambience/breeze.mp3",
  "./assets/ambience/dusk-insects.mp3",
  "./assets/audio/pesna-patot-na-slobodata.m4a",
  "./ai/ai-companions.js",
  "./assets/images/goce-hero.svg",
  "./assets/images/logo.svg",
  "./assets/ui/icon.svg",
  "./certificate.html",
  "./crossover.html",
  "./data/characters.json",
  "./data/dialogues.json",
  "./data/levels.en.json",
  "./data/levels.json",
  "./data/missions.json",
  "./data/protocol-facts.json",
  "./data/quiz.en.json",
  "./data/quiz.json",
  "./edition.js",
  "./game.js",
  "./i18n.js",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-16.png",
  "./icons/favicon-32.png",
  "./icons/icon-128.png",
  "./icons/icon-144.png",
  "./icons/icon-152.png",
  "./icons/icon-192.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-maskable-512.png",
  "./index.html",
  "./manifest.json",
  "./privacy.html",
  "./style.css",
  "./teacher.html"
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    for(const path of ASSETS){try{await cache.add(path);}catch(err){console.warn('[WPA SW] optional asset unavailable:',path);}}
  }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('wpa-goce-playtest-') && key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate') {
    event.respondWith(fetch(req).then(res=>{if(res.ok){const clone=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,clone));}return res;}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});
