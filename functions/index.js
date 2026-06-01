/* eslint-disable max-len, indent, object-curly-spacing, comma-dangle,
   operator-linebreak, require-jsdoc */
/**
 * Cloud Functions — Alfamous
 *
 * 1) onForumAuthorNotificationEmail
 *    Déclenché à la création d’un doc forumAuthorNotifications → e-mail à targetMail.
 *
 * 2) onContactMessageEmail
 *    Création d’un doc messagesContact → e-mail à email.contact_to (ou smtp.user si absent).
 *
 * 3) sendEmailToSubscribers (callable HTTPS, région europe-west1)
 *    Réservé aux comptes Firestore demandeCollaborerLexique avec niveau >= 3,
 *    même e-mail que Firebase Auth. Envoie un message à tous les mails de la collection.
 *    Données : { subject, text, html?, testRecipientEmail? }
 *    Si testRecipientEmail est renseigné, un seul envoi de test (même contrôle admin).
 *
 * Client (exemple) :
 *   firebase.auth().currentUser &&
 *   firebase.app().functions('europe-west1').httpsCallable('sendEmailToSubscribers')({
 *     subject: 'Annonce',
 *     text: 'Corps en texte brut',
 *     html: '<p>Corps HTML optionnel</p>',
 *     testRecipientEmail: 'moi@example.com' // optionnel
 *   })
 *
 * Voir functions/mail.js pour la configuration SMTP (functions:config).
 *
 * 4) synthesizeMesNoteAudio (callable HTTPS, europe-west1, auth requise)
 *    MP3 via Cloud Text-to-Speech → Storage MesMedias/audio/MesNotesTts/{uid}/…
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { sendMail, isSmtpConfigured, getMailConfig } = require("./mail");
const {
  synthesizeMesNoteAudioImpl,
  probeMesNoteAudioUnchanged,
  MAX_CHARS: MES_NOTE_TTS_MAX_CHARS,
} = require("./mesNoteTts");
const { transcribeFromMediaUrlImpl } = require("./mesNoteStt");

if (!admin.apps.length) {
  admin.initializeApp();
}

const REGION = "europe-west1";

/** Identité d’exécution : TTS + upload Storage utilisent ce SA (IAM projet). */
const MES_NOTE_TTS_RUNTIME_SA =
  "mon-robot-tts@alfamous-amha.iam.gserviceaccount.com";
const NEWSLETTER_TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30 jours
const QUICK_LOGIN_PATH = path.join(__dirname, "quick-login.json");

function getNewsletterSecret() {
  try {
    const c = functions.config();
    const s = String((c.newsletter && c.newsletter.secret) || "").trim();
    if (s) return s;
  } catch (_) {}
  return "CHANGE_ME_NEWSLETTER_SECRET";
}

function normalizeMail(s) {
  return String(s || "").toLowerCase().trim();
}

/** Aligné sur public/jsZC/connexion.js — zcNormalizeLexiqueName */
function normalizeLexiqueName(s) {
  let t = String(s || "").trim().toLowerCase();
  if (t.charAt(0) === "@") {
    t = t.slice(1).trim();
  }
  return t;
}

/** Nom affiché Collaborer : champs possibles selon les fiches / imports. */
function collaborerDisplayNameFromRow(row) {
  const r = row || {};
  const keys = ["name", "nom", "Nom", "displayName"];
  for (let i = 0; i < keys.length; i++) {
    const v = r[keys[i]];
    const s = String(v == null ? "" : v).trim();
    if (s) {
      return s;
    }
  }
  return "";
}

/**
 * Niveau numérique depuis une fiche Collaborer (nombre, chaîne "3", Long Firestore, etc.).
 * @returns {number|null}
 */
function collaborerNiveauFromRow(row) {
  const v = row && row.niveau;
  if (v == null || v === "") {
    return null;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.trunc(v);
  }
  if (typeof v === "string") {
    const p = parseInt(v.trim(), 10);
    return Number.isFinite(p) ? p : null;
  }
  if (typeof v === "object" && v !== null && typeof v.toNumber === "function") {
    try {
      const n = v.toNumber();
      return Number.isFinite(n) ? Math.trunc(n) : null;
    } catch (_) {
      return null;
    }
  }
  const p = parseInt(String(v), 10);
  return Number.isFinite(p) ? p : null;
}

/**
 * Fusion claims custom : seules valeurs primitives acceptées par Firebase Auth.
 * @param {Record<string, unknown>|undefined} existing
 * @param {number} niveau
 */
function mergeCustomClaimsWithNiveau(existing, niveau) {
  const out = {};
  const src = existing && typeof existing === "object" ? existing : {};
  Object.keys(src).forEach((k) => {
    const v = src[k];
    if (v == null) {
      return;
    }
    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean") {
      out[k] = v;
    }
  });
  out.niveau = Math.trunc(Number(niveau));
  return out;
}

/** @param {FirebaseFirestore.DocumentData} row */
function subscriberAlreadyGotCampaign(row, campaignId) {
  const ids = row && row.newsletterSentCampaignIds;
  if (!Array.isArray(ids) || !campaignId) return false;
  const c = String(campaignId);
  return ids.some((x) => String(x) === c);
}

/**
 * Objet 100 % sérialisable pour https.onCall (voir encode() dans firebase-functions).
 * Sinon valeurs comme NaN → "Data cannot be encoded" → HTTP 500 INTERNAL.
 * @param {{ ok?: boolean, mode?: string, recipientCount?: number, sent?: number, failed?: number, failures?: Array<{to?: string, reason?: string}> }} o
 */
