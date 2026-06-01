//<script>
// sessions-slim.js — schéma simple et stable
// /daily/{YYYY-MM-DD}         -> { count: number, updatedAt: serverTimestamp() }
// /counters/uniqueVisitors    -> { count: number, updatedAt: serverTimestamp() }
// UI: #statToday, #statTotal

(function () {
  "use strict";

  // ---- Détecter Firebase/Firestore disponibles
  const hasFirebase = () => !!(window.firebase && firebase.apps && firebase.apps.length);
  const getDB = () => { try { return firebase.firestore(); } catch { return null; } };

  // ---- Utilitaires
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ID client persistant (pour trace "clients", facultatif)
  function getClientId() {
    const K = 'clientId';
    let id = localStorage.getItem(K);
    if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + '-' + Date.now())); localStorage.setItem(K, id); }
    return id;
  }

  // ---- I/O Firestore (schéma simplifié)
  async function readDayCount(db) {
    try {
      const s = await db.collection('daily').doc(todayKey()).get();
      const d = s.exists ? (s.data() || {}) : {};
      // canonique
      if (typeof d.count === 'number') return d.count;
      // *** Optionnel: fallback rétro (si ancienne donnée a 'uniqueVisitors' / 'total') ***
      if (typeof d.uniqueVisitors === 'number') return d.uniqueVisitors; // rétro (lecture seule)
    } catch (e) { console.warn('readDayCount:', e); }
    return 0;
  }

  async function readTotalCount(db) {
    try {
      const s = await db.collection('counters').doc('uniqueVisitors').get();
      const d = s.exists ? (s.data() || {}) : {};
      if (typeof d.count === 'number') return d.count;
      // rétro lecture
      if (typeof d.total === 'number') return d.total;
    } catch (e) { console.warn('readTotalCount:', e); }
    return 0;
  }

  // Incrémente 1 fois par jour (garde-fou localStorage)
  async function bumpOncePerDay() {
    if (!hasFirebase()) return;
    const db = getDB(); if (!db) return;

    const key = todayKey();
    const LS = 'dailyDoneFor';
    if (localStorage.getItem(LS) === key) return; // déjà compté aujourd'hui

    // /daily/{date}.count += 1  et /counters/uniqueVisitors.count += 1
    const inc = firebase.firestore.FieldValue.increment(1);
    const ts = firebase.firestore.FieldValue.serverTimestamp();

    await db.collection('daily').doc(key).set({ count: inc, updatedAt: ts }, { merge: true });
    await db.collection('counters').doc('uniqueVisitors').set({ count: inc, updatedAt: ts }, { merge: true });

    localStorage.setItem(LS, key);
  }

  // Enregistrement client (facultatif, throttle 12h)
  async function registerClient(mail) {
    try {
      if (!hasFirebase()) return;
      const db = getDB(); if (!db) return;

      const LS = 'clientSyncAt';
      const last = Number(localStorage.getItem(LS) || 0);
      if (Date.now() - last < 12 * 60 * 60 * 1000) return; // 12h

      const id = getClientId();
      const payload = {
        mail: (mail && String(mail).trim()) || undefined,
        ua: navigator.userAgent || 'unknown',
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
        lang: navigator.language || 'unknown',
        lastSeen: new Date().toISOString()
      };
      await db.collection('clients').doc(id).set({ firstSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      await db.collection('clients').doc(id).set(payload, { merge: true });
      localStorage.setItem(LS, String(Date.now()));
    } catch (e) { console.warn('registerClient:', e); }
  }

  // ---- Rendu UI (#statToday, #statTotal)
  async function renderBadges() {
    const elD = document.getElementById('statToday');
    const elT = document.getElementById('statTotal');
    if (elD && (!elD.textContent || elD.textContent.trim() === '')) elD.textContent = '0';
    if (elT && (!elT.textContent || elT.textContent.trim() === '')) elT.textContent = '0';

    if (!hasFirebase()) return;
    const db = getDB(); if (!db) return;

    try { if (elD) elD.textContent = String(await readDayCount(db)); } catch { }
    try { if (elT) elT.textContent = String(await readTotalCount(db)); } catch { }
  }

  // ---- Boot
  async function boot() {
    // mettre 1 visibles si vide
    const d = document.getElementById('statToday'); if (d && !d.textContent) d.textContent = '1';
    const t = document.getElementById('statTotal'); if (t && !t.textContent) t.textContent = '1';

    if (hasFirebase() && getDB()) {
      try {
        if (window.__zcAuthReady) await window.__zcAuthReady;
      } catch (e) { console.warn('sessions boot auth:', e); }
      var sessionOk =
        typeof window.zcFirebaseHasRealSignedInUser === 'function' &&
        window.zcFirebaseHasRealSignedInUser();
      if (sessionOk) {
        try {
          const m = String(localStorage.getItem('mailUser') || '').trim().toLowerCase();
          if (!m || (typeof zcIsAnonymeCourriel === 'function' && zcIsAnonymeCourriel(m))) sessionOk = false;
        } catch (_) {
          sessionOk = false;
        }
      }
      if (sessionOk) {
        try {
          await bumpOncePerDay();
          await registerClient(window.mailUser || null);
        } catch (e) {
          console.warn('sessions boot (daily/counters/clients):', e && (e.code || e.message || e));
        }
      }
      await renderBadges();

      // Petits retries “souples” au démarrage
      setTimeout(renderBadges, 600);
      setTimeout(renderBadges, 1500);
      setTimeout(renderBadges, 3000);
    }
  }

  // API minimale
  window.sessions = Object.freeze({
    renderBadges
  });

  // Démarrage
  document.addEventListener('DOMContentLoaded', boot);
})();

