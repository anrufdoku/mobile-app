// Skript zum Generieren von VAPID-Schlüsseln für Web Push
const webpush = require("web-push")

// VAPID-Schlüssel generieren
const vapidKeys = webpush.generateVAPIDKeys()

console.log("=======================================")
console.log("VAPID-Schlüssel für Web Push")
console.log("=======================================")
console.log("Public Key:")
console.log(vapidKeys.publicKey)
console.log("")
console.log("Private Key:")
console.log(vapidKeys.privateKey)
console.log("=======================================")
console.log("Diese Schlüssel in Ihrer .env-Datei speichern:")
console.log("")
console.log("VAPID_PUBLIC_KEY=" + vapidKeys.publicKey)
console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey)
console.log("=======================================")
