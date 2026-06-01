//<script>
function msgHelpAPropos() {
  // --- Langue UI (fallback FR) ---
  const lang = (localStorage.getItem("uiLang") || "fr").toLowerCase();
  const L = (obj) => obj[lang] ?? obj.fr;

  // --- Version (fallbacks robustes) ---
  let numVersion = (typeof numVersionActuelle !== "undefined" && numVersionActuelle) ? numVersionActuelle : "0.0.0";
  let dateVersion = "";
  try {
    if (typeof fTabDateVersion === "function") {
      const v = fTabDateVersion()[0]; // [numVersion, date]
      if (v && v.length >= 2) {
        numVersion = v[0] || numVersion;
        dateVersion = v[1] || dateVersion;
      }
    }
  } catch (e) { /* ignore */ }

  // --- Sessions (fallback 0) ---
  //const sessionsCount = (typeof activeSessions !== "undefined") ? activeSessions : 0;

  // --- Dictionnaires ---
  const TXT = {
    app: { fr: "Application Web", en: "Web application", ar: "تطبيق ويب", es: "Aplicación web", kab: "Asnas Web" },
    modules: { fr: "Modules", en: "Modules", ar: "الوحدات", es: "Módulos", kab: "Izegrar" },
    modulesVal: { fr: "Zoom-Coran & Lexique", en: "Zoom-Quran & Lexicon", ar: "زووم-قرآن والقاموس", es: "Zoom-Corán y Léxico", kab: "Zoom-Leqran & Amawal" },
    version: { fr: "Version", en: "Version", ar: "الإصدار", es: "Versión", kab: "Lqem" },
    rights: { fr: "Droits", en: "Rights", ar: "الحقوق", es: "Derechos", kab: "Izrfan" },
    rightsVal: { fr: "© Amha Nathali, 2009–2026", en: "© Amha Nathali, 2009–2026", ar: "© أمحى ناتالي، 2009–2026", es: "© Amha Nathali, 2009–2026", kab: "© Amha Nathali, 2009–2026" },
    project: { fr: "Projet", en: "Project", ar: "المشروع", es: "Proyecto", kab: "Aseglem" },
    projectVal: { fr: "Open Source", en: "Open Source", ar: "مفتوح المصدر", es: "Código abierto", kab: "Aɣrum yeldin" },
    toolsFor: { fr: "Outils pour", en: "Tools for", ar: "أدوات لـ", es: "Herramientas para", kab: "Ifecka i" },
    toolsVal: { fr: "chercheurs et commentateurs du Coran", en: "Quran researchers and commentators", ar: "الباحثين ومعلّقي القرآن", es: "investigadores y comentaristas del Corán", kab: "imnuḍen d imlal-n Leqran" },
    about: { fr: "À propos", en: "About", ar: "حول", es: "Acerca de", kab: "Ɣef" },
    sessions: { fr: "", en: "", ar: "-10-2025:", es: "", kab: "" },
    openAboutPage: {
      fr: "Ouvrir la page « À propos du projet »…",
      en: "Open the “About the project” page…",
      ar: "فتح صفحة « حول المشروع »…",
      es: "Abrir la página « Acerca del proyecto »…",
      kab: "Ldi taɣrift « Ɣef usenfar »…"
    }
  };

  const INSTALL = {
    ios: {
      fr: "Pour installer cette application :<br>1) Touchez l’icône « Partager »<br>2) Sélectionnez « Ajouter à l’écran d’accueil ». ",
      en: "To install this app:<br>1) Tap the “Share” icon<br>2) Select “Add to Home Screen”.",
      ar: "لتثبيت هذا التطبيق:<br>1) اضغط على أيقونة «المشاركة»<br>2) اختر «إضافة إلى الشاشة الرئيسية».",
      es: "Para instalar esta aplicación:<br>1) Toca el icono «Compartir»<br>2) Selecciona «Añadir a la pantalla de inicio».",
      kab: "Isebded n usnas-agi:<br>1) Senned ɣef tignit «Bḍu»<br>2) Fren «Rnu ɣer ugdil agejdan»."
    },
    android: {
      fr: "Pour installer cette application :<br>1) Touchez les trois points en haut à droite<br>2) Sélectionnez « Ajouter à l’écran d’accueil ». ",
      en: "To install this app:<br>1) Tap the three dots (top-right)<br>2) Select “Add to Home Screen”.",
      ar: "لتثبيت هذا التطبيق:<br>1) اضغط على النقاط الثلاث في الأعلى يمينًا<br>2) اختر «إضافة إلى الشاشة الرئيسية».",
      es: "Para instalar esta aplicación:<br>1) Toca los tres puntos arriba a la derecha<br>2) Selecciona «Añadir a la pantalla de inicio».",
      kab: "Isebded n usnas-agi:<br>1) Senned ɣef kraḍ n yiceḍ (afelqi afella ayeffus)<br>2) Fren «Rnu ɣer ugdil agejdan»."
    },
    desktop: {
      fr: "Pour installer cette application sur votre bureau :<br>1) Cliquez sur les trois points en haut à droite<br>2) « Plus d’outils » → « Créer un raccourci ». ",
      en: "To install this app on your desktop:<br>1) Click the three dots (top-right)<br>2) “More tools” → “Create shortcut”.",
      ar: "لتثبيت هذا التطبيق على سطح المكتب:<br>1) انقر على النقاط الثلاث أعلى اليمين<br>2) «المزيد من الأدوات» → «إنشاء اختصار».",
      es: "Para instalar esta aplicación en el escritorio:<br>1) Haz clic en los tres puntos arriba a la derecha<br>2) «Más herramientas» → «Crear acceso directo».",
      kab: "Isebded ɣef tnarit n uselkim:<br>1) Sit ɣef kraḍ n yiceḍ (afelqi afella ayeffus)<br>2) «Ifecka-nniḍen» → «Rnu abrid ugrus»."
    }
  };

  // --- Direction ---
  const dir = (lang === "ar") ? "rtl" : "ltr";
  const align = (lang === "ar") ? "right" : "left";

  // --- Construction HTML ---
  const textVersion = `
    <div style="line-height:1.6; font-size:16px; text-align:${align};" dir="${dir}">
      <i class="fas fa-globe" style="color:green;"></i>
      <strong>${L(TXT.app)} :</strong>
      <a href="https://www.Alfamous.ca" target="_blank" rel="noopener">www.Alfamous.ca</a><br>

      <i class="fas fa-puzzle-piece" style="color:#555;"></i>
      <strong>${L(TXT.modules)} :</strong> ${L(TXT.modulesVal)}<br>

      <i class="fas fa-code-branch" style="color:#444;"></i>
      <strong>${L(TXT.version)} :</strong> #${numVersion}${dateVersion ? " – " + dateVersion : ""}<br>

      <i class="fas fa-copyright" style="color:#999;"></i>
      <strong>${L(TXT.rights)} :</strong> ${L(TXT.rightsVal)}<br>

      <i class="fas fa-unlock-alt" style="color:#007BFF;"></i>
      <strong>${L(TXT.project)} :</strong> ${L(TXT.projectVal)}<br>

      <i class="fas fa-tools" style="color:#B5651D;"></i>
      <strong>${L(TXT.toolsFor)} :</strong> ${L(TXT.toolsVal)}<br><br>

      <div style="margin-top:10px;">
        <strong>${L({
          fr: "À propos du projet Alfamous",
          en: "About the Alfamous project",
          ar: "حول مشروع ألفاموس",
          es: "Acerca del proyecto Alfamous",
          kab: "Ɣef usenfar Alfamous"
        })}</strong>
      </div>
      <p style="margin:10px 0 0; font-size:15px;">
        <a href="APropos.html"
          onclick="if (typeof ouvrirPopupHtml === 'function') { ouvrirPopupHtml('APropos.html'); return false; }"
          style="color:#0d9488; font-weight:600; text-decoration:underline;">
          <i class="fas fa-external-link-alt" style="margin-right:6px;" aria-hidden="true"></i>${L(TXT.openAboutPage)}
        </a>
      </p>
    </div>
  `;

  const msgSessions = `${L(TXT.sessions)} `;//visiteurs depuis 1 octobre 2025

  const content = `
    <div style="text-align:${align};" dir="${dir}">
      ${textVersion}
      ${msgSessions}
    </div>
  `;

  // Injection dans ta variable globale (comme avant)
  //window.contentHelp = content;
  return content;
}
//</script>






