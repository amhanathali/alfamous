








//<script>
// --- utilitaires existants ---
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}
function stripTrackingQueryParams() {
  try {
    const u = new URL(window.location.href);
    const keysToDrop = [
      "fbclid", "igshid", "mc_cid", "mc_eid", "gclid", "dclid", "msclkid",
      "_hsenc", "_hsmi", "mkt_tok", "vero_id"
    ];
    let changed = false;
    keysToDrop.forEach((k) => {
      if (u.searchParams.has(k)) {
        u.searchParams.delete(k);
        changed = true;
      }
    });
    // Supprime tous les utm_*.
    Array.from(u.searchParams.keys()).forEach((k) => {
      if (/^utm_/i.test(k)) {
        u.searchParams.delete(k);
        changed = true;
      }
    });
    if (!changed) return;
    const next = u.pathname + (u.search ? u.search : "") + (u.hash ? u.hash : "");
    history.replaceState(history.state, "", next);
  } catch (_) { }
}
function consumeQueryParams(paramNames = []) {
  try {
    const names = Array.isArray(paramNames) ? paramNames : [paramNames];
    const u = new URL(window.location.href);
    let changed = false;
    names.forEach((n) => {
      const k = String(n || "").trim();
      if (!k) return;
      if (u.searchParams.has(k)) {
        u.searchParams.delete(k);
        changed = true;
      }
    });
    if (!changed) return;
    const next = u.pathname + (u.search ? u.search : "") + (u.hash ? u.hash : "");
    history.replaceState(history.state, "", next);
  } catch (_) { }
}
function parseShowVerset(val) {
  if (!val) return null;
  const m = String(val).trim().match(/^(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const s = +m[1], v = +m[2];
  if (s < 1 || s > 114 || v < 1) return null;
  return { s, v };
}

// --- helpers d'attente génériques ---
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function getByPath(root, path) {
  if (!path) return undefined;
  return path.split('.').reduce((obj, key) =>
    (obj != null ? obj[key] : undefined), root);
}

/**
 * Attend qu'une fonction globale (ex: "ouvrirPopup" ou "Popup.ouvrir") soit dispo, puis l'appelle.
 */
async function callWithRetry(fnPathOrFn, args = [], { timeout = 8000, interval = 100 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const fn = typeof fnPathOrFn === 'function' ? fnPathOrFn : getByPath(window, fnPathOrFn);
      if (typeof fn === 'function') {
        return await fn(...args);
      }
    } catch (_) { }
    await sleep(interval);
  }
  console.warn(`${typeof fnPathOrFn === 'string' ? fnPathOrFn : 'fonction'} indisponible après ${timeout}ms.`);
  return null;
}

/**
 * Essaie une liste de fonctions et appelle la première disponible.
 */
async function callAnyWithRetry(fnPaths = [], args = [], { timeout = 8000, interval = 100 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const p of fnPaths) {
      try {
        const fn = getByPath(window, p);
        if (typeof fn === 'function') {
          return await fn(...args);
        }
      } catch (_) { }
    }
    await sleep(interval);
  }
  console.warn(`Aucune des fonctions [${fnPaths.join(', ')}] n'a été trouvée dans le délai (${timeout}ms).`);
  return null;
}

