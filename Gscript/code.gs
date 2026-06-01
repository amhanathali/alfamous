function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index");
}

function getArticlesData() {
  const file = DriveApp.getFilesByName("articles.txt").next();
  const content = file.getBlob().getDataAsString();
  return content;
}

/************************************************* */
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('Alfamous')
    .addSubMenu(ui.createMenu('Import/Export')
      .addItem('1.Importer Lexique1.js et Versets1.js <-- Firebase Storage', 'importData')
      .addItem('2.Exporter Lexique1.js et Versets1.js --> Firebase Storage', 'exportData')
    )
    .addSubMenu(ui.createMenu('Gestion des Médias')
      /*.addItem('0.Créer articles-blog.js sur FireBase', 'mettreAJourFichier')*/
      .addItem("Créer articles-blog.js sur FireBase", "uploadArticlesHtmlToFirebase")
      .addItem('1.Importer Liens partagés dans sheet ListeMediasPartages', 'importFichiersVersListeMedias')
      .addItem('2.Créer et Exporter ListeMediasPartages.js --> Firebase Storage', 'exportMedias')
      .addItem('1 & 2 : faire les 2 opérations ci-dessus', 'importerFichierPuisExporter')
      .addItem('remplirIdEtProprietaire (Lors ajout nouveau lien partagé dossier GDrive)', 'remplirIdEtProprietaire')
    )
    .addSubMenu(ui.createMenu('Actions Diverses')
      .addItem('MessageAuxAbonnes', 'MessageAuxAbonnes')
      .addItem('GoToFin', 'GoToFin')
    )
    .addToUi();
}


/************************************************* */importerFichierPuisExporter
function GoToFin() {//--------------------------------------
  var mysheet = SpreadsheetApp.getActiveSheet();
  var lastRow=mysheet.getLastRow();
  mysheet.getRange('A'+lastRow).activate();
};
/************************************************ */

function afficherInterfaceMaj() {
  const html = HtmlService.createHtmlOutputFromFile('miseAJour')
    .setWidth(400)
    .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, "Mise à jour de articles-blog.js");
}


/**********Mise A Jour fichiers Data pour Alfamous */

/********************************************************************* */
var firebaseUrl = "https://alfamous-amha.firebaseio.com"; // URL de la base de données
var firebaseStorageUrl = "https://firebasestorage.googleapis.com/v0/b/alfamous-amha.appspot.com/o/MesDonnes%2FMesJS%2F"; // URL du stockage Firebase
var srcLexique1 = 'https://firebasestorage.googleapis.com/v0/b/alfamous-amha.appspot.com/o/MesDonnes%2FMesJS%2FfTabLexique1.js?alt=media&token=00be0dd9-0007-48cd-8927-0bb575ceda73';
var srcVersets1 = 'https://firebasestorage.googleapis.com/v0/b/alfamous-amha.appspot.com/o/MesDonnes%2FMesJS%2FfTabVersets1.js?alt=media&token=ecf5d80a-cac3-4028-b302-453f2b5b2d3c';

function deleteExistingFile(folder, fileName) {
  var existingFiles = folder.getFilesByName(fileName);
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }
}

/*************************************************** */
/**
 * Upload vers le bucket Firebase (même bucket que Storage) via l'API Google Cloud Storage.
 * L'endpoint REST Firebase Storage refuse souvent ScriptApp.getOAuthToken() (403 Permission denied).
 * L'API GCS accepte le jeton OAuth Google si le compte a les droits sur le bucket.
 * Nécessite le scope OAuth : https://www.googleapis.com/auth/devstorage.read_write
 * (voir appsscript.json — réautoriser le script après ajout du scope).
 */
function uploadFilesToFirebase(fileName, content) {
  var bucket = 'alfamous-amha.appspot.com';
  var objectPath = 'MesDonnes/MesJS/' + fileName;

  var url = 'https://www.googleapis.com/upload/storage/v1/b/' + encodeURIComponent(bucket) + '/o'
    + '?uploadType=media'
    + '&name=' + encodeURIComponent(objectPath);

  var options = {
    method: 'POST',
    contentType: 'application/javascript',
    payload: content,
    muteHttpExceptions: true,
    headers: {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
    }
  };

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
  var body = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Upload Storage (GCS) HTTP ' + code + ' : ' + body);
  }
  Logger.log(body);
}



