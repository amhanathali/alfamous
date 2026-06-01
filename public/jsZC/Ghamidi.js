// À mettre après fTabNomSouraNombreVersets.js (qui fournit lienAudio), avant Ghamidi.js
/*if (typeof window.lienAudioFb !== 'function') {
  window.lienAudioFb = function(n){
    if (typeof window.lienAudio === 'function') return window.lienAudio(n);
    return null;
  };
}*/
/* ==================== Helpers ==================== */
function pad3(n) { return String(n).padStart(3, '0'); }
function normalizeSoura(n) { const v = parseInt(n, 10); return (Number.isFinite(v) && v >= 1 && v <= 114) ? v : null; }
function stripHtml(html) {
  const d = document.createElement('div'); d.innerHTML = html;
  return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
}
function plurAya(n) { if (!Number.isFinite(n)) return 'Aya'; return (n > 1) ? 'Ayat' : 'Aya'; }
function wrapNext(s) { s = Number(s) || 1; return (s % 114) + 1; }

function zcDynamicTopZGhamidi() {
  const step = 2;
  try {
    if (typeof window.getNextZIndex === "function") return Number(window.getNextZIndex()) || 0;
    if (typeof getNextZIndex === "function") return Number(getNextZIndex()) || 0;
  } catch (_) { }
  let max = 0;
  try {
    const all = document.body ? document.body.querySelectorAll("*") : [];
    for (let i = 0; i < all.length; i++) {
      const z = parseInt(window.getComputedStyle(all[i]).zIndex, 10);
      if (!Number.isNaN(z) && z > max) max = z;
    }
  } catch (_) { }
  return max + step;
}

/* Flag global d’arrêt (arrêt “dur”) */
if (typeof window._stopAutoAdvance === "undefined") window._stopAutoAdvance = false;
const AUDIO_LOOP_PREF_KEY = "zcAudioLoopCurrentSoura";

function isCurrentSouraLoopEnabled() {
  try {
    const cb = document.getElementById("audio-loop-current");
    if (cb) return !!cb.checked;
  } catch (_) { }
  try {
    const raw = localStorage.getItem(AUDIO_LOOP_PREF_KEY);
    if (raw === "0" || raw === "1") return raw === "1";
  } catch (_) { }
  return true;
}

/* ==================== UI lecteur flottant ==================== */
/**
 * Crée (si besoin) le conteneur du lecteur et renvoie {container, audio, titleBadge, loopToggle}.
 * Si le conteneur existe déjà, on le réutilise.
 */
function ensureAudioUI() {
  let container = document.getElementById("audio-floating-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "audio-floating-container";
    container.style.cssText = `
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
      background: color-mix(in srgb, var(--zc-surface, #ffffff) 92%, transparent);
      color: var(--zc-text, #0f172a);
      border: 1px solid var(--zc-border, rgba(148,163,184,.35));
      backdrop-filter: blur(4px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      border-radius: 10px; padding: 0;
      display: flex; flex-direction: column; gap: 0; max-width: 95vw;
      box-sizing: border-box; overflow: visible;
    `;
    document.body.appendChild(container);
  }

  // Important: à chaque (ré)utilisation, remonter le lecteur au-dessus des overlays actifs.
  try { container.style.zIndex = String(zcDynamicTopZGhamidi()); } catch (_) { }

  let header = container.querySelector("#audio-floating-header");
  if (!header) {
    header = document.createElement("div");
    header.id = "audio-floating-header";
    header.style.cssText = `
      display:grid;grid-template-columns:34px 1fr 34px;align-items:center;
      gap:8px;padding:6px 8px;border-bottom:1px solid var(--zc-border, rgba(148,163,184,.35));
    `;

    const headerTitle = document.createElement("div");
    headerTitle.innerHTML = '<span class="zc-top-action-ico" aria-hidden="true" style="margin-inline-end:6px;"><i class="fas fa-volume-up"></i></span><span>Voix Saad el ghamidi</span>';
    headerTitle.style.cssText = "text-align:center;font-weight:700;color:var(--zc-text,#0f172a);display:inline-flex;align-items:center;justify-content:center;";

    const closeIcon = document.createElement("button");
    closeIcon.id = "audio-close";
    closeIcon.type = "button";
    closeIcon.innerHTML = "&times;";
    closeIcon.setAttribute("aria-label", "Fermer");
    closeIcon.title = "Fermer";
    closeIcon.style.cssText = "border:none;background:transparent;cursor:pointer;font-weight:700;font-size:18px;line-height:1;color:#1e88e5;padding:0;display:inline-flex;align-items:center;justify-content:center;";
    closeIcon.onclick = function (e) {
      e.stopPropagation();
      window._stopAutoAdvance = true;          // arrêt “dur”
      const a = container.querySelector("audio");
      try { if (a && !a.paused) a.pause(); } catch (_) { }
      container.remove();
    };

    header.append(headerTitle, closeIcon);
    container.appendChild(header);
  }
  try {
    const oldMenuBtn = header ? header.querySelector("#audio-menu-btn") : null;
    if (oldMenuBtn && oldMenuBtn.parentNode) oldMenuBtn.parentNode.removeChild(oldMenuBtn);
  } catch (_) { }

  let bodyRow = container.querySelector("#audio-floating-body");
  if (!bodyRow) {
    bodyRow = document.createElement("div");
    bodyRow.id = "audio-floating-body";
    bodyRow.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 10px;flex-wrap:wrap;";
    container.appendChild(bodyRow);
  }

  // badge titre
  let titleBadge = container.querySelector("#audio-title-badge");
  if (!titleBadge) {
    titleBadge = document.createElement("span");
    titleBadge.id = "audio-title-badge";
    titleBadge.style.cssText = `
      font-weight: 600; font-size: 14px; padding: 2px 8px;
      border-radius: 8px; border: 1px solid rgba(30,136,229,0.3);
      color: var(--zc-text, #0f172a); -webkit-text-fill-color: var(--zc-text, #0f172a);
      background: var(--zc-ui-soft-bg, #f8fafc);
      white-space: normal; line-height: 1.2;
    `;
    bodyRow.appendChild(titleBadge);
  }

  // Toggle boucle sourate
  let loopWrap = container.querySelector("#audio-loop-wrap");
  if (!loopWrap) {
    loopWrap = document.createElement("label");
    loopWrap.id = "audio-loop-wrap";
    loopWrap.style.cssText = `
      display:inline-flex;align-items:center;gap:4px;
      font-size:12px;color:var(--zc-text,#0f172a);user-select:none;
      white-space:nowrap;padding:2px 4px;border-radius:6px;
      background:var(--zc-ui-soft-bg,#f8fafc);border:1px solid rgba(148,163,184,.35);
    `;
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = "audio-loop-current";
    cb.style.cssText = "margin:0;accent-color:#2563eb;cursor:pointer;";
    // Coché par défaut (si aucune préférence encore stockée)
    cb.checked = true;
    try {
      const raw = localStorage.getItem(AUDIO_LOOP_PREF_KEY);
      if (raw === "0" || raw === "1") cb.checked = raw === "1";
    } catch (_) { }
    cb.addEventListener("change", function () {
      try {
        localStorage.setItem(AUDIO_LOOP_PREF_KEY, cb.checked ? "1" : "0");
      } catch (_) { }
    });
    const txt = document.createElement("span");
    txt.textContent = "Boucle";
    loopWrap.append(cb, txt);
    if (header) {
      header.insertBefore(loopWrap, header.firstChild || null);
    } else {
      bodyRow.appendChild(loopWrap);
    }
  } else if (header && loopWrap.parentElement !== header) {
    header.insertBefore(loopWrap, header.firstChild || null);
  }

  // élément audio
  let audio = container.querySelector("audio");
  if (!audio) {
    audio = document.createElement("audio");
    audio.controls = true;
    audio.style.maxWidth = "320px";
    bodyRow.appendChild(audio);
  }

  const loopToggle = container.querySelector("#audio-loop-current");
  if (loopToggle) {
    // Resynchronise l’état à chaque réouverture/recréation du lecteur.
    try {
      const raw = localStorage.getItem(AUDIO_LOOP_PREF_KEY);
      if (raw === "0" || raw === "1") loopToggle.checked = raw === "1";
      else loopToggle.checked = true;
    } catch (_) {
      loopToggle.checked = true;
    }
  }
  return { container, audio, titleBadge, loopToggle };
}

