/* ===================== mots-coran.js — version intégrée (sélection + copie HTML/texte) ===================== */

//const { select } = require("firebase-functions/params");



let lngCourant = 2;
let alignCourant = "right";
let progEnCours = "Quran";

// Variables globales
let resultats = [];
let motsEnSurbrillance = {};
let pageActuelle = 0;
let totalMotsTrouves = 0;

/* ===================== Cache racines ===================== */
let RACINES_SET = null;

function getRacinesSet() {
  if (RACINES_SET) return RACINES_SET;

  const tabVersets = fTabVersets() || [];
  const s = new Set();

  for (const row of tabVersets) {
    const col7 = row && row[7] ? String(row[7]) : '';
    if (!col7) continue;

    const norm = normaliserTexte(col7);
    const racines = norm.split(/\s+/).filter(Boolean);

    for (const r of racines) {
      const rNet = normaliserTexte(r).trim();
      if (rNet) s.add(rNet);
    }
  }
  RACINES_SET = s;
  return RACINES_SET;
}

function verifieRacineExisteDansLexique(input) {
  if (!input || !input.trim()) return false;

  // 1) Normalisation spéciale : "لله" → "الله"
  //    (si tu veux être plus strict, on peut encapsuler dans (^|\\s) ... (\\s|$))
  //input = input.replace(/لله/g, 'الله');
  // 2) Normalisation de base
  let inputNet = normaliserTexte(String(input)).replace(/\+/g, ' ').trim();


  // 3) Tokenisation
  const tokens = inputNet.split(/\s+/).filter(Boolean);

  const versetsSet = getRacinesSet();

  // 4) Vérifier chaque token
  for (const tok of tokens) {
    const tokNet = normaliserTexte(tok).trim();
    if (!versetsSet.has(tokNet)) {
      return tokNet; // stop dès le premier inconnu
    }
  }

  return ""; // tout est OK
}

/* ===================== Recherche principale ===================== */
/* ⬇️ version alignée sur la version en cours (même comportement quand ordre&contigu n’est PAS activé) */
function moduleSALAT() {//recherche par racines
  const maxPage = 100;

  // --- 1) Lecture / pré-traitements inchangés
  let input = document.getElementById("mot")?.value?.trim() || "";
  if (input === "") input = "بسم الله";
  input = input.replace(/\+/g, " ");
  const estNombre = (typeof detecterNombre === "function") ? detecterNombre(input) : false;
  if (estNombre) {
    progRacine = false;
    try { return traitementInput(input); } catch { return false; }
  }

  if (typeof testInput012345 === "function" && testInput012345(input) != 1) {//ici, arabe uniquement
    if (typeof ChercheMotsMain === "function") ChercheMotsMain(1);//module2
    return false;
  }

  input = (typeof dedoubleSheddaSafe === "function") ? dedoubleSheddaSafe(input) : input;



  if (typeof verifieRacineExisteDansLexique === "function") {//ici, seulement racines connues
    const tok = verifieRacineExisteDansLexique(input);
    if (tok) {
      alertMsgBoxTemp(`${tok} n'est pas une racine du Coran.`);
      // Fallback immédiat vers la recherche texte (ancien comportement attendu en mode auto)
      try {
        if (typeof chercheExpressionMultiLingue === "function") {
          chercheExpressionMultiLingue(input, 2, "right", 1, "القرآن الكريم", lngVoixAR);
          return false;
        }
      } catch (_) { }
      if (typeof ChercheMotsMain === "function") {
        ChercheMotsMain(1);
        return false;
      }
    }
  }

  // --- 2) Normalisation unique
  input = (typeof normaliserTexte === "function") ? normaliserTexte(input) : String(input).trim();

  // --- 3) État & mémos (inchangé)
  resultats = [];
  motsEnSurbrillance = {};
  pageActuelle = 0;
  
  if (typeof setMotRechercheEtCommentaire === "function") try { setMotRechercheEtCommentaire(input); } catch { }

  // --- 4) Préparation des tokens + option contiguïté
  const tokens = input.split(/\s+/).filter(Boolean);
  const motsContiguous = (typeof isMotContiguActive === "function")
    ? isMotContiguActive()          // Interprété désormais comme "CONTIGUS seulement"
    : !!document.getElementById('ordreExactCheckbox')?.checked;

  const tabVersets = (typeof fTabVersets === "function") ? fTabVersets() : [];

  // --- Helpers pour le mode contigu (ordre non requis)
  function buildNeed(arr) {
    const need = new Map();
    for (const t of arr) need.set(t, (need.get(t) || 0) + 1);
    return need;
  }
  function allSatisfied(need) {
    for (const v of need.values()) if (v > 0) return false;
    return true;
  }

  // --- 5) Parcours des versets (colonne racines = v[7])
  for (const verset of tabVersets) {
    if (!verset) continue;
    const nSoura = verset[0];
    const nVerset = verset[1];
    const ref = `${nSoura}.${nVerset}`;

    const racines = verset[7]
      ? (typeof normaliserTexte === "function" ? normaliserTexte(verset[7]) : String(verset[7]))
        .split(/\s+/)
        .filter(Boolean)
      : [];

    if (!racines.length) continue;

    let ok = false;
    const idxSet = new Set();

    if (motsContiguous) {
      // ---- CONTIGU : fenêtre k, ordre NON requis (multiensemble)
      const k = tokens.length;
      if (k <= racines.length) {
        for (let start = 0; start <= racines.length - k; start++) {
          const win = racines.slice(start, start + k);
          const need = buildNeed(tokens);

          // On "consomme" les besoins avec les mots de la fenêtre (égalité stricte sur les racines)
          for (let i = 0; i < win.length && !allSatisfied(need); i++) {
            const w = win[i];
            if (need.has(w) && need.get(w) > 0) {
              need.set(w, need.get(w) - 1);
            }
          }

          if (allSatisfied(need)) {
            ok = true;
            // surligner TOUTE la fenêtre contiguë trouvée
            for (let t = 0; t < k; t++) idxSet.add(start + t);
            // on continue pour marquer d'autres occurrences éventuelles
          }
        }
      }
    } else {
      // ---- Mode "non ordonné" (inchangé) :
      //      - chaque token doit apparaître au moins une fois dans `racines`
      //      - on surligne TOUTES les occurrences correspondantes
      ok = true;
      for (const tok of tokens) {
        let foundOne = false;
        for (let i = 0; i < racines.length; i++) {
          if (racines[i] === tok) {
            idxSet.add(i);
            foundOne = true; // on ne break PAS : on enregistre toutes les occurrences
          }
        }
        if (!foundOne) { ok = false; break; }
      }
    }

    if (ok) {
      resultats.push(ref);
      motsEnSurbrillance[ref] = Array.from(idxSet).sort((a, b) => a - b);
    }
  }

  // --- 6) Préparation de l’affichage ---
  totalMotsTrouves = Object.values(motsEnSurbrillance).reduce((acc, arr) => acc + arr.length, 0);
	if(!totalMotsTrouves){
		//document.getElementById("labelResultat").innerHTML = "Aucun livre selectionné";
		//afficherMasquerZoneAdesParametres(true);
		//alertMsgBoxTemp("Aucun livre selectionné");
		if (typeof ChercheMotsMain === 'function') {ChercheMotsMain(1);}
		return;
  }else{
		if (typeof sauvegarderMot === "function") try { sauvegarderMot(); } catch { }
	}
  lngCourant = 2;
  alignCourant = "right";

  // Libellés d’affichage dynamiques
  const getChk = id => !!document.getElementById(id)?.checked;

  var labelModeMot = localizedMotEntier();
  labelModeMot = '[' + labelModeMot + ']';

  var motsContigus = localizedMotsContigus();
  const exactOn = (typeof useExact !== 'undefined') ? !!useExact : getChk('paramRechercheMotEntier');

  // État "mots contigus" (ordre & contiguïté)
  const contigOn = (typeof isOrdreContiguActive === 'function')
    ? !!isOrdreContiguActive()
    : (typeof motsContiguous !== 'undefined'
      ? !!motsContiguous
      : !!document.getElementById('ordreExactCheckbox')?.checked);
	input=shortenLabel(input || '');
  progEnCours = ` 📖🍃 Zoom 1 > القرآن الكريم <br>
    <div class="toolbar1 zc-popup-zoom-motline" style="max-height: 300px; overflow-y: auto; padding: 5px;">
      Racines == 
      <span class="rouge">
        <a href="#"
           class="zc-popup-mot-hit"
           onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${String(input || '')}'); } else { document.getElementById('mot').value='${String(input || '')}'; } return false;"
           style="text-decoration:underline;">${String(input || '').replace(/ /g, " + ")}</a>
			</span><a href="#"
           class="zc-popup-ctx-tab"
           onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${String(input || '')}'); } else { document.getElementById('mot').value='${String(input || '')}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${String(input || '')}', this); } return false;"
           title="Menu contextuel">☰</a>
			<br>
    </div>
  `;

  if (typeof afficherPageMulti === "function") {
    afficherPageMulti(resultats, lngCourant, alignCourant, maxPage, { zoomTier: 1 });
  }
  return resultats;
}


/* === Helpers mapping (si pas déjà définis) === */
// MAP_TRADS : { code → { name, lng } }  (doit être défini qqpart dans ton code)

function codeFromLngCom(val) {
  const n = Number(val);
  for (const c in MAP_TRADS) {
    if (MAP_TRADS[c].lng === n) return c;
  }
  return 'lx';
}

/* Setter unique pour le select #Traduction (UI + storage + globals) */
function setTraduction(code, { persist = true } = {}) {
  const sel = document.getElementById('Traduction');
  const key = String(code || '').toLowerCase();
  if (sel && sel.value !== key) sel.value = key;

  const meta = MAP_TRADS[key] || MAP_TRADS['lx'];

  if (persist) {
    if (typeof changerTraductionSelectionnee === 'function') {
      // Appelle ta fonction centrale (elle met aussi à jour localStorage)
      changerTraductionSelectionnee(key);
    } else {
      // Fallback : mettre à jour les globals + localStorage ici
      window.traductionSelectionnee = meta.name;
      window.lngCom = meta.lng;
      try {
        localStorage.setItem('tradCode', key);
        localStorage.setItem('traductionSelectionnee', meta.name);
        localStorage.setItem('lngCom', String(meta.lng));
      } catch (_) { }
    }
  }
}
// Ne PAS forcer de valeur ici
// var traductionSelectionnee = "Alfamous";
// window.lngCom = 3;

// Déclare seulement (sera initialisé à l'init)
let traductionSelectionnee;
let lngCom;

// ---- Mapping (code du <select> → libellé + colonne) ----
// ===== Traductions (doivent être définies AVANT tout accès) =====
const DEFAULT_TRAD = 'lx';
const DEFAULT_LNG = 3;        // colonne Alfamous
const STORAGE_KEY_TRAD_CODE = 'tradCode';

const MAP_TRADS = {
  "0": { name: "No Comment", lng: 0 },
  "lx": { name: "Alfamous", lng: 3 },
  "fr": { name: "Tradition.FR", lng: 4 },
  "fr2": { name: "Tradition.FR2", lng: 11 },
  "en": { name: "Tradition.EN", lng: 5 },
  "kab": { name: "Tradition.kab", lng: 6 },
  "es": { name: "Tradition.ES", lng: 9 },
  "fr3": { name: "Transcription.FR3", lng: 10 },
  "ar": { name: "Racines.AR", lng: 7 }
};

(function bootstrapTradSafe() {
  function ready() { return typeof MAP_TRADS === 'object' && MAP_TRADS && MAP_TRADS.lx; }
  function run() {
    let code = null;
    try { code = localStorage.getItem(STORAGE_KEY_TRAD_CODE); } catch { }
    if (!code || !MAP_TRADS[code]) code = DEFAULT_TRAD;
    _applyFromCode(code, { syncSelect: false, persist: true });

    if (!Number.isInteger(lngCom)) {
      lngCom = MAP_TRADS[code].lng || DEFAULT_LNG;
      try { localStorage.setItem('lngCom', String(lngCom)); } catch { }
    }
  }
  if (ready()) run();
  else {
    let tries = 0;
    const t = setInterval(() => {
      if (ready() || ++tries > 50) { clearInterval(t); if (ready()) run(); }
    }, 0);
  }
})();



function _save(code, meta) {
  try {
    localStorage.setItem(STORAGE_KEY_TRAD_CODE, code);
    localStorage.setItem('traductionSelectionnee', meta.name); // compat
    localStorage.setItem('lngCom', String(meta.lng));          // compat
  } catch (_) { }
}

function _applyFromCode(code, { syncSelect = true, persist = true } = {}) {
  const key = (code || '').toLowerCase();
  const meta = MAP_TRADS[key] || MAP_TRADS['lx'];

  traductionSelectionnee = meta.name;
  lngCom = meta.lng;

  if (persist) _save(key, meta);

  if (syncSelect) {
    const sel = document.getElementById('Traduction');
    if (sel && sel.value !== key) sel.value = key;
  }
}
// --- helpers ---
function getTradSelects() {
  return [];
}
function syncAllTradSelectsTo(code) {
  getTradSelects().forEach(sel => { if (sel && sel.value !== code) sel.value = code; });
}

/**
 * Fusionne la colonne Lexique (v[3]) avec la traduction courante v[lngCom],
 * comme dans moduleLexique():
 * - si lngCom != 3: "v[3] + '\n----\n' + v[lngCom]"
 * - sinon: seulement v[3]
 */
function buildCommentaireFusionneVerset(v, lngComVal) {
  if (!v) return "";
  let commentaireLX = (typeof v[3] === 'string') ? v[3] : "";
  let commentaireBrut = (typeof v[lngComVal] === 'string') ? v[lngComVal] : "";
  if (lngComVal != 3) {
    if (commentaireLX) commentaireLX += '\n----\n';
    commentaireBrut = commentaireLX + commentaireBrut;
  }
  return commentaireBrut;
}

