// Historique des mots ********************************************************

var maxValeursHistorik = 2000; // Limite de l'historique

// ---- Seed par défaut si historique vide -----------------------------------
/*function getSeedHistoriqueMots() {
  return [
    "بسم الله", "الله", "الرحمن", "الرحيم", "الملك", "القدوس", "السلام", "العزيز", "الجبار", "الغفور", "التواب", "الخبير",
    "القرآن", "كتاب", "آية", "سورة", "تنزيل", "بيان", "هدى", "نور", "حق", "باطل", "ميزان", "حكمة", "علم", "قلب",
    "امن", "اسلم", "شهد", "شكر", "ذكر", "غفر", "رحم", "رزق", "خلق", "علم", "حكم", "كتب", "قال", "جعل", "كان", "جاء",
    "هدى", "ضل", "صدق", "كذب", "غوى", "تقوى", "بر", "عدل", "قسط", "فسد", "صلح",
    "صبر", "شكر", "كفر", "نفاق", "توبة", "استغفار", "احسان", "ايمان", "اسلام", "شرك", "توحيد",
    "ناس", "قوم", "رجال", "نساء", "طفل", "يتيم", "مسكين", "فقير", "مؤمن", "كافر", "منافق",
    "عدل", "قسط", "حق", "باطل", "حدود", "حلال", "حرام", "ميثاق", "عهد", "وصية", "شهادة",
    "زكاة", "ربا", "ميزان", "قسطاس", "بيع", "دين",
    "رحمة", "عفو", "صفح", "صلاة", "صوم", "حج", "عمرة", "ذكر", "تسبيح", "استعاذة", "استعانة",
    "قدر", "كتاب", "قضاء", "اجل", "دنيا", "آخرة", "جنة", "نار", "عذاب", "نعيم", "فتنة", "ابتلاء",
    "سلام", "قتال", "قتل", "سلم", "قصاص", "إصلاح",
    "رسول", "نبي", "وحي", "ملة", "حنيف", "ابراهيم", "موسى", "عيسى", "نوح", "يوسف", "محمد",
    "Dieu", "miséricorde", "guidance", "vérité", "mensonge", "justice", "équité", "sagesse",
    "foi", "soumission", "idolâtrie", "unicité", "repentir", "pardon",
    "prière", "jeûne", "aumône", "pèlerinage",
    "paradis", "enfer", "épreuve", "tentation", "destin", "sincérité", "hypocrisie",
    "salat", "sawm", "zakat", "iman", "kufr", "shirk", "tawhid", "kitab", "rasul", "nabi", "ayah",
    "2.255", "1.1", "24.35", "36.1", "112.1", "18.110", "39.53", "49.13", "2.183", "2.286",
    "رزق", "برهان", "بيّنة", "آثار", "أمم", "قرون", "لسان", "عقل", "فطرة", "حرر"
  ];
}
*/
// ---- Seed par défaut si historique vide : toutes les racines du lexique (colonne 0)
function getSeedHistoriqueMots() {
  try {
    // Vérifier que fTabLexique existe
    if (typeof fTabLexique !== 'function') {
      return [];
    }

    const tabLexique = fTabLexique();
    if (!Array.isArray(tabLexique) || !tabLexique.length) {
      console.warn('getSeedHistoriqueMots : lexique vide ou invalide.');
      return [];
    }

    const seen = new Set();
    const racines = [];

    // Colonne 0 = racine
    for (const row of tabLexique) {
      if (!row || row[0] == null) continue;

      const r = String(row[0]).trim();
      if (!r) continue;
      if (seen.has(r)) continue;

      seen.add(r);
      racines.push(r);
    }

    // Option : tri alpha (si tu ne veux pas trier, commente la ligne suivante)
    racines.sort((a, b) => a.localeCompare(b, 'ar'));

    return racines;
  } catch (e) {
    console.error('getSeedHistoriqueMots — erreur :', e);
    return [];
  }
}

// ---- Utilitaires internes --------------------------------------------------
function normaliserEntreeMot(s) {
  return String(s || "").trim();
}

function zcResolveHistorikOwnerKey() {
  try {
    const au = window.firebase?.auth?.().currentUser;
    if (au && au.uid) return "uid:" + String(au.uid).trim();
  } catch (_) { }
  try {
    const mail = String(localStorage.getItem("mailUser") || "").trim().toLowerCase();
    if (mail) return "mail:" + mail;
  } catch (_) { }
  return "guest";
}

