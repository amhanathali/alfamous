// escapeHtml / shortenLabel : fournis globalement par jsZC/zc-utils.js (chargé avant ce fichier).




(function initSuggestionHandlers() {
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }

  onReady(() => {
    const $ = id => document.getElementById(id);
    const inputMot = $('mot');
    const txtCom = $('commentaires');

    const callHandleMot = () => {
      if (!inputMot) return;
      const fn = window.handleMotInput;
      if (typeof fn === 'function') fn(inputMot.value);
    };
    const callHandleCom = () => {
      const fn = window.handleCommentaireInput;
      if (typeof fn === 'function') fn();
    };

    if (inputMot) {
      inputMot.addEventListener('input', callHandleMot);
      inputMot.addEventListener('focus', callHandleMot);
      inputMot.addEventListener('change', callHandleMot);
      inputMot.addEventListener('click', callHandleMot);
      // paste déclenche avant que .value ne soit mis à jour → décale d’un tick
      inputMot.addEventListener('paste', () => setTimeout(callHandleMot, 0));
    }

    if (txtCom) {
      txtCom.addEventListener('input', callHandleCom);
    }
  });
})();

//<script>
/* Effets visuels éphémères — v2 (Shadow DOM, cleanup, reduced-motion OK)
   API:
     effetVisuel(type, opts) -> Promise
     jouerEffetMois(mois?:1..12, optsSup?:{}) -> Promise
   Presets: "neige","fleur","confettis","feuilles","sakura","bulles","pluie","étoiles_filantes","feu_artifice","coeurs"
*/
(function () {
  function prefersReduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function createHost(zIndex) {
    const host = document.createElement('div');
    host.style.cssText = `position:fixed; inset:0; pointer-events:none; z-index:${zIndex};`;
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      .overlay{position:fixed; inset:0; pointer-events:none; width:100%; height:100%}
      .fadeout{ animation: fadeOut .45s ease forwards }
      @keyframes fadeOut{ to{ opacity:0 } }

      /* Bases génériques réutilisées */
      @keyframes fall{ to { transform: translate3d(0,110vh,0); } }
      @keyframes rise{ to { transform: translate3d(0,-110vh,0); } }
      @keyframes sway{ 0%,100%{ margin-left:0 } 50%{ margin-left: var(--amp, 26px); } }
      @keyframes spin{ to { rotate: 360deg; } }
      @keyframes meteor{ to { transform: translate3d(40vw,40vh,0); opacity:0 } }

      /* NEIGE */
      .flake{
        position:absolute; top:-10vh; border-radius:50%;
        opacity: var(--o,.9);
        width: var(--sz,10px); height: var(--sz,10px);
        background: radial-gradient(circle at 35% 35%, rgba(255,255,255,.95), rgba(255,255,255,.6) 40%, rgba(255,255,255,0) 70%);
        box-shadow: 0 0 8px rgba(255,255,255,.55);
        animation: fall var(--dur,6s) linear var(--delay,0s) forwards, sway calc(var(--dur,6s)*1.1) ease-in-out var(--delay,0s) infinite, spin calc(var(--dur,6s)*.8) linear var(--delay,0s) infinite;
      }

      /* FLEUR (éclosion centrée) */
      .flower-wrap{ position:absolute; left:50%; top:50%; transform: translate(-50%,-50%); filter: drop-shadow(0 6px 10px rgba(0,0,0,.25)); }
      .petal{
        position:absolute; left:50%; top:50%;
        width: var(--pw, 46px); height: var(--ph, 120px);
        transform-origin: 50% 90%;
        transform: translate(-50%,-92%) rotate(var(--a)) scale(0.001);
        border-radius: 50% 50% 45% 45%/65% 65% 40% 40%;
        background:
          radial-gradient(circle at 50% 25%, rgba(255,255,255,.85), rgba(255,255,255,0) 60%),
          linear-gradient(to bottom, var(--c1,#ff62b0), var(--c2,#ffd166));
        animation: bloom var(--bdur,900ms) cubic-bezier(.15,.85,.25,1) var(--bdelay,0ms) forwards;
      }
      .center{
        position:absolute; left:50%; top:50%; width:64px; height:64px; transform: translate(-50%,-50%) scale(.001);
        border-radius:50%; background: radial-gradient(circle, #ffd749 0%, #ffb703 50%, #e48900 100%);
        box-shadow: inset 0 -6px 12px rgba(0,0,0,.15), 0 0 18px rgba(255,215,73,.55);
        animation: popCenter var(--bdur,900ms) cubic-bezier(.15,.85,.25,1) calc(var(--bdelay,0ms) + 120ms) forwards;
      }
      .glow{ position:absolute; left:50%; top:50%; width:200px; height:200px; transform: translate(-50%,-50%); border-radius:50%;
        background: radial-gradient(circle, rgba(255,226,140,.55), rgba(255,226,140,0) 70%); opacity:0; animation: glowIn 900ms ease forwards 100ms; }
      @keyframes bloom{ 0%{scale:.001} 60%{scale:1.08} 100%{scale:1} }
      @keyframes popCenter{ 0%{scale:.001} 70%{scale:1.15} 100%{scale:1} }
      @keyframes glowIn{ from{opacity:0} to{opacity:1} }

      /* CONFETTIS */
      .confetti{
        position:absolute; top:-8vh; width: var(--w,10px); height: var(--h,14px); background: var(--c,#ffd166);
        border-radius: var(--br,2px); opacity:.95;
        transform: translate3d(0,0,0) rotate(0deg);
        animation: fall var(--dur,5.5s) linear var(--delay,0s) forwards, sway calc(var(--dur,5.5s)*.9) ease-in-out var(--delay,0s) infinite, spin calc(var(--dur,5.5s)*.6) ease-in-out var(--delay,0s) infinite;
      }

      /* FEUILLES */
      .leaf{
        position:absolute; top:-10vh; width: var(--w,18px); height: var(--h,12px);
        background: linear-gradient(135deg, var(--c1,#8bc34a), var(--c2,#5a7b2d));
        border-radius: 50% 10% 50% 10%/60% 40% 60% 40%;
        box-shadow: inset 0 0 4px rgba(0,0,0,.15);
        rotate: var(--rot, 20deg);
        animation: fall var(--dur,6.5s) linear var(--delay,0s) forwards, sway calc(var(--dur,6.5s)*1) ease-in-out var(--delay,0s) infinite, spin calc(var(--dur,6.5s)*.7) linear var(--delay,0s) infinite;
      }

      /* SAKURA (pétales flottants) */
      .petal-fall{
        position:absolute; top:-10vh; width: var(--w,16px); height: var(--h,10px);
        background: radial-gradient(circle at 50% 35%, #fff8, transparent 60%), linear-gradient(to bottom, var(--c1,#ffbcd1), var(--c2,#ffa3c7));
        border-radius: 60% 40% 60% 40%/70% 70% 40% 40%;
        rotate: var(--rot, 10deg);
        box-shadow: 0 0 6px rgba(255,182,193,.35);
        animation: fall var(--dur,6s) linear var(--delay,0s) forwards, sway calc(var(--dur,6s)*1.2) ease-in-out var(--delay,0s) infinite, spin calc(var(--dur,6s)*.8) linear var(--delay,0s) infinite;
      }

      /* BULLES (qui montent) */
      .bubble{
        position:absolute; bottom:-10vh; width: var(--sz,12px); height: var(--sz,12px); border-radius:50%;
        background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.8), rgba(255,255,255,.1) 60%, rgba(255,255,255,0) 70%);
        border: 1px solid rgba(255,255,255,.35);
        animation: rise var(--dur,6s) linear var(--delay,0s) forwards, sway calc(var(--dur,6s)*.9) ease-in-out var(--delay,0s) infinite;
        opacity: .9;
      }

      /* PLUIE */
      .drop{
        position:absolute; top:-12vh; width:2px; height: var(--h,14px);
        background: linear-gradient(to bottom, rgba(255,255,255,.75), rgba(255,255,255,.2));
        border-radius: 1px;
        animation: fall var(--dur,1.8s) linear var(--delay,0s) forwards;
      }

      /* ÉTOILES FILANTES */
      .meteor{
        position:absolute; width: var(--len,120px); height:2px;
        background: linear-gradient(90deg, var(--c,#fff), transparent);
        opacity: .9; transform: translate3d(0,0,0) rotate(var(--ang,315deg));
        animation: meteor var(--dur,1.2s) linear var(--delay,0s) forwards;
        filter: drop-shadow(0 0 6px var(--c,#fff));
      }

      /* FEU D'ARTIFICE */
      .burst{ position:absolute; width:0; height:0; left: var(--x,50%); top: var(--y,50%); }
      .spark{
        position:absolute; left:0; top:0; width:6px; height:6px; border-radius:50%;
        background: var(--c,#ffd166); box-shadow: 0 0 8px var(--c,#ffd166);
        transform: translate(-50%,-50%);
        animation: spark var(--dur,900ms) cubic-bezier(.2,.8,.2,1) var(--delay,0ms) forwards;
      }
      @keyframes spark{ to{ transform: translate(var(--tx,0), var(--ty,0)); opacity: 0 } }

      /* COEURS (qui s'envolent) */
      .heart{
        position:absolute; bottom:-6vh; width: var(--s,16px); height: var(--s,16px); transform: rotate(-45deg);
        background: var(--c,#ff5a7a); opacity:.95; animation: rise var(--dur,4.5s) linear var(--delay,0s) forwards, sway calc(var(--dur,4.5s)*.8) ease-in-out var(--delay,0s) infinite;
      }
      .heart::before, .heart::after{
        content:""; position:absolute; width: var(--s,16px); height: var(--s,16px); border-radius:50%; background: var(--c,#ff5a7a);
      }
      .heart::before{ top:-50%; left:0 }
      .heart::after{ left:50%; top:0 }
    `;
    shadow.appendChild(style);
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    shadow.appendChild(overlay);
    return { host, shadow, overlay };
  }

  function cleanupLater(host, durationMs) {
    return new Promise(res => {
      const kill = () => { host.classList.add('fadeout'); setTimeout(() => { host.remove(); res(); }, 480); };
      setTimeout(kill, Math.max(300, durationMs));
    });
  }

  function effetVisuel(type = "neige", opts = {}) {
    const {
      durationMs = 4000,
      zIndex: zIndexOpt = null,
      container = document.body,
      colors = undefined,
      count = undefined,
    } = opts;
    const zIndex =
      zIndexOpt != null
        ? zIndexOpt
        : typeof window.getNextZIndex === "function"
          ? window.getNextZIndex()
          : 20;

    if (prefersReduced()) {
      const flash = document.createElement('div');
      flash.style.cssText = `position:fixed; inset:0; pointer-events:none; z-index:${zIndex}; background: rgba(255,255,255,0.35); animation: fadeFlash 600ms ease forwards;`;
      const s = document.createElement('style'); s.textContent = `@keyframes fadeFlash{from{opacity:.8}to{opacity:0}}`;
      flash.appendChild(s); container.appendChild(flash);
      return new Promise(r => setTimeout(() => { flash.remove(); r(); }, 650));
    }

    const { host, overlay } = createHost(zIndex);
    container.appendChild(host);

    // ------- Génération par preset -------
    const W = innerWidth, H = innerHeight;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

    const palettes = {
      confetti: colors || ['#ff5aa5', '#ffd166', '#3ddc97', '#6ec1ff', '#ffd3e1', '#b388ff'],
      leaves_autumn: colors || ['#b86b32', '#e07a5f', '#8d5524', '#d4a373', '#6a994e'],
      sakura: colors || ['#ffbcd1', '#ffa3c7', '#ffd6e5', '#fff1f5'],
      bubbles: colors || ['#ffffff'],
      rain: colors || ['#cfe8ff', '#e6f3ff'],
      meteors: colors || ['#fff', '#9dd7ff', '#ffd166'],
      fireworks: colors || ['#fff', '#ffd700', '#7df', '#ff6b6b', '#a0ff7d'],
      hearts: colors || ['#ff4d6d', '#ff758f', '#ff8fa3'],
      snow: colors || ['#ffffff'],
      flower: colors || ['#ff62b0', '#ffd166']
    };

    switch (type) {
      case 'neige': {
        const n = count ?? 90;
        for (let i = 0; i < n; i++) {
          const el = document.createElement('div');
          el.className = 'flake';
          const sz = rnd(4, 14).toFixed(1) + 'px';
          el.style.setProperty('--sz', sz);
          el.style.left = rnd(0, 100).toFixed(2) + 'vw';
          el.style.setProperty('--dur', (5 + Math.random() * 4).toFixed(2) + 's');
          el.style.setProperty('--delay', (Math.random() * 1.2).toFixed(2) + 's');
          el.style.setProperty('--amp', (10 + Math.random() * 36).toFixed(1) + 'px');
          el.style.setProperty('--o', (0.55 + Math.random() * 0.45).toFixed(2));
          if (palettes.snow[0] !== '#ffffff') {
            const c = palettes.snow[0];
            el.style.background = `radial-gradient(circle at 35% 35%, ${c}, ${c}99 40%, transparent 70%)`;
            el.style.boxShadow = `0 0 8px ${c}66`;
          }
          overlay.appendChild(el);
        }
        break;
      }
      case 'fleur': {
        const wrap = document.createElement('div'); wrap.className = 'flower-wrap'; overlay.appendChild(wrap);
        const petals = 12, c1 = palettes.flower[0], c2 = palettes.flower[1] || c1;
        for (let i = 0; i < petals; i++) {
          const p = document.createElement('div'); p.className = 'petal';
          p.style.setProperty('--a', (360 / petals) * i + 'deg');
          p.style.setProperty('--c1', c1); p.style.setProperty('--c2', c2);
          p.style.setProperty('--bdelay', (60 * i + 60) + 'ms');
          wrap.appendChild(p);
        }
        const glow = document.createElement('div'); glow.className = 'glow'; wrap.appendChild(glow);
        const center = document.createElement('div'); center.className = 'center'; wrap.appendChild(center);
        break;
      }
      case 'confettis': {
        const n = count ?? 160;
        for (let i = 0; i < n; i++) {
          const el = document.createElement('div'); el.className = 'confetti';
          el.style.left = rnd(0, 100).toFixed(2) + 'vw';
          el.style.setProperty('--dur', (4.5 + Math.random() * 3).toFixed(2) + 's');
          el.style.setProperty('--delay', (Math.random() * 0.8).toFixed(2) + 's');
          el.style.setProperty('--w', rnd(6, 12).toFixed(1) + 'px');
          el.style.setProperty('--h', rnd(8, 18).toFixed(1) + 'px');
          el.style.setProperty('--br', Math.random() > .5 ? '2px' : '50%');
          el.style.background = pick(palettes.confetti);
          el.style.setProperty('--amp', rnd(10, 40).toFixed(1) + 'px');
          overlay.appendChild(el);
        }
        break;
      }
      case 'feuilles': {
        const n = count ?? 60;
        for (let i = 0; i < n; i++) {
          const el = document.createElement('div'); el.className = 'leaf';
          el.style.left = rnd(0, 100).toFixed(2) + 'vw';
          el.style.setProperty('--dur', (5.5 + Math.random() * 4).toFixed(2) + 's');
          el.style.setProperty('--delay', (Math.random() * 1.0).toFixed(2) + 's');
          el.style.setProperty('--w', rnd(16, 26).toFixed(1) + 'px');
          el.style.setProperty('--h', rnd(10, 18).toFixed(1) + 'px');
          el.style.setProperty('--rot', rnd(-40, 40).toFixed(1) + 'deg');
          const c1 = pick(palettes.leaves_autumn), c2 = pick(palettes.leaves_autumn);
          el.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
          el.style.setProperty('--amp', rnd(16, 42).toFixed(1) + 'px');
          overlay.appendChild(el);
        }
        break;
      }
      case 'sakura': {
        const n = count ?? 70;
        for (let i = 0; i < n; i++) {
          const el = document.createElement('div'); el.className = 'petal-fall';
          el.style.left = rnd(0, 100).toFixed(2) + 'vw';
          el.style.setProperty('--dur', (5.2 + Math.random() * 3).toFixed(2) + 's');
          el.style.setProperty('--delay', (Math.random() * 1.0).toFixed(2) + 's');
          el.style.setProperty('--w', rnd(12, 20).toFixed(1) + 'px');
          el.style.setProperty('--h', rnd(8, 14).toFixed(1) + 'px');
          el.style.setProperty('--rot', rnd(-20, 20).toFixed(1) + 'deg');
          const c1 = pick(palettes.sakura), c2 = pick(palettes.sakura);
          el.style.background = `radial-gradient(circle at 50% 35%, #fff8, transparent 60%), linear-gradient(to bottom, ${c1}, ${c2})`;
          el.style.setProperty('--amp', rnd(14, 36).toFixed(1) + 'px');
          overlay.appendChild(el);
        }
        break;
      }
      case 'bulles': {
        const n = count ?? 80;
        for (let i = 0; i < n; i++) {
          const el = document.createElement('div'); el.className = 'bubble';
          el.style.left = rnd(0, 100).toFixed(2) + 'vw';
          el.style.setProperty('--dur', (5 + Math.random() * 3).toFixed(2) + 's');
          el.style.setProperty('--delay', (Math.random() * 1.2).toFixed(2) + 's');
          el.style.setProperty('--sz', rnd(8, 18).toFixed(1) + 'px');
          el.style.setProperty('--amp', rnd(10, 26).toFixed(1) + 'px');
          overlay.appendChild(el);
        }
        break;
      }
      case 'pluie': {
        const n = count ?? 220;
        for (let i = 0; i < n; i++) {
          const el = document.createElement('div'); el.className = 'drop';
          el.style.left = rnd(0, 100).toFixed(2) + 'vw';
          el.style.setProperty('--dur', (1.3 + Math.random() * 0.9).toFixed(2) + 's');
          el.style.setProperty('--delay', (Math.random() * 0.8).toFixed(2) + 's');
          el.style.setProperty('--h', rnd(10, 18).toFixed(1) + 'px');
          overlay.appendChild(el);
        }
        break;
      }
      case 'étoiles_filantes': {
        const n = count ?? 10;
        for (let i = 0; i < n; i++) {
          const el = document.createElement('div'); el.className = 'meteor';
          el.style.left = rnd(-10, 50).toFixed(2) + 'vw';
          el.style.top = rnd(-10, 40).toFixed(2) + 'vh';
          el.style.setProperty('--len', rnd(100, 180).toFixed(1) + 'px');
          el.style.setProperty('--ang', (315 + rnd(-8, 8)).toFixed(1) + 'deg');
          el.style.setProperty('--dur', (0.9 + Math.random() * 0.7).toFixed(2) + 's');
          el.style.setProperty('--delay', (Math.random() * 1.2).toFixed(2) + 's');
          el.style.setProperty('--c', pick(palettes.meteors));
          overlay.appendChild(el);
        }
        break;
      }
      case 'feu_artifice': {
        const bursts = opts.bursts ?? 5;
        const radius = opts.radius ?? [120, 200];
        for (let b = 0; b < bursts; b++) {
          const burst = document.createElement('div'); burst.className = 'burst';
          const x = rnd(15, 85).toFixed(1) + '%'; const y = rnd(15, 70).toFixed(1) + '%';
          burst.style.setProperty('--x', x); burst.style.setProperty('--y', y);
          const sparks = 26;
          for (let k = 0; k < sparks; k++) {
            const sp = document.createElement('div'); sp.className = 'spark';
            const ang = (Math.PI * 2 / sparks) * k; const r = rnd(radius[0], radius[1]);
            sp.style.setProperty('--tx', Math.cos(ang) * r + 'px');
            sp.style.setProperty('--ty', Math.sin(ang) * r + 'px');
            sp.style.setProperty('--dur', (700 + Math.random() * 400) + 'ms');
            sp.style.setProperty('--delay', (b * 220 + Math.random() * 120) + 'ms');
            sp.style.setProperty('--c', pick(palettes.fireworks));
            burst.appendChild(sp);
          }
          overlay.appendChild(burst);
        }
        break;
      }
      case 'coeurs': {
        const n = count ?? 40;
        for (let i = 0; i < n; i++) {
          const el = document.createElement('div'); el.className = 'heart';
          el.style.left = rnd(8, 92).toFixed(2) + 'vw';
          el.style.setProperty('--s', rnd(12, 22).toFixed(1) + 'px');
          el.style.setProperty('--dur', (3.6 + Math.random() * 2).toFixed(2) + 's');
          el.style.setProperty('--delay', (Math.random() * 0.9).toFixed(2) + 's');
          el.style.setProperty('--amp', rnd(10, 30).toFixed(1) + 'px');
          el.style.setProperty('--c', pick(palettes.hearts));
          overlay.appendChild(el);
        }
        break;
      }
      default: {
        // fallback : rien
      }
    }

    return cleanupLater(host, durationMs);
  }

  // --- Mapping 12 mois -> effet + options/palette ---
  const MONTH_EFFECTS = {
    1: { type: 'neige', opts: { count: 120, colors: ['#ffffff'] } },                             // Jan
    2: { type: 'coeurs', opts: { count: 42, colors: ['#ff4d6d', '#ff758f', '#ff8fa3'] } },         // Fév
    3: { type: 'sakura', opts: { count: 80, colors: ['#ffbcd1', '#ffa3c7', '#ffd6e5'] } },         // Mar
    4: { type: 'pluie', opts: { count: 260, colors: ['#cfe8ff', '#e6f3ff'] } },                   // Avr
    5: { type: 'fleur', opts: { colors: ['#79e27f', '#ffd166'] } },                               // Mai
    6: { type: 'bulles', opts: { count: 90 } },                                                  // Juin
    7: { type: 'feu_artifice', opts: { bursts: 5, radius: [120, 200], colors: ['#fff', '#ffd700', '#7df'] } }, // Juil
    8: { type: 'étoiles_filantes', opts: { count: 12, colors: ['#fff', '#9dd7ff', '#ffd166'] } },            // Aoû
    9: { type: 'feuilles', opts: { count: 70, colors: ['#b86b32', '#e07a5f', '#d4a373', '#6a994e'] } }, // Sep
    10: { type: 'confettis', opts: { count: 170, colors: ['#ff6b6b', '#ffa600', '#6a0dad', '#111'] } },  // Oct
    11: { type: 'feuilles', opts: { count: 60, colors: ['#8d5524', '#b86b32', '#a47148', '#6b4423'] } }, // Nov
    12: { type: 'neige', opts: { count: 140, colors: ['#ffffff', '#cfe8ff'] } }                    // Déc
  };

  async function jouerEffetMois(mois, optsSup = {}) {
    const d = new Date(); const m = mois ?? (d.getMonth() + 1); // 1..12
    const conf = MONTH_EFFECTS[m] || MONTH_EFFECTS[1];
    const merged = Object.assign({ durationMs: 4200 }, conf.opts || {}, optsSup || {});
    return effetVisuel(conf.type, merged);
  }

  // expose
  window.effetVisuel = window.effetVisuel || effetVisuel; // si déjà défini ailleurs, on le remplace uniquement si absent
  // (on remplace pour bénéficier des nouveaux presets; si tu veux forcer, commente la ligne ci-dessus et décommente celle-ci:)
  window.effetVisuel = effetVisuel;
  window.jouerEffetMois = jouerEffetMois;
})();
//</script>
//jouerEffetMois();














/* safeInit.js — pare-feu de démarrage, zéro intrusion dans ton code existant */
(function () {
  // ===== 1) DOM Ready Promise
  const domReady = new Promise((resolve) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    } else {
      resolve();
    }
  });
  window.domReady = window.domReady || domReady;

  // ===== 2) Contrat z-index : source de vérité unique (z-index-stack.js)
  // Aucun fallback local ici : les fenêtres applicatives doivent passer
  // uniquement par le manager central.

  // ===== 3) Attente db (Firebase) — utilitaire optionnel (non intrusif)
  window.whenDbReady = window.whenDbReady || function (fn) {
    const ok = () =>
      window.firebase && firebase.apps && firebase.apps.length && window.db;
    if (typeof fn !== "function") return;
    if (ok()) return fn();
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (ok()) {
        clearInterval(timer);
        try {
          fn();
        } catch (_) { }
      }
      if (tries > 200) clearInterval(timer);
    }, 50);
  };

  // ===== 4) Dédoublonnage d’IDs (en ignorant certaines zones)
  const NO_DEDUPE_ROOTS = ["options2_clone", "contenuLocal"]; // popup Warsh & zone locale

  function noDedupeSelector() {
    return NO_DEDUPE_ROOTS.map((id) => "#" + id).join(",");
  }

  function isInsideNoDedupe(node) {
    try {
      if (!(node instanceof Element)) return false;
      if (NO_DEDUPE_ROOTS.includes(node.id)) return true;
      const sel = noDedupeSelector();
      if (!sel) return false;
      return !!node.closest(sel);
    } catch (_) {
      return false;
    }
  }

  function uniqueId(base, salt = "") {
    const rnd = Math.random().toString(36).slice(2, 8);
    return `${base}__dup_${salt || Date.now().toString(36)}_${rnd}`;
  }

  // Déduplique immédiatement (au premier paint) — en respectant NO_DEDUPE_ROOTS
  function buildIdIndex(root = document) {
    const seen = new Map();
    (root.querySelectorAll ? root.querySelectorAll("[id]") : []).forEach(
      (el) => {
        if (isInsideNoDedupe(el)) return; // ignore dans la popup
        const id = el.id;
        if (!seen.has(id)) {
          seen.set(id, el);
        } else if (seen.get(id) !== el) {
          el.id = uniqueId(id);
        }
      }
    );
    return seen;
  }
  domReady.then(() => buildIdIndex());

  // ===== 5) Observer unique (version patchée)
  let mo = null;
  function createObserver() {
    return new MutationObserver((mutations) => {
      const toCheck = [];
      mutations.forEach((m) => {
        m.addedNodes &&
          Array.prototype.forEach.call(m.addedNodes, (node) => {
            if (!(node instanceof Element)) return;
            if (isInsideNoDedupe(node)) return; // ignore la popup Warsh

            if (node.id) toCheck.push(node);
            node.querySelectorAll &&
              node.querySelectorAll("[id]").forEach((el) => {
                if (!isInsideNoDedupe(el)) toCheck.push(el);
              });
          });
      });
      if (!toCheck.length) return;

      // On construit l'index des IDs existants hors toCheck + hors NO_DEDUPE_ROOTS
      const seen = new Map();
      const toCheckSet = new Set(toCheck);

      document.querySelectorAll("[id]").forEach((el) => {
        if (isInsideNoDedupe(el)) return;
        if (toCheckSet.has(el)) return; // on laisse toCheck gérer ses propres doublons
        const id = el.id;
        if (!seen.has(id)) seen.set(id, el);
      });

      // On gère maintenant les nouveaux éléments / éléments ajoutés
      toCheck.forEach((el) => {
        if (!el.id) return;
        const id = el.id;
        if (!seen.has(id)) {
          seen.set(id, el);
        } else if (seen.get(id) !== el) {
          el.id = uniqueId(id);
        }
      });
    });
  }

  domReady.then(() => {
    try {
      mo = createObserver();
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {
      /* ignore */
    }
  });

  // ===== 6) Petit filet de sécurité: journalise les erreurs "null.style" etc.
  window.addEventListener("error", (e) => {
    const msg = (e && e.message) || "";
    if (
      /Cannot read properties of null|of undefined|addEventListener/.test(msg)
    ) {
      console.warn("[safeInit] Erreur détectée:", msg);
    }
  });

  // ===== 7) Sécuriser forum.loadMessages() sans toucher forum.js
  (function patchForumLoadMessages() {
    function ensureForumContainer() {
      let el = document.getElementById("messagesContainerForum");
      if (!el) {
        const host = document.getElementById("contenuLocal") || document.body;
        el = document.createElement("div");
        el.id = "messagesContainerForum";
        host.appendChild(el);
      }
      return el;
    }
    function tryWrap() {
      if (window.__loadMessagesPatched) return;
      if (typeof window.loadMessages !== "function") return;

      const orig = window.loadMessages;
      window.loadMessages = function (...args) {
        ensureForumContainer(); // évite .style sur null
        try {
          return orig.apply(this, args);
        } catch (e) {
          console.warn("[safeInit] loadMessages wrapper:", e);
        }
      };
      window.__loadMessagesPatched = true;
    }
    const t = setInterval(tryWrap, 50);
    setTimeout(() => clearInterval(t), 8000);
  })();

  // ===== 8) Permissions d'iframes : retirer 'allowfullscreen' avant de fixer 'allow'
  (function blessIframesPermissions() {
    function fixIframe(el) {
      try {
        if (!el || el.tagName !== "IFRAME") return;

        // 1) Supprimer d'abord l'attribut legacy pour éviter le warning
        if (el.hasAttribute("allowfullscreen")) {
          el.removeAttribute("allowfullscreen");
        }

        // 2) Normaliser/compléter l'attribut moderne 'allow'
        const desired = [
          "fullscreen",
          "autoplay",
          "encrypted-media",
          "picture-in-picture",
        ];
        const cur = (el.getAttribute("allow") || "")
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => s.toLowerCase());
        const set = new Set(cur);
        desired.forEach((t) => set.add(t));
        const next = Array.from(set).join("; ");
        if (next !== (el.getAttribute("allow") || "")) {
          el.setAttribute("allow", next);
        }
      } catch (_) { }
    }

    // Traite les iframes déjà présentes
    domReady.then(() =>
      document.querySelectorAll("iframe").forEach(fixIframe)
    );

    // Surveille ajouts d'iframes ET changements d'attributs (allow / allowfullscreen)
    const obs = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type === "childList") {
          m.addedNodes &&
            Array.prototype.forEach.call(m.addedNodes, (n) => {
              if (n.tagName === "IFRAME") fixIframe(n);
              n.querySelectorAll &&
                n.querySelectorAll("iframe").forEach(fixIframe);
            });
        } else if (
          m.type === "attributes" &&
          m.target &&
          m.target.tagName === "IFRAME"
        ) {
          // Si un autre script modifie 'allow' ou réajoute 'allowfullscreen', on recorrige
          fixIframe(m.target);
        }
      });
    });
    try {
      obs.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["allow", "allowfullscreen"],
      });
    } catch (_) { }
  })();

  if (typeof jouerEffetMois === "function") {
    try {
      jouerEffetMois();
    } catch (e) {
      console.warn("[safeInit] jouerEffetMois() a échoué:", e);
    }
  }
})();

