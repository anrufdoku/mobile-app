// Supabase-Konfiguration
const SUPABASE_URL = "https://ggowwdhzpqwjlxaadaff.supabase.co"
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnb3d3ZGh6cHF3amx4YWFkYWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MjI1MzcsImV4cCI6MjA1Njk5ODUzN30.XxCVgVq9MqDeJl8oyolJLo0XHOwloTlRw7ya4Kr4HAM"
let supabase = null

// DOM-Elemente
const backButton = document.getElementById("backButton")
const notification = document.getElementById("notification")
const availableMailsCount = document.getElementById("availableMailsCount")
const dailyLimitDisplay = document.getElementById("dailyLimitDisplay")
const todayProcessedDisplay = document.getElementById("todayProcessedDisplay")
const remainingLimitDisplay = document.getElementById("remainingLimitDisplay")
const requestMailsBtn = document.getElementById("requestMailsBtn")
const allRequestsList = document.getElementById("allRequestsList")
const pendingRequestsList = document.getElementById("pendingRequestsList")
const approvedRequestsList = document.getElementById("approvedRequestsList")
const rejectedRequestsList = document.getElementById("rejectedRequestsList")
const emptyState = document.getElementById("emptyState")
const allTabCounter = document.getElementById("allTabCounter")
const pendingTabCounter = document.getElementById("pendingTabCounter")
const approvedTabCounter = document.getElementById("approvedTabCounter")
const rejectedTabCounter = document.getElementById("rejectedTabCounter")
const requestMailsModal = document.getElementById("requestMailsModal")
const closeRequestMailsModal = document.getElementById("closeRequestMailsModal")
const cancelRequestMails = document.getElementById("cancelRequestMails")
const submitRequestMails = document.getElementById("submitRequestMails")
const requestCount = document.getElementById("requestCount")
const requestNotes = document.getElementById("requestNotes")
const decreaseCount = document.getElementById("decreaseCount")
const increaseCount = document.getElementById("increaseCount")
const maxRequestCount = document.getElementById("maxRequestCount")
const modalAvailableMails = document.getElementById("modalAvailableMails")
const modalDailyLimit = document.getElementById("modalDailyLimit")
const modalProcessed = document.getElementById("modalProcessed")
const modalRemaining = document.getElementById("modalRemaining")
const successModal = document.getElementById("successModal")
const closeSuccessModal = document.getElementById("closeSuccessModal")
const closeSuccessBtn = document.getElementById("closeSuccessBtn")
const successTitle = document.getElementById("successTitle")
const successMessage = document.getElementById("successMessage")
const cancelConfirmModal = document.getElementById("cancelConfirmModal")
const closeCancelConfirmModal = document.getElementById("closeCancelConfirmModal")
const cancelCancelBtn = document.getElementById("cancelCancelBtn")
const confirmCancelBtn = document.getElementById("confirmCancelBtn")
const cancelRequestDetails = document.getElementById("cancelRequestDetails")
const loadingScreen = document.getElementById("loading-screen")

// Globale Variablen
let currentUser = null
let mailPoolData = null
let userMailRequests = []
let userAgentLimit = null
let activeTab = "all" // Standard-Tab
let requestToCancel = null // Variable für die zu stornierende Anfrage

// Initialisiere Supabase
function initializeSupabase() {
  try {
    console.log("Initialisiere Supabase-Client...")
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    console.log("Supabase-Client erfolgreich initialisiert")
  } catch (error) {
    console.error("Fehler bei der Initialisierung des Supabase-Clients:", error)
  }
}

// Benachrichtigungsfunktion
function showNotification(message, type = "info") {
  if (notification) {
    notification.textContent = message
    notification.className = `notification notification-${type}`
    notification.classList.add("show")

    // Automatisch ausblenden nach 5 Sekunden
    setTimeout(() => {
      notification.classList.remove("show")
    }, 5000)
  } else {
    console.log(`Notification: ${message} (${type})`)
  }
}

