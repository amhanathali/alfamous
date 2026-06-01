

/**
 * Affiche la liste de suggestions pour un champ d'entrée donné.
 * @param {string} input  Le texte saisi (utilisé pour filtrer).
 * @param {string} [inputId='mot'] L'id du champ source (pour supporter plusieurs jumeaux :
 *                                  #mot, #popupInputMot). Le conteneur DOM attendu est
 *                                  `#suggestions-container-<inputId>`.
 */
function showSuggestions(input, inputId) {
  inputId = inputId || 'mot';
  const inputElement = document.getElementById(inputId);
  const suggestionsContainer = document.getElementById('suggestions-container-' + inputId);

  if (!inputElement || !suggestionsContainer) {
    console.error("Input ou conteneur de suggestions introuvable pour l'id:", inputId);
    return;
  }

  // Nettoyer le conteneur à chaque appel
  suggestionsContainer.innerHTML = '';

  // Extraire le dernier mot saisi
  const rawInput = String(input || '');
  const words = rawInput.trim().split(' ');
  const lastWord = words[words.length - 1];

  // Si vide, on affiche les suggestions globales (Historik + Lexique).
  const suggestions = filterSuggestions(lastWord || "", inputId);

  // Si aucune suggestion, on masque et on sort
  if (!suggestions || suggestions.length === 0) {
    suggestionsContainer.style.display = 'none';
    try {
      if (typeof window.zcRefreshMotSuggestionsToggle === 'function') {
        window.zcRefreshMotSuggestionsToggle(inputId);
      }
    } catch (_) { }
    return;
  }

  // Créer les éléments de suggestion
  suggestions.forEach(function (suggestion) {
    const suggestionItem = document.createElement('div');
    suggestionItem.className = 'suggestion-item';
    suggestionItem.textContent = suggestion;

    // Utiliser mousedown pour que la sélection se fasse AVANT le blur/clic global
    suggestionItem.addEventListener('mousedown', function (event) {
      // Empêcher tout comportement parasite (sélection de texte, clic global, etc.)
      event.preventDefault();
      event.stopPropagation();

      // Remplacer le dernier mot par la suggestion sélectionnée
      words[words.length - 1] = suggestion;
      const newInput = words.join(' ');

      inputElement.value = newInput.trim(); // Mettre à jour le champ input

      // Déclencher les événements pour que toute la logique liée à "mot" se mette à jour.
      // (handleMotInput → showSuggestions va ré-afficher la liste avec la nouvelle valeur.)
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));

      // Forcer la fermeture APRÈS les dispatch events (écrase le ré-affichage éventuel)
      // puis retirer le focus pour que la liste reste fermée tant que l'utilisateur ne
      // modifie pas la saisie.
      inputElement.blur();
      suggestionsContainer.innerHTML = '';
      suggestionsContainer.style.display = 'none';
      try {
        if (typeof window.zcRefreshMotSuggestionsToggle === 'function') {
          window.zcRefreshMotSuggestionsToggle(inputId);
        }
      } catch (_) { }
    });

    suggestionsContainer.appendChild(suggestionItem);
  });

  // Afficher le conteneur si on a des suggestions
  suggestionsContainer.style.display = 'block';
  try {
    if (typeof window.getNextZIndex === 'function') {
      const z = Number(window.getNextZIndex());
      if (Number.isFinite(z) && z > 0) suggestionsContainer.style.zIndex = String(z);
    } else if (typeof window.getMaxZIndex === 'function') {
      const z = Number(window.getMaxZIndex()) + 2;
      if (Number.isFinite(z) && z > 0) suggestionsContainer.style.zIndex = String(z);
    }
  } catch (_) { }
  try {
    const anchor =
      inputElement.closest('.zc-mot-select-core, .zc-search-wrap, .zc-mot-field-wrap') || inputElement;
    if (typeof zcFitSuggestionListToViewport === 'function') {
      zcFitSuggestionListToViewport(suggestionsContainer, anchor);
    }
  } catch (_) { }
  try {
    if (typeof window.zcRefreshMotSuggestionsToggle === 'function') {
      window.zcRefreshMotSuggestionsToggle(inputId);
    }
  } catch (_) { }
}

// Filtrer les suggestions en fonction de l'entrée utilisateur
// fTabLexique vient de fTabLexique1.js (souvent chargé en async après ce fichier).
function filterSuggestions(input, inputId) {
  const lowerCaseInput = String(input || '').toLowerCase().trim();

  // Nouveau moteur unifié (historik utilisateur + racines lexique).
  if (typeof window.zcGetUnifiedMotSuggestions === "function") {
    try {
      return window.zcGetUnifiedMotSuggestions(lowerCaseInput);
    } catch (_) { }
  }

  // Fallback legacy: lexique seul.
  const tabLexique = typeof fTabLexique === "function" ? fTabLexique() : [];
  if (!tabLexique || !Array.isArray(tabLexique)) return [];
  if (!lowerCaseInput) {
    return tabLexique
      .map(function (item) { return item && item[0] ? String(item[0]) : ""; })
      .filter(Boolean);
  }
  return tabLexique
    .filter(function (item) {
      return item && item[0] && String(item[0]).toLowerCase().includes(lowerCaseInput);
    })
    .map(function (item) { return item[0]; });
}

// Masquer les suggestions si on clique en dehors de l'input ou des suggestions.
// Géré pour tous les jumeaux ayant un conteneur de suggestions dédié (#mot, #popupInputMot).
document.addEventListener('click', function (event) {
  ['mot', 'popupInputMot', 'historiqueMotsInput'].forEach(function (id) {
    const inputElement = document.getElementById(id);
    const suggestionsContainer = document.getElementById('suggestions-container-' + id);
    if (!inputElement || !suggestionsContainer) return;
    const wrap = inputElement.closest('.zc-search-wrap, .zc-mot-field-wrap, .zc-mot-search-wrap');
    const clickedInsideFieldArea =
      inputElement.contains(event.target) ||
      suggestionsContainer.contains(event.target) ||
      (wrap && wrap.contains(event.target));
    if (!clickedInsideFieldArea) {
      suggestionsContainer.style.display = 'none';
      try {
        if (typeof window.zcRefreshMotSuggestionsToggle === 'function') {
          window.zcRefreshMotSuggestionsToggle(id);
        }
      } catch (_) { }
    }
  });
});

