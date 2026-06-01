// Fonction pour créer fTabVersets1.js
function creer_fTabVersets(tabVerset) {
  let contenuJS = `function fTabVersets() { 
		var tableau = ${JSON.stringify(tabVerset, null, 4)};
		return tableau;
	}`;
  return contenuJS;
}

// Fonction pour créer fTabLexique1.js
function creer_fTabLexique(tabLexique) {
  let contenuJS = `function fTabLexique() { 
		var tableau = ${JSON.stringify(tabLexique, null, 4)};
		return tableau;
	}`;
  return contenuJS;
}

function zcSaveStatus(msg, append) {
  const txt = String(msg || "").trim();
  if (!txt) return;
  const box = document.getElementById('msgDivCommentaire');
  if (box) {
    box.innerHTML = '';
    box.style.display = 'none';
  }
  if (typeof alertMsgBoxPopup === "function") {
    alertMsgBoxPopup(txt);
    // Forcer le message normal au premier plan, même si la popup commentaire est ouverte.
    try {
      const popup = document.getElementById("messagePopup");
      const overlay = document.getElementById("popupOverlay");
      const step = (typeof window.STEP === "number" && window.STEP > 0) ? window.STEP : 1;
      let z = 0;
      if (typeof window.getNextZIndex === "function") z = Number(window.getNextZIndex()) || 0;
      else if (typeof getNextZIndex === "function") z = Number(getNextZIndex()) || 0;
      if (!z) {
        const all = document.body ? document.body.querySelectorAll("*") : [];
        for (let i = 0; i < all.length; i++) {
          const zi = parseInt(window.getComputedStyle(all[i]).zIndex, 10);
          if (!Number.isNaN(zi) && zi > z) z = zi;
        }
        z += step;
      }
      if (overlay) overlay.style.zIndex = String(z);
      if (popup) popup.style.zIndex = String(z + step);
    } catch (_) { }
  }
}

// Fonction d'enregistrement
async function exporterFichiers(data, nomFichier) {

  let contenu;
  let fileRef;

  if (nomFichier === "Lexique") {
    contenu = creer_fTabLexique(data);
    fileRef = storage.ref('MesDonnes/MesJS/fTabLexique1.js');
  } else {
    contenu = creer_fTabVersets(data);
    fileRef = storage.ref('MesDonnes/MesJS/fTabVersets1.js');
  }

  let blob = new Blob([contenu], { type: 'application/javascript' });

  try {
    await fileRef.getDownloadURL();
    zcSaveStatus(`${nomFichier} existant trouvé, écriture...`, true);
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      zcSaveStatus(`${nomFichier} n'existe pas encore, création d'un nouveau fichier...`, true);
    } else {
      console.error(`Erreur lors de la vérification existence de ${nomFichier}:`, error);
      zcSaveStatus(`Erreur lors de la vérification existence de ${nomFichier}:`, true);
      return;
    }
  }

  try {
    await fileRef.put(blob);
    zcSaveStatus(`${nomFichier} mis à jour avec succès.`, true);

  } catch (error) {
    console.error(`Erreur enregistrement de ${nomFichier}:`, error);
    zcSaveStatus(`Erreur enregistrement de ${nomFichier}`, true);
  }
}





