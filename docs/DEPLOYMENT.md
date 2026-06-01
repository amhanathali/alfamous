# Déploiement

Ce guide explique comment installer, tester localement et déployer Alfamous sur Firebase.

## Prérequis

- [Node.js](https://nodejs.org/) **20+**
- [Firebase CLI](https://firebase.google.com/docs/cli) : `npm install -g firebase-tools`
- Un **projet Firebase** (plan Blaze recommandé pour les Cloud Functions et les API Google).
- Accès à la **console Google Cloud** du projet (pour les clés et les API).

## 1. Récupérer le code

```bash
git clone https://github.com/<votre-utilisateur>/alfamous.git
cd alfamous
```

## 2. Installer les dépendances

```bash
# Dépendances du backend (Cloud Functions)
cd functions
npm install
cd ..
```

## 3. Configurer les secrets

Voir le guide complet : [CONFIGURATION.md](./CONFIGURATION.md). En résumé :

```bash
cp .env.example .env
cp functions/quick-login.example.json functions/quick-login.json
cp Gscript/secrets.example.gs Gscript/secrets.gs
# éditez ces fichiers + placez vos clés de service (non versionnées)
```

Puis la configuration SMTP / newsletter des Functions :

```bash
firebase functions:config:set smtp.host="…" smtp.user="…" smtp.pass="…" \
  email.from='"Alfamous" <…>' app.public_url="https://<projet>.web.app" \
  newsletter.secret="…"
```

## 4. Se connecter à Firebase

```bash
firebase login
firebase use <ID_DU_PROJET>   # ex. alfamous-amha
```

## 5. Tester en local (émulateurs)

```bash
firebase emulators:start
```

Cela lance Hosting, Functions, Firestore et Storage en local. Le frontend `public/` peut aussi être servi par n'importe quel serveur statique pour un test rapide.

## 6. Activer les API Google nécessaires

Dans la console Google Cloud (*APIs et services* → *Bibliothèque*), activez selon les fonctionnalités utilisées :

- **Cloud Firestore API**
- **Identity Toolkit API** (Firebase Auth)
- **Cloud Storage for Firebase API**
- **Cloud Text-to-Speech API** (notes audio)
- **Cloud Speech-to-Text API** (transcription)
- **Blogger API v3** (scripts Apps Script, si utilisés)

## 7. Déployer

```bash
# Tout déployer
firebase deploy

# Ou cibler une partie
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
firebase deploy --only firestore:indexes
```

> Les Cloud Functions sont déployées en région **`europe-west1`**.

## 8. Rôles IAM utiles (Cloud Functions)

Certaines fonctions nécessitent des rôles sur le **compte de service d'exécution** :

- **Cloud Datastore User** (`roles/datastore.user`) — accès Firestore côté Admin.
- **Storage Object Admin** (sur le bucket) — écriture des fichiers audio TTS.
- Le TTS utilise un compte de service dédié : `mon-robot-tts@<projet>.iam.gserviceaccount.com`.

## 9. Vérifications post-déploiement

- [ ] Le site répond sur `https://<projet>.web.app`.
- [ ] Connexion / Firestore (forum, témoignages) fonctionnent.
- [ ] L'affichage et l'upload de médias fonctionnent.
- [ ] Les e-mails (contact, forum, newsletter) partent bien (sinon vérifier `functions:config`).
- [ ] Les logs sont propres : `firebase functions:log`.