// --- logique principale ---
async function prefillinput() {
  // Nettoyage immédiat des trackers de partage (FB/IG/UTM...) sans impacter les params métier.
  stripTrackingQueryParams();
  const motInput = document.getElementById('mot');
  const prefilRaw = getQueryParam('prefil');
  const prefilText = prefilRaw != null && prefilRaw !== ''
    ? String(prefilRaw).replace(/\+/g, ' ').trim()
    : '';

  const paramMap = {
    showVerset: getQueryParam('showVerset'),
    texte:      getQueryParam('texte'),
    sujet:      getQueryParam('sujet'),
    media:      getQueryParam('media'),
    // docMedia supprimé
    prog:       getQueryParam('prog'),
    forumMsg:   getQueryParam('forumMsg'),
  };

  for (const [key, value] of Object.entries(paramMap)) {
    if (value == null || value === '') continue;

    const trimmedValue = value.replace(/\+/g, ' ').trim();

    switch (key) {
      case 'showVerset': {
        consumeQueryParams(['showVerset']);
        const pv = parseShowVerset(trimmedValue);
        if (pv) {
          const { s, v } = pv;
          if (motInput) motInput.value = `${s}.${v}`;
          await callWithRetry('moduleSourat', [s, v]);
        } else {
          console.warn('showVerset mal formé (attendu S.V). Reçu :', trimmedValue);
        }
        return false;
      }

      case 'texte':
        consumeQueryParams(['texte']);
        if (motInput) motInput.value = trimmedValue;
        return false;

      case 'sujet':
        consumeQueryParams(['sujet']);
        if (motInput) motInput.value = trimmedValue;
        await callWithRetry('afficherPopupCommentaire', ["ajouter", trimmedValue, ""]);
        return false;

      case 'prog': {
        // ⚠️ Cas spécial: ouverture du module intégré "articlesHtml"
        if (trimmedValue === 'articlesHtml') {
          if (prefilText) window.__articlesPrefilTexte = prefilText;
          // Nettoie l'URL avant d'ouvrir la popup ciblée (évite réouverture après refresh).
          consumeQueryParams(['prog', 'prefil']);
          // si tu veux que la popup s’ouvre via ta fonction standard
          const ok = await callAnyWithRetry(
            ['ouvrirPopupHtml', 'ouvrirPopup'],
            ['articlesHtml'],
            { timeout: 1500, interval: 100 }
          );

          if (ok === null) {
            // fallback au cas où callAnyWithRetry échouerait
            if (typeof ouvrirPopupHtml === 'function') {
              ouvrirPopupHtml('articlesHtml');
            }
          }
          return false;
        }

        if (trimmedValue === 'temoignages') {
          window.__temoignagesPrefilTexte = prefilText;
          consumeQueryParams(['prog', 'prefil']);
          const ok = await callAnyWithRetry(
            ['ouvrirPopupHtml', 'ouvrirPopup'],
            ['temoignages'],
            { timeout: 8000, interval: 100 }
          );
          if (ok === null && typeof ouvrirPopupHtml === 'function') {
            ouvrirPopupHtml('temoignages');
          }
          return false;
        }

        if (trimmedValue === 'newsletter') {
          consumeQueryParams(['prog']);
          const opened = await callWithRetry('openNewsletterPopup', [], { timeout: 5000, interval: 120 });
          if (opened === null) {
            const btn = document.getElementById('newsletterBtn');
            if (btn && typeof btn.click === 'function') {
              try { btn.click(); } catch (_) { }
            }
          }
          return false;
        }

        if (
          trimmedValue === 'login' ||
          trimmedValue === 'connexion' ||
          trimmedValue === 'signin' ||
          trimmedValue === 'auth'
        ) {
          consumeQueryParams(['prog']);
          const opened = await callAnyWithRetry(
            ['fctLogInUser', 'window.fctLogInUser'],
            [],
            { timeout: 5000, interval: 120 }
          );
          if (opened === null) {
            const btn = document.getElementById('logInUser');
            if (btn && typeof btn.click === 'function') {
              try { btn.click(); } catch (_) { }
            }
          }
          return false;
        }

        if (trimmedValue === 'apropos' || trimmedValue === 'about' || trimmedValue === 'a-propos') {
          consumeQueryParams(['prog']);
          const helpHtml = await callWithRetry('msgHelpAPropos', [], { timeout: 5000, interval: 120 });
          if (helpHtml != null) {
            try {
              if (typeof window.alertMsgBoxPopup === "function") {
                window.alertMsgBoxPopup(helpHtml);
              } else {
                window.alert(String(helpHtml).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
              }
            } catch (_) { }
          } else {
            try {
              if (typeof window.alertMsgBoxPopup === "function") {
                window.alertMsgBoxPopup("A propos indisponible pour le moment.");
              }
            } catch (_) { }
          }
          return false;
        }

        // Cas général existant (medias1.html?docMedia=..., etc.)
        // "prog" contient déjà quelque chose comme: "medias1.html?docMedia=Cs2EyQ..."
        let target = trimmedValue;
        try { target = new URL(trimmedValue, location.href).toString(); } catch (_) { }
        try {
          const u = new URL(target, location.href);
          const isMedias = /(?:^|\/)medias1(?:\.html)?$/i.test(u.pathname || "");
          if (isMedias) {
            window.__mediasPrefill = {
              texte: String(u.searchParams.get("texte") || u.searchParams.get("media") || ""),
              media: String(u.searchParams.get("media") || ""),
              docMedia: String(u.searchParams.get("docMedia") || "")
            };
            target = "medias1";
          }
        } catch (_) { }
        console.log("prog =", target);
        consumeQueryParams(['prog', 'prefil']);

        const ok = await callAnyWithRetry(
          ['ouvrirPopup', 'ouvrirPopupHtml'],
          [target],
          { timeout: 1500, interval: 100 }
        );

        if (ok === null) {
          if (location.protocol === 'file:') {
            location.href = target;
          } else {
            window.open(target, '_self');
          }
        }
        return false;
      }

      case 'media':
        consumeQueryParams(['media']);
        await callWithRetry('logInUser');
        try {
          window.__mediasPrefill = { texte: String((document.getElementById('mot')?.value || '')).trim() };
        } catch (_) { }
        await callAnyWithRetry(['ouvrirPopupHtml'], ['medias1'], { timeout: 1500, interval: 100 });
        return false;

      case 'forumMsg': {
        consumeQueryParams(['forumMsg']);
        window.__forumScrollToMessageId = trimmedValue;
        await callAnyWithRetry(
          ['ouvrirPopupHtml', 'ouvrirPopup'],
          ['forum'],
          { timeout: 8000, interval: 120 }
        );
        return false;
      }

      default:
        return false;
    }
  }
  return false;
}

prefillinput();
//</script>
/* ===== Helpers localStorage (booléens) ===== */
function getStoredBool(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === '1';
  } catch (_) { return fallback; }
}
function saveBool(key, val) {
  try { localStorage.setItem(key, val ? '1' : '0'); } catch (_) { }
}

