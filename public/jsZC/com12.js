// Shim sûr: si getUILang n'est pas défini, on déduit depuis localStorage/getLang()
if (typeof window.getUILang !== 'function') {
  window.getUILang = function () {
    try { return (getLang() || 'fr').toUpperCase(); } catch { return 'FR'; }
  };
}

// Avant init Firebase : évite TDZ si firebase.firestore() échoue avant la fin du fichier (ex. init.js 404).
const ORDER = ["fr", "ar", "en", "kab", "es"];

var progRacine = true; // conditionne, si input=decimal, l'ouverture de 
// popup soura (moduleSourat) ou 
// popup racine (afficherDefRacines)

// Firebase : initializeApp dans jsZC/firebase-local-init.js (chargé avant ce script dans index.html).
if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
  console.error('Firebase: initialisation manquante. Vérifiez jsZC/firebase-local-init.js après les SDK.');
}

// Initialiser Firestore et Storage
const db = firebase.firestore();
const storage = firebase.storage();

function detecterNombre(texte) {
  if (texte == null) return false;
  const t = String(texte).trim();
  if (t === "") return false;
  // chiffres 0-9, éventuellement ".chiffres" (pas de signe, pas de virgule)
  return /^\d+(?:\.\d+)?$/.test(t);
}


function copierTexte(texte) {
  // Utilisation de l'API Clipboard.writeText() pour copier le texte dans le presse-papiers
  navigator.clipboard.writeText(texte).then(
    function () {
      const preview =
        typeof window.zcShortenCtxPreview === 'function'
          ? window.zcShortenCtxPreview(texte, 80)
          : String(texte || '');
      alertMsgBoxTemp(tMsg('copiedTextSuccess', { text: preview }));
    },
    function (err) {
      console.error('Erreur lors de la copie :', err);
      alertMsgBoxTemp(tMsg('copyError'));
    }
  );
}
// Fonction pour faire défiler jusqu'à une section spécifique
function scrollToSection(elementId) {
  var element = document.getElementById(elementId);
  if (element) {
    element.focus();
    return true; // Indique que le focus a été appliqué avec succès
  } else {
    console.warn(`L'élément avec l'ID '${elementId}' n'a pas été trouvé.`);
    return false; // Indique que l'élément n'a pas été trouvé
  }
}

// Fonction pour remonter en haut de la page
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth' // Défilement fluide
  });
}
// Fonction pour aller à la fin de la page
function scrollToEnd() {
  window.scrollTo({
    top: document.body.scrollHeight, // La hauteur totale de la page
    behavior: 'smooth' // Défilement fluide
  });
}

// Function for displaying the custom confirmation modal with a message limit
async function alertConfirm(message) {
  return new Promise(function (resolve) {
    // Limiter le message à 100 caractères et ajouter "..." si nécessaire
    const limitedMessage = message.length > 100 ? message.slice(0, 100) + "..." : message;

    const modal = document.getElementById('customModal');
    if (!modal) {
      resolve(false);
      return;
    }
    const msgEl = modal.querySelector('#modalMessage');
    if (msgEl) msgEl.innerText = limitedMessage;
    try {
      if (document.body && modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }
    } catch (_) { }
    try {
      if (typeof window.zcBringToFront === 'function') {
        window.zcBringToFront(modal, 0);
      } else if (typeof getNextZIndex === 'function') {
        modal.style.zIndex = String(getNextZIndex());
      }
    } catch (_) { }
    modal.style.display = 'flex';

    var confirmBtn = modal.querySelector('#confirmBtn');
    var cancelBtn = modal.querySelector('#cancelBtn');
    if (!confirmBtn || !cancelBtn) {
      modal.style.display = 'none';
      resolve(false);
      return;
    }

    confirmBtn.onclick = function () {
      modal.style.display = 'none';
      resolve(true);
    };

    cancelBtn.onclick = function () {
      modal.style.display = 'none';
      resolve(false);
    };
  });
}

window.alertConfirm = alertConfirm;



//ajout de label multiLangue****************************************************************************************
// Ordre de bascule et persistance

// ----- Bascule de langue (FR, AR, EN, KAB, ES) avec fallback FR par label -----

function localizedMotEntier() {
  const LANG = getLang();
  //const LANG = localStorage.getItem("uiLang") || "fr";
  return (LANG === 'ar') ? 'كلمة كاملة'      // Arabe : Mot entier
    : (LANG === 'en') ? 'Whole word'      // Anglais
      : (LANG === 'kab') ? 'Awal ummid'     // Kabyle (traduction littérale "mot complet")
        : (LANG === 'es') ? 'Palabra entera'  // Espagnol
          : 'Mot entier';                       // Français (par défaut)
}
function localizedMotsContigus() {
  const LANG = getLang(); // 'fr' | 'ar' | 'en' | 'kab' | 'es'
  return (LANG === 'ar') ? 'كلمات متجاورة '
    : (LANG === 'en') ? 'Contiguous words'
      : (LANG === 'kab') ? 'Awalen imezdiyen'
        : (LANG === 'es') ? 'Palabras contiguas '
          : 'Mots contigus ';
}



function getLang() {
  const l = (localStorage.getItem('uiLang') || 'fr').toLowerCase();
  return ORDER.includes(l) ? l : 'fr';
}

