// Si changement, copier cette constante dans Apropos.html
const translationDict = {
  // Hmza & alif
  'ء': ['ʾ', 'ʔ', 'à'],
  'أ': ['à'],
  'آ': ['â', 'ʔā'],
  'ٱ': ['â', 'ã'],
  'ا': ['A', 'a'],

  // Hmza sous alif
  'إ': ['i', 'I', 'ʔi', '!'],

  // Lettres simples
  'ب': ['b', 'p', 'v'],
  'ت': ['t'],
  'ث': ['th', 'θ', 'ṯ'],
  'ج': ['j', 'dʒ', 'ʤ', 'ǧ', 'ʒ', 'Ž'],
  'ح': ['h', 'ħ', 'H'],
  'خ': ['kh', 'x', 'χ', 'ḫ', 'ĥ'],
  'د': ['d'],
  'ذ': ['dh', 'ð', 'ḏ', 'đ'],
  'ر': ['r', 'R'],
  'ز': ['z'],
  'س': ['s'],
  'ش': ['ch', 'sh', 'ʃ', 'š'],

  // Emphatiques
  'ص': ['Ç', 'sˤ', 'ṣ', 'ç', 'ss', 'S'],
  'ض': ['ddh', 'dˤ', 'ḍ', 'Ď'],
  'ط': ['tt', 'tˤ', 'ṭ'],
  'ظ': ['zz', 'ðˤ', 'ẓ', 'zˤ', 'zh', 'tth'],

  // ‘Ayn & ghayn
  'ع': ['E', 'ʕ', 'ʿ', 'Ɛ', 'e'],
  'غ': ['gh', 'ɣ', 'ʁ', 'ġ', 'ğ'],

  // Labiales / dentales
  'ف': ['f'],
  'ق': ['q', 'Q', 'g', 'ķ'],
  'ك': ['k', 'K', 'c'],

  // Liquides / nasales
  'ل': ['l', 'L'],
  'م': ['m', 'M'],
  'ن': ['n', 'N'],

  // Hāʼ
  'ه': ['hh', 'hː', '&'],

  // Wāw / Hmza sur wāw
  'و': ['w', 'uː', 'ū', 'ou', 'u'],
  'ؤ': ['ô', 'ʔu', 'ʔo', 'o', 'û'],

  // Yāʼ (finale) & yāʼ
  'ى': ['ā'],
  'ي': ['y', 'Y'],

  // Hmza sur yāʼ
  'ئ': ['î', 'ʔi'],

  // Espaces / ponctuation / chiffres
  ' ': ['+'],
  '+': [' '],
  '-': ['-'],
  '.': ['.'],
  'ّ': ['#', '~'],
  '#': ['ّ'],
  '$': ['$'],
  ',': ['.'],
  '.': ['0'],
  '١': ['1'],
  '٢': ['2'],
  '٣': ['3'],
  '٤': ['4'],
  '٥': ['5'],
  '٦': ['6'],
  '٧': ['7'],
  '٨': ['8'],
  '٩': ['9']
};


// --- Cache pour la table inverse (latin -> arabe) ---
let _reverseCache = null;
function getReverseMap() {
  if (_reverseCache) return _reverseCache;

  const reverse = Object.create(null);
  const keys = Object.keys(translationDict);

  for (const k of keys) {
    for (const tr of translationDict[k]) {
      reverse[tr] = k;
    }
  }

  const list = Object.values(translationDict)
    .flat()
    .slice()
    .sort((a, b) => b.length - a.length);

  _reverseCache = { reverse, list };
  return _reverseCache;
}

function validateInput(input) {
  input = (typeof input === 'string') ? input.toLowerCase() : String(input ?? '');

  const allowedChars = new Set();
  for (const key of Object.keys(translationDict)) {
    for (const ch of key) allowedChars.add(ch);
  }
  for (const vals of Object.values(translationDict)) {
    for (const tr of vals) for (const ch of tr) allowedChars.add(ch);
  }

  let validatedInput = '';
  for (const ch of input) if (allowedChars.has(ch)) validatedInput += ch;
  return validatedInput;
}

function arabicToLatin(inputString) {
  inputString = String(inputString ?? '');
  return inputString.split('').map(char => {
    const transliterations = translationDict[char];
    return transliterations ? transliterations[0] : char;
  }).join('');
}

function latinToArabic(inputString) {
  inputString = String(inputString ?? '');
  const { reverse: reverseTranslationDict, list: sortedTransliterations } = getReverseMap();

  let translatedText = '';
  let currentIndex = 0;

  while (currentIndex < inputString.length) {
    let found = false;
    for (const transliteration of sortedTransliterations) {
      if (inputString.startsWith(transliteration, currentIndex)) {
        translatedText += reverseTranslationDict[transliteration];
        currentIndex += transliteration.length;
        found = true;
        break;
      }
    }
    if (!found) {
      translatedText += inputString[currentIndex];
      currentIndex++;
    }
  }
  return translatedText;
}

