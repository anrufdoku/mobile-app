// Service Worker für Push-Benachrichtigungen und Offline-Funktionalität

// Cache-Name für die Offline-Funktionalität
const CACHE_NAME = "embers-agent-dashboard-v1"

// Dateien, die im Cache gespeichert werden sollen
const urlsToCache = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/css/notification-styles.css",
  "/js/app.js",
  "/js/push-notifications.js",
  "/js/auth.js",
  "/js/config.js",
  "/js/mail-pool.js",
  "/js/ui.js",
  "/sounds/notification.mp3",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
]

// Installation des Service Workers
self.addEventListener("install", (event) => {
  console.log("Service Worker wird installiert")

  // Cache öffnen und Dateien hinzufügen
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Cache geöffnet")
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        console.log("Service Worker erfolgreich installiert")
        return self.skipWaiting()
      }),
  )
})

// Aktivierung des Service Workers
self.addEventListener("activate", (event) => {
  console.log("Service Worker wird aktiviert")

  // Alte Caches löschen
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Alter Cache wird gelöscht:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        console.log("Service Worker erfolgreich aktiviert")
        return self.clients.claim()
      }),
  )
})

// Fetch-Event-Handler für Offline-Funktionalität
self.addEventListener("fetch", (event) => {
  // Für API-Anfragen immer das Netzwerk verwenden
  if (event.request.url.includes("api.embers-callcenter.com") || event.request.url.includes("supabase.co")) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response
      }

      // Anfrage klonen, da sie nur einmal verwendet werden kann
      const fetchRequest = event.request.clone()

      return fetch(fetchRequest).then((response) => {
        // Prüfen, ob wir eine gültige Antwort erhalten haben
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response
        }

        // Antwort klonen, da sie nur einmal verwendet werden kann
        const responseToCache = response.clone()

        // Antwort im Cache speichern
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
    }),
  )
})

// Push-Event-Handler
self.addEventListener("push", (event) => {
  console.log("Push-Ereignis empfangen");

  let notificationData = {};

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      console.error("Fehler beim Parsen der Push-Daten:", error);
      notificationData = {
        title: "Neue Benachrichtigung",
        message: event.data.text(),
        url: "/",
      };
    }
  } else {
    notificationData = {
      title: "Neue Benachrichtigung",
      message: "Es gibt eine neue Benachrichtigung.",
      url: "/",
    };
  }

  // Benachrichtigung anzeigen
  const options = {
    body: notificationData.message || "Es gibt eine neue Benachrichtigung.",
    icon: "/images/icons/icon-192x192.png",
    badge: "/images/icons/icon-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      url: notificationData.url || "/",
      id: notificationData.id || Date.now().toString(),
    },
    actions: [
      {
        action: "open",
        title: "Öffnen",
      },
      {
        action: "close",
        title: "Schließen",
      },
    ],
  };

  // Benachrichtigung an alle Clients senden
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: "push",
        data: notificationData,
      });
    });
  });

  event.waitUntil(self.registration.showNotification(notificationData.title || "Neue Benachrichtigung", options));
});

  // Benachrichtigung anzeigen
  const options = {
    body: notificationData.message || "Es gibt eine neue Benachrichtigung.",
    icon: "/images/icons/icon-192x192.png",
    badge: "/images/icons/icon-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      url: notificationData.url || "/",
      id: notificationData.id || Date.now().toString(),
    },
    actions: [
      {
        action: "open",
        title: "Öffnen",
      },
      {
        action: "close",
        title: "Schließen",
      },
    ],
  }

  // Benachrichtigung an alle Clients senden
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: "push",
        data: notificationData,
      })
    })
  })

  event.waitUntil(self.registration.showNotification(notificationData.title || "Neue Benachrichtigung", options))
})

// Klick auf Benachrichtigung
self.addEventListener("notificationclick", (event) => {
  console.log("Auf Benachrichtigung geklickt", event)

  event.notification.close()

  if (event.action === "close") {
    return
  }

  const urlToOpen = event.notification.data.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // Prüfen, ob bereits ein Fenster geöffnet ist
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus()
        }
      }

      // Wenn kein Fenster geöffnet ist, neues Fenster öffnen
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    }),
  )
})

// Benachrichtigung geschlossen
self.addEventListener("notificationclose", (event) => {
  console.log("Benachrichtigung geschlossen", event)
})

// Synchronisierung im Hintergrund
self.addEventListener("sync", (event) => {
  console.log("Sync-Ereignis empfangen", event)

  if (event.tag === "sync-notifications") {
    event.waitUntil(syncNotifications())
  }
})

// Benachrichtigungen synchronisieren
async function syncNotifications() {
  try {
    // Hier könnte Code stehen, um Benachrichtigungen mit dem Server zu synchronisieren
    console.log("Benachrichtigungen werden synchronisiert")

    // Beispiel: Ungelesene Benachrichtigungen vom Server abrufen
    const response = await fetch("https://api.embers-callcenter.com/notifications/unread", {
      headers: {
        Authorization: "Bearer " + self.registration.pushManager.getSubscription(),
      },
    })

    if (!response.ok) {
      throw new Error("Fehler beim Abrufen der Benachrichtigungen")
    }

    const notifications = await response.json()

    // Benachrichtigungen an alle Clients senden
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "sync",
          data: notifications,
        })
      })
    })

    return true
  } catch (error) {
    console.error("Fehler bei der Synchronisierung der Benachrichtigungen:", error)
    return false
  }
}