// --- init au DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('Traduction');
  if (!sel) {
    try { if (typeof syncTraductionPickerButtonLabels === 'function') syncTraductionPickerButtonLabels(); } catch (_) { }
    return;
  }

  // Récupère le code validé au boot (ou défaut lx)
  let code = null;
  try { code = localStorage.getItem('tradCode'); } catch { }
  if (!code || !MAP_TRADS[code]) code = DEFAULT_TRAD;
  if (sel.querySelector(`option[value="${code}"]`)?.disabled) code = DEFAULT_TRAD;

  // Aligne l’UI et confirme l’état (persiste proprement)
  sel.value = code;
  _applyFromCode(code, { syncSelect: false, persist: true });

  sel.addEventListener('change', (e) => {
    const c = String(e.target.value || '').toLowerCase();
    changerTraductionSelectionnee(c);
    let afterApply = null;
    try { afterApply = window.__zcTraductionAfterApply; } catch (_) { afterApply = null; }
    if (typeof afterApply === 'function') {
      try { afterApply(c); } catch (err) { console.warn(err); }
      try { delete window.__zcTraductionAfterApply; } catch (_) { window.__zcTraductionAfterApply = undefined; }
      try { delete window.__zcTraductionAfterChangeMode; } catch (_) { window.__zcTraductionAfterChangeMode = undefined; }
      try { delete window.__zcTraductionSourceKind; } catch (_) { window.__zcTraductionSourceKind = undefined; }
      try { if (typeof window.zcCloseTraductionPopup === 'function') window.zcCloseTraductionPopup(); } catch (_) { }
      return;
    }

    let modeLex = null;
    try { modeLex = window.__zcTraductionAfterChangeMode; } catch (_) { }
    try { delete window.__zcTraductionAfterChangeMode; } catch (_) { window.__zcTraductionAfterChangeMode = undefined; }

    if (modeLex === 4) {
      try { if (typeof ChercheMotsMain === 'function') ChercheMotsMain(4); } catch { }
    } else {
      try {
        if (typeof afficherPageMulti === 'function') {
          const a = window._lastPageMultiArgs;
          if (a && a.opts && a.opts.souratMode && typeof moduleSourat === 'function' && Number.isFinite(Number(a.opts.numSoura))) {
            const nv = Number.isFinite(Number(a.opts.numVerset)) ? Number(a.opts.numVerset) : 1;
            moduleSourat(Number(a.opts.numSoura), nv);
          } else if (a && Array.isArray(a.resultats)) {
            afficherPageMulti(a.resultats, a.lng, a.al1, a.maxPage, Object.assign({}, a.opts || {}, { zoomTier: a.zoomTier }));
          } else if (Array.isArray(resultats) && resultats.length) {
            afficherPageMulti(resultats, lngCourant, alignCourant, null);
          }
        }
      } catch (e) {
        console.warn('Rafraîchissement popup résultats après changement de livre :', e);
      }
    }

    try { delete window.__zcTraductionAfterApply; } catch (_) { window.__zcTraductionAfterApply = undefined; }
    try { delete window.__zcTraductionSourceKind; } catch (_) { window.__zcTraductionSourceKind = undefined; }
    try { if (typeof window.zcCloseTraductionPopup === 'function') window.zcCloseTraductionPopup(); } catch (_) { }
  }, { passive: true });

  try { if (typeof syncTraductionPickerButtonLabels === 'function') syncTraductionPickerButtonLabels(); } catch (_) { }
});

document.addEventListener('DOMContentLoaded', () => {//pour desactiver les clics dans fenetre minimisée
  const btn = document.getElementById('btnAfficherPopup');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    // En mode minimisé, tout clic sur le wrapper rouvre la popup uniquement
    if (btn.classList.contains('minimized')) {
      e.preventDefault();
      e.stopPropagation();
      afficherPopup(); // ta fonction qui remet la fenêtre
    }
  }, { passive: false });
});


// --- rendre changerTraductionSelectionnee idempotent ---
function changerTraductionSelectionnee(code) {
  _applyFromCode(code, { syncSelect: true, persist: true });
  syncAllTradSelectsTo(code);
  try { if (typeof syncTraductionPickerButtonLabels === 'function') syncTraductionPickerButtonLabels(); } catch (_) { }
}



/* ========== Libellés identiques à index.html (source de vérité UI) ========== */
const TRAD_LABELS = {
  "0": "No Comment",
  "lx": "@everyone - Lexique ",
  "fr": "@M.Hamidullah (Tradition FR)",
  "fr2": "@french_montada (Tradition FR2)",
  "en": "@A.Yusuf Ali (Tradition EN)",
  "kab": "@R.A.Mansour (Tradition KAB)",
  "es": "@Garcia (Tradition ES)",
  "fr3": "@CSC (Transcription FR3)",
  "ar": "@CSC (جذر - Racines AR)"
};

/** Libellé affiché de l’option courante du livre de commentaires (#Traduction). */
function getTraductionBookDisplayLabel() {
  try {
    const sel = document.getElementById('Traduction');
    if (sel && sel.options && sel.selectedIndex >= 0) {
      const opt = sel.options[sel.selectedIndex];
      const t = String(opt.textContent || opt.label || '').trim();
      if (t) return t;
    }
    const code = typeof getCurrentTradCode === 'function' ? getCurrentTradCode() : '';
    if (code && TRAD_LABELS[code]) return String(TRAD_LABELS[code]).trim();
  } catch (_) { }
  return '';
}

/** Modèle i18n du titre / libellé long (panneau Paramètres) — remplacer {{livre}} par le livre courant. */
function zcTraductionPickerTitleTemplate() {
  try {
    const L = (typeof getUILang === 'function') ? String(getUILang() || 'FR') : 'FR';
    const key = L.toUpperCase();
    const dict = (window.I18N_TITLES && window.I18N_TITLES[key]) || (window.I18N_TITLES && window.I18N_TITLES.FR);
    if (!dict) return 'Recherche dans le livre de commentaires actif : {{livre}}';
    const v = dict.btnOpenTraductionPopupParams;
    if (v != null && String(v).trim() !== '') return String(v);
  } catch (_) { }
  return 'Recherche dans le livre de commentaires actif : {{livre}}';
}

function zcFormatTraductionPickerFullTitle() {
  let livre = '';
  try {
    livre = (typeof getTraductionBookDisplayLabel === 'function' ? getTraductionBookDisplayLabel() : '').trim();
  } catch (_) { }
  if (!livre) livre = '—';
  const tpl = zcTraductionPickerTitleTemplate();
  if (tpl.indexOf('{{livre}}') >= 0) return tpl.split('{{livre}}').join(livre);
  return livre ? (tpl + (tpl ? ' : ' : '') + livre) : tpl;
}

function syncTraductionPickerButtonLabels() {
  const livre = (typeof getTraductionBookDisplayLabel === 'function' ? getTraductionBookDisplayLabel() : '').trim() || '—';
  const full = zcFormatTraductionPickerFullTitle();

  document.querySelectorAll('.zc-trad-pick-label').forEach(function (el) {
    const btn = el.closest('button');
    if (btn && btn.id === 'btnOpenTraductionPopupParams') {
      el.textContent = full;
    } else {
      el.textContent = livre;
    }
  });

  [
    'btnOpenTraductionPopupParams',
    'btnZcParamsTabBook',
    'tipTab__btnZcParamsTabBook',
    'btnTradFromPopup',
    'btnTradFromPopupZoom0',
    'btnTradFromLexique'
  ].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('title', full);
    el.setAttribute('aria-label', full);
  });
}

window.getTraductionBookDisplayLabel = getTraductionBookDisplayLabel;
window.zcTraductionPickerTitleTemplate = zcTraductionPickerTitleTemplate;
window.zcFormatTraductionPickerFullTitle = zcFormatTraductionPickerFullTitle;
window.syncTraductionPickerButtonLabels = syncTraductionPickerButtonLabels;

window.zcToggleParamME = function () {
  if (typeof window.zcToggleSearchPref === "function") {
    window.zcToggleSearchPref("me", "zcToggleParamME");
    return;
  }
  const c = document.getElementById('paramRechercheMotEntier');
  if (!c) return;
  c.checked = !c.checked;
  if (typeof changerEtatParamRechercheMotEntier === 'function') changerEtatParamRechercheMotEntier();
};

window.zcToggleParamMC = function () {
  if (typeof window.zcToggleSearchPref === "function") {
    window.zcToggleSearchPref("mc", "zcToggleParamMC");
    return;
  }
  const c = document.getElementById('ordreExactCheckbox');
  if (!c) return;
  c.checked = !c.checked;
  if (typeof changerEtatOrdreExactCheckbox === 'function') changerEtatOrdreExactCheckbox();
};

window.zcOpenTraductionFromParamsTab = function () {
  const b = document.getElementById('btnOpenTraductionPopupParams');
  if (b) {
    try { b.click(); } catch (_) { }
    return;
  }
  try { delete window.__zcTraductionAfterChangeMode; delete window.__zcTraductionRefreshSourat; } catch (_) { }
  if (typeof window.zcOpenTraductionPopup === 'function') window.zcOpenTraductionPopup();
};

/* Code courant (clé du select, ex. 'lx') depuis storage/état/UI */
function getCurrentTradCode() {
  // 1) on privilégie toujours le stockage persistant et on vérifie qu'il correspond à une entrée valide
  try {
    const code = localStorage.getItem(STORAGE_KEY_TRAD_CODE);
    if (code && MAP_TRADS[code]) return code;
  } catch { }
  // 2) sinon on lit ce que dit le <select> s’il existe et que la valeur est valide
  const sel = document.getElementById('Traduction');
  if (sel && MAP_TRADS[sel.value]) return sel.value;
  // 3) défaut sûr
  return 'lx';
}

/* Rendu d’un <select> basé sur #Traduction (mêmes valeurs/labels) */
function renderSelectLangue({ id, style, className, title } = {}) {
  const cur = getCurrentTradCode();
  const opts = Object.keys(TRAD_LABELS).map(code =>
    `<option value="${code}" ${code === cur ? 'selected' : ''}>${TRAD_LABELS[code]}</option>`
  ).join('');
  const t = title ? ` title="${title}"` : '';
  const cls = className ? ` class="${className}"` : '';
  const st = style ? ` style="${style}"` : '';
  return `<select id="${id || ''}"${t}${cls}${st}>${opts}</select>`;
}

/**
 * Select inline "livre de commentaires" rendu dans les cartes Zoom.
 * Toujours visible (meme sur "No Comment") et applique immediatement le refresh.
 */
function renderInlineTraductionSelect({ id, style, className, title, sourceKind } = {}) {
  const base = renderSelectLangue({ id, style, className, title });
  const src = String(sourceKind || 'pageMulti').toLowerCase();
  const onchange = ` onchange="if(typeof window.zcApplyTradCodeAndRefresh==='function'){window.zcApplyTradCodeAndRefresh(this.value,'${src}');} return false;"`;
  return base.replace('<select', `<select${onchange}`);
}

