#!/usr/bin/env node
"use strict";

/**
 * Sécurité — purge du champ « code » (ancien mot de passe en clair) dans
 * la collection Firestore demandeCollaborerLexique, et contrôle des fiches.
 *
 * Le mot de passe d'un membre n'est connu que de Firebase Auth. Ce script
 * efface définitivement l'ancienne copie stockée dans Firestore.
 * Il n'affiche JAMAIS la valeur d'un mot de passe.
 *
 * Usage (depuis le dossier functions/, avec la clé de compte de service) :
 *   set GOOGLE_APPLICATION_CREDENTIALS=C:\chemin\vers\cle-adminsdk.json
 *   node scripts/purge-codes-demande-collaborer.js            (dry-run : rapport seul)
 *   node scripts/purge-codes-demande-collaborer.js --apply    (applique)
 *
 * Avec l'émulateur (aucune clé requise) :
 *   set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
 *   set FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
 *   set GCLOUD_PROJECT=demo-alfamous
 *   node scripts/purge-codes-demande-collaborer.js --apply
 *
 * Par défaut : dry-run (aucune écriture).
 * Flags :
 *   --apply     efface le champ « code » et convertit en nombre entier les
 *               niveaux enregistrés sous forme de texte ("3" -> 3)
 *   --no-auth   ne consulte pas Firebase Auth (rapport Firestore seulement)
 *   --help      affiche cette aide
 *
 * Rapport produit (à relire avant --apply) :
 *   - fiches contenant encore un champ « code » ;
 *   - fiches de niveau >= 1 : à vérifier une par une, car avant le correctif
 *     tout compte connecté pouvait s'attribuer un niveau ;
 *   - niveaux non entiers (les règles Firestore exigent un entier) ;
 *   - fiches dont l'identifiant n'est pas l'e-mail en minuscules (leur
 *     propriétaire ne pourra pas les lire avec les nouvelles règles) ;
 *   - fiches sans compte Firebase Auth, ou dont l'e-mail n'est pas vérifié.
 */

const admin = require("firebase-admin");

const COLLECTION = "demandeCollaborerLexique";
const BATCH_MAX = 400;

function parseArgs(argv) {
  const out = {apply: false, noAuth: false, help: false};
  for (const arg of argv) {
    if (arg === "--apply") out.apply = true;
    else if (arg === "--no-auth") out.noAuth = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
  }
  return out;
}

function usage() {
  console.log(
      "Usage: node scripts/purge-codes-demande-collaborer.js [--apply] [--no-auth]",
  );
}

function normalizeMail(v) {
  return String(v || "").trim().toLowerCase();
}

/**
 * @param {*} v valeur brute du champ niveau
 * @return {{ok:boolean, value:(number|null), fixable:boolean}}
 */
function analyseNiveau(v) {
  if (typeof v === "number" && Number.isInteger(v)) {
    return {ok: true, value: v, fixable: false};
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return {ok: false, value: Math.trunc(v), fixable: true};
  }
  if (typeof v === "string" && /^\s*-?\d+\s*$/.test(v)) {
    return {ok: false, value: parseInt(v, 10), fixable: true};
  }
  return {ok: false, value: null, fixable: false};
}

async function buildAuthByEmail() {
  const map = new Map();
  let pageToken;
  do {
    const res = await admin.auth().listUsers(1000, pageToken);
    for (const u of res.users) {
      const em = normalizeMail(u.email);
      if (em) map.set(em, u);
    }
    pageToken = res.pageToken;
  } while (pageToken);
  return map;
}

function printList(title, rows) {
  console.log(`\n${title} : ${rows.length}`);
  for (const r of rows) console.log(`  - ${r}`);
}

