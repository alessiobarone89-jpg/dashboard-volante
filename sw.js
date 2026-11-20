/* Dashboard Volante - service worker: rende l'app disponibile offline.
   Ad ogni aggiornamento dell'app cambiare VERSIONE, così i telefoni scaricano i file nuovi. */
var VERSIONE = "volante-0.2.2";
var FILE = ["./", "./index.html", "./manifest.webmanifest", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSIONE).then(function (c) { return c.addAll(FILE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSIONE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  // Caratteri Google: dalla cache se già scaricati, altrimenti rete (in assenza di rete si usano i caratteri di sistema)
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(VERSIONE + "-font").then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { c.put(req, res.clone()); return res; });
      });
    }).catch(function () { return new Response("", { status: 504 }); }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // File dell'app: prima la cache (funziona offline), aggiornamento in background quando c'è rete
  e.respondWith(caches.open(VERSIONE).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