// Refresh compteur lorsqu’on revient sur l’onglet
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && window.sessions) {
    try { window.sessions.renderBadges(); } catch (e) { }
  }
});
//</script>





//<script>
/**
 * PresenceRealtime — compteur temps réel fiable basé sur une collection dédiée.
 * Collections:
 *   - rtPresenceTabs/{tabId}: { counted, mode, createdAt, lastSeen, active }
 *   - rtPresenceCounter/counter: { count }
 *
 * Stratégie robustifiée:
 *   - localStorage('PR_COUNTED') empêche l’OVERCOUNT au reload.
 *   - Décrément sur pagehide (+ visibilitychange en mode 'visible'). Pas de beforeunload :
 *     évite les avertissements Permissions-Policy « unload » (Chrome) et redondant avec pagehide.
 *   - Heartbeat lastSeen + reconciler zombie (tabs actifs mais lastSeen périmé).
 *
 * API:
 *   PresenceRealtime.init({ mode:'visible'|'open', selector:'#badge', onUpdate:(n)=>{} })
 *   PresenceRealtime.getCount()
 *   PresenceRealtime.teardown()
 */
(function (win) {
  const NS = 'PresenceRealtime';
  if (win[NS]) return;

  const COUNTER_COL = 'rtPresenceCounter';
  const COUNTER_ID = 'counter';
  const TABS_COL = 'rtPresenceTabs';

  const FieldValue = firebase.firestore.FieldValue;
  const NOWTS = () => firebase.firestore.Timestamp.now();

  function firestoreAuthOk() {
    try {
      return !!(firebase.auth && firebase.auth().currentUser);
    } catch (_) {
      return false;
    }
  }

  // ID stable par onglet (et par cycle de vie), persistant au reload
  const tabToken = (localStorage.getItem('PR_TAB_TOKEN')) ||
    ((crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) + '-' + Date.now());
  localStorage.setItem('PR_TAB_TOKEN', tabToken);

  // Flag "cet onglet est-il déjà compté ?"
  const COUNTED_KEY = 'PR_COUNTED';

  let _mode = 'visible';
  let _badgeSel = null;
  let _onUpdate = null;
  let _unsubCount = null;
  let _count = 0;

  let _hbTimer = null; // heartbeat
  let _reconTimer = null; // reconciler
  let _isChanging = false; // garde-fou d'opérations atomiques
  let _isTeardown = false;

  function cRef() { return db.collection(COUNTER_COL).doc(COUNTER_ID); }
  function tRef() { return db.collection(TABS_COL).doc(tabToken); }

  async function ensureCounterDoc() {
    if (!firestoreAuthOk()) return;
    const snap = await cRef().get();
    if (!snap.exists) await cRef().set({ count: 0 });
  }

  // -------- Compteur global (atomique) --------
  async function inc() {
    if (!firestoreAuthOk()) return;
    await ensureCounterDoc();
    await cRef().update({ count: FieldValue.increment(1) });
  }
  async function dec() {
    if (!firestoreAuthOk()) return;
    await ensureCounterDoc();
    await db.runTransaction(async (tx) => {
      const cs = await tx.get(cRef());
      const cur = (cs.exists && typeof cs.data().count === 'number') ? cs.data().count : 0;
      tx.update(cRef(), { count: Math.max(0, cur - 1) });
    });
  }

  function notify(n) {
    _count = n;
    if (_badgeSel) {
      const el = document.querySelector(_badgeSel);
      if (el) {
        el.textContent = String(n);
        el.title = `Onglets actifs: ${n}`;
        el.setAttribute('aria-label', `Onglets actifs: ${n}`);
      }
    }
    if (typeof _onUpdate === 'function') {
      try { _onUpdate(n); } catch { }
    }
  }

  function isTransientNetworkError(err) {
    const raw = String((err && (err.code || err.message)) || '').toLowerCase();
    return raw.includes('network') || raw.includes('unavailable') || raw.includes('timeout') || raw.includes('quic');
  }

  function listenCounter() {
    if (_unsubCount) try { _unsubCount(); } catch { }
    _unsubCount = cRef().onSnapshot(s => {
      const n = (s.exists && typeof s.data().count === 'number') ? s.data().count : 0;
      notify(n);
    }, err => {
      // Onglet inactif: le navigateur peut suspendre le réseau (ERR_NETWORK_IO_SUSPENDED, QUIC timeout)
      if (document.hidden && isTransientNetworkError(err)) return;
      console.error('[PresenceRealtime] counter listener error', err);
    });
  }

  function isVisibleActive() { return !document.hidden; }
  function wantActive() {
    return _mode === 'open' ? true : isVisibleActive();
  }

  function isCounted() { return localStorage.getItem(COUNTED_KEY) === '1'; }
  function setCounted(v) {
    if (v) localStorage.setItem(COUNTED_KEY, '1');
    else localStorage.removeItem(COUNTED_KEY);
  }

  async function markTab(active) {
    if (!firestoreAuthOk()) return;
    await tRef().set({
      active: !!active,
      mode: _mode,
      lastSeen: NOWTS(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp() // première fois: server time
    }, { merge: true });
  }

  async function activateIfNeeded() {
    if (_isChanging || _isTeardown) return;
    if (isCounted()) {
      // Déjà compté: on met juste à jour le doc d'onglet
      await markTab(true);
      return;
    }
    _isChanging = true;
    try {
      await inc();
      setCounted(true);
      await markTab(true);
    } finally {
      _isChanging = false;
    }
  }

  async function deactivateIfNeeded() {
    if (_isChanging || _isTeardown) return;
    if (!isCounted()) {
      // Rien à décrémenter mais on marque inactif
      await markTab(false);
      return;
    }
    _isChanging = true;
    try {
      await dec();
      setCounted(false);
      await markTab(false);
    } finally {
      _isChanging = false;
    }
  }

  // -------- Heartbeat & Reconciler --------
  function startHeartbeat() {
    stopHeartbeat();
    _hbTimer = setInterval(() => {
      if (!firestoreAuthOk()) return;
      tRef().set({ lastSeen: NOWTS() }, { merge: true }).catch((e) => {
        if (document.hidden && isTransientNetworkError(e)) return;
        console.warn('[PresenceRealtime] heartbeat', e);
      });
    }, 20000);
  }
  function stopHeartbeat() {
    if (_hbTimer) { clearInterval(_hbTimer); _hbTimer = null; }
  }

  // Corrige les zombies: onglets marqués actifs dont lastSeen est vieux
  async function reconcileZombies() {
    if (!firestoreAuthOk()) return;
    const cutoffMs = 90 * 1000; // 90s sans heartbeat => zombie
    const cutoffTs = Date.now() - cutoffMs;

    try {
      const qs = await db.collection(TABS_COL).where('active', '==', true).get();
      const toFix = [];
      qs.forEach(doc => {
        const d = doc.data() || {};
        const ls = d.lastSeen ? (d.lastSeen.toMillis ? d.lastSeen.toMillis() : 0) : 0;
        if (!ls || ls < cutoffTs) toFix.push(doc.id);
      });

      if (toFix.length) {
        await ensureCounterDoc();
        await db.runTransaction(async (tx) => {
          const cs = await tx.get(cRef());
          const cur = (cs.exists && typeof cs.data().count === 'number') ? cs.data().count : 0;
          const newVal = Math.max(0, cur - toFix.length);
          tx.update(cRef(), { count: newVal });
          // marque chaque zombie inactif
          toFix.forEach(id => {
            const r = db.collection(TABS_COL).doc(id);
            tx.set(r, { active: false, lastSeen: NOWTS() }, { merge: true });
          });
        });
      }
    } catch (e) {
      if (document.hidden && isTransientNetworkError(e)) return;
      console.warn('[PresenceRealtime] reconcile error', e);
    }
  }

  function startReconciler() {
    stopReconciler();
    _reconTimer = setInterval(reconcileZombies, 60000); // chaque 60s
  }
  function stopReconciler() {
    if (_reconTimer) { clearInterval(_reconTimer); _reconTimer = null; }
  }

  // -------- Handlers de cycle de vie --------
  async function handleVisibilityChange() {
    if (document.hidden) {
      // Réduit le bruit console/réseau quand la page passe en arrière-plan.
      if (_unsubCount) { try { _unsubCount(); } catch { } _unsubCount = null; }
      stopReconciler();
    } else {
      listenCounter();
      startReconciler();
    }

    if (_mode === 'visible') {
      if (wantActive()) {
        await activateIfNeeded();
        startHeartbeat();
      } else {
        await deactivateIfNeeded();
        stopHeartbeat();
      }
    } else {
      // mode 'open': on reste compté tant que l'onglet existe (visible ou non)
      if (wantActive()) {
        await activateIfNeeded();
        startHeartbeat();
      }
    }
  }

  async function handlePageHide() {
    // Décrémente lors de la fermeture/navigation (remplace beforeunload : moins de violations unload policy)
    try { await deactivateIfNeeded(); } catch { }
  }

  async function init(opts) {
    opts = opts || {};
    try {
      if (window.__zcAuthReady) await window.__zcAuthReady;
    } catch (e) { console.warn('[PresenceRealtime] auth:', e); }
    if (!firebase.auth().currentUser) {
      console.warn('[PresenceRealtime] Pas de session Auth — présence temps réel désactivée (console Firebase : Anonymous).');
      return { getCount: function () { return 0; }, teardown: async function () { } };
    }
    _mode = (opts.mode === 'open' || opts.mode === 'visible') ? opts.mode : 'visible';
    _badgeSel = opts.selector || null;
    _onUpdate = (typeof opts.onUpdate === 'function') ? opts.onUpdate : null;

    listenCounter();
    startReconciler();

    // état initial
    if (wantActive()) {
      await activateIfNeeded();
      startHeartbeat();
    } else {
      await markTab(false);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    window.addEventListener('pagehide', handlePageHide, { passive: true });

    return { getCount, teardown };
  }

  function getCount() { return _count; }

  async function teardown() {
    _isTeardown = true;
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
    stopHeartbeat();
    stopReconciler();
    if (_unsubCount) { try { _unsubCount(); } catch { } _unsubCount = null; }
    try { await deactivateIfNeeded(); } catch { }
  }

  win[NS] = { init, getCount, teardown };
})(window);
//</script>

// Compter les onglets visibles (conseillé)
PresenceRealtime.init({ mode: 'visible', selector: '#usersOnlineBadge' }).catch(function (e) {
  console.warn('[PresenceRealtime] init:', e);
});

//<script>Juste pour recompter les onglets actifs (Btn caché)
/**
 * PresenceRecalc — Recompte autoritatif des onglets actifs, sans localStorage.
 *
 * Hypothèses (mêmes conventions que ton module "presence-realtime.js"):
 *   - Collection des onglets:  rtPresenceTabs/{tabId}
 *       champs attendus: { active: boolean, lastSeen: Timestamp }
 *   - Doc compteur global:    rtPresenceCounter/counter  -> { count: number }
 *
 * API:
 *   PresenceRecalc.recalcNow({
 *     cutoffMs: 90000,     // onglet "actif" s'il a un lastSeen >= now - cutoffMs
 *     markZombies: true,   // marquer inactifs les onglets actifs mais périmés
 *     setCounter: true     // écrire le résultat dans rtPresenceCounter/counter
 *   }) -> { count, totalActive, zombies, eligible, cutoffMs }
 *
 *   PresenceRecalc.attachAutoOnLoad(opts)  // lance un recalc à l’ouverture de la page
 *
 * Remarques:
 *   - Ne dépend pas de localStorage.
 *   - Tolérant à l’absence d’index composite (fallback filtrage côté client).
 *   - Écrit de façon "autoritative" (set count := valeur recalculée).
 */
(function (win) {
  const NS = 'PresenceRecalc';
  if (win[NS]) return;

  const TABS_COL = 'rtPresenceTabs';
  const COUNTER_COL = 'rtPresenceCounter';
  const COUNTER_ID = 'counter';

  function cRef() { return db.collection(COUNTER_COL).doc(COUNTER_ID); }

  async function ensureCounterDoc() {
    const snap = await cRef().get();
    if (!snap.exists) await cRef().set({ count: 0 });
  }

  async function _markZombiesInactive(zombies) {
    if (!zombies.length) return;
    // On segmente en lots de 450 écritures (limite sécurité Firestore: 500 / lot)
    const chunkSize = 450;
    for (let i = 0; i < zombies.length; i += chunkSize) {
      const batch = db.batch();
      const part = zombies.slice(i, i + chunkSize);
      part.forEach(id => {
        batch.set(
          db.collection(TABS_COL).doc(id),
          { active: false, lastSeen: firebase.firestore.Timestamp.now() },
          { merge: true }
        );
      });
      await batch.commit();
    }
  }

  async function recalcNow(opts) {
    opts = opts || {};
    const cutoffMs = Number(opts.cutoffMs ?? 90_000); // 90s par défaut
    const markZombies = !!opts.markZombies;
    const setCounter = (opts.setCounter !== false);

    const nowMs = Date.now();
    const cutoffTs = firebase.firestore.Timestamp.fromMillis(nowMs - cutoffMs);

    let qs;
    let usedComposite = true;

    // 1) Essai rapide: filtre côté serveur (nécessite index composite)
    try {
      qs = await db.collection(TABS_COL)
        .where('active', '==', true)
        .where('lastSeen', '>=', cutoffTs) // peut demander un index composite
        .get();
    } catch (e) {
      // 2) Fallback: on prend tous les active==true et on filtre côté client
      console.warn('[PresenceRecalc] Composite index absent → fallback client-side filter.', e?.message || e);
      usedComposite = false;
      qs = await db.collection(TABS_COL).where('active', '==', true).get();
    }

    // 3) Comptage & détection zombies
    const eligible = [];
    const zombies = [];
    let totalActive = 0;

    qs.forEach(doc => {
      const d = doc.data() || {};
      totalActive++;
      const ms = d.lastSeen && d.lastSeen.toMillis ? d.lastSeen.toMillis() : 0;
      const fresh = usedComposite ? true : (ms >= (nowMs - cutoffMs)); // si composite, déjà filtré
      if (fresh) eligible.push(doc.id); else zombies.push(doc.id);
    });

    // 4) Écritures (facultatives) : set counter et/ou marquage zombies
    if (setCounter || markZombies) {
      await ensureCounterDoc();

      // Met à jour le compteur de façon autoritative
      if (setCounter) {
        await cRef().set({ count: eligible.length }, { merge: true });
      }

      // Marque les zombies inactifs si demandé
      if (markZombies && zombies.length) {
        await _markZombiesInactive(zombies);
      }
    }

    return {
      count: eligible.length,
      totalActive,
      zombies,
      eligible,
      cutoffMs
    };
  }

  function attachAutoOnLoad(opts) {
    const run = () => recalcNow(opts).catch(err => console.warn('[PresenceRecalc] auto recalc error', err));
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });
    return run; // permet d'appeler manuellement plus tard si besoin
  }

  win[NS] = { recalcNow, attachAutoOnLoad };
})(window);
//</script>
//<script src="presence-recalc.js"></script>
//<script>
async function recalcPresence() {
  const res = await PresenceRecalc.recalcNow({
    cutoffMs: 90000,   // onglet "valide" s’il a "lastSeen" dans les 90s
    markZombies: true, // remet à false les onglets périmés
    setCounter: true   // écrit le total calculé dans rtPresenceCounter/counter
  });
  console.log('Presence recalculated:', res);
}
//</script>

