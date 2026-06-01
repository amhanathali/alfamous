//FORUM**********************************************************************************
// Obtenir le nom d'utilisateur depuis le localStorage
var nameUser = localStorage.getItem('nameUser');
var mailUser = localStorage.getItem('mailUser');
var niveauUser = Number(localStorage.getItem('niveauUser') || 0);
if (!nameUser) { nameUser = "anonyme"; }
if (!mailUser) { mailUser = "anonyme@blog.alfamous.ca"; }
if (!niveauUser) { niveauUser = 0; }
window.nameUser = window.nameUser ?? (localStorage.getItem('nameUser') || 'anonyme');
window.mailUser = window.mailUser ?? (localStorage.getItem('mailUser') || 'anonyme@blog.alfamous.ca');
window.niveauUser = window.niveauUser ?? (Number(localStorage.getItem('niveauUser')) || 0);

function forumGetNiveau() {
    return Number(localStorage.getItem('niveauUser') || 0);
}
function forumGetMail() {
    return String(localStorage.getItem('mailUser') || '').trim().toLowerCase();
}

function forumFirebaseEmailLc() {
    try {
        if (typeof firebase === "undefined" || !firebase.auth) return "";
        const u = firebase.auth().currentUser;
        if (!u || !u.email) return "";
        return String(u.email).trim().toLowerCase();
    } catch (_) {
        return "";
    }
}

function forumHasFirebaseSession() {
    try {
        return !!(typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser);
    } catch (_) {
        return false;
    }
}

/**
 * Identité à enregistrer (nouveau message, réponse, vote) : le courriel du compte Firebase prime sur
 * localStorage quand il existe — aligné avec les règles Firestore (mail == token.email) et évite
 * d’enregistrer un pseudo issu d’un ancien profil avec le mail d’un autre compte encore connecté.
 */
function forumResolveAuthorForWrite() {
    var name = String(window.nameUser || localStorage.getItem("nameUser") || "anonyme").trim() || "anonyme";
    var mail = String(window.mailUser || localStorage.getItem("mailUser") || "").trim().toLowerCase();
    if (!mail) {
        mail = String(localStorage.getItem("mailUser") || "anonyme@blog.alfamous.ca")
            .trim()
            .toLowerCase();
    }
    var fe = forumFirebaseEmailLc();
    if (fe) {
        mail = fe;
        var lsMail = String(localStorage.getItem("mailUser") || "").trim().toLowerCase();
        if (lsMail !== fe) {
            try {
                localStorage.setItem("mailUser", fe);
                window.mailUser = fe;
                mailUser = fe;
            } catch (_) { }
        }
    }
    return { name: name, mail: mail };
}

function forumIsLoggedReal() {
    const m = forumGetMail();
    if (!m) return false;
    if (typeof zcIsAnonymeCourriel === 'function' && zcIsAnonymeCourriel(m)) return false;
    return m !== 'anonyme@blog.alfamous.ca';
}

/** Message fugitif si un visiteur anonyme tente de répondre (bouton Répondre reste visible). */
function forumNotifyReplyNeedsLogin() {
    const F = getForumStrings();
    const msg = F.replyNeedsLogin || "Connectez-vous pour participer au débat.";
    if (typeof alertMsgBoxTemp === "function") {
        alertMsgBoxTemp(msg, "orange", 4200);
    } else {
        forumMsgBox(msg);
    }
}
/** Auteur du fil : source de vérité = courriel du document vs profil (localStorage) et vs e-mail du compte Firebase. */
function forumPostAuthorMatches(data) {
    if (!data) return false;
    const a = String(data.mail || "").trim().toLowerCase();
    if (!a) return false;
    const b = forumGetMail();
    if (b && a === b) return true;
    const fe = forumFirebaseEmailLc();
    return !!(fe && a === fe);
}

/**
 * Actions « auteur du fil » : même courriel que le document + session Firebase (profil réel, e-mail Firebase, ou anonyme avec ce mail).
 */
function forumOwnerActionsAllowed(data) {
    if (!data || !forumPostAuthorMatches(data)) return false;
    if (forumIsLoggedReal()) return true;
    if (forumFirebaseEmailLc()) return true;
    return forumHasFirebaseSession();
}
/** Réponse forum : chaîne historique ou { html, mail, name? }. */
function forumNormalizeReply(r) {
    if (r && typeof r === 'object' && !Array.isArray(r) && (r.html != null || r.h != null)) {
        return {
            html: String(r.html != null ? r.html : r.h),
            mail: String(r.mail || r.m || '').trim().toLowerCase(),
            name: String(r.name || r.n || '').trim()
        };
    }
    return { html: String(r || ''), mail: '', name: '' };
}
function forumCanDeleteReplyNorm(norm) {
    if (forumGetNiveau() >= 2) return true;
    const m = String(norm.mail || "").trim().toLowerCase();
    if (!m) return false;
    const my = forumGetMail();
    if (my && m === my) return true;
    const fe = forumFirebaseEmailLc();
    return !!(fe && m === fe);
}

/** Bouton Valider : uniquement pour les messages issus d’une demande de validation (action stockée « Validation »). */
function forumActionNeedsValidation(action) {
    return String(action || "").trim() === "Validation";
}

/** Évite de dupliquer la mention de validation en fin de message. */
function forumPlainHasValidationStamp(plainLower) {
    return /validé\s*par|validated\s*by|اعتمد|validado\s*por|yettwasentem/i.test(String(plainLower || ""));
}

