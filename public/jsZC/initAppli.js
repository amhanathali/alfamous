
//pour regler le probleme de translation automatique
// === Anti-traduction global (Google Translate, extensions, etc.) ===
(function applyNoTranslateFlags() {
  function markRoot() {
    try {
      document.documentElement.setAttribute('translate', 'no');
      document.body && document.body.setAttribute('translate', 'no');
      document.documentElement.classList.add('notranslate');
      document.body && document.body.classList.add('notranslate');
    } catch (_) { }
  }

  if (document.readyState === 'loading') {
    // Script chargé tôt dans <head>
    document.addEventListener('DOMContentLoaded', markRoot, { once: true });
  } else {
    // DOM déjà prêt
    markRoot();
  }
})();
// (Facultatif) Marquage automatique pour certains conteneurs dynamiques
(function autoNoTranslateForKnownPopups() {
  const selectors = [
    '.stat-overlay', '.stat-popup',
    '.racines-backdrop', '.racines-modal',
    '.modal-overlay', '.modal-container'
  ];

  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (!(n instanceof Element)) continue;
        if (selectors.some(sel => n.matches?.(sel) || n.querySelector?.(sel))) {
          try {
            n.setAttribute('translate', 'no');
            n.classList.add('notranslate');
          } catch { }
        }
      }
    }
  });

  if (document.body) {
    mo.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      mo.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  }
})();




// Durcit globalement les boutons/liens "type bouton" en onclick inline :
// bloque navigation/propagation parasite avant l'action métier.
(function hardenInlineButtonOnclickHandlers() {
  const GUARD = "__zcInlineBtnSafe__";
  const GUARD_COMMENT = "/*__zcInlineBtnSafe__*/";
  const PREFIX = "try{if(event){event.preventDefault();event.stopPropagation();}}catch(_){};";

  function shouldPatch(el) {
    if (!el || typeof el.getAttribute !== "function") return false;
    const code = String(el.getAttribute("onclick") || "").trim();
    if (!code) return false;
    if (code.indexOf(GUARD) >= 0) return false;
    return true;
  }

  function patchOne(el) {
    if (!shouldPatch(el)) return;
    let code = String(el.getAttribute("onclick") || "").trim();
    // Nettoie l'ancienne injection invalide (ReferenceError).
    code = code.replace(/^\s*__zcInlineBtnSafe__\s*;?\s*/i, "");
    el.setAttribute("onclick", `${GUARD_COMMENT}${PREFIX}${code}`);
  }

  function patchAll(root) {
    const base = (root && root.querySelectorAll) ? root : document;
    if (!base || !base.querySelectorAll) return;
    base
      .querySelectorAll('button[onclick], a[onclick], input[type="button"][onclick], input[type="submit"][onclick]')
      .forEach(patchOne);
  }

  function start() {
    patchAll(document);
    try {
      const mo = new MutationObserver((muts) => {
        muts.forEach((m) => {
          m.addedNodes.forEach((n) => {
            if (!(n instanceof Element)) return;
            if (n.matches && n.matches('button[onclick], a[onclick], input[type="button"][onclick], input[type="submit"][onclick]')) {
              patchOne(n);
            }
            patchAll(n);
          });
        });
      });
      if (document.body) mo.observe(document.body, { childList: true, subtree: true });
    } catch (_) { }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();


// Détection "navigateur intégré RS" + bannière d'aide pour ouvrir dans le navigateur par défaut.
(function initInAppBrowserHintBanner() {
  function pickUiLang() {
    try {
      if (typeof window.getUILang === "function") return String(window.getUILang() || "fr").toLowerCase();
    } catch (_) { }
    try { return String(localStorage.getItem("uiLang") || "fr").toLowerCase(); } catch (_) { }
    return "fr";
  }
  function t() {
    const L = pickUiLang();
    const D = {
      fr: {
        title: "Ouverture plus rapide dans votre navigateur",
        body: "Ce lien est ouvert dans un navigateur intégré (RS). Pour de meilleures performances et garder l’historique, ouvrez-le dans votre navigateur par défaut.",
        open: "Ouvrir",
        copy: "Copier le lien",
        stay: "Continuer ici",
        copied: "Lien copié.",
        hint: "Astuce: menu ⋯ puis « Ouvrir dans le navigateur ».",
        openTried: "Si rien ne s’est ouvert, utilisez « Copier le lien », puis ouvrez-le dans Safari/Chrome.",
        openMayBeBlockedIOS: "iPhone: l’ouverture externe peut être bloquée dans FB/Messenger. Utilisez le menu ⋯ ou « Copier le lien »."
      },
      en: {
        title: "Open faster in your default browser",
        body: "This link is opened inside an in-app browser. For better speed and history, open it in your default browser.",
        open: "Open",
        copy: "Copy link",
        stay: "Continue here",
        copied: "Link copied.",
        hint: "Tip: tap ⋯ then “Open in browser”.",
        openTried: "If nothing opens, use “Copy link” and open it in Safari/Chrome.",
        openMayBeBlockedIOS: "iPhone: external opening may be blocked in FB/Messenger. Use ⋯ menu or “Copy link”."
      },
      ar: {
        title: "افتح أسرع في المتصفح الافتراضي",
        body: "هذا الرابط مفتوح داخل متصفح مدمج. لأداء أفضل وحفظ السجل، افتحه في المتصفح الافتراضي.",
        open: "فتح",
        copy: "نسخ الرابط",
        stay: "المتابعة هنا",
        copied: "تم نسخ الرابط.",
        hint: "نصيحة: من القائمة ⋯ اختر «فتح في المتصفح».",
        openTried: "إذا لم يفتح شيء، استخدم «نسخ الرابط» ثم افتحه في Safari/Chrome.",
        openMayBeBlockedIOS: "iPhone: قد يمنع FB/Messenger الفتح الخارجي. استخدم القائمة ⋯ أو «نسخ الرابط»."
      }
    };
    return D[L] || D.fr;
  }
  function isIOS() {
    const ua = String(navigator.userAgent || "").toLowerCase();
    return ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod");
  }
  function isLikelyInAppBrowser() {
    const ua = String(navigator.userAgent || "").toLowerCase();
    const ref = String(document.referrer || "").toLowerCase();
    const marks = [
      "fban", "fbav", "fb_iab", "messenger", "instagram", "line/", "snapchat",
      "wv", "miuibrowser", "twitter", "telegram"
    ];
    if (marks.some((m) => ua.includes(m))) return true;
    if (isIOS()) {
      if (
        ua.includes("fbios") ||
        ua.includes("fbav") ||
        ua.includes("messenger") ||
        ua.includes("instagram") ||
        ua.includes("line")
      ) return true;
      if (
        ref.includes("facebook.com") ||
        ref.includes("m.me") ||
        ref.includes("messenger.com") ||
        ref.includes("instagram.com")
      ) return true;
      try {
        const p = new URLSearchParams(location.search || "");
        if (p.has("fbclid") || p.has("igshid")) return true;
      } catch (_) { }
    }
    // Android WebView classique: contient "wv" ou pas de "safari" stable.
    if (ua.includes("android") && ua.includes("version/4.0") && ua.includes("chrome/")) return true;
    return false;
  }
  function markDismissedToday() {
    try {
      const day = new Date().toISOString().slice(0, 10);
      localStorage.setItem("zc_iab_hint_dismiss_day", day);
    } catch (_) { }
  }
  function dismissedToday() {
    try {
      const day = new Date().toISOString().slice(0, 10);
      return localStorage.getItem("zc_iab_hint_dismiss_day") === day;
    } catch (_) { return false; }
  }
  function showBanner() {
    if (!document.body) return;
    if (document.getElementById("zcInAppHint")) return;
    const I = t();
    const box = document.createElement("div");
    box.id = "zcInAppHint";
    box.setAttribute("role", "status");
    box.style.cssText = [
      "position:fixed", "left:12px", "right:12px", "bottom:12px",
      "background:var(--zc-surface,#fff)", "color:var(--zc-text,#0f172a)",
      "border:1px solid var(--zc-border,#cbd5e1)", "border-radius:12px",
      "box-shadow:0 10px 25px rgba(0,0,0,.18)", "padding:10px 12px",
      "font-size:13px", "line-height:1.35"
    ].join(";");
    box.innerHTML =
      '<div style="font-weight:700;margin-bottom:4px;">' + I.title + "</div>" +
      '<div style="opacity:.92;">' + I.body + "</div>" +
      '<div style="opacity:.78;margin-top:4px;">' + I.hint + "</div>" +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">' +
      '<button type="button" data-zc-iab-open="1" class="menu-button active zc-top-action-btn" style="min-height:30px;">' + I.open + "</button>" +
      '<button type="button" data-zc-iab-copy="1" class="menu-button active zc-top-action-btn" style="min-height:30px;">' + I.copy + "</button>" +
      '<button type="button" data-zc-iab-stay="1" class="menu-button active zc-top-action-btn" style="min-height:30px;">' + I.stay + "</button>" +
      "</div>";
    document.body.appendChild(box);
    try {
      if (typeof window.getNextZIndex === "function") {
        const z = Number(window.getNextZIndex());
        if (Number.isFinite(z) && z > 0) box.style.zIndex = String(z);
      }
    } catch (_) { }

    const fullUrl = location.href;
    const openBtn = box.querySelector('[data-zc-iab-open="1"]');
    const copyBtn = box.querySelector('[data-zc-iab-copy="1"]');
    const stayBtn = box.querySelector('[data-zc-iab-stay="1"]');
    if (openBtn) openBtn.onclick = function () {
      try {
        // Tentative générique (sur certains IAB, cela déclenche "ouvrir dans navigateur").
        window.open(fullUrl, "_blank", "noopener,noreferrer");
      } catch (_) { }
      try {
        const msg = isIOS() ? I.openMayBeBlockedIOS : I.openTried;
        if (typeof window.alertMsgBoxTemp === "function") window.alertMsgBoxTemp(msg);
      } catch (_) { }
    };
    if (copyBtn) copyBtn.onclick = async function () {
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(fullUrl);
        else throw new Error("no-clipboard");
      } catch (_) {
        try {
          const ta = document.createElement("textarea");
          ta.value = fullUrl;
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        } catch (_) { }
      }
      try {
        if (typeof window.alertMsgBoxTemp === "function") window.alertMsgBoxTemp(I.copied);
      } catch (_) { }
    };
    if (stayBtn) stayBtn.onclick = function () {
      markDismissedToday();
      try { box.remove(); } catch (_) { }
    };
  }
  function start() {
    if (!isLikelyInAppBrowser()) return;
    if (dismissedToday()) return;
    showBanner();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();


//bouton qui ferme pas
(function initClosePopupHtmlOnce() {
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }
  onReady(() => {
    const btn = document.getElementById('btnClosePopupHtml');
    if (!btn) return;

    const handler = (e) => {
      try {
        if (e && e.cancelable) e.preventDefault();
        if (e) e.stopPropagation();
      } catch { }
      try { fermerPopupHtml(); } catch { }
      try { fermerWarshText(); } catch { }
    };

    // iOS : privilégier touchend/pointerup en plus du click
    btn.addEventListener('touchend', handler, { passive: false });
    btn.addEventListener('pointerup', handler);
    btn.addEventListener('click', handler);

    // Accessibilité clavier (Enter / Espace / Escape)
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') handler(e);
    });
  });
})();





//<script>
/* Compteur messages non traités — écoute Firestore au chargement (v8 compat) */
(function () {
  "use strict";

  const KEY = "messagesNonTraites";
  const BTN_ID = "BtnMsg";
  const BADGE_ID = "badgeMsgCount";
  let unsub = null;

  function getFirestoreDb() {
    if (typeof window.db !== "undefined" && window.db) return window.db;
    if (window.firebase && typeof window.firebase.firestore === "function") {
      try {
        window.db = window.firebase.firestore();
      } catch (_) {}
    }
    return window.db || null;
  }

  function isAdminContactCounter() {
    return Number(localStorage.getItem("niveauUser") || 0) > 2;
  }

  function ensureBadge() {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return null;
    let b = document.getElementById(BADGE_ID);
    if (!b) {
      b = document.createElement("span");
      b.id = BADGE_ID;
      b.style.marginLeft = "4px";
      btn.appendChild(b);
    }
    return b;
  }
  function render(n) {
    n = Number.isFinite(n) && n > 0 ? n : 0;
    const badge = ensureBadge();
    if (badge) {
      badge.textContent = n > 0 ? ` ${n}` : " 0";
      badge.setAttribute("aria-label", n > 0 ? `${n} messages non traités` : "");
    }
    const el = document.getElementById("messagesNonTraites");
    if (el) el.textContent = `Messages non traités: ${n}`;
    try { if (typeof window.updateChokrNotifyDot === "function") window.updateChokrNotifyDot(); } catch (_) {}
  }

  function startLiveCounter() {
    // 1) affichage immédiat depuis localStorage (si déjà alimenté ailleurs)
    const boot = parseInt(localStorage.getItem(KEY), 10);
    render(Number.isFinite(boot) ? boot : 0);

    // 2) écoute Firestore (admin uniquement)
    try { if (unsub) unsub(); } catch { }
    const dbs = getFirestoreDb();
    if (!dbs) return;
    unsub = dbs.collection("messagesContact")
      .where("traite", "==", false)
      .onSnapshot((snap) => {
        const n = snap.size | 0;
        try { localStorage.setItem(KEY, String(n)); } catch { }
        render(n);
      }, (err) => console.error("Compteur non traités:", err));
  }

  function zcContactCounterSyncAuth() {
    if (!isAdminContactCounter()) {
      try { if (unsub) unsub(); } catch { }
      unsub = null;
      const n = parseInt(localStorage.getItem(KEY), 10);
      render(Number.isFinite(n) ? n : 0);
      return;
    }
    startLiveCounter();
  }
  window.zcContactCounterSyncAuth = zcContactCounterSyncAuth;

  // Si le bouton est injecté après coup, on re-render périodiquement (léger)
  let t = null;
  function startLightRerender() {
    try { clearInterval(t); } catch { }
    t = setInterval(() => {
      const n = parseInt(localStorage.getItem(KEY), 10);
      render(Number.isFinite(n) ? n : 0);
    }, 15000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureBadge();
    zcContactCounterSyncAuth();
    startLightRerender(); // optionnel: pour DOM dynamiques
  });

  // sync multi-onglets
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      const n = parseInt(localStorage.getItem(KEY), 10);
      render(Number.isFinite(n) ? n : 0);
    }
  });
})();
//</script>