function callableResultSummary(o) {
  const failuresRaw = Array.isArray(o.failures) ? o.failures : [];
  const failures = failuresRaw.slice(0, 20).map((f) => ({
    to: String(f && f.to != null ? f.to : ""),
    reason: String(f && f.reason != null ? f.reason : "error"),
  }));
  const n = (x) => {
    const v = Number(x);
    return Number.isFinite(v) ? Math.trunc(v) : 0;
  };
  return {
    ok: !!o.ok,
    mode: o.mode === "test" ? "test" : "broadcast",
    recipientCount: n(o.recipientCount),
    sent: n(o.sent),
    failed: n(o.failed),
    failures,
  };
}

function signNewsletterToken(email, expSec) {
  const payload = `${normalizeMail(email)}|${String(expSec)}`;
  return crypto
    .createHmac("sha256", getNewsletterSecret())
    .update(payload)
    .digest("hex");
}

function buildNewsletterUnsubscribeUrl(email) {
  const cfg = getMailConfig();
  const base = cfg.appUrl || "https://alfamous-amha.web.app";
  const exp = Math.floor(Date.now() / 1000) + NEWSLETTER_TOKEN_TTL_SEC;
  const e = encodeURIComponent(normalizeMail(email));
  const x = encodeURIComponent(String(exp));
  const sig = encodeURIComponent(signNewsletterToken(email, exp));
  return `${base}/newsletter-unsubscribe?e=${e}&x=${x}&sig=${sig}`;
}

function renderNewsletterHtml(payload, toEmail, toName) {
  const subject = String(payload.subject || "").trim();
  const preheader = String(payload.preheader || "").trim();
  const intro = String(payload.intro || "").trim().replace(/\{\{name\}\}/g, toName || "ami");
  const body = String(payload.body || "").trim().replace(/\{\{name\}\}/g, toName || "ami");
  const ctaText = String(payload.ctaText || "").trim();
  const ctaUrl = String(payload.ctaUrl || "").trim();
  const unsubscribeUrl = buildNewsletterUnsubscribeUrl(toEmail);
  const footer = String(payload.footer || "")
    .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)
    .replace(/\{\{name\}\}/g, toName || "ami");
  const pre = preheader ? `<div style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : "";
  const bodyHtml = escapeHtml(body).replace(/\n/g, "<br/>");
  const introHtml = escapeHtml(intro);
  const ctaHtml = (ctaText && ctaUrl)
    ? `<p style="margin:18px 0;"><a href="${escapeHtml(ctaUrl)}" style="background:#0d9488;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block;">${escapeHtml(ctaText)}</a></p>`
    : "";
  const footerHtml = escapeHtml(footer)
    .replace(/&lt;a href="([^"]+)"&gt;([^<]+)&lt;\/a&gt;/g, '<a href="$1">$2</a>')
    .replace(/\n/g, "<br/>");
  return (
    `${pre}` +
    `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">` +
    `<p>Bonjour,</p>` +
    (subject ? `<p><strong>${escapeHtml(subject)}</strong></p>` : "") +
    (introHtml ? `<p>${introHtml}</p>` : "") +
    (bodyHtml ? `<p>${bodyHtml}</p>` : "") +
    `${ctaHtml}` +
    `<hr style="border:none;border-top:1px solid #e2e8f0;margin:18px 0"/>` +
    `<p style="font-size:12px;color:#64748b">${footerHtml}</p>` +
    `</div>`
  );
}

