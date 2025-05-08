// notification-component.js
// Dieses Modul stellt eine Komponente für die Anzeige von Benachrichtigungen bereit

// WICHTIG: Supabase-Client über globale Variable verwenden statt Import
// Entfernen Sie: import { createClient } from "@supabase/supabase-js"

// Notification Component
class NotificationComponent {
  constructor(containerId, bellId) {
    // DOM-Elemente
    this.container = document.getElementById(containerId)
    this.bell = document.getElementById(bellId)
    this.badge = this.bell ? this.bell.querySelector(".notification-badge") : null

    // Eigenschaften
    this.notifications = []
    this.isOpen = false

    // Supabase-Client initialisieren
    // Verwende die globale supabase-Variable
    this.supabase = window.supabase

    // Initialisierung
    this.init()
  }

  // Initialisierung
  init() {
    // Event-Listener für die Glocke
    if (this.bell) {
      this.bell.addEventListener("click", (e) => {
        e.stopPropagation()
        this.toggleDropdown()
      })

      // Klick außerhalb schließt das Dropdown
      document.addEventListener("click", (e) => {
        if (this.isOpen && !this.container.contains(e.target) && e.target !== this.bell) {
          this.closeDropdown()
        }
      })
    }

    // Benachrichtigungen laden
    this.loadNotifications()
  }

  // Benachrichtigungen laden
  async loadNotifications() {
    try {
      // Benachrichtigungen aus dem Service laden
      if (window.notificationService) {
        this.notifications = window.notificationService.getNotifications()
      } else if (window.pushNotifications) {
        this.notifications = await window.pushNotifications.getNotificationsFromLocalDB()
      } else {
        // Fallback: Benachrichtigungen aus Supabase laden
        const userId = localStorage.getItem("userId")
        if (userId) {
          const { data, error } = await this.supabase
            .from("notifications")
            .select("*")
            .eq("agent_id", userId)
            .order("created_at", { ascending: false })

          if (error) throw error

          this.notifications = data || []
        }
      }

      // Badge aktualisieren
      this.updateBadge()

      // Dropdown aktualisieren, wenn es geöffnet ist
      if (this.isOpen) {
        this.renderNotifications()
      }
    } catch (error) {
      console.error("Fehler beim Laden der Benachrichtigungen:", error)
    }
  }

  // Badge aktualisieren
  updateBadge() {
    if (this.badge) {
      const unreadCount = this.notifications.filter((notification) => !notification.read).length

      if (unreadCount > 0) {
        this.badge.textContent = unreadCount
        this.badge.classList.remove("hidden")
      } else {
        this.badge.textContent = ""
        this.badge.classList.add("hidden")
      }
    }
  }

  // Dropdown öffnen/schließen
  toggleDropdown() {
    if (this.isOpen) {
      this.closeDropdown()
    } else {
      this.openDropdown()
    }
  }

  // Dropdown öffnen
  openDropdown() {
    if (!this.container) return

    // Dropdown anzeigen
    this.container.classList.add("show")
    this.isOpen = true

    // Benachrichtigungen rendern
    this.renderNotifications()
  }

  // Dropdown schließen
  closeDropdown() {
    if (!this.container) return

    // Dropdown ausblenden
    this.container.classList.remove("show")
    this.isOpen = false
  }

  // Benachrichtigungen rendern
  renderNotifications() {
    if (!this.container) return

    // Container leeren
    this.container.innerHTML = ""

    // Header erstellen
    const header = document.createElement("div")
    header.className = "notification-header"
    header.innerHTML = `
      <div class="notification-title">Benachrichtigungen</div>
      <div class="notification-actions">
        <button class="notification-action mark-all-read-btn" title="Alle als gelesen markieren">
          <i class="fas fa-check-double"></i>
        </button>
      </div>
    `

    // Event-Listener für "Alle als gelesen markieren"-Button
    const markAllReadBtn = header.querySelector(".mark-all-read-btn")
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener("click", () => {
        this.markAllAsRead()
      })
    }

    this.container.appendChild(header)

    // Liste erstellen
    const list = document.createElement("div")
    list.className = "notification-list"