function initApp() {
  // 1. Stopper les tâches en cours
  try { clearInterval(interval); } catch (e) { }
  try { progressBar.classList.remove('progress-bar-swing'); } catch (e) { }
  try { document.getElementById('progressContainer').style.display = 'none'; } catch (e) { }

  // 2. Réinitialiser les tableaux globaux éventuels
  try {
    if (typeof resultats !== 'undefined') resultats.length = 0;
    if (typeof motsEnSurbrillance !== 'undefined') motsEnSurbrillance = {};
    if (typeof pageActuelle !== 'undefined') pageActuelle = 0;
  } catch (e) {
    console.warn("Erreur réinitialisation tableaux globaux:", e);
  }
}

function misAjourLogiciel() {
  const tabVersion = fTabDateVersion();
  if (!Array.isArray(tabVersion) || tabVersion.length === 0) return "";

  const numVersion = tabVersion[0][0]; // Numéro de version (facultatif)
  const dateVersion = tabVersion[0][1]; // Date de version (chaîne ex: "2025-06-21")

  const dateVersionLocal = localStorage.getItem('dateVersionLocal') || "";
  /*
    if (dateVersion != dateVersionLocal) {
      alert("🚨 " + tMsg('newVersionDetectedReload'));
      localStorage.setItem('dateVersionLocal', dateVersion);
      localStorage.setItem('numVersionLocal', numVersion);
      console.log("🔁 Rechargement forcé de la page...");
      setTimeout(() => location.reload(), 300);
    }
    */
  if (dateVersion != dateVersionLocal) {
    localStorage.setItem('dateVersionLocal', dateVersion);
    localStorage.setItem('numVersionLocal', numVersion);
    //alertMsgBoxPopup(msgHelpTransliteration());
    //console.log("🔁 Rechargement forcé de la page...");
    //setTimeout(() => location.reload(), 300);
    jouerEffetMois(2);
  }

}


// Démarrage sûr: attendre le DOM, et vérifier les dépendances
document.addEventListener('DOMContentLoaded', () => {
  try {
    if (typeof fTabDateVersion === 'function' && typeof misAjourLogiciel === 'function') {
      misAjourLogiciel();
    }
  } catch (e) {
    console.warn('misAjourLogiciel skipped:', e);
  }

  try {
    if (typeof initApp === 'function') {
      initApp();
    }
  } catch (e) {
    console.warn('initApp skipped:', e);
  }
});






//cette fonction est juste pour extaire le tableau des titres en français
//puis les traduire et coller comme constante en dessou de cette fonction
/*(function collectTitlesOnce(){
  // --- helpers
  const slug = s => String(s||'').trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'');
  function ensureId(el){
    if (el.id) return el.id;
    const base = el.getAttribute('title') || el.textContent || el.name || el.placeholder || el.tagName.toLowerCase();
    let sig = 't-' + slug(base || 'x');
    if (!sig) sig = 't-x';
    let candidate = sig, n = 2;
    while (document.getElementById(candidate)) candidate = `${sig}-${n++}`;
    el.id = candidate;
    return el.id;
  }
  function downloadJSON(obj, filename){
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'titles.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // --- collecte
  const out = {};
  document.querySelectorAll('[title]').forEach(el => {
    // ignore éléments vides/masqués si tu veux — ici on prend tout
    const t = el.getAttribute('title')?.trim();
    if (!t) return;
    const id = ensureId(el);
    // si un id apparaît plusieurs fois, on garde le 1er et log un warning
    if (out[id] && out[id] !== t) {
      console.warn('[collectTitlesOnce] id dupliqué avec title différent:', id, {old: out[id], new: t, el});
    }
    out[id] = t;
  });

  if (!Object.keys(out).length){
    console.warn('[collectTitlesOnce] Aucun title trouvé.');
    return;
  }

  console.info('[collectTitlesOnce] Titles collectés:', out);
  // Télécharge le fichier source FR à me renvoyer pour traduction
  downloadJSON(out, 'titles_FR.json');
})();
*/




/* =============== I18N TITLES =============== */
// Exemple de structure — remplace par tes JSON traduits.
// Commence avec FR (collecté) puis on complètera EN/AR/KAB/ES.
// Injecte le FR collecté tel quel
window.I18N_TITLES = window.I18N_TITLES || {};
window.I18N_TITLES.FR = {
  "btnContextMenu": "Menu",
  "uiLangSelect": "Langue de l’interface",
  "envoyerMailForum2": "Mes commentaires (Lexique / Coran)",
  "t-copier-le-lien-zoom-coran-avec-le-mot-recherché": "Copier le lien Zoom-Coran avec le mot recherché",
  "newInstance": "Ouvre une nouvelle instance du logiciel",
  "Apropos": "À Propos",
  "t-à-propos": "À Propos",
  "t-langue-de-l-interface": "Langue de l’interface",
  "logInUser": "Se Connecter",
  "logOutUser": "Se Déconnecter",
  "btnToggleZoneA": "Afficher / masquer les paramètres",
  "btnToggleZoneA_show": "Afficher les paramètres",
  "btnToggleZoneA_hide": "Masquer les paramètres",
  "btnToggleCaches_show": "Afficher les boutons admin",
  "btnToggleCaches_hide": "Masquer les boutons admin",
  "t-paramètres": "Paramètres",
  "AlifHamzaBtn": "Substituer certaines voyelles par alif ou Hmza",
  "labelAlifHamzaBtn": "Substituer certaines voyelles par alif ou Hmza",
  "labelRechercheMotEntier": "Recherche Mot Entier",
  "labelOrdreExactCheckbox": "Recherche Mots Contigus",
  "t-paramètres-2": "Paramètres",
  "Traduction": "Commentaires: ",
  "BtnPdfWarch": "Afficher Codex Coranique version Warsh (PDF)",
  "boutonAudioWarsh1": "Voix  Saad El Ghamidi",
  "t-lire-écouter-codex-coranique": "Voix IA & Lecture",
  "historiqueMots": "Choisir un mot déjà recherché dans la liste.",
  "t-Historique-des-mots-par-défaut": "Réinitialiser l’historique des mots sur la liste proposée par défaut.",
  "zcVersetsHistorikListDesc": "Choisir des mots",
  "btnHistorikPopup": "Historique des mots saisis",
  "zcHistorikPopupHeading": "Historique",
  "btnHistorikPopupFermer": "Fermer",
  "btnHistorikPopupReset": "Réinitialiser",
  "zcTraductionPopupHeading": "Choix du livre de commentaires",
  "zcTraductionPopupHint": "Choisissez la source des commentaires affichés dans les résultats.",
  "btnTraductionPopupFermer": "Fermer",
  "btnOpenTraductionPopupParams": "Livre de commentaires : {{livre}}",
  "btnZcParamsTabME": "Recherche Mot Entier",
  "btnZcParamsTabMC": "Recherche Mots Contigus",
  "btnZcParamsTabBook": "Livre de commentaires : {{livre}}",
  "btnZcParamsTabHistorik": "Historique des mots saisis",
  "t-supprimer-les-mots-saisis": "Supprimer les mots saisis",
  "TraduireInput": "Translitérer le texte du champ de recherche (arabe ↔ caractères latins).",
  "zoomCoranBtn": "Recherche dans le Coran ou un livre de commentaires",
  "copier-les-versets-selection": "Copier les versets actuellement sélectionnés dans le presse-papiers.",
  "lexiqueBtn": "Recherche auto et affichage de fenêtre Zoom 0-3, selon le contexte",
  "reverso": "Reverso contexte",
  "gTranslate": "Google Translate",
  "btnRacinesFromInput": "Racines d'un verset (ex: 3.14)",
  "t-afficher-les-statistiques-de-racines": "Statistique des racines coraniques",
  "zoomCoranBtnR2": "Synonymie: recherche des atomes (sons) et racines combinées dans une expression",
  "amisRacine": "Amis de la racine: mots dans le verset (d=1, si contigu)",
  "BtnDeclinerRacine": "Déclinaisons des mots d'une racine",
  "BtnMsg": "Contact",
  "BiblioNumerique": "Bibliothèque numérique",
  "t-rechercher-articles-de-blog": "Articles publiés sur Alfamous",
  "btnOpenBlogLexiqueCoran": "Blog public Zoom-Coran (blog.alfamous.ca · lexique-coran.blogspot.com)",
  "ouvrirForum1": "Forum des idées 💡 : publications privées et publiques",
  "t-temoignages": "Témoignages anonymes",
  "btnChokrBlogDigneDeFoi": "Articles publiés sur blog.alfamous.ca · lexique-coran.blogspot.com",
  "ModifBtn": "Mes commentaires (Lexique / Coran)",
  "ModifBtnFree": "Mes commentaires (Lexique / Coran)",
  "AjoutModifNotes": "Mes Notes privées ou publiques (Forum)",
  "shareCommentsBtn": "Mes commentaires (Lexique / Coran)",
  "shareNotesBtn": "Mes Notes privées ou publiques (Forum)",
  "t-aide-modules": "Informations et tableau d’aide sur la translittération.",
  "btnResetHistorikTools": "Supprimer l’historik personnalisé (Lexique conservé).",
  "t-copier-le-commentaire": "Copier le commentaire",
  "t-fermer": "Fermer",
  "t-effacer-le-champ": "Effacer le champ",
  "t-relancer-la-translittération": "Relancer la translittération",
  "clearButton": "Effacer le commentaire",
  "t-copie-simple-des-résultats": "Copie simple des résultats",
  "t-minimiser-la-fenêtre": "Minimiser la fenêtre",
  "t-afficher-les-résultats": "Afficher les résultats",
  "zoomCoranBtnR0": "Recherche auto et affichage de fenêtre Zoom 0-1-2-3, selon le contexte",
  "zoomCoranBtnR1": "Recherche auto et affichage de fenêtre Zoom 0-1-2-3, selon le contexte",
  "t-ouvrir-lexique-coran-sur-google-drive": "Ouvrir Lexique-Coran sur Google Drive",
  "t-interpretation-des-rêves": "Interpretation des rêves",
  "t-factorisation-de-grand-nombres": "Factorisation de grand nombres",
  "btnToggleAbonnes": "Mise à jour du niveaus des utilisateurs",
  "btnChercheZoomCoran": "Recherche auto et affichage de fenêtre Zoom 0-2-3, selon le contexte",
  "btnOpenLexiqueSheet": "Ouvrir Lexique-Coran sur Google Drive",
  "btnOpenBloggerDraft": "Ouvrir Blogger Draft",
  "btnOpenFB": "Ouvrir FB",
  "btnMajListe": "Mise à jour des articles de blog",
  "btnExportHistorik": "Exporter l’historique des mots vers Firebase Storage",
  "btnImportHistorik": "Importer l’historique des mots depuis Firebase Storage",
  "btnRevesPopup": "Interpretation des rêves",
  "btnKabPopup": "les fondements civiques de la societe kabyle",
  "btnFermatPopup": "Factorisation de grand nombres",
  "t-connectés": "Connectés",
  "usersOnlineBadge": "Onglets actifs",
  "statToday": "Total visiteurs ce jour",
  "statTotal": "Total visiteurs depuis 07-10-2025",
  "btnFooterLike": "J’aime"
};