/* ===== Profil défaut =====
   - Alif/Hmza: ON
   - Mot entier: OFF
   - Ordre & contiguïté: OFF
=============================================== */
const DEFAULT_PREFS = Object.freeze({
  AlifHamza_bool: true,
  paramRechercheMotEntier: false,
  paramRechercheOrdreContigu: false,
});

const ZC_SEARCH_PREFS_EVENT = "zc:search-prefs-changed";

function zcGetSearchPrefs() {
  const me = !!window.paramRechercheMotEntier;
  const mc = !!window.paramRechercheOrdreContigu;
  return { me, mc };
}
window.zcGetSearchPrefs = zcGetSearchPrefs;

function zcApplySearchPrefsToDom(prefs) {
  const p = prefs || zcGetSearchPrefs();
  const me = !!p.me;
  const mc = !!p.mc;
  document.querySelectorAll('[id="paramRechercheMotEntier"]').forEach((el) => { el.checked = me; });
  document.querySelectorAll('[id="ordreExactCheckbox"]').forEach((el) => { el.checked = mc; });
}

function zcSetSearchPrefs(next, opts) {
  const options = opts || {};
  const prev = zcGetSearchPrefs();
  const me = next && Object.prototype.hasOwnProperty.call(next, "me") ? !!next.me : prev.me;
  const mc = next && Object.prototype.hasOwnProperty.call(next, "mc") ? !!next.mc : prev.mc;
  const changed = me !== prev.me || mc !== prev.mc;

  window.paramRechercheMotEntier = me;
  try { paramRechercheMotEntier = me; } catch (_) { }
  window.paramRechercheOrdreContigu = mc;

  saveBool('paramRechercheMotEntier', me);
  saveBool('paramRechercheOrdreContigu', mc);
  zcApplySearchPrefsToDom({ me, mc });
  syncParamTogglesChrome();

  if (!options.silent) {
    try {
      window.dispatchEvent(new CustomEvent(ZC_SEARCH_PREFS_EVENT, {
        detail: {
          prev,
          next: { me, mc },
          changed,
          source: String(options.source || "unknown")
        }
      }));
    } catch (_) { }
  }
  if (!options.skipRequery) {
    try {
      if (typeof window.forumReaderRenderList === "function") {
        window.forumReaderRenderList();
      }
    } catch (_) { }
    try {
      const mot = document.getElementById("mot");
      if (mot) {
        mot.dispatchEvent(new Event("input", { bubbles: true }));
        mot.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch (_) { }
  }
  return { me, mc, changed };
}
window.zcSetSearchPrefs = zcSetSearchPrefs;

window.zcToggleSearchPref = function zcToggleSearchPref(key, source) {
  const k = String(key || "").toLowerCase();
  const cur = zcGetSearchPrefs();
  if (k === "me") return zcSetSearchPrefs({ me: !cur.me }, { source: source || "toggle:me" });
  if (k === "mc") return zcSetSearchPrefs({ mc: !cur.mc }, { source: source || "toggle:mc" });
  return { me: cur.me, mc: cur.mc, changed: false };
};

function zcBindSearchPrefToggles() {
  if (window.__zcSearchPrefToggleBound) return;
  window.__zcSearchPrefToggleBound = true;
  document.addEventListener("click", function (ev) {
    const target = ev && ev.target && ev.target.closest ? ev.target.closest("[data-zc-pref-toggle]") : null;
    if (!target) return;
    const key = String(target.getAttribute("data-zc-pref-toggle") || "").trim().toLowerCase();
    if (key !== "me" && key !== "mc") return;
    ev.preventDefault();
    window.zcToggleSearchPref(key, "data-zc-pref-toggle");
  });
}
window.zcBindSearchPrefToggles = zcBindSearchPrefToggles;

/* Lit une préférence booléenne ; si absente, l'initialise avec initVal (et la persiste). */
function loadOrInitBool(key, initVal) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) {
      const normalized = !!initVal;
      saveBool(key, normalized);
      return normalized;
    }
    return v === '1';
  } catch (_) {
    return !!initVal;
  }
}