function renderNewsletterText(payload, toEmail, toName) {
  const unsubscribeUrl = buildNewsletterUnsubscribeUrl(toEmail);
  const intro = String(payload.intro || "").replace(/\{\{name\}\}/g, toName || "ami");
  const body = String(payload.body || "").replace(/\{\{name\}\}/g, toName || "ami");
  const footer = String(payload.footer || "")
    .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)
    .replace(/\{\{name\}\}/g, toName || "ami");
  const ctaText = String(payload.ctaText || "").trim();
  const ctaUrl = String(payload.ctaUrl || "").trim();
  return (
    `${intro}\n\n${body}\n\n` +
    (ctaText && ctaUrl ? `${ctaText}: ${ctaUrl}\n\n` : "") +
    `${footer}\n`
  ).trim();
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readQuickLoginMapSafe() {
  try {
    if (!fs.existsSync(QUICK_LOGIN_PATH)) return {};
    const raw = fs.readFileSync(QUICK_LOGIN_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    Object.keys(parsed).forEach((k) => {
      if (k.charAt(0) === "_") return;
      const row = parsed[k];
      if (!row || typeof row !== "object") return;
      const email = normalizeMail(row.email || "");
      if (!email || !email.includes("@")) return;
      out[String(k).toLowerCase()] = {
        email,
        name: String(row.name || "").trim(),
      };
    });
    return out;
  } catch (e) {
    functions.logger.error("[quickLogin] lecture quick-login.json impossible", e);
    return {};
  }
}

/**
 * Map email -> profil léger (sérialisable) pour sync Collaborer ↔ Auth.
 * @returns {Promise<Map<string, {uid: string, email: string, displayName: string, customClaims: Object}>>}
 */
async function buildAuthUserByEmailMap() {
  const map = new Map();
  let nextPageToken = undefined;
  do {
    // 1000 = max autorisé par l'API Admin.
    // eslint-disable-next-line no-await-in-loop
    const page = await admin.auth().listUsers(1000, nextPageToken);
    (page.users || []).forEach((u) => {
      const email = normalizeMail(u.email || "");
      if (!email || !email.includes("@")) return;
      const rawCc = u.customClaims;
      let customClaims = {};
      if (rawCc && typeof rawCc === "object") {
        try {
          customClaims = JSON.parse(JSON.stringify(rawCc));
        } catch (_) {
          customClaims = {};
        }
      }
      map.set(email, {
        uid: String(u.uid || ""),
        email,
        displayName: String(u.displayName || "").trim(),
        customClaims,
      });
    });
    nextPageToken = page.pageToken;
  } while (nextPageToken);
  return map;
}

/**
 * Firestore côté Admin renvoie souvent 7 PERMISSION_DENIED si le compte de service
 * de la function n’a pas les rôles Datastore/Firestore sur le projet.
 * @param {unknown} e
 * @returns {functions.https.HttpsError | null}
 */
function mapFirestoreDeniedToHttps(e) {
  const msg = String((e && e.message) || e || "");
  const code = e && /** @type {{ code?: unknown }} */ (e).code;
  const isDenied =
    msg.includes("PERMISSION_DENIED") ||
    msg.toLowerCase().includes("permission-denied") ||
    code === 7 ||
    code === "7";
  if (!isDenied) {
    return null;
  }
  return new functions.https.HttpsError(
    "permission-denied",
    "Firestore refuse l’accès au compte de service de cette Cloud Function. " +
      "Console GCP → IAM → ouvrir le compte de service indiqué dans Détails de la function → " +
      "ajouter le rôle « Utilisateur Cloud Datastore » (roles/datastore.user) ou « Éditeur » sur le projet."
  );
}

/**
 * Vérifie que l’utilisateur connecté (email Auth) a un profil avec niveau >= 3.
 * @param {string} authEmail
 */
async function assertAdminByAuthEmail(authEmail) {
  const raw = String(authEmail || "").trim();
  const email = raw.toLowerCase();
  if (!email || !email.includes("@")) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "E-mail de compte requis (connexion Firebase Auth avec e-mail, pas compte anonyme)."
    );
  }
  const coll = admin.firestore().collection("demandeCollaborerLexique");
  const mailVariants = [...new Set([email, raw].filter((x) => x && x.includes("@")))];
  let doc;
  try {
    doc = await coll.doc(email).get();
    if (!doc.exists) {
      // Fiches legacy : ID ≠ mail ; champ mail parfois avec autre casse.
      const qs =
        mailVariants.length > 1
          ? await coll.where("mail", "in", mailVariants).limit(2).get()
          : await coll.where("mail", "==", email).limit(2).get();
      if (qs.empty) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Profil introuvable pour cet e-mail (doc ID ou champ mail)."
        );
      }
      if (qs.size > 1) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Plusieurs fiches demandeCollaborerLexique pour cet e-mail."
        );
      }
      doc = qs.docs[0];
    }
  } catch (e) {
    if (e instanceof functions.https.HttpsError) {
      throw e;
    }
    const mapped = mapFirestoreDeniedToHttps(e);
    if (mapped) {
      functions.logger.error("[assertAdmin] Firestore refusé", {
        err: String((e && e.message) || e),
      });
      throw mapped;
    }
    throw e;
  }
  const row = doc.data() || {};
  const n = row.niveau;
  const level = typeof n === "number" ? n : parseInt(n, 10);
  if (!Number.isFinite(level) || level < 3) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Action réservée aux administrateurs (niveau ≥ 3 dans demandeCollaborerLexique)."
    );
  }
}

/**
 * @param {FirebaseFirestore.DocumentSnapshot} snap
 */
async function sendForumNotificationEmail(snap) {
  const d = snap.data();
  if (!d || !d.targetMail) {
    return;
  }
  if (d.type && d.type !== "forum_reply") {
    return;
  }
  const cfg = getMailConfig();
  const mid = String(d.forumMessageId || "").trim();
  const base = cfg.appUrl || "https://alfamous-amha.web.app";
  const link = mid
    ? `${base}/index.html?forumMsg=${encodeURIComponent(mid)}`
    : `${base}/index.html`;
  const subjPost = String(d.subject || "—").trim() || "—";
  const replier = String(d.replierName || "Un participant").trim() || "Un participant";
  const subject = `[Alfamous — Forum] Réponse de ${replier} : ${subjPost.slice(0, 120)}`;

  const text =
    `Bonjour,\n\n` +
    `${replier} a répondu sur le forum au sujet « ${subjPost} ».\n\n` +
    `Ouvrir le message : ${link}\n\n` +
    `— Alfamous`;

  const html =
    `<p>Bonjour,</p>` +
    `<p><strong>${escapeHtml(replier)}</strong> a répondu sur le forum au sujet ` +
    `« <strong>${escapeHtml(subjPost)}</strong> ».</p>` +
    `<p><a href="${escapeHtml(link)}">Ouvrir le message dans Alfamous</a></p>` +
    `<p style="color:#64748b;font-size:12px">— Alfamous</p>`;

  const to = String(d.targetMail).toLowerCase().trim();
  try {
    const r = await sendMail({ to, subject, text, html });
    if (r.skipped) {
      functions.logger.warn("[forumAuthorNotifications] e-mail non envoyé (SMTP non configuré)", {
        to,
      });
    } else {
      functions.logger.info("[forumAuthorNotifications] e-mail envoyé", { to });
    }
  } catch (e) {
    functions.logger.error("[forumAuthorNotifications] erreur envoi", {
      to,
      error: e && e.message,
    });
  }
}