// EN
window.I18N_TITLES.EN = {
  "btnContextMenu": "Menu",
  "uiLangSelect": "Interface language",
  "envoyerMailForum2": "My comments (Lexicon / Quran)",
  "t-copier-le-lien-zoom-coran-avec-le-mot-recherché": "Copy the Zoom-Quran link with the searched word",
  "newInstance": "Open a new instance of the app",
  "Apropos": "About",
  "t-à-propos": "About",
  "t-langue-de-l-interface": "Interface language",
  "logInUser": "Sign in",
  "logOutUser": "Sign out",
  "btnToggleZoneA": "Show / hide settings",
  "btnToggleZoneA_show": "Show settings",
  "btnToggleZoneA_hide": "Hide settings",
  "btnToggleCaches_show": "Show admin buttons",
  "btnToggleCaches_hide": "Hide admin buttons",
  "t-paramètres": "Settings",
  "AlifHamzaBtn": "Substitute certain vowels with alif or Hmza",
  "labelAlifHamzaBtn": "Substitute certain vowels with alif or Hmza",
  "labelRechercheMotEntier": "Whole-word search",
  "labelOrdreExactCheckbox": "Contiguous words search",
  "t-paramètres-2": "Settings",
  "Traduction": "Comments: ",
  "BtnPdfWarch": "View Quranic Codex Warsh version (PDF)",
  "boutonAudioWarsh1": "Voice: Saad Al-Ghamidi",
  "t-lire-écouter-codex-coranique": "AI Voice & Reading",
  "historiqueMots": "Pick a previously searched word from the list.",
  "t-Historique-des-mots-par-défaut": "Reset the word history to the site’s default list.",
  "zcVersetsHistorikListDesc": "Choose words",
  "btnHistorikPopup": "Open Historik list",
  "zcHistorikPopupHeading": "History",
  "btnHistorikPopupFermer": "Close",
  "btnHistorikPopupReset": "Reset",
  "zcTraductionPopupHeading": "Commentary book",
  "zcTraductionPopupHint": "Choose which commentary source is shown in results.",
  "btnTraductionPopupFermer": "Close",
  "btnOpenTraductionPopupParams": "Search in the active commentary book: {{livre}}",
  "btnZcParamsTabME": "Whole-word search",
  "btnZcParamsTabMC": "Contiguous words search",
  "btnZcParamsTabBook": "Search in the active commentary book: {{livre}}",
  "btnZcParamsTabHistorik": "History of entered words",
  "t-supprimer-les-mots-saisis": "Delete entered words",
  "TraduireInput": "Transliterate the search field text (Arabic ↔ Latin characters).",
  "zoomCoranBtn": "Search the Quran or a commentary book",
  "copier-les-versets-selection": "Copy the currently selected verses to the clipboard.",
  "lexiqueBtn": "Automatic search and Zoom 0-3 window display, depending on context",
  "reverso": "Reverso Context",
  "gTranslate": "Google Translate",
  "btnRacinesFromInput": "Roots of a verse (e.g. 3.14)",
  "t-afficher-les-statistiques-de-racines": "Statistics of Quranic roots",
  "zoomCoranBtnR2": "Synonymy: search for atoms (sounds) and roots combined in a phrase",
  "amisRacine": "Friends of the root: words in the verse (d=1, if contiguous)",
  "BtnDeclinerRacine": "Inflections of the words of a root",
  "BtnMsg": "Contact",
  "BiblioNumerique": "Digital library",
  "t-rechercher-articles-de-blog": "Articles published on Alfamous",
  "btnOpenBlogLexiqueCoran": "Public Zoom-Coran blog (blog.alfamous.ca · lexique-coran.blogspot.com)",
  "ouvrirForum1": "Ideas forum 💡 : private and public posts",
  "t-temoignages": "Anonymous testimonies",
  "btnChokrBlogDigneDeFoi": "Articles published on blog.alfamous.ca · lexique-coran.blogspot.com",
  "ModifBtn": "My comments (Lexicon / Quran)",
  "ModifBtnFree": "My comments (Lexicon / Quran)",
  "AjoutModifNotes": "My private or public Notes (Forum)",
  "shareCommentsBtn": "My comments (Lexicon / Quran)",
  "shareNotesBtn": "My private or public Notes (Forum)",
  "t-aide-modules": "Help and reference table for transliteration.",
  "btnResetHistorikTools": "Clear personal history (Lexique kept).",
  "t-copier-le-commentaire": "Copy the comment",
  "t-fermer": "Close",
  "t-effacer-le-champ": "Clear the field",
  "t-relancer-la-translittération": "Restart transliteration",
  "clearButton": "Clear the comment",
  "t-copie-simple-des-résultats": "Simple copy of results",
  "t-minimiser-la-fenêtre": "Minimize the window",
  "t-afficher-les-résultats": "Show results",
  "zoomCoranBtnR0": "Automatic search and Zoom 0-1-2-3 window display, depending on context",
  "zoomCoranBtnR1": "Automatic search and Zoom 0-1-2-3 window display, depending on context",
  "t-ouvrir-lexique-coran-sur-google-drive": "Open Lexique-Coran on Google Drive",
  "t-interpretation-des-rêves": "Dream interpretation",
  "t-factorisation-de-grand-nombres": "Factorization of large numbers",
  "btnToggleAbonnes": "Update user levels",
  "btnChercheZoomCoran": "Automatic search and Zoom 0-2-3 window display, depending on context",
  "btnOpenLexiqueSheet": "Open Lexique-Coran on Google Drive",
  "btnOpenBloggerDraft": "Open Blogger Draft",
  "btnOpenFB": "Open Facebook",
  "btnMajListe": "Update blog articles list",
  "btnExportHistorik": "Export word history to Firebase Storage",
  "btnImportHistorik": "Import word history from Firebase Storage",
  "btnRevesPopup": "Dream interpretation",
  "btnKabPopup": "Civic foundations of Kabyle society",
  "btnFermatPopup": "Factorization of large numbers",
  "t-connectés": "Online",
  "usersOnlineBadge": "Active tabs",
  "statToday": "Total visitors today",
  "statTotal": "Total visitors since 2025-10-07",
  "btnFooterLike": "Like"
};

// AR
window.I18N_TITLES.AR = {
  "btnContextMenu": "القائمة",
  "uiLangSelect": "لغة الواجهة",
  "envoyerMailForum2": "تعليقاتي (المعجم / القرآن)",
  "t-copier-le-lien-zoom-coran-avec-le-mot-recherché": "انسخ رابط زوم-قرآن مع الكلمة المبحوث عنها",
  "newInstance": "فتح مثيل جديد للتطبيق",
  "Apropos": "حول",
  "t-à-propos": "حول",
  "t-langue-de-l-interface": "لغة الواجهة",
  "logInUser": "تسجيل الدخول",
  "logOutUser": "تسجيل الخروج",
  "btnToggleZoneA": "إظهار / إخفاء الإعدادات",
  "btnToggleZoneA_show": "إظهار الإعدادات",
  "btnToggleZoneA_hide": "إخفاء الإعدادات",
  "btnToggleCaches_show": "إظهار أزرار الإدارة",
  "btnToggleCaches_hide": "إخفاء أزرار الإدارة",
  "t-paramètres": "الإعدادات",
  "AlifHamzaBtn": "استبدال بعض الحركات بالألف أو الهمزة",
  "labelAlifHamzaBtn": "استبدال بعض الحركات بالألف أو الهمزة",
  "labelRechercheMotEntier": "بحث كلمة كاملة",
  "labelOrdreExactCheckbox": "بحث كلمات متجاورة",
  "t-paramètres-2": "الإعدادات",
  "Traduction": "تعليقات: ",
  "BtnPdfWarch": "عرض نسخة مخطوطة ورش القرآن الكريم (PDF)",
  "boutonAudioWarsh1": "صوت: سعد الغامدي",
  "t-lire-écouter-codex-coranique": "الذكاء الاصطناعي والقراءة",
  "historiqueMots": "اختر كلمة سبق البحث عنها من القائمة.",
  "t-Historique-des-mots-par-défaut": "إعادة ضبط سجل الكلمات على القائمة الافتراضية للموقع.",
  "zcVersetsHistorikListDesc": "اختر الكلمات",
  "btnHistorikPopup": "سجل الكلمات المدخلة",
  "zcHistorikPopupHeading": "سجل الكلمات",
  "btnHistorikPopupFermer": "إغلاق",
  "btnHistorikPopupReset": "إعادة الضبط",
  "zcTraductionPopupHeading": "كتاب التفسير",
  "zcTraductionPopupHint": "اختر مصدر التعليقات المعروضة في النتائج.",
  "btnTraductionPopupFermer": "إغلاق",
  "btnOpenTraductionPopupParams": "البحث في كتاب التعليقات الحالي: {{livre}}",
  "btnZcParamsTabME": "بحث كلمة كاملة",
  "btnZcParamsTabMC": "بحث كلمات متجاورة",
  "btnZcParamsTabBook": "البحث في كتاب التعليقات الحالي: {{livre}}",
  "btnZcParamsTabHistorik": "سجل الكلمات المدخلة",
  "t-supprimer-les-mots-saisis": "حذف الكلمات المُدخلة",
  "TraduireInput": "تحويل حقل البحث حرفياً (عربي ↔ لاتيني).",
  "zoomCoranBtn": "بحث في القرآن أو كتاب تفسير",
  "copier-les-versets-selection": "نسخ الآيات المحددة حالياً إلى الحافظة.",
  "lexiqueBtn": "بحث تلقائي وعرض نافذة Zoom 0-3 حسب السياق",
  "reverso": "Reverso Context",
  "gTranslate": "Google Translate",
  "btnRacinesFromInput": "جذور آية (مثال: 3.14)",
  "t-afficher-les-statistiques-de-racines": "إحصاءات الجذور القرآنية",
  "zoomCoranBtnR2": "الترادف: بحث عن الذرات (الأصوات) والجذور مجمّعة في تعبير",
  "amisRacine": "أصدقاء الجذر: كلمات في الآية (d=1، إن كانت متلاصقة)",
  "BtnDeclinerRacine": "تصريفات كلمات جذر",
  "BtnMsg": "اتصال",
  "BiblioNumerique": "مكتبة رقمية",
  "t-rechercher-articles-de-blog": "مقالات منشورة على Alfamous",
  "btnOpenBlogLexiqueCoran": "مدونة Zoom-Coran العامة (blog.alfamous.ca · lexique-coran.blogspot.com)",
  "ouvrirForum1": "منتدى الأفكار 💡 : منشورات خاصة وعامة",
  "t-temoignages": "شهادات مجهولة",
  "btnChokrBlogDigneDeFoi": "مقالات منشورة على blog.alfamous.ca · lexique-coran.blogspot.com",
  "ModifBtn": "تعليقاتي (المعجم / القرآن)",
  "ModifBtnFree": "تعليقاتي (المعجم / القرآن)",
  "AjoutModifNotes": "ملاحظاتي الخاصة أو العامة (المنتدى)",
  "shareCommentsBtn": "تعليقاتي (المعجم / القرآن)",
  "shareNotesBtn": "ملاحظاتي الخاصة أو العامة (المنتدى)",
  "t-aide-modules": "معلومات وجدول مساعدة عن النقل الحرفي.",
  "btnResetHistorikTools": "مسح السجل الشخصي (مع الإبقاء على معجم Lexique).",
  "t-copier-le-commentaire": "نسخ التعليق",
  "t-fermer": "إغلاق",
  "t-effacer-le-champ": "مسح الحقل",
  "t-relancer-la-transليتération": "إعادة تشغيل النقل الحرفي",
  "clearButton": "مسح التعليق",
  "t-copie-simple-des-résultats": "نسخ بسيط للنتائج",
  "t-minimiser-la-fenêtre": "تصغير النافذة",
  "t-afficher-les-résultats": "عرض النتائج",
  "zoomCoranBtnR0": "بحث تلقائي وعرض نافذة Zoom 0-1-2-3 حسب السياق",
  "zoomCoranBtnR1": "بحث تلقائي وعرض نافذة Zoom 0-1-2-3 حسب السياق",
  "t-ouvrir-lexique-coran-sur-google-drive": "فتح معجم القرآن على Google Drive",
  "t-interpretation-des-rêves": "تفسير الأحلام",
  "t-factorisation-de-grand-nombres": "تفكيك الأعداد الكبيرة",
  "btnToggleAbonnes": "تحديث مستويات المستخدمين",
  "btnChercheZoomCoran": "بحث تلقائي وعرض نافذة Zoom 0-2-3 حسب السياق",
  "btnOpenLexiqueSheet": "فتح معجم القرآن على Google Drive",
  "btnOpenBloggerDraft": "فتح مسودة Blogger",
  "btnOpenFB": "فتح فيسبوك",
  "btnMajListe": "تحديث قائمة مقالات المدونة",
  "btnExportHistorik": "تصدير سجل الكلمات إلى Firebase Storage",
  "btnImportHistorik": "استيراد سجل الكلمات من Firebase Storage",
  "btnRevesPopup": "تفسير الأحلام",
  "btnKabPopup": "الأسس المدنية للمجتمع القبائلي",
  "btnFermatPopup": "تحليل الأعداد الكبيرة إلى عوامل",
  "t-connectés": "متصلون",
  "usersOnlineBadge": "علامات تبويب نشطة",
  "statToday": "إجمالي الزوار اليوم",
  "statTotal": "إجمالي الزوار منذ 07-10-2025",
  "btnFooterLike": "أعجبني"
};

