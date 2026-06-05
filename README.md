<div align="center">

# Alfamous

**Atelier open source pour étudier le codex coranique**

*Recherche par mots, racines et pages · commentaires sur versets et lexique · forum et blog — le texte d’abord.*

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-f7df1e.svg)](https://developer.mozilla.org/fr/docs/Web/JavaScript)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-ffca28.svg)](https://firebase.google.com/)

**🌍 Langue :** Français · [English](./README.en.md) · [العربية](./README.ar.md)

</div>

---

## Qu’est-ce qu’Alfamous ?

**Alfamous** est une application web **open source** (GPL v3) pour **travailler le texte coranique** : y chercher, le parcourir, y ajouter des **commentaires** sur les versets et les mots, et échanger avec d’autres lecteurs.

> 🌐 **Essayer en ligne :** [alfamous-amha.web.app](https://alfamous-amha.web.app)  
> 📖 **Manifeste et charte méthodologique :** [page « À propos »](https://alfamous-amha.web.app/APropos.html)

![Aperçu de l’interface Alfamous](public/img/Alfamous-UI.jpg)

### En bref

- **Recherche** dans le codex (mots, racines, pages, références de versets).
- **Commentaires** attachés aux versets ou aux entrées du lexique, dans la langue de votre choix.
- **Atelier collectif** : forum, notes, articles, médias — autour du **texte**, pas autour d’une autorité institutionnelle.

### Notre ligne éditoriale

- **Le texte d’abord.** La lecture et l’analyse partent du **codex coranique**. Les hadiths **n’entrent pas** dans l’appareil d’analyse (ni comme preuve, ni comme grille imposée).
- **Ouvert à tous.** Aucun diplôme requis pour lire, chercher, commenter ou proposer un sens.
- **Base vivante.** « Pas une chapelle. Un chantier. »

---

## Démarrer

| Vous voulez… | Lien |
|---|---|
| Utiliser l’application | [alfamous.ca](https://www.alfamous.ca) · [alfamous-amha.web.app](https://alfamous-amha.web.app) |
| Lire le blog | [blog.alfamous.ca](https://blog.alfamous.ca) · [lexique-coran.blogspot.com](https://lexique-coran.blogspot.com/) |
| Contribuer au code | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| Signaler un bug | [Issues](../../issues) |
| Installer en local | voir [Installation locale](#-installation-locale) ci-dessous |

```bash
git clone https://github.com/amhanathali/alfamous.git
cd alfamous
```

---

## Fonctionnalités principales

L’interface est organisée en **panneaux** *(FR, EN, AR, ES, KAB)*.

### 🔎 Recherche Soura
Choisir une **sourate (1–114)**, puis : 📄 **Warsh** (PDF), 🔊 **Écoute** (audio), 📖 **Lis** (lecture du texte).

### 🔎 Recherche de versets
Saisir des **mots** (arabe ou latin), un **n° de page** ou une **aya** (ex. `3.14`). Navigation verset par verset (1 / 1844), bascule **ME** (mot entier) / **MC** (mots contigus), historique des recherches.

### 🧰 Outils

| | Fonction |
|---|---|
| 🔁 | **Translittération** — arabe ↔ caractères latins |
| ℹ️ | **Aide** — tableau de translittération |
| ↺ | **Réinitialiser** — historik personnalisé (lexique conservé) |
| ☁️⬆️ / ☁️⬇️ | **Export / import Historik** — Firebase Storage |
| 📋 | **Copier sélection** — versets dans le presse-papiers |
| 🌙 | **Thème** — clair / sombre |

### ⚙️ Paramètres
Mot entier (**ME**), ordre des mots (**MC**), choix du **livre de commentaires**.

### 📚 Cherche — *module SAWM*

| | Fonction |
|---|---|
| 📖🍃 | Fenêtre **Zoom 0-1-2-3** (Coran + commentaires), selon le contexte |
| 📖 | Fenêtre **Zoom 0-2-3** (Zoom-Coran) |
| 📒 | Fenêtre **Zoom 0-3** (Lexique) |
| 📕 | Consultation lexicale (OpenITI) |

### 🌿 Racines — *module SALAT*

| | Fonction |
|---|---|
| 📊 | **Statistiques** des racines coraniques |
| 🌿 | **Racines d’un verset** (ex. `3.14`) |
| ⚛️ | **Synonymie** — atomes (sons) et racines combinées |
| 🔗 | **Amis de la racine** — cooccurrences dans le verset |
| 🧩 | **Déclinaisons** d’une racine |

*Inspiré des travaux du Dr Sameer Islambulli.*

### 📤 Partage — *module CHOKR*

| | Fonction |
|---|---|
| 📝 | **Mes Notes** (privées / publiques) — TTS / STT |
| ✍️ | **Mes commentaires** (Lexique / Coran) |
| 💬 | **Forum des idées** — publications privées et publiques |
| 📚 | **Articles** publiés sur Alfamous |
| 🌐 | **Articles** sur [blog.alfamous.ca](https://blog.alfamous.ca) · [lexique-coran.blogspot.com](https://lexique-coran.blogspot.com/) |
| 🗣 | **Témoignages** anonymes (modération) |
| 💻 | **Bibliothèque numérique** |

### 👥 Visiteurs
Présence en temps réel, connexion, messagerie, partage de lien, « J’aime ».

### 🔐 Admin *(niveau ≥ 3)*
Médias, traductions, newsletter, utilisateurs, lexique.

---

## Écosystème

| Site | Rôle |
|---|---|
| [alfamous.ca](https://www.alfamous.ca) · [alfamous-amha.web.app](https://alfamous-amha.web.app) | Application (ce dépôt) |
| [blog.alfamous.ca](https://blog.alfamous.ca) · [lexique-coran.blogspot.com](https://lexique-coran.blogspot.com/) | Articles, analyses, mise en perspective |

---

## Pour qui ?

Curieux·ses, étudiant·e·s, chercheur·e·s — **sans prérequis institutionnel**. Même outils, même exigence : **texte**, données, analyses vérifiables.

---

## Pile technique

| Couche | Technologies |
|---|---|
| **Frontend** | HTML, CSS modulaire, JavaScript, Firebase SDK |
| **Backend** | Cloud Functions (Node.js 20), Express |
| **Données** | Firestore, Firebase Auth, Firebase Storage |
| **Hébergement** | Firebase Hosting |

---

## Structure du dépôt

```text
Alfamous/
├── public/              # Frontend (Hosting)
│   ├── jsZC/            # Modules JS
│   └── styles/          # CSS modulaire
├── functions/           # Cloud Functions
├── Gscript/             # Google Apps Script
├── docs/                # Documentation technique
├── firebase.json
└── firestore.rules
```

---

## Installation locale

### Prérequis

- [Node.js](https://nodejs.org/) **20+**
- [Firebase CLI](https://firebase.google.com/docs/cli)
- Projet Firebase (pour émulateurs ou déploiement)

### Étapes

```bash
git clone https://github.com/amhanathali/alfamous.git
cd alfamous

cd functions && npm install && cd ..

cp .env.example .env
cp functions/quick-login.example.json functions/quick-login.json
# Renseigner les secrets localement — ne jamais les committer

firebase emulators:start
```

> Le dossier `public/` peut aussi être servi par un serveur statique pour des tests rapides.

Détails : [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) · [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## Configuration & secrets

Les identifiants sensibles **ne sont pas** dans le dépôt. Modèles fournis : `.env.example`, `functions/quick-login.example.json`, etc.

| Élément | Fichier local (ignoré par Git) |
|---|---|
| Compte de service Google | `key.json`, `functions/*-adminsdk-*.json` |
| OAuth client | `functions/client_secret*.json` |
| Connexion rapide (dev) | `functions/quick-login.json` |

> La clé Web Firebase dans `firebaseConfig.js` est **publique par nature** ; la sécurité repose sur les règles Firestore et les référents HTTP.

---

## Déploiement

```bash
firebase deploy                  # tout
firebase deploy --only hosting   # frontend seul
```

Sur Windows, le script `DEPLOYER____.BAT` enchaîne déploiement et sauvegarde Git.

---

## Licence

Code sous **[GPL v3](./LICENSE)**. Les **contenus** (texte coranique, traductions, lexiques, médias) peuvent relever de licences distinctes — vérifier la provenance avant réutilisation.

---

## Documentation

| Document | Contenu |
|---|---|
| [Architecture](./docs/ARCHITECTURE.md) | Vue d’ensemble technique |
| [Modèle de données](./docs/DATA-MODEL.md) | Collections Firestore |
| [Déploiement](./docs/DEPLOYMENT.md) | Mise en ligne Firebase |
| [Configuration](./docs/CONFIGURATION.md) | Secrets et variables |
| [Migration](./docs/MIGRATION.md) | Nouvel ordinateur |
| [Feuille de route](./docs/ROADMAP.md) | Évolutions prévues |

---

## Contribuer

Les contributions sont les bienvenues : code, documentation, retours d’usage.

- [CONTRIBUTING.md](./CONTRIBUTING.md) — processus et conventions  
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) — cadre de bienveillance  
- [CHANGELOG.md](./CHANGELOG.md) — journal des versions

---

## Projets voisins sur GitHub

Dépôts proches par les **racines**, la **concordance** ou la **morphologie**. La colonne *ligne éditoriale* indique la proximité avec Alfamous : **le codex coranique d’abord**, sans hadith dans l’appareil d’analyse.

| Dépôt | Lien | Proximité | Ligne éditoriale |
|-------|------|-----------|------------------|
| **quran-bil-quran** | [R3GENESI5/quran-bil-quran](https://github.com/R3GENESI5/quran-bil-quran) | Concordance, familles sémantiques | **Forte** |
| **quran-search-engine** | [adelpro/quran-search-engine](https://github.com/adelpro/quran-search-engine) | Moteur texte / racines / lemmes | **Forte** |
| **Mawrid Reader** | [ejtaal/mr](https://github.com/ejtaal/mr) | Concordance arabe, dictionnaires | **Forte** |
| **quran (Text-Fabric)** | [q-ran/quran](https://github.com/q-ran/quran) | Corpus morphologique | **Corpus** |
| **Quranic Arabic Corpus** | [corpus.quran.com](https://corpus.quran.com/) | Morphologie (GPL) | **Ressource** |

> Alfamous se distingue par l’**atelier complet** (recherche + commentaires sur versets + forum + blog) et une **charte méthodologique explicite** dans l’application.

---

## Auteur

**Amha NathAli** — [gmpcdz@gmail.com](mailto:gmpcdz@gmail.com)

Ingénieur civil, Master en gestion de projet, programmeur autodidacte depuis 1993. Recherche outillée du texte coranique depuis 2009.

---

<div align="center">

<sub>« Rendre le projet étudiable, vérifiable et préservable par la communauté. »</sub>

</div>