exports.onForumAuthorNotificationEmail = functions
  .region(REGION)
  .firestore.document("forumAuthorNotifications/{notifId}")
  .onCreate(async (snap) => {
    await sendForumNotificationEmail(snap);
  });

/**
 * @param {FirebaseFirestore.DocumentSnapshot} snap
 */
async function sendContactMessageNotificationEmail(snap) {
  const d = snap.data() || {};
  const cfg = getMailConfig();
  const to = String(cfg.contactNotifyTo || cfg.user || "")
    .toLowerCase()
    .trim();
  if (!to || !to.includes("@")) {
    functions.logger.warn(
      "[messagesContact] e-mail alerte ignorée : définir email.contact_to ou smtp.user"
    );
    return;
  }
  const nom = String(d.nom || "—").trim() || "—";
  const replyMail = String(d.mail || "—").trim() || "—";
  const commentaire = String(d.commentaire || "").trim() || "—";
  const docId = snap.id;
  const base = cfg.appUrl || "https://alfamous-amha.web.app";
  const linkContact = `${base}/index.html`;
  const subject = `[Alfamous — Contact] ${nom.slice(0, 100)}`;

  const text =
    `Nouveau message via le formulaire Contact.\n\n` +
    `Nom : ${nom}\n` +
    `E-mail (réponse) : ${replyMail}\n\n` +
    `Message :\n${commentaire}\n\n` +
    `— Firestore : messagesContact/${docId}\n` +
    `Ouvrir l’app : ${linkContact}\n`;

  const html =
    `<p>Nouveau message via le formulaire <strong>Contact</strong>.</p>` +
    `<p><strong>Nom :</strong> ${escapeHtml(nom)}<br/>` +
    `<strong>E-mail (réponse) :</strong> ` +
    `<a href="mailto:${encodeURIComponent(replyMail)}">${escapeHtml(replyMail)}</a></p>` +
    `<p><strong>Message :</strong></p>` +
    `<pre style="white-space:pre-wrap;font-family:inherit;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0">` +
    `${escapeHtml(commentaire)}</pre>` +
    `<p style="font-size:13px;color:#64748b">Doc <code>messagesContact/${escapeHtml(docId)}</code> · ` +
    `<a href="${escapeHtml(linkContact)}">Ouvrir Alfamous</a></p>`;

  try {
    const r = await sendMail({ to, subject, text, html });
    if (r.skipped) {
      functions.logger.warn("[messagesContact] e-mail non envoyé (SMTP non configuré)", {
        to,
      });
    } else {
      functions.logger.info("[messagesContact] e-mail alerte envoyé", { to });
    }
  } catch (e) {
    functions.logger.error("[messagesContact] erreur envoi alerte", {
      to,
      error: e && e.message,
    });
  }
}

exports.onContactMessageEmail = functions
  .region(REGION)
  .firestore.document("messagesContact/{msgId}")
  .onCreate(async (snap) => {
    await sendContactMessageNotificationEmail(snap);
  });

exports.sendEmailToSubscribers = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Connexion requise (Firebase Auth)."
    );
  }
  const tokenEmail = context.auth.token.email;
  await assertAdminByAuthEmail(tokenEmail);

  const subject = String((data && data.subject) || "").trim();
  const text = String((data && data.text) || "").trim();
  const html =
    data && data.html != null && String(data.html).trim()
      ? String(data.html)
      : undefined;
  const testTo =
    data && data.testRecipientEmail
      ? String(data.testRecipientEmail).toLowerCase().trim()
      : "";

  if (!subject || !text) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Champs obligatoires : subject, text"
    );
  }

  if (!isSmtpConfigured()) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "SMTP non configuré côté Functions (voir functions/mail.js)."
    );
  }

  const wrapHtml =
    html ||
    `<p>${escapeHtml(text).replace(/\n/g, "<br/>")}</p>` +
      `<p style="margin-top:1.5rem;color:#64748b;font-size:12px">— Alfamous</p>`;

  /** @type {string[]} */
  let recipients = [];

  if (testTo) {
    if (!testTo.includes("@")) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "testRecipientEmail invalide"
      );
    }
    recipients = [testTo];
  } else {
    const snap = await admin
      .firestore()
      .collection("demandeCollaborerLexique")
      .get();
    const set = new Set();
    snap.forEach((doc) => {
      const row = doc.data() || {};
      const m = String(row.mail || doc.id || "")
        .toLowerCase()
        .trim();
      if (m.includes("@")) {
        set.add(m);
      }
    });
    recipients = Array.from(set);
  }

  const delayMs = 120;
  let sent = 0;
  let failed = 0;
  const failures = [];

  for (const to of recipients) {
    try {
      const r = await sendMail({
        to,
        subject,
        text,
        html: wrapHtml,
      });
      if (r.ok) {
        sent++;
      } else {
        failed++;
        failures.push({ to, reason: "skipped" });
      }
    } catch (e) {
      failed++;
      failures.push({ to, reason: (e && e.message) || "error" });
      functions.logger.warn("[sendEmailToSubscribers] échec", {
        to,
        err: e && e.message,
      });
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return callableResultSummary({
    ok: true,
    mode: testTo ? "test" : "broadcast",
    recipientCount: recipients.length,
    sent,
    failed,
    failures,
  });
});