/* ===== Init depuis localStorage + synchro UI (UNE seule version !) ===== */
function initTogglePreferences() {
  // Alif/Hmza
  const cbAH = document.getElementById('AlifHamzaBtn');
  AlifHamza = loadOrInitBool('AlifHamza_bool', DEFAULT_PREFS.AlifHamza_bool);
  if (cbAH) cbAH.checked = AlifHamza;

  // Mot entier
  const me = loadOrInitBool('paramRechercheMotEntier', DEFAULT_PREFS.paramRechercheMotEntier);
  window.paramRechercheMotEntier = me;
  try { paramRechercheMotEntier = me; } catch (_) { }

  // Ordre & contiguïté (ID DOM = ordreExactCheckbox ; clé LS = paramRechercheOrdreContigu)
  const mc = loadOrInitBool('paramRechercheOrdreContigu', DEFAULT_PREFS.paramRechercheOrdreContigu);
  window.paramRechercheOrdreContigu = mc;
  zcApplySearchPrefsToDom({ me, mc });

  //lngCom

  //changerTraductionSelectionnee("lx");
}

/* Handlers */
function changerEtatAlifHamzaCheckbox() {
  const cb = document.getElementById('AlifHamzaBtn');
  AlifHamza = !!(cb && cb.checked);
  saveBool('AlifHamza_bool', AlifHamza);
}
function changerEtatParamRechercheMotEntier() {
  const cb = document.querySelector('[id="paramRechercheMotEntier"]');
  const me = !!(cb && cb.checked);
  zcSetSearchPrefs({ me }, { source: "changerEtatParamRechercheMotEntier" });
}
function changerEtatOrdreExactCheckbox() {
  const cb = document.querySelector('[id="ordreExactCheckbox"]');
  const mc = !!(cb && cb.checked);
  zcSetSearchPrefs({ mc }, { source: "changerEtatOrdreExactCheckbox" });
}

