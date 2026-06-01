// Copie en TEXTE le contenu d'un conteneur modal quelconque.
// - contenuId: l'id du conteneur (ex: "contenuTexte2", "contenuTexte3")
// - zoneMsg (optionnel): 1..3 pour choisir la zone d'affichage des messages.
//   Si omis, on essaie d'inférer depuis le nombre dans l'id (ex: "contenuTexte2" -> 2).
function copierContenuModal(contenuId, zoneMsg) {
  //pour afficherSynonymesDansModal contenuTexte3
  //pour afficherDefRacines contenuTexte2
  // pour afficherPageMulti / Lexique (#popupResultats) — gabarit zcPreparePopupResultatsShell (mots-coran.js)
  try {
    const el = document.getElementById(contenuId);
    // Déterminer la zone: param > déduction depuis l'id > défaut 1
    let zone = (typeof zoneMsg === 'number') ? zoneMsg : 1;
    const m = String(contenuId || '').match(/\d+/);
    if (!zoneMsg && m) zone = parseInt(m[0], 10) || zone;

    // Helpers de message
    const okMsg = (txt) => {
      if (typeof alertMsgBoxTemp === 'function') alertMsgBoxTemp(txt, 'green');
      else if (typeof afficherMessageVerset === 'function') afficherMessageVerset(zone, txt);
    };
    const errMsg = (txt) => {
      if (typeof alertMsgBoxTemp === 'function') alertMsgBoxTemp(txt, 'red');
      else if (typeof afficherMessageVerset === 'function') afficherMessageVerset(zone, txt);
    };

    if (!el) { errMsg('❌ Fenêtre introuvable.'); return; }

    const texte = el.innerText || el.textContent || '';
    if (!texte.trim()) { errMsg('❌ Rien à copier.'); return; }

    // Chemin moderne
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(texte)
        .then(() => okMsg('✅ Contenu copié dans le presse-papiers !'))
        .catch(() => errMsg('❌ Échec de la copie.'));
      return;
    }

    // Fallback (execCommand)
    try {
      const ta = document.createElement('textarea');
      ta.value = texte;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? okMsg('✅ Contenu copié dans le presse-papiers !')
        : errMsg('❌ Échec de la copie.');
    } catch {
      errMsg('❌ La fonction de copie n’est pas supportée.');
    }
  } catch (e) {
    console.error('copierContenuModal() — erreur:', e);
  }
}


/* ===================== Commentaires & popup commentaire ===================== */
let modeCommentaire = "modifier";
let inputOriginal = "";
/** True après clic explicite sur "Ajouter" ou effacement manuel du texte. */
let commentaireAjouterForce = false;
/** Texte de référence (mode « modifier ») après chargement depuis les tables — Enregistrer seulement si différent. */
let commentaireModifierBaseline = "";
/** Brouillon partagé onglets « Ajouter » et « Forum » (clone) ; inchangé en Modifier pour pouvoir restaurer au retour. */
let commentaireAddForumDraft = "";
/** Bloc signature (@utilisateur + date + tirets) figé à l’entrée en « Modifier » — évite que la date bouge à chaque rafraîchissement. */
let commentaireModifierSignatureSnap = "";
/** Ignore une seule confirmation de perte après changement explicite du sujet (input). */
let commentaireSkipNextDiscardConfirm = false;
/** État initial de la popup pour détecter les modifications non enregistrées à la fermeture. */
let commentaireCloseBaseline = { sujet: "", texte: "" };
/** Fil forum résolu depuis la référence courante (Mes Commentaires). */
let commentaireResolvedTopicId = "";
let commentaireResolvedReplyCount = 0;
let commentaireReplyLookupTimer = null;
let commentaireLastReplyLookupSig = "";

function showCommentPopupTempMsg(text, color) {
  const t = String(text || "").trim();
  if (!t) return;
  try {
    if (typeof alertMsgBoxTemp === "function") {
      alertMsgBoxTemp(t, color || "gray", 2600);
      return;
    }
  } catch (_) { }
  const box = document.getElementById("msgDivCommentaire");
  if (!box) return;
  box.textContent = t;
  box.style.color = color || "#334155";
  window.setTimeout(function () {
    if (box.textContent === t) box.textContent = "";
  }, 2600);
}

function normalizeCommentForCompare(s) {
  return nettoyerCommentairePourChampTexte(String(s || ""))
    .replace(/\s+/g, " ")
    .trim();
}

function nettoyerCommentairePourChampTexte(texte) {
  if (typeof texte !== 'string') texte = String(texte || '');

  return texte
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&lt;br\s*\/?&gt;/gi, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[\u00A0\u200C\u200F\u202F]/g, ' ')
    .trim();
}
/** Même logique que enregistrer.js (HTML → texte pour la zone de saisie). */
function buildLexiqueSignaturePlain() {
  let who = "anonyme";
  try {
    if (typeof nameUser !== "undefined" && nameUser != null && String(nameUser).trim() !== "") {
      who = String(nameUser).trim();
    } else if (typeof localStorage !== "undefined") {
      who = (localStorage.getItem("nameUser") || "anonyme").trim();
    }
  } catch (_) { }
  const dateModif = new Date().toLocaleString();
  return ` @${who} - ${dateModif}\n-----------`;
}

function normSignatureAuthor(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Ligne @auteur - date ; le nom peut contenir des espaces. */
function parseSignatureAtLine(line) {
  const s = String(line || "").trim();
  if (!s.startsWith("@")) return null;
  const rest = s.slice(1).trim();
  const idx = rest.lastIndexOf(" - ");
  if (idx < 0) return null;
  const author = rest.slice(0, idx).trim();
  const dateStr = rest.slice(idx + 3).trim();
  if (!author || !dateStr) return null;
  return { author, dateStr };
}

function parseSignatureDateForSort(dateStr) {
  const s = String(dateStr || "").trim();
  const t = Date.parse(s);
  if (!isNaN(t)) return t;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  if (m) {
    return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime();
  }
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (m2) {
    return new Date(+m2[1], +m2[2] - 1, +m2[3], +m2[4], +m2[5], +m2[6]).getTime();
  }
  return 0;
}

function isSignatureDashLine(line) {
  const t = String(line || "").trim();
  return t.length >= 3 && /^[-‐‑–—·]+$/.test(t);
}

/**
 * En fin de texte uniquement : si plusieurs blocs signature (@auteur - date + ligne tirets)
 * se suivent pour le même auteur, ne garde que le bloc à la date la plus récente.
 */
function dedupeTrailingSameAuthorSignatures(text) {
  const raw = String(text || "");
  const lines = raw.split(/\r?\n/);
  let i = lines.length - 1;
  const blocks = [];
  while (true) {
    while (i >= 0 && lines[i].trim() === "") i--;
    if (i < 1) break;
    if (!isSignatureDashLine(lines[i])) break;
    const parsed = parseSignatureAtLine(lines[i - 1]);
    if (!parsed) break;
    blocks.unshift({ ...parsed, at: i - 1, dash: i });
    i -= 2;
  }
  if (blocks.length < 2) return raw;

  const lastKey = normSignatureAuthor(blocks[blocks.length - 1].author);
  let start = blocks.length - 1;
  while (start > 0 && normSignatureAuthor(blocks[start - 1].author) === lastKey) start--;
  const run = blocks.slice(start);
  if (run.length < 2) return raw;

  let best = run[0];
  let bestT = parseSignatureDateForSort(best.dateStr);
  for (let k = 1; k < run.length; k++) {
    const tk = parseSignatureDateForSort(run[k].dateStr);
    if (tk >= bestT) {
      best = run[k];
      bestT = tk;
    }
  }

  const head = lines.slice(0, blocks[0].at);
  const beforeRun = [];
  for (let k = 0; k < start; k++) {
    beforeRun.push(lines[blocks[k].at], lines[blocks[k].dash]);
  }
  const afterRun = lines.slice(blocks[blocks.length - 1].dash + 1);
  return [...head, ...beforeRun, lines[best.at], lines[best.dash], ...afterRun].join("\n");
}

window.dedupeTrailingSameAuthorSignatures = dedupeTrailingSameAuthorSignatures;

function mergeModifierCommentBody(ref, draft) {
  const input = String(ref || "").trim();
  const raw = recupererCommentaire(input);
  const dbClean = nettoyerCommentairePourChampTexte(String(raw || "").trim().replace(/\n/g, "<br>"));
  const d = String(draft || "").trim();
  const sig = (commentaireModifierSignatureSnap && String(commentaireModifierSignatureSnap).trim())
    ? String(commentaireModifierSignatureSnap).trim()
    : buildLexiqueSignaturePlain();

  const parts = [];
  if (d) parts.push(d);
  parts.push(sig);
  if (dbClean.trim()) parts.push(dbClean.trim());
  return dedupeTrailingSameAuthorSignatures(parts.join("\n\n"));
}

function nettoyerCommentairePourHtml(texte) {
  if (typeof texte !== 'string') texte = String(texte || '');

  return texte
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
    .replace(/\r\n/g, '<br>')
    .replace(/\\n/g, '<br>')
    .replace(/\n/g, '<br>')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[\u00A0\u200C\u200F\u202F]/g, ' ')
    .trim();
}

