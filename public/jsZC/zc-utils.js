/*
 * zc-utils.js — Utilitaires UI factorisés (Phase B de l'audit).
 *
 * Objectif : un seul endroit pour les helpers transverses (échappement HTML, format texte, etc.),
 * afin de supprimer les duplications dispersées dans safeInit.js / medias1.js / forum.js /
 * forum-notify-inbox.js / mots-coran.js. Ne casse AUCUN appel existant :
 *  - on expose un namespace `window.zc` avec les nouvelles API nommées (`zc.escapeHtml`, etc.) ;
 *  - on pose aussi des globals `escapeHtml`, `zcEscapeHtmlAttr`, `zcEscapeHtmlText` UNIQUEMENT
 *    s'ils ne sont pas déjà définis (le fichier est chargé très tôt, donc ces noms sont créés).
 *  - les fichiers qui redéfinissent la même fonction plus tard écraseront simplement — sans erreur.
 *
 * Usage recommandé dans le nouveau code :
 *    zc.escapeHtml(str)       // pour du texte destiné à innerHTML (préserve les entités)
 *    zc.escapeAttr(str)       // pour des attributs HTML
 *    zc.escapeText(str)       // pour du texte encodé sans guillemets
 *    zc.escapeSimple(str)     // version légère (4 remplacements)
 */
