"use strict";

/**
 * Outils communs aux tests des règles (Firestore et Storage).
 * Les tests tournent contre l'émulateur Firebase, jamais contre le projet réel :
 *   cd tests/rules && npm install && npm run test:emulateur
 */

const fs = require("node:fs");
const path = require("node:path");
const {initializeTestEnvironment} = require("@firebase/rules-unit-testing");

const RACINE = path.join(__dirname, "..", "..");
const PROJET = "demo-alfamous";

const ADMIN = "admin@example.org";
const MEMBRE = "membre@example.org";
const AUTRE = "autre@example.org";

async function creerEnvironnement() {
  return initializeTestEnvironment({
    projectId: PROJET,
    firestore: {rules: fs.readFileSync(path.join(RACINE, "firestore.rules"), "utf8")},
    storage: {rules: fs.readFileSync(path.join(RACINE, "storage.rules"), "utf8")},
  });
}

/** Visiteur sans aucune session Firebase. */
function visiteur(env) {
  return env.unauthenticatedContext();
}

/** Session anonyme (signInAnonymously de medias1.js) : connectée mais sans e-mail. */
function anonyme(env) {
  return env.authenticatedContext("uid-anonyme", {
    firebase: {sign_in_provider: "anonymous"},
  });
}

/** Compte e-mail + mot de passe, e-mail vérifié. */
function compte(env, email) {
  return env.authenticatedContext("uid-" + email, {email, email_verified: true});
}

/** Compte e-mail + mot de passe dont l'e-mail n'est PAS vérifié. */
function compteNonVerifie(env, email) {
  return env.authenticatedContext("uid-" + email, {email, email_verified: false});
}

/** Écrit des fiches membres en contournant les règles (préparation des tests). */
async function semerMembres(env, extra) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc(`demandeCollaborerLexique/${ADMIN}`).set({
      mail: ADMIN, name: "Admin", niveau: 3, niveauDemande: 3, nombreConnexions: 5,
    });
    await db.doc(`demandeCollaborerLexique/${MEMBRE}`).set({
      mail: MEMBRE, name: "Membre", niveau: 0, niveauDemande: 0, nombreConnexions: 1,
    });
    if (extra) await extra(db);
  });
}

module.exports = {
  ADMIN, MEMBRE, AUTRE,
  creerEnvironnement, visiteur, anonyme, compte, compteNonVerifie, semerMembres,
};