/** Chevron ouvrir/fermer les listes de suggestions (#mot, #popupInputMot). */
(function initMotSuggestionsToggle() {
  const registry = Object.create(null);

  function isMotSuggestionsOpen(inputId) {
    const list = document.getElementById('suggestions-container-' + inputId);
    if (!list) return false;
    if (!list.children.length) return false;
    if (list.style.display === 'block') return true;
    try {
      const cs = window.getComputedStyle(list);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    } catch (_) { }
    return false;
  }

  function bindMotSuggestionsToggle(opts) {
    const inputId = opts.inputId;
    const input = document.getElementById(inputId);
    const list = document.getElementById('suggestions-container-' + inputId);
    const toggleBtn = document.getElementById(opts.toggleBtnId);
    if (!input || !list || !toggleBtn) return;

    const refreshToggleIcon = function () {
      const ico = toggleBtn.querySelector('i');
      const open = isMotSuggestionsOpen(inputId);
      if (ico) {
        ico.classList.toggle('fa-chevron-up', open);
        ico.classList.toggle('fa-chevron-down', !open);
      }
      toggleBtn.setAttribute('aria-label', open ? opts.closeLabel : opts.openLabel);
      toggleBtn.setAttribute('title', open ? opts.closeLabel : opts.openLabel);
    };

    const hideList = function () {
      list.style.display = 'none';
      refreshToggleIcon();
    };

    const openList = function () {
      if (typeof showSuggestions === 'function') {
        showSuggestions(input.value || '', inputId);
      }
      refreshToggleIcon();
    };

    toggleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isMotSuggestionsOpen(inputId)) {
        hideList();
        return;
      }
      try { input.focus(); } catch (_) { }
      openList();
    });

    input.addEventListener('input', function () {
      window.setTimeout(refreshToggleIcon, 0);
    });

    registry[inputId] = { refreshToggleIcon: refreshToggleIcon, hideList: hideList };
    refreshToggleIcon();
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(function () {
    bindMotSuggestionsToggle({
      inputId: 'mot',
      toggleBtnId: 'tipTabMotSearch',
      openLabel: 'Ouvrir les suggestions du champ mot',
      closeLabel: 'Fermer les suggestions du champ mot',
    });
    bindMotSuggestionsToggle({
      inputId: 'popupInputMot',
      toggleBtnId: 'tipTabPopupMotSearch',
      openLabel: 'Ouvrir les suggestions du champ référence',
      closeLabel: 'Fermer les suggestions du champ référence',
    });
  });

  window.zcRefreshMotSuggestionsToggle = function (inputId) {
    if (registry[inputId]) registry[inputId].refreshToggleIcon();
  };
})();


// Déclare une variable globale pour stocker les lignes de texte
// Variable globale pour stocker le texte copié
//var rechTermine=0;
//var lienZoomCoran = "https://lexique-coran.blogspot.com/p/alfamous.html";

const tabVersion = fTabDateVersion();
var numVersionActuelle = localStorage.getItem('numVersionLocal') || tabVersion[0][0];

// Numéro de version actuelle (à mettre à jour lors d'un déploiement)
var textVersion = numVersionActuelle;//var globale
var couleur = '<span class="rouge">';
var finCouleur = '</span>';

var Lexique = document.getElementById('Lexique');
var texteCopie = "بسم الله";
//var myHelpBascule=false;
var toggleValue = false;

var numLigneCur = 0; // Indice de début du bloc courant
var valeurPrecedente = '';
//var nomApp="Zoom-Coran";
//var Lex="Lexique";
//var totalRech = 0;
var nbreDeVersetTrouve = 0;
//var estArabeMot = true;
//var estNombre = true;

// Déclarer une variable globale pour suivre l'état de la synthèse vocale
var lngVoixAR = "ar"; // arabe 
var lngVoixFR = "fr"; // français
var lngVoixEN = "en"; // anglais
var lngVoixES = "es"; // espagnol 
var lngVoixkab = "kab"; // Kabyle 
function stopLireTexte() {
  try {
    if (typeof window.zcStopAfModalListenPlayback === "function") {
      window.zcStopAfModalListenPlayback();
    }
  } catch (_) {}
  try {
    if (typeof window.closeLecteurPopup === "function") {
      window.closeLecteurPopup();
    }
  } catch (_) {}
  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch (_) {}
  isSpeechSynthesisPlaying = false;
  try {
    window.isSpeechSynthesisPlaying = false;
  } catch (e) {}
}
// Modifier la fonction lireTexte
var isSpeechSynthesisPlaying = false;

function pickVoiceForLireTexte(langTag) {
  var voices = window.speechSynthesis.getVoices() || [];
  var base = String(langTag || "").split("-")[0];
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].lang === langTag) return voices[i];
  }
  for (var j = 0; j < voices.length; j++) {
    if (voices[j].lang && voices[j].lang.indexOf(base) === 0) return voices[j];
  }
  return null;
}

/**
 * Popup Zoom / Warsh réellement visible (évite Z3 présent dans le DOM mais display:none).
 * Utilisé pour callerEl du lecteur « Lire le texte » et la pile z-index.
 */
function zcPickVisibleReadCallerEl() {
  var ids = [
    "popupResultatsZ3",
    "popupResultatsZ2",
    "popupResultatsZ1",
    "popupResultats",
    "popupHtml",
  ];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (!el || !el.isConnected) continue;
    try {
      var st = window.getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") continue;
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      return el;
    } catch (err) {
      continue;
    }
  }
  return null;
}
try {
  window.zcPickVisibleReadCallerEl = zcPickVisibleReadCallerEl;
} catch (e) {}

