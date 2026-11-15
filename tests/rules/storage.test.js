"use strict";

/**
 * Chantier 2a — storage.rules (décision du 15 novembre 2026).
 * Le niveau est lu dans Firestore : les émulateurs Firestore ET Storage doivent tourner
 * (npm run test:emulateur les démarre tous les deux).
 */

const {test, before, after, beforeEach} = require("node:test");
const {assertFails, assertSucceeds} = require("@firebase/rules-unit-testing");
const h = require("./helpers");

const CONTRIB = "contrib@example.org"; // niveau 1
const JS = {contentType: "application/javascript"};
const JSON_ = {contentType: "application/json"};
const MP3 = {contentType: "audio/mpeg"};
const PETIT = new Uint8Array([1, 2, 3]);

const uid = (email) => "uid-" + email; // même convention que helpers.compte()

let env;

before(async () => {
  env = await h.creerEnvironnement();
});
after(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await h.semerMembres(env, async (db) => {
    await db.doc(`demandeCollaborerLexique/${CONTRIB}`).set({
      mail: CONTRIB, name: "Contrib", niveau: 1, niveauDemande: 1, nombreConnexions: 2,
    });
  });
  // Fichiers existants (posés sans règles)
  await env.withSecurityRulesDisabled(async (ctx) => {
    const st = ctx.storage();
    await st.ref("MesDonnes/MesJS/fTabVersets1.js").put(PETIT, JS);
    await st.ref("MesDonnes/MesJS/fTabLexique1.js").put(PETIT, JS);
    await st.ref("MesDonnes/warsh/001.jpg").put(PETIT, {contentType: "image/jpeg"});
    await st.ref("MesMedias/audio/123_ancien.mp3").put(PETIT, MP3);
    await st.ref(`MesDonnes/historikMots/uid_${uid(h.MEMBRE)}/historiqueMots.json`).put(PETIT, JSON_);
    await st.ref(`MesMedias/membres/${uid(h.MEMBRE)}/audio/1_a.mp3`).put(PETIT, MP3);
    await st.ref(`MesMedias/audio/MesNotesTts/${uid(h.MEMBRE)}/note.mp3`).put(PETIT, MP3);
  });
});

// ------------------------------------------------- Fichiers de données (MesJS)

test("visiteur et session anonyme : lisent fTabVersets1.js mais ne peuvent pas l'écrire", async () => {
  for (const ctx of [h.visiteur(env), h.anonyme(env)]) {
    const ref = ctx.storage().ref("MesDonnes/MesJS/fTabVersets1.js");
    await assertSucceeds(ref.getMetadata());
    await assertFails(ref.put(PETIT, JS));
    await assertFails(ref.delete());
  }
});

test("membre de niveau 0 : ne peut pas écrire les fichiers de données", async () => {
  const st = h.compte(env, h.MEMBRE).storage();
  await assertFails(st.ref("MesDonnes/MesJS/fTabLexique1.js").put(PETIT, JS));
  await assertFails(st.ref("MesDonnes/MesJS/fTabVersets1.js").put(PETIT, JS));
});

test("contributeur (niveau 1) : écrit les trois fichiers autorisés, rien d'autre", async () => {
  const st = h.compte(env, CONTRIB).storage();
  await assertSucceeds(st.ref("MesDonnes/MesJS/fTabLexique1.js").put(PETIT, JS));
  await assertSucceeds(st.ref("MesDonnes/MesJS/fTabVersets1.js").put(PETIT, JS));
  await assertSucceeds(st.ref("MesDonnes/MesJS/articles-format-html.js").put(PETIT, {contentType: "text/javascript"}));
  await assertFails(st.ref("MesDonnes/MesJS/autre.js").put(PETIT, JS));
  await assertFails(st.ref("MesDonnes/MesJS/fTabLexique1.js").put(PETIT, {contentType: "text/html"}));
  await assertFails(st.ref("MesDonnes/MesJS/fTabLexique1.js").delete());
  await assertFails(st.ref("MesDonnes/warsh/001.jpg").put(PETIT, {contentType: "image/jpeg"}));
});

test("contributeur à l'e-mail non vérifié : refusé", async () => {
  const st = h.compteNonVerifie(env, CONTRIB).storage();
  await assertFails(st.ref("MesDonnes/MesJS/fTabLexique1.js").put(PETIT, JS));
});

test("compte sans fiche Firestore : refusé", async () => {
  const st = h.compte(env, h.AUTRE).storage();
  await assertFails(st.ref("MesDonnes/MesJS/fTabLexique1.js").put(PETIT, JS));
});

test("admin : écrit et supprime partout", async () => {
  const st = h.compte(env, h.ADMIN).storage();
  await assertSucceeds(st.ref("MesDonnes/MesJS/fTabLexique1.js").put(PETIT, JS));
  await assertSucceeds(st.ref("MesDonnes/MesJS/fTabVersets1.js").delete());
  await assertSucceeds(st.ref("MesDonnes/warsh/002.jpg").put(PETIT, {contentType: "image/jpeg"}));
  await assertSucceeds(st.ref("MesMedias/audio/123_ancien.mp3").delete());
});

// ------------------------------------------------- Reste du bucket

test("reste du bucket : lecture publique, aucune écriture hors admin", async () => {
  await assertSucceeds(h.visiteur(env).storage().ref("MesDonnes/warsh/001.jpg").getMetadata());
  await assertSucceeds(h.visiteur(env).storage().ref("MesMedias/audio/123_ancien.mp3").getMetadata());
  for (const ctx of [h.anonyme(env), h.compte(env, h.MEMBRE), h.compte(env, CONTRIB)]) {
    const st = ctx.storage();
    await assertFails(st.ref("MesMedias/audio/999_nouveau.mp3").put(PETIT, MP3));
    await assertFails(st.ref("MesMedias/audio/123_ancien.mp3").delete());
    await assertFails(st.ref("racine.txt").put(PETIT, {contentType: "text/plain"}));
  }
});

