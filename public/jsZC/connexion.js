/******************FORMULAIRE CONNEXION************/
/* Inscription : Firebase Auth (e-mail + mot de passe) + sendEmailVerification (lien dans le mail).
   Console Firebase → Authentication → Sign-in method : activer « E-mail / Mot de passe » en plus d’« Anonyme ». */
/** Message fugitif après connexion / déconnexion (mots-coran.js définit alertMsgBoxTemp). */
function zcToastSession(message, couleur, dureeMs) {
  couleur = couleur || 'green';
  dureeMs = dureeMs == null ? 4000 : dureeMs;
  try {
    if (typeof alertMsgBoxTemp === 'function') {
      alertMsgBoxTemp(message, couleur, dureeMs);
    }
  } catch (_) { }
}

function zcIsAnonymeCourriel(mail) {
  return String(mail || '').trim().toLowerCase() === 'anonyme@blog.alfamous.ca';
}

/** Utilisateur Firebase connecté avec un e-mail réel (hors anonyme app / compte anonyme). */
function zcFirebaseHasRealSignedInUser() {
  try {
    if (typeof firebase === 'undefined' || !firebase.auth) return false;
    var u = firebase.auth().currentUser;
    if (!u) return false;
    var em = String(u.email || '').trim().toLowerCase();
    if (!em) return false;
    if (typeof zcIsAnonymeCourriel === 'function' && zcIsAnonymeCourriel(em)) return false;
    return true;
  } catch (_) {
    return false;
  }
}
window.zcFirebaseHasRealSignedInUser = zcFirebaseHasRealSignedInUser;

function zcRememberLastNonAnonUser(name, mail, code) {
  var safeMail = String(mail || '').trim().toLowerCase();
  if (!safeMail || zcIsAnonymeCourriel(safeMail)) return;
  try {
    localStorage.setItem('lastNonAnonMailUser', safeMail);
    localStorage.setItem('lastNonAnonNameUser', String(name || '').trim());
    if (code != null && String(code).trim() !== '') {
      localStorage.setItem('lastNonAnonCodeUser', String(code));
    }
  } catch (_) { }
}

function zcGetLastNonAnonUser() {
  var lastMail = '';
  var lastName = '';
  var lastCode = '';
  try {
    lastMail = String(localStorage.getItem('lastNonAnonMailUser') || '').trim().toLowerCase();
    lastName = String(localStorage.getItem('lastNonAnonNameUser') || '').trim();
    lastCode = String(localStorage.getItem('lastNonAnonCodeUser') || '').trim();
    if (!lastCode) lastCode = String(localStorage.getItem('codeUser') || '').trim();
  } catch (_) { }
  if (!lastMail || zcIsAnonymeCourriel(lastMail)) return null;
  return { mail: lastMail, name: lastName, code: lastCode };
}

function zcRefreshForumIfOpen() {
  try {
    var popup = document.getElementById('popupHtml');
    var contenuLocal = document.getElementById('contenuLocal');
    var forumVisible = !!(
      popup &&
      popup.style.display !== 'none' &&
      contenuLocal &&
      contenuLocal.style.display !== 'none' &&
      contenuLocal.querySelector('.zc-forum-root')
    );
    if (forumVisible && typeof ouvrirPopupHtml === 'function') {
      ouvrirPopupHtml('forum');
    }
  } catch (_) { }
}

/**
 * IDs des champs du formulaire : ne pas utiliser id=nameUser / id=mailUser (collision avec les
 * variables globales nameUser, mailUser — le navigateur peut lier window.nameUser au nœud DOM).
 */
var ZC_LOGIN = {
  displayName: 'zcLoginDisplayName',
  email: 'zcLoginEmail',
  password: 'zcLoginPassword',
};

function zcElLogin(role) {
  return document.getElementById(ZC_LOGIN[role]);
}

var zcLoginEmailProbeSeq = 0;
var zcLoginEmailProbeTimer = null;

function zcClampLoginNiveauSelect(n) {
  var v = parseInt(n, 10);
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 3) return 3;
  return v;
}

/**
 * Bannière #msg, champ nom (inscription) et « Niveau demandé » selon le courriel et
 * demandeCollaborerLexique/{mail} (lecture publique).
 */
async function zcRefreshLoginFormFromEmail() {
  var mailEl = zcElLogin('email');
  var msgEl = document.getElementById('msg');
  var nameEl = zcElLogin('displayName');
  var nivEl = document.getElementById('niveauSelect');
  if (!mailEl || !msgEl) return;

  var raw = String(mailEl.value || '').trim();
  if (zcQuickLoginKeyFromFieldValue(raw)) return;

  var mail = raw.toLowerCase();
  zcSyncSessionUserFromStorage();

  function bannerSessionFallback() {
    var welcome = zcWelcomeLabelFromStoredName(nameUser);
    var nv = Number(localStorage.getItem('niveauUser') || 0);
    msgEl.innerHTML = '@' + welcome + ' [' + nv + ']';
  }

  if (!validateEmail(mail)) {
    bannerSessionFallback();
    return;
  }

  var seq = ++zcLoginEmailProbeSeq;
  try {
    if (typeof db === 'undefined' || !db || !db.collection) {
      bannerSessionFallback();
      return;
    }
    var snap = await db.collection('demandeCollaborerLexique').doc(mail).get();
    if (seq !== zcLoginEmailProbeSeq) return;

    if (!snap.exists) {
      msgEl.innerHTML =
        '<span class="zc-login-mail-hint">' + tMsg('loginNoProfileHint') + '</span><br>' +
        '<strong>@— [0]</strong>';
      var last = zcGetLastNonAnonUser();
      if (nameEl) {
        if (last && last.mail === mail && last.name) {
          nameEl.value = zcDisplayNameForField(last.name);
        } else {
          nameEl.value = '';
        }
      }
      if (nivEl) nivEl.value = '0';
      return;
    }

    var d = snap.data() || {};
    var nmRaw = String(d.name || '').trim();
    var displayLbl = nmRaw || '—';
    var nv = zcClampLoginNiveauSelect(d.niveau);
    msgEl.innerHTML = '@' + zcWelcomeLabelFromStoredName(displayLbl) + ' [' + nv + ']';
    if (nameEl) nameEl.value = nmRaw ? zcDisplayNameForField(nmRaw) : '';
    if (nivEl) nivEl.value = String(nv);
  } catch (e) {
    if (seq !== zcLoginEmailProbeSeq) return;
    console.warn('zcRefreshLoginFormFromEmail', e);
    bannerSessionFallback();
  }
}

function zcScheduleRefreshLoginFormFromEmail() {
  if (zcLoginEmailProbeTimer) clearTimeout(zcLoginEmailProbeTimer);
  zcLoginEmailProbeTimer = window.setTimeout(function () {
    zcLoginEmailProbeTimer = null;
    void zcRefreshLoginFormFromEmail();
  }, 420);
}

/** Recharge nameUser / mailUser depuis localStorage et aligne window (forum.js, etc.). */
function zcSyncSessionUserFromStorage() {
  nameUser = localStorage.getItem('nameUser') || 'anonyme';
  mailUser = localStorage.getItem('mailUser') || 'anonyme@blog.alfamous.ca';
  try {
    window.nameUser = nameUser;
    window.mailUser = mailUser;
  } catch (_) { }
}

/** Valeur à mettre dans le champ « nom » (évite « anonyme » brut ; retire @ si présent). */
function zcDisplayNameForField(stored) {
  var s = String(stored || '').trim();
  if (!s || s === 'anonyme') return '';
  if (s.charAt(0) === '@') return s.slice(1).trim();
  return s;
}

/** Texte @… pour la ligne de statut (toujours une chaîne). */
function zcWelcomeLabelFromStoredName(stored) {
  var s = String(stored || '').trim() || 'anonyme';
  if (s.charAt(0) === '@') return s.slice(1).trim() || 'anonyme';
  return s;
}

/** Compare les noms profil Firestore (champ name avec ou sans @). */
function zcNormalizeLexiqueName(s) {
  var t = String(s || '').trim().toLowerCase();
  if (t.charAt(0) === '@') t = t.slice(1).trim();
  return t;
}

/** Bloc HTML : vérification e-mail + rappel spam + bouton renvoi. */
function zcEmailVerificationMsgHtml() {
  return (
    '<p>' + tMsg('verifyEmailPrompt') + '</p>' +
    '<p class="zc-login-spam-hint">' + tMsg('verifyEmailSpamReminder') + '</p>' +
    '<p><button type="button" class="btn-plain" onclick="zcResendVerification()">' +
    tMsg('resendMailBtn') + '</button></p>'
  );
}

function zcLoginEscapeHandler(ev) {
  if (ev.key === 'Escape') hideFormulaireConnexion();
}

