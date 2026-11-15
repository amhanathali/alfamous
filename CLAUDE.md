# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Règle prioritaire (reprise de `.cursor/rules/`)

Avant toute modification de code, **résumer brièvement ce qui a été compris** de la demande (objectif, périmètre, fichiers concernés, contraintes) et **demander confirmation** (« Est-ce bien cela que tu veux ? ») si l'utilisateur n'a pas encore validé. Une phrase de clarification vaut mieux qu'un malentendu.

Le propriétaire travaille en français, sous Windows ; sa copie locale est `C:\Users\gmpcd\Desktop\Alfamous`. Répondre en français.

## Projet

Alfamous : application web open source (GPL v3) d'étude du codex coranique — recherche par mots/racines/pages/versets, commentaires sur versets et lexique, forum, notes, articles. Ligne éditoriale : **le texte d'abord** (les hadiths n'entrent pas dans l'appareil d'analyse). Interface multilingue (FR, EN, AR, ES, KAB). Projet Firebase : `alfamous-amha`.

## Commandes

```bash
# Dépendances backend
cd functions && npm install

# Lint (seul outil de vérification ; il n'y a pas de suite de tests)
cd functions && npm run lint

# Émulateurs Firebase (hosting, functions, firestore, storage)
firebase emulators:start
cd functions && npm run serve        # functions seules

# Test rapide du frontend sans Firebase local : serveur statique sans cache sur public/
python nocache_server.py 8080        # (LANCER_ALFAMOUS.BAT fait la même chose sous Windows)

# Déploiement
firebase deploy                      # tout
firebase deploy --only hosting       # frontend seul
firebase deploy --only functions

# Générer functions/quick-login.json (email+nom, sans mot de passe) depuis other/quick-login.json
npm run sync-quick-login
```

Sous Windows, `DEPLOYER____.BAT` est le chemin de déploiement habituel : il **télécharge depuis Cloud Storage** (`gs://alfamous-amha.appspot.com/MesDonnes/MesJS`) `fTabVersets1.js`, `fTabLexique1.js` et `articles-format-html.js` vers `public/jsZC/`, met à jour `dateVersion.js`, lance `firebase deploy`, puis fait commit + pull --rebase + push de la branche courante. Conséquence : une modification locale de ces trois fichiers est écrasée au prochain déploiement — la source de vérité est dans Storage. Les autres `GIT_*.bat` sont des assistants Git pour l'utilisateur.

## Architecture

Détails : `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/CONFIGURATION.md`, `docs/DEPLOYMENT.md`.

**Frontend (`public/`) — sans framework ni build.** `public/index.html` (page « Zoom-Coran ») charge ~45 scripts de `public/jsZC/` comme scripts classiques (`defer`, pas de modules ES) : ils communiquent par **variables et fonctions globales**, donc **l'ordre des `<script>` dans `index.html` compte**. Points clés :
- Firebase SDK **compat 9.6.7** via CDN (`firebase.firestore()`, etc., pas l'API modulaire).
- `firebase-local-init.js` initialise Firebase (long polling Firestore forcé) ; `com12.js` expose `db`/`storage`/`auth` dont dépendent `sessions.js`, `forum.js`, `initAppli.js`. `initAppli.js` est chargé en dernier et démarre l'application ; `chokr-notify.js` doit le précéder.
- `fTabVersets1.js` (~8 Mo) et `fTabLexique1.js` sont des **données** (texte coranique, lexique) sous forme de tableaux JS — ne pas les lire en entier.
- Modules par domaine : recherche/Coran (`Zoom-Coran.js`, `mots-coran.js`, `statRacines.js`, `synonymes.js`), lexique Ibn Fāris (`Lexique.js`, `ibn-fares-openiti-*`), commentaires (`comment.js`, `enregistrer.js`, `histMots.js`), forum, témoignages, médias/notes (TTS/STT), auth (`connexion.js`, `sessions.js`).
- CSS : `public/styles.css` importe `public/styles/01-…19-*.css` dans un ordre qui **est** la cascade, puis `99-overrides.css` est chargé à part en dernier. Utiliser les tokens de `01-tokens.css`. Voir `public/styles/README.md` avant de toucher au CSS.

**Backend (`functions/index.js`, Node 20)** — toutes les fonctions en région **`europe-west1`** : déclencheurs Firestore pour e-mails (forum, contact), callables admin (newsletter, synchro Auth ↔ `demandeCollaborerLexique`), `newsletterUnsubscribe` (HTTP, lien HMAC, exposé via rewrite dans `firebase.json`), TTS/STT des notes (`mesNoteTts.js`, `mesNoteStt.js`), envoi SMTP (`mail.js`). Style ESLint `google` + guillemets doubles.

**Autorisation** : le rôle admin = **niveau ≥ 3** dans la collection Firestore `demandeCollaborerLexique`, croisé avec l'e-mail Firebase Auth. Ce modèle est appliqué à la fois dans `firestore.rules`/`storage.rules` et dans les callables — toute évolution des droits doit être reportée aux deux endroits.

**Hosting** : `firebase.json` sert `public/` avec fallback SPA vers `index.html` ; `other/**` et `jsZC/quick-login.json` sont exclus du déploiement.

**`Gscript/`** : Google Apps Script indépendants de l'app (synchro Blogger, tableaux versets/racines, messages aux abonnés), déployés via l'éditeur Apps Script, pas par Firebase.

## Secrets

Non versionnés (modèles fournis) : `.env` (← `.env.example`), `functions/quick-login.json` (← `quick-login.example.json`), `Gscript/secrets.gs` (← `secrets.example.gs`), clés de service `key.json`, `functions/*-adminsdk-*.json`, `functions/client_secret*.json`. La config SMTP/newsletter passe par `firebase functions:config:set`. La clé Web Firebase de `functions/firebaseConfig.js` est publique par nature.

## Conventions

- Messages de commit : `<type>: <description à l'impératif>` (`feat`, `fix`, `docs`, `style`, `refactor`, `chore`).
- Les PR vers `main` suivent `.github/PULL_REQUEST_TEMPLATE.md` ; mettre à jour `CHANGELOG.md` si pertinent.
