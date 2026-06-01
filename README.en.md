<div align="center">

# Alfamous

**Semantic search platform for the Quran**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-f7df1e.svg)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-ffca28.svg)](https://firebase.google.com/)

*Study, explore and preserve the Quranic text through roots, words and meaning.*

**🌍 Language:** English · [Français](./README.md)

</div>

---

## ✨ Overview

**Alfamous** (interface "Zoom-Coran") is an open-source web application dedicated to the **semantic and lexical search of the Quran**. It lets you explore the text by **Arabic roots**, by **words**, by **synonyms**, and cross-reference this data with a reference lexicon (*Maqāyīs al-Lugha* by Ibn Fāris) as well as multilingual translations.

The project is released under the **GPL v3** license so that it can be **studied, improved, verified and preserved over the long term by the community**.

> 🌐 Live demo: `https://alfamous-amha.web.app`

![Preview of the Alfamous interface](public/img/Alfamous-UI.jpg)

## 🌟 What makes Alfamous unique

To our knowledge, Alfamous is **the only application** that brings together, within a single Quranic research space:

- 💬 **Collaborative annotation**: the ability to **add comments** directly **to verses** and to **multilingual expressions** — a feature unprecedented in the field of Quranic research.
- 🔗 **Root ↔ word ↔ meaning cross-referencing**: smooth navigation between Arabic roots, their occurrences in the text, and Ibn Fāris's etymological lexicon.
- 🌍 **A genuinely multilingual approach** (Arabic, French, English, and Kabyle translations), designed for comparative study.

## 🎯 Our vision

Alfamous was conceived as a **common good** serving the study of the Quranic text. By opening it under the GPL v3 license, the goal is to **entrust it to a community** of passionate and talented people who can:

- **study** how the tool works, in full transparency;
- **improve** it and enrich it with new features;
- **verify** the rigor of the data and processing;
- **preserve and widely share** it, beyond its original author.

> Any contribution in this spirit is warmly welcome (see [CONTRIBUTING.md](./CONTRIBUTING.md)).

## 🔑 Key features

- 🔎 **Search by Arabic roots** and by Quranic words
- 📖 **Ibn Fāris lexicon** (Maqāyīs al-Lugha) integrated and searchable
- 🌍 **Multilingual**: French, English, Arabic (and Kabyle translations)
- 🗣️ **Text-to-Speech / Speech-to-Text** for notes
- 💬 Community **forum** (public and private threads)
- ✍️ Moderated **testimonials**
- 📨 **Newsletter** with unsubscribe
- 📎 **Media sharing** and favorites
- ❤️ "Like" counters and real-time presence statistics

## 🧱 Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML, CSS (modular), vanilla JavaScript, Firebase SDK (compat) |
| **Backend** | Firebase Cloud Functions (Node.js 20), Express |
| **Database** | Cloud Firestore |
| **Authentication** | Firebase Auth |
| **Storage** | Firebase Storage |
| **Hosting** | Firebase Hosting |
| **Services** | Google Text-to-Speech / Speech, Nodemailer (SMTP), Google Sheets / Apps Script |

## 📁 Repository structure

```text
Alfamous/
├── public/              # Web app (frontend deployed on Firebase Hosting)
│   ├── jsZC/            # JavaScript modules (search, forum, lexicon, media…)
│   ├── styles/          # Modular stylesheets
│   └── *.html           # Pages (index, contact, about…)
├── functions/           # Firebase Cloud Functions (Node.js backend)
├── Gscript/             # Google Apps Script files (.gs)
├── firebase.json        # Hosting / Functions / Firestore / Storage config
├── firestore.rules      # Firestore security rules
├── storage.rules        # Storage security rules
├── firestore.indexes.json
└── package.json
```

## 🚀 Local setup

### Prerequisites

- [Node.js](https://nodejs.org/) **20+**
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- A Firebase project (for deployment)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/alfamous.git
cd alfamous

# 2. Install backend dependencies
cd functions
npm install
cd ..

# 3. Configure secrets (see the Configuration section)
cp .env.example .env
cp functions/quick-login.example.json functions/quick-login.json

# 4. Run locally (Firebase emulators)
firebase emulators:start
```

> The frontend (`public/`) can also be served by any static file server for development.

## ⚙️ Configuration & secrets

Alfamous requires several credentials that are **never included in the repository** (see `.gitignore`):

| Item | Where to get it | Local file (ignored) |
|---|---|---|
| Google Cloud service account key | Google Cloud Console → Service accounts | `key.json` / `functions/*-adminsdk-*.json` |
| OAuth client secret | Google Cloud Console → Credentials | `functions/client_secret*.json` |
| SMTP & app credentials | `firebase functions:config:set` | (Firebase config) |
| Quick login (dev) | Yourself | `functions/quick-login.json` |

**Templates** are provided: `*.example.json` and `.env.example`. Copy them and fill them in **without ever committing the real versions**.

> 🔒 The Firebase `apiKey` in `firebaseConfig.js` is a **public web key by design** (protected by Firestore rules and domain restriction); it is not a secret.

## ☁️ Deployment

```bash
# Deploy everything (hosting + functions + rules)
firebase deploy

# Or target a specific part
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

## 📜 License

This project is distributed under the **GNU General Public License v3.0**. See the [LICENSE](./LICENSE) file.

### Data and content licensing

⚠️ The **code** is under GPL v3, but the **content** (Quranic text, translations, lexicons, media, fonts) may be subject to separate rights or licenses. Please check the provenance and terms of use of each dataset before any reuse.

## 📚 Documentation

Detailed technical documentation is available in the [`docs/`](./docs/) folder (in French):

- [**Architecture**](./docs/ARCHITECTURE.md) — technical overview (frontend, backend, services).
- [**Data model**](./docs/DATA-MODEL.md) — Firestore collections and their roles.
- [**Deployment**](./docs/DEPLOYMENT.md) — going live on Firebase, step by step.
- [**Configuration**](./docs/CONFIGURATION.md) — secrets, API keys, environment variables.
- [**Migration**](./docs/MIGRATION.md) — reinstalling the project on a new computer.
- [**Roadmap**](./docs/ROADMAP.md) — evolution ideas and contribution opportunities.

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for conventions and the process, and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for the community guidelines.

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## 👤 Author

**Amha NathAli** — gmpcdz@gmail.com

---

<div align="center">
<sub>"Making the project studiable, verifiable and preservable by the community."</sub>
</div>