function zcNextOverlayZ() {
  try {
    if (typeof window.getNextZIndex === 'function') return Number(window.getNextZIndex()) || 0;
    if (typeof getNextZIndex === 'function') return Number(getNextZIndex()) || 0;
  } catch (_) { }
  var step = (typeof window.STEP === 'number' && window.STEP > 0) ? window.STEP : 1;
  var max = 0;
  try {
    var all = document.body ? document.body.querySelectorAll('*') : [];
    for (var i = 0; i < all.length; i++) {
      var z = parseInt(window.getComputedStyle(all[i]).zIndex, 10);
      if (!Number.isNaN(z) && z > max) max = z;
    }
  } catch (_) { }
  return max + step;
}

/** Affiche ou masque la modale (overlay + formulaire). Compatible sans #zcLoginShell (autres pages). */
function showUserFormVisible(visible) {
  var shell = document.getElementById('zcLoginShell');
  var backdrop = document.getElementById('zcLoginBackdrop');
  var form = document.getElementById('userForm');
  if (!form) return;
  if (visible) {
    if (shell) {
      try {
        if (document.body && shell.parentElement !== document.body) {
          document.body.appendChild(shell);
        } else if (document.body) {
          document.body.appendChild(shell);
        }
      } catch (_) { }
      shell.style.display = 'flex';
      try {
        var baseZ = zcNextOverlayZ();
        var step = (typeof window.STEP === 'number' && window.STEP > 0) ? window.STEP : 1;
        shell.style.zIndex = String(baseZ);
        if (backdrop) backdrop.style.zIndex = String(baseZ);
        form.style.zIndex = String(baseZ + step);
      } catch (_) { }
      try { shell.setAttribute('data-overlay', '1'); } catch (_) { }
    }
    form.style.display = 'block';
    form.style.position = 'relative';
    try {
      document.body.style.overflow = 'hidden';
    } catch (_) { }
    document.removeEventListener('keydown', zcLoginEscapeHandler);
    document.addEventListener('keydown', zcLoginEscapeHandler);
    window.setTimeout(function () {
      try {
        var sh = document.getElementById('zcLoginShell');
        var bd = document.getElementById('zcLoginBackdrop');
        var fm = document.getElementById('userForm');
        if (!sh || !fm) return;
        var z = zcNextOverlayZ();
        var st = (typeof window.STEP === 'number' && window.STEP > 0) ? window.STEP : 1;
        sh.style.zIndex = String(z);
        if (bd) bd.style.zIndex = String(z);
        fm.style.zIndex = String(z + st);
      } catch (_) { }
    }, 0);
  } else {
    document.removeEventListener('keydown', zcLoginEscapeHandler);
    if (shell) {
      shell.style.display = 'none';
      shell.style.zIndex = '';
      try { shell.removeAttribute('data-overlay'); } catch (_) { }
    }
    if (backdrop) backdrop.style.zIndex = '';
    form.style.zIndex = '';
    form.style.display = 'none';
    zcResetPasswordVisibility();
    try {
      document.body.style.overflow = '';
    } catch (_) { }
  }
}

function zcResetPasswordVisibility() {
  var inp = zcElLogin('password');
  var btn = document.getElementById('zcTogglePassword');
  if (inp) inp.type = 'password';
  if (btn) {
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', tMsg('showPassword'));
    btn.title = 'Afficher / masquer';
    var icon = btn.querySelector('i');
    if (icon) icon.className = 'fas fa-eye';
  }
  var emailInp = zcElLogin('email');
  var emailBtn = document.getElementById('zcToggleEmail');
  if (emailInp) emailInp.type = 'password';
  if (emailBtn) {
    emailBtn.setAttribute('aria-pressed', 'false');
    emailBtn.setAttribute('aria-label', 'Afficher le courriel');
    emailBtn.title = 'Afficher / masquer';
    var iconEmail = emailBtn.querySelector('i');
    if (iconEmail) iconEmail.className = 'fas fa-eye';
  }
}

/** Connexion rapide (dev) : saisir @niv0 … @nivX dans le champ courriel.
 *  Données servies par Cloud Functions getQuickLoginMap (fichier functions/quick-login.json).
 *  Le mot de passe n'est jamais pré-rempli. */
function zcInvalidateQuickLoginCache() {}

function zcSanitizeQuickLoginMap(obj) {
  var out = {};
  if (!obj || typeof obj !== 'object') return out;
  Object.keys(obj).forEach(function (k) {
    if (k.charAt(0) === '_') return;
    var v = obj[k];
    if (!v || typeof v !== 'object') return;
    var email = typeof v.email === 'string' ? v.email.trim() : '';
    if (!email) return;
    out[String(k).toLowerCase()] = {
      email: email,
      name: typeof v.name === 'string' ? v.name.trim() : '',
    };
  });
  return out;
}

function zcQuickLoginKeyFromFieldValue(t) {
  var m = String(t || '').trim().toLowerCase().match(/^@?niv\s*([0-9]+)\s*$/);
  if (!m) return '';
  return 'niv' + m[1];
}

function zcFetchQuickLoginMap() {
  return Promise.resolve()
    .then(function () {
      if (!firebase || !firebase.app || !firebase.functions) return {};
      var fn = firebase.app().functions('europe-west1').httpsCallable('getQuickLoginMap');
      return fn({}).then(function (res) {
        return zcSanitizeQuickLoginMap((res && res.data && res.data.map) || {});
      });
    })
    .catch(function () { return {}; });
}

async function zcApplyQuickLoginFromFieldValue(raw) {
  var key = zcQuickLoginKeyFromFieldValue(raw);
  if (!key) return false;
  var map = await zcFetchQuickLoginMap();
  var entry = map[key];
  var mailEl = zcElLogin('email');
  var pwdEl = zcElLogin('password');
  var nameEl = zcElLogin('displayName');
  if (!mailEl || !pwdEl) return false;
  if (!entry || !entry.email) {
    zcToastSession('[Dev] @' + key + ' : entrée absente (functions/quick-login.json).', 'orange', 6500);
    return false;
  }
  mailEl.value = entry.email;
  // Sécurité: le quick-login ne préremplit jamais le mot de passe.
  pwdEl.value = '';
  if (nameEl && entry.name) {
    nameEl.value = zcDisplayNameForField(entry.name);
  }
  var lastOkMail = '';
  try { lastOkMail = String(localStorage.getItem('lastNonAnonMailUser') || '').trim().toLowerCase(); } catch (_) { }
  if (entry.email !== lastOkMail) {
    try { pwdEl.focus(); } catch (_) { }
  }
  zcToastSession('[Dev] Profil chargé (' + key + ') — mot de passe non prérempli.', 'green', 2400);
  void zcRefreshLoginFormFromEmail();
  return true;
}

async function zcEnsureQuickLoginExpandedFromForm() {
  var el = zcElLogin('email');
  if (!el) return;
  var t = el.value.trim();
  if (zcQuickLoginKeyFromFieldValue(t)) {
    await zcApplyQuickLoginFromFieldValue(t);
  }
}

async function addDbCollectionUsers(collection, name, mail, sujet, commentaire, action) {
  try {
    if (typeof firebase === 'undefined' || !firebase.auth || !db) return;
    try {
      if (typeof firebase.auth().authStateReady === 'function') {
        await firebase.auth().authStateReady();
      }
    } catch (_) { }
    if (!firebase.auth().currentUser) {
      console.warn('addDbCollectionUsers: ignoré (aucune session Firebase Auth — historiqueActions exige une connexion).');
      return;
    }
  } catch (_) {
    return;
  }

  const docRefMail = db.collection(collection).doc(mail);
  try {
    const docSnapshot = await docRefMail.get();
    if (docSnapshot.exists) {
      await docRefMail.update({
        actions: firebase.firestore.FieldValue.arrayUnion({
          name: name,
          sujet: sujet,
          commentaire: commentaire,
          action: action,
          timestamp: new Date()
        })
      });
    } else {
      await docRefMail.set({
        actions: [{
          name: name,
          sujet: sujet,
          commentaire: commentaire,
          action: action,
          timestamp: new Date()
        }]
      });
    }
    console.log('Action ajoutée ou document créé avec succès !');
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'action ou de la création du document: ", error);
  }
}