function zcHistorikStorageKey() {
  return "historiqueMots::" + zcResolveHistorikOwnerKey();
}

function readHistoriqueMotsForCurrentUser() {
  try {
    const key = zcHistorikStorageKey();
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(parsed)) return parsed;
  } catch (_) { }
  // Migration douce : ancien stockage global -> rattaché au profil courant.
  try {
    const legacy = JSON.parse(localStorage.getItem("historiqueMots") || "[]");
    if (Array.isArray(legacy) && legacy.length) {
      try { localStorage.setItem(zcHistorikStorageKey(), JSON.stringify(legacy)); } catch (_) { }
      return legacy;
    }
  } catch (_) { }
  return [];
}

function writeHistoriqueMotsForCurrentUser(histo) {
  try {
    localStorage.setItem(zcHistorikStorageKey(), JSON.stringify(Array.isArray(histo) ? histo : []));
  } catch (_) { }
}

function getUnifiedHistorikLexiqueList() {
  const hist = readHistoriqueMotsForCurrentUser();
  const lex = getSeedHistoriqueMots();
  const out = [];
  const seen = new Set();
  // Historik utilisateur d'abord (plus récent -> plus ancien)
  for (let i = hist.length - 1; i >= 0; i--) {
    const v = normaliserEntreeMot(hist[i]);
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  // Puis le lexique (base complète)
  for (let j = 0; j < lex.length; j++) {
    const v = normaliserEntreeMot(lex[j]);
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

window.zcGetUnifiedMotSuggestionsStats = function (prefix, maxItems) {
  const q = String(prefix || "").trim().toLowerCase();
  const lim = Number.isFinite(maxItems) ? Math.max(1, maxItems) : Number.POSITIVE_INFINITY;
  const pool = getUnifiedHistorikLexiqueList();
  if (!q) {
    return { total: pool.length, matched: pool.length, shown: Math.min(pool.length, lim) };
  }
  let matched = 0;
  for (let i = 0; i < pool.length; i++) {
    const v = String(pool[i] || "").toLowerCase();
    if (v.includes(q)) matched++;
  }
  return { total: pool.length, matched: matched, shown: Math.min(matched, lim) };
};

window.zcGetUnifiedMotSuggestions = function (prefix, maxItems) {
  const q = String(prefix || "").trim().toLowerCase();
  const lim = Number.isFinite(maxItems) ? Math.max(1, maxItems) : Number.POSITIVE_INFINITY;
  const pool = getUnifiedHistorikLexiqueList();
  if (!q) return pool.slice(0, lim);
  const out = [];
  for (let i = 0; i < pool.length; i++) {
    const v = String(pool[i] || "");
    if (!v) continue;
    if (v.toLowerCase().includes(q)) {
      out.push(v);
      if (out.length >= lim) break;
    }
  }
  return out;
};

function dedupePush(histo, mot) {
  // déduplication simple, sensible à la casse telle quelle (évite “mot” répétés)
  const idx = histo.indexOf(mot);
  if (idx !== -1) {
    // si déjà présent, on le déplace en fin (dernier recherché)
    histo.splice(idx, 1);
  }
  histo.push(mot);
  // Respecte la limite
  while (histo.length > maxValeursHistorik) histo.shift();
  return histo;
}

function saveHistorique(histo) {
  writeHistoriqueMotsForCurrentUser(histo);
  try { remplirSelecteurHistorique(); } catch (_) { }
}

// ---- Sauvegarder un mot ----------------------------------------------------
function sauvegarderMot() {
  var inputMot = normaliserEntreeMot(document.getElementById('mot').value);
	inputMot=shortenLabel(inputMot || '').replace('…', "");
	//inputMot=escapeHtml(inputMot);
  if (!inputMot) return;

  // Récupère l'historique actuel
  var historique = readHistoriqueMotsForCurrentUser();

  // Ajoute avec dédup + limite
  historique = dedupePush(historique, inputMot);
  saveHistorique(historique);
}

// ---- UI: remplir le <select> ----------------------------------------------
function remplirSelecteurHistorique(historique) {
  const source = Array.isArray(historique) ? historique : getUnifiedHistorikLexiqueList();

  // Nouveau mode: input jumeau de #mot (suggestions dynamiques).
  const historikInput = document.getElementById('historiqueMotsInput');
  if (historikInput) {
    historikInput.dataset.historikSize = String(source.length || 0);
    return;
  }

  // Fallback legacy si ancien <select> présent.
  var selectElem = document.getElementById('historiqueMots');
  if (!selectElem) return;
  selectElem.innerHTML = '<option value="">Historik</option>';
  source.forEach(function (mot) {
    var option = document.createElement('option');
    option.value = mot;
    option.textContent = mot;
    selectElem.appendChild(option);
  });
}

function selectionnerMotParValeur(motChoisi, force) {
  const inp = document.getElementById('mot');
  if (!inp) return;
  const chosen = String(motChoisi || "");
  setTimeout(() => {
    try {
      inp.value = chosen;
      try { inp.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { console.warn('dispatchEvent input failed', e); }
      try { if (typeof testLangueOninputMot === 'function') testLangueOninputMot(); } catch (e) { console.warn('testLangueOninputMot error', e); }
      let chercheMode = 2;
      try {
        const m = window.__zcHistorikChercheMode;
        if (typeof m === 'number' && !Number.isNaN(m)) chercheMode = m;
      } catch (_) { }
      try {
        if (force && typeof ChercheMotsMain === 'function') ChercheMotsMain(chercheMode);
      } catch (e) {
        console.warn('ChercheMotsMain error', e);
        try {
          if (chercheMode === 4 && typeof moduleLexique === 'function') moduleLexique();
        } catch (_) { }
      }
      try { delete window.__zcHistorikChercheMode; } catch (_) { window.__zcHistorikChercheMode = undefined; }

      if (chosen) {
        try {
          const ov = document.getElementById('zcHistorikOverlay');
          if (ov && ov.style.display === 'flex' && typeof window.zcCloseHistorikPopup === 'function') {
            window.zcCloseHistorikPopup();
          }
        } catch (_) { }
      }
    } catch (err) {
      console.error('selectionnerMotParValeur error', err);
    }
  }, 0);
}

window.zcHistorikSearchFromInput = function (force) {
  const inputHist = document.getElementById('historiqueMotsInput');
  if (!inputHist) return;
  selectionnerMotParValeur(inputHist.value || "", !!force);
};

window.zcHistorikRefreshSuggestions = function () {
  const inputHist = document.getElementById('historiqueMotsInput');
  const countEl = document.getElementById('zcHistorikCount');
  if (!inputHist) return;
  const q = inputHist.value || "";
  try {
    if (typeof showSuggestions === 'function') showSuggestions(q, 'historiqueMotsInput');
  } catch (_) { }
  if (countEl) {
    try {
      const s = (typeof window.zcGetUnifiedMotSuggestionsStats === "function")
        ? window.zcGetUnifiedMotSuggestionsStats(q)
        : { shown: 0, total: 0 };
      countEl.textContent = `${Number(s.shown) || 0} / ${Number(s.total) || 0}`;
    } catch (_) {
      countEl.textContent = "0 / 0";
    }
  }
};

window.zcRefreshMotSuggestionsCount = function (inputValue) {
  const countEl = document.getElementById('zcMotSuggestionsCount');
  if (!countEl) return;
  const q = (inputValue != null) ? String(inputValue) : String(document.getElementById('mot')?.value || '');
  try {
    const s = (typeof window.zcGetUnifiedMotSuggestionsStats === "function")
      ? window.zcGetUnifiedMotSuggestionsStats(q)
      : { shown: 0, total: 0 };
    countEl.textContent = `${Number(s.shown) || 0} / ${Number(s.total) || 0}`;
  } catch (_) {
    countEl.textContent = "0 / 0";
  }
};

// ---- UI: choisir un mot depuis l'historique (force update + handlers) ----
function selectionnerMot(force) {
  const selectElem = document.getElementById('historiqueMots');
  if (!selectElem) return;
  selectionnerMotParValeur(selectElem.value || "", force);
}


// ---- Binder une seule fois : couvre change + reclique même option + iOS ----
(function bindHistoriqueMotsHandlers() {
  function onReady(fn) { if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fn, { once: true }); } else fn(); }
  onReady(() => {
    const inputHist = document.getElementById('historiqueMotsInput');
    if (inputHist && !inputHist._histInputBound) {
      inputHist.addEventListener('input', function () {
        window.zcHistorikRefreshSuggestions();
      });
      inputHist.addEventListener('change', function () {
        selectionnerMotParValeur(inputHist.value || "", true);
      });
      inputHist.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          selectionnerMotParValeur(inputHist.value || "", true);
        }
      });
      inputHist._histInputBound = true;
    }

    const sel = document.getElementById('historiqueMots');
    if (!sel || sel._histBound) return;

    // Mémo de la valeur avant ouverture
    let prevValue = sel.value;

    // wrapper sûr pour appeler la logique principale
    const apply = (force) => {
      try { selectionnerMot(!!force); } catch (e) { console.warn('selectionnerMot error', e); }
    };

    // 1) comportement standard : changement de valeur
    sel.addEventListener('change', () => apply(true));

    // 2) Pour gérer le cas "reclicker la même option" sur desktop/mobile
    // On utilise click/touchend mais sans passive:true (afin d'être sûr que l'event soit observable)
    sel.addEventListener('click', () => {
      // Sur certains iOS le click arrive avant l'ouverture du picker → on ne force pas directement
      // mais on prépare à traiter sur blur.
      // On déclenche quand même un apply dans le cas où la valeur a déjà changé.
      if (sel.value !== prevValue) apply(true);
    });

    // 3) iOS / mobile: focus/blur technique
    sel.addEventListener('focus', () => {
      prevValue = sel.value; // mémoriser avant ouverture du sélecteur natif
    });

    // blur survient quand le picker natif se ferme; utiliser un petit délai pour laisser
    // la valeur finale s'appliquer dans tous les navigateurs (surtout iOS).
    sel.addEventListener('blur', () => {
      setTimeout(() => {
        // Toujours appeler, même si la valeur est identique (permet de re-sélectionner la même entrée)
        // Si tu veux éviter d'appeler inutilement, change la condition ci-dessous.
        if (sel.value !== "" || prevValue !== "") {
          apply(true);
        }
        prevValue = sel.value;
      }, 50); // 50ms est sûr ; tu peux diminuer à 10ms si tu veux
    });

    // 4) pointerup/touchend fallback (gardez si vous en avez vu l'utilité) :
    //    n'utilise pas passive:true ici pour être sûr que l'event soit pris en compte.
    sel.addEventListener('pointerup', () => {
      // petit délai pour laisser le navigateur réagir
      setTimeout(() => { if (sel.value !== prevValue) apply(true); }, 20);
    });
    sel.addEventListener('touchend', () => {
      setTimeout(() => { if (sel.value !== prevValue) apply(true); }, 20);
    });

    // Marque comme bindé
    sel._histBound = true;
  });
})();