/* Met à jour l’UI (titre + metadata accessibilité) pour la sourate donnée */
function updateUIForSoura(numSoura, titleBadge, audioEl) {
  const nVers = (typeof nbVers === 'function') ? nbVers(numSoura) : undefined;
  const nomPhon = (typeof nomSouraPhon === 'function') ? nomSouraPhon(numSoura) : `Sourate ${pad3(numSoura)}`;
  const nomAR = (typeof nomSouraAR === 'function') ? nomSouraAR(numSoura) : '';
  const titreCompletHTML = `#${numSoura}.1 ${nomPhon} (${nVers ?? '?'} ${plurAya(nVers)}) ${nomAR} <br>`;
  const titreCompletTEXT = stripHtml(titreCompletHTML);

  titleBadge.innerHTML = titreCompletHTML;
  audioEl.title = titreCompletTEXT;
  audioEl.setAttribute("aria-label", titreCompletTEXT);
  audioEl.dataset.surah = pad3(numSoura);

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: titreCompletTEXT,
        artist: "Qur'an",
        album: "Lecture"
      });
    } catch (_) { }
  }
}

/* ==================== Cœur : jouer une sourate ==================== */
/**
 * Joue (ou enchaîne) une sourate dans le lecteur flottant.
 * - numSoura: 1..114
 * - Lien via lienAudioFb(numSoura)
 * - En fin de lecture, passe automatiquement à la sourate suivante (114→1),
 *   sauf si window._stopAutoAdvance == true.
 */
function playSurah(numSoura) {
  const n = normalizeSoura(numSoura);
  if (!n) return;

  const lien = (typeof lienAudioFb === "function") ? lienAudioFb(n) : null;
  if (!lien) {
    console.error(`Lien audio non trouvé pour la sourate ${n}.`);
    return;
  }

  // Assure le lecteur
  const { container, audio, titleBadge, loopToggle } = ensureAudioUI();
  try { container.style.zIndex = String(zcDynamicTopZGhamidi()); } catch (_) { }
  const liftAboveActiveCaller = () => {
    try {
      const caller =
        document.getElementById('popupResultatsZ3') ||
        document.getElementById('popupResultatsZ2') ||
        document.getElementById('popupResultatsZ1') ||
        document.getElementById('popupResultats') ||
        document.getElementById('popupHtml');
      if (caller && typeof window.getComputedStyle === 'function') {
        const disp = String(window.getComputedStyle(caller).display || '').toLowerCase();
        if (disp !== 'none' && typeof window.zcZIndexPlaceOverlayAboveCaller === 'function') {
          window.zcZIndexPlaceOverlayAboveCaller(caller, container);
        }
      }
    } catch (_) { }
  };
  liftAboveActiveCaller();
  try {
    requestAnimationFrame(() => {
      liftAboveActiveCaller();
      setTimeout(liftAboveActiveCaller, 40);
    });
  } catch (_) { }

  // Réinitialise le flag d’arrêt si on (re)démarre explicitement
  window._stopAutoAdvance = false;

  // Met à jour l’UI et charge la source
  updateUIForSoura(n, titleBadge, audio);
  try { audio.pause(); } catch (_) { }
  audio.src = lien;
  try { audio.load(); } catch (_) { }

  // Gestion de la fin → enchaînement
  // (on retire d'abord d’éventuels anciens listeners)
  audio.onended = null;
  audio.onerror = null;

  audio.onended = function () {
    if (window._stopAutoAdvance) return;
    // Lire l'état AU MOMENT DE FIN de la sourate (l'utilisateur peut changer en cours de lecture).
    const sameSouraLoop = isCurrentSouraLoopEnabled();
    const next = sameSouraLoop ? n : wrapNext(n); // mode boucle: relire la même sourate
    // relance en place (sans détruire la popup)
    playSurah(next);
  };
  audio.onerror = function () {
    if (window._stopAutoAdvance) return;
    // En cas d’erreur, on tente quand même la suivante
    const next = isCurrentSouraLoopEnabled() ? n : wrapNext(n);
    playSurah(next);
  };

  // GO
  audio.play().catch(() => { /* autoplay bloqué: l’utilisateur peut cliquer play */ });
}