// Seite initialisieren
async function initPage() {
  try {
    showLoading()

    // Initialisiere Supabase
    initializeSupabase()

    // Benutzerinformationen laden
    await loadUserInfo()

    // Daten laden
    await loadData()

    // Event-Listener einrichten
    setupEventListeners()

    // Initialisiere die Tabs
    initTabs()

    hideLoading()
  } catch (error) {
    console.error("Fehler beim Initialisieren der Seite:", error)
    showNotification("Fehler beim Laden der Daten: " + error.message, "error")
    hideLoading()
  }
}

// Benutzerinformationen laden
async function loadUserInfo() {
  try {
    // Hole den aktuellen Benutzer aus der Session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session && session.user) {
      currentUser = session.user
      console.log("Benutzerinformationen geladen:", currentUser)
    } else {
      // Wenn kein Benutzer gefunden wurde, zurück zum Login
      window.location.href = "index.html"
      return
    }
  } catch (error) {
    console.error("Fehler beim Laden der Benutzerinformationen:", error)
    showNotification("Fehler beim Laden der Benutzerinformationen", "error")
  }
}

// Event-Listener einrichten
function setupEventListeners() {
  // Zurück-Button
  if (backButton) {
    backButton.addEventListener("click", () => {
      window.location.href = "index.html"
    })
  }

  // Mail-Anfrage-Button
  if (requestMailsBtn) {
    requestMailsBtn.addEventListener("click", showRequestMailsModal)
  }

  // Modal-Buttons
  if (closeRequestMailsModal) {
    closeRequestMailsModal.addEventListener("click", hideRequestMailsModal)
  }

  if (cancelRequestMails) {
    cancelRequestMails.addEventListener("click", hideRequestMailsModal)
  }

  if (submitRequestMails) {
    submitRequestMails.addEventListener("click", submitMailRequest)
  }

  // Anzahl-Steuerung
  if (decreaseCount) {
    decreaseCount.addEventListener("click", () => {
      const currentValue = Number.parseInt(requestCount.value) || 1
      if (currentValue > 1) {
        requestCount.value = currentValue - 1
      }
    })
  }

  if (increaseCount) {
    increaseCount.addEventListener("click", () => {
      const currentValue = Number.parseInt(requestCount.value) || 1
      const maxValue = Number.parseInt(maxRequestCount.textContent) || 10
      if (currentValue < maxValue) {
        requestCount.value = currentValue + 1
      }
    })
  }

  // Erfolgsmodal-Buttons
  if (closeSuccessModal) {
    closeSuccessModal.addEventListener("click", hideSuccessModal)
  }

  if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener("click", hideSuccessModal)
  }

  // Stornieren-Bestätigungsmodal-Buttons
  if (closeCancelConfirmModal) {
    closeCancelConfirmModal.addEventListener("click", hideCancelConfirmModal)
  }

  if (cancelCancelBtn) {
    cancelCancelBtn.addEventListener("click", hideCancelConfirmModal)
  }

  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener("click", confirmCancelRequest)
  }

  // Tab-Buttons
  const tabButtons = document.querySelectorAll(".tab-btn")
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabName = button.getAttribute("data-tab")
      switchTab(tabName)
    })
  })
}

// Tabs initialisieren
function initTabs() {
  // Standardmäßig den "Alle"-Tab aktivieren
  switchTab("all")
}

// Tab wechseln
function switchTab(tabName) {
  // Aktiven Tab speichern
  activeTab = tabName

  // Alle Tab-Buttons deaktivieren
  const tabButtons = document.querySelectorAll(".tab-btn")
  tabButtons.forEach((button) => {
    button.classList.remove("active")
  })

  // Alle Tab-Inhalte ausblenden
  const tabContents = document.querySelectorAll(".tab-content")
  tabContents.forEach((content) => {
    content.classList.remove("active")
  })

  // Ausgewählten Tab-Button aktivieren
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add("active")

  // Ausgewählten Tab-Inhalt anzeigen
  document.getElementById(`${tabName}Tab`).classList.add("active")

  // Tabellen aktualisieren
  updateTables()
}