/** Libellés popup commentaire / forum (alignés sur uiLang). */
const COMMENT_POPUP_I18N = {
  fr: {
    dialogTitle: "Notes sur le Lexique, Coran et le Forum",
    actionsRailTitle: "Actions",
    labelSubject: "Référence",
    labelComment: "Texte",
    phSubject: "Verset (ex. 2.255), racine, mot…",
    phComment: "Votre commentaire...",
    tabAjouter: "Ajouter",
    tabModifier: "Modifier",
    tabSupprimer: "Supprimer",
    tabForum: "Forum",
    tabNotesForum: "Notes",
    tabNotesForumTitle: "Notes personnelles sur le forum (même accès que l’onglet Forum)",
    notesForumIconTitle: "Ajouter ou modifier une note privée ou publique",
    btnAjouter: "Enregistrer",
    btnAjouterLexique: "Ajouter un commentaire au lexique",
    btnAjouterVerset: "Ajouter un commentaire au verset",
    btnModifier: "Enregistrer les changements",
    btnSupprimer: "Confirmer la suppression",
    btnForum: "Envoyer au forum",
    copy: "Copier le texte",
    close: "Fermer",
    clearSubject: "Effacer la référence",
    clearComment: "Effacer le texte",
    translit: "Translitérer",
    copied: "Commentaire copié",
    btnConnectToSend: "Connectez-vous pour envoyer un commentaire",
    btnNeedLevelPrefix: "Niveau",
    btnNeedLevelSuffix: "requis pour cette action",
    tabNeedConnect: "Connexion requise",
    tabNeedLevel: "Niveau %n requis",
    btnDeleteVerseForbidden: "Impossible de supprimer l'entrée d'un verset",
    helpTitle: "Aide : droits de contribution",
    tabHelp: "Aide",
    helpBtnTitle: "Voir les règles d'accès",
    helpConnected: "Connecté",
    helpNotConnected: "Non connecté",
    helpCurrentStatus: "Statut actuel",
    helpVision: "Cette boîte est le cœur collaboratif : commentaires sur versets/lexique, messages forum, et onglet Notes pour rédiger une note personnelle publiée sur le forum.",
    helpRule0: "Niveau 0 : onglets Forum et Notes (connexion requise)",
    helpRule1: "Niveau 1 : Forum + Ajouter",
    helpRule2: "Niveau 2 : Forum + Ajouter + Modifier",
    helpRule3: "Niveau 3 : Forum + Ajouter + Modifier + Supprimer"
  },
  en: {
    dialogTitle: "Notes on Lexicon, Quran and Forum",
    actionsRailTitle: "Actions",
    labelSubject: "Reference",
    labelComment: "Text",
    phSubject: "Verse (e.g. 2.255), root, word…",
    phComment: "Your comment...",
    tabAjouter: "Add",
    tabModifier: "Edit",
    tabSupprimer: "Delete",
    tabForum: "Forum",
    tabNotesForum: "Notes",
    tabNotesForumTitle: "Personal notes on the forum (same access as the Forum tab)",
    notesForumIconTitle: "Add or modify a private or public note",
    btnAjouter: "Save",
    btnAjouterLexique: "Add comment to lexicon",
    btnAjouterVerset: "Add comment to verse",
    btnModifier: "Save changes",
    btnSupprimer: "Confirm deletion",
    btnForum: "Send to forum",
    copy: "Copy text",
    close: "Close",
    clearSubject: "Clear reference",
    clearComment: "Clear text",
    translit: "Transliterate",
    copied: "Text copied",
    btnConnectToSend: "Sign in to send a comment",
    btnNeedLevelPrefix: "Level",
    btnNeedLevelSuffix: "required for this action",
    tabNeedConnect: "Sign in required",
    tabNeedLevel: "Level %n required",
    btnDeleteVerseForbidden: "Cannot delete a verse entry",
    helpTitle: "Help: contribution permissions",
    tabHelp: "Help",
    helpBtnTitle: "Show access rules",
    helpConnected: "Signed in",
    helpNotConnected: "Not signed in",
    helpCurrentStatus: "Current status",
    helpVision: "This dialog is the collaborative core: comments on verses/lexicon, forum messages, and the Notes tab for personal notes published on the forum.",
    helpRule0: "Level 0: Forum and Notes tabs (sign-in required)",
    helpRule1: "Level 1: Forum + Add",
    helpRule2: "Level 2: Forum + Add + Edit",
    helpRule3: "Level 3: Forum + Add + Edit + Delete"
  },
  ar: {
    dialogTitle: "ملاحظات حول المعجم والقرآن والمنتدى",
    actionsRailTitle: "إجراءات",
    labelSubject: "مرجع",
    labelComment: "النص",
    phSubject: "آية (مثال 2.255)، جذر، كلمة…",
    phComment: "تعليقك...",
    tabAjouter: "إضافة",
    tabModifier: "تعديل",
    tabSupprimer: "حذف",
    tabForum: "المنتدى",
    tabNotesForum: "ملاحظات",
    tabNotesForumTitle: "ملاحظاتك الشخصية على المنتدى (نفس صلاحية تبويب المنتدى)",
    notesForumIconTitle: "إضافة ملاحظة خاصة أو عامة أو تعديلها",
    btnAjouter: "حفظ",
    btnAjouterLexique: "إضافة تعليق إلى المعجم",
    btnAjouterVerset: "إضافة تعليق إلى الآية",
    btnModifier: "حفظ التعديلات",
    btnSupprimer: "تأكيد الحذف",
    btnForum: "إرسال للمنتدى",
    copy: "نسخ النص",
    close: "إغلاق",
    clearSubject: "مسح المرجع",
    clearComment: "مسح النص",
    translit: "حرف لاتيني",
    copied: "تم نسخ النص",
    btnConnectToSend: "سجّل الدخول لإرسال تعليق",
    btnNeedLevelPrefix: "المستوى",
    btnNeedLevelSuffix: "مطلوب لهذا الإجراء",
    tabNeedConnect: "يلزم تسجيل الدخول",
    tabNeedLevel: "المستوى %n مطلوب",
    btnDeleteVerseForbidden: "لا يمكن حذف مدخل آية",
    helpTitle: "مساعدة: صلاحيات المساهمة",
    tabHelp: "مساعدة",
    helpBtnTitle: "عرض قواعد الوصول",
    helpConnected: "متصل",
    helpNotConnected: "غير متصل",
    helpCurrentStatus: "الحالة الحالية",
    helpVision: "هذه النافذة هي قلب التعاون: تعليقات على الآيات/المعجم، رسائل المنتدى، وتبويب الملاحظات لكتابة ملاحظة شخصية على المنتدى.",
    helpRule0: "المستوى 0: تبويبا المنتدى والملاحظات (يلزم تسجيل الدخول)",
    helpRule1: "المستوى 1: المنتدى + إضافة",
    helpRule2: "المستوى 2: المنتدى + إضافة + تعديل",
    helpRule3: "المستوى 3: المنتدى + إضافة + تعديل + حذف"
  },
  kab: {
    dialogTitle: "Iwenniten ɣef umawal d Leqran d lmunada",
    actionsRailTitle: "Tigawin",
    labelSubject: "Tamsisit",
    labelComment: "Aḍris",
    phSubject: "Tazmilt (amedya 2.255), aɣer, awal…",
    phComment: "Awennit-ik...",
    tabAjouter: "Rnu",
    tabModifier: "Ẓreg",
    tabSupprimer: "Kkes",
    tabForum: "Lmunada",
    tabNotesForum: "Iwenniten",
    tabNotesForumTitle: "Iwenniten udmawanen ɣer lmunada (am lmunada)",
    notesForumIconTitle: "Rnu neɣ ẓreg tamawt uslig neɣ azayez",
    btnAjouter: "Sekles",
    btnAjouterLexique: "Rnu awennit ɣer umawal",
    btnAjouterVerset: "Rnu awennit ɣer tazmilt",
    btnModifier: "Sekles ibeddilen",
    btnSupprimer: "Sentem kkes",
    btnForum: "Azen ɣer lmunada",
    copy: "Nɣel aḍris",
    close: "Mdel",
    clearSubject: "Sfeḍ tamsisit",
    clearComment: "Sfeḍ aḍris",
    translit: "Transliteri",
    copied: "Aḍris yettwaneɣ",
    btnConnectToSend: "Kcem i tuzni n uwennit",
    btnNeedLevelPrefix: "Aswir",
    btnNeedLevelSuffix: "yettwraǧ i tigawt-a",
    tabNeedConnect: "Tuqqna tettwasra",
    tabNeedLevel: "Aswir %n yettwraǧ",
    btnDeleteVerseForbidden: "Ulac tukksa n unekcum n tazmilt",
    helpTitle: "Tallalt: izin n umttekki",
    tabHelp: "Tallalt",
    helpBtnTitle: "Sken ilugan n unekcum",
    helpConnected: "Yeqqen",
    helpNotConnected: "Ur yeqqin ara",
    helpCurrentStatus: "Addad amiran",
    helpVision: "Tanaka d ul n umttekki: iwenniten ɣef yisefra/umawal, iznan n lmunada, d yiccer n Iwenniten i wedmawan iwenniten ɣer lmunada.",
    helpRule0: "Aswir 0: Lmunada d Iwenniten (tuqqna tettwasra)",
    helpRule1: "Aswir 1: Lmunada + Rnu",
    helpRule2: "Aswir 2: Lmunada + Rnu + Ẓreg",
    helpRule3: "Aswir 3: Lmunada + Rnu + Ẓreg + Kkes"
  },
  es: {
    dialogTitle: "Notas sobre el léxico, el Corán y el foro",
    actionsRailTitle: "Acciones",
    labelSubject: "Referencia",
    labelComment: "Texto",
    phSubject: "Verso (ej. 2.255), raíz, palabra…",
    phComment: "Su comentario...",
    tabAjouter: "Añadir",
    tabModifier: "Editar",
    tabSupprimer: "Borrar",
    tabForum: "Foro",
    tabNotesForum: "Artículo",
    tabNotesForumTitle: "Redactar un artículo o notas en el foro (mismo acceso que la pestaña Foro)",
    notesForumIconTitle: "Añadir o modificar una nota privada o pública",
    btnAjouter: "Guardar",
    btnAjouterLexique: "Añadir comentario al léxico",
    btnAjouterVerset: "Añadir comentario al verso",
    btnModifier: "Guardar cambios",
    btnSupprimer: "Confirmar borrado",
    btnForum: "Enviar al foro",
    copy: "Copiar texto",
    close: "Cerrar",
    clearSubject: "Borrar referencia",
    clearComment: "Borrar texto",
    translit: "Transliterar",
    copied: "Texto copiado",
    btnConnectToSend: "Inicie sesión para enviar un comentario",
    btnNeedLevelPrefix: "Nivel",
    btnNeedLevelSuffix: "requerido para esta acción",
    tabNeedConnect: "Inicio de sesión requerido",
    tabNeedLevel: "Nivel %n requerido",
    btnDeleteVerseForbidden: "No se puede borrar la entrada de un verso",
    helpTitle: "Ayuda: permisos de contribución",
    tabHelp: "Ayuda",
    helpBtnTitle: "Ver reglas de acceso",
    helpConnected: "Conectado",
    helpNotConnected: "No conectado",
    helpCurrentStatus: "Estado actual",
    helpVision: "Este cuadro es el núcleo colaborativo: comentarios en versos/léxico, mensajes del foro, y la pestaña Notas para una nota personal publicada en el foro.",
    helpRule0: "Nivel 0: pestañas Foro y Notas (inicio de sesión requerido)",
    helpRule1: "Nivel 1: Foro + Añadir",
    helpRule2: "Nivel 2: Foro + Añadir + Editar",
    helpRule3: "Nivel 3: Foro + Añadir + Editar + Borrar"
  }
};