// KAB
window.I18N_TITLES.KAB = {
  "btnContextMenu": "Umuɣ",
  "uiLangSelect": "Tutlayt n wudem",
  "envoyerMailForum2": "Iwenniten-iw (Amawal / Leqran)",
  "t-copier-le-lien-zoom-coran-avec-le-mot-recherché": "Nɣel aseɣwen n Zoom-Coran s wawal n unadi",
  "newInstance": "Ldi tnekra tamaynut n usnas",
  "Apropos": "Ɣef",
  "t-à-propos": "Ɣef",
  "t-langue-de-l-interface": "Tutlayt n ugrudem",
  "logInUser": "Kcem",
  "logOutUser": "Ffeɣ",
  "btnToggleZoneA": "Sken / ffer iɣewwaren",
  "btnToggleZoneA_show": "Sken iɣewwaren",
  "btnToggleZoneA_hide": "Ffer iɣewwaren",
  "btnToggleCaches_show": "Sken iɣefuyen n uneddad",
  "btnToggleCaches_hide": "Ffer iɣefuyen n uneddad",
  "t-paramètres": "Iɣewwaren",
  "AlifHamzaBtn": "Semsel kra n tiwtilin s alif neɣ Hmza",
  "labelAlifHamzaBtn": "Semsel kra n tiwtilin s alif neɣ Hmza",
  "labelRechercheMotEntier": "Nadi awal ummid",
  "labelOrdreExactCheckbox": "Nadi awalen imezdiyen",
  "t-paramètres-2": "Iɣewwaren",
  "Traduction": "Imeslayen: ",
  "BtnPdfWarch": "Sken amesḥaf Warsh (PDF)",
  "boutonAudioWarsh1": "Tamseftit: Saad El Ghamidi",
  "t-lire-écouter-codex-coranique": "Ɣeṛ–Ssemlal amesḥaf",
  "historiqueMots": "Fren awal i yettwanadi yakan seg tebdart.",
  "t-Historique-des-mots-par-défaut": "Ales amazray n wawalen ɣer tebdart tamezwarut n usmel.",
  "zcVersetsHistorikListDesc": "Fren awalen",
  "btnHistorikPopup": "Amazray n wawalen yettusnekcen",
  "zcHistorikPopupHeading": "Amazray n wawalen",
  "btnHistorikPopupFermer": "Mdel",
  "btnHistorikPopupReset": "Ales",
  "zcTraductionPopupHeading": "Adlis n tafsir",
  "zcTraductionPopupHint": "Fren aɣbalu n yimeslayen yettwaskan deg yigmaḍ.",
  "btnTraductionPopupFermer": "Mdel",
  "btnOpenTraductionPopupParams": "Nadi deg wedlis n yimeslayen yettwarzan akka: {{livre}}",
  "btnZcParamsTabME": "Nadi awal ummid",
  "btnZcParamsTabMC": "Nadi awalen imezdiyen",
  "btnZcParamsTabBook": "Nadi deg wedlis n yimeslayen yettwarzan akka: {{livre}}",
  "btnZcParamsTabHistorik": "Amazray n wawalen yettusnekcen",
  "t-supprimer-les-mots-saisis": "Kkes awalen yettusnekcen",
  "TraduireInput": "Sekkel aḍris n urti n unadi (aɛrab ↔ latin).",
  "zoomCoranBtn": "Nadi deg Leqran neɣ di tedlis",
  "copier-les-versets-selection": "Nɣel tifyar yettwafernen akka tura ɣer tecfawt.",
  "lexiqueBtn": "Anadi awurman d taskint n usfaylu Zoom 0-3 ɣef lḥal",
  "reverso": "Reverso Context",
  "gTranslate": "Google Translate",
  "btnRacinesFromInput": "Iɣran n tazmilt (amedya: 3.14)",
  "t-afficher-les-statistiques-de-racines": "Tisstatin n yiɣran n Leqran",
  "zoomCoranBtnR2": "Amsenfali: anadi n yizdimen (imesli) d yiɣran yuddan deg yixatas",
  "amisRacine": "Imdukkal n uɣer: awalen deg tazmilt (d=1, ma d nutni)",
  "BtnDeclinerRacine": "Asenfel n yiwalen n uɣer",
  "BtnMsg": "Anermis",
  "BiblioNumerique": "Tamkaḍt tifransit",
  "t-rechercher-articles-de-blog": "Imagraden yettwabḍan ɣef Alfamous",
  "btnOpenBlogLexiqueCoran": "Ablug azayez Zoom-Coran (blog.alfamous.ca · lexique-coran.blogspot.com)",
  "ouvrirForum1": "Lmunada n yilugan 💡 : adwen usligen d izayzen",
  "t-temoignages": "Ticehhiḍin udrigen",
  "btnChokrBlogDigneDeFoi": "Imagraden yettwabḍan ɣef blog.alfamous.ca · lexique-coran.blogspot.com",
  "ModifBtn": "Iwenniten-iw (Amawal / Leqran)",
  "ModifBtnFree": "Iwenniten-iw (Amawal / Leqran)",
  "AjoutModifNotes": "Tiwennitin-iw usligen neɣ izayzen (Lmunada)",
  "shareCommentsBtn": "Iwenniten-iw (Amawal / Leqran)",
  "shareNotesBtn": "Tiwennitin-iw usligen neɣ izayzen (Lmunada)",
  "t-aide-modules": "Talɣut d tfelwit n useqdec ɣef tasektilt.",
  "btnResetHistorikTools": "Sfeḍ historik udmawan (Lexique yeqqim).",
  "t-copier-le-commentaire": "Nɣel awennit",
  "t-fermer": "Mdel",
  "t-effacer-le-champ": "Sfeḍ urti",
  "t-relancer-la-translittération": "Ales asenker n tasektilt",
  "clearButton": "Sfeḍ awennit",
  "t-copie-simple-des-résultats": "Nɣel afessas n igmaḍ",
  "t-minimiser-la-fenêtre": "Semẓi asfaylu",
  "t-afficher-les-résultats": "Sken igmaḍ",
  "zoomCoranBtnR0": "Anadi awurman d taskint n usfaylu Zoom 0-1-2-3 ɣef lḥal",
  "zoomCoranBtnR1": "Anadi awurman d taskint n usfaylu Zoom 0-1-2-3 ɣef lḥal",
  "t-ouvrir-lexique-coran-sur-google-drive": "Ldi Lexique-Coran ɣef Google Drive",
  "t-interpretation-des-rêves": "Aserḍif n ttiwin",
  "t-factorisation-de-grand-nombres": "Amsin n wuḍḍunen imeqqranen",
  "btnToggleAbonnes": "Leqqem iswiren n useqdac",
  "btnChercheZoomCoran": "Anadi awurman d taskint n usfaylu Zoom 0-2-3 ɣef lḥal",
  "btnOpenLexiqueSheet": "Ldi Lexique-Coran ɣef Google Drive",
  "btnOpenBloggerDraft": "Ldi Blogger Draft",
  "btnOpenFB": "Ldi Facebook",
  "btnMajListe": "Amucceḍ tabdart n yimagraden n ublug",
  "btnExportHistorik": "Sifeḍ amazray n wawalen ɣer Firebase Storage",
  "btnImportHistorik": "Kter amazray n wawalen seg Firebase Storage",
  "btnRevesPopup": "Aserḍif n ttiwin",
  "btnKabPopup": "Iɣsan idlisen n tmagit taqbaylit",
  "btnFermatPopup": "Amsin n wuḍḍunen imeqqranen",
  "t-connectés": "Ittwacceḍen",
  "usersOnlineBadge": "Iccaren urmid",
  "statToday": "Asemday n yernan ass-a",
  "statTotal": "Asemday n yernan seg 07-10-2025",
  "btnFooterLike": "Ɣef lebḥir"
};

// ES
window.I18N_TITLES.ES = {
  "btnContextMenu": "Menú",
  "uiLangSelect": "Lenguaje de interfaz",
  "envoyerMailForum2": "Mis comentarios (léxico / Corán)",
  "t-copier-le-lien-zoom-coran-avec-le-mot-recherché": "Copiar el enlace de Zoom-Corán con la palabra buscada",
  "newInstance": "Abrir una nueva instancia de la aplicación",
  "Apropos": "Acerca de",
  "t-à-propos": "Acerca de",
  "t-langue-de-l-interface": "Idioma de la interfaz",
  "logInUser": "Iniciar sesión",
  "logOutUser": "Cerrar sesión",
  "btnToggleZoneA": "Mostrar / ocultar los ajustes",
  "btnToggleZoneA_show": "Mostrar los ajustes",
  "btnToggleZoneA_hide": "Ocultar los ajustes",
  "btnToggleCaches_show": "Mostrar los botones de administración",
  "btnToggleCaches_hide": "Ocultar los botones de administración",
  "t-paramètres": "Ajustes",
  "AlifHamzaBtn": "Sustituir ciertas vocales por alif o Hmza",
  "labelAlifHamzaBtn": "Sustituir ciertas vocales por alif o Hmza",
  "labelRechercheMotEntier": "Búsqueda palabra entera",
  "labelOrdreExactCheckbox": "Búsqueda palabras contiguas",
  "t-paramètres-2": "Ajustes",
  "Traduction": "Comentarios: ",
  "BtnPdfWarch": "Ver la versión Warsh del Códice Coránico (PDF)",
  "boutonAudioWarsh1": "Voz: Saad Al-Ghamidi",
  "t-lire-écouter-codex-coranique": "Voz y lectura con IA",
  "historiqueMots": "Elegir una palabra ya buscada en la lista.",
  "t-Historique-des-mots-par-défaut": "Restablecer el historial de palabras a la lista predeterminada del sitio.",
  "zcVersetsHistorikListDesc": "Elegir palabras",
  "btnHistorikPopup": "Historial de palabras introducidas",
  "zcHistorikPopupHeading": "Historial",
  "btnHistorikPopupFermer": "Cerrar",
  "btnHistorikPopupReset": "Restablecer",
  "zcTraductionPopupHeading": "Libro de comentarios",
  "zcTraductionPopupHint": "Elija la fuente de comentarios mostrada en los resultados.",
  "btnTraductionPopupFermer": "Cerrar",
  "btnOpenTraductionPopupParams": "Búsqueda en el libro de comentarios activo: {{livre}}",
  "btnZcParamsTabME": "Búsqueda palabra entera",
  "btnZcParamsTabMC": "Búsqueda palabras contiguas",
  "btnZcParamsTabBook": "Búsqueda en el libro de comentarios activo: {{livre}}",
  "btnZcParamsTabHistorik": "Historial de palabras introducidas",
  "t-supprimer-les-mots-saisis": "Eliminar las palabras introducidas",
  "TraduireInput": "Transliterar el texto del campo de búsqueda (árabe ↔ latino).",
  "zoomCoranBtn": "Buscar en el Corán o en un libro de comentarios",
  "copier-les-versets-selection": "Copiar al portapapeles los versículos seleccionados actualmente.",
  "lexiqueBtn": "Búsqueda automática y visualización de ventana Zoom 0-3, según el contexto",
  "reverso": "Reverso Context",
  "gTranslate": "Google Translate",
  "btnRacinesFromInput": "Raíces de un verso (ej.: 3.14)",
  "t-afficher-les-statistiques-de-racines": "Estadística de las raíces coránicas",
  "zoomCoranBtnR2": "Sinonimia: búsqueda de átomos (sonidos) y raíces combinadas en una expresión",
  "amisRacine": "Amigos de la raíz: palabras en el verso (d=1, si son contiguas)",
  "BtnDeclinerRacine": "Declinaciones de las palabras de una raíz",
  "BtnMsg": "Contacto",
  "BiblioNumerique": "Biblioteca digital",
  "t-rechercher-articles-de-blog": "Artículos publicados en Alfamous",
  "btnOpenBlogLexiqueCoran": "Blog público Zoom-Coran (blog.alfamous.ca · lexique-coran.blogspot.com)",
  "ouvrirForum1": "Foro de ideas 💡 : publicaciones privadas y públicas",
  "t-temoignages": "Testimonios anónimos",
  "btnChokrBlogDigneDeFoi": "Artículos publicados en blog.alfamous.ca · lexique-coran.blogspot.com",
  "ModifBtn": "Mis comentarios (léxico / Corán)",
  "ModifBtnFree": "Mis comentarios (léxico / Corán)",
  "AjoutModifNotes": "Mis notas privadas o públicas (foro)",
  "shareCommentsBtn": "Mis comentarios (léxico / Corán)",
  "shareNotesBtn": "Mis notas privadas o públicas (foro)",
  "t-aide-modules": "Información y tabla de ayuda sobre la transliteración.",
  "btnResetHistorikTools": "Borrar historial personal (mantener Lexique).",
  "t-copier-le-commentaire": "Copiar el comentario",
  "t-fermer": "Cerrar",
  "t-effacer-le-champ": "Borrar el campo",
  "t-relancer-la-translittération": "Reiniciar la transliteración",
  "clearButton": "Borrar el comentario",
  "t-copie-simple-des-résultats": "Copia simple de los resultados",
  "t-minimiser-la-fenêtre": "Minimizar la ventana",
  "t-afficher-les-résultats": "Mostrar los resultados",
  "zoomCoranBtnR0": "Búsqueda automática y visualización de ventana Zoom 0-1-2-3, según el contexto",
  "zoomCoranBtnR1": "Búsqueda automática y visualización de ventana Zoom 0-1-2-3, según el contexto",
  "t-ouvrir-lexique-coran-sur-google-drive": "Abrir Lexique-Coran en Google Drive",
  "t-interpretation-des-rêves": "Interpretación de los sueños",
  "t-factorisation-de-grand-nombres": "Factorización de números grandes",
  "btnToggleAbonnes": "Actualizar niveles de usuarios",
  "btnChercheZoomCoran": "Búsqueda automática y visualización de ventana Zoom 0-2-3, según el contexto",
  "btnOpenLexiqueSheet": "Abrir Lexique-Coran en Google Drive",
  "btnOpenBloggerDraft": "Abrir borrador de Blogger",
  "btnOpenFB": "Abrir Facebook",
  "btnMajListe": "Actualizar la lista de artículos del blog",
  "btnExportHistorik": "Exportar el historial de palabras a Firebase Storage",
  "btnImportHistorik": "Importar el historial de palabras desde Firebase Storage",
  "btnRevesPopup": "Interpretación de los sueños",
  "btnKabPopup": "Fundamentos cívicos de la sociedad cabila",
  "btnFermatPopup": "Factorización de números grandes",
  "t-connectés": "Conectados",
  "usersOnlineBadge": "Pestañas activas",
  "statToday": "Total de visitantes hoy",
  "statTotal": "Total de visitantes desde 07-10-2025",
  "btnFooterLike": "Me gusta"
};

