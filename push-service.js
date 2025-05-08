// Push-Service für System-Benachrichtigungen
const publicVapidKey = 'BJWoRmbkDSvR42tKWYZwKPJAfMMPhdujI8oQgJe_971WWR47DmKpHVONqnnAaUT6hotH87Jo_U6033RgMlaW2B4'; // Diese müssen Sie generieren

// Registriere den Service Worker und abonniere Push-Benachrichtigungen
async function registerPushService() {
  try {
    // Service Worker registrieren
    console.log('Service Worker wird registriert...');
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    console.log('Service Worker erfolgreich registriert');

    // Prüfen, ob Push-Benachrichtigungen unterstützt werden
    if (!('PushManager' in window)) {
      console.warn('Push-Benachrichtigungen werden von diesem Browser nicht unterstützt');
      return false;
    }

    // Berechtigung für Benachrichtigungen anfordern
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Berechtigung für Benachrichtigungen nicht erteilt');
      return false;
    }

    // Vorhandenes Abonnement abrufen oder neues erstellen
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Neues Abonnement erstellen
      const applicationServerKey = urlBase64ToUint8Array(publicVapidKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
      
      console.log('Neues Push-Abonnement erstellt');
    } else {
      console.log('Bestehendes Push-Abonnement gefunden');
    }

    // Abonnement an den Server senden
    await sendSubscriptionToServer(subscription);
    
    return true;
  } catch (error) {
    console.error('Fehler beim Registrieren des Push-Services:', error);
    return false;
  }
}

// Abonnement an den Server senden
async function sendSubscriptionToServer(subscription) {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.warn('Keine Benutzer-ID gefunden');
      return false;
    }

    // Hier Ihre Supabase-Logik zum Speichern des Abonnements
    const { error } = await window.supabase
      .from('push_subscriptions')
      .upsert({
        agent_id: userId,
        subscription: JSON.stringify(subscription),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'agent_id'
      });

    if (error) throw error;
    
    console.log('Push-Abonnement erfolgreich an Server gesendet');
    return true;
  } catch (error) {
    console.error('Fehler beim Senden des Abonnements an den Server:', error);
    return false;
  }
}

// Abonnement vom Server entfernen
async function unsubscribePushService() {
  try {
    // Service Worker-Registrierung abrufen
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.warn('Kein Service Worker registriert');
      return false;
    }

    // Abonnement abrufen
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.warn('Kein Push-Abonnement gefunden');
      return true;
    }

    // Abonnement vom Server entfernen
    const userId = localStorage.getItem('userId');
    if (userId) {
      const { error } = await window.supabase
        .from('push_subscriptions')
        .delete()
        .eq('agent_id', userId);

      if (error) throw error;
    }

    // Abonnement kündigen
    await subscription.unsubscribe();
    console.log('Push-Abonnement erfolgreich gekündigt');
    
    return true;
  } catch (error) {
    console.error('Fehler beim Kündigen des Push-Abonnements:', error);
    return false;
  }
}

// Base64-String in Uint8Array konvertieren (für applicationServerKey)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Exportiere die Funktionen
window.pushService = {
  register: registerPushService,
  unsubscribe: unsubscribePushService
};