function copyCommentairesToClipboard() {
  const ta = document.getElementById("commentaires");
  const v = ta ? ta.value : "";
  const L = getCommentPopupStrings();
  const okMsg = L.copied || "";
  const toast = (msg, color) => {
    if (typeof alertMsgBoxTemp === "function") alertMsgBoxTemp(msg, color, 3000);
  };
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    if (typeof tMsg === "function") toast(tMsg("copyError"), "red");
    return;
  }
  navigator.clipboard.writeText(v).then(
    () => toast(okMsg, "green"),
    () => {
      if (typeof tMsg === "function") toast(tMsg("copyError"), "red");
    }
  );
}

window.copyCommentairesToClipboard = copyCommentairesToClipboard;

function copyPopupSubjectToClipboard() {
  const v = String(document.getElementById("popupInputMot")?.value || "");
  try {
    if (typeof window.copierTexte === "function") {
      window.copierTexte(v);
      return;
    }
  } catch (_) { }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(v).catch(function () { });
    }
  } catch (_) { }
}
window.copyPopupSubjectToClipboard = copyPopupSubjectToClipboard;

function getCommentPopupLang() {
  try {
    if (typeof getLang === "function") return (getLang() || "fr").toLowerCase();
  } catch (_) { }
  return (localStorage.getItem("uiLang") || "fr").toLowerCase();
}

function getCommentPopupStrings() {
  const lc = getCommentPopupLang();
  if (lc === "ar") return COMMENT_POPUP_I18N.ar;
  if (lc === "en") return COMMENT_POPUP_I18N.en;
  if (lc === "kab") return COMMENT_POPUP_I18N.kab;
  if (lc === "es") return COMMENT_POPUP_I18N.es;
  return COMMENT_POPUP_I18N.fr;
}

function getCommentPopupAuthorAt() {
  let who = "Auteur";
  try {
    if (typeof nameUser !== "undefined" && nameUser != null && String(nameUser).trim() !== "") {
      who = String(nameUser).trim();
    } else if (typeof localStorage !== "undefined") {
      who = String(localStorage.getItem("nameUser") || "Auteur").trim() || "Auteur";
    }
  } catch (_) { }
  return "@" + who;
}

function getCommentPopupDialogTitle() {
  return `Mes Commentaires ${getCommentPopupAuthorAt()}`;
}

function getCommentPopupNotesLabel() {
  return `Mes Notes ${getCommentPopupAuthorAt()}`;
}

const COMMENT_POPUP_REPLIES = {
  fr: { prefix: "Réponses : %n", openRead: "Ouvrir ce message sur le forum avec les réponses" },
  en: { prefix: "Replies: %n", openRead: "Open this post on the forum with replies" },
  ar: { prefix: "الردود: %n", openRead: "فتح هذه الرسالة في المنتدى مع الردود" },
  kab: { prefix: "Tiririyin: %n", openRead: "Ldi izen-a deg lmunada akked tririyin" },
  es: { prefix: "Respuestas: %n", openRead: "Abrir este mensaje en el foro con respuestas" }
};

function commentRequiredLevelForMode(mode) {
  if (mode === "ajouter") return 1;
  if (mode === "modifier") return 2;
  if (mode === "supprimer") return 3;
  return 1;
}

function commentIsConnected() {
  const mail = String(localStorage.getItem("mailUser") || window.mailUser || "").trim().toLowerCase();
  if (!mail) return false;
  if (typeof zcIsAnonymeCourriel === "function") return !zcIsAnonymeCourriel(mail);
  return mail !== "anonyme@blog.alfamous.ca";
}

