// notification-service.js
// Dieser Service verwaltet die Benachrichtigungen in der lokalen Datenbank

// WICHTIG: Supabase-Client über globale Variable verwenden statt Import
// Entfernen Sie: import { createClient } from "@supabase/supabase-js"

class NotificationService {
  constructor() {
    this.dbName = "notificationsDB"
    this.dbVersion = 1
    this.storeName = "notifications"
    this.db = null
    this.listeners = []

    // Supabase-Client initialisieren
    // Verwende die globale supabase-Variable
    this.supabase = window.supabase
  }

  // Rest des Codes bleibt unverändert...

  // Initialisierung des Services
  async init() {
    try {
      // IndexedDB öffnen
      this.db = await this.openDB()

      // Service Worker für Push-Benachrichtigungen initialisieren
      if ("serviceWorker" in navigator && "PushManager" in window) {
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data && event.data.type === "push") {
            this.handlePushMessage(event.data.data)
          }
        })
      }

      console.log("NotificationService erfolgreich initialisiert")
      return true
    } catch (error) {
      console.error("Fehler bei der Initialisierung des NotificationService:", error)
      return false
    }
  }

  // IndexedDB öffnen
  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = (event) => {
        reject("Fehler beim Öffnen der Datenbank")
      }

      request.onsuccess = (event) => {
        resolve(event.target.result)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Objektspeicher erstellen, falls er nicht existiert
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "id" })
          store.createIndex("read", "read", { unique: false })
          store.createIndex("created_at", "created_at", { unique: false })
        }
      }
    })
  }

  // Benachrichtigungen abrufen
  async getNotifications() {
    try {
      if (!this.db) {
        this.db = await this.openDB()
      }

      // Transaktion starten
      const transaction = this.db.transaction([this.storeName], "readonly")
      const store = transaction.objectStore(this.storeName)

      // Alle Benachrichtigungen abrufen
      return new Promise((resolve, reject) => {
        const request = store.getAll()

        request.onerror = () => {
          reject("Fehler beim Abrufen der Benachrichtigungen")
        }

        request.onsuccess = () => {
          resolve(request.result || [])
        }
      })
    } catch (error) {
      console.error("Fehler beim Abrufen der Benachrichtigungen:", error)
      return []
    }
  }

  // Benachrichtigung als gelesen markieren
  async markAsRead(notificationId) {
    try {
      if (!this.db) {
        this.db = await this.openDB()
      }

      // Transaktion starten
      const transaction = this.db.transaction([this.storeName], "readwrite")
      const store = transaction.objectStore(this.storeName)

      // Benachrichtigung abrufen
      return new Promise((resolve, reject) => {
        const getRequest = store.get(notificationId)

        getRequest.onerror = () => {
          reject("Fehler beim Abrufen der Benachrichtigung")
        }

        getRequest.onsuccess = () => {
          const notification = getRequest.result
          if (notification) {
            notification.read = true

            // Aktualisierte Benachrichtigung speichern
            const updateRequest = store.put(notification)

            updateRequest.onerror = () => {
              reject("Fehler beim Aktualisieren der Benachrichtigung")
            }

            updateRequest.onsuccess = () => {
              // Event auslösen
              const event = new CustomEvent("notification-read", { detail: { id: notificationId } })
              window.dispatchEvent(event)

              // Listener benachrichtigen
              this.notifyListeners()

              resolve(true)
            }
          } else {
            reject("Benachrichtigung nicht gefunden")
          }
        }
      })
    } catch (error) {
      console.error("Fehler beim Markieren der Benachrichtigung als gelesen:", error)
      return false
    }
  }

  // Alle Benachrichtigungen als gelesen markieren
  async markAllAsRead() {
    try {
      if (!this.db) {
        this.db = await this.openDB()
      }

      // Transaktion starten
      const transaction = this.db.transaction([this.storeName], "readwrite")
      const store = transaction.objectStore(this.storeName)

      // Alle Benachrichtigungen abrufen
      return new Promise((resolve, reject) => {
        const request = store.getAll()

        request.onerror = () => {
          reject("Fehler beim Abrufen der Benachrichtigungen")
        }

        request.onsuccess = () => {
          const notifications = request.result
          let updateCount = 0

          if (notifications.length === 0) {
            resolve(true)
            return
          }

          notifications.forEach((notification) => {
            if (!notification.read) {
              notification.read = true

              // Aktualisierte Benachrichtigung speichern
              const updateRequest = store.put(notification)

              updateRequest.onerror = () => {
                console.error("Fehler beim Aktualisieren einer Benachrichtigung")
              }

              updateRequest.onsuccess = () => {
                updateCount++

                if (updateCount === notifications.length) {
                  // Event auslösen
                  const event = new CustomEvent("notification-all-read")
                  window.dispatchEvent(event)

                  // Listener benachrichtigen
                  this.notifyListeners()

                  resolve(true)
                }
              }
            } else {
              updateCount++

              if (updateCount === notifications.length) {
                // Event auslösen
                const event = new CustomEvent("notification-all-read")
                window.dispatchEvent(event)

                // Listener benachrichtigen
                this.notifyListeners()

                resolve(true)
              }
            }
          })
        }
      })
    } catch (error) {
      console.error("Fehler beim Markieren aller Benachrichtigungen als gelesen:", error)
      return false
    }
  }

  // Benachrichtigung löschen
  async deleteNotification(notificationId) {
    try {
      if (!this.db) {
        this.db = await this.openDB()
      }

      // Transaktion starten
      const transaction = this.db.transaction([this.storeName], "readwrite")
      const store = transaction.objectStore(this.storeName)

      // Benachrichtigung löschen
      return new Promise((resolve, reject) => {
        const request = store.delete(notificationId)

        request.onerror = () => {
          reject("Fehler beim Löschen der Benachrichtigung")
        }

        request.onsuccess = () => {
          // Event auslösen
          const event = new CustomEvent("notification-deleted", { detail: { id: notificationId } })
          window.dispatchEvent(event)

          // Listener benachrichtigen
          this.notifyListeners()

          resolve(true)
        }
      })
    } catch (error) {
      console.error("Fehler beim Löschen der Benachrichtigung:", error)
      return false
    }
  }

  // Listener hinzufügen
  addListener(callback) {
    if (typeof callback === "function") {
      this.listeners.push(callback)
    }
  }

  // Listener entfernen
  removeListener(callback) {
    this.listeners = this.listeners.filter((listener) => listener !== callback)
  }

  // Listener benachrichtigen
  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener()
      } catch (error) {
        console.error("Fehler beim Benachrichtigen eines Listeners:", error)
      }
    })
  }
}

// Singleton-Instanz erstellen
const notificationService = new NotificationService()

// Exportieren des Services
export default notificationService