function forumNormalizeSubjectKey(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/\+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function forumBuildReplyFromFreeText(text, name, mail, dateStr) {
    var replyBodyHtml;
    try {
        replyBodyHtml = typeof formatLienForum === "function"
            ? formatLienForum(text)
            : String(text).replace(/(\r\n|\r|\n)/g, "<br>");
    } catch (_) {
        replyBodyHtml = String(text).replace(/(\r\n|\r|\n)/g, "<br>");
    }
    var sigUser = escapeHtmlForum(name);
    var sigDate = escapeHtmlForum(dateStr || new Date().toLocaleString());
    return {
        html: replyBodyHtml + '<br><span class="zc-forum-reply-sig">@' + sigUser + " · " + sigDate + "</span>",
        mail: String(mail || "").trim().toLowerCase(),
        name: String(name || "")
    };
}

async function forumFindExistingTopicBySubjectKey(subjectKey) {
    if (!subjectKey) return null;
    try {
        const q1 = await db.collection("forumMessages")
            .where("sujetKey", "==", subjectKey)
            .limit(5)
            .get();
        if (!q1.empty) {
            const d0 = q1.docs[0];
            return { id: d0.id, data: d0.data() };
        }
    } catch (_) { }
    try {
        const q2 = await db.collection("forumMessages")
            .orderBy("timestamp", "desc")
            .limit(300)
            .get();
        let match = null;
        q2.forEach((doc) => {
            if (match) return;
            const d = doc.data() || {};
            const k = forumNormalizeSubjectKey(d.sujet || "");
            if (k && k === subjectKey) match = { id: doc.id, data: d };
        });
        return match;
    } catch (_) {
        return null;
    }
}

/** Sujet déjà posté par le même auteur (mail) — pour fils perso / notes. */
async function forumFindExistingTopicBySubjectKeyAndAuthor(subjectKey, authorMail) {
    const m = String(authorMail || "").trim().toLowerCase();
    if (!subjectKey || !m) return null;
    try {
        const q1 = await db.collection("forumMessages")
            .where("sujetKey", "==", subjectKey)
            .where("mail", "==", m)
            .limit(5)
            .get();
        if (!q1.empty) {
            const d0 = q1.docs[0];
            return { id: d0.id, data: d0.data() };
        }
    } catch (_) { }
    try {
        const q2 = await db.collection("forumMessages")
            .orderBy("timestamp", "desc")
            .limit(400)
            .get();
        let match = null;
        q2.forEach((doc) => {
            if (match) return;
            const d = doc.data() || {};
            const k = forumNormalizeSubjectKey(d.sujet || "");
            const dm = String(d.mail || "").trim().toLowerCase();
            if (k && k === subjectKey && dm === m) match = { id: doc.id, data: d };
        });
        return match;
    } catch (_) {
        return null;
    }
}

function forumBuildReplyFromExistingPost(postData) {
    if (!postData || typeof postData !== "object") return null;
    const rawHtml = String(postData.message || "").trim();
    if (!rawHtml) return null;
    let dateTxt = "";
    try {
        if (postData.timestamp && typeof postData.timestamp.toDate === "function") {
            dateTxt = postData.timestamp.toDate().toLocaleString();
        }
    } catch (_) { }
    if (!dateTxt) dateTxt = new Date().toLocaleString();
    const sigUser = escapeHtmlForum(String(postData.name || "anonyme"));
    const sigDate = escapeHtmlForum(String(dateTxt));
    return {
        html: rawHtml + '<br><span class="zc-forum-reply-sig">@' + sigUser + " · " + sigDate + "</span>",
        mail: String(postData.mail || "").trim().toLowerCase(),
        name: String(postData.name || "")
    };
}

async function forumDeleteDuplicateTopics() {
    if (forumGetNiveau() <= 2) {
        forumMsgBox("Action réservée au niveau > 2.");
        return;
    }
    if (!window.confirm("Supprimer/Fusionner les sujets en doublon ?")) return;
    try {
        forumMsgBox("Analyse des doublons en cours...");
        const snap = await db.collection("forumMessages")
            .orderBy("timestamp", "desc")
            .limit(800)
            .get();
        const keepers = new Map();
        const dups = [];
        snap.forEach((doc) => {
            const d = doc.data() || {};
            const key = forumNormalizeSubjectKey(d.sujet || "");
            if (!key) return;
            if (!keepers.has(key)) {
                keepers.set(key, { id: doc.id, data: d });
            } else {
                dups.push({ id: doc.id, data: d, key: key, keeper: keepers.get(key) });
            }
        });
        if (!dups.length) {
            forumMsgBox("Aucun doublon trouvé.");
            return;
        }
        let deleted = 0;
        let merged = 0;
        for (const item of dups) {
            const keeperRef = db.collection("forumMessages").doc(item.keeper.id);
            const dupRef = db.collection("forumMessages").doc(item.id);
            const repMain = forumBuildReplyFromExistingPost(item.data);
            const oldRepsRaw = Array.isArray(item.data.reponses) ? item.data.reponses : [];
            const oldReps = oldRepsRaw.map((r) => {
                if (r && typeof r === "object" && !Array.isArray(r)) return r;
                return { html: String(r || ""), mail: "", name: "" };
            }).filter((r) => String(r.html || "").trim() !== "");
            const toMerge = [];
            if (repMain) toMerge.push(repMain);
            oldReps.forEach((r) => toMerge.push(r));
            for (const r of toMerge) {
                await keeperRef.update({
                    reponses: firebase.firestore.FieldValue.arrayUnion(r),
                    sujetKey: item.key
                });
                merged++;
            }
            await dupRef.delete();
            deleted++;
        }
        forumMsgBox(`Doublons supprimés: ${deleted} | Réponses fusionnées: ${merged}`);
    } catch (e) {
        console.error("forumDeleteDuplicateTopics", e);
        forumMsgBox("Erreur pendant la suppression des doublons.");
    }
}
window.forumDeleteDuplicateTopics = forumDeleteDuplicateTopics;


//////////////////////////////////////////////FIN PARAMETRES CONNEXIONS
function sendMessage(action) {
    const ov = document.getElementById("popupCommentaireOverlay");
    const popupOpen =
      ov &&
      (ov.style.display === "flex" ||
        ov.style.display === "block" ||
        (typeof window.getComputedStyle === "function" &&
          window.getComputedStyle(ov).display !== "none"));
    const popupMot = document.getElementById("popupInputMot");
    const mainMot = document.getElementById("mot");
    const rawMot =
      popupOpen && popupMot && String(popupMot.value || "").trim() !== ""
        ? popupMot.value
        : (mainMot && mainMot.value) || "";
    mot = String(rawMot).trim();
    if (mainMot && mot) mainMot.value = mot;
    commentaire = document.getElementById('commentaires').value.trim();
    //commentaire = formatLienForum(commentaire);
    if (!commentaire) return;//vient de prefill 
    var msgDiv = document.getElementById('user-info');
    // Vérifie si "action" est un objet événement (PointerEvent)
    if (typeof action !== 'string') {
        action = 'Mail';  // Remplace par une valeur par défaut si nécessaire
    }

    var _forumAu = forumResolveAuthorForWrite();
    var name = _forumAu.name;
    var mail = _forumAu.mail;
    var dateModif = new Date().toLocaleString(); // Obtenir la date et l'heure actuelles sous forme lisible
    msgDiv.innerHTML = "Envoi du message...";

    const subjectKey = forumNormalizeSubjectKey(mot);
    const actionStr = String(action || "").trim();
    const actionNorm = actionStr.toLowerCase();
    const modeNorm = String(
        (typeof modeCommentaire !== "undefined" && modeCommentaire != null)
            ? modeCommentaire
            : (typeof window !== "undefined" ? window.modeCommentaire : "")
    ).trim().toLowerCase();
    // Robustesse: suppression depuis "Mes Commentaires" peut arriver avec variantes
    // (Del, del, supprimer, mode global encore positionné sur supprimer).
    const forcePrivate =
        actionNorm === "del" ||
        actionNorm === "supprimer" ||
        modeNorm === "supprimer";

    // Sujet unique (forum): si sujet déjà présent, on ajoute une réponse au fil existant.
    // Sinon on crée un nouveau sujet.
    const postOrReply = async () => {
        if (subjectKey) {
            msgDiv.innerHTML = "Recherche d’un sujet existant...";
            const existing = await forumFindExistingTopicBySubjectKeyAndAuthor(subjectKey, mail);
            if (existing && existing.id) {
                const docRef = db.collection("forumMessages").doc(existing.id);
                const actionPrefix = (actionStr && actionStr !== "msgForum") ? `[${actionStr}] ` : "";
                const newReply = forumBuildReplyFromFreeText(actionPrefix + commentaire, name, mail, dateModif);
                await docRef.update({
                    reponses: firebase.firestore.FieldValue.arrayUnion(newReply),
                    repondu: false,
                    lastReplyAt: firebase.firestore.FieldValue.serverTimestamp(),
                    sujetKey: subjectKey,
                    ...(forcePrivate ? { isPrivate: true } : {})
                });
                try {
                    const snap = await docRef.get();
                    if (snap.exists) forumTryNotifyAuthorOfNewReply(existing.id, snap.data(), newReply);
                } catch (_) { }
                document.getElementById('commentaires').value = '';
                msgDiv.innerHTML = 'Sujet existant détecté sur le forum.';
                try {
                    if (typeof alertMsgBoxTemp === "function") {
                        alertMsgBoxTemp("Sujet existant détecté sur le forum. Message ajouté comme réponse.", "green", 3200);
                    }
                } catch (_) { }
                addDbCollectionUsers('historiqueActions', name, mail, mot, commentaire, "Reply");
                hauteurParDefaut('commentaires');
                return;
            }
        }

        await db.collection('forumMessages').add({
            name: name,
            mail: mail,
            sujet: mot,
            sujetKey: subjectKey,
            message: commentaire,
            action: action,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            isPrivate: forcePrivate ? true : false
        });
        document.getElementById('commentaires').value = '';
        msgDiv.innerHTML = 'Message envoyé avec succès';
        addDbCollectionUsers('historiqueActions', name, mail, mot, commentaire, action);
        hauteurParDefaut('commentaires');
    };

    postOrReply().catch(error => {
        console.error("Erreur lors de l'envoi du message: ", error);
        msgDiv.innerHTML = '<p style="color: red;">' + tMsg('forumSendErrorRetry') + '</p>';
    });

}

// escapeHtmlForum : fourni globalement par jsZC/zc-utils.js (alias de zc.escapeSimple).

/** Libellés forum (alignés sur uiLang / getLang). */
const FORUM_I18N = {
    fr: {
        pageTitle: "Forum des idées",
        actionsPanelTitle: "Actions",
        lead: "Propositions, questions et retours sur le lexique et l’application.",
        newPost: "Nouveau message",
        newPostTitle: "Écrire un nouveau message",
        welcomePrefix: "Bienvenue, ",
        levelLabel: "Niveau ",
        welcomeLoginBtn: "Connexion",
        welcomeLogoutBtn: "Déconnexion",
        subjectLabel: "Sujet",
        emptySubject: "—",
        replies: "Réponses",
        validate: "Valider",
        validateTitle: "Valider (modération)",
        deleteMsg: "Supprimer",
        deleteTitle: "Supprimer le message",
        editForum: "Modifier",
        editForumTitle: "Modifier ce message",
        loadMoreForum: "Charger plus de messages",
        forumUpdated: "Message mis à jour.",
        forumEditEmpty: "Remplissez le sujet et le message.",
        forumEditDenied: "Connexion requise ou droits insuffisants.",
        privateThreadAccessDenied: "Ce fil est privé : réservé à son auteur.",
        forumEditReplyEmpty: "Saisissez le texte de la réponse.",
        editPostTitle: "Modifier les posts @%s",
        editPostAuthorFallback: "…",
        forumEditBodyLabel: "Texte",
        forumEditClearFieldTitle: "Effacer le champ",
        forumEditCopyFieldTitle: "Copier dans le presse-papiers",
        privacyPrivate: "Privé",
        privacyPublic: "Public",
        privacyCheckboxHint: "Coché : privé. Décoché : public.",
        suggestThreadLoading: "Chargement de vos titres…",
        suggestThreadEmpty: "Aucun titre de fil pour votre compte pour l’instant.",
        suggestThreadNone: "Aucune correspondance.",
        suggestThreadAria: "Suggestions : titres de vos fils sur le forum",
        editReplyTitle: "Modifier la réponse",
        forumReplyUpdated: "Réponse enregistrée.",
        deleteReplyDenied: "Vous ne pouvez pas supprimer cette réponse.",
        answered: "Traité",
        actionValidatedBadge: "Validé",
        validatedByPrefix: "validé par:",
        actionTypeTitle: "Type d’envoi",
        sourceTypeTitle: "Origine / visibilité",
        sourceCommentsPublic: "Commentaires · Public",
        sourceNotesPrivate: "Notes · Privé",
        sourceNotesPublic: "Notes · Public",
        comment: "Commenter",
        commentTitle: "Ajouter au lexique ou au Coran : onglet Ajouter, texte du message prérempli",
        reply: "Répondre",
        replyTitle: "Répondre ici",
        replyNeedsLogin: "Connectez-vous pour participer au débat.",
        share: "Partager",
        shareTitle: "Copier le lien vers ce message",
        likeTitle: "Utile",
        unlikeTitle: "Pas utile",
        deleteReplyTitle: "Supprimer cette réponse",
        sendReply: "Envoyer",
        cancelReply: "Annuler",
        cancelReplyTitle: "Annuler la réponse",
        sendReplyTitle: "Envoyer la réponse",
        replyPlaceholder: "Votre réponse…",
        repliesStart: "Début des réponses",
        unknownDate: "Inconnu",
        defaultAction: "Ajout",
        replyPopupTitle: "Répondre au message",
        replyPopupContext: "Publication de @%s",
        popupClose: "Fermer",
        readerLabel: "Parcourir et lire les messages",
        readerPrimaryToolbarAria: "Nouveau message et notes personnelles",
        readerSearchPlaceholder: "Rechercher dans les sujets, textes et réponses…",
        readerResultCount: "%n message(s) trouvé(s) / %t",
        readerOpenTitle: "Lire ce message dans une fenêtre dédiée",
        readerClose: "Fermer",
        readerClearSearch: "Effacer la recherche",
        readerMessageNumAria: "Message n°%n",
        repliesCountTitle: "%n réponse(s)",
        repliesCountAria: "%n réponse(s) au message",
        jumpToRepliesTitle: "Ouvrir le message et aller aux réponses",
        notifyBellTitle: "Réponses à vos sujets",
        notifyBellAria: "Notifications : nouvelles réponses à vos messages du forum",
        notifyEmpty: "Aucune notification pour le moment.",
        notifyItemMeta: "Réponse de @%s",
        notifyPanelHeading: "Notifications",
        notifyRowBellTitle: "Réponse non lue à ce message",
        notifyRowBellAria: "Notification : nouvelle réponse à ce message",
        forumNotesBtn: "Notes",
        forumNotesTitle: "Notes personnelles : titre + texte (fil privé ou public)",
        dedupeTopicsTitle: "Fusionner ou supprimer les sujets en doublon",
        welcomeMoreToggleTitle: "Plus d’actions (libellés complets)",
        welcomeMoreCollapseTitle: "Réduire le menu des commandes",
        welcomeShortComment: "Commentaires",
        readerWelcomeToolbarAria: "Notifications, connexion, commentaires, notes et menu d’actions",
        forumShellHelpBtnTitle: "Règles du forum et collaboration",
        forumShellHelpTitle: "Collaborer et utiliser le forum",
        forumShellHelpP1: "Le forum sert à <strong>échanger avec respect</strong> : argumentez sur le fond, évitez les attaques personnelles et le hors-sujet prolongé.",
        forumShellHelpP2: "<strong>Pas de spam</strong>, pas de contenu illégal ou offensant. Le lexique et le Coran méritent un ton sérieux et soigné.",
        forumShellHelpP3: "Un fil peut être <strong>privé</strong> (visible seulement par vous) ou <strong>public</strong> (lu par les visiteurs du forum) : choisissez selon le contenu.",
        forumShellHelpP4: "Le <strong>texte coranique</strong> n’est pas modifié sur le site : seuls les <strong>commentaires</strong> associés aux versets peuvent faire l’objet d’<strong>ajouts ou de corrections</strong> via les parcours prévus (<strong>onglet Ajouter</strong>, commentaires structurés, etc.). Pour le <strong>lexique</strong> ou l’application, le forum et ces canaux restent les supports d’échange prévus.",
        forumShellHelpP5: "L’équipe peut <strong>modérer</strong> (validation, suppression) conformément aux règles du site. En cas de doute, passez par <strong>Contact</strong> pour une demande de collaboration."
    },
    en: {
        pageTitle: "Ideas forum",
        actionsPanelTitle: "Actions",
        lead: "Suggestions, questions and feedback on the lexicon and the app.",
        newPost: "New post",
        newPostTitle: "Write a new message",
        welcomePrefix: "Welcome, ",
        levelLabel: "Level ",
        welcomeLoginBtn: "Sign in",
        welcomeLogoutBtn: "Sign out",
        subjectLabel: "Subject",
        emptySubject: "—",
        replies: "Replies",
        validate: "Validate",
        validateTitle: "Validate (moderation)",
        deleteMsg: "Delete",
        deleteTitle: "Delete this message",
        editForum: "Edit",
        editForumTitle: "Edit this post",
        loadMoreForum: "Load more messages",
        forumUpdated: "Post updated.",
        forumEditEmpty: "Fill in subject and message.",
        forumEditDenied: "Sign in required or insufficient rights.",
        privateThreadAccessDenied: "This thread is private: only its author can open it.",
        forumEditReplyEmpty: "Enter reply text.",
        editPostTitle: "Edit Posts @%s",
        editPostAuthorFallback: "…",
        forumEditBodyLabel: "Text",
        forumEditClearFieldTitle: "Clear field",
        forumEditCopyFieldTitle: "Copy to clipboard",
        privacyPrivate: "Private",
        privacyPublic: "Public",
        privacyCheckboxHint: "Checked: private. Unchecked: public.",
        suggestThreadLoading: "Loading your topics…",
        suggestThreadEmpty: "No thread title yet for your account.",
        suggestThreadNone: "No match.",
        suggestThreadAria: "Suggestions: your forum thread titles",
        editReplyTitle: "Edit reply",
        forumReplyUpdated: "Reply saved.",
        deleteReplyDenied: "You cannot delete this reply.",
        answered: "Handled",
        actionValidatedBadge: "Validated",
        validatedByPrefix: "validated by:",
        actionTypeTitle: "Post type",
        sourceTypeTitle: "Origin / visibility",
        sourceCommentsPublic: "Comments · Public",
        sourceNotesPrivate: "Notes · Private",
        sourceNotesPublic: "Notes · Public",
        comment: "Comment",
        commentTitle: "Add to lexicon or Quran: Add tab, message text prefilled",
        reply: "Reply",
        replyTitle: "Reply here",
        replyNeedsLogin: "Sign in to join the discussion.",
        share: "Share",
        shareTitle: "Copy link to this post",
        likeTitle: "Helpful",
        unlikeTitle: "Not helpful",
        deleteReplyTitle: "Delete this reply",
        sendReply: "Send",
        cancelReply: "Cancel",
        cancelReplyTitle: "Cancel reply",
        sendReplyTitle: "Send reply",
        replyPlaceholder: "Your reply…",
        repliesStart: "Replies start",
        unknownDate: "Unknown",
        defaultAction: "Add",
        replyPopupTitle: "Reply to post",
        replyPopupContext: "Post by @%s",
        popupClose: "Close",
        readerLabel: "Browse and read messages",
        readerPrimaryToolbarAria: "New post and personal notes",
        readerSearchPlaceholder: "Search subjects, message text and replies…",
        readerResultCount: "%n message(s) found / %t",
        readerOpenTitle: "Read this message in a dedicated window",
        readerClose: "Close",
        readerClearSearch: "Clear search",
        readerMessageNumAria: "Message no. %n",
        repliesCountTitle: "%n replies",
        repliesCountAria: "%n replies to this post",
        jumpToRepliesTitle: "Open post and scroll to replies",
        notifyBellTitle: "Replies to your topics",
        notifyBellAria: "Notifications: new replies to your forum posts",
        notifyEmpty: "No notifications yet.",
        notifyItemMeta: "Reply from @%s",
        notifyPanelHeading: "Notifications",
        notifyRowBellTitle: "Unread reply on this post",
        notifyRowBellAria: "Notification: new reply to this post",
        forumNotesBtn: "Notes",
        forumNotesTitle: "Personal notes: thread title + body (private or public)",
        dedupeTopicsTitle: "Merge or remove duplicate forum topics",
        welcomeMoreToggleTitle: "More actions (full labels)",
        welcomeMoreCollapseTitle: "Collapse command menu",
        welcomeShortComment: "Comments",
        readerWelcomeToolbarAria: "Notifications, sign-in, comments, notes, and more actions",
        forumShellHelpBtnTitle: "Forum rules and collaboration",
        forumShellHelpTitle: "Collaborate and use the forum",
        forumShellHelpP1: "The forum is for <strong>respectful exchange</strong>: argue on substance, avoid personal attacks and long off-topic posts.",
        forumShellHelpP2: "<strong>No spam</strong>, illegal or abusive content. The lexicon and Quran deserve a careful, serious tone.",
        forumShellHelpP3: "A thread can be <strong>private</strong> (only you) or <strong>public</strong> (visible to forum visitors): pick what fits your content.",
        forumShellHelpP4: "The <strong>Quranic text</strong> itself is not edited on the site: only <strong>comments</strong> tied to verses can be added or revised through the intended flows (<strong>Add</strong> tab, structured comments, etc.). For the <strong>lexicon</strong> or the app, the forum and those channels remain the intended ways to collaborate.",
        forumShellHelpP5: "The team may <strong>moderate</strong> (validate, remove) per site rules. If unsure, use <strong>Contact</strong> for collaboration requests."
    },
    ar: {
        pageTitle: "منتدى الأفكار",
        actionsPanelTitle: "إجراءات",
        lead: "اقتراحات وأسئلة وملاحظات حول المعجم والتطبيق.",
        newPost: "رسالة جديدة",
        newPostTitle: "كتابة رسالة جديدة",
        welcomePrefix: "أهلاً، ",
        levelLabel: "المستوى ",
        subjectLabel: "الموضوع",
        emptySubject: "—",
        replies: "الردود",
        validate: "تأكيد",
        validateTitle: "تأكيد (إشراف)",
        deleteMsg: "حذف",
        deleteTitle: "حذف هذه الرسالة",
        editForum: "تعديل",
        editForumTitle: "تعديل هذه الرسالة",
        loadMoreForum: "تحميل المزيد",
        forumUpdated: "تم تحديث الرسالة.",
        forumEditEmpty: "أدخل الموضوع والنص.",
        forumEditDenied: "يلزم الاتصال أو لا صلاحية.",
        privateThreadAccessDenied: "هذا النقاش خاص ولا يظهر إلا لصاحبه.",
        forumEditReplyEmpty: "أدخل نص الرد.",
        editPostTitle: "تعديل المنشورات @%s",
        editPostAuthorFallback: "…",
        forumEditBodyLabel: "نص",
        forumEditClearFieldTitle: "مسح الحقل",
        forumEditCopyFieldTitle: "نسخ إلى الحافظة",
        privacyPrivate: "خاص",
        privacyPublic: "عام",
        privacyCheckboxHint: "محدد: خاص. غير محدد: عام.",
        suggestThreadLoading: "جاري تحميل عناوينك…",
        suggestThreadEmpty: "لا عنوان نقاش بعد لهذا الحساب.",
        suggestThreadNone: "لا يوجد تطابق.",
        suggestThreadAria: "اقتراحات: عناوين نقاشاتك في المنتدى",
        editReplyTitle: "تعديل الرد",
        forumReplyUpdated: "تم حفظ الرد.",
        deleteReplyDenied: "لا يمكنك حذف هذا الرد.",
        answered: "مُعالَج",
        actionValidatedBadge: "مُعتمد",
        validatedByPrefix: "اعتمد من:",
        actionTypeTitle: "نوع الإرسال",
        sourceTypeTitle: "المصدر / مستوى الظهور",
        sourceCommentsPublic: "تعليقات · عام",
        sourceNotesPrivate: "ملاحظات · خاص",
        sourceNotesPublic: "ملاحظات · عام",
        comment: "تعليق",
        commentTitle: "إضافة للمعجم أو المصحف: تبويب إضافة، نص الرسالة مُعبأ مسبقًا",
        reply: "رد",
        replyTitle: "الرد هنا",
        replyNeedsLogin: "سجّل الدخول للمشاركة في النقاش.",
        share: "مشاركة",
        shareTitle: "نسخ الرابط لهذه المشاركة",
        likeTitle: "مفيد",
        unlikeTitle: "غير مفيد",
        deleteReplyTitle: "حذف هذا الرد",
        sendReply: "إرسال",
        cancelReply: "إلغاء",
        cancelReplyTitle: "إلغاء الرد",
        sendReplyTitle: "إرسال الرد",
        replyPlaceholder: "ردك…",
        repliesStart: "بداية الردود",
        unknownDate: "غير معروف",
        defaultAction: "إضافة",
        replyPopupTitle: "الرد على الرسالة",
        replyPopupContext: "رسالة من @%s",
        popupClose: "إغلاق",
        readerLabel: "تصفح وقراءة الرسائل",
        readerPrimaryToolbarAria: "رسالة جديدة وملاحظات شخصية",
        readerSearchPlaceholder: "بحث في المواضيع والنصوص والردود…",
        readerResultCount: "%n رسالة مطابقة / %t",
        readerOpenTitle: "قراءة هذه الرسالة في نافذة مخصصة",
        readerClose: "إغلاق",
        readerClearSearch: "مسح البحث",
        readerMessageNumAria: "الرسالة رقم %n",
        repliesCountTitle: "%n رد/ردود",
        repliesCountAria: "%n رد على الرسالة",
        jumpToRepliesTitle: "فتح الرسالة والانتقال إلى الردود",
        notifyBellTitle: "ردود على مواضيعك",
        notifyBellAria: "تنبيهات: ردود جديدة على رسائلك في المنتدى",
        notifyEmpty: "لا توجد تنبيهات حالياً.",
        notifyItemMeta: "رد من @%s",
        notifyPanelHeading: "التنبيهات",
        notifyRowBellTitle: "رد غير مقروء على هذه الرسالة",
        notifyRowBellAria: "تنبيه: رد جديد على هذه الرسالة",
        forumNotesBtn: "ملاحظات",
        forumNotesTitle: "ملاحظات شخصية: عنوان النقاش والنص (خاص أو عام)",
        dedupeTopicsTitle: "دمج أو حذف مواضيع مكررة في المنتدى",
        welcomeMoreToggleTitle: "المزيد من الإجراءات (نصوص كاملة)",
        welcomeMoreCollapseTitle: "طي قائمة الأوامر",
        welcomeShortComment: "تعليقات",
        readerWelcomeToolbarAria: "إشعارات، دخول، تعليقات، ملاحظات، وقائمة إجراءات",
        forumShellHelpBtnTitle: "قواعد المنتدى والتعاون",
        forumShellHelpTitle: "التعاون واستخدام المنتدى",
        forumShellHelpP1: "المنتدى لـ<strong>حوار محترم</strong>: ناقش الفكرة وتجنب الشخصنة والخروج الطويل عن الموضوع.",
        forumShellHelpP2: "<strong>لا إزعاجاً</strong> ولا محتوى غير قانوني أو مسيء. يستحق المعجم والقرآن جدية ولياقة.",
        forumShellHelpP3: "قد يكون النقاش <strong>خاصاً</strong> (أنت فقط) أو <strong>عاماً</strong> (للزوار): اختر حسب المحتوى.",
        forumShellHelpP4: "لا يُعدَّل <strong>نصُّ القرآن</strong> على الموقع؛ يمكن اقتراح <strong>إضافات أو تصحيحات</strong> على <strong>التعليقات</strong> المرتبطة بالآيات عبر المسارات المخصّصة (<strong>تبويب الإضافة</strong>، تعليقات منظمة، إلخ). بالنسبة إلى <strong>المعجم</strong> أو التطبيق، يبقى المنتدى وهذه القنوات وسائل التعاون المحدّدة.",
        forumShellHelpP5: "قد <strong>يشرف</strong> الفريق على المحتوى (اعتماد، حذف) وفق قواعد الموقع. للاستفسار أو التعاون استخدم <strong>اتصل بنا</strong>."
    },
    kab: {
        pageTitle: "Lmunada n usenfar",
        actionsPanelTitle: "Tigawin",
        lead: "Iseɣnen, isteqsiyen d yiriyen ɣef umawal d usnas.",
        newPost: "Tuzna tamaynut",
        newPostTitle: "Aru tuzna tamaynut",
        welcomePrefix: "Ansuf, ",
        levelLabel: "Aswir ",
        welcomeLoginBtn: "Kcem",
        welcomeLogoutBtn: "Ffeɣ",
        subjectLabel: "Asentel",
        emptySubject: "—",
        replies: "Tiririyin",
        validate: "Sentem",
        validateTitle: "Sentem (amɛassen)",
        deleteMsg: "Kkes",
        deleteTitle: "Kkes tuzna",
        editForum: "Ẓreg",
        editForumTitle: "Ẓreg tuzna",
        loadMoreForum: "Sali-d ugar n tznatin",
        forumUpdated: "Tuzna tettwaleqqem.",
        forumEditEmpty: "Ččar asentel d uḍris.",
        forumEditDenied: "Tuqqna neɣ ur tesɛiḍ ara izerfan.",
        privateThreadAccessDenied: "Asnflul-a uslig : kan umiḍan-is.",
        forumEditReplyEmpty: "Aru aḍris n tririt.",
        editPostTitle: "Ẓreg tifyirin @%s",
        editPostAuthorFallback: "…",
        forumEditBodyLabel: "Aḍris",
        forumEditClearFieldTitle: "Sfeḍ urti",
        forumEditCopyFieldTitle: "Nɣel ɣer tecfawt",
        privacyPrivate: "Uslig",
        privacyPublic: "Azayez",
        privacyCheckboxHint: "Yettwaxḍay: uslig. Ur yettwaxḍay ara: azayez.",
        suggestThreadLoading: "Asali n yizwal…",
        suggestThreadEmpty: "Ulac azwel n usnflul i umiḍan-ik akka.",
        suggestThreadNone: "Ulac amṣada.",
        suggestThreadAria: "Asumer: izwal n yisnfal-ik deg lmunada",
        editReplyTitle: "Ẓreg tririt",
        forumReplyUpdated: "Tririt tettwasekles.",
        deleteReplyDenied: "Ur tzemreḍ ara ad tekkseḍ tririt-a.",
        answered: "Yettwaddal",
        actionValidatedBadge: "Yettwasentem",
        validatedByPrefix: "yettwasentem s:",
        actionTypeTitle: "Anaw n tuzna",
        sourceTypeTitle: "Aɣbalu / anekcum",
        sourceCommentsPublic: "Iwenniten · Azayez",
        sourceNotesPrivate: "Iwenniten · Uslig",
        sourceNotesPublic: "Iwenniten · Azayez",
        comment: "Awennit",
        commentTitle: "Rnu ɣer umawal neɣ uqur’an: tab Ajouter, aḍris n yizen yettwacekkel",
        reply: "Err",
        replyTitle: "Err dagi",
        replyNeedsLogin: "Qqen akken ad ttekkiḍ deg usnaw.",
        share: "Bḍu",
        shareTitle: "Nɣel aseɣwen ɣer yiles-a",
        likeTitle: "Yelha",
        unlikeTitle: "Ur yelhi ara",
        deleteReplyTitle: "Kkes tiririt-a",
        sendReply: "Azen",
        cancelReply: "Sefsex",
        cancelReplyTitle: "Sefsex tiririt",
        sendReplyTitle: "Azen tririt",
        replyPlaceholder: "Tririt-ik…",
        repliesStart: "Tazwara n tririyin",
        unknownDate: "Arussin",
        defaultAction: "Rnu",
        replyPopupTitle: "Err ɣer yiles",
        replyPopupContext: "Tuzna s @%s",
        popupClose: "Mdel",
        readerLabel: "Snirem d wali tuznan",
        readerPrimaryToolbarAria: "Izen amaynut d iwenniten udmawanen",
        readerSearchPlaceholder: "Nadi deg yixfassen, aḍrisen d tririyin…",
        readerResultCount: "%n iznan yettwafren / %t",
        readerOpenTitle: "Ɣer tuzna-a deg usfaylu uslig",
        readerClose: "Mdel",
        readerClearSearch: "Sfeḍ anadi",
        readerMessageNumAria: "Tuzna n°%n",
        repliesCountTitle: "%n tririt",
        repliesCountAria: "%n tririt ɣer yiles",
        jumpToRepliesTitle: "Ldi yiles u ddu ɣer tririyin",
        notifyBellTitle: "Tririyin ɣer yixfassen-ik",
        notifyBellAria: "Ilɣa: tririyin timaynutin ɣer yizen-ik n lmunada",
        notifyEmpty: "Ulac ilɣa akka tura.",
        notifyItemMeta: "Tririt seg @%s",
        notifyPanelHeading: "Ilɣa",
        notifyRowBellTitle: "Tririt tarussint ur nettwali ara",
        notifyRowBellAria: "Ilɣa: tririt tamaynut ɣer yiles-a",
        forumNotesBtn: "Iwenniten",
        forumNotesTitle: "Iwenniten udmawan: azwel d uḍris (uslig neɣ azayez)",
        dedupeTopicsTitle: "Sdukkel neɣ kkes isental n lmunada i d-yettummidilen",
        welcomeMoreToggleTitle: "Ugar n tmahilin (awalen ummiden)",
        welcomeMoreCollapseTitle: "Ffer umuɣ n tmahilin",
        welcomeShortComment: "Iwenniten",
        readerWelcomeToolbarAria: "Ilɣa, tuqqna, iwenniten, tizmilin, u wahlu n tmahilin",
        forumShellHelpBtnTitle: "Ilugan n lmunada d lmeddakɛel",
        forumShellHelpTitle: "Mudd afus d useqdec n lmunada",
        forumShellHelpP1: "Lmunada i <strong>lmeskert s lḥif</strong>: mmeslay ɣef leṣdaq, ur truḥu ara ɣer yimdanen neɣ ɣer usentel yugar aṭas.",
        forumShellHelpP2: "<strong>War aspam</strong>, war agbur arussan neɣ iḥercan. Amawal d Leqran ḥeqqen lḥif d lebɣi.",
        forumShellHelpP3: "Yezmer usnflul ad yili <strong>uslig</strong> (kečč kan) neɣ <strong>azayez</strong> i yernan: ferḥ ed uḍris.",
        forumShellHelpP4: "<strong>Aḍris n Leqran</strong> ur yettwabeddel ara deg usmel; kan <strong>iwenniten</strong> i yellan ɣer yisebtaren n Leqran zemrent ad trnut neɣ ad twaẓregent s iberdan yellan (<strong>tab Rnu</strong>, iwenniten yettwasuddasen, atg). I <strong>umawal</strong> neɣ usnas, lmunada d yiberdan-a d tin n useqdec yettwaserten.",
        forumShellHelpP5: "Tarbaɛt tezmer ad <strong>tɛassen</strong> (sentem, kkes) akked ilugan n usmel. Ma tella ṭṭerfut, seqdec <strong>Anermis</strong> i usuter n umeddakɛel."
    },
    es: {
        pageTitle: "Foro de ideas",
        actionsPanelTitle: "Acciones",
        lead: "Propuestas, preguntas y comentarios sobre el léxico y la aplicación.",
        newPost: "Nuevo mensaje",
        newPostTitle: "Escribir un mensaje nuevo",
        welcomePrefix: "Bienvenido, ",
        levelLabel: "Nivel ",
        welcomeLoginBtn: "Iniciar sesión",
        welcomeLogoutBtn: "Cerrar sesión",
        subjectLabel: "Asunto",
        emptySubject: "—",
        replies: "Respuestas",
        validate: "Validar",
        validateTitle: "Validar (moderación)",
        deleteMsg: "Eliminar",
        deleteTitle: "Eliminar el mensaje",
        editForum: "Editar",
        editForumTitle: "Editar este mensaje",
        loadMoreForum: "Cargar más mensajes",
        forumUpdated: "Mensaje actualizado.",
        forumEditEmpty: "Complete asunto y texto.",
        forumEditDenied: "Inicie sesión o sin permisos.",
        privateThreadAccessDenied: "Este hilo es privado: solo su autor puede verlo.",
        forumEditReplyEmpty: "Escriba el texto de la respuesta.",
        editPostTitle: "Editar publicaciones @%s",
        editPostAuthorFallback: "…",
        forumEditBodyLabel: "Texto",
        forumEditClearFieldTitle: "Borrar campo",
        forumEditCopyFieldTitle: "Copiar al portapapeles",
        privacyPrivate: "Privado",
        privacyPublic: "Público",
        privacyCheckboxHint: "Marcado: privado. Sin marcar: público.",
        suggestThreadLoading: "Cargando sus títulos…",
        suggestThreadEmpty: "Aún no hay título de hilo para su cuenta.",
        suggestThreadNone: "Sin coincidencias.",
        suggestThreadAria: "Sugerencias: títulos de sus hilos en el foro",
        editReplyTitle: "Editar respuesta",
        forumReplyUpdated: "Respuesta guardada.",
        deleteReplyDenied: "No puede eliminar esta respuesta.",
        answered: "Tratado",
        actionValidatedBadge: "Validado",
        validatedByPrefix: "validado por:",
        actionTypeTitle: "Tipo de envío",
        sourceTypeTitle: "Origen / visibilidad",
        sourceCommentsPublic: "Comentarios · Público",
        sourceNotesPrivate: "Notas · Privado",
        sourceNotesPublic: "Notas · Público",
        comment: "Comentar",
        commentTitle: "Añadir al léxico o al Corán: pestaña Añadir, texto del mensaje rellenado",
        reply: "Responder",
        replyTitle: "Responder aquí",
        replyNeedsLogin: "Inicie sesión para participar en el debate.",
        share: "Compartir",
        shareTitle: "Copiar enlace a este mensaje",
        likeTitle: "Útil",
        unlikeTitle: "Poco útil",
        deleteReplyTitle: "Eliminar esta respuesta",
        sendReply: "Enviar",
        cancelReply: "Cancelar",
        cancelReplyTitle: "Cancelar respuesta",
        sendReplyTitle: "Enviar respuesta",
        replyPlaceholder: "Su respuesta…",
        repliesStart: "Inicio de respuestas",
        unknownDate: "Desconocido",
        defaultAction: "Añadir",
        replyPopupTitle: "Responder al mensaje",
        replyPopupContext: "Mensaje de @%s",
        popupClose: "Cerrar",
        readerLabel: "Explorar y leer mensajes",
        readerPrimaryToolbarAria: "Mensaje nuevo y notas personales",
        readerSearchPlaceholder: "Buscar en asuntos, textos y respuestas…",
        readerResultCount: "%n mensaje(s) encontrado(s) / %t",
        readerOpenTitle: "Leer este mensaje en ventana dedicada",
        readerClose: "Cerrar",
        readerClearSearch: "Borrar búsqueda",
        readerMessageNumAria: "Mensaje n.º %n",
        repliesCountTitle: "%n respuesta(s)",
        repliesCountAria: "%n respuestas al mensaje",
        jumpToRepliesTitle: "Abrir el mensaje e ir a las respuestas",
        notifyBellTitle: "Respuestas a tus temas",
        notifyBellAria: "Avisos: nuevas respuestas a tus mensajes del foro",
        notifyEmpty: "No hay avisos por ahora.",
        notifyItemMeta: "Respuesta de @%s",
        notifyPanelHeading: "Avisos",
        notifyRowBellTitle: "Respuesta sin leer en este mensaje",
        notifyRowBellAria: "Aviso: nueva respuesta a este mensaje",
        forumNotesBtn: "Notas",
        forumNotesTitle: "Notas personales: título y texto del hilo (privado o público)",
        dedupeTopicsTitle: "Fusionar o eliminar temas duplicados del foro",
        welcomeMoreToggleTitle: "Más acciones (textos completos)",
        welcomeMoreCollapseTitle: "Ocultar menú de comandos",
        welcomeShortComment: "Comentarios",
        readerWelcomeToolbarAria: "Notificaciones, sesión, comentarios, notas y más acciones",
        forumShellHelpBtnTitle: "Reglas del foro y colaboración",
        forumShellHelpTitle: "Colaborar y usar el foro",
        forumShellHelpP1: "El foro es para <strong>intercambio respetuoso</strong>: argumente sobre el fondo, evite ataques personales y temas ajenos prolongados.",
        forumShellHelpP2: "<strong>Sin spam</strong>, contenido ilegal u ofensivo. El léxico y el Corán merecen un tono cuidadoso y serio.",
        forumShellHelpP3: "Un hilo puede ser <strong>privado</strong> (solo usted) o <strong>público</strong> (visible en el foro): elija según el contenido.",
        forumShellHelpP4: "El <strong>texto coránico</strong> no se modifica en el sitio: solo los <strong>comentarios</strong> vinculados a los versículos pueden ampliarse o corregirse mediante los flujos previstos (pestaña <strong>Añadir</strong>, comentarios estructurados, etc.). Para el <strong>léxico</strong> o la aplicación, el foro y esos canales siguen siendo los medios previstos.",
        forumShellHelpP5: "El equipo puede <strong>moderar</strong> (validar, eliminar) según las reglas del sitio. Si duda, use <strong>Contacto</strong> para colaborar."
    }
};

function getForumLang() {
    try {
        if (typeof getLang === "function") return (getLang() || "fr").toLowerCase();
    } catch (_) { }
    return (localStorage.getItem("uiLang") || "fr").toLowerCase();
}

function getForumStrings() {
    const lc = getForumLang();
    if (lc === "ar") return FORUM_I18N.ar;
    if (lc === "en") return FORUM_I18N.en;
    if (lc === "kab") return FORUM_I18N.kab;
    if (lc === "es") return FORUM_I18N.es;
    return FORUM_I18N.fr;
}

function showForumShellHelp() {
    const F = getForumStrings();
    const lc = getForumLang();
    const isAr = lc === "ar";
    const dir = isAr ? "rtl" : "ltr";
    const align = isAr ? "right" : "left";
    const t = escapeHtmlForum(F.forumShellHelpTitle || "");
    const html =
        `<div dir="${dir}" style="line-height:1.5;text-align:${align};">` +
        `<h3 style="margin:.1rem 0 .55rem 0;color:#0f172a;">${t}</h3>` +
        `<p style="margin:.2rem 0 .45rem 0;color:#334155;">${F.forumShellHelpP1 || ""}</p>` +
        `<p style="margin:.2rem 0 .45rem 0;color:#334155;">${F.forumShellHelpP2 || ""}</p>` +
        `<p style="margin:.2rem 0 .45rem 0;color:#334155;">${F.forumShellHelpP3 || ""}</p>` +
        `<p style="margin:.2rem 0 .45rem 0;color:#334155;">${F.forumShellHelpP4 || ""}</p>` +
        `<p style="margin:.2rem 0 .45rem 0;color:#334155;">${F.forumShellHelpP5 || ""}</p>` +
        "</div>";
    if (typeof alertMsgBoxPopup === "function") {
        alertMsgBoxPopup(html);
    }
}

window.showForumShellHelp = showForumShellHelp;

function applyForumShellI18n() {
    const F = getForumStrings();
    const closeT = F.popupClose || "Fermer";
    document.querySelectorAll(".zc-forum-root").forEach(root => {
        root.setAttribute("dir", getForumLang() === "ar" ? "rtl" : "ltr");
        const newPostBtn = root.querySelector("#envoyerMailForum2");
        const label = newPostBtn && newPostBtn.querySelector(".zc-forum-newpost-label");
        if (label) label.textContent = F.newPost;
        if (newPostBtn) {
            newPostBtn.title = F.newPostTitle || "";
            newPostBtn.setAttribute("aria-label", F.welcomeShortComment || F.newPost || newPostBtn.getAttribute("aria-label") || "");
        }
        const pageTitleTextEl = root.querySelector(".zc-forum-page-title-text");
        if (pageTitleTextEl) pageTitleTextEl.textContent = F.pageTitle || "";
        else {
            const pageTitleEl = root.querySelector(".zc-forum-page-title");
            if (pageTitleEl) pageTitleEl.textContent = F.pageTitle || "";
        }
        const actionsPanelTitleEl = root.querySelector("#forumActionsPanelTitle");
        if (actionsPanelTitleEl) actionsPanelTitleEl.textContent = F.actionsPanelTitle || "Actions";
        const leadText = root.querySelector(".zc-forum-lead-text");
        if (leadText) leadText.textContent = F.lead || "";
        const notesBtn = root.querySelector(".js-forum-open-notes");
        const notesLab = notesBtn && notesBtn.querySelector(".zc-forum-notes-label");
        if (notesLab) notesLab.textContent = F.forumNotesBtn || "Notes";
        if (notesBtn) {
            notesBtn.title = F.forumNotesTitle || "";
            notesBtn.setAttribute("aria-label", F.forumNotesBtn || notesBtn.getAttribute("aria-label") || "");
        }
        const helpBtn = root.querySelector(".js-forum-shell-help");
        if (helpBtn) {
            const ht = F.forumShellHelpBtnTitle || F.popupClose || "Aide";
            helpBtn.title = ht;
            helpBtn.setAttribute("aria-label", ht);
        }
        const headClose = root.querySelector(".zc-forum-head-close");
        if (headClose) {
            headClose.title = closeT;
            headClose.setAttribute("aria-label", closeT);
        }
        const nBell = root.querySelector("#forumNotifyBell");
        if (nBell) {
            nBell.title = F.notifyBellTitle || "";
            nBell.setAttribute("aria-label", F.notifyBellAria || F.notifyBellTitle || "");
        }
        const nHead = document.getElementById("forumNotifyPanelHeading");
        if (nHead) nHead.textContent = F.notifyPanelHeading || "Notifications";
        const moreBtn = root.querySelector("#forumWelcomeMoreBtn");
        if (moreBtn) {
            const moreWrap = moreBtn.closest(".zc-forum-welcome-panel");
            if (moreWrap) {
                moreBtn.setAttribute(
                    "aria-expanded",
                    moreWrap.classList.contains("zc-panel-collapsed") ? "false" : "true"
                );
            }
            forumSyncWelcomeMoreToggleChrome(moreBtn, F);
            moreBtn.setAttribute("aria-label", moreBtn.title || F.welcomeMoreToggleTitle || "");
        }
        const welcomeTabBar = root.querySelector(".zc-forum-welcome-tab-icons");
        if (welcomeTabBar) {
            welcomeTabBar.setAttribute("aria-label", F.readerWelcomeToolbarAria || F.readerPrimaryToolbarAria || welcomeTabBar.getAttribute("aria-label") || "");
        }
    });
    try {
        if (typeof window.forumNotifyEnsureSubscribed === "function") window.forumNotifyEnsureSubscribed();
    } catch (_) { }
}

function applyForumReplyPopupI18n() {
    const F = getForumStrings();
    const box = document.querySelector(".zc-forum-reply-popup-box");
    if (box) box.setAttribute("dir", getForumLang() === "ar" ? "rtl" : "ltr");
    const title = document.getElementById("forumReplyPopupTitle");
    if (title) title.textContent = F.replyPopupTitle || F.reply;
    const cancel = document.getElementById("forumReplyCancel");
    const send = document.getElementById("forumReplySend");
    const closeX = document.getElementById("forumReplyCloseX");
    if (cancel) {
        cancel.textContent = F.cancelReply;
        cancel.title = F.cancelReplyTitle;
    }
    if (send) {
        const span = send.querySelector("span");
        if (span) span.textContent = F.sendReply;
        else send.textContent = F.sendReply;
        send.title = F.sendReplyTitle;
    }
    if (closeX) {
        const t = F.popupClose || "Fermer";
        closeX.title = t;
        closeX.setAttribute("aria-label", t);
    }
    const ta = document.getElementById("forumReplyTextarea");
    if (ta) ta.placeholder = F.replyPlaceholder;
}

function applyForumReaderI18n() {
    const F = getForumStrings();
    document.querySelectorAll(".zc-forum-reader-primary-actions").forEach((tb) => {
        tb.setAttribute("aria-label", F.readerPrimaryToolbarAria || tb.getAttribute("aria-label") || "");
    });
    document.querySelectorAll(".zc-forum-reader-search-label").forEach((lbl) => {
        lbl.textContent = F.readerLabel || "";
    });
    document.querySelectorAll(".zc-forum-reader-search-input").forEach((inp) => {
        inp.placeholder = F.readerSearchPlaceholder || "";
    });
    const tClr = F.readerClearSearch || "Effacer";
    document.querySelectorAll(".zc-forum-reader-clear").forEach((clr) => {
        clr.title = tClr;
        clr.setAttribute("aria-label", tClr);
    });
    const closeT = F.readerClose || F.popupClose || "Fermer";
    document.querySelectorAll("[id='forumReadCloseX']").forEach((cx) => {
        cx.title = closeT;
        cx.setAttribute("aria-label", closeT);
    });
    document.querySelectorAll("[id='forumReadCloseBtn']").forEach((cbtn) => {
        cbtn.textContent = closeT;
    });
    document.querySelectorAll("[id='forumReadReplyBtn']").forEach((rb) => {
        rb.title = F.replyTitle || F.reply;
        const sp = rb.querySelector(".zc-forum-read-btn-label");
        if (sp) sp.textContent = F.reply;
    });
    document.querySelectorAll("[id='forumReadShareBtn']").forEach((sb) => {
        sb.title = F.shareTitle || F.share;
        const sp = sb.querySelector(".zc-forum-read-btn-label");
        if (sp) sp.textContent = F.share;
    });
    document.querySelectorAll("[id='forumReadEditBtn']").forEach((eb) => {
        eb.title = F.editForumTitle || F.editForum;
        const sp = eb.querySelector(".zc-forum-read-btn-label");
        if (sp) sp.textContent = F.editForum;
    });
}

function forumApplyEditOverlayTitleIfOpen() {
    const editOv = forumGetOpenEditOverlay();
    if (!editOv) return;
    const titleEl = editOv.querySelector("#forumEditTitle");
    if (!titleEl) return;
    const F = getForumStrings();
    const author = String(window.__forumEditTitleAuthor || "").trim();
    const fb = F.editPostAuthorFallback || "…";
    const tpl = F.editPostTitle || "Edit Posts @%s";
    titleEl.textContent = tpl.replace("%s", author || fb);
}

function applyForumEditOverlayI18n() {
    const F = getForumStrings();
    document.querySelectorAll('label[for="forumEditSubject"]').forEach(function (subjLbl) {
        subjLbl.textContent = F.subjectLabel || "Sujet";
    });
    document.querySelectorAll('label[for="forumEditBody"]').forEach(function (bodyLbl) {
        bodyLbl.textContent = F.forumEditBodyLabel || "Texte";
    });
    const clearT = F.forumEditClearFieldTitle || "Effacer";
    const copyT = F.forumEditCopyFieldTitle || "Copier";
    ["forumEditSubjectClear", "forumEditBodyClear"].forEach(function (bid) {
        document.querySelectorAll("[id='" + bid + "']").forEach(function (b) {
            b.title = clearT;
            b.setAttribute("aria-label", clearT);
        });
    });
    ["forumEditSubjectCopy", "forumEditBodyCopy"].forEach(function (bid) {
        document.querySelectorAll("[id='" + bid + "']").forEach(function (b) {
            b.title = copyT;
            b.setAttribute("aria-label", copyT);
        });
    });
    forumApplyEditOverlayTitleIfOpen();
    const editOv = forumGetOpenEditOverlay();
    if (editOv) {
        syncForumEditPrivateLabel();
    }
}

let forumMessagesUnsub = null;
let lastForumSnapshot = null;
/** Contexte ouverture popup « Répondre » (id document Firestore + auteur affiché). */
let forumReplyPendingMessageId = null;
let forumReplyPendingAuthorName = null;
/** Messages affichés (même ordre / limite que la liste des cartes) pour recherche + lecteur. */
let forumReaderDocsCache = [];
let forumReadPendingMessageId = null;
/** Recherche forum : synchronisée par délégation (évite getElementById quand le forum est cloné). */
let forumReaderSearchQuery = "";

function forumPrefillSearchFromMot(force) {
    const activeInput = document.querySelector(".zc-forum-reader-search-input");
    const motMain = document.getElementById("mot");
    const injected = String(window.__forumPrefilTexte || "").trim();
    const localVal = String((activeInput && activeInput.value) || "").trim();
    const seed = String(
        force
            ? (injected || (motMain && motMain.value) || localVal || "")
            : localVal
    ).trim();
    if (!seed) return;
    forumReaderSearchQuery = seed;
    document.querySelectorAll(".zc-forum-reader-search-input").forEach((el) => {
        if (!el) return;
        if (force || !String(el.value || "").trim()) {
            el.value = seed;
        }
    });
    if (force) {
        try { window.__forumPrefilTexte = ""; } catch (_) { }
    }
}

/** Première liste visible (forum principal ou copie dans #contenuLocal). */
function forumReaderGetListUl() {
    const lists = document.querySelectorAll("ul.zc-forum-reader-list");
    for (let i = 0; i < lists.length; i++) {
        const ul = lists[i];
        if (ul.offsetParent !== null) return ul;
    }
    return document.getElementById("forumReaderList") || (lists.length ? lists[0] : null);
}

/**
 * Racine `.zc-forum-root` actuellement affichée (popup #contenuLocal ou page).
 * Évite getElementById sur les overlays dupliqués (clone innerHTML) qui ciblait #forum-container masqué.
 */
function forumGetActiveForumRoot() {
    const loc = document.getElementById("contenuLocal");
    if (loc) {
        const innerRoot = loc.querySelector(".zc-forum-root");
        if (innerRoot) {
            let shown = loc.style.display !== "none";
            try {
                if (typeof window.getComputedStyle === "function" && getComputedStyle(loc).display === "none") {
                    shown = false;
                }
            } catch (_) { }
            if (shown) return innerRoot;
        }
    }
    const roots = document.querySelectorAll(".zc-forum-root");
    for (let i = 0; i < roots.length; i++) {
        const r = roots[i];
        try {
            if (r.offsetParent !== null) return r;
        } catch (_) { }
    }
    return roots.length ? roots[0] : null;
}

function forumReadScopedGet(id) {
    const root = forumGetActiveForumRoot();
    if (root) {
        const el = root.querySelector("#" + id);
        if (el) return el;
    }
    return document.getElementById(id);
}

/** Garantit qu'un overlay forum est dans le même plan global (document.body). */
function forumLiftOverlayToBody(ov) {
    if (!ov || !document.body) return ov;
    if (ov.parentElement !== document.body) {
        try { document.body.appendChild(ov); } catch (_) { }
    }
    return ov;
}

/** Si Mes Notes (#afModalOverlay) est visible, l’overlay forum doit passer au-dessus (max z appelant, topZ pile). */
function forumApplyOverlayZAboveNotes(ov) {
    if (!ov) return;
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
    if (typeof window.zcZIndexPlaceOverlayAboveCaller === "function") {
        try {
            window.zcZIndexPlaceOverlayAboveCaller(caller, ov);
            return;
        } catch (_) { }
    }
    const zFn =
        typeof window.getNextZIndex === "function"
            ? window.getNextZIndex
            : typeof getNextZIndex === "function"
              ? getNextZIndex
              : null;
    if (zFn) {
        try {
            ov.style.zIndex = String(zFn());
        } catch (_) { }
    }
}

/** Overlay lecture ouvert (display flex), parmi les clones du forum. */
function forumGetOpenReadOverlay() {
    const candidates = document.querySelectorAll("[id='forumReadOverlay']");
    for (let i = 0; i < candidates.length; i++) {
        const o = candidates[i];
        try {
            if (o.style.display === "flex") return o;
            if (typeof getComputedStyle === "function" && getComputedStyle(o).display === "flex") return o;
        } catch (_) { }
    }
    return null;
}

/** Overlay édition forum ouvert (clone #contenuLocal ou page). */
function forumGetOpenEditOverlay() {
    const candidates = document.querySelectorAll("[id='forumEditOverlay']");
    for (let i = 0; i < candidates.length; i++) {
        const o = candidates[i];
        try {
            if (o.style.display === "flex") return o;
            if (typeof getComputedStyle === "function" && getComputedStyle(o).display === "flex") return o;
        } catch (_) { }
    }
    return null;
}

/** Champs sujet + liste de suggestions dans l’overlay édition actif (ou racine forum visible). */
function forumEditActiveSubjectFields() {
    const ov = forumGetOpenEditOverlay();
    if (ov) {
        return {
            ov,
            ul: ov.querySelector("#forumEditSubjectSuggest"),
            input: ov.querySelector("#forumEditSubject")
        };
    }
    const input = forumReadScopedGet("forumEditSubject");
    const wrap = input && input.closest(".zc-forum-edit-subject-field-wrap");
    const ul = wrap ? wrap.querySelector("#forumEditSubjectSuggest") : forumReadScopedGet("forumEditSubjectSuggest");
    return { ov: null, ul, input };
}

/** Texte de recherche : priorité au champ actif, sinon la valeur la plus longue parmi les champs. */
function forumReaderPickSearchText() {
    const active = document.activeElement;
    if (active && active.classList && active.classList.contains("zc-forum-reader-search-input")) {
        return active.value || "";
    }
    let best = forumReaderSearchQuery || "";
    document.querySelectorAll(".zc-forum-reader-search-input").forEach((el) => {
        const v = el.value || "";
        if (v.length > best.length) best = v;
    });
    return best;
}

function escapeRegexForum(s) {
    return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenizeForumHighlightTerms(text) {
    return Array.from(
        new Set(
            String(text || "")
                .split(/\s+/)
                .map((t) => t.trim())
                .filter(Boolean)
        )
    ).sort((a, b) => b.length - a.length);
}

function forumGetSearchPrefsForHighlight() {
    if (typeof window.zcGetSearchPrefs === "function") {
        try { return window.zcGetSearchPrefs(); } catch (_) { }
    }
    return {
        me: !!document.getElementById("paramRechercheMotEntier")?.checked,
        mc: !!document.getElementById("ordreExactCheckbox")?.checked
    };
}

function forumPickHighlightTexts() {
    const searchText = document.getElementById("searchInput")?.value || "";
    const motText = document.getElementById("mot")?.value || "";
    const forumText = forumReaderPickSearchText();
    const primary = tokenizeForumHighlightTerms(searchText);
    const fallback = tokenizeForumHighlightTerms(motText);
    const tertiary = tokenizeForumHighlightTerms(forumText);
    return { primary, fallback, tertiary };
}

function highlightForumTermsInNode(rootEl, terms, opts) {
    if (!rootEl || !terms || !terms.length) return 0;
    const options = opts || {};
    const wholeWord = !!options.wholeWord;
    const escaped = terms.map(escapeRegexForum);
    const src = escaped.join("|");
    const rx = wholeWord
        ? new RegExp("(^|[^\\p{L}\\p{N}_])(" + src + ")(?=$|[^\\p{L}\\p{N}_])", "giu")
        : new RegExp("(" + src + ")", "gi");
    let hits = 0;

    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);

    for (const node of textNodes) {
        const parent = node.parentElement;
        if (!parent) continue;
        if (/(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|PRE)/.test(parent.tagName)) continue;
        const txt = node.nodeValue || "";
        if (!txt.trim()) continue;
        if (!rx.test(txt)) continue;
        rx.lastIndex = 0;

        const frag = document.createDocumentFragment();
        let last = 0;
        if (wholeWord) {
            txt.replace(rx, (m, g1, g2, off) => {
                const start = off + String(g1 || "").length;
                const before = txt.slice(last, start);
                if (before) frag.appendChild(document.createTextNode(before));
                const mark = document.createElement("span");
                mark.className = "zc-term-hit";
                mark.textContent = String(g2 || "");
                frag.appendChild(mark);
                hits++;
                last = off + m.length;
                return m;
            });
        } else {
            txt.replace(rx, (m, _g1, off) => {
                if (off > last) frag.appendChild(document.createTextNode(txt.slice(last, off)));
                const mark = document.createElement("span");
                mark.className = "zc-term-hit";
                mark.textContent = m;
                frag.appendChild(mark);
                hits++;
                last = off + m.length;
                return m;
            });
        }
        if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
        parent.replaceChild(frag, node);
    }

    return hits;
}

function highlightForumPhraseInNode(rootEl, phrase, opts) {
    const q = String(phrase || "").trim();
    if (!q) return 0;
    return highlightForumTermsInNode(rootEl, [q], opts || {});
}

function applyForumHighlights(rootEl) {
    if (!rootEl) return;
    const prefs = forumGetSearchPrefsForHighlight();
    const wholeWord = !!prefs.me;
    const contig = !!prefs.mc;
    const searchText = forumReaderPickSearchText();
    const picks = forumPickHighlightTexts();
    const primaryPhrase = String(searchText || "").trim();
    const fallbackPhrase = String(document.getElementById("mot")?.value || "").trim();
    let hits = 0;
    if (contig) {
        if (primaryPhrase) hits = highlightForumPhraseInNode(rootEl, primaryPhrase, { wholeWord });
        if (!hits && fallbackPhrase) hits = highlightForumPhraseInNode(rootEl, fallbackPhrase, { wholeWord });
        if (!hits && picks.tertiary.length) highlightForumTermsInNode(rootEl, picks.tertiary, { wholeWord });
        return;
    }
    if (picks.primary.length) hits = highlightForumTermsInNode(rootEl, picks.primary, { wholeWord });
    if (!hits && picks.fallback.length) hits = highlightForumTermsInNode(rootEl, picks.fallback, { wholeWord });
    if (!hits && picks.tertiary.length) highlightForumTermsInNode(rootEl, picks.tertiary, { wholeWord });
}

/** Repère la carte message par id document Firestore. */
function findForumPostEl(scopeRoot, messageId) {
    if (!scopeRoot || messageId == null || messageId === "") return null;
    const sid = String(messageId);
    return Array.from(scopeRoot.querySelectorAll("[data-forum-msg-id]")).find(
        (el) => el.getAttribute("data-forum-msg-id") === sid
    );
}

/** Positionne le message dans le panneau scrollable sans animation (synchrone : appeler après layout, ex. dans un rAF). */
function forumInstantScrollPostIntoPane(messagesContainerForum, el) {
    if (!messagesContainerForum || !el) return;
    const sc = messagesContainerForum;
    const top =
        el.getBoundingClientRect().top -
        sc.getBoundingClientRect().top +
        sc.scrollTop;
    const target =
        top - (sc.clientHeight - Math.min(el.offsetHeight, sc.clientHeight)) / 2;
    const maxS = Math.max(0, sc.scrollHeight - sc.clientHeight);
    sc.scrollTop = Math.max(0, Math.min(maxS, target));
}

/** Après rendu : si `window.__forumScrollToMessageId` est défini, saut instantané dans la liste + surbrillance. */
function forumTryScrollToPendingMessage(messagesContainerForum) {
    const targetId = window.__forumScrollToMessageId;
    if (!targetId || !messagesContainerForum) return;
    const el = findForumPostEl(messagesContainerForum, targetId);
    window.__forumScrollToMessageId = "";
    if (!el) return;
    requestAnimationFrame(() => {
        forumInstantScrollPostIntoPane(messagesContainerForum, el);
        el.classList.add("zc-forum-reader-li--highlight");
        window.setTimeout(() => {
            try { el.classList.remove("zc-forum-reader-li--highlight"); } catch (_) { }
        }, 2800);
    });
}

function renderForumMessagesInto(_legacyMessagesContainer, snapshot) {
    const listHost = forumReaderGetListUl();
    const legacyBox = document.getElementById("messagesContainerForum");
    if (legacyBox) {
        legacyBox.innerHTML = "";
        legacyBox.style.display = "none";
    }
    if (!listHost || !snapshot) return;

    const lim = typeof window.__zcForumLimit === "number" && window.__zcForumLimit > 0
        ? window.__zcForumLimit
        : 100;
    try {
        window.__zcForumTotalAvailable = typeof snapshot.size === "number" ? snapshot.size : lim;
    } catch (_) {
        window.__zcForumTotalAvailable = lim;
    }
    forumReaderDocsCache = [];
    let messageCount = 0;

    snapshot.forEach(doc => {
        if (messageCount >= lim) return;
        forumReaderDocsCache.push({ id: doc.id, data: doc.data() });
        messageCount++;
    });
    forumReaderRenderList();
    forumTryScrollToPendingMessage(listHost);
}

function refreshForumI18n() {
    applyForumShellI18n();
    applyForumReplyPopupI18n();
    applyForumReaderI18n();
    applyForumEditOverlayI18n();
    try {
        if (typeof window.updateUserUI === "function") window.updateUserUI();
    } catch (_) { }
    if (lastForumSnapshot) renderForumMessagesInto(null, lastForumSnapshot);
    if (forumReplyPendingMessageId) {
        const ovOpen = document.getElementById("forumReplyOverlay");
        if (ovOpen && ovOpen.style.display === "flex") {
            const F = getForumStrings();
            const ctx = document.getElementById("forumReplyContext");
            const label = (forumReplyPendingAuthorName || "").trim() || "—";
            if (ctx) ctx.textContent = (F.replyPopupContext || "").replace("%s", label);
        }
    }
    if (forumReadPendingMessageId) {
        const readOv = forumGetOpenReadOverlay();
        if (readOv) {
            openForumReadPopup(forumReadPendingMessageId);
        }
    }
    try {
        const editOv = forumGetOpenEditOverlay();
        if (editOv) {
            const sug = editOv.querySelector("#forumEditSubjectSuggest");
            if (sug && sug.style.display !== "none") {
                forumRenderEditSubjectSuggest();
            }
        }
    } catch (_) { }
    try {
        if (typeof window.refreshForumNotifyInboxI18n === "function") window.refreshForumNotifyInboxI18n();
    } catch (_) { }
}

window.refreshForumI18n = refreshForumI18n;
window.getForumStrings = getForumStrings;
window.applyForumShellI18n = applyForumShellI18n;
window.forumPrefillSearchFromMot = forumPrefillSearchFromMot;

/** Coupe l’écoute Firestore du fil forum (popup fermée ou autre contenu affiché). */
function stopForumMessagesListener() {
    if (forumMessagesUnsub) {
        try {
            forumMessagesUnsub();
        } catch (_) { }
        forumMessagesUnsub = null;
    }
    lastForumSnapshot = null;
    forumReaderDocsCache = [];
}

/**
 * Abonne le lecteur forum à Firestore. À appeler quand la popup forum est ouverte
 * (voir ouvrirPopupHtml dans pageWarshJpg.js) — pas au chargement de la page.
 */
function loadMessages() {
    const forumCollectionRef = db.collection("forumMessages");
    if (!document.querySelector("ul.zc-forum-reader-list")) return;
    forumPrefillSearchFromMot(false);
    const legacyBox = document.getElementById("messagesContainerForum");
    if (legacyBox) legacyBox.style.display = "none";

    if (forumMessagesUnsub) {
        forumMessagesUnsub();
        forumMessagesUnsub = null;
    }
    forumMessagesUnsub = forumCollectionRef.orderBy("timestamp", "desc").onSnapshot(snapshot => {
        lastForumSnapshot = snapshot;
        const lh = forumReaderGetListUl();
        if (!lh || !lh.parentNode) return;
        renderForumMessagesInto(null, snapshot);
    });
    try {
        if (typeof window.forumNotifyEnsureSubscribed === "function") window.forumNotifyEnsureSubscribed();
    } catch (_) { }
}

window.loadMessages = loadMessages;
window.stopForumMessagesListener = stopForumMessagesListener;




//

// Fonction pour marquer une question comme "répondue" ou "non répondue"
function toggleReponse(messageId, repondu) {
    db.collection('forumMessages').doc(messageId).update({
        //
        repondu: repondu
    })
        .then(() => {
            console.log("Statut de réponse mis à jour avec succès.");
        })
        .catch(error => {
            console.error("Erreur lors de la mise à jour du statut de réponse: ", error);
        });
}

// Fonction pour afficher les réponses
function displayReplies(reponses) {
    if (!reponses) return '';
    return reponses.map(reply => `<div class="reply zc-forum-reply-line">${reply}</div>`).join('');
}

// Fonction pour basculer l'affichage des réponses
function toggleReplies(messageId) {
    var repliesDiv = document.getElementById(`replies-${messageId}`);
    repliesDiv.style.display = repliesDiv.style.display === 'none' ? 'block' : 'none';
}

/** Remet le focus sur la carte du message (bouton Répondre, ou la carte en repli). */
function forumFocusReturnToPost(messageId) {
    if (messageId == null || messageId === "") return;
    window.requestAnimationFrame(function () {
        try {
            const sid = String(messageId);
            const esc = typeof CSS !== "undefined" && typeof CSS.escape === "function"
                ? CSS.escape(sid)
                : sid.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            const openB = document.querySelector('.zc-forum-reader-li[data-forum-msg-id="' + esc + '"] .js-forum-reader-row-open');
            if (openB) {
                openB.focus();
                return;
            }
            const li = document.querySelector('.zc-forum-reader-li[data-forum-msg-id="' + esc + '"]');
            if (li) {
                li.setAttribute("tabindex", "-1");
                li.focus();
            }
        } catch (err) {
            console.warn("forumFocusReturnToPost", err);
        }
    });
}

/** Après fermeture du lecteur : focus sur l’entrée liste, sinon sur la carte forum. */
function forumFocusAfterReadClose(messageId) {
    if (messageId == null || messageId === "") return;
    window.requestAnimationFrame(function () {
        try {
            const sid = String(messageId);
            const esc = typeof CSS !== "undefined" && typeof CSS.escape === "function"
                ? CSS.escape(sid)
                : sid.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            const openB = document.querySelector('.zc-forum-reader-li[data-forum-msg-id="' + esc + '"] .js-forum-reader-row-open');
            if (openB) {
                openB.focus();
                return;
            }
        } catch (err) {
            console.warn("forumFocusAfterReadClose", err);
        }
        forumFocusReturnToPost(messageId);
    });
}

function closeForumReplyPopup() {
    const ta = document.getElementById("forumReplyTextarea");
    try {
        if (ta && typeof zcCollapseTextareaZen === "function") zcCollapseTextareaZen(ta);
        else if (typeof zcCollapseAllTextareaZen === "function") zcCollapseAllTextareaZen();
    } catch (_) { }
    const mid = forumReplyPendingMessageId;
    forumReplyPendingMessageId = null;
    forumReplyPendingAuthorName = null;
    if (ta) {
        ta.value = "";
        ta.style.height = "";
    }
    const ov = document.getElementById("forumReplyOverlay");
    if (ov) {
        ov.style.display = "none";
        ov.setAttribute("aria-hidden", "true");
    }
    forumFocusReturnToPost(mid);
}

function openForumReplyPopup(messageId, authorName) {
    if (!forumIsLoggedReal()) {
        forumNotifyReplyNeedsLogin();
        return;
    }
    forumReplyPendingMessageId = messageId;
    forumReplyPendingAuthorName = authorName || "";
    applyForumReplyPopupI18n();
    const F = getForumStrings();
    const ctx = document.getElementById("forumReplyContext");
    const label = (authorName || "").trim() || "—";
    if (ctx) ctx.textContent = (F.replyPopupContext || "").replace("%s", label);
    const ta = document.getElementById("forumReplyTextarea");
    if (ta) {
        ta.value = "";
        ta.style.height = "";
    }
    try {
        if (typeof zcCollapseAllTextareaZen === "function") zcCollapseAllTextareaZen();
    } catch (_) { }
    const ov = forumLiftOverlayToBody(document.getElementById("forumReplyOverlay"));
    if (!ov) return;
    forumApplyOverlayZAboveNotes(ov);
    ov.style.display = "flex";
    ov.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(function () {
        if (ta) {
            zcTextareaFocusExpand(ta);
            ta.focus();
            try {
                ta.setSelectionRange(0, 0);
            } catch (_) { }
        }
    });
}

/** @deprecated inline editor — ouvre la popup dédiée */
function showReplyInput(messageId, authorName) {
    openForumReplyPopup(messageId, authorName);
}

function hideReplyInput(_messageId, _authorName) {
    closeForumReplyPopup();
}

/**
 * Crée une entrée forumAuthorNotifications pour l’auteur du message (hors anonyme, hors auto-réponse).
 * Pas d’e-mail automatique : uniquement cloche / liste dans l’app. Pour des e-mails, il faudrait p. ex. une Cloud Function.
 * Les règles Firestore actuelles font confiance au client ; pour la production, préférer un trigger Cloud Functions.
 */
function forumTryNotifyAuthorOfNewReply(messageId, postData, newReply) {
    try {
        if (!messageId || !postData || !newReply) return;
        const authorMail = String(postData.mail || "").trim().toLowerCase();
        const replierMail = String(newReply.mail || mailUser || "").trim().toLowerCase();
        if (!authorMail || authorMail === replierMail) return;
        if (typeof zcIsAnonymeCourriel === "function" && zcIsAnonymeCourriel(authorMail)) return;
        if (authorMail === "anonyme@blog.alfamous.ca") return;
        const sujet = String(postData.sujet || "").trim() || "—";
        const replierName = String(newReply.name || nameUser || "").trim() || "—";
        db.collection("forumAuthorNotifications")
            .add({
                targetMail: authorMail,
                type: "forum_reply",
                forumMessageId: messageId,
                subject: sujet.slice(0, 220),
                replierName: replierName.slice(0, 120),
                replierMail: replierMail,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .catch(function (err) {
                console.warn("[forum] forumAuthorNotifications:", err && (err.message || err));
            });
    } catch (e) {
        console.warn("[forum] forumTryNotifyAuthorOfNewReply", e);
    }
}

function submitReply() {
    const messageId = forumReplyPendingMessageId;
    if (!messageId) return;
    if (!forumIsLoggedReal()) {
        closeForumReplyPopup();
        forumNotifyReplyNeedsLogin();
        return;
    }
    const ta = document.getElementById("forumReplyTextarea");
    const replyText = ta ? ta.value : "";

    if (replyText.trim() === "") {
        closeForumReplyPopup();
        return;
    }

    const currentDate = new Date().toLocaleString();
    var replyBodyHtml;
    try {
        replyBodyHtml = typeof formatLienForum === "function"
            ? formatLienForum(replyText)
            : String(replyText).replace(/(\r\n|\r|\n)/g, "<br>");
    } catch (err) {
        console.warn("submitReply formatLienForum:", err);
        replyBodyHtml = String(replyText).replace(/(\r\n|\r|\n)/g, "<br>");
    }
    var _forumAuReply = forumResolveAuthorForWrite();
    var sigUser = escapeHtmlForum(_forumAuReply.name);
    var sigDate = escapeHtmlForum(currentDate);
    var newReply = {
        html: replyBodyHtml + '<br><span class="zc-forum-reply-sig">@' + sigUser + " · " + sigDate + "</span>",
        mail: _forumAuReply.mail,
        name: String(_forumAuReply.name || "")
    };

    var docRef = db.collection('forumMessages').doc(messageId);
    docRef
        .update({
            reponses: firebase.firestore.FieldValue.arrayUnion(newReply)
        })
        .then(function () {
            return docRef.get();
        })
        .then(function (snap) {
            if (snap.exists) {
                forumTryNotifyAuthorOfNewReply(messageId, snap.data(), newReply);
            }
            if (ta) ta.value = "";
            closeForumReplyPopup();
            var checkbox = document.getElementById("checkbox-" + messageId);
            if (checkbox) checkbox.checked = false;
            return docRef.update({ repondu: false });
        })
        .catch(function (error) {
            console.error("Erreur lors de l'ajout de la réponse: ", error);
        });
}

(function bindForumReplyPopupDom() {
    const ov = document.getElementById("forumReplyOverlay");
    const cancel = document.getElementById("forumReplyCancel");
    const send = document.getElementById("forumReplySend");
    const closeX = document.getElementById("forumReplyCloseX");
    if (!ov || !cancel || !send) return;
    ov.addEventListener("click", function (e) {
        if (e.target === ov) closeForumReplyPopup();
    });
    cancel.addEventListener("click", function (e) {
        e.preventDefault();
        closeForumReplyPopup();
    });
    if (closeX) {
        closeX.addEventListener("click", function (e) {
            e.preventDefault();
            closeForumReplyPopup();
        });
    }
    send.addEventListener("click", function (e) {
        e.preventDefault();
        submitReply();
    });
})();

window.closeForumReplyPopup = closeForumReplyPopup;
window.submitForumReplyFromPopup = submitReply;

function stripHtmlForum(html) {
    return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Texte pour textarea : conserve les sauts de ligne (ex. &lt;br&gt;) */
function forumHtmlToEditablePlain(html) {
    if (!html) return "";
    var s = String(html)
        .replace(/\r\n/g, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n");
    s = s.replace(/<[^>]+>/g, "");
    s = s
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    return s.replace(/\n{3,}/g, "\n\n").trim();
}

function textDirClassForum(htmlLike) {
    return detecterLangueTexte(stripHtmlForum(htmlLike)) ? "zc-forum-text-dir-rtl" : "zc-forum-text-dir-ltr";
}

/** ✍️ liste forum : ouvrir la popup commentaire en onglet « Forum », sujet prérempli. */
function forumOpenForumTabFromPost(data, sujetBrut) {
    var subj = String(sujetBrut || "").trim();
    var mot = subj.replace(/\+/g, " ").replace(/'/g, "\u2019").trim().toLowerCase();
    if (typeof dedoubleSheddaSafe === "function") {
        try {
            mot = dedoubleSheddaSafe(mot);
        } catch (e0) {
            console.warn("dedoubleSheddaSafe", e0);
        }
    }
    var motEl = document.getElementById("mot");
    if (motEl) motEl.value = mot;
    if (typeof afficherPopupCommentaire === "function") {
        afficherPopupCommentaire("msgForum", subj, "");
    }
}

function forumOpenNotesFromPost(data) {
    if (typeof window.openArticlesForumNotesModal !== "function") return;
    const bodyPlainFromMsg = forumHtmlToEditablePlain(typeof data.message === "string" ? data.message : "");
    window.openArticlesForumNotesModal({
        prefillTitle: String(data.sujet || ""),
        prefillBody: bodyPlainFromMsg,
        isPrivate: data && data.isPrivate === true
    });
}

function buildForumThreadHtml(messageId, messageHtml, reponses, F) {
    const parts = [];
    const mainCls = textDirClassForum(messageHtml);
    parts.push(`<div class="zc-forum-thread-main ${mainCls}">${messageHtml}</div>`);
    if (Array.isArray(reponses) && reponses.length > 0) {
        parts.push(
            `<div id="zc-forum-read-replies-anchor" class="zc-forum-replies-start" tabindex="-1">${escapeHtmlForum(F.repliesStart)} (${reponses.length})</div>`
        );
        parts.push(`<div class="zc-forum-thread-replies">`);
        reponses.forEach((reply, idx) => {
            const norm = forumNormalizeReply(reply);
            const cls = textDirClassForum(norm.html);
            const canManage = forumCanDeleteReplyNorm(norm);
            const editBtn = canManage
                ? `<button type="button" class="zc-forum-reply-edit js-forum-edit-reply" data-reply-index="${idx}" title="${escapeHtmlForum(F.editReplyTitle)}" aria-label="${escapeHtmlForum(F.editReplyTitle)}"><i class="fas fa-edit" aria-hidden="true"></i></button>`
                : "";
            const delBtn = canManage
                ? `<button type="button" class="zc-forum-reply-del js-forum-delete-reply" data-reply-index="${idx}" title="${escapeHtmlForum(F.deleteReplyTitle)}" aria-label="${escapeHtmlForum(F.deleteReplyTitle)}"><i class="fas fa-trash" aria-hidden="true"></i></button>`
                : "";
            const tools = (editBtn || delBtn) ? `<span class="zc-forum-reply-tools">${editBtn}${delBtn}</span>` : "";
            parts.push(`<div class="zc-forum-reply-line ${cls}" data-message-id="${escapeHtmlForum(messageId)}">${tools}<div class="zc-forum-reply-content">${norm.html}</div></div>`);
        });
        parts.push(`</div>`);
    }
    return `<div class="zc-forum-thread-box">${parts.join("")}</div>`;
}

function normalizeForumReaderSearch(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function forumEscRegex(s) {
    return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function forumContainsWholeWord(haystack, needle) {
    const n = String(needle || "").trim();
    if (!n) return false;
    const re = new RegExp("(^|[^\\p{L}\\p{N}_])" + forumEscRegex(n) + "($|[^\\p{L}\\p{N}_])", "iu");
    return re.test(String(haystack || ""));
}

function forumReaderMatchesByParams(blob, query, opts) {
    const text = normalizeForumReaderSearch(blob);
    const q = normalizeForumReaderSearch(query);
    if (!q) return true;
    const meOn = !!(opts && opts.meOn);
    const mcOn = !!(opts && opts.mcOn);

    if (mcOn) {
        return meOn ? forumContainsWholeWord(text, q) : text.includes(q);
    }

    const tokens = q.split(" ").map((x) => x.trim()).filter(Boolean);
    if (!tokens.length) return true;
    if (meOn) {
        return tokens.every((t) => forumContainsWholeWord(text, t));
    }
    return tokens.every((t) => text.includes(t));
}

function forumReaderDocSearchBlob(entry) {
    const d = entry.data;
    const sujet = String(d.sujet || "");
    const name = String(d.name || "");
    const action = typeof d.action === "string" ? d.action : "";
    const msg = stripHtmlForum(typeof d.message === "string" ? d.message : "");
    let reps = "";
    if (Array.isArray(d.reponses)) {
        reps = d.reponses.map((r) => stripHtmlForum(forumNormalizeReply(r).html)).join(" ");
    }
    return normalizeForumReaderSearch(sujet + " " + name + " " + action + " " + msg + " " + reps);
}

function forumReaderPreviewPlain(data, maxLen) {
    const raw = typeof data.message === "string" ? data.message : "";
    let t = stripHtmlForum(raw).replace(/\s+/g, " ").trim();
    if (!t) return "";
    const max = maxLen || 130;
    if (t.length > max) return t.slice(0, max).trim() + "…";
    return t;
}

/** Fils marqués privés : visibles uniquement par l’auteur (mail), pas par les modérateurs/admins. */
function forumReaderDocIsVisible(entry) {
    const d = entry && entry.data;
    if (!d) return false;
    if (d.isPrivate !== true) return true;
    return forumOwnerActionsAllowed(d);
}

function forumSourcePrivacyBadgeLabel(data, F) {
    const isPrivate = data && data.isPrivate === true;
    const action = String((data && data.action) || "").trim();
    const isNotes = action === "msgForum";
    if (isNotes) {
        return isPrivate
            ? (F.sourceNotesPrivate || "Notes · Privé")
            : (F.sourceNotesPublic || "Notes · Public");
    }
    return isPrivate
        ? (F.sourceCommentsPrivate || "Commentaires · Privé")
        : (F.sourceCommentsPublic || "Commentaires · Public");
}

function forumSyncPrefButtonVisualState() {
    const prefs = (typeof window.zcGetSearchPrefs === "function")
        ? window.zcGetSearchPrefs()
        : {
            me: !!document.getElementById("paramRechercheMotEntier")?.checked,
            mc: !!document.getElementById("ordreExactCheckbox")?.checked
        };
    const meOn = !!prefs.me;
    const mcOn = !!prefs.mc;
    const apply = function (selector, on) {
        const tone = on ? "var(--zc-accent)" : "var(--zc-text-muted)";
        document.querySelectorAll(selector).forEach((btn) => {
            btn.classList.toggle("zc-param-toggle-on", !!on);
            btn.classList.toggle("zc-param-toggle-off", !on);
            btn.style.setProperty("color", tone, "important");
            btn.querySelectorAll("span").forEach((sp) => {
                sp.style.setProperty("color", tone, "important");
            });
        });
    };
    apply('[id="btnForumInlineME"]', meOn);
    apply('[id="btnForumInlineMC"]', mcOn);
}
window.forumSyncPrefButtonVisualState = forumSyncPrefButtonVisualState;

function forumReaderRenderList() {
    const ul = forumReaderGetListUl();
    if (!ul) return;
    try {
        if (typeof window.syncParamTogglesChrome === "function") {
            window.syncParamTogglesChrome();
        }
    } catch (_) { }
    try { forumSyncPrefButtonVisualState(); } catch (_) { }

    const q = normalizeForumReaderSearch(forumReaderPickSearchText());
    const prefs = (typeof window.zcGetSearchPrefs === "function")
        ? window.zcGetSearchPrefs()
        : {
            me: !!document.getElementById("paramRechercheMotEntier")?.checked,
            mc: !!document.getElementById("ordreExactCheckbox")?.checked
        };
    const meOn = !!prefs.me;
    const mcOn = !!prefs.mc;
    const bySearch = !q
        ? forumReaderDocsCache.slice()
        : forumReaderDocsCache.filter((e) =>
            forumReaderMatchesByParams(forumReaderDocSearchBlob(e), q, { meOn, mcOn })
        );
    const filtered = bySearch.filter((e) => forumReaderDocIsVisible(e));

    const F = getForumStrings();
    const totalMessages =
        typeof window.__zcForumTotalAvailable === "number" && window.__zcForumTotalAvailable >= 0
            ? window.__zcForumTotalAvailable
            : forumReaderDocsCache.filter((e) => forumReaderDocIsVisible(e)).length;
    const tpl = F.readerResultCount || "%n / %t";
    const countStr = String(tpl)
        .replace(/%n/g, String(filtered.length))
        .replace(/%t/g, String(totalMessages));
    document.querySelectorAll(".zc-forum-reader-count").forEach((el) => {
        el.textContent = countStr;
    });

    ul.innerHTML = "";
    filtered.forEach((entry, idx) => {
        const { id, data } = entry;
        const num = idx + 1;
        const sujet = String(data.sujet || "").trim() || F.emptySubject;
        const sujetBrut = typeof data.sujet === "string" ? data.sujet : "";
        const name = data.name || "";
        const ts = data.timestamp && data.timestamp.toDate
            ? data.timestamp.toDate().toLocaleString()
            : F.unknownDate;
        const action = typeof data.action === "string" ? data.action : F.defaultAction;
        const sourceBadge = forumSourcePrivacyBadgeLabel(data, F);
        const checked = data.repondu ? "checked" : "";
        const previewText = forumReaderPreviewPlain(data, 130);
        const previewEsc = previewText ? escapeHtmlForum(previewText) : "…";
        const replyCount = Array.isArray(data.reponses) ? data.reponses.length : 0;
        const unreadSet = new Set(
            Array.isArray(window.__zcForumNotifyUnreadMessageIds) ? window.__zcForumNotifyUnreadMessageIds : []
        );
        const rowNotify =
            forumIsLoggedReal() && unreadSet.has(id)
                ? `<span class="zc-forum-reader-msg-notify" role="img" title="${escapeHtmlForum(F.notifyRowBellTitle || F.notifyBellTitle || "")}" aria-label="${escapeHtmlForum(F.notifyRowBellAria || F.notifyBellAria || "")}"><i class="fas fa-bell" aria-hidden="true"></i></span>`
                : "";
        const repliesAria = escapeHtmlForum((F.repliesCountAria || "%n").replace("%n", String(replyCount)));
        const repliesTitle = escapeHtmlForum((F.repliesCountTitle || "%n").replace("%n", String(replyCount)));
        const repliesCountEl =
            `<span class="zc-forum-reader-replies-count" role="img" title="${repliesTitle}" aria-label="${repliesAria}">` +
            `<span aria-hidden="true">💬</span> <span class="zc-forum-reader-replies-num">${replyCount}</span></span>`;
        const numAria = (F.readerMessageNumAria || "Message %n").replace("%n", String(num));
        const nv = forumGetNiveau();
        const isMod = nv >= 2;
        const isOwner = forumOwnerActionsAllowed(data);
        const rowOpenTitle = replyCount > 0 ? (F.jumpToRepliesTitle || F.readerOpenTitle) : F.readerOpenTitle;
        const validateTool = isMod && forumActionNeedsValidation(data.action) ? `
                <button type="button" id="validerBtn-${id}" class="zc-forum-action zc-forum-action--admin" title="${escapeHtmlForum(F.validateTitle)}">
                  <i class="fas fa-save icon" aria-hidden="true"></i><span>${escapeHtmlForum(F.validate)}</span>
                </button>` : "";
        const isPrivateThread = data.isPrivate === true;
        const modDeleteThis = isMod && !isPrivateThread;
        const ownerCanDelete = isOwner;
        const adminInline = isMod ? `
                ${validateTool}
                ${(modDeleteThis || ownerCanDelete) ? `<button type="button" class="zc-forum-action zc-forum-action--danger zc-forum-action--admin js-forum-delete" title="${escapeHtmlForum(F.deleteTitle)}">
                  <i class="fas fa-trash" aria-hidden="true"></i>
                </button>` : ""}
                <label class="zc-forum-repondu-label">
                  <input type="checkbox" id="checkbox-${id}" class="zc-forum-checkbox-repondu" ${checked}
                    ${isMod ? "" : "disabled"} />
                  <span>${escapeHtmlForum(F.answered)}</span>
                </label>` : "";
        const ownerDeleteOnly = (!isMod && ownerCanDelete) ? `
                <button type="button" class="zc-forum-action zc-forum-action--danger zc-forum-delete js-forum-delete" title="${escapeHtmlForum(F.deleteTitle)}">
                  <i class="fas fa-trash" aria-hidden="true"></i>
                </button>` : "";
        const isNotesOrigin = String(data.action || "").trim() === "msgForum";
        const headBtnClass = isNotesOrigin ? "js-forum-open-notes" : "js-forum-open-comment";
        const headBtnTitle = isNotesOrigin ? (F.notesTitle || "Notes") : F.commentTitle;
        const headBtnIcon = isNotesOrigin ? "📝" : "✍️";
        const lexiqueFromPostBtn = `
                  <button type="button" class="zc-forum-head-icon ${headBtnClass}" title="${escapeHtmlForum(headBtnTitle)}" aria-label="${escapeHtmlForum(headBtnTitle)}">${headBtnIcon}</button>`;
        const voteActions = `
                  <button type="button" class="zc-forum-action zc-forum-action--vote js-forum-like" title="${escapeHtmlForum(F.likeTitle)}">
                    <span aria-hidden="true">👍</span><span class="zc-forum-vote-count">${data.likes || 0}</span>
                  </button>
                  <button type="button" class="zc-forum-action zc-forum-action--vote js-forum-unlike" title="${escapeHtmlForum(F.unlikeTitle)}">
                    <span aria-hidden="true">👎</span><span class="zc-forum-vote-count">${data.unlikes || 0}</span>
                  </button>
                  ${repliesCountEl}`;

        const li = document.createElement("li");
        li.className = "zc-forum-reader-li zc-record-languette";
        li.setAttribute("data-forum-msg-id", id);
        li.setAttribute("role", "listitem");

        li.innerHTML = `
            <div class="zc-forum-reader-row-layout">
              <div class="zc-forum-reader-index-col" aria-label="${escapeHtmlForum(numAria)}">${num}.</div>
              <div class="zc-forum-reader-row-body" dir="auto">
                <div class="zc-forum-reader-row-head zc-forum-reader-row-head--tab">
                  ${lexiqueFromPostBtn}
                  <span class="zc-forum-k">${escapeHtmlForum(F.subjectLabel)}</span>
                  <span class="zc-forum-source-pill" title="${escapeHtmlForum(F.sourceTypeTitle || "Origine / visibilité")}">${escapeHtmlForum(sourceBadge)}</span>
                  <span class="zc-forum-action-pill" title="${escapeHtmlForum(F.actionTypeTitle)}">${escapeHtmlForum(action)}</span>
                </div>
                <button type="button" class="zc-forum-subject-link-btn zc-forum-subject-link-btn--line2 js-forum-reader-row-open" title="${escapeHtmlForum(rowOpenTitle)}">${escapeHtmlForum(sujet)}</button>
                <button type="button" class="zc-forum-reader-row-preview js-forum-reader-row-open" title="${escapeHtmlForum(rowOpenTitle)}">${previewEsc}</button>
                <div class="zc-forum-reader-row-meta">@${escapeHtmlForum(name)} · ${escapeHtmlForum(ts)}</div>
                <div class="zc-forum-reader-row-actions" dir="ltr">
                  ${voteActions}
                  ${adminInline}
                  ${ownerDeleteOnly}
                </div>
              </div>
            </div>`;

        li.querySelectorAll(".js-forum-reader-row-open").forEach((b) => {
            b.addEventListener("click", () => {
                if (replyCount > 0) openForumReadPopup(id, { scrollToReplies: true });
                else openForumReadPopup(id);
            });
        });
        li.querySelector(".js-forum-open-comment")?.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            forumOpenForumTabFromPost(data, sujetBrut);
        });
        li.querySelector(".js-forum-open-notes")?.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            forumOpenNotesFromPost(data);
        });
        li.querySelector(".js-forum-like")?.addEventListener("click", (e) => {
            e.stopPropagation();
            likeMessage(id, true);
        });
        li.querySelector(".js-forum-unlike")?.addEventListener("click", (e) => {
            e.stopPropagation();
            likeMessage(id, false);
        });
        const vBtn = li.querySelector("#validerBtn-" + id);
        if (vBtn) {
            vBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                validerMessage(id);
            });
        }
        li.querySelector(".js-forum-delete")?.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteMessage(id);
        });
        const cb = li.querySelector("#checkbox-" + id);
        if (cb) cb.addEventListener("change", function () {
            toggleReponse(id, this.checked);
        });
        applyForumHighlights(li);

        ul.appendChild(li);
    });

    forumReaderEnsureLoadMoreBtn(ul, F);
}

