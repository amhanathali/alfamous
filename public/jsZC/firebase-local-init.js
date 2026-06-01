/**
 * Initialise l’app Firebase (compat) si aucune app n’existe encore.
 * Remplace /__/firebase/init.js (réservé au Hosting) pour éviter un 404 en dev sur serveur statique.
 * Config alignée sur functions/firebaseConfig.js (clé client publique par nature).
 */
(function () {
  if (typeof firebase === 'undefined') return;
  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey: 'AIzaSyDZspzWJ48SCkPZ5QZzIkD-k56wKfQQx7Y',
      authDomain: 'alfamous-amha.firebaseapp.com',
      databaseURL: 'https://alfamous-amha-default-rtdb.firebaseio.com',
      projectId: 'alfamous-amha',
      storageBucket: 'alfamous-amha.appspot.com',
      messagingSenderId: '1000469987697',
      appId: '1:1000469987697:web:ce52491a769aae49f5b6d0',
      measurementId: 'G-9P7P4Q8PBS'
    });
  }

  /**
   * Réduit les erreurs net::ERR_QUIC_PROTOCOL_ERROR sur les canaux Firestore (Listen/Write) :
   * Chrome/QUIC ou certains réseaux coupent le streaming WebChannel ; le long polling est plus stable.
   * Doit être appelé avant le premier firebase.firestore() (ex. com12.js en defer).
   */
  try {
    if (typeof firebase.firestore === 'function') {
      firebase.firestore().settings({
        merge: true,
        experimentalForceLongPolling: true
      });
    }
  } catch (err) {
    console.warn('[firebase] Firestore settings (long polling):', err && err.message ? err.message : err);
  }

  // Attendre authStateReady (SDK 9+) pour éviter un premier onAuthStateChanged(null) trop tôt.
  // IMPORTANT: pas de connexion anonyme automatique ici.
  // __zcAuthReady se contente d'attendre l'état auth courant (user connecté ou null).
  window.__zcAuthReady = (async function () {
    try {
      const auth = firebase.auth();
      if (typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
      } else {
        await new Promise(function (resolve) {
          var unsub = auth.onAuthStateChanged(function () {
            unsub();
            resolve();
          });
        });
      }
      return auth.currentUser || null;
    } catch (err) {
      var code = err && err.code;
      var msg = err && err.message;
      console.warn('[firebase] Lecture état auth impossible:', code || '', msg || err);
      return null;
    }
  })();
})();
