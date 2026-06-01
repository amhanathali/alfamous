/************************************************* */
/*Dossier MediasPartages
https://drive.google.com/drive/folders/1UbMB6Dwo-El0VFCTQCNXQcfVzKYKrrp9?usp=sharing
*/
function remplirIdEtProprietaire() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheetName = "idLienDossierPartage";
  const sourceSheet = ss.getSheetByName(sourceSheetName);

  if (!sourceSheet) {
    throw new Error(`La feuille "${sourceSheetName}" est introuvable.`);
  }

  const folderData = sourceSheet.getDataRange().getValues();

  for (let i = 1; i < folderData.length; i++) { // Ignorer la première ligne d'en-têtes
    const lien = folderData[i][0]; // Colonne A : Liens
    let folderId = folderData[i][1]; // Colonne B : ID des dossiers
    let nomProprio = folderData[i][2]; // Colonne C : Nom du propriétaire

    // Remplir la colonne B si vide
    if (!folderId) {
      folderId = extractDriveFolderId(lien);
      if (folderId) {
        sourceSheet.getRange(i + 1, 2).setValue(folderId); // Ligne (i+1), colonne B (index 2)
      } else {
        Logger.log(`Impossible d'extraire l'ID du dossier pour le lien : ${lien}`);
        continue;
      }
    }

    // Remplir la colonne C si vide
    if (!nomProprio) {
      nomProprio = getUserFromFolderId(folderId);
      sourceSheet.getRange(i + 1, 3).setValue(nomProprio); // Ligne (i+1), colonne C (index 3)
    }
  }

  Logger.log("Mise à jour terminée !");
}
function extractDriveFolderId(link) {
  try {
    const regex = /\/folders\/([a-zA-Z0-9_-]+)/;
    const match = link.match(regex);

    if (match && match[1]) {
      return match[1]; // Retourner l'ID extrait
    } else {
      throw new Error("ID du dossier introuvable dans le lien fourni.");
    }
  } catch (error) {
    Logger.log("Erreur : " + error.message);
    return null; // Retourner null en cas d'échec
  }
}

function importerFichierPuisExporter() {
  importFichiersVersListeMedias();
  exportMedias();
}


function getUserFromFolderId(folderId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheetName = "idLienDossierPartage";
  const sourceSheet = ss.getSheetByName(sourceSheetName);

  if (!sourceSheet) {
    throw new Error(`La feuille "${sourceSheetName}" est introuvable.`);
  }

  const folderData = sourceSheet.getDataRange().getValues();

  for (let i = 1; i < folderData.length; i++) { // Ignorer la première ligne d'en-têtes
    if (folderData[i][1] === folderId) { // Correspondance dans la colonne B (index 1)
      let nomProprio = folderData[i][2]; // Nom du propriétaire dans la colonne C (index 2)
      
      if (nomProprio === "") {
        // Si vide, récupérer le nom du dossier
        nomProprio = nomDuDossier(folderId);

        // Mettre à jour la feuille avec le nom récupéré
        sourceSheet.getRange(i + 1, 3).setValue(nomProprio); // Ligne (i+1) et Colonne C (index 3)
      }

      return nomProprio;
    }
  }

  return "Utilisateur inconnu"; // Valeur par défaut si aucune correspondance
}


function nomDuDossier(folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId.trim());
    return folder.getName();
  } catch (error) {
    return `Erreur: ${error.message}`;
  }
}