function lireTexte(texte, langueVoix, vitesse = 1.0) {
  texte = nettoyerCommentairePourChampTexte(texte);
  var readCallerEl =
    typeof window.zcPickVisibleReadCallerEl === "function"
      ? window.zcPickVisibleReadCallerEl()
      : document.getElementById("popupResultatsZ3") ||
        document.getElementById("popupResultatsZ2") ||
        document.getElementById("popupResultatsZ1") ||
        document.getElementById("popupResultats") ||
        document.getElementById("popupHtml") ||
        null;
  if (typeof window.zcReadTextWithOverlay === "function") {
    isSpeechSynthesisPlaying = true;
    try {
      window.isSpeechSynthesisPlaying = true;
    } catch (e) {}
    const ok = window.zcReadTextWithOverlay(texte, {
      langTag: langueVoix,
      rate: vitesse,
      title: "Lis (Voix IA & Lecture)",
      callerEl: readCallerEl,
      onDone: function () {
        isSpeechSynthesisPlaying = false;
        try {
          window.isSpeechSynthesisPlaying = false;
        } catch (e) {}
      }
    });
    if (ok) return;
    isSpeechSynthesisPlaying = false;
    try {
      window.isSpeechSynthesisPlaying = false;
    } catch (e) {}
  }
  // Assurez-vous que l'API audio est compatible avec votre application
  if ('speechSynthesis' in window) {
    function doSpeak() {
      var speech = new SpeechSynthesisUtterance(texte);
      speech.lang = langueVoix;
      speech.rate = vitesse;
      var voice = pickVoiceForLireTexte(langueVoix);
      if (voice) speech.voice = voice;
      speech.onend = function () {
        isSpeechSynthesisPlaying = false;
        try {
          window.isSpeechSynthesisPlaying = false;
        } catch (e) {}
      };
      window.speechSynthesis.speak(speech);
      isSpeechSynthesisPlaying = true;
      try {
        window.isSpeechSynthesisPlaying = true;
      } catch (e) {}
    }

    void window.speechSynthesis.getVoices();
    if ((window.speechSynthesis.getVoices() || []).length === 0) {
      window.speechSynthesis.onvoiceschanged = function () {
        try { window.speechSynthesis.onvoiceschanged = null; } catch (e) { }
        doSpeak();
      };
    }
    doSpeak();
  } else {
    // Gérer le cas où la synthèse vocale n'est pas prise en charge
    alertMsgBoxPopup("La synthèse vocale n'est pas prise en charge par votre navigateur: " + langueVoix);
  }
};

try {
  window.zcStopLireTexte = stopLireTexte;
} catch (e) {}