function zcApplyTradCodeAndRefresh(code, sourceKind) {
  const key = String(code || '').toLowerCase();
  const src = String(sourceKind || 'pageMulti').toLowerCase();
  try {
    if (src === 'lexique') {
      window.__zcTraductionAfterChangeMode = 4;
      window.__zcTraductionSourceKind = 'lexique';
      delete window.__zcTraductionAfterApply;
      delete window.__zcTraductionRefreshSourat;
    } else if (src === 'sourat') {
      window.__zcTraductionSourceKind = 'sourat';
      delete window.__zcTraductionAfterApply;
      delete window.__zcTraductionRefreshSourat;
      delete window.__zcTraductionAfterChangeMode;
    } else {
      window.__zcTraductionSourceKind = 'pageMulti';
      delete window.__zcTraductionAfterApply;
      delete window.__zcTraductionAfterChangeMode;
      delete window.__zcTraductionRefreshSourat;
    }
  } catch (_) { }
  const sel = document.getElementById('Traduction');
  if (sel) {
    sel.value = key;
    try {
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (_) {
      try { sel.dispatchEvent(new Event('change')); } catch (_) { }
    }
    return;
  }
  // Fallback defensif si #Traduction n'est pas disponible.
  try { changerTraductionSelectionnee(key); } catch (_) { }
  try {
    if (typeof afficherPageMulti === 'function') {
      const a = window._lastPageMultiArgs;
      if (a && a.opts && a.opts.souratMode && typeof moduleSourat === 'function' && Number.isFinite(Number(a.opts.numSoura))) {
        const nv = Number.isFinite(Number(a.opts.numVerset)) ? Number(a.opts.numVerset) : 1;
        moduleSourat(Number(a.opts.numSoura), nv);
      } else if (a && Array.isArray(a.resultats)) {
        afficherPageMulti(a.resultats, a.lng, a.al1, a.maxPage, Object.assign({}, a.opts || {}, { zoomTier: a.zoomTier }));
      } else if (Array.isArray(resultats) && resultats.length) {
        afficherPageMulti(resultats, lngCourant, alignCourant, null);
      }
    }
  } catch (_) { }
}
window.zcApplyTradCodeAndRefresh = zcApplyTradCodeAndRefresh;

/** Échappement minimal pour attributs HTML (title, style). */
// zcEscapeHtmlAttr / zcEscapeHtmlText : fournis globalement par jsZC/zc-utils.js.

/** Bouton « Historik » : ouvre la popup globale (#zcHistorikOverlay). */
function renderButtonHistorik({ id, style, className, title, chercheMode = 2, withLoupe = false } = {}) {
  const bid = id || 'btnHistorikOpen';
  const tRaw = title != null && String(title).trim() !== ''
    ? String(title)
    : (typeof window.zcI18nTitleForId === 'function'
      ? window.zcI18nTitleForId('btnZcParamsTabHistorik', 'Historique des mots saisis')
      : 'Historique des mots saisis');
  const tEsc = zcEscapeHtmlAttr(tRaw);
  const tAttr = ` title="${tEsc}" aria-label="${tEsc}"`;
  let baseCls = className ? String(className) : 'bouton zc-btn-historik-inline';
  if (withLoupe) baseCls += ' zc-btn-historik-with-loupe';
  const cls = ` class="${zcEscapeHtmlAttr(baseCls)}"`;
  const st = style ? ` style="${zcEscapeHtmlAttr(style)}"` : '';
  const m = Number(chercheMode);
  const modeNum = Number.isFinite(m) ? Math.floor(m) : 2;
  const loupe = withLoupe ? '<i class="fas fa-search" aria-hidden="true"></i>' : '';
  return `<button type="button" id="${bid}"${tAttr}${cls}${st} onclick="try{window.__zcHistorikChercheMode=${modeNum};}catch(_){}if(window.zcOpenHistorikPopup)window.zcOpenHistorikPopup();return false;">${loupe}Historik</button>`;
}

/**
 * Bouton ouvrant la popup globale de choix du livre (#zcTraductionOverlay, #Traduction).
 * openKind: 'lexique' | 'pageMulti' | 'sourat' | 'default'
 */
function renderButtonTraduction(opts = {}) {
  const {
    id,
    style,
    className,
    title,
    openKind = 'default',
    souratCtx,
    htmlInner,
    textLabel = 'Livre'
  } = opts;
  const bid = id || 'btnTraductionOpen';
  const tAttr = title
    ? ` title="${zcEscapeHtmlAttr(title)}" aria-label="${zcEscapeHtmlAttr(title)}"`
    : '';
  const st = style ? ` style="${zcEscapeHtmlAttr(style)}"` : '';
  let modeJs = '';
  if (openKind === 'lexique') {
    modeJs = "try{window.__zcTraductionAfterChangeMode=4;window.__zcTraductionSourceKind='lexique';delete window.__zcTraductionAfterApply;delete window.__zcTraductionRefreshSourat;}catch(_){}";
  } else if (openKind === 'pageMulti') {
    modeJs = "try{window.__zcTraductionSourceKind='pageMulti';delete window.__zcTraductionAfterApply;delete window.__zcTraductionAfterChangeMode;delete window.__zcTraductionRefreshSourat;}catch(_){}";
  } else if (openKind === 'sourat' && souratCtx && Number.isFinite(Number(souratCtx.numSoura)) && Number.isFinite(Number(souratCtx.numVerset))) {
    modeJs = "try{window.__zcTraductionSourceKind='sourat';delete window.__zcTraductionAfterApply;delete window.__zcTraductionRefreshSourat;delete window.__zcTraductionAfterChangeMode;}catch(_){}";
  } else {
    modeJs = "try{delete window.__zcTraductionAfterApply;delete window.__zcTraductionSourceKind;delete window.__zcTraductionAfterChangeMode;delete window.__zcTraductionRefreshSourat;}catch(_){}";
  }
  const icoHtml = htmlInner != null ? htmlInner : '<i class="fas fa-book" aria-hidden="true"></i>';
  const livreTxt = zcEscapeHtmlText(
    (typeof getTraductionBookDisplayLabel === 'function' ? getTraductionBookDisplayLabel() : '') || textLabel
  );
  const extraCls = (className || '').indexOf('zc-trad-pick-btn') >= 0 ? '' : ' zc-trad-pick-btn';
  const clsFinal = className
    ? ` class="${zcEscapeHtmlAttr(String(className) + extraCls)}"`
    : ` class="bouton zc-btn-trad-inline zc-trad-pick-btn"`;
  return `<button type="button" id="${bid}"${tAttr}${clsFinal}${st} onclick="${modeJs}event.preventDefault();event.stopPropagation();if(window.zcOpenTraductionPopup)window.zcOpenTraductionPopup();return false;"><span class="zc-top-action-ico" aria-hidden="true">${icoHtml}</span><span class="zc-top-action-label zc-trad-pick-label">${livreTxt}</span></button>`;
}

window.zcCloseTraductionPopup = function () {
  const ov = document.getElementById('zcTraductionOverlay');
  if (!ov) return;
  try {
    if (ov.__zLockTimer) {
      clearInterval(ov.__zLockTimer);
      ov.__zLockTimer = null;
    }
  } catch (_) { }
  try {
    const dock = ov.__zcTraductionDock;
    if (dock && dock.parent) {
      if (dock.next && dock.next.parentNode === dock.parent) dock.parent.insertBefore(ov, dock.next);
      else dock.parent.appendChild(ov);
    }
  } catch (_) { }
  ov.style.display = 'none';
  ov.setAttribute('aria-hidden', 'true');
  try { delete window.__zcTraductionAfterApply; } catch (_) { window.__zcTraductionAfterApply = undefined; }
  try { delete window.__zcTraductionAfterChangeMode; } catch (_) { window.__zcTraductionAfterChangeMode = undefined; }
  try { delete window.__zcTraductionRefreshSourat; } catch (_) { window.__zcTraductionRefreshSourat = undefined; }
  try { delete window.__zcTraductionSourceKind; } catch (_) { window.__zcTraductionSourceKind = undefined; }
};

window.zcOpenTraductionPopup = function () {
  const ov = document.getElementById('zcTraductionOverlay');
  if (!ov) return;
  try {
    if (!ov.__zcTraductionDock) {
      ov.__zcTraductionDock = { parent: ov.parentNode, next: ov.nextSibling };
    }
    if (document.body && ov.parentNode !== document.body) {
      document.body.appendChild(ov);
    }
  } catch (_) { }
  function raiseCommentOverlayTop() {
    try {
      if (typeof window.getNextZIndex === 'function') {
        const z = Number(window.getNextZIndex()) || 0;
        if (z) ov.style.zIndex = String(z);
        return;
      }
    } catch (_) { }
    const inc = (typeof window.STEP === 'number' && window.STEP > 0) ? window.STEP : 1;
    let zTop = 10050;
    try {
      if (typeof window.getMaxZIndexExcluding === 'function') {
        zTop = Math.max(zTop, Number(window.getMaxZIndexExcluding(ov)) + inc);
      } else if (typeof window.getMaxZIndex === 'function') {
        zTop = Math.max(zTop, Number(window.getMaxZIndex()) + inc);
      }
    } catch (_) { }
    const cur = parseInt(String(ov.style.zIndex || '0'), 10) || 0;
    if (zTop !== cur) ov.style.zIndex = String(zTop);
  }
  ov.style.display = 'flex';
  ov.setAttribute('aria-hidden', 'false');
  try {
    if (typeof window.zcBringToFront === 'function') window.zcBringToFront(ov);
  } catch (_) { }
  try { raiseCommentOverlayTop(); } catch (_) { }
  try { zcLowerZoom0Below(ov); } catch (_) { }
  try {
    if (ov.__zLockTimer) clearInterval(ov.__zLockTimer);
    ov.__zLockTimer = setInterval(() => {
      if (ov.style.display !== 'flex') return;
      raiseCommentOverlayTop();
    }, 220);
  } catch (_) { }
  const sel = document.getElementById('Traduction');
  setTimeout(function () {
    try {
      if (sel && typeof getCurrentTradCode === 'function') {
        const code = getCurrentTradCode();
        if (code) sel.value = code;
      }
      try { raiseCommentOverlayTop(); } catch (_) { }
      try { zcLowerZoom0Below(ov); } catch (_) { }
      if (sel) sel.focus();
    } catch (_) { }
  }, 50);
};

(function bindTraductionPopupUi() {
  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }
  onReady(function () {
    const ov = document.getElementById('zcTraductionOverlay');
    if (!ov) return;
    ov.addEventListener('mousedown', function () {
      try {
        if (typeof window.getNextZIndex === 'function') {
          ov.style.zIndex = String(window.getNextZIndex());
        } else if (typeof window.getMaxZIndexExcluding === 'function') {
          const inc = (typeof window.STEP === 'number' && window.STEP > 0) ? window.STEP : 1;
          ov.style.zIndex = String(Number(window.getMaxZIndexExcluding(ov)) + inc);
        }
      } catch (_) { }
    }, true);
    ov.addEventListener('click', function (e) {
      if (e.target === ov) window.zcCloseTraductionPopup();
    });
    const x = document.getElementById('zcTraductionPopupClose');
    if (x) x.addEventListener('click', function () { window.zcCloseTraductionPopup(); });
    const f = document.getElementById('btnTraductionPopupFermer');
    if (f) f.addEventListener('click', function () { window.zcCloseTraductionPopup(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (ov.style.display === 'flex') {
        try { e.preventDefault(); } catch (_) { }
        window.zcCloseTraductionPopup();
      }
    }, true);
  });
})();


/* ===================== Popups résultats Zoom 0–3 (une par palier) ===================== */

/** Palier 0–3 depuis opts explicite ou depuis progEnCours / souratMode. */
function zcResultZoomTierFromOptsAndProg(opts) {
  if (opts && opts.zoomTier != null && Number.isFinite(Number(opts.zoomTier))) {
    const z = Number(opts.zoomTier);
    if (z >= 0 && z <= 3) return z;
  }
  try {
    if (opts && opts.souratMode) return 0;
  } catch (_) { }
  const p = String(typeof progEnCours !== 'undefined' ? progEnCours : '');
  // Uniquement la ligne d’en-tête (avant le 1er <br>) : évite qu’un « Zoom 2 » dans le corps ne prenne le pas sur « Zoom 1 ».
  const head = (p.split(/<br\s*\/?>/i)[0] || p).trim();
  const m = head.match(/Zoom\s*([0-3])\b/i);
  if (m) return Number(m[1]);
  return 2;
}

/** Ids DOM stables par palier (Z0 conserve les ids historiques racine / body / infos). */
function zcResultZoomDomIds(tier) {
  const raw = Number(tier);
  const z = (Number.isFinite(raw) && raw >= 0 && raw <= 3) ? Math.floor(raw) : 2;
  if (z === 0) {
    return {
      root: 'popupResultats',
      body: 'popupResultatsBody',
      infos: 'infosProgEnCours',
      contenuInner: 'contenuTexte1',
      badgeSel: 'badgeSelectMultiVersets0',
      historikZoom0: 'btnHistorikFromPopupZoom0',
      historikPopup: 'btnHistorikFromPopupZ0',
      historikLexique: 'btnHistorikFromLexiqueZ0'
    };
  }
  return {
    root: 'popupResultatsZ' + z,
    body: 'popupResultatsBodyZ' + z,
    infos: 'infosProgEnCoursZ' + z,
    contenuInner: 'contenuTexteZ' + z,
    badgeSel: 'badgeSelectMultiVersetsZ' + z,
    historikZoom0: 'btnHistorikFromPopupZoom0Z' + z,
    historikPopup: 'btnHistorikFromPopupZ' + z,
    historikLexique: 'btnHistorikFromLexiqueZ' + z
  };
}
try {
  window.zcResultZoomDomIds = zcResultZoomDomIds;
  window.zcResultZoomTierFromOptsAndProg = zcResultZoomTierFromOptsAndProg;
} catch (_) { }

function zcAnyResultsPopupTierVisible() {
  for (let z = 0; z <= 3; z++) {
    const el = document.getElementById(zcResultZoomDomIds(z).root);
    if (!el) continue;
    try {
      if (el.style.display === 'flex' || el.style.display === 'block') return true;
    } catch (_) { }
    try {
      const cs = window.getComputedStyle(el);
      if (cs.display !== 'none' && cs.visibility !== 'hidden') return true;
    } catch (_) { }
  }
  return false;
}

/** Bandeau titre : ouvre le menu contextuel pour le mot courant (#mot). */
window.zcOpenPopupResultatsHeaderCtx = function (anchorEl) {
  try {
    const motEl = document.getElementById('mot');
    const w = motEl ? String(motEl.value || '').trim() : '';
    if (typeof window.zcShowSelectionContextMenuForWord === 'function') {
      window.zcShowSelectionContextMenuForWord(w, anchorEl || null, { allowEmpty: true });
    } else if (typeof window.openContextMenu === 'function') {
      window.openContextMenu(anchorEl || null);
    }
  } catch (_) { }
  return false;
};

window.fermerPopupFromBtn = function (btn) {
  const root = btn && btn.closest ? btn.closest('.zc-popup-zoom-tier') : null;
  const raw = root && root.getAttribute('data-zc-zoom-tier');
  const t = raw != null && raw !== '' ? Number(raw) : 0;
  fermerPopupTier(Number.isFinite(t) ? t : 0);
};

function fermerPopupTier(tier) {
  stopLireTexte();
  const ids = zcResultZoomDomIds(tier);
  const popup = document.getElementById(ids.root);
  const btn = document.getElementById("btnAfficherPopup");
  if (!popup) return;
  popup.style.display = "none";
  const bodyEl = document.getElementById(ids.body);
  if (bodyEl) bodyEl.innerHTML = "";
  const infosEl = document.getElementById(ids.infos);
  if (infosEl) infosEl.innerHTML = "";
  try {
    if (!zcAnyResultsPopupTierVisible()) {
      if (btn) btn.style.display = "none";
      progEnCours = "";
    }
  } catch (_) { }
}
try { window.fermerPopupTier = fermerPopupTier; } catch (_) { }

/** Ferme uniquement la popup Zoom 0 (compat appels historiques). */
function fermerPopup() {
  fermerPopupTier(0);
}

function afficherPopup(tierOpt) {
  const tier = (tierOpt != null && Number.isFinite(Number(tierOpt)))
    ? Number(tierOpt)
    : (typeof window.__zcLastResultZoomTier === 'number' ? window.__zcLastResultZoomTier : 2);
  const ids = zcResultZoomDomIds(tier);
  const popup = document.getElementById(ids.root);
  const btn = document.getElementById("btnAfficherPopup");
  if (!popup) return;

  popup.style.width = "var(--zc-popup-unified-max-width)";
  popup.style.maxWidth = "var(--zc-popup-unified-max-width)";
  popup.style.height = "var(--zc-popup-unified-max-height)";
  popup.style.maxHeight = "var(--zc-popup-unified-max-height)";

  popup.style.display = "flex";
  /* Une seule montée en z-index (comme #popupHtml / Warsh) : évite deux getNextZIndex d’affilée
   * qui faisaient grimper Zoom 0–3 systématiquement au-dessus du reste. */
  try {
    zcRaiseResultPopupAboveAll(tier);
  } catch (_) {
    try {
      var zFb = getNextZIndex();
      popup.style.zIndex = String(zFb);
      try {
        if (typeof window.zcLogTopZ === "function" && typeof window.zcIsTrackedTopZWindow === "function") {
          if (window.zcIsTrackedTopZWindow(popup)) {
            window.zcLogTopZ("afficherPopup fallback getNextZIndex (pile topZ)", {
              windowId: popup.id || "",
              tier: tier,
              assigned: zFb,
            });
          }
        }
      } catch (_) {}
    } catch (_) {}
  }
  try { zcLowerZoom0Below(popup); } catch (_) { }

  if (btn) {
    btn.classList.remove('minimized');
    btn.style.display = "none";
    btn.setAttribute('aria-expanded', 'true');
  }
}

function alertMsgBoxTemp(message, couleur = "green", duree = 3000) {
  // Crée / récupère la popup centrée
  let box = document.getElementById("alfamousCenterToast");
  const topZ = zcDynamicTopZ();

  if (!box) {
    box = document.createElement("div");
    box.id = "alfamousCenterToast";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    Object.assign(box.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "80vw",
      zIndex: topZ,
      padding: "10px 14px",
      borderRadius: "10px",
      font: "14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif",
      background: "#fff",
      border: "1px solid #ddd",
      boxShadow: "0 8px 28px rgba(0,0,0,.2)",
      textAlign: "center",
      opacity: "0",
      transition: "opacity .25s ease",
      pointerEvents: "auto",          // ⚠️ pour que le bouton X soit cliquable
      boxSizing: "border-box"
    });

    // Conteneur interne pour message + bouton
    const inner = document.createElement("div");
    inner.style.display = "flex";
    inner.style.alignItems = "center";
    inner.style.justifyContent = "center";
    inner.style.gap = "8px";
    inner.style.position = "relative";

    const msgSpan = document.createElement("span");
    msgSpan.id = "alfamousCenterToastMsg";
    msgSpan.style.display = "inline-block";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", "Fermer");
    Object.assign(closeBtn.style, {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontSize: "16px",
      lineHeight: "1",
      padding: "0 2px",
      fontWeight: "700"
    });

    // Gestion de la fermeture manuelle
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (typeof box._hideNow === "function") {
        box._hideNow(true);  // fermeture par bouton
      }
    });

    inner.appendChild(msgSpan);
    inner.appendChild(closeBtn);
    box.appendChild(inner);
    document.body.appendChild(box);
  }
  try {
    if (document.body && box.parentElement !== document.body) {
      document.body.appendChild(box);
    }
  } catch (_) { }

  // Couleurs lisibles — via tokens CSS pour adaptation thème
  const _cs = getComputedStyle(document.documentElement);
  const map = {
    green: { fg: _cs.getPropertyValue('--zc-accent').trim() || "#0a6", border: _cs.getPropertyValue('--zc-accent').trim() || "#0a6" },
    red: { fg: _cs.getPropertyValue('--zc-danger').trim() || "#b20000", border: _cs.getPropertyValue('--zc-danger').trim() || "#b20000" },
    orange: { fg: _cs.getPropertyValue('--zc-text-muted').trim() || "#875a00", border: _cs.getPropertyValue('--zc-text-muted').trim() || "#875a00" },
    blue: { fg: _cs.getPropertyValue('--zc-link').trim() || "#0056b3", border: _cs.getPropertyValue('--zc-link').trim() || "#0056b3" }
  };
  const c = map[couleur] || { fg: couleur, border: couleur };

  box.style.color = c.fg;
  box.style.borderColor = c.border;
  box.style.boxShadow = "0 8px 28px rgba(0,0,0,.2)";
  
  // Met à jour uniquement le texte, sans casser le bouton X
  const msgSpan = box.querySelector("#alfamousCenterToastMsg") || box;
  msgSpan.textContent = String(message ?? "").trim() || "…";

  // Annule d'anciens timers si la popup est réutilisée
  clearTimeout(box.__hideTimer);
  clearTimeout(box.__removeTimer);

  const delay = Math.max(0, Number(duree) || 0);

  // Fonction commune de fermeture (auto ou via X)
  box._hideNow = function () {
    clearTimeout(box.__hideTimer);
    clearTimeout(box.__removeTimer);
    box.style.opacity = "0";
    box.__removeTimer = setTimeout(() => {
      try { box.remove(); } catch { }
    }, 300);
  };

  // Affiche
  try {
    if (typeof window.zcBringToFront === "function") {
      window.zcBringToFront(box, 0);
    } else {
      box.style.zIndex = String(topZ);
    }
  } catch (_) {
    box.style.zIndex = String(topZ);
  }
  requestAnimationFrame(() => { box.style.opacity = "1"; });

  // Cache après 'duree' ms (si > 0)
  if (delay > 0) {
    box.__hideTimer = setTimeout(() => {
      box._hideNow(false);
    }, delay);
  }
}