function getCommentPopupAccess() {
  const connected = commentIsConnected();
  const niveau = Number(localStorage.getItem("niveauUser") || 0);
  return {
    connected,
    niveau,
    canForum: connected,
    canAdd: connected && niveau >= 1,
    canEdit: connected && niveau >= 2,
    canDelete: connected && niveau >= 3
  };
}

function canUseCommentMode(mode, access) {
  // Les onglets sont toujours navigables pour permettre l'aperçu.
  // Les restrictions réelles restent sur le bouton Enregistrer.
  return true;
}

function commentNeedLevelLabel(L, needLevel) {
  const prefix = L.btnNeedLevelPrefix || "Niveau";
  const suffix = L.btnNeedLevelSuffix || "requis";
  return `${prefix} ${needLevel} ${suffix}`;
}

function updateCommentPopupModeIndicator() {
  const el = document.getElementById("zc-comment-popup-mode-indicator");
  if (!el) return;
  const L = getCommentPopupStrings();
  const label =
    modeCommentaire === "supprimer"
      ? (L.tabSupprimer || "Supprimer")
      : modeCommentaire === "modifier"
        ? (L.tabModifier || "Modifier")
        : (L.tabAjouter || "Ajouter");
  el.textContent = `Auto: ${label}`;
}

function updateCommentPopupTabsState() {
  const L = getCommentPopupStrings();
  const access = getCommentPopupAccess();
  const defs = [
    { id: "ajouter", need: 1 },
    { id: "supprimer", need: 3 }
  ];
  defs.forEach((d) => {
    const b = document.getElementById("btn-" + d.id);
    if (!b) return;
    const allowed = d.need === 0 ? access.canForum : (access.connected && access.niveau >= d.need);
    b.disabled = false;
    b.classList.toggle("zc-popup-tab--restricted", !allowed);
    const lab = b.querySelector(".zc-popup-tab-label");
    const hintFromLabel = lab ? String(lab.textContent || "").trim() : "";
    if (!allowed) {
      b.title = !access.connected
        ? (L.tabNeedConnect || "Connexion requise")
        : String((L.tabNeedLevel || "Niveau %n requis")).replace("%n", String(d.need));
      b.setAttribute("aria-label", b.title);
    } else {
      b.title = hintFromLabel || "";
      b.setAttribute("aria-label", hintFromLabel || b.getAttribute("aria-label") || "");
    }
  });
  const bNotes = document.getElementById("btn-notesForum");
  if (bNotes) {
    const allowedN = access.canForum;
    bNotes.disabled = false;
    bNotes.classList.toggle("zc-popup-tab--restricted", !allowedN);
    const iconHintBase = getCommentPopupNotesLabel();
    const iconHint = `${iconHintBase} — ${getCommentPopupDialogTitle()}`;
    const hintN = !allowedN ? (L.tabNeedConnect || "Connexion requise") : iconHint;
    bNotes.title = hintN;
    bNotes.setAttribute("aria-label", hintN);
    bNotes.setAttribute("data-zc-tab-title", hintN);
  }

  try {
    const pAct = document.getElementById("zcCommentPopupActionsPanel");
    if (pAct && typeof window.zcSyncOneModulePanelTabs === "function") {
      window.zcSyncOneModulePanelTabs(pAct);
    }
  } catch (_) { }
  updateCommentPopupModeIndicator();
}

function updateCommentPopupPrimaryLabel() {
  const btn = document.getElementById("btn-enregistrerPopup");
  if (!btn) return;
  const sr = document.getElementById("btn-enregistrerPopup-sr");
  const vis = document.getElementById("btn-enregistrerPopup-label");
  const L = getCommentPopupStrings();
  const access = getCommentPopupAccess();
  function setPrimaryLabel(text) {
    const t = String(text || "");
    if (sr) sr.textContent = t;
    if (vis) vis.textContent = t;
    btn.setAttribute("aria-label", t);
    const saveHint = `${t} — ${getCommentPopupDialogTitle()}`;
    btn.title = saveHint;
    btn.setAttribute("data-zc-tab-title", btn.title);
    if (!sr) btn.textContent = t;
  }
  if (!access.connected) {
    setPrimaryLabel(L.btnConnectToSend || "Connectez-vous pour envoyer un commentaire");
    return;
  }
  const required = commentRequiredLevelForMode(modeCommentaire);
  if (access.niveau < required) {
    setPrimaryLabel(commentNeedLevelLabel(L, required));
    return;
  }
  const sujet = (document.getElementById("popupInputMot")?.value || "").trim();
  const isVerseRef = estReferenceVerset(sujet);
  if (modeCommentaire === "supprimer" && isVerseRef) {
    setPrimaryLabel(L.btnDeleteVerseForbidden || "Impossible de supprimer l'entrée d'un verset");
    return;
  }
  if (modeCommentaire === "ajouter") {
    setPrimaryLabel(
      isVerseRef
        ? (L.btnAjouterVerset || L.btnAjouter || L.btnForum)
        : (L.btnAjouterLexique || L.btnAjouter || L.btnForum)
    );
    return;
  }
  const key =
    modeCommentaire === "modifier" ? "btnModifier"
      : modeCommentaire === "supprimer" ? "btnSupprimer"
        : "btnForum";
  setPrimaryLabel(L[key] || L.btnForum);
}

function ensureCommentPopupRepliesMarkup() {
  if (document.getElementById("commentPopupRepliesWrap")) return;
  const subjLabel = document.getElementById("label-popup-subject");
  const row = subjLabel ? subjLabel.closest(".zc-popup-label-toolbar-row") : null;
  if (!row) return;
  const wrap = document.createElement("span");
  wrap.id = "commentPopupRepliesWrap";
  wrap.style.display = "none";
  wrap.style.marginInlineStart = "10px";
  wrap.style.fontSize = "12px";
  const link = document.createElement("a");
  link.href = "#";
  link.id = "commentPopupRepliesLink";
  link.style.color = "var(--zc-link, var(--zc-accent))";
  link.style.textDecoration = "underline";
  link.style.cursor = "pointer";
  wrap.appendChild(link);
  row.appendChild(wrap);
}

function updateCommentPopupRepliesUi() {
  ensureCommentPopupRepliesMarkup();
  const wrap = document.getElementById("commentPopupRepliesWrap");
  const link = document.getElementById("commentPopupRepliesLink");
  if (!wrap || !link) return;
  const lc = getCommentPopupLang();
  const R = COMMENT_POPUP_REPLIES[lc] || COMMENT_POPUP_REPLIES.fr;
  const id = String(commentaireResolvedTopicId || "").trim();
  if (!id) {
    wrap.style.display = "none";
    link.textContent = "";
    return;
  }
  const n = Math.max(0, Number(commentaireResolvedReplyCount) || 0);
  link.textContent = R.prefix.replace("%n", String(n));
  link.title = R.openRead;
  link.setAttribute("aria-label", R.openRead);
  wrap.style.display = "";
}

async function refreshCommentPopupRepliesMeta() {
  const inputEl = document.getElementById("popupInputMot");
  const sujet = String(inputEl && inputEl.value || "").trim();
  const auth = typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser;
  const email = auth && auth.email ? String(auth.email).trim().toLowerCase() : "";
  const normKey =
    typeof window.forumNormalizeSubjectKey === "function"
      ? window.forumNormalizeSubjectKey(sujet)
      : "";
  const sig = `${normKey}|${email}`;
  if (sig === commentaireLastReplyLookupSig) {
    updateCommentPopupRepliesUi();
    return;
  }
  commentaireLastReplyLookupSig = sig;
  commentaireResolvedTopicId = "";
  commentaireResolvedReplyCount = 0;
  updateCommentPopupRepliesUi();
  if (!normKey || !email) return;
  const findFn = window.forumFindExistingTopicBySubjectKeyAndAuthor;
  if (typeof findFn !== "function") return;
  try {
    const ex = await findFn(normKey, email);
    if (!ex || !ex.id) return;
    commentaireResolvedTopicId = String(ex.id || "").trim();
    commentaireResolvedReplyCount = Array.isArray(ex.data && ex.data.reponses) ? ex.data.reponses.length : 0;
  } catch (_) {
    commentaireResolvedTopicId = "";
    commentaireResolvedReplyCount = 0;
  }
  updateCommentPopupRepliesUi();
}