//<script>
/* ===== Icônes (ordre: 2 SAWM, 5 SALAT, 5 CHOKR) ===== */
const ICONS_HTML = [
  // SAWM (1–2)
  '<span class="feat-emoji">📖</span>',                                      // 1) Coran/tafsir
  '<span class="feat-emoji">📒</span>',                                      // 2) Lexique + Alfamous@EveryOne

  // SALAT (3–7)
  '<span class="feat-emoji">📖 🌿</span>',                                   // 3) Racines + fallback SAWM
  '<span class="feat-emoji">📊</span>',                                      // 4) Stats des racines
  '<span class="feat-emoji">⚛️</span>',                                      // 5) Analyse/palindrome
  '<i class="fas fa-link" aria-hidden="true"></i>',                          // 6) Amis de la racine (cooccurrence)
  '<span class="feat-emoji">🧩</span>',                                      // 7) Dérivations

  // CHOKR (8–12)
  '<i class="fas fa-envelope icon-small"></i>&nbsp;&nbsp;',                              // 8) Messagerie
  '<i class="fas fa-laptop icon-small"></i>&nbsp;&nbsp;',                                // 9) Partage médias
  ' 📚&nbsp;',        // 10) Articles + recherche
  '<i class="fas fa-comment-alt icon-small"></i>&nbsp;&nbsp;',                           // 11) Forum d’idées
  '<span class="feat-emoji">✍️</span>'                                       // 12) Contribution
];