window.addEventListener("zc:search-prefs-changed", function () {
    try { forumSyncPrefButtonVisualState(); } catch (_) { }
});

function forumReaderRefreshNotifyBell() {
    const ul = forumReaderGetListUl();
    if (!ul) return;
    const F = getForumStrings();
    const ids = new Set(
        Array.isArray(window.__zcForumNotifyUnreadMessageIds) ? window.__zcForumNotifyUnreadMessageIds : []
    );
    const show = forumIsLoggedReal();
    ul.querySelectorAll("li[data-forum-msg-id]").forEach((li) => {
        const mid = li.getAttribute("data-forum-msg-id");
        if (!mid) return;
        const rowHead = li.querySelector(".zc-forum-reader-row-head.zc-forum-reader-row-head--tab");
        if (!rowHead) return;
        const want = show && ids.has(mid);
        let mark = rowHead.querySelector(".zc-forum-reader-msg-notify");
        if (want) {
            if (!mark) {
                mark = document.createElement("span");
                mark.className = "zc-forum-reader-msg-notify";
                mark.setAttribute("role", "img");
                rowHead.insertBefore(mark, rowHead.firstChild);
            }
            mark.innerHTML = '<i class="fas fa-bell" aria-hidden="true"></i>';
            mark.title = F.notifyRowBellTitle || F.notifyBellTitle || "";
            mark.setAttribute("aria-label", F.notifyRowBellAria || F.notifyBellAria || "");
        } else if (mark) {
            mark.remove();
        }
    });
}

