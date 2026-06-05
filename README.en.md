<div align="center">

# Alfamous

**Open-source workshop for studying the Quranic codex**

*Search by words, roots and pages · comments on verses and lexicon · forum and blog — the text first.*

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-f7df1e.svg)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-ffca28.svg)](https://firebase.google.com/)

**🌍 Language:** English · [Français](./README.md) · [العربية](./README.ar.md)

</div>

---

## What is Alfamous?

**Alfamous** is an **open-source** web application (GPL v3) for **working with the Quranic text**: searching it, browsing it, adding **comments** on verses and words, and exchanging with other readers.

> 🌐 **Try it online:** [alfamous-amha.web.app](https://alfamous-amha.web.app)  
> 📖 **Manifesto and methodological charter:** [“About” page](https://alfamous-amha.web.app/APropos.html)

![Preview of the Alfamous interface](public/img/Alfamous-UI.jpg)

### At a glance

- **Search** in the codex (words, roots, pages, verse references).
- **Comments** attached to verses or lexicon entries, in the language of your choice.
- **Collective workshop:** forum, notes, articles, media — around the **text**, not institutional authority.

### Our editorial line

- **The text first.** Reading and analysis start from the **Quranic codex**. Hadiths are **not part** of the analytical apparatus (neither as evidence nor as an imposed framework).
- **Open to everyone.** No degree required to read, search, comment, or propose a meaning.
- **A living knowledge base.** “Not a chapel. A worksite.”

---

## Get started

| You want to… | Link |
|---|---|
| Use the application | [alfamous-amha.web.app](https://alfamous-amha.web.app) |
| Read the blog | [blog.alfamous.ca](https://blog.alfamous.ca) |
| Contribute code | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| Report a bug | [Issues](../../issues) |
| Install locally | see [Local installation](#-local-installation) below |

```bash
git clone https://github.com/amhanathali/alfamous.git
cd alfamous
```

---

## Main features

The interface is organized into **panels** *(FR, EN, AR, ES, KAB)*.

### 🔎 Surah search
Choose a **surah (1–114)**, then: 📄 **Warsh** (PDF), 🔊 **Listen** (audio), 📖 **Read** (text).

### 🔎 Verse search
Enter **words** (Arabic or Latin script), a **page number**, or an **aya** (e.g. `3.14`). Verse-by-verse navigation (1 / 1844), toggle **ME** (whole word) / **MC** (contiguous words), search history.

### 🧰 Tools

| | Function |
|---|---|
| 🔁 | **Transliteration** — Arabic ↔ Latin characters |
| ℹ️ | **Help** — transliteration table |
| ↺ | **Reset** — personalized historik (lexicon kept) |
| ☁️⬆️ / ☁️⬇️ | **Export / import Historik** — Firebase Storage |
| 📋 | **Copy selection** — verses to clipboard |
| 🌙 | **Theme** — light / dark |

### ⚙️ Settings
Whole word (**ME**), word order (**MC**), choice of **commentary book**.

### 📚 Cherche — *SAWM module*

| | Function |
|---|---|
| 📖🍃 | **Zoom 0-1-2-3** window (Quran + comments), context-dependent |
| 📖 | **Zoom 0-2-3** window (Zoom-Coran) |
| 📒 | **Zoom 0-3** window (Lexicon) |
| 📕 | Lexical consultation (OpenITI) |

### 🌿 Roots — *SALAT module*

| | Function |
|---|---|
| 📊 | Quranic **root statistics** |
| 🌿 | **Roots of a verse** (e.g. `3.14`) |
| ⚛️ | **Synonymy** — atoms (sounds) and combined roots |
| 🔗 | **Root friends** — co-occurrences in the verse |
| 🧩 | **Inflections** of a root |

*Inspired by the work of Dr Sameer Islambulli.*

### 📤 Share — *CHOKR module*

| | Function |
|---|---|
| 📝 | **My Notes** (private / public) — TTS / STT |
| ✍️ | **My comments** (Lexicon / Quran) |
| 💬 | **Ideas forum** — private and public posts |
| 📚 | **Articles** published on Alfamous |
| 🌐 | **Articles** on [blog.alfamous.ca](https://blog.alfamous.ca) |
| 🗣 | **Anonymous testimonials** (moderated) |
| 💻 | **Digital library** |

### 👥 Visitors
Real-time presence, login, messaging, link sharing, “Like”.

### 🔐 Admin *(level ≥ 3)*
Media, translations, newsletter, users, lexicon.

---

## Ecosystem

| Site | Role |
|---|---|
| [alfamous-amha.web.app](https://alfamous-amha.web.app) | Application (this repository) |
| [blog.alfamous.ca](https://blog.alfamous.ca) | Articles, analyses, perspective |

---

## Who is it for?

Curious readers, students, researchers — **no institutional prerequisites**. Same tools, same standard: **text**, data, verifiable analysis.

---

## Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML, modular CSS, JavaScript, Firebase SDK |
| **Backend** | Cloud Functions (Node.js 20), Express |
| **Data** | Firestore, Firebase Auth, Firebase Storage |
| **Hosting** | Firebase Hosting |

---

## Repository structure

```text
Alfamous/
├── public/              # Frontend (Hosting)
│   ├── jsZC/            # JS modules
│   └── styles/          # Modular CSS
├── functions/           # Cloud Functions
├── Gscript/             # Google Apps Script
├── docs/                # Technical documentation
├── firebase.json
└── firestore.rules
```

---

## Local installation

### Prerequisites

- [Node.js](https://nodejs.org/) **20+**
- [Firebase CLI](https://firebase.google.com/docs/cli)
- Firebase project (for emulators or deployment)

### Steps

```bash
git clone https://github.com/amhanathali/alfamous.git
cd alfamous

cd functions && npm install && cd ..

cp .env.example .env
cp functions/quick-login.example.json functions/quick-login.json
# Fill in secrets locally — never commit them

firebase emulators:start
```

> The `public/` folder can also be served by a static file server for quick tests.

Details: [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) · [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## Configuration & secrets

Sensitive credentials are **not** in the repository. Templates provided: `.env.example`, `functions/quick-login.example.json`, etc.

| Item | Local file (ignored by Git) |
|---|---|
| Google service account | `key.json`, `functions/*-adminsdk-*.json` |
| OAuth client | `functions/client_secret*.json` |
| Quick login (dev) | `functions/quick-login.json` |

> The Firebase Web key in `firebaseConfig.js` is **public by nature**; security relies on Firestore rules and HTTP referrers.

---

## Deployment

```bash
firebase deploy                  # everything
firebase deploy --only hosting   # frontend only
```

On Windows, the `DEPLOYER____.BAT` script chains deployment and Git backup.

---

## License

Code under **[GPL v3](./LICENSE)**. **Content** (Quranic text, translations, lexicons, media) may be under separate licenses — check provenance before reuse.

---

## Documentation

| Document | Contents |
|---|---|
| [Architecture](./docs/ARCHITECTURE.md) | Technical overview |
| [Data model](./docs/DATA-MODEL.md) | Firestore collections |
| [Deployment](./docs/DEPLOYMENT.md) | Firebase go-live |
| [Configuration](./docs/CONFIGURATION.md) | Secrets and variables |
| [Migration](./docs/MIGRATION.md) | New computer setup |
| [Roadmap](./docs/ROADMAP.md) | Planned evolution |

---

## Contributing

Contributions are welcome: code, documentation, usage feedback.

- [CONTRIBUTING.md](./CONTRIBUTING.md) — process and conventions  
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) — community guidelines  
- [CHANGELOG.md](./CHANGELOG.md) — release history

---

## Related projects on GitHub

Repositories close in **roots**, **concordance**, or **morphology**. The *editorial line* column indicates proximity to Alfamous: **Quranic codex first**, no hadith in the analytical apparatus.

| Repository | Link | Proximity | Editorial line |
|-------|------|-----------|------------------|
| **quran-bil-quran** | [R3GENESI5/quran-bil-quran](https://github.com/R3GENESI5/quran-bil-quran) | Concordance, semantic families | **Strong** |
| **quran-search-engine** | [adelpro/quran-search-engine](https://github.com/adelpro/quran-search-engine) | Text / roots / lemmas engine | **Strong** |
| **Mawrid Reader** | [ejtaal/mr](https://github.com/ejtaal/mr) | Arabic concordance, dictionaries | **Strong** |
| **quran (Text-Fabric)** | [q-ran/quran](https://github.com/q-ran/quran) | Morphological corpus | **Corpus** |
| **Quranic Arabic Corpus** | [corpus.quran.com](https://corpus.quran.com/) | Morphology (GPL) | **Resource** |

> Alfamous stands out for the **full workshop** (search + verse comments + forum + blog) and an **explicit methodological charter** in the application.

---

## Author

**Amha NathAli** — [gmpcdz@gmail.com](mailto:gmpcdz@gmail.com)

Civil engineer, Master’s in project management, self-taught programmer since 1993. Tool-assisted study of the Quranic text since 2009.

---

<div align="center">

<sub>“Make the project studyable, verifiable, and preservable by the community.”</sub>

</div>
