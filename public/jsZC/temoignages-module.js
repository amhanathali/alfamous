/**
 * Témoignages — module intégré au DOM principal (index.html).
 * Firestore "temoignages", tri createdAt. Charte : jsZC/temoignages-charte-fragment.js.
 * Langue UI : getLang() / uiLangSelect (pas de bouton cycle sur la charte).
 */
(function () {
  "use strict";

  const COLLECTION_NAME = "temoignages";
  const SOURCE_PAGE = "temoignages-module";
  const PREVIEW_LEN = 300;
  const MAX_LEN = 20000;
  const MIN_LEN = 40;
  const DEFAULT_ALIAS = "anonyme";
  const DEFAULT_MAIL = "anonyme@blog.alfamous.ca";
  const TEMOIGNAGES_COOLDOWN_MS = 25000;
  const TEMOIGNAGES_LAST_SENT_KEY = "temoignagesLastSentAt";

  const CHARTE_LANGS = ["fr", "ar", "en", "kab", "es"];
  const CHARTE_HEADINGS = {
    fr: { intent: "Notre intention", safety: "Anonymat et sécurité", publish: "Ce que nous publions", nopublish: "Ce que nous ne publions pas", breath: "Un espace de respiration" },
    ar: { intent: "النية", safety: "الخصوصية والسلامة", publish: "ما ننشره", nopublish: "ما لا ننشره", breath: "مساحة للتنفّس" },
    en: { intent: "Our intention", safety: "Anonymity and safety", publish: "What we publish", nopublish: "What we do not publish", breath: "A breathing space" },
    kab: { intent: "Taneɣrit-nneɣ", safety: "Anonymat akked tɣellist", publish: "Ayen i d-nessefru", nopublish: "Ayen ur nessefru ara", breath: "Tallunt n usenfes" },
    es: { intent: "Nuestra intención", safety: "Anonimato y seguridad", publish: "Lo que publicamos", nopublish: "Lo que no publicamos", breath: "Un espacio para respirar" }
  };

  function getAppLang() {
    try {
      if (typeof getLang === "function") return String(getLang() || "fr").toLowerCase();
    } catch (_) { }
    try {
      return String(localStorage.getItem("uiLang") || "fr").toLowerCase();
    } catch (_) {
      return "fr";
    }
  }

  /** Charte : fr | ar | en | kab | es */
  function mapAppLangToCharter(lc) {
    const l = String(lc || "fr").toLowerCase();
    if (l === "ar") return "ar";
    if (l === "en") return "en";
    if (l === "kab") return "kab";
    if (l === "es") return "es";
    return "fr";
  }

  const UI = {
    fr: {
      title: "Témoignages",
      searchPh: "Rechercher un mot-clé…",
      clearTitle: "Effacer",
      send: "Envoyer un témoignage",
      countLoad: "Chargement depuis Firebase…",
      countErr: "❌ Erreur: impossible de charger depuis Firestore.",
      countNone: "📄 Aucun témoignage trouvé",
      countFound: "📄 Témoignages trouvés : %n / %t",
      empty: "Aucun résultat.",
      untitled: "Sans titre",
      clickRead: "👆 Clique pour lire",
      charterPill: "Charte",
      charterTitle: "Charte du projet Témoignages",
      charterHelpBtn: "Charte du projet — aide",
      close: "Fermer",
      copyLink: "Partager",
      copyText: "Copier le texte",
      moderation: "Modération",
      copiedShare: "Lien copié dans le presse-papiers.",
      copiedText: "Texte copié.",
      copyFailed: "Copie impossible (navigateur ou permissions).",
      statusFilterPending: "⏳ pending",
      statusFilterApproved: "✅ approved",
      statusFilterRejected: "⛔ rejected",
      statusFilterAll: "📚 ALL",
      addTitle: "🗣️ Envoyer un témoignage",
      addHint: "Votre message sera relu avant publication (status = pending).",
      alias: "Nom / Alias (optionnel)",
      mail: "Email (optionnel)",
      titleL: "Titre (obligatoire)",
      contentL: "Témoignage (obligatoire)",
      cancel: "Annuler",
      submit: "Envoyer",
      titleRequired: "Titre requis.",
      sending: "Envoi…",
      thanks: "✅ Merci. Témoignage reçu. Il sera relu avant publication.",
      waitSec: "Patientez encore %n s avant un nouvel envoi.",
      adminSave: "💾 Enregistrer",
      adminApprove: "✅ Approuver",
      adminReject: "⛔ Rejeter",
      adminDelete: "🗑 Supprimer",
      adminDeleteConfirm: "Supprimer définitivement ce témoignage de Firestore ?",
      adminBox: "🛠️ Modération"
    },
    en: {
      title: "Testimonies",
      searchPh: "Search a keyword…",
      clearTitle: "Clear",
      send: "Submit a testimony",
      countLoad: "Loading from Firebase…",
      countErr: "❌ Error: could not load from Firestore.",
      countNone: "📄 No testimony found",
      countFound: "📄 Testimonies found: %n / %t",
      empty: "No results.",
      untitled: "Untitled",
      clickRead: "👆 Tap to read",
      charterPill: "Charter",
      charterTitle: "Testimonies Project Charter",
      charterHelpBtn: "Project charter — help",
      close: "Close",
      copyLink: "Share",
      copyText: "Copy text",
      moderation: "Moderation",
      copiedShare: "Link copied to clipboard.",
      copiedText: "Text copied.",
      copyFailed: "Could not copy (browser or permissions).",
      statusFilterPending: "⏳ pending",
      statusFilterApproved: "✅ approved",
      statusFilterRejected: "⛔ rejected",
      statusFilterAll: "📚 ALL",
      addTitle: "🗣️ Submit a testimony",
      addHint: "Your message will be reviewed before publication (pending).",
      alias: "Name / Alias (optional)",
      mail: "Email (optional)",
      titleL: "Title (required)",
      contentL: "Testimony (required)",
      cancel: "Cancel",
      submit: "Send",
      titleRequired: "Title is required.",
      sending: "Sending…",
      thanks: "✅ Thank you. Your testimony was received.",
      waitSec: "Please wait %n s before sending again.",
      adminSave: "💾 Save",
      adminApprove: "✅ Approve",
      adminReject: "⛔ Reject",
      adminDelete: "🗑 Delete",
      adminDeleteConfirm: "Permanently delete this testimony from Firestore?",
      adminBox: "🛠️ Moderation"
    },
    ar: {
      title: "شهادات",
      searchPh: "ابحث عن كلمة…",
      clearTitle: "مسح",
      send: "إرسال شهادة",
      countLoad: "جار التحميل من Firebase…",
      countErr: "❌ خطأ في التحميل.",
      countNone: "📄 لا توجد شهادات",
      countFound: "📄 الشهادات: %n / %t",
      empty: "لا نتائج.",
      untitled: "بدون عنوان",
      clickRead: "👆 اضغط للقراءة",
      charterPill: "الميثاق",
      charterTitle: "ميثاق مشروع الشهادات",
      charterHelpBtn: "ميثاق المشروع — مساعدة",
      close: "إغلاق",
      copyLink: "مشاركة",
      copyText: "نسخ النص",
      moderation: "الإشراف",
      copiedShare: "تم نسخ الرابط.",
      copiedText: "تم نسخ النص.",
      copyFailed: "تعذّر النسخ.",
      statusFilterPending: "⏳ قيد المراجعة",
      statusFilterApproved: "✅ مقبول",
      statusFilterRejected: "⛔ مرفوض",
      statusFilterAll: "📚 الكل",
      addTitle: "🗣️ إرسال شهادة",
      addHint: "سيتم مراجعة رسالتك قبل النشر.",
      alias: "الاسم / اللقب",
      mail: "البريد (اختياري)",
      titleL: "العنوان (إلزامي)",
      contentL: "النص (إلزامي)",
      cancel: "إلغاء",
      submit: "إرسال",
      titleRequired: "العنوان إلزامي.",
      sending: "جار الإرسال…",
      thanks: "✅ شكرًا، تم الاستلام.",
      waitSec: "انتظر %n ثانية قبل إرسال آخر.",
      adminSave: "💾 حفظ",
      adminApprove: "✅ قبول",
      adminReject: "⛔ رفض",
      adminDelete: "🗑 حذف",
      adminDeleteConfirm: "حذف هذه الشهادة نهائياً من Firestore؟",
      adminBox: "🛠️ إشراف"
    },
    kab: {
      title: "Ticehhiḍin",
      searchPh: "Nadi awal…",
      clearTitle: "Sfeḍ",
      send: "Azen acehdi",
      countLoad: "Asali seg Firebase…",
      countErr: "❌ Tuccḍa n usali.",
      countNone: "📄 Ulac acehdi",
      countFound: "📄 Ticehhiḍin: %n",
      empty: "Ulac igmaḍ.",
      untitled: "War azwel",
      clickRead: "👆 Sit ad teɣreḍ",
      charterPill: "Aḥṛṛu",
      charterTitle: "Aḥṛṛu n usenfaṛ n ticehhiḍin",
      charterHelpBtn: "Aḥṛṛu — tallalt",
      close: "Mdel",
      copyLink: "Bḍu",
      copyText: "Ṣḍeḍ aḍris",
      moderation: "Asenqed",
      copiedShare: "Yettwanɣel useɣwen.",
      copiedText: "Yettwanɣel aḍris.",
      copyFailed: "Ur izmir ara ad yettwaneɣ.",
      statusFilterPending: "⏳ yettraǧu",
      statusFilterApproved: "✅ yeqbəl",
      statusFilterRejected: "⛔ yugi",
      statusFilterAll: "📚 meṛṛa",
      addTitle: "🗣️ Azen acehdi",
      addHint: "Ad yettwasenqed uzen-ik send lbar.",
      alias: "Isem / meẓẓiy (amahil)",
      mail: "Imayl (amahil)",
      titleL: "Azwel (ilaq)",
      contentL: "Acehdi (ilaq)",
      cancel: "Sefsex",
      submit: "Azen",
      titleRequired: "Azwel ilaq.",
      sending: "Tuɣalin…",
      thanks: "✅ Tanmirt, yettwaṭṭfen.",
      waitSec: "Ṣber %n n tasinin send tuzna nniḍen.",
      adminSave: "💾 Sekles",
      adminApprove: "✅ Qbel",
      adminReject: "⛔ Ggi",
      adminDelete: "🗑 Kkes",
      adminDeleteConfirm: "Kkes acehdi-agi ilebda seg Firestore?",
      adminBox: "🛠️ Asenqed"
    },
    es: {
      title: "Testimonios",
      searchPh: "Buscar palabra clave…",
      clearTitle: "Borrar",
      send: "Enviar un testimonio",
      countLoad: "Cargando desde Firebase…",
      countErr: "❌ Error al cargar.",
      countNone: "📄 Ningún testimonio",
      countFound: "📄 Testimonios encontrados: %n / %t",
      empty: "Sin resultados.",
      untitled: "Sin título",
      clickRead: "👆 Clic para leer",
      charterPill: "Carta",
      charterTitle: "Carta del proyecto Testimonios",
      charterHelpBtn: "Carta del proyecto — ayuda",
      close: "Cerrar",
      copyLink: "Compartir",
      copyText: "Copiar texto",
      moderation: "Moderación",
      copiedShare: "Enlace copiado.",
      copiedText: "Texto copiado.",
      copyFailed: "No se pudo copiar.",
      statusFilterPending: "⏳ pendiente",
      statusFilterApproved: "✅ aprobado",
      statusFilterRejected: "⛔ rechazado",
      statusFilterAll: "📚 TODO",
      addTitle: "🗣️ Enviar un testimonio",
      addHint: "Tu mensaje será revisado antes de publicarse.",
      alias: "Nombre / alias (opcional)",
      mail: "Email (opcional)",
      titleL: "Título (obligatorio)",
      contentL: "Testimonio (obligatorio)",
      cancel: "Cancelar",
      submit: "Enviar",
      titleRequired: "El título es obligatorio.",
      sending: "Enviando…",
      thanks: "✅ Gracias, recibido.",
      waitSec: "Espera %n s antes de enviar de nuevo.",
      adminSave: "💾 Guardar",
      adminApprove: "✅ Aprobar",
      adminReject: "⛔ Rechazar",
      adminDelete: "🗑 Eliminar",
      adminDeleteConfirm: "¿Eliminar este testimonio de Firestore de forma permanente?",
      adminBox: "🛠️ Moderación"
    }
  };

  function t() {
    const k = getAppLang();
    return UI[k] || UI.fr;
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escTa(s) {
    return String(s ?? "").replace(/<\/textarea>/gi, "&lt;/textarea&gt;");
  }

  function norm(s) {
    return String(s ?? "").replace(/\s+/g, " ").trim();
  }

  function stripHtml(s) {
    return norm(String(s ?? "").replace(/<[^>]*>/g, " "));
  }

  function truncText(s, max) {
    const x = norm(s);
    if (!x || x.length <= max) return x;
    const cut = x.lastIndexOf(" ", max);
    return x.slice(0, cut > 0 ? cut : max) + "…";
  }

  function niceDate(ts) {
    try {
      if (!ts || !ts.toDate) return "";
      const d = ts.toDate();
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    } catch (_) {
      return "";
    }
  }

  function splitParas(text) {
    const blocks = String(text || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    return blocks.length ? blocks : [norm(text)];
  }

  /** Repère le HTML produit par formatLienForum (forum / réponses) — les anciens envois restent texte brut. */
  function isTemoignageBodyStoredAsForumHtml(s) {
    return /<\s*br\b|<\s*a\s+href/i.test(String(s || ""));
  }

  function plainTemoignageBodyFromInput(raw) {
    const t = String(raw ?? "").trim();
    if (typeof nettoyerCommentairePourChampTexte === "function") {
      return nettoyerCommentairePourChampTexte(t);
    }
    return t;
  }

  /** Même chaîne que forumSubmitNotesFromArticlesModal : liens cliquables + sauts de ligne. */
  function formatTemoignageContentForDb(plain) {
    const bodyPlain = String(plain ?? "").trim();
    if (!bodyPlain) return "";
    try {
      if (typeof formatLienForum === "function") return formatLienForum(bodyPlain);
    } catch (_) { /* ignore */ }
    return bodyPlain.replace(/(\r\n|\r|\n)/g, "<br>");
  }

  function previewPlainFromTemoignageContent(s) {
    const raw = String(s ?? "");
    if (!isTemoignageBodyStoredAsForumHtml(raw)) return norm(raw);
    const d = document.createElement("div");
    d.innerHTML =
      typeof nettoyerCommentairePourHtml === "function"
        ? nettoyerCommentairePourHtml(raw)
        : raw;
    return norm(d.textContent || "");
  }

  function plainTextCopyFromTemoignageContent(s) {
    const raw = String(s ?? "");
    if (!isTemoignageBodyStoredAsForumHtml(raw)) return raw.trim();
    const d = document.createElement("div");
    d.innerHTML =
      typeof nettoyerCommentairePourHtml === "function"
        ? nettoyerCommentairePourHtml(raw)
        : raw;
    return (d.innerText || d.textContent || "").trim();
  }

  /** Rendu lecture : HTML forum ou paragraphes texte (anciens envois). */
  function fillTemoignageBodyDisplay(container, rawContent, doHighlight) {
    if (!container) return;
    container.innerHTML = "";
    const raw = String(rawContent || "");
    if (isTemoignageBodyStoredAsForumHtml(raw)) {
      const wrap = document.createElement("div");
      wrap.className = "tm-read-body-html";
      wrap.innerHTML =
        typeof nettoyerCommentairePourHtml === "function"
          ? nettoyerCommentairePourHtml(raw)
          : raw;
      container.appendChild(wrap);
    } else {
      for (const block of splitParas(raw)) {
        if (/^«/.test(block) && /»\s*$/.test(block) && block.length <= 260) {
          const bq = document.createElement("blockquote");
          bq.textContent = block;
          container.appendChild(bq);
        } else {
          const p = document.createElement("p");
          p.textContent = block;
          container.appendChild(p);
        }
      }
    }
    if (doHighlight !== false) applyHighlights(container);
  }

  function isAdmin() {
    return Number(localStorage.getItem("niveauUser") || 0) > 2;
  }

  function nameUser() {
    return localStorage.getItem("nameUser") || "anonyme";
  }

  function getDb() {
    try {
      if (window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore();
    } catch (_) { }
    return null;
  }

  async function copyTextToClipboard(text) {
    const s = String(text ?? "");
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(s);
        return true;
      }
    } catch (_) { }
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  /** Une seule pile : z-index-stack.js (zcBringToFront ou getNextZIndex). */
  function applyStackZIndex(el) {
    if (!el) return;
    try {
      if (typeof window.zcBringToFront === "function") {
        window.zcBringToFront(el, 0);
        return;
      }
    } catch (_) {}
    const zFn =
      typeof window.getNextZIndex === "function"
        ? window.getNextZIndex
        : typeof getNextZIndex === "function"
          ? getNextZIndex
          : null;
    let z = 2;
    if (zFn) {
      try {
        z = zFn();
      } catch (_) {}
    }
    el.style.zIndex = String(z);
  }

  /** Popup #popupHtml au sommet de la pile, puis overlay (règle app : z-index dynamiques). */
  function bumpHostPopupHtmlIfOpen() {
    try {
      const popup = document.getElementById("popupHtml");
      if (!popup) return;
      const st = window.getComputedStyle(popup);
      if (st.display === "none" || st.visibility === "hidden") return;
      applyStackZIndex(popup);
    } catch (_) { }
  }

  function openTemoignagesModalOverlay(el) {
    if (!el) return;
    bumpHostPopupHtmlIfOpen();
    applyStackZIndex(el);
  }

  function applyCharterLang(root, charterLang) {
    if (!root) return;
    const lang = CHARTE_LANGS.indexOf(charterLang) >= 0 ? charterLang : "fr";
    root.querySelectorAll(".tmg-lang").forEach((p) => {
      const on = p.getAttribute("data-lang") === lang;
      p.classList.toggle("is-visible", on);
      p.style.display = on ? "block" : "none";
    });
    const heads = CHARTE_HEADINGS[lang] || CHARTE_HEADINGS.fr;
    root.querySelectorAll("h3[data-key]").forEach((h) => {
      const key = h.getAttribute("data-key");
      if (key && heads[key]) h.textContent = heads[key];
    });
  }

  async function fetchCharterFragment() {
    if (window.__zcTemoignagesCharterHtml) return window.__zcTemoignagesCharterHtml;
    const embedded =
      typeof window.__ZC_TEMOIGNAGES_CHARTE_INNER === "string" ? window.__ZC_TEMOIGNAGES_CHARTE_INNER : "";
    window.__zcTemoignagesCharterHtml = embedded;
    return window.__zcTemoignagesCharterHtml;
  }

  function injectModuleStyles(host) {
    if (host.querySelector("#zcTemoignagesModuleStyles")) return;
    const st = document.createElement("style");
    st.id = "zcTemoignagesModuleStyles";
    st.textContent = `
      .zc-temoignages-module{margin:0;display:flex;flex-direction:column;height:100%;min-height:0}
      .zc-temoignages-module .app-header{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}
      .zc-temoignages-module .tm-list-title-bar{direction:ltr;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;width:100%;box-sizing:border-box;margin:0 0 6px;min-height:40px;position:relative}
      .zc-temoignages-module .tm-list-title-actions{display:inline-flex;align-items:center;gap:8px;justify-self:start;position:relative;z-index:2}
      .zc-temoignages-module .tm-list-title-center{margin:0;font-size:1.05rem;font-weight:700;color:var(--zc-text);text-align:center;line-height:1.2;min-width:0;justify-self:center}
      .zc-temoignages-module .tm-send-above-search{width:100%}
      .zc-temoignages-module .tm-send-row{display:flex;flex-direction:row;align-items:center;gap:10px;width:100%;box-sizing:border-box}
      .zc-temoignages-module .tm-send-row-help{flex:0 0 auto;align-self:center;margin:0}
      .zc-temoignages-module .tm-send-row-submit.menu-button.zc-top-action-btn{
        flex:1 1 auto;width:auto;max-width:100%;min-width:0;box-sizing:border-box;margin:0;
        justify-content:flex-start;align-items:center;gap:0.35rem;
        background:transparent!important;border:none!important;box-shadow:none!important;
        color:var(--zc-popup-link)!important;font-size:1rem;font-weight:600;min-height:auto;
        padding:4px 2px;border-radius:0;text-align:left;cursor:pointer;
      }
      .zc-temoignages-module #tmBtnSend,
      .zc-temoignages-module #tmBtnSend .zc-top-action-ico,
      .zc-temoignages-module #tmBtnSend .zc-top-action-label{
        color:var(--zc-popup-link)!important;
      }
      .zc-temoignages-module .tm-send-row-submit.menu-button.zc-top-action-btn:hover{
        background:var(--zc-popup-link-soft)!important;color:var(--zc-popup-link-hover)!important;text-decoration:underline;
      }
      .zc-temoignages-module #tmBtnSend:hover,
      .zc-temoignages-module #tmBtnSend:hover .zc-top-action-ico,
      .zc-temoignages-module #tmBtnSend:hover .zc-top-action-label{
        color:var(--zc-popup-link-hover)!important;
      }
      .zc-temoignages-module .tm-send-row-submit .zc-top-action-ico,
      .zc-temoignages-module .tm-send-row-submit .zc-top-action-label{color:inherit!important}
      .zc-temoignages-module .tm-controls{display:flex;flex-direction:column;flex-wrap:nowrap;gap:8px;align-items:stretch;margin:8px 0}
      .zc-temoignages-module .tm-search-wrap.zc-search-wrap{position:relative;width:100%;min-width:0}
      .zc-temoignages-module .tm-search-loupe.zc-search-go{opacity:.55}
      .zc-temoignages-module .tm-read-popup-head.zc-popup-header-unified{padding:6px 4px 10px;gap:8px}
      .zc-temoignages-module .tm-read-topbar{direction:ltr;display:flex;justify-content:space-between;align-items:center;width:100%;margin:0 0 2px}
      .zc-temoignages-module .tm-read-share-row{display:flex;flex-direction:row;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;width:100%;margin:0 0 6px}
      .zc-temoignages-module .tm-read-share-row .tm-btn{display:inline-flex;align-items:center;justify-content:center;flex:1 1 auto;min-width:min(140px,42%);max-width:100%;gap:.45rem}
      .zc-temoignages-module .tm-read-share-row .tm-read-action-ico{flex-shrink:0;font-size:1.1em;line-height:1;opacity:.95}
      .zc-temoignages-module .tm-read-panel .tm-btn{
        border:none!important;background:transparent!important;box-shadow:none!important;border-radius:0!important;
        color:var(--zc-popup-link)!important;padding:4px 2px!important;font-weight:600;text-decoration:underline;text-underline-offset:2px;
      }
      .zc-temoignages-module .tm-read-panel .tm-btn:hover{color:var(--zc-popup-link-hover)!important;background:var(--zc-popup-link-soft)!important}
      .zc-temoignages-module .tm-read-meta{margin:6px 0 0;font-size:13px;color:var(--zc-text-muted);line-height:1.35}
      .zc-temoignages-module .tm-read-copy-feedback{min-height:1.2em;margin:0 0 4px;padding:0 4px;font-size:12px;color:var(--zc-accent);text-align:center}
      .zc-temoignages-module .tm-read-body-html{line-height:1.55;word-break:break-word;font-size:15px;color:var(--zc-text)}
      .zc-temoignages-module .tm-read-body-html a{color:var(--zc-link);text-decoration:underline;text-underline-offset:2px}
      .zc-temoignages-module .tm-count{margin:6px 0;font-size:13px;color:var(--zc-text-muted,#64748b)}
      .zc-temoignages-module .tm-count-row{display:flex;align-items:center;gap:8px;margin:6px 0}
      .zc-temoignages-module .tm-count-row .tm-count{margin:0;flex:1 1 auto}
      .zc-temoignages-module .tm-inline-toggle{border:none!important;background:transparent!important;box-shadow:none!important;padding:2px 2px!important;min-width:auto!important}
      .zc-temoignages-module .tm-inline-toggle .zc-module-tab-short-label{margin-left:0;font-weight:800;font-size:12px}
      .zc-temoignages-module ul.tm-list.zc-forum-reader-list{list-style:none;margin:0;padding:var(--zc-space-5);display:flex;flex-direction:column;gap:var(--zc-space-5);flex:1 1 auto;min-height:0;overflow:auto;border:1px solid var(--zc-border);border-radius:14px;background:var(--zc-ui-soft-bg);-webkit-overflow-scrolling:touch}
      .zc-temoignages-module .tm-list .zc-forum-reader-li.zc-record-languette{margin:0;border-left:3px solid var(--zc-accent)}
      .zc-temoignages-module .tm-meta{margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--zc-text-muted,#64748b)}
      .zc-temoignages-module .tm-snippet{margin-top:4px;font-size:13px;line-height:1.35;color:var(--zc-text);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden}
      .zc-temoignages-module .tm-modal-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.45);z-index:auto}
      .zc-temoignages-module .tm-modal-panel{position:relative;z-index:1;width:min(720px,100%);max-height:min(96vh,calc(100vh - 16px));overflow:auto;background:var(--zc-surface);border-radius:14px;padding:14px 16px;box-shadow:0 12px 40px rgba(0,0,0,.2)}
      .zc-temoignages-module .tm-read-panel{max-height:min(96vh,calc(100vh - 16px))!important}
      .zc-temoignages-module .tm-modal-panel.tmg-modal-charte{max-height:min(96vh,calc(100vh - 16px))!important}
      .zc-temoignages-module .tm-modal-panel.tm-moderation-panel{width:min(980px,100%);height:min(96vh,calc(100vh - 16px));max-height:min(96vh,calc(100vh - 16px));display:flex;flex-direction:column;overflow:hidden}
      .zc-temoignages-module .tm-moderation-head{display:grid;grid-template-columns:var(--zc-popup-head-icon-box) 1fr var(--zc-popup-head-icon-box);align-items:center;gap:10px;margin-bottom:8px}
      .zc-temoignages-module .tm-moderation-head .tm-modal-title{text-align:center;margin:0}
      .zc-temoignages-module .tm-moderation-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;margin:2px 0 8px}
      .zc-temoignages-module #tmModerationBody.tm-modal-body{flex:1 1 auto;min-height:0;overflow:auto}
      .zc-temoignages-module .tm-list-help-charter,
      .zc-temoignages-module .tm-list-ctx-btn{flex-shrink:0}
      .zc-temoignages-module .zc-popup-header-info .tm-modal-title{margin-top:2px}
      .zc-temoignages-module .tm-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}
      .zc-temoignages-module .tm-modal-title{margin:0;font-size:1.1rem}
      .zc-temoignages-module .tm-head-close{
        border:none!important;
        background:transparent!important;
        box-shadow:none!important;
        padding:0 2px!important;
        border-radius:0!important;
        color:var(--zc-text)!important;
        font-size:1.35rem;
        line-height:1;
        cursor:pointer;
      }
      .zc-temoignages-module .tm-head-close:hover{
        color:var(--zc-popup-link-hover)!important;
        text-decoration:none;
      }
      .zc-temoignages-module .tm-modal-body{line-height:1.6}
      .zc-temoignages-module .tm-modal-body p{margin:8px 0}
      .zc-temoignages-module .adminBox{margin-top:14px;padding:12px;border:1px solid var(--zc-border,#e2e8f0);border-radius:12px;background:var(--zc-ui-soft-bg,#f8fafc)}
      .zc-temoignages-module .adminGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      @media(max-width:520px){.zc-temoignages-module .adminGrid{grid-template-columns:1fr}}
      .zc-temoignages-module .adminBox label{display:block;font-size:12px;margin-bottom:4px;color:var(--zc-text-muted,#64748b)}
      .zc-temoignages-module .adminBox input,.zc-temoignages-module .adminBox textarea{width:100%;padding:8px;border:1px solid var(--zc-border,#e2e8f0);border-radius:8px;font:inherit}
      .zc-temoignages-module .adminBox #tmAdContent{min-height:180px;max-height:45vh;resize:vertical}
      .zc-temoignages-module .tm-moderation-panel .adminBox #tmAdContent{
        min-height:min(58vh,720px);
        height:min(58vh,720px);
        max-height:none;
        resize:vertical;
      }
      .zc-temoignages-module .tm-moderation-panel .adminBox .adminGrid{gap:8px}
      .zc-temoignages-module .tm-moderation-panel .adminBox .tm-ad-content-wrap{margin-top:2px}
      .zc-temoignages-module .adminActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .zc-temoignages-module .adminActions .tm-btn{
        border:none!important;background:transparent!important;box-shadow:none!important;border-radius:0!important;
        color:var(--zc-popup-link)!important;padding:4px 2px!important;font-weight:600;text-decoration:underline;text-underline-offset:2px;
      }
      .zc-temoignages-module .adminActions .tm-btn:hover{color:var(--zc-popup-link-hover)!important;background:var(--zc-popup-link-soft)!important}
      .zc-temoignages-module .tm-btn{border:1px solid var(--zc-border,#e2e8f0);background:var(--zc-surface,#fff);padding:8px 12px;border-radius:10px;cursor:pointer;font:inherit}
      .zc-temoignages-module .tm-btn-primary{background:var(--zc-accent,#0d9488);color:#fff;border-color:transparent}
      .zc-temoignages-module .tm-charter .tmg-lang-cycle{display:none!important}
      .zc-temoignages-module .tmg-modal-charte h3{margin:12px 0 6px;font-size:1.05rem}
      .zc-temoignages-module .tmg-modal-charte p{margin:8px 0;line-height:1.65}
      .zc-temoignages-module .tmg-modal-charte ul{margin:6px 0 8px 20px;line-height:1.65}
      @media(max-width:640px){
        .zc-temoignages-module .tm-modal-overlay{align-items:stretch;padding:4px}
        .zc-temoignages-module .tm-read-panel{
          width:100%!important;height:100dvh!important;max-height:100dvh!important;
          border-radius:0!important;padding:8px 10px!important;
        }
        .zc-temoignages-module .tm-read-popup-head.zc-popup-header-unified{
          position:sticky;top:0;z-index:2;background:var(--zc-surface);
        }
        .zc-temoignages-module .tm-modal-body{padding-bottom:10px}
        .zc-temoignages-module .adminBox #tmAdContent{min-height:280px}
        .zc-temoignages-module .tm-moderation-panel .adminBox #tmAdContent{
          min-height:56vh;
          height:56vh;
        }
        .zc-temoignages-module .tm-modal-panel.tm-moderation-panel{
          width:100%!important;height:100dvh!important;max-height:100dvh!important;
          border-radius:0!important;padding:8px 10px!important;
        }
      }
    `;
    host.insertBefore(st, host.firstChild);
  }

  function escapeRegex(s) {
    return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function tokenizeTerms(text) {
    return Array.from(new Set(String(text || "").split(/\s+/).map((x) => x.trim()).filter(Boolean))).sort((a, b) => b.length - a.length);
  }

  function tmGetSearchPrefs() {
    if (typeof window.zcGetSearchPrefs === "function") {
      try { return window.zcGetSearchPrefs(); } catch (_) { }
    }
    return { me: false, mc: false };
  }

  function tmContainsWholeWord(haystack, needle) {
    const n = String(needle || "").trim();
    if (!n) return false;
    const re = new RegExp("(^|[^\\p{L}\\p{N}_])" + escapeRegex(n) + "($|[^\\p{L}\\p{N}_])", "iu");
    return re.test(String(haystack || ""));
  }

  function tmMatchesByPrefs(haystack, query, prefs) {
    const text = String(haystack || "").toLowerCase().replace(/\s+/g, " ").trim();
    const q = String(query || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!q) return true;
    const meOn = !!(prefs && prefs.me);
    const mcOn = !!(prefs && prefs.mc);
    if (mcOn) return meOn ? tmContainsWholeWord(text, q) : text.includes(q);
    const tokens = q.split(/\s+/).map((t) => t.trim()).filter(Boolean);
    if (!tokens.length) return true;
    if (meOn) return tokens.every((t) => tmContainsWholeWord(text, t));
    return tokens.every((t) => text.includes(t));
  }

  function highlightIn(rootEl, terms, opts) {
    if (!rootEl || !terms || !terms.length) return;
    const cleanTerms = terms.map((t) => String(t || "").trim()).filter(Boolean);
    if (!cleanTerms.length) return;
    const options = opts || {};
    const wholeWord = !!options.wholeWord;
    const src = cleanTerms.map(escapeRegex).join("|");
    if (!src) return;
    const rx = wholeWord
      ? new RegExp("(^|[^\\p{L}\\p{N}_])(" + src + ")(?=$|[^\\p{L}\\p{N}_])", "giu")
      : new RegExp("(" + src + ")", "gi");
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent || /(SCRIPT|STYLE|TEXTAREA|CODE|PRE)/.test(parent.tagName)) continue;
      const txt = node.nodeValue || "";
      if (!txt.trim() || !rx.test(txt)) continue;
      rx.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0;
      if (wholeWord) {
        txt.replace(rx, (m, g1, g2, off) => {
          const start = off + String(g1 || "").length;
          if (start > last) frag.appendChild(document.createTextNode(txt.slice(last, start)));
          const sp = document.createElement("span");
          sp.className = "zc-term-hit";
          sp.textContent = String(g2 || "");
          frag.appendChild(sp);
          last = off + m.length;
          return m;
        });
      } else {
        txt.replace(rx, (m, _g1, off) => {
          if (off > last) frag.appendChild(document.createTextNode(txt.slice(last, off)));
          const sp = document.createElement("span");
          sp.className = "zc-term-hit";
          sp.textContent = m;
          frag.appendChild(sp);
          last = off + m.length;
          return m;
        });
      }
      if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
      parent.replaceChild(frag, node);
    }
  }

  function applyHighlights(rootEl) {
    if (!rootEl) return;
    const q = document.getElementById("tmSearchInput")?.value || "";
    const prefs = tmGetSearchPrefs();
    const rawTerms = prefs.mc ? [String(q || "").trim()] : tokenizeTerms(q);
    const terms = rawTerms.map((t) => String(t || "").trim()).filter(Boolean);
    if (!terms.length) return;
    highlightIn(rootEl, terms, { wholeWord: !!prefs.me });
  }

  async function initTemoignagesApp(containerId) {
    const host = document.getElementById(containerId);
    if (!host) return;

    const tt = t();

    host.innerHTML = `
      <div class="articles-module-root zc-temoignages-module" id="temoignagesModuleRoot">
        <div class="app-header">
          <div class="tm-list-title-bar zc-forum-head-bar">
            <div class="tm-list-title-actions">
              <button type="button" class="zc-comment-popup-iconbtn zc-forum-head-close tm-list-ctx-btn zc-popup-ctx-tab"
                data-zc-opens-selection-ctx="1"
                onclick="return window.zcShowSelectionContextMenuFromMot && window.zcShowSelectionContextMenuFromMot(this);"
                title="Menu contextuel" aria-label="Menu contextuel">☰</button>
            </div>
            <div class="zc-forum-head-title">
              <h3 id="tmUiTitle" class="tm-list-title-center">🗣️ ${esc(tt.title)}</h3>
            </div>
          </div>
          <div class="tm-controls">
            <div class="tm-send-above-search">
              <div class="tm-send-row">
                <button type="button" class="zc-comment-popup-iconbtn zc-forum-head-close tm-list-help-charter tm-send-row-help" id="tmListHelpCharter"
                  title="${esc(tt.charterHelpBtn)}" aria-label="${esc(tt.charterHelpBtn)}">?</button>
                <button type="button" class="menu-button active zc-top-action-btn zc-title-sync-btn tm-send-row-submit" id="tmBtnSend">
                  <span class="zc-top-action-ico" aria-hidden="true">🗣️</span>
                  <span class="zc-top-action-label zc-title-sync-label" id="tmBtnSendLabel">${esc(tt.send)}</span>
                </button>
              </div>
            </div>
            <div class="tm-search-wrap zc-search-wrap">
              <button type="button" class="tm-clear zc-search-clear is-hidden" id="tmClear" title="${esc(tt.clearTitle)}" aria-label="${esc(tt.clearTitle)}">✕</button>
              <input type="text" id="tmSearchInput" class="zc-ui-search-field" autocomplete="off" placeholder="${esc(tt.searchPh)}" />
              <button type="button" class="zc-search-go tm-search-loupe" disabled tabindex="-1" aria-hidden="true">🔍</button>
            </div>
            <select id="tmStatusFilter" style="display:none;font-size:15px;padding:8px;border-radius:10px;border:1px solid var(--zc-border,#e2e8f0)">
              <option value="pending">${esc(tt.statusFilterPending)}</option>
              <option value="approved" selected>${esc(tt.statusFilterApproved)}</option>
              <option value="rejected">${esc(tt.statusFilterRejected)}</option>
              <option value="ALL">${esc(tt.statusFilterAll)}</option>
            </select>
          </div>
          <div class="tm-count-row">
            <div class="tm-count" id="tmCount">${esc(tt.countLoad)}</div>
            <button type="button" class="menu-button active zc-top-action-btn tm-inline-toggle" id="btnTemoignagesInlineME" data-zc-pref-toggle="me"
              title="${esc(tt.lblME || 'Mot entier')}" aria-label="${esc(tt.lblME || 'Mot entier')}"><span class="zc-module-tab-short-label">ME</span></button>
            <button type="button" class="menu-button active zc-top-action-btn tm-inline-toggle" id="btnTemoignagesInlineMC" data-zc-pref-toggle="mc"
              title="${esc(tt.lblMC || 'Mots contigus')}" aria-label="${esc(tt.lblMC || 'Mots contigus')}"><span class="zc-module-tab-short-label">MC</span></button>
          </div>
          <ul class="tm-list zc-forum-reader-list" id="tmList"></ul>
        </div>

        <div class="tm-modal-overlay" id="tmReadOverlay" data-overlay="true" aria-hidden="true">
          <div class="tm-modal-panel tm-read-panel" role="dialog" aria-modal="true">
            <div class="popup-header zc-popup-header-unified tm-read-popup-head">
              <div class="tm-read-topbar">
                <button type="button" class="zc-comment-popup-iconbtn zc-forum-head-close zc-popup-ctx-tab"
                  id="tmReadCtxMenu" data-zc-opens-selection-ctx="1"
                  onclick="return window.zcShowSelectionContextMenuFromMot && window.zcShowSelectionContextMenuFromMot(this);"
                  title="Menu contextuel" aria-label="Menu contextuel">☰</button>
                <button type="button" class="zc-forum-head-close zc-popup-html-close" id="tmReadCloseX" title="${esc(tt.close)}" aria-label="${esc(tt.close)}">
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <div class="tm-read-share-row">
                <button type="button" class="tm-btn" id="tmCopyLink">
                  <span class="tm-read-action-ico" aria-hidden="true">🔗</span>
                  <span class="tm-read-action-label">${esc(tt.copyLink)}</span>
                </button>
                <button type="button" class="tm-btn" id="tmCopyText">
                  <span class="tm-read-action-ico" aria-hidden="true">📋</span>
                  <span class="tm-read-action-label">${esc(tt.copyText)}</span>
                </button>
                <button type="button" class="tm-btn" id="tmOpenModeration" style="display:none">
                  <span class="tm-read-action-ico" aria-hidden="true">🛠️</span>
                  <span class="tm-read-action-label">${esc(tt.moderation)}</span>
                </button>
              </div>
              <p class="tm-read-copy-feedback" id="tmReadCopyFeedback" role="status" aria-live="polite"></p>
              <div class="zc-popup-header-info">
                <h3 class="tm-modal-title" id="tmReadTitle" style="margin:0"></h3>
                <p class="tm-read-meta" id="tmReadMeta"></p>
              </div>
            </div>
            <div class="tm-modal-body" id="tmReadBody"></div>
          </div>
        </div>

        <div class="tm-modal-overlay" id="tmModerationOverlay" data-overlay="true" aria-hidden="true">
          <div class="tm-modal-panel tm-moderation-panel" role="dialog" aria-modal="true">
            <div class="tm-modal-head tm-moderation-head">
              <button type="button" class="zc-comment-popup-iconbtn zc-forum-head-close zc-popup-ctx-tab"
                id="tmModerationCtxBtn" data-zc-opens-selection-ctx="1"
                onclick="return window.zcShowSelectionContextMenuFromMot && window.zcShowSelectionContextMenuFromMot(this);"
                title="Menu contextuel" aria-label="Menu contextuel">☰</button>
              <h3 class="tm-modal-title" id="tmModerationTitle">${esc(tt.adminBox)}</h3>
              <button type="button" class="tm-head-close" id="tmModerationCloseX" title="${esc(tt.close)}" aria-label="${esc(tt.close)}">×</button>
            </div>
            <div class="tm-moderation-actions" id="tmModerationActionsHost"></div>
            <div class="tm-modal-body" id="tmModerationBody"></div>
          </div>
        </div>

        <div class="tm-modal-overlay" id="tmAddOverlay" data-overlay="true" aria-hidden="true">
          <div class="tm-modal-panel" role="dialog" aria-modal="true" style="max-width:560px">
            <div class="tm-modal-head">
              <h3 class="tm-modal-title" id="tmAddTitle">${esc(tt.addTitle)}</h3>
              <button type="button" class="tm-head-close" id="tmAddCloseX" title="${esc(tt.close)}" aria-label="${esc(tt.close)}">×</button>
            </div>
            <p style="font-size:13px;color:var(--zc-text-muted);margin:0 0 10px">${esc(tt.addHint)}</p>
            <label style="font-size:12px;color:var(--zc-text-muted)">${esc(tt.alias)}</label>
            <input type="text" id="tmAlias" maxlength="60" style="width:calc(100% - 8px);margin-right:8px;box-sizing:border-box;margin-bottom:8px;padding:8px;border-radius:8px;border:1px solid var(--zc-border);font-size:16px" />
            <label style="font-size:12px;color:var(--zc-text-muted)">${esc(tt.mail)}</label>
            <input type="email" id="tmMail" maxlength="120" style="width:calc(100% - 8px);margin-right:8px;box-sizing:border-box;margin-bottom:8px;padding:8px;border-radius:8px;border:1px solid var(--zc-border);font-size:16px" />
            <label style="font-size:12px;color:var(--zc-text-muted)">${esc(tt.titleL)}</label>
            <input type="text" id="tmTitleIn" maxlength="140" style="width:calc(100% - 8px);margin-right:8px;box-sizing:border-box;margin-bottom:8px;padding:8px;border-radius:8px;border:1px solid var(--zc-border);font-size:16px" />
            <label style="font-size:12px;color:var(--zc-text-muted)">${esc(tt.contentL)}</label>
            <textarea id="tmContentIn" rows="8" maxlength="${MAX_LEN}" style="width:calc(100% - 8px);margin-right:8px;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid var(--zc-border);font-size:16px"></textarea>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:var(--zc-text-muted)">
              <span id="tmAddMsg" style="color:var(--zc-text-muted)"></span>
              <span id="tmCounter">0 / ${MAX_LEN}</span>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
              <button type="button" class="tm-btn" id="tmAddCancel">${esc(tt.cancel)}</button>
              <button type="button" class="tm-btn tm-btn-primary" id="tmAddSubmit">${esc(tt.submit)}</button>
            </div>
          </div>
        </div>

        <div class="tm-modal-overlay" id="tmCharterOverlay" data-overlay="true" aria-hidden="true">
          <div class="tm-modal-panel tmg-modal-charte" role="dialog" aria-modal="true" style="max-width:min(720px,100%)">
            <div class="tm-modal-head">
              <h3 class="tm-modal-title" id="tmCharterTitle">${esc(tt.charterTitle)}</h3>
              <button type="button" class="tm-head-close" id="tmCharterClose" title="${esc(tt.close)}" aria-label="${esc(tt.close)}">×</button>
            </div>
            <div id="tmCharterBody"></div>
          </div>
        </div>
      </div>
    `;

    injectModuleStyles(host);

    const db = getDb();
    const listEl = document.getElementById("tmList");
    const countEl = document.getElementById("tmCount");
    const searchIn = document.getElementById("tmSearchInput");
    const clearBtn = document.getElementById("tmClear");
    if (searchIn && clearBtn && typeof window.bindSearchClearVisibility === "function") {
      window.bindSearchClearVisibility(searchIn, clearBtn);
    }
    const statusSel = document.getElementById("tmStatusFilter");
    const readOv = document.getElementById("tmReadOverlay");
    const moderationOv = document.getElementById("tmModerationOverlay");
    const addOv = document.getElementById("tmAddOverlay");
    const charterOv = document.getElementById("tmCharterOverlay");
    const charterBody = document.getElementById("tmCharterBody");

    let state = { all: [], filtered: [], last: null, charterRoot: null };
    let readCopyFeedbackTimer = null;

    function showReadCopyFeedback(msg, isErr) {
      const el = document.getElementById("tmReadCopyFeedback");
      if (!el) return;
      if (readCopyFeedbackTimer) clearTimeout(readCopyFeedbackTimer);
      readCopyFeedbackTimer = null;
      if (!msg) {
        el.textContent = "";
        el.style.color = "var(--zc-accent)";
        return;
      }
      el.textContent = msg;
      el.style.color = isErr ? "var(--zc-danger)" : "var(--zc-accent)";
      readCopyFeedbackTimer = setTimeout(() => {
        el.textContent = "";
        el.style.color = "var(--zc-accent)";
        readCopyFeedbackTimer = null;
      }, 2800);
    }

    function refreshStaticLabels() {
      if (!document.getElementById("temoignagesModuleRoot")) return;
      const x = t();
      const titleEl = document.getElementById("tmUiTitle");
      if (titleEl) titleEl.textContent = `🗣️ ${x.title}`;
      const sendL = document.getElementById("tmBtnSendLabel");
      if (sendL) sendL.textContent = x.send;
      if (searchIn) searchIn.placeholder = x.searchPh;
      if (clearBtn) {
        clearBtn.title = x.clearTitle;
        clearBtn.setAttribute("aria-label", x.clearTitle);
      }
      const readCloseX = document.getElementById("tmReadCloseX");
      if (readCloseX) {
        readCloseX.setAttribute("aria-label", x.close);
        readCloseX.title = x.close;
      }
      const listHelpCh = document.getElementById("tmListHelpCharter");
      if (listHelpCh) {
        listHelpCh.setAttribute("aria-label", x.charterHelpBtn);
        listHelpCh.title = x.charterHelpBtn;
      }
      const copyL = document.getElementById("tmCopyLink");
      const copyT = document.getElementById("tmCopyText");
      const modB = document.getElementById("tmOpenModeration");
      const labL = copyL && copyL.querySelector(".tm-read-action-label");
      const labT = copyT && copyT.querySelector(".tm-read-action-label");
      const labM = modB && modB.querySelector(".tm-read-action-label");
      if (labL) labL.textContent = x.copyLink;
      else if (copyL) copyL.textContent = x.copyLink;
      if (labT) labT.textContent = x.copyText;
      else if (copyT) copyT.textContent = x.copyText;
      if (labM) labM.textContent = x.moderation;
      else if (modB) modB.textContent = x.moderation;
      const modTitle = document.getElementById("tmModerationTitle");
      if (modTitle) modTitle.textContent = x.adminBox;
      const modClose = document.getElementById("tmModerationCloseX");
      if (modClose) {
        modClose.setAttribute("aria-label", x.close);
        modClose.title = x.close;
      }
      const addTitleEl = document.getElementById("tmAddTitle");
      const addCloseX = document.getElementById("tmAddCloseX");
      const addCancel = document.getElementById("tmAddCancel");
      const addSubmit = document.getElementById("tmAddSubmit");
      if (addTitleEl) addTitleEl.textContent = x.addTitle;
      if (addCloseX) {
        addCloseX.setAttribute("aria-label", x.close);
        addCloseX.title = x.close;
      }
      if (addCancel) addCancel.textContent = x.cancel;
      if (addSubmit) addSubmit.textContent = x.submit;
      const chTitle = document.getElementById("tmCharterTitle");
      const chClose = document.getElementById("tmCharterClose");
      if (chTitle) chTitle.textContent = x.charterTitle;
      if (chClose) {
        chClose.setAttribute("aria-label", x.close);
        chClose.title = x.close;
      }
      if (statusSel) {
        const opts = statusSel.querySelectorAll("option");
        const labs = [x.statusFilterPending, x.statusFilterApproved, x.statusFilterRejected, x.statusFilterAll];
        opts.forEach((o, i) => { if (labs[i]) o.textContent = labs[i]; });
      }
    }

    function syncCharterToAppLang() {
      if (state.charterRoot) applyCharterLang(state.charterRoot, mapAppLangToCharter(getAppLang()));
    }

    function bindLangHooks() {
      const sel = document.getElementById("uiLangSelect");
      if (sel) sel.addEventListener("change", () => {
        refreshStaticLabels();
        syncCharterToAppLang();
        void render();
      });
      window.addEventListener("storage", (e) => {
        if (e.key === "uiLang") {
          refreshStaticLabels();
          syncCharterToAppLang();
          void render();
        }
      });
    }

    function closeRead() {
      readOv.style.display = "none";
      readOv.setAttribute("aria-hidden", "true");
      closeModeration();
    }
    function closeModeration() {
      moderationOv.style.display = "none";
      moderationOv.setAttribute("aria-hidden", "true");
    }
    function closeAdd() {
      addOv.style.display = "none";
      addOv.setAttribute("aria-hidden", "true");
    }
    function closeCharter() {
      charterOv.style.display = "none";
      charterOv.setAttribute("aria-hidden", "true");
    }

    readOv.addEventListener("click", (e) => { if (e.target === readOv) closeRead(); });
    moderationOv.addEventListener("click", (e) => { if (e.target === moderationOv) closeModeration(); });
    addOv.addEventListener("click", (e) => { if (e.target === addOv) closeAdd(); });
    charterOv.addEventListener("click", (e) => { if (e.target === charterOv) closeCharter(); });

    document.getElementById("tmReadCloseX").addEventListener("click", closeRead);
    document.getElementById("tmModerationCloseX").addEventListener("click", closeModeration);
    document.getElementById("tmListHelpCharter").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void openCharterModal();
    });
    document.getElementById("tmCharterClose").addEventListener("click", closeCharter);
    document.getElementById("tmAddCloseX").addEventListener("click", closeAdd);
    document.getElementById("tmAddCancel").addEventListener("click", closeAdd);

    searchIn.addEventListener("input", () => {
      applyFilter();
    });
    clearBtn.addEventListener("click", () => {
      searchIn.value = "";
      try {
        searchIn.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (_) {}
      applyFilter();
      searchIn.focus();
    });
    if (statusSel) statusSel.addEventListener("change", () => loadTemoignages());

    document.getElementById("tmBtnSend").addEventListener("click", () => {
      refreshStaticLabels();
      document.getElementById("tmAddMsg").textContent = "";
      // Nom/courriel restent volontairement vides (optionnels).
      // Seul le titre est prérempli à partir de #mot.
      try {
        const titleEl = document.getElementById("tmTitleIn");
        const motEl = document.getElementById("mot");
        if (titleEl) {
          const motTxt = String(motEl?.value || "").trim();
          if (motTxt) titleEl.value = motTxt;
        }
      } catch (_) { /* ignore */ }
      addOv.style.display = "flex";
      addOv.setAttribute("aria-hidden", "false");
      openTemoignagesModalOverlay(addOv);
      document.getElementById("tmContentIn").focus();
    });

    const contentTa = document.getElementById("tmContentIn");
    const ctr = document.getElementById("tmCounter");
    contentTa.addEventListener("input", () => {
      ctr.textContent = `${(contentTa.value || "").length} / ${MAX_LEN}`;
    });

    document.getElementById("tmAddSubmit").addEventListener("click", async () => {
      const msg = document.getElementById("tmAddMsg");
      const btn = document.getElementById("tmAddSubmit");
      const x = t();
      const authorAlias = stripHtml(document.getElementById("tmAlias").value) || DEFAULT_ALIAS;
      const mailUser = stripHtml(document.getElementById("tmMail").value) || DEFAULT_MAIL;
      const title = stripHtml(document.getElementById("tmTitleIn").value);
      const plainBody = plainTemoignageBodyFromInput(document.getElementById("tmContentIn").value);
      const content = formatTemoignageContentForDb(plainBody);
      if (!title) {
        msg.textContent = x.titleRequired || "Titre requis.";
        return;
      }
      if (!plainBody || plainBody.length < MIN_LEN) {
        msg.textContent = `Min. ${MIN_LEN} caractères.`;
        return;
      }
      const nowMs = Date.now();
      const lastSent = Number(localStorage.getItem(TEMOIGNAGES_LAST_SENT_KEY) || 0);
      const waitMs = TEMOIGNAGES_COOLDOWN_MS - (nowMs - lastSent);
      if (waitMs > 0) {
        msg.textContent = x.waitSec.replace("%n", String(Math.ceil(waitMs / 1000)));
        return;
      }
      if (!db) return;
      btn.disabled = true;
      btn.textContent = x.sending;
      try {
        await db.collection(COLLECTION_NAME).add({
          authorAlias,
          mailUser,
          title,
          content,
          clientAt: new Date().toISOString(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          source: SOURCE_PAGE,
          status: "pending"
        });
        try {
          if (String(mailUser || "").trim().toLowerCase() !== "anonyme@blog.alfamous.ca") {
            localStorage.setItem("lastNonAnonNameUser", String(authorAlias || "").trim());
            localStorage.setItem("lastNonAnonMailUser", String(mailUser || "").trim().toLowerCase());
          }
        } catch (_) { /* ignore */ }
        try {
          localStorage.setItem(TEMOIGNAGES_LAST_SENT_KEY, String(Date.now()));
        } catch (_) { /* ignore */ }
        msg.textContent = "";
        msg.textContent = x.thanks;
        setTimeout(closeAdd, 900);
        if (isAdmin()) await loadTemoignages();
      } catch (e) {
        console.error(e);
        msg.textContent = "❌ " + (e && e.message ? e.message : e);
      } finally {
        btn.disabled = false;
        btn.textContent = x.submit;
      }
    });

    function applyFilter() {
      const q = (searchIn.value || "").trim();
      const prefs = tmGetSearchPrefs();
      state.filtered = !q
        ? state.all.slice()
        : state.all.filter((t) =>
          tmMatchesByPrefs(String(t.title || "") + " " + String(t.content || ""), q, prefs)
        );
      void render();
    }

    function buildShareLink(title) {
      const u = new URL(location.href);
      u.search = "";
      u.searchParams.set("prog", "temoignages");
      const t = String(title || "").trim();
      if (t) u.searchParams.set("prefil", t);
      return u.toString();
    }

    async function loadTemoignages() {
      const x = t();
      if (!db) {
        countEl.textContent = "Firebase indisponible.";
        return;
      }
      countEl.textContent = x.countLoad;
      listEl.innerHTML = "";
      if (statusSel) statusSel.style.display = isAdmin() ? "inline-block" : "none";

      const statusWanted = isAdmin() ? statusSel.value : "approved";
      let snap = null;
      let filterStatusClient = false;
      try {
        let q = db.collection(COLLECTION_NAME);
        if (statusWanted !== "ALL") {
          q = q.where("status", "==", statusWanted).orderBy("createdAt", "desc");
        } else {
          q = q.orderBy("createdAt", "desc");
        }
        snap = await q.limit(400).get();
      } catch (err) {
        const code = String(err && err.code ? err.code : "");
        const msg = String(err && err.message ? err.message : "");
        if (code.includes("failed-precondition") || /requires an index/i.test(msg)) {
          try {
            snap = await db.collection(COLLECTION_NAME).orderBy("createdAt", "desc").limit(500).get();
            filterStatusClient = statusWanted !== "ALL";
          } catch (e2) {
            console.error(e2);
            countEl.textContent = x.countErr;
            return;
          }
        } else {
          console.error(err);
          countEl.textContent = x.countErr;
          return;
        }
      }

      const items = [];
      snap.forEach((doc) => {
        const d = doc.data() || {};
        items.push({
          id: doc.id,
          authorAlias: norm(d.authorAlias || ""),
          mailUser: norm(d.mailUser || ""),
          title: d.title !== undefined ? String(d.title) : "",
          content: String(d.content || ""),
          source: norm(d.source || ""),
          status: norm(d.status || ""),
          createdAt: d.createdAt || null,
          createdAtLabel: niceDate(d.createdAt)
        });
      });

      let rows = items;
      if (filterStatusClient && statusWanted !== "ALL") {
        const sw = String(statusWanted).toLowerCase();
        rows = items.filter((r) => String(r.status || "").toLowerCase() === sw);
      }

      const seen = new Set();
      state.all = rows.filter((it) => {
        const key = (it.title || "") + "|" + (it.content || "").slice(0, 120);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const pre = String(window.__temoignagesPrefilTexte || "").trim();
      if (pre) {
        searchIn.value = pre;
        try {
          searchIn.dispatchEvent(new Event("input", { bubbles: true }));
        } catch (_) {}
      }
      window.__temoignagesPrefilTexte = "";
      applyFilter();
    }

    async function ensureCharter() {
      if (state.charterRoot) return;
      const html = await fetchCharterFragment();
      const wrap = document.createElement("div");
      wrap.className = "tmg-charte tm-charter";
      wrap.id = "charte-temoignages-clone";
      wrap.innerHTML = html || `<p>${esc(t().charterTitle)}</p>`;
      state.charterRoot = wrap;
      syncCharterToAppLang();
    }

    async function render() {
      const x = t();
      listEl.innerHTML = "";
      await ensureCharter();
      const n = state.filtered.length;
      const total = state.all.length;
      const hasSearch = !!(searchIn.value || "").trim();
      const fmtFound = (a, b) => x.countFound.replace("%n", String(a)).replace("%t", String(b));
      if (n) {
        countEl.textContent = fmtFound(n, total);
      } else if (total === 0) {
        countEl.textContent = x.countNone;
      } else {
        countEl.textContent = hasSearch ? `${fmtFound(0, total)} — ${x.empty}` : x.countNone;
      }
      if (!n) {
        const emptyLi = document.createElement("li");
        emptyLi.className = "zc-forum-reader-li zc-record-languette zc-record-languette--article";
        emptyLi.innerHTML = `<div class="text-content">${esc(x.empty)}</div>`;
        listEl.appendChild(emptyLi);
        applyHighlights(emptyLi.querySelector(".text-content"));
        return;
      }
      for (const tmo of state.filtered) {
        const li = document.createElement("li");
        li.className = "zc-forum-reader-li zc-record-languette zc-record-languette--article";
        const block = document.createElement("div");
        block.className = "text-content";
        block.innerHTML = `
            <a href="#" class="tm-item-title" style="font-weight:700;color:var(--zc-link);text-decoration:none">${esc(tmo.title || x.untitled)}</a>
            <div class="tm-meta">
              <span class="pill" style="font-size:11px;padding:2px 8px;border-radius:999px;background:var(--zc-ui-soft-bg);border:1px solid var(--zc-border)">${esc(tmo.status || "—")}</span>
              ${tmo.createdAtLabel ? `<span>🗓 ${esc(tmo.createdAtLabel)}</span>` : ""}
              ${tmo.authorAlias ? `<span>👤 ${esc(tmo.authorAlias)}</span>` : ""}
              <span>${esc(x.clickRead)}</span>
            </div>
            <div class="tm-snippet">${esc(truncText(previewPlainFromTemoignageContent(tmo.content), PREVIEW_LEN))}</div>
          `;
        block.querySelector(".tm-item-title").addEventListener("click", (ev) => {
          ev.preventDefault();
          openReadModal(tmo);
        });
        li.appendChild(block);
        li.addEventListener("click", (ev) => {
          if (ev.target.closest(".tm-item-title")) return;
          openReadModal(tmo);
        });
        listEl.appendChild(li);
        applyHighlights(block);
      }
    }

    async function openCharterModal() {
      await ensureCharter();
      const x = t();
      charterBody.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "tmg-modal-charte";
      const clone = state.charterRoot.cloneNode(true);
      clone.querySelectorAll(".tmg-lang-cycle").forEach((b) => b.remove());
      wrap.appendChild(clone);
      charterBody.appendChild(wrap);
      applyCharterLang(clone, mapAppLangToCharter(getAppLang()));
      document.getElementById("tmCharterTitle").textContent = x.charterTitle;
      charterOv.style.display = "flex";
      charterOv.setAttribute("aria-hidden", "false");
      applyStackZIndex(charterOv);
    }

    function setAdminMsg(text, kind) {
      const el = document.getElementById("tmAdminMsg");
      if (!el) return;
      if (!text) {
        el.style.display = "none";
        el.textContent = "";
        return;
      }
      el.style.display = "block";
      el.textContent = text;
      el.style.background = kind === "ok" ? "var(--zc-success-bg)" : kind === "err" ? "var(--zc-danger-bg)" : "var(--zc-surface)";
    }

    async function adminSave(docId, newStatus) {
      const x = t();
      const alias = stripHtml(document.getElementById("tmAdAlias").value) || DEFAULT_ALIAS;
      const mail = stripHtml(document.getElementById("tmAdMail").value) || DEFAULT_MAIL;
      const title = stripHtml(document.getElementById("tmAdTitle").value);
      const plainBody = plainTemoignageBodyFromInput(document.getElementById("tmAdContent").value);
      const content = formatTemoignageContentForDb(plainBody);
      if (!plainBody || plainBody.length < MIN_LEN) {
        setAdminMsg(`Contenu trop court (min ${MIN_LEN}).`, "err");
        return;
      }
      const patch = {
        authorAlias: alias,
        mailUser: mail,
        title,
        content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        moderatedBy: nameUser(),
        moderatedAtClient: new Date().toISOString()
      };
      if (newStatus === "approved") {
        patch.status = "approved";
        patch.publishedAt = firebase.firestore.FieldValue.serverTimestamp();
      } else if (newStatus === "rejected") {
        patch.status = "rejected";
      }
      try {
        setAdminMsg("", "");
        await db.collection(COLLECTION_NAME).doc(docId).update(patch);
        setAdminMsg("✅ OK", "ok");
        await loadTemoignages();
        const fresh = state.all.find((z) => z.id === docId);
        if (fresh) openReadModal(fresh);
      } catch (e) {
        console.error(e);
        setAdminMsg("❌ " + (e && e.message ? e.message : e), "err");
      }
    }

    async function adminDeleteDoc(docId) {
      const x = t();
      if (!window.confirm(x.adminDeleteConfirm)) return;
      if (!db) return;
      try {
        setAdminMsg("", "");
        await db.collection(COLLECTION_NAME).doc(docId).delete();
        await loadTemoignages();
        closeRead();
      } catch (e) {
        console.error(e);
        setAdminMsg("❌ " + (e && e.message ? e.message : e), "err");
      }
    }

    function openReadModal(tmo) {
      const x = t();
      state.last = tmo;
      showReadCopyFeedback("");
      document.getElementById("tmReadTitle").textContent = tmo.title || x.untitled;
      document.getElementById("tmReadMeta").textContent = [
        tmo.status ? `🧷 ${tmo.status}` : "",
        tmo.createdAtLabel ? `🗓 ${tmo.createdAtLabel}` : "",
        tmo.authorAlias ? `👤 ${tmo.authorAlias}` : ""
      ].filter(Boolean).join(" • ");

      const body = document.getElementById("tmReadBody");
      body.innerHTML = "";
      const rawContent = String(tmo.content || "");
      fillTemoignageBodyDisplay(body, rawContent, true);

      const oldAd = body.querySelector(".adminBox");
      if (oldAd) oldAd.remove();

      if (isAdmin()) {
        const modBtn = document.getElementById("tmOpenModeration");
        const modBody = document.getElementById("tmModerationBody");
        const box = document.createElement("div");
        box.className = "adminBox";
        box.innerHTML = `
          <div class="adminGrid">
            <div><label>Alias</label><input type="text" id="tmAdAlias" maxlength="60" value="${esc(tmo.authorAlias || "")}" /></div>
            <div><label>Email</label><input type="email" id="tmAdMail" maxlength="120" value="${esc(tmo.mailUser || "")}" /></div>
          </div>
          <div style="margin-top:8px"><label>Titre</label><input type="text" id="tmAdTitle" maxlength="140" value="${esc(tmo.title || "")}" /></div>
          <div style="margin-top:8px"><label>Contenu</label>
            <div class="zc-search-wrap zc-search-wrap--textarea tm-ad-content-wrap">
              <button type="button" id="tmAdContentClear" class="zc-search-clear is-hidden" title="Effacer le contenu" aria-label="Effacer le contenu">✕</button>
              <textarea id="tmAdContent" class="zc-ui-search-field" maxlength="${MAX_LEN}">${escTa(plainTemoignageBodyFromInput(String(tmo.content || "")))}</textarea>
              <button type="button" id="tmAdContentCopy" class="zc-search-copy is-hidden" title="Copier le contenu" aria-label="Copier le contenu"><i class="fas fa-copy" aria-hidden="true"></i></button>
            </div>
          </div>
          <div class="msgBar" id="tmAdminMsg" style="display:none;margin-top:8px;padding:8px;border-radius:8px;font-size:13px"></div>
          <div class="adminActions">
            <button type="button" class="tm-btn" id="tmAdSave">${esc(x.adminSave)}</button>
            <button type="button" class="tm-btn tm-btn-primary" id="tmAdApprove">${esc(x.adminApprove)}</button>
            <button type="button" class="tm-btn" id="tmAdReject" style="border-color:var(--zc-danger);color:var(--zc-danger)">${esc(x.adminReject)}</button>
            <button type="button" class="tm-btn" id="tmAdDelete" style="border-color:var(--zc-danger);color:var(--zc-danger-text);background:var(--zc-danger-bg)">${esc(x.adminDelete)}</button>
          </div>
        `;
        if (modBody) {
          modBody.innerHTML = "";
          modBody.appendChild(box);
        }
        const modActionsHost = document.getElementById("tmModerationActionsHost");
        const adminActions = box.querySelector(".adminActions");
        if (modActionsHost) {
          modActionsHost.innerHTML = "";
          if (adminActions) modActionsHost.appendChild(adminActions);
        }
        if (modBtn) {
          modBtn.style.display = "inline-flex";
          modBtn.onclick = () => {
            moderationOv.style.display = "flex";
            moderationOv.setAttribute("aria-hidden", "false");
            openTemoignagesModalOverlay(moderationOv);
          };
        }
        document.getElementById("tmAdSave").addEventListener("click", () => adminSave(tmo.id, false));
        document.getElementById("tmAdApprove").addEventListener("click", () => adminSave(tmo.id, "approved"));
        document.getElementById("tmAdReject").addEventListener("click", () => adminSave(tmo.id, "rejected"));
        document.getElementById("tmAdDelete").addEventListener("click", () => adminDeleteDoc(tmo.id));
        const tmAdContent = document.getElementById("tmAdContent");
        const tmAdContentClear = document.getElementById("tmAdContentClear");
        const tmAdContentCopy = document.getElementById("tmAdContentCopy");
        const syncTmAdContentBtns = () => {
          const hasTxt = !!String(tmAdContent?.value || "").trim();
          if (tmAdContentClear) tmAdContentClear.classList.toggle("is-hidden", !hasTxt);
          if (tmAdContentCopy) tmAdContentCopy.classList.toggle("is-hidden", !hasTxt);
        };
        if (tmAdContent) {
          tmAdContent.addEventListener("input", syncTmAdContentBtns);
        }
        if (tmAdContentClear) {
          tmAdContentClear.addEventListener("click", () => {
            if (!tmAdContent) return;
            tmAdContent.value = "";
            syncTmAdContentBtns();
            tmAdContent.focus();
          });
        }
        if (tmAdContentCopy) {
          tmAdContentCopy.addEventListener("click", async () => {
            const ok = await copyTextToClipboard(tmAdContent?.value || "");
            setAdminMsg(ok ? "✅ Texte copié." : "❌ Copie impossible.", ok ? "ok" : "err");
          });
        }
        syncTmAdContentBtns();
      } else {
        const modBtn = document.getElementById("tmOpenModeration");
        const modBody = document.getElementById("tmModerationBody");
        const modActionsHost = document.getElementById("tmModerationActionsHost");
        if (modBtn) {
          modBtn.style.display = "none";
          modBtn.onclick = null;
        }
        if (modBody) modBody.innerHTML = "";
        if (modActionsHost) modActionsHost.innerHTML = "";
        closeModeration();
      }

      readOv.style.display = "flex";
      readOv.setAttribute("aria-hidden", "false");
      openTemoignagesModalOverlay(readOv);

      document.getElementById("tmCopyLink").onclick = async () => {
        const url = buildShareLink(tmo.title || "");
        const ok = await copyTextToClipboard(url);
        showReadCopyFeedback(ok ? x.copiedShare : x.copyFailed, !ok);
      };
      document.getElementById("tmCopyText").onclick = async () => {
        const txt = `${tmo.title || x.untitled}\n\n${plainTextCopyFromTemoignageContent(tmo.content || "")}`.trim();
        const ok = await copyTextToClipboard(txt);
        showReadCopyFeedback(ok ? x.copiedText : x.copyFailed, !ok);
      };
    }

    bindLangHooks();
    refreshStaticLabels();
    try { if (typeof window.syncParamTogglesChrome === "function") window.syncParamTogglesChrome(); } catch (_) { }
    if (!window.__tmSearchPrefsListenerBound) {
      window.__tmSearchPrefsListenerBound = true;
      window.addEventListener("zc:search-prefs-changed", () => {
        if (!document.getElementById("temoignagesModuleRoot")) return;
        applyFilter();
        try { if (typeof window.syncParamTogglesChrome === "function") window.syncParamTogglesChrome(); } catch (_) { }
      });
    }

    if (!db) {
      countEl.textContent = "Firebase indisponible.";
      return;
    }
    loadTemoignages().catch((e) => {
      console.error(e);
      countEl.textContent = t().countErr;
    });
  }

  window.initTemoignagesApp = initTemoignagesApp;
})();