function trimSpacesAndPlus(inputString) {
  let trimmedText = String(inputString ?? '').trim();
  trimmedText = trimmedText.replace(/^(\+)+|(\+)+$/g, '');
  return trimmedText;
}


// Variable pour stocker l'ID du champ actuellement sélectionné
let selectedInputId = null;

function setSelectedInput(inputId) {
  selectedInputId = inputId;
  scrollToSection(selectedInputId);
}

function transliterateInput(inputId = null, updateMot = false) {
  const idToUse = inputId || selectedInputId;

  if (!idToUse) {
    alertMsgBoxPopup("Veuillez d'abord sélectionner un champ de texte.");
    return;
  }

  const inputElement = document.getElementById(idToUse);
  if (!inputElement) {
    console.warn(`❗ Élément introuvable : ${idToUse}`);
    return;
  }

  let input = String(inputElement.value ?? '');
  let translatedText = '';

  const isArabic = detecterLangueTexte(input);

  if (input === '' || isArabic) {
    input = input.replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, '');
    translatedText = arabicToLatin(input);
    inputElement.dir = 'ltr';
    inputElement.style.textAlign = 'left';
  } else {
    translatedText = latinToArabic(input.toLowerCase());
    inputElement.dir = 'rtl';
    inputElement.style.textAlign = 'right';
  }

  translatedText = trimSpacesAndPlus(translatedText);
  inputElement.value = translatedText;

  if (updateMot) {
    const mot = document.getElementById('mot');
    if (mot) mot.value = translatedText;
  }

  testLangueOninputMot();
  //testLangueOninputCommentaire();
}

// ===================== BLOC ANNONCE BAR =====================

// Messages par langue
const ANNONCES = {
  fr: [
    "Outils de Recherches dans le Codex Coranique",
    "Ajoutez un commentaire à un verset coranique",
    "Ajoutez un commentaire à un mot du Lexique",
    "Clarifions les termes du Coran"
  ],
  ar: [
    "أدوات البحث في المصحف الشريف",
    "أضف تعليقًا على آية قرآنية",
    "أضف تعليقًا على كلمة في القاموس",
    "لنوضح كلمات القرآن"
  ],
  en: [
    "Research Tools in the Quranic Codex",
    "Add a comment to a Quranic verse",
    "Add a comment to a word in the Glossary",
    "Let’s clarify the terms of the Quran"
  ],
  kab: [
    "Allalen n unadi deg udlis n Leqran",
    "Rnu awal i wawal deg umawal",
    "Rnu awal i wawal deg umawal",
    "Snirem leqran"
  ],
  es: [
    "Aclaremos los términos del Corán."
  ]
};

// Expose pour compat i18n
window.I18N_ANNONCES = ANNONCES;

// Helper langue UI (avec compat projet)
function _resolveAnnonceLang(){
  try { if (typeof getUILang === 'function') return (getUILang() || 'fr').toLowerCase(); } catch {}
  try { if (typeof getLang   === 'function') return (getLang()   || 'fr').toLowerCase(); } catch {}
  return 'fr';
}

// Fallbacks propres
function getAnnonceMessages(lang){
  const L = (lang || _resolveAnnonceLang());
  const dict = window.I18N_ANNONCES || {};
  const pick = v => (Array.isArray(v) ? v.filter(Boolean) : []);
  let arr = pick(dict[L]);
  if (!arr.length) arr = pick(dict.fr);
  if (!arr.length) arr = pick(dict.en);
  if (!arr.length) {
    const firstKey = Object.keys(dict)[0];
    arr = pick(dict[firstKey]);
  }
  return arr;
}

function getUILang() {
  try { if (typeof getLangCode === 'function') return getLangCode(); } catch (_) { }
  const m = { fr: 'FR', en: 'EN', ar: 'AR', kab: 'KAB', es: 'ES' };
  const ls = (localStorage.getItem('uiLang') || 'fr').toLowerCase();
  return m[ls] || 'FR';
}
function isRTL(lang) { return lang === "ar"; }