// Warmup au chargement (test demandé) : amorce lireTexte(""), puis fermeture propre.
(function zcWarmupLireTexteOnLoad() {
  if (window.__zcLireTexteWarmupDone) return;
  function run() {
    if (window.__zcLireTexteWarmupDone) return;
    window.__zcLireTexteWarmupDone = true;
    try {
      if (!("speechSynthesis" in window)) return;
      lireTexte("", (typeof lngVoixAR !== "undefined" ? lngVoixAR : "ar-SA"), 1.0);
      window.setTimeout(function () {
        try {
          if (typeof window.zcStopAfModalListenPlayback === "function") {
            window.zcStopAfModalListenPlayback();
          }
        } catch (_) {}
        try {
          if (typeof window.closeLecteurPopup === "function") {
            window.closeLecteurPopup();
          }
        } catch (_) {}
        try {
          stopLireTexte();
        } catch (_) {}
        try {
          isSpeechSynthesisPlaying = false;
          window.isSpeechSynthesisPlaying = false;
        } catch (_) {}
      }, 0);
    } catch (_) {}
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();


function activerElement(elementId) {
  var element = document.getElementById(elementId);
  if (element) {
    element.disabled = false;
    element.style.display = 'inline-block'; // Rétablir la visibilité
  } else {
    console.log("Erreur: Impossible d'activer l'élément avec l'ID " + elementId);
  }
}

function desactiverElement(elementId) {
  var element = document.getElementById(elementId);
  if (element) {
    element.disabled = true;
    element.style.display = 'none'; // Cacher l'élément
  } else {
    console.log("Erreur: Impossible de désactiver l'élément avec l'ID " + elementId);
  }
}



const c = document.getElementById('commentaires');
if (c) c.innerHTML = "";
var couleurDeFond = getComputedStyle(document.documentElement).getPropertyValue('--zc-bg').trim() || "#AFEEEE";
desactiverElement("menu-container");








//**********************************************************NETTOYERTEXTE
//var lettresAccepteesArabe = " آأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيءٱ"+"ٱ"+"ه";
//var lettresAccepteesLatin = " aâàbcdeêèéfghiïîjklmnoôpqrstuûùvwxyz"; 
//var lettresAccepteesLexique = new RegExp(`[^${lettresAccepteesArabe}${lettresAccepteesLatin}0-9-#.$? ]`, 'g');
//var voyellesAsupprimerArabe = "وايت";
// valides entre lettres sucessifs du input
//var voyellesAsupprimerLatin = "aâàoôuûùeêèéiïy";
// valides entre lettres sucessifs du input
//var carValidesEntreLettresSuccessives = "";
//var lettresValidesArabe0 = "ءآأؤإئابةتيسفكلمنهوىي"+"ٱ"+"ه";
//var lettresValidesLatin0 = "aâàntiïîoômbcdxprsuûùleêèégq";
//var lettresValidesArabe = lettresValidesArabe0;
//var lettresValidesLatin = lettresValidesLatin0;
//var carValidesSuffixePrefixe = "";

//var voyellesHmza = ["ئ", "ؤ", "إ", "أ", "آ", "ء"];
//"ا"

// Variable globale pour activer/désactiver le traitement
// Ta variable globale (lexicale)














function normaliserTexte(texte) {//utilisée par les fct qui travaillent uniquement avec les racines
  return texte
    .replace(/[\u00A0\u200C\u200F\u202F]/g, ' ') // espaces invisibles
    .replace(/\r\n|\r/g, '\n')                  // normaliser retours ligne
    .replace(/\s+/g, ' ')                       // réduire tous les espaces
    .replace('...', '')
    .trim();
}

const WHITELIST_REGEX = /[^\u0621-\u064Aa-z0-9.() \n\r\t\-]/g;

// Finalisation simple : retire les non-autorisés globalement, normalise les espaces
function finalizeTokens(str, reSafe) {
  // 1) Normalisation des espaces / retours
  str = normaliserTexte(str);

  // 2) Nettoyage avec regex de sécurité
  str = String(str || '')
    .replace(reSafe, '')   // ou '' si tu préfères supprimer complètement
    .replace(/\s+/g, ' ')
    .trim();

  // 3) Si la chaîne est vide après nettoyage → jeton neutre
  if (str === '') {
    //str = 'أو';
    str = '?';
  }

  return str;
}

// --- DROP-IN: finalise en préservant le comptage des mots ---
// --- Variante : préserve le comptage des mots ---
function finalizeTokensPreserveCount(str) {
  str = normaliserTexte(str);
  return String(str || '')
    .split(/(\s+)/)                      // conserve les séparateurs (espaces, etc.)
    .map(tok => {
      if (/^\s+$/.test(tok)) return ' '; // tout bloc d'espaces → un espace
      const cleaned = tok.replace(WHITELIST_REGEX, ''); // retire les non-autorisés DANS le mot
      // ⚠️ Ici l'astuce : si le mot est vidé → le remplacer par le jeton neutre "ÂW"
      return cleaned === '' ? '' : cleaned;
    })
    .join('')
    .replace(/\s+/g, ' ')                // compactage doux des espaces
		.trim();
}

// === GLOBALES ===============================================================

// Garde précisément : arabe U+0621..U+064A, latin minuscule, chiffres, ., (), espaces, retours, tab, tiret
// (ta source de vérité unique)
const RE_TATWEEL = /\u0640/g;  // \u0640 = ـ  (kashîda)
const RE_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;

// ================== AWY : gestion des voyelles ا / و / ي ==================

// Pour scanner l'input et le texte
// On inclut toutes les variantes d'alif pour la détection (ا آ أ إ ٱ)
const REGEX_AWY_DETECT = /[ويىاآأإٱ]/gi;
// Pour le nettoyage dans le texte, on ne travaille plus que sur les formes normalisées
const REGEX_AWY_ALL    = /[ويىا]/gi;

// Ordre canonique pour construire awy
const AWY_ORDER = ['ا', 'و', 'ي'];

// Globale : ensemble de voyelles à garder (par ex. "او", "ي", "اوي", etc.)
var awy = "";

/**
 * Calcule la valeur de `awy` à partir d'une chaîne.
 * - Ne garde que {ا, و, ي} (avec normalisation ى → ي, et آ/أ/إ/ٱ → ا)
 * - Supprime les doublons
 * - Respecte AWY_ORDER pour l'ordre
 */
function computeAwyFromTexte(src) {
  const val = String(src || "").trim();
  if (!val) return "";

  const matches = val.match(REGEX_AWY_DETECT);
  if (!matches) return "";

  const foundSet = new Set();

  for (let ch of matches) {
    // Normaliser ى → ي
    if (ch === 'ى') ch = 'ي';

    // Normaliser toutes les variantes d'alif vers "ا"
    if (ch === 'آ' || ch === 'أ' || ch === 'إ' || ch === 'ٱ') {
      ch = 'ا';
    }

    if (AWY_ORDER.includes(ch)) {
      foundSet.add(ch);
    }
  }

  // Construire awy dans l'ordre canonique (ا puis و puis ي)
  return AWY_ORDER.filter(ch => foundSet.has(ch)).join('');
}

/**
 * Met à jour la globale `awy`.
 * - Si `src` est fourni (string) : calcule à partir de cette chaîne.
 * - Sinon : lit la valeur de l'input #mot (compatibilité ancienne).
 */
function detecterAwy(src) {
  if (typeof src === 'string') {
    awy = computeAwyFromTexte(src);
    return;
  }

  awy = "";
  const el = document.getElementById("mot");
  if (!el) return;
  awy = computeAwyFromTexte(el.value);
}


// ================== NETTOYER TEXTE MIXTE (AR / FR) ==================

/**
 * Nettoie un texte mixte (ar/fr) pour la recherche.
 * @param {string} texte
 * @param {boolean} isInput  - true si c'est l'input utilisateur (on recalcule awy)
 */
/**
 * Nettoie un texte mixte (ar/fr) pour la recherche.
 * @param {string} texte
 * @param {boolean} isInput  - true si c'est l'input utilisateur (on recalcule awy)
 */
function nettoyerTexteMixte(texte, isInput = false) {
  if (isInput) detecterAwy(texte);

  texte = String(texte || '')
    .normalize('NFKC')
    .normalize('NFC')
    .toLowerCase();

  const ALLAH_PATTERN = /[اأإٱ]\u0644\u0644\u0651?\u0647[\u064B-\u0652\u0670]?|ألله|الله/g;
  texte = texte.replace(ALLAH_PATTERN, 'الله');

  try { texte = dedoubleShedda(texte); } catch (_) { }

  // Ligatures lam-alif
  texte = texte.replace(/[\uFEF5-\uFEFC]/g, 'لا');

  // ✅ Normalisation maddah : آ / آ → ا
  texte = texte
    .replace(/\u0627\u0653/g, '\u0627') // آ → ا
    .replace(/\u0622/g, '\u0627')      // آ  → ا
    .replace(/\u0627\u0654/g, '\u0623') // ا◌ٔ → أ
    .replace(/\u0627\u0655/g, '\u0625'); // ا◌ٕ → إ

  // ✅ Tatwîl + diacritiques
  texte = texte.replace(RE_TATWEEL, '\u0627'); // ـ → ا
  texte = texte.replace(RE_DIACRITICS, '');    // retirer diacritiques

  // Lettres
  texte = texte
    .replace(/\u0629/g, '\u062A')  // ة → ت
    .replace(/\u0649/g, '\u064A')  // ى → ي
    .replace(/\u06CC/g, '\u064A')  // ی → ي
    .replace(/\u06A9/g, '\u0643'); // ک → ك

  // AWY
  if (typeof awy === 'string' && awy.length > 0) {
    const keepSet = new Set(awy.split(''));
    texte = texte.replace(REGEX_AWY_ALL, ch => {
      let base = ch === 'ى' ? 'ي' : ch;
      return keepSet.has(base) ? ch : '';
    });
  } else {
    texte = texte.replace(REGEX_AWY_ALL, '');
  }

  try { texte = texte.replace(/\p{M}/gu, ''); } catch (_) { }

  return finalizeTokensPreserveCount(texte, WHITELIST_REGEX);
}







function decodeTexte(texte) {
  // Vérifier si le texte est encodé en recherchant des entités HTML encodées
  var parser = new DOMParser();
  var decodedTexte = parser.parseFromString('<html><body>' + texte + '</body></html>', 'text/html').body.textContent;
  return decodedTexte;
}

// 🌀 Animation de la barre de progression
let intervalProgress;

function simulateSearch() {
  const progressBar = document.getElementById('progressBar');
  let elapsedTime = 0;

  document.getElementById('progressContainer').style.display = 'block';
  progressBar.value = 0;

  intervalProgress = setInterval(() => {
    progressBar.value += 1;
    elapsedTime += 1;

    if (progressBar.value >= progressBar.max) {
      clearInterval(intervalProgress);
      progressBar.classList.remove('progress-bar-swing');
    }
  }, 1000);
}

function stopSearchProgress() {
  clearInterval(intervalProgress);

  const progressBar = document.getElementById('progressBar');
  progressBar.classList.remove('progress-bar-swing');

  document.getElementById('progressContainer').style.display = 'none';
}

function zcCoreTablesReady() {
  try {
    const versets = typeof window.fTabVersets === "function" ? window.fTabVersets() : null;
    const lexique = typeof window.fTabLexique === "function" ? window.fTabLexique() : null;
    const versetsReady = Array.isArray(versets) && versets.length > 0;
    const lexiqueReady = Array.isArray(lexique) && lexique.length > 0;
    if (versetsReady && lexiqueReady) return true;
  } catch (_) { }
  try {
    if (window.__zcLexiqueReadyDone) return true;
  } catch (_) { }
  return false;
}

function zcWaitCoreTablesReady(timeoutMs) {
  const timeout = Number(timeoutMs) > 0 ? Number(timeoutMs) : 20000;
  if (zcCoreTablesReady()) return Promise.resolve(true);
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try { clearTimeout(tid); } catch (_) { }
      try { window.removeEventListener("zcLexiqueReady", onReady); } catch (_) { }
      resolve(!!ok);
    };
    const onReady = () => {
      if (zcCoreTablesReady()) finish(true);
    };
    const tid = setTimeout(() => finish(false), timeout);
    try { window.addEventListener("zcLexiqueReady", onReady, { once: true }); } catch (_) { }
    const pollId = setInterval(() => {
      if (zcCoreTablesReady()) {
        try { clearInterval(pollId); } catch (_) { }
        finish(true);
      }
    }, 120);
    setTimeout(() => { try { clearInterval(pollId); } catch (_) { } }, timeout + 300);
  });
}