//<button onclick="recalcPresence()">Recompter les onglets actifs</button>















// === Like Button — Firestore + ID appareil persistant (iOS-safe) ===

// ⚙️ ID en mémoire si localStorage indisponible (iOS Private mode)
let __CLIENT_ID_IN_MEMORY = null;

function getClientIdSafe() {
  // 1) si tu as déjà une fonction maison
  try {
    if (typeof getClientId === 'function') {
      const v = getClientId();
      if (v) return String(v);
    }
  } catch (_) { }

  const K = 'clientId';

  // 2) lecture protégée
  try {
    const existing = localStorage.getItem(K);
    if (existing) return existing;
  } catch (_) { }

  // 3) génère un id
  const gen = (crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : (Math.random().toString(36).slice(2) + '-' + Date.now());

  // 4) essaie d'écrire; sinon fallback RAM
  try {
    localStorage.setItem(K, gen);
    return gen;
  } catch (_) {
    __CLIENT_ID_IN_MEMORY = __CLIENT_ID_IN_MEMORY || gen;
    return __CLIENT_ID_IN_MEMORY;
  }
}

// Concat sans caractères exotiques — pour un docId compact
function makeLikeDocId(targetId, clientId) {
  const sanitize = s => String(s).replace(/[^A-Za-z0-9._-]/g, '_');
  return `${sanitize(targetId)}__${sanitize(clientId)}`;
}

// Lecture en temps réel du compteur (met à jour <span.like-count>)
function listenLikeCount(buttonEl, targetId) {
  const span = buttonEl.querySelector('.like-count');
  if (!span) return () => { };

  const ref = db.collection('likesCounters').doc(targetId);
  const unsub = ref.onSnapshot(snap => {
    const n = (snap.exists && typeof snap.data().count === 'number') ? snap.data().count : 0;
    const s = String(n);
    span.textContent = s;
    document.querySelectorAll('#panelFooter .like-count').forEach((el) => {
      el.textContent = s;
    });
  }, err => console.warn('likesCounters.onSnapshot:', err));

  return unsub; // pour cleanup si besoin
}

// Vérifie si l’appareil a déjà liké cette cible
async function hasLiked(targetId) {
  const clientId = getClientIdSafe();
  const docId = makeLikeDocId(targetId, clientId);
  const snap = await db.collection('likes').doc(docId).get();
  return snap.exists;
}

function zcGetFooterLikeTab() {
  return document.querySelector('#panelFooter .zc-module-tab-icons .zc-footer-tab-like')
    || document.getElementById('tipTabFooterLike');
}

function syncFooterLikeTabMirror(liked) {
  const tab = zcGetFooterLikeTab();
  if (!tab) return;
  tab.setAttribute('aria-pressed', liked ? 'true' : 'false');
  tab.classList.toggle('is-liked', !!liked);
  const heart = tab.querySelector('.like-heart');
  if (heart) {
    heart.textContent = liked ? '♥' : '♡';
  }
}

// Applique l’état visuel du bouton
function setButtonState(btn, liked) {
  btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
  btn.classList.toggle('is-liked', !!liked);

  const heart = btn.querySelector('.like-heart');
  if (heart) {
    // Neutre: contour. Aimé: coeur plein.
    heart.textContent = liked ? '♥' : '♡';
  }

  const label = liked ? "Retirer" : "J’aime";

  btn.setAttribute('aria-label', label);
  // Ne pas écraser title si libellé visible synchronisé (ex. pied de page)
  if (!btn.querySelector('.zc-title-sync-label')) {
    btn.title = label;
  }

  if (btn && btn.id === 'footerToolbarLikeBtn') {
    const tabLike = zcGetFooterLikeTab();
    if (tabLike) {
      tabLike.setAttribute('aria-label', btn.getAttribute('aria-label') || '');
    }
    syncFooterLikeTabMirror(liked);
  }
}



// Like (idempotent). Crée /likes/{target__client} et ++ le compteur
async function doLike(targetId, meta = {}) {
  const clientId = getClientIdSafe();
  const docId = makeLikeDocId(targetId, clientId);
  const likeRef = db.collection('likes').doc(docId);
  const counterRef = db.collection('likesCounters').doc(targetId);

  await db.runTransaction(async tx => {
    const cur = await tx.get(likeRef);
    if (cur.exists) return; // déjà liké: no-op

    tx.set(likeRef, {
      targetId,
      clientId,
      ua: navigator.userAgent || 'unknown',
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      lang: navigator.language || 'unknown',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      ...meta
    });

    tx.set(counterRef, {
      count: firebase.firestore.FieldValue.increment(1),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

// Unlike (optionnel). Supprime le doc et -- le compteur (borné à 0)
async function undoLike(targetId) {
  const clientId = getClientIdSafe();
  const docId = makeLikeDocId(targetId, clientId);
  const likeRef = db.collection('likes').doc(docId);
  const counterRef = db.collection('likesCounters').doc(targetId);

  await db.runTransaction(async tx => {
    const cur = await tx.get(likeRef);
    if (!cur.exists) return;

    tx.delete(likeRef);
    tx.set(counterRef, {
      count: firebase.firestore.FieldValue.increment(-1),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

// Initialisation d’un bouton unique
async function initLikeButton(buttonEl) {
  if (!buttonEl) return;
  // S’assure qu’on a un conteneur d’icône cœur dès l’init (même avant le 1er setState)
  if (!buttonEl.querySelector('.like-heart')) {
    const heart = document.createElement('span');
    heart.className = 'like-heart';
    heart.textContent = '❤️';
    //heart.style.fontSize = "12px";

    buttonEl.insertBefore(heart, buttonEl.firstChild || null);
  }
  const targetId = buttonEl.dataset.target || buttonEl.id || 'default';

  // Accessibilité clavier (et iPad claviers externes)
  buttonEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      buttonEl.click();
    }
  });

  // État initial
  try {
    const liked = await hasLiked(targetId);
    setButtonState(buttonEl, liked);
  } catch (e) {
    console.warn('hasLiked failed:', e);
  }

  // Compteur temps réel
  const stop = listenLikeCount(buttonEl, targetId);
  buttonEl._unsubLike = stop;

  // Click → toggle
  let _busy = false;
  buttonEl.addEventListener('click', async (ev) => {
    ev.preventDefault();
    if (_busy) return;
    _busy = true;
    try {
      const likedNow = (buttonEl.getAttribute('aria-pressed') === 'true');
      if (likedNow) {
        await undoLike(targetId);
        setButtonState(buttonEl, false);
      } else {
        await doLike(targetId);
        setButtonState(buttonEl, true);
      }
    } catch (e) {
      console.error('toggle like error:', e);
    } finally {
      _busy = false;
    }
  }, { passive: false });
}

// Initialiser tous les boutons portant .like-btn
function initAllLikeButtons() {
  document.querySelectorAll('.like-btn').forEach(btn => {
    initLikeButton(btn);
  });
}

// Auto-init au chargement
document.addEventListener('DOMContentLoaded', initAllLikeButtons);
