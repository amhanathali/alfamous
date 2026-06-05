// === CONFIGURATION ===
const SUJET_MESSAGE = "✨Nouveaux articles sur blog.alfamous.ca";
const NOMBRE_ARTICLES = 5;
const FEUILLE_ABONNES = "ListeAbonnes";

// === LOGIQUE PRINCIPALE ===
function MessageAuxAbonnes() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(FEUILLE_ABONNES);

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  const articles = getDerniersArticles();

  let emailsEnvoyes = 0;

  for (let i = 0; i < data.length; i++) {
    const email = data[i][1];        // Colonne B
    const nom = data[i][2];          // Colonne C
    const abonnement = data[i][7];   // Colonne H
    var dejaEnvoye = data[i][8];     // Colonne I

    // Forcer l’envoi pour un email de test
    if (email === "gmpcdz@gmail.com") dejaEnvoye = "";

    if (abonnement === "Oui" && dejaEnvoye === "") {
      try {
        const html = genererContenuEmail(articles, nom);
        GmailApp.sendEmail(email, SUJET_MESSAGE, stripHtml(html), {
          htmlBody: html
        });
        data[i][8] = "EMAIL_SENT";
        emailsEnvoyes++;
      } catch (err) {
        ui.alert(`Erreur avec ${email} : ${err.message}`);
      }
    }
  }

  if (emailsEnvoyes > 0) {
    sheet.getRange(2, 9, data.length, 1).setValues(data.map(row => [row[8]]));
    ui.alert(`${emailsEnvoyes} emails envoyés.`);
  } else {
    ui.alert("Aucun email à envoyer.");
  }
}

// === OUTILS ===
// extrairePremiereImage + stripHtml : définis dans code.gs (une seule copie projet)

// === ARTICLES ===

function getDerniersArticles(n = NOMBRE_ARTICLES) {
  const url = `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts?key=${API_KEY}&maxResults=${n}&orderBy=updated`;
  const response = UrlFetchApp.fetch(url);
  const json = JSON.parse(response.getContentText());

  if (!json.items) throw new Error("Aucun article trouvé.");

  return json.items.map(post => ({
    titre: post.title,
    lien: post.url,
    extrait: stripHtml(post.content || "").substring(0, 200) + "...",
    image: extrairePremiereImage(post.content || ""),
    date: new Date(post.updated).toLocaleDateString("fr-FR")
  }));
}

// === GÉNÉRATION EMAIL HTML ===

function genererContenuEmail(articles, nomDestinataire = "") {
  let contenu = `<div style="font-family:Arial,sans-serif;line-height:1.5;">`;

  contenu += nomDestinataire
    ? `<p>Bonjour ${nomDestinataire},</p>`
    : `<p>Bonjour,</p>`;

  contenu += `<p>Voici les derniers articles publiés sur le blog (<a href='https://blog.alfamous.ca'>blog.alfamous.ca</a> · <a href='https://lexique-coran.blogspot.com/'>lexique-coran.blogspot.com</a>) :</p>`;


articles.forEach(article => {
  contenu += `
    <hr style="border:none;border-top:2px solid #ccc;margin:30px 0;" />
    <div style="margin-bottom:30px;">
      <div style="text-align:center;margin-bottom:15px;">
        <a href="${article.lien}" target="_blank">
          <img src="${article.image}" alt="Image article" style="width:50%;height:auto;border-radius:5px;" />
        </a>
      </div>
      <div>
        <h2 style="font-size:18px;margin-top:0;margin-bottom:10px;">
          <a href="${article.lien}" target="_blank" style="color:#005f5f;text-decoration:none;">${article.titre}</a>
        </h2>
        <p><strong>Date :</strong> ${article.date}</p>
        <p>${article.extrait}</p>
        <p>
          <a href="${article.lien}" target="_blank" style="
            display:inline-block;
            background:#005f5f;
            color:white;
            padding:10px 15px;
            text-decoration:none;
            border-radius:5px;
            font-size:16px;
          ">
            Lire++ ➜
          </a>
        </p>

      </div>
    </div>
  `;
});





  contenu += `
    <hr />
    <p>Merci de votre lecture et à bientôt !</p>
    <p><small>***Pour vous désabonner : <a href="https://blog.alfamous.ca/p/abonnement.html">blog.alfamous.ca/p/abonnement.html</a> · <a href="https://lexique-coran.blogspot.com/p/abonnement.html">lexique-coran.blogspot.com/p/abonnement.html</a></small></p>
    <p><small>***À propos du projet Alfamous : <a href="https://alfamous.ca/index.html">alfamous.ca</a> · <a href="https://alfamous-amha.web.app/index.html">alfamous-amha.web.app</a></small></p>
  </div>`;

  return contenu;
}