(function () {
  'use strict';

  /** Texte → HTML (préserve les entités déjà échappées `&...;`). */
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&(?![#a-z0-9]+;)/gi, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Texte → attribut HTML (pas de `>` pour limiter la charge utile). */
  function escapeAttr(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  /** Texte brut → texte HTML (sans encoder guillemets ni apostrophes). */
  function escapeText(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Version « simple » (compatible legacy forum/notify : 4 remplacements). */
  function escapeSimple(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Tronque un libellé en ajoutant mot par mot (séparateurs : espace ou « + »).
   * Si même le 1er mot est trop long, le tronque bord-à-bord. Toujours suffixé par « … ».
   */
  function shortenLabel(texte, lenTxt = 50) {
    const s = String(texte || '').trim();
    const suffix = '…';
    const maxLen = Number(lenTxt);
    if (!s) return '';
    if (s.length <= maxLen) return s;
    const mots = s.split(/[ +]+/).filter(Boolean);
    let result = '';
    for (let i = 0; i < mots.length; i++) {
      const mot = mots[i];
      const tentative = result ? result + ' ' + mot : mot;
      if (tentative.length + suffix.length > maxLen) {
        if (!result) {
          const cutLen = maxLen - suffix.length;
          return mot.slice(0, Math.max(0, cutLen)) + suffix;
        }
        break;
      }
      result = tentative;
    }
    return result + suffix;
  }

  const ns = (window.zc = window.zc || {});
  ns.escapeHtml = escapeHtml;
  ns.escapeAttr = escapeAttr;
  ns.escapeText = escapeText;
  ns.escapeSimple = escapeSimple;
  ns.shortenLabel = shortenLabel;

  // Compat legacy : ne redéfinissent PAS ce qui existe déjà (évite les collisions d'ordre de chargement).
  if (typeof window.escapeHtml !== 'function') window.escapeHtml = escapeHtml;
  if (typeof window.zcEscapeHtmlAttr !== 'function') window.zcEscapeHtmlAttr = escapeAttr;
  if (typeof window.zcEscapeHtmlText !== 'function') window.zcEscapeHtmlText = escapeText;
  if (typeof window.escapeHtmlForum !== 'function') window.escapeHtmlForum = escapeSimple;
  if (typeof window.shortenLabel !== 'function') window.shortenLabel = shortenLabel;

  /**
   * Upgrade d'un champ de recherche `<input>` / `<textarea>` pour afficher / masquer
   * le bouton « effacer » (×) selon la présence de valeur. S'utilise sur les champs
   * existants sans remonter leur markup : le bouton `clearBtn` reçoit/perd la classe
   * `.is-hidden` (définie dans styles/20-search-field.css).
   *
   * @param {string|HTMLElement} field  Champ d'entrée ou son id.
   * @param {string|HTMLElement} clearBtn  Bouton × ou son id.
   */
  function bindSearchClearVisibility(field, clearBtn) {
    const f = typeof field === "string" ? document.getElementById(field) : field;
    const c = typeof clearBtn === "string" ? document.getElementById(clearBtn) : clearBtn;
    if (!f || !c) return;
    const update = () => {
      const has = String(f.value || "").length > 0;
      c.classList.toggle("is-hidden", !has);
    };
    // Idempotent : un seul listener par bouton (identifié par son élément).
    c.__zcSearchUpdate = update;
    if (!c.__zcSearchBound) {
      f.addEventListener("input", update);
      f.addEventListener("change", update);
      f.addEventListener("focus", update);
      c.__zcSearchBound = true;
    }
    // Appel initial (ou refresh si re-appelé).
    update();
  }
  ns.bindSearchClearVisibility = bindSearchClearVisibility;
  if (typeof window.bindSearchClearVisibility !== 'function') {
    window.bindSearchClearVisibility = bindSearchClearVisibility;
  }

  /**
   * Demande confirmation avant de vider un champ d'entrée, SEULEMENT si le champ a
   * du contenu. Après vidage, dispatche un event "input" pour déclencher les filtres /
   * le sync / le toggle de visibilité du bouton ×.
   *
   * @param {string|HTMLElement} field  Champ d'entrée (id ou élément).
   * @param {string} [message]  Message de confirmation. Fallback FR par défaut.
   * @returns {Promise<boolean>}  Vrai si le champ a été vidé, faux si annulé/déjà vide.
   */
  async function confirmClearField(field, message) {
    const f = typeof field === "string" ? document.getElementById(field) : field;
    if (!f) return false;
    const val = String(f.value || "");
    if (!val.length) return false;
    const msg = message || "Vider ce champ ? Le contenu saisi sera perdu.";
    let ok = false;
    try {
      if (typeof window.alertConfirm === "function") ok = !!(await window.alertConfirm(msg));
      else ok = !!window.confirm(msg);
    } catch (_) {
      try { ok = !!window.confirm(msg); } catch (_) { ok = false; }
    }
    if (!ok) return false;
    f.value = "";
    try { f.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) { }
    try { f.focus(); } catch (_) { }
    return true;
  }
  ns.confirmClearField = confirmClearField;
  if (typeof window.confirmClearField !== 'function') {
    window.confirmClearField = confirmClearField;
  }

  /**
   * Placeholders i18n centralisés pour les champs de recherche.
   * Détecte la langue via localStorage "interfaceLang" (FR par défaut) ou argument explicite.
   */
  const ZC_PLACEHOLDERS = {
    search: {
      fr: "Rechercher…",
      en: "Search…",
      ar: "بحث…",
      kab: "Nadi…",
      es: "Buscar…"
    },
    searchKeywords: {
      fr: "Mots-clés…",
      en: "Keywords…",
      ar: "كلمات مفتاحية…",
      kab: "Awalen…",
      es: "Palabras clave…"
    },
    searchMedia: {
      fr: "Rechercher Média",
      en: "Search Media",
      ar: "بحث عن وسيلة",
      kab: "Nadi aẓawan",
      es: "Buscar multimedia"
    },
    forumSearch: {
      fr: "Parcourir et lire les messages…",
      en: "Browse and read messages…",
      ar: "تصفح وقراءة الرسائل…",
      kab: "Inig-inig ɣer tebrayin…",
      es: "Explorar y leer mensajes…"
    }
  };

  function getInterfaceLang() {
    try {
      const v = localStorage.getItem("interfaceLang") || localStorage.getItem("uiLang");
      if (v && ["fr", "en", "ar", "kab", "es"].indexOf(v) >= 0) return v;
    } catch (_) { }
    return "fr";
  }

  function tPlaceholder(key, lang) {
    const lc = lang || getInterfaceLang();
    const map = ZC_PLACEHOLDERS[key];
    if (!map) return "";
    return map[lc] || map.fr || "";
  }

  function applyUniversalPlaceholders() {
    const pairs = [
      { id: "forumReaderSearchInput", key: "forumSearch" },
      { id: "searchInput", key: "searchKeywords" },
      { id: "mediaMot", key: "searchMedia" }
    ];
    pairs.forEach(function (p) {
      const el = document.getElementById(p.id);
      if (el) el.setAttribute("placeholder", tPlaceholder(p.key));
    });
  }

  ns.getInterfaceLang = getInterfaceLang;
  ns.tPlaceholder = tPlaceholder;
  ns.applyUniversalPlaceholders = applyUniversalPlaceholders;
  if (typeof window.applyUniversalPlaceholders !== 'function') {
    window.applyUniversalPlaceholders = applyUniversalPlaceholders;
  }

  // Auto-apply au DOMContentLoaded + lors des mutations précoces + sur changement de langue.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyUniversalPlaceholders, { once: true });
  } else {
    applyUniversalPlaceholders();
  }
  try {
    const phObs = new MutationObserver(applyUniversalPlaceholders);
    phObs.observe(document.body || document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { try { phObs.disconnect(); } catch (_) {} }, 10000);
  } catch (_) { }
  // Ré-applique quand setLang (com12.js) dispatche uiLangChanged.
  try {
    window.addEventListener("uiLangChanged", applyUniversalPlaceholders);
  } catch (_) { }

  // Auto-bind pour les champs connus avec un bouton × adjacent.
  // (Plusieurs entrées pour un même champ si le bouton existe en deux exemplaires,
  // p. ex. toolbar + inline pour Mes Notes.)
  const AUTO_BINDINGS = [
    { field: "mot", clear: "t-supprimer-les-mots-saisis" },
    // Mes Commentaires — Référence : × et Copier masqués si vide.
    { field: "popupInputMot", clear: "popupInputMot-clear" },
    { field: "popupInputMot", clear: "btn-popup-subject-copy-inline" },
    // Mes Commentaires — Texte : × et Copier masqués si vide.
    { field: "commentaires", clear: "clearButtonInline" },
    { field: "commentaires", clear: "btn-popup-comment-copy-inline" },
    { field: "mediaMot", clear: "clearmot" },
    { field: "searchInput", clear: "btnClearInput" },
    { field: "tmSearchInput", clear: "tmClear" },
    { field: "forumReaderSearchInput", clear: "forumReaderSearchClear" },
    { field: "afModalTitleIn", clear: "afModalTitleClear" },
    { field: "afModalTitleIn", clear: "afModalTitleClearInline" },
    { field: "afModalBody", clear: "afModalBodyClear" },
    { field: "afModalBody", clear: "afModalBodyClearInline" },
    { field: "afModalBody", clear: "afModalBodyCopyInline" }
  ];

  function runAutoBindings() {
    AUTO_BINDINGS.forEach((b) => bindSearchClearVisibility(b.field, b.clear));
  }

  /**
   * Re-synchronise × / Copier (etc.) après une mise à jour **programmatique** de `.value`
   * (sans événement `input`). Utilise les liaisons `AUTO_BINDINGS` + `__zcSearchUpdate`
   * posées par `bindSearchClearVisibility`.
   *
   * @param {string|HTMLElement} field  Id du champ ou élément (ex. "popupInputMot").
   */
  function refreshSearchFieldToolVisibility(field) {
    const fid = typeof field === "string" ? field : field && field.id;
    if (!fid) return;
    AUTO_BINDINGS.forEach(function (b) {
      if (b.field !== fid) return;
      const c = document.getElementById(b.clear);
      if (c && typeof c.__zcSearchUpdate === "function") {
        try {
          c.__zcSearchUpdate();
        } catch (_) { }
      }
    });
  }
  ns.refreshSearchFieldToolVisibility = refreshSearchFieldToolVisibility;
  if (typeof window.refreshSearchFieldToolVisibility !== "function") {
    window.refreshSearchFieldToolVisibility = refreshSearchFieldToolVisibility;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runAutoBindings, { once: true });
  } else {
    runAutoBindings();
  }
  // Relance sur mutation (modules rendus dynamiquement : medias1, temoignages…).
  try {
    const obs = new MutationObserver(runAutoBindings);
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
    // Arrête après 10 s pour éviter de consommer des ressources inutiles.
    setTimeout(() => { try { obs.disconnect(); } catch (_) {} }, 10000);
  } catch (_) { }
})();