function scheduleCommentPopupRepliesRefresh() {
  if (commentaireReplyLookupTimer) {
    clearTimeout(commentaireReplyLookupTimer);
    commentaireReplyLookupTimer = null;
  }
  commentaireReplyLookupTimer = setTimeout(function () {
    commentaireReplyLookupTimer = null;
    void refreshCommentPopupRepliesMeta();
  }, 140);
}

function applyCommentPopupI18n() {
  const L = getCommentPopupStrings();
  const overlay = document.getElementById("popupCommentaireOverlay");
  const box = document.querySelector("#popupCommentaireOverlay .zc-comment-popup-box");
  if (box) box.setAttribute("dir", getCommentPopupLang() === "ar" ? "rtl" : "ltr");

  const titre = document.getElementById("popupCommentaireTitre");
  if (titre) {
    const t = getCommentPopupDialogTitle();
    titre.innerHTML =
      '<span class="zc-popup-title-ico" aria-hidden="true">✍️</span>' +
      '<span class="zc-popup-title-text">' + escapeHtml(t) + "</span>";
  }

  const actRail = document.getElementById("zc-comment-popup-actions-title");
  if (actRail) actRail.textContent = L.actionsRailTitle || "Actions";

  const srClrSub = document.getElementById("btn-popup-clear-subject-sr");
  if (srClrSub) srClrSub.textContent = L.clearSubject;
  const srTrSub = document.getElementById("btn-popup-translit-subject-sr");
  if (srTrSub) srTrSub.textContent = L.translit;
  const srClrBody = document.getElementById("clearButton-sr");
  if (srClrBody) srClrBody.textContent = L.clearComment;
  const srCopy = document.getElementById("btn-popup-comment-copy-sr");
  if (srCopy) srCopy.textContent = L.copy;
  const srCopySub = document.getElementById("btn-popup-subject-copy-sr");
  if (srCopySub) srCopySub.textContent = L.copy + " " + L.labelSubject;

  const subj = document.getElementById("popupInputMot");
  const com = document.getElementById("commentaires");
  if (subj) subj.placeholder = L.phSubject;
  if (com) com.placeholder = L.phComment;

  const ls = document.getElementById("label-popup-subject");
  const lc = document.getElementById("label-popup-comment");
  if (ls) ls.textContent = L.labelSubject;
  if (lc) lc.textContent = L.labelComment;

  const tAj = document.getElementById("tab-label-ajouter");
  const tMo = document.getElementById("tab-label-modifier");
  const tSu = document.getElementById("tab-label-supprimer");
  const tFo = document.getElementById("tab-label-msgForum");
  const tNf = document.getElementById("tab-label-notesForum");
  if (tAj) tAj.textContent = L.tabAjouter;
  if (tMo) tMo.textContent = L.tabModifier;
  if (tSu) tSu.textContent = L.tabSupprimer;
  if (tFo) tFo.textContent = L.tabForum;
  if (tNf) tNf.textContent = getCommentPopupNotesLabel();
  const aAj = document.getElementById("cmt-act-label-ajouter");
  const aSu = document.getElementById("cmt-act-label-supprimer");
  const aFo = document.getElementById("cmt-act-label-msgForum");
  const aNo = document.getElementById("cmt-act-label-notes");
  const aCs = document.getElementById("cmt-act-label-clear-subject");
  const aTs = document.getElementById("cmt-act-label-translit");
  const aCps = document.getElementById("cmt-act-label-copy-subject");
  const aCt = document.getElementById("cmt-act-label-clear-text");
  const aCpt = document.getElementById("cmt-act-label-copy-text");
  if (aAj) aAj.textContent = L.tabAjouter;
  if (aSu) aSu.textContent = L.tabSupprimer;
  if (aFo) aFo.textContent = L.tabForum;
  if (aNo) aNo.textContent = getCommentPopupNotesLabel();
  if (aCs) aCs.textContent = L.clearSubject;
  if (aTs) aTs.textContent = L.translit;
  if (aCps) aCps.textContent = L.copy + " " + L.labelSubject;
  if (aCt) aCt.textContent = L.clearComment;
  if (aCpt) aCpt.textContent = L.copy + " " + L.labelComment;

  const btnCopy = document.getElementById("btn-popup-comment-copy");
  const btnCopyInl = document.getElementById("btn-popup-comment-copy-inline");
  const btnClose = document.getElementById("btn-popup-comment-close");
  const btnClrS = document.getElementById("btn-popup-clear-subject");
  const btnClrSInl = document.getElementById("btn-popup-clear-subject-inline");
  const btnTr = document.getElementById("btn-popup-translit-subject");
  const btnClrC = document.getElementById("clearButton");
  const btnClrCInl = document.getElementById("clearButtonInline");
  const btnSubCp = document.getElementById("btn-popup-subject-copy");
  const btnSubCpInl = document.getElementById("btn-popup-subject-copy-inline");
  const btnHelp = document.getElementById("btn-popup-comment-help");
  if (btnCopy) {
    btnCopy.title = L.copy;
    btnCopy.setAttribute("aria-label", L.copy);
  }
  if (btnCopyInl) {
    btnCopyInl.title = L.copy;
    btnCopyInl.setAttribute("aria-label", L.copy);
  }
  if (btnClose) btnClose.title = L.close;
  if (btnClrS) btnClrS.title = L.clearSubject;
  if (btnClrSInl) {
    btnClrSInl.title = L.clearSubject;
    btnClrSInl.setAttribute("aria-label", L.clearSubject);
  }
  if (btnTr) btnTr.title = L.translit;
  if (btnClrC) btnClrC.title = L.clearComment;
  if (btnClrCInl) {
    btnClrCInl.title = L.clearComment;
    btnClrCInl.setAttribute("aria-label", L.clearComment);
  }
  if (btnSubCp) {
    const subCopy = L.copy + " " + L.labelSubject;
    btnSubCp.title = subCopy;
    btnSubCp.setAttribute("aria-label", subCopy);
  }
  if (btnSubCpInl) {
    const subCopyInl = L.copy + " " + L.labelSubject;
    btnSubCpInl.title = subCopyInl;
    btnSubCpInl.setAttribute("aria-label", subCopyInl);
  }
  if (btnHelp) {
    btnHelp.title = L.helpBtnTitle || "Aide";
    btnHelp.setAttribute("aria-label", L.helpBtnTitle || "Aide");
    const helpTab = `${L.tabHelp || "Aide"} — ${getCommentPopupDialogTitle()}`;
    btnHelp.setAttribute("data-zc-tab-title", helpTab);
    const hLab = document.getElementById("cmt-act-label-help");
    if (hLab) hLab.textContent = L.tabHelp || "Aide";
  }
  const bAdd = document.getElementById("btn-ajouter");
  const bDel = document.getElementById("btn-supprimer");
  const bForum = document.getElementById("btn-msgForum");
  const bSave = document.getElementById("btn-enregistrerPopup");
  if (bAdd) bAdd.title = `${L.tabAjouter} — ${L.labelComment}`;
  if (bDel) bDel.title = `${L.tabSupprimer} — ${L.labelComment}`;
  if (bForum) bForum.title = `${L.tabForum} — ${L.labelComment}`;
  if (bSave) {
    const saveLabel = String(
      document.getElementById("btn-enregistrerPopup-label")?.textContent ||
      L.btnForum ||
      "Enregistrer"
    ).trim();
    const saveTitle = `${saveLabel} — ${getCommentPopupDialogTitle()}`;
    bSave.title = saveTitle;
    bSave.setAttribute("aria-label", saveTitle);
    bSave.setAttribute("data-zc-tab-title", saveTitle);
  }
  if (btnTr) {
    const richTrans = `${L.translit} (${L.labelSubject})`;
    btnTr.title = richTrans;
    btnTr.setAttribute("aria-label", richTrans);
  }

  const btnNotesForum = document.getElementById("btn-notesForum");
  if (btnNotesForum) {
    const iconHintBase = getCommentPopupNotesLabel();
    const iconHint = `${iconHintBase} — ${getCommentPopupDialogTitle()}`;
    btnNotesForum.setAttribute("aria-label", iconHint);
    btnNotesForum.title = iconHint;
    btnNotesForum.setAttribute("data-zc-tab-title", iconHint);
  }

  updateCommentPopupTabsState();
  updateCommentPopupPrimaryLabel();

  try {
    const pAct = document.getElementById("zcCommentPopupActionsPanel");
    if (pAct && typeof window.zcSyncOneModulePanelTabs === "function") {
      window.zcSyncOneModulePanelTabs(pAct);
    }
  } catch (_) { }
  updateCommentPopupModeIndicator();
  updateCommentPopupRepliesUi();
}

