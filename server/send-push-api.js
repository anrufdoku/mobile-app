// API-Endpunkt zum Senden von Push-Benachrichtigungen
const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const { sendPushNotification, sendPushNotificationToAll } = require("./push-notification-server")
require("dotenv").config()

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(bodyParser.json())

// API-Endpunkt zum Senden einer Push-Benachrichtigung an einen Benutzer
app.post("/api/send-push", async (req, res) => {
  try {
    const { userId, payload, sendToAll } = req.body

    if (!payload) {
      return res.status(400).json({
        success: false,
        error: "Payload ist erforderlich",
      })
    }

    if (sendToAll) {
      // An alle Benutzer senden
      const success = await sendPushNotificationToAll(payload)
      return res.json({ success })
    } else if (userId) {
      // An einen bestimmten Benutzer senden
      const success = await sendPushNotification(userId, payload)
      return res.json({ success })
    } else {
      return res.status(400).json({
        success: false,
        error: "userId oder sendToAll ist erforderlich",
      })
    }
  } catch (error) {
    console.error("Fehler beim Senden der Push-Benachrichtigung:", error)
    return res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// Server starten
app.listen(port, () => {
  console.log(`Push-Benachrichtigungsserver läuft auf Port ${port}`)
})