// (Optionnel) Réappliquer quand la langue change chez toi
document.addEventListener('DOMContentLoaded', applyTitlesForCurrentLang);
// window.addEventListener('uiLangChanged', applyTitlesForCurrentLang);









/* ============================================================
   MENU CONTEXTUEL — sections via labels `labelInterface{LANG}n`
   Fenêtre dédiée dans le DOM: #popupContextMenu > #ctxmenuBody
   + Drag sur la barre d'en-tête
   ============================================================ */

/* ==== Helpers globaux (portée unique) ==== */
const VIEW_MARGIN = 8;                 // marge intérieure du viewport
const POS_KEY = 'ctxmenuPos';      // clé de stockage position

function centerInViewport(container) {
  if (!container) return;
  container.style.position = 'fixed';
  const rect = container.getBoundingClientRect();
  const w = rect.width || 360;
  const h = rect.height || 200;
  const left = Math.max(8, Math.round((window.innerWidth - w) / 2));
  const top = Math.max(8, Math.round((window.innerHeight - h) / 4));
  container.style.left = left + 'px';
  container.style.top = top + 'px';
}

function clampToViewport(container, margin = VIEW_MARGIN) {
  if (!container) return;
  const w = container.offsetWidth || 360;
  const h = container.offsetHeight || 200;
  const maxL = Math.max(margin, window.innerWidth - w - margin);
  const maxT = Math.max(margin, window.innerHeight - h - margin);

  let left = parseInt(container.style.left ?? 'NaN', 10);
  let top = parseInt(container.style.top ?? 'NaN', 10);

  if (!Number.isFinite(left) || !Number.isFinite(top)) {
    centerInViewport(container); // donne des valeurs valides
    return;
  }
  left = Math.min(Math.max(left, margin), maxL);
  top = Math.min(Math.max(top, margin), maxT);
  container.style.left = left + 'px';
  container.style.top = top + 'px';
}

function restoreLastPos(container) {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return false;
    const { left, top } = JSON.parse(raw) || {};
    if (!Number.isFinite(left) || !Number.isFinite(top)) return false;

    container.style.position = 'fixed';
    container.style.left = left + 'px';
    container.style.top = top + 'px';

    requestAnimationFrame(() => clampToViewport(container));
    return true;
  } catch (_) { }
  return false;
}

function savePos(container) {
  try {
    const left = parseInt(container.style.left || '0', 10) || 0;
    const top = parseInt(container.style.top || '0', 10) || 0;
    localStorage.setItem(POS_KEY, JSON.stringify({ left, top }));
  } catch (_) { }
}

/* === Z-INDEX: on s’appuie sur l’implémentation globale existante === */
/* (getNextZIndex = max(zMaxDOM, lastAllocatedZ)+STEP ; pas de localStorage — z-index-stack.js) */