function zcDynamicTopZ() {
  try {
    if (typeof window.getNextZIndex === "function") return Number(window.getNextZIndex()) || 0;
    if (typeof getNextZIndex === "function") return Number(getNextZIndex()) || 0;
  } catch (_) { }
  const inc = (typeof window.STEP === "number" && window.STEP > 0) ? window.STEP : 1;
  let max = 0;
  try {
    const all = document.body ? document.body.querySelectorAll("*") : [];
    for (let i = 0; i < all.length; i++) {
      const z = parseInt(window.getComputedStyle(all[i]).zIndex, 10);
      if (!Number.isNaN(z) && z > max) max = z;
    }
  } catch (_) { }
  return max + inc;
}

function zcLowerZoom0Below(targetOrZ) {
  // Strategie nettoyee: plus de forçage ad-hoc de Zoom0 ici.
  return;
}
window.zcLowerZoom0Below = zcLowerZoom0Below;

function zcRaiseResultPopupAboveAll(tierOpt) {
  const tier = (tierOpt != null && Number.isFinite(Number(tierOpt)))
    ? Number(tierOpt)
    : (typeof window.__zcLastResultZoomTier === 'number' ? window.__zcLastResultZoomTier : 2);
  const popup = document.getElementById(zcResultZoomDomIds(tier).root);
  if (!popup) return 0;
  try {
    if (
      typeof window.zIndexEffectiveZ === "function" &&
      typeof window.getMaxZIndexExcluding === "function"
    ) {
      const cur = Number(window.zIndexEffectiveZ(popup)) || 0;
      const maxEx = Number(window.getMaxZIndexExcluding(popup)) || 0;
      if (cur > maxEx) return cur;
    }
  } catch (_) {}
  let z = 0;
  try {
    if (typeof window.zcBringToFront === "function") {
      z = Number(window.zcBringToFront(popup, 0)) || 0;
    } else if (typeof window.getNextZIndex === "function") {
      z = Number(window.getNextZIndex()) || 0;
      popup.style.zIndex = String(z);
    } else if (typeof getNextZIndex === "function") {
      z = Number(getNextZIndex()) || 0;
      popup.style.zIndex = String(z);
    } else {
      z = Number(zcDynamicTopZ()) || 1000;
      popup.style.zIndex = String(z);
    }
  } catch (_) { }

  return z;
}
window.zcRaiseResultPopupAboveAll = zcRaiseResultPopupAboveAll;

/**
 * Gabarit popup résultats pour un palier Zoom 0–3 : conteneur plein viewport,
 * en-tête unifié collant, corps scrollable.
 * @param {number} [tierOpt=2] palier 0–3
 * @returns {{ container: HTMLElement, header: Element | null, body: HTMLElement, tier: number, ids: ReturnType<typeof zcResultZoomDomIds> } | null}
 */
function zcPreparePopupResultatsShell(tierOpt) {
  let tier = 2;
  if (tierOpt != null) {
    const n = Number(tierOpt);
    if (Number.isFinite(n)) tier = Math.max(0, Math.min(3, Math.floor(n)));
  }
  const ids = zcResultZoomDomIds(tier);
  const container = document.getElementById(ids.root);
  const header = container?.querySelector(".popup-header");
  const body = document.getElementById(ids.body);
  if (!container || !body) return null;
  try { window.__zcLastResultZoomTier = tier; } catch (_) { }

  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "50%";
  container.style.transform = "translateX(-50%)";
  container.style.background = "var(--zc-surface)";
  container.style.border = "2px solid var(--zc-border)";
  container.style.borderRadius = "10px";
  container.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
  container.style.width = "var(--zc-popup-unified-max-width)";
  container.style.maxWidth = "var(--zc-popup-unified-max-width)";
  container.style.height = "var(--zc-popup-unified-max-height)";
  container.style.maxHeight = "var(--zc-popup-unified-max-height)";
  try {
    if (typeof zcRaiseResultPopupAboveAll === "function") zcRaiseResultPopupAboveAll(tier);
  } catch (_) { }
  try {
    if (typeof zcLowerZoom0Below === "function") zcLowerZoom0Below(container);
  } catch (_) { }
  container.style.overflow = "hidden";

  if (header) {
    header.classList.add("zc-popup-header-unified");
    header.style.position = "sticky";
    header.style.top = "0";
    header.style.zIndex = "1";
    header.style.backgroundColor = "var(--zc-popup-bg)";
    header.style.borderBottom = "1px solid var(--zc-popup-bg-border)";
    header.style.padding = "8px 10px";
    header.style.borderRadius = "8px 8px 0 0";
    header.style.display = "flex";
    header.style.flexDirection = "column";
    header.style.alignItems = "stretch";
    header.style.gap = "6px";
    header.style.justifyContent = "flex-start";
    header.tabIndex = -1;
  }

  body.style.flex = "1";
  body.style.overflowY = "auto";
  body.style.overflowX = "hidden";
  body.style.wordBreak = "break-word";
  body.style.overflowWrap = "break-word";
  body.style.padding = "5px";

  return { container, header: header || null, body, tier, ids };
}
try {
  window.zcPreparePopupResultatsShell = zcPreparePopupResultatsShell;
} catch (_) { }