/* ==================== API attendue par ton code ==================== */
/**
 * Compat avec ton bouton/appel existant.
 * - lireAudio(-1) → lit #mot (peut être "sourate" ou "sourate.aya" : on prend la sourate)
 * - lireAudio(n)  → lit la sourate n
 * - lireAudio()   → lit window.numSourat si dispo
 */
function lireAudio(arg) {
  let numSoura;
  if (arg === -1) {
    const el = document.getElementById("mot");
    let v = el ? (el.value || "").trim() : "";
    if (v.includes(".")) v = v.split(".")[0];
    numSoura = parseInt(v, 10);
  } else if (Number.isFinite(parseInt(arg, 10))) {
    numSoura = parseInt(arg, 10);
  } else {
    numSoura = parseInt(window.numSourat, 10);
  }

  // clamp 1..114 avec repli
  if (!Number.isInteger(numSoura) || numSoura < 1 || numSoura > 114) {
    numSoura = Math.min(114, Math.max(1, parseInt(window.numSourat, 10) || 1));
  }

  // mémorise pour l’UI externe si tu l’utilises
  window.numSourat = numSoura;

  // joue (et auto-continue)
  playSurah(numSourat);
}

/**
 * À relier à TON bouton “Arrêt”.
 * - stoppe la lecture et empêche l’auto-advance
 * - garde ou enlève la popup (à toi de choisir; ici on l’enlève)
 */
function stopAudioLecture() {
  window._stopAutoAdvance = true;
  try {
    const container = document.getElementById("audio-floating-container");
    const a = container ? container.querySelector("audio") : null;
    if (a) { a.pause(); a.removeAttribute("src"); a.load(); }
    if (container) container.remove();
  } catch (_) { }
}



/* =========================================================================
   Index des colonnes (adaptez à votre structure fTabVersets)
   ========================================================================= */
const COL_SOURA = 0;
const COL_AYA = 1;
const COL_TEXTE = 2;
const COL_PAGE = 8;

/* Langues/voix */
const VOICE_LANG_MAP = { ar: "ar-SA", fr: "fr-FR", en: "en-US", es: "es-ES", kab: "ar-SA" };

/** Conteneur flux des versets (litAfficheVerset). Id stable ; nœud injecté au 1er usage (plus dans index.html). */
const ZC_ZONE_AFFICHAGE_VERSET_ID = "zoneAffichageVerset";

/**
 * Insère #zoneAffichageVerset avant le bandeau ☰ du bas (ou avant le pied), comme l’ancien emplacement statique.
 * @returns {HTMLElement|null}
 */
function ensureZoneAffichageVerset() {
  let el = document.getElementById(ZC_ZONE_AFFICHAGE_VERSET_ID);
  if (el) return el;
  el = document.createElement("div");
  el.id = ZC_ZONE_AFFICHAGE_VERSET_ID;
  el.dir = "rtl";
  el.className = "zc-zone-affichage-verset";
  const footBtn = document.getElementById("mainCtxMenuBtnFooter");
  const strip = footBtn && footBtn.closest(".zc-versets-tools-ctx-above--after-verset");
  if (strip && strip.parentNode) {
    strip.parentNode.insertBefore(el, strip);
    return el;
  }
  const stack = document.querySelector(".zc-footer-panel-stack");
  if (stack && stack.parentNode) {
    stack.parentNode.insertBefore(el, stack);
    return el;
  }
  try {
    document.body.appendChild(el);
  } catch (_) {
    return null;
  }
  return el;
}

/* ===================== État global lecteur ===================== */
const lecteurCoran = {
  enCours: false,
  cancel: false,
  paused: false,
  utterance: null,               // Utterance courant (boundary OU chunk)

  idxVerset: -1,                 // index (ligne) dans fTabVersets()
  idxMot: -1,                    // dernier mot surligné / atteint
  nextToSpeakIdx: 0,             // ✅ index minimal de reprise (anti-répétition)
  motsDOM: [],                   // spans du verset courant uniquement
  motBoundaries: [],             // bornes du verset courant pour mode boundary
  wordsNorm: [],                 // mots normalisés du verset courant

  containerId: ZC_ZONE_AFFICHAGE_VERSET_ID,
  options: {
    langueVoix: "ar",
    vitesse: 1.0,
    autoContinue: true,
    useBoundary: true,           // on tente d'abord boundary (le + fluide)
    resetContainerOnStart: true,
    chunkSize: 8,                // recalé dynamiquement à chaque verset
    msParMotBase: 180            // pour la simulation si boundary indisponible
  },

  // Modes & gardes
  mode: "auto",                  // "boundary" | "chunk"
  lastBoundaryTs: 0,
  boundaryWatchdog: null,        // interval watchdog (pas un timeout)
  resumeGuard: null,

  // anti-duplicat boundary
  lastWordIdx: -1,
  lastBoundaryAt: 0,

  // état spécifique au mode "chunk"
  chunkState: null               // { startIndex, nextIndex, manualTimer, gotBoundary, active }
};
window.lecteurCoran = lecteurCoran;