exports.getQuickLoginMap = functions
  .region(REGION)
  .https.onCall(async () => ({ map: readQuickLoginMapSafe() }));

exports.syncAuthFromDemandeCollaborerLexique = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Connexion requise (Firebase Auth)."
      );
    }
    const tokenEmail = context.auth.token.email;
    try {
    await assertAdminByAuthEmail(tokenEmail);

    const dryRun = !data || data.dryRun !== false;
    const createMissing = !!(data && data.createMissing);
    const updateDisplayName = !data || data.updateDisplayName !== false;
    const disableOrphans = !!(data && data.disableOrphans);
    // Par défaut : Collaborer = source de vérité ; ne pas réécraser le nom Firestore depuis Auth.
    const updateFirestoreFromAuth = !!(data && data.updateFirestoreFromAuth);
    const createMissingFirestore = !!(data && data.createMissingFirestore);
    const syncNiveauClaims = !data || data.syncNiveauClaims !== false;

    let snap;
    try {
      snap = await admin.firestore().collection("demandeCollaborerLexique").get();
    } catch (e) {
      const mapped = mapFirestoreDeniedToHttps(e);
      if (mapped) {
        functions.logger.error("[syncAuth] lecture demandeCollaborerLexique refusée", e);
        throw mapped;
      }
      throw e;
    }
    /** @type {Map<string, {name:string, niveau:number|null}>} */
    const wantedByMail = new Map();
    snap.forEach((doc) => {
      const row = doc.data() || {};
      const email = normalizeMail(row.mail || doc.id || "");
      if (!email || !email.includes("@")) return;
      wantedByMail.set(email, {
        name: collaborerDisplayNameFromRow(row),
        niveau: collaborerNiveauFromRow(row),
      });
    });

    const authByMail = await buildAuthUserByEmailMap();

    const created = [];
    const updated = [];
    const claimsUpdated = [];
    const disabled = [];
    const missing = [];
    const orphans = [];
    const firestoreUpdated = [];
    const firestoreCreated = [];
    const errors = [];
    /** @type {Array<{email:string, displayName?:{auth:string, collaborer:string}, niveau?:{auth:number|null, collaborer:number}}>} */
    const driftPreview = [];

    for (const [email, wanted] of wantedByMail.entries()) {
      const u = authByMail.get(email);
      if (!u) {
        missing.push(email);
        if (createMissing) {
          if (!dryRun) {
            try {
              const randomPwd = crypto.randomBytes(18).toString("base64url");
              // Crée un compte email+password "provisionné" sans exposer de mot de passe connu.
              // L'utilisateur pourra utiliser "mot de passe oublié" pour définir son secret.
              // eslint-disable-next-line no-await-in-loop
              const createdRec = await admin.auth().createUser({
                email,
                password: randomPwd,
                displayName: String(wanted.name || "").trim() || undefined,
                emailVerified: false,
              });
              if (syncNiveauClaims && Number.isFinite(wanted.niveau)) {
                // eslint-disable-next-line no-await-in-loop
                await admin.auth().setCustomUserClaims(
                  createdRec.uid,
                  mergeCustomClaimsWithNiveau({}, wanted.niveau)
                );
                claimsUpdated.push(email);
              }
            } catch (e) {
              errors.push({ email, op: "createUser", reason: String((e && e.message) || e) });
              continue;
            }
          } else if (syncNiveauClaims && Number.isFinite(wanted.niveau)) {
            claimsUpdated.push(email);
          }
          created.push(email);
        }
        continue;
      }

      if (updateDisplayName) {
        const targetRaw = String(wanted.name || "").trim();
        const curRaw = String(u.displayName || "").trim();
        const needDn = normalizeLexiqueName(targetRaw) !== normalizeLexiqueName(curRaw);
        if (needDn) {
          if (dryRun) {
            updated.push(email);
          } else {
            try {
              // eslint-disable-next-line no-await-in-loop
              await admin.auth().updateUser(u.uid, {
                displayName: targetRaw === "" ? null : targetRaw,
              });
              updated.push(email);
            } catch (e) {
              errors.push({ email, op: "updateUser.displayName", reason: String((e && e.message) || e) });
            }
          }
          if (dryRun && driftPreview.length < 40) {
            driftPreview.push({
              email,
              displayName: { auth: curRaw, collaborer: targetRaw },
            });
          }
        }
      }

      if (syncNiveauClaims && Number.isFinite(wanted.niveau)) {
        const wantN = Math.trunc(wanted.niveau);
        const curRawClaim = u.customClaims && u.customClaims.niveau;
        const curN =
          typeof curRawClaim === "number" && Number.isFinite(curRawClaim)
            ? Math.trunc(curRawClaim)
            : parseInt(String(curRawClaim), 10);
        const hasCur = Number.isFinite(curN);
        if (!hasCur || curN !== wantN) {
          if (dryRun) {
            claimsUpdated.push(email);
          } else {
            try {
              const nextClaims = mergeCustomClaimsWithNiveau(u.customClaims, wantN);
              // eslint-disable-next-line no-await-in-loop
              await admin.auth().setCustomUserClaims(u.uid, nextClaims);
              claimsUpdated.push(email);
            } catch (e) {
              errors.push({
                email,
                op: "setCustomUserClaims.niveau",
                reason: String((e && e.message) || e),
              });
            }
          }
          if (dryRun && driftPreview.length < 40) {
            const existing = driftPreview.find((x) => x.email === email);
            const niveauDrift = { auth: hasCur ? curN : null, collaborer: wantN };
            if (existing) {
              existing.niveau = niveauDrift;
            } else {
              driftPreview.push({ email, niveau: niveauDrift });
            }
          }
        }
      }
    }

    for (const [email, u] of authByMail.entries()) {
      if (wantedByMail.has(email)) continue;
      orphans.push(email);
      if (!disableOrphans) continue;
      if (!dryRun) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await admin.auth().updateUser(u.uid, { disabled: true });
        } catch (e) {
          errors.push({ email, op: "updateUser.disabled", reason: String((e && e.message) || e) });
          continue;
        }
      }
      disabled.push(email);
    }

    // Après MAJ Auth (displayName / claims), recharger les users pour ne pas réécraser Collaborer
    // avec des displayName obsolètes encore en mémoire.
    let authForFsSync = authByMail;
    if (updateFirestoreFromAuth) {
      // eslint-disable-next-line no-await-in-loop
      authForFsSync = await buildAuthUserByEmailMap();
    }

    if (updateFirestoreFromAuth) {
      for (const [email, u] of authForFsSync.entries()) {
        const authName = String(u.displayName || "").trim();
        const docRef = admin.firestore().collection("demandeCollaborerLexique").doc(email);
        const wanted = wantedByMail.get(email);

        if (!wanted) {
          if (!createMissingFirestore) continue;
          if (!dryRun) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await docRef.set({
                mail: email,
                name: authName || email.split("@")[0],
                niveau: 0,
                niveauDemande: 0,
                syncedFromAuthAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              }, { merge: true });
            } catch (e) {
              errors.push({ email, op: "firestore.set.missing", reason: String((e && e.message) || e) });
              continue;
            }
          }
          firestoreCreated.push(email);
          continue;
        }

        const fsName = String(wanted.name || "").trim();
        if (
          !authName ||
          normalizeLexiqueName(authName) === normalizeLexiqueName(fsName)
        ) {
          continue;
        }

        if (!dryRun) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await docRef.set({
              name: authName,
              mail: email,
              syncedFromAuthAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          } catch (e) {
            errors.push({ email, op: "firestore.update.fromAuth", reason: String((e && e.message) || e) });
            continue;
          }
        }
        firestoreUpdated.push(email);
      }
    }

    const payload = {
      ok: errors.length === 0,
      dryRun,
      options: {
        createMissing,
        updateDisplayName,
        disableOrphans,
        updateFirestoreFromAuth,
        createMissingFirestore,
        syncNiveauClaims,
      },
      stats: {
        firestoreCount: wantedByMail.size,
        authCount: authByMail.size,
        missingInAuth: missing.length,
        orphanInAuth: orphans.length,
        created: created.length,
        updated: updated.length,
        claimsUpdated: claimsUpdated.length,
        disabled: disabled.length,
        firestoreUpdatedFromAuth: firestoreUpdated.length,
        firestoreCreatedFromAuth: firestoreCreated.length,
        errors: errors.length,
      },
      preview: {
        created: created.slice(0, 100),
        updated: updated.slice(0, 100),
        claimsUpdated: claimsUpdated.slice(0, 100),
        disabled: disabled.slice(0, 100),
        firestoreUpdated: firestoreUpdated.slice(0, 100),
        firestoreCreated: firestoreCreated.slice(0, 100),
        missing: missing.slice(0, 100),
        orphans: orphans.slice(0, 100),
        errors: errors.slice(0, 50),
        drift: driftPreview.slice(0, 40),
      },
    };
    try {
      JSON.stringify(payload);
    } catch (encErr) {
      functions.logger.error("[syncAuth] payload non JSON", encErr);
      throw new functions.https.HttpsError(
        "internal",
        "Réponse sync illisible (encodage)."
      );
    }
    return payload;
    } catch (e) {
      functions.logger.error("[syncAuthFromDemandeCollaborerLexique]", e);
      if (e instanceof functions.https.HttpsError) {
        throw e;
      }
      const msg = String((e && e.message) || e || "erreur").slice(0, 480);
      throw new functions.https.HttpsError("internal", msg);
    }
  });

