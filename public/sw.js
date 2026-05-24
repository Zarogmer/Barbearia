/**
 * Service worker mínimo: stale-while-revalidate pra GETs estáticos
 * (ícones, manifest, fontes). Páginas e Server Actions passam direto
 * pela rede — não fazemos cache de HTML pra evitar mostrar dados
 * desatualizados de outro tenant.
 *
 * Estratégia: se o request bater no cache, devolve cached imediato
 * e atualiza em background. Senão, fetch normal.
 *
 * Cache version bumped manualmente quando shape do app muda.
 */
const CACHE = "lustro-v1";

const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Só GET em mesmo origin
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Skip HTML/document — sempre rede (evita vazar cache cross-tenant)
  if (req.mode === "navigate" || req.destination === "document") return;
  // Skip API / actions
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/data/")) return;

  // SWR pra assets estáticos
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );
});
