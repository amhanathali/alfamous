(function () {
  "use strict";

  function nlLang() {
    return String(localStorage.getItem("uiLang") || "fr").toLowerCase();
  }
  function nlDict() {
    const L = nlLang();
    const D = {
      fr: {
        btnSubOnly: "Newsletter (abonnement)",
        btnSubSend: "Newsletter (abonnement + envoi)",
        close: "Fermer",
        sendTab: "Envoyer un message aux abonnés",
        sendTabTitle: "Rédiger et envoyer une campagne aux abonnés actifs",
        nameOpt: "Nom (optionnel)",
        yourName: "Votre nom",
        lang: "Langue",
        hint: "Si l’adresse saisie est un courriel réel et correct, l’application inscrira ou désinscrira cette adresse selon le bouton choisi, une fois le traitement terminé.",
        subscribe: "Je m’abonne",
        unsubscribe: "Je me désabonne",
        back: "← Retour à l’inscription",
        draft: "Brouillon",
        model: "Modèle",
        chooseModel: "Choisir un modèle...",
        recipients: "Destinataires (abonnés actifs)",
        all: "Tout",
        none: "Aucun",
        pending: "Non reçus",
        refresh: "Rafraîchir",
        preview: "Aperçu modèle",
        saveDraft: "Enregistrer brouillon",
        queue: "Mettre en file d'envoi"
      },
      en: {
        btnSubOnly: "Newsletter (subscribe)",
        btnSubSend: "Newsletter (subscribe + send)",
        close: "Close",
        sendTab: "Send to subscribers",
        sendTabTitle: "Compose and send a campaign to active subscribers",
        nameOpt: "Name (optional)",
        yourName: "Your name",
        lang: "Language",
        hint: "If the entered address is valid, the app will subscribe or unsubscribe it based on the selected button.",
        subscribe: "Subscribe",
        unsubscribe: "Unsubscribe",
        back: "← Back to subscribe",
        draft: "Draft",
        model: "Template",
        chooseModel: "Choose a template...",
        recipients: "Recipients (active subscribers)",
        all: "All",
        none: "None",
        pending: "Not sent",
        refresh: "Refresh",
        preview: "Template preview",
        saveDraft: "Save draft",
        queue: "Queue send"
      },
      ar: {
        btnSubOnly: "النشرة (اشتراك)",
        btnSubSend: "النشرة (اشتراك + إرسال)",
        close: "إغلاق",
        sendTab: "إرسال إلى المشتركين",
        sendTabTitle: "صياغة وإرسال حملة إلى المشتركين النشطين",
        nameOpt: "الاسم (اختياري)",
        yourName: "اسمك",
        lang: "اللغة",
        hint: "إذا كان البريد المدخل صحيحاً، سيتم الاشتراك أو إلغاء الاشتراك حسب الزر المختار.",
        subscribe: "أشترك",
        unsubscribe: "إلغاء الاشتراك",
        back: "← الرجوع للاشتراك",
        draft: "مسودة",
        model: "نموذج",
        chooseModel: "اختر نموذجاً...",
        recipients: "المستلمون (المشتركون النشطون)",
        all: "الكل",
        none: "لا أحد",
        pending: "غير مُرسل",
        refresh: "تحديث",
        preview: "معاينة النموذج",
        saveDraft: "حفظ المسودة",
        queue: "إدراج في قائمة الإرسال"
      },
      kab: {
        btnSubOnly: "Tabratin (amulti)",
        btnSubSend: "Tabratin (amulti + tuzna)",
        close: "Mdel",
        sendTab: "Azen i imultiyen",
        sendTabTitle: "Aru sakin azen i imultiyen urmid",
        nameOpt: "Isem (afrayan)",
        yourName: "Isem-ik",
        lang: "Tutlayt",
        hint: "Ma yella tansa d tameɣtut, asnas ad tt-yessekcem neɣ ad tt-yessefsex ilmend n tqeffalt.",
        subscribe: "Ad mltiɣ",
        unsubscribe: "Ad ffeɣ seg umulti",
        back: "← Uɣal ɣer umulti",
        draft: "Arareb",
        model: "Amedya",
        chooseModel: "Fren amedya...",
        recipients: "Inermasen (imultiyen urmid)",
        all: "Akk",
        none: "Ulac",
        pending: "Ur yettwazen ara",
        refresh: "Smiren",
        preview: "Taskant n umedya",
        saveDraft: "Sekles arareb",
        queue: "Err deg udras n tuzna"
      },
      es: {
        btnSubOnly: "Newsletter (suscripción)",
        btnSubSend: "Newsletter (suscripción + envío)",
        close: "Cerrar",
        sendTab: "Enviar a suscriptores",
        sendTabTitle: "Redactar y enviar campaña a suscriptores activos",
        nameOpt: "Nombre (opcional)",
        yourName: "Tu nombre",
        lang: "Idioma",
        hint: "Si el correo es válido, la app lo suscribirá o desuscribirá según el botón elegido.",
        subscribe: "Suscribirme",
        unsubscribe: "Darme de baja",
        back: "← Volver a suscripción",
        draft: "Borrador",
        model: "Plantilla",
        chooseModel: "Elegir plantilla...",
        recipients: "Destinatarios (suscriptores activos)",
        all: "Todo",
        none: "Ninguno",
        pending: "No enviados",
        refresh: "Actualizar",
        preview: "Vista previa",
        saveDraft: "Guardar borrador",
        queue: "Poner en cola"
      }
    };
    return D[L] || D.fr;
  }

  const NL_APP_BASE = "https://alfamous-amha.web.app";
  const NL_SUBSCRIBE_URL = NL_APP_BASE + "/?prog=newsletter";

  /** Pied de page commun (liens {{subscribe_link}} / {{unsubscribe_link}} rendus à l’envoi). */
  const NL_STANDARD_FOOTER =
    "Vous recevez ce message car vous êtes abonné(e) à la newsletter Alfamous.\n" +
    "{{subscribe_link}} · {{unsubscribe_link}}";

  const MODELS = {
    actu: {
      label: "Actualités plateforme",
      subject: "Nouveautés Alfamous cette semaine",
      preheader: "Mises à jour, forum, et contenus ajoutés.",
      intro: "Bonjour {{name}},",
      body: "Voici les nouveautés de la semaine sur Alfamous:\n- Nouveau contenu\n- Correctifs forum/commentaires\n- Conseils d'utilisation",
      ctaText: "Ouvrir Alfamous",
      ctaUrl: NL_APP_BASE + "/",
      footer: NL_STANDARD_FOOTER
    },
    rappel: {
      label: "Rappel communauté",
      subject: "Rappel: participez au forum lexique",
      preheader: "Questions, réponses et suivi des discussions.",
      intro: "Salam {{name}},",
      body: "Nous vous invitons à participer au forum:\n- Poser une question\n- Répondre aux messages\n- Proposer des améliorations",
      ctaText: "Aller au forum",
      ctaUrl: NL_APP_BASE + "/",
      footer: NL_STANDARD_FOOTER
    },
    blogMois: {
      label: "5 derniers articles (blog)",
      subject: "",
      preheader: "",
      intro: "Bonjour {{name}},",
      body: "",
      ctaText: "Voir tous les articles dans Alfamous",
      ctaUrl: NL_APP_BASE + "/?prog=articlesHtml",
      footer: NL_STANDARD_FOOTER,
      dynamic: true
    }
  };

  function zcNewsletterSubscribeUrl() {
    return NL_SUBSCRIBE_URL;
  }

  function zcNewsletterExpandFooterPlaceholders(footer) {
    let out = String(footer || "");
    out = out.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, function (tag) {
      if (/abonner/i.test(tag) && !/d[eé]sabonner/i.test(tag)) return "S'Abonner";
      if (/d[eé]sabonner/i.test(tag)) return "Se Désabonner";
      return "";
    });
    out = out.replace(/\{\{subscribe_url\}\}/g, "S'Abonner");
    out = out.replace(/\{\{unsubscribe_url\}\}/g, "Se Désabonner");
    out = out.replace(/\{\{subscribe_link\}\}/g, "S'Abonner");
    out = out.replace(/\{\{unsubscribe_link\}\}/g, "Se Désabonner");
    return out;
  }

  function parseArticleDateLoose(txt) {
    const s = String(txt || "").trim();
    if (!s) return null;
    const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
      let mo = Number(slash[1]);
      let da = Number(slash[2]);
      const yr = Number(slash[3]);
      if (mo > 12 && da <= 12) {
        const t = mo;
        mo = da;
        da = t;
      }
      const dt = new Date(yr, mo - 1, da);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function zcNewsletterBlogSearchUrl(queryText) {
    const base = "https://blog.alfamous.ca/search";
    const q = String(queryText || "").replace(/\s+/g, " ").trim();
    if (!q) return base;
    return base + "?q=" + encodeURIComponent(q) + "&m=1";
  }

  function zcNewsletterArticleSnippet(articleEl, max) {
    const lim = max || 280;
    const tmp = document.createElement("div");
    tmp.innerHTML = articleEl.innerHTML;
    const root = tmp.querySelector(".corps") || tmp;
    root.querySelectorAll("style, script, noscript, link, meta").forEach(function (n) { n.remove(); });
    const paras = Array.from(root.querySelectorAll("p"));
    const pick = paras.find(function (el) {
      return el.textContent.replace(/\s+/g, " ").trim().length > 10;
    }) || paras[0];
    const texte = ((pick ? pick.textContent : root.textContent) || "").replace(/\s+/g, " ").trim();
    if (!texte) return "";
    if (texte.length <= lim) return texte;
    const cut = texte.lastIndexOf(" ", lim);
    return texte.slice(0, cut > -1 ? cut : lim) + "…";
  }

  function zcNewsletterParseArticlesFromHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = String(html || "");
    let list = Array.from(tmp.querySelectorAll("div.article"));
    return list.filter(function (a) { return !a.parentElement.closest("div.article"); });
  }

  async function zcNewsletterLoadArticlesDom() {
    if (Array.isArray(window.allArticlesDOM) && window.allArticlesDOM.length) {
      return window.allArticlesDOM;
    }
    if (typeof window.contenuArticlesHtml === "string" && window.contenuArticlesHtml.length > 200) {
      return zcNewsletterParseArticlesFromHtml(window.contenuArticlesHtml);
    }
    if (typeof window.__buildArticlesHtmlLoadUrls === "function" && typeof window.loadFirstAvailable === "function") {
      const urls = await window.__buildArticlesHtmlLoadUrls();
      await window.loadFirstAvailable(urls);
      if (typeof window.contenuArticlesHtml === "string" && window.contenuArticlesHtml.length > 200) {
        return zcNewsletterParseArticlesFromHtml(window.contenuArticlesHtml);
      }
    }
    if (typeof window.loadScriptOnce === "function" && typeof window.__withV === "function") {
      await window.loadScriptOnce(window.__withV("jsZC/articles-format-html.js"));
      if (typeof window.contenuArticlesHtml === "string" && window.contenuArticlesHtml.length > 200) {
        return zcNewsletterParseArticlesFromHtml(window.contenuArticlesHtml);
      }
    }
    throw new Error("Liste d’articles du blog indisponible (mettez à jour la liste via « Mise à jour des articles »).");
  }

  const NL_BLOG_RECENT_COUNT = 5;

  async function buildBlogRecentNewsletterFields() {
    const base = MODELS.blogMois;
    const all = await zcNewsletterLoadArticlesDom();
    const rows = [];
    all.forEach(function (article) {
      const dateTxt = (article.querySelector(".date") && article.querySelector(".date").textContent || "").trim();
      const dt = parseArticleDateLoose(dateTxt);
      const titre = (
        article.querySelector("h2") && article.querySelector("h2").textContent ||
        article.getAttribute("data-titre") ||
        "Sans titre"
      ).replace(/\s+/g, " ").trim();
      rows.push({
        dt: dt || new Date(0),
        dateTxt: dateTxt,
        titre: titre,
        snippet: zcNewsletterArticleSnippet(article, 300),
        url: zcNewsletterBlogSearchUrl(titre)
      });
    });
    rows.sort(function (a, b) { return b.dt - a.dt; });
    const top = rows.slice(0, NL_BLOG_RECENT_COUNT);
    const lines = [];
    top.forEach(function (r, idx) {
      lines.push("(" + (idx + 1) + ") " + r.titre);
      lines.push("🗓 " + (r.dateTxt || "—"));
      if (r.snippet) lines.push(r.snippet);
      if (r.url) lines.push("→ " + r.url);
      lines.push("");
    });
    const count = top.length;
    const body = count
      ? (
        "Les " + count + " articles les plus récents du blog Alfamous " +
        "(comme dans « Articles du blog ») :\n\n" +
        lines.join("\n").trim()
      )
      : (
        "Aucun article dans la liste Alfamous. Lancez une mise à jour des articles " +
        "(bouton admin) puis resélectionnez ce modèle."
      );
    return {
      subject: count
        ? "Blog Alfamous — " + count + " dernier" + (count > 1 ? "s" : "") + " article" + (count > 1 ? "s" : "")
        : "Blog Alfamous — articles récents",
      preheader: count
        ? "Les " + count + " derniers articles sur blog.alfamous.ca"
        : "Actualité du blog Alfamous",
      intro: base.intro,
      body: body,
      ctaText: base.ctaText,
      ctaUrl: base.ctaUrl,
      footer: base.footer
    };
  }

  function fillNewsletterFieldsFromModel(m) {
    document.getElementById("nlSubject").value = m.subject || "";
    document.getElementById("nlPreheader").value = m.preheader || "";
    document.getElementById("nlIntro").value = m.intro || "";
    document.getElementById("nlBody").value = m.body || "";
    document.getElementById("nlCtaText").value = m.ctaText || "";
    document.getElementById("nlCtaUrl").value = m.ctaUrl || "";
    document.getElementById("nlFooter").value = m.footer || "";
    updatePreview();
  }

  function populateNlModelSelect() {
    const sel = document.getElementById("nlModel");
    if (!sel) return;
    const keep = sel.value;
    sel.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = nlDict().chooseModel;
    sel.appendChild(empty);
    Object.keys(MODELS).forEach(function (key) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = MODELS[key].label || key;
      sel.appendChild(opt);
    });
    if (keep && MODELS[keep]) sel.value = keep;
  }

  function getDb() {
    if (window.db) return window.db;
    if (typeof firebase !== "undefined" && firebase.firestore) return firebase.firestore();
    return null;
  }

  function toast(msg, color, ms) {
    if (typeof alertMsgBoxTemp === "function") return alertMsgBoxTemp(msg, color || "green", ms || 3000);
    alert(msg);
  }

  /** Texte utile renvoyé par httpsCallable (évite l’affichage vide « INTERNAL »). */
  function callableErrorDetail(err) {
    if (!err) return "";
    const d = err.details;
    if (typeof d === "string" && d.trim()) return d.trim();
    if (d && typeof d === "object" && d.message) return String(d.message);
    const m = err.message;
    if (m && String(m).trim() && String(m).toUpperCase() !== "INTERNAL") return String(m).trim();
    if (err.code) return String(err.code);
    return "";
  }

  function isConnectedUser() {
    const mail = String(localStorage.getItem("mailUser") || window.mailUser || "").trim().toLowerCase();
    if (!mail) return false;
    try {
      if (typeof zcIsAnonymeCourriel === "function") return !zcIsAnonymeCourriel(mail);
    } catch (_) { }
    return mail !== "anonyme@blog.alfamous.ca";
  }

  function getUserLevel() {
    const n = Number(localStorage.getItem("niveauUser") || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function hasRealFirebaseAuth() {
    if (typeof window.zcFirebaseHasRealSignedInUser === "function") {
      return window.zcFirebaseHasRealSignedInUser();
    }
    try {
      if (typeof firebase === "undefined" || !firebase.auth) return false;
      const u = firebase.auth().currentUser;
      const em = String((u && u.email) || "").trim().toLowerCase();
      return !!u && em.includes("@") && em !== "anonyme@blog.alfamous.ca";
    } catch (_) {
      return false;
    }
  }

  function canSendNewsletter() {
    return isConnectedUser() && getUserLevel() >= 3 && hasRealFirebaseAuth();
  }

  /** Session Firebase e-mail (pas anonyme) — requis pour newsletterCampaigns. */
  async function zcNewsletterEnsureRealAuthForWrite() {
    try {
      if (typeof window.__zcAuthReady !== "undefined" && window.__zcAuthReady) {
        await window.__zcAuthReady;
      }
    } catch (_) { }
    if (hasRealFirebaseAuth()) {
      return firebase.auth().currentUser;
    }
    if (typeof firebase === "undefined" || !firebase.auth) return null;
    const auth = firebase.auth();
    try {
      if (typeof auth.authStateReady === "function") await auth.authStateReady();
    } catch (_) { }
    if (hasRealFirebaseAuth()) return auth.currentUser;
    const mail = String(localStorage.getItem("mailUser") || "").trim().toLowerCase();
    if (mail && mail.includes("@") && mail !== "anonyme@blog.alfamous.ca") {
      for (let i = 0; i < 40; i++) {
        await new Promise(function (r) { setTimeout(r, 150); });
        if (hasRealFirebaseAuth()) return auth.currentUser;
      }
    }
    return null;
  }

  /** ID Firestore du brouillon / campagne courante (même doc du brouillon jusqu’à l’envoi). */
  let nlCampaignDocId = null;

  function firestoreTsMs(t) {
    if (!t) return 0;
    try {
      if (typeof t.toMillis === "function") return t.toMillis();
    } catch (_) { }
    if (typeof t.seconds === "number") return t.seconds * 1000;
    return 0;
  }

  function resetNewsletterCampaignContext() {
    nlCampaignDocId = null;
    const sel = document.getElementById("nlDraftSelect");
    if (sel) sel.value = "";
  }

  function getNlSelectedEmails() {
    const list = document.getElementById("nlRecipientsList");
    if (!list) return [];
    return Array.from(list.querySelectorAll('input[type="checkbox"][data-nl-email]:checked'))
      .map((cb) => String(cb.getAttribute("data-nl-email") || "").toLowerCase().trim())
      .filter((e) => e.includes("@"));
  }

  function setAllNlRecipientsChecked(on) {
    const list = document.getElementById("nlRecipientsList");
    if (!list) return;
    list.querySelectorAll('input[type="checkbox"][data-nl-email]').forEach((cb) => {
      if (!cb.disabled) cb.checked = on;
    });
  }

  function setNlRecipientsPendingOnly() {
    const list = document.getElementById("nlRecipientsList");
    if (!list) return;
    list.querySelectorAll('input[type="checkbox"][data-nl-email]').forEach((cb) => {
      if (cb.disabled) {
        cb.checked = false;
        return;
      }
      cb.checked = cb.getAttribute("data-nl-pending") === "1";
    });
  }

  async function refreshNlDraftSelect(keepSelectionId) {
    const sel = document.getElementById("nlDraftSelect");
    if (!sel || !canSendNewsletter()) return;
    const db = getDb();
    if (!db) return;
    const current = keepSelectionId != null ? keepSelectionId : sel.value;
    try {
      const snap = await db.collection("newsletterCampaigns").where("status", "==", "draft").limit(50).get();
      const rows = [];
      snap.forEach((doc) => {
        const d = doc.data() || {};
        rows.push({
          id: doc.id,
          subject: String(d.subject || "").trim() || "(sans objet)",
          ms: firestoreTsMs(d.updatedAt) || firestoreTsMs(d.createdAt),
        });
      });
      rows.sort((a, b) => b.ms - a.ms);
      sel.innerHTML = '<option value="">— Nouveau message (pas de brouillon) —</option>';
      rows.forEach((r) => {
        const opt = document.createElement("option");
        opt.value = r.id;
        const short = r.subject.length > 42 ? r.subject.slice(0, 40) + "…" : r.subject;
        opt.textContent = short + " · " + r.id.slice(0, 6) + "…";
        sel.appendChild(opt);
      });
      if (current && Array.from(sel.options).some((o) => o.value === current)) {
        sel.value = current;
      }
    } catch (e) {
      console.warn("refreshNlDraftSelect:", e);
    }
  }

  function subscriberRowAlreadySent(row, campaignDocId) {
    const ids = row.newsletterSentCampaignIds;
    if (!campaignDocId || !Array.isArray(ids)) return false;
    return ids.some((x) => String(x) === String(campaignDocId));
  }

  async function renderRecipientsPanel(savedRecipientEmails) {
    const list = document.getElementById("nlRecipientsList");
    if (!list || !canSendNewsletter()) return;
    const db = getDb();
    if (!db) {
      list.textContent = "Base indisponible.";
      return;
    }
    list.textContent = "Chargement…";
    try {
      const snap = await db.collection("newsletterSubscribers").where("status", "==", "active").get();
      const savedSet =
        savedRecipientEmails && savedRecipientEmails.length
          ? new Set(savedRecipientEmails.map((e) => String(e || "").toLowerCase().trim()))
          : null;
      const rows = [];
      snap.forEach((doc) => {
        const row = doc.data() || {};
        const email = String(row.email || doc.id || "").toLowerCase().trim();
        if (!email.includes("@")) return;
        rows.push({ docId: doc.id, email, name: String(row.name || "").trim(), row });
      });
      rows.sort((a, b) => a.email.localeCompare(b.email));
      const campId = nlCampaignDocId;
      const frag = document.createDocumentFragment();
      rows.forEach(({ email, name, row }) => {
        const already = subscriberRowAlreadySent(row, campId);
        const label = document.createElement("label");
        label.className = "nl-recipient-row" + (already ? " nl-recipient-already" : "");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.setAttribute("data-nl-email", email);
        cb.setAttribute("data-nl-pending", already ? "0" : "1");
        if (already) {
          cb.disabled = true;
          cb.checked = false;
        } else if (savedSet) {
          cb.checked = savedSet.has(email);
        } else {
          cb.checked = true;
        }
        const span = document.createElement("span");
        span.className = "nl-recipient-label-text";
        span.textContent = (name ? name + " · " : "") + email + (already ? " (déjà reçu cette campagne)" : "");
        label.appendChild(cb);
        label.appendChild(span);
        frag.appendChild(label);
      });
      list.innerHTML = "";
      if (!rows.length) {
        list.textContent = "Aucun abonné actif.";
        return;
      }
      list.appendChild(frag);
    } catch (e) {
      console.error("renderRecipientsPanel:", e);
      list.textContent = "Erreur de chargement.";
    }
  }

  async function loadNlDraftById(id) {
    const db = getDb();
    if (!db || !id) return;
    try {
      const snap = await db.collection("newsletterCampaigns").doc(id).get();
      if (!snap.exists) {
        toast("Brouillon introuvable.", "orange", 3000);
        return;
      }
      const d = snap.data() || {};
      if (String(d.status || "") !== "draft") {
        toast("Ce document n’est pas un brouillon (statut : " + String(d.status || "—") + ").", "orange", 4000);
        return;
      }
      nlCampaignDocId = id;
      const sel = document.getElementById("nlDraftSelect");
      if (sel) sel.value = id;
      document.getElementById("nlSubject").value = String(d.subject || "");
      document.getElementById("nlPreheader").value = String(d.preheader || "");
      document.getElementById("nlIntro").value = String(d.intro || "");
      document.getElementById("nlBody").value = String(d.body || "");
      document.getElementById("nlCtaText").value = String(d.ctaText || "");
      document.getElementById("nlCtaUrl").value = String(d.ctaUrl || "");
      document.getElementById("nlFooter").value = String(d.footer || "");
      const model = String(d.model || "").trim();
      document.getElementById("nlModel").value = MODELS[model] ? model : "";
      updatePreview();
      await renderRecipientsPanel(Array.isArray(d.recipientEmails) ? d.recipientEmails : null);
      toast("Brouillon chargé.", "green", 2200);
    } catch (e) {
      console.error("loadNlDraftById:", e);
      toast("Impossible de charger le brouillon.", "red", 3500);
    }
  }

  async function onNlDraftSelectChange() {
    const sel = document.getElementById("nlDraftSelect");
    const id = sel && sel.value ? String(sel.value) : "";
    if (!id) {
      nlCampaignDocId = null;
      await renderRecipientsPanel(null);
      return;
    }
    await loadNlDraftById(id);
  }

  async function refreshNewsletterSendPane() {
    if (!canSendNewsletter()) return;
    await refreshNlDraftSelect(nlCampaignDocId);
    if (!nlCampaignDocId) {
      await renderRecipientsPanel(null);
    }
  }

  function refreshNewsletterButtonContext() {
    const T = nlDict();
    const btn = document.getElementById("btnNewsletter");
    const ico = document.getElementById("newsletterBtnIcon");
    if (!btn || !ico) return;
    if (isConnectedUser()) {
      ico.className = "fas fa-newspaper";
      btn.title = canSendNewsletter() ? T.btnSubSend : T.btnSubOnly;
    } else {
      ico.className = "fas fa-envelope-open-text";
      btn.title = T.btnSubOnly;
    }
  }

  function applyNewsletterI18n() {
    const T = nlDict();
    const byId = (id) => document.getElementById(id);
    const close = byId("newsletterCloseBtn"); if (close) close.setAttribute("aria-label", T.close);
    const tab = byId("nlTabSend");
    if (tab) {
      tab.title = T.sendTabTitle;
      tab.setAttribute("aria-label", T.sendTab);
      const lbl = tab.querySelector(".nl-tab-send-label");
      if (lbl) lbl.textContent = T.sendTab;
    }
    const lName = document.querySelector('label[for="nlName"]'); if (lName) lName.textContent = T.nameOpt;
    const iName = byId("nlName"); if (iName) iName.placeholder = T.yourName;
    const lLang = document.querySelector('label[for="nlLang"]'); if (lLang) lLang.textContent = T.lang;
    const hint = byId("nlEmailHint"); if (hint) hint.textContent = T.hint;
    const sub = byId("nlSubscribeBtn")?.querySelector(".nl-subscribe-pair-label"); if (sub) sub.textContent = T.subscribe;
    const unsub = byId("nlUnsubscribeBtn")?.querySelector(".nl-subscribe-pair-label"); if (unsub) unsub.textContent = T.unsubscribe;
    const back = byId("nlBackToSubscribe"); if (back) back.textContent = T.back;
    const lDraft = document.querySelector('label[for="nlDraftSelect"]'); if (lDraft) lDraft.textContent = T.draft;
    const lModel = document.querySelector('label[for="nlModel"]'); if (lModel) lModel.textContent = T.model;
    populateNlModelSelect();
    const recLabel = document.querySelector(".nl-recipients-field .zc-popup-label"); if (recLabel) recLabel.textContent = T.recipients;
    const bAll = byId("nlRecipientsAll"); if (bAll) bAll.textContent = T.all;
    const bNone = byId("nlRecipientsNone"); if (bNone) bNone.textContent = T.none;
    const bPend = byId("nlRecipientsPending"); if (bPend) bPend.textContent = T.pending;
    const bRefresh = byId("nlRecipientsRefresh"); if (bRefresh) bRefresh.title = T.refresh;
    const prev = document.querySelector(".newsletter-preview-wrap .zc-popup-label"); if (prev) prev.textContent = T.preview;
    const bDraft = byId("nlDraftBtn"); if (bDraft) bDraft.textContent = T.saveDraft;
    const bQueue = byId("nlQueueBtn"); if (bQueue) bQueue.textContent = T.queue;
  }

  function getTopZ() {
    try {
      if (typeof zcNextOverlayZ === "function") return zcNextOverlayZ();
      if (typeof getNextZIndex === "function") return getNextZIndex();
    } catch (_) { }
    return 3000;
  }

  function ensurePopup() {
    let ov = document.getElementById("newsletterOverlay");
    if (ov) return ov;

    ov = document.createElement("div");
    ov.id = "newsletterOverlay";
    ov.className = "popupCommentaireOverlay newsletter-overlay";
    ov.style.display = "none";
    ov.innerHTML = `
      <div class="popup-box zc-comment-popup-box newsletter-box" role="dialog" aria-modal="true">
        <div class="zc-comment-popup-header">
          <span class="zc-comment-popup-header-spacer" aria-hidden="true"></span>
          <h2 class="zc-comment-popup-title">
            <span class="zc-popup-title-ico" aria-hidden="true"><i class="fas fa-newspaper"></i></span>
            Newsletter
          </h2>
          <button type="button" class="zc-comment-popup-iconbtn" id="newsletterCloseBtn" aria-label="Fermer">✕</button>
        </div>

        <div id="nlTabRow" class="zc-popup-tab-row newsletter-tab-row" role="tablist" aria-label="Newsletter" style="display:none;">
          <button type="button" id="nlTabSend" class="popup-mode-btn zc-popup-tab nl-tab-send-btn"
            title="Rédiger et envoyer une campagne aux abonnés actifs"
            aria-label="Envoyer un message aux abonnés">
            <span class="nl-tab-send-ico" aria-hidden="true"><i class="fas fa-paper-plane"></i></span>
            <span class="nl-tab-send-label">Envoyer un message aux abonnés</span>
          </button>
        </div>

        <div id="nlSubscribePane" class="newsletter-pane">
          <div class="zc-popup-field">
            <label class="zc-popup-label" for="nlName">Nom (optionnel)</label>
            <div class="zc-popup-field-row"><input id="nlName" class="newsletter-input" type="text" placeholder="Votre nom"></div>
          </div>
          <div class="zc-popup-field">
            <label class="zc-popup-label" for="nlEmail">Email</label>
            <div class="zc-popup-field-row"><input id="nlEmail" class="newsletter-input" type="email" placeholder="you@example.com"></div>
          </div>
          <div class="zc-popup-field">
            <label class="zc-popup-label" for="nlLang">Langue</label>
            <div class="zc-popup-field-row">
              <select id="nlLang" class="newsletter-input">
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="kab">Tamaziɣt</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
          <p class="nl-email-hint" id="nlEmailHint">
            Si l’adresse saisie est un courriel réel et correct, l’application <strong>inscrira</strong> ou <strong>désinscrira</strong> cette adresse selon le bouton choisi, une fois le traitement terminé.
          </p>
          <div class="zc-comment-popup-footer nl-subscribe-actions">
            <button type="button" id="nlSubscribeBtn" class="popup-enregistrer-btn zc-comment-popup-primary nl-subscribe-pair-btn">
              <span class="nl-subscribe-pair-ico" aria-hidden="true"><i class="fas fa-smile-beam"></i></span>
              <span class="nl-subscribe-pair-label">Je m’abonne</span>
            </button>
            <button type="button" id="nlUnsubscribeBtn" class="popup-enregistrer-btn zc-comment-popup-primary nl-subscribe-pair-btn">
              <span class="nl-subscribe-pair-ico" aria-hidden="true"><i class="fas fa-frown-open"></i></span>
              <span class="nl-subscribe-pair-label">Je me désabonne</span>
            </button>
          </div>
        </div>

        <div id="nlSendPane" class="newsletter-pane" style="display:none;">
          <div class="nl-send-head">
            <button type="button" id="nlBackToSubscribe" class="popup-enregistrer-btn nl-back-btn">← Retour à l’inscription</button>
          </div>
          <div class="zc-popup-field">
            <label class="zc-popup-label" for="nlDraftSelect">Brouillon</label>
            <div class="zc-popup-field-row">
              <select id="nlDraftSelect" class="newsletter-input" aria-label="Charger un brouillon">
                <option value="">— Nouveau message (pas de brouillon) —</option>
              </select>
            </div>
          </div>
          <div class="zc-popup-field">
            <label class="zc-popup-label" for="nlModel">Modèle</label>
            <div class="zc-popup-field-row">
              <select id="nlModel" class="newsletter-input">
                <option value="">Choisir un modèle...</option>
              </select>
            </div>
          </div>
          <div class="zc-popup-field"><label class="zc-popup-label" for="nlSubject">Objet</label><div class="zc-popup-field-row"><input id="nlSubject" class="newsletter-input" type="text"></div></div>
          <div class="zc-popup-field"><label class="zc-popup-label" for="nlPreheader">Pré-header</label><div class="zc-popup-field-row"><input id="nlPreheader" class="newsletter-input" type="text"></div></div>
          <div class="zc-popup-field"><label class="zc-popup-label" for="nlIntro">Intro</label><div class="zc-popup-field-row"><input id="nlIntro" class="newsletter-input" type="text"></div></div>
          <div class="zc-popup-field"><label class="zc-popup-label" for="nlBody">Corps</label><div class="zc-popup-field-row"><textarea id="nlBody" class="textArea zc-popup-textarea" rows="5"></textarea></div></div>
          <div class="zc-popup-field"><label class="zc-popup-label" for="nlCtaText">Texte bouton</label><div class="zc-popup-field-row"><input id="nlCtaText" class="newsletter-input" type="text"></div></div>
          <div class="zc-popup-field"><label class="zc-popup-label" for="nlCtaUrl">Lien bouton</label><div class="zc-popup-field-row"><input id="nlCtaUrl" class="newsletter-input" type="url"></div></div>
          <div class="zc-popup-field"><label class="zc-popup-label" for="nlFooter">Footer</label><div class="zc-popup-field-row"><input id="nlFooter" class="newsletter-input" type="text"></div></div>
          <div class="zc-popup-field nl-recipients-field">
            <span class="zc-popup-label">Destinataires (abonnés actifs)</span>
            <div class="nl-recipients-toolbar">
              <button type="button" id="nlRecipientsAll" class="popup-enregistrer-btn nl-recipient-tool">Tout</button>
              <button type="button" id="nlRecipientsNone" class="popup-enregistrer-btn nl-recipient-tool">Aucun</button>
              <button type="button" id="nlRecipientsPending" class="popup-enregistrer-btn nl-recipient-tool" title="Cocher seulement ceux qui n’ont pas encore reçu cette campagne (comme la colonne « message envoyé » du tableur)">Non reçus</button>
              <button type="button" id="nlRecipientsRefresh" class="popup-enregistrer-btn nl-recipient-tool" title="Rafraîchir">↻</button>
            </div>
            <p class="nl-recipients-legend">Cochez les destinataires. Après un envoi réussi, ils sont marqués pour cette campagne (équivalent de la colonne I « déjà envoyé » dans MessageAuxAbonnes.gs).</p>
            <div id="nlRecipientsList" class="nl-recipients-list" role="group" aria-label="Abonnés"></div>
          </div>
          <div class="newsletter-preview-wrap">
            <div class="zc-popup-label">Aperçu modèle</div>
            <pre id="nlPreview" class="newsletter-preview"></pre>
          </div>
          <div class="zc-comment-popup-footer newsletter-send-actions">
            <button type="button" id="nlDraftBtn" class="popup-enregistrer-btn">Enregistrer brouillon</button>
            <button type="button" id="nlQueueBtn" class="popup-enregistrer-btn zc-comment-popup-primary">Mettre en file d'envoi</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(ov);

    document.getElementById("newsletterCloseBtn").addEventListener("click", closeNewsletterPopup);
    ov.addEventListener("click", function (e) { if (e.target === ov) closeNewsletterPopup(); });
    document.getElementById("nlTabSend").addEventListener("click", function () { switchTab("send"); });
    document.getElementById("nlBackToSubscribe").addEventListener("click", function () { switchTab("subscribe"); });
    populateNlModelSelect();
    document.getElementById("nlModel").addEventListener("change", function () {
      applyModel().catch(function (e) {
        console.warn("applyModel:", e);
        toast(String((e && e.message) || "Impossible d’appliquer le modèle."), "orange", 4500);
      });
    });
    [
      "nlSubject", "nlPreheader", "nlIntro", "nlBody", "nlCtaText", "nlCtaUrl", "nlFooter"
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", updatePreview);
    });
    document.getElementById("nlSubscribeBtn").addEventListener("click", function () { subscribeNewsletter(true); });
    document.getElementById("nlUnsubscribeBtn").addEventListener("click", function () { subscribeNewsletter(false); });
    document.getElementById("nlDraftBtn").addEventListener("click", function () { saveCampaign("draft"); });
    document.getElementById("nlQueueBtn").addEventListener("click", function () { saveCampaign("queued"); });
    document.getElementById("nlDraftSelect").addEventListener("change", onNlDraftSelectChange);
    document.getElementById("nlRecipientsAll").addEventListener("click", function () { setAllNlRecipientsChecked(true); });
    document.getElementById("nlRecipientsNone").addEventListener("click", function () { setAllNlRecipientsChecked(false); });
    document.getElementById("nlRecipientsPending").addEventListener("click", setNlRecipientsPendingOnly);
    document.getElementById("nlRecipientsRefresh").addEventListener("click", function () { renderRecipientsPanel(null); });

    return ov;
  }

  function switchTab(tab) {
    if (tab === "send" && !canSendNewsletter()) tab = "subscribe";
    const isSub = tab === "subscribe";
    document.getElementById("nlSubscribePane").style.display = isSub ? "" : "none";
    document.getElementById("nlSendPane").style.display = isSub ? "none" : "";
    const sendTab = document.getElementById("nlTabSend");
    if (sendTab) sendTab.classList.toggle("active", !isSub);
    if (!isSub) updatePreview();
    if (!isSub && canSendNewsletter()) {
      refreshNewsletterSendPane();
    }
  }

  function refreshSendTabAccess() {
    const tab = document.getElementById("nlTabSend");
    const tabRow = document.getElementById("nlTabRow");
    if (!tab || !tabRow) return;
    const allowed = canSendNewsletter();
    tab.disabled = !allowed;
    tab.style.display = allowed ? "" : "none";
    tabRow.style.display = allowed ? "" : "none";
    tab.title = "Rédiger et envoyer une campagne aux abonnés actifs";
    if (!allowed) switchTab("subscribe");
  }

  async function applyModel() {
    const key = document.getElementById("nlModel").value;
    const m = MODELS[key];
    if (!m) return;
    if (m.dynamic && key === "blogMois") {
      toast("Chargement des 5 derniers articles…", "orange", 2800);
      const fields = await buildBlogRecentNewsletterFields();
      fillNewsletterFieldsFromModel(fields);
      toast(
        fields.body.indexOf("Aucun article dans la liste") === 0
          ? "Modèle appliqué (liste vide)."
          : "Modèle « 5 derniers articles » appliqué.",
        "green",
        3200
      );
      return;
    }
    fillNewsletterFieldsFromModel(m);
  }

  function zcNewsletterBodyForPreview(body) {
    return String(body || "")
      .replace(/^→\s+https?:\/\/\S+\s*$/gm, "")
      .replace(/^\((\d+)\)\s+(.+)$/gm, "($1) $2  [titre = lien bleu]");
  }

  function buildModelText() {
    const subject = document.getElementById("nlSubject").value.trim();
    const preheader = document.getElementById("nlPreheader").value.trim();
    const intro = document.getElementById("nlIntro").value.trim();
    const body = zcNewsletterBodyForPreview(document.getElementById("nlBody").value.trim());
    const ctaText = document.getElementById("nlCtaText").value.trim();
    const ctaUrl = document.getElementById("nlCtaUrl").value.trim();
    const footer = zcNewsletterExpandFooterPlaceholders(document.getElementById("nlFooter").value.trim());
    return `OBJET (e-mail, pas répété dans le corps): ${subject}
PRE-HEADER: ${preheader}

${intro}

${body}

${ctaText} -> ${ctaUrl}

${footer}`;
  }

  function updatePreview() {
    const p = document.getElementById("nlPreview");
    if (p) p.textContent = buildModelText();
  }

  async function countActiveSubscribers() {
    const db = getDb();
    if (!db) return 0;
    try {
      const snap = await db.collection("newsletterSubscribers").where("status", "==", "active").get();
      return snap.size || 0;
    } catch (_) {
      return 0;
    }
  }

  async function subscribeNewsletter(wantActive) {
    const db = getDb();
    if (!db) {
      toast("Base de données indisponible.", "red", 3500);
      return;
    }
    const name = (document.getElementById("nlName").value || "").trim();
    const email = (document.getElementById("nlEmail").value || "").trim().toLowerCase();
    const lang = (document.getElementById("nlLang").value || "fr").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast("Email invalide.", "orange", 3000);
      return;
    }
    const btnSub = document.getElementById("nlSubscribeBtn");
    const btnUnsub = document.getElementById("nlUnsubscribeBtn");
    const labSubEl = btnSub ? btnSub.querySelector(".nl-subscribe-pair-label") : null;
    const labUnsubEl = btnUnsub ? btnUnsub.querySelector(".nl-subscribe-pair-label") : null;
    const labelSub = labSubEl ? labSubEl.textContent : "Je m’abonne";
    const labelUnsub = labUnsubEl ? labUnsubEl.textContent : "Je me désabonne";
    if (btnSub) btnSub.disabled = true;
    if (btnUnsub) btnUnsub.disabled = true;
    if (labSubEl) labSubEl.textContent = "Traitement…";
    if (labUnsubEl) labUnsubEl.textContent = "Traitement…";
    const ref = db.collection("newsletterSubscribers").doc(email);
    try {
      if (wantActive) {
        const base = {
          email: email,
          name: name || "",
          lang: lang,
          status: "active",
          source: "visiteurs",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await ref.set(base, { merge: true });
        toast("Si ce courriel est réel et valide, il est bien inscrit à la newsletter.", "green", 4200);
      } else {
        await ref.set(
          {
            email: email,
            name: name || "",
            lang: lang,
            status: "inactive",
            source: "visiteurs",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );
        toast("Si ce courriel est réel et valide, il est bien désinscrit de la newsletter.", "green", 4200);
      }
      document.getElementById("nlEmail").value = "";
    } catch (e) {
      console.error("newsletter subscribe/unsubscribe:", e);
      toast("Demande prise en compte. Réessayez plus tard en cas de doute.", "orange", 3500);
    } finally {
      if (btnSub) btnSub.disabled = false;
      if (btnUnsub) btnUnsub.disabled = false;
      if (labSubEl) labSubEl.textContent = labelSub || "Je m’abonne";
      if (labUnsubEl) labUnsubEl.textContent = labelUnsub || "Je me désabonne";
    }
  }

  async function saveCampaign(status) {
    const db = getDb();
    if (!db) {
      toast("Base de données indisponible.", "red", 3500);
      return;
    }
    const niveau = Number(localStorage.getItem("niveauUser") || 0);
    if (niveau < 3) {
      toast("Niveau 3 requis pour enregistrer ou envoyer une campagne (même règle que le serveur).", "orange", 4000);
      return;
    }
    const authUser = await zcNewsletterEnsureRealAuthForWrite();
    if (!authUser) {
      toast(
        "Connexion Firebase requise (e-mail / mot de passe via « Connexion »). Le niveau 3 seul dans le navigateur ne suffit pas pour enregistrer une campagne.",
        "orange",
        5500
      );
      return;
    }
    const payload = {
      subject: (document.getElementById("nlSubject").value || "").trim(),
      preheader: (document.getElementById("nlPreheader").value || "").trim(),
      intro: (document.getElementById("nlIntro").value || "").trim(),
      body: (document.getElementById("nlBody").value || "").trim(),
      ctaText: (document.getElementById("nlCtaText").value || "").trim(),
      ctaUrl: (document.getElementById("nlCtaUrl").value || "").trim(),
      footer: (document.getElementById("nlFooter").value || "").trim(),
      model: (document.getElementById("nlModel").value || "").trim(),
      status: status,
      recipientsCount: await countActiveSubscribers(),
      createdBy: (localStorage.getItem("mailUser") || "").toLowerCase(),
      createdByName: localStorage.getItem("nameUser") || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!payload.subject || !payload.body) {
      toast("Objet et corps sont obligatoires.", "orange", 3000);
      return;
    }
    try {
      const ref = await db.collection("newsletterCampaigns").add(payload);
      if (status === "queued") {
        const hasFn =
          typeof firebase !== "undefined" &&
          firebase.app &&
          typeof firebase.app().functions === "function";
        if (!hasFn) {
          toast(
            "Campagne enregistrée, mais l’envoi n’a pas été lancé : SDK Functions indisponible (rechargez après déploiement).",
            "orange",
            4500
          );
          return;
        }
        try {
          const fn = firebase.app().functions("europe-west1").httpsCallable("sendQueuedNewsletterCampaign");
          await fn({ campaignId: ref.id });
          toast("Campagne traitée côté serveur (e-mails envoyés ou erreur indiquée dans les logs).", "green", 4000);
          return;
        } catch (eSend) {
          console.warn("sendQueuedNewsletterCampaign:", eSend);
          const msg = callableErrorDetail(eSend) || String(eSend && eSend.message || "");
          const full = String(msg + " " + (eSend && eSend.code || ""));
          let hint = "";
          if (/PERMISSION_DENIED|Missing or insufficient permissions/i.test(full)) {
            hint =
              " Ce n’est pas le SMTP : le compte de service qui exécute la Cloud Function n’a pas accès à Firestore. Dans Google Cloud → IAM, lui ajouter le rôle « Cloud Datastore User » (roles/datastore.user), condition « None », puis attendre 1–2 min.";
          } else if (/functions\/unauthenticated|unauthenticated/i.test(full)) {
            hint = " Connectez-vous avec Firebase Auth (e-mail / mot de passe).";
          } else if (/functions\/permission-denied|permission-denied|niveau|Profil introuvable|E-mail de compte requis/i.test(full)) {
            hint = " Compte niveau ≥ 3 requis dans demandeCollaborerLexique (même e-mail qu’en Auth).";
          } else if (/SMTP non configuré|smtp\.|nodemailer|EAUTH|ETIMEDOUT|ECONNREFUSED|Invalid login|Greeting never received/i.test(full)) {
            hint = " Vérifiez `firebase functions:config` (smtp.*, email.from) et redéployez les functions.";
          } else if (/functions\/failed-precondition|failed-precondition/i.test(full)) {
            hint = " Erreur « failed-precondition » côté serveur — lire le détail ci-dessous ou `firebase functions:log`.";
          }
          toast(
            "Campagne enregistrée ; l’envoi a échoué." + hint + " Détail : " + String(msg).slice(0, 400),
            "orange",
            6200
          );
          return;
        }
      }
      toast("Brouillon enregistré.", "green", 3200);
    } catch (e) {
      console.error("save campaign:", e);
      const full = String((e && e.message) || e || "");
      if (/Missing or insufficient permissions|PERMISSION_DENIED/i.test(full)) {
        toast(
          "Firestore a refusé l’enregistrement : connectez-vous avec le même e-mail qu’en admin (Connexion), puis réessayez. Si le problème persiste, déployez firestore.rules.",
          "red",
          6200
        );
      } else {
        toast("Impossible d'enregistrer la campagne.", "red", 3500);
      }
    }
  }

  function openNewsletterPopup() {
    const ov = ensurePopup();
    refreshNewsletterButtonContext();
    applyNewsletterI18n();
    refreshSendTabAccess();
    ov.style.zIndex = String(getTopZ());
    ov.style.display = "flex";
    const knownName = (localStorage.getItem("nameUser") || "").trim();
    const knownMail = (localStorage.getItem("mailUser") || "").trim();
    if (knownName && knownName.toLowerCase() !== "anonyme") document.getElementById("nlName").value = knownName;
    if (knownMail && knownMail.indexOf("@") > 0 && !/anonyme@/i.test(knownMail)) document.getElementById("nlEmail").value = knownMail;
    if (!document.getElementById("nlSubject").value) {
      document.getElementById("nlModel").value = "actu";
      applyModel();
    }
    switchTab("subscribe");
  }

  function closeNewsletterPopup() {
    const ov = document.getElementById("newsletterOverlay");
    if (ov) ov.style.display = "none";
  }

  window.openNewsletterPopup = openNewsletterPopup;
  window.closeNewsletterPopup = closeNewsletterPopup;

  (function hookUserUiUpdates() {
    function refreshAll() {
      refreshNewsletterButtonContext();
      refreshSendTabAccess();
    }
    function install() {
      const orig = window.updateUserUI;
      if (typeof orig !== "function" || orig.__newsletterWrapped) return;
      const wrapped = function () {
        const out = orig.apply(this, arguments);
        try { refreshAll(); } catch (_) { }
        return out;
      };
      wrapped.__newsletterWrapped = true;
      window.updateUserUI = wrapped;
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        install();
        refreshAll();
      }, { once: true });
    } else {
      install();
      refreshAll();
    }
    window.addEventListener("storage", refreshAll);
    window.addEventListener("focus", refreshAll);
    try {
      if (typeof firebase !== "undefined" && firebase.auth) {
        firebase.auth().onAuthStateChanged(function () {
          try { refreshAll(); } catch (_) { }
        });
      }
      if (typeof window.__zcAuthReady !== "undefined" && window.__zcAuthReady) {
        window.__zcAuthReady.then(function () {
          try { refreshAll(); } catch (_) { }
        });
      }
    } catch (_) { }
    window.addEventListener("uiLangChanged", function () {
      try { applyNewsletterI18n(); } catch (_) { }
      try { refreshNewsletterButtonContext(); } catch (_) { }
    });
  })();
})();

