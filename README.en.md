<div align="center">

# Alfamous

**FR** · Outils de recherche dans le codex coranique — commentaires sur versets et mots  
**EN** · Research tools in the Quranic codex — comments on verses and words  
**AR** · أدوات البحث في المصحف · تعليقات على الآيات والكلمات  
**ES** · Herramientas en el codex coránico — comentarios en versículos y palabras  
**KAB** · Allalen n unadi deg udlis n Leqran — awalen i wawalen

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-f7df1e.svg)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-ffca28.svg)](https://firebase.google.com/)

*Study, explore and preserve the Quranic text through roots, words and meaning.*

**🌍 Language:** English · [Français](./README.md)

**📌 Positioning:** open-source workshop — **research in the Quranic codex** and **comments** on verses and words — **the text first**; translations and forum as resources, **no hadith in the analytical apparatus**. See the [“About” manifesto](https://alfamous-amha.web.app/APropos.html).

</div>

---

## ✨ Overview

**Alfamous** (interface "Zoom-Coran") is an open-source platform for the **semantic and lexical search of the Quran**. It lets you explore the text by **Arabic roots**, by **words** and by **synonyms**, and cross-reference this data with a reference lexicon (*Maqāyīs al-Lugha* by Ibn Fāris) and multilingual translations.

But Alfamous is much more than a search engine: it is a **collective workshop** to *work* the Book — not merely to consult it.

> 🌐 Live demo: `https://alfamous-amha.web.app` · 📖 [Full manifesto ("About" page)](https://alfamous-amha.web.app/APropos.html)

![Preview of the Alfamous interface](public/img/Alfamous-UI.jpg)

## 🧭 Our approach

- **Open to everyone.** The Quran is not reserved for religious elites: no degree is required to read, search, comment, propose a meaning, open a thread or publish a note. What counts is **the text** — not the title, the authority, or any affiliation.
- **The text first.** As a methodological choice, the reading starts **exclusively from the Quranic text**. Hadiths are not part of the analytical apparatus (neither as evidence, nor authority, nor an imposed grid): a clear line is kept between *what the text says*, *what we measure*, and *what we propose*.
- **A living knowledge base.** This is not a frozen encyclopedia: anyone can enrich the corpus (comments on verses, themes in the lexicon). "Not a chapel. A worksite."
- **Search that connects.** A single word runs, in one pass, through the Quran, the lexicon, the forum, testimonials, articles and media.

## 🌟 What makes Alfamous unique

To our knowledge, Alfamous is **the only application** that brings together, within a single Quranic research space:

- 💬 **Collaborative annotation**: add **comments** directly **to verses** and to **expressions**, in the **language of your choice** — a feature unprecedented in Quranic research.
- 🔗 **Root ↔ word ↔ meaning cross-referencing**, backed by Ibn Fāris's etymological lexicon and root statistics.
- 🌍 **A genuinely multilingual approach** (Arabic, French, English, Spanish, Kabyle), designed for comparative study — with audio listening of verses and surahs.

## 🎯 Our vision

Alfamous was conceived as a **common good** serving the study of the Quranic text. By opening it under the GPL v3 license, the goal is to **entrust it to a community** of passionate and talented people who can:

- **study** how the tool works, in full transparency;
- **improve** it and enrich it with new features;
- **verify** the rigor of the data and processing;
- **preserve and widely share** it, beyond its original author.

> Any contribution — technical, editorial, or spiritual — is warmly welcome (see [CONTRIBUTING.md](./CONTRIBUTING.md)).

## 🔑 Key features

The interface is organized into **panels**, mirrored faithfully below. *(Multilingual UI: FR, EN, AR, ES, KAB; context menu on selection.)*

### 🔎 Surah search
Pick a **surah (1–114)**, then: 📄 **Warsh** (PDF), 🔊 **Listen** (audio), 📖 **Read** (text).

### 🔎 Verse search
Enter **words** (Arabic or Latin), a **page number**, or an **aya** reference (e.g. `3.14`). Verse-by-verse navigation (1 / 1844), **ME** (whole word) / **MC** toggle, search history.

### 🧰 Tools

| | Feature |
|---|---|
| 🔁 | **Transliteration** — Arabic ↔ Latin characters in the search field |
| ℹ️ | **Help** — information and reference table for transliteration |
| ↺ | **Reset** — clear personal history (lexicon kept) |
| ☁️⬆️ | **Export Historik** — to Firebase Storage |
| ☁️⬇️ | **Import Historik** — from Firebase Storage |
| 📋 | **Copy selection** — selected verses to the clipboard |
| 🌙 | **Theme** — light / dark toggle |

### ⚙️ Settings
Whole word (**ME**), word order (**MC**), choice of **tafsir book**.

### 📚 Search — *SAWM module*

| | Feature |
|---|---|
| 📖🍃 | Auto search and **Zoom 0-1-2-3** window (Quran + commentary), depending on context |
| 📖 | Auto search and **Zoom 0-2-3** window (Zoom-Coran), depending on context |
| 📒 | Auto search and **Zoom 0-3** window (Lexicon), depending on context |
| 📕 | **Ibn Fāris lexicon** via OpenITI |

### 🌿 Roots — *SALAT module*

| | Feature |
|---|---|
| 📊 | **Statistics** of Quranic roots |
| 🌿 | **Roots of a verse** (e.g. `3.14`) |
| ⚛️ | **Synonymy** — atoms (sounds) and roots combined in a phrase |
| 🔗 | **Friends of the root** — words in the verse (d=1, if contiguous) |
| 🧩 | **Inflections** of the words of a root |

*Inspired by the work of Dr. Sameer Islambulli.*

### 📤 Share — *CHOKR module*

| | Feature |
|---|---|
| 📝 | **My Notes** (private or public, forum) — Text-to-Speech / Speech-to-Text |
| ✍️ | **My comments** (Lexicon / Quran) |
| 💬 | **Ideas forum** 💡 — private and public posts |
| 📚 | **Articles published on Alfamous** |
| 🌐 | **Articles published on Blogger** ([blog.alfamous.ca](https://blog.alfamous.ca)) |
| 🗣 | **Anonymous testimonials** (moderated) |
| 💻 | **Digital library** |

### 🔐 Admin *(restricted, level ≥ 3)*
Administration tools: **media**, **translations**, **newsletter** (@) with unsubscribe, **user** management, **lexicon**.

### 👥 Visitors
**Real-time presence** statistics (connected · active tabs · cumulative), **login / logout** · ✉️ **Messaging / contact** · 🔗 **Link sharing** · ❤️ **"Like"**.

## 🌐 Ecosystem

The project rests on **two complementary pillars**:

- **[Alfamous.ca](https://www.alfamous.ca)** — the in-text analysis tool (this application).
- **[blog.alfamous.ca](https://blog.alfamous.ca)** — the space for publishing and contextualization (articles, analyses, case studies).

## 👥 Who is it for?

For **anyone** who wants to read the Quran and contribute — curious readers, students, researchers — **with no institutional expertise required**. The same tools uphold the same methodological rigor: text, data, analyses.

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

A civil engineer holding a Master's in project management, and a self-taught programmer since 1993. His tool-assisted research on the Quranic text, started in 2009, gave rise to **Alfamous** (the application) and **blog.alfamous.ca** (the blog).

## 🔍 Keywords (GitHub search)

`quran` · `coran` · `arabic` · `quranic-studies` · `semantic-search` · `concordance` · `arabic-roots` · `morphology` · `ibn-faris` · `maqayis` · `lexicon` · `tafsir` · `text-first` · `open-source` · `firebase` · `javascript` · `zoom-coran`

## 🌐 Related projects on GitHub

Repositories **functionally close** to Alfamous (roots, concordance, morphology). The *editorial line* column reflects proximity to Alfamous methodology: **the Quranic codex alone** as the starting point, with no hadith in the analytical apparatus.

| Repository | Link | Close to Alfamous | Editorial line |
|------------|------|-------------------|----------------|
| **quran-bil-quran** | [R3GENESI5/quran-bil-quran](https://github.com/R3GENESI5/quran-bil-quran) | Root concordance, semantic families, Mufradat / Furuq | **Strong** — “Quran by the Quran”; tafsir as resource, not imposed grid |
| **quran-search-engine** | [adelpro/quran-search-engine](https://github.com/adelpro/quran-search-engine) | TS engine: text, lemmas, roots, semantics (Corpus v4) | **Strong** — text-centric neutral engine |
| **Mawrid Reader** | [ejtaal/mr](https://github.com/ejtaal/mr) | Arabic concordance (CQM), Ibn Fāris Maqāyīs (MML), classical dictionaries | **Strong** — lexical and Quranic concordance tools |
| **quran-arabic-roots-lane-lexicon** | [aliozdenisik/quran-arabic-roots-lane-lexicon](https://github.com/aliozdenisik/quran-arabic-roots-lane-lexicon) | 1,651 roots + Lane + morphology | **Data** — lexical base to cross with Alfamous |
| **quran (Text-Fabric)** | [q-ran/quran](https://github.com/q-ran/quran) | Text + Corpus 0.4 morphology in research format | **Corpus** — academic text foundation |
| **arabic_lexicons** | [wizsk/arabic_lexicons](https://github.com/wizsk/arabic_lexicons) | Maqāyīs, Mufradāt al-Qurʾān (Raghib), GPL-3 | **Lexicons** — offline mobile complement |
| **OpenITI** | [OpenITI](https://github.com/OpenITI) | Ibn Fāris corpus / classical Arabic texts | **Philology** — source cited by Alfamous (Ibn Fāris) |
| **QuranHub API** | [misraj-ai/quranhub](https://github.com/misraj-ai/quranhub) | Morphology, roots, tags API | **Partial** — general-purpose “Islamic apps” backend |
| **Clarus** | [aliozdenisik/Clarus](https://github.com/aliozdenisik/Clarus) | Multi-text RAG (Quran + Bible, etc.) | **Weak** — different scope; hadith bridges elsewhere |

**Foundational resource (off GitHub):** [Quranic Arabic Corpus](https://corpus.quran.com/) (morphology, GPL) — used by many projects above.

> Alfamous stands out as a **full workshop** (search + verse annotations + forum + blog + media) with an **explicit methodological charter**: measurable text, open proposals, hadiths outside the apparatus.

## 🚀 Going public on GitHub

When you switch the repository to **Public** (`Settings → General → Change visibility`), fill in **About**:

| Field | Suggested value |
|-------|-----------------|
| **Description** | Copy the **FR · AR · EN** line from [`.github/ABOUT-DESCRIPTION.txt`](./.github/ABOUT-DESCRIPTION.txt) |
| **Website** | `https://alfamous-amha.web.app` |
| **Topics** | `quran` `coran` `codex` `arabic` `semantic-search` `quranic-studies` `concordance` `commentary` `firebase` `javascript` `open-source` |

**About description (FR · AR · EN — one line, ≤350 chars):**

```text
FR: Outils de recherche dans le codex coranique · commentaires sur versets et mots | EN: Research tools in the Quranic codex · comments on verses and words | AR: أدوات البحث في المصحف · تعليقات على الآيات والكلمات
```

Add a **Social preview** (1280×640): logo + “Alfamous — Quran semantic search · text first”.

---

<div align="center">
<sub>"Making the project studiable, verifiable and preservable by the community."</sub>
</div>