window.refreshCommentPopupI18n = applyCommentPopupI18n;

function openNotesForumFromCommentPopup() {
  const access = getCommentPopupAccess();
  if (!access.canForum) {
    showCommentPopupTempMsg("Connexion requise pour ouvrir Notes.", "orange");
    return;
  }
  if (typeof fermerPopupCommentaire === "function") fermerPopupCommentaire();
  window.requestAnimationFrame(function () {
    if (typeof window.openArticlesForumNotesModal === "function") {
      window.openArticlesForumNotesModal();
    }
  });
}
window.openNotesForumFromCommentPopup = openNotesForumFromCommentPopup;

function showCommentPolicyHelp() {
  const L = getCommentPopupStrings();
  const isAr = getCommentPopupLang() === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const align = isAr ? "right" : "left";
  const a = getCommentPopupAccess();
  const who = a.connected ? (L.helpConnected || "Connecté") : (L.helpNotConnected || "Non connecté");
  const status = `${L.helpCurrentStatus || "Statut"}: ${who} · niveau ${a.niveau}`;
  const html =
    `<div dir="${dir}" style="line-height:1.5;text-align:${align};">` +
    `<h3 style="margin:.1rem 0 .55rem 0;color:#0f172a;">${L.helpTitle || "Aide"}</h3>` +
    `<p style="margin:.2rem 0 .6rem 0;color:#334155;">${L.helpVision || ""}</p>` +
    `<p style="margin:.2rem 0 .7rem 0;"><strong>${status}</strong></p>` +
    `<div style="display:grid;gap:.3rem;">` +
    `<div>• ${L.helpRule0 || ""}</div>` +
    `<div>• ${L.helpRule1 || ""}</div>` +
    `<div>• ${L.helpRule2 || ""}</div>` +
    `<div>• ${L.helpRule3 || ""}</div>` +
    `</div></div>`;
  if (typeof alertMsgBoxPopup === "function") {
    alertMsgBoxPopup(html);
  }
}
window.showCommentPolicyHelp = showCommentPolicyHelp;

async function setModeCommentaire(mode) {
  mode = mode === "msgForum" ? "modifier" : mode;
  const access = getCommentPopupAccess();
  if (!canUseCommentMode(mode, access)) {
    showCommentPopupTempMsg("Action non disponible dans ce contexte.", "orange");
    updatePopupEnregistrerState();
    return;
  }
  const input = String(document.getElementById("popupInputMot")?.value || "").trim();
  const champComment = document.getElementById("commentaires");
  const previousMode = modeCommentaire;
  const curRaw = String(champComment?.value || "");
  const curNorm = normalizeCommentForCompare(curRaw);
  const baseNorm = normalizeCommentForCompare(commentaireModifierBaseline);

  // Mode Ajouter : si déjà en ajout et texte rempli -> enregistrer directement.
  if (mode === "ajouter" && previousMode === "ajouter" && curNorm !== "") {
    const saveBtn0 = document.getElementById("btn-enregistrerPopup");
    if (saveBtn0 && saveBtn0.disabled) {
      explainWhySaveDisabled();
      return;
    }
    enregistrerPopupCommentaire();
    return;
  }

  // Depuis Modifier avec changements : prévenir avant perte des modifications.
  if (
    mode === "ajouter" &&
    previousMode === "modifier" &&
    curNorm !== baseNorm &&
    curNorm !== ""
  ) {
    if (commentaireSkipNextDiscardConfirm) {
      commentaireSkipNextDiscardConfirm = false;
    } else {
    let okDiscard = false;
    const msgDiscard = "Les modifications en cours seront perdues. Continuer ?";
    try {
      if (typeof alertConfirmLex === "function") okDiscard = !!(await alertConfirmLex(msgDiscard));
      else okDiscard = !!window.confirm(msgDiscard);
    } catch (_) {
      okDiscard = !!window.confirm(msgDiscard);
    }
    if (!okDiscard) return;
    }
  }

  modeCommentaire = mode;

  if (mode === "ajouter" && champComment) {
    commentaireAjouterForce = true;
    champComment.value = "";
    commentaireAddForumDraft = "";
    commentaireModifierBaseline = "";
    updatePopupEnregistrerState();
    updateCommentPopupModeIndicator();
    return;
  }
  if (mode === "supprimer") {
    commentaireAjouterForce = false;
    const sujetDel = String(document.getElementById("popupInputMot")?.value || "").trim();
    if (!sujetDel) {
      modeCommentaire = previousMode;
      showCommentPopupTempMsg("Référence manquante : rien à supprimer.", "orange");
      updatePopupEnregistrerState();
      updateCommentPopupModeIndicator();
      return;
    }
    const existingDel = String(recupererCommentaire(sujetDel) || "").trim();
    if (!existingDel) {
      modeCommentaire = previousMode;
      showCommentPopupTempMsg("Aucune entrée Lexique/Coran à supprimer pour cette référence.", "orange");
      updatePopupEnregistrerState();
      updateCommentPopupModeIndicator();
      return;
    }
    // Suppression immédiate sans modifier le texte affiché.
    modeCommentaire = "supprimer";
    // Recalcule l'état du bouton pour le mode suppression (évite l'état hérité du mode Modifier).
    updatePopupEnregistrerState();
    const saveBtn = document.getElementById("btn-enregistrerPopup");
    if (saveBtn && saveBtn.disabled) {
      modeCommentaire = previousMode;
      if (estReferenceVerset(sujetDel)) {
        const L = getCommentPopupStrings();
        showCommentPopupTempMsg(L.btnDeleteVerseForbidden || "Impossible de supprimer l'entrée d'un verset", "orange");
      } else {
        showCommentPopupTempMsg("Suppression indisponible pour cette référence.", "orange");
      }
      updatePopupEnregistrerState();
      updateCommentPopupModeIndicator();
      return;
    }
    enregistrerPopupCommentaire();
    modeCommentaire = "ajouter";
    commentaireAjouterForce = true;
    updatePopupEnregistrerState();
    updateCommentPopupModeIndicator();
    return;
  }
  commentaireAjouterForce = false;
  if (mode === "modifier") {
    rafraichirCommentaire();
    updateCommentPopupModeIndicator();
    return;
  }
  if (!input && champComment) champComment.value = commentaireAddForumDraft || "";
  updatePopupEnregistrerState();
  updateCommentPopupModeIndicator();
}

function updatePopupEnregistrerState() {
  const btn = document.getElementById("btn-enregistrerPopup");
  if (!btn) return;
  const access = getCommentPopupAccess();
  const required = commentRequiredLevelForMode(modeCommentaire);
  if (!access.connected || access.niveau < required) {
    btn.disabled = true;
    updateCommentPopupTabsState();
    updateCommentPopupPrimaryLabel();
    return;
  }
  const sujet = (document.getElementById("popupInputMot")?.value || "").trim();
  const isVerseRef = estReferenceVerset(sujet);
  if (modeCommentaire === "supprimer" && isVerseRef) {
    btn.disabled = true;
    updateCommentPopupTabsState();
    updateCommentPopupPrimaryLabel();
    return;
  }
  const comEl = document.getElementById("commentaires");
  const comRaw = comEl ? comEl.value : "";
  const com = comRaw.trim();
  const existingComment = sujet ? String(recupererCommentaire(sujet) || "").trim() : "";
  const hasExisting = !!existingComment;
  const requireText = modeCommentaire !== "supprimer";

  if (!sujet || (requireText && !com)) {
    btn.disabled = true;
    updateCommentPopupTabsState();
    updateCommentPopupPrimaryLabel();
    return;
  }
  if (modeCommentaire === "modifier") {
    if (!hasExisting) {
      btn.disabled = true;
      updateCommentPopupTabsState();
      updateCommentPopupPrimaryLabel();
      return;
    }
  }
  if (modeCommentaire === "supprimer") {
    btn.disabled = !hasExisting;
    updateCommentPopupTabsState();
    updateCommentPopupPrimaryLabel();
    return;
  }
  if (modeCommentaire === "modifier") {
    const cur = normalizeCommentForCompare(comRaw);
    const base = normalizeCommentForCompare(commentaireModifierBaseline);
    btn.disabled = cur === base;
    updateCommentPopupTabsState();
    updateCommentPopupPrimaryLabel();
    return;
  }
  btn.disabled = false;
  updateCommentPopupTabsState();
  updateCommentPopupPrimaryLabel();
}