// Fonction globale pour enregistrer les données avec mode explicite
// opts.skipForumPost : n’envoie pas de doublon sur forumMessages (ex. validation modération).
async function enregistrer(opts) {
  opts = opts || {};
  const forumValidatePendingId = window.__forumValidatePendingId || null;
  if (forumValidatePendingId) {
    opts.skipForumPost = true;
  }
  let niveau = parseInt(localStorage.getItem('niveauUser') || "0");
  const mailUserLc = String(localStorage.getItem('mailUser') || window.mailUser || '').trim().toLowerCase();
  const userConnected = (typeof zcIsAnonymeCourriel === "function")
    ? !zcIsAnonymeCourriel(mailUserLc)
    : (!!mailUserLc && mailUserLc !== 'anonyme@blog.alfamous.ca');
  window.updateUserUI();; // Mise à jour UI

  let mot = document.getElementById('popupInputMot').value || document.getElementById('mot').value;
  mot = mot
  .replace(/\+/g, ' ')
  .replace(/'/g, '’')
  .trim()
  .toLowerCase();

  mot = dedoubleSheddaSafe(mot);
  document.getElementById("mot").value = mot;// Mettre à jour le champ principal
  testLangueOninputMot();
  modeAction = modeCommentaire;//mis à jour sur clic bouton
  if (mot === "") {
    let tstMsg = msgUser({
      fr: 'Sujet non renseigné',
      ar: 'الموضوع غير محدد',
      en: 'Subject not specified',
      es: 'Subject not specified',
    });
    zcSaveStatus(tstMsg, false);
    return tstMsg;
  }

  let commentaire = document.getElementById('commentaires').value;
	commentaire=commentaire.replace(/'/g, '’');
  if (modeAction !== "supprimer" && !validateInput(commentaire)) {
    let tstMsg = msgUser({
      fr: 'Commentaire non renseigné',
      ar: 'لم يتم تقديم التعليق',
      en: 'Comment not provided',
      //es: 'Caracteres insuficientes en el campo de comentarios.',
    });
    zcSaveStatus(tstMsg, false);
    return tstMsg;
  }

  let action = "";//par défaut
  const msgBoxDiv = document.getElementById('msgDivCommentaire');
  if (msgBoxDiv) msgBoxDiv.innerHTML = '';
  //confirmation de l'action pour tous
  // Message d’introduction selon le mode
  let tstMsg = "";
  let permission = false;
  switch (modeAction) {
    case "ajouter":
      tstMsg = "➕ Ajouter un commentaire au sujet de : ";
      action = "Ajout";
      break;
    case "modifier":
      tstMsg = "🖍️ Modifier le commentaire pour : ";
      action = "Modif";
      break;
    case "supprimer":
      tstMsg = "❌ Supprimer l’entrée : ";
      action = "Del";
      //input = (typeof dedoubleShedda === "function") ? dedoubleShedda(mot) : input;
      let tok = verifieRacineExisteDansLexique(mot);
      if (!tok) {
        alertMsgBoxPopup(`${mot} est une racine du Coran.<br>
			Il ne peut pas être supprimé.
			`);
        return false;
      }
      break;
    case "msgForum":

    default:
      tstMsg = "📢 Envoyer ce message au forum lié a : ";
      action = "msgForum";
      break;
  }
  let confirmMsg = `💾 Voulez-vous vraiment ${tstMsg} ${mot} ?`;
  let confirmation = await alertConfirmLex(confirmMsg);
  if (!confirmation) {
    return "Action annulée";
  }
  const estNombre = detecterNombre(mot);
  if (modeAction === "supprimer" && estNombre && !isNaN(mot)) {
    let tstMsg = msgUser({
      fr: 'Un verset ne peut pas être supprimé',
      ar: 'لا يمكن حذف آية من القرآن',
      en: 'A verse cannot be deleted',
      es: 'No se puede eliminar un verso'
    });
    zcSaveStatus(tstMsg, false);
    return tstMsg;
  }

  if (modeAction !== "msgForum" && typeof dedupeTrailingSameAuthorSignatures === "function") {
    commentaire = dedupeTrailingSameAuthorSignatures(commentaire);
  }

  // Signature: uniquement pour ajout/modif, jamais pour suppression.
  if (modeAction !== "supprimer") {
    let dateModif = new Date().toLocaleString();
    let signature = "<br> @" + nameUser + " - " + dateModif + "<br>-----------";
    if (!commentaire.endsWith(signature.trim())) {
      commentaire += signature;
    }
    document.getElementById('commentaires').value = commentaire;
  }
  //Tests modeAction et niveau
  if (!userConnected) {
    const msgConnect = msgUser({
      fr: "Connectez-vous pour envoyer un commentaire.",
      ar: "سجّل الدخول لإرسال تعليق.",
      en: "Sign in to send a comment.",
      es: "Inicie sesión para enviar un comentario."
    });
    zcSaveStatus(msgConnect, false);
    return msgConnect;
  }

  if (mot === "" || modeAction === "msgForum") {
    sendMessage("msgForum");
    return;
  }

  if (niveau < 1 && modeAction === "ajouter") {
    let tstMsg = msgUser({
      fr: `Le niveau [${niveau}] ne permet pas d'ajouter...`,
      ar: 'المستوى لا يسمح...',
      en: 'Level does not allow adding...',
      es: 'El nivel no permite grabar...'
    });
    zcSaveStatus(tstMsg, false);
    return tstMsg;
  }
  if (niveau < 2 && modeAction === "modifier") {
    let tstMsg = msgUser({
      fr: `Le niveau [${niveau}] ne permet pas de modifier...`,
      ar: 'المستوى لا يسمح...',
      en: 'Level does not allow editing...',
      es: 'El nivel no permite grabar...'
    });
    zcSaveStatus(tstMsg, false);
    return tstMsg;
  }
  if (niveau < 3 && modeAction === "supprimer") {
    let tstMsg = msgUser({
      fr: `Le niveau [${niveau}] ne permet pas de supprimer...`,
      ar: 'المستوى لا يسمح...',
      en: 'Level does not allow deleting...',
      es: 'El nivel no permite borrar...'
    });
    zcSaveStatus(tstMsg, false);
    return tstMsg;
  }


  //je commence l'enregistrement
  zcSaveStatus("Enregistrement en cours...", false);

  let nomFichier = "";
  if (!isNaN(mot) && mot.trim() !== '') {
    let tabVerset = fTabVersets();
    let [numSoura, numAya] = mot.split('.');
    for (let i = 0; i < tabVerset.length; i++) {
      if (tabVerset[i][0] == numSoura && tabVerset[i][1] == numAya) {
        if (modeAction === "modifier") {
          tabVerset[i][3] = commentaire + "\n";
          action = "Modif";
        } else {
          commentaire = commentaire + "\n" + tabVerset[i][3];
          tabVerset[i][3] = commentaire;
          action = "Ajout";
        }
        nomFichier = "Verset";
        zcSaveStatus(`${action}`, true);
        break;
      }
    }
    if (nomFichier) await exporterFichiers(tabVerset, nomFichier);
  } else {
    let tabLexique = fTabLexique();
    let motSupprime = false, motExistant = false;
    for (let i = 0; i < tabLexique.length; i++) {
      if (tabLexique[i][0].toLowerCase() === mot.toLowerCase()) {
        if (modeAction === "supprimer") {
          tabLexique.splice(i, 1);
          motSupprime = true;
          //commentaire = "";
          action = "Del";
        } else if (modeAction === "modifier") {
          tabLexique[i][1] = commentaire + "\n";
          action = "Modif";
        } else {
          commentaire = commentaire + "\n" + tabLexique[i][1];
          tabLexique[i][1] = commentaire;
          action = "Ajout";
        }
        nomFichier = "Lexique";
        motExistant = true;
        zcSaveStatus(`${action}`, true);
        break;
      }
    }
    if (modeAction === "supprimer" && !motExistant && !motSupprime) {
      const msgNoDelete = msgUser({
        fr: "Aucune entrée Lexique/Coran à supprimer pour cette référence.",
        ar: "لا توجد إدخالات في المعجم/القرآن لحذفها لهذا المرجع.",
        en: "No Lexicon/Quran entry to delete for this reference.",
        es: "No hay entrada en Léxico/Corán para eliminar para esta referencia."
      });
      zcSaveStatus(msgNoDelete, false);
      return msgNoDelete;
    }
    if (!motExistant && !motSupprime) {
      tabLexique.push([mot, commentaire]);
      nomFichier = "Lexique";
      action = "Ajout";
      zcSaveStatus(`${action}`, true);
    }
    if (nomFichier) await exporterFichiers(tabLexique, nomFichier);
  }

  document.getElementById('mot').value = mot;
  document.getElementById('commentaires').value = commentaire;
  if (!opts.skipForumPost) {
    sendMessage(action);
  }

  let msg = "";
  try {
    if (nomFichier === "Lexique") {
      const url = await storage.ref('MesDonnes/MesJS/fTabLexique1.js').getDownloadURL();
      const bust = (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      msg = await rechargerScript(url + bust, 'fTabLexique1');
    } else if (nomFichier === "Verset") {
      const url = await storage.ref('MesDonnes/MesJS/fTabVersets1.js').getDownloadURL();
      const bust = (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      msg = await rechargerScript(url + bust, 'fTabVersets1');
    }
  } catch (err) {
    msg = err.message;
  }

  if (msg) zcSaveStatus(msg, true);

  if (
    forumValidatePendingId &&
    nomFichier &&
    typeof forumAfterLexiqueSaveSuccess === "function"
  ) {
    try {
      await forumAfterLexiqueSaveSuccess(forumValidatePendingId);
    } catch (e) {
      console.error("forumAfterLexiqueSaveSuccess", e);
    }
  }

  return msg;

}

async function alertConfirmLex(message) {
  return new Promise(function (resolve) {
    // Limiter le message à 100 caractères
    const limitedMessage = message.length > 100 ? message.slice(0, 100) + "..." : message;

    // Récupérer les éléments HTML
    const zone = document.getElementById("confirmationZone");
    const msg = document.getElementById("confirmationMessage");
    const btnOui = document.getElementById("btnConfirmOui");
    const btnNon = document.getElementById("btnConfirmNon");
    if (!zone || !msg || !btnOui || !btnNon) {
      resolve(false);
      return;
    }

    // Afficher le message
    msg.innerText = limitedMessage;
    try {
      if (document.body && zone.parentElement !== document.body) {
        document.body.appendChild(zone);
      }
    } catch (_) { }
    try {
      if (typeof window.zcBringToFront === "function") {
        window.zcBringToFront(zone, 0);
      } else if (typeof getNextZIndex === "function") {
        zone.style.zIndex = String(getNextZIndex());
      }
    } catch (_) { }
    zone.style.position = "fixed";
    zone.style.left = "50%";
    zone.style.top = "50%";
    zone.style.transform = "translate(-50%, -50%)";
    zone.style.width = "min(92vw, 420px)";
    zone.style.maxWidth = "92vw";
    zone.style.background = "var(--zc-surface)";
    zone.style.padding = "14px 12px";
    zone.style.border = "1px solid var(--zc-border)";
    zone.style.borderRadius = "12px";
    zone.style.boxShadow = "0 14px 34px rgba(2, 6, 23, 0.32)";
    zone.style.textAlign = "center";
    zone.style.display = "block";

    // Gestion des clics — différer fermeture + resolve pour éviter que le relâchement
    // de la souris (ou le même geste) n’atteigne un bouton du forum sous la modale (ex. Répondre).
    function deferFinish(fn) {
      window.setTimeout(fn, 0);
    }

    btnOui.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      deferFinish(function () {
        zone.style.display = "none";
        resolve(true);
      });
    };

    btnNon.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      deferFinish(function () {
        zone.style.display = "none";
        resolve(false);
      });
    };
  });
}