async function fctLogOutUser() {
  setBtnCachesVisible(false);

  const prevMail = mailUser;

  try {
    await incrementerNombreConnexions(-1, prevMail);
  } catch (_) { }

  try {
    if (typeof PresenceRealtime !== 'undefined' && typeof PresenceRealtime.teardown === 'function') {
      await PresenceRealtime.teardown();
    }
  } catch (e) {
    console.warn('PresenceRealtime.teardown (logout):', e);
  }

  nameUser = 'anonyme';
  mailUser = 'anonyme@blog.alfamous.ca';
  niveauUser = 0;

  localStorage.setItem('niveauUser', niveauUser);
  localStorage.setItem('nameUser', nameUser);
  localStorage.setItem('mailUser', mailUser);

  zcToastSession(tMsg('notLoggedOut'), 'green', 4000);
  try {
    window.nameUser = nameUser;
    window.mailUser = mailUser;
  } catch (_) { }
  window.updateUserUI();
  try {
    if (typeof window.chokrNotifySyncFirestore === 'function') window.chokrNotifySyncFirestore();
  } catch (_) { }
  try {
    if (typeof window.zcContactCounterSyncAuth === 'function') window.zcContactCounterSyncAuth();
  } catch (_) { }
  try {
    if (typeof window.forumNotifyEnsureSubscribed === 'function') window.forumNotifyEnsureSubscribed();
  } catch (_) { }
  try {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      await firebase.auth().signOut();
    }
  } catch (_) { }
  try {
    if (typeof window.forumNotifyEnsureSubscribed === 'function') window.forumNotifyEnsureSubscribed();
  } catch (_) { }
  zcRefreshForumIfOpen();
}

async function fctLogInUser() {
  return new Promise((resolve) => {
    zcSyncSessionUserFromStorage();
    var lastNonAnon = zcGetLastNonAnonUser();

    var elName = zcElLogin('displayName');
    var elMail = zcElLogin('email');
    var elCode = zcElLogin('password');
    if (elName && 'value' in elName) {
      if (nameUser && nameUser !== 'anonyme') elName.value = zcDisplayNameForField(nameUser);
      else if (lastNonAnon && lastNonAnon.name) elName.value = zcDisplayNameForField(lastNonAnon.name);
      else elName.value = '';
    }
    if (elMail && 'value' in elMail) {
      var mailStr = String(mailUser || '').trim();
      if (zcIsAnonymeCourriel(mailStr)) elMail.value = (lastNonAnon && lastNonAnon.mail) ? lastNonAnon.mail : '';
      else elMail.value = mailStr;
    }
    if (elCode && 'value' in elCode) {
      elCode.value = (lastNonAnon && lastNonAnon.code) ? lastNonAnon.code : '';
    }

    var niveau = Number(localStorage.getItem('niveauUser') || 0);
    var welcome = zcWelcomeLabelFromStoredName(nameUser);

    var fpBtn = document.getElementById('zcForgotPwdBtn');
    var mailField = zcElLogin('email');
    var pwdField = zcElLogin('password');
    if (niveau > 0) {
      document.getElementById('msg').innerHTML = '@' + welcome + ' [' + niveau + ']';
      document.getElementById('msg').innerHTML += "<br>Vous êtes déjà connecté";
      document.getElementById('msg').innerHTML += "<br>أنت متصل بالفعل";
      document.getElementById('collaborer').style.display = 'none';
      if (mailField) mailField.style.display = 'none';
      var pwdBlock = document.getElementById('zcPasswordBlock');
      if (pwdBlock) pwdBlock.style.display = 'none';
      else if (pwdField) pwdField.style.display = 'none';
      if (fpBtn) fpBtn.style.display = 'none';
    } else {
      void zcRefreshLoginFormFromEmail();
      document.getElementById('collaborer').style.display = 'block';
      if (mailField) mailField.style.display = 'block';
      var pwdBlock2 = document.getElementById('zcPasswordBlock');
      if (pwdBlock2) pwdBlock2.style.display = '';
      else if (pwdField) pwdField.style.display = 'block';
      if (fpBtn) fpBtn.style.display = '';
    }

    showUserFormVisible(true);
    var nameWrap = document.getElementById('zcNameFieldWrap');
    if (nameWrap) nameWrap.style.display = 'none';
    if (elName) elName.style.display = 'block';
    if (mailField) mailField.focus();

    window.updateUserUI();

    // Observer les changements du style de `userForm`
    const userForm = document.getElementById('userForm');
    const observer = new MutationObserver(() => {
      if (getComputedStyle(userForm).display === 'none') {
        observer.disconnect(); // Arrête d'observer
        resolve(); // Résout la promesse pour continuer
      }
    });

    // Configurer l'observateur pour surveiller les attributs de style
    observer.observe(userForm, { attributes: true, attributeFilter: ['style'] });
  });


}






async function ajouterNomAuLexique(name) {
  // Consulter Lexique1
  var tabLexique = fTabLexique();
  var motTrouve = false;
  // Vérifier si le mot existe déjà
  for (var i = 0; i < tabLexique.length; i++) {
    var mot = tabLexique[i][0];
    if (mot.toLowerCase() === name.toLowerCase()) {
      motTrouve = true;
      break;
    }
  }

  // Si le mot n'est pas trouvé, l'ajouter
  if (!motTrouve) {
    // Ajouter le nom précédé de @
    tabLexique.push([`@${name}`, "Je me présente..."]); // Remplacer par le commentaire souhaité
    console.log(`Le mot "${name}" a été ajouté au lexique.`);

    // Attendre l'exportation des fichiers
    await exporterFichiers(tabLexique, "Lexique");//Ajout nouveau nom
  } else {
    console.log(`Le mot "${name}" existe déjà dans le lexique.`);
  }

  tabLexique = null; // Nettoyer la variable
  return false; // Retourner false, si nécessaire
}
// Fonction pour cacher les éléments

function hideFormulaireConnexion() {
  showUserFormVisible(false);
  window.updateUserUI();
}

/******************FORMULAIRE CONNEXION*************************************************************************************/
const _btnClose = document.getElementById('closeFormBtn');
if (_btnClose) {
  _btnClose.addEventListener('click', () => {
    hideFormulaireConnexion();
  });
}
var _zcBackdrop = document.getElementById('zcLoginBackdrop');
if (_zcBackdrop) {
  _zcBackdrop.addEventListener('click', function () {
    hideFormulaireConnexion();
  });
}
var _zcForgotBtn = document.getElementById('zcForgotPwdBtn');
if (_zcForgotBtn) {
  _zcForgotBtn.addEventListener('click', function () {
    zcForgotPassword();
  });
}
var _zcTogglePwd = document.getElementById('zcTogglePassword');
if (_zcTogglePwd) {
  _zcTogglePwd.addEventListener('click', function () {
    var inp = zcElLogin('password');
    if (!inp) return;
    var show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    _zcTogglePwd.setAttribute('aria-pressed', show ? 'true' : 'false');
    _zcTogglePwd.setAttribute('aria-label', show ? tMsg('hidePassword') : tMsg('showPassword'));
    _zcTogglePwd.title = show ? 'Masquer' : 'Afficher';
    var icon = _zcTogglePwd.querySelector('i');
    if (icon) icon.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
  });
}
var _zcToggleEmail = document.getElementById('zcToggleEmail');
if (_zcToggleEmail) {
  _zcToggleEmail.addEventListener('click', function () {
    var inp = zcElLogin('email');
    if (!inp) return;
    var show = inp.type === 'password';
    inp.type = show ? 'email' : 'password';
    _zcToggleEmail.setAttribute('aria-pressed', show ? 'true' : 'false');
    _zcToggleEmail.setAttribute('aria-label', show ? 'Masquer le courriel' : 'Afficher le courriel');
    _zcToggleEmail.title = show ? 'Masquer' : 'Afficher';
    var icon = _zcToggleEmail.querySelector('i');
    if (icon) icon.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
  });
}

var _zcMailUserInp = zcElLogin('email');
if (_zcMailUserInp) {
  function zcTryQuickLoginFromMailField() {
    var t = _zcMailUserInp.value.trim();
    if (!zcQuickLoginKeyFromFieldValue(t)) return;
    void zcApplyQuickLoginFromFieldValue(t);
  }
  function zcOnMailFieldInput() {
    zcTryQuickLoginFromMailField();
    var t = _zcMailUserInp.value.trim();
    if (zcQuickLoginKeyFromFieldValue(t)) return;
    zcScheduleRefreshLoginFormFromEmail();
  }
  _zcMailUserInp.addEventListener('input', zcOnMailFieldInput);
  _zcMailUserInp.addEventListener('change', function () {
    zcTryQuickLoginFromMailField();
    if (zcLoginEmailProbeTimer) {
      clearTimeout(zcLoginEmailProbeTimer);
      zcLoginEmailProbeTimer = null;
    }
    void zcRefreshLoginFormFromEmail();
  });
  _zcMailUserInp.addEventListener('blur', function () {
    zcTryQuickLoginFromMailField();
    if (zcQuickLoginKeyFromFieldValue(_zcMailUserInp.value.trim())) return;
    if (zcLoginEmailProbeTimer) {
      clearTimeout(zcLoginEmailProbeTimer);
      zcLoginEmailProbeTimer = null;
    }
    void zcRefreshLoginFormFromEmail();
  });
  _zcMailUserInp.addEventListener('paste', function () {
    var el = _zcMailUserInp;
    setTimeout(function () {
      var t = el.value.trim();
      if (zcQuickLoginKeyFromFieldValue(t)) void zcApplyQuickLoginFromFieldValue(t);
      else zcScheduleRefreshLoginFormFromEmail();
    }, 0);
  });
}