/*****************************GSHEET**************************************** */
function importFichiersVersListeMedias() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Lire les IDs des dossiers partagés depuis la feuille source
  const sourceSheetName = "idLienDossierPartage";
  const sourceSheet = ss.getSheetByName(sourceSheetName);
  if (!sourceSheet) {
    throw new Error(`La feuille "${sourceSheetName}" est introuvable.`);
  }

  const folderData = sourceSheet.getDataRange().getValues();
  if (folderData.length < 2) {
    Logger.log("Aucun lien de dossier trouvé dans la feuille.");
    return;
  }

  // Extraire les IDs à partir de la colonne B
  const folderIds = folderData.slice(1).map(row => row[1]).filter(id => id);

  // Initialiser la feuille de destination
  const targetSheetName = "ListeMediasPartages";
  const targetSheet = ss.getSheetByName(targetSheetName) || ss.insertSheet(targetSheetName);
  targetSheet.clear(); // Efface les anciennes données

  // Préparer les en-têtes
  const outputData = [["mediaName", "Lien", "Description", "nameUser", "DateModif"]];

  // Parcourir chaque dossier principal
  folderIds.forEach(folderId => {
    try {
      const mainFolder = DriveApp.getFolderById(folderId);
      const nameUser = getUserFromFolderId(folderId); // Récupérer le nom de l'utilisateur
      const files = listFilesInFolder(mainFolder);

      // Ajouter les fichiers à la liste
      files.forEach(file => {
        const fileId = file.getId();
        const lien = `https://drive.google.com/file/d/${fileId}/preview`;
        const mediaName = "[DRV] " + file.getName();
        const dateModif = file.getLastUpdated();
        const description = file.getDescription() || `No Description`;

        outputData.push([mediaName, lien, description, nameUser, dateModif]);
      });
    } catch (error) {
      Logger.log(`Erreur lors du traitement du dossier avec ID "${folderId}": ${error.message}`);
    }
  });

  // Écrire les données dans la feuille cible
  targetSheet.getRange(1, 1, outputData.length, outputData[0].length).setValues(outputData);

  Logger.log("Extraction terminée. Les données ont été ajoutées à la feuille.");
}

/**
 * Liste tous les fichiers dans un dossier, y compris dans les sous-dossiers.
 * @param {Folder} folder - Le dossier principal.
 * @returns {File[]} - Une liste de fichiers.
 */
function listFilesInFolder(folder) {
  let files = [];
  
  // Ajouter les fichiers du dossier actuel
  const folderFiles = folder.getFiles();
  while (folderFiles.hasNext()) {
    files.push(folderFiles.next());
  }

  // Récursion pour les sous-dossiers
  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    const subfolder = subfolders.next();
    files = files.concat(listFilesInFolder(subfolder));
  }

  return files;
}


/*************************************************************************** */
/********************************FIREBASE******************************************* */
function exportMedias() {

    const sheetName = 'ListeMediasPartages';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        Logger.log("La feuille 'ListeMediasPartages' est introuvable.");
        return;
    }

    // Récupère toutes les données de la feuille
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) { // Vérifie s'il y a des données (en-têtes + au moins une ligne)
        Logger.log("Aucune donnée à traiter.");
        return;
    }

    const headers = data.shift(); // Supprime et récupère les en-têtes (1ère ligne)

    // Formate les données en JSON
    const lexiqueFormattedData = data.map(row => {
        let record = {};
        headers.forEach((header, index) => {
            if (header) { // Ignore les colonnes avec en-têtes vides
                record[header] = row[index] || ""; // Remplit avec une chaîne vide si la donnée est nulle
            }
        });
        return JSON.stringify(record); // Retourne la ligne formatée en JSON
    }).join(",\n");

    // Crée le contenu JavaScript attendu
    const jsContent = `function fTabMedia() { 
        var tableau = [
            ${lexiqueFormattedData} 
        ]; 
        return tableau; 
    };`;

    const fileName = 'ListeMediasPartages.js';
    const folderId = "1UbMB6Dwo-El0VFCTQCNXQcfVzKYKrrp9"; // ID du dossier ListeMediasPartages
    const folder = DriveApp.getFolderById(folderId);

    if (!folder) {
        Logger.log(`Le dossier avec l'ID ${folderId} est introuvable.`);
        return;
    }

    // Supprime le fichier existant s'il est présent
    const existingFile = folder.getFilesByName(fileName);
    if (existingFile.hasNext()) {
        folder.removeFile(existingFile.next());
        Logger.log("Fichier existant supprimé.");
    }

    // Crée et stocke le fichier
    const file = folder.createFile(fileName, jsContent, MimeType.PLAIN_TEXT);
    Logger.log(`Le fichier JavaScript '${fileName}' a été créé avec succès.`);

    // Upload vers Firebase Storage
    try {
        uploadFilesToFirebase(fileName, jsContent); // Fonction supposée disponible
    } catch (error) {
        Logger.log(`Erreur lors de l'upload vers Firebase Storage : ${error.message}`);
    }
}