// Le petit select de langue (fenêtre 0) — rendu unifié (codes 'lx','fr',…)
// opts optionnel : { prebuiltBodyHtml, souratMode, numSoura, numVerset, toolbarExtra } pour Zoom0 (= même #popupResultats que Zoom1)
// Gabarit #popupResultats : zcPreparePopupResultatsShell() (partagé avec moduleLexique).
function afficherPageMulti(resultats, lng, al1, maxPage = null, opts = null) {
  const getChk = id => !!document.getElementById(id)?.checked;
  const titleZoomME = (typeof window.zcI18nTitleForId === 'function')
    ? window.zcI18nTitleForId('labelRechercheMotEntier',
      (typeof localizedMotEntier === 'function') ? localizedMotEntier() : 'Mot Entier')
    : ((typeof localizedMotEntier === 'function') ? localizedMotEntier() : 'Mot Entier');
  const titleZoomMC = (typeof window.zcI18nTitleForId === 'function')
    ? window.zcI18nTitleForId('labelOrdreExactCheckbox',
      (typeof localizedMotsContigus === 'function') ? localizedMotsContigus() : 'Mots Contigus')
    : ((typeof localizedMotsContigus === 'function') ? localizedMotsContigus() : 'Mots Contigus');
  const exactOn = (typeof useExact !== 'undefined') ? !!useExact : getChk('paramRechercheMotEntier');
  const contigOn = (typeof isOrdreContiguActive === 'function')
    ? !!isOrdreContiguActive()
    : !!document.getElementById('ordreExactCheckbox')?.checked;

  // 🔹 Mémoriser le dernier appel pour pouvoir raffraîchir plus tard (opts léger : pas de prebuiltBodyHtml)
  let memoOpts = null;
  if (opts && opts.souratMode && Number.isFinite(Number(opts.numSoura))) {
    memoOpts = {
      souratMode: true,
      numSoura: Number(opts.numSoura),
      numVerset: Number(opts.numVerset)
    };
  }
  const zoomTier = zcResultZoomTierFromOptsAndProg(opts);
  window._lastPageMultiArgs = {
    resultats: Array.isArray(resultats) ? resultats.slice() : [],
    lng,
    al1,
    maxPage,
    opts: memoOpts,
    zoomTier
  };

  // version claire
  const lngComPourCopie = (typeof lngCom === 'number' && lngCom > 0) ? lngCom : 3;
  // Commentaires (FR/AR mixtes)
  let al2 = "left";
  if (lng != 2 && lngComPourCopie == lng) {
    lngCom = 2;//cas où un livre est chargé, le commentaire devient l'original
    al2 = "right";
  }

  const shell = zcPreparePopupResultatsShell(zoomTier);
  if (!shell) return;
  const { container, header, body, ids: idsDom } = shell;

  // --- Rendu des résultats ---
  const tabVersets = fTabVersets();
  // Index rapide "sourate.verset" -> ligne
  const idxVersets = new Map(tabVersets.map(v => [`${v[0]}.${v[1]}`, v]));

  const nbTotal = resultats.length;
  const nbAffiche = (maxPage && nbTotal > maxPage) ? maxPage : nbTotal;
  const resultatsAAfficher = resultats.slice(0, nbAffiche);

  if (maxPage && nbTotal > maxPage) {
    window._dernierResultatZoom = resultats;
  }

  let html = ``;
  if (opts && opts.prebuiltBodyHtml) {
    html = String(opts.prebuiltBodyHtml);
  } else {
  const lngVoix = getLngVoix(lng);

  for (let i = 0; i < resultatsAAfficher.length; i++) {
    const ref = resultatsAAfficher[i];
    const [sourate, verset] = ref.split('.');
    const v = idxVersets.get(`${sourate}.${verset}`);
    if (!v) continue;

    // Texte source nu (sans surbrillance) pour l'audio
    const sourceNu = String(v?.[lng] ?? '');
    const textePourAudio = decodeTexte(sourceNu).replace(/<[^>]*>/g, '');

    // Version avec surbrillance (affichage)
    const motsVerset = normaliserTexte(sourceNu).split(' ');
    const motsSur = motsEnSurbrillance[ref] || [];
    const texteAvecSurbrillance = motsVerset
      .map((mot, idx) => `<span${motsSur.includes(idx) ? ' class="rouge"' : ''}>${mot}</span>`)
      .join(' ');

    const texteCourant = decodeTexte(texteAvecSurbrillance).replace(/'/g, '’');
    const refKey = `${v[0]}.${v[1]}`;
    const isSel = _isRefSelected(refKey);

    // Commentaires fusionnés (Lexique + colonne trad courante)
    const commentaireBrut = buildCommentaireFusionneVerset(v, lngCom);
    let defTexte = commentaireBrut.replace(/'/g, "’").replace(/"/g, "”");
    defTexte = nettoyerCommentairePourHtml(defTexte);

    const defForOnclick = String(commentaireBrut)
      .replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");

    const showDef = Number(lngCom) !== 0 && defTexte.trim() !== "";
    if (Number(lngCom) === 0) defTexte = "";//éviter d'écrire le num soura

    const audioLink = showDef ? `<a href="#"
        onclick="lireTexte('${defForOnclick}', '${getLngVoix(lngCom)}', 1.0); event.preventDefault();"
        title="Lire la définition">🔊</a>` : '';
    const txtTradAuteurHtml = `<span class="zc-result-traducteur" style="display:block;margin-top:${showDef ? '6px' : '2px'};color:#64748b;font-size:0.88em;">${
      renderInlineTraductionSelect({
        id: `zcTradInline_${sourate}_${verset}_${i}`,
        className: 'zc-result-trad-select',
        style: 'max-width:100%;font-size:0.98em;',
        title: (typeof zcFormatTraductionPickerFullTitle === 'function'
          ? zcFormatTraductionPickerFullTitle()
          : 'Choisir la source des commentaires')
      })
    }</span>`;
    const txtCommentaires = (() => {
      const t = String(
        (typeof getTraductionBookDisplayLabel === 'function' ? getTraductionBookDisplayLabel() : '')
      ).trim();
      if (!t || t === 'No Comment' || t === '@everyone - Lexique') return '';
      return t;
    })();
    html += `
      <div class="toolbar1 zc-record-languette zc-record-languette--aya zc-result-card">
        <div class="ref zc-result-card-head">
          (${i + 1})
          <a href="#"
             onclick="moduleSourat(${sourate}, ${verset}); event.preventDefault();"
             style="color:blue; text-decoration:underline;" title="Zoom Sourat">
            📖#${sourate}.${verset}
          </a>
          &nbsp; ${nomSouraPhon(v[0])} | ${nomSouraAR(v[0])}
          &nbsp;
          <a href="#"
             class="zc-popup-ctx-tab"
             onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${sourate}.${verset}'); } else { document.getElementById('mot').value='${sourate}.${verset}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${sourate}.${verset}', this); } return false;"
             title="Menu contextuel">☰</a>
          &nbsp;
          <a href="#"
             onclick="lireTexte('${textePourAudio.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\\n/g, "\\n")}', '${lngVoix}', 1.0); event.preventDefault();"
             ><i class="fas fa-volume-up" title="Lire ce verset"></i></a>
          <a href="#"
             onclick="document.getElementById('mot').value='${v[0]}.${v[1]}'; moduleWarsh('${v[8]}'); return false;"
             ><i class="fas fa-file-pdf" title="Afficher page Warsh"></i></a>
          &nbsp;
          <label class="bouton zc-result-copy-sel" title="Copier versets multiples">
            <i class="fas fa-copy"></i>
            <input
              type="checkbox" 
              id="w0_aya_${v[0]}_${v[1]}"
              data-ref="${refKey}"
              data-texte-html="${encodeURIComponent(
                `[#${v[0]}.${v[1]}] &nbsp; ${texteAvecSurbrillance} <br>----<br> ${defTexte}<br>${txtCommentaires}`
              )}"
              ${isSel ? 'checked' : ''}
              onclick="copierTexteTabSelection(
                this.id,
                this.dataset.ref,
                decodeURIComponent(this.dataset.texteHtml),
                0
              ); event.stopPropagation();">
          </label>
        </div>

        <div class="texte-arabe zc-result-card-aya" style="text-align:${al1};" dir="rtl">
          ${texteAvecSurbrillance}
        </div>

        <div class="ref zc-result-card-comment" style="text-align:${al2}; color:#333; direction:ltr; unicode-bidi:isolate;">
          ${showDef ? `<hr/>${audioLink}&nbsp;<bdi dir="auto">${defTexte}</bdi>` : ``}${txtTradAuteurHtml}
        </div>
      </div>
    `;
  }

  html += `<br><br><br>`;//ajout ligne supp
  if (maxPage && nbTotal > maxPage) {
    html += `
      <div style="text-align:center; margin: 12px 0;">
        <button onclick="afficherPageMulti(window._dernierResultatZoom, '${lng}', '${al1}', null, { zoomTier: ${zoomTier} }); this.remove();" 
                class="btn-afficher-tout" 
                style="background-color:#007BFF; color:white; border:none; padding:8px 15px; border-radius:8px; font-size:16px;">
          🔁 Afficher les ${nbTotal} résultats complets
        </button>
      </div>
    `;
  }
  }

  // Injecte le contenu (id interne dépend du palier Zoom)
  body.innerHTML = '<div id="' + idsDom.contenuInner + '" class="zc-zoom-result-main" style="padding:5px;">' + (html || '') + '</div>';

  // Sanity check (inchangé)
  const tabVersetsAll = fTabVersets();
  const nbTotalAyas = tabVersetsAll.length - 1;
  if (nbTotalAyas !== 6236) {
    alert(`${nbTotalAyas}/6236 Ayas lues.
    Le fichier source est probablement corrompu.
    Essayez de recharger l'application.`);
  }

  if (opts && opts.souratMode && Number.isFinite(Number(opts.numSoura))) {
    const ns = Number(opts.numSoura);
    const nVersetZoom0 = opts && Number.isFinite(Number(opts.numVerset)) ? Number(opts.numVerset) : null;
    const progRaw = String(progEnCours || '');
    let zoomTopTitle = 'Zoom 0';
    let headerBodyHtml = '';
    if (progRaw && /<br\s*\/?>/i.test(progRaw)) {
      const firstLine = progRaw.split(/<br\s*\/?>/i)[0] || '';
      zoomTopTitle = firstLine
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || zoomTopTitle;
      headerBodyHtml = progRaw.replace(/^[\s\S]*?<br\s*\/?>/i, '').trim();
    }
    if (!headerBodyHtml) {
      const verseRef = nVersetZoom0 != null ? `${ns}.${nVersetZoom0}` : `${ns}.…`;
      headerBodyHtml =
        '<div class="zc-popup-zoom-motline zc-popup-zoom0-verse-tools" style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:center;">' +
        '<span class="zc-popup-zoom0-verse-ref" style="font-weight:700;color:#0f172a;">Verset <span style="color:#dc2626;font-weight:700;">' + verseRef + '</span></span>' +
        '<a href="#" id="lienAudio" class="zc-popup-zoom0-iconbtn" onclick="return lireAudio();" title="Écouter la sourat voix Ghamidi" ' +
        'aria-label="Écouter la Sourat">' +
        '<i class="fas fa-volume-up" aria-hidden="true"></i></a>' +
        '<button type="button" class="zc-popup-zoom0-iconbtn" title="Voix IA & Lecture (Warsh)" onclick="lireWarsh(); return false;">' +
        '<i class="fas fa-book-reader" aria-hidden="true"></i></button>' +
        (opts.toolbarExtra || '') +
        '</div>';
      zoomTopTitle = ('Zoom 0 > Sourat ' + nomSouraPhon(ns) + ' | ' + nomSouraAR(ns)).trim();
    }
    const infosEl = document.getElementById(idsDom.infos);
    if (infosEl) {
      const inputHistoricZoom0 = renderButtonHistorik({
        id: idsDom.historikZoom0,
        style: 'padding:3px 8px; font-size:12px; flex:0 0 auto;',
        chercheMode: 2,
        withLoupe: true
      });
      const inputExactZoom0 = `
        <button type="button"
          class="zc-popup-toggle-btn ${exactOn ? 'is-on' : ''}"
          data-zc-pref-toggle="me"
          title="${zcEscapeHtmlAttr(titleZoomME)}"
          aria-label="${zcEscapeHtmlAttr(titleZoomME)}"
          onclick="if(window.applyToolbarParamChange)window.applyToolbarParamChange('exact', ${exactOn ? 'false' : 'true'}); return false;">
          ME
        </button>`;
      const inputContigZoom0 = `
        <button type="button"
          class="zc-popup-toggle-btn ${contigOn ? 'is-on' : ''}"
          data-zc-pref-toggle="mc"
          title="${zcEscapeHtmlAttr(titleZoomMC)}"
          aria-label="${zcEscapeHtmlAttr(titleZoomMC)}"
          onclick="if(window.applyToolbarParamChange)window.applyToolbarParamChange('contig', ${contigOn ? 'false' : 'true'}); return false;">
          MC
        </button>`;
      const zoomSelectionRowHtml = `
        <div class="zc-popup-zoom-copy-tools zc-popup-zoom-copy-tools--labeled zc-popup-zoom-copy-tools--linkrow" role="group" aria-label="Sélection versets">
          <button type="button" class="bouton zc-popup-zoom-sel-btn"
            title="Copier tout"
            onclick="copierTousVersetsAffiches('${idsDom.contenuInner}'); return false;">
            <i class="fas fa-copy" aria-hidden="true"></i>
            <span class="zc-popup-zoom-sel-label">Copier tout</span>
          </button>
          <button type="button" class="bouton zc-popup-zoom-sel-btn"
            title="Copier sélection"
            onclick="copySelectedVersesAsRich(); return false;">
            <i class="fas fa-copy" aria-hidden="true"></i>
            <span class="zc-popup-zoom-sel-label">Copier sélection</span>
            <span class="badgeSel zc-popup-zoom-sel-badge" id="${idsDom.badgeSel}"
              title="Nombre d’éléments sélectionnés">${(tabSelectMultiVersets || []).length}</span>
          </button>
          <button type="button" class="bouton zc-popup-zoom-sel-btn"
            title="Effacer la sélection"
            onclick="viderSelectionVersets(); return false;">
            <i class="fas fa-paint-brush" aria-hidden="true"></i>
            <span class="zc-sr-only">Effacer sélection</span>
          </button>
        </div>`;
      const zoom0StatsAfterCopyHtml =
        `<div class="zc-popup-zoom-stats-lines zc-popup-zoom0-stats-post-copy" style="text-align:center;margin-top:8px;font-size:0.9em;color:#475569;">${resultats.length} versets affichés</div>`;
      infosEl.innerHTML = `
        ${headerBodyHtml}
        <div class="toolbar zc-popup-header-tools-row zc-popup-header-tools-row--uniform zc-popup-zoom-params-frame">
          ${inputExactZoom0}
          ${inputContigZoom0}
          ${inputHistoricZoom0}
        </div>
        ${zoomSelectionRowHtml}
        ${zoom0StatsAfterCopyHtml}
      `;
      try { if (typeof syncTraductionPickerButtonLabels === 'function') syncTraductionPickerButtonLabels(); } catch (_) { }
      try { if (typeof window.syncParamTogglesChrome === 'function') window.syncParamTogglesChrome(); } catch (_) { }
      try { zcRaiseResultPopupAboveAll(zoomTier); } catch (_) { }
    }
    const topActions = container?.querySelector('.zc-popup-header-actions');
    if (topActions) {
      let t = topActions.querySelector('.zc-popup-top-title');
      if (!t) {
        t = document.createElement('div');
        t.className = 'zc-popup-top-title';
        topActions.appendChild(t);
      }
      t.textContent = zoomTopTitle;
    }
    header?.focus?.();
    try { zcLowerZoom0Below(container); } catch (_) { }
    const orphanToolbar = document.getElementById('toolbarPageMulti');
    if (orphanToolbar && orphanToolbar.parentElement) {
      orphanToolbar.remove();
    }
    return;
  }

  let inputHistoric = `
		${renderButtonHistorik({
      id: idsDom.historikPopup,
      style: 'padding:3px 8px; font-size:12px; flex:0 0 auto;',
      chercheMode: 2,
      withLoupe: true
    })}`;

  let inputExact = `
    <button type="button"
      class="zc-popup-toggle-btn ${exactOn ? 'is-on' : ''}"
      data-zc-pref-toggle="me"
      title="${zcEscapeHtmlAttr(titleZoomME)}"
      aria-label="${zcEscapeHtmlAttr(titleZoomME)}"
      onclick="if(window.applyToolbarParamChange)window.applyToolbarParamChange('exact', ${exactOn ? 'false' : 'true'}); return false;">
      ME
    </button>`;

  let inputContig = `
    <button type="button"
      class="zc-popup-toggle-btn ${contigOn ? 'is-on' : ''}"
      data-zc-pref-toggle="mc"
      title="${zcEscapeHtmlAttr(titleZoomMC)}"
      aria-label="${zcEscapeHtmlAttr(titleZoomMC)}"
      onclick="if(window.applyToolbarParamChange)window.applyToolbarParamChange('contig', ${contigOn ? 'false' : 'true'}); return false;">
      MC
    </button>`;

  let btnCopierHTML = `
    <div class="zc-popup-zoom-copy-tools zc-popup-zoom-copy-tools--labeled zc-popup-zoom-copy-tools--linkrow" role="group" aria-label="Sélection versets">
      <button type="button" class="bouton zc-popup-zoom-sel-btn"
        title="Copier tout"
        onclick="copierTousVersetsAffiches('${idsDom.contenuInner}'); return false;">
        <i class="fas fa-copy" aria-hidden="true"></i>
        <span class="zc-popup-zoom-sel-label">Copier tout</span>
      </button>
      <button type="button" class="bouton zc-popup-zoom-sel-btn"
        title="Copier sélection"
        onclick="copySelectedVersesAsRich(); return false;">
        <i class="fas fa-copy" aria-hidden="true"></i>
        <span class="zc-popup-zoom-sel-label">Copier sélection</span>
        <span class="badgeSel zc-popup-zoom-sel-badge" id="${idsDom.badgeSel}"
          title="Nombre d’éléments sélectionnés">${(tabSelectMultiVersets || []).length}</span>
      </button>
      <button type="button" class="bouton zc-popup-zoom-sel-btn"
        title="Effacer la sélection"
        onclick="viderSelectionVersets(); return false;">
        <i class="fas fa-paint-brush" aria-hidden="true"></i>
        <span class="zc-sr-only">Effacer sélection</span>
      </button>
    </div>
  `;

  // --- Header compact ---
  const progRaw = String(progEnCours || '');
  const firstLine = progRaw.split(/<br\s*\/?>/i)[0] || '';
  let zoomTopTitle = firstLine
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Zoom';
  if (opts && opts.zoomTier != null && Number.isFinite(Number(opts.zoomTier))) {
    const zt = Number(opts.zoomTier);
    if (zt >= 0 && zt <= 3) {
      zoomTopTitle = zoomTopTitle.replace(/\bZoom\s*[0-3]\b/i, 'Zoom ' + zt);
    }
  }
  const progBody = progRaw.replace(/^[\s\S]*?<br>\s*/i, '');
  let afficheHeader = `${progBody}`;
  afficheHeader += `
    <div class="toolbar zc-popup-header-tools-row zc-popup-header-tools-row--uniform zc-popup-zoom-params-frame">
      ${inputExact}
      ${inputContig}
      ${inputHistoric}
    </div>
  `;
  afficheHeader += btnCopierHTML;
  afficheHeader +=
    `<div class="zc-popup-zoom-stats-lines">${nbTotal}/${nbTotalAyas} Ayas 🔴 ${totalMotsTrouves} mots</div>`;

  const infos = document.getElementById(idsDom.infos);
  if (infos) {
    infos.innerHTML = afficheHeader;
    try { if (typeof syncTraductionPickerButtonLabels === 'function') syncTraductionPickerButtonLabels(); } catch (_) { }
    try { if (typeof window.syncParamTogglesChrome === 'function') window.syncParamTogglesChrome(); } catch (_) { }
    try { zcRaiseResultPopupAboveAll(zoomTier); } catch (_) { }
    const topActions = container?.querySelector('.zc-popup-header-actions');
    if (topActions) {
      let t = topActions.querySelector('.zc-popup-top-title');
      if (!t) {
        t = document.createElement('div');
        t.className = 'zc-popup-top-title';
        topActions.appendChild(t);
      }
      t.textContent = zoomTopTitle;
    }
    // focus pour accessibilité
    header?.focus?.();
    try { zcLowerZoom0Below(container); } catch (_) { }
  }

  const orphanToolbarGen = document.getElementById('toolbarPageMulti');
  if (orphanToolbarGen && orphanToolbarGen.parentElement) {
    orphanToolbarGen.remove();
  }

}





//fin afficherPageMulti



function moduleSourat(numSoura, numVerset) {
  numSoura = parseInt(numSoura, 10);
  numVerset = parseInt(numVerset, 10);
  if (!Number.isFinite(numSoura) || !Number.isFinite(numVerset)) {
    alertMsgBoxPopup('Référence sourate.verset invalide.');
    return;
  }

  const ancienne = document.getElementById('modalVersetsAutour');
  if (ancienne) ancienne.remove();

  const tabVersets = fTabVersets();
  if (!tabVersets || !Array.isArray(tabVersets)) {
    alertMsgBoxPopup("Données absentes.");
    return;
  }

  const versetsSoura = tabVersets.filter(v => v[0] == numSoura);
  const index = versetsSoura.findIndex(v => v[1] == numVerset);
  if (index === -1) {
    alertMsgBoxPopup(`Verset ${numSoura}.${numVerset} introuvable`);
    return;
  }

  window.numSourat = numSoura;
  const input = `${numSoura}.${numVerset}`;

  let marge = 286;
  let contenu = ``;
  const resultats = [];

  for (let i = index - marge; i <= index + marge; i++) {
    if (i < 0 || i >= versetsSoura.length) continue;

    const v = versetsSoura[i]; // [sourate, verset, texteAr, …, v[8]=pageWarsh, …]
    resultats.push(`${v[0]}.${v[1]}`);
    const estCible = (v[1] == numVerset);
    if (estCible) {
      const motEl = document.getElementById("mot");
      if (motEl) motEl.value = input;
      testLangueOninputMot();
    }

    // --- Texte arabe (source "nu" pour la voix + affichage)
    const sourceArNu = String(v[2] ?? '');
    const textePourAudioAr = decodeTexte(sourceArNu)
      .replace(/<[^>]*>/g, '')
      .replace(/'/g, "’");

    // --- Commentaires (FR/AR mixtes)
    const lngComPourCopie = (typeof lngCom === 'number' && lngCom > 0) ? lngCom : 3;
    const commentaireBrut = buildCommentaireFusionneVerset(v, lngCom);
    let defTexte = commentaireBrut
      .replace(/'/g, "’")
      .replace(/"/g, "”");
    defTexte = nettoyerCommentairePourHtml(defTexte);

    const defForOnclick = String(commentaireBrut)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n");

    const showDef = Number(lngCom) !== 0 && defTexte.trim() !== "";
    if (Number(lngCom) === 0) defTexte = ""; // éviter d'écrire le num soura

    const audioLink = showDef ? `<a href="#"
        onclick="lireTexte('${defForOnclick}', '${getLngVoix(lngCom)}', 1.0); event.preventDefault();"
        title="Lire la définition">🔊</a>` : '';

    // --- Multi-copy
    const refKey = `${v[0]}.${v[1]}`;
    const isSel = _isRefSelected(refKey);

    const txtTradAuteurHtml = `<span class="zc-result-traducteur" style="display:block;margin-top:${showDef ? '6px' : '2px'};color:#64748b;font-size:0.88em;">${
      renderInlineTraductionSelect({
        id: `zcTradInline_${v[0]}_${v[1]}_${i}`,
        className: 'zc-result-trad-select',
        style: 'max-width:100%;font-size:0.98em;',
        title: (typeof zcFormatTraductionPickerFullTitle === 'function'
          ? zcFormatTraductionPickerFullTitle()
          : 'Choisir la source des commentaires')
      })
    }</span>`;
    const txtCommentaires = (() => {
      const t = String(
        (typeof getTraductionBookDisplayLabel === 'function' ? getTraductionBookDisplayLabel() : '')
      ).trim();
      if (!t || t === 'No Comment' || t === '@everyone - Lexique') return '';
      return t;
    })();

    // --- Bloc (taguer la cible avec data-cible="1")
    contenu += `
      <div class="toolbar1 zc-record-languette zc-record-languette--aya zc-result-card${estCible ? ' zc-record-languette--target' : ''}"
           ${estCible ? 'data-cible="1"' : ''}>
        <div style="color:${estCible ? 'red' : '#000'}; font-size:18px;">
          <div class="zc-result-card-head" style="color:#555;">
            <a href="#" onclick="moduleSourat(${v[0]}, ${v[1]}); return false;" title="Voir verset">
              📖#${v[0]}.${v[1]}
            </a>
            <a href="#"
              class="zc-popup-ctx-tab"
              onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${v[0]}.${v[1]}'); } else { document.getElementById('mot').value='${v[0]}.${v[1]}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${v[0]}.${v[1]}', this); } return false;"
              title="Menu contextuel">☰</a>
            <a href="#"
              onclick="lireTexte('${textePourAudioAr.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, "\\n")}', '${getLngVoix(7)}', 1.0); event.preventDefault();"
              ><i class="fas fa-volume-up" title="Lire ce verset"></i></a>
            <a href="#"
              onclick="document.getElementById('mot').value='${v[0]}.${v[1]}'; moduleWarsh('${v[8]}'); return false;"
              ><i class="fas fa-file-pdf" title="Afficher page Warsh"></i></a>
            <label class="bouton zc-result-copy-sel" title="Copier versets multiples">
              <i class="fas fa-copy"></i>
              <input
                type="checkbox" 
                id="w0_aya_${v[0]}_${v[1]}"
                data-ref="${refKey}"
                data-texte-html="${encodeURIComponent(
                  `[#${v[0]}.${v[1]}] &nbsp; ${nettoyerCommentairePourHtml(v[2] || '')}<br>----<br>${defTexte}<br>${txtCommentaires}`
                )}"
                ${isSel ? 'checked' : ''}
                onclick="copierTexteTabSelection(
                  this.id,
                  this.dataset.ref,
                  decodeURIComponent(this.dataset.texteHtml),
                  0
                ); event.stopPropagation();">
              </input>
            </label>
          </div>

          <div class="texte-arabe zc-result-card-aya" dir="rtl" style="text-align:right;">
            ${v[2] || ''}
          </div>

          <div class="ref zc-result-card-comment" style="text-align:left; direction:ltr; unicode-bidi:isolate;">
            ${showDef ? `<hr/>${audioLink}&nbsp;<bdi dir="auto">${defTexte}</bdi>` : ``}${txtTradAuteurHtml}
          </div>
        </div>
      </div>
    `;
  }

  contenu += `<br><br><br>`; // ajout ligne supp

  /* Même principe que Zoom 2 (Zoom-Coran) / moduleLexique : progEnCours avant afficherPageMulti */
  const snPh = nomSouraPhon(numSoura);
  const snAr = nomSouraAR(numSoura);
  const nAy = nbVers(numSoura);
  progEnCours =
    `📖 Zoom 0 > ${snPh} | ${snAr} (${nAy} Aya)<br>` +
    `<div class="zc-popup-zoom-motline zc-popup-zoom0-verse-tools" style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:center;">` +
    `<span class="zc-popup-zoom0-verse-ref" style="font-weight:700;color:#0f172a;">Verset <span style="color:#dc2626;font-weight:700;">${numSoura}.${numVerset}</span></span>` +
    `<a href="#" id="lienAudio" class="zc-popup-zoom0-iconbtn" onclick="return lireAudio();" title="Écouter la sourat voix Ghamidi" ` +
    `aria-label="Écouter la Sourat ${snPh} | ${snAr}">` +
    `<i class="fas fa-volume-up" aria-hidden="true"></i></a>` +
    `<button type="button" class="zc-popup-zoom0-iconbtn" title="Voix IA & Lecture (Warsh)" onclick="lireWarsh(); return false;">` +
    `<i class="fas fa-book-reader" aria-hidden="true"></i></button>` +
    `</div>`;

  if (typeof afficherPageMulti !== 'function') {
    alertMsgBoxPopup('afficherPageMulti indisponible.');
    return;
  }

  if (typeof afficherPopup === 'function') afficherPopup(0);

  afficherPageMulti(resultats, 2, 'right', null, {
    prebuiltBodyHtml: contenu,
    souratMode: true,
    numSoura,
    numVerset,
    zoomTier: 0
  });

  setTimeout(() => {
    const z0 = zcResultZoomDomIds(0);
    const conteneur = document.getElementById(z0.body);
    const cible = conteneur?.querySelector('#contenuTexte1 [data-cible="1"]')
      || conteneur?.querySelector('[data-cible="1"]')
      || conteneur?.querySelector('.zc-record-languette--target');
    if (conteneur && cible) {
      const cRect = conteneur.getBoundingClientRect();
      const tRect = cible.getBoundingClientRect();
      const topAbs = (tRect.top - cRect.top) + conteneur.scrollTop;
      conteneur.scrollTop = topAbs - (conteneur.clientHeight / 2) + (cible.clientHeight / 2);
    }
    const hdr = document.getElementById(z0.root)?.querySelector('.popup-header');
    if (hdr) {
      hdr.tabIndex = -1;
      hdr.focus();
    }
  }, 50);
}






/* ===================== Outils sélection multi ===================== */
function viderSelectionVersets() {
  try {
    // 1) Décocher toutes les cases (toutes fenêtres)
    document.querySelectorAll('input[type="checkbox"][data-ref]').forEach(chk => {
      chk.checked = false;
    });

    // 2) Nettoyer tout éventuel état visuel "bouton pressé"
    document.querySelectorAll('.is-selected,[aria-pressed="true"]').forEach(el => {
      el.classList.remove('is-selected');
      try { el.setAttribute('aria-pressed', 'false'); } catch { }
    });

    // 3) Vider le tableau global
    window.tabSelectMultiVersets = [];

    // 4) Mettre à jour tous les compteurs (badges)
    if (typeof _updateBadges === 'function') _updateBadges();
    else {
      // fallback si _updateBadges n’est pas chargé
      document.querySelectorAll('.badgeSel, #badgeSelectMultiVersets, #badgeSelectMultiVersets0, #badgeSelectMultiVersets1, #badgeSelectMultiVersetsZ1, #badgeSelectMultiVersetsZ2, #badgeSelectMultiVersetsZ3')
        .forEach(b => b.textContent = '0');
    }

    // 5) Message de confirmation (popup 0 si dispo)
    if (typeof alertMsgBoxTemp === 'function') {
      alertMsgBoxTemp('🧹 Sélection vidée');
    } else if (typeof afficherMessageVerset === 'function') {
      // si tu veux aussi le pousser dans la modale 1 par ex.
      afficherMessageVerset(1, '🧹 Sélection vidée');
    }
  } catch (e) {
    console.error('viderSelectionVersets() — erreur:', e);
  }
  return false;
}


// Collecte tous les versets affichés (fenêtre 0)
// Remplace l'ancien _collectAllVersetsFromDOM par une version contextuelle
function _collectAllVersetsFromScope(scope) {
  const rows = [];
  const root = scope || document;

  // ✅ Cas 1 : popup résultats (blocs .verset + .texte-arabe)
  const blocs = root.querySelectorAll('.verset');
  if (blocs.length) {
    blocs.forEach(node => {
      const chk = node.querySelector('input[type="checkbox"][data-ref]');
      const ref = chk ? chk.dataset.ref : null; // "S.V"
      const htmlVerset = node.querySelector('.texte-arabe')?.innerHTML || '';
      if (!ref || !htmlVerset) return;
      let html = `[#${ref}] ${htmlVerset}`;
      if (typeof _inlineHighlight === 'function') html = _inlineHighlight(html);
      rows.push({ id: `#${ref}`, html });
    });
    return rows;
  }

  // ✅ Cas 2 : Zoom 0 / même popup (pas de .verset), cases à cocher data-ref
  const chks = root.querySelectorAll('input[type="checkbox"][data-ref][data-texte-html]');
  chks.forEach(chk => {
    const ref = chk.dataset.ref;                    // "S.V"
    const htmlRaw = decodeURIComponent(chk.dataset.texteHtml || '');
    const html = (typeof _inlineHighlight === 'function') ? _inlineHighlight(htmlRaw) : htmlRaw;
    if (ref && html) rows.push({ id: `#${ref}`, html });
  });

  return rows;
}



function _buildPlainFrom(rows) {
  const headerLine = (typeof _headerPlain === 'function') ? _headerPlain() : '';
  const body = rows.map(r => _oneline(_stripTags(r.html))).join('\r\n');
  return `${headerLine}\r\n\r\n${body}`;
}

function _buildHTMLFrom(rows) {
  const bodyRows = rows.map(r => `
    <tr>
      <td style="padding:3px 4px;border:1px solid #ddd;color:#666;white-space:nowrap;">${escapeHtml(r.id)}</td>
      <td style="padding:3px 4px;border:1px solid #ddd;">${r.html}</td>
    </tr>
  `.trim()).join('');

  const table = `
    <table style="border-collapse:collapse;font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
      <thead>
        <tr>
          <th style="text-align:left;padding:3px 4px;border:1px solid #ddd;background:#f6f8fa;">Id</th>
          <th style="text-align:left;padding:3px 4px;border:1px solid #ddd;background:#f6f8fa;">Texte</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `.trim();

  const headerHTML = (typeof _headerHTML === 'function') ? _headerHTML() : '';
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${headerHTML}${table}</body></html>`;
}

// Nouvelle signature : copierTousVersetsAffiches(scopeId?, zoneMsg?)
async function copierTousVersetsAffiches(scopeId) {
  try {
    const tierFallback = (typeof window.__zcLastResultZoomTier === 'number' ? window.__zcLastResultZoomTier : 2);
    const bodyId = zcResultZoomDomIds(tierFallback).body;
    const scope = scopeId ? document.getElementById(scopeId) : document.getElementById(bodyId);

    const rows = _collectAllVersetsFromScope(scope || document);
    if (!rows.length) {
      if (typeof alertMsgBoxTemp === 'function') alertMsgBoxTemp('❌ Aucun verset à copier', 'red');
      return;
    }

    const plain = _buildPlainFrom(rows);
    const html = COPY_RICH_HTML ? _buildHTMLFrom(rows) : '';

    const ok = COPY_RICH_HTML
      ? await copyToClipboardRich(html, plain)
      : await navigator.clipboard?.writeText?.(plain).then(() => true).catch(() => false);

    if (typeof alertMsgBoxTemp === 'function') {
      alertMsgBoxTemp(
        ok ? (COPY_RICH_HTML ? '📝 Tout copié (HTML+Texte)' : '📝 Tout copié')
          : '❌ Copie refusée par le navigateur',
        ok ? 'green' : 'red'
      );
    }
  } catch (err) {
    console.error('copierTousVersetsAffiches() — erreur:', err);
  }
}


/* ===================== Copie avancée (HTML + texte) ===================== */
const COPY_RICH_HTML = true;
const HIGHLIGHT_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--zc-danger').trim() || '#d60000';
const MAKE_INLINE_HIGHLIGHT = true;

// --- état global existant :
window.tabSelectMultiVersets = [];

// Trouver si une ref S.V est déjà sélectionnée
function _isRefSelected(ref) {
  return (tabSelectMultiVersets || []).some(x => x.ref === ref);
}

// Synchroniser toutes les cases (toutes fenêtres) pour une ref donnée
function _updateCheckboxesForRef(ref, selected) {
  document.querySelectorAll(`input[type="checkbox"][data-ref="${ref}"]`)
    .forEach(chk => { chk.checked = !!selected; });
}

// Mettre à jour tous les badges de sélection
function _updateBadges() {
  const n = (tabSelectMultiVersets || []).length;
  document.querySelectorAll('.badgeSel').forEach(b => b.textContent = String(n));
}

const _idxSelById = id => (tabSelectMultiVersets || []).findIndex(x => x?.id === id);
const _oneline = s => String(s ?? '').replace(/\r?\n|\r/g, ' ');

/*function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&(?![#a-z0-9]+;)/gi, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}*/
function _stripTags(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/* ====== Mot recherché & commentaire (setter + helpers) ====== */
// Appelle ceci avec l'input saisi (ex: depuis ton champ #mot ou tes liens)
function setMotRechercheEtCommentaire(input) {
  window.varGlobalInputMot = (input ?? '').toString().trim();

  // Récupérer et préparer le commentaire
  let brut = '';
  try { if (typeof recupererCommentaire === 'function') brut = recupererCommentaire(window.varGlobalInputMot) || ''; } catch { }
  let html = '', plain = '';
  if (brut) {
    if (typeof nettoyerCommentairePourHtml === 'function') {
      html = nettoyerCommentairePourHtml(brut);
    } else if (typeof nettoyerCommentairePourChampTexte === 'function') {
      html = nettoyerCommentairePourChampTexte(String(brut).trim().replace(/\n/g, '<br>'));
    } else {
      // fallback simple
      html = String(brut)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }
    plain = String(brut).replace(/\r?\n/g, ' ');
  }
  window.varGlobalCommentaireHTML = html;   // pour affichage/copie HTML
  window.varGlobalCommentairePlain = plain;  // pour fallback texte
}

function _getMotRecherche() {
  return (window.varGlobalInputMot ?? '').toString().trim();
}

function _getCommentaireHTML() {
  if (typeof window.varGlobalCommentaireHTML === 'string') return window.varGlobalCommentaireHTML;
  const mot = _getMotRecherche();
  let c = '';
  try { if (typeof recupererCommentaire === 'function') c = recupererCommentaire(mot) || ''; } catch { }
  if (!c) return '';
  if (typeof nettoyerCommentairePourHtml === 'function') return nettoyerCommentairePourHtml(c);
  if (typeof nettoyerCommentairePourChampTexte === 'function') return nettoyerCommentairePourChampTexte(String(c).trim().replace(/\n/g, '<br>'));
  return String(c).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function _getCommentairePlain() {
  if (typeof window.varGlobalCommentairePlain === 'string') return window.varGlobalCommentairePlain;
  const html = _getCommentaireHTML();
  if (!html) return '';
  const div = document.createElement('div'); div.innerHTML = html;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function _headerPlain() {
  const mot = _getMotRecherche();
  const com = _getCommentairePlain();
  let header = `Recherché sur Alfamous.ca : "${mot || '(non précisé)'}" `;
  if (com) header += `\nCommentaire : ${com}`;
  return header;
}

function _headerHTML() {
  const mot = _getMotRecherche();
  const commentaireHtml = _getCommentaireHTML();
  const headerLine = `
    <div style="font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;margin-bottom:6px;">
      <strong>Recherche sur Alfamous.ca :</strong>
      <span style="color:${HIGHLIGHT_COLOR};">${mot ? escapeHtml(mot) : '(non précisé)'}</span>
      
    </div>
  `.trim();

  const blocCommentaire = commentaireHtml
    ? `<div class="commentaire-mot" style="margin:6px 0 10px; padding:4px; background:#fff7e6; border-left:4px solid #ffa726;">
         ${commentaireHtml}
       </div>`
    : '';

  return (headerLine + blocCommentaire);
}

/* Surbrillance inline (préservation couleur) */
function _inlineHighlight(html) {
  let h = String(html ?? '');
  h = h.replace(/<span\s+class=(['"])rouge\1>/g, `<span style="color:${HIGHLIGHT_COLOR};font-weight:600;">`);
  h = h.replace(/<mark>/g, `<mark style="background:transparent;color:${HIGHLIGHT_COLOR};font-weight:600;">`);
  return h;
}

/* Charges à copier (sélection) */
function _buildClipboardPayloadPlain() {
  const headerLine = _headerPlain();
  const rows = (tabSelectMultiVersets || []).map(x => ({
    ref: x.ref || x.id,
    texte: _oneline(_stripTags(x.html || ''))
  }));
  if (!rows.length) return '';
  const body = rows.map(r => r.texte).join('\r\n');
  return `${headerLine}\r\n\r\n${body}`;
}

function _buildClipboardPayloadHTML() {
  const rows = (tabSelectMultiVersets || []).map(x => {
    let html = String(x.html || '');
    if (MAKE_INLINE_HIGHLIGHT) html = _inlineHighlight(html);
    let ref = x.ref;
    if (!ref) {
      const m = html.match(/\[#\s*(\d+)\.(\d+)\s*\]/);
      ref = m ? `#${m[1]}.${m[2]}` : x.id;
    }
    return { ref, html };
  });
  if (!rows.length) return '';

  const bodyRows = rows.map(r => `
    <tr>
      <td style="padding:3px 4px;border:1px solid #ddd;color:#666;white-space:nowrap;">${escapeHtml(r.ref)}</td>
      <td style="padding:3px 4px;border:1px solid #ddd;">${r.html}</td>
    </tr>
  `.trim()).join('');

  const table = `
    <table style="border-collapse:collapse;font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
      <thead>
        <tr>
          <th style="text-align:left;padding:3px 4px;border:1px solid #ddd;background:#f6f8fa;">Réf</th>
          <th style="text-align:left;padding:3px 4px;border:1px solid #ddd;background:#f6f8fa;">Texte</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `.trim();

  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${_headerHTML()}${table}</body></html>`;
}

/* Copie HTML + texte avec fallback */
async function copyToClipboardRich(html, text) {
  try {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (e) { }

  try {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.pointerEvents = 'none';
    container.style.opacity = '0';
    container.style.zIndex = '-1';
    container.innerHTML = html;
    document.body.appendChild(container);

    const range = document.createRange();
    range.selectNodeContents(container);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const ok = document.execCommand('copy');
    sel.removeAllRanges();
    document.body.removeChild(container);
    if (ok) return true;
  } catch (e) { }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}


/* Toggle + copie (sélection) — zoneMsg: 0 = popup, 1..3 = modals */
// idDOM: l'id réel cliqué (w0_… ou w1_…)
// refKey: "S.V"
// htmlVerset: HTML du verset
// zoneMsg: 0 = popup résultats, 1..3 = modales
async function copierTexteTabSelection(idDOM, refKey, htmlVerset) {
  try {
    // Sélection partagée (entre fenêtres)
    if (!Array.isArray(window.tabSelectMultiVersets)) window.tabSelectMultiVersets = [];
    const arr = window.tabSelectMultiVersets;

    // Toggle de la référence
    const idx = arr.findIndex(x => x.ref === refKey);
    const wasPresent = idx !== -1;

    if (wasPresent) {
      arr.splice(idx, 1);
      alertMsgBoxTemp('➖ Retiré de la sélection');
    } else {
      arr.push({ ref: refKey, html: htmlVerset });
      alertMsgBoxTemp('✅ Ajouté à la sélection');
    }

    // Synchro UI toutes fenêtres
    _updateCheckboxesForRef(refKey, !wasPresent);
    _updateBadges();

    // Comptage après toggle
    const n = arr.length;

    // Si vide après toggle → message cohérent + stop
    const plain = _buildClipboardPayloadPlain();
    if (!plain) {
      alertMsgBoxTemp('❌ Sélection vide', 'red');
      return false;
    }

    // Prépare la charge riche si activée
    const html = COPY_RICH_HTML ? _buildClipboardPayloadHTML() : '';

    // Copie (riche si possible, sinon texte)
    const ok = COPY_RICH_HTML
      ? await copyToClipboardRich(html, plain)
      : await navigator.clipboard?.writeText?.(plain).then(() => true).catch(() => false);

    // Message final harmonisé avec copySelectedVersesAsRich()
    const msgOk = `✅ Sélection copiée (${n} élément${n > 1 ? 's' : ''})` + (COPY_RICH_HTML ? ' — HTML + texte' : '');
    alertMsgBoxTemp(ok ? msgOk : '❌ Copie refusée par le navigateur', ok ? 'green' : 'red');
  } catch (err) {
    console.error('copierTexteTabSelection() — erreur:', err);
    alertMsgBoxTemp('⚠️ Erreur lors de la copie', 'red');
  }
  return false; // conserve le comportement (ex. empêcher navigation d’un <a>)
}



/* ===================== Copier contenu de la popup (fenêtre 0) ===================== */
async function copierContenuPopup() {
  const t = (typeof window.__zcLastResultZoomTier === 'number' ? window.__zcLastResultZoomTier : 0);
  const scope = document.getElementById(zcResultZoomDomIds(t).body);
  if (!scope) {
    alertMsgBoxTemp?.("❌ Zone introuvable", "red");
    return;
  }
  let inner = scope.innerHTML || "";
  if (!inner.trim()) {
    alertMsgBoxTemp?.("❌ Rien à copier", "red");
    return;
  }

  inner = inner
    .replace(/<span\s+class=(['"])rouge\1>/g, `<span style="color:${HIGHLIGHT_COLOR};font-weight:600;">`)
    .replace(/<mark>/g, `<mark style="background:transparent;color:${HIGHLIGHT_COLOR};font-weight:600;">`);

  const headerHTML = _headerHTML();
  const docHTML = `<!doctype html><html><head><meta charset="utf-8"></head><body>${headerHTML}${inner}</body></html>`;
  const plain = `${_headerPlain()}\n\n${scope.innerText || ''}`;

  try {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      const item = new ClipboardItem({
        'text/html': new Blob([docHTML], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);
      alertMsgBoxTemp?.("✅ Copié (HTML + texte)");
      return;
    }
  } catch (e) { }

  try {
    const holder = document.createElement('div');
    holder.style.position = 'fixed'; holder.style.opacity = '0';
    holder.style.pointerEvents = 'none'; holder.style.zIndex = '-1';
    holder.innerHTML = docHTML;
    document.body.appendChild(holder);

    const rng = document.createRange(); rng.selectNodeContents(holder);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rng);

    const ok = document.execCommand('copy');
    sel.removeAllRanges(); document.body.removeChild(holder);
    if (ok) { alertMsgBoxTemp?.("✅ Copié (HTML)"); return; }
  } catch (e) { }

  try {
    const ta = document.createElement('textarea');
    ta.value = plain; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    alertMsgBoxTemp?.(ok ? "✅ Copié (texte)" : "⚠️ Erreur lors de la copie", ok ? "green" : "red");
  } catch {
    alertMsgBoxTemp?.("⚠️ Erreur lors de la copie", "red");
  }
}

/* ===================== Utilitaires divers ===================== */
function getLngVoix(lng) {
  switch (lng) {
    case 3:
      return 'fr';
    case 4:
      return 'fr';
    case 5:
      return 'en';
    case 6:
      return 'kab';
    case 7:
      return 'ar';
    case 9:
      return 'es';
    case 10:
      return 'fr';
    case 11:
      return 'fr';
    default:
      return 'ar';
  }
}

function afficherMessageVerset(num, msg) {
  const box = document.getElementById(`message-boxVersets${num}`);
  if (box) {
    box.textContent = msg;
    box.style.display = "block";
    setTimeout(() => {
      box.style.display = "none";
    }, 3000);
  } else {
    alertMsgBoxPopup(msg);
  }
}

function rendreModaleDeplacable(modaleId, headerId) {
  const modal = document.getElementById(modaleId);
  const header = document.getElementById(headerId);

  let offsetX = 0, offsetY = 0, initialX = 0, initialY = 0;

  header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    initialX = e.clientX;
    initialY = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    offsetX = initialX - e.clientX;
    offsetY = initialY - e.clientY;
    initialX = e.clientX;
    initialY = e.clientY;

    const rect = modal.getBoundingClientRect();
    modal.style.top = (rect.top - offsetY) + "px";
    modal.style.left = (rect.left - offsetX) + "px";
    modal.style.transform = "none";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function fermerFenetreVersetsAutour() {
  stopLireTexte();
  const legacy = document.getElementById('modalVersetsAutour');
  if (legacy) legacy.remove();
  if (typeof fermerPopup === 'function') fermerPopup();
}


function allerAuVersetDepuisInput() {
  const input = document.getElementById("mot");
  let valeur = input.value.trim();

  if (/^\d{1,3}$/.test(valeur)) {
    valeur += ".1";
    input.value = valeur;
  }

  if (!/^\d{1,3}\.\d{1,3}$/.test(valeur)) {
    alertMsgBoxPopup("Entrez une référence au format sourate.verset (ex: 2.185)");
    return;
  }

  const [souraStr, versetStr] = valeur.split(".");
  const numSoura = parseInt(souraStr, 10);
  const numVerset = parseInt(versetStr, 10);

  if (isNaN(numSoura) || isNaN(numVerset)) {
    alertMsgBoxPopup("Numéros invalides.");
    return;
  }

  if (numSoura < 1 || numSoura > 114) {
    alertMsgBoxPopup("Numéro de sourate invalide (1 à 114).");
    return;
  }

  if (typeof nbVers !== "function") {
    alertMsgBoxPopup("Erreur : la fonction nbVers(numSoura) n’est pas définie !");
    return;
  }

  const totalVersets = nbVers(numSoura);
  if (numVerset < 1 || numVerset > totalVersets) {
    alertMsgBoxPopup(`La sourate ${numSoura} ne contient que ${totalVersets} versets.`);
    return;
  }

  if (typeof fermeFenetre === "function") {
    fermeFenetre();
  }

  if (typeof moduleSourat === "function") {
    moduleSourat(numSoura, numVerset);
  } else {
    alertMsgBoxPopup("Erreur : la fonction moduleSourat(nSoura, nVerset) est introuvable.");
  }
}

function ouvrirRacinesDepuisInput() {
  const input = document.getElementById("mot");
  if (!input) return;
  let valeur = String(input.value || "").trim();

  if (/^\d{1,3}$/.test(valeur)) {
    valeur += ".1";
    input.value = valeur;
  }

  if (!/^\d{1,3}\.\d{1,3}$/.test(valeur)) {
    alertMsgBoxPopup("Entrez une référence au format sourate.verset (ex: 2.185)");
    return;
  }

  const [souraStr, versetStr] = valeur.split(".");
  const numSoura = parseInt(souraStr, 10);
  const numVerset = parseInt(versetStr, 10);

  if (!Number.isFinite(numSoura) || !Number.isFinite(numVerset)) {
    alertMsgBoxPopup("Numéros invalides.");
    return;
  }
  if (numSoura < 1 || numSoura > 114) {
    alertMsgBoxPopup("Numéro de sourate invalide (1 à 114).");
    return;
  }
  if (typeof nbVers !== "function") {
    alertMsgBoxPopup("Erreur : la fonction nbVers(numSoura) est introuvable.");
    return;
  }
  const totalVersets = nbVers(numSoura);
  if (numVerset < 1 || numVerset > totalVersets) {
    alertMsgBoxPopup(`La sourate ${numSoura} ne contient que ${totalVersets} versets.`);
    return;
  }

  if (typeof afficherDefRacines === "function") {
    afficherDefRacines(numSoura, numVerset);
  } else {
    alertMsgBoxPopup("Erreur : la fonction afficherDefRacines est introuvable.");
  }
}
window.ouvrirRacinesDepuisInput = ouvrirRacinesDepuisInput;

/* ===================== Défs Racines (fenêtre 2) — inchangé sauf nettoyages ===================== */
function afficherDefRacines(numSoura, numVerset) {
  const tabVersets = fTabVersets();
  const tabLexique = fTabLexique();

  if (!Array.isArray(tabVersets) || !Array.isArray(tabLexique)) {
    alertMsgBoxPopup("Données manquantes.");
    return;
  }

  const verset = tabVersets.find(v => v[0] == numSoura && v[1] == numVerset);
  if (!verset) {
    alertMsgBoxPopup(`Verset ${numSoura}.${numVerset} introuvable`);
    return;
  }
  window.numSourat = numSoura;
  const racineTexte = verset[7];
  const racines = String(racineTexte || "").split(" ").filter(r => r.trim() !== "");

  if (racines.length === 0) {
    alertMsgBoxPopup(`Aucune racine trouvée pour ${numSoura}.${numVerset}`);
    return;
  }

  let contenu = `<div style="padding:5px;">`;

  var commentaire = verset[3] || '';
  commentaire = commentaire.replace(/\n/g, "<br>");
  const commentaireAffichage = commentaire.trim() !== '' ? commentaire : '<i>Aucun</i>';
  const texteVerset = verset[2] || '';
  const verseHtml = (typeof escapeHtml === "function"
    ? escapeHtml(String(texteVerset || ""))
    : String(texteVerset || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;"));

  contenu += `
    <div style="display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px;justify-content:space-between;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--zc-border);">
      <div style="flex:1 1 220px;min-width:0;">
        <div>
          <a href="#"
             onclick="event.preventDefault(); if (typeof moduleSourat === 'function') { moduleSourat(${numSoura}, ${numVerset}); } return false;"
             title="Voir verset"
             aria-label="Voir verset #${numSoura}.${numVerset}"
             style="font-weight:600;color:var(--zc-link);text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
            📖 #${numSoura}.${numVerset}
          </a>
        </div>
        <div dir="rtl" style="margin-top:6px;font-size:1.05rem;line-height:1.5;color:var(--zc-text);">${verseHtml}</div>
      </div>
      <button type="button" onclick="copierContenuModal('contenuTexte2', 2)"
              title="Copier tout le contenu du panneau"
              style="flex:0 0 auto;align-self:flex-start;background:transparent;border:1px solid var(--zc-border);color:var(--zc-link);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">
        Copier Tout
      </button>
    </div>
    <div style="background-color: var(--zc-ui-soft-bg); padding: 8px; border-radius: 6px; margin-bottom: 15px;">
      <div style="font-size: 14px; color: var(--zc-text-muted);">Commentaires Alfamous</div>
      <div style="margin-top: 4px; color: var(--zc-text); font-size: 14px;">${commentaireAffichage}</div>
    </div>
  `;

  racines.forEach((racine, index) => {
    const ligne = tabLexique.find(entry => entry[0] === racine);
    const def = ligne ? ligne[1] : "<i>Définition introuvable</i>";
    var defTexte = def.replace(/'/g, "’").replace(/"/g, "”");
    defTexte = nettoyerCommentairePourHtml(defTexte);
    const bgColor = index % 2 === 0 ? "var(--zc-ui-soft-bg)" : "var(--zc-surface)";

    contenu += `
      <div style="background-color:${bgColor}; padding: 4px 5px; border-radius: 6px; margin-bottom: 10px;">
        <div>
          <b>${index + 1}.
            <a href="#"
              onclick="document.getElementById('mot').value='${racine}'; ChercheMotsMain(2); return false;"
              title="Recherche dans le Coran par correspondance des racines">📖${racine}</a>					
          </b>
          &nbsp;
          <a href="#"
             onclick="lireTexte('${racine}', '${lngVoixAR}', 1.0); event.preventDefault();">
            <i class="fas fa-volume-up" title="Lire racine"> </i>
          </a>
          &nbsp;
          <a href="#"
             class="zc-popup-ctx-tab"
             onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${racine}'); } else { document.getElementById('mot').value='${racine}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${racine}', this); } return false;"
             title="Menu contextuel">☰</a>
          &nbsp;
        </div>
        <div style="margin-left: 15px; color: var(--zc-text-muted); font-size: 14px; display: flex; gap: 8px;">
          <div style="flex:1;">${defTexte}</div>
          <a href="#" onclick="lireTexte('${defTexte}', '${lngVoixFR}', 1.0); event.preventDefault();" 
             title="Lire la définition">🔊</a>
        </div>
      </div>
    `;
  });

  contenu += `</div>`;

  const ancienne2 = document.getElementById("modalDefRacines");
  if (ancienne2) ancienne2.remove();

  const modal = document.createElement("div");
  modal.id = "modalDefRacines";
  modal.style = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    background: var(--zc-surface);
    color: var(--zc-text);
    border: 2px solid var(--zc-border);
    padding: 5px;
    border-radius: 10px;
    box-shadow: var(--zc-shadow);
    width: var(--zc-popup-unified-max-width, min(98vw, 980px));
    max-width: var(--zc-popup-unified-max-width, min(98vw, 980px));
    height: var(--zc-popup-unified-max-height, 100dvh);
    max-height: var(--zc-popup-unified-max-height, 100dvh);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;
  modal.style.zIndex = getNextZIndex();

  modal.innerHTML = `
    <div class="zc-popup-header-unified" style="flex:0 0 auto;padding:12px 14px;background:var(--zc-ui-soft-bg);border-bottom:1px solid var(--zc-border);gap:8px;">
      <div class="zc-popup-header-actions">
        <a href="#"
           class="zc-popup-ctx-tab"
           onclick="event.preventDefault(); var ref='${numSoura}.${numVerset}'; if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot(ref); } else { var m=document.getElementById('mot'); if(m) m.value=ref; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord(ref, this); }"
           title="Menu contextuel" aria-label="Menu contextuel">☰</a>
        <div style="flex:1 1 auto;text-align:center;font-weight:600;font-size:1rem;color:var(--zc-text);">🌿 Racines</div>
        <button type="button" class="close-btnStatRacines" onclick="stopLireTexte();document.getElementById('modalDefRacines').remove()" title="Fermer" aria-label="Fermer">✖</button>
      </div>
    </div>
    <div id="message-boxVersets2" class="message-boxVersets" style="flex:0 0 auto;"></div>
    <div id="contenuTexte2" style="flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;">${contenu}</div>
  `;

  document.body.appendChild(modal);
  try { zcLowerZoom0Below(modal); } catch (_) { }
}











// --- Helper message robuste (zone auto si non fournie) ---
function showPopupSelectionVersets() {
  try {
    const n = Array.isArray(window.tabSelectMultiVersets) ? window.tabSelectMultiVersets.length : 0;
    if (!n) {
      alertMsgBoxTemp && alertMsgBoxTemp('❌ Sélection vide', 'red');
      return;
    }

    // On réutilise le HTML déjà construit pour le presse-papier
    const fullHtml = _buildClipboardPayloadHTML();
    if (!fullHtml) {
      alertMsgBoxTemp && alertMsgBoxTemp('⚠️ Rien à afficher', 'orange');
      return;
    }

    // On récupère uniquement le contenu du <body> (header + table)
    let inner = fullHtml;
    const iBodyStart = fullHtml.indexOf('<body>');
    const iBodyEnd = fullHtml.lastIndexOf('</body>');
    if (iBodyStart !== -1 && iBodyEnd !== -1 && iBodyEnd > iBodyStart) {
      inner = fullHtml.slice(iBodyStart + '<body>'.length, iBodyEnd);
    }

    // On supprime une éventuelle popup précédente
    const old = document.getElementById('popupSelectionVersets');
    if (old) old.remove();

    // Overlay plein écran
    const overlay = document.createElement('div');
    overlay.id = 'popupSelectionVersets';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'var(--zc-overlay-bg)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = String(zcDynamicTopZ());

    // Boîte centrale
    const box = document.createElement('div');
    box.style.background = 'var(--zc-surface)';
    box.style.borderRadius = '10px';
    box.style.boxShadow = '0 8px 24px rgba(0,0,0,.25)';
    box.style.maxWidth = '95vw';
    box.style.width = 'min(960px, 95vw)';
    box.style.maxHeight = '85vh';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.overflow = 'hidden';
    box.style.font = "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif";

    // Entête : titre simple + bouton fermer
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '6px 10px';
    header.style.borderBottom = '1px solid var(--zc-popup-bg-border)';
    header.style.background = 'var(--zc-popup-bg)';

    const titre = document.createElement('div');
    titre.style.fontWeight = '600';
    titre.style.fontSize = '14px';
    titre.textContent = `Sélection copiée (${n} Ayas) `;

    // Bouton de fermeture (classe demandée)
    const btnClose = document.createElement('button');
    btnClose.type = 'button';
    btnClose.className = 'close-btnStatRacines';
    btnClose.textContent = '✖';
    btnClose.title = 'Fermer';
    btnClose.onclick = (e) => {
      e.preventDefault();
      try { overlay.remove(); } catch { }
    };

    header.appendChild(titre);
    header.appendChild(btnClose);

    // Corps : on injecte header + table du document HTML
    const body = document.createElement('div');
    body.style.padding = '8px';
    body.style.overflow = 'auto';
    body.style.background = 'var(--zc-surface)';

    body.innerHTML = inner;

    const isDarkUi = (() => {
      try {
        const theme = String(document.documentElement.getAttribute('data-theme') || '').toLowerCase();
        if (theme === 'dark') return true;
        if (theme === 'light') return false;
      } catch (_) { }
      try {
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      } catch (_) { }
      return false;
    })();

    if (isDarkUi) {
      try {
        const topSearch = body.querySelector('div[style*="margin-bottom:6px"]');
        if (topSearch) {
          topSearch.style.color = '#e2e8f0';
          topSearch.style.background = 'transparent';
          topSearch.style.border = 'none';
          topSearch.style.borderRadius = '0';
          topSearch.style.padding = '0';
        }
      } catch (_) { }
      try {
        const commentBox = body.querySelector('.commentaire-mot');
        if (commentBox) {
          commentBox.style.background = '#1f2937';
          commentBox.style.color = '#e5e7eb';
          commentBox.style.borderLeft = '4px solid #f59e0b';
        }
      } catch (_) { }
      try {
        const ths = body.querySelectorAll('table thead th');
        for (let i = 0; i < ths.length; i++) {
          const th = ths[i];
          th.style.background = '#1e293b';
          th.style.color = '#e2e8f0';
          th.style.borderColor = '#334155';
        }
      } catch (_) { }
      try {
        const tds = body.querySelectorAll('table tbody td');
        for (let i = 0; i < tds.length; i++) {
          const td = tds[i];
          td.style.color = '#e2e8f0';
          td.style.borderColor = '#334155';
        }
      } catch (_) { }
    }

    // Forcer le tableau à occuper toute la largeur
    const table = body.querySelector('table');
    if (table) {
      table.style.width = '100%';
      table.style.tableLayout = 'auto';
    }

    box.appendChild(header);
    box.appendChild(body);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  } catch (e) {
    console.error('showPopupSelectionVersets() — erreur:', e);
  }
}

window.copySelectedVersesAsRich = async function copySelectedVersesAsRich() {
  try {
    const n = Array.isArray(window.tabSelectMultiVersets) ? window.tabSelectMultiVersets.length : 0;
    if (!n) {
      alertMsgBoxTemp && alertMsgBoxTemp('❌ Sélection vide', 'red');
      return false;
    }

    const plain = _buildClipboardPayloadPlain();
    const html = COPY_RICH_HTML ? _buildClipboardPayloadHTML() : '';

    const ok = COPY_RICH_HTML
      ? await copyToClipboardRich(html, plain)
      : await navigator.clipboard?.writeText?.(plain).then(() => true).catch(() => false);

    const msgOk = `✅ Sélection copiée (${n} élément${n > 1 ? 's' : ''})` +
      (COPY_RICH_HTML ? ' — HTML + texte' : '');
    alertMsgBoxTemp && alertMsgBoxTemp(ok ? msgOk : '❌ Copie refusée par le navigateur', ok ? 'green' : 'red');

    // 👉 après une copie réussie, on ouvre la popup d’aperçu
    if (ok && typeof showPopupSelectionVersets === 'function') {
      try { showPopupSelectionVersets(); } catch (e) { console.error('Erreur ouverture popup sélection:', e); }
    }

    return ok;
  } catch (err) {
    console.error('copySelectedVersesAsRich() — erreur:', err);
    alertMsgBoxTemp && alertMsgBoxTemp('⚠️ Erreur lors de la copie', 'red');
    return false;
  }
};



// --- visibilité & messages robustes ---

function _isVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  if (el.offsetParent === null && style.position !== 'fixed') return false;
  return true;
}

// choisit une zone visible : 0 = une des popups résultats Zoom 0–3
function _pickZone(z) {
  for (let zi = 0; zi <= 3; zi++) {
    const el = document.getElementById(zcResultZoomDomIds(zi).root);
    if (el && _isVisible(el)) return 0;
  }
  // si l'appelant a donné une zone ET qu'elle est visible, on la garde
  if (Number.isFinite(z) && _isVisible(document.getElementById(`message-boxVersets${z}`))) return z;
  return null; // rien de visible -> toast global
}

// toast global (réutilisable)
function _toastGlobal(txt, color = 'green') {
  let t = document.getElementById('alfamousToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'alfamousToast';
    t.style.position = 'fixed';
    t.style.right = '14px';
    t.style.bottom = '14px';
    t.style.maxWidth = '70vw';
    t.style.zIndex = String(zcDynamicTopZ());
    t.style.padding = '10px 14px';
    t.style.borderRadius = '10px';
    t.style.font = "14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif";
    t.style.boxShadow = '0 6px 20px rgba(0,0,0,.15)';
    t.style.background = 'var(--zc-surface)';
    t.style.border = '1px solid var(--zc-border)';
    document.body.appendChild(t);
  }
  try { t.style.zIndex = String(zcDynamicTopZ()); } catch (_) { }
  { const _s = getComputedStyle(document.documentElement); t.style.color = (color === 'red') ? (_s.getPropertyValue('--zc-danger').trim() || '#b20000') : (color === 'orange' ? (_s.getPropertyValue('--zc-text-muted').trim() || '#875a00') : (_s.getPropertyValue('--zc-accent').trim() || '#0a6')); }
  t.innerHTML = txt;
  t.style.opacity = '1';
  // auto-hide
  clearTimeout(t.__hideTimer);
  t.__hideTimer = setTimeout(() => { t.style.opacity = '0'; }, 2400);
}

// petit pulse sur le bouton “popup réduite”
function _pulseMinimizedBtn() {
  const btn = document.getElementById('btnAfficherPopup');
  if (!btn) return;
  const old = btn.style.boxShadow;
  btn.style.transition = 'box-shadow .2s ease';
  btn.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, .5)';
  setTimeout(() => { btn.style.boxShadow = old || 'none'; }, 600);
}