// ------------------------------------------------- Historique de mots

test("historik : chacun lit et écrit le sien, pas celui d'un autre", async () => {
  const chemin = (e) => `MesDonnes/historikMots/uid_${uid(e)}/historiqueMots.json`;
  const membre = h.compte(env, h.MEMBRE).storage();
  await assertSucceeds(membre.ref(chemin(h.MEMBRE)).getMetadata());
  await assertSucceeds(membre.ref(chemin(h.MEMBRE)).put(PETIT, JSON_));
  await assertFails(membre.ref(chemin(h.MEMBRE)).put(PETIT, {contentType: "application/javascript"}));
  await assertFails(membre.ref(`MesDonnes/historikMots/uid_${uid(h.MEMBRE)}/autre.json`).put(PETIT, JSON_));

  const autre = h.compte(env, CONTRIB).storage();
  await assertFails(autre.ref(chemin(h.MEMBRE)).getMetadata());
  await assertFails(autre.ref(chemin(h.MEMBRE)).put(PETIT, JSON_));

  await assertFails(h.visiteur(env).storage().ref(chemin(h.MEMBRE)).getMetadata());
  await assertFails(h.visiteur(env).storage().ref(`MesDonnes/historikMots/guest/historiqueMots.json`).put(PETIT, JSON_));
});

test("historik : une session anonyme écrit dans son propre dossier uid_", async () => {
  const st = h.anonyme(env).storage();
  await assertSucceeds(st.ref("MesDonnes/historikMots/uid_uid-anonyme/historiqueMots.json").put(PETIT, JSON_));
  await assertFails(st.ref("MesDonnes/historikMots/mail_x@y.z/historiqueMots.json").put(PETIT, JSON_));
});

// ------------------------------------------------- Médias des membres

test("médias : le membre gère son dossier ; les autres ne lisent ni n'écrivent", async () => {
  const mien = `MesMedias/membres/${uid(h.MEMBRE)}/audio/2_b.mp3`;
  const membre = h.compte(env, h.MEMBRE).storage();
  await assertSucceeds(membre.ref(mien).put(PETIT, MP3));
  await assertSucceeds(membre.ref(mien).getMetadata());
  await assertSucceeds(membre.ref(mien).delete());
  await assertFails(membre.ref(`MesMedias/membres/${uid(CONTRIB)}/audio/x.mp3`).put(PETIT, MP3));

  await assertFails(h.compte(env, CONTRIB).storage().ref(`MesMedias/membres/${uid(h.MEMBRE)}/audio/1_a.mp3`).getMetadata());
  await assertFails(h.compte(env, CONTRIB).storage().ref(`MesMedias/membres/${uid(h.MEMBRE)}/audio/1_a.mp3`).delete());
  await assertFails(h.visiteur(env).storage().ref(`MesMedias/membres/${uid(h.MEMBRE)}/audio/1_a.mp3`).getMetadata());
});

test("médias : session anonyme et e-mail non vérifié ne peuvent rien envoyer", async () => {
  await assertFails(h.anonyme(env).storage().ref("MesMedias/membres/uid-anonyme/audio/x.mp3").put(PETIT, MP3));
  await assertFails(h.compteNonVerifie(env, h.MEMBRE).storage()
    .ref(`MesMedias/membres/${uid(h.MEMBRE)}/audio/x.mp3`).put(PETIT, MP3));
});

test("médias : l'admin lit et supprime le média d'un membre", async () => {
  const st = h.compte(env, h.ADMIN).storage();
  await assertSucceeds(st.ref(`MesMedias/membres/${uid(h.MEMBRE)}/audio/1_a.mp3`).getMetadata());
  await assertSucceeds(st.ref(`MesMedias/membres/${uid(h.MEMBRE)}/audio/1_a.mp3`).delete());
});

// ------------------------------------------------- Mes Notes (transcription et MP3)

test("stt-input : le membre envoie et supprime son audio ; les autres non", async () => {
  const p = `MesMedias/stt-input/${uid(h.MEMBRE)}/1_n.m4a`;
  const membre = h.compte(env, h.MEMBRE).storage();
  await assertSucceeds(membre.ref(p).put(PETIT, {contentType: "audio/mp4"}));
  await assertSucceeds(membre.ref(p).getMetadata());
  await assertFails(membre.ref(`MesMedias/stt-input/${uid(h.MEMBRE)}/x.js`).put(PETIT, JS));
  await assertFails(h.compte(env, CONTRIB).storage().ref(p).getMetadata());
  await assertSucceeds(membre.ref(p).delete());
});

test("MP3 MesNotesTts : le propriétaire lit, liste et supprime ; n'écrit pas ; privé pour les autres", async () => {
  const dossier = `MesMedias/audio/MesNotesTts/${uid(h.MEMBRE)}`;
  const membre = h.compte(env, h.MEMBRE).storage();
  await assertSucceeds(membre.ref(`${dossier}/note.mp3`).getMetadata());
  await assertSucceeds(membre.ref(dossier).listAll());
  await assertFails(membre.ref(`${dossier}/autre.mp3`).put(PETIT, MP3));
  await assertFails(h.visiteur(env).storage().ref(`${dossier}/note.mp3`).getMetadata());
  await assertFails(h.compte(env, CONTRIB).storage().ref(dossier).listAll());
  await assertSucceeds(membre.ref(`${dossier}/note.mp3`).delete());
});
