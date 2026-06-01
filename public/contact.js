/* ------------ Firebase : init via jsZC/firebase-local-init.js dans contact.html ------------ */
if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
  console.error('Firebase: initialisation manquante. Vérifiez jsZC/firebase-local-init.js après les SDK.');
}
const db = firebase.firestore();
const CONTACT_COOLDOWN_MS = 25000;
const CONTACT_LAST_SENT_AT_KEY = "contactLastSentAt";

/* ------------ Toast centré (msgBox tmp, comme medias1) ------------ */
function zcGetTopZDynamic() {
  try {
    if (typeof window.getNextZIndex === "function") return Number(window.getNextZIndex()) || 0;
    if (typeof getNextZIndex === "function") return Number(getNextZIndex()) || 0;
  } catch (_) { }
  const step = (typeof window.STEP === "number" && window.STEP > 0) ? window.STEP : 1;
  let max = 0;
  try {
    const all = document.body ? document.body.querySelectorAll("*") : [];
    for (let i = 0; i < all.length; i++) {
      const z = parseInt(window.getComputedStyle(all[i]).zIndex, 10);
      if (!Number.isNaN(z) && z > max) max = z;
    }
  } catch (_) { }
  return max + step;
}

/**
 * @param {string|Node} message
 * @param {string} couleur "green" | "red" | "orange" | "blue" ou couleur CSS
 * @param {number} duree ms
 */
function alertMsgBoxTemp(message, couleur = "green", duree = 3000) {
  let box = document.getElementById("alfamousCenterToast");
  const topZ = zcGetTopZDynamic();

  if (!box) {
    box = document.createElement("div");
    box.id = "alfamousCenterToast";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    Object.assign(box.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "80vw",
      zIndex: String(topZ),
      padding: "10px 14px",
      borderRadius: "10px",
      font: "14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif",
      background: "#fff",
      border: "1px solid #ddd",
      boxShadow: "0 8px 28px rgba(0,0,0,.2)",
      textAlign: "center",
      opacity: "0",
      transition: "opacity .25s ease",
      pointerEvents: "none"
    });
    document.body.appendChild(box);
  } else {
    box.style.zIndex = String(topZ);
  }

  const map = {
    green: { fg: "#0a6", border: "#0a6" },
    red: { fg: "#b20000", border: "#b20000" },
    orange: { fg: "#875a00", border: "#875a00" },
    blue: { fg: "#0056b3", border: "#0056b3" }
  };
  const c = map[couleur] || { fg: couleur, border: couleur };

  box.style.color = c.fg;
  box.style.borderColor = c.border;
  box.style.boxShadow = "0 8px 28px rgba(0,0,0,.2)";

  if (message instanceof Node) {
    box.replaceChildren(message);
  } else {
    box.textContent = String(message ?? "").trim() || "…";
  }

  clearTimeout(box.__hideTimer);
  clearTimeout(box.__removeTimer);

  requestAnimationFrame(() => { box.style.opacity = "1"; });

  box.__hideTimer = setTimeout(() => {
    box.style.opacity = "0";
    box.__removeTimer = setTimeout(() => {
      try { box.remove(); } catch { }
    }, 300);
  }, Math.max(0, Number(duree) || 0));
}

function alertMsgBoxPopup(texte) {
  alertMsgBoxTemp(texte, "green", 3000);
}

/* ------------ Pré-remplissage form ------------ */
var nameUser   = localStorage.getItem('nameUser')   || "anonyme";
var mailUser   = localStorage.getItem('mailUser')   || "anonyme@blog.alfamous.ca";
var niveauUser = Number(localStorage.getItem('niveauUser') || 0);
var lastNameUser = localStorage.getItem('lastNonAnonNameUser') || "";
var lastMailUser = (localStorage.getItem('lastNonAnonMailUser') || "").toLowerCase();

function isAnonymousMail(mail) {
  return String(mail || '').trim().toLowerCase() === 'anonyme@blog.alfamous.ca';
}

document.addEventListener('DOMContentLoaded', () => {
  var preferredName = (nameUser && nameUser !== 'anonyme') ? nameUser : lastNameUser;
  var preferredMail = !isAnonymousMail(mailUser) ? mailUser : lastMailUser;
  if (preferredName) document.getElementById('nom').value = preferredName;
  if (preferredMail) document.getElementById('mail').value = preferredMail;

  if (niveauUser > 2) {
    document.getElementById('messagesSection').style.display = 'block';
    // Abonnements temps réel
    ecouterMessages();
    ecouterCompteurNonTraites();
  } else {
    // même si l’UI admin est cachée, tu peux quand même publier le compteur en localStorage
    ecouterCompteurNonTraites();
  }
});