////////////////////////////////////////////////////////////










/* ===================== Cache mot → racine (col 3 → col 7) ===================== */

// Map globale : mot normalisé -> racine normalisée
let MOT_RACINE_MAP = null;

/**
 * Construit (une seule fois) la table de correspondance
 *  mot (dans le verset col 2) → racine correspondante (col 7, même rang).
 *
 * Hypothèse :
 *  - row[2] : verset (suite de mots)
 *  - row[7] : liste de racines séparées par des espaces,
 *             alignées positionnellement avec les mots du verset.
 */
function getMotRacineMap() {
  if (MOT_RACINE_MAP) return MOT_RACINE_MAP;

  const tabVersets = (typeof fTabVersets === "function" ? fTabVersets() : []) || [];
  const map = new Map();

  for (const row of tabVersets) {
    if (!row) continue;

    const colVerset = row[2] ? String(row[2]) : "";
    const colRacines = row[7] ? String(row[7]) : "";
    if (!colVerset || !colRacines) continue;

    // Normalisation identique aux autres traitements
    const versetNorm = (typeof normaliserTexte === "function")
      ? normaliserTexte(colVerset).trim()
      : String(colVerset).trim();

    const racinesNorm = (typeof normaliserTexte === "function")
      ? normaliserTexte(colRacines).trim()
      : String(colRacines).trim();

    if (!versetNorm || !racinesNorm) continue;

    // Découpage en tokens (mots) et racines
    const mots = versetNorm.split(/\s+/).filter(Boolean);
    const racines = racinesNorm.split(/\s+/).filter(Boolean);

    const len = Math.min(mots.length, racines.length);
    for (let i = 0; i < len; i++) {
      const mot = mots[i];
      const rac = racines[i];
      if (!mot || !rac) continue;

      // Premier trouvé = référence
      if (!map.has(mot)) {
        map.set(mot, rac);
      }
    }
  }

  MOT_RACINE_MAP = map;
  return MOT_RACINE_MAP;
}