function zcSouraCounterReady() {
  try {
    if (window.__zcSouraCounterReadyDone) return true;
  } catch (_) { }
  try {
    const lbl = document.getElementById("nombreSouraTrouvees");
    return !!(lbl && lbl.isConnected);
  } catch (_) { }
  return false;
}

function zcWaitSouraCounterReady(timeoutMs) {
  const timeout = Number(timeoutMs) > 0 ? Number(timeoutMs) : 6000;
  if (zcSouraCounterReady()) return Promise.resolve(true);
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try { clearTimeout(tid); } catch (_) { }
      try { window.removeEventListener("zcSouraCounterReady", onReady); } catch (_) { }
      resolve(!!ok);
    };
    const onReady = () => finish(true);
    const tid = setTimeout(() => finish(false), timeout);
    try { window.addEventListener("zcSouraCounterReady", onReady, { once: true }); } catch (_) { }
  });
}

/**
 * ChercheMotsMain(n) → moduleSAWM(n) (sauf n=2 qui court-circuite vers moduleSALAT).
 *
 * n = 2 (bouton « Coran » / loupe) → moduleSALAT : nombre → traitementInput (page Warsh ou sourate·verset /
 *   popup racines) ; texte non arabe → ChercheMotsMain(1) ; racine invalide → chercheExpressionMultiLingue ou (1) ;
 *   sinon recherche par racines dans les versets → affichage « Zoom 1 » ; si aucun verset → ChercheMotsMain(1).
 *
 * n = 1 (bouton « Zoom-Coran ») → moduleSAWM défaut : nombre → idem ; arabe (testInput012345) →
 *   chercheExpressionMultiLingue (texte des colonnes traduction / arabe → « Zoom 2 ») ;
 *   autres langues : le switch prépare lng/trad1 mais les appels chercheExpressionMultiLingue sont commentés,
 *   puis ChercheMotsMain(4) → moduleLexique (« Zoom 3 ») direct.
 *
 * n = 4 → moduleLexique (« Zoom 3 ») direct.
 *
 * chercheExpressionMultiLingue ne rappelle pas automatiquement le lexique si zéro résultat : liens 📖/📒/📚
 * dans progEnCours pour enchaîner à la main.
 */