/* ------------ Envoi message : AJOUTE traite:false ------------ */
function envoyerMessage() {
  const nom = document.getElementById('nom').value.trim();
  const mail = document.getElementById('mail').value.trim();
  const commentaire = document.getElementById('commentaire').value.trim();
  const honeypot = (document.getElementById('website')?.value || "").trim();

  // Bot probable: champ piège rempli.
  if (honeypot) {
    alertMsgBoxTemp('Erreur lors de l\'envoi du message.', 'red', 2500);
    return;
  }

  if (!nom || !mail || !commentaire) {
    alertMsgBoxTemp('Veuillez remplir tous les champs.', 'orange', 3500);
    return;
  }

  const now = Date.now();
  const lastSentAt = Number(localStorage.getItem(CONTACT_LAST_SENT_AT_KEY) || 0);
  const remaining = CONTACT_COOLDOWN_MS - (now - lastSentAt);
  if (remaining > 0) {
    const sec = Math.ceil(remaining / 1000);
    alertMsgBoxTemp(`Veuillez patienter ${sec}s avant un nouvel envoi.`, 'orange', 3000);
    return;
  }

  db.collection("messagesContact").add({
    nom, mail, commentaire,
    traite: false,                 // ✅ très important
    date: new Date()
  })
  .then(() => {
    try {
      if (!isAnonymousMail(mail)) {
        localStorage.setItem('lastNonAnonNameUser', nom);
        localStorage.setItem('lastNonAnonMailUser', String(mail || '').trim().toLowerCase());
      }
    } catch (_) { }
    localStorage.setItem(CONTACT_LAST_SENT_AT_KEY, String(Date.now()));
    alertMsgBoxTemp(
      'Votre message a été envoyé avec succès. L’équipe reçoit une notification sur sa boîte mail.',
      'green',
      4000
    );
    document.getElementById('commentaire').value = '';
    // inutile d’appeler lireMessages() : onSnapshot mettra l’UI à jour
  })
  .catch((error) => {
    console.error("Erreur lors de l'enregistrement du message: ", error);
    alertMsgBoxTemp('Erreur lors de l\'envoi du message.', 'red', 4000);
  });
}

/* ------------ Liste des messages (live) ------------ */
let unsubscribeMessages = null;
function ecouterMessages() {
  if (unsubscribeMessages) unsubscribeMessages();

  unsubscribeMessages = db.collection("messagesContact")
    .orderBy("date", "desc")
    .onSnapshot((querySnapshot) => {
      const messagesContainer = document.getElementById('messagesContainer');
      messagesContainer.innerHTML = '';

      querySnapshot.forEach((doc) => {
        const d = doc.data();
        const id = doc.id;

        const div = document.createElement('div');
        div.style.borderBottom = "1px solid #ddd";
        div.style.padding = "10px";

        const dateStr = d.date && d.date.toDate ? d.date.toDate().toLocaleString() : '';

        div.innerHTML = `
          <strong>Nom:</strong> ${d.nom || ''}<br>
          <strong>Email:</strong> ${d.mail || ''}<br>
          <strong>Message:</strong> ${d.commentaire || ''}<br>
          <small><em>Date:</em> ${dateStr}</small><br>
          <label>
            <input type="checkbox" ${d.traite ? 'checked' : ''} 
                   onchange="marquerCommeTraite('${id}', this.checked)"> Traité
          </label>
          <button onclick="supprimerMessage('${id}')" style="margin-left: 10px; color: red;">Supprimer</button>
        `;
        messagesContainer.appendChild(div);
      });
    }, (err) => {
      console.error('Erreur lecture live:', err);
      alertMsgBoxTemp('Erreur lors de la lecture des messages.', 'red', 4000);
    });
}

/* ------------ Supprimer ------------ */
function supprimerMessage(messageId) {
  db.collection("messagesContact").doc(messageId).delete()
    .catch((error) => {
      console.error("Erreur lors de la suppression du message: ", error);
      alertMsgBoxTemp('Erreur lors de la suppression du message.', 'red', 4000);
    });
}

/* ------------ Marquer comme traité ------------ */
function marquerCommeTraite(messageId, isChecked) {
  db.collection("messagesContact").doc(messageId).update({ traite: isChecked })
    .catch((error) => {
      console.error("Erreur MAJ statut:", error);
    });
}

/* ------------ Compteur non traités (live) + localStorage ------------ */
/* ⚠️ Cette requête ne retournera QUE les docs où `traite` == false.
   Si des anciens docs n’ont PAS ce champ, ils ne seront pas comptés.
   => Voir fonction de migration plus bas.
*/
let unsubscribeCount = null;
function ecouterCompteurNonTraites() {
  if (unsubscribeCount) unsubscribeCount();

  unsubscribeCount = db.collection("messagesContact")
    .where("traite", "==", false)
    .onSnapshot((snap) => {
      const n = snap.size;
      const el = document.getElementById('messagesNonTraites');
      if (el) el.textContent = `Messages non traités: ${n}`;
      try { localStorage.setItem('messagesNonTraites', String(n)); } catch(e) {}
      console.log('Messages non traités:', n);
    }, (err) => {
      console.error('Erreur compteur:', err);
    });
}

/* ------------ Utilitaires UI ------------ */
function clearSearch() {
  document.getElementById('commentaire').value = '';
}
function gererRetour() {
  window.open('index.html', '_self');
}


// ⚠️ à lancer une seule fois en admin
/*
db.collection("messagesContact").get().then(snap => {
  const batch = db.batch();
  snap.forEach(doc => {
    const d = doc.data();
    if (typeof d.traite === 'undefined') {
      batch.update(doc.ref, { traite: false });
    }
  });
  return batch.commit();
}).then(() => {
  console.log('Migration OK: ajout traite:false aux docs sans champ.');
}).catch(console.error);
*/