exports.newsletterUnsubscribe = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    try {
      const email = normalizeMail(req.query.e || "");
      const exp = parseInt(String(req.query.x || "0"), 10);
      const sig = String(req.query.sig || "");

      if (!email || !email.includes("@") || !exp || !sig) {
        res.status(400).send("Lien de désabonnement invalide.");
        return;
      }
      const nowSec = Math.floor(Date.now() / 1000);
      if (exp < nowSec) {
        res.status(410).send("Ce lien de désabonnement a expiré.");
        return;
      }
      const expected = signNewsletterToken(email, exp);
      if (expected !== sig) {
        res.status(403).send("Signature invalide.");
        return;
      }

      await admin.firestore().collection("newsletterSubscribers").doc(email).set({
        email,
        status: "inactive",
        unsubscribedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      res
        .status(200)
        .set("Content-Type", "text/html; charset=utf-8")
        .send(
          "<html><body style='font-family:Arial,sans-serif;padding:24px;'>" +
          "<h2>Désabonnement confirmé</h2>" +
          "<p>Votre statut newsletter est maintenant désactivé.</p>" +
          "<p style='color:#64748b'>Alfamous</p>" +
          "</body></html>"
        );
    } catch (e) {
      functions.logger.error("[newsletterUnsubscribe] erreur", e);
      res.status(500).send("Erreur serveur.");
    }
  });

