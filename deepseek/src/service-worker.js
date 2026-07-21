// ============================================
// Service Worker - Offline podpora a caching
// ============================================

const CACHE_NAME = 'louka-aaa-v3.0.0';
const RUNTIME_CACHE = 'louka-runtime';

// Assety k přednačtení
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/game.bundle.js',
    '/vendor.bundle.js',
    '/styles.css',
    '/manifest.json',
    '/favicon.ico',
    '/assets/ui/logo-192.png',
    '/assets/ui/logo-512.png'
];

// Instalace Service Workeru
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Instalace');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Přednačítám assety');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => {
                console.log('✅ Všechny assety načteny');
                return self.skipWaiting();
            })
    );
});

// Aktivace Service Workeru
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Aktivace');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('🗑️ Mazání staré cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker aktivní');
            return self.clients.claim();
        })
    );
});

// Zachycení požadavků
self.addEventListener('fetch', (event) => {
    // Přeskočení non-GET požadavků
    if (event.request.method !== 'GET') return;

    // Strategie: Cache First pro statické assety, Network First pro API
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/api/')) {
        // API požadavky - Network First
        event.respondWith(networkFirstStrategy(event.request));
    } else if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|mp3|wav|ogg|glsl)$/)) {
        // Statické assety - Cache First
        event.respondWith(cacheFirstStrategy(event.request));
    } else {
        // Ostatní - Network First s fallbackem na cache
        event.respondWith(networkFirstStrategy(event.request));
    }
});

// Cache First strategie
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        // Aktualizace cache na pozadí
        fetch(request).then((response) => {
            if (response.ok) {
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, response);
                });
            }
        }).catch(() => {});

        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('❌ Fetch selhal:', error);

        // Fallback pro obrázky
        if (request.destination === 'image') {
            return caches.match('/assets/ui/offline-image.png');
        }

        return new Response('Offline - data nejsou dostupná', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Network First strategie
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('📡 Offline - používám cache pro:', request.url);

        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Offline fallback stránka
        if (request.destination === 'document') {
            return caches.match('/offline.html');
        }

        return new Response(JSON.stringify({ error: 'offline' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Background Sync pro offline data
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-game-data') {
        console.log('🔄 Synchronizace herních dat');
        event.waitUntil(syncGameData());
    }
});

async function syncGameData() {
    try {
        // Získání offline dat z IndexedDB
        const offlineData = await getOfflineData();

        if (offlineData && offlineData.length > 0) {
            // Odeslání na server
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(offlineData)
            });

            if (response.ok) {
                // Vyčištění synchronizovaných dat
                await clearOfflineData();
                console.log('✅ Data synchronizována');
            }
        }
    } catch (error) {
        console.error('❌ Synchronizace selhala:', error);
    }
}

// Push notifikace
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};

    const options = {
        body: data.body || 'Nová událost na louce!',
        icon: '/assets/ui/logo-192.png',
        badge: '/assets/ui/badge.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        },
        actions: [
            {
                action: 'open',
                title: 'Otevřít hru'
            },
            {
                action: 'close',
                title: 'Zavřít'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(
            data.title || '🌿 Louka',
            options
        )
    );
});

// Kliknutí na notifikaci
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        const url = event.notification.data?.url || '/';

        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                // Pokud je již okno otevřené, fokusovat ho
                for (const client of clientList) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Jinak otevřít nové
                return clients.openWindow(url);
            })
        );
    }
});

// Pomocné funkce pro IndexedDB
async function getOfflineData() {
    // Implementace pro získání offline dat
    return [];
}

async function clearOfflineData() {
    // Implementace pro vyčištění synchronizovaných dat
}