// Messages applicatifs centralisés (fallback FR)
window.I18N_MSG = window.I18N_MSG || {
  fr: {
    copiedTextSuccess: "Texte copié avec succès: {text}",
    copyError: "Erreur lors de la copie",
    popupBlocked: "Le lien a été bloqué par le navigateur. Veuillez autoriser les popups.",
    linkCopied: "Lien copié: {url}",
    notLoggedOut: "Hello, anonyme — vous êtes déconnecté(e).",
    loggedInAs: "Hello {name}, vous êtes connecté(e).",
    enterEmailFirst: "Indiquez d’abord votre courriel dans le champ prévu.",
    resetMailInfo: "Si ce courriel est enregistré, vous recevrez un lien pour choisir un nouveau mot de passe. Vérifiez aussi les indésirables.",
    invalidEmail: "Adresse courriel invalide.",
    tooManyRequests: "Trop de demandes. Réessayez plus tard.",
    mailSendError: "Impossible d’envoyer le courriel.",
    reconnectWithSameCreds: "Reconnectez-vous avec le même courriel et le même mot de passe.",
    verificationResent: "Courriel de vérification renvoyé.",
    storageUnavailable: "Firebase Storage non disponible.",
    exportOk: "Historik exporté vers Firebase ({n} entrées).",
    importOk: "Historik importé depuis Firebase ({n} entrées).",
    exportError: "Erreur export: {err}",
    deleteReplyError: "Erreur lors de la suppression de la réponse.",
    invalidFileArray: "Fichier invalide: tableau attendu.",
    localStorageWriteError: "Impossible d'écrire dans le stockage local."
    ,nameAlreadyTaken: "Le nom \"{name}\" est déjà pris. Veuillez en choisir un autre."
    ,requestSaved: "Demande enregistrée avec succès : @{name}"
    ,mailAlreadyExistsLogin: "Mail déjà existant; connectez-vous"
    ,wrongPassword: "Mot de passe incorrect"
    ,invalidMail: "Mail invalide"
    ,invalidName: "Nom invalide"
    ,requestedLevelSame: "Niveau demandé === niveau actuel"
    ,confirmLevelChange: "Voulez-vous vraiment changer votre niveau de {from} à {to} ?"
    ,nameTooShort: "Caractères insuffisants dans le nom."
    ,passwordTooShort: "Caractères insuffisants dans le mot de passe."
    ,passwordMin6: "Le mot de passe doit contenir au moins 6 caractères (règle Firebase)."
    ,emailPasswordRequired: "Courriel et mot de passe doivent être renseignés"
    ,verifyEmailPrompt: "Vérifiez votre boîte mail (y compris courrier indésirable / spam), puis cliquez sur le lien de confirmation."
    ,verifyEmailSpamReminder: "Si le message n’apparaît pas : ouvrez le dossier spam ou courrier indésirable. Les courriels Firebase arrivent souvent depuis une adresse noreply@…firebaseapp.com."
    ,verifyEmailSentBody: "Un courriel de vérification vient d’être envoyé à cette adresse."
    ,verifyEmailFinalizeHint: "Après avoir cliqué sur le lien dans le message, restez sur cette page : l’inscription peut se finaliser automatiquement."
    ,useLoginNotInscription: "Une demande existe déjà avec ce courriel, ce mot de passe et ce nom au même niveau. Utilisez Connexion plutôt que l’inscription."
    ,resendMailBtn: "Renvoyer le courriel"
    ,loginInvalidCreds: "Courriel ou mot de passe incorrect."
    ,loginVerifyError: "Erreur lors de la vérification"
    ,loginError: "Erreur de connexion"
    ,emailNotFound: "Email non trouvé"
    ,loginNoProfileHint: "Aucune fiche à ce courriel — utilisez « Nouveau compte » pour vous inscrire."
    ,validationPending: "Validation en attente"
    ,serverError: "Erreur serveur"
    ,updateLevelError: "Erreur lors de la mise à jour du niveau."
    ,updateLevelImpossible: "Impossible de mettre à jour le niveau."
    ,subscribersDisplayImpossible: "Impossible d'afficher les abonnés (FireStore)."
    ,showPassword: "Afficher le mot de passe"
    ,hidePassword: "Masquer le mot de passe"
    ,emailHasRecordUseLogin: "Ce courriel a déjà une fiche. Utilisez Connexion (OK) avec le même mot de passe."
    ,existingFirebaseAccountReconnected: "Ce courriel avait déjà un compte Firebase (inscription commencée). Nous vous avons reconnecté."
    ,verifyInboxAndStay: "Vérifiez votre boîte mail (et les spams), cliquez sur le lien de confirmation, puis restez sur cette page."
    ,signupFinalizeImpossible: "Impossible de finaliser l’inscription."
    ,weakPasswordMin6: "Mot de passe trop faible : au moins 6 caractères."
    ,signupError: "Erreur lors de l’inscription"
    ,ifNoPasswordContactForum: "Si vous n'avez pas encore de mot de passe, contactez-nous sur le forum."
    ,deleteMessageDenied: "{name}: Vous devez avoir le niveau nécessaire pour supprimer ce message"
    ,deleteMessageSuccess: "Message supprimé avec succès."
    ,deleteMessageError: "Erreur lors de la suppression du message"
    ,validateDenied: "{name}: Vous devez avoir le niveau nécessaire pour valider ce message"
    ,alreadyValidated: "{subject}: Validation déjà effectuée"
    ,validatedOk: "{subject} validé"
    ,updateFirestoreError: "Erreur lors de la mise à jour Firestore"
    ,validationNotRequested: "{subject}: Validation non demandée"
    ,checkboxNotFound: "Erreur : la case à cocher n'a pas été trouvée pour messageId"
    ,messageNotFound: "Message non trouvé"
    ,validationGenericError: "Une erreur est survenue lors de la validation du message."
    ,forumSendErrorRetry: "Erreur lors de l'envoi du message. Veuillez réessayer."
    ,newVersionDetectedReload: "Nouvelle version détectée — rechargement nécessaire."
    ,ctxCopyLabel: "Copier"
    ,ctxSearchAuto: "Recherche auto"
    ,ctxNoRootsFound: "Pas de racines trouvées"
    ,ctxAddRootsTitle: "Ajouter les racines au champ mot (toggle ±)"
  },
  en: {
    copiedTextSuccess: "Text copied successfully: {text}",
    copyError: "Copy failed",
    popupBlocked: "The link was blocked by your browser. Please allow popups.",
    linkCopied: "Link copied: {url}",
    notLoggedOut: "Hello, anonymous — you are logged out.",
    loggedInAs: "Hello {name}, you are logged in.",
    enterEmailFirst: "Enter your email first in the field.",
    resetMailInfo: "If this email is registered, you will receive a reset link. Also check spam.",
    invalidEmail: "Invalid email address.",
    tooManyRequests: "Too many requests. Try again later.",
    mailSendError: "Unable to send email.",
    reconnectWithSameCreds: "Sign in again with the same email and password.",
    verificationResent: "Verification email sent again.",
    storageUnavailable: "Firebase Storage unavailable.",
    exportOk: "History exported to Firebase ({n} entries).",
    importOk: "History imported from Firebase ({n} entries).",
    exportError: "Export error: {err}",
    deleteReplyError: "Error while deleting reply.",
    invalidFileArray: "Invalid file: expected an array.",
    localStorageWriteError: "Unable to write to local storage."
    ,nameAlreadyTaken: "The name \"{name}\" is already taken. Please choose another one."
    ,requestSaved: "Request saved successfully: @{name}"
    ,mailAlreadyExistsLogin: "Email already exists; please sign in"
    ,wrongPassword: "Incorrect password"
    ,invalidMail: "Invalid email"
    ,invalidName: "Invalid name"
    ,requestedLevelSame: "Requested level equals current level"
    ,confirmLevelChange: "Do you really want to change your level from {from} to {to}?"
    ,nameTooShort: "Name is too short."
    ,passwordTooShort: "Password is too short."
    ,passwordMin6: "Password must contain at least 6 characters (Firebase rule)."
    ,emailPasswordRequired: "Email and password are required"
    ,verifyEmailPrompt: "Check your inbox (including spam / junk), then click the confirmation link."
    ,verifyEmailSpamReminder: "If you don’t see it, check your spam or junk folder. Firebase verification emails often come from a noreply@…firebaseapp.com address."
    ,verifyEmailSentBody: "A verification email was just sent to this address."
    ,verifyEmailFinalizeHint: "After you click the link in the message, stay on this page — signup may complete automatically."
    ,useLoginNotInscription: "A request already exists with this email, password, and name at the same level. Use Sign in instead of signing up again."
    ,resendMailBtn: "Resend email"
    ,loginInvalidCreds: "Incorrect email or password."
    ,loginVerifyError: "Verification error"
    ,loginError: "Login error"
    ,emailNotFound: "Email not found"
    ,loginNoProfileHint: "No profile for this email — use “New account” to sign up."
    ,validationPending: "Validation pending"
    ,serverError: "Server error"
    ,updateLevelError: "Error while updating level."
    ,updateLevelImpossible: "Unable to update level."
    ,subscribersDisplayImpossible: "Unable to display subscribers (FireStore)."
    ,showPassword: "Show password"
    ,hidePassword: "Hide password"
    ,emailHasRecordUseLogin: "This email already has a profile. Use Sign in (OK) with the same password."
    ,existingFirebaseAccountReconnected: "This email already had a Firebase account (signup started). We reconnected you."
    ,verifyInboxAndStay: "Check your inbox (and spam), click the confirmation link, then stay on this page."
    ,signupFinalizeImpossible: "Unable to complete signup."
    ,weakPasswordMin6: "Weak password: at least 6 characters."
    ,signupError: "Signup error"
    ,ifNoPasswordContactForum: "If you don't have a password yet, contact us on the forum."
    ,deleteMessageDenied: "{name}: You need the required level to delete this message"
    ,deleteMessageSuccess: "Message deleted successfully."
    ,deleteMessageError: "Error while deleting message"
    ,validateDenied: "{name}: You need the required level to validate this message"
    ,alreadyValidated: "{subject}: Already validated"
    ,validatedOk: "{subject} validated"
    ,updateFirestoreError: "Error while updating Firestore"
    ,validationNotRequested: "{subject}: Validation not requested"
    ,checkboxNotFound: "Error: checkbox not found for messageId"
    ,messageNotFound: "Message not found"
    ,validationGenericError: "An error occurred while validating the message."
    ,forumSendErrorRetry: "Error while sending the message. Please try again."
    ,newVersionDetectedReload: "New version detected — reload required."
    ,ctxCopyLabel: "Copy"
    ,ctxSearchAuto: "Auto search"
    ,ctxNoRootsFound: "No roots found"
    ,ctxAddRootsTitle: "Add roots to search field (toggle ±)"
  },
  ar: {
    copiedTextSuccess: "تم نسخ النص بنجاح: {text}",
    copyError: "فشل النسخ",
    popupBlocked: "تم حظر الرابط من المتصفح. يرجى السماح بالنوافذ المنبثقة.",
    linkCopied: "تم نسخ الرابط: {url}",
    notLoggedOut: "مرحبًا، مجهول — تم تسجيل الخروج.",
    loggedInAs: "مرحبًا {name}، تم تسجيل الدخول.",
    enterEmailFirst: "أدخل بريدك الإلكتروني أولًا في الحقل.",
    resetMailInfo: "إذا كان البريد مسجلًا فستصلك رسالة لإعادة تعيين كلمة المرور. تحقق من الرسائل غير المرغوبة.",
    invalidEmail: "بريد إلكتروني غير صالح.",
    tooManyRequests: "طلبات كثيرة جدًا. أعد المحاولة لاحقًا.",
    mailSendError: "تعذر إرسال البريد الإلكتروني.",
    reconnectWithSameCreds: "أعد تسجيل الدخول بنفس البريد وكلمة المرور.",
    verificationResent: "تمت إعادة إرسال رسالة التحقق.",
    storageUnavailable: "تخزين Firebase غير متوفر.",
    exportOk: "تم تصدير السجل إلى Firebase ({n} مدخلات).",
    importOk: "تم استيراد السجل من Firebase ({n} مدخلات).",
    exportError: "خطأ في التصدير: {err}",
    deleteReplyError: "خطأ أثناء حذف الرد.",
    invalidFileArray: "ملف غير صالح: يجب أن يكون مصفوفة.",
    localStorageWriteError: "تعذر الكتابة في التخزين المحلي."
    ,nameAlreadyTaken: "الاسم \"{name}\" مستخدم بالفعل. اختر اسمًا آخر."
    ,requestSaved: "تم حفظ الطلب بنجاح: @{name}"
    ,mailAlreadyExistsLogin: "البريد موجود بالفعل؛ يرجى تسجيل الدخول"
    ,wrongPassword: "كلمة المرور غير صحيحة"
    ,invalidMail: "بريد غير صالح"
    ,invalidName: "اسم غير صالح"
    ,requestedLevelSame: "المستوى المطلوب يساوي المستوى الحالي"
    ,confirmLevelChange: "هل تريد فعلاً تغيير المستوى من {from} إلى {to}؟"
    ,nameTooShort: "عدد الأحرف في الاسم غير كافٍ."
    ,passwordTooShort: "عدد أحرف كلمة المرور غير كافٍ."
    ,passwordMin6: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل."
    ,emailPasswordRequired: "يجب إدخال البريد وكلمة المرور"
    ,verifyEmailPrompt: "تحقق من بريدك (بما في ذلك الرسائل غير المرغوبة / البريد المزعج)، ثم اضغط رابط التأكيد."
    ,verifyEmailSpamReminder: "إذا لم تجد الرسالة، افتح مجلد الرسائل غير المرغوبة أو البريد المزعج. رسائل التحقق من Firebase غالبًا من عنوان noreply@…firebaseapp.com."
    ,verifyEmailSentBody: "تم للتو إرسال رسالة تحقق إلى هذا العنوان."
    ,verifyEmailFinalizeHint: "بعد الضغط على الرابط في الرسالة، ابقَ في هذه الصفحة — قد يكتمل التسجيل تلقائيًا."
    ,useLoginNotInscription: "يوجد طلب مسبق بنفس البريد وكلمة المرور والاسم وبنفس المستوى. استخدم تسجيل الدخول بدل التسجيل من جديد."
    ,resendMailBtn: "إعادة إرسال البريد"
    ,loginInvalidCreds: "البريد أو كلمة المرور غير صحيحة."
    ,loginVerifyError: "خطأ أثناء التحقق"
    ,loginError: "خطأ في تسجيل الدخول"
    ,emailNotFound: "البريد غير موجود"
    ,loginNoProfileHint: "لا يوجد ملف لهذا البريد — استخدم « حساب جديد » للتسجيل."
    ,validationPending: "التحقق قيد الانتظار"
    ,serverError: "خطأ في الخادم"
    ,updateLevelError: "خطأ أثناء تحديث المستوى."
    ,updateLevelImpossible: "تعذر تحديث المستوى."
    ,subscribersDisplayImpossible: "تعذر عرض المشتركين (FireStore)."
    ,showPassword: "إظهار كلمة المرور"
    ,hidePassword: "إخفاء كلمة المرور"
    ,emailHasRecordUseLogin: "لهذا البريد ملف موجود. استخدم تسجيل الدخول بنفس كلمة المرور."
    ,existingFirebaseAccountReconnected: "لهذا البريد حساب Firebase سابق (تسجيل بدأ). أعدنا ربطك."
    ,verifyInboxAndStay: "تحقق من بريدك (والرسائل غير المرغوبة)، واضغط رابط التأكيد ثم ابقَ في هذه الصفحة."
    ,signupFinalizeImpossible: "تعذر إكمال التسجيل."
    ,weakPasswordMin6: "كلمة المرور ضعيفة: 6 أحرف على الأقل."
    ,signupError: "خطأ أثناء التسجيل"
    ,ifNoPasswordContactForum: "إذا لم يكن لديك كلمة مرور بعد، تواصل معنا عبر المنتدى."
    ,deleteMessageDenied: "{name}: يجب توفر المستوى المطلوب لحذف هذه الرسالة"
    ,deleteMessageSuccess: "تم حذف الرسالة بنجاح."
    ,deleteMessageError: "خطأ أثناء حذف الرسالة"
    ,validateDenied: "{name}: يجب توفر المستوى المطلوب لاعتماد هذه الرسالة"
    ,alreadyValidated: "{subject}: تم الاعتماد مسبقًا"
    ,validatedOk: "تم اعتماد {subject}"
    ,updateFirestoreError: "خطأ أثناء تحديث Firestore"
    ,validationNotRequested: "{subject}: لم يُطلب اعتماد"
    ,checkboxNotFound: "خطأ: لم يتم العثور على خانة الاختيار لهذا المعرف"
    ,messageNotFound: "الرسالة غير موجودة"
    ,validationGenericError: "حدث خطأ أثناء اعتماد الرسالة."
    ,forumSendErrorRetry: "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى."
    ,newVersionDetectedReload: "تم اكتشاف نسخة جديدة — يلزم إعادة التحميل."
    ,ctxCopyLabel: "نسخ"
    ,ctxSearchAuto: "بحث تلقائي"
    ,ctxNoRootsFound: "لم يُعثر على جذور"
    ,ctxAddRootsTitle: "إضافة الجذور إلى حقل البحث (تبديل ±)"
  },
  kab: {
    copiedTextSuccess: "Aḍris yettwanɣel akken iwata: {text}",
    copyError: "Ur izmir ara ad d-yenɣel",
    popupBlocked: "Aseɣwen iḥbes-it iminig. Sireg popups.",
    linkCopied: "Aseɣwen yettwanɣel: {url}",
    notLoggedOut: "Ansuf, anonyme — teffɣeḍ seg uqqen.",
    loggedInAs: "Ansuf {name}, tkeččeḍ.",
    enterEmailFirst: "Sekcem di tazwara imayl-ik deg urti.",
    resetMailInfo: "Ma yella imayl-a yella, ad d-yas useɣwen n usnifel n wawal uffir. Wali daɣen spam.",
    invalidEmail: "Imayl mačči ameɣtu.",
    tooManyRequests: "Aṭas n yisuter. Ales tikkelt-nniḍen.",
    mailSendError: "Ur nezmir ara ad nazen imayl.",
    reconnectWithSameCreds: "Qqen tikkelt-nniḍen s yiwen imayl akked yiwen wawal uffir.",
    verificationResent: "Imayl n usenqed yettwaazen tikkelt-nniḍen.",
    storageUnavailable: "Firebase Storage ulac-it.",
    exportOk: "Historik ittwazen ɣer Firebase ({n} inekcamen).",
    importOk: "Historik yettwakcem seg Firebase ({n} inekcamen).",
    exportError: "Tuccḍa n usifeḍ: {err}",
    deleteReplyError: "Tuccḍa deg tukksa n tririt.",
    invalidFileArray: "Afaylu mačči ameɣtu: ilaq ad yili d tableau.",
    localStorageWriteError: "Ur yezmir ara ad yaru deg ukalas uslig."
    ,ctxCopyLabel: "Nɣel"
    ,ctxSearchAuto: "Anadi awurman"
    ,ctxNoRootsFound: "Ulac igzuzu i yettwafen"
    ,ctxAddRootsTitle: "Rnu igzuzu ɣer urti n wawal (beddel ±)"
  },
  es: {
    copiedTextSuccess: "Texto copiado correctamente: {text}",
    copyError: "Error al copiar",
    popupBlocked: "El navegador bloqueó el enlace. Permite las ventanas emergentes.",
    linkCopied: "Enlace copiado: {url}",
    notLoggedOut: "Hola, anónimo: has cerrado sesión.",
    loggedInAs: "Hola {name}, has iniciado sesión.",
    enterEmailFirst: "Introduce primero tu correo en el campo.",
    resetMailInfo: "Si este correo está registrado, recibirás un enlace para restablecer la contraseña. Revisa también spam.",
    invalidEmail: "Correo no válido.",
    tooManyRequests: "Demasiadas solicitudes. Inténtalo más tarde.",
    mailSendError: "No se pudo enviar el correo.",
    reconnectWithSameCreds: "Vuelve a iniciar sesión con el mismo correo y contraseña.",
    verificationResent: "Correo de verificación reenviado.",
    storageUnavailable: "Firebase Storage no disponible.",
    exportOk: "Histórico exportado a Firebase ({n} entradas).",
    importOk: "Histórico importado desde Firebase ({n} entradas).",
    exportError: "Error de exportación: {err}",
    deleteReplyError: "Error al eliminar la respuesta.",
    invalidFileArray: "Archivo no válido: se esperaba un arreglo.",
    localStorageWriteError: "No se puede escribir en el almacenamiento local."
    ,ctxCopyLabel: "Copiar"
    ,ctxSearchAuto: "Búsqueda automática"
    ,ctxNoRootsFound: "No se encontraron raíces"
    ,ctxAddRootsTitle: "Añadir raíces al campo (alternar ±)"
  }
};

