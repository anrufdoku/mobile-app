// Push-Notification-Server
// Dieses Skript sendet Push-Benachrichtigungen an die Clients

const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase-Client initialisieren
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// VAPID-Keys für Web Push
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

// VAPID-Details setzen
webpush.setVapidDetails(
  'mailto:info@embers-callcenter.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Funktion zum Senden einer Push-Benachrichtigung an einen Benutzer
async function sendPushNotification(agentId, notification) {
  try {
    console.log(`Sende Push-Benachrichtigung an Benutzer ${agentId}`);
    
    // Abonnement des Benutzers abrufen
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('agent_id', agentId)
      .single();
    
    if (error) {
      console.error('Fehler beim Abrufen des Abonnements:', error);
      return false;
    }
    
    if (!data || !data.subscription) {
      console.warn(`Kein Abonnement für Benutzer ${agentId} gefunden`);
      return false;
    }
    
    // Abonnement parsen
    const subscription = JSON.parse(data.subscription);
    
    // Benachrichtigung senden
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify(notification)
    );
    
    console.log(`Push-Benachrichtigung erfolgreich gesendet: ${result.statusCode}`);
    
    // Benachrichtigung in der Datenbank speichern
    const { error: insertError } = await supabase
      .from('notifications')
      .insert([
        {
          agent_id: agentId,
          title: notification.title,
          message: notification.message,
          read: false,
          sender: notification.sender || 'System',
          url: notification.url || '/'
        }
      ]);
    
    if (insertError) {
      console.error('Fehler beim Speichern der Benachrichtigung:', insertError);
    }
    
    return true;
  } catch (error) {
    console.error('Fehler beim Senden der Push-Benachrichtigung:', error);
    
    // Prüfen, ob das Abonnement ungültig ist
    if (error.statusCode === 410) {
      console.log(`Abonnement für Benutzer ${agentId} ist ungültig, wird gelöscht`);
      
      // Ungültiges Abonnement löschen
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('agent_id', agentId);
    }
    
    return false;
  }
}

// Funktion zum Senden einer Push-Benachrichtigung an alle Benutzer
async function sendPushNotificationToAll(notification) {
  try {
    console.log('Sende Push-Benachrichtigung an alle Benutzer');
    
    // Alle Abonnements abrufen
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('agent_id, subscription');
    
    if (error) {
      console.error('Fehler beim Abrufen der Abonnements:', error);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.warn('Keine Abonnements gefunden');
      return false;
    }
    
    // Benachrichtigungen an alle Benutzer senden
    const results = await Promise.all(
      data.map(async (subscription) => {
        try {
          return await sendPushNotification(subscription.agent_id, notification);
        } catch (error) {
          console.error(`Fehler beim Senden an Benutzer ${subscription.agent_id}:`, error);
          return false;
        }
      })
    );
    
    // Anzahl der erfolgreichen Sendungen zählen
    const successCount = results.filter(result => result).length;
    
    console.log(`Push-Benachrichtigungen an ${successCount} von ${data.length} Benutzern gesendet`);
    
    return successCount > 0;
  } catch (error) {
    console.error('Fehler beim Senden der Push-Benachrichtigungen an alle Benutzer:', error);
    return false;
  }
}

// Beispiel für die Verwendung
// sendPushNotification('user-id', {
//   title: 'Neue Nachricht',
//   message: 'Sie haben eine neue Nachricht erhalten',
//   url: '/push-nachrichten.html'
// });

module.exports = {
  sendPushNotification,
  sendPushNotificationToAll
};
