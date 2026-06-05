<div align="center" dir="rtl">

# Alfamous

**ورشة مفتوحة المصدر لدراسة المصحف**

*بحث بالكلمات والجذور والصفحات · تعليقات على الآيات والمعجم · منتدى ومدونة — النص أولاً.*

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-f7df1e.svg)](https://developer.mozilla.org/ar/docs/Web/JavaScript)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-ffca28.svg)](https://firebase.google.com/)

**🌍 اللغة:** العربية · [Français](./README.md) · [English](./README.en.md)

</div>

---

<div dir="rtl">

## ما هو Alfamous؟

**Alfamous** تطبيق ويب **مفتوح المصدر** (GPL v3) **للعمل على النص القرآني**: البحث فيه، تصفّحه، إضافة **تعليقات** على الآيات والكلمات، والتبادل مع قرّاء آخرين.

> 🌐 **جرّبه على الإنترنت:** [alfamous-amha.web.app](https://alfamous-amha.web.app)  
> 📖 **البيان والمنهج:** [صفحة « عن المشروع »](https://alfamous-amha.web.app/APropos.html)

![معاينة واجهة Alfamous](public/img/Alfamous-UI.jpg)

### باختصار

- **بحث** في المصحف (كلمات، جذور، صفحات، مراجع الآيات).
- **تعليقات** مرفقة بالآيات أو مداخل المعجم، باللغة التي تختارها.
- **ورشة جماعية:** منتدى، ملاحظات، مقالات، وسائط — حول **النص**، لا حول سلطة مؤسسية.

### خطنا التحريري

- **النص أولاً.** القراءة والتحليل ينطلقان من **المصحف**. الأحاديث **لا تدخل** في جهاز التحليل (لا كدليل ولا كإطار مفروض).
- **مفتوح للجميع.** لا شهادة مطلوبة للقراءة أو البحث أو التعليق أو اقتراح معنى.
- **قاعدة حيّة.** « ليست كنيسة. ورشة بناء. »

---

## البدء

| تريد… | الرابط |
|---|---|
| استخدام التطبيق | [alfamous-amha.web.app](https://alfamous-amha.web.app) |
| قراءة المدونة | [blog.alfamous.ca](https://blog.alfamous.ca) |
| المساهمة في الكود | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| الإبلاغ عن خلل | [Issues](../../issues) |
| التثبيت محلياً | انظر [التثبيت المحلي](#-التثبيت-المحلي) أدناه |

```bash
git clone https://github.com/amhanathali/alfamous.git
cd alfamous
```

---

## الوظائف الرئيسية

الواجهة منظّمة في **لوحات** *(FR, EN, AR, ES, KAB)*.

### 🔎 بحث السورة
اختر **سورة (1–114)**، ثم: 📄 **ورش** (PDF)، 🔊 **استماع** (صوت)، 📖 **اقرأ** (النص).

### 🔎 بحث الآيات
أدخل **كلماتاً** (عربية أو لاتينية)، **رقم صفحة**، أو **آية** (مثلاً `3.14`). تنقل آية بآية (1 / 1844)، تبديل **ME** (كلمة كاملة) / **MC** (كلمات متجاورة)، سجل البحث.

### 🧰 أدوات

| | الوظيفة |
|---|---|
| 🔁 | **Translittération** — عربي ↔ حروف لاتينية |
| ℹ️ | **مساعدة** — جدول التحويل الصوتي |
| ↺ | **إعادة ضبط** — historik مخصّص (المعجم محفوظ) |
| ☁️⬆️ / ☁️⬇️ | **تصدير / استيراد Historik** — Firebase Storage |
| 📋 | **نسخ التحديد** — آيات إلى الحافظة |
| 🌙 | **السمة** — فاتح / داكن |

### ⚙️ إعدادات
كلمة كاملة (**ME**)، ترتيب الكلمات (**MC**)، اختيار **كتاب التفسير/التعليق**.

### 📚 Cherche — *وحدة SAWM*

| | الوظيفة |
|---|---|
| 📖🍃 | نافذة **Zoom 0-1-2-3** (قرآن + تعليقات)، حسب السياق |
| 📖 | نافذة **Zoom 0-2-3** (Zoom-Coran) |
| 📒 | نافذة **Zoom 0-3** (المعجم) |
| 📕 | استشارة معجمية (OpenITI) |

### 🌿 Racines — *وحدة SALAT*

| | الوظيفة |
|---|---|
| 📊 | **إحصائيات** الجذور القرآنية |
| 🌿 | **جذور آية** (مثلاً `3.14`) |
| ⚛️ | **ترادف** — ذرّات (أصوات) وجذور مركّبة |
| 🔗 | **أصدقاء الجذر** — التواجد المشترك في الآية |
| 🧩 | **اشتقاقات** جذر |

*مستوحى من أعمال الدكتور Sameer Islambulli.*

### 📤 Partage — *وحدة CHOKR*

| | الوظيفة |
|---|---|
| 📝 | **ملاحظاتي** (خاصة / عامة) — TTS / STT |
| ✍️ | **تعليقاتي** (المعجم / القرآن) |
| 💬 | **منتدى الأفكار** — منشورات خاصة وعامة |
| 📚 | **مقالات** منشورة على Alfamous |
| 🌐 | **مقالات** على [blog.alfamous.ca](https://blog.alfamous.ca) |
| 🗣 | **شهادات** مجهولة (إشراف) |
| 💻 | **مكتبة رقمية** |

### 👥 Visiteurs
حضور فوري، اتصال، مراسلة، مشاركة رابط، « أعجبني ».

### 🔐 Admin *(مستوى ≥ 3)*
وسائط، ترجمات، نشرة بريدية، مستخدمون، معجم.

---

## المنظومة

| الموقع | الدور |
|---|---|
| [alfamous-amha.web.app](https://alfamous-amha.web.app) | التطبيق (هذا المستودع) |
| [blog.alfamous.ca](https://blog.alfamous.ca) | مقالات، تحليلات، سياق |

---

## لمن؟

المتسائلون، الطلاب، الباحثون — **بلا متطلبات مؤسسية**. نفس الأدوات، نفس المنهج: **النص**، البيانات، تحليلات قابلة للتحقق.

---

## التقنيات

| الطبقة | التقنيات |
|---|---|
| **الواجهة** | HTML، CSS معياري، JavaScript، Firebase SDK |
| **الخادم** | Cloud Functions (Node.js 20)، Express |
| **البيانات** | Firestore، Firebase Auth، Firebase Storage |
| **الاستضافة** | Firebase Hosting |

---

## هيكل المستودع

```text
Alfamous/
├── public/              # الواجهة (Hosting)
│   ├── jsZC/            # وحدات JS
│   └── styles/          # CSS معياري
├── functions/           # Cloud Functions
├── Gscript/             # Google Apps Script
├── docs/                # توثيق تقني
├── firebase.json
└── firestore.rules
```

---

## التثبيت المحلي

### المتطلبات

- [Node.js](https://nodejs.org/) **20+**
- [Firebase CLI](https://firebase.google.com/docs/cli)
- مشروع Firebase (للمحاكيات أو النشر)

### الخطوات

```bash
git clone https://github.com/amhanathali/alfamous.git
cd alfamous

cd functions && npm install && cd ..

cp .env.example .env
cp functions/quick-login.example.json functions/quick-login.json
# املأ الأسرار محلياً — لا ترفعها أبداً إلى Git

firebase emulators:start
```

> مجلد `public/` يمكن أيضاً تقديمه عبر خادم ملفات ثابتة للاختبار السريع.

التفاصيل: [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) · [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## الإعداد والأسرار

بيانات الاعتماد الحساسة **ليست** في المستودع. نماذج متوفرة: `.env.example`، `functions/quick-login.example.json`، إلخ.

| العنصر | ملف محلي (مستثنى من Git) |
|---|---|
| حساب خدمة Google | `key.json`، `functions/*-adminsdk-*.json` |
| عميل OAuth | `functions/client_secret*.json` |
| دخول سريع (تطوير) | `functions/quick-login.json` |

> مفتاح Firebase Web في `firebaseConfig.js` **عام بطبيعته**؛ الأمان يعتمد على قواعد Firestore ومراجع HTTP.

---

## النشر

```bash
firebase deploy                  # الكل
firebase deploy --only hosting   # الواجهة فقط
```

على Windows، سكربت `DEPLOYER____.BAT` يربط النشر بنسخ Git احتياطي.

---

## الترخيص

الكود تحت **[GPL v3](./LICENSE)**. **المحتويات** (النص القرآني، الترجمات، المعاجم، الوسائط) قد تخضع لتراخيص أخرى — تحقق من المصدر قبل إعادة الاستخدام.

---

## التوثيق

| المستند | المحتوى |
|---|---|
| [Architecture](./docs/ARCHITECTURE.md) | نظرة تقنية عامة |
| [Data model](./docs/DATA-MODEL.md) | مجموعات Firestore |
| [Deployment](./docs/DEPLOYMENT.md) | النشر على Firebase |
| [Configuration](./docs/CONFIGURATION.md) | الأسرار والمتغيرات |
| [Migration](./docs/MIGRATION.md) | جهاز جديد |
| [Roadmap](./docs/ROADMAP.md) | التطورات المخططة |

---

## المساهمة

المساهمات مرحّب بها: كود، توثيق، ملاحظات الاستخدام.

- [CONTRIBUTING.md](./CONTRIBUTING.md) — العملية والاتفاقيات  
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) — إطار التعامل  
- [CHANGELOG.md](./CHANGELOG.md) — سجل الإصدارات

---

## مشاريع مجاورة على GitHub

مستودعات قريبة في **الجذور** أو **الفهرسة** أو **الصرف**. عمود *الخط التحريري* يبيّن القرب من Alfamous: **المصحف أولاً**، بلا أحاديث في جهاز التحليل.

| المستودع | الرابط | القرب | الخط التحريري |
|-------|------|-----------|------------------|
| **quran-bil-quran** | [R3GENESI5/quran-bil-quran](https://github.com/R3GENESI5/quran-bil-quran) | فهرسة، عائلات دلالية | **قوي** |
| **quran-search-engine** | [adelpro/quran-search-engine](https://github.com/adelpro/quran-search-engine) | محرك نص / جذور / lemmas | **قوي** |
| **Mawrid Reader** | [ejtaal/mr](https://github.com/ejtaal/mr) | فهرسة عربية، معاجم | **قوي** |
| **quran (Text-Fabric)** | [q-ran/quran](https://github.com/q-ran/quran) | corpus صرفي | **Corpus** |
| **Quranic Arabic Corpus** | [corpus.quran.com](https://corpus.quran.com/) | صرف (GPL) | **مورد** |

> Alfamous يتميّز **بالورشة الكاملة** (بحث + تعليقات على الآيات + منتدى + مدونة) و**بمنهج صريح** داخل التطبيق.

---

## المؤلف

**Amha NathAli** — [gmpcdz@gmail.com](mailto:gmpcdz@gmail.com)

مهندس مدني، ماجستير في إدارة المشاريع، مبرمج ذاتي منذ 1993. بحث منهجي في النص القرآني منذ 2009.

---

<div align="center">

<sub>« أن يصبح المشروع قابلاً للدراسة والتحقق والحفظ من قبل المجتمع. »</sub>

</div>

</div>