// ======= TICKER séquentiel (Web Animations) =======
(function(){
  const viewport = document.getElementById('annonceBar');
  const bar      = document.getElementById('annonceText');
  if (!viewport || !bar) return;

  const SPEED = Number(window.ANNONCE_SPEED || 20);
  const prefersReduced = window.matchMedia &&
                         window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let anim = null;
  let idx = 0;
  let messages = [];
  let tickerToken = 0; // jeton pour annuler proprement les boucles en cours

  function resolveLang(){
    try { if (typeof getUILang === 'function') return (getUILang() || 'fr').toLowerCase(); } catch {}
    try { if (typeof getLang   === 'function') return (getLang()   || 'fr').toLowerCase(); } catch {}
    return 'fr';
  }
  function collectMessages(){
    const lang = resolveLang();
    let arr = [];
    if (window.I18N_ANNONCES && Array.isArray(window.I18N_ANNONCES[lang])) {
      arr = window.I18N_ANNONCES[lang];
    } else if (Array.isArray(window.ANNONCES)) {
      arr = window.ANNONCES;
    } else if (typeof window.getAnnonceMessages === 'function') {
      try { arr = window.getAnnonceMessages(lang) || []; } catch {}
    }
    return (arr || []).filter(Boolean).map(String);
  }

  function setText(t){ bar.textContent = String(t || ''); }
  function measure(){ return { vw: viewport.clientWidth, tw: bar.scrollWidth }; }
  function wait(ms){ return new Promise(res => setTimeout(res, ms)); }
// Lit la vitesse depuis :root { --annonce-speed: N }  (px/s)
function getTickerSpeedFromCSS(){
  // lit sur :root (documentElement) => fonctionne même si #annonceBar n'a pas encore de layout
  const val = getComputedStyle(document.documentElement)
                .getPropertyValue('--annonce-speed')
                .trim();
  const n = parseFloat(val);
  return (Number.isFinite(n) && n >= 0) ? n : 80; // 80 = secours
}

	async function playOne(message, lang){
		setText(message);
		bar.dir = isRTL(lang) ? "rtl" : "ltr";

		const { vw, tw } = measure();

		const speed = getTickerSpeedFromCSS();  // ← lit la vitesse CSS (0 = stop)
		const prefersReduced = window.matchMedia &&
													 window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		// Cas sans animation (pause “CSS” ou accessibilité) : afficher statique un temps lisible
		if (prefersReduced || speed === 0) {
			const hold = Math.max(2500, ((vw + tw) / 40) * 1000); // ~40 px/s pour le temps d'expo
			await wait(hold);
			return;
		}

    const rtl = isRTL(lang);
    const start = rtl ? -tw : vw;
    const end   = rtl ? vw  : -tw;
    const dist  = Math.abs(end - start);
    const dur   = Math.max(500, (dist / SPEED) * 1000);

    try { anim?.cancel(); } catch {}
    anim = bar.animate(
      [{ transform: `translateX(${start}px)` },
       { transform: `translateX(${end}px)` }],
      { duration: dur, iterations: 1, easing: 'linear', fill: 'forwards' }
    );

    const onEnter = () => { try { anim.pause(); } catch {} };
    const onLeave = () => { try { anim.play();  } catch {} };
    viewport.addEventListener('mouseenter', onEnter);
    viewport.addEventListener('mouseleave', onLeave);

    try {
      await anim.finished; // ⚠️ peut rejeter avec AbortError si cancel()
    } catch (e) {
      // On ignore proprement les annulations
      if (!(e && e.name === 'AbortError')) throw e;
    } finally {
      viewport.removeEventListener('mouseenter', onEnter);
      viewport.removeEventListener('mouseleave', onLeave);
    }
  }

  async function loop(myToken){
    const lang = resolveLang();
    if (!messages.length) { setText(''); return; }
    while (myToken === tickerToken) {
      const m = messages[idx % messages.length];
      try {
        await playOne(m, lang);
      } catch (e) {
        // Toute erreur inattendue casse la boucle courante, mais sans bruit
        console.error('ticker error:', e);
        break;
      }
      idx++;
    }
  }

  // API publique
  window.startAnnonceTicker = function(){
    const myToken = ++tickerToken; // invalide toute boucle précédente
    try { anim?.cancel(); } catch {}
    messages = collectMessages();
    idx = 0;
    setText(messages[0] || '');
    if (messages.length) loop(myToken);
  };

  window.updateAnnonceMessages = function(newMessages){
    if (Array.isArray(newMessages) && newMessages.length){
      window.ANNONCES = newMessages.slice();
      window.startAnnonceTicker();
    }
  };

  window.addEventListener('resize', () => {
    // On annule l'animation en cours; la boucle relancera le message suivant
    try { anim?.cancel(); } catch {}
  });

  // Démarrage automatique (setLang peut le rappeler ensuite)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.startAnnonceTicker, { once: true });
  } else {
    window.startAnnonceTicker();
  }
})();


// =================== Labels & Lang ===================