window.tMsg = window.tMsg || function (key, vars, fallback) {
  const lc = (typeof getLang === 'function' ? getLang() : 'fr');
  const dict = window.I18N_MSG || {};
  let text = (dict[lc] && dict[lc][key]) || (dict.fr && dict.fr[key]) || fallback || key;
  if (vars && typeof vars === 'object') {
    Object.keys(vars).forEach((k) => {
      text = String(text).replaceAll(`{${k}}`, String(vars[k]));
    });
  }
  return String(text);
};

// Renvoie le title localisé pour un élément (fallback: attribut existant)
function getLocalizedTitleFor(el) {//possibilité???
  if (!el) return '';
  const lang = getUILang();
  const id = el.id;
  const dict = window.I18N_TITLES?.[lang] || {};
  if (id && dict[id]) return String(dict[id]);

  // Repli : s'il n'y a rien dans le dico, garder l'attribut existant
  const t = el.getAttribute('title');
  return t ? String(t) : '';
}

/** Titres show/hide : clés `idPrefix_show` et `idPrefix_hide` dans I18N_TITLES[lang]. */
function getLocalizedToggleTitle(idPrefix, visible) {
  const lang = getUILang();
  const dict = window.I18N_TITLES?.[lang] || {};
  const key = visible ? `${idPrefix}_hide` : `${idPrefix}_show`;
  if (dict[key]) return String(dict[key]);
  if (dict[idPrefix]) return String(dict[idPrefix]);
  return '';
}