window.forumReaderRefreshNotifyBell = forumReaderRefreshNotifyBell;

function forumReaderEnsureLoadMoreBtn(ul, F) {
    const panel = ul.closest(".zc-forum-reader-panel");
    if (!panel) return;
    let btn = document.getElementById("forumReaderLoadMore");
    if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.id = "forumReaderLoadMore";
        btn.className = "zc-forum-load-more";
        panel.appendChild(btn);
    }
    btn.textContent = F.loadMoreForum || "Charger plus";
    const lim = typeof window.__zcForumLimit === "number" && window.__zcForumLimit > 0 ? window.__zcForumLimit : 100;
    const total = typeof window.__zcForumTotalAvailable === "number" ? window.__zcForumTotalAvailable : lim;
    const shown = forumReaderDocsCache.length;
    btn.style.display = shown < total ? "" : "none";
    btn.onclick = function () {
        window.__zcForumLimit = lim + 50;
        if (lastForumSnapshot) {
            renderForumMessagesInto(null, lastForumSnapshot);
        }
    };
}

function openForumReadPopup(messageId, opts) {
    opts = opts || {};
    const scrollToReplies = !!opts.scrollToReplies;
    const entry = forumReaderDocsCache.find((e) => e.id === messageId);
    if (!entry) return;
    if (!forumReaderDocIsVisible(entry)) {
        const Fs = getForumStrings();
        forumMsgBox(Fs.privateThreadAccessDenied || Fs.forumEditDenied);
        return;
    }
    try {
        if (typeof window.forumNotifyMarkReadForMessage === "function") {
            window.forumNotifyMarkReadForMessage(messageId);
        }
    } catch (_) { }
    forumReadPendingMessageId = messageId;
    const d = entry.data;
    const F = getForumStrings();
    const replyCount = Array.isArray(d.reponses) ? d.reponses.length : 0;
    let msg = typeof d.message === "string" ? d.message : "";
    if (!/<a\b[^>]*>/i.test(msg)) msg = formatLienForum(msg);
    const bodyHtml = buildForumThreadHtml(messageId, msg, d.reponses, F);
    const titleEl = forumReadScopedGet("forumReadTitle");
    const subj = String(d.sujet || "").trim() || F.emptySubject;
    if (titleEl) titleEl.textContent = subj;
    const metaEl = forumReadScopedGet("forumReadMeta");
    if (metaEl) {
        const ts =
            d.timestamp && d.timestamp.toDate
                ? d.timestamp.toDate().toLocaleString()
                : F.unknownDate;
        metaEl.textContent = "@" + String(d.name || "") + " · " + ts;
    }

    const replyBtn = forumReadScopedGet("forumReadReplyBtn");
    const shareBtn = forumReadScopedGet("forumReadShareBtn");
    if (replyBtn) {
        replyBtn.title = F.replyTitle || F.reply;
        const sp = replyBtn.querySelector(".zc-forum-read-btn-label");
        if (sp) sp.textContent = F.reply + " (" + replyCount + ")";
        replyBtn.onclick = function () {
            const mid = messageId;
            const author = String(d.name || "");
            closeForumReadPopup();
            window.requestAnimationFrame(function () {
                openForumReplyPopup(mid, author);
            });
        };
    }
    if (shareBtn) {
        shareBtn.title = F.shareTitle || F.share;
        const sp = shareBtn.querySelector(".zc-forum-read-btn-label");
        if (sp) sp.textContent = F.share;
        shareBtn.onclick = function () {
            try {
                const u = new URL(location.href);
                u.searchParams.set("forumMsg", messageId);
                if (typeof copierTexte === "function") {
                    copierTexte(u.toString());
                } else if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(u.toString()).catch(() => { });
                }
            } catch (_) { }
        };
    }
    const editReadBtn = forumReadScopedGet("forumReadEditBtn");
    if (editReadBtn) {
        const canEditRead = forumOwnerActionsAllowed(d);
        editReadBtn.style.display = canEditRead ? "" : "none";
        editReadBtn.title = F.editForumTitle || F.editForum;
        const spe = editReadBtn.querySelector(".zc-forum-read-btn-label");
        if (spe) spe.textContent = F.editForum;
        editReadBtn.onclick = function () {
            const mid = messageId;
            closeForumReadPopup();
            window.requestAnimationFrame(function () {
                void forumOpenEditMessageById(mid);
            });
        };
    }

    const toolbar = forumReadScopedGet("forumReadToolbar");
    let privRow = forumReadScopedGet("forumReadPrivateRow");
    if (!privRow && toolbar && toolbar.parentNode) {
        privRow = document.createElement("div");
        privRow.id = "forumReadPrivateRow";
        toolbar.parentNode.insertBefore(privRow, toolbar.nextSibling);
    }
    if (privRow && !privRow.querySelector("#forumReadPrivateLabel")) {
        privRow.className = "zc-forum-edit-private-row zc-forum-read-private-row";
        privRow.style.margin = "8px 0 10px";
        privRow.innerHTML =
            '<label class="zc-login-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
            '<input type="checkbox" id="forumReadPrivateCb" />' +
            '<span id="forumReadPrivateLabel" class="zc-forum-edit-private-label" aria-live="polite"></span>' +
            "</label>";
    }
    const privCb = privRow ? privRow.querySelector("#forumReadPrivateCb") : null;
    const ownerShowPriv = forumOwnerActionsAllowed(d);
    if (privRow) privRow.style.display = ownerShowPriv ? "" : "none";
    if (privCb) {
        privCb.checked = d.isPrivate === true;
        syncForumReadPrivateLabel();
        privCb.onchange = function () {
            syncForumReadPrivateLabel();
            const v = !!privCb.checked;
            db.collection("forumMessages")
                .doc(messageId)
                .update({ isPrivate: v })
                .catch(function (err) {
                    console.error(err);
                    forumMsgBox(tMsg("forumSendErrorRetry"));
                });
        };
    }

    const bodyEl = forumReadScopedGet("forumReadBody");
    if (bodyEl) {
        bodyEl.scrollTop = 0;
        bodyEl.innerHTML = '<div class="zc-forum-read-thread-wrap">' + bodyHtml + "</div>";
        applyForumHighlights(bodyEl);
        bodyEl.querySelectorAll(".js-forum-delete-reply").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const idx = Number(btn.getAttribute("data-reply-index"));
                if (!Number.isInteger(idx) || idx < 0) return;
                deleteReplyAtIndex(messageId, idx);
            });
        });
        bodyEl.querySelectorAll(".js-forum-edit-reply").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const idx = Number(btn.getAttribute("data-reply-index"));
                if (!Number.isInteger(idx) || idx < 0) return;
                closeForumReadPopup();
                window.requestAnimationFrame(function () {
                    openForumEditReply(messageId, idx);
                });
            });
        });
    }
    const ov = forumLiftOverlayToBody(forumReadScopedGet("forumReadOverlay"));
    if (!ov) return;
    forumApplyOverlayZAboveNotes(ov);
    ov.style.display = "flex";
    ov.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(function () {
        if (scrollToReplies && replyCount > 0) {
            window.requestAnimationFrame(function () {
                const bodyRead = forumReadScopedGet("forumReadBody");
                const anchor = bodyRead && bodyRead.querySelector("#zc-forum-read-replies-anchor");
                if (bodyRead && anchor) {
                    try {
                        anchor.scrollIntoView({ block: "start", behavior: "smooth", inline: "nearest" });
                    } catch (_) {
                        try {
                            anchor.scrollIntoView(true);
                        } catch (_) { }
                    }
                    try {
                        anchor.focus({ preventScroll: true });
                    } catch (_) { }
                }
            });
        }
        const closeB = forumReadScopedGet("forumReadCloseBtn");
        const closeX = forumReadScopedGet("forumReadCloseX");
        if (!(scrollToReplies && replyCount > 0)) {
            if (closeB) closeB.focus();
            else if (closeX) closeX.focus();
        }
    });
}

