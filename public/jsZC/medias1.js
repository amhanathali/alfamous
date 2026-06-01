/************************************************************
 * jsZC/medias1.js — module Médias (popup #contenuLocal)
 * - DOM reconstruit à chaque ouverture via initMedias1App
 * - m1El / m1Root : évite les collisions d’id avec index.html (#userForm, …). Champ recherche Médias : #mediaMot (pas #mot).
 ************************************************************/
window.__zcMedias1MountRoot = null;
function m1El(id) {
  const r = window.__zcMedias1MountRoot;
  if (r && r.querySelector) {
    const el = r.querySelector("#" + id);
    if (el) return el;
  }
  return document.getElementById(id);
}
function m1Root() {
  return window.__zcMedias1MountRoot || document.documentElement;
}

function zcMediasSyncMediaMotToMainMot(value) {
  const v = String(value ?? "");
  try {
    const own = document.getElementById("mot");
    if (own) {
      own.value = v;
      try { own.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) { }
      return;
    }
  } catch (_) { }
  try {
    if (window.parent && window.parent !== window && window.parent.document) {
      const p = window.parent.document.getElementById("mot");
      if (p) {
        p.value = v;
        try { p.dispatchEvent(new window.parent.Event("input", { bubbles: true })); } catch (_) { }
      }
    }
  } catch (_) { }
}

function zcMediasUiLang() {
  return String(localStorage.getItem("uiLang") || "fr").toLowerCase();
}
function zcMediasTxt() {
  const L = zcMediasUiLang();
  const D = {
    fr: { actions: "Actions", mediaActionsAria: "Actions sur les médias", detailsAria: "Détail des actions Médias", more: "Plus d’actions", help: "Aide Médias", fav: "Favoris", addFile: "Ajouter fichier", addLink: "Ajouter lien", edit: "Modifier média", del: "Supprimer média", share: "Partager média" },
    en: { actions: "Actions", mediaActionsAria: "Media actions", detailsAria: "Media actions details", more: "More actions", help: "Media help", fav: "Favorites", addFile: "Add file", addLink: "Add link", edit: "Edit media", del: "Delete media", share: "Share media" },
    ar: { actions: "إجراءات", mediaActionsAria: "إجراءات الوسائط", detailsAria: "تفاصيل إجراءات الوسائط", more: "المزيد من الإجراءات", help: "مساعدة الوسائط", fav: "المفضلة", addFile: "إضافة ملف", addLink: "إضافة رابط", edit: "تعديل الوسائط", del: "حذف الوسائط", share: "مشاركة الوسائط" },
    kab: { actions: "Tigawin", mediaActionsAria: "Tigawin n umidya", detailsAria: "Talqayt n tigawin n umidya", more: "Ugar n tigawin", help: "Tallalt Medias", fav: "Inurifen", addFile: "Rnu afaylu", addLink: "Rnu aseɣwen", edit: "Ẓreg amedya", del: "Kkes amedya", share: "Bḍu amedya" },
    es: { actions: "Acciones", mediaActionsAria: "Acciones de medios", detailsAria: "Detalle de acciones de medios", more: "Más acciones", help: "Ayuda de medios", fav: "Favoritos", addFile: "Agregar archivo", addLink: "Agregar enlace", edit: "Editar medio", del: "Eliminar medio", share: "Compartir medio" }
  };
  return D[L] || D.fr;
}

function zcMediasHelpI18n() {
  const L = zcMediasUiLang();
  const D = {
    fr: {
      title: "Aide — Bibliothèque Numérique",
      close: "Fermer l'aide",
      body: [
        "<p><strong>Bibliothèque collaborative :</strong> cette page permet de rechercher, lire et organiser des médias partagés.</p>",
        "<p><strong>Libellés multilingues du projet :</strong></p>",
        "<ul>",
        "<li>مكتبة الوسائط التعاونية — العلم والمعرفة</li>",
        "<li>Médiathèque collaborative — Sciences et connaissances</li>",
        "<li>Collaborative Media Library — Science and Knowledge</li>",
        "<li>Biblioteca multimedia colaborativa — Ciencia y conocimiento</li>",
        "</ul>"
      ].join("")
    },
    en: {
      title: "Help — Media Library",
      close: "Close help",
      body: [
        "<p><strong>Collaborative library:</strong> this page lets you search, play and organize shared media.</p>",
        "<p><strong>Project multilingual labels:</strong></p>",
        "<ul>",
        "<li>مكتبة الوسائط التعاونية — العلم والمعرفة</li>",
        "<li>Médiathèque collaborative — Sciences et connaissances</li>",
        "<li>Collaborative Media Library — Science and Knowledge</li>",
        "<li>Biblioteca multimedia colaborativa — Ciencia y conocimiento</li>",
        "</ul>"
      ].join("")
    },
    ar: {
      title: "مساعدة — مكتبة الوسائط",
      close: "إغلاق المساعدة",
      body: [
        "<p><strong>مكتبة تعاونية:</strong> تتيح هذه الصفحة البحث عن الوسائط المشتركة وقراءتها وتنظيمها.</p>",
        "<p><strong>تسميات المشروع متعددة اللغات:</strong></p>",
        "<ul>",
        "<li>مكتبة الوسائط التعاونية — العلم والمعرفة</li>",
        "<li>Médiathèque collaborative — Sciences et connaissances</li>",
        "<li>Collaborative Media Library — Science and Knowledge</li>",
        "<li>Biblioteca multimedia colaborativa — Ciencia y conocimiento</li>",
        "</ul>"
      ].join("")
    },
    kab: {
      title: "Tallalt — Tamkarḍit n Medias",
      close: "Mdel tallalt",
      body: [
        "<p><strong>Tamkarḍit n umtawa:</strong> asebter-a ad k-yeǧǧ ad tnadiḍ, ad teɣreḍ u ad tesudseḍ imidya yettwabḍan.</p>",
        "<p><strong>Isemyiwen n usenfar s tutlayin yemgaraden:</strong></p>",
        "<ul>",
        "<li>مكتبة الوسائط التعاونية — العلم والمعرفة</li>",
        "<li>Médiathèque collaborative — Sciences et connaissances</li>",
        "<li>Collaborative Media Library — Science and Knowledge</li>",
        "<li>Biblioteca multimedia colaborativa — Ciencia y conocimiento</li>",
        "</ul>"
      ].join("")
    },
    es: {
      title: "Ayuda — Biblioteca de Medios",
      close: "Cerrar ayuda",
      body: [
        "<p><strong>Biblioteca colaborativa:</strong> esta página permite buscar, leer y organizar medios compartidos.</p>",
        "<p><strong>Etiquetas multilingües del proyecto:</strong></p>",
        "<ul>",
        "<li>مكتبة الوسائط التعاونية — العلم والمعرفة</li>",
        "<li>Médiathèque collaborative — Sciences et connaissances</li>",
        "<li>Collaborative Media Library — Science and Knowledge</li>",
        "<li>Biblioteca multimedia colaborativa — Ciencia y conocimiento</li>",
        "</ul>"
      ].join("")
    }
  };
  return D[L] || D.fr;
}

(function () {
  "use strict";

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.ajusterHauteur = function (id) {
    const t = m1El(id);
    if (!t) return;
    const max = 300;
    t.style.maxHeight = max + "px";
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, max) + "px";
    t.style.overflowY = "auto";
  };
  window.hauteurParDefaut = function (id) {
    const t = m1El(id);
    if (t) t.style.height = "60px";
  };

  window.selectDossierFavorisViaChangeEvent = function selectDossierFavorisViaChangeEvent() {
    const sel = m1El("listeSelect");
    if (!sel) return;
    if (![...sel.options].some(function (o) { return o.value === "playlistMedias"; })) {
      const opt = document.createElement("option");
      opt.value = "playlistMedias";
      opt.textContent = "🎯 Favoris";
      sel.add(opt, 0);
    }
    sel.value = "playlistMedias";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    try { sel.focus(); } catch (_) { }
  };

  function mediasBuildDomSkeleton(root, prefill) {
    root.innerHTML = "";
    root.classList.add("zc-medias-module-root");

    const wrap = document.createElement("div");
    wrap.className = "container-center light-background";
    wrap.setAttribute("translate", "no");

    wrap.innerHTML =
      '<div class="topline">' +
        '<div class="zc-forum-head-bar zc-medias-head-bar" role="banner" aria-label="En-tête Médias">' +
          '<button type="button" id="btnMediasHeadCtx" class="zc-forum-shell-help-btn zc-comment-popup-iconbtn zc-popup-ctx-tab"' +
          ' data-zc-opens-selection-ctx="1"' +
          ' aria-label="Menu contextuel" title="Menu contextuel"' +
          ' style="display:inline-flex;align-items:center;justify-content:center;width:var(--zc-popup-head-icon-box);height:var(--zc-popup-head-icon-box);padding:0;margin:0;box-sizing:border-box;line-height:1;">' +
          '<span class="zc-forum-head-ctx-ico" aria-hidden="true"' +
          ' style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;line-height:1;font-size:var(--zc-popup-head-icon-fs);font-weight:700;">☰</span>' +
          '</button>' +
          '<div class="zc-forum-head-title"><span class="zc-forum-page-title" id="zcMediasModuleTitle"><i class="fas fa-laptop" aria-hidden="true"></i> Bibliothèque Numéric @Amha</span></div>' +
          '<span id="zcMediasCloseHost"></span>' +
        '</div>' +
      '</div>' +

      '<div id="formModal" class="modal" aria-hidden="true">' +
        '<div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="formTitle">' +
          '<div class="modal-header">' +
            '<h2 id="formTitle" class="modal-title">Ajouter / Modifier Média</h2>' +
            '<button type="button" class="modal-close" id="closeFormBtn" aria-label="Fermer">×</button>' +
          '</div>' +
          '<form id="userForm" class="form-box" title="">' +
            '<input type="text" id="nameMedia" class="textArea" name="nameMedia" placeholder="Titre">' +
            '<input type="url" id="lienMedia" class="textArea" name="lienMedia" placeholder="Lien" required>' +
            '<textarea id="description" name="description" class="textArea" placeholder="Description" required></textarea>' +
            '<button type="button" class="styled-button" id="okBtn"><i class="fas fa-sign-in-alt"></i> OK</button>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<div id="mediasHelpModal" class="modal" aria-hidden="true">' +
        '<div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="mediasHelpTitle">' +
          '<div class="modal-header">' +
            '<h2 id="mediasHelpTitle" class="modal-title">Aide — Bibliothèque Numéric</h2>' +
            '<button type="button" class="modal-close" id="closeMediasHelpBtn" aria-label="Fermer l\'aide">×</button>' +
          '</div>' +
          '<div id="mediasHelpBody" style="text-align:left;line-height:1.55;color:var(--zc-text);"></div>' +
        '</div>' +
      '</div>' +

      '<div id="zcMediasMetaToolbar" class="toolbar zc-medias-meta-toolbar" style="margin:2px 0 0;display:flex;align-items:center;gap:8px;">' +
        '<div id="nombreLiens" style="font-size:16px;color:var(--zc-accent);flex:1 1 auto;"></div>' +
        '<button type="button" class="menu-button active zc-top-action-btn" id="btnMediasInlineME" data-zc-pref-toggle="me" title="Mot entier" aria-label="Mot entier" style="border:none;background:transparent;box-shadow:none;padding:2px 2px;min-width:auto;"><span class="zc-module-tab-short-label">ME</span></button>' +
        '<button type="button" class="menu-button active zc-top-action-btn" id="btnMediasInlineMC" data-zc-pref-toggle="mc" title="Mots contigus" aria-label="Mots contigus" style="border:none;background:transparent;box-shadow:none;padding:2px 2px;min-width:auto;"><span class="zc-module-tab-short-label">MC</span></button>' +
      '</div>' +

      '<div id="SelecteurMedias" style="position:relative;width:100%;">' +
        '<div class="zc-search-wrap zc-search-wrap--textarea">' +
        '<button id="clearmot" type="button" class="zc-search-clear is-hidden" title="Effacer" aria-label="Effacer">&#10006;</button>' +
        '<textarea id="mediaMot" placeholder="Rechercher Média" class="textArea zc-ui-search-field" style="width:100%;">' +
          escHtml(prefill || "") +
        '</textarea>' +
        '<button type="button" class="zc-search-go" disabled tabindex="-1" aria-hidden="true" title="Recherche">' +
          '<i class="fas fa-search" aria-hidden="true"></i>' +
        '</button>' +
        '</div>' +
        '<ul id="suggestionsMedias" class="suggestions-liste" style="display:none;"></ul>' +
      '</div>' +

      '<div id="mediaContainer" class="toolbar zc-medias-layout-root" style="text-align:center;margin-top:2px;display:flex;justify-content:center;align-items:center;flex-direction:column;">' +
        '<div id="conteneurBtn" class="toolbar1 zc-medias-actions-hiddenbar" style="display:flex;align-items:center;justify-content:center;background:var(--zc-ui-soft-bg);padding:10px;border-radius:5px;">' +
          '<button id="btnAddFile" class="styled-button" style="display:none;" type="button" aria-label="Ajouter un fichier">+<i class="fas fa-file-upload" style="margin:0 6px 0 6px;" aria-hidden="true"></i></button>' +
          '<input id="inputAddFile" type="file" style="display:none;" />' +
          '<button id="addLinkButton" class="styled-button" type="button" title="Ajouter un lien vers une ressource externe" style="margin-left:10px;"><i class="fas fa-link"></i>+https</button>' +
          '<button id="modifierMediaButton" class="styled-button" type="button" title="Modifier le titre ou la description du média selectionné" style="margin-left:10px;"><i class="fas fa-pencil-alt"></i></button>' +
          '<button id="deleteLinkButton" class="delete-button" type="button" title="Supprimer le média selectionné" style="margin-left:10px;"><i class="fas fa-trash"></i></button>' +
          '<button id="partagerMedia" class="bouton" type="button" title="Copier le lien vers le media en cours"><i class="fas fa-share-square"></i></button>' +
          '&nbsp;&nbsp;<i id="iconHeart" class="fas fa-heart" role="button" tabindex="0" style="cursor:pointer"></i>' +
        '</div>' +

        '<div class="toolbar zc-medias-frame zc-medias-frame-favoris">' +
          '<select id="listeSelect"><option value="playlistMedias">🎯 Favoris</option></select>' +
          '<div id="mediaLien" class="toolbar" style="margin:2px;font-size:12px;color:var(--zc-accent);"></div>' +
          '<div class="bouton" style="display:none;"><p id="mediaDescription2">En attente de lecture...</p></div>' +
        '</div>' +

        '<div class="toolbar zc-medias-frame zc-medias-frame-nav">' +
          '<button class="bouton" type="button" id="btnPrevPl">⏮</button>' +
          '<input class="bouton index-4ch" type="text" id="indexInputVisible" inputmode="numeric" pattern="\\d{1,4}" maxlength="4" placeholder="0000" value="0" autocomplete="off" aria-label="Index (4 chiffres max)" />' +
          '<button class="bouton" type="button" id="btnGoIdx">🔍</button>' +
          '<button class="bouton" type="button" id="btnNextPl">⏭</button>' +
          '<label id="mediaPrivacyRow" class="af-private-row zc-medias-private-row" title="Statut de visibilité du média courant">' +
            '<input type="checkbox" id="mediaPrivateToggle" />' +
            '<span id="mediaPrivateLabel" class="af-modal-private-label" aria-live="polite">Public</span>' +
          '</label>' +
        '</div>' +

        '<div class="zc-medias-frame zc-medias-frame-viewer">' +
          '<iframe id="mediaIframe" src="" width="100%" height="300" frameborder="0" scrolling="auto" referrerpolicy="no-referrer" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write" allowfullscreen title="Lecteur multimédia"></iframe>' +
        '</div>' +
        '<div id="mediaDescription" class="toolbar zc-medias-frame zc-medias-frame-desc" style="margin-top:10px;font-size:16px;color:var(--zc-accent);"></div>' +
      '</div>';

    root.appendChild(wrap);

    const mediaMot = wrap.querySelector("#mediaMot");
    if (mediaMot) {
      mediaMot.addEventListener("input", function () {
        zcMediasSyncMediaMotToMainMot(mediaMot.value || "");
        if (typeof rechercherMedia === "function") rechercherMedia();
      });
      mediaMot.addEventListener("focus", function () { if (typeof rechercherMedia === "function") rechercherMedia(); });
    }
    const clr = wrap.querySelector("#clearmot");
    if (clr) clr.addEventListener("click", function () { if (typeof clearSearch === "function") clearSearch(); });
    if (mediaMot && clr && typeof window.bindSearchClearVisibility === "function") {
      window.bindSearchClearVisibility(mediaMot, clr);
    }

    const addL = wrap.querySelector("#addLinkButton");
    if (addL) addL.addEventListener("click", function () { if (typeof ajouterMediaLien === "function") ajouterMediaLien(); });
    const modB = wrap.querySelector("#modifierMediaButton");
    if (modB) modB.addEventListener("click", function () { if (typeof modifierMedia === "function") modifierMedia(); });
    const delB = wrap.querySelector("#deleteLinkButton");
    if (delB) delB.addEventListener("click", function () { if (typeof supprimerMedia === "function") supprimerMedia(); });

    const sel = wrap.querySelector("#listeSelect");
    if (sel) sel.addEventListener("change", function () { if (typeof changerListe === "function") changerListe(); });

    const bPrev = wrap.querySelector("#btnPrevPl");
    if (bPrev) bPrev.addEventListener("click", function () { if (typeof precedentPlayListe === "function") precedentPlayListe(); });
    const bNext = wrap.querySelector("#btnNextPl");
    if (bNext) bNext.addEventListener("click", function () { if (typeof suivantPlayListe === "function") suivantPlayListe(); });
    const bGo = wrap.querySelector("#btnGoIdx");
    if (bGo) bGo.addEventListener("click", function () { if (typeof allerAIndex === "function") allerAIndex(); });
    const mediaPriv = wrap.querySelector("#mediaPrivateToggle");
    if (mediaPriv) {
      mediaPriv.addEventListener("change", function () {
        if (typeof zcMediasOnPrivacyToggleChange === "function") zcMediasOnPrivacyToggleChange();
      });
    }
    try { zcMediasSyncPrivacyFromDoc(null, null); } catch (_) { }

    const heart = wrap.querySelector("#iconHeart");
    if (heart) {
      heart.addEventListener("click", function () {
        if (typeof window.selectDossierFavorisViaChangeEvent === "function") window.selectDossierFavorisViaChangeEvent();
      });
      heart.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (typeof window.selectDossierFavorisViaChangeEvent === "function") window.selectDossierFavorisViaChangeEvent();
        }
      });
    }
    const descTa = wrap.querySelector("#description");
    if (descTa) {
      descTa.addEventListener("input", function () { if (typeof ajusterHauteur === "function") ajusterHauteur("description"); });
      descTa.addEventListener("click", function () { if (typeof ajusterHauteur === "function") ajusterHauteur("description"); });
      descTa.addEventListener("blur", function () { if (typeof hauteurParDefaut === "function") hauteurParDefaut("description"); });
    }

    window.showMediasHelp = function showMediasHelp() {
      const modal = m1El("mediasHelpModal");
      const body = m1El("mediasHelpBody");
      const title = m1El("mediasHelpTitle");
      const closeBtn = m1El("closeMediasHelpBtn");
      if (!modal || !body) return false;
      try {
        if (typeof window.getNextZIndex === "function") {
          const z = Number(window.getNextZIndex()) || 2;
          modal.style.zIndex = String(z);
          const card = modal.querySelector(".modal-content");
          if (card) card.style.zIndex = String(z + 1);
        }
        if (typeof window.zcBringToFront === "function") {
          window.zcBringToFront(modal, 0);
        }
      } catch (_) { }
      const H = zcMediasHelpI18n();
      if (title) title.textContent = H.title;
      if (closeBtn) closeBtn.setAttribute("aria-label", H.close);
      body.innerHTML = H.body;
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
      return false;
    };
    window.hideMediasHelp = function hideMediasHelp() {
      const modal = m1El("mediasHelpModal");
      if (!modal) return;
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    };

    const headCtxBtn = wrap.querySelector("#btnMediasHeadCtx");
    if (headCtxBtn) {
      headCtxBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (typeof window.zcMediasOpenCtxMenuFromButton === "function") {
          window.zcMediasOpenCtxMenuFromButton(headCtxBtn);
        }
      });
    }
  }

  window.initMedias1App = function initMedias1App(hostEl, prefillInput) {
    const host = (typeof hostEl === "string") ? document.getElementById(hostEl) : hostEl;
    if (!host) return;

    window.__zcMedias1MountRoot = host;

    const q = (prefillInput && typeof prefillInput === "object") ? prefillInput : { texte: String(prefillInput || "") };
    try {
      window.__mediasEmbeddedQuery = {
        texte: String(q.texte || ""),
        media: String(q.media || ""),
        docMedia: String(q.docMedia || "")
      };
    } catch (_) { }

    const prefill = String(q.texte || q.media || "");
    mediasBuildDomSkeleton(host, prefill);
  try { if (typeof window.syncParamTogglesChrome === "function") window.syncParamTogglesChrome(); } catch (_) { }

    var run = window.__zcMedias1RunBootstrap;
    if (typeof run !== "function") {
      console.error("[medias1] __zcMedias1RunBootstrap manquant");
      return;
    }
    Promise.resolve()
      .then(function () { return run(); })
      .catch(function (e) { console.error(e); });
  };
})();