(function () {
  /* ---------- Config ---------- */
  const LANG_MAP = { fr: 'FR', en: 'EN', ar: 'AR', kab: 'KAB', es: 'ES' };

  const ADMIN_SELECTORS = ['#gTranslate', '#reverso', '#BtnCaches', '#footer'];

  const BUTTON_SELECTORS = [
    'button.menu-button', 'button.bouton-loupe-croix', 'button.bouton',
    'a.bouton', 'a.btn',
    'button', '.toolbtn', '.icon-button',
    '#ModifBtn'
  ].join(',');

  const CONTROL_SELECTORS = [
    'input[type="text"]', 'input[type="search"]', 'input[type="number"]',
    'input[type="email"]', 'input[type="password"]', 'input[type="tel"]', 'input[type="url"]',
    'input[type="checkbox"]', 'input[type="radio"]',
    'select', 'textarea'
  ].join(',');

  const ALWAYS_INCLUDE_CONTAINERS = ['#zoneA'];
  let outsideCloseBound = false;

  /* ---------- Helpers ---------- */
  function getLangCode() {
    try { if (typeof getLang === 'function') { const v = (getLang() || '').toString().toLowerCase(); if (LANG_MAP[v]) return LANG_MAP[v]; } } catch (_) { }
    const ls = (localStorage.getItem('uiLang') || '').toLowerCase(); if (LANG_MAP[ls]) return LANG_MAP[ls];
    const htmlLang = (document.documentElement.getAttribute('lang') || 'fr').toLowerCase(); return LANG_MAP[htmlLang] || 'FR';
  }
  function inAdmin(el) { return ADMIN_SELECTORS.some(sel => el.closest(sel)); }
  function inAlwaysInclude(el) { return ALWAYS_INCLUDE_CONTAINERS.some(sel => el.closest(sel)); }

  function isVisibleStrict(el) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    if (el.getClientRects && el.getClientRects().length === 0) return false;
    return true;
  }
  function isVisibleFor(el) { return inAlwaysInclude(el) ? true : isVisibleStrict(el); }
  function isDisabled(el) { return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true'; }
  function isExplicitlyHidden(el) {
    if (!el) return true;
    if (el.hidden) return true;
    if (el.getAttribute('aria-hidden') === 'true') return true;
    // Important: filtre les éléments volontairement masqués (signin/signout, etc.)
    if ((el.style && el.style.display === 'none') || (el.style && el.style.visibility === 'hidden')) return true;
    return false;
  }

  /* ---------- Emoji / icône texte ---------- */
  const EMOJI_RE = /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E|\u200D\p{Extended_Pictographic})*/u;
  const FALLBACK_ICON_RE = /[✍️📖🔊🧩⚛️📊👁️🙈↺🔁✖️⚙️💬🔄✅❌📎🔗📌📂📁📃📄🗑️⭐️🔥📦🔍]/;

  function extractLeadingIconFromText(txt) {
    if (!txt) return '';
    const s = String(txt).trim();
    try { const m = s.match(EMOJI_RE); if (m && m.index === 0 && m[0]) return m[0]; } catch (_) { }
    const m2 = s.match(FALLBACK_ICON_RE); if (m2 && m2.index === 0) return m2[0];
    return '';
  }
  function stripLeadingIcon(txt) {
    if (!txt) return '';
    let s = String(txt).trim();
    try {
      const m = s.match(EMOJI_RE);
      if (m && m.index === 0 && m[0]) { s = s.slice(m[0].length).trim(); s = s.replace(/^[\s\-\|:–—]+/, '').trim(); return s; }
    } catch (_) { }
    if (FALLBACK_ICON_RE.test(s.charAt(0))) s = s.slice(1).trim();
    return s.replace(/^[\s\-\|:–—]+/, '').trim();
  }

  /* ---------- Icônes ---------- */
  function nearestLabelIcon(label) {
    if (!label) return '';
    let ic = label.parentElement && label.parentElement.querySelector('i,svg,img');
    if (ic) return ic.outerHTML;
    let prev = label.previousElementSibling;
    while (prev && (prev.matches('br,hr') || !isVisibleStrict(prev))) prev = prev.previousElementSibling;
    if (prev) {
      ic = prev.querySelector?.('i,svg,img') || (prev.matches('i,svg,img') ? prev : null);
      if (ic) return ic.outerHTML;
      const emoPrev = extractLeadingIconFromText(prev.textContent || '');
      if (emoPrev) return `<span class="ctxmenu-icon">${emoPrev}</span>`;
    }
    const emoSelf = extractLeadingIconFromText(label.textContent || '');
    if (emoSelf) return `<span class="ctxmenu-icon">${emoSelf}</span>`;
    return '';
  }
  function splitLabelTitleAndIcon(label) {
    const rawTitle = (label.textContent || '').trim().replace(/\s+/g, ' ');
    const labelIcon = nearestLabelIcon(label);
    if (labelIcon) return { title: stripLeadingIcon(rawTitle), iconHTML: labelIcon };
    const emo = extractLeadingIconFromText(rawTitle);
    return { title: emo ? stripLeadingIcon(rawTitle) : rawTitle, iconHTML: emo ? `<span class="ctxmenu-icon">${emo}</span>` : '' };
  }

  /* ---------- Signatures & meta ---------- */
  function ensureId(el, prefix) {
    if (el.id) return el.id;
    const sig = (prefix || 'el-') + (el.name || el.getAttribute('title') || el.placeholder || el.textContent || 'x')
      .toString().trim().toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
    if (!document.getElementById(sig)) el.id = sig;
    return el.id || sig;
  }
  function btnSignature(el) { return ensureId(el, 'btn-'); }

  function btnMeta(el) {
    const ic = el.querySelector('i,svg,img');
    let iconHTML = ic ? ic.outerHTML : '';
    let title =
      (typeof getLocalizedTitleFor === 'function' ? getLocalizedTitleFor(el) : '') ||
      el.getAttribute('title') ||
      (el.textContent || '').trim();

    title = title.replace(/\s+/g, ' ');
    if (!iconHTML) {
      const emo = extractLeadingIconFromText(title) || extractLeadingIconFromText(el.innerText || '');
      if (emo) {
        iconHTML = `<span class="ctxmenu-icon">${emo}</span>`;
        title = stripLeadingIcon(title);
      }
    } else {
      title = stripLeadingIcon(title);
    }
    return { iconHTML, title };
  }

  function labelForControl(el) {
    if (!el) return '';
    if (el.id) {
      const assoc = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (assoc) return assoc.textContent.trim();
      if (typeof getLocalizedTitleFor === 'function') {
        const t = getLocalizedTitleFor(el);
        if (t) return t;
      }
    }
    return el.getAttribute('aria-label') || el.getAttribute('title') || el.placeholder || '';
  }

  function controlMeta(el) {
    const type = (el.type || '').toLowerCase();
    const tag = el.tagName.toLowerCase();
    var title = (labelForControl(el) || el.getAttribute('title') || '').trim() || (el.id ? ('#' + el.id) : (el.name || tag));
    // Libellés plus parlants pour certains champs clés
    if (el.id === 'mot') title = 'mot';
    if (el.id === 'uiLangSelect') title = 'Langue de l’interface';
    if (el.id === 'Traduction') title = 'Sélection d’un livre de commentaires';
    if (title === 'ME' || title === '[Mot Entier]') {
      title = localizedMotEntier();
    }
    if (title === 'MC' || title === '[Mots ordonnés et contigus]') {
      title = localizedMotsContigus();
    }
    let iconHTML = '';
    let ctype = '';
    let state = '';
    if (type === 'checkbox') {
      ctype = 'checkbox';
      iconHTML = el.checked ? '☑️' : '⬜️';
      state = el.checked ? 'on' : 'off';
    } else if (type === 'radio') {
      ctype = 'radio';
      iconHTML = el.checked ? '🔘' : '⚪️';
      state = el.checked ? 'on' : 'off';
    } else if (tag === 'select') {
      ctype = 'select';
      iconHTML = '<i class="fas fa-list" aria-hidden="true"></i>';
    } else if (tag === 'textarea') {
      ctype = 'textarea';
      iconHTML = '📝';
    } else if (['text', 'search', 'email', 'number', 'password', 'tel', 'url'].includes(type)) {
      ctype = type || 'text';
      iconHTML = (type === 'number') ? '<i class="fas fa-sort-numeric-down" aria-hidden="true"></i>' :
        (type === 'password') ? '🔐' :
          (type === 'email') ? '✉️' :
            (type === 'search') ? '🔍' : '🔤';
    } else {
      ctype = tag;
      iconHTML = '🔤';
    }

    let valuePreview = '';
    if (tag === 'select') {
      const lab = el.selectedOptions && el.selectedOptions[0] ? el.selectedOptions[0].textContent.trim() : el.value || '';
      valuePreview = lab;
    } else if (tag === 'textarea') {
      valuePreview = (el.value || '').slice(0, 40);
    } else if (['text', 'search', 'email', 'number', 'password', 'tel', 'url'].includes(type)) {
      valuePreview = el.value || '';
    }

    return { sig: ensureId(el, 'ctl-'), title, iconHTML, ctype, state, valuePreview };
  }

  /* ---------- Labels (sections) ---------- */
  function collectLabelsInDOMOrder() {
    const LANG = getLangCode();
    return Array.from(document.querySelectorAll(`span[id^="labelInterface${LANG}"]`))
      .filter(sp => sp && !inAdmin(sp) && isVisibleFor(sp));
  }

  /* ---------- Construction HTML ---------- */


  function buildCtxMenuHTML_fromLabels(opts = {}) {
    const includeHeader = opts.header !== false;
    const LANG = getLangCode();
    const isRTL = (LANG === 'AR');
    const titleTxt = (LANG === 'AR') ? 'القائمة' :
      (LANG === 'EN') ? 'Menu' :
        (LANG === 'KAB') ? 'Umuɣ' :
          (LANG === 'ES') ? 'Menú' : 'Menu';

    const out = [];
    if (includeHeader) {
      out.push(
        `<div class="ctxmenu-header ctxmenu-popup__inner-header">` +
        `<div class="ctxmenu-popup__title">${titleTxt}</div>` +
        `<button type="button" class="ctxmenu-close ctxmenu-popup__close" aria-label="Fermer" title="Fermer"><span aria-hidden="true">×</span></button>` +
        `</div>`
      );
    }

    const getHeadTitle = (panel) => {
      const head = panel.querySelector('.zc-module-head');
      if (!head) return { title: '', iconHTML: '' };
      const lbl = Array.from(head.querySelectorAll('span'))
        .find(sp => (sp.id || '').startsWith('labelInterface') && isVisibleFor(sp));
      if (lbl) return splitLabelTitleAndIcon(lbl);
      const txtHead = (head.textContent || '').trim().replace(/\s+/g, ' ');
      return { title: stripLeadingIcon(txtHead), iconHTML: nearestLabelIcon(head) };
    };

    const getButtonTitle = (btn) => {
      const localLabel = btn.querySelector('.zc-top-action-label, .zc-title-sync-label');
      if (localLabel) {
        const langSpans = Array.from(localLabel.querySelectorAll('span[id^="labelInterface"]'));
        const visibleLangSpan =
          // 1) chemin normal: activerLabels pose aria-hidden
          langSpans.find(sp => sp.getAttribute('aria-hidden') === 'false') ||
          // 2) fallback: classe active
          langSpans.find(sp => sp.classList.contains('label-actif')) ||
          // 3) fallback robuste: pas explicitement masqué
          langSpans.find(sp => getComputedStyle(sp).display !== 'none');
        if (visibleLangSpan) {
          const t = (visibleLangSpan.textContent || '').trim().replace(/\s+/g, ' ');
          if (t) return stripLeadingIcon(t);
        }
      }
      const visText = localLabel ? (localLabel.textContent || '').trim().replace(/\s+/g, ' ') : '';
      if (visText) return stripLeadingIcon(visText);
      const m = btnMeta(btn);
      return stripLeadingIcon(m.title || '');
    };

    const pushGroup = (title, iconHTML, items) => {
      if (!title || !items.length) return;
      const icon = iconHTML || '<i class="fas fa-layer-group" aria-hidden="true"></i>';
      out.push(`<div class="ctxmenu-group">`);
      out.push(`<div class="ctxmenu-group-title">${icon}${escapeHtml(title)}</div>`);
      out.push(`<div class="ctxmenu-list">`);
      items.forEach(it => {
        const kind = it.kind || 'menu-action';
        out.push(
          `<button type="button" class="ctxmenu-item ctxmenu-item--ctl" data-kind="${escapeHtml(kind)}" data-target-id="${escapeHtml(it.id)}">` +
          `<span class="ctxmenu-icon">${it.iconHTML || '<i class="fas fa-circle" aria-hidden="true"></i>'}</span>` +
          `<span class="ctxmenu-title">${escapeHtml(it.title)}</span>` +
          `</button>`
        );
      });
      out.push(`</div></div>`);
    };

    out.push(`<div class="ctxmenu-root" dir="${isRTL ? 'rtl' : 'ltr'}">`);

    // 1) Entête (boutons visibles de la barre du haut)
    const topItems = [];
    const topRow = document.querySelector('.topline');
    if (topRow) {
      Array.from(topRow.querySelectorAll('button')).forEach(btn => {
        if (!isVisibleFor(btn)) return;
        if (btn.id === 'btnCloseCtxMenu') return;
        const id = btnSignature(btn);
        const meta = btnMeta(btn);
        const t = getButtonTitle(btn);
        if (!t) return;
        topItems.push({ id, iconHTML: meta.iconHTML, title: t });
      });
      Array.from(topRow.querySelectorAll(CONTROL_SELECTORS)).forEach(ctrl => {
        if (!isVisibleFor(ctrl)) return;
        if (ctrl.closest('#popupContextMenu')) return;
        const cm = controlMeta(ctrl);
        if (!cm || !cm.title) return;
        topItems.push({ id: cm.sig, iconHTML: cm.iconHTML, title: cm.title, kind: 'menu-control' });
      });
      pushGroup('Entête', '<i class="fas fa-window-maximize" aria-hidden="true"></i>', topItems);
    }

    // 2) Modules de l'UI (titre/languette + boutons internes)
    const panels = Array.from(document.querySelectorAll('.zc-module-panel'))
      .filter(p => isVisibleFor(p) && p.id !== 'popupContextMenu');

    panels.forEach(panel => {
      const headMeta = getHeadTitle(panel);
      const panelCollapsed = panel.classList.contains('zc-panel-collapsed');
      const seen = new Set();
      const items = [];
      Array.from(panel.querySelectorAll('button')).forEach(btn => {
        if (btn.closest('.zc-module-tab-icons')) return;
        if (isExplicitlyHidden(btn)) return;
        // Si le panneau est replié, on garde quand même ses actions dans le menu.
        if (!panelCollapsed && !isVisibleFor(btn)) return;
        if (btn.classList.contains('zc-panel-collapse-btn')) return;
        if (btn.closest('#popupContextMenu')) return;
        const t = getButtonTitle(btn);
        if (!t) return;
        const id = btnSignature(btn);
        if (seen.has(id)) return;
        seen.add(id);
        const m = btnMeta(btn);
        items.push({ id, iconHTML: m.iconHTML, title: t });
      });

      // Champs / listBox / cases à cocher (ex: mot, historique, paramètres)
      Array.from(panel.querySelectorAll(CONTROL_SELECTORS)).forEach(ctrl => {
        if (ctrl.closest('.zc-module-tab-icons')) return;
        if (isExplicitlyHidden(ctrl)) return;
        if (!panelCollapsed && !isVisibleFor(ctrl)) return;
        if (ctrl.closest('#popupContextMenu')) return;
        const cm = controlMeta(ctrl);
        if (!cm || !cm.title) return;
        if (seen.has(cm.sig)) return;
        seen.add(cm.sig);
        items.push({ id: cm.sig, iconHTML: cm.iconHTML, title: cm.title, kind: 'menu-control' });
      });
      pushGroup(headMeta.title, headMeta.iconHTML, items);
    });

    out.push(`</div>`);
    return out.join('');
  }

  // Expose builder
  window.buildCtxMenuHTML_fromLabels = buildCtxMenuHTML_fromLabels;

  /* ---------- Fenêtre dédiée + Drag + Close ---------- */
  function ensureCtxContainer() {
    const container = document.getElementById('popupContextMenu');
    const body = document.getElementById('ctxmenuBody');
    const title = document.getElementById('ctxmenuHeaderTitle');
    const btnClose = document.getElementById('btnCloseCtxMenu');

    if (btnClose && !btnClose._bound) {
      btnClose.addEventListener('click', () => closeContextMenu());
      btnClose._bound = true;
    }

    if (container && !container._closeDelegBound) {
      container.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('#btnCloseCtxMenu')) closeContextMenu();
      });
      container._closeDelegBound = true;
    }

    const headerEl = container ? container.querySelector('.popup-header') : null;
    if (container && headerEl && !headerEl._dragBound) {
      container.style.position = container.style.position || 'fixed';
      enableDrag(container, headerEl);
      headerEl._dragBound = true;
    }

    return { container, body, title };
  }

  function nextZ() {
    try {
      if (typeof window.getNextZIndex === 'function') return window.getNextZIndex();
    } catch { }
    return null;
  }

  function localizedTitle() {
    return 'Menu contextuel';
  }

  function openContextMenu(_ev) {
    const { container, body, title } = ensureCtxContainer();
    if (!container || !body) return;

    try {
      if (typeof window.zcBringToFront === 'function') window.zcBringToFront(container);
      else {
        const z = nextZ();
        if (Number.isFinite(z)) container.style.zIndex = String(z);
      }
    } catch (_) { }
    if (title) title.textContent = localizedTitle();

    body.innerHTML = buildCtxMenuHTML_fromLabels({ maxTotal: 100, header: false });

    container.style.display = 'block';
    requestAnimationFrame(() => clampToViewport(container));

    if (!restoreLastPos(container)) {
      requestAnimationFrame(() => centerInViewport(container));
    }

    body.onclick = (e) => {
      const actionBtn = e.target && e.target.closest ? e.target.closest('.ctxmenu-item[data-kind]') : null;
      if (!actionBtn) return;
      const kind = actionBtn.getAttribute('data-kind');
      if (kind === 'menu-link') {
        const href = actionBtn.getAttribute('data-href');
        const target = actionBtn.getAttribute('data-target') || '_blank';
        if (href) {
          try { window.open(href, target); } catch (_) { }
        }
      } else if (kind === 'menu-action') {
        const targetId = actionBtn.getAttribute('data-target-id');
        const targetBtn = targetId ? document.getElementById(targetId) : null;
        if (targetBtn) {
          try { targetBtn.click(); } catch (_) { }
        }
      } else if (kind === 'menu-control') {
        const targetId = actionBtn.getAttribute('data-target-id');
        const targetCtl = targetId ? document.getElementById(targetId) : null;
        if (!targetCtl) return;
        try {
          const tag = (targetCtl.tagName || '').toLowerCase();
          const type = (targetCtl.type || '').toLowerCase();
          if (type === 'checkbox' || type === 'radio') {
            targetCtl.checked = !targetCtl.checked;
            targetCtl.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            targetCtl.focus();
            if (tag === 'select') targetCtl.click();
          }
        } catch (_) { }
      }
      closeContextMenu();
    };
    body.onchange = null;

    document.addEventListener('keydown', escOnce, { capture: true, once: true });
    if (!outsideCloseBound) {
      document.addEventListener('pointerdown', onOutsidePointerDown, true);
      outsideCloseBound = true;
    }
  }

  function escOnce(e) { if (e.key === 'Escape') closeContextMenu(); }

  function onOutsidePointerDown(e) {
    const container = document.getElementById('popupContextMenu');
    if (!container || container.style.display === 'none') return;
    if (container.contains(e.target)) return;
    closeContextMenu();
  }

  function closeContextMenu() {
    const container = document.getElementById('popupContextMenu');
    const body = document.getElementById('ctxmenuBody');
    if (body) {
      body.querySelectorAll('.ctxmenu-item').forEach(it => {
        try { if (typeof it._unbindInput === 'function') it._unbindInput(); } catch (_) { }
        it._unbindInput = null;
      });
      body.innerHTML = '';
      body.onclick = null;
      body.onchange = null;
    }
    if (container) container.style.display = 'none';
    if (outsideCloseBound) {
      document.removeEventListener('pointerdown', onOutsidePointerDown, true);
      outsideCloseBound = false;
    }
  }

  // --- Drag & Drop ---
  function enableDrag(container, handle) {
    container.style.position = 'fixed';
    handle.style.cursor = 'move';

    let startX = 0, startY = 0;
    let origLeft = 0, origTop = 0;
    let pointerId = null;
    let dragging = false;
    const THRESHOLD = 4;

    const isInteractive = (el) =>
      !!el.closest('button, a, input, select, textarea, [role="button"], .no-drag');

    const onPointerDown = (ev) => {
      if (isInteractive(ev.target)) return;

      pointerId = ev.pointerId ?? null;
      const rect = container.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      startX = ev.clientX;
      startY = ev.clientY;

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp, { once: true });
    };

    const onPointerMove = (ev) => {
      if (pointerId !== null && ev.pointerId !== pointerId) return;

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (!dragging) {
        if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
        dragging = true;
        try { handle.setPointerCapture?.(pointerId); } catch (_) { }
        try {
          if (typeof window.zcBringToFront === 'function') window.zcBringToFront(container);
          else {
            const z = nextZ();
            if (Number.isFinite(z)) container.style.zIndex = String(z);
          }
        } catch (_) { }
      }

      const w = container.offsetWidth || 360;
      const h = container.offsetHeight || 200;

      let nextL = origLeft + dx;
      let nextT = origTop + dy;

      const MARGIN = 8;
      nextL = Math.max(-w + MARGIN, Math.min(nextL, window.innerWidth - MARGIN));
      nextT = Math.max(-h + MARGIN, Math.min(nextT, window.innerHeight - MARGIN));

      container.style.left = Math.round(nextL) + 'px';
      container.style.top = Math.round(nextT) + 'px';
    };

    const onPointerUp = () => {
      if (dragging) {
        try { clampToViewport(container); } catch (_) { }
        try { savePos(container); } catch (_) { }
      }
      window.removeEventListener('pointermove', onPointerMove, { passive: true });
      try { handle.releasePointerCapture?.(); } catch (_) { }
      pointerId = null;
      dragging = false;
    };

    handle.addEventListener('pointerdown', onPointerDown);
  }

  // Expose global
  window.openContextMenu = function openContextMenuBridge(evOrAnchor) {
    try {
      if (typeof window.zcShowSelectionContextMenuFromMot === 'function') {
        if (window.zcShowSelectionContextMenuFromMot(evOrAnchor || null)) return true;
      }
    } catch (_) { }
    try {
      if (typeof window.zcShowSelectionContextMenuForWord === 'function') {
        var motEl = document.getElementById('mot');
        var w = motEl ? String(motEl.value || '') : '';
        window.zcShowSelectionContextMenuForWord(w, evOrAnchor || null, { allowEmpty: true });
        return true;
      }
    } catch (_) { }
    // Fallback ultime: ancien menu (si le mini-menu n'est pas prêt)
    openContextMenu(evOrAnchor || null);
    return true;
  };
  window.closeContextMenu = function closeContextMenuBridge() {
    try {
      if (typeof window.zcHideSelectionContextMenu === 'function') {
        window.zcHideSelectionContextMenu();
      }
    } catch (_) { }
    closeContextMenu();
  };
})();