    // Benachrichtigungen anzeigen
    if (this.notifications.length === 0) {
      // Leerer Zustand
      list.innerHTML = `
        <div class="notification-empty">
          <i class="fas fa-bell-slash"></i>
          <p>Keine Benachrichtigungen vorhanden</p>
        </div>
      `
    } else {
      // Benachrichtigungen anzeigen (maximal 5)
      const recentNotifications = this.notifications.slice(0, 5)

      recentNotifications.forEach((notification) => {
        const item = this.createNotificationItem(notification)
        list.appendChild(item)
      })
    }

    this.container.appendChild(list)

    // Footer erstellen
    const footer = document.createElement("div")
    footer.className = "notification-footer"
    footer.innerHTML = `
      <a href="push-nachrichten.html">Alle Benachrichtigungen anzeigen</a>
    `

    this.container.appendChild(footer)
  }

  // Benachrichtigungselement erstellen
  createNotificationItem(notification) {
    const item = document.createElement("div")
    item.className = `notification-item-small ${notification.read ? "read" : "unread"}`
    item.dataset.id = notification.id

    // Datum formatieren
    const date = new Date(notification.created_at)
    const formattedDate = date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    item.innerHTML = `
      <div class="notification-content-small">
        <div class="notification-title-small">${notification.title || "Keine Überschrift"}</div>
        <div class="notification-message-small">${notification.message || "Keine Nachricht"}</div>
        <div class="notification-meta-small">
          <span class="notification-time-small">${formattedDate}</span>
          <span class="notification-status-small">${notification.read ? "Gelesen" : "Ungelesen"}</span>
        </div>
      </div>
    `

    // Klick auf die Benachrichtigung markiert sie als gelesen
    item.addEventListener("click", () => {
      if (!notification.read) {
        this.markAsRead(notification.id)
      }

      // Zur Benachrichtigungsseite navigieren
      window.location.href = "push-nachrichten.html"
    })

    return item
  }

  // Benachrichtigung als gelesen markieren
  async markAsRead(notificationId) {
    try {
      // Benachrichtigung in der lokalen Liste aktualisieren
      const index = this.notifications.findIndex((n) => n.id === notificationId)
      if (index !== -1) {
        this.notifications[index].read = true
      }

      // Benachrichtigung in der Datenbank aktualisieren
      if (window.notificationService) {
        await window.notificationService.markAsRead(notificationId)
      } else if (window.pushNotifications) {
        await window.pushNotifications.markAsRead(notificationId)
      } else {
        // Fallback: Benachrichtigung in Supabase aktualisieren
        const { error } = await this.supabase.from("notifications").update({ read: true }).eq("id", notificationId)

        if (error) throw error
      }

      // Badge aktualisieren
      this.updateBadge()

      // Dropdown aktualisieren, wenn es geöffnet ist
      if (this.isOpen) {
        this.renderNotifications()
      }

      // Event auslösen
      window.dispatchEvent(new CustomEvent("notification-read", { detail: { id: notificationId } }))
    } catch (error) {
      console.error("Fehler beim Markieren als gelesen:", error)
    }
  }

  // Alle Benachrichtigungen als gelesen markieren
  async markAllAsRead() {
    try {
      // Alle Benachrichtigungen in der lokalen Liste aktualisieren
      this.notifications.forEach((notification) => {
        notification.read = true
      })

      // Alle Benachrichtigungen in der Datenbank aktualisieren
      if (window.notificationService) {
        await window.notificationService.markAllAsRead()
      } else if (window.pushNotifications) {
        await window.pushNotifications.markAllAsRead()
      } else {
        // Fallback: Alle Benachrichtigungen in Supabase aktualisieren
        const userId = localStorage.getItem("userId")
        if (userId) {
          const { error } = await this.supabase
            .from("notifications")
            .update({ read: true })
            .eq("agent_id", userId)
            .eq("read", false)

          if (error) throw error
        }
      }

      // Badge aktualisieren
      this.updateBadge()

      // Dropdown aktualisieren, wenn es geöffnet ist
      if (this.isOpen) {
        this.renderNotifications()
      }

      // Event auslösen
      window.dispatchEvent(new CustomEvent("notification-all-read"))
    } catch (error) {
      console.error("Fehler beim Markieren aller als gelesen:", error)
    }
  }
}

// Exportiere die Notification Component
export default NotificationComponent