/**
 * Ouvre la popup lecture forum même si le message n’est pas encore dans forumReaderDocsCache
 * (ex. lien « Réponses » depuis Mes Notes sans avoir ouvert la liste forum).
 */
async function forumOpenReadMessageById(messageId, opts) {
    opts = opts || {};
    const id = String(messageId || "").trim();
    if (!id) return;
    try {
        if (typeof closeForumEditOverlay === "function") closeForumEditOverlay();
    } catch (_) { }
    try {
        if (typeof closeForumReplyPopup === "function") closeForumReplyPopup();
    } catch (_) { }
    let entry = forumReaderDocsCache.find((e) => e.id === id);
    if (!entry) {
        try {
            if (typeof db === "undefined" || !db.collection) {
                const Fs0 = typeof getForumStrings === "function" ? getForumStrings() : {};
                forumMsgBox(Fs0.forumEditDenied || Fs0.messageNotFound || "Introuvable.");
                return;
            }
            const snap = await db.collection("forumMessages").doc(id).get();
            if (!snap.exists) {
                const Fs1 = typeof getForumStrings === "function" ? getForumStrings() : {};
                forumMsgBox(Fs1.messageNotFound || Fs1.forumEditDenied || "Introuvable.");
                return;
            }
            const d = snap.data();
            forumReaderDocsCache = forumReaderDocsCache.filter((e) => e.id !== id);
            forumReaderDocsCache.push({ id: snap.id, data: d });
            entry = forumReaderDocsCache.find((e) => e.id === id);
        } catch (e) {
            console.error("forumOpenReadMessageById", e);
            forumMsgBox(typeof tMsg === "function" ? tMsg("forumSendErrorRetry") : "Erreur.");
            return;
        }
    }
    if (!entry) return;
    openForumReadPopup(id, opts);
}