/** Infobulles : languettes tipTab__* / tipAf__* suivent I18N, data-zc-tab-title ou title du bouton source ; Soura reste manuel. */
function applyModuleTabTitles(dict) {
  if (!dict || typeof dict !== "object") return;

  document.querySelectorAll('.zc-module-tab-icons .zc-module-tab-icon-btn').forEach((tab) => {
    const m = /^(?:tipTab__|tipAf__)(.+)$/.exec(tab.id || "");
    if (!m) return;
    const rest = m[1];
    const src = document.getElementById(rest);
    let t = "";
    if (src && dict[src.id] != null) t = String(dict[src.id]);
    else if (typeof getLocalizedTitleFor === "function" && src) t = getLocalizedTitleFor(src) || "";
    if (!t && src) {
      t =
        (src.getAttribute("data-zc-tab-title") || "").trim() ||
        (src.getAttribute("title") || "").trim();
    }
    if (!t) return;
    tab.setAttribute("title", t);
    if (tab.classList.contains("zc-module-tab-icon-btn")) tab.setAttribute("aria-label", t);
  });

  const SOURA_ALIASES = {
    tipTabSouraSearch: "zoomCoranBtnR0",
    tipTabSouraPdf: "BtnPdfWarch",
    tipTabSouraAudio: "boutonAudioWarsh1",
    tipTabSouraReadListen: "t-lire-écouter-codex-coranique"
  };
  Object.entries(SOURA_ALIASES).forEach(([tabId, srcKey]) => {
    const el = document.getElementById(tabId);
    const tt = dict[srcKey];
    if (!el || tt === undefined || tt === null) return;
    const s = String(tt);
    el.setAttribute("title", s);
    if (el.classList.contains("zc-module-tab-icon-btn")) el.setAttribute("aria-label", s);
  });
}

// Applique les titles localisés à tous les ids présents dans le dico courant
function applyTitlesForCurrentLang() {
  const lang = getUILang();
  const dict = window.I18N_TITLES?.[lang] || {};
  const syncAriaLabelFromTitleIds = new Set(['zoomCoranBtnR0', 'zoomCoranBtnR1', 'btnChercheZoomCoran', 'lexiqueBtn']);
  Object.keys(dict).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const t = String(dict[id]);
    el.setAttribute('title', t);
    if (syncAriaLabelFromTitleIds.has(id)) el.setAttribute('aria-label', t);
  });
  const uiLangBtn = document.getElementById('uiLangSelectBtn');
  if (uiLangBtn && dict.uiLangSelect != null) {
    const t = String(dict.uiLangSelect);
    uiLangBtn.setAttribute('title', t);
    uiLangBtn.setAttribute('aria-label', t);
  }
  const versHistDesc = document.getElementById('zcVersetsHistorikListDesc');
  if (versHistDesc && dict.zcVersetsHistorikListDesc != null) {
    versHistDesc.textContent = String(dict.zcVersetsHistorikListDesc);
  }
  const histHead = document.getElementById('zcHistorikPopupHeading');
  if (histHead && dict.zcHistorikPopupHeading != null) {
    histHead.textContent = String(dict.zcHistorikPopupHeading);
  }
  const histFermer = document.getElementById('btnHistorikPopupFermer');
  if (histFermer && dict.btnHistorikPopupFermer != null) {
    histFermer.textContent = String(dict.btnHistorikPopupFermer);
  }
  const histOpenBtn = document.getElementById('btnHistorikPopup');
  if (histOpenBtn && dict.btnHistorikPopup != null) {
    const histTxt = String(dict.btnHistorikPopup);
    histOpenBtn.setAttribute('title', histTxt);
    histOpenBtn.setAttribute('aria-label', histTxt);
    const histLbl = histOpenBtn.querySelector('.zc-top-action-label, .zc-title-sync-label');
    if (histLbl) histLbl.textContent = histTxt;
  }
  const histX = document.getElementById('zcHistorikPopupClose');
  if (histX && dict.btnHistorikPopupFermer != null) {
    histX.setAttribute('aria-label', String(dict.btnHistorikPopupFermer));
    histX.setAttribute('title', String(dict.btnHistorikPopupFermer));
  }
  const histResetLbl = document.getElementById('zcHistorikPopupResetLabel');
  if (histResetLbl && dict.btnHistorikPopupReset != null) {
    histResetLbl.textContent = String(dict.btnHistorikPopupReset);
  }
  const tradHead = document.getElementById('zcTraductionPopupHeading');
  if (tradHead && dict.zcTraductionPopupHeading != null) {
    tradHead.textContent = String(dict.zcTraductionPopupHeading);
  }
  const tradHint = document.getElementById('zcTraductionPopupHint');
  if (tradHint && dict.zcTraductionPopupHint != null) {
    tradHint.textContent = String(dict.zcTraductionPopupHint);
  }
  const tradFermer = document.getElementById('btnTraductionPopupFermer');
  if (tradFermer && dict.btnTraductionPopupFermer != null) {
    tradFermer.textContent = String(dict.btnTraductionPopupFermer);
  }
  const tradX = document.getElementById('zcTraductionPopupClose');
  if (tradX && dict.btnTraductionPopupFermer != null) {
    tradX.setAttribute('aria-label', String(dict.btnTraductionPopupFermer));
    tradX.setAttribute('title', String(dict.btnTraductionPopupFermer));
  }
  try { applyModuleTabTitles(dict); } catch (_) { }
  try { if (typeof window.syncTraductionPickerButtonLabels === 'function') window.syncTraductionPickerButtonLabels(); } catch (_) { }
  try { refreshDynamicToggleTitles(); } catch { }
  // #logInUser : titre + icône suivent la session. Sans ce rappel, le dico i18n impose « Se connecter »
  // alors que l’icône peut rester sur « sortie » (voir applyTitles au DOMContentLoaded).
  try {
    if (typeof window.updateUserUI === "function") window.updateUserUI();
  } catch { }
}

window.applyTitlesForCurrentLang = applyTitlesForCurrentLang;