exports.sendQueuedNewsletterCampaign = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onCall(async (data, context) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Connexion requise (Firebase Auth)."
        );
      }
      const tokenEmail = context.auth.token.email;
      await assertAdminByAuthEmail(tokenEmail);

      if (!isSmtpConfigured()) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "SMTP non configuré côté Functions."
        );
      }

      const campaignId = String((data && data.campaignId) || "").trim();
      if (!campaignId) {
        throw new functions.https.HttpsError("invalid-argument", "campaignId requis.");
      }
      const testTo = String((data && data.testRecipientEmail) || "").toLowerCase().trim();

      const campaignRef = admin.firestore().collection("newsletterCampaigns").doc(campaignId);
      const snap = await campaignRef.get();
      if (!snap.exists) {
        throw new functions.https.HttpsError("not-found", "Campagne introuvable.");
      }
      const c = snap.data() || {};
      const subject = String(c.subject || "").trim();
      if (!subject) {
        throw new functions.https.HttpsError("invalid-argument", "Objet de campagne manquant.");
      }

      let recipients = [];
      if (testTo) {
        recipients = [{ email: testTo, name: "", subscriberDocId: "" }];
      } else {
        const rawFilter = c.recipientEmails;
        const hasEmailFilter = Array.isArray(rawFilter) && rawFilter.length > 0;
        const allow = new Set();
        if (hasEmailFilter) {
          rawFilter.forEach((e) => {
            const m = normalizeMail(e);
            if (m) allow.add(m);
          });
        }
        const rs = await admin.firestore()
          .collection("newsletterSubscribers")
          .where("status", "==", "active")
          .get();
        rs.forEach((d) => {
          const row = d.data() || {};
          const m = normalizeMail(row.email || d.id || "");
          if (!m || !m.includes("@")) return;
          if (hasEmailFilter && !allow.has(m)) return;
          if (subscriberAlreadyGotCampaign(row, campaignId)) return;
          recipients.push({
            email: m,
            name: String(row.name || "").trim(),
            subscriberDocId: d.id,
          });
        });
      }

      let sent = 0;
      let failed = 0;
      const failures = [];
      for (const r of recipients) {
        try {
          const html = renderNewsletterHtml(c, r.email, r.name);
          const text = renderNewsletterText(c, r.email, r.name);
          const out = await sendMail({
            to: r.email,
            subject,
            text,
            html,
          });
          if (out.ok) {
            sent++;
            if (!testTo && r.subscriberDocId) {
              try {
                await admin
                  .firestore()
                  .collection("newsletterSubscribers")
                  .doc(r.subscriberDocId)
                  .set(
                    {
                      newsletterSentCampaignIds: admin.firestore.FieldValue.arrayUnion(campaignId),
                      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                  );
              } catch (markErr) {
                functions.logger.error(
                  "[sendQueuedNewsletterCampaign] marquage message envoyé échoué",
                  { email: r.email, err: markErr && markErr.message }
                );
                sent--;
                failed++;
                failures.push({ to: r.email, reason: "mark-sent-failed" });
              }
            }
          } else {
            failed++;
            failures.push({ to: r.email, reason: "skipped" });
          }
        } catch (e) {
          failed++;
          failures.push({ to: r.email, reason: (e && e.message) || "error" });
        }
        await new Promise((r2) => setTimeout(r2, 120));
      }

      await campaignRef.set({
        status: testTo ? "tested" : "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        sentCount: sent,
        failedCount: failed,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSenderEmail: normalizeMail(tokenEmail),
      }, { merge: true });

      return callableResultSummary({
        ok: true,
        mode: testTo ? "test" : "broadcast",
        recipientCount: recipients.length,
        sent,
        failed,
        failures,
      });
    } catch (e) {
      functions.logger.error("[sendQueuedNewsletterCampaign] erreur", e);
      if (e instanceof functions.https.HttpsError) {
        throw e;
      }
      const raw = e && e.message ? String(e.message) : String(e);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Newsletter (serveur): ${raw}`.slice(0, 500)
      );
    }
  });

/**
 * Callable : MP3 du champ Texte (Google Cloud TTS) → Firebase Storage MesMedias/audio/MesNotesTts/{uid}/…
 * Données : { text, subject, langKey?, phase? } — phase « probe » = lecture Storage seule (pas de TTS).
 */
exports.synthesizeMesNoteAudio = functions
  .region(REGION)
  .runWith({
    timeoutSeconds: 120,
    memory: "512MB",
    serviceAccount: MES_NOTE_TTS_RUNTIME_SA,
  })
  .https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Connexion requise."
      );
    }
    const payload =
      data != null && typeof data === "object" && !Array.isArray(data)
        ? data
        : {};
    const text = String(
      payload.text != null ? payload.text : payload.body || ""
    ).trim();
    const subject = String(payload.subject != null ? payload.subject : "").trim();
    let langKey = String(payload.langKey || "fr")
      .toLowerCase()
      .trim();
    if (!/^(fr|en|ar|es|kab)$/.test(langKey)) {
      langKey = "fr";
    }
    functions.logger.info("[synthesizeMesNoteAudio] appel", {
      uid: context.auth.uid,
      textLen: text.length,
      subjectLen: subject.length,
      langKey,
      payloadKeys: Object.keys(payload),
    });
    if (!text) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Texte vide."
      );
    }
    if (!subject) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Sujet (titre) requis pour nommer le fichier audio."
      );
    }
    if (subject.length > 400) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Sujet trop long (max 400 caractères)."
      );
    }
    if (text.length > MES_NOTE_TTS_MAX_CHARS) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Texte trop long (max ${MES_NOTE_TTS_MAX_CHARS} caractères pour la synthèse).`
      );
    }
    const phase = String(payload.phase || "").trim().toLowerCase();
    if (phase === "probe") {
      try {
        const r = await probeMesNoteAudioUnchanged(
          admin,
          context.auth.uid,
          text,
          langKey,
          subject
        );
        return {
          probe: true,
          unchanged: r.unchanged,
          storagePath: r.storagePath,
          bucket: r.bucket,
          languageCode: r.languageCode,
          downloadURL: null,
        };
      } catch (e) {
        const msg = e && e.message ? String(e.message) : "";
        functions.logger.warn("[synthesizeMesNoteAudio] probe échec", {
          uid: context.auth.uid,
          err: msg,
        });
        if (e && e.code === "EMPTY") {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Texte vide."
          );
        }
        if (e && e.code === "EMPTY_SUBJECT") {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Sujet (titre) requis pour nommer le fichier audio."
          );
        }
        throw new functions.https.HttpsError(
          "failed-precondition",
          msg ? msg.slice(0, 400) : "Vérification Storage indisponible."
        );
      }
    }
    try {
      const r = await synthesizeMesNoteAudioImpl(
        admin,
        context.auth.uid,
        text,
        langKey,
        subject
      );
      return r;
    } catch (e) {
      const msg = e && e.message ? String(e.message) : "";
      functions.logger.warn("[synthesizeMesNoteAudio] échec", {
        uid: context.auth.uid,
        err: msg,
        stack: e && e.stack ? String(e.stack).slice(0, 800) : "",
      });
      if (e && e.code === "EMPTY") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Texte vide."
        );
      }
      if (e && e.code === "EMPTY_SUBJECT") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Sujet (titre) requis pour nommer le fichier audio."
        );
      }
      const apiHint =
        msg.indexOf("PERMISSION_DENIED") !== -1 ||
        msg.indexOf("Cloud Text-to-Speech API") !== -1 ||
        msg.indexOf("has not been used") !== -1;
      /** Ne pas matcher la sous-chaîne « storage » seule (trop large — masquait la vraie erreur). */
      const storageHint =
        /storage\.googleapis|storage\.objects|Permission.*bucket|does not have.*storage|Bucket not found|403|SignBlob|signBlob|Unable to (insert|upload)|Could not (verify|load)/i.test(
          msg
        );
      const detail = msg ? String(msg).slice(0, 520) : "";
      let clientMsg =
        detail ||
        "Synthèse vocale ou enregistrement audio indisponible.";
      if (apiHint && detail) {
        clientMsg =
          "Vérifiez l’API « Cloud Text-to-Speech » sur le projet GCP.\n\n" +
          detail;
      } else if (storageHint && detail) {
        clientMsg =
          "Problème d’accès au bucket Cloud Storage. Dans Google Cloud → IAM, le compte d’exécution des Cloud Functions (souvent …-compute@developer.gserviceaccount.com ou le SA App Engine) doit pouvoir créer des objets sur le bucket Storage du projet (ex. rôle « Storage Object Admin » sur le bucket ou sur le projet).\n\n" +
          detail;
      }
      throw new functions.https.HttpsError(
        "failed-precondition",
        clientMsg
      );
    }
  });