/* Set + persist + déclencher change */
function setCheckboxAndPersist(id, checked) {
  const cb = document.getElementById(id);
  if (!cb) return;
  cb.checked = !!checked;

  switch (id) {
    case 'AlifHamzaBtn':
      AlifHamza = !!checked;
      saveBool('AlifHamza_bool', AlifHamza);
      break;
    case 'paramRechercheMotEntier':
      zcSetSearchPrefs({ me: !!checked }, { source: "setCheckboxAndPersist:paramRechercheMotEntier" });
      break;
    case 'ordreExactCheckbox':
      zcSetSearchPrefs({ mc: !!checked }, { source: "setCheckboxAndPersist:ordreExactCheckbox" });
      break;
  }
  cb.dispatchEvent(new Event('change', { bubbles: true }));
}

/* Bouton “Défaut” — UNE seule version et bons IDs */
function resetTogglePreferencesToDefaults() {
  setCheckboxAndPersist('AlifHamzaBtn', DEFAULT_PREFS.AlifHamza_bool);
  setCheckboxAndPersist('paramRechercheMotEntier', DEFAULT_PREFS.paramRechercheMotEntier);
  setCheckboxAndPersist('ordreExactCheckbox', DEFAULT_PREFS.paramRechercheOrdreContigu);
}

/* Synchro inter-onglets */
window.addEventListener('storage', (e) => {
  if (!e.key) return;
  const map = {
    'AlifHamza_bool': ['AlifHamzaBtn', v => { AlifHamza = v; }],
    'paramRechercheMotEntier': ['paramRechercheMotEntier', v => { window.paramRechercheMotEntier = v; try { paramRechercheMotEntier = v; } catch (_) { } }],
    'paramRechercheOrdreContigu': ['ordreExactCheckbox', v => { window.paramRechercheOrdreContigu = v; }],
  };
  const entry = map[e.key];
  if (!entry) return;
  const newVal = e.newValue === '1';
  const cb = document.querySelector('[id="' + entry[0] + '"]');
  entry[1](newVal);
  if (cb) cb.checked = newVal;
  if (e.key === 'paramRechercheMotEntier') zcSetSearchPrefs({ me: newVal }, { source: "storage", silent: true });
  else if (e.key === 'paramRechercheOrdreContigu') zcSetSearchPrefs({ mc: newVal }, { source: "storage", silent: true });
  else syncParamTogglesChrome();
});

function applyParamToggleChromeState(el, checked, titleText) {
  if (!el) return;
  el.classList.toggle('zc-param-toggle-on', !!checked);
  el.classList.toggle('zc-param-toggle-off', !checked);
  const prefToggle = String(el.getAttribute('data-zc-pref-toggle') || '').toLowerCase();
  if (prefToggle === 'me' || prefToggle === 'mc') {
    const tone = checked ? 'var(--zc-accent)' : 'var(--zc-text-muted)';
    el.style.setProperty('color', tone, 'important');
    const shortLabel = el.querySelector('.zc-module-tab-short-label');
    if (shortLabel) shortLabel.style.setProperty('color', tone, 'important');
    const spans = el.querySelectorAll('span');
    spans.forEach((sp) => sp.style.setProperty('color', tone, 'important'));
  }
  if (titleText) {
    const t = String(titleText);
    el.setAttribute('title', t);
    el.setAttribute('aria-label', t);
    const detail = el.querySelector('.zc-params-detail-text');
    if (detail) detail.textContent = t;
  }
}