// Affiche la langue demandée; si label manquant pour un i → on montre FRi
function activerLabels(lang) {
  const CODES = ["FR", "AR", "EN", "KAB", "ES"];
  const ACTIVE_CLASS = "label-actif";
  const HIDDEN_CLASS = "label-cache";

  document.querySelectorAll('[id^="labelInterfaceFR"]').forEach(frEl => {
    const i = frEl.id.replace("labelInterfaceFR", "");
    const target = document.getElementById(`labelInterface${lang}${i}`);
    const showId = target ? `labelInterface${lang}${i}` : `labelInterfaceFR${i}`;

    CODES.forEach(code => {
      const el = document.getElementById(`labelInterface${code}${i}`);
      if (!el) return;

      const isShow = (`labelInterface${code}${i}` === showId);
      el.style.display = isShow ? "" : "none";
      el.classList.toggle(ACTIVE_CLASS, isShow);
      el.classList.toggle(HIDDEN_CLASS, !isShow);
      el.classList.add(`label-lang-${code.toLowerCase()}`);
      el.setAttribute("aria-hidden", isShow ? "false" : "true");
    });
  });

  // Correctif ciblé: en-tête panel Versets (index 1) parfois non rafraîchi après injections UI.
  // On force explicitement la langue active pour cette zone.
  const code = String(lang || "FR").toUpperCase();
  const versetCodes = ["FR", "AR", "EN", "KAB", "ES"];
  versetCodes.forEach((c) => {
    const el = document.getElementById(`labelInterface${c}1`);
    if (!el) return;
    const show = c === code || (!document.getElementById(`labelInterface${code}1`) && c === "FR");
    el.style.display = show ? "" : "none";
    el.setAttribute("aria-hidden", show ? "false" : "true");
  });
}

// Option: garder le cycle sur clic du bouton
function basculerLangue() {
  const current = getLang();
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  setLang(next);
}

// Init bouton
document.getElementById("btnLang")?.addEventListener("click", basculerLangue);
(function init() {
  setLang(getLang()); // applique dir/lang + bouton + annonce + labels
})();

// Rendu table de translittération
function renderTranslitTable(dict) {
  const rows = Object.entries(dict).map(([ar, list]) => {
    const chips = (list || []).map(s => `<span class="chip">${s}</span>`).join(' ');
    return `<tr>
      <td class="ar">${ar}</td>
      <td class="lat">${chips}</td>
    </tr>`;
  }).join('');
  return `
    <table class="translit-table">
      <thead><tr>
        <th>عربي</th>
        <th>Translittérations</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}


// Sélecteur de langue UI (si présent)
(function initUiLangSelect() {
  const sel = document.getElementById('uiLangSelect');
  if (!sel) return;

  const DEFAULT = 'fr';
  const VALID = new Set(['fr', 'ar', 'en', 'kab', 'es']);

  function applyLang(lang) {
    const code = VALID.has(lang) ? lang : DEFAULT;

    localStorage.setItem('uiLang', code);
    window.userLang = code;

    document.documentElement.setAttribute('lang', code);
    document.documentElement.setAttribute('dir', code === 'ar' ? 'rtl' : 'ltr');

    if (typeof window.refreshLoadingOverlay === 'function') { try { refreshLoadingOverlay(); } catch { } }
    if (typeof window.testLangueOninputMot === 'function') { try { testLangueOninputMot(); } catch { } }
    if (typeof window.refreshUI === 'function') { try { refreshUI(); } catch { } }

    // Ibn Fares: libellé + title/aria synchronisés à la langue UI.
    try {
      const btn = document.getElementById("btnIbnFaresLexique");
      if (btn) {
        const label = btn.querySelector(".zc-top-action-label");
        const map = {
          fr: { text: "Ibn Fares", title: "Lexique Ibn Fares selon OpenITI" },
          en: { text: "Ibn Fares", title: "Ibn Fares lexicon (OpenITI)" },
          ar: { text: "ابن فارس", title: "معجم ابن فارس وفق OpenITI" },
          kab: { text: "Ibn Fares", title: "Amawal Ibn Fares ilmend n OpenITI" },
          es: { text: "Ibn Fares", title: "Léxico Ibn Fares según OpenITI" }
        };
        const t = map[code] || map.fr;
        if (label) label.textContent = t.text;
        btn.setAttribute("title", t.title);
        btn.setAttribute("aria-label", t.title);
      }
    } catch (_) { }
  }

  const stored = (localStorage.getItem('uiLang') || DEFAULT);
  sel.value = VALID.has(stored) ? stored : DEFAULT;
  applyLang(sel.value);

  sel.addEventListener('change', () => applyLang(sel.value));
})();


// INIT (compatible bouton OU select)
(function initLangUI() {
  setLang(getLang());

  const btn = document.getElementById('btnLang');
  if (btn) btn.addEventListener('click', basculerLangue);

  const sel = document.getElementById('uiLangSelect');
  if (sel) {
    sel.value = getLang();
    sel.addEventListener('change', () => setLang(sel.value));
  }
})();