(function initCustomUiLangPicker() {
  function getLangAbbrev(code) {
    const c = String(code || "fr").toLowerCase();
    if (c === "kab") return "KAB";
    return c.toUpperCase();
  }

  function syncButtonLabel(sel, btn) {
    if (!sel || !btn) return;
    const out = btn.querySelector("#uiLangSelectBtnLabel") || btn;
    out.textContent = getLangAbbrev(sel.value);
  }

  function closeMenu(btn, menu) {
    if (!btn || !menu) return;
    btn.setAttribute("aria-expanded", "false");
    menu.hidden = true;
  }

  function openMenu(btn, menu) {
    if (!btn || !menu) return;
    btn.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    try {
      // Positionne le menu du sélecteur selon la direction UI, puis corrige si débordement.
      const isRtl = String(document.documentElement.getAttribute("dir") || "").toLowerCase() === "rtl";
      if (isRtl) {
        menu.style.left = "0";
        menu.style.right = "auto";
      } else {
        menu.style.right = "0";
        menu.style.left = "auto";
      }
      const r = menu.getBoundingClientRect();
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      if (r.left < 4) {
        menu.style.left = "0";
        menu.style.right = "auto";
      } else if (r.right > vw - 4) {
        menu.style.right = "0";
        menu.style.left = "auto";
      }
    } catch (_) { }
  }

  function buildMenu(sel, btn, menu) {
    if (!sel || !btn || !menu) return;
    menu.innerHTML = "";
    Array.from(sel.options).forEach((opt) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "zc-lang-picker-option";
      item.setAttribute("role", "option");
      item.setAttribute("data-value", opt.value);
      item.setAttribute("aria-selected", String(opt.value === sel.value));
      item.textContent = opt.textContent || opt.value;
      item.addEventListener("click", () => {
        if (sel.value !== opt.value) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (typeof window.zcSyncUiLangPicker === "function") {
          window.zcSyncUiLangPicker();
        }
        closeMenu(btn, menu);
        btn.focus();
      });
      menu.appendChild(item);
    });
    syncButtonLabel(sel, btn);
  }

  function sync() {
    const sel = document.getElementById("uiLangSelect");
    const btn = document.getElementById("uiLangSelectBtn");
    const menu = document.getElementById("uiLangSelectMenu");
    if (!sel || !btn || !menu) return;
    buildMenu(sel, btn, menu);
  }

  window.zcSyncUiLangPicker = sync;

  function init() {
    const sel = document.getElementById("uiLangSelect");
    const btn = document.getElementById("uiLangSelectBtn");
    const menu = document.getElementById("uiLangSelectMenu");
    const wrap = document.getElementById("uiLangPicker");
    if (!sel || !btn || !menu || !wrap) return;

    buildMenu(sel, btn, menu);
    closeMenu(btn, menu);

    btn.addEventListener("click", function () {
      if (menu.hidden) openMenu(btn, menu);
      else closeMenu(btn, menu);
    });

    sel.addEventListener("change", function () {
      buildMenu(sel, btn, menu);
      closeMenu(btn, menu);
    });

    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) closeMenu(btn, menu);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu(btn, menu);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

/** Après applyTitlesForCurrentLang : réapplique les titres show/hide des bascules zone A / caches admin. */
function refreshDynamicToggleTitles() {
  try {
    if (typeof window.refreshZoneAToggleTitle === 'function') window.refreshZoneAToggleTitle();
  } catch { }
  try {
    const tgt = document.getElementById('BtnCaches');
    if (tgt && typeof setBtnCachesVisible === 'function') {
      const visible = !tgt.hidden && getComputedStyle(tgt).display !== 'none';
      setBtnCachesVisible(visible);
    }
  } catch { }
}

function setLang(lang) {
  const code = (lang || "fr").toString().toUpperCase();
  const lc = code.toLowerCase();
  const uiLangSel = document.getElementById("uiLangSelect");
  if (uiLangSel) uiLangSel.value = lc;

  // Persistance + attributs HTML
  localStorage.setItem("uiLang", lc);
  document.documentElement.lang = lc;
  document.documentElement.dir = (lc === "ar") ? "rtl" : "ltr";
  try { document.body.classList.toggle("rtl", lc === "ar"); } catch { }

  // Titles i18n (inclut refreshDynamicToggleTitles)
  try { applyTitlesForCurrentLang(); } catch { }

  // Panneau Paramètres : libellés déroulés = mêmes intitulés que les titres (I18N_TITLES)
  const dictUi = window.I18N_TITLES?.[getUILang()] || window.I18N_TITLES?.FR || {};
  const lblOrdre = document.getElementById("labelOrdreExactCheckbox");
  if (lblOrdre) {
    const innerO = lblOrdre.querySelector(".zc-params-detail-text");
    if (innerO) {
      innerO.textContent = dictUi.labelOrdreExactCheckbox != null
        ? String(dictUi.labelOrdreExactCheckbox)
        : ((typeof localizedMotsContigus === "function") ? localizedMotsContigus() : "");
    }
  }
  const lblMotEntier = document.getElementById("labelRechercheMotEntier");
  if (lblMotEntier) {
    const innerM = lblMotEntier.querySelector(".zc-params-detail-text");
    if (innerM) {
      innerM.textContent = dictUi.labelRechercheMotEntier != null
        ? String(dictUi.labelRechercheMotEntier)
        : ((typeof localizedMotEntier === "function") ? localizedMotEntier() : "");
    }
  }
  try {
    if (typeof window.syncParamTogglesChrome === "function") window.syncParamTogglesChrome();
  } catch { }

  // Fermer éventuel menu contextuel
  if (typeof window.closeContextMenu === "function") window.closeContextMenu();

  // Bouton langue
  const btn = document.getElementById("btnLang");
  if (btn) btn.textContent = "🌐 " + code;
  try {
    if (typeof window.zcSyncUiLangPicker === "function") window.zcSyncUiLangPicker();
  } catch { }

  if (typeof startAnnonceTicker === "function") startAnnonceTicker();
  try { activerLabels(code); } catch { }
  try {
    if (typeof window.refreshCommentPopupI18n === "function") window.refreshCommentPopupI18n();
    if (typeof window.refreshForumI18n === "function") window.refreshForumI18n();
  } catch { }

  window.userLang = lc;
  if (typeof window.updateUserUI === "function") window.updateUserUI();

  // Notifier les consommateurs (zc-utils.js rééapplique les placeholders universels).
  try {
    window.dispatchEvent(new CustomEvent("uiLangChanged", { detail: { lang: lc } }));
  } catch (_) { }

  // Reflet d'état non-modifiant (affichage)
  try {
    const ensureRoleSwitch = (el) => {
      if (!el) return;
      if (!el.getAttribute("role")) el.setAttribute("role", "switch");
      el.setAttribute("aria-readonly", "true"); // affichage seulement
      el.tabIndex = -1; // non focusable (pure déco)
    };
    const badge = (id, on) => {
      const el = document.getElementById(id);
      if (!el) return;
      ensureRoleSwitch(el);
      el.setAttribute("aria-checked", !!on);
      el.classList.toggle("is-off", !on);
      el.classList.toggle("is-on", !!on);
    };

    // Valeurs par défaut sûres si non définies
    //var sheddaOn = false;
    //const supprVOn = !!(window.supprVoyellesActive);
    //const alifOn   = !!(window.AlifHamza);
    const exactOn = !!(window.useExact);

    //badge("labelshedda", sheddaOn);
    //badge("labelSupprVoyelles", supprVOn);
    badge("labelAlifHamzaBtn", alifOn);
    badge("labelRechercheMotEntier", exactOn);
  } catch { }
}

// Fonction pour obtenir la langue de l'utilisateur
function getLanguage() {
  if (navigator.languages && navigator.languages.length > 0) {
    var tr = navigator.languages[0]; // Retourner la première langue
  } else {
    var tr = navigator.language || navigator.userLanguage; // Retourner la langue par défaut
  }
  var langLocal = getLang() || tr;
  return langLocal.toLowerCase();
}
//var userLang = getLanguage().split('-')[0]; // Obtenir la langue principale (par exemple, 'fr', 'ar', 'en')
var userLang = getLanguage(); // Obtenir la langue principale (par exemple, 'fr', 'ar', 'en')
function texteBienvenue() {
  var name = localStorage.getItem('nameUser') || 'anonyme';
  var texte = 'Bienvenue, ' + name;
  switch (userLang) {
    case 'fr': texte = 'Bienvenue, ' + name; break;
    case 'ar': texte = 'مرحبا! ' + name; break;
    case 'en': texte = 'Hello, ' + name; break;
    case 'kab': texte = 'Azul' + name; break;
    case 'es': texte = '¡Hola, ' + name; break;
    default:
  }
  return texte;
}

// Détecter la langue de l'utilisateur

function leftRight(divId, testTexte) {
  // Détection si testTexte contient du texte en arabe
  testTexte = testTexte.replace(/(\r\n|\r|\n)/g, '<br>');
  var regexArabe = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/; // Plage Unicode pour les caractères arabes
  var estArabeTexte = regexArabe.test(testTexte);

  // Justification de la description en fonction de la langue
  if (estArabeTexte) {
    divId.style.textAlign = "right";
  } else {
    divId.style.textAlign = "left";
  }

}





// Fonction pour afficher un message dans le conteneur
function alertMsgBoxPopup(texte) {
  const popup = document.getElementById("messagePopup");
  const overlay = document.getElementById("popupOverlay");
  if (!popup || !overlay) return;
  try {
    if (document.body) {
      document.body.appendChild(overlay);
      document.body.appendChild(popup);
    }
  } catch (_) { }

  // Assurer le rôle d'une boîte de dialogue (accessibilité)
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");

  // 1) Bouton fermer (créé une seule fois)
  let closeBtn = popup.querySelector(".popup-close");
  if (!closeBtn) {
    closeBtn = document.createElement("button");
    closeBtn.className = "popup-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Fermer la fenêtre");
    closeBtn.setAttribute("title", "Fermer");
    closeBtn.innerHTML = "&times;"; // croix ×
    closeBtn.addEventListener("click", masquerMessage);
    popup.appendChild(closeBtn);
  }

  // 2) Conteneur de contenu (créé une seule fois)
  let content = popup.querySelector(".popup-content");
  if (!content) {
    content = document.createElement("div");
    content.className = "popup-content";
    popup.appendChild(content);
  }

  // 3) Injecter le texte (HTML accepté si vous en passez)
  if (texte instanceof Node) {
    content.replaceChildren(texte);
  } else {
    content.innerHTML = texte;
  }
  // Habillage cohérent des statuts (succès/erreur/attention/info)
  try {
    const plain = String(content.textContent || texte || "").trim().toLowerCase();
    popup.classList.remove("msg-success", "msg-error", "msg-warning", "msg-info");
    let cls = "msg-info";
    if (/✅|succ[eè]s|recharg[ée]|valid[ée]|saved|success/i.test(plain)) cls = "msg-success";
    else if (/❌|erreur|error|refus[eé]|introuvable|invalide/i.test(plain)) cls = "msg-error";
    else if (/⚠️|attention|warning|niveau|does not allow|ne permet pas/i.test(plain)) cls = "msg-warning";
    popup.classList.add(cls);
  } catch (_) { }

  // 4) z-index : max document + STEP (overlay puis popup ; STEP = 1, z-index-stack.js)
  let overlayZ = 0;
  try {
    if (typeof window.getNextZIndex === "function") overlayZ = Number(window.getNextZIndex()) || 0;
    else if (typeof getNextZIndex === "function") overlayZ = Number(getNextZIndex()) || 0;
  } catch (_) { }
  if (!overlayZ) {
    const step0 = typeof window.STEP === "number" && window.STEP > 0 ? window.STEP : 1;
    let maxZ = 0;
    try {
      const all = document.body ? document.body.querySelectorAll("*") : [];
      for (let i = 0; i < all.length; i++) {
        const z = parseInt(window.getComputedStyle(all[i]).zIndex, 10);
        if (!Number.isNaN(z) && z > maxZ) maxZ = z;
      }
    } catch (_) { }
    overlayZ = maxZ + step0;
  }
  const step = typeof window.STEP === "number" && window.STEP > 0 ? window.STEP : 1;
  overlay.style.zIndex = String(overlayZ);
  popup.style.zIndex = String(overlayZ + step);
  try {
    if (typeof window.zcBringToFront === "function") {
      window.zcBringToFront(overlay, 0);
      window.zcBringToFront(popup, 1);
    }
  } catch (_) { }
  overlay.setAttribute("data-overlay", "1");
  popup.setAttribute("data-overlay", "1");
  overlay.style.display = "block";
  popup.style.display = "block";

  // 5) Fermer avec Echap (ne l'attache qu'une seule fois)
  if (!document.body.dataset.popupEscBound) {
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") masquerMessage();
    });
    document.body.dataset.popupEscBound = "1";
  }

  // Mettre le focus sur le bouton fermer pour accessibilité
  try { closeBtn.focus({ preventScroll: true }); } catch (_) { }
}

// Fonction pour masquer le message
function masquerMessage() {
  const popup = document.getElementById("messagePopup");
  const overlay = document.getElementById("popupOverlay");
  if (!popup || !overlay) return;
  popup.style.display = "none";
  overlay.style.display = "none";
  popup.style.zIndex = "";
  overlay.style.zIndex = "";
  popup.removeAttribute("data-overlay");
  overlay.removeAttribute("data-overlay");
}