function explainWhySaveDisabled() {
  const access = getCommentPopupAccess();
  const sujet = String(document.getElementById("popupInputMot")?.value || "").trim();
  const com = String(document.getElementById("commentaires")?.value || "").trim();
  const required = commentRequiredLevelForMode(modeCommentaire);
  if (!access.connected) {
    showCommentPopupTempMsg("Connectez-vous pour enregistrer.", "orange");
    return;
  }
  if (access.niveau < required) {
    showCommentPopupTempMsg(`Niveau ${required} requis pour cette action.`, "orange");
    return;
  }
  if (!sujet) {
    showCommentPopupTempMsg("Référence manquante.", "orange");
    return;
  }
  if (modeCommentaire !== "supprimer" && !com) {
    showCommentPopupTempMsg("Le champ Texte est vide.", "orange");
    return;
  }
  if (modeCommentaire === "supprimer") {
    showCommentPopupTempMsg("Aucune entrée Lexique/Coran à supprimer pour cette référence.", "orange");
    return;
  }
  showCommentPopupTempMsg("Aucun changement détecté.", "orange");
}

function estReferenceVerset(input) {
  const s = String(input || "").trim();
  if (!s) return false;
  if (typeof detecterNombre === "function") {
    try {
      return !!detecterNombre(s);
    } catch (_) { }
  }
  return /^\d+(?:\.\d+)?$/.test(s);
}

function enregistrerPopupCommentaire() {
  try {
    const sujet = String(document.getElementById("popupInputMot")?.value || "").trim();
    const existing = sujet ? String(recupererCommentaire(sujet) || "").trim() : "";
    if (modeCommentaire !== "supprimer") {
      if (modeCommentaire === "ajouter" || commentaireAjouterForce) {
        // Ajouter explicitement demandé par clic sur l'action Ajouter.
      } else {
        modeCommentaire = existing ? "modifier" : "ajouter";
      }
    }
  } catch (_) { }
  try {
    if (typeof enregistrer === "function") enregistrer();
    const sujetEl = document.getElementById("popupInputMot");
    const texteEl = document.getElementById("commentaires");
    commentaireCloseBaseline = {
      sujet: String(sujetEl?.value || "").trim(),
      texte: String(texteEl?.value || "")
    };
    setTimeout(function () { scheduleCommentPopupRepliesRefresh(); }, 500);
  } catch (e) {
    console.error("enregistrerPopupCommentaire:", e);
  }
}

function isCommentPopupDirtyForClose() {
  const sujet = String(document.getElementById("popupInputMot")?.value || "").trim();
  const texte = String(document.getElementById("commentaires")?.value || "");
  return sujet !== commentaireCloseBaseline.sujet || texte !== commentaireCloseBaseline.texte;
}

async function confirmCloseCommentPopupIfDirty() {
  if (!isCommentPopupDirtyForClose()) return true;
  const msgDiscard = "Fermer Mes Commentaires sans enregistrer ? Les modifications seront perdues.";
  let ok = false;
  try {
    if (typeof alertConfirmLex === "function") ok = !!(await alertConfirmLex(msgDiscard));
    else if (typeof window.alertConfirm === "function") ok = !!(await window.alertConfirm(msgDiscard));
    else ok = !!window.confirm(msgDiscard);
  } catch (_) {
    ok = !!window.confirm(msgDiscard);
  }
  return ok;
}

async function fermerPopupCommentaire() {
  if (!(await confirmCloseCommentPopupIfDirty())) return;
  try {
    if (typeof zcCollapseAllTextareaZen === "function") zcCollapseAllTextareaZen();
  } catch (_) { }
  try {
    window.__forumValidatePendingId = null;
  } catch (_) { }
  commentaireAddForumDraft = "";
  commentaireModifierSignatureSnap = "";
  document.getElementById("popupCommentaireOverlay").style.display = "none";
}

function estTexteArabe(texte) {
  const arabeRegex = /[\u0600-\u06FF]/;
  return arabeRegex.test(texte);
}

document.getElementById("popupInputMot").addEventListener("input", function () {
  const motField = document.getElementById("mot");
  if (motField) motField.value = this.value;
  commentaireSkipNextDiscardConfirm = true;
  // Dès que la référence change, on revient au flux auto (chargement depuis lexique/versets).
  commentaireAjouterForce = false;
  this.dir = estTexteArabe(this.value) ? "rtl" : "ltr";
  scheduleCommentPopupRepliesRefresh();
});

document.getElementById("mot").addEventListener("input", function () {
  const popupInput = document.getElementById("popupInputMot");
  if (popupInput) popupInput.value = this.value;
  try {
    if (typeof window.refreshSearchFieldToolVisibility === "function") {
      window.refreshSearchFieldToolVisibility("popupInputMot");
    }
  } catch (_) { }
});

document.getElementById("popupInputMot").addEventListener("input", rafraichirCommentaire);
document.getElementById("popupInputMot").addEventListener("focus", rafraichirCommentaire);
document.getElementById("popupInputMot").addEventListener("focus", scheduleCommentPopupRepliesRefresh);

(function bindCommentairesEnregistrerState() {
  const ta = document.getElementById("commentaires");
  if (ta) {
    ta.addEventListener("input", function () {
      const raw = String(ta.value || "");
      if (normalizeCommentForCompare(raw) === "" && modeCommentaire !== "supprimer") {
        modeCommentaire = "ajouter";
        commentaireAjouterForce = true;
      }
      updatePopupEnregistrerState();
      if (modeCommentaire === "ajouter") {
        commentaireAddForumDraft = ta.value;
      }
    });
  }
})();

(function bindCommentPopupUiLang() {
  const sel = document.getElementById("uiLangSelect");
  if (!sel) return;
  sel.addEventListener("change", function () {
    const ov = document.getElementById("popupCommentaireOverlay");
    if (ov && ov.style.display === "flex") applyCommentPopupI18n();
  });
})();

/** Replie le panneau Actions de la popup commentaires (même logique que le bouton ±). */
function collapseCommentPopupActionsPanel() {
  try {
    const p = document.getElementById("zcCommentPopupActionsPanel");
    if (!p || p.classList.contains("zc-panel-collapsed")) return;
    const btn = p.querySelector(".zc-panel-collapse-btn");
    if (btn) {
      btn.click();
      return;
    }
    Array.from(p.children)
      .filter((ch) => !ch.classList.contains("zc-module-head"))
      .forEach((ch) => { ch.style.display = "none"; });
    p.classList.add("zc-panel-collapsed");
  } catch (_) { }
}

/**
 * Ouvre la popup commentaire / forum.
 * @param {string} mode - Onglet actif : "ajouter" | "modifier" | "supprimer" (msgForum est alias de modifier)
 * @param {string} input - Sujet (verset, racine, etc.)
 * @param {string} commentaire - Si non vide : texte initial.
 */