// ---- Popup Historik (listbox dans #zcHistorikOverlay) ---------------------
/** Même normalisation que sauvegarderMot pour aligner la recherche sur l’historique réel. */
function zcGetMotFieldQueryForHistorik() {
  const inp = document.getElementById('mot');
  if (!inp) return '';
  let inputMot = normaliserEntreeMot(inp.value);
  if (typeof shortenLabel === 'function') {
    inputMot = String(shortenLabel(inputMot || ''))
      .replace(/\u2026/g, '')
      .replace('…', '')
      .trim();
  }
  return inputMot;
}

/**
 * Choisit l’option la plus proche de `query` (égalité, préfixe, sous-chaîne, préfixe commun).
 * Retourne l’index (0 = entrée vide « Historik ») si rien ne correspond.
 */
function zcFindBestHistorikOptionIndex(selectElem, query) {
  if (!selectElem || selectElem.options.length <= 1) return 0;
  const q = String(query || '').trim();
  if (!q) return 0;

  const qLower = q.toLowerCase();
  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 1; i < selectElem.options.length; i++) {
    const opt = selectElem.options[i];
    const v = String(opt.value || '');
    const t = String(opt.textContent || v || '');
    const vLower = v.toLowerCase();
    const tLower = t.toLowerCase();

    let score = 0;
    if (v === q || t === q) score = 100000;
    else if (vLower === qLower || tLower === qLower) score = 99900;
    else if (v.startsWith(q) || t.startsWith(q)) score = 80000 - Math.min(500, Math.abs(v.length - q.length));
    else if (vLower.startsWith(qLower) || tLower.startsWith(qLower)) {
      score = 79500 - Math.min(500, Math.abs(v.length - q.length));
    } else if (q.startsWith(v) || q.startsWith(t)) {
      score = 76000 - Math.min(400, Math.abs(v.length - q.length));
    } else if (v.includes(q) || t.includes(q)) {
      const iv = v.includes(q) ? v.indexOf(q) : 9999;
      const it = t.includes(q) ? t.indexOf(q) : 9999;
      const pos = Math.min(iv, it);
      score = 60000 - pos * 5 - Math.min(200, Math.abs(v.length - q.length));
    } else if (vLower.includes(qLower) || tLower.includes(qLower)) {
      score = 58000 - Math.min(200, Math.abs(v.length - q.length));
    } else if (q.includes(v) || q.includes(t)) {
      score = 55000 - Math.min(300, Math.abs(v.length - q.length));
    } else {
      let k = 0;
      const a = vLower;
      const b = qLower;
      const lim = Math.min(a.length, b.length);
      while (k < lim && a.charCodeAt(k) === b.charCodeAt(k)) k++;
      if (k > 0) score = 5000 + k * 80 - Math.abs(a.length - b.length);
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestScore > 0 ? bestIdx : 0;
}

/** Positionne la listbox sur l’entrée la plus proche du champ #mot. */
function zcPositionHistorikSelectFromMotField() {
  const q = zcGetMotFieldQueryForHistorik();
  const mot = document.getElementById('mot');
  if (mot) {
    mot.value = q;
    try { if (typeof showSuggestions === 'function') showSuggestions(q, 'mot'); } catch (_) { }
    try { if (typeof window.zcRefreshMotSuggestionsCount === "function") window.zcRefreshMotSuggestionsCount(q); } catch (_) { }
    return;
  }
  const sel = document.getElementById('historiqueMots');
  if (!sel) return;
  const idx = zcFindBestHistorikOptionIndex(sel, q);
  sel.selectedIndex = idx;
}

function zcMountPanelVersetsIntoHistorik() {
  const host = document.getElementById('zcHistorikPanelHost');
  const panel = document.getElementById('panelVersets');
  if (!host || !panel) return;
  if (panel.parentNode === host) return;
  const parent = panel.parentNode;
  if (!parent) return;
  const marker = document.createComment('zcPanelVersetsDock');
  parent.insertBefore(marker, panel);
  panel.__zcHistorikDock = { parent, marker };
  host.appendChild(panel);
}

function zcRestorePanelVersetsFromHistorik() {
  const panel = document.getElementById('panelVersets');
  if (!panel) return;
  const dock = panel.__zcHistorikDock;
  if (!dock || !dock.parent || !dock.marker) return;
  dock.parent.insertBefore(panel, dock.marker);
  try { dock.marker.remove(); } catch (_) { }
  panel.__zcHistorikDock = null;
}

window.zcCloseHistorikPopup = function () {
  const ov = document.getElementById('zcHistorikOverlay');
  if (!ov) return;
  try { zcRestorePanelVersetsFromHistorik(); } catch (_) { }
  try {
    const dock = ov.__zcHistorikDock;
    if (dock && dock.parent) {
      if (dock.next && dock.next.parentNode === dock.parent) dock.parent.insertBefore(ov, dock.next);
      else dock.parent.appendChild(ov);
    }
  } catch (_) { }
  ov.style.display = 'none';
  ov.setAttribute('aria-hidden', 'true');
  try { delete window.__zcHistorikChercheMode; } catch (_) { window.__zcHistorikChercheMode = undefined; }
};

window.zcOpenHistorikPopup = function () {
  const ov = document.getElementById('zcHistorikOverlay');
  if (!ov) return;
  try { zcMountPanelVersetsIntoHistorik(); } catch (_) { }
  try {
    if (!ov.__zcHistorikDock) {
      ov.__zcHistorikDock = { parent: ov.parentNode, next: ov.nextSibling };
    }
    if (document.body && ov.parentNode !== document.body) {
      document.body.appendChild(ov);
    }
  } catch (_) { }
  let z = 10050;
  try {
    if (typeof window.getNextZIndex === 'function') z = window.getNextZIndex();
    else if (typeof getNextZIndex === 'function') z = getNextZIndex();
  } catch (_) { }
  ov.style.zIndex = String(z);
  ov.style.display = 'flex';
  ov.setAttribute('aria-hidden', 'false');
  setTimeout(function () {
    try {
      zcPositionHistorikSelectFromMotField();
      const mot = document.getElementById('mot');
      if (mot) mot.focus();
    } catch (_) { }
  }, 50);
};

(function bindHistorikPopupUi() {
  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }
  onReady(function () {
    const ov = document.getElementById('zcHistorikOverlay');
    if (!ov) return;
    document.addEventListener('click', function (e) {
      if (ov.style.display !== 'flex') return;
      const trigger = e.target && e.target.closest
        ? e.target.closest('#zoomCoranBtnR0, .zc-module-head-action-ico')
        : null;
      if (!trigger) return;
      const inHistorik = trigger.closest ? trigger.closest('#zcHistorikDialog') : null;
      if (!inHistorik) return;
      // Fermer après l'action du bouton loupe.
      window.setTimeout(function () {
        try { window.zcCloseHistorikPopup(); } catch (_) { }
      }, 0);
    }, true);
    ov.addEventListener('click', function (e) {
      if (e.target === ov) window.zcCloseHistorikPopup();
    });
    const x = document.getElementById('zcHistorikPopupClose');
    if (x) x.addEventListener('click', function () { window.zcCloseHistorikPopup(); });
    const f = document.getElementById('btnHistorikPopupFermer');
    if (f) f.addEventListener('click', function () { window.zcCloseHistorikPopup(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ov.style.display === 'flex') window.zcCloseHistorikPopup();
    });
  });
})();