function closeForumReadPopup() {
    const id = forumReadPendingMessageId;
    forumReadPendingMessageId = null;
    const ov = forumGetOpenReadOverlay();
    const replyBtn = ov && ov.querySelector("#forumReadReplyBtn");
    const shareBtn = ov && ov.querySelector("#forumReadShareBtn");
    const editReadBtn = ov && ov.querySelector("#forumReadEditBtn");
    if (replyBtn) replyBtn.onclick = null;
    if (shareBtn) shareBtn.onclick = null;
    if (editReadBtn) editReadBtn.onclick = null;
    if (ov) {
        ov.style.display = "none";
        ov.setAttribute("aria-hidden", "true");
    }
    const bodyEl = ov && ov.querySelector("#forumReadBody");
    if (bodyEl) bodyEl.innerHTML = "";
    forumFocusAfterReadClose(id);
}

(function bindForumReaderDom() {
    document.addEventListener(
        "input",
        function (e) {
            const t = e.target;
            if (t && t.classList && t.classList.contains("zc-forum-reader-search-input")) {
                forumReaderSearchQuery = t.value || "";
                forumReaderRenderList();
            }
        },
        true
    );
    document.addEventListener(
        "focusin",
        function (e) {
            const t = e.target;
            if (t && t.classList && t.classList.contains("zc-forum-reader-search-input")) {
                forumReaderRenderList();
            }
        },
        true
    );
    document.addEventListener(
        "keydown",
        function (e) {
            const t = e.target;
            if (
                e.key === "Escape" &&
                t &&
                t.classList &&
                t.classList.contains("zc-forum-reader-search-input")
            ) {
                t.value = "";
                try {
                    t.dispatchEvent(new Event("input", { bubbles: true }));
                } catch (_) {}
                forumReaderSearchQuery = "";
                forumReaderRenderList();
                t.focus();
            }
        },
        true
    );
    document.addEventListener(
        "click",
        function (e) {
            const btn = e.target && e.target.closest && e.target.closest(".zc-forum-reader-clear");
            if (!btn) return;
            e.preventDefault();
            const row = btn.closest(".zc-forum-reader-search-row");
            const input = row && row.querySelector(".zc-forum-reader-search-input");
            if (input) {
                input.value = "";
                try {
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                } catch (_) {}
                forumReaderSearchQuery = "";
                forumReaderRenderList();
                input.focus();
            }
        },
        true
    );

    /**
     * Fermeture lecture forum : phase capture obligatoire — la boîte du dialogue a onclick stopPropagation,
     * ce qui bloquait les écouteurs en bulle sur document.
     */
    document.addEventListener(
        "click",
        function (e) {
            const t = e.target;
            if (!t || typeof t.closest !== "function") return;
            const readOv = t.closest("#forumReadOverlay");
            if (!readOv) return;
            let flex = readOv.style.display === "flex";
            try {
                if (!flex && typeof getComputedStyle === "function") {
                    flex = getComputedStyle(readOv).display === "flex";
                }
            } catch (_) { }
            if (!flex) return;
            if (t === readOv) {
                closeForumReadPopup();
                return;
            }
            if (t.closest("#forumReadCloseX") || t.closest("#forumReadCloseBtn")) {
                e.preventDefault();
                closeForumReadPopup();
            }
        },
        true
    );

    document.addEventListener(
        "keydown",
        function (e) {
            if (e.key !== "Escape" || e.defaultPrevented) return;
            if (!forumGetOpenReadOverlay()) return;
            e.preventDefault();
            closeForumReadPopup();
        },
        true
    );
})();

window.closeForumReadPopup = closeForumReadPopup;

async function deleteReplyAtIndex(messageId, replyIndex) {
    const docRef = db.collection('forumMessages').doc(messageId);
    try {
        const pre = await docRef.get();
        if (!pre.exists) return;
        const data = pre.data() || {};
        const list = Array.isArray(data.reponses) ? [...data.reponses] : [];
        if (replyIndex < 0 || replyIndex >= list.length) return;
        const norm = forumNormalizeReply(list[replyIndex]);
        if (!forumCanDeleteReplyNorm(norm)) {
            forumMsgBox(getForumStrings().deleteReplyDenied || tMsg('deleteReplyError'));
            return;
        }
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists) throw new Error('Message not found');
            const d2 = snap.data() || {};
            const list2 = Array.isArray(d2.reponses) ? [...d2.reponses] : [];
            if (replyIndex < 0 || replyIndex >= list2.length) return;
            list2.splice(replyIndex, 1);
            tx.update(docRef, { reponses: list2 });
        });

        // Rafraîchissement immédiat (optimiste) pour voir le résultat sans attendre Firestore.
        const cached = forumReaderDocsCache.find((e) => e.id === messageId);
        if (cached && cached.data) {
            const reps = Array.isArray(cached.data.reponses) ? [...cached.data.reponses] : [];
            if (replyIndex >= 0 && replyIndex < reps.length) reps.splice(replyIndex, 1);
            cached.data.reponses = reps;
        }
        try { forumReaderRenderList(); } catch (_) { }
        try {
            const ov = forumReadScopedGet("forumReadOverlay");
            let isOpen = false;
            if (ov) {
                isOpen = ov.style.display === "flex";
                if (!isOpen && typeof getComputedStyle === "function") {
                    try { isOpen = getComputedStyle(ov).display === "flex"; } catch (_) { }
                }
            }
            if (isOpen && forumReadPendingMessageId === messageId) {
                openForumReadPopup(messageId);
            }
        } catch (_) { }
    } catch (err) {
        console.error("Erreur suppression réponse:", err);
        forumMsgBox(tMsg('deleteReplyError'));
    }
}


// Fonction pour liker ou unliker un message
async function likeMessage(messageId, isLike) {
    var userMail = forumResolveAuthorForWrite().mail;
    var docRef = db.collection('forumMessages').doc(messageId);

    docRef.get().then((doc) => {
        if (doc.exists) {
            var data = doc.data();
            var likes = data.likes || 0;
            var unlikes = data.unlikes || 0;
            var votes = data.votes || {};  // Récupérer l'objet votes

            // Vérifier si l'utilisateur a déjà voté avec son email
            if (votes[userMail]) {
                if ((isLike && votes[userMail] === 'like') || (!isLike && votes[userMail] === 'unlike')) {
                    // L'utilisateur a déjà voté de cette manière
                    console.log("Vous avez déjà voté.");
                    return;
                }

                // Si l'utilisateur change de vote (de like à unlike ou inversement)
                if (votes[userMail] === 'like') {
                    likes--;  // Réduire le nombre de likes
                } else if (votes[userMail] === 'unlike') {
                    unlikes--;  // Réduire le nombre d'unlikes
                }
            }

            // Mettre à jour le vote de l'utilisateur
            if (isLike) {
                likes++;
                votes[userMail] = 'like';  // Mettre à jour le vote de l'utilisateur
            } else {
                unlikes++;
                votes[userMail] = 'unlike';  // Mettre à jour le vote de l'utilisateur
            }

            // Mettre à jour les likes/unlikes et les votes dans Firestore
            docRef.update({
                likes: likes,
                unlikes: unlikes,
                votes: votes
            })
                .then(() => {
                    console.log("Votre vote a été pris en compte.");
                })
                .catch(error => {
                    console.error("Erreur lors de la mise à jour du vote: ", error);
                });
        }
    });
}


// Fonction pour supprimer un message par son identifiant
async function deleteMessage(messageId) {
    let data = null;
    const entry = forumReaderDocsCache.find((e) => e.id === messageId);
    if (entry && entry.data) data = entry.data;
    if (!data) {
        try {
            const snap = await db.collection('forumMessages').doc(messageId).get();
            if (snap && snap.exists) data = snap.data() || null;
        } catch (_) { }
    }
    const okOwner = !!(data && forumOwnerActionsAllowed(data));
    const okModPublic = !!(data && forumGetNiveau() >= 2 && data.isPrivate !== true);
    if (!okOwner && !okModPublic) {
        forumMsgBox(tMsg('deleteMessageDenied', { name: nameUser }));
        return;
    }
    db.collection('forumMessages').doc(messageId).delete()
        .then(() => {
            console.log("Message supprimé avec succès.");
            forumMsgBox(tMsg('deleteMessageSuccess'));
        })
        .catch(error => {
            console.error("Erreur lors de la suppression du message: ", error);
            forumMsgBox(tMsg('deleteMessageError'));
        });
}

/** Après enregistrement lexique/verset réussi depuis la validation forum (voir __forumValidatePendingId). */
async function forumAfterLexiqueSaveSuccess(messageId) {
    if (!messageId) return;
    try {
        const ref = db.collection("forumMessages").doc(messageId);
        const snap = await ref.get();
        if (!snap.exists) {
            window.__forumValidatePendingId = null;
            forumMsgBox(tMsg("messageNotFound"));
            return;
        }
        const d = snap.data();
        const F = getForumStrings();
        let msg = typeof d.message === "string" ? d.message : "";
        const plainLow = stripHtmlForum(msg).toLowerCase();
        let newMsg = msg;
        if (!forumPlainHasValidationStamp(plainLow)) {
            const who = String(nameUser || "anonyme").trim() || "anonyme";
            const prefix = F.validatedByPrefix || "validé par:";
            const suffix = `<br><br>${escapeHtmlForum(prefix)} @${escapeHtmlForum(who)}`;
            newMsg = msg + suffix;
        }
        const badge = F.actionValidatedBadge || "Validé";
        await ref.update({
            message: newMsg,
            repondu: true,
            lastValidatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            action: badge
        });
        window.__forumValidatePendingId = null;
        var subj = "";
        try {
            var inp = document.getElementById("popupInputMot");
            subj = inp ? String(inp.value || "").trim() : "";
        } catch (_) { }
        if (typeof alertMsgBoxTemp === "function") {
            alertMsgBoxTemp(tMsg("validatedOk", { subject: subj || "…" }), "green", 3500);
        } else {
            forumMsgBox(tMsg("validatedOk", { subject: subj || "…" }));
        }
        var checkbox = document.getElementById("checkbox-" + messageId);
        if (checkbox) checkbox.checked = true;
    } catch (e) {
        console.error("forumAfterLexiqueSaveSuccess", e);
        forumMsgBox(tMsg("validationGenericError"));
    }
}

window.forumAfterLexiqueSaveSuccess = forumAfterLexiqueSaveSuccess;