/** Permet éventuellement de vider le cache si fTabVersets change. */
function resetMotRacineMap() {
  MOT_RACINE_MAP = null;
}


/* ========== Conversion d’une sélection de mots en racines ========== */

/**
 * Prend en entrée une sélection de mots (string).
 * Pour chaque mot :
 *   - on normalise le mot
 *   - on cherche la racine correspondante (col3 → col7) via le cache
 *   - si trouvée : on remplace par la racine
 *   - sinon      : on garde le mot original
 *
 * À la fin, on renvoie la nouvelle sélection (mots séparés par des espaces).
 *
 * @param {string} selection - texte contenant une sélection de mots
 * @returns {string} - nouvelle sélection où chaque mot est remplacé par sa racine si connue
 */
function selectionVersRacines(selection) {
  if (!selection || !String(selection).trim()) return "";

  // Normalisation légère de la chaîne d’entrée
  let input = String(selection).replace(/\+/g, " ").trim();
  if (!input) return "";

  const map = getMotRacineMap();

  // Découpage simple par espaces (la sélection est censée être une suite de mots)
  const motsOrig = input.split(/\s+/).filter(Boolean);
  const motsSortie = [];

  for (const mot of motsOrig) {
    // Normaliser pour la clé de recherche
    const motNorm = (typeof normaliserTexte === "function")
      ? normaliserTexte(mot).trim()
      : String(mot).trim();

    if (!motNorm) {
      // Rien de pertinent → on garde quand même la forme originale
      //motsSortie.push(mot);
      motsSortie.push('');
      continue;
    }

    const rac = map.get(motNorm);
    // Si racine trouvée → on met la racine, sinon on garde le mot original
    motsSortie.push(rac || mot);
    //motsSortie.push(rac || '');
  }

  return motsSortie.join(" ");
}