// Daten laden
async function loadData() {
  try {
    // Lade Mail-Pool-Daten
    await loadMailPool()

    // Lade Benutzer-Anfragen
    await loadUserMailRequests()

    // Lade Benutzer-Limit
    await loadUserAgentLimit()

    // Aktualisiere UI
    updateMailPoolUI()
    updateUserLimitUI()
    updateTables()
  } catch (error) {
    console.error("Fehler beim Laden der Daten:", error)
    showNotification("Fehler beim Laden der Daten: " + error.message, "error")
  }
}

// Lade Mail-Pool-Daten
async function loadMailPool() {
  try {
    const { data, error } = await supabase
      .from("mail_pool")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error("Fehler beim Laden des Mail-Pools:", error)
      mailPoolData = null
    } else {
      mailPoolData = data
    }
  } catch (error) {
    console.error("Fehler beim Laden des Mail-Pools:", error)
    mailPoolData = null
  }
}

// Lade Benutzer-Anfragen
async function loadUserMailRequests() {
  try {
    if (!currentUser || !currentUser.id) {
      console.error("Kein Benutzer angemeldet oder keine ID")
      return
    }

    const { data, error } = await supabase
      .from("mail_requests")
      .select("*")
      .eq("agent_id", currentUser.id)
      .order("requested_at", { ascending: false })

    if (error) {
      throw error
    }

    userMailRequests = data || []
    updateTables()
    updateTabCounters()
  } catch (error) {
    console.error("Fehler beim Laden der Benutzer-Anfragen:", error)
    userMailRequests = []
  }
}

// Lade Benutzer-Limit
async function loadUserAgentLimit() {
  try {
    if (!currentUser || !currentUser.id) {
      console.error("Kein Benutzer angemeldet oder keine ID")
      return
    }

    const { data, error } = await supabase.from("agent_limits").select("*").eq("agent_id", currentUser.id).maybeSingle()

    if (error) {
      throw error
    }

    userAgentLimit = data
    updateUserLimitUI()
  } catch (error) {
    console.error("Fehler beim Laden des Benutzer-Limits:", error)
    userAgentLimit = null
  }
}

// Aktualisiere Mail-Pool-UI
function updateMailPoolUI() {
  if (!mailPoolData) return

  // Aktualisiere Anzeige der verfügbaren Mails
  if (availableMailsCount) {
    availableMailsCount.textContent = mailPoolData.total_count
  }
}

// Aktualisiere Benutzer-Limit-UI
function updateUserLimitUI() {
  // Prüfe, ob überhaupt Daten in Supabase vorhanden sind
  // Wenn keine Daten in der Datenbank sind, zeige "Unbegrenzt" an
  if (!mailPoolData) {
    if (dailyLimitDisplay) dailyLimitDisplay.textContent = "Unbegrenzt"
    if (todayProcessedDisplay) todayProcessedDisplay.textContent = "0"
    if (remainingLimitDisplay) remainingLimitDisplay.textContent = "Unbegrenzt"

    // Deaktiviere den Anfrage-Button, da keine Mails verfügbar sind
    if (requestMailsBtn) {
      requestMailsBtn.disabled = true
      requestMailsBtn.title = "Keine Mails im Pool verfügbar"
    }
    return
  }

  // Ab hier nur ausführen, wenn Daten vorhanden sind
  // Wenn kein userAgentLimit existiert oder daily_limit nicht gesetzt ist, dann unbegrenzt
  const dailyLimit =
    userAgentLimit && userAgentLimit.daily_limit ? userAgentLimit.daily_limit : Number.POSITIVE_INFINITY

  // Berechne heute bereits bearbeitete Mails
  const today = new Date().toISOString().split("T")[0]
  const todayApprovedRequests = userMailRequests.filter(
    (request) => request.status === "approved" && request.processed_at && request.processed_at.startsWith(today),
  )

  const todayProcessed = todayApprovedRequests.reduce((sum, request) => sum + (request.approved_count || 0), 0)

  // Berechne verbleibende Mails für heute
  const remainingLimit = Math.max(0, dailyLimit - todayProcessed)

  // Aktualisiere UI
  if (dailyLimitDisplay) {
    dailyLimitDisplay.textContent = dailyLimit === Number.POSITIVE_INFINITY ? "Unbegrenzt" : dailyLimit
  }

  if (todayProcessedDisplay) {
    todayProcessedDisplay.textContent = todayProcessed
  }

  if (remainingLimitDisplay) {
    remainingLimitDisplay.textContent = dailyLimit === Number.POSITIVE_INFINITY ? "Unbegrenzt" : remainingLimit
  }

  // Deaktiviere Anfrage-Button, wenn Limit erreicht ist
  if (requestMailsBtn) {
    if (remainingLimit <= 0 && dailyLimit !== Number.POSITIVE_INFINITY) {
      requestMailsBtn.disabled = true
      requestMailsBtn.title = "Tägliches Limit erreicht"
    } else {
      requestMailsBtn.disabled = false
      requestMailsBtn.title = ""
    }
  }
}

