# Configuration & secrets

Ce document explique **tous les éléments de configuration** nécessaires pour faire fonctionner Alfamous, et **comment gérer les secrets** sans jamais les publier.

> 🔒 Règle d'or : **aucun secret réel ne doit être committé.** Le dépôt fournit des fichiers `*.example` à copier puis remplir localement. Les versions réelles sont exclues par [`.gitignore`](../.gitignore).

## 1. Fichiers de secrets (à créer localement)

| Fichier réel (exclu de Git) | Modèle fourni | Contenu |
|---|---|---|
| `key.json` ou `functions/<projet>-adminsdk-*.json` | — | Clé de compte de service Google (Admin SDK) |
| `functions/client_secret*.json` | — | Secret client OAuth Google |
| `functions/quick-login.json` | `functions/quick-login.example.json` | Table de connexion rapide (e-mails) |
| `Gscript/secrets.gs` | `Gscript/secrets.example.gs` | Clé API Blogger pour Apps Script |
| `.env` | `.env.example` | Variables d'environnement locales |

Pour démarrer :

```bash
cp .env.example .env
cp functions/quick-login.example.json functions/quick-login.json
cp Gscript/secrets.example.gs Gscript/secrets.gs
# puis éditez chaque fichier avec vos vraies valeurs
```

## 2. Configuration web Firebase (publique)

Le fichier `functions/firebaseConfig.js` (et `public/jsZC/firebase-local-init.js`) contient la configuration **Web** Firebase, dont la clé `apiKey`.

> ℹ️ Cette `apiKey` Web **n'est pas un secret** : elle est conçue pour être visible côté navigateur. La sécurité réelle vient des [`firestore.rules`](../firestore.rules) et de la **restriction de la clé par domaine** (référents HTTP) dans la console Google Cloud.

**Restriction recommandée** (Console Google Cloud → *Identifiants* → clé **Browser key (auto created by Firebase)**) :

*Restrictions d'application* → **Sites Web** (référents HTTP) :

```text
https://alfamous-amha.web.app/*
https://alfamous-amha.firebaseapp.com/*
https://alfamous.ca/*
https://*.alfamous.ca/*
http://localhost/*
http://127.0.0.1/*
```

*Restrictions d'API* → **Restreindre la clé**, puis cocher uniquement les APIs utilisées par l'app web :

| API (nom console) | Usage Alfamous |
|---|---|
| Cloud Firestore API | Base de données |
| Identity Toolkit API | Connexion e-mail / mot de passe |
| Token Service API | Jetons Firebase Auth |
| Firebase Installations API | Initialisation du SDK |
| Cloud Functions API | Appels `httpsCallable` (newsletter, TTS, login rapide…) |
| Cloud Storage for Firebase API | Médias, audio, fichiers |

*(Optionnel : Firebase Realtime Database API — script chargé par précaution.)*

> **Ne pas cocher** BigQuery, Blogger, App Engine, Cloud Build, etc. La **Blogger API** est utilisée par Apps Script avec une **autre** clé (`Gscript/secrets.gs`), pas cette clé navigateur.

### E-mail « Clé API accessible publiquement » (GitHub)

Google envoie parfois un message du type *Trust & Safety* signalant la clé `apiKey` trouvée sur GitHub (`functions/firebaseConfig.js`, `public/jsZC/firebase-local-init.js`).

**Ce n'est pas une fuite de secret serveur.** C'est la clé **client Web Firebase**, visible de toute façon dans le navigateur de chaque visiteur. Après publication open source, l'alerte est **normale**.

**À faire :** appliquer les restrictions ci-dessus ; vérifier la facturation ; **ne pas regénérer** la clé sans raison (abus constaté), sauf rotation volontaire.

**Vrais secrets à ne jamais publier :** `*-adminsdk-*.json`, `client_secret*.json`, `.env`, `Gscript/secrets.gs` (voir section 1).

## 3. Client OAuth « Client web 1 » (inactif)

Dans *Identifiants*, un client OAuth de type **Application Web** (libellé **Client web 1**, ID se terminant par `.apps.googleusercontent.com`) peut afficher :

> *Ce client OAuth n'a pas été utilisé. Les clients OAuth inactifs sont supprimés s'ils ne sont pas utilisés pendant six mois.*