/**
 * Même logique que {@link selectionVersRacines}, avec indicateur si au moins
 * un mot de la sélection a une entrée dans le lexique (col3→col7).
 * @returns {{ rootsStr: string, hasLexiconMatch: boolean }}
 */
function selectionRootsMeta(selection) {
  if (!selection || !String(selection).trim()) {
    return { rootsStr: "", hasLexiconMatch: false };
  }
  let input = String(selection).replace(/\+/g, " ").trim();
  if (!input) return { rootsStr: "", hasLexiconMatch: false };

  const map = getMotRacineMap();
  const motsOrig = input.split(/\s+/).filter(Boolean);
  const motsSortie = [];
  let hasLexiconMatch = false;

  for (const mot of motsOrig) {
    const motNorm = (typeof normaliserTexte === "function")
      ? normaliserTexte(mot).trim()
      : String(mot).trim();
    if (!motNorm) {
      motsSortie.push("");
      continue;
    }
    const rac = map.get(motNorm);
    if (rac) hasLexiconMatch = true;
    motsSortie.push(rac || mot);
  }

  return { rootsStr: motsSortie.join(" "), hasLexiconMatch };
}

/**
 * Toggle des mots de `rootsStr` dans `txtInputStr`.
 * - On considère les mots séparés par espaces, et on traite aussi "+" comme séparateur.
 * - Pour chaque mot de roots :
 *    - s'il est déjà présent dans la liste → on le supprime
 *    - sinon → on l'ajoute à la fin
 * - Retourne la nouvelle chaîne (mots séparés par un espace).
 */