// Tab-Zähler aktualisieren
function updateTabCounters() {
  const allCount = userMailRequests.length
  const pendingCount = userMailRequests.filter((request) => request.status === "pending").length
  const approvedCount = userMailRequests.filter((request) => request.status === "approved").length
  const rejectedCount = userMailRequests.filter((request) => request.status === "rejected").length

  allTabCounter.textContent = allCount
  pendingTabCounter.textContent = pendingCount
  approvedTabCounter.textContent = approvedCount
  rejectedTabCounter.textContent = rejectedCount
}

// Tabellen aktualisieren
function updateTables() {
  // Leere Zustände aktualisieren
  updateEmptyState()

  // Zähler aktualisieren
  updateTabCounters()

  // Je nach aktivem Tab die entsprechende Tabelle aktualisieren
  switch (activeTab) {
    case "all":
      updateAllRequestsList()
      break
    case "pending":
      updatePendingRequestsList()
      break
    case "approved":
      updateApprovedRequestsList()
      break
    case "rejected":
      updateRejectedRequestsList()
      break
  }
}

// Leere Zustände aktualisieren
function updateEmptyState() {
  // Prüfe, ob es überhaupt Datensätze gibt
  if (userMailRequests.length === 0) {
    emptyState.style.display = "flex"
    document.querySelectorAll(".request-list").forEach((list) => {
      list.style.display = "none"
    })
  } else {
    emptyState.style.display = "none"

    // Prüfe für jeden Tab, ob er Datensätze hat
    const pendingRequests = userMailRequests.filter((request) => request.status === "pending")
    const approvedRequests = userMailRequests.filter((request) => request.status === "approved")
    const rejectedRequests = userMailRequests.filter((request) => request.status === "rejected")

    if (activeTab === "all" && userMailRequests.length === 0) {
      emptyState.style.display = "flex"
      document.getElementById("allRequestsList").style.display = "none"
    } else if (activeTab === "all") {
      document.getElementById("allRequestsList").style.display = "flex"
    }

    if (activeTab === "pending" && pendingRequests.length === 0) {
      emptyState.style.display = "flex"
      document.getElementById("pendingRequestsList").style.display = "none"
    } else if (activeTab === "pending") {
      document.getElementById("pendingRequestsList").style.display = "flex"
    }

    if (activeTab === "approved" && approvedRequests.length === 0) {
      emptyState.style.display = "flex"
      document.getElementById("approvedRequestsList").style.display = "none"
    } else if (activeTab === "approved") {
      document.getElementById("approvedRequestsList").style.display = "flex"
    }

    if (activeTab === "rejected" && rejectedRequests.length === 0) {
      emptyState.style.display = "flex"
      document.getElementById("rejectedRequestsList").style.display = "none"
    } else if (activeTab === "rejected") {
      document.getElementById("rejectedRequestsList").style.display = "flex"
    }
  }
}

// Alle Anfragen Liste aktualisieren
function updateAllRequestsList() {
  if (!allRequestsList) return

  // Leere die Liste
  allRequestsList.innerHTML = ""

  if (userMailRequests.length === 0) {
    document.getElementById("allRequestsList").style.display = "none"
    return
  } else {
    document.getElementById("allRequestsList").style.display = "flex"
  }

  // Füge alle Anfragen hinzu
  userMailRequests.forEach((request) => {
    const requestItem = createRequestItem(request)
    allRequestsList.appendChild(requestItem)
  })
}