async function main() {
  const cfg = parseArgs(process.argv.slice(2));
  if (cfg.help) {
    usage();
    process.exit(0);
  }

  admin.initializeApp();
  const db = admin.firestore();

  console.log(`Projet Firebase: ${process.env.GCLOUD_PROJECT || "(défini par credentials)"}`);
  console.log(`Mode: ${cfg.apply ? "APPLY (écriture réelle)" : "DRY-RUN (aucune écriture)"}`);

  const snap = await db.collection(COLLECTION).get();
  const authByMail = cfg.noAuth ? null : await buildAuthByEmail();

  const avecCode = [];
  const niveauxEleves = [];
  const niveauxACorriger = [];
  const niveauxIllisibles = [];
  const idDifferentDuMail = [];
  const sansCompteAuth = [];
  const mailNonVerifie = [];
  /** @type {Array<{ref: FirebaseFirestore.DocumentReference, patch: Object}>} */
  const patches = [];

  snap.forEach((doc) => {
    const d = doc.data() || {};
    const mail = normalizeMail(d.mail || doc.id);
    const patch = {};

    if (Object.prototype.hasOwnProperty.call(d, "code")) {
      avecCode.push(doc.id);
      patch.code = admin.firestore.FieldValue.delete();
    }

    const niv = analyseNiveau(d.niveau);
    if (!niv.ok) {
      if (niv.fixable) {
        niveauxACorriger.push(`${doc.id} : ${JSON.stringify(d.niveau)} -> ${niv.value}`);
        patch.niveau = niv.value;
      } else {
        niveauxIllisibles.push(`${doc.id} : ${JSON.stringify(d.niveau)}`);
      }
    }
    if (niv.value !== null && niv.value >= 1) {
      niveauxEleves.push(`${doc.id} | nom: ${String(d.name || "")} | niveau: ${niv.value}`);
    }

    if (doc.id !== mail) {
      idDifferentDuMail.push(`id="${doc.id}" mail="${mail}"`);
    }

    if (authByMail) {
      const u = authByMail.get(mail);
      if (!u) sansCompteAuth.push(doc.id);
      else if (!u.emailVerified) mailNonVerifie.push(doc.id);
    }

    if (Object.keys(patch).length > 0) {
      patches.push({ref: doc.ref, patch});
    }
  });

  console.log(`\nFiches lues : ${snap.size}`);
  console.log(`Fiches contenant encore un champ « code » : ${avecCode.length}`);
  printList("Fiches de niveau >= 1 (À VÉRIFIER : rôle légitime ?)", niveauxEleves);
  printList("Niveaux à convertir en entier", niveauxACorriger);
  printList("Niveaux illisibles (à corriger à la main)", niveauxIllisibles);
  printList("Identifiant de fiche différent de l'e-mail en minuscules", idDifferentDuMail);
  if (authByMail) {
    printList("Fiches sans compte Firebase Auth (lancer « Sync Auth », puis « mot de passe oublié »)", sansCompteAuth);
    printList("Comptes Auth dont l'e-mail n'est pas vérifié", mailNonVerifie);
  }

  if (!cfg.apply) {
    console.log(`\nDRY-RUN : ${patches.length} fiche(s) seraient modifiées. Relancer avec --apply pour appliquer.`);
    return;
  }
  if (patches.length === 0) {
    console.log("\nRien à modifier.");
    return;
  }

  let done = 0;
  for (let i = 0; i < patches.length; i += BATCH_MAX) {
    const chunk = patches.slice(i, i + BATCH_MAX);
    const batch = db.batch();
    for (const p of chunk) batch.update(p.ref, p.patch);
    await batch.commit();
    done += chunk.length;
    console.log(`Mise à jour : ${done}/${patches.length}`);
  }

  const verif = await db.collection(COLLECTION).get();
  let restants = 0;
  verif.forEach((doc) => {
    if (Object.prototype.hasOwnProperty.call(doc.data() || {}, "code")) restants++;
  });
  console.log(`Terminé. Fiches contenant encore « code » : ${restants}`);
  if (restants > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error("Erreur purge codes:", err && err.stack ? err.stack : err);
  process.exit(1);
});