/* Garantit que le bouton ouvre le menu (iOS: handle touchend/pointerup) */
(function ensureBtnContextMenuWorks() {
  function bind() {
    const btn = document.getElementById('btnContextMenu');
    if (!btn || btn._ctxBound) return;
    const handler = (e) => {
      try {
        if (e && e.cancelable) e.preventDefault();
        if (e) e.stopPropagation();
      } catch (_) { }
      if (typeof window.openContextMenu === 'function') window.openContextMenu();
      return false;
    };
    btn.addEventListener('click', handler, { passive: false });
    btn.addEventListener('pointerup', handler, { passive: false });
    btn.addEventListener('touchend', handler, { passive: false });
    btn._ctxBound = true;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();

/* Recalage auto sur resize / orientation */
(function bindCtxViewportWatcher() {
  let raf = 0;
  const onResize = () => {
    const el = document.getElementById('popupContextMenu');
    if (!el || el.style.display === 'none') return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => clampToViewport(el));
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
})();

/* Repli des blocs depuis la languette de titre (sans masquer la languette) */
(function initPanelHeaderCollapse() {
  /** Au chargement : tout replié sauf « Recherche de versets » ; pas d’auto-repli sur ce panneau. « Outils » : Historik via #btnHistorikPopup → #zcHistorikOverlay (data-zc-no-auto-collapse). */
  const PANEL_VERS_OPEN = 'panelVersets';
  const PANEL_SOURA_SEARCH = 'panelSouraSearch';
  const PANEL_OPEN_BY_DEFAULT = PANEL_VERS_OPEN;
  function isAlwaysOpenPanel(panel) {
    const id = panel && panel.id ? panel.id : '';
    return id === PANEL_VERS_OPEN || id === PANEL_SOURA_SEARCH;
  }

  function getLangCodeUi() {
    const l = (localStorage.getItem('uiLang') || 'fr').toLowerCase();
    if (l === 'ar') return 'AR';
    if (l === 'en') return 'EN';
    if (l === 'kab') return 'KAB';
    if (l === 'es') return 'ES';
    return 'FR';
  }

  function toggleTitle(collapsed) {
    const L = getLangCodeUi();
    if (collapsed) {
      return (L === 'AR') ? 'إظهار محتوى القسم'
        : (L === 'EN') ? 'Show section content'
          : (L === 'KAB') ? 'Sken agbur n uḥric'
            : (L === 'ES') ? 'Mostrar contenido de la sección'
              : 'Afficher le contenu du bloc';
    }
    return (L === 'AR') ? 'إخفاء محتوى القسم'
      : (L === 'EN') ? 'Hide section content'
        : (L === 'KAB') ? 'Ffer agbur n uḥric'
          : (L === 'ES') ? 'Ocultar contenido de la sección'
            : 'Masquer le contenu du bloc';
  }

  function getPanelId(panel, idx) {
    return panel.id || `zc-panel-${idx}`;
  }

  function applyCollapsed(panel, collapsed, btn) {
    const bodyNodes = Array.from(panel.children).filter(ch => !ch.classList.contains('zc-module-head'));
    bodyNodes.forEach(ch => { ch.style.display = collapsed ? 'none' : ''; });
    panel.classList.toggle('zc-panel-collapsed', !!collapsed);
    if (btn) {
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.textContent = collapsed ? '+' : '−';
      btn.setAttribute('title', toggleTitle(collapsed));
    }
  }

  /** Après ouverture : place la languette (.zc-module-head) juste sous le bloc figé (verse search + haut). */
  function zcScrollPanelHeadBelowStickyHead(panel) {
    if (!panel || panel.id === PANEL_VERS_OPEN) return;
    const sticky = document.querySelector('.zc-app-sticky-head');
    const head = panel.querySelector('.zc-module-head');
    if (!sticky || !head) return;
    /* Panneaux déjà dans le bloc figé (Soura, etc.) : pas de recalage vertical pertinent. */
    if (sticky.contains(panel)) return;
    const gap = 6;
    const run = () => {
      const sb = sticky.getBoundingClientRect().bottom;
      const hr = head.getBoundingClientRect();
      const delta = hr.top - (sb + gap);
      if (Math.abs(delta) < 3) return;
      const reduceMotion = typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        window.scrollBy(0, delta);
      } else {
        try {
          window.scrollBy({ top: delta, behavior: 'smooth' });
        } catch (_) {
          window.scrollBy(0, delta);
        }
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  /** Un seul panneau repliable ouvert à la fois ; `panelVersets` (#mot) n’est jamais refermé ici. */
  function collapseOtherPanelsExcept(keepExpanded) {
    document.querySelectorAll('.zc-module-panel').forEach((p) => {
      if (isAlwaysOpenPanel(p)) return;
      if (p === keepExpanded) return;
      const collapseBtn = p.querySelector('.zc-panel-collapse-btn');
      if (!collapseBtn) return;
      if (!p.classList.contains('zc-panel-collapsed')) {
        applyCollapsed(p, true, collapseBtn);
      }
    });
  }

  /** Ouvre le panneau Soura si #mot est un nombre (3, 3.14…), sinon le referme. */
  function expandSouraPanelIfMotNumeric() {
    const mot = document.getElementById('mot');
    if (!mot) return;
    const v = String(mot.value || '').trim();
    const isNum = typeof window.detecterNombre === 'function' && window.detecterNombre(v);
    const soura = document.getElementById(PANEL_SOURA_SEARCH);
    if (!soura) return;
    const cbtn = soura.querySelector('.zc-panel-collapse-btn');
    if (!cbtn) return;

    if (!isNum) {
      // Panel SouraSearch doit rester visible même si #mot n'est pas numérique.
      if (soura.classList.contains('zc-panel-collapsed')) {
        applyCollapsed(soura, false, cbtn);
      }
      return;
    }

    if (!soura.classList.contains('zc-panel-collapsed')) return;
    collapseOtherPanelsExcept(soura);
    applyCollapsed(soura, false, cbtn);
  }

  window.zcExpandSouraIfMotNumeric = expandSouraPanelIfMotNumeric;

  /** Déplie le bloc « Visiteurs / Visitors » (#panelFooter) — ex. après connexion ou déconnexion. */
  function zcExpandVisitorsPanel() {
    const panel = document.getElementById("panelFooter");
    if (!panel) return;
    const collapseBtn = panel.querySelector(".zc-panel-collapse-btn");
    if (!collapseBtn) return;
    if (panel.classList.contains("zc-panel-collapsed")) {
      collapseOtherPanelsExcept(panel);
      applyCollapsed(panel, false, collapseBtn);
    }
    try {
      zcScrollPanelHeadBelowStickyHead(panel);
    } catch (_) { }
  }
  window.zcExpandVisitorsPanel = zcExpandVisitorsPanel;

  /**
   * Source de vérité : boutons du bloc (toolbar). Recrée les languettes (.zc-module-tab-icons)
   * pour qu’elles reflètent le bloc (ordre, icônes, clic → même action).
   * Panneaux avec data-zc-sync-tabs="manual" : inchangés (ex. recherche Soura).
   * Optionnel : data-zc-tab-toolbar="selector" pour cibler une barre précise dans le panneau.
   * Chaque bouton du bloc doit avoir un id (sinon avertissement console).
   */
  function findToolbarForTabSync(panel) {
    const mode = panel.getAttribute('data-zc-sync-tabs');
    if (mode === 'manual' || mode === 'off') return null;
    const customSel = panel.getAttribute('data-zc-tab-toolbar');
    if (customSel) {
      const t = panel.querySelector(customSel);
      if (t) return t;
    }
    const pid = panel.id;
    if (pid === 'panelFooter') return panel.querySelector('.zc-footer-toolbar');
    if (pid === 'BtnCaches') return panel.querySelector('.zc-btn-caches-inner');
    const souraRow = panel.querySelector('.zc-soura-actions-row.zc-module-toolbar-inner');
    if (souraRow) return souraRow;
    return panel.querySelector('.zc-panel-soura-inner.zc-module-toolbar-inner')
      || panel.querySelector('.zc-module-toolbar-inner');
  }

  function collectToolbarButtonsForTabs(toolbar) {
    const out = [];
    if (!toolbar) return out;
    for (let i = 0; i < toolbar.children.length; i++) {
      const child = toolbar.children[i];
      if (!child || child.nodeType !== 1) continue;
      if (child.tagName !== 'BUTTON') continue;
      if (child.classList.contains('zc-panel-collapse-btn')) continue;
      if (child.getAttribute('data-zc-no-tab') === '1') continue;
      out.push(child);
    }
    return out;
  }

  /**
   * Recrée les boutons-languettes à partir d’une barre d’outils (ordre, icônes, titre).
   * @param {HTMLElement} toolbar
   * @param {HTMLElement} strip conteneur (ex. .zc-module-tab-icons)
   * @param {{ idPrefix?: string, onTabClick?: (src: HTMLButtonElement, tab: HTMLButtonElement, ev: MouseEvent) => void }} [options]
   */
  function zcBuildModuleTabStripFromToolbar(toolbar, strip, options) {
    const opts = options || {};
    const idPrefix = opts.idPrefix != null ? opts.idPrefix : 'tipTab__';
    const onTabClick = opts.onTabClick;
    const mirrorSourceButtonClasses = opts.mirrorSourceButtonClasses === true;

    const sources = collectToolbarButtonsForTabs(toolbar);
    strip.textContent = '';

    sources.forEach((src) => {
      const sid = src.id;
      if (!sid) {
        console.warn('[zcSyncTabs] Bouton sans id — languette non créée.');
        return;
      }

      const tab = document.createElement('button');
      tab.type = 'button';
      if (mirrorSourceButtonClasses) {
        tab.className = (src.className || 'menu-button active zc-top-action-btn') + ' zc-module-tab-icon-btn';
      } else {
        tab.className = 'menu-button active zc-top-action-btn zc-module-tab-icon-btn';
      }
      if (sid === 'footerToolbarLikeBtn') tab.classList.add('zc-footer-tab-like');
      tab.id = idPrefix + sid;

      const titleAttr =
        src.getAttribute('data-zc-tab-title') ||
        src.getAttribute('title') ||
        src.getAttribute('aria-label') ||
        '';
      if (titleAttr) {
        tab.setAttribute('title', titleAttr);
        tab.setAttribute('aria-label', titleAttr);
      }
      const srcDisabled = !!src.disabled;
      tab.disabled = srcDisabled;
      tab.setAttribute('aria-disabled', srcDisabled ? 'true' : 'false');
      tab.classList.toggle('zc-module-tab-icon-btn--disabled', srcDisabled);
      if (src.classList.contains('zc-popup-tab--restricted')) {
        tab.classList.add('zc-popup-tab--restricted');
      }

      if (onTabClick) {
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (src.disabled || tab.disabled) return;
          onTabClick(src, tab, e);
        });
      } else {
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (src.disabled || tab.disabled) return;
          try { src.click(); } catch (err) { console.warn(err); }
        });
      }

      const srcIco = src.querySelector('.zc-top-action-ico');
      const wrap = document.createElement('span');
      wrap.className = 'zc-top-action-ico';
      wrap.setAttribute('aria-hidden', 'true');
      if (srcIco) wrap.innerHTML = srcIco.innerHTML;
      else wrap.textContent = '▸';
      tab.appendChild(wrap);

      if (sid === 'footerToolbarLikeBtn') {
        const lc = src.querySelector('.like-count');
        if (lc) {
          const lc2 = document.createElement('span');
          lc2.className = lc.className;
          lc2.textContent = lc.textContent;
          tab.appendChild(lc2);
        }
        const ap = src.getAttribute('aria-pressed');
        if (ap) tab.setAttribute('aria-pressed', ap);
      }

      let lblTxt = '';
      if (opts.includeShortLabel) {
        const lbl = src.querySelector('.zc-top-action-label');
        lblTxt = lbl ? String(lbl.textContent || '').trim() : '';
      }
      if (lblTxt) {
        const sp = document.createElement('span');
        sp.className = 'zc-module-tab-short-label';
        sp.textContent = lblTxt;
        tab.appendChild(sp);
      }

      strip.appendChild(tab);
    });
  }

  function zcSyncModuleTabsFromToolbars() {
    document.querySelectorAll('.zc-module-panel').forEach((panel) => {
      const strip = panel.querySelector('.zc-module-tab-icons');
      if (!strip) return;
      const toolbar = findToolbarForTabSync(panel);
      if (!toolbar) return;
      const idPrefix = panel.getAttribute('data-zc-tab-id-prefix') || 'tipTab__';
      zcBuildModuleTabStripFromToolbar(toolbar, strip, {
        includeShortLabel: panel.getAttribute('data-zc-tab-strip-labels') === '1',
        idPrefix: idPrefix
      });
    });
  }

  /** Recrée uniquement la languette d’un panneau (ex. modale injectée après DOMContentLoaded). */
  function zcSyncOneModulePanelTabs(panel) {
    if (!panel) return;
    const strip = panel.querySelector('.zc-module-tab-icons');
    if (!strip) return;
    const toolbar = findToolbarForTabSync(panel);
    if (!toolbar) return;
    const idPrefix = panel.getAttribute('data-zc-tab-id-prefix') || 'tipTab__';
    zcBuildModuleTabStripFromToolbar(toolbar, strip, {
      includeShortLabel: panel.getAttribute('data-zc-tab-strip-labels') === '1',
      idPrefix: idPrefix
    });
  }
  window.zcSyncOneModulePanelTabs = zcSyncOneModulePanelTabs;

  /** Remplit les 3 lignes d’icônes du menu contextuel de sélection depuis les toolbars SAWM / SALAT / CHOKR. */
  function zcSyncSelectionContextMenuToolbarStrips() {
    const menu = document.getElementById('selectionContextMenu');
    if (!menu) return;
    const cloneCtxBodyButtons = (toolbar, host, menu, panelId) => {
      if (!host || !toolbar) return;
      host.innerHTML = '';
      const sources = collectToolbarButtonsForTabs(toolbar);
      sources.forEach((src, idx) => {
        const sid = src.id || `ctxBody_${panelId}_${idx}`;
        const titleAttr =
          src.getAttribute('title') ||
          src.getAttribute('aria-label') ||
          '';
        const labelText = titleAttr || (src.textContent || '').trim();
        if (!labelText) return;
        const btn = src.cloneNode(true);
        btn.type = 'button';
        btn.className = (src.className || 'menu-button active zc-top-action-btn') + ' zc-ctx-body-btn';
        btn.id = `ctxBody__${sid}`;
        btn.removeAttribute('onclick');
        btn.removeAttribute('onmousedown');
        btn.removeAttribute('onmouseup');
        btn.removeAttribute('onpointerdown');
        btn.removeAttribute('onpointerup');
        btn.setAttribute('title', titleAttr || labelText);
        btn.setAttribute('aria-label', titleAttr || labelText);
        btn.disabled = !!src.disabled;
        btn.setAttribute('aria-disabled', btn.disabled ? 'true' : 'false');
        const lbl = btn.querySelector('.zc-top-action-label');
        if (lbl) lbl.textContent = labelText;
        else {
          const sp = document.createElement('span');
          sp.className = 'zc-top-action-label';
          sp.textContent = labelText;
          btn.appendChild(sp);
        }
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (src.disabled || btn.disabled) return;
          const word = menu.dataset.selectedWord || '';
          if (typeof window.zcCtxApplySelectionToMot === 'function') {
            window.zcCtxApplySelectionToMot(src.id, word);
          }
          if (typeof window.zcHideSelectionContextMenu === 'function') {
            window.zcHideSelectionContextMenu();
          } else {
            menu.style.display = 'none';
          }
          if (typeof window.zcClearTextSelectionAfterCtxMenu === 'function') {
            window.zcClearTextSelectionAfterCtxMenu();
          }
          requestAnimationFrame(() => {
            try { src.click(); } catch (err) { console.warn(err); }
          });
        });
        host.appendChild(btn);
      });
    };
    const rows = [
      {
        panelId: 'panelSawm',
        headSel: '.zc-ctx-toolbar-head-host[data-zc-panel-id="panelSawm"]',
        bodySel: '.zc-ctx-toolbar-body-host[data-zc-panel-id="panelSawm"]'
      },
      {
        panelId: 'panelSalat',
        headSel: '.zc-ctx-toolbar-head-host[data-zc-panel-id="panelSalat"]',
        bodySel: '.zc-ctx-toolbar-body-host[data-zc-panel-id="panelSalat"]'
      },
      {
        panelId: 'panelChokr',
        headSel: '.zc-ctx-toolbar-head-host[data-zc-panel-id="panelChokr"]',
        bodySel: '.zc-ctx-toolbar-body-host[data-zc-panel-id="panelChokr"]'
      },
    ];
    rows.forEach(({ panelId, headSel, bodySel }) => {
      const headHost = menu.querySelector(headSel);
      const bodyHost = menu.querySelector(bodySel);
      const panel = document.getElementById(panelId);
      if ((!headHost && !bodyHost) || !panel) return;
      const toolbar = findToolbarForTabSync(panel);
      if (!toolbar) return;
      if (headHost) {
        zcBuildModuleTabStripFromToolbar(toolbar, headHost, {
          idPrefix: 'ctxTip__',
          mirrorSourceButtonClasses: true,
          onTabClick: (src, _tab, e) => {
            e.preventDefault();
            e.stopPropagation();
            const word = menu.dataset.selectedWord || '';
            if (typeof window.zcCtxApplySelectionToMot === 'function') {
              window.zcCtxApplySelectionToMot(src.id, word);
            }
            if (typeof window.zcHideSelectionContextMenu === 'function') {
              window.zcHideSelectionContextMenu();
            } else {
              menu.style.display = 'none';
            }
            if (typeof window.zcClearTextSelectionAfterCtxMenu === 'function') {
              window.zcClearTextSelectionAfterCtxMenu();
            }
            requestAnimationFrame(() => {
              try { src.click(); } catch (err) { console.warn(err); }
            });
          },
        });
      }
      if (bodyHost) cloneCtxBodyButtons(toolbar, bodyHost, menu, panelId);
    });
  }

  window.zcSyncModuleTabsFromToolbars = zcSyncModuleTabsFromToolbars;
  window.zcSyncSelectionContextMenuToolbarStrips = zcSyncSelectionContextMenuToolbarStrips;

  function attachAutoCollapseOnToolbarClick(panel) {
    if (panel.getAttribute('data-zc-no-toolbar-autocollapse') === '1') return;
    panel.addEventListener('click', (e) => {
      if (panel.id === PANEL_VERS_OPEN) return;
      const btn = e.target && e.target.closest && e.target.closest('button');
      if (!btn || !panel.contains(btn)) return;
      if (btn.classList.contains('zc-panel-collapse-btn')) return;
      if (btn.disabled) return;
      if (btn.getAttribute('data-zc-no-auto-collapse') === '1') return;
      if (panel.classList.contains('zc-panel-collapsed')) return;

      const head = panel.querySelector('.zc-module-head');
      const inToolbar = btn.closest('.zc-module-toolbar-inner');
      const inTabStrip =
        btn.classList.contains('zc-module-tab-icon-btn') && head && head.contains(btn);

      if (inToolbar && panel.contains(inToolbar)) {
        // ok
      } else if (inTabStrip) {
        // ok — même idée : action depuis la languette referme le bloc s’il était ouvert
      } else {
        return;
      }

      const collapseBtn = panel.querySelector('.zc-panel-collapse-btn');
      if (!collapseBtn) return;
      applyCollapsed(panel, true, collapseBtn);
    });
  }

  function initOne(panel, idx) {
    const head = panel.querySelector('.zc-module-head');
    if (!head) return;
    if (head.querySelector('.zc-panel-collapse-btn')) return;
    /* Forum : languette + icônes gérées à part (pas de repli ± global ni onglets reconstruits). */
    if (panel.classList.contains('zc-forum-welcome-panel')) return;
    /* Médias : barre Actions + menu « + » gérés dans medias1.js (pas de ± injecté ni auto-collapse toolbar). */
    if (panel.id === 'zcMediasActionsPanel') return;

    if (isAlwaysOpenPanel(panel)) {
      applyCollapsed(panel, false, null);
      attachAutoCollapseOnToolbarClick(panel);
      return;
    }

    const panelId = getPanelId(panel, idx);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zc-panel-collapse-btn';
    btn.setAttribute('aria-label', 'Toggle panel');

    let collapsed = panelId !== PANEL_OPEN_BY_DEFAULT;
    if (panelId === PANEL_SOURA_SEARCH) collapsed = false;
    if (panel.getAttribute('data-zc-start-expanded') === '1') collapsed = false;
    applyCollapsed(panel, collapsed, btn);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isAlwaysOpenPanel(panel)) {
        applyCollapsed(panel, false, btn);
        return;
      }
      const willCollapse = !panel.classList.contains('zc-panel-collapsed');
      if (!willCollapse) {
        collapseOtherPanelsExcept(panel);
      }
      applyCollapsed(panel, willCollapse, btn);
      if (!willCollapse) {
        zcScrollPanelHeadBelowStickyHead(panel);
      }
    });

    head.appendChild(btn);
    attachAutoCollapseOnToolbarClick(panel);
  }

  /** Panneaux `.zc-module-panel[data-zc-defer-collapse-init="1"]` ajoutés après le chargement (ex. `#afModalOverlay`). */
  function zcInitDeferredModulePanels(root) {
    const base = root && root.nodeType === 1 ? root : document;
    const panels = base.querySelectorAll('.zc-module-panel[data-zc-defer-collapse-init="1"]');
    panels.forEach((panel, i) => {
      if (panel.querySelector('.zc-panel-collapse-btn')) return;
      initOne(panel, 700 + i);
      zcSyncOneModulePanelTabs(panel);
    });
  }
  window.zcInitDeferredModulePanels = zcInitDeferredModulePanels;

  function initAll() {
    try {
      if (typeof zcSyncModuleTabsFromToolbars === 'function') zcSyncModuleTabsFromToolbars();
    } catch (e) {
      console.warn('zcSyncModuleTabsFromToolbars', e);
    }
    try {
      if (typeof zcSyncSelectionContextMenuToolbarStrips === 'function') zcSyncSelectionContextMenuToolbarStrips();
    } catch (e) {
      console.warn('zcSyncSelectionContextMenuToolbarStrips', e);
    }
    const panels = Array.from(document.querySelectorAll('.zc-module-panel'));
    panels.forEach((p, i) => initOne(p, i + 1));
    try { expandSouraPanelIfMotNumeric(); } catch (_) { }
    try {
      if (typeof window.applyTitlesForCurrentLang === 'function') window.applyTitlesForCurrentLang();
    } catch (_) { }
    try {
      if (typeof window.updateUserUI === 'function') window.updateUserUI();
    } catch (_) { }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll, { once: true });
  } else {
    initAll();
  }
})();