/* Rendu d'une liste avec icônes (items = tableaux HTML localisés) */
function renderIconList(items, startIdx = 0) {
  const lis = (items || []).map((html, i) => {
    const icon = ICONS_HTML[startIdx + i] || '';
    const box = `<span class="feat-iconBox">${icon}</span>`;
    return `<li class="feat-item">${box}<span>${html}</span></li>`;
  }).join('');
  return `<ul class="feat-list">${lis}</ul>`;
}





/* ===== Aide Modules : SAWM • SALAT • CHOKR ===== */

function msgHelpTransliteration() {
  // Langue + helpers
  const lang = (localStorage.getItem("uiLang") || "fr").toLowerCase();
  const L = (o) => (o && (o[lang] ?? o.fr)) || "";
  const dir = (lang === "ar") ? "rtl" : "ltr";
  const align = (lang === "ar") ? "right" : "left";
  const VERSE_AR = "فَٱذْكُرُونِىٓ أَذْكُرْكُمْ وَٱشْكُرُوا۟ لِى وَلَا تَكْفُرُونِ";

  // Rendu d'une table de translittération (utilise translationDict + significationSonSelonSamirIslambulli)
  function renderTranslitTableLocal(dict) {
    const d = dict && typeof dict === 'object' ? dict : {};
    const esc = (t) => String(t)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const isArabicChar = (ch) => /[\u0600-\u06FF]/.test(ch) && ch.trim() !== '';

    // Dictionnaire des significations (global, fourni par le fichier public)
    const MEANINGS = (typeof window !== "undefined" && window.significationSonSelonSamirIslambulli)
      ? window.significationSonSelonSamirIslambulli
      : null;

    const rows = Object.entries(d).map(([ar, list]) => {
      const chips = (list || [])
        .map(s => `<span class="chip">${esc(s)}</span>`)
        .join(' ');

      const arEsc = esc(ar);
      const iconBtn = isArabicChar(ar)
        ? `<button type="button"
                 class="speak-btn"
                 data-letter="${arEsc}"
                 onclick="lireTexte(this.dataset.letter, 'ar', 1.0)"
                 title="${L({ fr: 'Écouter', en: 'Listen', ar: 'استمع', es: 'Escuchar', kab: 'Sel' })}">
           🔊
         </button>`
        : '';

      // Récupérer la signification (langue UI) si disponible
      let meaning = "";
      if (MEANINGS && MEANINGS[ar]) {
        // MEANINGS[ar] est un objet {fr,en,ar,es,kab}
        meaning = L(MEANINGS[ar]) || "";
      }
      const meaningEsc = esc(meaning);

      return `<tr>
      <td class="ar">
        <span class="ar-letter">${arEsc}</span>
        ${iconBtn}
      </td>
      <td class="lat">${chips}</td>
      <td class="mean">${meaningEsc}</td>
    </tr>`;
    }).join('');

    // À déclarer UNE SEULE FOIS (en haut du fichier, avant msgModules)
    const ISLAMBULLI_PDF =
      "https://samerislamboli.com/wp-content/uploads/2020/02/%D8%B9%D9%84%D9%85%D9%8A%D8%A9-%D8%A7%D9%84%D9%84%D8%B3%D8%A7%D9%86-%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A-%D9%88%D8%B9%D8%A7%D9%84%D9%85%D9%8A%D8%AA%D9%87-%D8%B3%D8%A7%D9%85%D8%B1-%D8%A7%D8%B3%D9%84%D8%A7%D9%85%D8%A8%D9%88%D9%84%D9%8A-9-2018-%D9%85%D8%B1%D9%83%D8%B2-%D9%84%D9%8A%D9%81%D8%A7%D9%86%D8%AA-%D9%86%D8%B3%D8%AE%D8%A9-%D8%A7%D9%84%D9%83%D8%AA%D8%B1%D9%88%D9%86%D9%8A%D8%A9.pdf";
    const col3Label = L({
      fr: `Signification du son — <a href="${ISLAMBULLI_PDF}" target="_blank" rel="noopener noreferrer" title="Ouvrir la référence PDF">réf. PDF (S. Islamboli, 2018)</a>`,
      en: `Sound meaning — <a href="${ISLAMBULLI_PDF}" target="_blank" rel="noopener noreferrer" title="Open the PDF reference">PDF ref</a>`,
      ar: `دلالة الصوت — <a href="${ISLAMBULLI_PDF}" target="_blank" rel="noopener noreferrer" title="فتح مرجع PDF">مرجع PDF</a>`,
      es: `Significado del sonido — <a href="${ISLAMBULLI_PDF}" target="_blank" rel="noopener noreferrer" title="Abrir referencia PDF">ref. PDF</a>`,
      kab: `Amasal n uṣṣut — <a href="${ISLAMBULLI_PDF}" target="_blank" rel="noopener noreferrer" title="Ldi tameddit PDF">tamd. PDF</a>`
    });

    return `
    <table class="translit-table">
      <thead>
        <tr>
          <th>عربي</th>
          <th>${L({ fr: "Translittérations", en: "Transliterations", ar: "أشكال النقل الصوتي", es: "Transliteraciones", kab: "Tisefsiyin" })}</th>
          <th>${col3Label}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  }



  const TXT = {
    header: {
      fr: "Table de correspondance entre caractères arabes et français avec leur sens",
      en: "Correspondence table between Arabic and French characters with their meaning",
      ar: "جدول تطابق بين الحروف العربية والفرنسية مع معانيها",
      es: "Tabla de correspondencia entre caracteres árabes y franceses con su significado",
      kab: "Tafelwit n umṣada gar isekkilen n tɣarabit d n tfransist s yimanan-nsen"
    },


    // ---------- TRANSLITTÉRATION ----------
    translit: {
      note: {
        fr: "",
        en: "",
        ar: "",
        es: "",
        kab: ""
      }
    }
  };

  // ---- rendu final (ICÔNES via renderIconList + ICONS_HTML déjà définis) ----
  return `
    <div dir="${dir}" style="color: dark;text-align:${align}; line-height:1.6; font-size:14px;">
      <h3 style=" margin:0 0 .5rem 0;">${L(TXT.header)}</h3>

      <section style="margin-top:.25rem">
        <h4 style="margin:.25rem 0">${L(TXT.translit.title)}</h4>
        <p class="muted" style="margin:.25rem 0">${L(TXT.translit.desc)}</p>
        ${renderTranslitTableLocal(typeof translationDict !== 'undefined' ? translationDict : {})}
        <p class="muted" style="margin:.5rem 0 0 0; font-size:14px;">${L(TXT.translit.note)}</p>
      </section>
    </div>
  `;
}