function ChercheMotsMain(argChercheMotsMain) {
  // Choisir la fonction de test selon l’entrée sélectionnée
  if (!selectedInputId || selectedInputId === "mot") {
    testLangueOninputMot();
  } else {
    testLangueOninputCommentaire();
  }

  let chercheMotsAborted = false;
  if (typeof window.zcBusyStart === "function") {
    window.zcBusyStart(undefined, function () {
      chercheMotsAborted = true;
    });
  } else {
    stopSearchProgress();
    const progressBar = document.getElementById("progressBar");
    const progressContainer = document.getElementById("progressContainer");
    if (progressBar && progressContainer) {
      progressBar.value = 1;
      progressContainer.style.display = "block";
      progressBar.classList.add("progress-bar-swing");
      simulateSearch();
    }
  }

  setTimeout(() => {
    zcWaitCoreTablesReady(20000)
      .then(() => zcWaitSouraCounterReady(6000))
      .then(() => {
        if (chercheMotsAborted) return;
        moduleSAWM(argChercheMotsMain);
      })
      .finally(() => {
        // Laisse un cycle de rendu pour que les compteurs/panneaux reflètent l’état final.
        window.setTimeout(() => {
          if (typeof window.zcBusyStop === "function") {
            window.zcBusyStop();
          } else {
            stopSearchProgress();
          }
        }, 0);
      });
  }, 100);
}


function moduleSAWM(argChercheMotsMain) {
  try {
    // Appels modules spécifiques
    if (argChercheMotsMain === -1) { moduleWarsh(-1); return; }
    //if (argChercheMotsMain ===0) { moduleSourat(); return; }//Zoom0
    //if (argChercheMotsMain === 1) { chercheExpressionMultiLingue(input, lng, al1, tstLng, trad1, lngVoixFR); }//Module 1 Zoom2
    if (argChercheMotsMain === 2) { moduleSALAT(); return; }//module 2 recherche par racine Zoom1
    if (argChercheMotsMain === 4) { moduleLexique(); return; }//module Lexique Zoom3
    if (argChercheMotsMain === 5) { moduleStatistique(opts = {}); return; }//module statistiques
    if (argChercheMotsMain === 6) { moduleSynonymes(""); return; }//module synonymes
    if (argChercheMotsMain === 7) { moduleAmisRacineD1(); return; }//module liens amis (d=1)
    if (argChercheMotsMain === 8) { moduleDeclineRacine(""); return; }//module decliner

    // Cas 0 ou 1 module 1 recherche mot brut multilingue
    let input = document.getElementById("mot").value.trim();
    input = input.replace(/^\.+|\.+$/g, '');

    if (input === "") {
      input = "بسم الله";
      document.getElementById("mot").value = input;
      testLangueOninputMot();
    }

    // Traitement d'entrée
    //let tst = traitementInput(input);
    /*if (tst !== "") {
      document.getElementById("labelResultat").innerHTML = "";
      return;
    }*/
		//input = input.split('-')[0];
    input = input.replace(/#/g, "").replace(/\+/g, " ");
console.log("INPUT3= "+input);
    const estNombre = detecterNombre(input);
    if (estNombre) {
      progRacine = false;
      var tst = traitementInput(input);
      return tst;
    }



    // Détection langue
    const tstLng = testInput012345(input);
    if (tstLng === 0) return;//nombre déjà traité plus haut argument 4

    //input = document.getElementById('mot').value;		
    //console.log("input0= "+input+" AWY0= "+awy);
    //detecterAwy();

    input = nettoyerTexteMixte(input,true);
    console.log("INPUT4= " + input);
    //console.log("input1= "+input+" AWY1= "+awy);
    // Recherche par langue
    const langueChoisie = document.getElementById("Traduction").value;
    let al1 = tstLng === 1 ? "right" : "left";
    let lng = 2;//arabe par défaut
    let trad1 = "القرآن الكريم";//Coran arabe par défaut

    if (tstLng === 1) {//coran arabe
      chercheExpressionMultiLingue(input, lng, al1, tstLng, trad1, lngVoixAR);
      return;
    }
    //livres de commentaires
    if (input.length < 3) {
      alertMsgBoxPopup(input + " <3 caractères");
      return 0;
    }
    switch (langueChoisie) {
      case "lx":
        lng = 3;
        trad1 = "@everyone - Lexique ";
        //chercheExpressionMultiLingue(input, lng, al1, tstLng, trad1, lngVoixFR);
        break;
      case "fr":
        lng = 4;
        trad1 = "@M.Hamidullah (Tradition FR)";
        //chercheExpressionMultiLingue(input, lng, al1, tstLng, trad1, lngVoixFR);
        break;
      case "en":
        lng = 5;
        trad1 = "@A.Yusuf Ali (Tradition EN)";
        //chercheExpressionMultiLingue(input, lng, al1, tstLng, trad1, lngVoixEN);
        break;
      case "kab":
        lng = 6;
        trad1 = "@R.A.Mansour (Tradition KAB)";
        //chercheExpressionMultiLingue(input, lng, al1, tstLng, trad1, lngVoixEN);
        break;
      case "es":
        lng = 9;
        trad1 = "@Garcia (Tradition ES)";
        //chercheExpressionMultiLingue(input, lng, al1, tstLng, trad1, lngVoixFR);
        break;
      case "fr3":
        lng = 10;
        trad1 = "Transcription.FR @CSC";
        //chercheExpressionMultiLingue(input, lng, al1, tstLng, trad1, lngVoixES);
        break;
      case "fr2":
        lng = 11;
        trad1 = "@french_montada (Tradition FR2)";
        //chercheExpressionMultiLingue(input, lng, al1, tstLng, trad1, lngVoixFR);
        break;
      default:
        //document.getElementById("labelResultat").innerHTML = "Aucun livre selectionné";
        //afficherMasquerZoneAdesParametres(true);
        //alertMsgBoxTemp("Aucun livre selectionné");
				//return;
    }
		if (typeof ChercheMotsMain === 'function') {ChercheMotsMain(4);}
    return;
  } catch (error) {
    alertMsgBoxPopup("Erreur dans moduleSAWM :" + error);
    throw error;
  }
}
//**************************chercheExpressionMultiLingue


///////////////////////////////////////NOUVELLE FCT////////////////////////////////////////

// -----------------------------------------------------------
// 0) UI : injecter une case "⛓️ Ordre & contiguïté" à côté de #mot
//    (créée une seule fois, non bloquante si #mot absent)
// -----------------------------------------------------------
(function ensureOrdreExactCheckbox() {
  const TARGET_INPUT_ID = "mot";
  const CB_ID = "ordreExactCheckbox";
  const LABEL_TEXT = "⛓️ Ordre & contiguïté";
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }
  onReady(() => {
    const inp = document.getElementById(TARGET_INPUT_ID);
    if (!inp || document.getElementById(CB_ID)) return;
    const wrap = document.createElement('label');
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:.45rem;margin-left:.6rem;font-size:14px;";
    wrap.title = "Quand activé : les mots doivent apparaître dans l’ordre saisi et se suivre.";
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = CB_ID;
    const txt = document.createElement('span');
    txt.id = 'labelOrdreExactCheckbox';
    txt.textContent = LABEL_TEXT;
    wrap.append(cb, txt);
    inp.insertAdjacentElement('afterend', wrap);
  });
})();