/************************************** */
var totalVersets=0;
var totalLexique=0;
/*************************************************** */
function exportData() {
  var ui = SpreadsheetApp.getUi(); // Interface utilisateur pour les dialogues
  var response = ui.alert('Exportation', 'Souhaitez-vous exporter les données vers repertoire en cours et Firebase Storage?', ui.ButtonSet.YES_NO);

  if (response == ui.Button.YES) {
    // Exporter les données vers repertoire en cours & Firebase Storage
    try {
      privateExportDonnees(); // Assurez-vous que cette fonction est définie ailleurs
      // Affichage de l'alerte avec les totaux
      ui.alert('Exportation réussie', 
               'Les données ont été exportées avec succès.\n' + 
               'Total Versets exportés : ' + totalVersets + '\n' + 
               'Total Lexique exportés : ' + totalLexique, 
               ui.ButtonSet.OK);
     
    } catch (e) {
      ui.alert('Erreur', 'Une erreur est survenue lors de l\'exportation des données : ' + e.message, ui.ButtonSet.OK);
    }
  } else {
    ui.alert('Opération annulée', 'Importation annulée.', ui.ButtonSet.OK);
  }
}
/**************************************************** */
function privateExportDonnees() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lexiqueSheet = ss.getSheetByName("Lexique1");
  var versetsSheet = ss.getSheetByName("Versets1");

  var folder = DriveApp.getFileById(ss.getId()).getParents().next();

  deleteExistingFile(folder, "fTabLexique1.js");
  deleteExistingFile(folder, "fTabVersets1.js");

  // --- Export Lexique1 ---
  totalLexique=0;
  var lexiqueData = lexiqueSheet.getDataRange().offset(1, 0).getValues(); // Ignorer en-tête
  totalLexique=lexiqueData.length;
  var lexiqueFormattedData = lexiqueData.map(function(row) {
    return `[${JSON.stringify(preparerCommentairePourExporter(row[0]))},${JSON.stringify(preparerCommentairePourExporter(row[1]))}]`;
  }).join(",\n");

  var lexiqueJs = `function fTabLexique() { var tableau = [\n${lexiqueFormattedData}\n]; return tableau; }`;
  folder.createFile("fTabLexique1.js", lexiqueJs, MimeType.JAVASCRIPT);
  uploadFilesToFirebase("fTabLexique1.js", lexiqueJs);

  // --- Export Versets1 ---
  totalVersets=0;
  var versetsData = versetsSheet.getDataRange().offset(1, 0).getValues(); // Ignorer en-tête
  totalVersets=versetsData.length;
  var versetsFormattedData = versetsData.map(function(row) {
    return `[${row[0]},${row[1]},${JSON.stringify(preparerCommentairePourExporter(row[2]))},${JSON.stringify(preparerCommentairePourExporter(row[3]))},${JSON.stringify(preparerCommentairePourExporter(row[4]))},${JSON.stringify(preparerCommentairePourExporter(row[5]))},${JSON.stringify(preparerCommentairePourExporter(row[6]))},${JSON.stringify(preparerCommentairePourExporter(row[7]))},${row[8]},${JSON.stringify(preparerCommentairePourExporter(row[9]))},${JSON.stringify(preparerCommentairePourExporter(row[10]))},${JSON.stringify(preparerCommentairePourExporter(row[11]))}]`;
  }).join(",\n");

  var versetsJs = `function fTabVersets() { var tableau = [\n${versetsFormattedData}\n]; return tableau; }`;
  folder.createFile("fTabVersets1.js", versetsJs, MimeType.JAVASCRIPT);
  uploadFilesToFirebase("fTabVersets1.js", versetsJs);
}


