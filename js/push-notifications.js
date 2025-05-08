// push-notifications.js
// Dieses Skript verwaltet die Push-Benachrichtigungen

// Push-Benachrichtigungen-Objekt
window.pushNotifications = {
  // Eigenschaften
  isSubscribed: false,
  
  // Initialisierung
  init: async function() {
    try {
      // Prüfen, ob Push-Benachrichtigungen unterstützt werden
      if (!("Notification" in window)) {
        console.warn("Dieser Browser unterstützt keine Benachrichtigungen");
        return false;
      }
      
      // Service Worker registrieren
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/service-worker.js")
          .then(registration => {
            console.log("Service Worker erfolgreich registriert:", registration.scope);
            
            // Prüfen, ob bereits ein Abonnement existiert
            return registration.pushManager.getSubscription();
          })
          .then(subscription => {
            this.isSubscribed = !!subscription;
            console.log("Push-Benachrichtigungen abonniert:", this.isSubscribed);
            
            // Event-Listener für Push-Nachrichten vom Service Worker
            navigator.serviceWorker.addEventListener("message", event => {
              if (event.data && event.data.type === "push") {
                this.handlePushMessage(event.data.data);
              }
            });
          })
          .catch(error => {
            console.error("Fehler bei der Service Worker Registrierung:", error);
          });
      }
      
      // Push-Service initialisieren
      if (window.pushService) {
        // Warte auf Laden des Push-Service
        setTimeout(() => {
          // Prüfe, ob der Benutzer angemeldet ist
          const userId = localStorage.getItem("userId");
          if (userId) {
            // Registriere den Push-Service
            window.pushService.register()
              .then(success => {
                console.log("Push-Service initialisiert:", success);
              })
              .catch(error => {
                console.error("Fehler bei der Initialisierung des Push-Service:", error);
              });
          }
        }, 1000);
      }
      
      return true;
    } catch (error) {
      console.error("Fehler bei der Initialisierung von Push-Benachrichtigungen:", error);
      return false;
    }
  },
  
  // Push-Nachricht verarbeiten
  handlePushMessage: async function(data) {
    try {
      console.log("Push-Nachricht empfangen:", data);
      
      // Benachrichtigung in IndexedDB speichern
      await this.saveNotificationToLocalDB(data);
      
      // Benachrichtigungszähler aktualisieren
      this.updateBadge();
      
      // Benachrichtigungston abspielen
      this.playNotificationSound();
      
      // Event auslösen
      window.dispatchEvent(new CustomEvent("notification-received", { detail: data }));
    } catch (error) {
      console.error("Fehler bei der Verarbeitung der Push-Nachricht:", error);
    }
  },
  
  // Benachrichtigung in IndexedDB speichern
  saveNotificationToLocalDB: async function(notification) {
    try {
      // IndexedDB öffnen
      const db = await this.openDatabase();
      
      // Benachrichtigung speichern
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["notifications"], "readwrite");
        const store = transaction.objectStore("notifications");
        
        // Benachrichtigung vorbereiten
        const notificationToSave = {
          id: notification.id || Date.now().toString(),
          title: notification.title || "Neue Benachrichtigung",
          message: notification.message || "Es gibt eine neue Benachrichtigung.",
          read: false,
          created_at: new Date().toISOString(),
          sender: notification.sender || "System",
          url: notification.url || "/"
        };
        
        // Benachrichtigung speichern
        const request = store.add(notificationToSave);
        
        request.onsuccess = () => {
          resolve(true);
        };
        
        request.onerror = () => {
          console.error("Fehler beim Speichern der Benachrichtigung in IndexedDB:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Fehler beim Speichern der Benachrichtigung in IndexedDB:", error);
      throw error;
    }
  },
  
  // Benachrichtigungen aus IndexedDB laden
  getNotificationsFromLocalDB: async function() {
    try {
      // IndexedDB öffnen
      const db = await this.openDatabase();
      
      // Benachrichtigungen abrufen
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["notifications"], "readonly");
        const store = transaction.objectStore("notifications");
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error("Fehler beim Laden der Benachrichtigungen aus IndexedDB:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Fehler beim Laden der Benachrichtigungen aus IndexedDB:", error);
      // Fallback zu Supabase
      return this.getNotificationsFromSupabase();
    }
  },
  
  // Benachrichtigungen aus Supabase laden (Fallback)
  getNotificationsFromSupabase: async function() {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        console.warn("Keine Benutzer-ID gefunden");
        return [];
      }
      
      const { data, error } = await window.supabase
        .from("notifications")
        .select("*")
        .eq("agent_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error("Fehler beim Laden der Benachrichtigungen aus Supabase:", error);
      return [];
    }
  },
  
  // Benachrichtigung als gelesen markieren
  markAsRead: async function(notificationId) {
    try {
      // IndexedDB öffnen
      const db = await this.openDatabase();
      
      // Benachrichtigung aktualisieren
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["notifications"], "readwrite");
        const store = transaction.objectStore("notifications");
        const request = store.get(notificationId);
        
        request.onsuccess = () => {
          const notification = request.result;
          if (notification) {
            notification.read = true;
            
            const updateRequest = store.put(notification);
            
            updateRequest.onsuccess = () => {
              // Auch in Supabase aktualisieren
              this.updateNotificationInSupabase(notificationId, { read: true })
                .then(() => {
                  // Benachrichtigungszähler aktualisieren
                  this.updateBadge();
                  
                  // Event auslösen
                  window.dispatchEvent(new CustomEvent("notification-read", { detail: { id: notificationId } }));
                  
                  resolve(true);
                })
                .catch(error => {
                  console.error("Fehler beim Aktualisieren der Benachrichtigung in Supabase:", error);
                  resolve(true); // Trotzdem erfolgreich, da lokale Änderung funktioniert hat
                });
            };
            
            updateRequest.onerror = () => {
              console.error("Fehler beim Aktualisieren der Benachrichtigung in IndexedDB:", updateRequest.error);
              reject(updateRequest.error);
            };
          } else {
            reject(new Error("Benachrichtigung nicht gefunden"));
          }
        };
        
        request.onerror = () => {
          console.error("Fehler beim Abrufen der Benachrichtigung aus IndexedDB:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Fehler beim Markieren der Benachrichtigung als gelesen:", error);
      throw error;
    }
  },
  
  // Alle Benachrichtigungen als gelesen markieren
  markAllAsRead: async function() {
    try {
      // Alle Benachrichtigungen laden
      const notifications = await this.getNotificationsFromLocalDB();
      
      // IndexedDB öffnen
      const db = await this.openDatabase();
      
      // Alle Benachrichtigungen aktualisieren
      const promises = notifications
        .filter(notification => !notification.read)
        .map(notification => {
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(["notifications"], "readwrite");
            const store = transaction.objectStore("notifications");
            
            // Benachrichtigung abrufen
            const request = store.get(notification.id);
            
            request.onsuccess = () => {
              const notificationToUpdate = request.result;
              if (notificationToUpdate) {
                notificationToUpdate.read = true;
                
                const updateRequest = store.put(notificationToUpdate);
                
                updateRequest.onsuccess = () => {
                  resolve(true);
                };
                
                updateRequest.onerror = () => {
                  console.error("Fehler beim Aktualisieren einer Benachrichtigung in IndexedDB:", updateRequest.error);
                  reject(updateRequest.error);
                };
              } else {
                resolve(false);
              }
            };
            
            request.onerror = () => {
              console.error("Fehler beim Abrufen einer Benachrichtigung aus IndexedDB:", request.error);
              reject(request.error);
            };
          });
        });
      
      // Warten, bis alle Benachrichtigungen aktualisiert wurden
      await Promise.all(promises);
      
      // Auch in Supabase aktualisieren
      const userId = localStorage.getItem("userId");
      if (userId) {
        await window.supabase
          .from("notifications")
          .update({ read: true })
          .eq("agent_id", userId)
          .eq("read", false);
      }
      
      // Benachrichtigungszähler aktualisieren
      this.updateBadge();
      
      // Event auslösen
      window.dispatchEvent(new CustomEvent("notification-all-read"));
      
      return true;
    } catch (error) {
      console.error("Fehler beim Markieren aller Benachrichtigungen als gelesen:", error);
      throw error;
    }
  },
  
  // Benachrichtigung in Supabase aktualisieren
  updateNotificationInSupabase: async function(notificationId, updates) {
    try {
      const { error } = await window.supabase
        .from("notifications")
        .update(updates)
        .eq("id", notificationId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Benachrichtigung in Supabase:", error);
      return false;
    }
  },
  
  // Benachrichtigungszähler aktualisieren
  updateBadge: async function() {
    try {
      // Ungelesene Benachrichtigungen zählen
      const notifications = await this.getNotificationsFromLocalDB();
      const unreadCount = notifications.filter(notification => !notification.read).length;
      
      // Badge aktualisieren
      const badge = document.getElementById("notificationCount");
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount;
          badge.style.display = "flex";
        } else {
          badge.style.display = "none";
        }
      }
      
      // Auch den Badge im Mail-Pool aktualisieren
      const mailPoolBadge = document.getElementById("notification-badge");
      if (mailPoolBadge) {
        if (unreadCount > 0) {
          mailPoolBadge.textContent = unreadCount;
          mailPoolBadge.classList.remove("hidden");
        } else {
          mailPoolBadge.classList.add("hidden");
        }
      }
      
      return unreadCount;
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Benachrichtigungszählers:", error);
      return 0;
    }
  },
  
  // Benachrichtigungston abspielen
  playNotificationSound: function() {
    try {
      const sound = document.getElementById("notificationSound");
      if (sound) {
        sound.play().catch(error => {
          console.error("Fehler beim Abspielen des Benachrichtigungstons:", error);
        });
      }
    } catch (error) {
      console.error("Fehler beim Abspielen des Benachrichtigungstons:", error);
    }
  },
  
  // Push-Benachrichtigungen abonnieren
  subscribe: async function() {
    try {
      if (window.pushService) {
        const success = await window.pushService.register();
        this.isSubscribed = success;
        return success;
      }
      return false;
    } catch (error) {
      console.error("Fehler beim Abonnieren von Push-Benachrichtigungen:", error);
      return false;
    }
  },
  
  // Push-Benachrichtigungen abbestellen
  unsubscribe: async function() {
    try {
      if (window.pushService) {
        const success = await window.pushService.unsubscribe();
        this.isSubscribed = !success;
        return success;
      }
      return false;
    } catch (error) {
      console.error("Fehler beim Abbestellen von Push-Benachrichtigungen:", error);
      return false;
    }
  },
  
  // IndexedDB öffnen
  openDatabase: function() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("notificationsDB", 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Objektspeicher erstellen, falls er nicht existiert
        if (!db.objectStoreNames.contains("notifications")) {
          const store = db.createObjectStore("notifications", { keyPath: "id" });
          store.createIndex("read", "read", { unique: false });
          store.createIndex("created_at", "created_at", { unique: false });
        }
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error("Fehler beim Öffnen der Datenbank:", request.error);
        reject(request.error);
      };
    });
  }
};