// Masquer le pop-up lorsqu'on clique en dehors de celui-ci
const popupOverlayEl = document.getElementById("popupOverlay");
if (popupOverlayEl) {
  popupOverlayEl.addEventListener("click", function () {
    masquerMessage();
  });
}




function formatLienForum(commentaire) {
  let txt = String(commentaire || "");

  // Ne pas retraiter un HTML déjà linkifié (évite les corruptions du type: target="_blank">...).
  if (/<a\b[^>]*>/i.test(txt)) {
    return txt.replace(/(\r\n|\r|\n)/g, '<br>');
  }

  // Détecte les URLs complètes en conservant query/hash.
  const lienRegex = /https?:\/\/[^\s<>"']+/gi;
  txt = txt.replace(lienRegex, function (rawUrl) {
    let url = String(rawUrl || "");
    let suffix = "";
    // Retire la ponctuation finale courante, mais la conserve après le lien.
    while (/[),.;!?]$/.test(url)) {
      suffix = url.slice(-1) + suffix;
      url = url.slice(0, -1);
    }
    const safeUrl = url.replace(/"/g, "%22");
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${url}</a>${suffix}`;
  });

  return txt.replace(/(\r\n|\r|\n)/g, '<br>');
}

function formatLienMedia(lienAffiche) {//remplacer par formatLienForum(commentaire)
  // Expression régulière pour détecter un lien commençant par http(s), avec ou sans "www"
  const lienRegex = /https?:\/\/(www\.)?[^\s]+(?=\s|\r|\n|;|\.|$)/;

  // Chercher le lien unique dans le texte
  const lien = lienAffiche.match(lienRegex);

  // Si un lien est trouvé, extraire seulement le domaine
  if (lien) {
    const urlObj = new URL(lien[0]);
    return urlObj.hostname; // Retourne uniquement le domaine, ex: "example.com"
  }

  // Retourner le texte original si aucun lien n'est trouvé
  return lienAffiche;
}
/*
function retournerApplication(url) {
  try {
    const mediaContainer = document.getElementById('mediaContainer');
    const mediaIframe = document.getElementById('mediaIframe');

    if (mediaIframe) {
      mediaIframe.src = "about:blank";
      mediaIframe.remove();
    }

    if (mediaContainer) {
      mediaContainer.innerHTML = "";
    }
  } catch (e) {
    console.warn("Erreur lors du nettoyage de l'iframe:", e);
  }

  setTimeout(() => {
    window.location.replace(url); // ou window.location.href = url;
    // tentative de fermeture si la page a été ouverte par window.open
    window.close(); // fonctionne uniquement si la page a été ouverte par un script du genre window.open('medias1.html', 'popup');
  }, 300);
}
*/

/* getNextZIndex / getMaxZIndex / STEP : jsZC/z-index-stack.js (chargé avant ce fichier sur index.html) */




/* =========================
   Shedda — détection & toggle
   ========================= */

// Flag global (préserve l’existant si déjà défini)
window.sheddaOn = (typeof window.sheddaOn === 'boolean') ? window.sheddaOn : false;

/**
 * isSheddaSurMot(mot)
 * - Active window.sheddaOn = true si le mot contient :
 *    (a) une šadda "ّ" (U+0651) ou son alias "#"
 *    (b) OU une lettre arabe de base doublée et contiguë (après retrait des diacritiques)
 * - Désactive sinon.
 * - Retourne le booléen final.
 */
function isSheddaSurMot(mot) {
  const SHADDA = "\u0651";
  const DIAC_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/gu;   // voyelles/diacritiques
  const AR_BASE_PAIR_RE = /([\u0621-\u064A])\1/u;            // double lettre arabe contiguë

  const s = String(mot ?? "")
    .normalize('NFKC')
    .replace(/#/g, SHADDA);

  // (a) Présence explicite d’une šadda ?
  if (s.indexOf(SHADDA) !== -1) {
    window.sheddaOn = true;
    return true;
  }

  // (b) Double lettre contiguë (on retire d’abord les diacritiques)
  const sansDiacritiques = s.replace(DIAC_RE, '');
  window.sheddaOn = AR_BASE_PAIR_RE.test(sansDiacritiques);
  return window.sheddaOn;
}

function dedoubleShedda(input) { // remplace input=remplacerChaddaNettoye(input);
  // ✅ NE RIEN FAIRE si la détection a conclu qu’il n’y a pas de šadda ni de double
  if (!window.sheddaOn) return input;
  if (input === "بسم الله") return input;

  // Normalisation + alias
  const SHADDA = "\u0651";
  const DIAC_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/u;  // voyelles/diacritiques
  const AR_BASE_RE = /[\u0621-\u064A]/u;                  // lettres arabes "de base"

  let txt = String(input || "")
    .replace(/#/g, SHADDA)
    .normalize('NFKC')
    .normalize('NFC');

  const out = [];
  for (const ch of txt) {
    if (ch === SHADDA) {
      // Cherche la dernière lettre arabe de base dans 'out' (en sautant les diacritiques finaux)
      let k = out.length - 1;
      while (k >= 0 && DIAC_RE.test(out[k])) k--;
      if (k >= 0 && AR_BASE_RE.test(out[k])) {
        out.push(out[k]); // dédouble la lettre
      }
      continue; // ne garde pas la šadda
    }
    out.push(ch);
  }
  return out.join('').replace(DIAC_RE, '');
}
function dedoubleSheddaSafe(input) {
  isSheddaSurMot(input);
  return dedoubleShedda(input);
}



function traitementInput(input) {
  // Si la valeur est un nombre fini et non vide
  if (isFinite(input) && input !== "") {
    // Convertir la valeur en nombre
    var numericInput = parseFloat(input);

    // Si c'est un entier
    if (Number.isInteger(numericInput)) {
      // Limiter la valeur entre 1 et 604 (page Warsh)
      numericInput = Math.max(1, Math.min(numericInput, 604));

      var entier = numericInput;
      // ⚠️ garder 0 pour forcer la logique "page Warsh" avec un entier (comportement existant)
      var decimale = 0;
    } else {
      // Séparer la partie entière et décimale
      var entier = Math.floor(numericInput);
      var decimaleString = String(input).split('.')[1]; // Extraire la partie décimale comme une chaîne
      // Sécurisation : parser en entier et fallback à 1 si NaN/valeur vide
      var decimale = parseInt(decimaleString, 10);
      if (!Number.isFinite(decimale) || decimale <= 0) decimale = 1;

      // Limiter la partie entière entre 1 et 114 (sourate)
      entier = Math.max(1, Math.min(entier, 114));

      var nbVersets = nbVers(entier);

      // Limiter la partie décimale entre 1 et le nombre de versets de la sourate
      decimale = Math.max(1, Math.min(decimale, nbVersets));
    }

    // Appeler la bonne fenêtre
    if (decimale > 0) {
      if (progRacine) {
        afficherDefRacines(entier, decimale);
      } else {
        moduleSourat(entier, decimale);
      }
      progRacine = true;//remise par défaut
      return;
    } else {
      input = entier;
      var motEl = document.getElementById('mot');
      if (motEl) motEl.value = input; // s'il est éventuellement trimé ou substitué
      moduleWarsh(entier);
      return;
    }
  }

  // cas non numérique
  var txt = dedoubleSheddaSafe(input);
  var motEl = document.getElementById('mot');
  if (motEl) motEl.value = txt; // s'il est éventuellement trimé ou substitué
  return "";
}

function detecterLangueTexte(texte) {
  // Vérifier si le premier caractère est arabe
  if (texte === "") return true; // par défaut, si input est vide, estArabe=true (bsimi allah)
  var regexArabe = /[\u0600-\u06FF]/;
  // ✅ éviter la fuite globale : variable déclarée localement
  const estArabeMot = regexArabe.test(String(texte).trim().charAt(0));
  return estArabeMot;
}

function testLangueOninputMot() {
  const inputEl = document.getElementById('mot');
  if (!inputEl) return;

  const zoomBtn = document.getElementById('zoomCoranBtn');
  const inputSoura = document.getElementById('inputSoura');
  const valeurBrute = String(inputEl.value || '');

  // Détection langue / nombre
  const estNombre = (typeof detecterNombre === 'function')
    ? detecterNombre(valeurBrute)
    : false;

  const estArabeMot = (!estNombre && typeof detecterLangueTexte === 'function')
    ? detecterLangueTexte(valeurBrute)
    : false;

  // --- Direction, alignement, icône Zoom-Coran ---
  // NOTE: ne plus fermer automatiquement le bloc paramètres.

  if ((estArabeMot || valeurBrute === '') && !estNombre) {
    // Texte arabe (ou vide) → RTL
    inputEl.dir = 'rtl';
    inputEl.style.textAlign = 'right';
    if (zoomBtn) zoomBtn.innerHTML = '📖';
  } else {
    // Texte non arabe → LTR
    inputEl.dir = 'ltr';
    inputEl.style.textAlign = 'left';
    if (zoomBtn) zoomBtn.innerHTML = '📕';
    //afficherZoneParams(true);
  }

  // --- Gestion du champ sourate ---
  if (!estNombre) {
    if (inputSoura) inputSoura.value = '';
    try {
      if (typeof window.zcHideSouraVerseSpinner === "function") window.zcHideSouraVerseSpinner();
    } catch (_) { }
  } else {
    if (inputSoura) inputSoura.value = valeurBrute;
  }

  // --- Mise à jour éventuelle d’un sélecteur externe ---
  if (typeof updateInputTextSelecteur === 'function') {
    updateInputTextSelecteur(valeurBrute);
  }

  if (typeof window.zcExpandSouraIfMotNumeric === 'function') {
    try { window.zcExpandSouraIfMotNumeric(); } catch (_) { }
  }
}


function testLangueOninputCommentaire() { // =============================
  var el = document.getElementById("commentaires");
  if (!el) return;

  var input = el.value;
  var estArabeCommentaire = detecterLangueTexte(input);

  if (!estArabeCommentaire || input === "") {
    el.dir = "ltr";
    el.style.textAlign = 'left';
  } else {
    el.dir = "rtl";
    el.style.textAlign = 'right';
  }
}

////////////////////////////////////////// HANDLE INPUT

function handleMotInput(input) {
  input = String(input || "");
  input = dedoubleSheddaSafe(input);
  if (typeof showSuggestions === "function") {
    showSuggestions(input);
  }
  try {
    if (typeof window.zcRefreshMotSuggestionsCount === "function") {
      window.zcRefreshMotSuggestionsCount(input);
    }
  } catch (_) { }
  testLangueOninputMot();
  if (typeof ajusterHauteur === "function") ajusterHauteur('mot');
  var msgDiv = document.getElementById('msgDivCommentaire');
  if (msgDiv) msgDiv.innerHTML = ``;

}

function handleCommentaireInput() {
  var input = document.getElementById("commentaires")?.value || "";
  if (typeof activerElement === "function") activerElement("menu-container");
  testLangueOninputCommentaire();
  if (typeof ajusterHauteur === "function") ajusterHauteur('commentaires');
  var msgDiv = document.getElementById('msgDivCommentaire');
  if (msgDiv) msgDiv.innerHTML = ``;
}

//////////////////////////////////// FIN HANDLE INPUT

function testInput012345(texte) {
  if (!texte) return "";

  // Supprimer les espaces
  texte = texte.replace(/\s/g, '');

  // Vérifier si c’est un nombre (entier ou décimal)
  if (!isNaN(Number(texte))) {
    return 0;
  }

  // Récupérer le premier caractère non vide
  const firstChar = texte[0];

  // Vérifier si le premier caractère est arabe
  if (/[\u0600-\u06FF]/.test(firstChar)) {
    return 1;
  }

  // Sinon (latin, ponctuation, autre...)
  return 2;
}

// Helper pour récupérer le niveau (priorité à la variable globale "niveau")
function _getNiveau() {
  if (typeof niveau === 'number') return niveau;
  if (typeof niveauUser === 'number') return niveauUser;
  return Number(localStorage.getItem('niveauUser') || 0);
}


// clé de persistance (facultatif mais pratique)
const KEY_BTN_CACHES = 'btnCaches_visible';

function setBtnCachesVisible(visible, btn) {
  const target = document.getElementById('BtnCaches');
  if (!target) return;

  // Affichage zone
  target.hidden = !visible;
  target.style.display = visible ? '' : 'none';

  // Bouton optionnel (ancien toggle dans SAWM, conservé si présent)
  const b = btn || document.getElementById('btnToggleCaches');
  if (b) {
    b.setAttribute('aria-expanded', String(visible));
    const signEl = b.querySelector('.toggle-sign');
    if (signEl) signEl.textContent = visible ? '−' : '+';
    const tt = getLocalizedToggleTitle('btnToggleCaches', visible);
    if (tt) b.setAttribute('title', tt);
  }

  // Persistance
  try { localStorage.setItem(KEY_BTN_CACHES, visible ? '1' : '0'); } catch { }
}

// Init à l’ouverture (restaure l’état)
document.addEventListener('DOMContentLoaded', () => {
  const tgt = document.getElementById('BtnCaches');
  if (!tgt) return;

  let visible;
  try {
    const saved = localStorage.getItem(KEY_BTN_CACHES);
    if (saved === '1' || saved === '0') visible = (saved === '1');
  } catch { }

  // défaut : masqué si pas de valeur
  if (typeof visible === 'undefined') visible = false;

  setBtnCachesVisible(visible);
});

// Exemple d'étiquettes à mettre à jour avec des traductions
//window.updateUserUI();; // Met à jour le label "userConnecte1"
// Patch sécurité UI utilisateur — com12.js
(function () {
  "use strict";
  const $ = id => document.getElementById(id);

  function updateUserUI() {
    function syncAuthTabMirror(titleText, iconHtml, labelText) {
      const tabCandidates = [
        $('tipTab__logInUser'),
        $('tipTabFooterLogin'),
        $('tipTab__logOutUser'),
        $('tipTabFooterLogout')
      ].filter(Boolean);
      tabCandidates.forEach(function (tab) {
        try {
          tab.setAttribute('title', titleText);
          tab.setAttribute('aria-label', titleText);
          var ico = tab.querySelector('.zc-top-action-ico');
          if (ico && iconHtml) ico.innerHTML = iconHtml;
          var lbl = tab.querySelector('.zc-top-action-label, .zc-title-sync-label');
          if (lbl && labelText) lbl.textContent = labelText;
          // Le miroir reste un simple proxy visuel du bouton principal.
          tab.setAttribute('data-auth-mirror', '1');
        } catch (_) { }
      });
    }

    function refreshForumAfterAuthAction() {
      window.setTimeout(function () {
        try {
          if (typeof window.subscribeToMessages === "function") {
            window.subscribeToMessages();
          }
          if (typeof window.forumReaderRenderList === "function") {
            window.forumReaderRenderList();
          }
          if (typeof window.forumReaderRefreshNotifyBell === "function") {
            window.forumReaderRefreshNotifyBell();
          }
        } catch (_) { }
      }, 900);
    }

    const name = localStorage.getItem('nameUser') || 'anonyme';
    const niveau = Number(localStorage.getItem('niveauUser') || 0);

    const btnOut = $('logOutUser');
    const btnIn = $('logInUser');
    const authBtn = $('authUserBtn') || $('logInUser');
    const authLabel = $('authUserLabel');
    const authIcon = $('authUserIcon');
    const footerWelcome = $('footerUserWelcome');
    const tabOut = $('tipTab__logOutUser') || $('tipTabFooterLogout');
    const tabIn = $('tipTab__logInUser') || $('tipTabFooterLogin');
    if (btnOut && btnIn) {
      if (name === 'anonyme') {
        btnOut.style.display = 'none';
        btnIn.style.display = 'inline-block';
        if (tabOut) tabOut.style.display = 'none';
        if (tabIn) tabIn.style.display = '';
      } else {
        btnOut.style.display = 'inline-block';
        btnIn.style.display = 'none';
        if (tabIn) tabIn.style.display = 'none';
        if (tabOut) tabOut.style.display = '';
      }
    }
    let Ffooter = null;
    try {
      if (typeof window.getForumStrings === "function") Ffooter = window.getForumStrings();
    } catch (_) { }
    const footerWelcomePrefix = Ffooter ? Ffooter.welcomePrefix : "Bienvenue, ";
    const footerLevelLabel = Ffooter ? Ffooter.levelLabel : "Niveau ";
    const footerLoginLbl = Ffooter && Ffooter.welcomeLoginBtn ? Ffooter.welcomeLoginBtn : "Connexion";
    const footerLogoutLbl = Ffooter && Ffooter.welcomeLogoutBtn ? Ffooter.welcomeLogoutBtn : "Déconnexion";
    if (authBtn) {
      const isAnon = (name === 'anonyme');
      const btnTitle = isAnon ? footerLoginLbl : footerLogoutLbl;
      const iconHtml = isAnon
        ? '<i class="fas fa-sign-in-alt"></i>'
        : '<i class="fas fa-sign-out-alt"></i>';
      authBtn.title = btnTitle;
      authBtn.setAttribute('aria-label', btnTitle);
      authBtn.onclick = function () {
        if (isAnon) {
          if (typeof window.fctLogInUser === 'function') window.fctLogInUser();
        } else {
          if (typeof window.fctLogOutUser === 'function') window.fctLogOutUser();
        }
        refreshForumAfterAuthAction();
      };
      if (authLabel) authLabel.textContent = isAnon ? footerLoginLbl : footerLogoutLbl;
      if (authIcon) {
        authIcon.innerHTML = iconHtml;
      }
      syncAuthTabMirror(btnTitle, iconHtml, isAnon ? footerLoginLbl : footerLogoutLbl);
    }
    if (footerWelcome) {
      footerWelcome.textContent = footerWelcomePrefix + name + ' [' + footerLevelLabel + niveau + ']';
    }

    const cachesPanel = $('BtnCaches');
    if (cachesPanel) {
      if (niveau > 2) {
        // Admin/modérateur avancé: le bloc admin est toujours visible.
        setBtnCachesVisible(true);
      } else {
        // Non autorisé: bloc totalement masqué.
        setBtnCachesVisible(false);
      }
    }


    //const biblio = $('BiblioNumerique');
    //if (biblio) biblio.style.display = (niveau > 2) ? 'inline-block' : 'none';

    const reverso = $('reverso');
    if (reverso) reverso.style.display = (niveau > 2) ? 'inline-block' : 'none';
    const gTr = $('gTranslate');
    if (gTr) gTr.style.display = (niveau > 2) ? 'inline-block' : 'none';

    let Fwelcome = null;
    try {
      if (typeof window.getForumStrings === "function") Fwelcome = window.getForumStrings();
    } catch (_) { }
    const welcomePrefix = Fwelcome ? Fwelcome.welcomePrefix : "Bienvenue, ";
    const levelLabel = Fwelcome ? Fwelcome.levelLabel : "Niveau ";
    const loginLbl = Fwelcome && Fwelcome.welcomeLoginBtn ? Fwelcome.welcomeLoginBtn : "Connexion";
    const logoutLbl = Fwelcome && Fwelcome.welcomeLogoutBtn ? Fwelcome.welcomeLogoutBtn : "Déconnexion";
    const dedupeTitle = Fwelcome && Fwelcome.dedupeTopicsTitle
      ? Fwelcome.dedupeTopicsTitle
      : "Fusionner ou supprimer les sujets en doublon";
    const newPostTitleStr = Fwelcome && Fwelcome.newPostTitle ? Fwelcome.newPostTitle : "Écrire un nouveau message";
    const notesTitleStr = Fwelcome && Fwelcome.forumNotesTitle ? Fwelcome.forumNotesTitle : "Notes personnelles sur le forum";

    (function syncForumWelcomeLanguette() {
      function closeMore() {
        try {
          if (typeof window.forumCloseWelcomeMore === "function") window.forumCloseWelcomeMore();
        } catch (_) { }
      }

      const forumDisplayName = name === "anonyme" ? name : "@" + name;
      const isAnon = name === "anonyme";
      const btnTitle = isAnon ? loginLbl : logoutLbl;
      const iconHtml = isAnon
        ? '<i class="fas fa-sign-in-alt"></i>'
        : '<i class="fas fa-sign-out-alt"></i>';

      const scopes = [document.getElementById("forum-container"), document.getElementById("contenuLocal")].filter(Boolean);
      scopes.forEach(function (scope) {
        if (!scope.querySelector || !scope.querySelector(".zc-forum-welcome-panel")) return;

        const greetEl = scope.querySelector("#forumWelcomeGreet");
        const levelEl = scope.querySelector("#forumWelcomeLevel");
        const authBtn = scope.querySelector("#forumWelcomeAuthBtn");
        const authIco = scope.querySelector("#forumWelcomeAuthIco");
        const moreAuth = scope.querySelector("#forumWelcomeMoreAuth");
        const moreComment = scope.querySelector("#forumWelcomeMoreComment");
        const moreNotes = scope.querySelector("#forumWelcomeMoreNotes");
        const moreDedupe = scope.querySelector("#forumWelcomeMoreDedupe");
        if (!greetEl || !levelEl) return;

        greetEl.textContent = welcomePrefix + forumDisplayName;
        levelEl.textContent = "[" + niveau + "]";
        levelEl.setAttribute("aria-label", levelLabel + niveau);

        function setWelcomeMoreRowLabel(btn, text) {
          if (!btn) return;
          var lab = btn.querySelector(".zc-forum-welcome-more-label");
          if (lab) lab.textContent = text;
          else btn.textContent = text;
          btn.title = text;
          btn.setAttribute("aria-label", text);
        }

        setWelcomeMoreRowLabel(moreComment, newPostTitleStr);
        setWelcomeMoreRowLabel(moreNotes, notesTitleStr);
        if (moreDedupe) {
          setWelcomeMoreRowLabel(moreDedupe, dedupeTitle);
          if (niveau > 2) moreDedupe.removeAttribute("hidden");
          else moreDedupe.setAttribute("hidden", "");
        }

        if (authBtn) {
          authBtn.title = btnTitle;
          authBtn.setAttribute("aria-label", btnTitle);
          authBtn.onclick = function () {
            closeMore();
            if (isAnon) {
              if (typeof window.fctLogInUser === "function") window.fctLogInUser();
            } else {
              if (typeof window.fctLogOutUser === "function") window.fctLogOutUser();
            }
            refreshForumAfterAuthAction();
          };
        }
        if (authIco) authIco.innerHTML = iconHtml;

        if (moreAuth) {
          setWelcomeMoreRowLabel(moreAuth, btnTitle);
          var moreAuthIcoEl = moreAuth.querySelector("#forumWelcomeMoreAuthIco");
          if (moreAuthIcoEl) moreAuthIcoEl.innerHTML = iconHtml;
          moreAuth.onclick = function () {
            closeMore();
            if (isAnon) {
              if (typeof window.fctLogInUser === "function") window.fctLogInUser();
            } else {
              if (typeof window.fctLogOutUser === "function") window.fctLogOutUser();
            }
            refreshForumAfterAuthAction();
          };
        }
      });
    })();

    const userInfo = $('user-info');
    if (userInfo) userInfo.innerHTML = '';
  }

  document.addEventListener('DOMContentLoaded', updateUserUI);
  // 2) Appel manuel possible ailleurs
  window.updateUserUI = updateUserUI;   // <-- ajoute ceci

  // Auth Firebase : réaligner pied de page / bouton (autre onglet, restauration session, etc.)
  (function hookAuthStateForUserUi() {
    var zcPrevAuthUid = undefined;
    var zcAuthStateReady = false;
    function bind() {
      try {
        if (typeof firebase === "undefined" || !firebase.auth) return;
        firebase.auth().onAuthStateChanged(function (user) {
          var uid = user ? user.uid : null;
          zcPrevAuthUid = uid;
          zcAuthStateReady = true;
          try {
            if (typeof window.updateUserUI === "function") window.updateUserUI();
          } catch (_) { }
          try {
            if (typeof window.chokrNotifySyncFirestore === "function") window.chokrNotifySyncFirestore();
          } catch (_) { }
          try {
            if (typeof window.zcContactCounterSyncAuth === "function") window.zcContactCounterSyncAuth();
          } catch (_) { }
          try {
            if (typeof window.forumNotifyEnsureSubscribed === "function") window.forumNotifyEnsureSubscribed();
          } catch (_) { }
        });
      } catch (_) { }
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bind, { once: true });
    } else {
      bind();
    }
  })();
})();

/* ===================== Synchronisation des champs clone de #mot ===================== */
(function () {
  "use strict";

  // Canonique + clones modules (forum peut exister en plusieurs exemplaires clonés).
  const SYNC_SELECTORS = [
    "#mot",
    "#popupInputMot",              // Popup commentaire / lexique (référence = sujet)
    "#afModalTitleIn",             // Modale notes forum (titre du fil)
    "#forumEditSubject",           // Édition forum (sujet)
    "#searchInput",                 // Articles
    "#tmSearchInput",               // Témoignages
    ".zc-forum-reader-search-input" // Forum (textarea cloné possible)
  ];

  let syncBusy = false;

  function getSyncTargets() {
    const list = [];
    SYNC_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (!el) return;
        if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return;
        if (list.indexOf(el) === -1) list.push(el);
      });
    });
    return list;
  }

  function isSyncField(el) {
    if (!el) return false;
    if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return false;
    return (
      el.id === "mot" ||
      el.id === "popupInputMot" ||
      el.id === "afModalTitleIn" ||
      el.id === "forumEditSubject" ||
      el.id === "searchInput" ||
      el.id === "tmSearchInput" ||
      (el.classList && el.classList.contains("zc-forum-reader-search-input"))
    );
  }

  /**
   * Cibles exclues du sync en fonction de l'état UI.
   * - #afModalTitleIn : on n'écrit pas dans le titre de Mes Notes si la modale n'est
   *   pas visible (display !== "flex"). Sinon, un event "input" synthétique serait
   *   dispatché sur le titre et déclencherait le dialog « texte risque d'être écrasé »
   *   alors que l'utilisateur a simplement tapé dans #mot / #popupInputMot / etc.
   *   À l'ouverture de Mes Notes, openModal réalimente le titre depuis #mot.
   *   Le listener input de #afModalTitleIn filtre en plus les events synthétiques
   *   (isTrusted === false) pour ne jamais déclencher le dialog de confirmation via
   *   une propagation du sync (voir articles-forum-modal.js).
   */
  function isSyncTargetAllowed(el) {
    if (!el || !el.id) return true;
    if (el.id === "afModalTitleIn") {
      const ov = document.getElementById("afModalOverlay");
      return !!(ov && ov.style.display === "flex");
    }
    return true;
  }

  function syncFieldsFrom(sourceEl, value) {
    const v = String(value == null ? "" : value);
    const targets = getSyncTargets();
    syncBusy = true;
    try {
      targets.forEach((el) => {
        if (el === sourceEl) return;
        if (!isSyncTargetAllowed(el)) return;
        if (el.value === v) return;
        el.value = v;
        // Déclenche les filtres locaux (articles/forum/témoignages) sans boucle.
        try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) { }
      });
    } finally {
      syncBusy = false;
    }
  }

  document.addEventListener("input", function (e) {
    if (syncBusy) return;
    const el = e.target;
    if (!isSyncField(el)) return;
    syncFieldsFrom(el, el.value);
  }, true);

  // Alignement initial depuis #mot si présent.
  window.addEventListener("DOMContentLoaded", function () {
    try {
      const mot = document.getElementById("mot");
      if (mot) syncFieldsFrom(mot, mot.value || "");
    } catch (_) { }
  });

  // API manuelle si un module veut resynchroniser après rendu dynamique.
  window.zcSyncMotClones = function () {
    try {
      const mot = document.getElementById("mot");
      if (mot) syncFieldsFrom(mot, mot.value || "");
    } catch (_) { }
  };
})();


