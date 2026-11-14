"use strict";

/**
 * Chantier 1 — demandeCollaborerLexique : mots de passe et champ « niveau ».
 */

const {test, before, after, beforeEach} = require("node:test");
const {assertFails, assertSucceeds} = require("@firebase/rules-unit-testing");
const h = require("./helpers");

const COL = "demandeCollaborerLexique";
let env;

before(async () => {
  env = await h.creerEnvironnement();
});
after(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await h.semerMembres(env);
});

// ---------------------------------------------------------------- Lecture

test("visiteur non connecté : ne lit aucune fiche et ne liste pas la collection", async () => {
  const db = h.visiteur(env).firestore();
  await assertFails(db.doc(`${COL}/${h.MEMBRE}`).get());
  await assertFails(db.collection(COL).get());
});

test("session anonyme : ne lit aucune fiche et ne liste pas la collection", async () => {
  const db = h.anonyme(env).firestore();
  await assertFails(db.doc(`${COL}/${h.MEMBRE}`).get());
  await assertFails(db.collection(COL).get());
});

test("membre : lit sa fiche, pas celle d'un autre, ne liste pas la collection", async () => {
  const db = h.compte(env, h.MEMBRE).firestore();
  await assertSucceeds(db.doc(`${COL}/${h.MEMBRE}`).get());
  await assertFails(db.doc(`${COL}/${h.ADMIN}`).get());
  await assertFails(db.collection(COL).get());
  await assertFails(db.collection(COL).where("name", "==", "Admin").get());
});

test("compte à l'e-mail non vérifié : ne lit pas la fiche portant son e-mail", async () => {
  const db = h.compteNonVerifie(env, h.MEMBRE).firestore();
  await assertFails(db.doc(`${COL}/${h.MEMBRE}`).get());
});

test("admin : lit une fiche et liste la collection", async () => {
  const db = h.compte(env, h.ADMIN).firestore();
  await assertSucceeds(db.doc(`${COL}/${h.MEMBRE}`).get());
  await assertSucceeds(db.collection(COL).get());
});

// --------------------------------------------------------------- Création

const ficheNeuve = (mail) => ({mail, name: "Nouveau", niveau: 0, niveauDemande: 1});

test("inscription : le propriétaire vérifié crée sa fiche au niveau 0", async () => {
  const db = h.compte(env, h.AUTRE).firestore();
  await assertSucceeds(db.doc(`${COL}/${h.AUTRE}`).set(ficheNeuve(h.AUTRE)));
});

test("inscription : refus si la fiche contient un mot de passe (champ code)", async () => {
  const db = h.compte(env, h.AUTRE).firestore();
  await assertFails(db.doc(`${COL}/${h.AUTRE}`).set({...ficheNeuve(h.AUTRE), code: "secret123"}));
});

test("inscription : refus si le niveau de départ n'est pas 0", async () => {
  const db = h.compte(env, h.AUTRE).firestore();
  await assertFails(db.doc(`${COL}/${h.AUTRE}`).set({...ficheNeuve(h.AUTRE), niveau: 3}));
});

test("inscription : refus pour l'e-mail de quelqu'un d'autre, un e-mail non vérifié ou une session anonyme", async () => {
  await assertFails(h.compte(env, h.MEMBRE).firestore().doc(`${COL}/${h.AUTRE}`).set(ficheNeuve(h.AUTRE)));
  await assertFails(h.compteNonVerifie(env, h.AUTRE).firestore().doc(`${COL}/${h.AUTRE}`).set(ficheNeuve(h.AUTRE)));
  await assertFails(h.anonyme(env).firestore().doc(`${COL}/${h.AUTRE}`).set(ficheNeuve(h.AUTRE)));
});

// ------------------------------------------------------------ Mise à jour

test("membre : modifie son nom, son niveau demandé et son compteur de connexions", async () => {
  const ref = h.compte(env, h.MEMBRE).firestore().doc(`${COL}/${h.MEMBRE}`);
  await assertSucceeds(ref.update({name: "Nouveau nom"}));
  await assertSucceeds(ref.update({niveauDemande: 2}));
  await assertSucceeds(ref.update({nombreConnexions: 2}));
});

test("membre : NE PEUT PAS s'attribuer un niveau (devenir administrateur)", async () => {
  const ref = h.compte(env, h.MEMBRE).firestore().doc(`${COL}/${h.MEMBRE}`);
  await assertFails(ref.update({niveau: 3}));
  await assertFails(ref.update({niveau: 1}));
  await assertFails(ref.set({mail: h.MEMBRE, name: "Membre", niveau: 3, niveauDemande: 0}));
});

test("membre : ne peut pas écrire de mot de passe (champ code) ni modifier la fiche d'un autre", async () => {
  const db = h.compte(env, h.MEMBRE).firestore();
  await assertFails(db.doc(`${COL}/${h.MEMBRE}`).update({code: "secret123"}));
  await assertFails(db.doc(`${COL}/${h.ADMIN}`).update({name: "Piraté"}));
  await assertFails(db.doc(`${COL}/${h.ADMIN}`).update({niveau: 0}));
});

test("session anonyme et visiteur : aucune écriture", async () => {
  await assertFails(h.anonyme(env).firestore().doc(`${COL}/${h.MEMBRE}`).update({niveau: 3}));
  await assertFails(h.visiteur(env).firestore().doc(`${COL}/${h.MEMBRE}`).update({niveau: 3}));
  await assertFails(h.anonyme(env).firestore().doc(`${COL}/${h.MEMBRE}`).delete());
});

test("ancienne fiche contenant encore « code » : le membre peut mettre à jour son compteur, pas le code", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(`${COL}/${h.MEMBRE}`).update({code: "ancien-mot-de-passe"});
  });
  const ref = h.compte(env, h.MEMBRE).firestore().doc(`${COL}/${h.MEMBRE}`);
  await assertSucceeds(ref.update({nombreConnexions: 3}));
  await assertFails(ref.update({code: "nouveau"}));
});

test("admin : change le niveau d'un membre, mais ne peut pas écrire de mot de passe", async () => {
  const ref = h.compte(env, h.ADMIN).firestore().doc(`${COL}/${h.MEMBRE}`);
  await assertSucceeds(ref.update({niveau: 2}));
  await assertFails(ref.update({code: "secret123"}));
});

test("admin dont l'e-mail n'est pas vérifié : aucun droit d'admin", async () => {
  const db = h.compteNonVerifie(env, h.ADMIN).firestore();
  await assertFails(db.collection(COL).get());
  await assertFails(db.doc(`${COL}/${h.MEMBRE}`).update({niveau: 3}));
});

test("membre promu par un admin : obtient alors les droits d'admin", async () => {
  await assertSucceeds(
      h.compte(env, h.ADMIN).firestore().doc(`${COL}/${h.MEMBRE}`).update({niveau: 3}));
  await assertSucceeds(h.compte(env, h.MEMBRE).firestore().collection(COL).get());
});

test("suppression : réservée à l'admin", async () => {
  await assertFails(h.compte(env, h.MEMBRE).firestore().doc(`${COL}/${h.MEMBRE}`).delete());
  await assertSucceeds(h.compte(env, h.ADMIN).firestore().doc(`${COL}/${h.MEMBRE}`).delete());
});