function toggleSelectionInInput(txtInputStr, rootsStr) {
  const base = String(txtInputStr || "").trim();
  const rootsClean = String(rootsStr || "").trim();
  if (!rootsClean) return base;

  // Découper l'input existant : "+" et espaces sont des séparateurs équivalents
  const tokensInput = base
    .replace(/\+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  // Découper les racines sélectionnées (souvent déjà normalisées)
  const tokensRoots = rootsClean
    .split(/\s+/)
    .filter(Boolean);

  // Copie de travail
  const current = tokensInput.slice();

  // Pour chaque racine : toggle (présente → supprimer, absente → ajouter)
  for (const r of tokensRoots) {
    const idx = current.indexOf(r);
    if (idx !== -1) {
      // Supprimer la première occurrence
      current.splice(idx, 1);
    } else {
      // Ajouter à la fin
      current.push('+' + r);
    }
  }

  return current.join(" ");
}


// === Menu contextuel sur mot sélectionné (double-clic / clic droit / touch) ===
(function () {
  let menu = null;

  const CTX_MENU_SEL = "#selectionContextMenu";

  function isTargetInsideCtxMenu(target) {
    if (!target || !target.closest) return false;
    try {
      return !!target.closest(CTX_MENU_SEL);
    } catch (_) {
      return false;
    }
  }

  const CTX_OPENER_SELECTOR = [
    "[data-zc-opens-selection-ctx]",
    "button.zc-popup-ctx-tab",
    "#t-popup-resultats-ctx-menu",
    "#mainCtxMenuBtn",
    "#mainCtxMenuBtnFooter",
    "#forumCtxMenuBtn",
    "#btn-commentCtxMenu",
    "#afModalCtxMenu",
    "#btnMediasHeadCtx",
    "a.zc-popup-ctx-tab",
    ".tm-list-ctx-btn",
    ".zc-open-selection-ctx",
  ].join(",");

  /** Clic / touch sur un contrôle qui ouvre #selectionContextMenu (évite fermeture immédiate au bubble + touchend). */
  function isOpenerForSelectionCtxMenu(target) {
    if (!target || !target.closest) return false;
    try {
      return !!target.closest(CTX_OPENER_SELECTOR);
    } catch (_) {
      return false;
    }
  }

  /**
   * Même chose en parcourant composedPath() : sur mobile le target peut être un enfant
   * (icône ☰) ou un parent du bouton « en cadre » (menu-button), sans remonter correctement au bouton id.
   */
  function eventComposedPathIncludesOpener(ev) {
    if (!ev) return false;
    const path = typeof ev.composedPath === "function" ? ev.composedPath() : null;
    if (path && path.length) {
      for (let i = 0; i < path.length; i++) {
        const n = path[i];
        if (!n || n.nodeType !== 1 || typeof n.matches !== "function") continue;
        try {
          if (n.matches(CTX_OPENER_SELECTOR)) return true;
        } catch (_) { }
      }
    }
    return isOpenerForSelectionCtxMenu(ev.target);
  }

  function clearTextSelection() {
    try {
      const sel = window.getSelection && window.getSelection();
      if (sel && sel.removeAllRanges) sel.removeAllRanges();
    } catch (_) { }
  }

  /** Élève le menu contextuel via la pile z-index centralisée. */
  function bringToFront(el) {
    if (!el) return;
    try {
      if (typeof window.zcBringToFront === "function") {
        window.zcBringToFront(el);
        return;
      }
    } catch (_) { }
    try {
      console.warn("[zc-z] z-index-stack indisponible: impossible d'élever", el.id || el);
    } catch (_) { }
  }

  // Remplir le champ #mot avec le mot sélectionné
  function remplirChampMot(word) {
    const input = document.getElementById("mot");
    if (!input) return null;
    input.value = word || "";
    try {
      input.dispatchEvent(new Event("input"));
    } catch (_) { }
    try {
      input.dispatchEvent(new Event("change"));
    } catch (_) { }
    return input;
  }

  /**
   * Avant de déclencher le clic sur un bouton de toolbar depuis le menu contextuel :
   * remplit #mot comme les anciennes actions data-action (Coran = mot brut, sinon racines).
   */
  window.zcCtxApplySelectionToMot = function (btnId, word) {
    const roots =
      typeof selectionVersRacines === "function"
        ? selectionVersRacines(word)
        : "";
    const r = String(roots || "").trim();
    const useRawWord = btnId === "zoomCoranBtnR1" || btnId === "btnChercheZoomCoran";
    const val = useRawWord ? word : r || word;
    remplirChampMot(val);
  };

  window.zcCtxFillMot = remplirChampMot;
  window.zcShowSelectionContextMenuFromMot = function (anchorEl) {
    const input = document.getElementById("mot");
    const word = input ? String(input.value || "").trim() : "";
    if (typeof window.zcShowSelectionContextMenuForWord === "function") {
      if (word) remplirChampMot(word);
      window.zcShowSelectionContextMenuForWord(word, anchorEl || null, { allowEmpty: true });
      return true;
    }
    return false;
  };

  function isTextareaTarget(target) {
    if (!target || !target.closest) return false;
    try {
      return !!target.closest("textarea");
    } catch (_) {
      return false;
    }
  }

  // Récupérer le texte sélectionné (document OU champs input).
  // Important: on exclut volontairement les textarea pour éviter le conflit
  // avec le menu système natif et les logiques d'édition locales (Mes Notes, etc.).
  function getSelectedText(evt) {
    try {
      const t = evt && evt.target;
      if (isTextareaTarget(t)) return "";
      const field = (t && t.closest && t.closest("input[type='text'], input[type='search'], input[type='email'], input[type='url'], input[type='tel'], input:not([type])"))
        || document.activeElement;
      if (field && field.tagName === "TEXTAREA") return "";
      if (
        field &&
        typeof field.value === "string" &&
        typeof field.selectionStart === "number" &&
        typeof field.selectionEnd === "number" &&
        field.selectionEnd > field.selectionStart
      ) {
        const part = String(field.value || "").slice(field.selectionStart, field.selectionEnd).trim();
        if (part) return part;
      }
    } catch (_) { }
    const sel = window.getSelection
      ? window.getSelection()
      : document.getSelection();
    if (!sel || sel.isCollapsed) return "";
    const txt = String(sel.toString() || "").trim();
    if (!txt) return "";
    return txt;
  }
  /**
   * Détermine si une sélection est un "vrai" texte (mot/phrase) exploitable.
   * On accepte si la chaîne contient au moins :
   *   - une lettre arabe \u0621-\u064A
   *   - ou une lettre latine
   *   - ou un chiffre
   * Les icônes FontAwesome / emoji / symboles seuls seront rejetés.
   */
  function isRealTextSelection(txt) {
    if (!txt) return false;
    const s = String(txt).trim();
    if (!s) return false;

    // Si pas de lettre arabe, pas de lettre latine et pas de chiffre → on considère que ce n'est pas du "texte"
    if (!/[A-Za-z\u0621-\u064A0-9]/.test(s)) {
      return false;
    }
    return true;
  }


  function shortenCtxPreview(text, maxLen) {
    const limit = Number.isFinite(maxLen) ? maxLen : 80;
    const s = String(text || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    if (s.length <= limit) return s;
    return s.slice(0, limit) + "...";
  }
  window.zcShortenCtxPreview = shortenCtxPreview;

  function localizedCtxMenuTitle() {
    let lang = "fr";
    try {
      lang = String(localStorage.getItem("uiLang") || "fr").toLowerCase();
    } catch (_) { lang = "fr"; }
    if (lang === "ar") return "القائمة السياقية";
    if (lang === "en") return "Context menu";
    if (lang === "kab") return "Umuɣ amesnirmes";
    if (lang === "es") return "Menú contextual";
    return "Menu contextuel";
  }

  // Création (une seule fois) du popup de menu
  function ensureMenu() {
    if (menu && document.body.contains(menu)) return menu;

    menu = document.createElement("div");
    menu.id = "selectionContextMenu";
    menu.style.position = "fixed";
    menu.style.boxSizing = "border-box";
    menu.style.minWidth = "280px";
    menu.style.display = "none";
    menu.style.flexDirection = "column";
    menu.style.overflow = "hidden";
    menu.style.background = "var(--zc-surface)";
    menu.style.border = "1px solid var(--zc-border)";
    menu.style.borderRadius = "12px";
    menu.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25)";
    menu.style.padding = "0";
    menu.style.fontFamily =
      "system-ui, -apple-system, Segoe UI, sans-serif";
    menu.style.fontSize = "14px";

    // ====== Menu contextuel : actions texte + languettes icônes (SAWM / SALAT / CHOKR) ======
    menu.innerHTML = `
    <div class="zc-ctx-popup-title">
      <button type="button" class="zc-ctx-popup-main-ui-btn" title="Revenir au champ de recherche principal" aria-label="Revenir au champ de recherche principal">
        <span class="zc-ctx-popup-title-ico" aria-hidden="true"><i class="fas fa-bars"></i></span>
      </button>
      <span class="zc-ctx-popup-title-text">${localizedCtxMenuTitle()}</span>
      <button type="button" class="zc-ctx-popup-close" aria-label="Fermer" title="Fermer">
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <div class="zc-ctx-popup-scroll">
    <div data-action="copier" class="zc-ctx-row zc-ctx-row--action">
      <span class="zc-ctx-ico" aria-hidden="true"><i class="fas fa-copy"></i></span>
      <span id="ctx-copy-label" data-ctx-i18n="copy">Copier</span>
    </div>
    <div data-action="rech-coran" class="zc-ctx-row zc-ctx-row--action">
      <span class="zc-ctx-ico" aria-hidden="true">🔎</span>
      <span data-ctx-i18n="searchAuto">Recherche auto</span>
    </div>
    <div data-action="rech-coran-racines" id="ctx-row-roots-search" class="zc-ctx-row zc-ctx-row--action"
      title="Rechercher dans le Coran avec les racines de la sélection">
      <span class="zc-ctx-ico" aria-hidden="true">🔎</span>
      <span id="ctx-roots-search-label" class="zc-ctx-roots-label"></span>
    </div>
    <div data-action="rech-coran-racines-plus-input" class="zc-ctx-row zc-ctx-row--action" id="ctx-row-roots-toggle"
      data-ctx-title-key="ctxAddRootsTitle">
      <span class="zc-ctx-ico" aria-hidden="true">🔎</span>
      <span id="ctx-roots-plus" class="zc-ctx-roots-label"></span>
    </div>

    <div class="zc-ctx-modules">
      <div class="toolbar1 zc-module-panel zc-ctx-mini-panel zc-panel-collapsed" data-zc-ctx-panel="sawm">
        <div class="Modules zc-module-head zc-ctx-mini-head">
          <span id="ctx-mod-label-sawm" class="zc-ctx-mod-label" aria-hidden="false"></span>
          <span class="zc-module-tab-icons zc-ctx-toolbar-head-host" data-zc-panel-id="panelSawm"></span>
          <button type="button" class="zc-panel-collapse-btn zc-ctx-collapse-btn" aria-label="Toggle panel">+</button>
        </div>
        <div class="toolbar zc-module-toolbar-inner zc-module-actions-list zc-ctx-mini-toolbar zc-ctx-toolbar-body-host" data-zc-panel-id="panelSawm" role="group"></div>
      </div>
      <div class="toolbar1 zc-module-panel zc-ctx-mini-panel zc-panel-collapsed" data-zc-ctx-panel="salat">
        <div class="Modules zc-module-head zc-ctx-mini-head">
          <span id="ctx-mod-label-salat" class="zc-ctx-mod-label" aria-hidden="false"></span>
          <span class="zc-module-tab-icons zc-ctx-toolbar-head-host" data-zc-panel-id="panelSalat"></span>
          <button type="button" class="zc-panel-collapse-btn zc-ctx-collapse-btn" aria-label="Toggle panel">+</button>
        </div>
        <div class="toolbar zc-module-toolbar-inner zc-module-actions-list zc-ctx-mini-toolbar zc-ctx-toolbar-body-host" data-zc-panel-id="panelSalat" role="group"></div>
      </div>
      <div class="toolbar1 zc-module-panel zc-ctx-mini-panel zc-panel-collapsed" data-zc-ctx-panel="chokr">
        <div class="Modules zc-module-head zc-ctx-mini-head">
          <span id="ctx-mod-label-chokr" class="zc-ctx-mod-label" aria-hidden="false"></span>
          <span class="zc-module-tab-icons zc-ctx-toolbar-head-host" data-zc-panel-id="panelChokr"></span>
          <button type="button" class="zc-panel-collapse-btn zc-ctx-collapse-btn" aria-label="Toggle panel">+</button>
        </div>
        <div class="toolbar zc-module-toolbar-inner zc-module-actions-list zc-ctx-mini-toolbar zc-ctx-toolbar-body-host" data-zc-panel-id="panelChokr" role="group"></div>
      </div>
    </div>
    </div>
`;
    const closeBtn = menu.querySelector(".zc-ctx-popup-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        hideMenu();
      });
    }

    const mainUiBtn = menu.querySelector(".zc-ctx-popup-main-ui-btn");
    if (mainUiBtn && mainUiBtn.dataset.ctxMainUiBound !== "1") {
      mainUiBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.zcGoToMainSearchUI === "function") {
          window.zcGoToMainSearchUI();
        }
      });
      mainUiBtn.dataset.ctxMainUiBound = "1";
    }

    function syncCtxMiniPanelButtons() {
      menu.querySelectorAll(".zc-ctx-mini-panel").forEach(function (panel) {
        const btn = panel.querySelector(".zc-ctx-collapse-btn");
        if (!btn || btn.dataset.ctxBound === "1") return;
        const syncLabel = function () {
          btn.textContent = panel.classList.contains("zc-panel-collapsed") ? "+" : "−";
          btn.setAttribute("aria-expanded", panel.classList.contains("zc-panel-collapsed") ? "false" : "true");
        };
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          const willOpen = panel.classList.contains("zc-panel-collapsed");
          menu.querySelectorAll(".zc-ctx-mini-panel").forEach(function (other) {
            if (other !== panel) {
              other.classList.add("zc-panel-collapsed");
              const otherBtn = other.querySelector(".zc-ctx-collapse-btn");
              if (otherBtn) {
                otherBtn.textContent = "+";
                otherBtn.setAttribute("aria-expanded", "false");
              }
            }
          });
          panel.classList.toggle("zc-panel-collapsed", !willOpen);
          syncLabel();
        });
        btn.dataset.ctxBound = "1";
        syncLabel();
      });
    }
    syncCtxMiniPanelButtons();


    // Gestion des clics sur les éléments du menu
    menu.addEventListener("click", function (e) {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const allowEmpty = menu.dataset.allowEmpty === "1";
      if (!allowEmpty && el.closest(".zc-ctx-row--disabled")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const action = el.getAttribute("data-action");
      const word = menu.dataset.selectedWord || "";
      if (!allowEmpty && !word) {
        hideMenu();
        return;
      }

      if (
        !allowEmpty &&
        action === "rech-coran-racines" &&
        menu.dataset.rootsAvailable !== "1"
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      switch (action) {
        // Copier le mot
        case "copier":
          if (typeof copierTexte === "function") {
            copierTexte(word);
          } else if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(word).catch(console.error);
          }
          break;

        // Mettre le mot dans #mot (et c'est tout)
        case "vers-mot":
          remplirChampMot(word);
          break;

        // Ajouter un commentaire / forum
        case "commentaire": {
          var roots = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;
          var val = roots || word;
          remplirChampMot(val);

          if (typeof afficherPopupCommentaire === "function") {
            afficherPopupCommentaire("msgForum", val, "");
          } else {
            console.log("Commentaire sur :", word);
          }
          break;
        }

        // Rechercher dans les articles du blog (alfamous + module articlesHtml)
        case "blog-articles": {
          // On convertit en racines comme pour les autres actions CHOKR
          var roots = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;
          var val = roots || word;

          // On remplit le champ #mot (pour que ton code existant récupère le texte)
          remplirChampMot(val);

          // On passe par ta fonction standard du menu : ouvrirLienExterne('3')
          if (typeof ouvrirLienExterne === "function") {
            try {
              ouvrirLienExterne('3');
            } catch (e) {
              console.warn("ouvrirLienExterne('3') a échoué :", e);
            }
          } else if (typeof ouvrirPopupHtml === "function") {
            // Fallback minimal : ouvrir le module des articles sans préfil
            ouvrirPopupHtml('articlesHtml');
          }
          break;
        }

        // Recherche dans le Coran (texte brut)
        case "rech-coran":
          remplirChampMot(word);
          if (typeof ChercheMotsMain === "function") {
            ChercheMotsMain(2);
          } else {
            console.warn("ChercheMotsMain(2) indisponible");
          }
          break;

					// Recherche dans le Coran via racines
        case "rech-coran-racines": {
          var roots = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : '';
          var val = roots || '';
          remplirChampMot(val);
          if (typeof ChercheMotsMain === "function") {
            ChercheMotsMain(2);
          } else {
            console.warn("ChercheMotsMain(2) indisponible");
          }
          break;
        }

        // Recherche dans le Coran via racines, avec toggle dans #mot
        case "rech-coran-racines-plus-input": {
          const inputEl = document.getElementById("mot");
          const txtInput = inputEl ? String(inputEl.value || "").trim() : "";

          const roots = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;

          const val = (typeof toggleSelectionInInput === "function")
            ? toggleSelectionInInput(txtInput, roots)
            : txtInput;

          remplirChampMot(val);

          if (typeof ChercheMotsMain === "function") {
            if (!val) inputEl.value = "";
            ChercheMotsMain(2);
          } else {
            console.warn("ChercheMotsMain(2) indisponible");
          }
          break;
        }


        // Recherche dans le Lexique (ChercheMotsMain(4))
        case "rech-lexique":
          //remplirChampMot(word); //recher mot brut
          var roots = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;
          var val = roots || word;
          remplirChampMot(val);//recherche racine
          if (typeof ChercheMotsMain === "function") {
            ChercheMotsMain(4);
          } else {
            console.warn("ChercheMotsMain(4) indisponible");
          }
          break;

        // Statistiques de racines (ChercheMotsMain(5))
        case "stat-racines":
          var roots = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;
          var val = roots || word;
          remplirChampMot(val);
          if (typeof ChercheMotsMain === "function") {
            ChercheMotsMain(5);
          } else {
            console.warn("ChercheMotsMain(5) indisponible");
          }
          break;

        // Racines, synonymes, atomes (ChercheMotsMain(6))
        case "racines-synonymes":
          var roots = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;
          var val = roots || word;
          remplirChampMot(val);
          if (typeof ChercheMotsMain === "function") {
            ChercheMotsMain(6);
          } else {
            console.warn("ChercheMotsMain(6) indisponible");
          }
          break;

        // Amis de la racine (ChercheMotsMain(7))
        case "amis-racine":
          var roots = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;
          var val = roots || word;
          remplirChampMot(val);
          if (typeof ChercheMotsMain === "function") {
            ChercheMotsMain(7);
          } else {
            console.warn("ChercheMotsMain(7) indisponible");
          }
          break;

        // Lister les formes déclinées (ChercheMotsMain(8))
        case "declinaisons":
          var roots = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;
          var val = roots || word;
          remplirChampMot(val);
          if (typeof ChercheMotsMain === "function") {
            ChercheMotsMain(8);
          } else {
            console.warn("ChercheMotsMain(8) indisponible");
          }
          break;

        case "chokr-contact": {
          var r = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;
          remplirChampMot(r || word);
          if (typeof ouvrirPopupHtml === "function") {
            ouvrirPopupHtml("contact.html");
          }
          break;
        }

        case "chokr-forum": {
          var r2 = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;
          remplirChampMot(r2 || word);
          if (typeof ouvrirPopupHtml === "function") {
            ouvrirPopupHtml("forum");
          }
          break;
        }

        case "chokr-temoignages": {
          var r3 = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;
          remplirChampMot(r3 || word);
          if (typeof ouvrirLienExterne === "function") {
            ouvrirLienExterne("5");
          }
          break;
        }

        case "chokr-copy": {
          var r4 = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;
          remplirChampMot(r4 || word);
          if (typeof window.copySelectedVersesAsRich === "function") {
            window.copySelectedVersesAsRich();
          }
          break;
        }

        case "chokr-share": {
          var r5 = (typeof selectionVersRacines === "function")
            ? selectionVersRacines(word)
            : word;
          remplirChampMot(r5 || word);
          if (typeof partagerLien === "function") {
            partagerLien();
          }
          break;
        }
      }

      clearTextSelection();
      hideMenu();
    });

    // Les clics à l’intérieur du menu ne doivent pas remonter au document (sinon fermeture / effets de bord).
    menu.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    document.body.appendChild(menu);
    return menu;
  }

  function hideMenu() {
    if (menu) {
      menu.style.display = "none";
    }
  }

  /** Ferme le mini-menu contextuel et ramène le focus sur la zone de recherche principale (#mot / panel versets). */
  function zcGoToMainSearchUI() {
    hideMenu();
    const mot = document.getElementById("mot");
    const panel = document.getElementById("panelVersets");
    const scrollTarget = mot ? mot.closest(".zc-mot-field-wrap") : null;
    const anchor = scrollTarget || panel;
    try {
      if (anchor && typeof anchor.scrollIntoView === "function") {
        anchor.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    } catch (_) { }
    if (mot) {
      try {
        mot.focus({ preventScroll: true });
      } catch (_) {
        try { mot.focus(); } catch (_2) { }
      }
    }
  }

  window.zcHideSelectionContextMenu = hideMenu;
  window.zcGoToMainSearchUI = zcGoToMainSearchUI;
  window.zcClearTextSelectionAfterCtxMenu = clearTextSelection;

  /** Libellés des languettes modules = mêmes ids que l’UI (labelInterface*10/11/12). */
  function syncCtxModuleLabels(menuEl) {
    if (!menuEl) return;
    const pairs = [
      ["ctx-mod-label-sawm", "10"],
      ["ctx-mod-label-salat", "11"],
      ["ctx-mod-label-chokr", "12"],
    ];
    let code = "FR";
    try {
      if (typeof getUILang === "function") {
        code = String(getUILang() || "FR").toUpperCase();
      }
    } catch (_) { }

    for (let p = 0; p < pairs.length; p++) {
      const spanId = pairs[p][0];
      const idx = pairs[p][1];
      const span = menuEl.querySelector("#" + spanId);
      if (!span) continue;
      let node = document.getElementById("labelInterface" + code + idx);
      if (!node || !String(node.textContent || "").trim()) {
        node = document.getElementById("labelInterfaceFR" + idx);
      }
      span.textContent = node ? String(node.textContent || "").trim() : "";
    }
  }
  /**
   * Affiche une aide contextuelle pour un élément, uniquement sur clic droit.
   * - Utilise en priorité data-help, puis title, puis id.
   */
  function showHelpForElement(evt) {
    if (!evt) return;
    // On limite l'aide automatique au clic droit
    if (evt.type !== "contextmenu") return;

    const target = evt.target;
    if (!target) return;

    // On remonte au plus proche élément porteur d'un id, d'un title ou d'un data-help
    const el = target.closest("[data-help], [title], [id]");
    if (!el) return;

    const help =
      el.getAttribute("data-help") ||
      el.getAttribute("title") ||
      el.id ||
      "";

    if (!help) return;

    if (typeof alertMsgBoxTemp === "function") {
      alertMsgBoxTemp(help);
    } else {
      console.log("Aide :", help);
    }
  }

  function showMenuForWord(word, eventOrAnchor, opts) {
    const allowEmpty = !!(opts && opts.allowEmpty);
    const rawWord = String(word || "").trim();
    if (!allowEmpty && !isRealTextSelection(rawWord)) {
      if (eventOrAnchor) {
        showHelpForElement(eventOrAnchor);
      }
      hideMenu();
      return;
    }

    const m = ensureMenu();
    m.dataset.selectedWord = rawWord;
    m.dataset.allowEmpty = allowEmpty ? "1" : "0";

    if (typeof window.zcSyncSelectionContextMenuToolbarStrips === "function") {
      try {
        window.zcSyncSelectionContextMenuToolbarStrips();
      } catch (e) {
        console.warn("zcSyncSelectionContextMenuToolbarStrips", e);
      }
    }

    syncCtxModuleLabels(m);

    if (typeof tMsg === "function") {
      const menuTitleEl = m.querySelector(".zc-ctx-popup-title-text");
      if (menuTitleEl) menuTitleEl.textContent = localizedCtxMenuTitle();
      const copyEl = m.querySelector('[data-ctx-i18n="copy"]');
      if (copyEl) copyEl.textContent = tMsg("ctxCopyLabel");
      const autoEl = m.querySelector('[data-ctx-i18n="searchAuto"]');
      if (autoEl) autoEl.textContent = tMsg("ctxSearchAuto");
      const toggleRow = m.querySelector("#ctx-row-roots-toggle");
      if (toggleRow && toggleRow.getAttribute("data-ctx-title-key")) {
        toggleRow.setAttribute(
          "title",
          tMsg(toggleRow.getAttribute("data-ctx-title-key"))
        );
      }
    }

    const copyEl = m.querySelector("#ctx-copy-label");
    if (copyEl) {
      const copyBase = typeof tMsg === "function" ? tMsg("ctxCopyLabel") : "Copier";
      const shortWord = shortenCtxPreview(rawWord, 80);
      copyEl.textContent = shortWord ? `${copyBase}: ${shortWord}` : copyBase;
      copyEl.setAttribute("title", shortWord || copyBase);
    }

    const meta =
      typeof selectionRootsMeta === "function"
        ? selectionRootsMeta(rawWord)
        : {
          rootsStr: (typeof selectionVersRacines === "function")
            ? selectionVersRacines(rawWord)
            : "",
          hasLexiconMatch: true,
        };
    const roots = meta.rootsStr || "";

    m.dataset.rootsAvailable = meta.hasLexiconMatch ? "1" : "0";

    const rootsSearchRow = m.querySelector("#ctx-row-roots-search");
    const spanRootsLabel = m.querySelector("#ctx-roots-search-label");
    if (rootsSearchRow && spanRootsLabel) {
      if (meta.hasLexiconMatch || allowEmpty) {
        rootsSearchRow.classList.remove("zc-ctx-row--disabled");
        rootsSearchRow.removeAttribute("aria-disabled");
        const shortRoots = shortenCtxPreview(roots.trim() || "", 80);
        spanRootsLabel.textContent = shortRoots || "";
        if (shortRoots) spanRootsLabel.setAttribute("title", shortRoots);
        else spanRootsLabel.removeAttribute("title");
      } else {
        rootsSearchRow.classList.add("zc-ctx-row--disabled");
        rootsSearchRow.setAttribute("aria-disabled", "true");
        spanRootsLabel.textContent =
          typeof tMsg === "function"
            ? tMsg("ctxNoRootsFound")
            : "Pas de racines trouvées";
      }
    }

    const spanRootsPlus = m.querySelector("#ctx-roots-plus");
    if (spanRootsPlus) {
      const inputEl = document.getElementById("mot");
      const txtInput = inputEl ? String(inputEl.value || "").trim() : "";
      const toggled = (typeof toggleSelectionInInput === "function")
        ? toggleSelectionInInput(txtInput, roots)
        : txtInput;
      const toggledShort = shortenCtxPreview(toggled || "", 80);
      spanRootsPlus.textContent = toggledShort || "";
      if (toggledShort) spanRootsPlus.setAttribute("title", toggledShort);
      else spanRootsPlus.removeAttribute("title");
    }

    m.style.removeProperty("left");
    m.style.removeProperty("top");
    m.style.display = "flex";
    try {
      const anchorEl = eventOrAnchor && eventOrAnchor.target ? eventOrAnchor.target : eventOrAnchor;
      const caller =
        anchorEl && anchorEl.closest
          ? (anchorEl.closest(".lecteur-overlay, #audio-floating-container, #popupHtml, #afModalOverlay, #popupCommentaireOverlay") || anchorEl)
          : null;
      if (typeof window.zcZIndexPlaceOverlayAboveCaller === "function") {
        window.zcZIndexPlaceOverlayAboveCaller(caller, m);
      } else {
        bringToFront(m);
      }
    } catch (_) {
      bringToFront(m);
    }
  }

  window.zcShowSelectionContextMenuForWord = function (word, eventOrAnchor, opts) {
    showMenuForWord(word, eventOrAnchor || null, opts || null);
  };


  function showMenuForSelection(event) {
    // 1) Récupérer la sélection brute
    const raw = getSelectedText(event);

    // 2) Si ce n'est pas une sélection textuelle "utile"
    if (!isRealTextSelection(raw)) {
      // Si pas de texte, on peut éventuellement montrer une aide sur clic droit
      if (event) {
        showHelpForElement(event); // cette fonction elle-même ignore les événements non-contextmenu
      }
      hideMenu();
      return;
    }

    showMenuForWord(raw, event);
  }





  // --- Écouteurs globaux ---

  // Double-clic : menu contextuel sur le mot sélectionné (desktop)
  document.addEventListener("dblclick", function (e) {
    if (isTargetInsideCtxMenu(e.target)) return;
    setTimeout(() => showMenuForSelection(e), 0);
  });

  // Clic droit : même menu (desktop) — pas sur le menu lui-même (sinon réouverture / conflit)
  document.addEventListener("contextmenu", function (e) {
    if (isTargetInsideCtxMenu(e.target)) return;
    if (isTextareaTarget(e.target)) return;
    // Échappement vers le menu natif système.
    if (e.shiftKey) return;
    e.preventDefault();
    showMenuForSelection(e);
  });

  // Touchend (mobile / iPhone) : après sélection par double-tap ou appui long
  // Ne pas replanifier si le doigt se lève sur le menu : sinon le menu se rouvre ~50 ms après un tap sur une icône.
  document.addEventListener(
    "touchend",
    function (e) {
      if (isTargetInsideCtxMenu(e.target)) return;
      if (eventComposedPathIncludesOpener(e)) return;
      setTimeout(() => showMenuForSelection(e), 50);
    },
    { passive: true }
  );

  // Fermeture : uniquement le bouton × du menu, les actions du menu, ou Escape (pas de clic hors / scroll).
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hideMenu();
  });

  // Petite API si tu veux récupérer le mot depuis ailleurs
  window.getSelectedWordFromMenu = function () {
    return menu && menu.dataset.selectedWord ? menu.dataset.selectedWord : "";
  };
})();
