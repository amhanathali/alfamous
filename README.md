<div align="center">

# Alfamous

**Plateforme de recherche sémantique du Coran**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-f7df1e.svg)](https://developer.mozilla.org/fr/docs/Web/JavaScript)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-ffca28.svg)](https://firebase.google.com/)

*Étudier, explorer et préserver le texte coranique par la racine, le mot et le sens.*

**🌍 Langue :** Français · [English](./README.en.md)

</div>

---

## ✨ Présentation

**Alfamous** (interface « Zoom-Coran ») est une application web open source dédiée à la **recherche sémantique et lexicale du Coran**. Elle permet d'explorer le texte par **racines arabes**, par **mots**, par **synonymes** et de croiser ces données avec un lexique de référence (*Maqāyīs al-Lugha* d'Ibn Fāris) ainsi que des traductions multilingues.

Le projet est publié sous licence **GPL v3** afin qu'il puisse être **étudié, amélioré, vérifié et préservé sur le long terme par la communauté**.

> 🌐 Démo en ligne : `https://alfamous-amha.web.app`

![Aperçu de l'interface Alfamous](public/img/Alfamous-UI.jpg)

## 🌟 Ce qui rend Alfamous unique

À notre connaissance, Alfamous est **la seule application** qui réunit, dans un même espace de recherche coranique :

- 💬 **L'annotation collaborative** : la possibilité d'**ajouter des commentaires** directement **aux versets** et à des **expressions multilingues** — une fonctionnalité inédite dans le domaine de la recherche coranique.
- 🔗 **Le croisement racine ↔ mot ↔ sens** : navigation fluide entre les racines arabes, leurs occurrences dans le texte, et le lexique étymologique d'Ibn Fāris.
- 🌍 **Une approche réellement multilingue** (arabe, français, anglais, et traductions kabyles), pensée pour l'étude comparée.

## 🎯 Notre vision

Alfamous a été conçu comme un **bien commun** au service de l'étude du texte coranique. En l'ouvrant sous licence GPL v3, l'objectif est de **le confier à une communauté** de passionné·e·s et de professionnel·le·s talentueux qui pourront :

- **étudier** le fonctionnement de l'outil en toute transparence ;
- **l'améliorer** et l'enrichir de nouvelles fonctionnalités ;
- **vérifier** la rigueur des données et des traitements ;
- **le préserver et le diffuser largement**, au-delà de son auteur initial.

> Toute contribution allant dans ce sens est chaleureusement bienvenue (voir [CONTRIBUTING.md](./CONTRIBUTING.md)).

## 🔑 Fonctionnalités principales

- 🔎 **Recherche par racines** arabes et par mots du Coran
- 📖 **Lexique Ibn Fāris** (Maqāyīs al-Lugha) intégré et consultable
- 🌍 **Multilingue** : français, anglais, arabe (et traductions kabyles)
- 🗣️ **Synthèse et reconnaissance vocale** (Text-to-Speech / Speech-to-Text) pour les notes
- 💬 **Forum** communautaire (fils publics et privés)
- ✍️ **Témoignages** modérés
- 📨 **Newsletter** avec désabonnement
- 📎 **Partage de médias** et favoris
- ❤️ Compteurs « J'aime » et statistiques de présence en temps réel

## 🧱 Pile technique

| Couche | Technologies |
|---|---|
| **Frontend** | HTML, CSS (modulaire), JavaScript « vanilla », Firebase SDK (compat) |
| **Backend** | Firebase Cloud Functions (Node.js 20), Express |
| **Base de données** | Cloud Firestore |
| **Authentification** | Firebase Auth |
| **Stockage** | Firebase Storage |
| **Hébergement** | Firebase Hosting |
| **Services** | Google Text-to-Speech / Speech, Nodemailer (SMTP), Google Sheets / Apps Script |

## 📁 Structure du dépôt

```text
Alfamous/
├── public/              # Application web (frontend déployé sur Firebase Hosting)
│   ├── jsZC/            # Modules JavaScript (recherche, forum, lexique, médias…)
│   ├── styles/          # Feuilles de style modulaires
│   └── *.html           # Pages (index, contact, à propos…)
├── functions/           # Cloud Functions Firebase (backend Node.js)
├── Gscript/             # Scripts Google Apps Script (.gs)
├── firebase.json        # Configuration Hosting / Functions / Firestore / Storage
├── firestore.rules      # Règles de sécurité Firestore
├── storage.rules        # Règles de sécurité Storage
├── firestore.indexes.json
└── package.json
```

## 🚀 Installation locale

### Prérequis

- [Node.js](https://nodejs.org/) **20+**
- [Firebase CLI](https://firebase.google.com/docs/cli) : `npm install -g firebase-tools`
- Un projet Firebase (pour le déploiement)

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/<votre-utilisateur>/alfamous.git
cd alfamous

# 2. Installer les dépendances du backend
cd functions
npm install
cd ..

# 3. Configurer les secrets (voir la section Configuration)
cp .env.example .env
cp functions/quick-login.example.json functions/quick-login.json

# 4. Lancer en local (émulateurs Firebase)
firebase emulators:start
```

> Le frontend (`public/`) peut aussi être servi par n'importe quel serveur de fichiers statiques pour le développement.

## ⚙️ Configuration & secrets

Alfamous nécessite plusieurs identifiants qui **ne sont jamais inclus dans le dépôt** (voir `.gitignore`) :

| Élément | Où l'obtenir | Fichier local (ignoré) |
|---|---|---|
| Clé de compte de service Google Cloud | Console Google Cloud → Comptes de service | `key.json` / `functions/*-adminsdk-*.json` |
| Secret client OAuth | Console Google Cloud → Identifiants | `functions/client_secret*.json` |
| Identifiants SMTP & app | `firebase functions:config:set` | (config Firebase) |
| Connexion rapide (dev) | Vous-même | `functions/quick-login.json` |

Des **modèles** sont fournis : `*.example.json` et `.env.example`. Copiez-les et remplissez-les **sans jamais committer les versions réelles**.

> 🔒 La clé `apiKey` Firebase présente dans `firebaseConfig.js` est une **clé Web publique par nature** (protégée par les règles Firestore et la restriction de domaine), ce n'est pas un secret.

## ☁️ Déploiement

```bash
# Déployer tout (hosting + functions + règles)
firebase deploy

# Ou cibler une partie
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

## 📜 Licence

Ce projet est distribué sous licence **GNU General Public License v3.0**. Voir le fichier [LICENSE](./LICENSE).

### Licence des données et contenus

⚠️ Le **code** est sous GPL v3, mais les **contenus** (texte coranique, traductions, lexiques, médias, polices) peuvent relever de droits ou licences distincts. Merci de vérifier la provenance et les conditions d'utilisation de chaque jeu de données avant toute réutilisation.

## 📚 Documentation

Une documentation technique détaillée est disponible dans le dossier [`docs/`](./docs/) :

- [**Architecture**](./docs/ARCHITECTURE.md) — vue d'ensemble technique (frontend, backend, services).
- [**Modèle de données**](./docs/DATA-MODEL.md) — collections Firestore et leur rôle.
- [**Déploiement**](./docs/DEPLOYMENT.md) — mise en ligne sur Firebase, pas à pas.
- [**Configuration**](./docs/CONFIGURATION.md) — secrets, clés API, variables d'environnement.
- [**Migration**](./docs/MIGRATION.md) — réinstaller le projet sur un nouvel ordinateur.
- [**Feuille de route**](./docs/ROADMAP.md) — pistes d'évolution et idées de contribution.

## 🤝 Contribuer

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](./CONTRIBUTING.md) pour les conventions et le processus, et [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) pour le cadre de bienveillance.

## 📝 Journal des modifications

Voir [CHANGELOG.md](./CHANGELOG.md).

## 👤 Auteur

**Amha NathAli** — gmpcdz@gmail.com

---

<div align="center">
<sub>« Rendre le projet étudiable, vérifiable et préservable par la communauté. »</sub>
</div>