// ---- Initialisation au chargement ------------------------------------------
// fTabLexique1.js est chargé en async depuis index (Storage / jsZC) : souvent APRÈS ce script.
// On attend l’événement zcLexiqueReady (ou __zcLexiqueReadyDone) avant de remplir la seed.
(function initHistoriqueMots() {
  function applyHistorique(historique) {
    try { remplirSelecteurHistorique(historique || []); } catch (_) { }
  }

  function readStoredHistorique() {
    return readHistoriqueMotsForCurrentUser();
  }

  function run() {
    const historique = readStoredHistorique();
    applyHistorique(historique);
    try { if (typeof window.zcRefreshMotSuggestionsCount === "function") window.zcRefreshMotSuggestionsCount(); } catch (_) { }
    // Quand le lexique arrive (chargement async), on enrichit la liste unifiée.
    if (!window.__zcLexiqueReadyDone) {
      window.addEventListener('zcLexiqueReady', function () {
        try { remplirSelecteurHistorique(readHistoriqueMotsForCurrentUser()); } catch (_) { }
        try { if (typeof window.zcRefreshMotSuggestionsCount === "function") window.zcRefreshMotSuggestionsCount(); } catch (_) { }
      }, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();


function resetHistoriqueMotsDepuisSeed(opts) {
  try { writeHistoriqueMotsForCurrentUser([]); } catch (_) { }
  try { remplirSelecteurHistorique([]); } catch (_) { }
  try { window.zcHistorikRefreshSuggestions(); } catch (_) { }
  try { if (typeof window.zcRefreshMotSuggestionsCount === "function") window.zcRefreshMotSuggestionsCount(); } catch (_) { }
  alertMsgBoxTemp("Historik personnalisé supprimé (Lexique conservé).");
}

function clearHistoriqueMotsUtilisateur() {
  writeHistoriqueMotsForCurrentUser([]);
  try { remplirSelecteurHistorique([]); } catch (_) { }
  try { window.zcHistorikRefreshSuggestions(); } catch (_) { }
  try { if (typeof window.zcRefreshMotSuggestionsCount === "function") window.zcRefreshMotSuggestionsCount(); } catch (_) { }
  alertMsgBoxTemp("Historik utilisateur vidé.");
}
window.clearHistoriqueMotsUtilisateur = clearHistoriqueMotsUtilisateur;

// ---- Historik : stockage local = localStorage, clé `historiqueMots::` + zcResolveHistorikOwnerKey()
//     (uid Firebase, mail localStorage, ou guest). Cloud = même segment sous MesDonnes/historikMots/…
var HISTORIK_MOTS_FILENAME = 'historiqueMots.json';
/** Ancien emplacement unique (import seulement, repli si le fichier par compte est absent). */
var HISTORIK_MOTS_STORAGE_PATH_LEGACY = 'MesDonnes/' + HISTORIK_MOTS_FILENAME;

function zcHistorikFirebasePathSegment() {
  return String(zcResolveHistorikOwnerKey() || 'guest').replace(/:/g, '_').replace(/[^a-zA-Z0-9@._-]/g, '_');
}

function zcHistorikFirebaseStoragePath() {
  return 'MesDonnes/historikMots/' + zcHistorikFirebasePathSegment() + '/' + HISTORIK_MOTS_FILENAME;
}

function zcHistorikFetchJsonFromStorageRef(fileRef) {
  return fileRef.getDownloadURL().then(function (url) {
    return fetch(url, { mode: 'cors' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (text) { return JSON.parse(text); });
  });
}

// ---- Export historik vers Firebase Storage ---------------------------------
function exporterHistoriqueMotsVersFirebase() {
  if (typeof storage === 'undefined' || !storage || !storage.ref) {
    if (typeof alertMsgBoxPopup === 'function') alertMsgBoxPopup(tMsg('storageUnavailable'));
    else alert(tMsg('storageUnavailable'));
    return;
  }
  var historique = [];
  try {
    historique = readHistoriqueMotsForCurrentUser();
  } catch (_) { historique = []; }
  var json = JSON.stringify(historique, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var fileRef = storage.ref(zcHistorikFirebaseStoragePath());
  fileRef.put(blob).then(function () {
    if (typeof alertMsgBoxTemp === 'function') alertMsgBoxTemp(tMsg('exportOk', { n: historique.length }));
    else alert(tMsg('exportOk', { n: historique.length }));
  }).catch(function (err) {
    console.error('Export historik:', err);
    if (typeof alertMsgBoxPopup === 'function') alertMsgBoxPopup(tMsg('exportError', { err: (err.message || err) }));
    else alert(tMsg('exportError', { err: (err.message || err) }));
  });
}

// ---- Import historik depuis Firebase Storage -------------------------------
// Si "Failed to fetch" : configurer CORS sur le bucket (une fois) :
//   gsutil cors set firebase-storage-cors.json gs://alfamous-amha.appspot.com
function importerHistoriqueMotsDepuisFirebase() {
  if (typeof storage === 'undefined' || !storage || !storage.ref) {
    if (typeof alertMsgBoxPopup === 'function') alertMsgBoxPopup(tMsg('storageUnavailable'));
    else alert(tMsg('storageUnavailable'));
    return;
  }
  var primaryRef = storage.ref(zcHistorikFirebaseStoragePath());
  var legacyRef = storage.ref(HISTORIK_MOTS_STORAGE_PATH_LEGACY);
  zcHistorikFetchJsonFromStorageRef(primaryRef).catch(function (err) {
    if (err && err.code === 'storage/object-not-found') {
      return zcHistorikFetchJsonFromStorageRef(legacyRef);
    }
    throw err;
  }).then(function (data) {
    if (!Array.isArray(data)) {
      if (typeof alertMsgBoxPopup === 'function') alertMsgBoxPopup(tMsg('invalidFileArray'));
      else alert(tMsg('invalidFileArray'));
      return;
    }
    var limite = (typeof maxValeursHistorik === 'number' && maxValeursHistorik > 0) ? maxValeursHistorik : 2000;
    var historique = data.slice(0, limite);
    try {
      writeHistoriqueMotsForCurrentUser(historique);
    } catch (e) {
      if (typeof alertMsgBoxPopup === 'function') alertMsgBoxPopup(tMsg('localStorageWriteError'));
      else alert(tMsg('localStorageWriteError'));
      return;
    }
    if (typeof remplirSelecteurHistorique === 'function') {
      remplirSelecteurHistorique(historique.slice().reverse());
    }
    try { window.zcHistorikRefreshSuggestions(); } catch (_) { }
    try { if (typeof window.zcRefreshMotSuggestionsCount === 'function') window.zcRefreshMotSuggestionsCount(); } catch (_) { }
    if (typeof alertMsgBoxTemp === 'function') alertMsgBoxTemp(tMsg('importOk', { n: historique.length }));
    else alert(tMsg('importOk', { n: historique.length }));
  }).catch(function (err) {
    console.error('Import historik:', err);
    var msg = (err && err.code === 'storage/object-not-found') ? 'Aucun fichier historik sur Firebase.' : ('Erreur import: ' + (err.message || err));
    if (typeof alertMsgBoxPopup === 'function') alertMsgBoxPopup(msg);
    else alert(msg);
  });
}