function okBtnConnexion() {//Bouton connexion
  // Ajoutez ici le code pour gérer l'action du bouton OK, par exemple :
  verifyCode1();
  window.updateUserUI();
}
function validateEmail(email) {
  // Utiliser une expression régulière pour vérifier le format de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function zcForgotPassword() {
  var el = zcElLogin('email');
  var mail = (el && el.value || '').trim().toLowerCase();
  if (!validateEmail(mail)) {
    zcToastSession(tMsg('enterEmailFirst'), 'orange', 4000);
    if (el) el.focus();
    return;
  }
  try {
    await firebase.auth().sendPasswordResetEmail(mail);
    zcToastSession(tMsg('resetMailInfo'), 'green', 6500);
  } catch (e) {
    var c = e && e.code;
    if (c === 'auth/invalid-email') {
      zcToastSession(tMsg('invalidEmail'), 'red', 4000);
    } else if (c === 'auth/too-many-requests') {
      zcToastSession(tMsg('tooManyRequests'), 'orange', 5000);
    } else {
      zcToastSession((e && e.message) || tMsg('mailSendError'), 'red', 4500);
    }
  }
}

/** Clé sessionStorage : inscription en attente après createUser + sendEmailVerification */
var ZC_PENDING_KEY = 'zcPendingInscription';

function zcStopPollingEmailVerification() {
  if (window.__zcEmailPollId) {
    clearInterval(window.__zcEmailPollId);
    window.__zcEmailPollId = null;
  }
}

/**
 * Crée le document Firestore + lexique + forum (nouvelle inscription uniquement).
 * Appelé après que l’utilisateur a cliqué le lien dans le mail (email vérifié).
 */
async function sauvegarderNouvelleDemandeLexique(mail, code, name, niveauDemandeParam) {
  const docRefMail = db.collection('demandeCollaborerLexique').doc(mail.toLowerCase());
  const querySnapshot = await db.collection('demandeCollaborerLexique').where('name', '==', name.toLowerCase()).get();
  if (!querySnapshot.empty) {
    document.getElementById('msg').innerHTML = tMsg('nameAlreadyTaken', { name: name });
    return;
  }
  var niveauDemandeInt = parseInt(niveauDemandeParam, 10);
  await docRefMail.set({
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    mail: mail.toLowerCase(),
    code: code,
    name: name,
    niveau: 0,
    niveauDemande: niveauDemandeInt
  });
  nameUser = name;
  mailUser = mail;
  niveauUser = 0;
  localStorage.setItem('nameUser', name);
  localStorage.setItem('mailUser', mail);
  localStorage.setItem('niveauUser', 0);
  zcRememberLastNonAnonUser(name, mail, code);

  alertMsgBoxPopup(tMsg('requestSaved', { name: name }));
  niveauDemande = parseInt(document.getElementById('niveauSelect').value, 10);

  var msgForum = msgUser({
    fr: 'Bienvenue !',
    ar: 'مرحبا!',
    en: 'Hello!',
    es: '¡Hola!'
  });
  document.getElementById('mot').value = nameUser;
  document.getElementById('commentaires').value = msgForum;
  ajouterNomAuLexique(nameUser);
  sendMessage('Inscription');
  document.getElementById('mot').value = '';
  document.getElementById('commentaires').value = '';
  okBtnConnexion();
}

function zcStartPollingEmailVerification() {
  zcStopPollingEmailVerification();
  window.__zcEmailPollId = setInterval(async function () {
    try {
      var u = firebase.auth().currentUser;
      if (!u) return;
      await u.reload();
      if (!u.emailVerified) return;
      zcStopPollingEmailVerification();
      var raw = sessionStorage.getItem(ZC_PENDING_KEY);
      if (!raw) return;
      var p = JSON.parse(raw);
      sessionStorage.removeItem(ZC_PENDING_KEY);
      await sauvegarderNouvelleDemandeLexique(p.mail, p.code, p.name, p.niveauDemande);
    } catch (err) {
      console.warn('[inscription] poll email', err);
    }
  }, 2500);
}

/**
 * Compte Firebase déjà créé (inscription interrompue) mais sans doc Firestore :
 * connexion avec le même mot de passe, puis finalisation si l’e-mail est vérifié.
 * @returns {'done'|'polling'|'exists'}
 */
async function zcFinaliserSiCompteOrphelin(mail, code, name, niveauDemandeParam) {
  var cred = await firebase.auth().signInWithEmailAndPassword(mail, code);
  await cred.user.reload();
  var docRef = db.collection('demandeCollaborerLexique').doc(mail.toLowerCase());
  var snap = await docRef.get();

  if (snap.exists) {
    try { await firebase.auth().signOut(); } catch (_) { }
    return 'exists';
  }

  if (!cred.user.emailVerified) {
    try {
      await cred.user.sendEmailVerification();
    } catch (e) {
      console.warn('sendEmailVerification (orphelin)', e);
    }
    return 'polling';
  }

  await sauvegarderNouvelleDemandeLexique(mail, code, name, niveauDemandeParam);
  return 'done';
}

/** Renvoyer le mail de vérification (utilisateur déjà connecté mais non vérifié) */
window.zcResendVerification = async function () {
  try {
    var u = firebase.auth().currentUser;
    if (!u) {
      alert(tMsg('reconnectWithSameCreds'));
      return;
    }
    await u.sendEmailVerification();
    alert(tMsg('verificationResent'));
  } catch (e) {
    console.error(e);
    alert((e && e.message) || tMsg('mailSendError'));
  }
};

window.zcAdminSyncAuthProfiles = async function () {
  try {
    if (!firebase || !firebase.app || !firebase.functions) {
      zcToastSession("Functions Firebase indisponible.", "red", 3500);
      return;
    }
    // Callable par défaut ~70 s → timeout → erreur "internal" côté client ; aligné sur la function (540 s).
    const fn = firebase.app().functions("europe-west1")
      .httpsCallable("syncAuthFromDemandeCollaborerLexique", { timeout: 540000 });

    zcToastSession("Sync Auth: analyse en cours…", "blue", 1800);
    const dry = await fn({
      dryRun: true,
      createMissing: true,
      updateDisplayName: true,
      updateFirestoreFromAuth: false,
      createMissingFirestore: false,
      disableOrphans: false,
      syncNiveauClaims: true,
    });
    const d = (dry && dry.data) || {};
    const s = d.stats || {};
    const pv = (d.preview && d.preview.drift) || [];
    var driftLines = "";
    if (pv.length) {
      driftLines = "\n--- Décalages Auth vs Collaborer (extrait) ---\n";
      for (var di = 0; di < Math.min(pv.length, 15); di++) {
        var row = pv[di];
        driftLines += row.email || "";
        if (row.displayName) {
          driftLines += " · displayName Auth=\"" + (row.displayName.auth || "") +
            "\" → Collaborer=\"" + (row.displayName.collaborer || "") + "\"";
        }
        if (row.niveau) {
          driftLines += " · niveau claims Auth=" + String(row.niveau.auth) +
            " → Collaborer=" + String(row.niveau.collaborer);
        }
        driftLines += "\n";
      }
    }
    const msg =
      "Prévisualisation Sync Auth (Collaborer → Auth)\n" +
      "- Manquants Auth: " + (s.missingInAuth || 0) + "\n" +
      "- MAJ Auth displayName (depuis Collaborer): " + (s.updated || 0) + "\n" +
      "- MAJ claims « niveau » (depuis Collaborer): " + (s.claimsUpdated || 0) + "\n" +
      "- MAJ Firestore depuis Auth: " + (s.firestoreUpdatedFromAuth || 0) + " (désactivé par défaut)\n" +
      "- Créations Firestore depuis Auth: " + (s.firestoreCreatedFromAuth || 0) + "\n" +
      "- Erreurs: " + (s.errors || 0) + "\n" +
      driftLines + "\n" +
      "Appliquer ces changements ?";

    const ok = typeof alertConfirm === "function" ? await alertConfirm(msg) : window.confirm(msg);
    if (!ok) {
      zcToastSession("Sync Auth annulée.", "orange", 1800);
      return;
    }

    const run = await fn({
      dryRun: false,
      createMissing: true,
      updateDisplayName: true,
      updateFirestoreFromAuth: false,
      createMissingFirestore: false,
      disableOrphans: false,
      syncNiveauClaims: true,
    });
    const r = (run && run.data) || {};
    const rs = r.stats || {};
    zcToastSession(
      "Sync Auth OK: créations Auth=" + (rs.created || 0) +
      ", maj displayName=" + (rs.updated || 0) +
      ", maj claims niveau=" + (rs.claimsUpdated || 0) +
      ", maj FS←Auth=" + (rs.firestoreUpdatedFromAuth || 0) +
      ", erreurs=" + (rs.errors || 0),
      rs.errors ? "orange" : "green",
      6500
    );
  } catch (e) {
    console.error("zcAdminSyncAuthProfiles:", e);
    var errMsg = (e && e.message) || "erreur";
    if (e && e.code === "functions/deadline-exceeded") {
      errMsg = "Délai dépassé (réessayez ou réduisez les opérations).";
    } else if (e && String(e.code || "").indexOf("permission-denied") !== -1) {
      // Message serveur (HttpsError) : details ou message selon la version du SDK.
      var d = e.details;
      if (typeof d === "string" && d.trim()) {
        errMsg = d.trim();
      } else if (d && typeof d === "object" && d.message) {
        errMsg = String(d.message);
      } else if (e.message && /Firestore refuse|niveau|Profil introuvable|E-mail de compte/i.test(e.message)) {
        errMsg = e.message;
      }
    }
    zcToastSession("Sync Auth impossible: " + errMsg, "red", 6500);
  }
};