// Fonction pour valider un message (modération → ouvre la popup commentaire en « Ajouter » avec texte prérempli ; enregistrement via le bouton de la popup)
async function validerMessage(messageId) {
    if (forumGetNiveau() < 2) {
        forumMsgBox(tMsg('validateDenied', { name: nameUser }));
        return;
    }

    try {
        var doc = await db.collection('forumMessages').doc(messageId).get();
        if (!doc.exists) {
            forumMsgBox(tMsg('messageNotFound'));
        return;
    }
        var d = doc.data();
        if (!forumActionNeedsValidation(d.action)) {
            forumMsgBox(tMsg("validationNotRequested", { subject: String(d.sujet || "").trim() || "—" }));
            return;
        }
        var sujetRaw = String(d.sujet || "").trim();
        var commentaireSrc = typeof d.message === "string" ? d.message : "";
        commentaireSrc = stripHtmlForum(commentaireSrc);

        if (!sujetRaw) {
            forumMsgBox(tMsg('messageNotFound'));
            return;
        }

        var mot = sujetRaw.replace(/\+/g, " ").replace(/'/g, "\u2019").trim().toLowerCase();
        if (typeof dedoubleSheddaSafe === "function") {
            try {
                mot = dedoubleSheddaSafe(mot);
            } catch (e0) {
                console.warn("dedoubleSheddaSafe", e0);
            }
        }

        var commentaireClean = typeof nettoyerCommentairePourChampTexte === "function"
            ? nettoyerCommentairePourChampTexte(commentaireSrc)
            : commentaireSrc;

        var motEl = document.getElementById("mot");
        if (motEl) motEl.value = mot;

        window.__forumValidatePendingId = messageId;

        if (typeof afficherPopupCommentaire === "function") {
            afficherPopupCommentaire("ajouter", sujetRaw, commentaireClean);
                    } else {
            window.__forumValidatePendingId = null;
            forumMsgBox(tMsg("validationGenericError"));
        }
    } catch (error) {
        console.error("Erreur lors de la validation du message :", error);
        try {
            window.__forumValidatePendingId = null;
        } catch (_) { }
        forumMsgBox(tMsg("validationGenericError"));
    }
}

function forumMsgBox(message) {
    if (typeof alertMsgBoxPopup === 'function') {
        alertMsgBoxPopup(String(message || ''));
        return;
    }
    let box = null;
    try {
        const loc = document.getElementById("contenuLocal");
        if (loc && loc.style.display !== "none" && loc.querySelector("#MessagesDuForum")) {
            box = loc.querySelector("#MessagesDuForum");
        }
    } catch (_) { }
    if (!box) box = document.getElementById("MessagesDuForum");
    if (box) box.textContent = String(message || '');
}

function syncForumEditPrivateLabel() {
    const ov = forumGetOpenEditOverlay();
    const cb =
        (ov && ov.querySelector("#forumEditPrivate")) || forumReadScopedGet("forumEditPrivate");
    const span =
        (ov && ov.querySelector("#forumEditPrivateLabel")) ||
        forumReadScopedGet("forumEditPrivateLabel");
    if (!cb || !span) return;
    const F = getForumStrings();
    if (cb.checked) {
        span.textContent = F.privacyPrivate || "Privé";
        span.style.color = "#15803d";
    } else {
        span.textContent = F.privacyPublic || "Public";
        span.style.color = "#b91c1c";
    }
    span.style.fontWeight = "700";
    const hint = F.privacyCheckboxHint || "Coché : privé. Décoché : public.";
    cb.title = hint;
    cb.setAttribute("aria-label", hint);
}

function syncForumReadPrivateLabel() {
    const ov = forumGetOpenReadOverlay();
    const cb =
        (ov && ov.querySelector("#forumReadPrivateCb")) || document.getElementById("forumReadPrivateCb");
    const span =
        (ov && ov.querySelector("#forumReadPrivateLabel")) ||
        document.getElementById("forumReadPrivateLabel");
    if (!cb || !span) return;
    const F = getForumStrings();
    if (cb.checked) {
        span.textContent = F.privacyPrivate || "Privé";
        span.style.color = "#15803d";
    } else {
        span.textContent = F.privacyPublic || "Public";
        span.style.color = "#b91c1c";
    }
    span.style.fontWeight = "700";
    const hint = F.privacyCheckboxHint || "Coché : privé. Décoché : public.";
    cb.title = hint;
    cb.setAttribute("aria-label", hint);
}

function openForumEditReply(messageId, replyIndex) {
    forumHideEditSubjectSuggest();
    const entry = forumReaderDocsCache.find((e) => e.id === messageId);
    if (!entry || !Array.isArray(entry.data.reponses)) return;
    const raw = entry.data.reponses[replyIndex];
    if (raw == null) return;
    const norm = forumNormalizeReply(raw);
    if (!forumCanDeleteReplyNorm(norm)) {
        forumMsgBox(getForumStrings().forumEditDenied);
        return;
    }
    window.__forumEditMessageId = messageId;
    window.__forumEditReplyIndex = replyIndex;
    window.__forumEditTitleAuthor = String(norm.name || entry.data.name || "").trim();
    const row = forumReadScopedGet("forumEditSubjectRow");
    if (row) row.style.display = "none";
    const subj = forumReadScopedGet("forumEditSubject");
    if (subj) subj.value = "";
    const body = forumReadScopedGet("forumEditBody");
    if (body) body.value = forumHtmlToEditablePlain(norm.html);
    const rowPr = forumReadScopedGet("forumEditPrivateRow");
    if (rowPr) rowPr.style.display = "none";
    const ov = forumLiftOverlayToBody(forumReadScopedGet("forumEditOverlay"));
    if (!ov) return;
    forumApplyOverlayZAboveNotes(ov);
    ov.style.display = "flex";
    ov.setAttribute("aria-hidden", "false");
    applyForumEditOverlayI18n();
    window.requestAnimationFrame(function () {
        if (body) body.focus();
    });
}

function forumOpenEditMessageUI(messageId, d) {
    if (!d) return;
    if (d.isPrivate === true) {
        if (!forumOwnerActionsAllowed(d)) {
            forumMsgBox(getForumStrings().forumEditDenied);
            return;
        }
    } else if (!forumPostAuthorMatches(d) && forumGetNiveau() < 2) {
        forumMsgBox(getForumStrings().forumEditDenied);
        return;
    }
    // Fusion UI : édition de fil via la modale Notes (articles-forum-modal.js)
    if (typeof window.openArticlesForumNotesModal === "function") {
        const bodyPlainFromMsg = forumHtmlToEditablePlain(typeof d.message === "string" ? d.message : "");
        window.openArticlesForumNotesModal({
            editMessageId: messageId,
            prefillTitle: String(d.sujet || ""),
            prefillBody: bodyPlainFromMsg,
            isPrivate: d.isPrivate === true
        });
        return;
    }

    window.__forumEditMessageId = messageId;
    window.__forumEditReplyIndex = null;
    window.__forumEditTitleAuthor = String(d.name || "").trim();
    const row = forumReadScopedGet("forumEditSubjectRow");
    if (row) row.style.display = "";
    const subj = forumReadScopedGet("forumEditSubject");
    const body = forumReadScopedGet("forumEditBody");
    if (subj) subj.value = String(d.sujet || "");
    if (body) body.value = forumHtmlToEditablePlain(typeof d.message === "string" ? d.message : "");
    const rowPriv = forumReadScopedGet("forumEditPrivateRow");
    const priv = forumReadScopedGet("forumEditPrivate");
    if (rowPriv) rowPriv.style.display = "";
    if (priv) priv.checked = d.isPrivate === true;
    syncForumEditPrivateLabel();
    forumHideEditSubjectSuggest();
    const ov = forumLiftOverlayToBody(forumReadScopedGet("forumEditOverlay"));
    if (!ov) return;
    forumApplyOverlayZAboveNotes(ov);
    ov.style.display = "flex";
    ov.setAttribute("aria-hidden", "false");
    applyForumEditOverlayI18n();
    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
            const rowSub = forumReadScopedGet("forumEditSubjectRow");
            if (subj && rowSub && rowSub.style.display !== "none") {
                try {
                    subj.focus({ preventScroll: true });
                } catch (_) {
                    subj.focus();
                }
                window.setTimeout(function () {
                    const editOv2 = forumGetOpenEditOverlay();
                    const sug = editOv2 && editOv2.querySelector("#forumEditSubjectSuggest");
                    if (
                        editOv2 &&
                        editOv2.style.display === "flex" &&
                        document.activeElement === subj &&
                        sug &&
                        sug.style.display === "none"
                    ) {
                        forumRunEditSubjectSuggestOnFocus();
                    }
                }, 50);
            } else if (subj) {
                try {
                    subj.focus({ preventScroll: true });
                } catch (_) {
                    subj.focus();
                }
            }
        });
    });
}

function openForumEditMessage(messageId) {
    const entry = forumReaderDocsCache.find((e) => e.id === messageId);
    if (!entry) return;
    forumOpenEditMessageUI(messageId, entry.data);
}

async function forumOpenEditMessageById(messageId) {
    const id = String(messageId || "").trim();
    if (!id) return;
    const cached = forumReaderDocsCache.find((e) => e.id === id);
    if (cached) {
        openForumEditMessage(id);
        return;
    }
    try {
        const snap = await db.collection("forumMessages").doc(id).get();
        if (!snap.exists) {
            forumMsgBox(getForumStrings().forumEditDenied || "Introuvable.");
            return;
        }
        forumOpenEditMessageUI(id, snap.data());
    } catch (e) {
        console.error("forumOpenEditMessageById", e);
        forumMsgBox(tMsg("forumSendErrorRetry"));
    }
}

var forumEditSubjectSuggestHideTimer = null;
var forumEditSubjectSuggestLoading = false;
var forumEditSubjectSuggestData = [];