// Firebase : initializeApp dans jsZC/firebase-local-init.js (index.html).
if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
  console.error('Firebase: initialisation manquante. Vérifiez jsZC/firebase-local-init.js après les SDK.');
}

// Firestore : même instance que connexion.js / forum.js (`const db` dans com12.js) pour éviter tout décalage.
const zcMedias1Db = (typeof db !== "undefined" && db) ? db : firebase.firestore();

// Fallback d'alerte pour le mode intégré (iframe srcdoc) où alertMsgBoxPopup
// peut ne pas être injecté par la page hôte.
if (typeof window.alertMsgBoxPopup !== "function") {
  window.alertMsgBoxPopup = function (msg) {
    const text = String(msg ?? "");
    try {
      if (window.parent && window.parent !== window && typeof window.parent.alertMsgBoxPopup === "function") {
        window.parent.alertMsgBoxPopup(text);
        return;
      }
    } catch (_) { }
    try { window.alert(text); } catch (_) { }
  };
}
var alertMsgBoxPopup = window.alertMsgBoxPopup;

/* ---------- Contexte utilisateur ---------- */
var nameUser = localStorage.getItem('nameUser') || "anonyme";
var mailUser = localStorage.getItem('mailUser') || "anonyme@blog.alfamous.ca";
var niveauUser = Number(localStorage.getItem('niveauUser') || 0);
window.nameUser = nameUser;
window.mailUser = mailUser;
window.niveauUser = niveauUser;

/** localStorage indique un compte « réel » : on attend la restauration Auth avant signInAnonymously (évite session anonyme fantôme). */
function zcMedias1LocalProfileSuggestsRestoringAuth() {
  try {
    const m = String(localStorage.getItem("mailUser") || "").trim().toLowerCase();
    if (!m) return false;
    if (m === "anonyme@blog.alfamous.ca") return false;
    if (typeof zcIsAnonymeCourriel === "function" && zcIsAnonymeCourriel(m)) return false;
    return true;
  } catch (_) { return false; }
}

async function zcMedias1WaitForRestoredFirebaseUser(auth, maxWaitMs) {
  const max = Math.max(0, Number(maxWaitMs) || 5000);
  const step = 150;
  for (var elapsed = 0; elapsed < max; elapsed += step) {
    if (auth.currentUser) return auth.currentUser;
    try {
      if (typeof auth.authStateReady === "function") await auth.authStateReady();
    } catch (_) { }
    if (auth.currentUser) return auth.currentUser;
    await new Promise(function (r) { setTimeout(r, step); });
  }
  return auth.currentUser || null;
}

// Firestore exige request.auth != null pour les écritures. Connexion e-mail (connexion.js) ou anonyme.
// Cette promesse DOIT être attendue avant chaque set/update FavorisMedias (sinon « Missing or insufficient permissions »).
window.__zcMedias1AuthPromise = (async function zcMedias1EnsureFirestoreAuthOnce() {
  try {
    if (typeof window.__zcAuthReady !== "undefined" && window.__zcAuthReady) {
      await window.__zcAuthReady;
    }
  } catch (e) {
    console.warn("[medias] attente __zcAuthReady:", e);
  }
  try {
    const auth = firebase.auth();
    if (typeof auth.authStateReady === "function") {
      try { await auth.authStateReady(); } catch (_) { }
    }
    if (auth.currentUser) return auth.currentUser;
    if (zcMedias1LocalProfileSuggestsRestoringAuth()) {
      const restored = await zcMedias1WaitForRestoredFirebaseUser(auth, 6000);
      if (restored) return restored;
    }
    await auth.signInAnonymously();
    return auth.currentUser;
  } catch (e) {
    console.warn(
      "[medias] Pas de session Firebase — écritures Firestore refusées. Activez « Anonyme » dans Authentication (Firebase) ou connectez-vous via « Connexion ».",
      e && (e.code || e.message || e)
    );
    return null;
  }
})();

/** Attendre l’auth Médias + optionnellement __zcAuthReady ; retourne currentUser ou null. */
async function zcMedias1AwaitFirebaseUserForWrite(opts) {
  const forceToken = !!(opts && opts.forceIdToken);
  try {
    if (window.__zcMedias1AuthPromise) await window.__zcMedias1AuthPromise;
  } catch (_) { }
  try {
    if (typeof window.__zcAuthReady !== "undefined" && window.__zcAuthReady) {
      await window.__zcAuthReady;
    }
  } catch (_) { }
  try {
    const auth = firebase.auth();
    if (typeof auth.authStateReady === "function") {
      try { await auth.authStateReady(); } catch (_) { }
    }
    let u = auth.currentUser;
    if (!u && zcMedias1LocalProfileSuggestsRestoringAuth()) {
      u = await zcMedias1WaitForRestoredFirebaseUser(auth, 4000);
    }
    if (!u) {
      try {
        await auth.signInAnonymously();
      } catch (_) { }
      u = auth.currentUser;
    }
    if (u && typeof u.getIdToken === "function") {
      try {
        await u.getIdToken(forceToken);
      } catch (e) {
        console.warn("[medias] getIdToken:", e && (e.code || e.message || e));
      }
    }
    zcMedias1RefreshGlobalsFromSession();
    return u || null;
  } catch (e) {
    console.warn("[medias] zcMedias1AwaitFirebaseUserForWrite:", e && (e.code || e.message || e));
    return null;
  }
}

/** Remet nameUser / mailUser / niveauUser alignés sur window puis localStorage (connexion.js met à jour les deux après login). */
function zcMedias1RefreshGlobalsFromSession() {
  try {
    if (typeof window.nameUser === "string" && window.nameUser.trim()) nameUser = window.nameUser.trim();
    else { const n = localStorage.getItem("nameUser"); if (n != null && String(n).trim()) nameUser = String(n).trim(); }
    if (typeof window.mailUser === "string" && window.mailUser.trim()) mailUser = window.mailUser.trim();
    else { const mm = localStorage.getItem("mailUser"); if (mm != null && String(mm).trim()) mailUser = String(mm).trim(); }
    if (window.niveauUser != null && !Number.isNaN(Number(window.niveauUser))) niveauUser = Number(window.niveauUser);
    else { const nv = localStorage.getItem("niveauUser"); if (nv != null && String(nv).trim() !== "") niveauUser = Number(nv) || 0; }
    window.nameUser = nameUser;
    window.mailUser = mailUser;
    window.niveauUser = niveauUser;
  } catch (_) { }
}

/** ID document FavorisMedias : e-mail Firebase Auth si présent, sinon mailUser (ex. anonyme + doc hérité). */
function zcMedias1FavorisDocId() {
  zcMedias1RefreshGlobalsFromSession();
  try {
    const cu = firebase.auth && firebase.auth().currentUser;
    if (cu && cu.email && String(cu.email).trim()) return String(cu.email).trim();
  } catch (_) { }
  return mailUser && String(mailUser).trim() ? String(mailUser).trim() : "";
}

try { window.mediaStorageRef = firebase.storage().ref("MesMedias"); }
catch (e) { console.error("Storage non initialisé:", e); }

