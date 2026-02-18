const CACHE_NAME = 'soja-v1'
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/img/logo/logo.png',
    '/img/logo/logo_blanco.png',
    '/img/LOGO SOJA.ico'
]

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    )
    self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    )
    self.clients.claim()
})

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)

    // Skip non-GET and Supabase API calls (always fresh)
    if (event.request.method !== 'GET' || url.hostname.includes('supabase')) return

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses for static assets
                if (response.ok && (url.pathname.startsWith('/img/') || url.pathname === '/')) {
                    const clone = response.clone()
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
                }
                return response
            })
            .catch(() => caches.match(event.request))
    )
})

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {}
    const title = data.title || '🍜 SOJA - Nuevo Pedido'
    const options = {
        body: data.body || 'Tienes un nuevo pedido esperando',
        icon: '/img/logo/logo.png',
        badge: '/img/logo/logo.png',
        vibrate: [200, 100, 200],
        data: data.url || '/',
        actions: [
            { action: 'view', title: 'Ver Pedido' },
            { action: 'dismiss', title: 'Ignorar' }
        ]
    }
    event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    if (event.action === 'view' || !event.action) {
        event.waitUntil(clients.openWindow(event.notification.data || '/'))
    }
})