// Offene Anfragen Liste aktualisieren
function updatePendingRequestsList() {
  if (!pendingRequestsList) return

  // Leere die Liste
  pendingRequestsList.innerHTML = ""

  // Filtere nur offene Anfragen
  const pendingRequests = userMailRequests.filter((request) => request.status === "pending")

  if (pendingRequests.length === 0) {
    document.getElementById("pendingRequestsList").style.display = "none"
    return
  } else {
    document.getElementById("pendingRequestsList").style.display = "flex"
  }

  // Füge offene Anfragen hinzu
  pendingRequests.forEach((request) => {
    const requestItem = createRequestItem(request, true)
    pendingRequestsList.appendChild(requestItem)
  })
}

// Genehmigte Anfragen Liste aktualisieren
function updateApprovedRequestsList() {
  if (!approvedRequestsList) return

  // Leere die Liste
  approvedRequestsList.innerHTML = ""

  // Filtere nur genehmigte Anfragen
  const approvedRequests = userMailRequests.filter((request) => request.status === "approved")

  if (approvedRequests.length === 0) {
    document.getElementById("approvedRequestsList").style.display = "none"
    return
  } else {
    document.getElementById("approvedRequestsList").style.display = "flex"
  }

  // Füge genehmigte Anfragen hinzu
  approvedRequests.forEach((request) => {
    const requestItem = createRequestItem(request)
    approvedRequestsList.appendChild(requestItem)
  })
}

// Abgelehnte Anfragen Liste aktualisieren
function updateRejectedRequestsList() {
  if (!rejectedRequestsList) return

  // Leere die Liste
  rejectedRequestsList.innerHTML = ""

  // Filtere nur abgelehnte Anfragen
  const rejectedRequests = userMailRequests.filter((request) => request.status === "rejected")

  if (rejectedRequests.length === 0) {
    document.getElementById("rejectedRequestsList").style.display = "none"
    return
  } else {
    document.getElementById("rejectedRequestsList").style.display = "flex"
  }

  // Füge abgelehnte Anfragen hinzu
  rejectedRequests.forEach((request) => {
    const requestItem = createRequestItem(request)
    rejectedRequestsList.appendChild(requestItem)
  })
}

// Erstelle ein Anfrage-Element
function createRequestItem(request, showCancelButton = false) {
  const requestItem = document.createElement("div")
  requestItem.className = "request-item"

  // Formatiere Datum
  const requestDate = new Date(request.requested_at).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  // Formatiere Bearbeitungsdatum
  let processedDate = "-"
  if (request.processed_at) {
    processedDate = new Date(request.processed_at).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Header mit Datum und Status
  const requestHeader = document.createElement("div")
  requestHeader.className = "request-header"
  requestHeader.innerHTML = `
    <span class="request-date"><i class="fas fa-calendar-alt"></i> ${requestDate}</span>
    ${getStatusBadgeHTML(request.status)}
  `
  requestItem.appendChild(requestHeader)

  // Details mit Anzahl und Bearbeitungsdatum
  const requestDetails = document.createElement("div")
  requestDetails.className = "request-details"
  requestDetails.innerHTML = `
    <span class="request-count"><i class="fas fa-envelope"></i> Anzahl: ${request.status === "approved" ? request.approved_count || request.requested_count : request.requested_count}</span>
    <span class="request-count"><i class="fas fa-clock"></i> Bearbeitet: ${processedDate}</span>
  `
  requestItem.appendChild(requestDetails)

  // Notizen, falls vorhanden
  if (request.notes) {
    const notesElement = document.createElement("div")
    notesElement.className = "request-notes"
    notesElement.innerHTML = `
      <span class="notesLabel">Notizen:</span>
      <p class="notesText">${request.notes}</p>
    `
    requestItem.appendChild(notesElement)
  }

  // Stornieren-Button für offene Anfragen
  if (showCancelButton && request.status === "pending") {
    const actionsElement = document.createElement("div")
    actionsElement.className = "request-actions"
    actionsElement.innerHTML = `
      <button class="cancel-request-btn" data-request-id="${request.id}">
        <i class="fas fa-times"></i> Stornieren
      </button>
    `
    requestItem.appendChild(actionsElement)

    // Event-Listener für den Stornieren-Button
    setTimeout(() => {
      const cancelBtn = actionsElement.querySelector(".cancel-request-btn")
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => showCancelConfirmModal(request))
      }
    }, 0)
  }

  return requestItem
}