/* ============================== Utils ================================== */
// ⚠️ Ne pas écraser votre vraie fTabVersets()
if (typeof window.fTabVersets !== 'function') {
  window.fTabVersets = function () { return window.__TAB_VE || []; };
}
let __indexSA = null;
function initIndexVersets() {
  const tab = fTabVersets();
  __indexSA = new Map();
  for (let i = 0; i < tab.length; i++) {
    const s = Number(tab[i][COL_SOURA]);
    const a = Number(tab[i][COL_AYA]);
    __indexSA.set(`${s}:${a}`, i);
  }
}
function trouverIndex(soura, aya) {
  if (!__indexSA) initIndexVersets();
  const key = `${Number(soura)}:${Number(aya)}`;
  return __indexSA.has(key) ? __indexSA.get(key) : -1;
}
function trouverSouraAyaParPage(numPage) {
  const [_, ayaFromPage] = lireIndexPage(Number(numPage));
  const tab = fTabVersets();
  for (let i = 0; i < tab.length; i++) {
    const p = Number(tab[i][COL_PAGE]);
    const a = Number(tab[i][COL_AYA]);
    if (p === Number(numPage) && a === Number(ayaFromPage)) {
      return { soura: Number(tab[i][COL_SOURA]), aya: Number(ayaFromPage), idx: i };
    }
  }
  for (let i = 0; i < tab.length; i++) {
    const p = Number(tab[i][COL_PAGE]);
    if (p === Number(numPage)) {
      return { soura: Number(tab[i][COL_SOURA]), aya: Number(tab[i][COL_AYA]), idx: i };
    }
  }
  return { soura: 1, aya: 1, idx: 0 };
}
function ligneVerset(idx) {
  const tab = fTabVersets();
  return (idx >= 0 && idx < tab.length) ? tab[idx] : null;
}
function indexVersetSuivant(idx) {
  const tab = fTabVersets();
  return (idx + 1 < tab.length) ? idx + 1 : -1;
}
function getTexteSouraAya(idx) {
  const row = ligneVerset(idx);
  if (!row) return null;
  return {
    texte: String(row[COL_TEXTE] ?? "").trim().replace(/\s+/g, ' '), // normalisation espace
    soura: Number(row[COL_SOURA]),
    aya: Number(row[COL_AYA])
  };
}
function normaliserPourLecture(t) { return t.replace(/\s+/g, ' ').trim(); }
function splitMotsAffichage(t) { return t.trim().split(/\s+/); }
function computeBoundariesFromWords(words) {
  const bounds = []; let pos = 0;
  for (let i = 0; i < words.length; i++) {
    const start = pos, end = start + words[i].length;
    bounds.push({ start, end }); pos = end + 1; // +1 pour l'espace
  }
  return bounds;
}
function pickVoiceFor(langTag) {
  const voices = window.speechSynthesis.getVoices() || [];
  return voices.find(v => v.lang === langTag)
    || voices.find(v => v.lang && v.lang.startsWith(langTag.split('-')[0]))
    || null;
}

/* ===================== Entête : format et mise à jour ===================== */
function formatEntete(numSoura, numAya) {
  let phon = '';
  let ar = '';
  try { if (typeof nomSouraPhon === 'function') phon = nomSouraPhon(Number(numSoura)); } catch (e) { }
  try { if (typeof nomSouraAR === 'function') ar = nomSouraAR(Number(numSoura)); } catch (e) {
    try { if (typeof nomSouraAR === 'function') ar = nomSouraAR(Number(numAya)); } catch (_) { }
  }
  return `#${numSoura}.${numAya} ${phon || ''}${(phon && ar) ? ' | ' : (ar ? ' | ' : '')}${ar || ''}`;
}
function majEntete(numSoura, numAya) {
  const el = document.getElementById('lecteurInfoVerset');
  if (!el) return;
  el.textContent = formatEntete(numSoura, numAya);
}