/**
 * Callable : transcription d’un média distant (URL audio directe) vers texte.
 * Données : { mediaUrl, langKey? }.
 */
exports.transcribeMesNoteMediaUrl = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 120, memory: "1GB" })
  .https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Connexion requise."
      );
    }
    const payload =
      data != null && typeof data === "object" && !Array.isArray(data)
        ? data
        : {};
    const mediaUrl = String(payload.mediaUrl || "").trim();
    let langKey = String(payload.langKey || "fr").toLowerCase().trim();
    if (!/^(fr|en|ar|es|kab)$/.test(langKey)) langKey = "fr";
    if (!mediaUrl) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "URL média manquante."
      );
    }
    try {
      const r = await transcribeFromMediaUrlImpl(mediaUrl, langKey);
      return r;
    } catch (e) {
      const code = e && e.code ? String(e.code) : "";
      const msg = e && e.message ? String(e.message) : String(e || "");
      if (code === "INVALID_URL") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "URL invalide. Utilisez un lien direct vers un fichier audio."
        );
      }
      if (code === "UNSUPPORTED_MEDIA") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Format non supporté pour la transcription. Utilisez un lien audio direct (mp3/wav/flac/ogg/webm)."
        );
      }
      if (code === "MEDIA_TOO_LARGE") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Fichier trop volumineux (max 25 Mo)."
        );
      }
      if (code === "EMPTY_MEDIA") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Le média est vide."
        );
      }
      if (code === "MEDIA_FETCH") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Impossible de télécharger ce média (URL inaccessible)."
        );
      }
      throw new functions.https.HttpsError(
        "failed-precondition",
        msg.slice(0, 450) || "Transcription indisponible."
      );
    }
  });