function forumEscSuggestUi(s) {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function forumDocTsForSubjectSuggest(data) {
    if (!data || !data.timestamp) return 0;
    const t = data.timestamp;
    try {
        if (typeof t.toMillis === "function") return t.toMillis();
    } catch (_) { }
    if (typeof t.seconds === "number") return t.seconds * 1000;
    return 0;
}

function forumFallbackLoadAuthorSubjects() {
    return new Promise(function (resolve) {
        const auth = firebase.auth && firebase.auth().currentUser;
        const email = auth && auth.email ? String(auth.email).trim().toLowerCase() : "";
        if (!email || typeof db === "undefined" || !db.collection) {
            resolve([]);
            return;
        }
        db.collection("forumMessages")
            .where("mail", "==", email)
            .limit(160)
            .get()
            .then(function (snap) {
                const rows = [];
                snap.forEach(function (doc) {
                    rows.push({ data: doc.data() });
                });
                rows.sort(function (a, b) {
                    return forumDocTsForSubjectSuggest(b.data) - forumDocTsForSubjectSuggest(a.data);
                });
                const byKey = new Map();
                for (let i = 0; i < rows.length; i++) {
                    const sujet = String(rows[i].data.sujet || "").trim();
                    if (!sujet) continue;
                    const key = forumNormalizeSubjectKey(sujet);
                    if (!key) continue;
                    if (!byKey.has(key)) byKey.set(key, sujet);
                }
                resolve(Array.from(byKey.values()));
            })
            .catch(function (e) {
                console.warn("forumFallbackLoadAuthorSubjects", e);
                resolve([]);
            });
    });
}

async function forumLoadSubjectsForSuggest() {
    if (typeof window.zcLoadAuthorForumSubjectsForCurrentUser === "function") {
        try {
            return await window.zcLoadAuthorForumSubjectsForCurrentUser();
        } catch (e) {
            console.warn("forumLoadSubjectsForSuggest", e);
        }
    }
    return forumFallbackLoadAuthorSubjects();
}

function forumRunEditSubjectSuggestOnFocus() {
    const subjInput = forumReadScopedGet("forumEditSubject");
    if (!subjInput) return;
    const row = forumReadScopedGet("forumEditSubjectRow");
    if (row && row.style.display === "none") return;
    if (forumEditSubjectSuggestHideTimer) {
        clearTimeout(forumEditSubjectSuggestHideTimer);
        forumEditSubjectSuggestHideTimer = null;
    }
    forumEditSubjectSuggestLoading = true;
    forumRenderEditSubjectSuggest();
    void forumLoadSubjectsForSuggest().then(function (list) {
        forumEditSubjectSuggestData = Array.isArray(list) ? list : [];
        forumEditSubjectSuggestLoading = false;
        const editOv = forumGetOpenEditOverlay();
        if (editOv && document.activeElement === subjInput) {
            forumRenderEditSubjectSuggest();
        }
    });
}

function forumFilterSubjectsSuggestLocal(all, q) {
    const needle = String(q || "")
        .trim()
        .toLowerCase();
    if (!needle) return all.slice();
    return all.filter(function (s) {
        return String(s).toLowerCase().indexOf(needle) !== -1;
    });
}

function forumHideEditSubjectSuggest() {
    if (forumEditSubjectSuggestHideTimer) {
        clearTimeout(forumEditSubjectSuggestHideTimer);
        forumEditSubjectSuggestHideTimer = null;
    }
    document.querySelectorAll("[id='forumEditSubjectSuggest']").forEach(function (ul) {
        ul.style.display = "none";
        ul.setAttribute("aria-hidden", "true");
        ul.innerHTML = "";
    });
}

function forumRenderEditSubjectSuggest() {
    const { ul, input } = forumEditActiveSubjectFields();
    if (!ul || !input) return;
    const F = getForumStrings();
    ul.setAttribute("aria-label", F.suggestThreadAria || "Suggestions");

    if (forumEditSubjectSuggestLoading) {
        ul.innerHTML =
            '<li class="empty" style="cursor:default;color:#64748b;">' +
            forumEscSuggestUi(F.suggestThreadLoading || "…") +
            "</li>";
        ul.style.display = "block";
        ul.setAttribute("aria-hidden", "false");
        return;
    }

    const all = Array.isArray(forumEditSubjectSuggestData) ? forumEditSubjectSuggestData : [];
    const filtered = forumFilterSubjectsSuggestLocal(all, input.value);

    if (!all.length) {
        ul.innerHTML =
            '<li class="empty" style="cursor:default;color:#64748b;">' +
            forumEscSuggestUi(F.suggestThreadEmpty || "") +
            "</li>";
        ul.style.display = "block";
        ul.setAttribute("aria-hidden", "false");
        return;
    }

    if (!filtered.length) {
        ul.innerHTML =
            '<li class="empty" style="cursor:default;color:#64748b;">' +
            forumEscSuggestUi(F.suggestThreadNone || "") +
            "</li>";
        ul.style.display = "block";
        ul.setAttribute("aria-hidden", "false");
        return;
    }

    ul.innerHTML = "";
    const max = 24;
    const slice = filtered.slice(0, max);
    for (let i = 0; i < slice.length; i++) {
        const s = slice[i];
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        li.className = "zc-forum-edit-subject-suggest-item";
        li.style.textAlign = "left";
        li.textContent = s;
        li.addEventListener("mousedown", function (ev) {
            ev.preventDefault();
            forumApplyEditSubjectSuggestion(s);
        });
        ul.appendChild(li);
    }
    ul.style.display = "block";
    ul.setAttribute("aria-hidden", "false");
}

function forumApplyEditSubjectSuggestion(sujet) {
    const input = forumEditActiveSubjectFields().input;
    if (!input) return;
    input.value = sujet;
    forumHideEditSubjectSuggest();
    try {
        input.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (_) { }
}

function forumPickFirstEditSubjectSuggestion() {
    const ul = forumEditActiveSubjectFields().ul;
    if (!ul || ul.style.display === "none") return;
    const li = ul.querySelector("li.zc-forum-edit-subject-suggest-item");
    if (!li) return;
    forumApplyEditSubjectSuggestion(li.textContent || "");
}

function forumEnsureEditSubjectFieldMarkup() {
    const input = forumReadScopedGet("forumEditSubject");
    if (!input || !input.parentNode) return;
    if (input.parentNode.querySelector("#forumEditSubjectSuggest")) return;
    const wrap = document.createElement("div");
    wrap.className = "zc-forum-edit-subject-field-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const ul = document.createElement("ul");
    ul.id = "forumEditSubjectSuggest";
    ul.className = "suggestions-liste";
    ul.style.display = "none";
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-hidden", "true");
    wrap.appendChild(ul);
}

function closeForumEditOverlay() {
    forumHideEditSubjectSuggest();
    const navigateToId = String(window.__forumNavigateOnEditCloseId || "").trim();
    window.__forumEditMessageId = null;
    window.__forumEditReplyIndex = null;
    try {
        window.__forumEditTitleAuthor = "";
    } catch (_) { }
    const ov = forumGetOpenEditOverlay();
    if (ov) {
        ov.style.display = "none";
        ov.setAttribute("aria-hidden", "true");
    }
    if (navigateToId) {
        window.__forumNavigateOnEditCloseId = "";
        try {
            window.__forumScrollToMessageId = navigateToId;
            if (typeof ouvrirPopupHtml === "function") {
                ouvrirPopupHtml("forum");
            }
        } catch (_) { }
    }
}

/** Envoi depuis la modale Articles → fil forum (notes / brouillon privé). */
async function forumSubmitNotesFromArticlesModal(opts) {
    opts = opts || {};
    const title = String(opts.title || "").trim();
    const bodyPlain = String(opts.body || "").trim();
    const isPrivate = opts.isPrivate !== false;
    const auth = firebase.auth && firebase.auth().currentUser;
    if (!auth || !auth.email) {
        throw new Error("Connexion Firebase requise.");
    }
    const mail = String(auth.email).trim().toLowerCase();
    const _auNotes = forumResolveAuthorForWrite();
    if (forumGetMail() !== mail) {
        throw new Error("L’e-mail de session doit correspondre au compte connecté.");
    }
    if (!forumIsLoggedReal()) {
        throw new Error("Connectez-vous avec un compte réel (pas anonyme).");
    }
    const subjectKey = forumNormalizeSubjectKey(title);
    if (!subjectKey || title.length < 3) {
        throw new Error("Titre trop court.");
    }
    if (bodyPlain.length < 2) {
        throw new Error("Texte trop court (min. 2 caractères).");
    }
    const name = _auNotes.name;
    const existing = await forumFindExistingTopicBySubjectKeyAndAuthor(subjectKey, mail);
    var msgHtml;
    try {
        msgHtml =
            typeof formatLienForum === "function"
                ? formatLienForum(bodyPlain)
                : String(bodyPlain).replace(/(\r\n|\r|\n)/g, "<br>");
    } catch (err) {
        msgHtml = String(bodyPlain).replace(/(\r\n|\r|\n)/g, "<br>");
    }
    const dateModif = new Date().toLocaleString();
    if (existing && existing.id) {
        const docRef = db.collection("forumMessages").doc(existing.id);
        const newReply = forumBuildReplyFromFreeText(bodyPlain, name, mail, dateModif);
        await docRef.update({
            reponses: firebase.firestore.FieldValue.arrayUnion(newReply),
            repondu: false,
            lastReplyAt: firebase.firestore.FieldValue.serverTimestamp(),
            sujetKey: subjectKey
        });
        try {
            const snap = await docRef.get();
            if (snap.exists) forumTryNotifyAuthorOfNewReply(existing.id, snap.data(), newReply);
        } catch (_) { }
        try {
            addDbCollectionUsers("historiqueActions", name, mail, title, bodyPlain, "Reply");
        } catch (_) { }
        return { ok: true, mode: "reply", id: existing.id };
    }
    await db.collection("forumMessages").add({
        name: name,
        mail: mail,
        sujet: title,
        sujetKey: subjectKey,
        message: msgHtml,
        action: "msgForum",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        isPrivate: !!isPrivate
    });
    try {
        addDbCollectionUsers("historiqueActions", name, mail, title, bodyPlain, "msgForum");
    } catch (_) { }
    return { ok: true, mode: "new" };
}

window.forumSubmitNotesFromArticlesModal = forumSubmitNotesFromArticlesModal;

/** Édition du message principal d'un fil via la modale Notes fusionnée. */
async function forumUpdateTopicMainFromNotes(opts) {
    opts = opts || {};
    const id = String(opts.id || "").trim();
    const sujet = String(opts.title || "").trim();
    const bodyPlain = String(opts.body || "").trim();
    const isPrivate = opts.isPrivate === true;
    if (!id) throw new Error("Fil introuvable.");
    if (!sujet || sujet.length < 3) throw new Error("Titre trop court.");
    if (bodyPlain.length < 2) throw new Error("Texte trop court (min. 2 caractères).");

    let snap = null;
    try {
        snap = await db.collection("forumMessages").doc(id).get();
    } catch (_) { }
    if (!snap || !snap.exists) throw new Error("Fil introuvable.");
    const d = snap.data() || {};

    const privPost = d.isPrivate === true;
    const okAuthor = forumOwnerActionsAllowed(d);
    const okModPublic = !privPost && forumGetNiveau() >= 2;
    if (!okAuthor && !okModPublic) throw new Error(getForumStrings().forumEditDenied || "Modification refusée.");

    var msgHtml;
    try {
        msgHtml = typeof formatLienForum === "function"
            ? formatLienForum(bodyPlain)
            : String(bodyPlain).replace(/(\r\n|\r|\n)/g, "<br>");
    } catch (err) {
        msgHtml = String(bodyPlain).replace(/(\r\n|\r|\n)/g, "<br>");
    }

    const patch = {
        sujet: sujet,
        sujetKey: forumNormalizeSubjectKey(sujet),
        message: msgHtml,
        isPrivate: isPrivate,
        editedAt: firebase.firestore.FieldValue.serverTimestamp(),
        editedByMail: forumGetMail()
    };
    await db.collection("forumMessages").doc(id).update(patch);
    try {
        if (typeof window.zcInvalidateAuthorForumSubjectsCache === "function") {
            window.zcInvalidateAuthorForumSubjectsCache();
        }
    } catch (_) { }
}

window.forumUpdateTopicMainFromNotes = forumUpdateTopicMainFromNotes;

async function forumDeleteTopicFromNotes(messageId) {
    const id = String(messageId || "").trim();
    if (!id) throw new Error("Fil introuvable.");
    let snap = null;
    try {
        snap = await db.collection("forumMessages").doc(id).get();
    } catch (_) { }
    if (!snap || !snap.exists) throw new Error("Fil introuvable.");
    const d = snap.data() || {};
    const okOwner = forumOwnerActionsAllowed(d);
    const okModPublic = forumGetNiveau() >= 2 && d.isPrivate !== true;
    if (!okOwner && !okModPublic) {
        throw new Error(getForumStrings().forumEditDenied || "Suppression refusée.");
    }
    await db.collection("forumMessages").doc(id).delete();
}

window.forumDeleteTopicFromNotes = forumDeleteTopicFromNotes;

async function saveForumEditMessage() {
    const id = window.__forumEditMessageId;
    if (!id) return;
    forumResolveAuthorForWrite();
    const editRoot = forumGetOpenEditOverlay();
    const subjEl =
        (editRoot && editRoot.querySelector("#forumEditSubject")) ||
        forumReadScopedGet("forumEditSubject");
    const bodyEl =
        (editRoot && editRoot.querySelector("#forumEditBody")) ||
        forumReadScopedGet("forumEditBody");
    const bodyPlain = (bodyEl && bodyEl.value || "").trim();
    const replyIdx = window.__forumEditReplyIndex;
    const F = getForumStrings();

    if (replyIdx != null && replyIdx >= 0) {
        if (!bodyPlain) {
            forumMsgBox(F.forumEditReplyEmpty || F.forumEditEmpty);
            return;
        }
        const entry = forumReaderDocsCache.find((e) => e.id === id);
        const list = entry && Array.isArray(entry.data.reponses) ? entry.data.reponses : [];
        if (!entry || replyIdx < 0 || replyIdx >= list.length) return;
        const norm = forumNormalizeReply(list[replyIdx]);
        if (!forumCanDeleteReplyNorm(norm)) {
            forumMsgBox(F.forumEditDenied);
            return;
        }
        var msgHtmlReply;
        try {
            msgHtmlReply = typeof formatLienForum === "function"
                ? formatLienForum(bodyPlain)
                : String(bodyPlain).replace(/(\r\n|\r|\n)/g, "<br>");
        } catch (err) {
            msgHtmlReply = String(bodyPlain).replace(/(\r\n|\r|\n)/g, "<br>");
        }
        const docRef = db.collection("forumMessages").doc(id);
        try {
            await db.runTransaction(async (tx) => {
                const snap = await tx.get(docRef);
                if (!snap.exists) throw new Error("missing");
                const reps = Array.isArray(snap.data().reponses) ? [...snap.data().reponses] : [];
                if (replyIdx < 0 || replyIdx >= reps.length) return;
                const old = reps[replyIdx];
                const n2 = forumNormalizeReply(old);
                var next;
                var _awSave = forumResolveAuthorForWrite();
                if (n2.mail) {
                    next = { html: msgHtmlReply, mail: n2.mail, name: String(n2.name || _awSave.name || "") };
                } else {
                    next = { html: msgHtmlReply, mail: _awSave.mail, name: String(_awSave.name || "") };
                }
                reps[replyIdx] = next;
                tx.update(docRef, {
                    reponses: reps,
                    replyEditedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            try {
                if (typeof window.zcInvalidateAuthorForumSubjectsCache === "function") {
                    window.zcInvalidateAuthorForumSubjectsCache();
                }
            } catch (_) { }
            closeForumEditOverlay();
            forumMsgBox(F.forumReplyUpdated || F.forumUpdated);
            window.requestAnimationFrame(function () {
                openForumReadPopup(id);
            });
        } catch (err) {
            console.error("saveForumEditMessage reply", err);
            forumMsgBox(tMsg("forumSendErrorRetry"));
        }
        return;
    }

    const sujet = (subjEl && subjEl.value || "").trim();
    if (!sujet || !bodyPlain) {
        forumMsgBox(F.forumEditEmpty || F.forumEditDenied);
        return;
    }
    let entryPost = forumReaderDocsCache.find((e) => e.id === id);
    if (!entryPost) {
        try {
            const snapPost = await db.collection("forumMessages").doc(id).get();
            if (snapPost.exists) entryPost = { id, data: snapPost.data() };
        } catch (_) { }
    }
    const dSave = entryPost.data;
    const privPost = dSave.isPrivate === true;
    const okAuthorSave = forumOwnerActionsAllowed(dSave);
    const okModPublicSave = !privPost && forumGetNiveau() >= 2;
    if (!entryPost || (!okAuthorSave && !okModPublicSave)) {
        forumMsgBox(F.forumEditDenied);
        return;
    }
    var msgHtml;
    try {
        msgHtml = typeof formatLienForum === "function"
            ? formatLienForum(bodyPlain)
            : String(bodyPlain).replace(/(\r\n|\r|\n)/g, "<br>");
    } catch (err) {
        msgHtml = String(bodyPlain).replace(/(\r\n|\r|\n)/g, "<br>");
    }
    const privEl =
        (editRoot && editRoot.querySelector("#forumEditPrivate")) ||
        forumReadScopedGet("forumEditPrivate");
    var isPriv;
    if (privEl) {
        isPriv = !!privEl.checked;
    } else {
        isPriv = entryPost.data.isPrivate === true;
    }
    const patchSave = {
        sujet: sujet,
        sujetKey: forumNormalizeSubjectKey(sujet),
        message: msgHtml,
        isPrivate: isPriv,
        editedAt: firebase.firestore.FieldValue.serverTimestamp(),
        editedByMail: forumGetMail()
    };
    try {
        await db.collection("forumMessages").doc(id).update(patchSave);
        try {
            if (typeof window.zcInvalidateAuthorForumSubjectsCache === "function") {
                window.zcInvalidateAuthorForumSubjectsCache();
            }
        } catch (_) { }
        closeForumEditOverlay();
        forumMsgBox(F.forumUpdated);
    } catch (err) {
        console.error("saveForumEditMessage", err);
        forumMsgBox(tMsg("forumSendErrorRetry"));
    }
}

function forumEditCopyPlainText(text) {
    const t = String(text == null ? "" : text);
    try {
        if (typeof copierTexte === "function") {
            copierTexte(t);
            return;
        }
    } catch (_) { }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).catch(function () { });
    }
}

function forumEditClearSubjectAndSyncMot() {
    const subj = forumReadScopedGet("forumEditSubject");
    if (!subj) return;
    subj.value = "";
    try {
        subj.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (_) { }
    try {
        if (typeof window.zcSyncMotClones === "function") window.zcSyncMotClones();
    } catch (_) { }
}

(function bindForumEditOverlay() {
    forumEnsureEditSubjectFieldMarkup();

    document.addEventListener(
        "focusin",
        function (e) {
            const t = e.target;
            if (!t || t.id !== "forumEditSubject") return;
            const ov = t.closest("#forumEditOverlay");
            if (!ov) return;
            let flex = ov.style.display === "flex";
            try {
                if (!flex && typeof getComputedStyle === "function") {
                    flex = getComputedStyle(ov).display === "flex";
                }
            } catch (_) { }
            if (!flex) return;
            forumRunEditSubjectSuggestOnFocus();
        },
        true
    );

    document.addEventListener(
        "focusout",
        function (e) {
            const t = e.target;
            if (!t || t.id !== "forumEditSubject") return;
            if (!t.closest("#forumEditOverlay")) return;
            forumEditSubjectSuggestHideTimer = setTimeout(function () {
                forumHideEditSubjectSuggest();
                forumEditSubjectSuggestHideTimer = null;
            }, 220);
        },
        true
    );

    document.addEventListener(
        "keydown",
        function (e) {
            const t = e.target;
            if (!t || t.id !== "forumEditSubject") return;
            if (!t.closest("#forumEditOverlay")) return;
            if (e.key === "Escape") {
                forumHideEditSubjectSuggest();
                return;
            }
            if (e.key === "Enter") {
                const sug = forumEditActiveSubjectFields().ul;
                if (
                    sug &&
                    sug.style.display !== "none" &&
                    sug.querySelector("li.zc-forum-edit-subject-suggest-item")
                ) {
                    e.preventDefault();
                    forumPickFirstEditSubjectSuggestion();
                }
            }
        },
        true
    );

    document.addEventListener(
        "input",
        function (e) {
            const t = e.target;
            if (!t || t.id !== "forumEditSubject") return;
            if (!t.closest("#forumEditOverlay")) return;
            forumRenderEditSubjectSuggest();
        },
        true
    );

    document.addEventListener(
        "mousedown",
        function (e) {
            const t = e.target;
            if (!(t instanceof Element)) return;
            const editOv = forumGetOpenEditOverlay();
            if (!editOv) return;
            const wrap = editOv.querySelector(".zc-forum-edit-subject-field-wrap");
            if (wrap && wrap.contains(t)) return;
            forumHideEditSubjectSuggest();
        },
        true
    );

    document.addEventListener(
        "change",
        function (e) {
            const t = e.target;
            if (t && t.id === "forumEditPrivate" && t.closest("#forumEditOverlay")) {
                syncForumEditPrivateLabel();
            }
        },
        true
    );

    document.addEventListener(
        "click",
        function (e) {
            const t = e.target;
            if (!t || typeof t.closest !== "function") return;
            const hitCloseX = t.closest("#forumEditCloseX");
            const hitCancel = t.closest("#forumEditCancel");
            const hitSave = t.closest("#forumEditSave");
            const hitSubjClear = t.closest("#forumEditSubjectClear");
            const hitSubjCopy = t.closest("#forumEditSubjectCopy");
            const hitBodyClear = t.closest("#forumEditBodyClear");
            const hitBodyCopy = t.closest("#forumEditBodyCopy");
            if (
                !hitCloseX &&
                !hitCancel &&
                !hitSave &&
                !hitSubjClear &&
                !hitSubjCopy &&
                !hitBodyClear &&
                !hitBodyCopy
            ) {
                return;
            }
            const ov = t.closest("#forumEditOverlay");
            const openOv = forumGetOpenEditOverlay();
            if (!ov || !openOv || ov !== openOv) return;
            if (hitCloseX || hitCancel) {
                e.preventDefault();
                closeForumEditOverlay();
                return;
            }
            if (hitSave) {
                e.preventDefault();
                void saveForumEditMessage();
                return;
            }
            if (hitSubjClear) {
                e.preventDefault();
                forumHideEditSubjectSuggest();
                forumEditClearSubjectAndSyncMot();
                try {
                    const si = ov.querySelector("#forumEditSubject");
                    if (si) si.focus();
                } catch (_) { }
                return;
            }
            if (hitSubjCopy) {
                e.preventDefault();
                const si = ov.querySelector("#forumEditSubject");
                forumEditCopyPlainText(si ? si.value || "" : "");
                return;
            }
            if (hitBodyClear) {
                e.preventDefault();
                const ta = ov.querySelector("#forumEditBody");
                if (ta) {
                    ta.value = "";
                    try {
                        ta.dispatchEvent(new Event("input", { bubbles: true }));
                    } catch (_) { }
                    ta.focus();
                }
                return;
            }
            if (hitBodyCopy) {
                e.preventDefault();
                const ta = ov.querySelector("#forumEditBody");
                forumEditCopyPlainText(ta ? ta.value || "" : "");
            }
        },
        true
    );
})();

window.openForumEditMessage = openForumEditMessage;
window.openForumEditReply = openForumEditReply;
window.forumOpenEditMessageById = forumOpenEditMessageById;
window.forumOpenReadMessageById = forumOpenReadMessageById;
window.forumNormalizeSubjectKey = forumNormalizeSubjectKey;
window.forumFindExistingTopicBySubjectKeyAndAuthor = forumFindExistingTopicBySubjectKeyAndAuthor;
window.forumHtmlToEditablePlain = forumHtmlToEditablePlain;


/** Au focus : laisser le CSS (min/max vh) piloter la taille ; au blur : hauteur = contenu. */
function zcTextareaFocusExpand(ta) {
    if (!ta || ta.closest(".zc-ta-zen-expanded")) return;
    ta.style.height = "";
}

function zcTextareaBlurCompact(ta) {
    if (!ta || ta.closest(".zc-ta-zen-expanded")) return;
    ta.style.height = "";
    if (ta.id) ajusterHauteur(ta.id);
}

window.zcTextareaFocusExpand = zcTextareaFocusExpand;
window.zcTextareaBlurCompact = zcTextareaBlurCompact;

// Fonction pour ajuster la hauteur du textarea en fonction du contenu
function ajusterHauteur(textAreaId) {
    var textarea = document.getElementById(textAreaId);
    if (!textarea) return;
    /* Jumeaux .zc-ui-search-field : hauteur fixe une ligne (CSS), pas d’inline style. */
    if (textarea.classList && textarea.classList.contains("zc-ui-search-field")) {
        textarea.style.height = "";
        return;
    }
    if (textarea.closest(".zc-ta-zen-expanded")) return;
    if ((textarea.classList.contains("zc-forum-reply-ta") || textarea.classList.contains("zc-popup-textarea"))
        && document.activeElement === textarea) {
        return;
    }
    var ui = document.getElementById("user-info");
    if (ui) ui.innerHTML = "";
    try { if (typeof window.updateUserUI === "function") window.updateUserUI(); } catch (_) { }

    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
}

// Fonction pour rétablir la hauteur par défaut (150px)
function hauteurParDefaut(textAreaId) {
    var textarea = document.getElementById(textAreaId);
    if (!textarea) return;
    if (textarea.closest(".zc-ta-zen-expanded")) return;
    if (textarea.classList && textarea.classList.contains("zc-ui-search-field")) {
        textarea.style.height = "";
        return;
    }
    if (textAreaId === "mot") {
        textarea.style.height = '40px';
    } else {
        textarea.style.height = '60px';
    }
}
function forumSyncWelcomeMoreToggleChrome(btn, F) {
    if (!btn) return;
    const Ft = F || (typeof getForumStrings === "function" ? getForumStrings() : {});
    const open = btn.getAttribute("aria-expanded") === "true";
    /* Ne jamais faire btn.textContent = … : le clic cible alors un nœud texte (sans .closest) et la bascule casse. */
    let g = btn.querySelector(".zc-forum-welcome-more-glyph");
    if (!g) {
        g = document.createElement("span");
        g.className = "zc-forum-welcome-more-glyph";
        g.setAttribute("aria-hidden", "true");
        btn.appendChild(g);
    }
    g.textContent = open ? "\u2212" : "+";
    btn.title = open
        ? (Ft.welcomeMoreCollapseTitle || "Réduire le menu des commandes")
        : (Ft.welcomeMoreToggleTitle || "Plus d’actions");
}

/** Cible réelle du clic (Element), pour les clics sur nœuds texte à l’intérieur d’un bouton. */
function forumEventTargetElement(e) {
    const n = e && e.target;
    if (!n) return null;
    return n.nodeType === 1 ? n : n.parentElement;
}

/**
 * Affiche / masque le bloc commandes comme le pied « Visiteurs » : classe zc-panel-collapsed sur le panneau module.
 * (L’attribut hidden seul peut entrer en conflit avec d’autres règles ; le repli officiel du projet est zc-panel-collapsed.)
 */
function forumSetWelcomeMoreOpenForScope(welcomePanelEl, isOpen) {
    if (!welcomePanelEl) return;
    const F = typeof getForumStrings === "function" ? getForumStrings() : {};
    const panel = welcomePanelEl.querySelector("#forumWelcomeMorePanel");
    const btn = welcomePanelEl.querySelector("#forumWelcomeMoreBtn");
    if (!panel || !btn) return;
    panel.removeAttribute("hidden");
    panel.style.display = "";
    if (isOpen) {
        welcomePanelEl.classList.remove("zc-panel-collapsed");
        btn.setAttribute("aria-expanded", "true");
    } else {
        welcomePanelEl.classList.add("zc-panel-collapsed");
        btn.setAttribute("aria-expanded", "false");
    }
    forumSyncWelcomeMoreToggleChrome(btn, F);
}

/** Clic direct sur le +/− (onclick dans le HTML, y compris clone #contenuLocal) — stoppe la propagation pour éviter double bascule. */
function forumOnWelcomeMoreToggleClick(ev, btn) {
    if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
    }
    const wrap = btn && btn.closest && btn.closest(".zc-forum-welcome-panel");
    if (!wrap) return false;
    const opening = wrap.classList.contains("zc-panel-collapsed");
    forumSetWelcomeMoreOpenForScope(wrap, opening);
    return false;
}
window.forumOnWelcomeMoreToggleClick = forumOnWelcomeMoreToggleClick;

function forumCloseWelcomeMore() {
    document.querySelectorAll(".zc-forum-welcome-panel").forEach(function (w) {
        forumSetWelcomeMoreOpenForScope(w, false);
    });
}
window.forumCloseWelcomeMore = forumCloseWelcomeMore;

(function bindForumWelcomeMoreOutsideClose() {
    document.addEventListener("click", function (e) {
        const t = forumEventTargetElement(e);
        if (!t || typeof t.closest !== "function") return;
        if (t.closest("#forumWelcomeMoreBtn")) return;
        document.querySelectorAll(".zc-forum-welcome-panel").forEach(function (wrap) {
            if (wrap.classList.contains("zc-panel-collapsed")) return;
            const panel = wrap.querySelector("#forumWelcomeMorePanel");
            if (!panel) return;
            if (panel.contains(t)) return;
            if (wrap.querySelector(".zc-module-head") && wrap.querySelector(".zc-module-head").contains(t)) return;
            forumSetWelcomeMoreOpenForScope(wrap, false);
        });
    });
})();

applyForumShellI18n();
applyForumReplyPopupI18n();
applyForumReaderI18n();
applyForumEditOverlayI18n();

(function bindForumUiLang() {
    const sel = document.getElementById("uiLangSelect");
    if (!sel) return;
    sel.addEventListener("change", () => {
        try { refreshForumI18n(); } catch (_) { }
    });
})();

(function bindForumShellHeader() {
    /* innerHTML du forum dans #contenuLocal = pas d’écouteurs sur le clone : délégation document. */
    document.addEventListener(
        "click",
        function (e) {
            const t = e.target;
            if (!t || typeof t.closest !== "function") return;
            if (t.closest(".js-forum-shell-help")) {
                e.preventDefault();
                if (typeof showForumShellHelp === "function") showForumShellHelp();
                return;
            }
            if (t.closest(".js-forum-open-notes")) {
                e.preventDefault();
                try {
                    if (typeof forumCloseWelcomeMore === "function") forumCloseWelcomeMore();
                } catch (_) { }
                if (typeof window.openArticlesForumNotesModal === "function") {
                    window.openArticlesForumNotesModal();
                }
            }
        },
        true
    );
})();

/* Compteur « nouveaux » forum : jsZC/chokr-notify.js (Firestore temps réel + chokrForumSeenAt) */

function simulateClickBtn(idBtn) {
    // Trouver l'élément avec l'ID 'lexiqueBtn'
    const clickBtn = document.getElementById(idBtn);
    // Vérifier si l'élément existe
    if (clickBtn) {
        // Simuler un clic sur le bouton
        clickBtn.click();
    } else {
        console.error(idBtn + ' non trouvé');
    }
    //envoyerMailForum2//scrol vers le champ commentaires
    //scrollToTop();
    //document.getElementById("commentaires").focus();

}

/** Lien partagé ?forumMsg=… : ouvrir la popup forum et centrer le message sans animation de défilement. */
(function initForumDeepLinkFromUrl() {
    function run() {
        let id = "";
        try {
            id = (new URLSearchParams(location.search).get("forumMsg") || "").trim();
        } catch (_) { }
        if (!id) return;
        window.__forumScrollToMessageId = id;
        if (typeof ouvrirPopupHtml === "function") {
            try {
                ouvrirPopupHtml("forum");
            } catch (e) {
                console.warn("initForumDeepLinkFromUrl", e);
            }
        }
        try {
            const u = new URL(location.href);
            if (u.searchParams.has("forumMsg")) {
                u.searchParams.delete("forumMsg");
                const q = u.searchParams.toString();
                history.replaceState(null, "", u.pathname + (q ? "?" + q : "") + u.hash);
            }
        } catch (_) { }
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => setTimeout(run, 650), { once: true });
    } else {
        setTimeout(run, 650);
    }
})();