**Contexte Alfamous :** l'application utilise **uniquement** la connexion **e-mail + mot de passe** (`signInWithEmailAndPassword`). Il n'y a pas de bouton « Se connecter avec Google » dans le code. Ce client OAuth a probablement été créé automatiquement ou pour une fonctionnalité jamais activée.

| Question | Réponse |
|---|---|
| Est-ce dangereux ? | **Non** — simple rappel de ménage Google. |
| Faut-il agir ? | **Non**, si vous ne prévoyez pas Google Sign-In. |
| Supprimer le client ? | **Optionnel.** L'app actuelle n'en a pas besoin. |
| Politique du projet | **Laisser tel quel** : Google le supprimera seul après 6 mois d'inactivité si rien ne change. |
| Ajouter Google Sign-In plus tard ? | Recréer ou reconfigurer un client OAuth + activer le fournisseur Google dans Firebase → *Authentication* → *Sign-in method*. |

Le fichier `functions/client_secret*.json` (section 1) sert à un **secret OAuth serveur** distinct ; il n'est **pas** dans Git et n'est **pas** requis pour la connexion e-mail actuelle.

## 4. Configuration des Cloud Functions (SMTP, newsletter)

Définie via `firebase functions:config:set` (pas dans `.env`) :

```bash
firebase functions:config:set \
  smtp.host="smtp.gmail.com" \
  smtp.port="587" \
  smtp.secure="false" \
  smtp.user="VOTRE_COMPTE@gmail.com" \
  smtp.pass="MOT_DE_PASSE_APPLICATION" \
  email.from='"Alfamous" <VOTRE_COMPTE@gmail.com>' \
  email.contact_to="boite.admin@example.com" \
  app.public_url="https://votre-projet.web.app" \
  newsletter.secret="UNE_CHAINE_ALEATOIRE_LONGUE"

firebase deploy --only functions
```

| Clé | Rôle |
|---|---|
| `smtp.*` | Paramètres du serveur d'envoi d'e-mails (Nodemailer) |
| `email.from` | Expéditeur affiché |
| `email.contact_to` | Destinataire des alertes « Contact » |
| `app.public_url` | URL publique de l'app (liens dans les e-mails) |
| `newsletter.secret` | Clé HMAC pour signer les liens de désabonnement |

## 5. Variables d'environnement (`.env`)

| Variable | Rôle |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | Chemin local vers la clé de compte de service |
| `FIREBASE_STORAGE_BUCKET` / `GCLOUD_STORAGE_BUCKET` | Bucket de stockage utilisé par le TTS |

## 6. Clé API Blogger (Google Apps Script)

Utilisée par `Gscript/ArticlesBlogHtml.gs`. Deux façons de la fournir (par ordre de priorité) :

1. **Propriétés du script** (recommandé en production) :
   Éditeur Apps Script → *Paramètres du projet* ⚙️ → *Propriétés du script* → `BLOGGER_API_KEY = <votre clé>`.
2. **Fichier local** `Gscript/secrets.gs` (exclu de Git) — repli pratique en développement.

### Générer une clé API Blogger

1. Console Google Cloud → sélectionner le projet.
2. *APIs et services* → *Bibliothèque* → activer **« Blogger API v3 »**.
3. *Identifiants* → *Créer des identifiants* → *Clé API*.
4. Restreindre la clé : *Restrictions relatives aux API* → **Blogger API v3** uniquement. (Laisser *Restrictions d'application* sur « Aucune » : Apps Script s'exécute depuis des IP Google variables.)

> Si une clé a déjà été exposée, **créez-en une nouvelle et supprimez l'ancienne** (les clés API ne se régénèrent pas en place).

## 7. Checklist de sécurité avant publication publique

- [ ] Aucun fichier `*.json` de compte de service / OAuth n'est suivi par Git.
- [ ] `functions/quick-login.json` et `Gscript/secrets.gs` sont bien ignorés.
- [ ] La clé Web Firebase est restreinte par référents HTTP **et** par APIs (section 2).
- [ ] La clé API Blogger est restreinte à l'API Blogger v3.
- [ ] Toute ancienne clé **secrète** exposée a été supprimée côté Google Cloud.
- [ ] Le client OAuth « Client web 1 » inactif : connu, sans impact (section 3) — laisser tel quel ou supprimer si vous n'utiliserez jamais Google Sign-In.