/* ---------- Helpers communs (dé-dupliqués) ---------- */
function extFromName(name = '') { const m = /\.([^.?#/\\]+)(?:[?#].*)?$/i.exec(name); return m ? m[1].toLowerCase() : ''; }
function storageFolderFor(ext = '', mime = '') {
  const e = (ext || '').toLowerCase(), m = (mime || '').toLowerCase();
  const is = (xs) => xs.includes(e) || xs.some(x => m.includes(x));
  if (is(['mp3', 'wav', 'm4a', 'flac', 'ogg', 'audio'])) return 'audio';
  if (is(['mp4', 'webm', 'mkv', 'mov', 'm3u8', 'video'])) return 'video';
  if (is(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'image'])) return 'images';
  if (is(['pdf'])) return 'pdf';
  if (is(['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md', 'rtf', 'application/msword', 'officedocument', 'text'])) return 'docs';
  return 'autres';
}
// escapeHtml : fourni globalement par jsZC/zc-utils.js (chargé avant ce fichier).
/* ---------- Refresh UI : helper factorisé (remplace les blocs verbeux) ---------- */
let __uiRefreshTimer = null, __uiRefreshPending = null;
async function requestUIRefresh(opts = { keepCurrentIndex: true }, { debounce = true, delay = 120 } = {}) {
  if (typeof refreshAllListsAndUI !== "function") return;
  if (!debounce) return await refreshAllListsAndUI(opts);
  __uiRefreshPending = { ...(__uiRefreshPending || {}), ...opts };
  clearTimeout(__uiRefreshTimer);
  __uiRefreshTimer = setTimeout(async () => {
    const o = __uiRefreshPending || { keepCurrentIndex: true };
    __uiRefreshPending = null; __uiRefreshTimer = null;
    try { await refreshAllListsAndUI(o); } catch (e) { console.warn("requestUIRefresh:", e); }
  }, delay);
}

/* ---------- Recherche / suggestions ---------- */
async function rechercherMedia() {
  zcMedias1RefreshGlobalsFromSession();
  tryMajIndexDepuisLien(mediaLinkOriginel);

  const rawSearch = (m1El('mediaMot')?.value || '').trim();
  const searchTerm = zcMediasNormalizeSearchText(rawSearch);
  const prefs = zcMediasGetSearchPrefs();
  const suggestionsList = m1El('suggestionsMedias');
  if (suggestionsList) { suggestionsList.innerHTML = ''; suggestionsList.style.display = 'none'; }

  try {
    const snap = await zcMedias1Db.collection("LiensMedias").get();
    const matched = [];
    let totalDocs = 0;
    snap.forEach(doc => {
      const d = doc.data() || {};
      if (!zcMediasCanAccessDoc(d)) return;
      totalDocs++;
      const t = d.timestamp ? (d.timestamp.seconds * 1000 + Math.floor((d.timestamp.nanoseconds || 0) / 1e6)) : 0;
      if (!searchTerm || zcMediasMatchesByPrefs((d.mediaName || '') + ' ' + (d.description || ''), searchTerm, prefs)) {
        matched.push({ mediaName: d.mediaName || '(sans titre)', link: d.lien, description: d.description || 'Sans description', timestamp: t });
      }
    });

    /* Tri unique : plus récent en premier (l’ancienne UI de tri a été retirée). */
    matched.sort((A, B) => (B.timestamp || 0) - (A.timestamp || 0));

    const elCount = m1El("nombreLiens");
    if (elCount) elCount.textContent = ` Médias trouvés : ${matched.length} / ${totalDocs}`;

    if (!matched.length) return;
    if (!suggestionsList) return;
    matched.forEach((m, i) => {
      const li = document.createElement('li');
      const clip = (s) => (s || '').length > 100 ? (s || '').slice(0, 100) + '...' : (s || '');
      const line = `${clip(m.mediaName)} (${clip(m.description)})`;
      li.innerHTML = zcMediasHighlightByPrefs(line, rawSearch, prefs);
      li.style.cssText = 'padding:10px;cursor:pointer;';
      li.style.backgroundColor = (i % 2 === 0 ? 'var(--zc-surface)' : 'var(--zc-ui-soft-bg)');
      li.onmouseover = () => li.style.backgroundColor = 'var(--zc-hover-bg)';
      li.onmouseout = () => li.style.backgroundColor = (i % 2 === 0 ? 'var(--zc-surface)' : 'var(--zc-ui-soft-bg)');
      li.onclick = () => afficherDepuisSuggestion(m.mediaName, m.link, m.description);
      suggestionsList.appendChild(li);
    });
    suggestionsList.style.display = 'block';
  } catch (e) { console.error("Recherche Firestore :", e); }
}

function clearSearch() {
  const el = m1El("mediaMot");
  if (!el) return;
  el.value = "";
  try {
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } catch (_) {}
}

function zcMediasGetSearchPrefs() {
  if (typeof window.zcGetSearchPrefs === "function") {
    try { return window.zcGetSearchPrefs(); } catch (_) { }
  }
  return { me: false, mc: false };
}

function zcMediasNormalizeSearchText(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function zcMediasContainsWholeWord(haystack, needle) {
  const n = String(needle || "").trim();
  if (!n) return false;
  const re = new RegExp("(^|[^\\p{L}\\p{N}_])" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^\\p{L}\\p{N}_])", "iu");
  return re.test(String(haystack || ""));
}

function zcMediasMatchesByPrefs(haystack, query, prefs) {
  const text = zcMediasNormalizeSearchText(haystack);
  const q = zcMediasNormalizeSearchText(query);
  if (!q) return true;
  const meOn = !!(prefs && prefs.me);
  const mcOn = !!(prefs && prefs.mc);
  if (mcOn) return meOn ? zcMediasContainsWholeWord(text, q) : text.includes(q);
  const tokens = q.split(/\s+/).map((t) => t.trim()).filter(Boolean);
  if (!tokens.length) return true;
  if (meOn) return tokens.every((t) => zcMediasContainsWholeWord(text, t));
  return tokens.every((t) => text.includes(t));
}

function zcMediasEscHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function zcMediasHighlightByPrefs(text, query, prefs) {
  const src = String(text || "");
  const q = String(query || "").trim();
  if (!src || !q) return zcMediasEscHtml(src);
  const meOn = !!(prefs && prefs.me);
  const mcOn = !!(prefs && prefs.mc);
  const terms = mcOn ? [q] : Array.from(new Set(q.split(/\s+/).map((t) => t.trim()).filter(Boolean)));
  let out = zcMediasEscHtml(src);
  for (const term of terms) {
    if (!term) continue;
    const safe = zcMediasEscHtml(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = meOn
      ? new RegExp("(^|[^\\p{L}\\p{N}_])(" + safe + ")(?=$|[^\\p{L}\\p{N}_])", "giu")
      : new RegExp("(" + safe + ")", "gi");
    if (meOn) {
      out = out.replace(rx, (_m, g1, g2) =>
        String(g1 || "") +
        '<span class="zc-term-hit" style="background:#fff2a8;border-radius:3px;padding:0 1px;">' +
        String(g2 || "") +
        "</span>"
      );
    } else {
      out = out.replace(rx, (_m, g1) =>
        '<span class="zc-term-hit" style="background:#fff2a8;border-radius:3px;padding:0 1px;">' +
        String(g1 || "") +
        "</span>"
      );
    }
  }
  return out;
}

if (!window.__zcMediasPrefsListenerBound) {
  window.__zcMediasPrefsListenerBound = true;
  window.addEventListener("zc:search-prefs-changed", function () {
    if (!m1El("mediaMot")) return;
    try { rechercherMedia(); } catch (_) { }
    try { if (typeof window.syncParamTogglesChrome === "function") window.syncParamTogglesChrome(); } catch (_) { }
  });
}

/* ---------- Favoris : nullify + helpers ---------- */
async function nullifyInCurrentUserFavorites(link) {
  if (!mailUser || !link) return;
  try {
    const u = await zcMedias1AwaitFirebaseUserForWrite();
    if (!u) return;
    const ref = zcMedias1Db.collection("FavorisMedias").doc(zcMedias1FavorisDocId());
    const snap = await ref.get(); if (!snap.exists) return;
    const data = snap.data() || {}; const liste = Array.isArray(data.listeFavoris) ? data.listeFavoris.slice() : [];
    let changed = false; for (let i = 0; i < liste.length; i++) { if (liste[i] === link) { liste[i] = null; changed = true; } }
    if (changed) { await ref.set({ listeFavoris: liste }, { merge: true }); try { localStorage.setItem("playlistMedias", JSON.stringify(liste)); } catch { } }
  } catch (e) { console.warn("nullifyInCurrentUserFavorites:", e?.message || e); }
}

/* ---------- Bouton partager ---------- */
function ajouterGestionnaireBouton(docId) {
  const btn = m1El('partagerMedia'); if (!btn) return;
  btn.onclick = function () {
    zcMediasTmpMsg((currentMediaDocId && docId && currentMediaDocId === docId && currentMediaIsPrivate) ? "Lien copie (prive)." : "Lien copie (public).", "green", 2000);
    copierTexte('https://alfamous.ca?prog=medias1&docMedia=' + docId);
  };
}

/* ---------- Affichage média ---------- */
var mediaLinkOriginel = ""; let __MEDIA_SEQ__ = 0, __PLAY_SEQ__ = 0;
let currentMediaDocId = null;
let currentMediaIsPrivate = false;

function zcMediasDocIsPrivate(d) {
  return !!(d && d.isPrivate === true);
}

function zcMediasIsDocOwner(d) {
  zcMedias1RefreshGlobalsFromSession();
  const ownerName = String((d && d.nameUser) || "").trim().toLowerCase();
  const ownerMail = String((d && (d.ownerMail || d.mailUser)) || "").trim().toLowerCase();
  const meName = String(nameUser || "").trim().toLowerCase();
  const meMail = String(mailUser || "").trim().toLowerCase();
  return (!!ownerMail && ownerMail === meMail) || (!!ownerName && ownerName === meName);
}

function zcMediasCanAccessDoc(d) {
  if (!d) return false;
  if (!zcMediasDocIsPrivate(d)) return true; // ancien format sans isPrivate => public
  if (Number(niveauUser || 0) >= 3) return true;
  return zcMediasIsDocOwner(d);
}

function zcMediasCurrentWantedPrivacy() {
  const cb = m1El("mediaPrivateToggle");
  return !!(cb && cb.checked);
}

function zcMediasTmpMsg(message, color = "green", ms = 2200) {
  if (typeof window.alertMsgBoxTemp === "function") {
    window.alertMsgBoxTemp(String(message || ""), color, ms);
    return;
  }
  alertMsgBoxPopup(String(message || ""));
}

function zcMediasSyncPrivacyLabelAndState(canEdit) {
  const cb = m1El("mediaPrivateToggle");
  const label = m1El("mediaPrivateLabel");
  const row = m1El("mediaPrivacyRow");
  if (!cb || !label) return;
  label.textContent = cb.checked ? "Privé" : "Public";
  cb.disabled = !canEdit;
  if (row) row.style.opacity = canEdit ? "1" : "0.78";
  const baseTitle = cb.checked ? "Privé (visible seulement par vous)" : "Public (visible par tous)";
  cb.title = canEdit ? baseTitle : (baseTitle + " — vous ne pouvez pas modifier ce média");
  label.title = cb.title;
}

function zcMediasSyncPrivacyFromDoc(d, docId) {
  const cb = m1El("mediaPrivateToggle");
  currentMediaDocId = docId || null;
  currentMediaIsPrivate = zcMediasDocIsPrivate(d);
  if (cb) cb.checked = currentMediaIsPrivate;
  const canEdit = !!d && (Number(niveauUser || 0) >= 3 || zcMediasIsDocOwner(d));
  zcMediasSyncPrivacyLabelAndState(canEdit && !!docId);
}

async function zcMediasOnPrivacyToggleChange() {
  const cb = m1El("mediaPrivateToggle");
  if (!cb) return;
  if (!currentMediaDocId) {
    cb.checked = currentMediaIsPrivate;
    zcMediasSyncPrivacyLabelAndState(false);
    return;
  }
  const next = !!cb.checked;
  try {
    const ref = zcMedias1Db.collection("LiensMedias").doc(currentMediaDocId);
    const snap = await ref.get();
    if (!snap.exists) { throw new Error("Document introuvable"); }
    const d = snap.data() || {};
    if (!(Number(niveauUser || 0) >= 3 || zcMediasIsDocOwner(d))) {
      cb.checked = currentMediaIsPrivate;
      zcMediasSyncPrivacyLabelAndState(false);
      alertMsgBoxPopup("Vous ne pouvez pas modifier la visibilité de ce média.");
      return;
    }
    const u = await zcMedias1EnsureAuthForMediaWrite("pour modifier le statut privé/public");
    if (!u) {
      cb.checked = currentMediaIsPrivate;
      zcMediasSyncPrivacyLabelAndState(true);
      return;
    }
    await zcMedias1WriteWithAuthRetry(function () {
      return ref.update({
        isPrivate: next,
        ownerMail: String(mailUser || ""),
        nameUser: String(nameUser || d.nameUser || ""),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    currentMediaIsPrivate = next;
    zcMediasSyncPrivacyLabelAndState(true);
    zcMediasTmpMsg(next ? "Statut: Prive." : "Statut: Public.", "green", 1800);
    await requestUIRefresh({ keepCurrentIndex: true });
  } catch (e) {
    cb.checked = currentMediaIsPrivate;
    zcMediasSyncPrivacyLabelAndState(true);
    alertMsgBoxPopup("Erreur lors de la mise à jour du statut du média.");
    console.error("privacy toggle:", e);
  }
}





// Remplace entièrement afficherMedia par cette version
/* ===========================
   EMBED / LECTEUR — COMPLET
   =========================== */

// Séquence pour éviter les courses entre chargements
window.__MEDIA_SEQ__ = window.__MEDIA_SEQ__ || 0;

// ————————————————————————————
// Conversion générique d’un lien “page” vers un lien “embed” (si possible)



/* ===========================
   EMBED / LECTEUR — COMPLET (VERSION FINALE)
   =========================== */

// Séquence pour éviter les courses entre chargements
window.__MEDIA_SEQ__ = window.__MEDIA_SEQ__ || 0;

/** Conversion générique d’un lien page -> lien “embed” (Drive, YouTube, Vimeo, Dailymotion) */
function convertirLienPourLecteur(url) {
  try {
    const raw = String(url || "").trim();
    const u = new URL(raw);

    // Google Drive -> /preview
    if (u.hostname.includes("drive.google.com")) {
      const id = raw.match(/\/file\/d\/([-a-zA-Z0-9_]+)/)?.[1] || raw.match(/[-\w]{25,}/)?.[0];
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
      return raw;
    }

    // YouTube -> domaine nocookie (watch/shorts/youtu.be)
    if (/youtube\.com|youtu\.be|youtube-nocookie\.com/.test(u.hostname)) {
      let id = "";
      if (raw.includes("watch")) id = new URL(raw).searchParams.get("v");
      else if (raw.includes("/shorts/")) id = raw.split("/shorts/").pop().split(/[?#]/)[0];
      else if (u.hostname === "youtu.be") id = u.pathname.slice(1).split(/[?#]/)[0];
      if (id && /^[\w-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
      return raw;
    }

    // Vimeo
    if (/(^|\.)vimeo\.com$/i.test(u.hostname)) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}?autoplay=1`;
      return raw;
    }

    // Dailymotion
    if (/(^|\.)dailymotion\.com$/i.test(u.hostname)) {
      const m = raw.match(/dailymotion\.com\/video\/([a-z0-9]+)/i);
      if (m) return `https://www.dailymotion.com/embed/video/${m[1]}?autoplay=1`;
      return raw;
    }

    return raw;
  } catch {
    return url;
  }
}

/**
 * Google Drive / gview / OAuth dans l’iframe refusent souvent referrerpolicy=no-referrer (403 identifier?continue…, 400 viewer/upload).
 * YouTube nocookie : no-referrer pour limiter la fuite de l’URL de la page parente.
 * @param {HTMLIFrameElement|null|undefined} iframe
 * @param {string} urlToLoad
 */
function setMediaIframeReferrerPolicy(iframe, urlToLoad) {
  if (!iframe) return;
  const s = String(urlToLoad || "");
  if (!s || s === "about:blank") {
    iframe.removeAttribute("referrerpolicy");
    return;
  }
  if (s.startsWith("data:")) {
    iframe.setAttribute("referrerpolicy", "no-referrer");
    return;
  }
  try {
    const u = new URL(s, typeof location !== "undefined" ? location.href : "https://invalid.invalid");
    const h = (u.hostname || "").toLowerCase();
    const yt =
      h === "youtu.be" ||
      h === "youtube-nocookie.com" ||
      h.endsWith(".youtube-nocookie.com") ||
      h === "youtube.com" ||
      h.endsWith(".youtube.com") ||
      h === "m.youtube.com" ||
      h.endsWith(".googlevideo.com");
    if (yt) {
      iframe.setAttribute("referrerpolicy", "no-referrer");
      return;
    }
    const googleFamily =
      h === "google.com" ||
      h.endsWith(".google.com") ||
      h.endsWith(".googleusercontent.com") ||
      h === "gstatic.com" ||
      h.endsWith(".gstatic.com") ||
      /(^|\.)google\.[a-z.]{2,}$/i.test(h);
    if (googleFamily) {
      iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      return;
    }
  } catch (_) {
    /* ignore */
  }
  iframe.setAttribute("referrerpolicy", "no-referrer");
}

/** Mini-page autonome pour lire un fichier direct (mp4, webm, mp3...) dans l’iframe */
function _htmlLecteurMediaDirect(src, typeHint) {
  const isVideo = /(\.mp4|\.webm|\.mkv|\.mov|\.m3u8)(\?|#|$)/i.test(src) || (typeHint === 'video');
  const isAudio = /(\.mp3|\.m4a|\.wav|\.ogg|\.flac)(\?|#|$)/i.test(src) || (typeHint === 'audio');
  const body = isVideo
    ? `<video src="${src}" controls playsinline style="width:100%;height:100%;max-height:100%;"></video>`
    : isAudio
      ? `<audio src="${src}" controls style="width:100%"></audio>`
      : `<a href="${src}" target="_blank" rel="noopener">Ouvrir le média</a>`;
  const html =
    `<!doctype html><meta charset="utf-8">
     <meta name=viewport content="width=device-width,initial-scale=1">
     <body style="margin:0;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh">
       ${body}
     </body>`;
  return "data:text/html;charset=utf-8," + encodeURIComponent(html);
}

/** Retente un YouTube nocookie avec un cache-buster si le player signale une erreur réseau/config */
function retryYouTubeOn153(url) {
  try {
    const u = new URL(url);
    if (/youtube-nocookie\.com\/embed\//.test(u.href)) {
      u.searchParams.set('tfix', Date.now().toString(36));
      return u.href;
    }
  } catch { }
  return url;
}

function zcMediasApplyViewerSizing(kind) {
  const iframe = m1El("mediaIframe");
  if (!iframe) return;
  const app =
    document.getElementById("medias1App") ||
    (m1Root() && m1Root().querySelector ? m1Root().querySelector("#medias1App") : null) ||
    null;
  if (app && app.classList) {
    app.classList.remove("zc-medias-mode-pdf", "zc-medias-mode-video", "zc-medias-mode-audio", "zc-medias-mode-embed");
  }
  const vh = Math.max(640, Number(window.innerHeight || 0));
  let h = Math.max(420, Math.floor(vh * 0.66));
  let cls = "zc-medias-mode-embed";
  if (kind === "pdf") {
    h = Math.max(700, Math.floor(vh * 0.88));
    cls = "zc-medias-mode-pdf";
  } else if (kind === "video") {
    h = Math.max(380, Math.floor(vh * 0.64));
    cls = "zc-medias-mode-video";
  } else if (kind === "audio") {
    h = 140;
    cls = "zc-medias-mode-audio";
  }
  iframe.style.width = "100%";
  iframe.style.height = `${h}px`;
  iframe.style.minHeight = `${h}px`;
  iframe.style.maxHeight = "none";
  if (app && app.classList) app.classList.add(cls);
}

/** Affiche le média dans l’UI principale (iframe + zones texte) */
function afficherMedia(mediaName, mediaLink, description) {
  try { zcEnsureMediasLayoutVisibility(); } catch (_) { }
  const seq = ++window.__MEDIA_SEQ__;
  const $ = id => m1El(id);

  const elDesc = $('mediaDescription');
  const elLien = $('mediaLien');
  const iframe = $('mediaIframe');
  const sugg = $('suggestionsMedias');
  const container = $('mediaContainer');

  const setHTML = (el, html) => { if (el) el.innerHTML = html || ''; };
  const safeSet = (el, html) => { if (window.__MEDIA_SEQ__ === seq) setHTML(el, html); };

  // Annuler d’éventuels timers externes
  try { clearTimeout(window.timerAutoNext); clearTimeout(window.timerChargementEchoue); } catch { }

  // MAJ de la globale (ne pas redéclarer en const ici)
  mediaLinkOriginel = String(mediaLink || '');

  if (sugg) sugg.replaceChildren();
  if (elLien) elLien.replaceChildren();
  if (container) container.style.display = 'flex';
  zcMediasApplyViewerSizing("embed");

  // Texte / description (fidèle à la saisie: retours ligne conservés) + surlignage selon prefs ME/MC
  const esc = (s) => typeof escapeHtml === 'function' ? escapeHtml(String(s)) : String(s);
  const qRaw = String(m1El("mediaMot")?.value || "").trim();
  const prefs = zcMediasGetSearchPrefs();
  const descHtml = zcMediasHighlightByPrefs(description || 'Sans description', qRaw, prefs);
  const titreTxt = mediaName || '';
  const titreHtml = zcMediasHighlightByPrefs(titreTxt, qRaw, prefs);
  const titre = mediaName ? `<div class="zc-medias-desc-title">${titreHtml}</div>` : '';
  const blocDesc = `${titre}<div class="zc-medias-desc-body">${descHtml}</div>`;

  safeSet(elDesc, '<p>Chargement du média en cours...</p>');

  // DocID / bouton partager
  try { determineDocId(mediaLinkOriginel); } catch { }

  // URL valide ?
  const isValidURL = (u) => { try { new URL(u); return true; } catch { return false; } };
  if (mediaLinkOriginel.includes('Alfamous.LienInactif_') || !isValidURL(mediaLinkOriginel)) {
    if (iframe) {
      iframe.removeAttribute('referrerpolicy');
      iframe.src = '';
    }
    safeSet(elLien, '');
    safeSet(elDesc, mediaLinkOriginel ? '<p>Lien invalide.</p>' : blocDesc);
    return;
  }

  // Domaines no-embed → simple lien externe
  const blocked = [
    'dropbox.com', 'almendron.com', 'onedrive.live.com', 'facebook.com', 'instagram.com',
    'twitter.com', 'x.com', 'linkedin.com', 'tiktok.com', 'pinterest.com', '1drv.ms', 'github.com'
  ];
  if (blocked.some(d => mediaLinkOriginel.includes(d))) {
    if (iframe) {
      iframe.removeAttribute('referrerpolicy');
      iframe.src = '';
    }
    safeSet(elLien, `<a href="${mediaLinkOriginel}" target="_blank" rel="noopener">Ouvrir dans un nouvel onglet</a>`);
    safeSet(elDesc, blocDesc);
    return;
  }

  // Conversion éventuelle
  let finalSrc = convertirLienPourLecteur(mediaLinkOriginel);

  // Préparer l’iframe — referrer : voir setMediaIframeReferrerPolicy (Google ≠ YouTube)
  if (iframe) {
    iframe.removeAttribute('allow');
    // unload : atténue les [Violation] côté lecteurs ; Google peut encore logger dans ses propres frames
    iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write; unload');
    iframe.setAttribute('allowfullscreen', '');
    iframe.removeAttribute('referrerpolicy');
    iframe.src = 'about:blank';

    // Seconde chance sur erreur
    iframe.onerror = () => {
      if (window.__MEDIA_SEQ__ !== seq) return;
      const retry = retryYouTubeOn153(finalSrc);
      if (retry !== finalSrc) {
        finalSrc = retry;
        setMediaIframeReferrerPolicy(iframe, finalSrc);
        iframe.src = finalSrc;
      } else {
        iframe.removeAttribute('referrerpolicy');
        iframe.src = '';
        safeSet(elDesc,
          `<p>Impossible de charger ce média.</p><a href="${mediaLinkOriginel}" target="_blank" rel="noopener">Ouvrir</a>`
        );
      }
    };
  }

  // PDF → Google Viewer
  if (finalSrc.toLowerCase().endsWith('.pdf')) {
    zcMediasApplyViewerSizing("pdf");
    if (iframe) {
      const gvu = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(mediaLinkOriginel)}`;
      setMediaIframeReferrerPolicy(iframe, gvu);
      iframe.src = gvu;
    }
    safeSet(elLien, '');
    safeSet(elDesc, blocDesc);
    return;
  }

  // Fichiers directs → mini HTML <video>/<audio>
  const isDirectMedia = /\.(mp4|webm|mkv|mov|m3u8|mp3|m4a|wav|ogg|flac)(\?|#|$)/i.test(finalSrc);
  if (isDirectMedia) {
    const typeHint = /\.(mp3|m4a|wav|ogg|flac)/i.test(finalSrc) ? 'audio' : 'video';
    zcMediasApplyViewerSizing(typeHint);
    if (iframe) {
      const dataSrc = _htmlLecteurMediaDirect(finalSrc, typeHint);
      setMediaIframeReferrerPolicy(iframe, dataSrc);
      iframe.src = dataSrc;
    }
    safeSet(elLien, '');
    safeSet(elDesc, blocDesc);
    return;
  }

  // Par défaut : tenter l’embed (YT/Vimeo/DM/Drive…)
  if (iframe) {
    zcMediasApplyViewerSizing("embed");
    setMediaIframeReferrerPolicy(iframe, finalSrc);
    iframe.src = finalSrc;
  }
  safeSet(elLien, '');
  safeSet(elDesc, blocDesc);
}







/* ---------- CRUD liens ---------- */
function zcMedias1IsFirestorePermissionError(e) {
  if (!e) return false;
  if (e.code === "permission-denied") return true;
  const m = String(e.message || "");
  return m.indexOf("insufficient permissions") !== -1 || m.indexOf("Missing or insufficient permissions") !== -1;
}

/** Une tentative d’écriture ; en cas de permission, rafraîchit le jeton Auth puis réessaie une fois. */
async function zcMedias1WriteWithAuthRetry(runWrite) {
  try {
    return await runWrite();
  } catch (e) {
    if (!zcMedias1IsFirestorePermissionError(e)) throw e;
    await zcMedias1AwaitFirebaseUserForWrite({ forceIdToken: true });
    return await runWrite();
  }
}

/** Firestore refuse les écritures LiensMedias sans session Auth (cf. firestore.rules). */
async function zcMedias1EnsureAuthForMediaWrite(verbPhrase) {
  const u = await zcMedias1AwaitFirebaseUserForWrite();
  if (u) return u;
  alertMsgBoxPopup(
    "❌ Connexion Firebase requise " + (verbPhrase || "pour cette opération") +
      ". Utilise « Connexion » (menu du site) ou active l’authentification anonyme : Firebase Console → Authentication → Sign-in method."
  );
  return null;
}

async function creerLienMedia(mediaUrl, mediaName, description, opts = {}) {
  try {
    const qs = await zcMedias1Db.collection("LiensMedias").where("lien", "==", mediaUrl).limit(1).get();
    const u = await zcMedias1EnsureAuthForMediaWrite("pour enregistrer ce média");
    if (!u) return;
    const hasPrivateFlag = Object.prototype.hasOwnProperty.call(opts || {}, "isPrivate");
    const privateFlag = hasPrivateFlag ? !!opts.isPrivate : false;
    if (!qs.empty) {
      const ex = qs.docs[0];
      const exData = ex.data() || {};
      const owner = exData.nameUser;
      if (owner !== nameUser && niveauUser < 3) { alertMsgBoxPopup("Ce média appartient à : " + owner); return; }
      await zcMedias1WriteWithAuthRetry(function () {
        const payload = {
          mediaName,
          lien: mediaUrl,
          nameUser,
          ownerMail: String(mailUser || ""),
          description: `${description} @${nameUser}`,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (hasPrivateFlag) payload.isPrivate = privateFlag;
        return ex.ref.update(payload);
      });
      alertMsgBoxPopup("Lien du média mis à jour !");
      await requestUIRefresh({ keepCurrentIndex: true });
    } else {
      await zcMedias1WriteWithAuthRetry(function () {
        return zcMedias1Db.collection("LiensMedias").add({
          mediaName,
          lien: mediaUrl,
          nameUser,
          ownerMail: String(mailUser || ""),
          isPrivate: privateFlag,
          description: `${description} @${nameUser}`,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      alertMsgBoxPopup("Lien du média ajouté !");
    }
    clearSearch(); rechercherMedia();
  } catch (e) {
    console.error("save/update lien:", e);
    if (zcMedias1IsFirestorePermissionError(e)) {
      alertMsgBoxPopup("❌ Firestore refuse l’enregistrement (permissions). Ouvre « Connexion » pour une session Firebase, active l’auth anonyme, puis déploie les règles (LiensMedias).");
    } else {
      alertMsgBoxPopup("Erreur lors de l’enregistrement du média.");
    }
  }
}

/* ---------- Ajouter fichier ---------- */
async function ajouterMediaFichier(fichier) {
  const lvl = Number(localStorage.getItem('niveauUser') || 0);
  if (lvl <= 2) { alertMsgBoxPopup("Accès refusé (niveau > 2 requis)."); return; }
  if (!fichier) return;

  const root = (typeof mediaStorageRef !== "undefined" && mediaStorageRef?.child) ? mediaStorageRef : (firebase?.storage?.().ref?.() || null);
  if (!root) { alertMsgBoxPopup("Storage non initialisé."); return; }

  const ext = extFromName(fichier.name), folder = storageFolderFor(ext, fichier.type), path = `${folder}/${Date.now()}_${fichier.name}`;
  let mediaUrl = ""; try { const snap = await root.child(path).put(fichier); mediaUrl = await snap.ref.getDownloadURL(); }
  catch (e) { console.error(e); alertMsgBoxPopup("Échec de l'upload : " + (e?.message || e)); return; }

  const cleaned = fichier.name.replace(/\s+/g, ' ').trim();
  let nom, lien, desc; try { [nom, lien, desc] = await ouvrirFormulaire(cleaned, mediaUrl, '', 'Ajouter un média (+Fichier)', { linkReadOnly: true }); }
  catch { alertMsgBoxPopup('Erreur d’ouverture du formulaire.'); return; }
  if (!lien || !desc) { alertMsgBoxPopup('Tous les champs doivent être remplis.'); return; }

  const typeTag = ({ audio: '[AUD]', video: '[VID]', images: '[IMG]', pdf: '[PDF]', docs: '[DOC]', autres: '[FILE]' })[folder] || '[FILE]';
  if (!nom) nom = formatLienMedia(lien); nom = `${typeTag} ${nom}`;
  try { await creerLienMedia(lien, nom, desc, { isPrivate: zcMediasCurrentWantedPrivacy() }); alertMsgBoxPopup('Fichier ajouté !'); }
  catch (e) { console.error(e); alertMsgBoxPopup("Erreur lors de l'ajout du média."); return; }
  await requestUIRefresh({ keepCurrentIndex: true });
}

/**
 * Upload Storage (`MesMedias/{audio|…}/…`) + enregistrement `LiensMedias` comme « Ajouter fichier »,
 * sans contrôle de niveau > 2 (flux Mes Notes : enregistrement explicite après transcription).
 * @param {File} fichier
 * @param {{ isPrivate?: boolean, mediaName?: string, description?: string }} [opts]
 * @returns {Promise<boolean>}
 */
window.zcMesMediasUploadFileLikeAjouter = async function zcMesMediasUploadFileLikeAjouter(
  fichier,
  opts
) {
  opts = opts || {};
  if (!fichier) return false;
  const root =
    typeof mediaStorageRef !== "undefined" && mediaStorageRef && mediaStorageRef.child
      ? mediaStorageRef
      : firebase.storage().ref("MesMedias");
  const ext = extFromName(fichier.name);
  const folder = storageFolderFor(ext, fichier.type);
  const path = `${folder}/${Date.now()}_${fichier.name}`;
  let mediaUrl = "";
  try {
    const snap = await root.child(path).put(fichier);
    mediaUrl = await snap.ref.getDownloadURL();
  } catch (e) {
    console.error("[zcMesMediasUploadFileLikeAjouter]", e);
    alertMsgBoxPopup(
      "Échec de l'upload : " + (e && e.message ? String(e.message) : String(e || ""))
    );
    return false;
  }
  const cleaned = String(fichier.name || "").replace(/\s+/g, " ").trim();
  const typeTag =
    ({ audio: "[AUD]", video: "[VID]", images: "[IMG]", pdf: "[PDF]", docs: "[DOC]", autres: "[FILE]" })[
      folder
    ] || "[FILE]";
  const nom = opts.mediaName || `${typeTag} ${cleaned || "audio"}`;
  const desc =
    opts.description ||
    "Mes Notes — audio utilisé pour la transcription";
  try {
    await creerLienMedia(mediaUrl, nom, desc, { isPrivate: !!opts.isPrivate });
    await requestUIRefresh({ keepCurrentIndex: true });
    return true;
  } catch (e) {
    console.error("[zcMesMediasUploadFileLikeAjouter] Firestore", e);
    alertMsgBoxPopup("Erreur lors de l'enregistrement du média (liste Firestore).");
    return false;
  }
};

/* ---------- Ajout par lien ---------- */
async function ajouterMediaLien() {
  if (niveauUser < 0) { alertMsgBoxPopup("Se connecter avec niveau 0 ou plus pour ajouter un lien"); return; }
  try {
    let [nom, lien, desc] = await ouvrirFormulaire("", "", "", "Ajouter un lien (+Https)", { linkReadOnly: false });
    if (!lien || !desc) { alertMsgBoxPopup("Le lien et la description sont nécessaires."); return; }
    if (!nom) nom = formatLienMedia(lien);
    try { new URL(lien); } catch { alertMsgBoxPopup("Le lien saisi n'est pas valide."); return; }

    const q = await zcMedias1Db.collection("LiensMedias").where("lien", "==", lien).limit(1).get();
    if (!q.empty) { alertMsgBoxPopup("Le lien existe déjà."); return; }

    await creerLienMedia(lien, nom, desc, { isPrivate: zcMediasCurrentWantedPrivacy() });
    alertMsgBoxPopup("Le média a été ajouté !");
    await requestUIRefresh({ keepCurrentIndex: true });
  } catch (e) { console.error("add lien:", e); alertMsgBoxPopup("Erreur lors de l'ajout du média."); }
}

/* ---------- Suppression ---------- */
async function supprimerMedia() {
  if (niveauUser < 0) { alertMsgBoxPopup("Se connecter avec niveau 0 ou plus pour supprimer un média"); return; }
  const mediaIframe = m1El('mediaIframe'); const mediaLink = mediaLinkOriginel;
  if (!mediaLink) { alertMsgBoxPopup("Aucun média sélectionné."); return; }

  try {
    const qs = await zcMedias1Db.collection("LiensMedias").where("lien", "==", mediaLink).limit(1).get();
    if (qs.empty) { alertMsgBoxPopup("Aucun document trouvé pour : " + mediaLink); return; }

    const doc = qs.docs[0]; const data = doc.data(); const owner = data.nameUser;
    if (owner !== nameUser && niveauUser < 3) { alertMsgBoxPopup("Ce média appartient à : " + owner); return; }

    const mediaName = data.mediaName || ''; const ok = await alertConfirm(`Voulez-vous supprimer "${mediaName}" ?`);
    if (!ok) return;

    const uDel = await zcMedias1EnsureAuthForMediaWrite("pour supprimer un média");
    if (!uDel) return;

    // neutraliser
    try { await doc.ref.update({ lien: null, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); } catch (e) { console.warn("lien=null:", e?.message || e); }
    await requestUIRefresh({ keepCurrentIndex: true }, { debounce: false });

    await nullifyInCurrentUserFavorites(mediaLink);

    // suppression doc + storage
    await doc.ref.delete(); alertMsgBoxPopup("Document supprimé de Firestore.");
    if (mediaLink.includes("https://firebasestorage.googleapis.com")) {
      try { await firebase.storage().refFromURL(mediaLink).delete(); alertMsgBoxPopup("Fichier supprimé du Storage."); }
      catch (e) { if (e.code !== 'storage/object-not-found') { console.error("Suppression Storage:", e); alertMsgBoxPopup("Erreur lors de la suppression du fichier."); } }
    }

    if (mediaIframe) mediaIframe.src = "";
    const elDesc = m1El('mediaDescription'); if (elDesc) elDesc.textContent = "";
    const sugg = m1El('suggestionsMedias'); if (sugg) sugg.style.display = 'none';
    alertMsgBoxPopup("Média supprimé avec succès.");
    await requestUIRefresh({ keepCurrentIndex: true }, { debounce: false });
  } catch (e) { console.error("Suppression:", e); alertMsgBoxPopup("Erreur lors de la suppression du média."); }
}

/* ---------- Modification ---------- */
async function modifierMedia() {
  if (niveauUser < 0) { alertMsgBoxPopup("Se connecter avec niveau 0 ou plus pour modifier un média"); return; }
  const mediaUrl = mediaLinkOriginel; if (!mediaUrl) { alertMsgBoxPopup("Choisissez un média à modifier"); return; }
  try {
    const qs = await zcMedias1Db.collection("LiensMedias").where("lien", "==", mediaUrl).limit(1).get();
    if (qs.empty) { alertMsgBoxPopup("Lien non trouvé dans la base."); return; }
    const doc = qs.docs[0]; const owner = doc.data().nameUser;
    if (owner !== nameUser && niveauUser < 3) { alertMsgBoxPopup("Ce média appartient à : " + owner); return; }

    let curDesc = (doc.data().description || "").replace("@" + owner, ""); let curNom = doc.data().mediaName || "";
    const [nom, lien, newDesc] = await ouvrirFormulaire(curNom, mediaUrl, curDesc, "Modifier Média (+Abc)", { linkReadOnly: true });
    if (!newDesc) { alertMsgBoxPopup("La description doit être remplie."); return; }

    const uUp = await zcMedias1EnsureAuthForMediaWrite("pour modifier un média");
    if (!uUp) return;

    const finalNom = nom || formatLienMedia(lien || mediaUrl);
    const upd = {
      mediaName: finalNom,
      description: newDesc + " @" + owner,
      isPrivate: zcMediasCurrentWantedPrivacy(),
      ownerMail: String(mailUser || "")
    };
    await zcMedias1WriteWithAuthRetry(function () { return doc.ref.update(upd); });
    alertMsgBoxPopup("Média mis à jour !");
    await requestUIRefresh({ keepCurrentIndex: true });

    const el = m1El('mediaDescription');
    if (el) {
      el.textContent = newDesc;
      el.style.whiteSpace = "pre-wrap";
    }
  } catch (e) {
    console.error("MAJ média:", e);
    if (zcMedias1IsFirestorePermissionError(e)) {
      alertMsgBoxPopup("❌ Firestore refuse la modification. Connecte-toi (menu Connexion), vérifie l’auth anonyme, règles LiensMedias déployées.");
    } else {
      alertMsgBoxPopup("Erreur lors de la mise à jour du média.");
    }
  }
}

/* ---------- Paramètres d’URL / préremplissage ---------- */
function getQueryParam(name) {
  try {
    if (window.__mediasEmbeddedQuery && typeof window.__mediasEmbeddedQuery === "object") {
      const v = window.__mediasEmbeddedQuery[name];
      if (v != null) return String(v);
    }
  } catch (_) { }
  return new URLSearchParams(window.location.search).get(name);
}

async function prefillinput() {
  const motInput = m1El('mediaMot');
  const map = { texte: getQueryParam('texte'), media: getQueryParam('media'), docMedia: getQueryParam('docMedia') };

  for (const [k, v] of Object.entries(map)) {
    if (!v) continue;
    const trimmed = v.replace(/\+/g, " ").trim();

    if (k === 'texte' || k === 'media') {
      if (motInput) { motInput.value = trimmed; rechercherMedia(); }
      return;
    }

    if (k === 'docMedia') {
      try {
        // Essai comme ID
        const ref = zcMedias1Db.collection("LiensMedias").doc(trimmed); const snap = await ref.get();
        if (snap.exists) {
          const d = snap.data();
          if (!zcMediasCanAccessDoc(d)) {
            alertMsgBoxPopup("Ce média est privé et n'est pas accessible avec votre session.");
            return;
          }
          const nom = d.mediaName || "Sans sujet"; const lien = d.lien; const desc = d.description || "Sans description";
          afficherMedia(nom, lien, desc); ajouterGestionnaireBouton(snap.id);
          zcMediasSyncPrivacyFromDoc(d, snap.id);
          try { localStorage.setItem('dernierMediaLien', lien); localStorage.setItem('dernierMediaNom', nom); localStorage.setItem('dernierMediaDesc', desc); } catch { }
          tryMajIndexDepuisLien(lien); majBarreSousPlaylist(lien);
          return;
        }
        // Essai comme lien exact
        const qs = await zcMedias1Db.collection("LiensMedias").where("lien", "==", trimmed).limit(1).get();
        if (!qs.empty) {
          const doc = qs.docs[0], d = doc.data();
          if (!zcMediasCanAccessDoc(d)) {
            alertMsgBoxPopup("Ce média est privé et n'est pas accessible avec votre session.");
            return;
          }
          const nom = d.mediaName || "Sans sujet"; const lien = d.lien || trimmed; const desc = d.description || "Sans description";
          afficherMedia(nom, lien, desc); ajouterGestionnaireBouton(doc.id);
          zcMediasSyncPrivacyFromDoc(d, doc.id);
          try { localStorage.setItem('dernierMediaLien', lien); localStorage.setItem('dernierMediaNom', nom); localStorage.setItem('dernierMediaDesc', desc); } catch { }
          tryMajIndexDepuisLien(lien); majBarreSousPlaylist(lien);
          return;
        }
        alertMsgBoxPopup("Aucun document trouvé avec l'identifiant ou le lien spécifié.");
        afficherMedia("Introuvable", trimmed, "Introuvable.");
        await requestUIRefresh({ keepCurrentIndex: true });
      } catch (e) {
        alertMsgBoxPopup("Erreur lors de la recherche du média : " + (e?.message || e));
        afficherMedia("Erreur", trimmed, "Impossible de charger ce média.");
      }
      return;
    }
  }
  if (motInput) motInput.value = '';
}

/* ---------- Gestion listes/localStorage ---------- */
function _getListFromLocalStorage(name) { try { const d = localStorage.getItem(name); return d ? JSON.parse(d) : []; } catch { return []; } }
function _allCandidateLists() {
  const ks = Object.keys(localStorage).filter(k => /^liste.+Medias$/.test(k) || /^listeSite_.+_Medias$/.test(k));
  const out = ["playlistMedias", ...ks.filter(k => k !== "playlistMedias" && k !== "listeCompleteMedias")];
  const seen = new Set(); return out.filter(k => !seen.has(k) && seen.add(k));
}
function _ensureOptionInSelect(listKey) {
  const sel = m1El("listeSelect"); if (!sel) return;
  if ([...sel.options].some(o => o.value === listKey)) return;
  const labels = { listeAudioMedias: "🎵 Audio", listeVideoMedias: "🎬 Vidéo", listeImagesMedias: "🖼️ Images", listePdfMedias: "📄 PDF", listeDocsMedias: "🗂️ Docs", listeAutresMedias: "📦 Autres", playlistMedias: "🎯 Favoris" };
  const arr = _getListFromLocalStorage(listKey); if (!Array.isArray(arr) || !arr.length) return;
  const opt = document.createElement("option"); opt.value = listKey;
  if (labels[listKey]) opt.textContent = labels[listKey];
  else if (listKey.startsWith("listeSite_") && listKey.endsWith("_Medias")) opt.textContent = "🌐 " + listKey.slice("listeSite_".length, -"_Medias".length);
  else opt.textContent = listKey;
  sel.appendChild(opt);
}
function _findListAndIndexForLink(lien) {
  for (const listName of _allCandidateLists()) {
    const arr = _getListFromLocalStorage(listName); const idx = arr.indexOf(lien);
    if (idx !== -1) return { listName, index: idx };
  } return null;
}

let indexPlayListe = 0, liensValidMedia = [], nomListeCourante = "playlistMedias";
let timerAutoNext = null, timerChargementEchoue = null, dureeAutoNext = 0;

/* Synchronisation dossier/index à partir d’un lien */
function tryMajIndexDepuisLien(lien) {
  if (!lien) return false;
  const f = _findListAndIndexForLink(lien); if (!f) return false;
  const { listName, index } = f; _ensureOptionInSelect(listName);
  const sel = m1El('listeSelect'); nomListeCourante = listName; localStorage.setItem("nomListeCourante", nomListeCourante);
  if (sel) sel.value = listName;
  const arr = _getListFromLocalStorage(listName); liensValidMedia = Array.isArray(arr) ? arr : []; indexPlayListe = index;
  const elIdx = m1El('indexInputVisible'); if (elIdx) elIdx.value = index + 1;
  //const elLien=m1El('mediaLien'); if (elLien){ const total=arr.length; const domain=(typeof formatLienMedia==="function")?formatLienMedia(lien):lien;
  //elLien.innerHTML=`<a href="${lien}" target="_blank">${domain}</a> — ${listName} [${index+1}/${total}]`; }
  majBarreSousPlaylist(lien); return true;
}

/* Clic d’une suggestion */
function afficherDepuisSuggestion(nom, lien, desc) {
  if (!lien) return;
  mediaLinkOriginel = lien; afficherMedia(nom, lien, desc);
  try { localStorage.setItem('dernierMediaLien', lien); localStorage.setItem('dernierMediaNom', nom || formatLienMedia(lien)); localStorage.setItem('dernierMediaDesc', desc || ''); } catch { }
  tryMajIndexDepuisLien(lien); majBarreSousPlaylist(lien); try { mettreAJourCaseSelectionMedia(); } catch { }
  // Même pattern que le champ #mot : retirer le focus du champ de recherche et forcer la
  // fermeture de la liste pour qu'elle ne se rouvre pas (auto-filtre sur la nouvelle valeur).
  try { const mot = m1El('mediaMot'); if (mot) mot.blur(); } catch (_) { }
  const s = m1El('suggestionsMedias');
  if (s) { s.innerHTML = ''; s.style.display = 'none'; }
}

/* Partage : déterminer docId */
async function determineDocId(lien) {
  try {
    if (!lien) { alertMsgBoxPopup("Le lien du média est introuvable."); await requestUIRefresh({ keepCurrentIndex: true }); return; }
    const qs = await zcMedias1Db.collection("LiensMedias").where("lien", "==", lien).limit(1).get();
    if (qs.empty) { alertMsgBoxPopup("Aucun document trouvé pour : " + lien); await requestUIRefresh({ keepCurrentIndex: true }); return; }
    const doc = qs.docs[0];
    const d = doc.data() || {};
    if (!zcMediasCanAccessDoc(d)) {
      currentMediaDocId = null;
      currentMediaIsPrivate = false;
      zcMediasSyncPrivacyLabelAndState(false);
      return;
    }
    zcMediasSyncPrivacyFromDoc(d, doc.id);
    ajouterGestionnaireBouton(doc.id);
  } catch (e) { alertMsgBoxPopup("Erreur lors du partage du média : " + (e?.message || e)); }
}

/* Barre sous playlist */
function majBarreSousPlaylist(lienActuel) {
  const el = m1El("mediaDescription2"); if (!el) return;
  const lien = lienActuel || mediaLinkOriginel || ""; const lib = (typeof formatLienMedia === "function") ? formatLienMedia(lien) : lien;
  let total = 0, pos = 0; try { total = Array.isArray(liensValidMedia) ? liensValidMedia.length : 0; const i = total ? liensValidMedia.indexOf(lien) : -1; pos = i >= 0 ? i + 1 : (typeof indexPlayListe === "number" && total > 0 ? indexPlayListe + 1 : 0); } catch { }
  el.innerHTML = `<a href="${lien}" target="_blank"><i class="fas fa-link" aria-hidden="true"></i> ${lib}</a> ${total ? `(${pos} / ${total})` : ""}`;
}

/* Playlist */
function changerListe() { const s = m1El("listeSelect"); nomListeCourante = s?.value || "playlistMedias"; localStorage.setItem("nomListeCourante", nomListeCourante); chargerListe(); }
function chargerListe() {
  const d = localStorage.getItem(nomListeCourante), desc2 = m1El("mediaDescription2");
  if (!d) { alertMsgBoxPopup("⚠️ La liste sélectionnée n'est pas encore générée."); liensValidMedia = []; if (desc2) desc2.textContent = "Playlist vide."; return; }
  liensValidMedia = JSON.parse(d); indexPlayListe = parseInt(localStorage.getItem("dernierIndex_" + nomListeCourante)) || 0;
  const idx = m1El("indexInputVisible"); if (idx) idx.value = indexPlayListe + 1; jouerPlayListe();
}

const __META_CACHE__ = new Map();
async function afficherDepuisLien(lien) {
  if (!lien) { afficherMedia("Introuvable", "", "Lien vide."); return null; }
  if (__META_CACHE__.has(lien)) {
    const d = __META_CACHE__.get(lien);
    if (d && d.__blocked) {
      afficherMedia("Privé", lien, "Ce média est privé.");
      zcMediasSyncPrivacyFromDoc(null, null);
      return null;
    }
    afficherMedia(d.mediaName || formatLienMedia(lien), lien, d.description || "Sans description");
    if (d.__docId) {
      ajouterGestionnaireBouton(d.__docId);
      zcMediasSyncPrivacyFromDoc(d, d.__docId);
    }
    return d.__docId || null;
  }
  try {
    const qs = await zcMedias1Db.collection("LiensMedias").where("lien", "==", lien).limit(1).get();
    if (!qs.empty) {
      const doc = qs.docs[0]; const d = doc.data() || {}; d.__docId = doc.id; __META_CACHE__.set(lien, d);
      if (!zcMediasCanAccessDoc(d)) {
        __META_CACHE__.set(lien, { __blocked: true });
        afficherMedia("Privé", lien, "Ce média est privé.");
        zcMediasSyncPrivacyFromDoc(null, null);
        return null;
      }
      afficherMedia(d.mediaName || formatLienMedia(lien), lien, d.description || "Sans description");
      ajouterGestionnaireBouton(doc.id);
      zcMediasSyncPrivacyFromDoc(d, doc.id);
      return doc.id;
    }
    afficherMedia(formatLienMedia(lien), lien, "Sans description");
    __META_CACHE__.set(lien, { mediaName: formatLienMedia(lien), description: "Sans description", __docId: null });
    zcMediasSyncPrivacyFromDoc(null, null);
    return null;
  } catch (e) { console.error("afficherDepuisLien:", e); afficherMedia(formatLienMedia(lien), lien, "Sans description"); return null; }
}

function jouerPlayListe() {
  const pseq = ++__PLAY_SEQ__; if (!liensValidMedia.length) { alertMsgBoxPopup("⚠️ Playlist vide."); return; }
  const lien = liensValidMedia[indexPlayListe] || ""; mediaLinkOriginel = lien;
  localStorage.setItem('dernierMediaLien', lien); localStorage.setItem('dernierNomListe', nomListeCourante); localStorage.setItem("dernierIndex_" + nomListeCourante, String(indexPlayListe));
  mettreAJourCaseSelectionMedia();

  const d2 = m1El("mediaDescription2"); const lib = formatLienMedia(lien);
  if (d2) d2.innerHTML = `<a href="${lien}" target="_blank"><i class="fas fa-link" aria-hidden="true"></i> ${lib}</a> (${indexPlayListe + 1} / ${liensValidMedia.length})`;

  try { clearTimeout(timerAutoNext); clearTimeout(timerChargementEchoue); } catch { }
  afficherDepuisLien(lien).then(() => {
    const ifr = m1El("mediaIframe"); if (!ifr) return;
    ifr.onload = () => { if (pseq !== __PLAY_SEQ__) return; try { clearTimeout(timerChargementEchoue); } catch { } if (dureeAutoNext > 0) { timerAutoNext = setTimeout(() => { if (pseq !== __PLAY_SEQ__) return; indexPlayListe = (indexPlayListe < liensValidMedia.length - 1) ? indexPlayListe + 1 : 0; jouerPlayListe(); }, dureeAutoNext); } };
    timerChargementEchoue = setTimeout(() => { if (pseq !== __PLAY_SEQ__) return; indexPlayListe = (indexPlayListe < liensValidMedia.length - 1) ? indexPlayListe + 1 : 0; jouerPlayListe(); }, 8000);
  });
}
function suivantPlayListe() { indexPlayListe = (indexPlayListe < liensValidMedia.length - 1) ? indexPlayListe + 1 : 0; const i = m1El("indexInputVisible"); if (i) i.value = indexPlayListe + 1; jouerPlayListe(); }
function precedentPlayListe() { indexPlayListe = (indexPlayListe > 0) ? indexPlayListe - 1 : Math.max(liensValidMedia.length - 1, 0); const i = m1El("indexInputVisible"); if (i) i.value = indexPlayListe + 1; jouerPlayListe(); }
function allerAIndex() {
  const v = (m1El("indexInputVisible")?.value || '').trim(); const n = parseInt(v, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= liensValidMedia.length) { indexPlayListe = n - 1; jouerPlayListe(); } else alertMsgBoxPopup("❌ Index invalide (1 à " + liensValidMedia.length + ")");
}
/*function toggleLectureManuelle(){ const cb=m1El("lectureManuelleToggle"); const lab=m1El("labelToggle");
  if(cb?.checked){ dureeAutoNext=0; if(lab) lab.innerText="🔁 Lecture standard"; } else { dureeAutoNext=180000; if(lab) lab.innerText="⏱ Passage auto toutes les 3 minutes"; } }
*/
/* ---------- Listes typées/domaines + refreshAllListsAndUI ---------- */
function parseUrlLoose(href = "") { const s = String(href || "").trim(); if (!s) return null; try { return new URL(s); } catch { try { if (/^[a-z]+:\/\//i.test(s)) return null; return new URL("https://" + s); } catch { return null; } } }
function normalizeDomain(host = "") {
  const h0 = String(host || "").toLowerCase(); const h = h0.replace(/^www\./, "");
  if (h === "youtu.be" || h === "youtube.com" || h.endsWith(".youtube.com") || h === "youtube-nocookie.com" || h.endsWith(".youtube-nocookie.com") || h === "m.youtube.com") return "youtube.com";
  if (h === "alfamous.ca" || h.endsWith(".alfamous.ca")) return "alfamous.ca";
  if (h === "blog.alfamous.ca" || h.endsWith(".blog.alfamous.ca")) return "blog.alfamous.ca";
  return h;
}
function deriveTypeFromUrl(url = "", mediaName = "") {
  const rawYT = /((^|[\s(])https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\b/i.test(url || "");
  const u = parseUrlLoose(url || ""); const domain = u ? normalizeDomain(u.hostname || "") : (rawYT ? "youtube.com" : "");
  const WH = new Set(["youtube.com", "alfamous.ca", "blog.alfamous.ca"]); if (domain && WH.has(domain)) return `site:${domain}`;
  const ext = (s) => { const m = /\.([^.?#/\\]+)(?:[?#].*)?$/i.exec(s || ""); return m ? (m[1] || "").toLowerCase() : ""; };
  let e = ext(mediaName || ""); if (!e && u) e = ext(u.pathname || "");
  return e ? (storageFolderFor(e, "") || "autres") : "autres";
}

async function construireListesParType() {
  try {
    zcMedias1RefreshGlobalsFromSession();
    const snap = await zcMedias1Db.collection("LiensMedias").get();
    const buckets = { audio: [], video: [], images: [], pdf: [], docs: [], autres: [] }, byDomain = {};
    snap.forEach(doc => {
      const d = doc.data(); if (!d || !d.lien) return;
      if (!zcMediasCanAccessDoc(d)) return;
      const t = deriveTypeFromUrl(String(d.lien), String(d.mediaName || ""));
      if (buckets[t]) buckets[t].push(d.lien);
      else if (t.startsWith("site:")) { byDomain[t] = byDomain[t] || []; byDomain[t].push(d.lien); }
      else buckets.autres.push(d.lien);
    });
    localStorage.setItem("listeAudioMedias", JSON.stringify(buckets.audio));
    localStorage.setItem("listeVideoMedias", JSON.stringify(buckets.video));
    localStorage.setItem("listeImagesMedias", JSON.stringify(buckets.images));
    localStorage.setItem("listePdfMedias", JSON.stringify(buckets.pdf));
    localStorage.setItem("listeDocsMedias", JSON.stringify(buckets.docs));
    localStorage.setItem("listeAutresMedias", JSON.stringify(buckets.autres));
    Object.keys(byDomain).forEach(k => { const domain = k.replace(/^site:/, ""); localStorage.setItem(`listeSite_${domain}_Medias`, JSON.stringify(byDomain[k])); });

    const sel = m1El("listeSelect");
    if (sel) { for (let i = sel.options.length - 1; i >= 0; i--) { if (sel.options[i].value !== "playlistMedias") sel.remove(i); } }
    const add = (key, label) => { const arr = _getListFromLocalStorage(key); if (Array.isArray(arr) && arr.length) { _ensureOptionInSelect(key); const s = m1El("listeSelect"); if (s) { const opt = [...s.options].find(o => o.value === key); if (opt) opt.textContent = label; } } };
    add("listeAudioMedias", "🎵 Audio"); add("listeVideoMedias", "🎬 Vidéo"); add("listeImagesMedias", "🖼️ Images");
    add("listePdfMedias", "📄 PDF"); add("listeDocsMedias", "🗂️ Docs"); add("listeAutresMedias", "📦 Autres");
    Object.keys(byDomain).sort().forEach(k => _ensureOptionInSelect(`listeSite_${k.replace(/^site:/, "")}_Medias`));
  } catch (e) { console.error("construireListesParType:", e); }
}

/* === refreshAllListsAndUI (version complète) === */
async function refreshAllListsAndUI(opts = {}) {
  const { keepCurrentIndex = false, forceReload = false } = opts || {};
  let savedIndex = null; try { if (keepCurrentIndex) { const el = m1El('indexInputVisible'); if (el && el.value != null) savedIndex = el.value; } } catch { }

  try {
    if (typeof window.reloadLiensMediasFromDB === "function") await window.reloadLiensMediasFromDB({ forceReload });
    else if (forceReload || !Array.isArray(window.__cacheLiensMedias)) {
      const snap = await zcMedias1Db.collection("LiensMedias").get(); const arr = [];
      snap.forEach(d => {
        const x = d.data() || {};
        if (!zcMediasCanAccessDoc(x)) return;
        arr.push({
          id: d.id,
          lien: (x.lien ?? x.mediaUrl ?? "").toString(),
          mediaName: (x.mediaName ?? x.nom ?? x.name ?? "").toString(),
          description: (x.description ?? "").toString(),
          nameUser: (x.nameUser ?? "").toString(),
          ownerMail: (x.ownerMail ?? x.mailUser ?? "").toString(),
          isPrivate: !!(x.isPrivate === true),
          dateModif: x.dateModif || null,
          _raw: x
        });
      });
      window.__cacheLiensMedias = arr;
    }
  } catch (e) { console.warn("refreshAllListsAndUI: lecture DB:", e?.message || e); }

  const medias = Array.isArray(window.__cacheLiensMedias) ? window.__cacheLiensMedias : [];
  try {
    const exist = new Set(medias.map(m => m && m.lien).filter(Boolean));
    if (typeof mailUser === "string" && mailUser) {
      const u = await zcMedias1AwaitFirebaseUserForWrite();
      if (u) {
        const ref = zcMedias1Db.collection("FavorisMedias").doc(zcMedias1FavorisDocId()), snap = await ref.get();
        if (snap.exists) {
          const raw = Array.isArray(snap.data().listeFavoris) ? snap.data().listeFavoris : [];
          const seen = new Set(), clean = []; for (const x of raw) { if (typeof x !== "string") continue; if (!exist.has(x)) continue; if (seen.has(x)) continue; seen.add(x); clean.push(x); }
          if (clean.length !== raw.length || clean.some((x, i) => x !== raw[i])) await ref.set({ listeFavoris: clean }, { merge: true });
          try { localStorage.setItem("playlistMedias", JSON.stringify(clean)); } catch { }
        }
      }
    } else {
      try {
        const rawJSON = localStorage.getItem("playlistMedias"); const raw = Array.isArray(JSON.parse(rawJSON || "[]")) ? JSON.parse(rawJSON || "[]") : [];
        const seen = new Set(), clean = []; for (const u of raw) { if (typeof u !== "string") continue; if (!exist.has(u)) continue; if (seen.has(u)) continue; seen.add(u); clean.push(u); }
        localStorage.setItem("playlistMedias", JSON.stringify(clean));
      } catch { }
    }
  } catch (e) { console.warn("refreshAllListsAndUI: nettoyage favoris:", e?.message || e); }

  try {
    if (typeof window.rebuildCategories === "function") window.rebuildCategories({ medias });
    else if (typeof window.construireCategories === "function") window.construireCategories({ medias });
    // sinon: pas de fallback ici (tu n’as pas de #categoriesContainer dans ton HTML actuel)
  } catch (e) { console.warn("refreshAllListsAndUI: catégories:", e?.message || e); }

  try {
    if (typeof window.rebuildMediaList === "function") window.rebuildMediaList({ medias, keepCurrentIndex });
    else if (typeof window.afficherListes === "function") window.afficherListes({ medias, keepCurrentIndex });
  } catch (e) { console.warn("refreshAllListsAndUI: listes:", e?.message || e); }

  try { if (keepCurrentIndex && savedIndex != null) { const el = m1El('indexInputVisible'); if (el) el.value = savedIndex; } } catch { }
  try { if (typeof window.ajusterHauteur === "function") window.ajusterHauteur('description'); } catch { }
}

/* ---------- Favoris & cases ---------- */
function zcMediasUpdateFavorisHeartUi(isFav, total) {
  const T = zcMediasTxt();
  const btnFav = m1El("btnMediasFavoris");
  if (btnFav) {
    const on = !!isFav;
    btnFav.classList.toggle("is-liked", on);
    btnFav.setAttribute("aria-pressed", on ? "true" : "false");
    btnFav.setAttribute("title", T.fav);
    btnFav.setAttribute("aria-label", T.fav);
    const icon = btnFav.querySelector("i");
    if (icon) icon.style.color = on ? "var(--zc-danger)" : "var(--zc-text-muted)";
  }
  let countEl = m1El("zcMediasFavCount");
  if (!countEl) {
    const host = m1El("zcMediasFavorisInline");
    if (host) {
      countEl = document.createElement("span");
      countEl.id = "zcMediasFavCount";
      countEl.style.fontWeight = "600";
      countEl.style.color = "var(--zc-text)";
      host.appendChild(countEl);
    }
  }
  if (countEl) countEl.textContent = "(" + Math.max(0, Number(total) || 0) + ")";
}

async function mettreAJourListeFavorisSimple(forcedChecked) {
  if (window.__zcMedias1FavBusy) return;
  window.__zcMedias1FavBusy = true;
  try {
  if (!mediaLinkOriginel || !mailUser) { alertMsgBoxPopup("⚠️ Lien média ou utilisateur introuvable."); await requestUIRefresh({ keepCurrentIndex: true }); return; }
  zcMedias1RefreshGlobalsFromSession();
  try {
    let liste = await creerPlayList(); const i = liste.indexOf(mediaLinkOriginel);
    const checked = (typeof forcedChecked === "boolean") ? forcedChecked : (i === -1);
    if (checked) { if (i === -1) { liste.push(mediaLinkOriginel); alertMsgBoxPopup("✅ Média ajouté aux favoris."); } else alertMsgBoxPopup("ℹ️ Déjà présent."); }
    else { if (i !== -1) { liste.splice(i, 1); alertMsgBoxPopup("🗑 Retiré des favoris."); } else alertMsgBoxPopup("ℹ️ Pas dans vos favoris."); }

    const u = await zcMedias1AwaitFirebaseUserForWrite();
    if (!u) {
      alertMsgBoxPopup(
        "❌ Pas de session Firebase : favoris enregistrés sur cet appareil uniquement. Connectez-vous via « Connexion » ou activez l’auth anonyme (Console Firebase → Authentication)."
      );
    } else {
      const docId = zcMedias1FavorisDocId();
      if (!docId) {
        alertMsgBoxPopup("❌ Impossible de déterminer l’identifiant favoris (e-mail). Vérifiez « Connexion ».");
      } else {
        await zcMedias1WriteWithAuthRetry(function () {
          return zcMedias1Db.collection("FavorisMedias").doc(docId).set({ nameUser: String(nameUser || ""), listeFavoris: liste }, { merge: true });
        });
      }
    }
    localStorage.setItem("playlistMedias", JSON.stringify(liste));

    if (nomListeCourante === "playlistMedias") {
      liensValidMedia = Array.isArray(liste) ? liste : [];
      if (!liensValidMedia.length) indexPlayListe = 0;
      else { const j = liensValidMedia.indexOf(mediaLinkOriginel); indexPlayListe = j >= 0 ? j : Math.min(indexPlayListe, liensValidMedia.length - 1); }
      const idx = m1El("indexInputVisible"); if (idx) idx.value = (indexPlayListe + 1);
      majBarreSousPlaylist(mediaLinkOriginel);
    }
    zcMediasUpdateFavorisHeartUi(checked, liste.length);
  } catch (e) {
    console.error("MàJ favoris:", e);
    try { await mettreAJourCaseSelectionMedia(); } catch (_) { }
    if (zcMedias1IsFirestorePermissionError(e)) {
      alertMsgBoxPopup(
        "❌ Firestore a refusé l’enregistrement des favoris. Ouvre « Connexion », ou active l’auth anonyme, puis déploie les règles (collection FavorisMedias, auth requis)."
      );
    } else {
      alertMsgBoxPopup("❌ Erreur lors de la mise à jour des favoris.");
    }
    try { await requestUIRefresh({ keepCurrentIndex: true }); } catch (_) { }
  }
  } finally {
    window.__zcMedias1FavBusy = false;
  }
}

async function mettreAJourCaseSelectionMedia() {
  const uid = mailUser;
  if (!uid) { zcMediasUpdateFavorisHeartUi(false, 0); return; }
  try {
    let liste = []; try { liste = JSON.parse(localStorage.getItem("playlistMedias") || "[]"); } catch { }
    if (!Array.isArray(liste) || !liste.length) { liste = await creerPlayList(); localStorage.setItem("playlistMedias", JSON.stringify(liste || [])); }
    const est = !!(mediaLinkOriginel && liste.includes(mediaLinkOriginel)), total = liste.length;
    zcMediasUpdateFavorisHeartUi(est, total);
  } catch (e) { console.error("Case sélection:", e); zcMediasUpdateFavorisHeartUi(false, 0); }
}

async function chargerFavorisUtilisateur() {
  if (!mailUser) { console.warn("❌ Aucun utilisateur connecté."); return []; }
  try {
    await zcMedias1AwaitFirebaseUserForWrite();
    const snap = await zcMedias1Db.collection("FavorisMedias").doc(zcMedias1FavorisDocId()).get();
    return snap.exists ? (snap.data().listeFavoris || []) : [];
  } catch (e) { console.error("load favoris:", e); return []; }
}
async function creerPlayList() {
  if (!mailUser) { console.warn("❌ Aucun utilisateur connecté."); return []; }
  try {
    await zcMedias1AwaitFirebaseUserForWrite();
    const snap = await zcMedias1Db.collection("FavorisMedias").doc(zcMedias1FavorisDocId()).get();
    return snap.exists ? (snap.data().listeFavoris || []) : [];
  } catch (e) { console.error("get playlist:", e); return []; }
}

/* ---------- Compteur / placeholder recherche ---------- */
function compterDocumentsLiensMedias() {
  zcMedias1RefreshGlobalsFromSession();
  return zcMedias1Db.collection("LiensMedias").get().then(q => {
    let count = 0;
    q.forEach(doc => { if (zcMediasCanAccessDoc(doc.data() || {})) count++; });
    return count;
  }).catch(() => 0);
}
compterDocumentsLiensMedias().then(n => { const el = m1El("mediaMot"); if (el) el.placeholder = `Rechercher parmi ${n} Médias`; });

/* ---------- Form popup (garde le même contrat) ---------- */
function afficherTitreFormulaire(titre) { const h = m1El("formTitle"); if (h) h.textContent = titre || "Ajouter / Modifier Média"; }
function ouvrirFormulaire(nom, lien, description, titreFormulaire, opts = {}) {
  const { linkReadOnly = false } = opts;
  afficherTitreFormulaire(titreFormulaire || "Ajouter / Modifier Média");
  const modal = m1El("formModal"), form = m1El("userForm"),
    name = m1El("nameMedia"), inLien = m1El("lienMedia"),
    desc = m1El("description"), ok = m1El("okBtn"), closeBtn = m1El("closeFormBtn");
  if (!modal || !form || !name || !inLien || !desc || !ok || !closeBtn) {
    if (name) name.value = (nom || '').trim(); if (inLien) { inLien.value = lien || ''; inLien.readOnly = !!linkReadOnly; } if (desc) desc.value = description || '';
    form.style.display = "block"; return new Promise(resolve => { const on = () => { form.style.display = "none"; ok.removeEventListener("click", on); resolve([(m1El("nameMedia")?.value || '').trim(), m1El("lienMedia")?.value || '', (m1El("description")?.value || '').trim()]); }; ok.addEventListener("click", on); });
  }
  name.value = (nom || "").trim(); inLien.value = lien || ""; inLien.readOnly = !!linkReadOnly; desc.value = description || "";
  desc.style.minHeight = "220px";
  desc.style.height = "42vh";
  desc.style.maxHeight = "55vh";
  desc.style.resize = "vertical";
  desc.style.lineHeight = "1.45";
  const modalCard = modal.querySelector(".modal-content");
  if (modalCard) {
    modalCard.style.maxWidth = "820px";
    modalCard.style.width = "95%";
    modalCard.style.padding = "12px 14px 16px";
  }
  if (typeof window.getNextZIndex === 'function') {
    try { modal.style.zIndex = String(window.getNextZIndex()); } catch (_) { }
  }
  modal.style.display = "block"; modal.setAttribute("aria-hidden", "false"); setTimeout(() => { name.focus(); }, 50);

  return new Promise(resolve => {
    let done = false;
    const cleanup = () => { document.removeEventListener("keydown", onKey); modal.removeEventListener("click", onBack); ok.removeEventListener("click", onOk); closeBtn.removeEventListener("click", onClose); };
    const close = () => { modal.style.display = "none"; modal.setAttribute("aria-hidden", "true"); cleanup(); };
    const onOk = () => { const out = [(name.value || '').trim(), inLien.value || '', (desc.value || '').trim()]; close(); if (!done) { done = true; resolve(out); } };
    const onClose = () => { const out = [(name.value || '').trim(), inLien.value || '', (desc.value || '').trim()]; close(); if (!done) { done = true; resolve(out); } };
    const onBack = (e) => { const c = modal.querySelector(".modal-content"); if (c && !c.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === "Escape") onClose(); if (e.key === "Enter" && document.activeElement === ok) { e.preventDefault(); onOk(); } };
    ok.addEventListener("click", onOk); closeBtn.addEventListener("click", onClose); modal.addEventListener("click", onBack); document.addEventListener("keydown", onKey);
  });
}
/* ---------- UI : clic hors suggestions (document, une fois) ---------- */
(function zcMedias1BindSuggestionDismissOnce() {
  if (window.__zcMedias1SuggestionDismissBound) return;
  window.__zcMedias1SuggestionDismissBound = true;
  document.addEventListener("click", function (e) {
    const r = window.__zcMedias1MountRoot;
    if (!r) return;
    const mediaMot = r.querySelector("#mediaMot");
    const sug = r.querySelector("#suggestionsMedias");
    if (!mediaMot || !sug) return;
    if (!mediaMot.contains(e.target) && !sug.contains(e.target)) sug.style.display = "none";
  });
})();

/* ---------- Démarrage (appelé à chaque initMedias1App) ---------- */
async function zcMedias1InitialiserPlaylists() {
  const fav = await chargerFavorisUtilisateur(); localStorage.setItem("playlistMedias", JSON.stringify(fav || []));
  await construireListesParType();
  const sel = m1El("listeSelect");
  const hasDoc = !!getQueryParam('docMedia');
  const lastLink = localStorage.getItem('dernierMediaLien') || '';
  const lastFolder = localStorage.getItem('dernierNomListe') || localStorage.getItem('nomListeCourante') || "playlistMedias";

  if (hasDoc) { nomListeCourante = lastFolder; _ensureOptionInSelect(nomListeCourante); if (sel) sel.value = nomListeCourante; return; }

  nomListeCourante = lastFolder; _ensureOptionInSelect(nomListeCourante); if (sel) sel.value = nomListeCourante;
  chargerListe();

  if (lastLink) {
    const found = _findListAndIndexForLink(lastLink);
    if (found) {
      nomListeCourante = found.listName; localStorage.setItem("nomListeCourante", nomListeCourante); localStorage.setItem("dernierNomListe", nomListeCourante);
      _ensureOptionInSelect(nomListeCourante); if (sel) sel.value = nomListeCourante;
      liensValidMedia = _getListFromLocalStorage(nomListeCourante); indexPlayListe = found.index;
      const el = m1El("indexInputVisible"); if (el) el.value = (indexPlayListe + 1);
      jouerPlayListe();
    }
  }
}

/* ---------- Intégration iframe: menu contextuel + layout description ---------- */
function zcEnsureMediasLayoutVisibility() {
  const container = m1El("mediaContainer");
  const iframe = m1El("mediaIframe");
  const desc = m1El("mediaDescription");
  if (container) {
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.justifyContent = "flex-start";
    container.style.alignItems = "stretch";
    container.style.flex = "1 1 auto";
    container.style.minHeight = "0";
    container.style.overflow = "hidden";
  }
  if (iframe) {
    iframe.style.display = "block";
    iframe.style.flex = "1 1 auto";
    iframe.style.minHeight = "180px";
    iframe.style.width = "100%";
  }
  if (desc) {
    desc.style.display = "block";
    desc.style.width = "100%";
    desc.style.boxSizing = "border-box";
    desc.style.flex = "0 0 auto";
    desc.style.minHeight = "2.2em";
    desc.style.marginTop = "8px";
    desc.style.textAlign = "left";
    desc.style.whiteSpace = "normal";
    desc.style.wordBreak = "break-word";
    desc.style.overflowWrap = "anywhere";
  }
}

function zcBindAddFileButton() {
  const btn = m1El("btnAddFile");
  const input = m1El("inputAddFile");
  if (!btn || !input) return;

  const lvl = Number(localStorage.getItem("niveauUser") || 0);
  btn.style.display = (lvl > 2) ? "inline-flex" : "none";

  if (!btn.dataset.boundFile) {
    btn.addEventListener("click", function () {
      try { input.click(); } catch (_) { }
    });
    btn.dataset.boundFile = "1";
  }
  if (!input.dataset.boundFile) {
    input.addEventListener("change", async function () {
      const file = input.files && input.files[0];
      if (!file) return;
      try { await ajouterMediaFichier(file); } catch (e) { console.error("Ajouter fichier:", e); }
      input.value = "";
    });
    input.dataset.boundFile = "1";
  }
}

/** Affiche / masque la popup des lignes de commandes (sous #zcMediasActionsAnchor, pas dans le panneau compact). */
function zcMediasSetDetailsExpanded(panel, detailsExpanded, toggleBtn) {
  const pop = m1El("zcMediasActionsDetailsPopup");
  if (pop) {
    if (detailsExpanded) pop.removeAttribute("hidden");
    else pop.setAttribute("hidden", "");
  }
  if (panel) panel.classList.toggle("zc-medias-actions-details-collapsed", !detailsExpanded);
  const btn = toggleBtn || m1El("zcMediasActionsMoreBtn");
  if (btn) {
    const T = zcMediasTxt();
    btn.setAttribute("aria-expanded", String(detailsExpanded));
    let g = btn.querySelector(".zc-forum-welcome-more-glyph");
    if (!g) {
      g = document.createElement("span");
      g.className = "zc-forum-welcome-more-glyph";
      g.setAttribute("aria-hidden", "true");
      btn.appendChild(g);
    }
    g.textContent = detailsExpanded ? "\u2212" : "+";
    btn.setAttribute(
      "title",
      detailsExpanded ? T.more : T.more
    );
  }
}

function zcMediasOpenCtxMenuFromButton(anchorEl) {
  const selected = (window.getSelection && String(window.getSelection() || "").trim()) || "";
  let hostWin = null;
  try {
    if (
      typeof window.openContextMenu === "function" ||
      typeof window.zcShowSelectionContextMenuFromMot === "function" ||
      typeof window.zcShowSelectionContextMenuForWord === "function"
    ) {
      hostWin = window;
    } else if (window.parent && window.parent !== window) {
      hostWin = window.parent;
    }
  } catch (_) { hostWin = null; }
  if (!hostWin) return false;

  if (typeof hostWin.openContextMenu === "function") {
    try {
      hostWin.openContextMenu(anchorEl || null);
      return false;
    } catch (_) { }
  }

  if (typeof hostWin.zcShowSelectionContextMenuFromMot === "function") {
    try {
      const opened = !!hostWin.zcShowSelectionContextMenuFromMot(anchorEl || null);
      if (opened) return false;
    } catch (_) { }
  }

  if (typeof hostWin.zcShowSelectionContextMenuForWord !== "function") return false;
  if (selected) {
    try {
      hostWin.zcShowSelectionContextMenuForWord(selected, anchorEl || null, { allowEmpty: true });
    } catch (_) { }
    return false;
  }
  const fallbackWord = String((m1El("mediaMot") && m1El("mediaMot").value) || "");
  try {
    hostWin.zcShowSelectionContextMenuForWord(fallbackWord, anchorEl || null, { allowEmpty: true });
  } catch (_) { }
  return false;
}
window.zcMediasOpenCtxMenuFromButton = zcMediasOpenCtxMenuFromButton;

function zcMediasBindActionsHelpPopupOnce() {
  if (window.__zcMediasActionsHelpPopupUiBound) return;
  window.__zcMediasActionsHelpPopupUiBound = true;
  document.addEventListener(
    "click",
    function (e) {
      const r = window.__zcMedias1MountRoot;
      if (!r || !r.querySelector) return;
      const anchor = r.querySelector("#zcMediasActionsAnchor");
      const pop = r.querySelector("#zcMediasActionsDetailsPopup");
      const panel = m1El("zcMediasActionsPanel");
      if (!anchor || !pop || !panel) return;
      if (pop.hasAttribute("hidden")) return;
      const raw = e.target;
      const el = raw && raw.nodeType === 1 ? raw : raw && raw.parentElement;
      if (!el || typeof el.closest !== "function") return;
      if (anchor.contains(el)) return;
      zcMediasSetDetailsExpanded(panel, false, m1El("zcMediasActionsMoreBtn"));
      try {
        localStorage.setItem("mediasActionsPanelCollapsed", "1");
      } catch (_) { }
    },
    true
  );
}

function zcApplyCompactTopLayout() {
  const T = zcMediasTxt();
  const root = m1Root().querySelector(".container-center.light-background");
  const topline = m1Root().querySelector(".topline");
  const mediaContainer = m1El("mediaContainer");
  const actions = m1El("conteneurBtn");
  const sortToolbar = m1El("zcMediasMetaToolbar") || null;
  const searchBlock = m1El("SelecteurMedias");
  const listToolbar = m1El("listeSelect")?.closest(".toolbar") || null;
  const navToolbar = m1El("indexInputVisible")?.closest(".toolbar") || null;

  if (!root || !topline || !actions || !mediaContainer) return;

  // Supprime l'ancien panneau +/- s'il existe.
  const oldPanel = m1El("zcMediasCommandsPanel");
  if (oldPanel) {
    if (sortToolbar) root.insertBefore(sortToolbar, mediaContainer);
    if (searchBlock) root.insertBefore(searchBlock, mediaContainer);
    if (listToolbar) {
      const desc2 = m1El("mediaDescription2")?.closest(".bouton") || null;
      mediaContainer.insertBefore(listToolbar, desc2 || mediaContainer.firstChild);
    }
    if (navToolbar) mediaContainer.insertBefore(navToolbar, mediaContainer.querySelector("#mediaIframe") || null);
    oldPanel.remove();
  }
  try { localStorage.removeItem("mediasCommandsCollapsed"); } catch (_) { }

  // Panneau actions (compact) + ancre pour popup des lignes de commandes (hors du panneau module).
  let actionsPanel = m1El("zcMediasActionsPanel");
  let anchorHost = m1El("zcMediasActionsAnchor");
  if (actionsPanel) {
    try {
      actionsPanel.classList.remove("zc-panel-collapsed");
      actionsPanel.classList.add("zc-medias-actions-panel");
      /* Comme le forum Bienvenue : évite zcSyncModuleTabsFromToolbars qui vide .zc-module-tab-icons
         et cible à tort #zcMediasActionsDetails (.zc-panel-soura-inner). */
      actionsPanel.setAttribute("data-zc-sync-tabs", "manual");
    } catch (_) { }
  }
  if (!anchorHost) {
    anchorHost = document.createElement("div");
    anchorHost.id = "zcMediasActionsAnchor";
    anchorHost.className = "zc-medias-actions-anchor";
  }
  if (!actionsPanel) {
    actionsPanel = document.createElement("div");
    actionsPanel.id = "zcMediasActionsPanel";
    actionsPanel.className = "toolbar1 zc-module-panel zc-medias-actions-panel";
    actionsPanel.setAttribute("data-zc-sync-tabs", "manual");

    const head = document.createElement("div");
    head.className = "Modules zc-module-head zc-medias-actions-welcome-head";
    head.id = "zcMediasActionsHead";

    const title = document.createElement("span");
    title.id = "zcMediasActionsTitle";
    title.className = "zc-ctx-mod-label";
    title.textContent = T.actions;
    head.appendChild(title);

    actionsPanel.appendChild(head);
    topline.insertAdjacentElement("afterend", anchorHost);
    anchorHost.appendChild(actionsPanel);
  } else if (actionsPanel.parentElement !== anchorHost) {
    const apParent = actionsPanel.parentNode;
    if (apParent) apParent.insertBefore(anchorHost, actionsPanel);
    else topline.insertAdjacentElement("afterend", anchorHost);
    anchorHost.appendChild(actionsPanel);
  }

  let detailsPopup = m1El("zcMediasActionsDetailsPopup");
  if (!detailsPopup) {
    detailsPopup = document.createElement("div");
    detailsPopup.id = "zcMediasActionsDetailsPopup";
    detailsPopup.className = "zc-medias-actions-details-popup";
    detailsPopup.setAttribute("hidden", "");
    detailsPopup.setAttribute("role", "dialog");
    detailsPopup.setAttribute("aria-modal", "false");
    detailsPopup.setAttribute("aria-label", T.detailsAria);
    anchorHost.appendChild(detailsPopup);
  } else if (detailsPopup.parentElement !== anchorHost) {
    anchorHost.appendChild(detailsPopup);
  }

  // Le corps du panneau = toolbar réelle (les boutons existants), puis rangée type Forum Bienvenue.
  if (actions.parentElement !== actionsPanel) actionsPanel.appendChild(actions);
  actions.id = "conteneurBtn";
  actions.className = "toolbar zc-module-toolbar-inner zc-medias-actions-iconbar";
  actions.style.margin = "0";

  /** Même idée que #forumWelcomeMorePanel : titre + barre (icônes + « + »), liste déroulante séparée. */
  function zcMediasEnsureActionsPanelChrome(panel, actionsEl) {
    const headEl = m1El("zcMediasActionsHead");
    if (!headEl || !actionsEl) return null;
    headEl.classList.add("zc-medias-actions-welcome-head");
    let titleWrap = headEl.querySelector(".zc-medias-actions-head-title");
    const titleEl = m1El("zcMediasActionsTitle");
    if (!titleWrap) {
      titleWrap = document.createElement("div");
      titleWrap.className = "zc-medias-actions-head-title";
      if (titleEl && titleEl.parentNode === headEl) {
        headEl.insertBefore(titleWrap, titleEl);
        titleWrap.appendChild(titleEl);
      } else {
        headEl.insertBefore(titleWrap, headEl.firstChild);
        if (titleEl) titleWrap.appendChild(titleEl);
      }
    } else if (titleEl && titleEl.parentNode !== titleWrap) {
      titleWrap.appendChild(titleEl);
    }
    let tabStrip = headEl.querySelector(".zc-medias-actions-tab-icons");
    if (!tabStrip) {
      tabStrip = document.createElement("div");
      tabStrip.className = "zc-module-tab-icons zc-medias-actions-tab-icons";
      tabStrip.setAttribute("role", "toolbar");
      tabStrip.setAttribute("aria-label", T.mediaActionsAria);
      headEl.appendChild(tabStrip);
    }
    if (actionsEl.parentElement !== tabStrip) {
      tabStrip.insertBefore(actionsEl, tabStrip.firstChild);
    }
    const oldCol = headEl.querySelector(".zc-panel-collapse-btn");
    if (oldCol) oldCol.remove();
    let moreBtn = m1El("zcMediasActionsMoreBtn");
    if (!moreBtn) {
      moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.id = "zcMediasActionsMoreBtn";
      moreBtn.className =
        "menu-button active zc-top-action-btn zc-module-tab-icon-btn zc-forum-welcome-more-toggle zc-medias-bars-style-btn";
      moreBtn.setAttribute("aria-expanded", "false");
      moreBtn.setAttribute("aria-haspopup", "true");
      moreBtn.setAttribute("aria-controls", "zcMediasActionsDetailsPopup");
      moreBtn.setAttribute("title", T.more);
      const g = document.createElement("span");
      g.className = "zc-forum-welcome-more-glyph";
      g.setAttribute("aria-hidden", "true");
      g.textContent = "+";
      moreBtn.appendChild(g);
      tabStrip.appendChild(moreBtn);
    } else if (moreBtn.parentElement !== tabStrip) {
      tabStrip.appendChild(moreBtn);
    }
    let ctxBtn = m1El("zcMediasCtxMenuBtn");
    if (ctxBtn && ctxBtn.getAttribute("data-zc-medias-toolbar") !== "help") {
      try {
        ctxBtn.remove();
      } catch (_) { }
      ctxBtn = null;
    }
    if (!ctxBtn) {
      ctxBtn = document.createElement("button");
      ctxBtn.type = "button";
      ctxBtn.id = "zcMediasCtxMenuBtn";
      ctxBtn.setAttribute("data-zc-medias-toolbar", "help");
      ctxBtn.className = "menu-button active zc-top-action-btn zc-module-tab-icon-btn zc-medias-bars-style-btn";
      ctxBtn.setAttribute("title", T.help);
      ctxBtn.setAttribute("aria-label", T.help);
      const ico = document.createElement("span");
      ico.className = "zc-top-action-ico";
      ico.setAttribute("aria-hidden", "true");
      ico.textContent = "?";
      ctxBtn.appendChild(ico);
      ctxBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.showMediasHelp === "function") window.showMediasHelp();
      });
    }
    try {
      ctxBtn.removeAttribute("data-zc-opens-selection-ctx");
      ctxBtn.classList.remove("zc-popup-ctx-tab");
      ctxBtn.setAttribute("title", T.help);
      ctxBtn.setAttribute("aria-label", T.help);
      const icoUp = ctxBtn.querySelector(".zc-top-action-ico");
      if (icoUp) icoUp.textContent = "?";
    } catch (_) { }
    if (ctxBtn.parentElement !== tabStrip) {
      tabStrip.insertBefore(ctxBtn, moreBtn);
    } else if (moreBtn && ctxBtn.nextElementSibling !== moreBtn) {
      tabStrip.insertBefore(ctxBtn, moreBtn);
    }
    try {
      moreBtn.setAttribute("aria-controls", "zcMediasActionsDetailsPopup");
    } catch (_) { }
    return moreBtn;
  }

  const moreToggleBtn = zcMediasEnsureActionsPanelChrome(actionsPanel, actions);

  const btnAddFile = m1El("btnAddFile");
  const btnAddLink = m1El("addLinkButton");
  const btnModify = m1El("modifierMediaButton");
  const btnDelete = m1El("deleteLinkButton");
  const btnShare = m1El("partagerMedia");
  const iconHeart = m1El("iconHeart");

  if (btnAddFile) { btnAddFile.title = T.addFile; btnAddFile.setAttribute("aria-label", T.addFile); }
  if (btnAddLink) { btnAddLink.title = T.addLink; btnAddLink.setAttribute("aria-label", T.addLink); }
  if (btnModify) { btnModify.title = T.edit; btnModify.setAttribute("aria-label", T.edit); }
  if (btnDelete) { btnDelete.title = T.del; btnDelete.setAttribute("aria-label", T.del); }
  if (btnShare) { btnShare.title = T.share; btnShare.setAttribute("aria-label", T.share); }

  function zcWrapIconBtn(btn, iconClass) {
    if (!btn) return;
    btn.innerHTML = "";
    const ico = document.createElement("span");
    ico.className = "zc-top-action-ico";
    ico.setAttribute("aria-hidden", "true");
    const i = document.createElement("i");
    i.className = iconClass;
    i.setAttribute("aria-hidden", "true");
    ico.appendChild(i);
    btn.appendChild(ico);
    btn.classList.add("menu-button", "active", "zc-top-action-btn");
    btn.classList.add("zc-medias-bars-style-btn");
    btn.style.minWidth = "auto";
    btn.style.height = "auto";
    btn.style.padding = "1px 4px";
    btn.setAttribute("data-zc-no-auto-collapse", "1");
    btn.setAttribute("aria-label", btn.title || btn.getAttribute("aria-label") || "Action");
  }

  zcWrapIconBtn(btnAddFile, "fas fa-file-upload");
  zcWrapIconBtn(btnAddLink, "fas fa-link");
  zcWrapIconBtn(btnModify, "fas fa-pencil-alt");
  zcWrapIconBtn(btnDelete, "fas fa-trash");
  zcWrapIconBtn(btnShare, "fas fa-share-square");

  // Le strip d'icônes du panneau ne reconstruit que des <button> : on remplace le <i> cœur par un vrai bouton.
  let btnFav = m1El("btnMediasFavoris");
  if (iconHeart && !btnFav) {
    btnFav = document.createElement("button");
    btnFav.type = "button";
    btnFav.id = "btnMediasFavoris";
    btnFav.title = T.fav;
    btnFav.setAttribute("aria-label", T.fav);
    btnFav.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (typeof mettreAJourListeFavorisSimple === "function") {
        void mettreAJourListeFavorisSimple();
      }
      return false;
    };
    if (iconHeart.parentNode) iconHeart.parentNode.insertBefore(btnFav, iconHeart);
    iconHeart.remove();
    zcWrapIconBtn(btnFav, "fas fa-heart");
    btnFav.classList.remove("zc-medias-bars-style-btn");
    btnFav.classList.add("zc-medias-fav-heart-btn", "like-btn");
  } else if (btnFav) {
    zcWrapIconBtn(btnFav, "fas fa-heart");
    btnFav.classList.remove("zc-medias-bars-style-btn");
    btnFav.classList.add("zc-medias-fav-heart-btn", "like-btn");
  }

  /** Texte des lignes popup = title du bouton d’action, sinon aria-label (pas de libellé dans la barre). */
  function zcMediasGetActionDisplayLabel(srcId) {
    const el = m1El(srcId);
    if (!el) return "";
    return String(el.getAttribute("title") || el.getAttribute("aria-label") || "").trim();
  }

  function zcMediasUnwrapActionBarCmds(bar) {
    if (!bar || !bar.querySelectorAll) return;
    Array.from(bar.querySelectorAll(".zc-medias-actions-cmd-wrap")).forEach(function (wrap) {
      const btn = wrap.querySelector("button");
      if (!btn || !wrap.parentNode) return;
      wrap.parentNode.insertBefore(btn, wrap);
      wrap.remove();
    });
  }
  zcMediasUnwrapActionBarCmds(actions);

  /* « Ajouter » : pas d’infobulle native (title) ; aria-label sert popup + accessibilité. */
  if (btnAddFile) {
    btnAddFile.removeAttribute("title");
    btnAddFile.setAttribute("aria-label", T.addFile);
  }
  if (btnAddLink) {
    btnAddLink.removeAttribute("title");
    btnAddLink.setAttribute("aria-label", T.addLink);
  }

  const listSelect = m1El("listeSelect");
  const favToolbar = listSelect ? listSelect.parentElement : null;
  let favInline = m1El("zcMediasFavorisInline");
  if (favToolbar && !favInline) {
    favInline = document.createElement("span");
    favInline.id = "zcMediasFavorisInline";
    favInline.style.display = "inline-flex";
    favInline.style.alignItems = "center";
    favInline.style.gap = "6px";
    favInline.style.marginLeft = "8px";
    if (listSelect.nextSibling) favToolbar.insertBefore(favInline, listSelect.nextSibling);
    else favToolbar.appendChild(favInline);
  }
  if (favInline) {
    if (btnFav && btnFav.parentElement !== favInline) favInline.appendChild(btnFav);
  }

  // Supprime les espaces texte résiduels (ex: &nbsp; entre boutons)
  Array.from(actions.childNodes || []).forEach((n) => {
    if (n && n.nodeType === Node.TEXT_NODE) {
      const t = String(n.textContent || "").replace(/\u00a0/g, " ").trim();
      if (!t) n.textContent = "";
    }
  });

  // Lignes de commandes : dans la popup sous l’ancre (pas dans le panneau module — évite overflow:hidden).
  let details = m1El("zcMediasActionsDetails");
  const popupEl = m1El("zcMediasActionsDetailsPopup");
  if (!details) {
    details = document.createElement("div");
    details.id = "zcMediasActionsDetails";
    details.className =
      "zc-medias-actions-details-inner zc-module-toolbar-inner zc-module-actions-list zc-forum-welcome-more-panel";
    details.setAttribute("role", "menu");
    details.setAttribute("aria-labelledby", "zcMediasActionsMoreBtn");
    if (popupEl) popupEl.appendChild(details);
  } else {
    details.className =
      "zc-medias-actions-details-inner zc-module-toolbar-inner zc-module-actions-list zc-forum-welcome-more-panel";
    details.setAttribute("role", "menu");
    details.setAttribute("aria-labelledby", "zcMediasActionsMoreBtn");
    if (popupEl && details.parentElement !== popupEl) popupEl.appendChild(details);
  }

  function zcBuildHelpRow(srcId, iconClass, displayTitle) {
    const t = String(displayTitle || "").trim() || "…";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-button active zc-top-action-btn zc-forum-welcome-more-cmd";
    btn.id = "mediasHelp__" + srcId;
    btn.setAttribute("data-zc-no-auto-collapse", "1");
    btn.removeAttribute("title");
    btn.setAttribute("aria-label", t);

    const ico = document.createElement("span");
    ico.className = "zc-forum-welcome-more-ico";
    ico.setAttribute("aria-hidden", "true");
    const i = document.createElement("i");
    i.className = iconClass;
    i.setAttribute("aria-hidden", "true");
    ico.appendChild(i);

    const lbl = document.createElement("span");
    lbl.className = "zc-forum-welcome-more-label";
    lbl.textContent = t;

    btn.appendChild(ico);
    btn.appendChild(lbl);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const src = m1El(srcId);
      if (src && !src.disabled) {
        try { src.click(); } catch (err) { console.warn(err); }
      }
    });

    return btn;
  }

  details.textContent = "";
  const seenActionIds = new Set();
  const actionButtonsInBar = Array.from(actions.querySelectorAll("button[id]")).filter(function (b) {
    if (!b || b.disabled) return false;
    if (b.id === "zcMediasActionsMoreBtn") return false;
    if (b.id === "btnMediasFavoris" || b.id === "btnMediasFavorisCheck") return false;
    const st = window.getComputedStyle ? window.getComputedStyle(b) : null;
    if (st && (st.display === "none" || st.visibility === "hidden")) return false;
    return true;
  });
  actionButtonsInBar.forEach(function (srcBtn) {
    if (seenActionIds.has(srcBtn.id)) return;
    seenActionIds.add(srcBtn.id);
    let iconClass = "fas fa-circle";
    const iconEl = srcBtn.querySelector("i");
    if (iconEl && iconEl.className) iconClass = iconEl.className;
    details.appendChild(
      zcBuildHelpRow(srcBtn.id, iconClass, zcMediasGetActionDisplayLabel(srcBtn.id))
    );
  });

  const headEl = m1El("zcMediasActionsHead");
  const oldStrip = m1El("zcMediasActionsTabStrip");
  if (oldStrip) {
    try { oldStrip.remove(); } catch (_) { }
  }

  if (headEl) {
    const toggleForState = moreToggleBtn || m1El("zcMediasActionsMoreBtn");
    const key = "mediasActionsPanelCollapsed";
    let detailsExpanded = false;
    try {
      detailsExpanded = localStorage.getItem(key) === "0";
    } catch (_) {
      detailsExpanded = false;
    }
    zcMediasSetDetailsExpanded(actionsPanel, detailsExpanded, toggleForState);

    /* Délégation sur le panneau : survit si le strip est reconstruit ; évite double bascule avec le bouton seul. */
    if (actionsPanel && !actionsPanel.dataset.zcMediasActionsToggleDeleg) {
      actionsPanel.dataset.zcMediasActionsToggleDeleg = "1";
      actionsPanel.addEventListener(
        "click",
        function (e) {
          const t = e.target && e.target.closest && e.target.closest("#zcMediasActionsMoreBtn");
          if (!t || !actionsPanel.contains(t)) return;
          e.preventDefault();
          e.stopPropagation();
          const isExpanded = !actionsPanel.classList.contains("zc-medias-actions-details-collapsed");
          const nextExpanded = !isExpanded;
          zcMediasSetDetailsExpanded(actionsPanel, nextExpanded, t);
          try {
            localStorage.setItem(key, nextExpanded ? "0" : "1");
          } catch (_) { }
        },
        false
      );
    }
  }

  // Les autres lignes reviennent dans leur flux d'origine (non repliables).
  if (sortToolbar) {
    root.insertBefore(sortToolbar, mediaContainer);
    sortToolbar.style.margin = "2px 0";
    sortToolbar.style.width = "100%";
    sortToolbar.style.boxSizing = "border-box";
  }
  if (searchBlock) {
    root.insertBefore(searchBlock, mediaContainer);
    searchBlock.style.margin = "2px 0";
    searchBlock.style.width = "100%";
    searchBlock.style.boxSizing = "border-box";
  }
  if (listToolbar && listToolbar.parentElement !== mediaContainer) {
    mediaContainer.insertBefore(listToolbar, mediaContainer.querySelector("#mediaIframe") || mediaContainer.firstChild);
  }
  if (navToolbar && navToolbar.parentElement !== mediaContainer) {
    mediaContainer.insertBefore(navToolbar, mediaContainer.querySelector("#mediaIframe") || null);
  }
}

function zcForwardSelectionContextMenuFromMedias(evt) {
  let parentWin = null;
  try {
    parentWin = (window.parent && window.parent !== window) ? window.parent : null;
  } catch (_) { parentWin = null; }
  if (!parentWin || typeof parentWin.zcShowSelectionContextMenuForWord !== "function") return;

  let selected = "";
  try {
    const sel = window.getSelection ? window.getSelection() : document.getSelection();
    selected = String(sel && sel.toString ? sel.toString() : "").trim();
  } catch (_) { selected = ""; }
  if (!selected) return;

  if (evt && typeof evt.preventDefault === "function") evt.preventDefault();

  let x = (evt && typeof evt.clientX === "number") ? evt.clientX : Math.round(window.innerWidth / 2);
  let y = (evt && typeof evt.clientY === "number") ? evt.clientY : Math.round(window.innerHeight / 2);
  try {
    if (window.frameElement && typeof window.frameElement.getBoundingClientRect === "function") {
      const r = window.frameElement.getBoundingClientRect();
      x += r.left;
      y += r.top;
    }
  } catch (_) { }

  try {
    parentWin.zcShowSelectionContextMenuForWord(selected, { clientX: x, clientY: y });
  } catch (_) { }
}

function zcMedias1BindGlobalSelectionForwardOnce() {
  if (window.__zcMedias1GlobalCtxBound) return;
  window.__zcMedias1GlobalCtxBound = true;
  document.addEventListener("contextmenu", function (e) {
    zcForwardSelectionContextMenuFromMedias(e);
  });
  document.addEventListener("dblclick", function (e) {
    setTimeout(function () { zcForwardSelectionContextMenuFromMedias(e); }, 0);
  });
  document.addEventListener(
    "touchend",
    function (e) {
      setTimeout(function () { zcForwardSelectionContextMenuFromMedias(e); }, 60);
    },
    { passive: true }
  );
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    const r = window.__zcMedias1MountRoot;
    if (!r) return;
    const modal = r.querySelector("#mediasHelpModal");
    if (modal && modal.style.display === "flex" && typeof window.hideMediasHelp === "function") window.hideMediasHelp();
  });
}

window.__zcMedias1RunBootstrap = async function __zcMedias1RunBootstrap() {
  const titleModule = m1El("zcMediasModuleTitle");
  if (titleModule) {
    const au = String(typeof nameUser !== "undefined" ? nameUser : "").trim() || String(localStorage.getItem("nameUser") || "Auteur").trim();
    titleModule.innerHTML = '<i class="fas fa-laptop" aria-hidden="true"></i> Bibliothèque Numéric @' + au.replace(/^@/, "");
  }

  const x = m1El("closeFormBtn");
  if (x && !x.dataset.zcMedias1CloseFormBound) {
    x.dataset.zcMedias1CloseFormBound = "1";
    x.addEventListener("click", function () {
      const m = m1El("formModal");
      if (m) { m.style.display = "none"; m.setAttribute("aria-hidden", "true"); }
    });
  }
  const mediaMot = m1El("mediaMot");
  if (mediaMot && !mediaMot.dataset.zcMedias1SyncBound) {
    mediaMot.dataset.zcMedias1SyncBound = "1";
    const sync = function () { tryMajIndexDepuisLien(mediaLinkOriginel); };
    mediaMot.addEventListener("focus", sync);
    mediaMot.addEventListener("click", sync);
  }

  await zcMedias1InitialiserPlaylists();
  const ifr0 = m1El("mediaIframe");
  if (ifr0) ifr0.src = "";
  await prefillinput();

  zcBindAddFileButton();
  zcApplyCompactTopLayout();
  try { await mettreAJourCaseSelectionMedia(); } catch (_) { }
  zcMediasBindActionsHelpPopupOnce();
  zcEnsureMediasLayoutVisibility();

  const modalHelp = m1El("mediasHelpModal");
  const closeHelp = m1El("closeMediasHelpBtn");
  if (closeHelp && !closeHelp.dataset.zcMedias1HelpCloseBound) {
    closeHelp.dataset.zcMedias1HelpCloseBound = "1";
    closeHelp.addEventListener("click", function () {
      if (typeof window.hideMediasHelp === "function") window.hideMediasHelp();
    });
  }
  if (modalHelp && !modalHelp.dataset.zcMedias1HelpBackdropBound) {
    modalHelp.dataset.zcMedias1HelpBackdropBound = "1";
    modalHelp.addEventListener("click", function (e) {
      const panel = modalHelp.querySelector(".modal-content");
      if (panel && !panel.contains(e.target) && typeof window.hideMediasHelp === "function") window.hideMediasHelp();
    });
  }

  zcMedias1BindGlobalSelectionForwardOnce();
};