// -----------------------------------------------------------
// 1) Helpers
// -----------------------------------------------------------
function _netText(s) {
  const str = String(s ?? "");
  const dec = (typeof decodeTexte === "function") ? decodeTexte(str) : str;
  return (typeof nettoyerTexteMixte === "function") ? nettoyerTexteMixte(dec) : dec;
}
// --- Sync des cases à cocher dans la barre "Zoom" vers les cases réelles ---
// (AlifHamzaBtn, paramRechercheMotEntier, ordreExactCheckbox)
(function initToolbarParamSync() {
  if (window._toolbarParamSyncInit) return;
  window._toolbarParamSyncInit = true;

  window.applyToolbarParamChange = function (kind, checked) {
    if (kind === 'exact' || kind === 'contig') {
      if (typeof window.zcSetSearchPrefs === 'function') {
        const next = (kind === 'exact') ? { me: !!checked } : { mc: !!checked };
        try { window.zcSetSearchPrefs(next, { source: 'applyToolbarParamChange' }); } catch (_) { }
      } else {
        const id = (kind === 'exact') ? 'paramRechercheMotEntier' : 'ordreExactCheckbox';
        const orig = document.getElementById(id);
        if (orig && orig.checked !== checked) {
          orig.checked = checked;
          try { orig.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) { }
          try { orig.dispatchEvent(new Event('click', { bubbles: true })); } catch (_) { }
        }
      }
      try {
        const z3 = document.getElementById('popupResultatsZ3');
        const isLexiqueOpen = !!(z3 && z3.style.display !== 'none');
        if (isLexiqueOpen && typeof moduleLexique === 'function') {
          moduleLexique();
          return;
        }
      } catch (_) { }
      if (typeof ChercheMotsMain === 'function') { ChercheMotsMain(2); }
      return;
    }
    if (kind === 'alif') {
      const orig = document.getElementById('AlifHamzaBtn');
      if (orig && orig.checked !== checked) {
        orig.checked = checked;
        try { orig.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) { }
        try { orig.dispatchEvent(new Event('click', { bubbles: true })); } catch (_) { }
      }
    }
  };
})();



// --- Cache du lexique normalisé pour accélérer moduleLexique ---
// Structure: Array<{ motOriginal, commentaireOriginal, motSansP, commSansP, racineTexte, racineAttr }>
let _LEXIQUE_CACHE = null;
let _LEXIQUE_SOURCE = null;

/**
 * Construit une seule fois un tableau normalisé pour le lexique :
 * - motSansP / commSansP : versions nettoyées (nettoyerTexteMixte)
 * - racineTexte / racineAttr : forme texte utilisable dans les handlers JS
 */