// Status-Badge HTML generieren
function getStatusBadgeHTML(status) {
  let badgeClass = ""
  let statusText = ""
  let icon = ""

  switch (status) {
    case "pending":
      badgeClass = "status-badge-pending"
      statusText = "Offen"
      icon = "hourglass-half"
      break
    case "approved":
      badgeClass = "status-badge-approved"
      statusText = "Genehmigt"
      icon = "check-circle"
      break
    case "rejected":
      badgeClass = "status-badge-rejected"
      statusText = "Abgelehnt"
      icon = "times-circle"
      break
    default:
      badgeClass = "status-badge-pending"
      statusText = "Offen"
      icon = "hourglass-half"
      break
  }

  return `<span class="status-badge ${badgeClass}"><i class="fas fa-${icon}"></i> ${statusText}</span>`
}

// Zeige Modal zum Anfordern von Mails
function showRequestMailsModal() {
  // Prüfe, ob Benutzer angemeldet ist
  if (!currentUser || !currentUser.id) {
    showNotification("Sie müssen angemeldet sein, um Mails anzufordern.", "error")
    return
  }

  // Prüfe, ob Mail-Pool leer ist
  if (!mailPoolData || mailPoolData.total_count === 0) {
    showNotification("Es sind derzeit keine Mails im Pool verfügbar.", "error")
    return
  }

  // Prüfe, ob Limit erreicht ist
  const poolIsEmpty = !mailPoolData || mailPoolData.total_count === 0
  const dailyLimit = poolIsEmpty
    ? 0
    : userAgentLimit && userAgentLimit.daily_limit
      ? userAgentLimit.daily_limit
      : Number.POSITIVE_INFINITY

  // Berechne heute bereits bearbeitete Mails
  const today = new Date().toISOString().split("T")[0]
  const todayApprovedRequests = userMailRequests.filter(
    (request) => request.status === "approved" && request.processed_at && request.processed_at.startsWith(today),
  )

  const todayProcessed = todayApprovedRequests.reduce((sum, request) => sum + (request.approved_count || 0), 0)

  // Berechne verbleibende Mails für heute
  const remainingLimit = Math.max(0, dailyLimit - todayProcessed)

  if (remainingLimit <= 0 && !poolIsEmpty && dailyLimit !== Number.POSITIVE_INFINITY) {
    showNotification("Sie haben Ihr tägliches Limit erreicht.", "error")
    return
  }

  // Prüfe, ob bereits eine ausstehende Anfrage existiert
  const pendingRequest = userMailRequests.find((request) => request.status === "pending")
  if (pendingRequest) {
    showNotification("Sie haben bereits eine ausstehende Anfrage.", "error")
    return
  }

  // Aktualisiere die Informationen im Modal
  modalAvailableMails.textContent = mailPoolData ? mailPoolData.total_count : 0
  modalDailyLimit.textContent = dailyLimit === Number.POSITIVE_INFINITY ? "Unbegrenzt" : dailyLimit
  modalProcessed.textContent = todayProcessed
  modalRemaining.textContent = remainingLimit === Number.POSITIVE_INFINITY ? "Unbegrenzt" : remainingLimit

  // Setze das maximale Limit
  const maxLimit = poolIsEmpty
    ? 0
    : dailyLimit === Number.POSITIVE_INFINITY
      ? mailPoolData.total_count
      : Math.min(remainingLimit, mailPoolData.total_count)
  maxRequestCount.textContent = maxLimit

  // Setze den Standardwert für die Anzahl
  requestCount.value = Math.min(1, maxLimit)
  requestCount.max = maxLimit

  // Leere die Notizen
  requestNotes.value = ""

  // Zeige das Modal an
  requestMailsModal.classList.add("show")
  requestMailsModal.classList.add("active")

  // Fokus auf die Anzahl setzen
  setTimeout(() => {
    requestCount.focus()
  }, 100)
}