/** CHOKR : recherche blog (URL stable) avec le texte du champ #mot (toujours nouvel onglet). */
window.openChokrDigneDeFoiSearch = function openChokrDigneDeFoiSearch() {
  const el = document.getElementById("mot");
  const t = el ? String(el.value || "").replace(/\s+/g, " ").trim() : "";
  const u = (window.ALFAMOUS_URLS && window.ALFAMOUS_URLS.blogSearchUrl)
    ? window.ALFAMOUS_URLS.blogSearchUrl(t)
    : "https://lexique-coran.blogspot.com/search" + (t ? "?q=" + encodeURIComponent(t) + "&m=1" : "");
  window.open(u, "_blank", "noopener,noreferrer");
};


////////////////////////////////////////////////////articles.js

(function initArticlesBadgeAtStartup() {
  "use strict";

  const BTN_ID = "t-rechercher-articles-de-blog";
  const BADGE_ID = "badgeArticlesCount";

  const MAX_WAIT_MS = 15000;

  function ensureBadge() {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return null;

    let badge = document.getElementById(BADGE_ID);
    if (!badge) {
      badge = document.createElement("span");
      badge.id = BADGE_ID;
      badge.style.marginLeft = "6px";
      badge.style.fontWeight = "700";
      badge.style.fontSize = "12px";
      btn.appendChild(badge);
    }
    return badge;
  }

  function render(n) {
    const badge = ensureBadge();
    if (!badge) return false;
    n = Number.isFinite(n) && n >= 0 ? n : 0;
    badge.textContent = ` ${n}`;
    badge.setAttribute("aria-label", `${n} article${n > 1 ? "s" : ""}`);
    return true;
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find(s => (s.src || "") === url);
      if (existing) return resolve();

      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Échec chargement: " + url));
      document.head.appendChild(s);
    });
  }

  // === Copie de la logique de dédup de articles.js (clé = titre|aperçu) ===
  function dedupArticles(list) {
    const seen = new Map();
    const out = [];
    const norm = s => (s || "").replace(/\s+/g, " ").trim();

    for (const a of list) {
      const titre = norm(
        a.querySelector("h2")?.textContent || a.getAttribute("data-titre") || ""
      );

      const apercu = (() => {
        const tmp = document.createElement("div");
        tmp.innerHTML = a.innerHTML;
        const root = tmp.querySelector(".corps") || tmp;
        const p = Array.from(root.querySelectorAll("p")).find(el => norm(el.textContent).length > 10);
        return norm(p ? p.textContent : root.textContent).slice(0, 120);
      })();

      const key = titre + "|" + apercu;
      if (!seen.has(key)) {
        seen.set(key, true);
        out.push(a);
      }
    }
    return out;
  }

  function computeCleanCountFromHtml(rawHtml) {
    if (typeof rawHtml !== "string" || !rawHtml.trim()) return null;

    const tmp = document.createElement("div");
    tmp.innerHTML = rawHtml;

    // 1) tous les div.article
    let list = Array.from(tmp.querySelectorAll("div.article"));

    // 2) enlever les articles imbriqués (exactement comme articles.js)
    list = list.filter(a => !a.parentElement.closest("div.article"));

    // 3) dédup (exactement comme articles.js)
    list = dedupArticles(list);

    return list.length;
  }

  async function start() {
    render(0);

    // Si déjà disponible
    let n = computeCleanCountFromHtml(window.contenuArticlesHtml);
    if (n !== null) { render(n); return; }

    try {
      if (typeof window.loadFirstAvailable === 'function' && typeof window.__buildArticlesHtmlLoadUrls === 'function') {
        const urls = await window.__buildArticlesHtmlLoadUrls();
        await window.loadFirstAvailable(urls);
      } else {
        const u = typeof window.__withV === 'function' ? window.__withV('jsZC/articles-format-html.js') : 'jsZC/articles-format-html.js';
        await loadScript(u);
      }
    } catch (e) {
      console.warn("[articlesBadge] " + (e?.message || e));
      return;
    }

    // Attente que window.contenuArticlesHtml arrive
    const t0 = Date.now();
    const timer = setInterval(() => {
      n = computeCleanCountFromHtml(window.contenuArticlesHtml);
      if (n !== null) {
        render(n);
        clearInterval(timer);
        return;
      }
      if (Date.now() - t0 > MAX_WAIT_MS) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

/* Compteur Témoignages : voir jsZC/chokr-notify.js (nouveaux + total en infobulle) */