function preparerCommentairePourExporter(texte) { // pour exporter
  if (typeof texte !== 'string') texte = String(texte || '');

  return texte
    .replace(/"/g, "'")      // guillemets doubles → apostrophe simple
    .replace(/'/g, '’')      // apostrophe simple → apostrophe typographique
    .replace(/\n/g, "<br>")  // retour ligne → <br>
    .replace(/\r/g, "<br>")  // retour chariot → <br> (au cas où)
    .replace(/\\/g, "\\\\")  // backslash échappé
    .replace(/\t/g, " ")     // tab → espace
    .replace(/\s\s+/g, " ")  // espaces multiples → un seul
    .trim();
}

/** Partagé (Articles blog, emails…) — une seule définition pour tout le projet. */
function extrairePremiereImage(html) {
  var s = String(html || "");
  var match = s.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : "";
}

/** Partagé — une seule définition pour tout le projet. */
function stripHtml(html) {
  return String(html || "").replace(/<[^>]*>?/gm, "").replace(/\s+/g, " ").trim();
}

//Importation
function nettoyerCommentairePourChampTexte(texte) {//pour importer et affichage
  if (typeof texte !== 'string') texte = String(texte || '');
  return texte
    .replace(/<br\s*\/?>/gi, '\n')        // remplace <br> en vrais sauts de ligne
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')              // doit venir en dernier
    .replace(/\\n/g, '\n')               // si des "\n" échappés restent
    .replace(/\\\\/g, '\\')              // double antislash → antislash
    .replace(/\\/g, '')                  // supprime les slashs orphelins restants
    .replace(/[\u00A0\u200C\u200F\u202F]/g, ' ')  // espaces invisibles
    .trim();
}



/****************************************** */
/*************************************************** */
function importData() {
  var ui = SpreadsheetApp.getUi(); // Interface utilisateur pour les dialogues
  var response = ui.alert('Importation', 'Souhaitez-vous importer les données depuis Firebase ?', ui.ButtonSet.YES_NO);

  if (response == ui.Button.YES) {
    // Importer les données depuis Firebase
    try {
      privateImportDonnees(); // Assurez-vous que cette fonction est définie ailleurs
      // Affichage de l'alerte avec les totaux
      ui.alert('Importation réussie', 
               'Les données ont été importées avec succès.\n' + 
               'Total Versets importés : ' + totalVersets + '\n' + 
               'Total Lexique importés : ' + totalLexique, 
               ui.ButtonSet.OK);
      
    } catch (e) {
      ui.alert('Erreur', 'Une erreur est survenue lors de l\'importation des données : ' + e.message, ui.ButtonSet.OK);
    }
  } else {
    ui.alert('Opération annulée', 'Importation annulée.', ui.ButtonSet.OK);
  }
}
/*************************************************** */
function privateImportDonnees() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lexiqueSheet = ss.getSheetByName("Lexique1");
  var versetsSheet = ss.getSheetByName("Versets1");

  // --- Import Lexique1 ---
  var lexiqueScript = UrlFetchApp.fetch(srcLexique1).getContentText();
  var lexiqueFunction = new Function('return ' + lexiqueScript)();
  var rawLexique = lexiqueFunction();

  var lexiqueData = rawLexique.map(row => [
    nettoyerCommentairePourChampTexte(row[0]),
    nettoyerCommentairePourChampTexte(row[1])
  ]);

  lexiqueSheet.clear();
  totalLexique=0;
  if (lexiqueData.length > 0) {
    totalLexique=lexiqueData.length;
    var headers = ["mot", "commentaire"];
    lexiqueSheet.appendRow(headers);
    lexiqueSheet.getRange(2, 1, lexiqueData.length, lexiqueData[0].length).setValues(lexiqueData);
  }

  // --- Import Versets1 ---
  var versetsScript = UrlFetchApp.fetch(srcVersets1).getContentText();
  var versetsFunction = new Function('return ' + versetsScript)();
  var rawVersets = versetsFunction();

  var versetsData = rawVersets.map(row => [
    row[0],
    row[1],
    nettoyerCommentairePourChampTexte(row[2]),
    nettoyerCommentairePourChampTexte(row[3]),
    nettoyerCommentairePourChampTexte(row[4]),
    nettoyerCommentairePourChampTexte(row[5]),
    nettoyerCommentairePourChampTexte(row[6]),
    nettoyerCommentairePourChampTexte(row[7]),
    row[8],
    nettoyerCommentairePourChampTexte(row[9]),
    nettoyerCommentairePourChampTexte(row[10]),
    nettoyerCommentairePourChampTexte(row[11])
  ]);

  versetsSheet.clear();
  totalVersets=0;
  if (versetsData.length > 0) {
    totalVersets=versetsData.length;
    var headers = ["Soura", "Aya", "Coran", "Trad.Lex", "H.Allah", "Y.Ali", "AMZ", "Racines", "nWarsh", "tradES", "CSC", "Mountadana"];
    versetsSheet.appendRow(headers);
    versetsSheet.getRange(2, 1, versetsData.length, versetsData[0].length).setValues(versetsData);
  }
}