/** Titre localisé depuis I18N_TITLES (id = clé), sinon libellé court ME/MC. */
function zcI18nTitleForId(id, fallback) {
  try {
    const L = (typeof getUILang === 'function') ? String(getUILang() || 'FR') : 'FR';
    const key = L.toUpperCase();
    const dict = (window.I18N_TITLES && window.I18N_TITLES[key]) || (window.I18N_TITLES && window.I18N_TITLES.FR);
    if (!dict) return fallback != null ? String(fallback) : '';
    const v = dict[id];
    if (v != null && String(v).trim() !== '') return String(v);
  } catch (_) { }
  return fallback != null ? String(fallback) : '';
}
window.zcI18nTitleForId = zcI18nTitleForId;

function syncParamTogglesChrome() {
  const prefs = zcGetSearchPrefs();
  const meOn = !!prefs.me;
  const mcOn = !!prefs.mc;

  const meTitle = zcI18nTitleForId('labelRechercheMotEntier',
    (typeof localizedMotEntier === 'function') ? localizedMotEntier() : 'Mot Entier');
  const mcTitle = zcI18nTitleForId('labelOrdreExactCheckbox',
    (typeof localizedMotsContigus === 'function') ? localizedMotsContigus() : 'Mots Contigus');

  function applyStateOnAll(selector, checked, titleText) {
    if (!selector) return;
    const nodes = document.querySelectorAll(selector);
    if (!nodes || !nodes.length) return;
    nodes.forEach((el) => applyParamToggleChromeState(el, checked, titleText));
  }

  applyStateOnAll('[data-zc-pref-toggle="me"], #tipTab__btnZcParamsTabME, #labelRechercheMotEntier', meOn, meTitle);
  applyStateOnAll('[data-zc-pref-toggle="mc"], #tipTab__btnZcParamsTabMC, #labelOrdreExactCheckbox', mcOn, mcTitle);

  /* Même intitulés que panelParams sur ME/MC dans #popupResultats (Zoom 0–3, Lexique). */
  try {
    document.querySelectorAll('.zc-popup-zoom-params-frame').forEach((frame) => {
      const toggles = frame.querySelectorAll('.zc-popup-toggle-btn');
      if (toggles[0]) {
        toggles[0].setAttribute('title', meTitle);
        toggles[0].setAttribute('aria-label', meTitle);
      }
      if (toggles[1]) {
        toggles[1].setAttribute('title', mcTitle);
        toggles[1].setAttribute('aria-label', mcTitle);
      }
    });
  } catch (_) { }

  const histTitle = zcI18nTitleForId('btnZcParamsTabHistorik', 'Historique des mots saisis');
  const histIds = ['btnZcParamsTabHistorik', 'btnHistorikFromPopup', 'btnHistorikFromPopupZoom0', 'btnHistorikFromLexique'];
  if (typeof window.zcResultZoomDomIds === 'function') {
    for (let zi = 0; zi <= 3; zi++) {
      const d = window.zcResultZoomDomIds(zi);
      histIds.push(d.historikZoom0, d.historikPopup, d.historikLexique);
    }
  }
  histIds.forEach((hid) => {
    const hEl = document.getElementById(hid);
    if (!hEl) return;
    hEl.setAttribute('title', histTitle);
    hEl.setAttribute('aria-label', histTitle);
  });
}
window.syncParamTogglesChrome = syncParamTogglesChrome;
window.addEventListener(ZC_SEARCH_PREFS_EVENT, function () {
  syncParamTogglesChrome();
});

/* Boot (UNE seule attache) */
(function bootHydrateFromStorage() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initTogglePreferences();
      zcBindSearchPrefToggles();
      syncParamTogglesChrome();
      setTimeout(syncParamTogglesChrome, 120);
      setTimeout(syncParamTogglesChrome, 500);
    }, { once: true });
  } else {
    initTogglePreferences();
    zcBindSearchPrefToggles();
    syncParamTogglesChrome();
    setTimeout(syncParamTogglesChrome, 120);
    setTimeout(syncParamTogglesChrome, 500);
  }
})();


// --- Helper de lecture de l’option dans la fonction de recherche ---
function isMotContiguActive() {
  if (typeof window.paramRechercheOrdreContigu !== 'undefined') {
    return !!window.paramRechercheOrdreContigu;
  }
  return !!document.getElementById('ordreExactCheckbox')?.checked;
}
