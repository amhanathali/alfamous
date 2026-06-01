//nouveau code ajouté pour utiliser le lien de l'image depuis fireBase Storage
// fais la migration dans la suite du code
// ==== Config ====
const FB_BUCKET = "alfamous-amha.appspot.com";
const WARSH_PATH = "MesDonnes/warsh";        // dossier dans le bucket
const WARSH_EXT = ".jpg";                   // extension des pages
const WARSH_MAX = 604;                      // nb. de pages
// =================

const _cacheWarshURL = new Map(); // n -> url (cache)

function _pad3(n) { return String(n).padStart(3, "0"); }
function _clampPage(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.min(WARSH_MAX, Math.max(1, x)) : NaN;
}

/** URL directe "publique" (sans token) */
function warshPublicURL(numPage) {
  const n = _clampPage(numPage);
  if (!Number.isFinite(n)) return "";
  const file = `${_pad3(n)}${WARSH_EXT}`;
  const objectPath = `${WARSH_PATH}/${file}`;
  // astuce: encodeURIComponent pour le chemin avec slash → %2F
  return `https://firebasestorage.googleapis.com/v0/b/${FB_BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

/** API sync (retourne l’URL construite) */
function demLienImgWarshFB(numPage) {
  const n = _clampPage(numPage);
  if (!Number.isFinite(n)) return "";
  if (_cacheWarshURL.has(n)) return _cacheWarshURL.get(n);
  const url = warshPublicURL(n);
  _cacheWarshURL.set(n, url);
  return url;
}

// --- Exemple d’usage
// const img = document.getElementById("warshImg");
// img.src = demLienImgWarshFB(1);



const NB_SOURAT = 114;
const NB_PAGES = 604;
window.numPage = "1";   // valeur par défaut de la page Warsh
window.numSourat = "1"; // valeur par défaut de la Sourat


// Normalise les chiffres (arabe/persan → 0-9), retire séparateurs, espaces, etc.
function normalizeDigits(x) {
  const s = String(x ?? "");
  const ai = "٠١٢٣٤٥٦٧٨٩"; // Arabic-Indic
  const pe = "۰۱۲۳۴۵۶۷۸۹"; // Persian
  return s
    .replace(/[٠-٩]/g, ch => String(ai.indexOf(ch)))
    .replace(/[۰-۹]/g, ch => String(pe.indexOf(ch)))
    .replace(/\u066B/g, ".")  // décimale arabe "٫"
    .replace(/\u066C/g, "")   // séparateur milliers "٬"
    .replace(/[^\d.]/g, "")   // ne garde que chiffres et .
    .trim();
}

// Clamp sûr page
function clampPage(p) {
  const n = parseInt(normalizeDigits(p), 10);
  return Number.isFinite(n) ? Math.min(NB_PAGES, Math.max(1, n)) : NaN;
}


// PAGE WARSH
function lireIndexPage(numPage) {
  var tableau = fTabVersets();
  var valRet = [];
  for (var i = 0; i < tableau.length; i++) {
    var indexPage = tableau[i][8];
    //var LienPDF = tableau[i][9];//la colonne est desafectée

    // ✅ harmonisation de type : compare en nombre
    var idx = Number(indexPage);
    if (!Number.isNaN(idx) && numPage === idx) {
      valRet[0] = indexPage;
      //valRet[1] = LienPDF;//la colonne est desafectée
      valRet[1] = tableau[i][1];//numAya
      return valRet;
    }
  }
  valRet[0] = 1;
  //valRet[1] = LienPDF;//la colonne est desafectée
  valRet[1] = 1;//numAya
  return valRet; // Aucune page trouvée
}

function demNumSourat(numPage) {
  // Fallback si param manquant
  let page = (numPage != null && numPage !== "") ? String(numPage) : "1";

  // Convertir chiffres arabes-indiens → occidentaux, retirer tout sauf chiffres
  const map = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  page = page.replace(/[٠-٩]/g, ch => map[ch] || ch).replace(/\D+/g, "");

  // Si vide après nettoyage → 1
  if (page === "") page = "1";

  const pageRecherche = page.padStart(3, "0");

  let tableau;
  try {
    tableau = fTabVersets();
  } catch (e) {
    console.error("fTabVersets() a échoué:", e);
    return 1; // défaut
  }

  if (!Array.isArray(tableau) || tableau.length === 0) return 1;

  for (let i = 0; i < tableau.length; i++) {
    // [8] = indexPage, [0] = numSoura
    const indexPage = String(tableau[i][8]).padStart(3, "0");
    if (indexPage === pageRecherche) {
      const numSoura = parseInt(tableau[i][0], 10);
      return Number.isFinite(numSoura) && numSoura >= 1 && numSoura <= 114 ? numSoura : 1;
    }
  }

  // Si aucune correspondance
  return 1;
}






// Détection sourate sûre à partir de la page (utilise demNumSourat, sinon bornes)
function safeDemNumSourat(page) {
  const p = clampPage(page) || 1;

  // Essai direct si dispo
  try {
    if (typeof demNumSourat === "function") {
      const s0 = parseInt(normalizeDigits(demNumSourat(p)), 10);
      if (s0 >= 1 && s0 <= NB_SOURAT) return s0;
    }
  } catch (_) { }

  // Parcours monotone : choisit la dernière sourate dont first ≤ p
  let chosen = 1;
  for (let s = 1; s <= NB_SOURAT; s++) {
    const b = getSouratBounds(s);
    if (p >= b.first) chosen = s;
    if (p < b.first) break; // bornes croissantes → on peut s'arrêter
  }
  return chosen;
}





// Bornes {first,last} d’une sourate (pages 1..604), robuste
function getSouratBounds(soura) {
  soura = Math.min(NB_SOURAT, Math.max(1, parseInt(soura, 10) || 1));

  if (!window._souratBoundsCache) window._souratBoundsCache = {};
  if (window._souratBoundsCache[soura]) return window._souratBoundsCache[soura];

  const clampPage = (p) => {
    p = parseInt(String(p), 10);
    return Number.isFinite(p) ? Math.min(NB_PAGES, Math.max(1, p)) : NaN;
  };
  const pageFromDem = (s, a) => {
    try {
      if (typeof demNumPageEtLienPDF === "function") {
        const r = demNumPageEtLienPDF(s, a);     // attendu: [indexPage, lien]
        const p = Array.isArray(r) ? r[0] : (r && r.page);
        return clampPage(p);
      }
    } catch (_) { }
    return NaN;
  };

  let first = pageFromDem(soura, 1);
  let lastAya = NaN;
  try { if (typeof nbVers === "function") lastAya = parseInt(nbVers(soura), 10); } catch (_) { }
  let last = (Number.isFinite(lastAya) && lastAya > 0) ? pageFromDem(soura, lastAya) : NaN;

  if (!Number.isFinite(first) || !Number.isFinite(last) || first > last) {
    try {
      const t = (typeof fTabVersets === "function") ? fTabVersets() : [];
      let minPage = Infinity, maxPage = -Infinity;
      for (let i = 0; i < t.length; i++) {
        const s = Number(t[i][0]);
        if (s !== soura) continue;
        const p = clampPage(t[i][8]);
        if (Number.isFinite(p)) { if (p < minPage) minPage = p; if (p > maxPage) maxPage = p; }
      }
      if (Number.isFinite(minPage)) first = minPage;
      if (Number.isFinite(maxPage)) last = maxPage;
    } catch (_) { }
  }

  if (!Number.isFinite(first)) first = 1;
  if (!Number.isFinite(last)) last = first;
  if (first > last) [first, last] = [last, first];

  const res = { first, last };
  window._souratBoundsCache[soura] = res;
  return res;
}

// Aller à la sourate ±1 (atterrit sur la 1ère page de la sourate cible)

function goWarshDeltaSourat(deltaSourat) {
  const toInt = (x) => {
    const ai = "٠١٢٣٤٥٦٧٨٩", pe = "۰۱۲۳۴۵۶۷۸۹";
    const s = String(x ?? "")
      .replace(/[٠-٩]/g, ch => String(ai.indexOf(ch)))
      .replace(/[۰-۹]/g, ch => String(pe.indexOf(ch)));
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : NaN;
  };
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  const curPage = Number(window.numPage || 1);
  const curS = Number(window.numSourat || (typeof demNumSourat === "function" ? demNumSourat(curPage) : 1)) || 1;

  let targetS = Number(curS) + Number(deltaSourat || 0);
  if (!Number.isFinite(targetS)) return;
  targetS = clamp(targetS, 1, 114);
  if (targetS === curS) return;

  // Page EXACTE du verset 1 de la sourate cible
  let pageExacte = NaN;
  try {
    if (typeof demNumPageEtLienPDF === "function") {
      const r = demNumPageEtLienPDF(targetS, 1); // [indexPage, lien]
      const raw = Array.isArray(r) ? r[0] : (r && r.page);
      pageExacte = toInt(raw);
    }
  } catch (_) { }

  // Fallback bornes → début de la sourate
  if (!Number.isFinite(pageExacte) && typeof getSouratBounds === "function") {
    const b = getSouratBounds(targetS);
    if (b && Number.isFinite(b.first)) pageExacte = b.first;
  }
  if (!Number.isFinite(pageExacte)) pageExacte = curPage;
  pageExacte = clamp(pageExacte, 1, 604);

  // Mettre à jour et afficher (on force la sourate dans l’UI)
  window.numSourat = targetS;
  window.numPage = pageExacte;

  if (typeof ouvrirPopupHtml === 'function') { try { ouvrirPopupHtml('warsh'); } catch (_) { } }
  MiseAjourIframe(pageExacte, targetS);
}



////////////////////////////////////////////////////////////////


function fermerWarshText() {
  console.log("fermerWarshText()");
  var el = document.getElementById('WarshText');
  if (el) el.style.display = 'none';
}




function ouvrirPopupHtml(fichierHtmlOuForum) {
  const popup = document.getElementById("popupHtml");
  const iframe = document.getElementById("iframeHtml");
  const contenuLocal = document.getElementById("contenuLocal");
  const forum = document.getElementById("forum-container");
  const warsh = document.getElementById("options2");
  const btnClosePopupHtml = document.getElementById("btnClosePopupHtml");
  if (btnClosePopupHtml) btnClosePopupHtml.style.display = "";

  // Certains modules hébergent temporairement le bouton global #btnClosePopupHtml dans leur barre de titre.
  // Il faut le restaurer avant d'écraser #contenuLocal.innerHTML, sinon le bouton disparaît du DOM.
  try { zcRestorePopupHtmlHostedCloseButton(); } catch (_) { }

  if (popup) {
    popup.classList.remove("zc-popup-html--forum-fullbleed");
    popup.classList.remove("zc-popup-html--iframe-fullbleed");
  }

  try {
    if (typeof window.stopForumMessagesListener === "function") window.stopForumMessagesListener();
  } catch (_) { }

  // --- NEW: petites aides locales et durcissement iframe ---
  // Ajoute playsinline et normalise l'URL (ne touche pas si invalide)
  function prepareUrl(u) {
    try {
      const url = new URL(u, location.href);
      url.searchParams.set('playsinline', '1'); // iOS-friendly
      return url.toString();
    } catch { return u; }
  }
  // Réinitialisation des contenus
  if (iframe) {
    iframe.style.display = "none";
    iframe.src = "";
  }
  if (contenuLocal) {
    try { window.__zcMedias1MountRoot = null; } catch (_) { }
    contenuLocal.innerHTML = "";
    contenuLocal.style.display = "none";
  }

  if (fichierHtmlOuForum === "forum") {
    try {
      const motMain = document.getElementById("mot");
      window.__forumPrefilTexte = String((motMain && motMain.value) || "").trim();
    } catch (_) { }
    try { if (typeof window.markChokrChannelSeen === "function") window.markChokrChannelSeen("forum"); } catch (_) {}
    if (btnClosePopupHtml) btnClosePopupHtml.style.display = "none";
    if (popup) popup.classList.add("zc-popup-html--forum-fullbleed");
    if (forum && contenuLocal) {                             // NEW: gardes soft
      contenuLocal.innerHTML = forum.innerHTML;
      contenuLocal.style.display = "block";
    }
    try { loadMessages(); } catch { }
    try { if (typeof window.forumPrefillSearchFromMot === "function") window.forumPrefillSearchFromMot(true); } catch { }
    try { if (typeof window.refreshForumI18n === "function") window.refreshForumI18n(); } catch { }
    try { if (typeof window.forumNotifyClosePanel === "function") window.forumNotifyClosePanel(); } catch { }
    try { if (typeof window.forumNotifyBindWraps === "function") window.forumNotifyBindWraps(); } catch { }
    try { if (typeof window.forumNotifyEnsureSubscribed === "function") window.forumNotifyEnsureSubscribed(); } catch { }

  } else if (fichierHtmlOuForum === "warsh") {
    if (warsh && contenuLocal) {                             // NEW: gardes soft
      const cloneWarsh = warsh.cloneNode(true);
      cloneWarsh.style.display = "block";
      cloneWarsh.id = "options2_clone";

      contenuLocal.innerHTML = "";
      contenuLocal.appendChild(cloneWarsh);
      contenuLocal.style.display = "block";
      try { zcHostPopupHtmlCloseButtonInBar("#options2_clone #zcWarshPopupHeadBar"); } catch (_) { }
    }

    // Assurer l’image prête et masquer l’iframe
    const iframePDF = document.getElementById('IframePDF');
    if (iframePDF) { iframePDF.src = ""; iframePDF.style.display = "none"; }
    try { ensureWarshElements(); } catch { }                  // NEW: safe call

	} else if (fichierHtmlOuForum === "articlesHtml") {
		if (contenuLocal) {
			// on prépare un conteneur dédié pour le module
			contenuLocal.innerHTML = '<div id="articlesApp"></div>';
			contenuLocal.style.display = "block";

			// initialisation du module d’articles (défini dans articles.js)
			if (typeof initArticlesApp === "function") {
				initArticlesApp('articlesApp');
        try { zcHostPopupHtmlCloseButtonInBar("#articlesApp .zc-articles-head-bar"); } catch (_) { }
			} else {
				contenuLocal.innerHTML = "<p>Module d’articles non chargé.</p>";
			}
		}
  } else if (fichierHtmlOuForum === "temoignages") {
    try { if (typeof window.markChokrChannelSeen === "function") window.markChokrChannelSeen("temoignages"); } catch (_) {}
    if (contenuLocal) {
      contenuLocal.innerHTML = '<div id="temoignagesApp"></div>';
      contenuLocal.style.display = "block";
      if (typeof initTemoignagesApp === "function") {
        initTemoignagesApp("temoignagesApp");
        try { zcHostPopupHtmlCloseButtonInBar("#temoignagesApp .tm-list-title-bar"); } catch (_) { }
      } else {
        contenuLocal.innerHTML = "<p>Module Témoignages non chargé.</p>";
      }
    }
  } else if (fichierHtmlOuForum === "medias1") {
    if (contenuLocal) {
      contenuLocal.innerHTML = '<div id="medias1App"></div>';
      contenuLocal.style.display = "block";
      const q = (window.__mediasPrefill && typeof window.__mediasPrefill === "object") ? window.__mediasPrefill : {};
      if (typeof window.initMedias1App === "function") {
        window.initMedias1App("medias1App", q);
        try { zcHostPopupHtmlCloseButtonInBar("#medias1App #zcMediasCloseHost"); } catch (_) { }
      } else {
        contenuLocal.innerHTML = "<p>Module Médias non chargé.</p>";
      }
      try { window.__mediasPrefill = null; } catch (_) { }
    }
  } else {
    if (iframe) {
      // NEW: on prépare l’URL (playsinline) et on affiche.
      // Cette fonction est appelée depuis un clic (gesture utilisateur) → pas de warning autoplay.
      var uRaw = String(fichierHtmlOuForum || "");
      const isMedias1 = /(?:^|\/)medias1(?:\.html)?(?:[?#]|$)/i.test(uRaw);
      if (isMedias1 && contenuLocal) {
        contenuLocal.innerHTML = '<div id="medias1App"></div>';
        contenuLocal.style.display = "block";
        let q = {};
        try {
          const urlObj = new URL(uRaw, location.href);
          q = {
            texte: String(urlObj.searchParams.get("texte") || urlObj.searchParams.get("media") || ""),
            media: String(urlObj.searchParams.get("media") || ""),
            docMedia: String(urlObj.searchParams.get("docMedia") || "")
          };
        } catch (_) { }
        if (typeof window.initMedias1App === "function") {
          window.initMedias1App("medias1App", q);
          try { zcHostPopupHtmlCloseButtonInBar("#medias1App #zcMediasCloseHost"); } catch (_) { }
        } else {
          contenuLocal.innerHTML = "<p>Module Médias non chargé.</p>";
        }
      } else {
        iframe.src = prepareUrl(fichierHtmlOuForum);           // NEW
        iframe.style.display = "block";
      }
    }
  }

  // Z-index dynamique : au-dessus de Mes Notes si #afModalOverlay est ouvert
  if (popup) {
    let zApplied = false;
    try {
      if (typeof window.zcZIndexPlaceOverlayAboveCaller === "function") {
        let caller = null;
        try {
          const af = document.getElementById("afModalOverlay");
          if (af) {
            let flex = af.style.display === "flex";
            if (!flex && typeof getComputedStyle === "function") {
              try {
                flex = getComputedStyle(af).display === "flex";
              } catch (_) { }
            }
            if (flex) caller = af;
          }
        } catch (_) { }
        if (caller) {
          window.zcZIndexPlaceOverlayAboveCaller(caller, popup);
        } else if (typeof window.zcBringToFront === "function") {
          window.zcBringToFront(popup, 0);
        } else {
          window.zcZIndexPlaceOverlayAboveCaller(null, popup);
        }
        zApplied = true;
      }
    } catch (_) { }
    if (!zApplied) {
      const zFn = (typeof window.getNextZIndex === "function")
        ? window.getNextZIndex
        : (typeof getNextZIndex === "function" ? getNextZIndex : null);
      const topZ = zFn ? zFn() : 1000;
      popup.style.zIndex = String(topZ);
    }
    popup.style.display = "flex";
    popup.style.pointerEvents = "auto"; // <— important si un style global l’a neutralisé
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    try {
      if (typeof window.zcLowerZoom0Below === "function") window.zcLowerZoom0Below(popup);
    } catch (_) { }
  }

  if (contenuLocal) {
    contenuLocal.style.flex = "1 1 auto";
    contenuLocal.style.minHeight = "0";              // crucial avec flex
    contenuLocal.style.overflow = "auto";
    contenuLocal.style.webkitOverflowScrolling = "touch";
  }

  // (facultatif) si le parent direct est un flex-container, garantir min-height:0
  const parent = contenuLocal && contenuLocal.parentElement;
  if (parent) {
    const cs = getComputedStyle(parent);
    if (cs.display.includes('flex')) {
      parent.style.minHeight = '0';
    }
  }
}

/** Restaure #btnClosePopupHtml dans #popupHtml > .popup-content après hébergement temporaire dans un module */
function zcRestorePopupHtmlHostedCloseButton() {
  const btn = document.getElementById("btnClosePopupHtml");
  if (!btn) return;
  const st = window.__zcPopupHtmlCloseHost;
  if (!st || !st.parent) return;
  try {
    if (st.next && st.next.parentNode === st.parent) st.parent.insertBefore(btn, st.next);
    else st.parent.appendChild(btn);
  } catch (_) {
    try { st.parent.appendChild(btn); } catch (__) { }
  }
  window.__zcPopupHtmlCloseHost = null;
}

/** Déplace #btnClosePopupHtml dans une barre d'en-tête module pour partager la même ligne que le titre */
function zcHostPopupHtmlCloseButtonInBar(barSelector) {
  const btn = document.getElementById("btnClosePopupHtml");
  if (!btn) return;
  const bar = document.querySelector(String(barSelector || ""));
  if (!bar) return;

  // Snapshot unique (évite d'écraser si déjà hébergé)
  if (!window.__zcPopupHtmlCloseHost) {
    const parent = btn.parentNode;
    const next = btn.nextSibling;
    if (parent) window.__zcPopupHtmlCloseHost = { parent, next };
  }

  try { bar.appendChild(btn); } catch (_) { }
}

function fermerPopupHtml() {
  console.log("fermerPopupHtml()");
  /* Arrêt lecture « Lire le texte » en premier : évite timers z-index et synthèse après fermeture. */
  try {
    if (typeof window.zcStopAfModalListenPlayback === "function") window.zcStopAfModalListenPlayback();
  } catch (_) { }
  try {
    if (typeof stopLireTexte === "function") stopLireTexte();
  } catch (_) { }
  try {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  } catch (_) { }

  try {
    if (typeof window.stopForumMessagesListener === "function") window.stopForumMessagesListener();
  } catch (_) { }
  const popup = document.getElementById("popupHtml");
  const iframe = document.getElementById("iframeHtml");
  const contenuLocal = document.getElementById("contenuLocal");
  const forum = document.getElementById("forum-container");
  const btnClosePopupHtml = document.getElementById("btnClosePopupHtml");
  if (btnClosePopupHtml) btnClosePopupHtml.style.display = "";

  // IFRAME : séquence “about:blank” plus fiable sur iOS qu’un src=""
  if (iframe) {
    try { iframe.src = "about:blank"; } catch { }
    iframe.removeAttribute('src');
    iframe.style.display = "none";
  }

  // Forum original (hors popup) — juste au cas où
  if (forum) {
    forum.style.display = "none";
  }

  try { zcRestorePopupHtmlHostedCloseButton(); } catch (_) { }

  // Contenu cloné (forum/warsh/articlesHtml) nettoyé complètement
  if (contenuLocal) {
    try { window.__zcMedias1MountRoot = null; } catch (_) { }
    contenuLocal.innerHTML = "";
    contenuLocal.style.display = "none";
  }

  // Supprimer explicitement tout clone Warsh injecté
  try {
    const cloneWarsh = document.getElementById("options2_clone");
    if (cloneWarsh && cloneWarsh.parentNode) cloneWarsh.parentNode.removeChild(cloneWarsh);
  } catch { }

  // Masquer la popup
  if (popup) {
    popup.classList.remove("zc-popup-html--forum-fullbleed");
    popup.classList.remove("zc-popup-html--iframe-fullbleed");
    popup.style.display = "none";
    try {
      popup.style.removeProperty("z-index");
    } catch (_) { }
  }
  try {
    if (typeof window.zcSyncSessionStackFromDom === "function") {
      window.zcSyncSessionStackFromDom();
    }
  } catch (_) { }
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    try { fermerPopupHtml(); } catch { }
    try { fermerWarshText(); } catch { }
  }
});


// Ouvrir une page Warsh de façon sûre et non bloquante



function moduleWarsh(input) {
  // --- utils ---
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const getDefaultPage = () => {
    let p = (typeof window !== "undefined" && window && window.numPage != null)
      ? parseInt(String(window.numPage), 10)
      : NaN;
    if (!Number.isFinite(p)) p = 1; // repli ultime
    return clamp(p, 1, 604);
  };

  // normalisation: chiffres arabo-indiens/persans -> occidentaux,
  // virgule "," et décimale arabe U+066B "٫" -> "."
  // séparateur milliers arabe U+066C "٬" -> retiré
  const normalize = (s) => {
    s = (s ?? "").toString().trim();
    const ai = "٠١٢٣٤٥٦٧٨٩"; // Arabic-Indic
    const pe = "۰۱۲۳۴۵۶۷۸۹"; // Persian
    s = s
      .replace(/[٠-٩]/g, ch => ai.indexOf(ch))
      .replace(/[۰-۹]/g, ch => pe.indexOf(ch))
      .replace(/\u066B/g, ".")  // "٫"
      .replace(/,/g, ".")       // "3,14" -> "3.14"
      .replace(/\u066C/g, "")   // "٬"
      .replace(/\s+/g, "");
    return s;
  };

  const isNumLiteral = (s) => /^\d+(?:\.\d+)?$/.test(s);

  const safeCall = (fn, args = [], def = null, label = "fn") => {
    try { return (typeof fn === "function") ? fn(...args) : def; }
    catch (e) { console.error(`${label} a échoué:`, e); return def; }
  };

  const readMot = () => {
    const el = document.getElementById("mot");
    return normalize(el ? el.value : "");
  };

  // --- entrée & mode "-1" (priorité au champ #mot) ---
  let rawIn = normalize(input);
  const forceFromMot = (rawIn === "-1"); // appel spécial: priorité à #mot
  let raw = forceFromMot ? readMot() : rawIn;

  // si pas entier/décimal, essayer #mot (si pas déjà fait), sinon "1" (entrée)
  if (!isNumLiteral(raw)) {
    if (!forceFromMot) {
      const fromMot = readMot();
      raw = isNumLiteral(fromMot) ? fromMot : "1";
    } else {
      raw = "1";
    }
  }

  // --- traitement principal ---
  let valRet = null;

  if (raw.includes(".")) {
    // Format sourate.aya, ex: "3.14"
    let [sStr, aStr = "1"] = raw.split(".");
    let soura = parseInt(sStr, 10);
    let aya = parseInt(aStr, 10);

    if (!Number.isFinite(soura)) soura = 1;
    soura = clamp(soura, 1, 114);

    let nbv = safeCall(typeof nbVers !== "undefined" ? nbVers : null, [soura], 286, "nbVers");
    if (!Number.isFinite(nbv) || nbv <= 0) nbv = 286;

    if (!Number.isFinite(aya)) aya = 1;
    aya = clamp(aya, 1, nbv);

    valRet = safeCall(
      typeof demNumPageEtLienPDF !== "undefined" ? demNumPageEtLienPDF : null,
      [soura, aya],
      null,
      "demNumPageEtLienPDF"
    );

    // synchroniser l'input visible (#mot) si on a ajusté les bornes
    const motEl = document.getElementById("mot");
    const normalizedStr = `${soura}.${aya}`;
    if (motEl && motEl.value !== normalizedStr) motEl.value = normalizedStr;

  } else {
    // Format page (ex: "51")
    let pageNum = parseInt(raw, 10);
    if (!Number.isFinite(pageNum)) pageNum = getDefaultPage();
    pageNum = clamp(pageNum, 1, 604);

    valRet = safeCall(
      typeof lireIndexPage !== "undefined" ? lireIndexPage : null,
      [pageNum],
      null,
      "lireIndexPage"
    );
  }

  // --- extraire la page & COERCER en nombre ---
  let pageRaw = null;
  if (Array.isArray(valRet)) {
    pageRaw = valRet[0];              // attendu: "051" ou 51
  } else if (valRet && typeof valRet === "object" && "page" in valRet) {
    pageRaw = valRet.page;            // compat objet {page:..., lien:...}
  } else if (Number.isFinite(valRet)) {
    pageRaw = valRet;                 // au cas où
  }

  let pageNumCoerced = parseInt(String(pageRaw), 10);
  if (!Number.isFinite(pageNumCoerced)) {
    pageNumCoerced = getDefaultPage(); // repli sur window.numPage (borné)
  }
  const page = clamp(pageNumCoerced, 1, 604);

  // --- mise à jour UI (toujours via l'iframe, comme sur PC) ---
  const iframe = document.getElementById("IframePDF");

  if (Number.isFinite(page)) {
    // 1) Ouvrir la popup "warsh" d'abord (le clone est dans le DOM)
    safeCall(typeof ouvrirPopupHtml !== "undefined" ? ouvrirPopupHtml : null, ["warsh"], null, "ouvrirPopupHtml");

    // 2) Ensuite seulement, mettre à jour l'image (dans le clone visible)
    safeCall(typeof MiseAjourIframe !== "undefined" ? MiseAjourIframe : null, [page], null, "MiseAjourIframe");

    // mémoriser la page
    try { if (typeof window !== "undefined") window.numPage = page; } catch (e) { }
    return;
  }


  // échec: masquer proprement
  if (iframe) iframe.style.display = "none";
  const pAv = document.getElementById("pageAvant");
  const pAp = document.getElementById("pageApres");
  const sAv = document.getElementById("souraAvant");
  const sAp = document.getElementById("souraApres");
  if (pAv) pAv.innerHTML = "";
  if (pAp) pAp.innerHTML = "";
  if (sAv) pAv.innerHTML = "";
  if (sAp) pAp.innerHTML = "";
}
// PAGE WARSH



function demNumPageEtLienPDF(numSouraRecherche, numAyaRecherche) {
  // ⚙️ Normalise & borne les entrées
  let sReq = parseInt(normalizeDigits(numSouraRecherche), 10);
  let aReq = parseInt(normalizeDigits(numAyaRecherche), 10);

  if (!Number.isFinite(sReq)) sReq = 1;
  if (!Number.isFinite(aReq)) aReq = 1;

  sReq = Math.min(114, Math.max(1, sReq));
  // borne l’aya avec nbVers(sourate) si dispo
  try {
    if (typeof nbVers === "function") {
      const maxAya = parseInt(normalizeDigits(nbVers(sReq)), 10);
      if (Number.isFinite(maxAya) && maxAya > 0) {
        aReq = Math.min(maxAya, Math.max(1, aReq));
      } else {
        aReq = Math.max(1, aReq);
      }
    } else {
      aReq = Math.max(1, aReq);
    }
  } catch (_) {
    aReq = Math.max(1, aReq);
  }

  // 🔎 Recherche exacte (sourate, aya) dans le tableau
  try {
    const tableau = (typeof fTabVersets === "function") ? fTabVersets() : [];
    for (let i = 0; i < tableau.length; i++) {
      const s = parseInt(normalizeDigits(tableau[i][0]), 10);
      const a = parseInt(normalizeDigits(tableau[i][1]), 10);
      if (s === sReq && a === aReq) {
        const p = clampPage(tableau[i][8]); // "051" / "١٠٦" / 51 → entier 1..604
        if (Number.isFinite(p)) return p;
      }
    }

    // 🛟 Fallback 1 : page minimale pour la sourate
    let minPage = Infinity;
    for (let i = 0; i < tableau.length; i++) {
      const s = parseInt(normalizeDigits(tableau[i][0]), 10);
      if (s !== sReq) continue;
      const p = clampPage(tableau[i][8]);
      if (Number.isFinite(p) && p < minPage) minPage = p;
    }
    if (Number.isFinite(minPage)) return minPage;
  } catch (_) { }

  // 🛟 Fallback 2 : page courante bornée
  let p = clampPage(window.numPage);
  if (Number.isFinite(p)) return p;

  // 🛟 Fallback 3 : 1 par défaut
  return 1;
}



// =================== Firebase Storage (images Warsh) =====================
// On garde un préchargement simple pour valider qu'une URL retourne bien une image.
function tryLoadImage(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const test = new Image();
    const timer = setTimeout(() => { test.src = ""; reject(new Error("timeout")); }, timeout);
    test.onload = () => { clearTimeout(timer); resolve(url); };
    test.onerror = () => { clearTimeout(timer); reject(new Error("error")); };
    test.referrerPolicy = "no-referrer";
    test.src = url;
  });
}

// Résout une URL Firebase "publique" (fichier lisible) en vérifiant qu'elle charge.
function resolveFBImageUrl(url) {
  // Ici, l’URL est déjà finale (alt=media); on se contente de vérifier qu’elle charge.
  if (!url) return Promise.reject(new Error("empty URL"));
  return tryLoadImage(url);
}

// Renvoie le lien image pour la page donnée depuis Firebase Storage.
// 👉 S’appuie sur demLienImgWarshFB(numPage) que tu as déjà défini.
function getLienWarshImage(numPage) {
  const n = clampPage(numPage) || 1;
  return demLienImgWarshFB(n); // ex: https://firebasestorage.googleapis.com/v0/b/.../o/MesDonnes%2Fwarsh%2F001.jpg?alt=media
}
// =========================================================================




// ================== Gestes Warsh (swipe & wheel) ==================
function installWarshGestures(box) {
  if (!box || box.dataset.gesturesInstalled === "1") return;
  box.dataset.gesturesInstalled = "1";

  // --- Anti-rafale & seuils
  let lastTs = 0;
  const DEBOUNCE_MS = 350;   // minimum entre deux changements de page
  const WHEEL_THRESH = 80;   // cumul deltaX pour déclencher
  const SWIPE_MIN = 40;      // pixels min de swipe horizontal
  let accumX = 0;

  // Trackpad / souris (défilement horizontal)
  box.addEventListener("wheel", (e) => {
    // on s'intéresse aux gestes majoritairement horizontaux
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) { accumX = 0; return; }

    accumX += e.deltaX;
    const now = Date.now();
    if (now - lastTs < DEBOUNCE_MS) return;

    if (accumX >= WHEEL_THRESH) {        // scroll → droite (page suivante)
      lastTs = now; accumX = 0;
      try { goWarshDelta(+1); } catch { }
    } else if (accumX <= -WHEEL_THRESH) { // scroll → gauche (page précédente)
      lastTs = now; accumX = 0;
      try { goWarshDelta(-1); } catch { }
    }
  }, { passive: true });

  // Swipe tactile (touch)
  let tStartX = 0, tStartY = 0, tActive = false;
  box.addEventListener("touchstart", (e) => {
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    tActive = true;
    tStartX = t.clientX; tStartY = t.clientY;
  }, { passive: true });

  box.addEventListener("touchend", (e) => {
    if (!tActive) return; tActive = false;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - tStartX;
    const dy = t.clientY - tStartY;

    // Swipe horizontal net (plus grand que vertical, et au-dessus d'un seuil)
    const now = Date.now();
    if (now - lastTs < DEBOUNCE_MS) return;
    if (Math.abs(dx) > Math.max(SWIPE_MIN, Math.abs(dy) * 1.4)) {
      if (dx < 0) {          // doigt vers la gauche → page suivante
        try { goWarshDelta(+1); } catch { }
      } else {               // doigt vers la droite → page précédente
        try { goWarshDelta(-1); } catch { }
      }
      lastTs = now;
    }
  }, { passive: true });
}
// ================================================================





function ensureWarshElements() {
  // Conteneur prioritaire: le clone visible
  const container =
    document.getElementById('options2_clone') ||
    document.getElementById('contenuLocal') ||
    document.body;

  // 🧭 Cadre scrollable qui contiendra lien + images (double buffer)
  let box = container.querySelector('#WarshBox');
  let link = box ? box.querySelector('#WarshLink') : null;

  if (!box) {
    box = document.createElement('div');
    box.id = 'WarshBox';
    // Cadre défilable vertical quasi plein écran dans la popup Warsh
    box.style.display = 'block';            // ⚠️ tjrs actif (pas de masquage)
    box.style.overflow = 'auto';
    box.style.flex = '1 1 auto';
    box.style.minHeight = '0';
    box.style.height = '100%';
    box.style.maxHeight = 'none';
    box.style.width = '100%';
    box.style.boxSizing = 'border-box';
    box.style.padding = '4px';
    box.style.background = 'var(--zc-surface)';
    box.style.border = '1px solid var(--zc-border)';
    box.style.borderRadius = '8px';
    box.style.webkitOverflowScrolling = 'touch'; // iOS inertiel
    box.style.overscrollBehavior = 'contain';
    box.style.touchAction = 'pan-y';
  }

  if (!link) {
    link = document.createElement('a');
    link.id = 'WarshLink';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    link.style.wordBreak = 'break-all';
    link.style.fontSize = '0.95rem';
    link.style.textDecoration = 'underline';
    link.style.margin = '0 0 8px 0';
  }

  // 🖼️ Double buffer : deux <img> (A visible, B offscreen)
  let imgA = box.querySelector('#WarshImgA');
  let imgB = box.querySelector('#WarshImgB');

  const baseImgStyle = (el) => {
    el.loading = 'lazy';
    el.decoding = 'async';
    el.referrerPolicy = 'no-referrer';
    el.style.width = '100%';
    el.style.height = 'auto';
    el.style.objectFit = 'contain';
    el.style.background = 'var(--zc-ui-soft-bg)';
    el.style.minWidth = '320px';
    el.style.minHeight = '480px';
    el.style.borderRadius = '4px';
    el.style.transition = 'opacity 160ms ease';
  };

  if (!imgA) {
    imgA = document.createElement('img');
    imgA.id = 'WarshImgA';
    imgA.alt = 'Warsh';
    baseImgStyle(imgA);
    imgA.style.opacity = '1';
    imgA.style.display = 'none'; // apparaît dès la 1re image
  }
  if (!imgB) {
    imgB = document.createElement('img');
    imgB.id = 'WarshImgB';
    imgB.alt = 'Warsh';
    baseImgStyle(imgB);
    imgB.style.opacity = '0';
    imgB.style.display = 'none';
  }

  // Spinner discret (reste caché sauf 1er chargement sans iframe visible)
  let spinner = box.querySelector('#WarshSpinner');
  if (!spinner) {
    spinner = document.createElement('div');
    spinner.id = 'WarshSpinner';
    spinner.textContent = 'Chargement…';
    spinner.style.display = 'none';
    spinner.style.fontSize = '0.9rem';
    spinner.style.color = 'var(--zc-text-muted)';
    spinner.style.padding = '6px 0';
  }

  // Positionner après l'iframe si possible
  const iframe = container.querySelector('#IframePDF');
  if (iframe && iframe.parentNode) {
    if (!box.parentNode) iframe.parentNode.insertBefore(box, iframe.nextSibling);
  } else if (!box.parentNode) {
    container.appendChild(box);
  }

  if (!link.parentNode) box.appendChild(link);
  if (!imgA.parentNode) box.appendChild(imgA);
  if (!imgB.parentNode) box.appendChild(imgB);
  if (!spinner.parentNode) box.appendChild(spinner);

  // Indique quel buffer est au front
  if (!box.dataset.activeImg) box.dataset.activeImg = 'A';
  // Flag anti double remplacements concurrents
  if (!box.dataset.loading) box.dataset.loading = '0';

  // 👉 Installer les gestes (une seule fois)
  try { installWarshGestures(box); } catch { }

  return { container, box, link, imgA, imgB, spinner };
}




function goWarshDelta(delta) {
  const cur = Number(window.numPage || 1);
  let next = cur + Number(delta || 0);
  if (!Number.isFinite(next)) next = 1;
  next = Math.min(604, Math.max(1, next));
  if (next !== cur) {
    // On réutilise la même logique d’ouverture et de mise à jour
    if (typeof ouvrirPopupHtml === 'function') {
      try { ouvrirPopupHtml('warsh'); } catch (_) { }
    }
    MiseAjourIframe(next);//manque argument numSourat???
  }
}

/* === Helpers nécessaires au bouton “📖 Lire” ============================ */
// Renvoie {soura, aya} pour la page donnée, via lireIndexPage/demNumSourat,
// avec repli par scan de fTabVersets() si besoin.
function getSouraAyaFromPageStrict(page) {
  const p = Math.min(604, Math.max(1, parseInt(page, 10) || 1));

  let aya = 1, soura = 1;
  try {
    if (typeof lireIndexPage === "function") {
      const r = lireIndexPage(p); // [indexPage, numAya]
      if (Array.isArray(r) && Number.isFinite(parseInt(r[1], 10))) {
        aya = parseInt(r[1], 10);
      }
    }
  } catch (_) { }

  try {
    if (typeof demNumSourat === "function") {
      const s = parseInt(demNumSourat(p), 10);
      if (Number.isFinite(s) && s >= 1 && s <= 114) soura = s;
    } else if (typeof safeDemNumSourat === "function") {
      soura = safeDemNumSourat(p);
    }
  } catch (_) { }

  if (!Number.isFinite(soura) || soura < 1 || soura > 114 || !Number.isFinite(aya) || aya < 1) {
    try {
      const t = (typeof fTabVersets === "function") ? fTabVersets() : [];
      for (let i = 0; i < t.length; i++) {
        const row = t[i];
        const pg = Number(row[8]);
        if (pg === p) {
          const s0 = Number(row[0]);
          const a0 = Number(row[1]);
          if (Number.isFinite(s0) && s0 >= 1 && s0 <= 114) soura = s0;
          if (Number.isFinite(a0) && a0 >= 1) aya = a0;
          break;
        }
      }
    } catch (_) { }
  }

  soura = Math.min(114, Math.max(1, parseInt(soura, 10) || 1));
  aya = Math.max(1, parseInt(aya, 10) || 1);
  return { soura, aya };
}

// Ouvre le lecteur texte (popup si dispo) à partir de window.numPage.
function lireDepuisPageCourante(options) {
  const p = Math.min(604, Math.max(1, parseInt(window.numPage, 10) || 1));
  const { soura, aya } = getSouraAyaFromPageStrict(p);

  // Nouveau comportement : lecture popup + surlignage (même moteur que Mes Notes),
  // en lisant tout le texte de la page courante.
  try {
    const table = (typeof fTabVersets === 'function') ? fTabVersets() : [];
    const rows = [];
    for (let i = 0; i < table.length; i++) {
      const row = table[i];
      if (Number(row[8]) !== p) continue; // indexPage
      rows.push(row);
    }
    if (rows.length) {
      rows.sort((a, b) => {
        const sa = Number(a[0]) || 0;
        const sb = Number(b[0]) || 0;
        if (sa !== sb) return sa - sb;
        return (Number(a[1]) || 0) - (Number(b[1]) || 0);
      });
      const pageText = rows
        .map(r => String(r[2] || "").trim()) // texte arabe
        .filter(Boolean)
        .join(" ");
      const langue = (options && options.langueVoix) ? String(options.langueVoix) : 'ar';
      const vitesse = Number(options && options.vitesse);
      const rate = Number.isFinite(vitesse) ? vitesse : 1.0;
      if (pageText) {
        if (typeof window.zcReadTextWithOverlay === 'function') {
          const ok = !!window.zcReadTextWithOverlay(pageText, {
            langTag: langue,
            rate: rate,
            title: 'Lis (Voix IA & Lecture)',
            callerEl: document.getElementById('popupHtml') || null
          });
          if (ok) return;
        }
        if (typeof lireTexte === 'function') {
          lireTexte(pageText, langue, rate);
          return;
        }
      }
    }
  } catch (_) { }

  const opts = Object.assign(
    { langueVoix: 'ar', vitesse: 1.0, useBoundary: true, autoContinue: true },
    options || {},
    { containerId: 'lecteurVersetContent' }
  );

  if (typeof lireCoranPopup === 'function') {
    lireCoranPopup(soura, aya, undefined, opts);
  } else if (typeof litAfficheVerset === 'function') {
    litAfficheVerset(soura, aya, undefined, opts);
  } else {
    console.warn('Lecture texte indisponible (lireCoranPopup / litAfficheVerset).');
  }
}
/* ====================================================================== */


/* ========================== MiseAjourIframe ============================ */
function MiseAjourIframe(numPage, souraOverride) {
  // -- utils
  const toInt = (x) => {
    const ai = "٠١٢٣٤٥٦٧٨٩", pe = "۰۱۲۳۴۵۶۷۸۹";
    const s = String(x ?? "")
      .replace(/[٠-٩]/g, ch => String(ai.indexOf(ch)))
      .replace(/[۰-۹]/g, ch => String(pe.indexOf(ch)));
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : NaN;
  };
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  // -- borne & normalisation
  let p = toInt(numPage);
  if (!Number.isFinite(p)) p = 1;
  p = clamp(p, 1, 604);

  // -- si une sourate override est passée, recalcule la page EXACTE du verset 1
  let sOver = toInt(souraOverride);
  if (Number.isFinite(sOver) && sOver >= 1 && sOver <= 114) {
    try {
      if (typeof demNumPageEtLienPDF === "function") {
        const r = demNumPageEtLienPDF(sOver, 1);
        const raw = Array.isArray(r) ? r[0] : (r && r.page);
        const pExact = toInt(raw);
        if (Number.isFinite(pExact)) p = clamp(pExact, 1, 604);
      }
    } catch (_) { }
  }

  // -- états globaux cohérents
  window.numPage = p;
  if (Number.isFinite(sOver) && sOver >= 1 && sOver <= 114) {
    window.numSourat = sOver;
  } else {
    if (typeof safeDemNumSourat === "function") {
      window.numSourat = safeDemNumSourat(p);
    } else if (typeof demNumSourat === "function") {
      window.numSourat = toInt(demNumSourat(p)) || 1;
    } else {
      window.numSourat = window.numSourat || 1;
    }
  }

  // -- conteneur visible
  const container =
    document.getElementById('options2_clone') ||
    document.getElementById('contenuLocal') ||
    document.body;

  // -- boutons
  const pageAvant = container.querySelector('#pageAvant');
  const pageApres = container.querySelector('#pageApres');
  const souraAvant = container.querySelector('#souraAvant');
  const souraApres = container.querySelector('#souraApres');

  const makeBtn = (delta, icon, label) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = icon;
    btn.title = label;
    btn.ariaLabel = label;
    btn.className = 'zc-warsh-icon-btn';
    btn.onclick = () => goWarshDelta(delta);
    const next = clamp(Number(window.numPage) + delta, 1, 604);
    const disabled = (next === window.numPage);
    if (disabled) { btn.disabled = true; btn.style.opacity = '0.35'; btn.style.cursor = 'not-allowed'; }
    return btn;
  };

  const makeBtnSourat = (deltaS, icon, label) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = icon;
    btn.title = label;
    btn.ariaLabel = label;
    btn.className = 'zc-warsh-icon-btn';
    btn.onclick = () => goWarshDeltaSourat(deltaS);
    const curS = Number(window.numSourat) || 1;
    const nextS = curS + Number(deltaS);
    const disabled = (nextS < 1 || nextS > 114);
    if (disabled) { btn.disabled = true; btn.style.opacity = '0.35'; btn.style.cursor = 'not-allowed'; }
    return btn;
  };

  if (pageAvant) { pageAvant.innerHTML = ''; pageAvant.appendChild(makeBtn(-1, '⏪' + 'p', 'Page précédente')); }
  if (pageApres) { pageApres.innerHTML = ''; pageApres.appendChild(makeBtn(+1, 'p' + '⏩', 'Page suivante')); }
  if (souraAvant) { souraAvant.innerHTML = ''; souraAvant.appendChild(makeBtnSourat(-1, '⏮️' + 'S', 'Sourate précédente')); }
  if (souraApres) { souraApres.innerHTML = ''; souraApres.appendChild(makeBtnSourat(+1, 'S' + '⏭️', 'Sourate suivante')); }

  // -- affichage
  const iframe = container.querySelector('#IframePDF'); // ⚠️ on ne le masque plus tant que la nouvelle image n'est pas prête
  const { box, link, imgA, imgB, spinner } = ensureWarshElements();

  const lienPref = getLienWarshImage(p);
  const titreCourt = `${nomSouraPhon(window.numSourat)} [${window.numSourat}] — p.${p}`;
  const targetPage = p;

  // -- header hôte (où mettre les boutons + lien)
  const hostTitle =
    container.querySelector('#LienExterneIMG') ||
    document.getElementById('LienExterneIMG');

  const buildHeader = (href, textForLink) => {
    if (!hostTitle) return;
    let audioBtn = hostTitle.querySelector('#LienExterneIMG_Audio');
    if (!audioBtn) {
      audioBtn = document.createElement('button');
      audioBtn.id = 'LienExterneIMG_Audio';
      audioBtn.type = 'button';
      audioBtn.className = 'zc-warsh-icon-btn';
      audioBtn.title = 'Écouter la sourate courante';
      audioBtn.innerHTML = '<i class="fas fa-volume-up" aria-hidden="true"></i>';
      hostTitle.insertBefore(audioBtn, hostTitle.firstChild);
    }
    audioBtn.onclick = () => lireAudio(window.numSourat);

    let readBtn = hostTitle.querySelector('#LienExterneIMG_LireTexte');
    if (!readBtn) {
      readBtn = document.createElement('button');
      readBtn.id = 'LienExterneIMG_LireTexte';
      readBtn.type = 'button';
      readBtn.className = 'zc-warsh-icon-btn';
      readBtn.title = 'Lire le texte à partir de la page courante';
      readBtn.innerHTML = '<i class="fas fa-book-reader" aria-hidden="true"></i>';
      hostTitle.insertBefore(readBtn, audioBtn.nextSibling);
    }
    readBtn.onclick = () => lireDepuisPageCourante({
      langueVoix: 'ar',
      vitesse: 1.0,
      useBoundary: true,
      autoContinue: true
    });

    let extA = hostTitle.querySelector('#LienExterneIMG_Link');
    if (!extA) {
      extA = document.createElement('a');
      extA.id = 'LienExterneIMG_Link';
      extA.target = '_blank';
      extA.rel = 'noopener noreferrer';
      hostTitle.appendChild(extA);
    }
    if (href) { extA.href = href; extA.style.pointerEvents = 'auto'; }
    else { extA.removeAttribute('href'); extA.style.pointerEvents = 'none'; }
    extA.textContent = textForLink || '';
  };

  // ⚙️ si un chargement est déjà en cours, on l’ignore (évite les courses)
  if (box.dataset.loading === '1') return;

  (async () => {
    try {
      box.dataset.loading = '1';

      const viewUrl = lienPref; // Firebase alt=media
      buildHeader(viewUrl, `🔗 ${titreCourt}`);

      const hasFront = !!(imgA.getAttribute('src') || imgB.getAttribute('src'));
      // Si aucune image affichée encore, montrer un petit spinner SEULEMENT si l’iframe est vide
      if (!hasFront) {
        if (iframe && iframe.getAttribute('src')) {
          // on laisse l'iframe affichée (page blanche ou contenu précédent)
        } else {
          // pas d’iframe -> petit texte “Chargement…”
          if (spinner) spinner.style.display = 'block';
        }
      }

      // Choix front/back
      const frontId = box.dataset.activeImg === 'B' ? 'B' : 'A';
      const backId = (frontId === 'A') ? 'B' : 'A';
      const front = (frontId === 'A') ? imgA : imgB;
      const back = (backId === 'A') ? imgA : imgB;

      // Précharger via un objet Image “ghost” pour ne JAMAIS toucher à l’affichage
      const ghost = new Image();
      ghost.referrerPolicy = 'no-referrer';

      const doSwap = () => {
        // L’iframe (s’il y en avait une) n’est masquée qu’au moment du swap
        if (iframe) { iframe.style.display = 'none'; /* pas de reset src ici */ }

        // Installer la nouvelle source dans le back buffer
        back.style.display = 'block';
        back.style.opacity = '0';
        back.src = viewUrl;
        back.alt = `Warsh ${titreCourt}`;

        // Crossfade: montrer back, puis masquer front
        requestAnimationFrame(() => {
          back.style.opacity = '1';
          setTimeout(() => {
            if (spinner) spinner.style.display = 'none';
            // Masquer seulement après la transition
            if (front.getAttribute('src')) {
              front.style.opacity = '0';
              // ne pas faire display:none brutalement avant la fin du fondu
              setTimeout(() => { front.style.display = 'none'; front.removeAttribute('src'); }, 60);
            }
            box.dataset.activeImg = backId;
            box.dataset.loading = '0';
            if (box) box.scrollTop = 0;
          }, 170);
        });
      };

      // Préchargement “ghost” (aucun impact visuel tant que non chargé)
      ghost.onload = doSwap;
      ghost.onerror = () => {
        // Échec : on ne touche pas au visuel courant (front/iframe)
        console.warn("Échec chargement image Firebase (précharge) pour la page", p);
        if (spinner) spinner.style.display = 'none';
        box.dataset.loading = '0';
      };
      ghost.src = viewUrl;

    } catch (e) {
      console.warn("Image Firebase inaccessible pour la page", p, e);
      box.dataset.loading = '0';
      // On ne masque rien: on laisse front ou iframe visibles
    }
  })();
}

/* ====================================================================== */


