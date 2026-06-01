// valable pour la Feuille22 temporaire
function concatCommentairesEtCompacteCD() {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Feuille22");
  if (!feuille) {
    Logger.log("Feuille non trouvée !");
    return;
  }

  // --- Helper : force l'affichage LTR en contexte mixte (ar/fr/diacritiques) ---
  function toLTR(s) {
    if (!s) return s;
    const LRM = '\u200E'; // Left-to-Right Mark
    // Entourer les séparateurs courants pour casser l'inversion visuelle
    s = String(s)
      .replace(/\|/g, LRM + '|' + LRM)
      .replace(/\[/g, LRM + '[')
      .replace(/\]/g, ']' + LRM)
      .replace(/\(/g, LRM + '(')
      .replace(/\)/g, ')' + LRM);
    // LRM en tête + après chaque saut de ligne
    if (!s.startsWith(LRM)) s = LRM + s;
    s = s.replace(/\n/g, '\n' + LRM);
    return s;
  }

  const donnees = feuille.getDataRange().getValues();
  const mapCommentaires = {};
  const lignesDejaTraitees = new Set();
  const valeursCD = [];

  // Étape 1 : regrouper les commentaires par verset
  for (let i = 1; i < donnees.length; i++) {
    const refComplet = donnees[i][0]; // col A
    const commentaire = donnees[i][1]; // col B : ex. [îna | إن | إِنَّ | En effet]
    if (!refComplet || !commentaire) continue;

    const [refVerset, position] = refComplet.split('#');
    if (!mapCommentaires[refVerset]) mapCommentaires[refVerset] = [];
    const commentaireFormate = `#${position} ${commentaire}`;
    mapCommentaires[refVerset].push(commentaireFormate);
  }

  // Étape 2 : préparer les colonnes C (réf) et D (commentaires)
  for (let i = 1; i < donnees.length; i++) {
    const refComplet = donnees[i][0];
    if (!refComplet) {
      valeursCD.push(['', '']);
      continue;
    }

    const [refVerset] = refComplet.split('#');
    if (lignesDejaTraitees.has(refVerset)) {
      valeursCD.push(['', '']);
      continue;
    }
    lignesDejaTraitees.add(refVerset);

    const refAvecDieze = `#${refVerset}`;
    const list = mapCommentaires[refVerset] || [];
    const commentairesBruts = list
      .sort((a, b) => {
        const nA = parseInt(a.match(/^#(\d+)/)?.[1] || 0, 10);
        const nB = parseInt(b.match(/^#(\d+)/)?.[1] || 0, 10);
        return nA - nB;
      })
      .join('\n');

    // 👉 antidote BiDi
    const commentairesLTR = toLTR(commentairesBruts);

    valeursCD.push([refAvecDieze, commentairesLTR]);
  }

  while (valeursCD.length < donnees.length - 1) valeursCD.push(['', '']);

  // Écriture C/D
  const plageEcriture = feuille.getRange(2, 3, valeursCD.length, 2);
  plageEcriture.setValues(valeursCD);

  // Étape 3 : compactage (décaler vers le haut les lignes non vides)
  const totalLignes = feuille.getLastRow();
  const valeursCDActuelles = feuille.getRange(2, 3, totalLignes - 1, 2).getValues();
  const lignesNonVides = valeursCDActuelles.filter(([c, d]) => !(c === '' && d === ''));
  const lignesVides = new Array(totalLignes - 1 - lignesNonVides.length).fill(['', '']);
  const nouvellesValeursCD = lignesNonVides.concat(lignesVides);

  const plageFinale = feuille.getRange(2, 3, nouvellesValeursCD.length, 2);
  plageFinale.setValues(nouvellesValeursCD);

  // 👉 Finitions : alignement + (si dispo) direction LTR sur la colonne D
  const plageD = feuille.getRange(2, 4, nouvellesValeursCD.length, 1);
  plageD.setHorizontalAlignment('left');
  try {
    if (typeof plageD.setTextDirection === 'function' && SpreadsheetApp.TextDirection) {
      plageD.setTextDirection(SpreadsheetApp.TextDirection.LEFT_TO_RIGHT);
    }
  } catch (e) {
    // Environnements anciens : pas grave, LRM suffit
    Logger.log('setTextDirection non disponible : ' + e);
  }

  Logger.log(`Traitement terminé : ${lignesNonVides.length} lignes utiles en C/D compactées.`);
}
/**
 * Depuis la colonne D :
 *  - C <= concat des segments "[ ... |" (aplatis, séparés par espace)
 *  - E <= concat des premiers champs avant "|" -> ex. "biçmi allahi alraĥmani alraĥiymi"
 */
function extraireCEdepuisD() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Feuille22');
  if (!sh) {
    Logger.log('Feuille22 introuvable');
    return;
  }

  const lastRow = sh.getLastRow();
  if (lastRow < 2) {
    Logger.log('Aucune donnée');
    return;
  }

  // Colonne D (à partir de la ligne 2)
  const valuesD = sh.getRange(2, 4, lastRow - 1, 1).getValues();

  // Supprime les marqueurs BiDi invisibles pour fiabiliser les regex
  const stripBidi = s => (s || '').toString().replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');

  const dataC = [];
  const dataE = [];

  for (let i = 0; i < valuesD.length; i++) {
    const raw = stripBidi(valuesD[i][0]);
    if (!raw) {
      dataC.push(['']);
      dataE.push(['']);
      continue;
    }

    // ---- C : segments "[ ... |" (incluant le '[' et le '|') ----
    const partsForC = [];
    const reC = /(\[[^\]\|]*?\s*\|)/g; // du "[" jusqu'au premier "|"
    let mC;
    while ((mC = reC.exec(raw)) !== null) {
      // remplacer les retours à la ligne par espace
      partsForC.push(mC[1].replace(/\r?\n+/g, ' ').trim());
    }
    const valC = partsForC.join(' ').trim();

    // ---- E : premiers champs avant "|" -> transcription FR ----
    const partsForE = [];
    const reE = /\[([^\]\|]*?)\s*\|/g; // capture ce qu'il y a entre "[" et "|"
    let mE;
    while ((mE = reE.exec(raw)) !== null) {
      const token = mE[1].replace(/\r?\n+/g, ' ').trim();
      if (token) partsForE.push(token);
    }
    const valE = partsForE.join(' ').trim();

    dataC.push([valC]);
    dataE.push([valE]);
  }

  // Écritures en C et E
  if (dataC.length) {
    sh.getRange(2, 3, dataC.length, 1).setValues(dataC); // C
    sh.getRange(2, 5, dataE.length, 1).setValues(dataE); // E
    // Alignement lisible
    sh.getRange(2, 3, dataC.length, 1).setHorizontalAlignment('left');
    sh.getRange(2, 5, dataE.length, 1).setHorizontalAlignment('left');
  }

  Logger.log('Extraction terminée pour ' + dataC.length + ' lignes.');
}