function getLexiqueCache() {
  // On récupère le tableau brut
  const tabLexique = (typeof fTabLexique === "function") ? fTabLexique() : [];

  if (!Array.isArray(tabLexique) || tabLexique.length === 0) {
    _LEXIQUE_CACHE = [];
    _LEXIQUE_SOURCE = tabLexique;
    return _LEXIQUE_CACHE;
  }

  // Si on a déjà construit un cache pour ce même tableau source, on le réutilise
  if (_LEXIQUE_CACHE && _LEXIQUE_SOURCE === tabLexique) {
    return _LEXIQUE_CACHE;
  }

  const cache = [];

  for (const [motOriginal, commentaireOriginal] of tabLexique) {
    const motBrut = motOriginal || "";
    const commBrut = commentaireOriginal || "";

    // Nettoyage une seule fois
    const motSansP = nettoyerTexteMixte(motBrut);
    const commSansP = nettoyerTexteMixte(commBrut);

    // On ignore les lignes totalement vides après nettoyage
    if (!motSansP && !commSansP) continue;

    // Pour les handlers, on prend la version normalisée du mot
    const racineTexte = motSansP;
    const racineAttr = racineTexte.replace(/['"\\]/g, '\\$&');

    cache.push({
      motOriginal: motBrut,
      commentaireOriginal: commBrut,
      motSansP,
      commSansP,
      racineTexte,
      racineAttr
    });
  }

  _LEXIQUE_CACHE = cache;
  _LEXIQUE_SOURCE = tabLexique;

  return _LEXIQUE_CACHE;
}

// -----------------------------------------------------------
// 2) Version conservant la signature ORIGINELLE
//    function chercheExpressionMultiLingue(input, lng, al1, tstLng, trad1, lngVoix1)
//    + option "ordre & contiguïté" si #ordreExactCheckbox est cochée
// -----------------------------------------------------------
function chercheExpressionMultiLingue(
  input,
  lng,
  al1,
  tstLng,
  trad1,
  lngVoix1
) {
  const maxPage = 100;

  if (typeof setMotRechercheEtCommentaire === "function") {
    try { setMotRechercheEtCommentaire(input); } catch { }
  }

  const net = _netText;

  const useExact = (typeof window !== "undefined" && typeof window.paramRechercheMotEntier !== "undefined")
    ? !!window.paramRechercheMotEntier
    : false;

  const motsContiguous = isMotContiguActive();

  // --- Tokenisation & normalisation de l'input ---
  const motsInputBruts = String(input.replace('الله', 'لله') || '')
    .replace(/\+/g, " ")
    .split(/\s+/)
    .filter(m => m.trim());

  const motsRechNet = motsInputBruts.map(net).filter(Boolean);
  if (motsRechNet.length === 0) return;

  // --- Helpers génériques ---
  function buildNeed(tokens) {
    const need = new Map();
    for (const t of tokens) need.set(t, (need.get(t) || 0) + 1);
    return need;
  }
  function allSatisfied(need) {
    for (const v of need.values()) if (v > 0) return false;
    return true;
  }
  function matchWordToNeed(word, need, exact) {
    // liste des tokens encore manquants qui matchent ce mot
    const candidates = [];
    for (const [tok, cnt] of need.entries()) {
      if (cnt <= 0) continue;
      const ok = exact ? (word === tok) : word.includes(tok);
      if (ok) candidates.push(tok);
    }
    if (!candidates.length) return false;
    // on prend le plus long pour limiter les chevauchements
    candidates.sort((a, b) => (b.length - a.length) || (a < b ? -1 : a > b ? 1 : 0));
    const chosen = candidates[0];
    need.set(chosen, need.get(chosen) - 1);
    return true;
  }

  let resultats = [];
  motsEnSurbrillance = {};
  pageActuelle = 0;
  

  const tabVersets = (typeof fTabVersets === "function") ? fTabVersets() : [];

  for (let v of tabVersets) {
    const ref = `${v[0]}.${v[1]}`;

    const versetBrut = v[lng] || '';
    const versetNet = net(versetBrut);
    if (!versetNet) continue;

    const motsVerset = versetNet.split(/\s+/).filter(Boolean);
    if (!motsVerset.length) continue;

    let matchOK = false;
    const indicesTrouvesSet = new Set();

    if (motsContiguous) {
      // === MODE CONTIGU : fenêtre glissante de k mots, ordre des tokens libre ===
      const k = motsRechNet.length;
      if (k <= motsVerset.length) {
        for (let j = 0; j <= motsVerset.length - k; j++) {
          const win = motsVerset.slice(j, j + k);
          const need = buildNeed(motsRechNet);

          for (let idx = 0; idx < win.length && !allSatisfied(need); idx++) {
            matchWordToNeed(win[idx], need, useExact);
          }

          if (allSatisfied(need)) {
            matchOK = true;
            for (let l = 0; l < k; l++) indicesTrouvesSet.add(j + l);
            // on continue pour marquer d'autres occurrences éventuelles
          }
        }
      }
    } else {
      // === MODE NON CONTIGU : intersection de recherches « 1 mot » ===
      // 1) Vérifier que *chaque* token apparaît quelque part dans le verset net
      let allTokensPresent = true;
      for (const tok of motsRechNet) {
        const ok = useExact
          ? versetNet.split(/\s+/).some(w => w === tok)
          : versetNet.includes(tok);
        if (!ok) {
          allTokensPresent = false;
          break;
        }
      }

      if (allTokensPresent) {
        // 2) Surligner tous les mots qui contiennent au moins un des tokens
        for (let j = 0; j < motsVerset.length; j++) {
          const mot = motsVerset[j];
          for (const tok of motsRechNet) {
            const cond = useExact ? (mot === tok) : mot.includes(tok);
            if (cond) {
              indicesTrouvesSet.add(j);
              break;
            }
          }
        }
        matchOK = indicesTrouvesSet.size > 0;
      } else {
        matchOK = false;
      }
    }

    if (matchOK) {
      resultats.push(ref);
      motsEnSurbrillance[ref] = Array.from(indicesTrouvesSet).sort((a, b) => a - b);
    }
  }

  // --- Préparation affichage ---
  totalMotsTrouves = Object.values(motsEnSurbrillance).reduce((acc, arr) => acc + arr.length, 0);
	if(totalMotsTrouves>0){
		if (typeof sauvegarderMot === "function") try { sauvegarderMot(); } catch { }
	}

  lngCourant = lng;
  alignCourant = al1;

  const getLbl = id => document.getElementById(id)?.textContent?.trim() ?? '';
  const getChk = id => !!document.getElementById(id)?.checked;

  const lblAlif = (() => {
    const base = `[و/ي/ى/ا | a o u i e → ø]`;
    const cible = (typeof awy !== 'undefined' && awy) ? awy : "";
    return cible
      ? `[و/ي/ى/ا | a o u i e → ${cible}]`
      : base;
  })();
  console.log("Transformée de caractères: " + lblAlif);

  if (lng != 2) {
    progEnCours = `📕 Zoom 2 > ${trad1}<br><div class="toolbar1 zc-popup-zoom-motline" >`;
    etatCheckedLocal = '';
  } else {
    progEnCours = `📖 Zoom 2 > ${trad1}<br><div class="toolbar1 zc-popup-zoom-motline" >`;
  }

  input = shortenLabel(input || '');
  const inputEsc = escapeHtml(input);
  const inputDisplayEsc = escapeHtml(String(input || "").replace(/ /g, " + "));

  progEnCours += `Mots == 
    <span class="rouge">
      <a href="#"
         class="zc-popup-mot-hit"
         onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${inputEsc}'); } else { document.getElementById('mot').value='${inputEsc}'; } return false;"
         style="text-decoration:underline;">${inputDisplayEsc}</a>
    </span><a href="#"
         class="zc-popup-ctx-tab"
         onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${inputEsc}'); } else { document.getElementById('mot').value='${inputEsc}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${inputEsc}', this); } return false;"
         title="Menu contextuel">☰</a><br>

    </div>
  `;

  try {
    if (typeof afficherPageMulti === "function") {
      afficherPageMulti(resultats, lngCourant, alignCourant, maxPage, { zoomTier: 2 });
    }
  } finally {
    // rien à restaurer
  }
}
