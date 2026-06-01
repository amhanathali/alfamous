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

**Restriction recommandée** (Console Google Cloud → *Identifiants* → la clé Web) :
- *Restrictions d'application* → **Référents HTTP**, par ex. :
  - `alfamous-amha.web.app/*`
  - `alfamous-amha.firebaseapp.com/*`
  - `alfamous.ca/*`
  - `*.alfamous.ca/*`

## 3. Configuration des Cloud Functions (SMTP, newsletter)

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

## 4. Variables d'environnement (`.env`)

| Variable | Rôle |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | Chemin local vers la clé de compte de service |
| `FIREBASE_STORAGE_BUCKET` / `GCLOUD_STORAGE_BUCKET` | Bucket de stockage utilisé par le TTS |

## 5. Clé API Blogger (Google Apps Script)

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

## 6. Checklist de sécurité avant publication publique

- [ ] Aucun fichier `*.json` de compte de service / OAuth n'est suivi par Git.
- [ ] `functions/quick-login.json` et `Gscript/secrets.gs` sont bien ignorés.
- [ ] La clé Web Firebase est restreinte par référents HTTP.
- [ ] La clé API Blogger est restreinte à l'API Blogger v3.
- [ ] Toute ancienne clé exposée a été supprimée côté Google Cloud.