// Verstecke Modal zum Anfordern von Mails
function hideRequestMailsModal() {
  requestMailsModal.classList.remove("show")
  requestMailsModal.classList.remove("active")
}

// Verstecke Erfolgsmodal
function hideSuccessModal() {
  successModal.classList.remove("show")
  successModal.classList.remove("active")
}

// Zeige Stornieren-Bestätigungsmodal
function showCancelConfirmModal(request) {
  if (!request || !request.id) {
    showNotification("Fehler: Keine Anfrage-ID angegeben.", "error")
    return
  }

  // Speichere die zu stornierende Anfrage
  requestToCancel = request

  // Setze die Details im Modal
  if (cancelRequestDetails) {
    const requestDate = new Date(request.requested_at).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    cancelRequestDetails.innerHTML = `Anfrage vom ${requestDate} für ${request.requested_count} Mail${request.requested_count > 1 ? "s" : ""}`
  }

  // Zeige das Modal an
  cancelConfirmModal.classList.add("show")
  cancelConfirmModal.classList.add("active")
}

// Verstecke Stornieren-Bestätigungsmodal
function hideCancelConfirmModal() {
  cancelConfirmModal.classList.remove("show")
  cancelConfirmModal.classList.remove("active")
  requestToCancel = null
}

// Bestätige Stornierung der Anfrage
async function confirmCancelRequest() {
  try {
    if (!requestToCancel || !requestToCancel.id) {
      showNotification("Fehler: Keine Anfrage zum Stornieren ausgewählt.", "error")
      hideCancelConfirmModal()
      return
    }

    showLoading()

    // Anfrage in der Datenbank löschen
    const { error } = await supabase
      .from("mail_requests")
      .delete()
      .eq("id", requestToCancel.id)
      .eq("agent_id", currentUser.id) // Sicherheitscheck: Nur eigene Anfragen löschen
      .eq("status", "pending") // Sicherheitscheck: Nur offene Anfragen löschen

    if (error) {
      throw error
    }

    // Aktualisiere UI
    await loadUserMailRequests()

    // Verstecke das Modal
    hideCancelConfirmModal()

    // Zeige Erfolgsmeldung
    showNotification("Anfrage erfolgreich storniert.", "success")

    hideLoading()
  } catch (error) {
    console.error("Fehler beim Stornieren der Anfrage:", error)
    showNotification("Fehler beim Stornieren der Anfrage: " + error.message, "error")
    hideCancelConfirmModal()
    hideLoading()
  }
}

// Sende Mail-Anfrage
async function submitMailRequest() {
  try {
    const count = Number.parseInt(requestCount.value) || 0
    const notes = requestNotes.value

    if (count <= 0) {
      showNotification("Bitte geben Sie eine gültige Anzahl ein.", "error")
      return
    }

    // Prüfe, ob genügend Mails verfügbar sind
    if (!mailPoolData || mailPoolData.total_count < count) {
      showNotification("Nicht genügend Mails verfügbar.", "error")
      return
    }

    showLoading()

    // Erstelle Anfrage
    const { data, error } = await supabase
      .from("mail_requests")
      .insert([
        {
          agent_id: currentUser.id,
          requested_count: count,
          status: "pending",
          notes: notes,
        },
      ])
      .select()

    if (error) {
      throw error
    }

    // Aktualisiere UI
    await loadUserMailRequests()

    // Schließe Modal
    hideRequestMailsModal()

    // Zeige Erfolgsmeldung
    successTitle.textContent = "Anfrage gesendet!"
    successMessage.textContent = `Ihre Anfrage für ${count} Mails wurde erfolgreich gesendet und wird in Kürze bearbeitet.`
    successModal.classList.add("show")
    successModal.classList.add("active")

    hideLoading()
  } catch (error) {
    console.error("Fehler beim Senden der Anfrage:", error)
    showNotification("Fehler beim Senden der Anfrage: " + error.message, "error")
    hideLoading()
  }
}

// Lade-Anzeige
function showLoading() {
  loadingScreen.classList.remove("hidden")
}

function hideLoading() {
  loadingScreen.classList.add("hidden")
}

// Initialisierung der Seite beim Laden
document.addEventListener("DOMContentLoaded", () => {
  initPage()
})