/* ===================== Surbrillance (inline) ===================== */
function highlightMot(globalWordIndex) {
  const spans = lecteurCoran.motsDOM;
  if (!spans || !spans.length) return;
  const i = globalWordIndex;
  if (i >= 0 && i < spans.length) {
    const sp = spans[i];
    sp.classList.add('mot-actif');
    sp.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

/* ====== Ajout du verset avec REF cliquable (#soura.aya) AVANT le texte ====== */
function appendVersetAvecRef(containerId, texteAff, soura, aya) {
  if (containerId === ZC_ZONE_AFFICHAGE_VERSET_ID) ensureZoneAffichageVerset();
  const el = document.getElementById(containerId);
  if (!el) return [];
  const ligne = document.createElement('div');
  ligne.className = 'ligne-verset';
  ligne.setAttribute('dir', 'rtl');

  const ref = document.createElement('a');
  ref.href = '#';
  ref.className = 'ref-aya';
  ref.dataset.soura = String(soura);
  ref.dataset.aya = String(aya);
  ref.title = `Lire #${soura}.${aya}`;
  ref.textContent = `#${soura}.${aya}`;

  const motsWrap = document.createElement('span');
  motsWrap.className = 'mots-wrap';

  ligne.appendChild(ref);
  ligne.appendChild(document.createTextNode(' '));
  ligne.appendChild(motsWrap);

  const needBr = el.lastChild !== null;
  if (needBr) el.appendChild(document.createElement('br'));
  el.appendChild(ligne);

  const mots = splitMotsAffichage(texteAff);
  const spans = [];
  for (let i = 0; i < mots.length; i++) {
    if (i > 0) motsWrap.appendChild(document.createTextNode(' '));
    const sp = document.createElement('span');
    sp.className = 'mot-verset';
    sp.dataset.idx = String(i);
    sp.textContent = mots[i];
    motsWrap.appendChild(sp);
    spans.push(sp);
  }
  return spans;
}

/* ============= Watchdog util (interval) ============= */
function clearBoundaryWatchdog() {
  if (lecteurCoran.boundaryWatchdog) {
    clearInterval(lecteurCoran.boundaryWatchdog);
    lecteurCoran.boundaryWatchdog = null;
  }
}
function armBoundaryWatchdog(wordsNorm, langTag, rate, startIndex) {
  clearBoundaryWatchdog();
  lecteurCoran.boundaryWatchdog = setInterval(() => {
    if (lecteurCoran.cancel || lecteurCoran.paused) return;  // ⛔ ne rien faire si pause
    if (lecteurCoran.mode !== "boundary") return;
    const dt = performance.now() - lecteurCoran.lastBoundaryTs;
    if (dt > 700) { // plus de ~0.7s sans boundary → bascule chunk au bon index
      try { window.speechSynthesis.cancel(); } catch (e) { }
      clearBoundaryWatchdog();
      const startI = Math.max(
        (lecteurCoran.idxMot >= 0 ? lecteurCoran.idxMot : startIndex),
        lecteurCoran.nextToSpeakIdx
      );
      startChunkVerse(wordsNorm, langTag, rate, startI);
    }
  }, 300);
}

/* ===================== MODE BOUNDARY (très fluide) ===================== */
function startBoundaryVerse(wordsNorm, langTag, rate, startIndex = 0) {
  lecteurCoran.mode = "boundary";
  startIndex = Math.max(startIndex, lecteurCoran.nextToSpeakIdx); // 🔒 anti-répétition

  const text = wordsNorm.slice(startIndex).join(' ');
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langTag;
  u.rate = rate;
  const voice = pickVoiceFor(langTag); if (voice) u.voice = voice;

  lecteurCoran.utterance = u;
  lecteurCoran.lastBoundaryTs = 0;

  u.onstart = () => {
    lecteurCoran.enCours = true;
    lecteurCoran.cancel = false;
    lecteurCoran.lastBoundaryTs = performance.now();
    armBoundaryWatchdog(wordsNorm, langTag, rate, startIndex);
  };

  u.onboundary = (e) => {
    if (lecteurCoran.cancel) return;
    const ch = e.charIndex ?? 0;

    const localWords = wordsNorm.slice(startIndex);
    const localBounds = computeBoundariesFromWords(localWords);

    for (let j = 0; j < localBounds.length; j++) {
      const b = localBounds[j];
      if (ch >= b.start && ch < b.end) {
        const globalIdx = startIndex + j;

        // 🛡️ Déduplication boundary
        const now = performance.now();
        if (globalIdx === lecteurCoran.lastWordIdx && now - lecteurCoran.lastBoundaryAt < 80) {
          return;
        }
        lecteurCoran.lastWordIdx = globalIdx;
        lecteurCoran.lastBoundaryAt = now;

        lecteurCoran.idxMot = globalIdx;
        highlightMot(globalIdx);

        // avance l'index minimal de reprise au mot suivant
        lecteurCoran.nextToSpeakIdx = Math.max(lecteurCoran.nextToSpeakIdx, globalIdx + 1);

        lecteurCoran.lastBoundaryTs = now;
        break;
      }
    }
  };

  u.onend = () => {
    lecteurCoran.enCours = false;
    lecteurCoran.utterance = null;
    clearBoundaryWatchdog();
    clearTimeout(lecteurCoran.resumeGuard);
    if (lecteurCoran.cancel) return;

    // En fin naturelle : s’assurer que nextToSpeakIdx = fin du verset
    lecteurCoran.nextToSpeakIdx = lecteurCoran.wordsNorm.length;

    if (lecteurCoran.options.autoContinue) {
      const nextIdx = indexVersetSuivant(lecteurCoran.idxVerset);
      if (nextIdx >= 0) { lecteurCoran.idxVerset = nextIdx; setTimeout(demarrerLectureVerset, 10); }
    }
  };

  if ((window.speechSynthesis.getVoices() || []).length === 0) {
    window.speechSynthesis.onvoiceschanged = () => { try { window.speechSynthesis.speak(u); } catch (e) { } };
  }
  try { window.speechSynthesis.speak(u); } catch (e) { }
}

/* ===================== MODE CHUNK (rapide & robuste) ===================== */
function startChunkVerse(wordsNorm, langTag, rate, startIndex = 0) {
  lecteurCoran.mode = "chunk";
  clearBoundaryWatchdog();
  startIndex = Math.max(startIndex, lecteurCoran.nextToSpeakIdx); // 🔒 anti-répétition

  const cs = lecteurCoran.chunkState = {
    startIndex,
    nextIndex: startIndex,
    manualTimer: null,
    gotBoundary: false,
    active: true
  };

  const playNextChunk = () => {
    if (lecteurCoran.cancel || !cs.active) return;
    if (lecteurCoran.paused) return;

    const n = Math.max(1, lecteurCoran.options.chunkSize || 8);
    let i0 = cs.nextIndex;
    i0 = Math.max(i0, lecteurCoran.nextToSpeakIdx); // 🔒 anti-répétition

    if (i0 >= wordsNorm.length) {
      if (lecteurCoran.options.autoContinue && !lecteurCoran.cancel) {
        const nextIdx = indexVersetSuivant(lecteurCoran.idxVerset);
        if (nextIdx >= 0) { lecteurCoran.idxVerset = nextIdx; demarrerLectureVerset(); }
      }
      return;
    }

    const i1 = Math.min(wordsNorm.length, i0 + n);
    const localWords = wordsNorm.slice(i0, i1);
    const localText = localWords.join(' ');
    const localBounds = computeBoundariesFromWords(localWords);

    if (cs.manualTimer) { clearInterval(cs.manualTimer); cs.manualTimer = null; }

    const u = new SpeechSynthesisUtterance(localText);
    u.lang = langTag;
    u.rate = rate;
    const voice = pickVoiceFor(langTag); if (voice) u.voice = voice;

    lecteurCoran.utterance = u;
    cs.gotBoundary = false;

    const startManualTimer = () => {
      let j = 0;
      const base = Math.max(60, (lecteurCoran.options.msParMotBase || 180) / Math.max(0.5, rate));
      cs.manualTimer = setInterval(() => {
        if (lecteurCoran.cancel || lecteurCoran.paused) return;
        if (j >= localWords.length) return;
        const globalIdx = i0 + j;

        if (globalIdx < lecteurCoran.nextToSpeakIdx) { j++; return; } // ⛔

        lecteurCoran.idxMot = globalIdx;
        highlightMot(globalIdx);
        lecteurCoran.nextToSpeakIdx = Math.max(lecteurCoran.nextToSpeakIdx, globalIdx + 1);
        j++;
      }, base);
    };

    u.onstart = () => {
      lecteurCoran.cancel = false;
      lecteurCoran.enCours = true;
      setTimeout(() => {
        if (!cs.gotBoundary && lecteurCoran.mode === "chunk" && !lecteurCoran.paused) {
          startManualTimer();
        }
      }, Math.max(80, 300 / Math.max(0.5, rate)));
    };

    u.onboundary = (e) => {
      cs.gotBoundary = true;
      if (lecteurCoran.cancel) return;
      const ch = e.charIndex ?? 0;
      for (let j = 0; j < localBounds.length; j++) {
        const b = localBounds[j];
        if (ch >= b.start && ch < b.end) {
          const globalIdx = i0 + j;

          // 🛡️ Déduplication boundary locale
          const now = performance.now();
          if (globalIdx === lecteurCoran.lastWordIdx && now - lecteurCoran.lastBoundaryAt < 80) {
            return;
          }
          lecteurCoran.lastWordIdx = globalIdx;
          lecteurCoran.lastBoundaryAt = now;

          if (globalIdx < lecteurCoran.nextToSpeakIdx) return; // ⛔

          lecteurCoran.idxMot = globalIdx;
          highlightMot(globalIdx);
          lecteurCoran.nextToSpeakIdx = Math.max(lecteurCoran.nextToSpeakIdx, globalIdx + 1);
          break;
        }
      }
    };

    u.onend = () => {
      if (cs.manualTimer) { clearInterval(cs.manualTimer); cs.manualTimer = null; }
      cs.nextIndex = i1;
      lecteurCoran.nextToSpeakIdx = Math.max(lecteurCoran.nextToSpeakIdx, i1); // avance la garde
      if (lecteurCoran.cancel) return;
      playNextChunk(); // enchaîne sans délai
    };

    try { window.speechSynthesis.speak(u); } catch (e) { }
  };

  cs.playNextChunk = playNextChunk;
  try { window.speechSynthesis.cancel(); } catch (e) { }
  playNextChunk();
}

/* ====================== Lecture / synchronisation ======================= */
function demarrerLectureVerset() {
  const cur = getTexteSouraAya(lecteurCoran.idxVerset);
  if (!cur || !cur.texte) { lecteurCoran.enCours = false; return; }

  majEntete(cur.soura, cur.aya);

  // État
  lecteurCoran.cancel = false;
  lecteurCoran.paused = false;
  clearBoundaryWatchdog();
  clearTimeout(lecteurCoran.resumeGuard);
  const cs = lecteurCoran.chunkState;
  if (cs && cs.manualTimer) { clearInterval(cs.manualTimer); }
  lecteurCoran.chunkState = null;

  // Ajout du verset (NE PAS effacer les précédents) + REF cliquable
  lecteurCoran.motsDOM = appendVersetAvecRef(lecteurCoran.containerId, cur.texte, cur.soura, cur.aya);
  lecteurCoran.idxMot = -1;
  lecteurCoran.nextToSpeakIdx = 0;  // ✅ nouvelle garde pour ce verset
  lecteurCoran.lastWordIdx = -1;
  lecteurCoran.lastBoundaryAt = 0;

  // Préparation pour la synchro
  const texteNorm = normaliserPourLecture(cur.texte);
  lecteurCoran.wordsNorm = texteNorm.split(' ');
  lecteurCoran.motBoundaries = computeBoundariesFromWords(lecteurCoran.wordsNorm);

  // chunkSize dynamique : nb de mots du verset
  lecteurCoran.options.chunkSize = Math.max(1, lecteurCoran.wordsNorm.length);

  // Annule tout ce qui serait en file
  try { window.speechSynthesis.cancel(); } catch (e) { }

  // Choix du mode
  const langTag = VOICE_LANG_MAP[lecteurCoran.options.langueVoix] || 'ar-SA';
  const rate = Number(lecteurCoran.options.vitesse) || 1.0;

  if (lecteurCoran.options.useBoundary !== false) {
    startBoundaryVerse(lecteurCoran.wordsNorm, langTag, rate, 0);
  } else {
    startChunkVerse(lecteurCoran.wordsNorm, langTag, rate, 0);
  }
}

/* ====================== API publique ======================= */
function litAfficheVerset(numSoura, numAya, numPage, options) {
  lecteurCoran.options = Object.assign({}, lecteurCoran.options, options || {});
  if (lecteurCoran.options.containerId) lecteurCoran.containerId = lecteurCoran.options.containerId;
  if (lecteurCoran.containerId === ZC_ZONE_AFFICHAGE_VERSET_ID) ensureZoneAffichageVerset();

  // Nettoyage UNIQUEMENT au démarrage d'une nouvelle session
  const el = document.getElementById(lecteurCoran.containerId);
  if (el && lecteurCoran.options.resetContainerOnStart !== false) {
    el.innerHTML = '';
  }

  const tab = fTabVersets();
  if (!tab || !tab.length) { console.warn("fTabVersets() est vide."); return; }
  initIndexVersets();

  let idxStart = -1;
  if (Number.isFinite(Number(numSoura)) && Number.isFinite(Number(numAya))) {
    idxStart = trouverIndex(Number(numSoura), Number(numAya));
  } else if (Number.isFinite(Number(numPage))) {
    const { idx } = trouverSouraAyaParPage(Number(numPage)); idxStart = idx;
  } else { idxStart = 0; }

  if (idxStart < 0) { console.warn("Point de départ introuvable, début du corpus."); idxStart = 0; }

  stopLitAfficheVerset(true);
  lecteurCoran.idxVerset = idxStart;
  demarrerLectureVerset();
}
function stopLitAfficheVerset(silencieux = false) {
  lecteurCoran.cancel = true;
  try { window.speechSynthesis.cancel(); } catch (e) { }
  lecteurCoran.enCours = false;
  lecteurCoran.utterance = null;
  clearBoundaryWatchdog();
  clearTimeout(lecteurCoran.resumeGuard);
  const cs = lecteurCoran.chunkState;
  if (cs && cs.manualTimer) { clearInterval(cs.manualTimer); }
  lecteurCoran.chunkState = null;
  if (!silencieux) { /* toast optionnel */ }
}
if (typeof window !== "undefined") window.litAfficheVerset = litAfficheVerset;
window.stopLitAfficheVerset = stopLitAfficheVerset;

/* ===================== Icônes SVG inline (Pause / Play) ===================== */
function svgIcon(name) {
  if (name === 'menu') {
    return '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"></path></svg>';
  }
  if (name === 'pause') {
    return '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"></path></svg>';
  }
  if (name === 'close') {
    return '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"></path></svg>';
  }
  // 'play'
  return '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';
}

/* ===================== Popup Lecteur — styles minimaux ===================== */
(function ensureLecteurStyles() {
  if (document.getElementById('lecteur-style')) return;
  const css = `
  dialog.lecteur-overlay{
    border:none;background:transparent;padding:0;box-sizing:border-box;
    max-width:none;width:100vw;height:100vh;
  }
  dialog.lecteur-overlay::backdrop{background:rgba(0,0,0,.45);}
  .lecteur-overlay.zc-read-fallback{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;}
  .lecteur-modal{
    background:var(--zc-surface,#fff);
    color:var(--zc-text,#0f172a);
    border:1px solid var(--zc-border,#e2e8f0);
    border-radius:16px;
    box-shadow:0 10px 30px rgba(0,0,0,.2);
    width:min(980px, calc(100vw - 24px));
    height:min(920px, calc(100dvh - max(36px, env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px) + 24px)));
    max-width:calc(100vw - 24px);
    max-height:calc(100dvh - max(36px, env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px) + 24px));
    display:flex;
    flex-direction:column;
    overflow:hidden;
  }
  .lecteur-header{display:grid;grid-template-columns:auto 1fr auto;align-items:center;padding:12px 14px;border-bottom:1px solid var(--zc-border,#e2e8f0);gap:10px}
  .lecteur-title{font-weight:700;color:var(--zc-text,#0f172a);display:inline-flex;align-items:center;justify-content:center;gap:.35rem;text-align:center}
  .lecteur-title span,.lecteur-title i{-webkit-text-fill-color:currentColor}
  .lecteur-head-btn{border:none;background:transparent;color:var(--zc-text,#0f172a);padding:6px;cursor:pointer;border-radius:8px;display:inline-flex;align-items:center;justify-content:center}
  .lecteur-head-btn:hover{background:var(--zc-hover-bg,#eef2f7)}
  .lecteur-controls-row{display:none}
  .lecteur-btn{border:1px solid var(--zc-border,#dbe2ea);background:var(--zc-ui-soft-bg,#f8fafc);color:var(--zc-text,#0f172a);border-radius:10px;padding:8px 12px;cursor:pointer;font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:.5rem;line-height:1}
  .lecteur-btn,.lecteur-btn span,.lecteur-btn i{color:var(--zc-text,#0f172a);-webkit-text-fill-color:var(--zc-text,#0f172a)}
  .lecteur-btn:hover{background:var(--zc-hover-bg,#eef2f7)}
  .lecteur-info{padding:8px 12px;text-align:center;font-weight:700;border-bottom:1px solid var(--zc-border,#e2e8f0);font-size:16px;color:var(--zc-text,#0f172a)}
  .lecteur-content{
    flex:1 1 auto;
    min-height:0;
    padding:16px;
    overflow:auto;
    direction:rtl;
    font-size:1.8rem;
    line-height:2.4rem;
    color:var(--zc-text,#0f172a);
    -webkit-text-fill-color:var(--zc-text,#0f172a)
  }
  .ligne-verset{display:block; padding:2px 0;}
  .mot-verset{border-radius:4px;transition:background-color .12s ease,text-decoration-color .12s ease}
  .mot-verset.mot-actif{
    background: color-mix(in srgb, var(--zc-accent,#2563eb) 16%, transparent);
  }
  .ref-aya{direction:ltr; unicode-bidi:isolate; color:var(--zc-popup-link,var(--zc-accent,#2563eb)); text-decoration:none; font-size:.9em; margin:0 .5em; font-weight:700; }
  .ref-aya:hover{text-decoration:underline;}
  .lecteur-btn .icon{display:inline-block;vertical-align:middle;fill:currentColor;width:1em;height:1em}
  body.lecteur-no-scroll{overflow:hidden}
  `;
  const st = document.createElement('style'); st.id = 'lecteur-style'; st.textContent = css; document.head.appendChild(st);
})();

/* ===================== Popup Lecteur — DOM & Contrôles ====================== */
(function setupLecteurPopup() {
  function ensureDOM() {
    let overlay = document.getElementById('lecteurOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('dialog');
    overlay.id = 'lecteurOverlay';
    overlay.className = 'lecteur-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'lecteur-modal';
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'lecteurTitle');

    const header = document.createElement('div'); header.className = 'lecteur-header';
    const title = document.createElement('div');
    title.className = 'lecteur-title';
    title.id = 'lecteurTitle';
    title.innerHTML = '<span>Lis (Voix IA & Lecture)</span>';

    const btnToggle = document.createElement('button');
    btnToggle.id = 'lecteurToggleBtn';
    btnToggle.className = 'lecteur-btn';
    btnToggle.type = 'button';

    const btnClose = document.createElement('button');
    btnClose.id = 'lecteurCloseBtn';
    btnClose.className = 'lecteur-head-btn';
    btnClose.type = 'button';
    btnClose.innerHTML = '<span aria-hidden="true">×</span>';
    btnClose.setAttribute('aria-label', 'Fermer');
    btnClose.title = 'Fermer';

    header.append(btnToggle, title, btnClose);

    const info = document.createElement('div');
    info.id = 'lecteurInfoVerset';
    info.className = 'lecteur-info';
    info.textContent = '';

    const content = document.createElement('div');
    content.id = 'lecteurVersetContent';
    content.className = 'lecteur-content';
    content.setAttribute('dir', 'rtl');

    modal.append(header, info, content);
    overlay.append(modal);
    document.body.appendChild(overlay);

    modal.addEventListener('click', e => e.stopPropagation());

    const refreshToggleBtn = () => {
      const paused = !!lecteurCoran.paused;
      if (paused) {
        btnToggle.innerHTML = svgIcon('play') + '<span>Lire</span>';
        btnToggle.setAttribute('aria-label', 'Continuer la lecture');
        btnToggle.title = 'Continuer la lecture';
      } else {
        btnToggle.innerHTML = svgIcon('pause') + '<span>Pause</span>';
        btnToggle.setAttribute('aria-label', 'Mettre en pause');
        btnToggle.title = 'Mettre en pause';
      }
    };
    refreshToggleBtn();

    btnToggle.addEventListener('click', () => {
      if (lecteurCoran.paused) continuerLecteur();
      else pauseLecteur();
      refreshToggleBtn();
    });
    btnClose.addEventListener('click', closePopup);

    content.addEventListener('click', (e) => {
      const a = e.target.closest('a.ref-aya');
      if (!a) return;
      e.preventDefault();
      const s = Number(a.dataset.soura);
      const y = Number(a.dataset.aya);
      try {
        const c = document.getElementById('lecteurVersetContent');
        if (c) c.innerHTML = '';
      } catch (e) { }
      window.litAfficheVerset && window.litAfficheVerset(
        s, y, undefined,
        {
          containerId: 'lecteurVersetContent',
          resetContainerOnStart: true,
          langueVoix: lecteurCoran.options.langueVoix,
          vitesse: lecteurCoran.options.vitesse,
          useBoundary: lecteurCoran.options.useBoundary,
          autoContinue: lecteurCoran.options.autoContinue
        }
      );
    });

    // pas de barre d'espace ici pour éviter les ambiguïtés
    window.refreshLecteurToggleBtn = refreshToggleBtn;
    return overlay;
  }

  function openPopup() {
    const overlay = ensureDOM();
    try { overlay.style.display = ''; } catch (_) { }
    try { overlay.classList.remove('zc-read-fallback'); } catch (_) { }
    let opened = false;
    try {
      if (typeof overlay.showModal === 'function') {
        overlay.showModal();
        opened = true;
      }
    } catch (_) { }
    if (!opened) {
      overlay.classList.add('zc-read-fallback');
      overlay.style.zIndex = String(zcDynamicTopZGhamidi());
      overlay.style.display = 'flex';
      try { overlay.setAttribute('open', ''); } catch (_) { }
    }
    try { overlay.style.zIndex = String(zcDynamicTopZGhamidi()); } catch (_) { }
    document.body.classList.add('lecteur-no-scroll');
    try { if (typeof window.refreshLecteurToggleBtn === 'function') window.refreshLecteurToggleBtn(); } catch (_) { }
  }

  function closePopup() {
    try { window.stopLitAfficheVerset && window.stopLitAfficheVerset(true); } catch (e) { }
    try { window.speechSynthesis.cancel(); } catch (e) { }
    const overlay = document.getElementById('lecteurOverlay');
    if (overlay) {
      try {
        if (overlay.tagName === 'DIALOG' && typeof overlay.close === 'function' && overlay.open) {
          overlay.close();
        }
      } catch (_) { }
      try {
        if (overlay.tagName !== 'DIALOG' || !overlay.open) {
          overlay.style.display = 'none';
        } else {
          overlay.style.display = '';
        }
      } catch (_) { }
    }
    document.body.classList.remove('lecteur-no-scroll');
    lecteurCoran.paused = false;
    try { if (typeof window.refreshLecteurToggleBtn === 'function') window.refreshLecteurToggleBtn(); } catch (_) { }
  }

  function lireCoranPopup(numSoura, numAya, numPage, options) {
    openPopup();
    const opts = Object.assign({}, options || {}, { containerId: 'lecteurVersetContent' });
    window.litAfficheVerset && window.litAfficheVerset(numSoura, numAya, numPage, opts);
  }

  // Expose
  window.lireCoranPopup = lireCoranPopup;
  window.closeLecteurPopup = closePopup;
})();

/* ===================== Contrôles Pause / Continuer ====================== */
function pauseLecteur() {
  if (!('speechSynthesis' in window)) return;
  lecteurCoran.paused = true;
  try { window.speechSynthesis.pause(); } catch (e) { }
  const cs = lecteurCoran.chunkState;
  if (cs && cs.manualTimer) { clearInterval(cs.manualTimer); cs.manualTimer = null; }
  try { if (typeof window.refreshLecteurToggleBtn === 'function') window.refreshLecteurToggleBtn(); } catch (_) { }
}
function continuerLecteur() {
  if (!('speechSynthesis' in window)) return;
  const langTag = VOICE_LANG_MAP[lecteurCoran.options.langueVoix] || 'ar-SA';
  const rate = Number(lecteurCoran.options.vitesse) || 1.0;

  lecteurCoran.paused = false;
  try { if (typeof window.refreshLecteurToggleBtn === 'function') window.refreshLecteurToggleBtn(); } catch (_) { }

  // point de reprise = au moins nextToSpeakIdx
  let startI = Math.max(0, (Number(lecteurCoran.idxMot) || -1) + 1);
  startI = Math.max(startI, lecteurCoran.nextToSpeakIdx);

  if (startI >= lecteurCoran.wordsNorm.length) {
    if (lecteurCoran.options.autoContinue) {
      const nextIdx = indexVersetSuivant(lecteurCoran.idxVerset);
      if (nextIdx >= 0) {
        lecteurCoran.idxVerset = nextIdx;
        demarrerLectureVerset();
      }
    }
    return;
  }

  try { window.speechSynthesis.cancel(); } catch (e) { }

  // Reprise en CHUNK pour robustesse
  startChunkVerse(lecteurCoran.wordsNorm, langTag, rate, startI);
}

// Expose global si besoin
window.pauseLecteur = pauseLecteur;
window.continuerLecteur = continuerLecteur;

/* ===================== lireWarsh(): input #mot ====================== */
function lireWarsh() {
  const norm = (x) => {
    const s = String(x ?? "").trim()
      .replace(/[٠-٩]/g, ch => "٠١٢٣٤٥٦٧٨٩".indexOf(ch))
      .replace(/[۰-۹]/g, ch => "۰۱۲۳۴۵۶۷۸۹".indexOf(ch))
      .replace(/\u066B/g, ".").replace(/,/g, ".")
      .replace(/\u066C/g, "")
      .replace(/[^\d.]/g, "")
      .replace(/\.+/g, ".");
    return s;
  };
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const callByPage = (p) => {
    const page = clamp(parseInt(p, 10) || (Number(window.numPage) || 1), 1, 604);
    const lang = (window.lecteurCoran?.options?.langueVoix) || "ar";
    const rate = (window.lecteurCoran?.options?.vitesse) || 1.0;
    if (typeof window.lireCoranPopup === "function") {
      window.lireCoranPopup(undefined, undefined, page, {
        langueVoix: lang,
        vitesse: rate,
        useBoundary: (window.lecteurCoran?.options?.useBoundary) !== false
      });
    } else {
      console.warn("lireCoranPopup introuvable.");
    }
  };
  const callBySouraAya = (s, a) => {
    const soura = clamp(parseInt(s, 10) || (Number(window.numSourat) || 1), 1, 114);
    let aya = parseInt(a, 10);
    if (!Number.isFinite(aya) || aya < 1) aya = 1;
    try {
      if (typeof nbVers === "function") {
        const maxAya = parseInt(norm(nbVers(soura)), 10);
        if (Number.isFinite(maxAya) && maxAya > 0) aya = clamp(aya, 1, maxAya);
      }
    } catch (_) { }
    const lang = (window.lecteurCoran?.options?.langueVoix) || "ar";
    const rate = (window.lecteurCoran?.options?.vitesse) || 1.0;
    if (typeof window.lireCoranPopup === "function") {
      window.lireCoranPopup(soura, aya, undefined, {
        langueVoix: lang,
        vitesse: rate,
        useBoundary: (window.lecteurCoran?.options?.useBoundary) !== false,
        resetContainerOnStart: true
      });
    } else {
      console.warn("lireCoranPopup introuvable.");
    }
  };

  const el = document.getElementById("mot");
  const raw = el ? el.value : "";
  const v = norm(raw);

  if (/^\d+$/.test(v)) {
    return callByPage(v);
  }
  if (/^\d+\.\d+$/.test(v)) {
    const [s, a] = v.split(".");
    return callBySouraAya(s, a);
  }
  return callByPage(Number(window.numPage) || 1);
}

window.lireWarsh = lireWarsh;