function afficherPopupCommentaire(mode = "ajouter", input = "", commentaire = "") {
  const champInput = document.getElementById("popupInputMot");
  const champComment = document.getElementById("commentaires");
  const overlay = document.getElementById("popupCommentaireOverlay");
  if (!overlay) return;

  // Même plan global que les autres modales (évite l'affichage derrière les popups déplacées sur body).
  try {
    if (document.body && overlay.parentElement !== document.body) {
      document.body.appendChild(overlay);
    }
  } catch (_) { }

  mode = mode === "msgForum" ? "modifier" : mode;
  if (input === "") mode = "ajouter";
  input = (typeof dedoubleSheddaSafe === "function") ? dedoubleSheddaSafe(input) : input;
  commentaireResolvedTopicId = "";
  commentaireResolvedReplyCount = 0;
  commentaireLastReplyLookupSig = "";

  commentaireModifierBaseline = "";
  modeCommentaire = mode;
  inputOriginal = input;

  if (mode === "modifier") {
    commentaireModifierSignatureSnap = buildLexiqueSignaturePlain();
  } else {
    commentaireModifierSignatureSnap = "";
  }

  champInput.value = input || "";
  champInput.style.display = "block";

  if (mode === "ajouter") {
    let v;
    if (commentaire != null && String(commentaire).trim() !== "") {
      v = nettoyerCommentairePourChampTexte(String(commentaire));
    } else {
      v = commentaireAddForumDraft;
    }
    champComment.value = v;
    commentaireAddForumDraft = v;
  } else if (mode === "modifier") {
    const existing = nettoyerCommentairePourChampTexte(String(recupererCommentaire(input) || "").trim().replace(/\n/g, "<br>"));
    champComment.value = dedupeTrailingSameAuthorSignatures(existing);
    commentaireModifierBaseline = normalizeCommentForCompare(champComment.value);
  } else {
    champComment.value = commentaire != null ? nettoyerCommentairePourChampTexte(String(commentaire)) : "";
  }

  const activeUiMode = mode === "supprimer" ? "supprimer" : "ajouter";
  ["ajouter", "supprimer"].forEach(id => {
    const btn = document.getElementById("btn-" + id);
    if (btn) btn.classList.toggle("active", id === activeUiMode);
  });

  applyCommentPopupI18n();

  try {
    if (typeof window.zcBringToFront === "function") {
      window.zcBringToFront(overlay, 0);
    } else if (typeof getNextZIndex === "function") {
      overlay.style.zIndex = String(getNextZIndex());
    }
  } catch (_) { }
  overlay.style.display = "flex";
  try {
    if (typeof window.zcLowerZoom0Below === "function") window.zcLowerZoom0Below(overlay);
  } catch (_) { }

  collapseCommentPopupActionsPanel();

  // Si l'utilisateur reclique dedans, on la remonte.
  if (!overlay.__zcFrontBound) {
    overlay.__zcFrontBound = true;
    overlay.addEventListener("mousedown", function () {
      try {
        if (typeof window.zcBringToFront === "function") {
          window.zcBringToFront(overlay, 0);
        } else if (typeof getNextZIndex === "function") {
          overlay.style.zIndex = String(getNextZIndex());
        }
      } catch (_) { }
    }, true);
  }

  rafraichirCommentaire();
  updatePopupEnregistrerState();
  updateCommentPopupModeIndicator();
  updateCommentPopupRepliesUi();
  scheduleCommentPopupRepliesRefresh();
  commentaireCloseBaseline = {
    sujet: String(champInput?.value || "").trim(),
    texte: String(champComment?.value || "")
  };

  try {
    requestAnimationFrame(function () {
      if (typeof ajusterHauteur === "function") {
        ajusterHauteur("popupInputMot");
        ajusterHauteur("commentaires");
      }
    });
  } catch (_) { }
}

window.afficherPopupCommentaire = afficherPopupCommentaire;

function rafraichirCommentaire() {
  const input = document.getElementById("popupInputMot").value.trim();
  const champComment = document.getElementById("commentaires");
  if (!champComment) return;
  if (input === "") {
    if (modeCommentaire !== "supprimer" && !commentaireAjouterForce) {
      modeCommentaire = "ajouter";
      champComment.value = commentaireAddForumDraft || "";
      commentaireModifierBaseline = normalizeCommentForCompare(champComment.value);
    }
    const activeUiMode0 = modeCommentaire === "supprimer" ? "supprimer" : "ajouter";
    ["ajouter", "supprimer"].forEach(id => {
      const btn = document.getElementById("btn-" + id);
      if (btn) btn.classList.toggle("active", id === activeUiMode0);
    });
    updatePopupEnregistrerState();
    updateCommentPopupModeIndicator();
    try {
      if (typeof window.refreshSearchFieldToolVisibility === "function") {
        window.refreshSearchFieldToolVisibility("popupInputMot");
        window.refreshSearchFieldToolVisibility("commentaires");
      }
    } catch (_) { }
    return;
  }

  // Référence active : synchronise depuis les tables versets/lexique, sauf Ajouter forcé.
  if (!commentaireAjouterForce) {
  const commentaire = recupererCommentaire(input);
    const cleaned = nettoyerCommentairePourChampTexte((commentaire || "").trim().replace(/\n/g, "<br>"));
    champComment.value = dedupeTrailingSameAuthorSignatures(cleaned);
    commentaireModifierBaseline = normalizeCommentForCompare(champComment.value);
    if (modeCommentaire !== "supprimer") {
      modeCommentaire = cleaned ? "modifier" : "ajouter";
    }
    const activeUiMode1 = modeCommentaire === "supprimer" ? "supprimer" : "ajouter";
    ["ajouter", "supprimer"].forEach(id => {
      const btn = document.getElementById("btn-" + id);
      if (btn) btn.classList.toggle("active", id === activeUiMode1);
    });
  }

  updatePopupEnregistrerState();
  updateCommentPopupModeIndicator();
  scheduleCommentPopupRepliesRefresh();
  try {
    if (typeof window.refreshSearchFieldToolVisibility === "function") {
      window.refreshSearchFieldToolVisibility("popupInputMot");
      window.refreshSearchFieldToolVisibility("commentaires");
    }
  } catch (_) { }
}

document.getElementById("popupCommentaireOverlay")?.addEventListener("click", function (e) {
  const t = e.target instanceof Element ? e.target.closest("#commentPopupRepliesLink") : null;
  if (!t) return;
  e.preventDefault();
  const id = String(commentaireResolvedTopicId || "").trim();
  if (!id || typeof window.forumOpenReadMessageById !== "function") return;
  const n = Number(commentaireResolvedReplyCount) || 0;
  void window.forumOpenReadMessageById(id, { scrollToReplies: n > 0 });
}, true);

function recupererCommentaire(input) {
  let commentaire = "";

  if (!input || input.trim() === "") return commentaire;

  const inputMin = input.toLowerCase().replace(/\+/g, ' ').trim();

  if (!isNaN(parseFloat(input)) && input.includes(".")) {
    // fTabVersets peut ne pas être chargé très tôt (syncFieldsFrom au DOMContentLoaded).
    if (typeof fTabVersets !== "function") return commentaire;
    const tabVersets = fTabVersets();
    for (const v of tabVersets) {
      if (`${v[0]}.${v[1]}` === input) {
        commentaire = v[3] || "";
        break;
      }
    }
  } else {
    // fTabLexique peut ne pas être chargé très tôt (syncFieldsFrom au DOMContentLoaded).
    if (typeof fTabLexique !== "function") return commentaire;
    const tabLexique = fTabLexique();
    const item = tabLexique.find(entry => {
      const motLexique = (entry[0] || "").toLowerCase().replace(/\+/g, ' ').trim();
      return motLexique === inputMin;
    });
    if (item) commentaire = item[1];
  }

  return commentaire;
}

function clearComment() {
  document.getElementById('commentaires').value = '';
  commentaireAjouterForce = true;
  modeCommentaire = "ajouter";
  commentaireAddForumDraft = "";
  updatePopupEnregistrerState();
  updateCommentPopupModeIndicator();
}

(function bindCommentPopupNoopHints() {
  const panel = document.getElementById("zcCommentPopupActionsPanel");
  if (!panel || panel.__zcNoopHintsBound) return;
  panel.__zcNoopHintsBound = true;
  panel.addEventListener("mousedown", function (ev) {
    const target = ev.target instanceof Element ? ev.target.closest("#btn-enregistrerPopup") : null;
    if (!target) return;
    if (target.disabled) explainWhySaveDisabled();
  }, true);
})();