async function enregistrerDemande(mail, code, name) {//lors de l'inscription, le nom est ajouté au Lexique, juste après sendMessage au journal
  try {

    // Référence au document par mail (également converti en minuscule)
    const docRefMail = db.collection("demandeCollaborerLexique").doc(mail.toLowerCase());
    const doc = await docRefMail.get();

    if (!doc.exists) {
      return;
    }

    let tstNiv = true;
    const userData = doc.data();
    const mailOk = mail.toLowerCase() === String(userData.mail || '').trim().toLowerCase();
    const codeOk = code === userData.code;
    const nameOk = zcNormalizeLexiqueName(name) === zcNormalizeLexiqueName(userData.name);
    // Compat anciens comptes: en cas de mismatch nom, on accepte mail+code
    // et on met à jour le nom affiché demandé.
    const canRefreshLegacyName = mailOk && codeOk;
    const nDem = Number(niveauDemande);
    const nCur = Number(userData.niveau);
    const sameLevel = nDem === nCur;

    if (mailOk && codeOk && sameLevel) {
      if (!nameOk && validateInput(name)) {
        try {
          await docRefMail.update({
            name: name,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } catch (eUp) {
          console.warn('MAJ nom legacy (same level)', eUp);
        }
      }
      document.getElementById('msg').innerHTML = '<p>' + tMsg('useLoginNotInscription') + '</p>';
      return;
    }

    document.getElementById('msg').innerHTML = tMsg('mailAlreadyExistsLogin');

      // Vérifications des champs (en minuscules pour éviter les erreurs de casse)
      if (!codeOk) {
        document.getElementById('msg').innerHTML += '<br>' + tMsg('wrongPassword');
        tstNiv = false;
      }
      if (!mailOk) {
        document.getElementById('msg').innerHTML += '<br>' + tMsg('invalidMail');
        tstNiv = false;
      }
      if (!nameOk && !canRefreshLegacyName) {
        document.getElementById('msg').innerHTML += '<br>' + tMsg('invalidName');
        tstNiv = false;
      }
      if (sameLevel) {
        document.getElementById('msg').innerHTML += '<br>' + tMsg('requestedLevelSame');
        tstNiv = false;
      }

      if (!tstNiv) {
        return; // Si des erreurs sont détectées, on arrête ici
      }

      // Confirmation du changement de niveau
      var confirmation = await alertConfirm(
        tMsg('confirmLevelChange', { from: userData.niveau, to: niveauDemande })
      );

      if (!confirmation) {
        return; // Si la confirmation est false, on arrête ici
      }

      await docRefMail.update({
        niveauDemande: nDem,
        ...(validateInput(name) ? { name: name } : {}),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      document.getElementById('msg').innerHTML = `<p>Niveau demandé mis à jour: ${nCur} → ${nDem}</p>`;
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la demande:", error);
  }
}

// Variable globale pour stocker le niveau choisi
let niveauDemande = 0;

/**
 * Cas legacy: l'utilisateur existe dans demandeCollaborerLexique mais pas dans Firebase Auth.
 * - si absent d'Auth => crée le compte Auth + envoie vérification e-mail.
 * - si présent avec mot de passe différent => informe l'utilisateur.
 * Retour:
 *   'ok' | 'created-pending-verification' | 'auth-password-mismatch' | 'error'
 */
async function zcEnsureAuthAccountForExistingFirestoreUser(mail, code, msgEl) {
  try {
    var cred = await firebase.auth().signInWithEmailAndPassword(mail, code);
    await cred.user.reload();
    if (!cred.user.emailVerified) {
      try { await cred.user.sendEmailVerification(); } catch (_) { }
    }
    return 'ok';
  } catch (e) {
    var ec = e && e.code;
    if (ec === 'auth/user-not-found') {
      try {
        await firebase.auth().createUserWithEmailAndPassword(mail, code);
        if (firebase.auth().currentUser) {
          await firebase.auth().currentUser.sendEmailVerification();
        }
        if (msgEl) {
          msgEl.innerHTML =
            '<p>Votre fiche existe déjà, mais votre compte Auth Firebase manquait.</p>' +
            '<p>Nous venons de le créer. Vérifiez votre courriel puis utilisez Connexion.</p>' +
            '<p class="zc-login-spam-hint">' + tMsg('verifyEmailSpamReminder') + '</p>';
        }
        return 'created-pending-verification';
      } catch (eCreate) {
        console.error('create auth legacy:', eCreate);
        if (msgEl) {
          msgEl.innerHTML = (eCreate && eCreate.message) || tMsg('signupFinalizeImpossible');
        }
        return 'error';
      }
    }
    if (ec === 'auth/wrong-password' || ec === 'auth/invalid-credential') {
      if (msgEl) {
        msgEl.innerHTML =
          '<p>Ce courriel existe dans Authentification avec un autre mot de passe.</p>' +
          '<p>Utilisez Connexion avec le bon mot de passe (ou “J’ai oublié mon mot de passe”).</p>';
      }
      return 'auth-password-mismatch';
    }
    if (ec === 'auth/too-many-requests') {
      if (msgEl) msgEl.innerHTML = tMsg('tooManyRequests');
      return 'error';
    }
    console.error('sync auth legacy:', e);
    return 'ok';
  }
}

async function Collaborer() {
  niveauDemande = parseInt(document.getElementById('niveauSelect').value, 10);
  var msg = document.getElementById('msg');
  var elMailF = zcElLogin('email');
  var elPwdF = zcElLogin('password');
  var mail = (elMailF && elMailF.value || '').trim().toLowerCase();
  var code = (elPwdF && elPwdF.value || '').trim();
  var nameInp0 = zcElLogin('displayName');
  var name = (nameInp0 && nameInp0.value || '').trim();
  var nameWrap2 = document.getElementById('zcNameFieldWrap');
  if (nameWrap2) nameWrap2.style.display = 'block';
  if (nameInp0) {
    nameInp0.style.display = 'block';
    nameInp0.value = name;
  }
  msg.innerHTML = '@' + name;

  if (!validateInput(name)) {
    msg.innerHTML = tMsg('nameTooShort');
    if (nameInp0) nameInp0.focus();
    return;
  }

  if (!validateEmail(mail)) {
    msg.innerHTML = tMsg('invalidEmail');
    if (elMailF) elMailF.focus();
    return;
  }

  if (!validateInput(code)) {
    msg.innerHTML = tMsg('passwordTooShort');
    if (elPwdF) elPwdF.focus();
    return;
  }

  if (code.length < 6) {
    msg.innerHTML = tMsg('passwordMin6');
    if (elPwdF) elPwdF.focus();
    return;
  }

  var docRefMail = db.collection('demandeCollaborerLexique').doc(mail);
  var docSnap = await docRefMail.get();

  if (docSnap.exists) {
    const syncState = await zcEnsureAuthAccountForExistingFirestoreUser(mail, code, msg);
    if (syncState === 'created-pending-verification' || syncState === 'auth-password-mismatch' || syncState === 'error') {
      return;
    }
    await enregistrerDemande(mail, code, name);
    return;
  }

  async function zcTryFinalizeFromExistingAuthAccount() {
    try {
      var st = await zcFinaliserSiCompteOrphelin(mail, code, name, niveauDemande);
      sessionStorage.removeItem(ZC_PENDING_KEY);
      if (st === 'exists') {
        msg.innerHTML = tMsg('emailHasRecordUseLogin');
        return true;
      } else if (st === 'polling') {
        sessionStorage.setItem(ZC_PENDING_KEY, JSON.stringify({
          mail: mail,
          name: name,
          code: code,
          niveauDemande: niveauDemande
        }));
        msg.innerHTML =
          '<p>' + tMsg('existingFirebaseAccountReconnected') + '</p>' +
          '<p><strong>' + tMsg('verifyInboxAndStay') + '</strong></p>' +
          '<p class="zc-login-spam-hint">' + tMsg('verifyEmailSpamReminder') + '</p>';
        zcStartPollingEmailVerification();
        return true;
      } else if (st === 'done') {
        return true;
      }
      return false;
    } catch (e2) {
      sessionStorage.removeItem(ZC_PENDING_KEY);
      try { await firebase.auth().signOut(); } catch (_) { }
      var ec = e2 && e2.code;
      if (ec === 'auth/wrong-password' || ec === 'auth/invalid-credential') {
        msg.innerHTML =
          '<p>Ce courriel existe dans Authentification, mais pas encore dans la liste des abonnés.</p>' +
          '<p>Utilisez le mot de passe déjà associé à ce courriel (ou réinitialisez-le), puis relancez l’inscription.</p>';
      } else {
        msg.innerHTML = (e2 && e2.message) || tMsg('signupFinalizeImpossible');
        if (ec) msg.innerHTML += '<br><code>' + ec + '</code>';
      }
      return true;
    }
  }

  try {
    var methods = await firebase.auth().fetchSignInMethodsForEmail(mail);
    if (Array.isArray(methods) && methods.length > 0) {
      const handled = await zcTryFinalizeFromExistingAuthAccount();
      if (handled) return;
    }
  } catch (eMethods) {
    console.warn('fetchSignInMethodsForEmail:', eMethods);
  }

  sessionStorage.setItem(ZC_PENDING_KEY, JSON.stringify({
    mail: mail,
    name: name,
    code: code,
    niveauDemande: niveauDemande
  }));

  try {
    await firebase.auth().createUserWithEmailAndPassword(mail, code);
    await firebase.auth().currentUser.sendEmailVerification();
    msg.innerHTML =
      '<p>' + tMsg('verifyEmailSentBody') + '</p>' +
      '<p class="zc-login-spam-hint">' + tMsg('verifyEmailSpamReminder') + '</p>' +
      '<p style="font-size:0.9em;color:#555;">' + tMsg('verifyEmailFinalizeHint') + '</p>';
    zcStartPollingEmailVerification();
  } catch (e) {
    console.error('Collaborer Firebase', e);
    if (e.code === 'auth/email-already-in-use') {
      await zcTryFinalizeFromExistingAuthAccount();
    } else {
      sessionStorage.removeItem(ZC_PENDING_KEY);
      if (e.code === 'auth/weak-password') {
        msg.innerHTML = tMsg('weakPasswordMin6');
      } else {
        msg.innerHTML = (e.message || tMsg('signupError')) + (e.code ? '<br><code>' + e.code + '</code>' : '');
      }
    }
  }
}
/**
 * Incrémente / décrémente le champ nombreConnexions
 * du document /demandeCollaborerLexique/{mailUser}.
 * Lit le mail depuis localStorage.mailUser (ou mailOverride si fourni).
 * Utilise un flag session pour éviter le double comptage.
 *
 * @param {number} plusMoins  ex: +1 (login) ou -1 (logout)
 * @param {string} mailOverride mail explicite (utile au logout avant reset localStorage)
 */
async function incrementerNombreConnexions(plusMoins = 1, mailOverride) {
  const rawMail = (mailOverride != null && String(mailOverride).trim() !== '')
    ? String(mailOverride)
    : (localStorage.getItem('mailUser') || '');
  const mail = rawMail.toLowerCase().trim();
  if (!mail || !/@/.test(mail)) {
    console.warn('incrementerNombreConnexions: mailUser manquant ou invalide:', mail);
    return;
  }
  // Ne jamais créer/mettre à jour un faux compte "anonyme".
  if (zcIsAnonymeCourriel(mail)) return;

  // Anti double-comptage sur la même session (pour +1 seulement)
  if (plusMoins > 0) {
    if (sessionStorage.getItem('__conn_counted__') === '1') {
      // déjà compté une fois cette session
    } else {
      sessionStorage.setItem('__conn_counted__', '1');
    }
  }

  const docRef = db.collection('demandeCollaborerLexique').doc(mail);

  try {
    const snap = await docRef.get();
    if (snap.exists) {
      await docRef.update({
        nombreConnexions: firebase.firestore.FieldValue.increment(plusMoins),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Crée le doc minimal sans écraser d’éventuels champs (merge)
      await docRef.set({
        mail,
        nombreConnexions: Math.max(0, plusMoins),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // Miroir local non-bloquant
    const cur = parseInt(localStorage.getItem('ncp') || '0', 10) || 0;
    const next = Math.max(0, cur + plusMoins);
    localStorage.setItem('ncp', String(next));

    console.log(`nombreConnexions ${plusMoins >= 0 ? '+' : ''}${plusMoins} → OK pour ${mail}`);
  } catch (e) {
    const code = String((e && e.code) || '');
    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      console.warn('incrementerNombreConnexions ignore permission-denied:', mail);
      return;
    }
    console.error('incrementerNombreConnexions error:', e);
  }
}

async function verifyCode1() {
  await zcEnsureQuickLoginExpandedFromForm();
  var elPwd = zcElLogin('password');
  var elMailForm = zcElLogin('email');
  var elNameForm = zcElLogin('displayName');
  var displayNameInput = (elNameForm && elNameForm.value || '').trim();
  var codeUser = (elPwd && elPwd.value || '').trim();
  var mailUser = (elMailForm && elMailForm.value || '').trim().toLowerCase();
  var msg = document.getElementById('msg');
  if (!codeUser || !mailUser) {
    msg.innerHTML =
      '<p style="text-align: center; color: red;">' + tMsg('emailPasswordRequired') + '</p>' +
      '<p style="text-align: center; color: dark;"><a href="#" onclick="ouvrirPopupHtml(\'forum\');return false;">' + tMsg('ifNoPasswordContactForum') + ' <i class="fas fa-envelope"></i></a></p>';
    return;
  }

  async function finishLoginSuccess(data) {
    try {
      const curName = String((data && data.user && data.user.name) || '').trim();
      const nextName = String(displayNameInput || '').trim();
      if (validateInput(nextName) && zcNormalizeLexiqueName(curName) !== zcNormalizeLexiqueName(nextName)) {
        try {
          const docRef = db.collection('demandeCollaborerLexique').doc(mailUser);
          await docRef.update({
            name: nextName,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          data.user.name = nextName;
        } catch (e) {
          console.warn('sync login name -> firestore:', e);
        }
      }
    } catch (e) {
      console.warn('sync login name -> firestore:', e);
    }

    localStorage.setItem('niveauUser', data.user.niveau);
    localStorage.setItem('nameUser', data.user.name);
    localStorage.setItem('mailUser', data.user.mail);
    localStorage.setItem('codeUser', data.user.code);
    zcRememberLastNonAnonUser(data.user.name, data.user.mail, data.user.code);
    await incrementerNombreConnexions(+1);
    await addDbCollectionUsers('historiqueActions', data.user.name, data.user.mail, '', '', 'Connexion');
    msg.innerHTML = '';
    hideFormulaireConnexion();
    nameUser = data.user.name;
    mailUser = data.user.mail;
    try {
      window.nameUser = nameUser;
      window.mailUser = mailUser;
    } catch (_) { }
    var displayName = String(data.user.name || '').replace(/^@/, '').trim() || 'ami';
    zcToastSession(tMsg('loggedInAs', { name: displayName }), 'green', 4500);
    try {
      if (typeof window.updateUserUI === 'function') window.updateUserUI();
    } catch (_) { }
    try {
      if (typeof window.forumNotifyEnsureSubscribed === 'function') window.forumNotifyEnsureSubscribed();
    } catch (_) { }
    zcRefreshForumIfOpen();
  }

  try {
    var cred = await firebase.auth().signInWithEmailAndPassword(mailUser, codeUser);
    await cred.user.reload();
    if (!cred.user.emailVerified) {
      msg.innerHTML = zcEmailVerificationMsgHtml();
      return;
    }
    var data = await verifyUserCode(mailUser, codeUser, { skipCodeCheck: true });
    if (data.success) {
      await finishLoginSuccess(data);
    } else {
      msg.innerHTML = '<p>' + data.message + '</p>';
    }
  } catch (e) {
    var ec = e && e.code;
    if (ec === 'auth/user-not-found') {
      try {
        var dataLegacy = await verifyUserCode(mailUser, codeUser);
        if (dataLegacy.success) {
          try {
            var credLegacy;
            try {
              credLegacy = await firebase.auth().createUserWithEmailAndPassword(mailUser, codeUser);
            } catch (ce) {
              var cec = ce && ce.code;
              if (cec === 'auth/email-already-in-use') {
                credLegacy = await firebase.auth().signInWithEmailAndPassword(mailUser, codeUser);
              } else {
                throw ce;
              }
            }
            await credLegacy.user.reload();
            if (!credLegacy.user.emailVerified) {
              msg.innerHTML = zcEmailVerificationMsgHtml();
              return;
            }
            await finishLoginSuccess(dataLegacy);
          } catch (authErr) {
            console.error('Connexion legacy (Firestore OK, Auth Firebase):', authErr);
            msg.innerHTML =
              '<p>' + tMsg('loginError') + '</p>' +
              '<p style="font-size:0.9em;color:#64748b;">Compte présent dans la base mais liaison Auth impossible. Contactez le support si besoin.</p>';
          }
        } else {
          msg.innerHTML = '<p>' + (dataLegacy.message || tMsg('loginInvalidCreds')) + '</p>';
        }
      } catch (err2) {
        msg.innerHTML = '<p>' + tMsg('loginVerifyError') + '</p>';
        console.error(err2);
      }
    } else if (ec === 'auth/wrong-password' || ec === 'auth/invalid-credential') {
      msg.innerHTML = '<p>' + tMsg('loginInvalidCreds') + '</p>';
    } else {
      msg.innerHTML = '<p>' + ((e && e.message) || tMsg('loginError')) + '</p>';
      console.error('verifyCode1', e);
    }
  }
}
/*************************************/
async function verifyUserCode(mail, code, opts) {
  opts = opts || {};
  var skipCodeCheck = !!opts.skipCodeCheck;
  try {
    niveauUser = -1;
    nameUser = 'anonyme';
    mailUser = mail.toLowerCase();
    const docRef = db.collection('demandeCollaborerLexique').doc(mail);
    const doc = await docRef.get();
    if (!doc.exists) {
      return { success: false, message: tMsg('emailNotFound') };
    }

    const userData = doc.data();
    var codeOk = skipCodeCheck || userData.code === code;
    if (!codeOk) {
      return { success: false, message: tMsg('wrongPassword') };
    }
    if (skipCodeCheck && code && userData.code !== code) {
      try {
        await docRef.update({
          code: code,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.warn('[auth] synchro code Firestore', e);
      }
    }

    niveauUser = userData.niveau;
    nameUser = userData.name;
    mailUser = userData.mail;

    if (niveauUser > -1) {
      var userOut = Object.assign({}, userData, { code: code });
      return { success: true, user: userOut };
    }
    return { success: false, message: tMsg('validationPending') };
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    return { success: false, message: tMsg('serverError') };
  }
}






// Utilitaire pour créer un id HTML sûr à partir d’un email
function _emailToId(mail) {
  return String(mail || '').toLowerCase().replace(/[^a-z0-9_-]/gi, '_');
}

/**
 * Affiche / masque le tableau des abonnés.
 * - 1er clic : charge & affiche
 * - 2e clic : masque (cache conservé)
 * - 3e clic : ré-affiche instantanément (sans re-requête)
 */
async function recupererTousLesAbonnes() {
  const cont = ensureListeAbonnesContainer();

  // Ouvre la popup (définie plus bas via afficherAbonnesPopup)
  await (typeof afficherAbonnesPopup === 'function' ? afficherAbonnesPopup() : Promise.resolve());

  // Marque comme affiché
  cont.dataset.state = 'shown';

  // Quand la popup se ferme, on repasse à "hidden"
  const onClosed = () => {
    cont.dataset.state = 'hidden';
    document.removeEventListener('abonnesPopupClosed', onClosed);
  };
  document.addEventListener('abonnesPopupClosed', onClosed, { once: true });
}


/**
 * Met à jour le niveau dans Firestore via transaction
 * et rafraîchit la cellule du niveau sans recharger la table.
 * Borne par défaut à [0..9] (modifiable ci-dessous).
 */
async function _majNiveauFirestore(email, delta) {
  if (!email || !Number.isFinite(delta)) return;

  // Désactive les 2 boutons de la ligne pendant l’update
  const rowBtns = Array.from(document.querySelectorAll(`.btn-niv[data-mail="${email}"]`));
  rowBtns.forEach(b => b.disabled = true);

  try {
    const ref = db.collection("demandeCollaborerLexique").doc(email.toLowerCase());
    const newValue = await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      const cur = snap.exists && Number.isFinite(+snap.data().niveau) ? +snap.data().niveau : 0;

      // 🔧 BORNES : ajuste ici (ex: 0..9)
      let next = cur + delta;
      if (next < 0) next = 0;
      if (next > 9) next = 9;

      if (next !== cur) t.update(ref, { niveau: next });
      return next;
    });

    // Met à jour la cellule à l’écran
    const cellId = `niv-${_emailToId(email)}`;
    const cell = document.getElementById(cellId);
    if (cell) cell.textContent = newValue;
  } catch (err) {
    console.error('Maj niveau échouée:', err);
    alert(tMsg('updateLevelError'));
  } finally {
    rowBtns.forEach(b => b.disabled = false);
  }
}

/**
 * Attache une seule fois la délégation de clics sur le conteneur (#listeAbonnes)
 * pour gérer les boutons + / −.
 */
function _attachAbonnesDelegationOnce(cont) {
  if (!cont || cont.dataset.listenerAttached === 'true') return;

  cont.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-niv');
    if (!btn) return;

    const mail = btn.dataset.mail;
    const delta = parseInt(btn.dataset.delta, 10) || 0;
    await _majNiveauFirestore(mail, delta);
  });

  cont.dataset.listenerAttached = 'true';
}

/**
 * Wrapper pour le bouton d’UI qui met à jour le libellé
 * en fonction de l’état après appel.
 */

async function toggleAbonnes(btn) {
  await recupererTousLesAbonnes();
  const cont = document.getElementById('listeAbonnes');
  const state = (cont?.dataset.state) || 'hidden';
  btn.textContent = (state === 'shown') ? '🙈 +/- Niv@User' : '👁️ +/- Niv@User';
}











/* ===================== POPUP — Tableau des abonnés ===================== */
/* Dépendances attendues: 
   - window.db (Firestore)
   - getNextZIndex() (optionnel mais recommandé; sinon fallback)
*/
function ensureListeAbonnesContainer() {
  let el = document.getElementById('listeAbonnes');
  if (!el) {
    el = document.createElement('div');
    el.id = 'listeAbonnes';
    el.style.display = 'none';        // purement utilitaire
    el.dataset.state = 'hidden';
    document.body.appendChild(el);
  } else if (!el.dataset.state) {
    el.dataset.state = 'hidden';
  }
  return el;
}


(function () {
  // Style (header sticky, zebra, responsive)
  if (!document.getElementById('abonnes-popup-style')) {
    const st = document.createElement('style');
    st.id = 'abonnes-popup-style';
    st.textContent = `
      #abonnes-overlay { position:fixed; inset:0; background:rgba(0,0,0,.35);
        display:flex; align-items:center; justify-content:center; }
      #abonnes-popup { background:#fff; width:min(1100px, 95vw); max-height:85vh; 
        border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.2);
        display:flex; flex-direction:column; overflow:hidden; }
      #abonnes-head { padding:10px 14px; display:flex; align-items:center; gap:10px;
        justify-content:space-between; background:#f7f7f8; border-bottom:1px solid #e6e6e6; }
      #abonnes-body { overflow:auto; padding:0; }
      #abonnes-table { width:100%; border-collapse:collapse; font-size:14px; }
      #abonnes-table thead tr { position:sticky; top:0; background:#fafafa; z-index:1; }
      #abonnes-table th, #abonnes-table td { padding:3px 4px; border-bottom:1px solid #f0f0f0; white-space:nowrap; }
      #abonnes-table th[data-sort] { cursor:pointer; user-select:none; }
      #abonnes-table tbody tr:nth-child(odd){ background:#fcfcfd; }
      #abonnes-actions { display:flex; gap:6px; align-items:center; }
      #abonnes-search { padding:3px 4px; border:1px solid #ddd; border-radius:8px; font-size:13px; min-width:220px; }
      #abonnes-level { padding:3px 4px; border:1px solid #ddd; border-radius:8px; font-size:13px; }
      .btn-plain { border:1px solid #ddd; background:#fff; border-radius:8px; padding:6px 10px; cursor:pointer; }
      .btn-plain:hover { background:#f2f2f2; }
      .tag { font-size:12px; padding:2px 6px; border-radius:999px; border:1px solid #e0e0e0; }
    `;
    document.head.appendChild(st);
  }

  function closeAbonnes() {
    const ov = document.getElementById('abonnes-overlay');
    if (ov) ov.remove();
    // Informe le wrapper que la popup est fermée
    document.dispatchEvent(new CustomEvent('abonnesPopupClosed'));
  }


  function asDate(ts) {
    try {
      // Firestore Timestamp → JS Date
      if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
      if (ts instanceof Date) return ts.toLocaleString();
    } catch (_) { }
    return '';
  }

  function safe(v) { return (v === undefined || v === null) ? '' : String(v); }

  function triGen(key, dir) {
    return (a, b) => {
      const va = (a[key] ?? ''), vb = (b[key] ?? '');
      if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
      return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    };
  }

  function renderTable(rows) {
    const thead = `
    <thead>
      <tr>
        <th>#</th>
        <th data-sort="mail">Mail</th>
        <th data-sort="name">Name</th>
        <th data-sort="niveauDemande">Demandé</th>
        <th data-sort="nombreConnexions">Connexions</th>
        <th data-sort="niveau">Niveau (±)</th>
        <th data-sort="timestamp">Créé</th>
        <th data-sort="updatedAt">Maj</th>
      </tr>
    </thead>`;

    const tbody = rows.map((r, i) => `
    <tr data-doc="${r.docId}">
      <td>${i + 1}</td>
      <td>${safe(r.mail)}</td>
      <td>${safe(r.name)}</td>
      <td style="text-align:right">
        ${safe(r.niveauDemande)} ${r.niveauDemande !== undefined ? '<span class="tag">dem.</span>' : ''}
      </td>
      <td style="text-align:right">${safe(r.nombreConnexions)}</td>
      <td style="text-align:center">
        <button class="btn-plain" data-action="dec" title="Diminuer">−</button>
        <strong id="niv-${r.docId}" class="val-niveau"
                style="margin:0 8px; display:inline-block; min-width:24px; text-align:center;">
          ${Number.isFinite(r.niveau) ? r.niveau : 0}
        </strong>
        <button class="btn-plain" data-action="inc" title="Augmenter">+</button>
      </td>
      <td>${asDate(r.timestamp)}</td>
      <td>${asDate(r.updatedAt)}</td>
    </tr>`).join('');

    return `<table id="abonnes-table">${thead}<tbody>${tbody}</tbody></table>`;
  }




  function mountPopup(rows, total) {
    const ov = document.createElement('div');
    ov.id = 'abonnes-overlay';
    const topZ = zcNextOverlayZ();
    ov.style.zIndex = String(topZ);

    ov.innerHTML = `
    <div id="abonnes-popup" role="dialog" aria-modal="true">
      <div id="abonnes-head">
        <div><strong>👥 Abonnés</strong> <span class="tag">${total}</span> <span id="abonnes-stats" class="tag">—</span></div>
        <div id="abonnes-actions">
          <select id="abonnes-level" title="Filtrer par niveau">
            <option value="">Tous niveaux</option>
            <option value="0">Niveau 0</option>
            <option value="1">Niveau 1</option>
            <option value="2">Niveau 2</option>
            <option value="3">Niveau 3</option>
            <option value="4">Niveau 4+</option>
          </select>
          <input id="abonnes-search" type="search" placeholder="Rechercher (mail, name)…">
          <button class="btn-plain" id="abonnes-close">Fermer</button>
        </div>
      </div>
      <div id="abonnes-body"></div>
    </div>
  `;
    ov.addEventListener('click', (e) => { if (e.target.id === 'abonnes-overlay') closeAbonnes(); });
    document.body.appendChild(ov);
    document.getElementById('abonnes-close').onclick = closeAbonnes;

    let sortKey = 'mail';
    let sortDir = 'asc';
    const baseRows = Array.isArray(rows) ? rows.slice() : [];
    const body = document.getElementById('abonnes-body');
    const input = document.getElementById('abonnes-search');
    const lvSel = document.getElementById('abonnes-level');
    const stats = document.getElementById('abonnes-stats');

    function levelOk(r, lv) {
      const n = Number.isFinite(r.niveau) ? r.niveau : parseInt(r.niveau, 10) || 0;
      if (!lv) return true;
      if (lv === '4') return n >= 4;
      return String(n) === String(lv);
    }

    function refreshTable() {
      const q = (input.value || '').trim().toLowerCase();
      const lv = lvSel.value;
      const filtered = baseRows.filter((r) => {
        if (!levelOk(r, lv)) return false;
        if (!q) return true;
        const blob = `${safe(r.mail)} ${safe(r.name)}`.toLowerCase();
        return blob.includes(q);
      });
      filtered.sort(triGen(sortKey, sortDir));
      body.innerHTML = renderTable(filtered);
      const totalVisible = filtered.length;
      const n2plus = filtered.filter((r) => (Number(r.niveau) || 0) >= 2).length;
      stats.textContent = `${totalVisible}/${baseRows.length} • niv≥2: ${n2plus}`;
      bindPlusMoinsHandlers();
      body.querySelectorAll('th[data-sort]').forEach((th) => {
        th.addEventListener('click', () => {
          const k = th.getAttribute('data-sort');
          if (!k) return;
          if (sortKey === k) sortDir = (sortDir === 'asc') ? 'desc' : 'asc';
          else { sortKey = k; sortDir = 'asc'; }
          refreshTable();
        });
      });
    }

    // Filtre rapide (client-side)
    input.addEventListener('input', () => {
      refreshTable();
    });
    lvSel.addEventListener('change', refreshTable);

    refreshTable();
  }

  // Garde-fous
  const NIV_MIN = 0;
  const NIV_MAX = 99;

  // MAJ Firestore + UI optimiste (sur le champ "niveau")
  async function updateNiveau(docId, newVal, valueHolderEl) {
    // Si pour une raison X le holder est manquant, on tente un rattrapage
    if (!valueHolderEl) {
      valueHolderEl = document.getElementById(`niv-${docId}`);
    }
    if (!valueHolderEl) {
      console.warn('updateNiveau: holder absent, on mettra juste Firestore à jour');
    }

    // bornes
    newVal = Math.max(NIV_MIN, Math.min(NIV_MAX, newVal));

    const oldText = valueHolderEl ? valueHolderEl.textContent : null;
    if (valueHolderEl) valueHolderEl.textContent = newVal; // UI optimiste

    try {
      await db.collection('demandeCollaborerLexique').doc(docId).update({
        niveau: newVal,
        updatedAt: (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
          ? firebase.firestore.FieldValue.serverTimestamp()
          : new Date()
      });

      // Si on n'avait pas de holder, tenter un set maintenant
      if (!oldText) {
        const h = document.getElementById(`niv-${docId}`);
        if (h) h.textContent = newVal;
      }
    } catch (err) {
      console.error('MAJ niveau échouée:', err);
      if (oldText !== null && valueHolderEl) {
        valueHolderEl.textContent = oldText; // rollback visuel
      }
      alert(tMsg('updateLevelImpossible'));
    }
  }


  function bindPlusMoinsHandlers() {
    const table = document.getElementById('abonnes-table');
    if (!table) return;

    table.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const tr = btn.closest('tr[data-doc]');
      const docId = tr?.dataset?.doc;
      if (!docId) return;

      // 1) Essai direct par classe (dans la ligne)
      let holder = tr.querySelector('.val-niveau');

      // 2) Fallback local: autour du bouton
      if (!holder) {
        holder = btn.previousElementSibling && btn.previousElementSibling.classList?.contains('val-niveau')
          ? btn.previousElementSibling
          : (btn.nextElementSibling && btn.nextElementSibling.classList?.contains('val-niveau')
            ? btn.nextElementSibling
            : null);
      }

      // 3) Fallback global par id
      if (!holder) {
        holder = document.getElementById(`niv-${docId}`);
      }

      if (!holder) {
        console.warn('Impossible de trouver le holder du niveau pour', docId);
        return; // on évite l’erreur
      }

      const current = parseInt(holder.textContent, 10);
      const delta = (btn.dataset.action === 'inc') ? +1 : -1;
      const next = Number.isFinite(current) ? current + delta : delta;

      updateNiveau(docId, next, holder);
    });
  }


  // API publique
  window.afficherAbonnesPopup = async function () {
    try {
      // Lecture Firestore (tous les docs)
      const snap = await db.collection('demandeCollaborerLexique').get();
      const rows = [];
      snap.forEach(doc => {
        const d = doc.data() || {};
        rows.push({
          docId: doc.id,
          mail: (d.mail || doc.id || '').toLowerCase(),
          name: d.name,
          // Valeur unique de niveau (fallback si d.niveau est absent/NaN)
          niveau: (typeof d.niveau === 'number' ? d.niveau : parseInt(d.niveau, 10)),
          niveauDemande: (typeof d.niveauDemande === 'number' ? d.niveauDemande : parseInt(d.niveauDemande, 10)),
          nombreConnexions: d.nombreConnexions,
          timestamp: d.timestamp,
          updatedAt: d.updatedAt || d.lastUpdate || null
        });


      });

      // Tri par défaut: mail asc (stable et lisible)
      rows.sort(triGen('mail', 'asc'));

      // Rendu
      mountPopup(rows, rows.length);
    } catch (err) {
      console.error('Erreur lecture abonnés:', err);
      alert(tMsg('subscribersDisplayImpossible'));
    }
  };
})();
