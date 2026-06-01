// =======================
// amisRacines.js (avec "lien de parenté")
// =======================

// Cache : racine -> { list: Array<[ami, n, avgDist, sumDist, minDist, avgNormDist, lien]>, totalPairs, d1Pairs, d1Unique }
const _AMIS_RACINES_CACHE = new Map();

/** Normalise une racine d'entrée avec ta fonction si dispo */
function _normR(r) {
  const s = String(r || "").trim();
  if (!s) return "";
  return (typeof normaliserTexte === "function") ? normaliserTexte(s) : s;
}

function zcDynamicTopZStat() {
  try {
    if (typeof window.getNextZIndex === "function") return Number(window.getNextZIndex()) || 0;
    if (typeof getNextZIndex === "function") return Number(getNextZIndex()) || 0;
  } catch (_) { }
  const step = (typeof window.STEP === "number" && window.STEP > 0) ? window.STEP : 1;
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

/**
 * Calcule les “amis” d’une racine par paires (i,j) : pour chaque occurrence i de la racine cible,
 * on parcourt tous les j != i et on agrège par racine amie.
 * Mesures:
 *  - n           : nb de paires (i,j)
 *  - avgDist     : moyenne de |j - i|
 *  - minDist     : min(|j - i|)
 *  - avgNormDist : moyenne de |j - i| / L
 *  - lien        : n / avgDist   (indice d'importance combinant fréquence et proximité)
 *
 * Retourne { list: [ [ami, n, avgDist, sumDist, minDist, avgNormDist, lien], ... ],
 *            totalPairs, d1Pairs, d1Unique }
 */
function computeAmisRacineStats(racine) {
  const R = _normR(racine);
  if (!R) return { list: [], totalPairs: 0, d1Pairs: 0, d1Unique: 0 };

  // Clé de cache spécifique au mode "pairs"
  const cacheKey = "pairs§" + R;
  if (_AMIS_RACINES_CACHE.has(cacheKey)) return _AMIS_RACINES_CACHE.get(cacheKey);

  const tabVersets = (typeof fTabVersets === "function" ? fTabVersets() : []) || [];
  const agg = new Map(); // ami -> { n, sumDist, minDist, sumNormDist }
  let totalPairs = 0;    // total de paires (i, j) comptées
  let d1Pairs = 0;     // nombre de paires (i, j) avec |j - i| == 1
  let d1Unique = 0;     // nombre de positions j uniques à distance 1 (diagnostic chevauchements)

  for (const row of tabVersets) {
    if (!row) continue;

    const col7 = row[7] ? String(row[7]) : "";
    if (!col7) continue;

    const roots = ((typeof normaliserTexte === "function") ? normaliserTexte(col7) : col7)
      .split(/\s+/).filter(Boolean);
    const L = roots.length;
    if (L === 0) continue;

    // Positions de la racine cible dans cette cellule
    const posR = [];
    for (let i = 0; i < L; i++) if (roots[i] === R) posR.push(i);
    if (posR.length === 0) continue;

    // Pour diagnostic "uniques à d=1" (par verset)
    const d1Set = new Set();

    // Boucle par paires (i, j)
    for (const i of posR) {
      for (let j = 0; j < L; j++) {
        if (j === i) continue;
        const ami = roots[j];
        if (!ami || ami === R) continue;

        const d = Math.abs(j - i); // distance absolue
        if (d === 1) {
          d1Pairs++;      // on compte la paire (i, j)
          d1Set.add(j);   // pour le compteur "uniques à d=1"
        }

        let cur = agg.get(ami);
        if (!cur) cur = { n: 0, sumDist: 0, minDist: Infinity, sumNormDist: 0 };
        cur.n += 1;                 // N = nombre de paires (i, j) agrégées pour cette racine amie
        cur.sumDist += d;           // somme des distances par paires
        cur.sumNormDist += d / L;   // distance normalisée par la taille de la cellule
        if (d < cur.minDist) cur.minDist = d;
        agg.set(ami, cur);
        totalPairs += 1;
      }
    }

    d1Unique += d1Set.size; // positions j distinctes à d=1 dans ce verset
  }

  // Construction de la liste finale (+ calcul du lien = N / avgDist)
  const list = Array.from(agg.entries()).map(([ami, v]) => {
    const avg = v.n ? v.sumDist / v.n : Infinity;   // Infinity si v.n==0 (sécurité)
    const avgNorm = v.n ? v.sumNormDist / v.n : Infinity;
    const lien = (avg > 0 && isFinite(avg)) ? (v.n / avg) : 0; // N / avgDist
    return [ami, v.n, avg, v.sumDist, v.minDist, avgNorm, lien];
  });

  const result = { list, totalPairs, d1Pairs, d1Unique };
  _AMIS_RACINES_CACHE.set(cacheKey, result);
  return result;
}

// --- Reset cache
function resetAmisRacineCache(racine) {
  if (!racine) {
    _AMIS_RACINES_CACHE.clear();
    return;
  }
  const R = _normR(racine);
  _AMIS_RACINES_CACHE.delete(R);
  _AMIS_RACINES_CACHE.delete("pairs§" + R);
}

/**
 * UI principale: lance le calcul et ouvre la popup
 * Options:
 * - sort: "scoreDesc" | "scoreAsc" | "avgAsc" | "avgDesc" | "nDesc" | "nAsc" | "az" | "za"
 * - maxRows (number) : limite d’affichage (défaut 1000)
 */
function moduleAmisRacine() {
  let input = document.getElementById("mot").value.trim();
  if (input === "") input = "بسم الله";

  input = input.replace(/\+/g, " ");
/*
  const estNombre = detecterNombre(input);
  if (estNombre) {
    progRacine = false;
    var tst = traitementInput(input);
    return tst;
  }
*/
  if (testInput012345(input) != 1) {//non arabe
		alertMsgBoxTemp(`${input} n'est pas une racine du Coran.`);
    return false;
  }
  //var tstParam = AlifHamza; AlifHamza = false;//pour que le param n'intervienne pas
  //input = nettoyerTexteMixte(input,true);//besoin de nettoyer la ponctuation
  //AlifHamza = tstParam;//remettre à sa valeur initiale
  //console.log("INPUT1= " + input);
  input = String(input).trim().split(/[+\s]+/, 1)[0];
  //console.log("INPUT2= " + input);
  let tok = verifieRacineExisteDansLexique(input);
  if (tok) {
    alertMsgBoxTemp(`${tok} n'est pas une racine du Coran.`);
    //ChercheMotsMain(1);
    return false; // stop dès le premier inconnu
  }
  // ===== fin vérification =====
  // --- Normalisation unique de l’input ---
  //if (typeof sauvegarderMot === "function") try { sauvegarderMot(); } catch { }
  input = normaliserTexte(input);
  amisRacine(input, {})
}
function amisRacine(racine, opts = {}) {
  //racine = racine.replace(/\+/g, " ");
  racine = String(racine).trim().split(/[+\s]+/, 1)[0];

  const R = _normR(racine);
  if (!R) {
    (typeof alertMsgBoxPopup === 'function' ? alertMsgBoxPopup : alert)("Racine vide.");
    return;
  }
  const data = computeAmisRacineStats(R);
  showAmisRacine(R, data, opts);
}

/** Création + rendu de la popup (tri par défaut sur Lien ↓) */
function showAmisRacine(racine, data, opts = {}) {
  const maxRows = typeof opts.maxRows === "number" ? opts.maxRows : 1000;
  const defaultSort = ["scoreDesc", "scoreAsc", "avgAsc", "avgDesc", "nDesc", "nAsc", "az", "za"].includes(opts.sort)
    ? opts.sort
    : "scoreDesc";

  // Styles
  if (!document.getElementById("amis-racines-style")) {
    const st = document.createElement("style");
    st.id = "amis-racines-style";
    st.textContent = `
      #amis-racines-popup table { width:100%; border-collapse:collapse; font-size:14px; }
      #amis-racines-popup table th, #amis-racines-popup table td {
        border-bottom: 1px solid var(--zc-border); padding: 6px 8px;
      }
      #amis-racines-popup thead tr { background:var(--zc-ui-soft-bg); position: sticky; top:0; z-index:1; }
    `;
    document.head.appendChild(st);
  }

  // Nettoyage si déjà ouvert
  const old = document.getElementById("amis-racines-overlay");
  if (old) old.remove();

  // Overlay
  const overlay = document.createElement("div");
  overlay.id = "amis-racines-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.style.cssText = `
    position: fixed; inset: 0; background: var(--zc-overlay-bg);
    display: flex; align-items: center; justify-content: center;
  `;
  overlay.style.zIndex = String(zcDynamicTopZStat());

  // Popup
  const popup = document.createElement("div");
  popup.id = "amis-racines-popup";
  popup.style.cssText = `
    background: var(--zc-surface); color: var(--zc-text);
    width: var(--zc-popup-unified-max-width, min(98vw, 980px));
    max-width: var(--zc-popup-unified-max-width, min(98vw, 980px));
    height: var(--zc-popup-unified-max-height, 100dvh);
    max-height: var(--zc-popup-unified-max-height, 100dvh);
    border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    display: flex; flex-direction: column; overflow: hidden;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  `;

  // Header : (1) ☰ | Amis de la racine | ✖ (2) N amis (d>0) de + 📖 racine + audio (3) Trier + lien « Amis avec d=1 »
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 16px;
    background: var(--zc-ui-soft-bg);
    border-bottom: 1px solid var(--zc-border);
    flex-shrink: 0;
  `;

  const aL = document.createElement("a");
  aL.href = "#";
  aL.title = "Menu contextuel";
  aL.className = "zc-popup-ctx-tab";
  aL.textContent = "☰";
  aL.addEventListener("click", (e) => {
    e.preventDefault();
    if (typeof window.zcCtxFillMot === "function") window.zcCtxFillMot(racine);
    else {
      const inp = document.getElementById("mot");
      if (inp) inp.value = racine;
    }
    if (typeof window.zcShowSelectionContextMenuForWord === "function") {
      window.zcShowSelectionContextMenuForWord(racine, aL);
    }
  });

  const titleCenter = document.createElement("div");
  titleCenter.textContent = "Amis de la racine";
  titleCenter.style.cssText =
    "flex:1 1 auto;text-align:center;font-weight:600;font-size:1rem;color:var(--zc-text);";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.innerHTML = "✖";
  closeBtn.setAttribute("title", "Fermer");
  closeBtn.setAttribute("aria-label", "Fermer");
  closeBtn.className = "close-btnStatRacines";
  closeBtn.addEventListener("click", () => overlay.remove());

  const row1 = document.createElement("div");
  row1.className = "zc-popup-header-actions";
  row1.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px;";
  row1.append(aL, titleCenter, closeBtn);

  const aR = document.createElement("a");
  aR.href = "#";
  aR.title = "Recherche par correspondance de racines (Module2)";
  aR.style.cssText = `
    padding: 6px 10px; background:var(--zc-popup-link-soft); border:1px solid var(--zc-border);
    border-radius: 999px; font-size: 14px; line-height: 1; text-decoration: none; color: inherit;
  `;
  aR.textContent = `📖 ${racine}`;
  aR.addEventListener("click", (e) => {
    e.preventDefault();
    const inp = document.getElementById("mot");
    if (inp) inp.value = racine;
    if (typeof moduleSALAT === "function") moduleSALAT();
  });

  const btnAudio = document.createElement("button");
  btnAudio.type = "button";
  btnAudio.title = "Lire la racine";
  btnAudio.setAttribute("aria-label", `Lire la racine ${racine}`);
  btnAudio.style.cssText = "border:none;background:transparent;cursor:pointer;padding:0;font-size:16px;";
  if (document.querySelector(".fas.fa-volume-up") || (window.FontAwesome && window.FontAwesome.dom)) {
    btnAudio.innerHTML = `<i class="fas fa-volume-up" aria-hidden="true"></i>`;
  } else {
    btnAudio.textContent = "🔊";
  }
  btnAudio.addEventListener("click", (e) => {
    e.preventDefault();
    const langue = (typeof getLngVoix === "function") ? getLngVoix("ar") : (window.lngVoixAR || "ar");
    const vitesse = (typeof getVitesseVoix === "function") ? getVitesseVoix("ar") : 1.0;
    if (typeof lireTexte === "function") {
      try { lireTexte(String(racine), langue, vitesse); } catch (err) { console.error(err); }
    }
  });

  const totalAmis = Array.isArray(data.list) ? data.list.length : 0;
  const lblCount = document.createElement("span");
  lblCount.style.cssText = "font-weight:600;color:var(--zc-text);";
  lblCount.textContent = `${totalAmis} amis (d>0) de `;

  const row2 = document.createElement("div");
  row2.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;";
  row2.append(lblCount, aR, btnAudio);

  const sortLabel = document.createElement("label");
  sortLabel.textContent = "Trier :";
  sortLabel.style.cssText = "font-size:12px; color:var(--zc-text-muted);";

  const sortSelect = document.createElement("select");
  sortSelect.style.cssText =
    "padding:4px 6px; border:1px solid var(--zc-border); border-radius:6px; font-size:12px; background:var(--zc-surface); color:var(--zc-text);";
  sortSelect.innerHTML = `
    <option value="scoreDesc">Lien ↓</option>
    <option value="scoreAsc">Lien ↑</option>
    <option value="avgAsc">Distance moy. ↑</option>
    <option value="avgDesc">Distance moy. ↓</option>
    <option value="nDesc">N ↓</option>
    <option value="nAsc">N ↑</option>
    <option value="az">A → Z</option>
    <option value="za">Z → A</option>
  `;
  sortSelect.value = defaultSort;

  const linkD1 = document.createElement("a");
  linkD1.href = "#";
  linkD1.textContent = "Amis avec d=1";
  linkD1.title = "Amis du mot (distance 1)";
  linkD1.style.cssText =
    "margin-left:auto;color:var(--zc-link);font-size:13px;font-weight:600;text-decoration:none;";
  linkD1.addEventListener("click", (e) => {
    e.preventDefault();
    const inp = document.getElementById("mot");
    if (inp) inp.value = racine;
    if (typeof moduleAmisRacineD1 === "function") moduleAmisRacineD1();
  });

  const row3 = document.createElement("div");
  row3.style.cssText =
    "display:flex;align-items:center;gap:10px;flex-wrap:wrap;width:100%;";
  row3.append(sortLabel, sortSelect, linkD1);

  header.append(row1, row2, row3);

  // Corps
  const body = document.createElement("div");
  body.style.cssText = "overflow:auto; padding:0;";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th style="text-align:left;  width:34%;">Amis (d>0)</th>
      <th style="text-align:right; width:13%;">N</th>
      <th style="text-align:right; width:16%;">Distance moyenne</th>
      <th style="text-align:right; width:15%;">Force du Lien</th>
      <th style="text-align:left;">Barre</th>
    </tr>
  `;
  const tbody = document.createElement("tbody");
  table.append(thead, tbody);
  body.appendChild(table);

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText = `
    padding: 10px 16px; background: var(--zc-ui-soft-bg); border-top: 1px solid var(--zc-border);
    font-size: 12px; color: var(--zc-text-muted);
  `;
  footer.textContent =
    `La distance est |j − i| (absolue) entre la racine ciblée et l’amie (col.7).
N = nb de paires (i,j) agrégées par racine amie.  Lien = N / distance moyenne.  La barre reflète “Lien”.`;

  popup.append(header, body, footer);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // --------- Données & rendu ----------
  const collAr = new Intl.Collator('ar', { usage: 'sort', sensitivity: 'base' });
  const raw = Array.isArray(data.list) ? data.list.slice() : []; // [ami, n, avgDist, sumDist, minDist, avgNormDist, lien]

  const maxN = raw.reduce((m, it) => Math.max(m, it[1] || 0), 0) || 1;
  const maxLien = raw.reduce((m, it) => Math.max(m, it[6] || 0), 0) || 1;
  const lngVoixAR = (typeof getLngVoix === "function") ? getLngVoix("ar") : (window.lngVoixAR || "ar");

  function sortData(arr, mode) {
    const a = arr.slice();
    if (mode === "scoreDesc") a.sort((x, y) => (y[6] - x[6]) || (y[1] - x[1]) || collAr.compare(x[0], y[0])); // Lien ↓
    else if (mode === "scoreAsc") a.sort((x, y) => (x[6] - y[6]) || (y[1] - x[1]) || collAr.compare(x[0], y[0])); // Lien ↑
    else if (mode === "nDesc") a.sort((x, y) => (y[1] - x[1]) || (x[2] - y[2])); // N ↓ puis distance ↑
    else if (mode === "nAsc") a.sort((x, y) => (x[1] - y[1]) || (x[2] - y[2])); // N ↑ puis distance ↑
    else if (mode === "az") a.sort((x, y) => collAr.compare(x[0], y[0]));
    else if (mode === "za") a.sort((x, y) => collAr.compare(y[0], x[0]));
    else if (mode === "avgDesc") a.sort((x, y) => (y[2] - x[2]) || (y[1] - x[1])); // distance ↓
    else /* avgAsc */           a.sort((x, y) => (x[2] - y[2]) || (y[1] - x[1])); // distance ↑
    return a;
  }

  function render() {
    const mode = sortSelect.value;
    const sorted = sortData(raw, mode).slice(0, maxRows);

    const frag = document.createDocumentFragment();
    if (sorted.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5" style="padding:10px;color:var(--zc-text-muted);">
        Aucun ami (cooccurrence) trouvé pour cette racine.
      </td>`;
      frag.appendChild(tr);
      tbody.replaceChildren(frag);
      return;
    }

    for (const [ami, n, avgDist, _sumDist, minDist, avgNormDist, lien] of sorted) {
      const tr = document.createElement("tr");

      const amiJS = ami.replace(/'/g, "\\'");
      const coupleRacineAmi = `${racine}+${ami}`;
      const coupleJS = coupleRacineAmi.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const amiHtml = String(ami)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      const lienMenuCtx = `<a href="#"
					class="zc-popup-ctx-tab"
					onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${coupleJS}'); } else { document.getElementById('mot').value='${coupleJS}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${coupleJS}', this); } return false;"
					title="Menu contextuel">☰</a>`;

      const lienModuleSalat = `<a href="#"
          title="Recherche par correspondance de racines (Module2)"
          style="padding:4px 8px;background:var(--zc-popup-link-soft);border:1px solid var(--zc-border);border-radius:999px;font-size:12px;line-height:1;text-decoration:none;color:inherit;"
          onclick="event.preventDefault();var _m=document.getElementById('mot');if(_m)_m.value='${amiJS}';if(typeof moduleSALAT==='function')moduleSALAT();return false;">📖 ${amiHtml}</a>`;

      const lienLireTexte = `<a href="#"
			onclick="lireTexte('${amiJS}', '${lngVoixAR}', 1.0); event.preventDefault();">
			<i class="fas fa-volume-up" title="Lire racine"> </i>
			</a>`;
      const barWidth = Math.min(100, (lien / maxLien) * 100).toFixed(4);
      //boutons pour amis de :
      tr.innerHTML = `
        <td style="white-space:nowrap;">
          ${lienMenuCtx}&nbsp; ${lienModuleSalat}&nbsp; ${lienLireTexte}
        </td>
        <td style="text-align:right;" title="Nombre de paires (i,j)">${n}</td>
        <td style="text-align:right;"
            title="minDist: ${isFinite(minDist) ? minDist : 'n/a'} | moyenne normalisée: ${(isFinite(avgNormDist) ? avgNormDist : 0).toFixed(3)}">
          ${isFinite(avgDist) ? avgDist.toFixed(3) : '—'}
        </td>
        <td style="text-align:right;" title="Lien = N / distance moyenne">
          ${isFinite(lien) ? lien.toFixed(3) : '0.000'}
        </td>
        <td>
          <div style="background:var(--zc-ui-soft-bg); height:14px; border-radius:14px; overflow:hidden;">
            <div style="height:100%; width:${barWidth}%; background:var(--zc-popup-link);"></div>
          </div>
        </td>
      `;
      frag.appendChild(tr);
    }
    tbody.replaceChildren(frag);
  }

  sortSelect.addEventListener("change", render);
  render();
}


// (Optionnel) Expose au global si script en type="module"
try {
  window.amisRacine = amisRacine;
  window.computeAmisRacineStats = computeAmisRacineStats;
  window.resetAmisRacineCache = resetAmisRacineCache;
} catch { }







// =======================
// amisRacines-D1.js (amis à distance==1)
// =======================

/**
 * Calcule les “amis” d’une racine à distance 1 uniquement.
 * Pour chaque verset (col.7), pour chaque position i de la racine cible R,
 * on ne regarde QUE j=i-1 et j=i+1 (s’ils existent) et on agrège par racine amie.
 *
 * Mesures:
 *  - n           : nb de paires (i,j) avec |j-i|==1
 *  - avgDist     : moyenne de |j-i| (sera ~1, mais on la garde pour symétrie)
 *  - minDist     : min(|j-i|) (=1 si présent)
 *  - avgNormDist : moyenne de |j-i| / L
 *  - lien        : n / avgDist  (≈ n)
 *
 * Retourne { list: [ [ami, n, avgDist, sumDist, minDist, avgNormDist, lien], ... ],
 *            totalPairs, d1Pairs, d1Unique }
 */
function computeAmisRacineStatsD1(racine) {
  const R = _normR(racine);
  if (!R) return { list: [], totalPairs: 0, d1Pairs: 0, d1Unique: 0 };

  const cacheKey = "d1§" + R;
  if (_AMIS_RACINES_CACHE.has(cacheKey)) return _AMIS_RACINES_CACHE.get(cacheKey);

  const tabVersets = (typeof fTabVersets === "function" ? fTabVersets() : []) || [];
  const agg = new Map(); // ami -> { n, sumDist, minDist, sumNormDist }
  let totalPairs = 0;    // par cohérence (== d1Pairs ici)
  let d1Pairs = 0;       // nombre de paires d=1 (toutes)
  let d1Unique = 0;      // nb de positions j distinctes à d=1 (diagnostic)

  for (const row of tabVersets) {
    if (!row) continue;
    const col7 = row[7] ? String(row[7]) : "";
    if (!col7) continue;

    const roots = ((typeof normaliserTexte === "function") ? normaliserTexte(col7) : col7)
      .split(/\s+/).filter(Boolean);
    const L = roots.length;
    if (!L) continue;

    // positions de R
    const posR = [];
    for (let i = 0; i < L; i++) if (roots[i] === R) posR.push(i);
    if (!posR.length) continue;

    const d1Set = new Set(); // positions j uniques à d=1 (pour ce verset)

    for (const i of posR) {
      // voisins immédiats: i-1, i+1
      for (const j of [i - 1, i + 1]) {
        if (j < 0 || j >= L) continue;
        const ami = roots[j];
        if (!ami || ami === R) continue;

        const d = Math.abs(j - i); // =1
        // agrégation
        let cur = agg.get(ami);
        if (!cur) cur = { n: 0, sumDist: 0, minDist: Infinity, sumNormDist: 0 };
        cur.n += 1;
        cur.sumDist += d;          // +=1
        cur.sumNormDist += d / L;  // += 1/L
        if (d < cur.minDist) cur.minDist = d;
        agg.set(ami, cur);

        totalPairs += 1;
        d1Pairs += 1;
        d1Set.add(j);
      }
    }
    d1Unique += d1Set.size;
  }

  const list = Array.from(agg.entries()).map(([ami, v]) => {
    const avg = v.n ? v.sumDist / v.n : Infinity;          // ~1
    const avgNorm = v.n ? v.sumNormDist / v.n : Infinity;  // ~1/L moyen
    const lien = (avg > 0 && isFinite(avg)) ? (v.n / avg) : 0; // ≈ v.n
    return [ami, v.n, avg, v.sumDist, v.minDist, avgNorm, lien];
  });

  const result = { list, totalPairs, d1Pairs, d1Unique };
  _AMIS_RACINES_CACHE.set(cacheKey, result);
  return result;
}

/** Reset étendu pour inclure le cache D1 */
(function patchResetAmisRacineCacheForD1() {
  if (typeof resetAmisRacineCache === 'function' && !resetAmisRacineCache._patchedForD1) {
    const _orig = resetAmisRacineCache;
    window.resetAmisRacineCache = function (racine) {
      _orig(racine);
      if (!racine) return;
      const R = _normR(racine);
      _AMIS_RACINES_CACHE.delete("d1§" + R);
    };
    window.resetAmisRacineCache._patchedForD1 = true;
  }
})();

/** Entrée "module" : lit #mot, valide, normalise, puis ouvre la popup D1 */
function moduleAmisRacineD1() {
  let input = document.getElementById("mot")?.value?.trim() || "";
  if (input === "") input = "بسم الله";
  input = input.replace(/\+/g, " ");

  const estNombre = (typeof detecterNombre === "function") ? detecterNombre(input) : false;
  if (estNombre) {
    try { return traitementInput(input); } catch { return false; }
  }

  if (typeof testInput012345 === "function" && testInput012345(input) != 1) {
    if (typeof ChercheMotsMain === "function") ChercheMotsMain(1);
    return false;
  }

  // neutraliser AlifHamza pendant le nettoyage ponctuation
  /*const bak = (typeof AlifHamza !== "undefined") ? AlifHamza : null;
  try { if (typeof AlifHamza !== "undefined") AlifHamza = false; } catch {}
  input = (typeof nettoyerTexteMixte === "function") ? nettoyerTexteMixte(input,true) : input;
  try { if (typeof AlifHamza !== "undefined" && bak !== null) AlifHamza = bak; } catch {}
*/
  if (typeof verifieRacineExisteDansLexique === "function") {
    input = String(input).trim().split(/[+\s]+/, 1)[0];
    const tok = verifieRacineExisteDansLexique(input);
    if (tok) {
      alertMsgBoxTemp(`${tok} n'est pas une racine du Coran.`);
      //ChercheMotsMain(1);
      return false; // stop dès le premier inconnu
    }
  }

  input = (typeof normaliserTexte === "function") ? normaliserTexte(input) : String(input).trim();
  amisRacineD1(input, {});
}

function amisRacineD1(racine, opts = {}) {
  racine = String(racine).trim().split(/[+\s]+/, 1)[0];
  const R = _normR(racine);
  if (!R) { (typeof alertMsgBoxPopup === 'function' ? alertMsgBoxPopup : alert)("Racine vide."); return; }
  const data = computeAmisRacineStatsD1(R);
  showAmisRacineD1(R, data, opts);
}

/** Popup D1 (distance==1) — colonnes réduites */
function showAmisRacineD1(racine, data, opts = {}) {
  const maxRows = typeof opts.maxRows === "number" ? opts.maxRows : 1000;
  const defaultSort = ["nDesc", "nAsc", "az", "za"].includes(opts.sort) ? opts.sort : "nDesc";

  // style minimal si pas déjà injecté par l’autre popup
  if (!document.getElementById("amis-racines-style")) {
    const st = document.createElement("style");
    st.id = "amis-racines-style";
    st.textContent = `
      #amis-racines-popup table { width:100%; border-collapse:collapse; font-size:14px; }
      #amis-racines-popup table th, #amis-racines-popup table td {
        border-bottom: 1px solid var(--zc-border); padding: 6px 8px;
      }
      #amis-racines-popup thead tr { background:var(--zc-ui-soft-bg); position: sticky; top:0; z-index:1; }
    `;
    document.head.appendChild(st);
  }

  // nettoyage ancienne
  const old = document.getElementById("amis-racines-overlay");
  if (old) old.remove();

  // overlay
  const overlay = document.createElement("div");
  overlay.id = "amis-racines-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.style.cssText = `
    position: fixed; inset: 0; background: var(--zc-overlay-bg);
    display: flex; align-items: center; justify-content: center;
  `;
  overlay.style.zIndex = String(zcDynamicTopZStat());

  // popup
  const popup = document.createElement("div");
  popup.id = "amis-racines-popup";
  popup.style.cssText = `
    background:var(--zc-surface); color:var(--zc-text);
    width: var(--zc-popup-unified-max-width, min(98vw, 980px));
    max-width: var(--zc-popup-unified-max-width, min(98vw, 980px));
    height: var(--zc-popup-unified-max-height, 100dvh);
    max-height: var(--zc-popup-unified-max-height, 100dvh);
    border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.2);
    display:flex; flex-direction:column; overflow:hidden;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  `;

  // header : (1) ☰ | Amis de la racine | ✖ (2) N amis (d=1) de + 📖 racine + audio (3) Trier + lien « Amis avec d>1 »
  const header = document.createElement("div");
  header.style.cssText = `
    display:flex;
    flex-direction:column;
    gap:10px;
    padding:12px 16px;
    background:var(--zc-ui-soft-bg);
    border-bottom:1px solid var(--zc-border);
    flex-shrink:0;
  `;

  const aL = document.createElement("a");
  aL.href = "#";
  aL.title = "Menu contextuel";
  aL.className = "zc-popup-ctx-tab";
  aL.textContent = "☰";
  aL.addEventListener("click", (e) => {
    e.preventDefault();
    if (typeof window.zcCtxFillMot === "function") window.zcCtxFillMot(racine);
    else {
      const inp = document.getElementById("mot");
      if (inp) inp.value = racine;
    }
    if (typeof window.zcShowSelectionContextMenuForWord === "function") {
      window.zcShowSelectionContextMenuForWord(racine, aL);
    }
  });

  const titleCenter = document.createElement("div");
  titleCenter.textContent = "Amis de la racine";
  titleCenter.style.cssText =
    "flex:1 1 auto;text-align:center;font-weight:600;font-size:1rem;color:var(--zc-text);";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.innerHTML = "✖";
  closeBtn.setAttribute("title", "Fermer");
  closeBtn.setAttribute("aria-label", "Fermer");
  closeBtn.className = "close-btnStatRacines";
  closeBtn.addEventListener("click", () => overlay.remove());

  const row1 = document.createElement("div");
  row1.className = "zc-popup-header-actions";
  row1.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px;";
  row1.append(aL, titleCenter, closeBtn);

  const aR = document.createElement("a");
  aR.href = "#";
  aR.title = "Recherche par correspondance de racines (Module2)";
  aR.style.cssText = `
    padding:6px 10px; background:var(--zc-popup-link-soft); border:1px solid var(--zc-border);
    border-radius:999px; font-size:14px; line-height:1; text-decoration:none; color:inherit;
  `;
  aR.textContent = `📖 ${racine}`;
  aR.addEventListener("click", (e) => {
    e.preventDefault();
    const inp = document.getElementById("mot");
    if (inp) inp.value = racine;
    if (typeof moduleSALAT === "function") moduleSALAT();
  });

  const btnAudio = document.createElement("button");
  btnAudio.type = "button";
  btnAudio.title = "Lire la racine";
  btnAudio.setAttribute("aria-label", `Lire la racine ${racine}`);
  btnAudio.style.cssText = "border:none;background:transparent;cursor:pointer;padding:0;font-size:16px;";
  if (document.querySelector(".fas.fa-volume-up") || (window.FontAwesome && window.FontAwesome.dom)) {
    btnAudio.innerHTML = `<i class="fas fa-volume-up" aria-hidden="true"></i>`;
  } else {
    btnAudio.textContent = "🔊";
  }
  btnAudio.addEventListener("click", (e) => {
    e.preventDefault();
    const langue = (typeof getLngVoix === "function") ? getLngVoix("ar") : (window.lngVoixAR || "ar");
    const vitesse = (typeof getVitesseVoix === "function") ? getVitesseVoix("ar") : 1.0;
    if (typeof lireTexte === "function") {
      try { lireTexte(String(racine), langue, vitesse); } catch (err) { console.error(err); }
    }
  });

  const totalAmis = Array.isArray(data.list) ? data.list.length : 0;
  const lblCount = document.createElement("span");
  lblCount.style.cssText = "font-weight:600;color:var(--zc-text);";
  lblCount.textContent = `${totalAmis} amis (d=1) de `;

  const row2 = document.createElement("div");
  row2.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;";
  row2.append(lblCount, aR, btnAudio);

  const sortLabel = document.createElement("label");
  sortLabel.textContent = "Trier :";
  sortLabel.style.cssText = "font-size:12px; color:var(--zc-text-muted);";

  const sortSelect = document.createElement("select");
  sortSelect.style.cssText =
    "padding:4px 6px; border:1px solid var(--zc-border); border-radius:6px; font-size:12px; background:var(--zc-surface); color:var(--zc-text);";
  sortSelect.innerHTML = `
    <option value="nDesc">N ↓</option>
    <option value="nAsc">N ↑</option>
    <option value="az">A → Z</option>
    <option value="za">Z → A</option>
  `;
  sortSelect.value = defaultSort;

  const linkD0 = document.createElement("a");
  linkD0.href = "#";
  linkD0.textContent = "Amis avec d>1";
  linkD0.title = "Amis du mot (toutes distances > 0)";
  linkD0.style.cssText =
    "margin-left:auto;color:var(--zc-link);font-size:13px;font-weight:600;text-decoration:none;";
  linkD0.addEventListener("click", (e) => {
    e.preventDefault();
    const inp = document.getElementById("mot");
    if (inp) inp.value = racine;
    if (typeof moduleAmisRacine === "function") moduleAmisRacine();
  });

  const row3 = document.createElement("div");
  row3.style.cssText =
    "display:flex;align-items:center;gap:10px;flex-wrap:wrap;width:100%;";
  row3.append(sortLabel, sortSelect, linkD0);

  header.append(row1, row2, row3);

  // body
  const body = document.createElement("div");
  body.style.cssText = "overflow:auto; padding:0;";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th style="text-align:left;  width:48%;">Amis (d=1)</th>
      <th style="text-align:right; width:12%;">N</th>
      <th style="text-align:left;">Barre</th>
    </tr>
  `;
  const tbody = document.createElement("tbody");
  table.append(thead, tbody);
  body.appendChild(table);

  // footer
  const footer = document.createElement("div");
  footer.style.cssText = `
    padding:10px 16px; background:var(--zc-ui-soft-bg); border-top:1px solid var(--zc-border);
    font-size:12px; color:var(--zc-text-muted);
  `;
  footer.textContent = `Affichage limité aux cooccurrences immédiates (distance |j−i| = 1). N = nombre de paires (i,j) adjacentes.`;

  popup.append(header, body, footer);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // --------- Données & rendu ----------
  const collAr = new Intl.Collator('ar', { usage: 'sort', sensitivity: 'base' });
  const raw = Array.isArray(data.list) ? data.list.slice() : []; // [ami, n, avgDist, sumDist, minDist, avgNormDist, lien]

  // filtre strict d=1 : ici, la liste est *déjà* d=1 — mais si on réutilise list mixte, décommenter:
  // const raw = (Array.isArray(data.list)? data.list: []).filter(it => it[2] && Math.abs(it[2] - 1) < 1e-9);

  const maxN = raw.reduce((m, it) => Math.max(m, it[1] || 0), 0) || 1;
  const lngVoixAR = (typeof getLngVoix === "function") ? getLngVoix("ar") : (window.lngVoixAR || "ar");

  function sortData(arr, mode) {
    const a = arr.slice();
    if (mode === "nDesc") a.sort((x, y) => (y[1] - x[1]) || collAr.compare(x[0], y[0]));
    else if (mode === "nAsc") a.sort((x, y) => (x[1] - y[1]) || collAr.compare(x[0], y[0]));
    else if (mode === "az") a.sort((x, y) => collAr.compare(x[0], y[0]));
    else /* za */       a.sort((x, y) => collAr.compare(y[0], x[0]));
    return a;
  }

  function render() {
    const mode = sortSelect.value;
    const sorted = sortData(raw, mode).slice(0, maxRows);

    const frag = document.createDocumentFragment();
    if (!sorted.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="3" style="padding:10px;color:var(--zc-text-muted);">
        Aucun ami à distance 1 pour cette racine.
      </td>`;
      frag.appendChild(tr);
      tbody.replaceChildren(frag);
      return;
    }

    for (const [ami, n] of sorted) {
      const tr = document.createElement("tr");
      const amiJS = ami.replace(/'/g, "\\'");
      const coupleRacineAmi = `${racine}+${ami}`;
      const coupleJS = coupleRacineAmi.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const amiHtml = String(ami)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      const lienMenuCtx = `<a href="#"
					class="zc-popup-ctx-tab"
					onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${coupleJS}'); } else { document.getElementById('mot').value='${coupleJS}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${coupleJS}', this); } return false;"
					title="Menu contextuel">☰</a>`;

      const lienModuleSalat = `<a href="#"
          title="Recherche par correspondance de racines (Module2)"
          style="padding:4px 8px;background:var(--zc-popup-link-soft);border:1px solid var(--zc-border);border-radius:999px;font-size:12px;line-height:1;text-decoration:none;color:inherit;"
          onclick="event.preventDefault();var _m=document.getElementById('mot');if(_m)_m.value='${amiJS}';if(typeof moduleSALAT==='function')moduleSALAT();return false;">📖 ${amiHtml}</a>`;

      const lienLireTexte = `<a href="#"
			onclick="lireTexte('${amiJS}', '${lngVoixAR}', 1.0); event.preventDefault();">
			<i class="fas fa-volume-up" title="Lire racine"> </i>
			</a>`;

      const barWidth = Math.min(100, (n / maxN) * 100).toFixed(4);

      tr.innerHTML = `
        <td style="white-space:nowrap;">
          ${lienMenuCtx}&nbsp; ${lienModuleSalat}&nbsp; ${lienLireTexte}
        </td>
        <td style="text-align:right;">${n}</td>
        <td>
          <div style="background:var(--zc-ui-soft-bg); height:14px; border-radius:14px; overflow:hidden;">
            <div style="height:100%; width:${barWidth}%; background:var(--zc-popup-link);"></div>
          </div>
        </td>
      `;
      frag.appendChild(tr);
    }
    tbody.replaceChildren(frag);
  }

  sortSelect.addEventListener("change", render);
  render();
}

// (Optionnel) Expose au global
try {
  window.amisRacineD1 = amisRacineD1;
  window.computeAmisRacineStatsD1 = computeAmisRacineStatsD1;
} catch { }













// ======================
// 1) Calcul des racines //StatRacines
// ======================

// Cache éventuel si tu veux réutiliser sans recalculer à chaque fois
let _RACINES_STATS_CACHE = null;

/**
 * Calcule les stats des racines trouvées en colonne 7 de fTabVersets().
 * Retourne { stats: Array<[racine, count, freq]>, total: number, nbSourates: number, nbVersets: number }
 * - freq = count / total (entre 0 et 1)
 * - nbSourates / nbVersets : dérivés des lignes du tableau (pas de constantes figées)
 */
function computeRacinesStats() {
  if (_RACINES_STATS_CACHE) return _RACINES_STATS_CACHE;

  const tabVersets = (typeof fTabVersets === "function" ? fTabVersets() : []) || [];
  const compteur = new Map();
  const souraSet = new Set();
  let nbVersets = 0;

  for (const row of tabVersets) {
    if (row) {
      const s = Number(row[0]);
      const v = Number(row[1]);
      if (Number.isFinite(s) && s >= 1 && Number.isFinite(v) && v >= 1) {
        souraSet.add(s);
        nbVersets++;
      }
    }
    const col7 = row && row[7] ? String(row[7]) : "";
    if (!col7) continue;

    const norm = normaliserTexte(col7);
    const racines = norm.split(/\s+/).filter(Boolean);

    for (const r of racines) {
      const rNet = String(r).trim(); // racines déjà normalisées/nettoyées
      if (!rNet) continue;
      compteur.set(rNet, (compteur.get(rNet) || 0) + 1);
    }
  }

  // Total = somme de toutes les occurrences (pas le nombre de racines distinctes)
  let total = 0;
  for (const v of compteur.values()) total += v;

  const stats = Array.from(compteur.entries())
    .map(([racine, count]) => [racine, count, total ? count / total : 0])
    .sort((a, b) => b[2] - a[2]); // tri par fréquence décroissante

  _RACINES_STATS_CACHE = {
    stats,
    total,
    nbSourates: souraSet.size,
    nbVersets
  };
  return _RACINES_STATS_CACHE;
}

/** Permet de vider le cache manuellement si tes données changent */
function resetRacinesStatsCache() {
  _RACINES_STATS_CACHE = null;
}


// ==========================
// 2) Popup d'affichage (UI)
// ==========================
/** Retourne la première lettre arabe rencontrée dans str, sinon null */
// --- Helpers ---
function firstArabicLetter(str) {
  const m = String(str).match(/[\u0621-\u064A]/);
  if (!m) return null;
  return m[0]
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

/** Cible de recherche à partir de #mot selon tes règles */
function getSearchTarget() {
  const inp = document.getElementById("mot");
  let raw = inp ? String(inp.value || "").trim() : "";
  if (raw === "") {
    raw = normaliserTexte("بسم الله");
  }
  raw = String(raw).trim().split(/[+\s]+/, 1)[0];
  //var tstParam = AlifHamza; AlifHamza = false;//pour que le param n'intervienne pas
  //raw = nettoyerTexteMixte(raw);//besoin de nettoyer la ponctuation
  //AlifHamza = tstParam;//remettre à sa valeur initiale

  // Si vide ou aucun caractère arabe -> alif
  if (!raw || !/[\u0600-\u06FF]/.test(raw)) return "ا";

  // Normalisation directe via ta fonction
  const norm = normaliserTexte(raw);
  return norm ? norm : "ا";
}


/**
 * Affiche un popup avec un tableau [racine, nombre, fréquence] + barre de fréquence.
 * @param {Object} opts - options d’affichage
 * @param {number} opts.maxRows - nombre max de lignes à afficher (par défaut 500)
 * @param {boolean} opts.asPercent - afficher la fréquence en % (true par défaut)
 * @param {"freq"|"az"|"za"} opts.sort - tri initial (par défaut "az")
 * @param {number} opts.barFactor - facteur de largeur de barre (par défaut 27)
 */
function moduleStatistique(opts = {}) {
  const { stats, total, nbSourates, nbVersets } = computeRacinesStats();
  const maxRows = typeof opts.maxRows === "number" ? opts.maxRows : 2000;
  const asPercent = opts.asPercent !== false; // true par défaut
  const barFactor = (typeof opts.barFactor === "number" && opts.barFactor > 0) ? opts.barFactor : 27;
  const defaultSort = ["freq", "az", "za", "nDesc", "nAsc"].includes(opts.sort) ? opts.sort : "az"; // AZ par défaut

  // --- Style (surbrillance vert clair persistante) ---
  if (!document.getElementById("racines-popup-style")) {
    const st = document.createElement("style");
    st.id = "racines-popup-style";
    st.textContent = `
      #racines-popup tbody tr.racine-hi td{
        background: var(--zc-selected-bg);
      }
      #racines-popup tbody tr.racine-hi {
        outline: 2px solid rgba(76, 175, 80, .35);
        outline-offset: -2px;
      }
    `;
    document.head.appendChild(st);
  }

  // Nettoyage si déjà présent
  const old = document.getElementById("racines-popup-overlay");
  if (old) old.remove();

  // Overlay
  const overlay = document.createElement("div");
  overlay.id = "racines-popup-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.style.cssText = `
    position: fixed; inset: 0; background: var(--zc-overlay-bg);
    display: flex; align-items: center; justify-content: center;
  `;
  const topZ = zcDynamicTopZStat();
  overlay.style.zIndex = topZ;

  // POPUP
  const popup = document.createElement("div");
  popup.id = "racines-popup";
  popup.style.cssText = `
    background: var(--zc-surface); color: var(--zc-text);
    width: var(--zc-popup-unified-max-width, min(98vw, 980px));
    max-width: var(--zc-popup-unified-max-width, min(98vw, 980px));
    height: var(--zc-popup-unified-max-height, 100dvh);
    max-height: var(--zc-popup-unified-max-height, 100dvh);
    border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    display: flex; flex-direction: column; overflow: hidden;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  `;

  // Header (harmonisé : ☰ | titre | ✖, puis synthèse, puis Trier)
  const header = document.createElement("div");
  header.className = "zc-popup-header-unified";
  header.style.cssText = `
    padding: 12px 16px;
    background: var(--zc-ui-soft-bg);
    border-bottom: 1px solid var(--zc-border);
    gap: 8px;
  `;

  const actionsRow = document.createElement("div");
  actionsRow.className = "zc-popup-header-actions";

  const aMenu = document.createElement("a");
  aMenu.href = "#";
  aMenu.className = "zc-popup-ctx-tab";
  aMenu.setAttribute("aria-label", "Menu contextuel");
  aMenu.title = "Menu contextuel";
  aMenu.textContent = "☰";
  aMenu.addEventListener("click", (e) => {
    e.preventDefault();
    const motInp = document.getElementById("mot");
    const w = (motInp && String(motInp.value || "").trim()) || "";
    const word = w || "بسم";
    if (typeof window.zcCtxFillMot === "function") window.zcCtxFillMot(word);
    else if (motInp) motInp.value = word;
    if (typeof window.zcShowSelectionContextMenuForWord === "function") {
      window.zcShowSelectionContextMenuForWord(word, aMenu);
    }
  });

  const leftSlot = document.createElement("div");
  leftSlot.style.cssText = "flex:0 0 auto;display:flex;align-items:center;";
  leftSlot.appendChild(aMenu);

  const titleEl = document.createElement("div");
  titleEl.textContent = "📊 Statistiques";
  titleEl.style.cssText = "flex:1 1 auto;text-align:center;font-weight:600;font-size:1rem;color:var(--zc-text);";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.innerHTML = "✖";
  closeBtn.setAttribute("title", "Fermer");
  closeBtn.setAttribute("aria-label", "Fermer");
  closeBtn.className = "close-btnStatRacines";
  closeBtn.addEventListener("click", () => overlay.remove());

  const rightSlot = document.createElement("div");
  rightSlot.style.cssText = "flex:0 0 auto;display:flex;align-items:center;";
  rightSlot.appendChild(closeBtn);

  actionsRow.appendChild(leftSlot);
  actionsRow.appendChild(titleEl);
  actionsRow.appendChild(rightSlot);

  const summaryRow = document.createElement("div");
  summaryRow.className = "zc-popup-header-info";
  summaryRow.textContent =
    `${nbSourates} Sourates, ${nbVersets} Versets, ${stats.length} racines, ${total} mots`;
  summaryRow.style.cssText =
    "font-size:14px;color:var(--zc-text-muted);line-height:1.35;margin:0;padding:0 2px;";

  // Contrôles de tri (label + select)
  const ctrls = document.createElement("div");
  ctrls.style.cssText =
    "display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px;";

  const sortLabel = document.createElement("label");
  sortLabel.textContent = "Trier :";
  sortLabel.setAttribute("for", "racines-sort");
  sortLabel.style.cssText = "font-size:14px; color:var(--zc-text-muted);";

  const sortSelect = document.createElement("select");
  sortSelect.id = "racines-sort";
  sortSelect.style.cssText = "padding:4px 6px; border:1px solid var(--zc-border); border-radius:6px; font-size:14px; background:var(--zc-surface); color:var(--zc-text);";
  sortSelect.innerHTML = `
    <option value="freq">Fréq. ↓</option>
    <option value="az">A → Z</option>
    <option value="za">Z → A</option>
    <option value="nDesc">N ↓</option>
    <option value="nAsc">N ↑</option>
  `;
  sortSelect.value = defaultSort; // "az" par défaut

  ctrls.appendChild(sortLabel);
  ctrls.appendChild(sortSelect);

  header.appendChild(actionsRow);
  header.appendChild(summaryRow);
  header.appendChild(ctrls);

  // Corps scrollable
  const body = document.createElement("div");
  body.style.cssText = `overflow: auto; padding: 0;`;

  // Table
  const table = document.createElement("table");
  table.style.cssText = `width: 100%; border-collapse: collapse; font-size: 14px;`;

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr style="background:var(--zc-ui-soft-bg); position: sticky; top:0; z-index:1;">
      <th style="text-align:left;  padding:5px 6px; border-bottom:1px solid var(--zc-border); width:2%;">Racines</th>
      <th style="text-align:right; padding:5px 6px; border-bottom:1px solid var(--zc-border); width:2%;">N</th>
      <th style="text-align:right; padding:5px 6px; border-bottom:1px solid var(--zc-border); width:2%;">Fréquence</th>
      <th style="text-align:left;  padding:5px 6px; border-bottom:1px solid var(--zc-border);">Barre</th>
    </tr>
  `;

  const tbody = document.createElement("tbody");

  // -------- OPTI: collator arabe + caches ----------------
  const collAr = new Intl.Collator('ar', { usage: 'sort', sensitivity: 'base' });
  const sortedCache = Object.create(null); // { az:[], za:[], freq:[], nDesc:[], nAsc:[] }

  function getSorted(mode) {
    if (sortedCache[mode]) return sortedCache[mode];
    let arr = stats.slice(); // [racine, count, freq]
    if (mode === "az") {
      arr.sort((a, b) => collAr.compare(a[0], b[0]));
    } else if (mode === "za") {
      arr.sort((a, b) => collAr.compare(b[0], a[0]));
    } else if (mode === "nDesc") {
      arr.sort((a, b) => b[1] - a[1]);
    } else if (mode === "nAsc") {
      arr.sort((a, b) => a[1] - b[1]);
    } else { // "freq"
      arr.sort((a, b) => b[2] - a[2]);
    }
    sortedCache[mode] = arr;
    return arr;
  }

  // -------- OPTI: cache des <tr> (réutilisation) ----------
  const rowCache = new Map(); // racine -> <tr>

  function getRow(racine, count, freq) {
    if (rowCache.has(racine)) return rowCache.get(racine);

    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid var(--zc-border)";
    tr.setAttribute("data-racine", racine);

    const racineJS = racine.replace(/'/g, "\\'");

    const menuCtxLink = `<a href="#"
        class="zc-popup-ctx-tab"
        onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${racineJS}'); } else { document.getElementById('mot').value='${racineJS}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${racineJS}', this); } return false;"
        title="Menu contextuel">☰</a>`;

    const lienLireTexte = `<a href="#"
			onclick="lireTexte('${racineJS}', '${lngVoixAR}', 1.0); event.preventDefault();">
			<i class="fas fa-volume-up" title="Lire racine"> </i>
			</a>`;
    let largeur = (freq * 100) * barFactor;
    if (largeur > 100) largeur = 100;

    tr.innerHTML = `
      <td style="padding:8px 12px; white-space:nowrap;">${menuCtxLink}&nbsp; ${racine} &nbsp; ${lienLireTexte}</td>
      <td style="padding:8px 12px; text-align:right;">${count}</td>
      <td style="padding:8px 12px; text-align:right;">${asPercent ? (freq * 100).toFixed(2) + " %" : freq.toFixed(6)}</td>
      <td style="padding:8px 12px;">
        <div style="background:var(--zc-ui-soft-bg); height:16px; border-radius:16px; overflow:hidden;">
          <div style="height:100%; width:${largeur.toFixed(4)}%; background:var(--zc-popup-link);"></div>
        </div>
      </td>
    `;
    rowCache.set(racine, tr);
    return tr;
  }

  // -------- Surbrillance persistante --------
  function highlightRow(tr) {
    const prev = tbody.querySelector("tr.racine-hi");
    if (prev && prev !== tr) prev.classList.remove("racine-hi");
    tr.classList.add("racine-hi");
  }

  // -------- Rendu (rapide) --------------------------------
  function renderRows(mode) {
    const dataFull = getSorted(mode);                  // tableau complet trié
    const n = dataFull.length;
    const target = getSearchTarget();                  // racine normalisée
    const idx = dataFull.findIndex(([r]) => r === target);

    // Fenêtrage : on rend une tranche qui contient la cible si elle existe
    let start = 0;
    const max = Math.max(1, maxRows);                  // garde-fou
    if (idx !== -1) {
      start = Math.max(0, Math.min(idx - Math.floor(max / 2), Math.max(0, n - max)));
    }
    const data = dataFull.slice(start, start + max);

    // (Re)construction du tbody avec réutilisation des <tr> en cache
    const frag = document.createDocumentFragment();
    for (const [racine, count, freq] of data) {
      frag.appendChild(getRow(racine, count, freq));
    }
    tbody.replaceChildren(frag);

    // Scroll + surbrillance
    requestAnimationFrame(() => {
      const esc = (window.CSS && CSS.escape) ? CSS.escape : (s => String(s).replace(/["\\]/g, "\\$&"));
      const exact = tbody.querySelector(`tr[data-racine="${esc(target)}"]`);

      if (exact) {
        exact.scrollIntoView({ block: "center", behavior: "smooth" });
        highlightRow(exact);
        return;
      }

      // Fallback: 1re ligne commençant par la 1re lettre arabe de la cible (normalisée)
      const letter = firstArabicLetter(target) || "ا";
      const rows = Array.from(tbody.querySelectorAll("tr[data-racine]"));
      const byPrefix = rows.find(tr => (tr.getAttribute("data-racine") || "").startsWith(letter));
      const fallback = byPrefix || rows[0];

      if (fallback) {
        fallback.scrollIntoView({ block: "start", behavior: "smooth" });
        highlightRow(fallback);
      }
    });
  }


  // Assemblage structure
  const theadEl = thead; // (si besoin de futures interactions)
  table.appendChild(thead);
  table.appendChild(tbody);
  body.appendChild(table);

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText = `
   padding: 10px 16px; background: var(--zc-ui-soft-bg); border-top: 1px solid var(--zc-border);
   font-size: 12px; color: var(--zc-text-muted);
  `;
  footer.textContent = `Tri: Fréq. ↓, A→Z, Z→A, N ↓, N ↑. Barre proportionnelle à la fréquence (count / total), facteur × ${barFactor}.`;

  // Assemblage final
  popup.appendChild(header);
  popup.appendChild(body);
  popup.appendChild(footer);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Premier rendu + écouteur
  renderRows(defaultSort);
  sortSelect.addEventListener("change", () => renderRows(sortSelect.value));
}



// ==========================
// 3) Exemple d’utilisation
// ==========================
// -> moduleStatistique({ maxRows: 2000 }); // pour afficher
// -> resetRacinesStatsCache();            // si tu modifies la source et veux recalculer
// Remplace ce bloc:
// document.getElementById("btnRacines").addEventListener("click", function () {
//   moduleStatistique({ maxRows: 2000 });
// });
/*
// Par :
(function attachBtnRacines() {
  const btn = document.getElementById("btnRacines");
  if (btn) {
    btn.addEventListener("click", () => moduleStatistique({ maxRows: 2000 }));
  } else {
    // si le script est chargé dans le <head>, on attend le DOM
    document.addEventListener("DOMContentLoaded", () => {
      const b = document.getElementById("btnRacines");
      if (b) b.addEventListener("click", () => moduleStatistique({ maxRows: 2000 }));
    });
  }
})();*/
function moduleDeclineRacine(racine) {

  let input = racine || document.getElementById("mot").value.trim();
  if (input === "") input = "بسم الله";
  input = input.replace(/\+/g, " ");

  if (testInput012345(input) != 1) {//non arabe
		alertMsgBoxTemp(`${input} n'est pas une racine du Coran.`);
    return false;
  }
  // ===== fin vérification =====
  // --- Normalisation unique de l’input ---
  racine = input.trim();
  racine = String(racine).trim().split(/[+\s]+/, 1)[0];
  //var tstParam = AlifHamza; AlifHamza = false;//pour que le param n'intervienne pas
  //racine = nettoyerTexteMixte(racine);//besoin de nettoyer la ponctuation
  //AlifHamza = tstParam;//remettre à sa valeur initiale
  let tok = verifieRacineExisteDansLexique(racine);
  if (tok) {
    alertMsgBoxTemp(`${tok} n'est pas une racine du Coran.`);
    //ChercheMotsMain(1);//module2
    return false; // stop dès le premier inconnu
  }

  const tabVersets = (typeof fTabVersets === "function" ? fTabVersets() : []) || [];

  // Map mot -> { count: number, tCount: Map<translit, number> }
  const counts = new Map();
  let totalTokens = 0;

  // Helper pour choisir la translittération la plus fréquente d'un mot
  function pickMostFrequent(tMap) {
    if (!tMap || !tMap.size) return "";
    let best = "", max = -1;
    for (const [t, c] of tMap.entries()) {
      if (c > max) { best = t; max = c; }
    }
    return best;
  }

  for (const row of tabVersets) {
    if (!row) continue;

    // Colonne 7 : racines normalisées (alignées par token)
    const col7 = row[7] ? String(row[7]) : "";
    if (!col7) continue;
    const roots = normaliserTexte(col7).split(/\s+/).filter(Boolean);

    // Colonne 2 : mots déclinés (arabe)
    const col2 = row[2] ? String(row[2]) : "";
    const words = col2.split(/\s+/).filter(Boolean);

    // Colonne 10 : translittérations tokenisées (alignées à col.2/col.7)
    const col10 = row[10] ? String(row[10]) : "";
    const trans = col10.split(/\s+/).filter(Boolean);

    for (let i = 0; i < roots.length; i++) {
      if (roots[i] === racine) {
        totalTokens++; // ✅ on compte toutes les occurrences de la racine

        if (i < words.length) {
          const w = words[i].trim();
          if (!w) continue;

          // translittération à la même position (si dispo)
          const t = (i < trans.length ? trans[i] : "").trim();

          let obj = counts.get(w);
          if (!obj) {
            obj = { count: 0, tCount: new Map() };
            counts.set(w, obj);
          }
          obj.count++;
          if (t) obj.tCount.set(t, (obj.tCount.get(t) || 0) + 1);
        }
      }
    }
  }

  // Construire la liste triable : [mot, n, translitChoisie]
  const liste = [];
  for (const [w, obj] of counts.entries()) {
    const bestT = pickMostFrequent(obj.tCount);
    liste.push([w, obj.count, bestT]);
  }
  try { liste.sort((a, b) => a[0].localeCompare(b[0], 'ar')); }
  catch { liste.sort((a, b) => a[0].localeCompare(b[0])); }


  // Passe le total exact au popup (inchangé)
  showDeclinaisonsPopup(racine, liste, totalTokens);


}
function showDeclinaisonsPopup(racine, mots, totalOccParam) {
  // --- Nettoyage si déjà présent
  const old = document.getElementById("declinaisons-overlay");
  if (old) old.remove();

  // --- Contexte z-index
  const baseZ = zcDynamicTopZStat();

  // --- Overlay
  const overlay = document.createElement("div");
  overlay.id = "declinaisons-overlay";
  overlay.setAttribute("role", "presentation");
  overlay.style.cssText = `
    position: fixed; inset: 0; background: var(--zc-overlay-bg);
    display: flex; align-items: center; justify-content: center;
    z-index: ${baseZ};
  `;
  // Permettre la capture du focus + ESC
  overlay.tabIndex = -1;

  // --- Popup
  const popup = document.createElement("div");
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  const titleId = "declinaisons-title";
  popup.setAttribute("aria-labelledby", titleId);
  popup.style.cssText = `
    position: relative; z-index: ${baseZ + 1};
    background: var(--zc-surface); color: var(--zc-text);
    width: var(--zc-popup-unified-max-width, min(98vw, 980px));
    max-width: var(--zc-popup-unified-max-width, min(98vw, 980px));
    height: var(--zc-popup-unified-max-height, 100dvh);
    max-height: var(--zc-popup-unified-max-height, 100dvh);
    border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    display: flex; flex-direction: column; overflow: hidden;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  `;

  // --- Header : (1) ☰ | 🧩 Déclinaisons | ✖  (2) Racine: 📖 racine + audio + n/total variants
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 16px;
    background: var(--zc-ui-soft-bg);
    border-bottom: 1px solid var(--zc-border);
    flex-shrink: 0;
  `;

  // Lien cliquable pour la racine
  const lienRacine = document.createElement("a");
  lienRacine.href = "#";
  lienRacine.title = "Recherche dans le Coran par correspondance des racines (Module2)";
  lienRacine.style.cssText = `
    padding: 6px 10px; background:var(--zc-popup-link-soft); border:1px solid var(--zc-border);
    border-radius: 999px; font-size: 14px; line-height: 1; user-select: text;
    text-decoration: none; cursor: pointer; display: inline-block; direction: auto;
    color: var(--zc-popup-link);
  `;
  lienRacine.textContent = `📖 ${String(racine || "")}`;
  lienRacine.addEventListener("click", (e) => {
    e.preventDefault();
    const inp = document.getElementById("mot");
    if (inp) inp.value = String(racine || "");
    if (typeof moduleSALAT === "function") moduleSALAT();
  });

  const lienLexique = document.createElement("a");
  lienLexique.href = "#";
  lienLexique.title = "Menu contextuel";
  lienLexique.className = "zc-popup-ctx-tab";
  lienLexique.textContent = `☰`;
  lienLexique.addEventListener("click", (e) => {
    e.preventDefault();
    if (typeof window.zcCtxFillMot === "function") window.zcCtxFillMot(String(racine || ""));
    else {
      const inp = document.getElementById("mot");
      if (inp) inp.value = String(racine || "");
    }
    if (typeof window.zcShowSelectionContextMenuForWord === "function") {
      window.zcShowSelectionContextMenuForWord(String(racine || ""), lienLexique);
    }
  });

  // Nombres
  const nbFormes = Array.isArray(mots) ? mots.length : 0;
  const totalOcc = (typeof totalOccParam === "number")
    ? totalOccParam
    : (Array.isArray(mots)
      ? mots.reduce((s, it) => s + (Array.isArray(it) ? (it[1] || 0) : 1), 0)
      : 0);

  const countVariants = document.createElement("span");
  countVariants.dir = "ltr";
  countVariants.style.cssText = "font-weight:600;color:var(--zc-text);";
  countVariants.textContent = `${nbFormes}/${totalOcc} variants`;

  // Audio (racine)
  function createAudioLink(txt, label) {
    const a = document.createElement("a");
    a.href = "#";
    a.title = label || "Lire";
    a.setAttribute("aria-label", label || "Lire");
    a.style.cssText = `margin-left:4px; text-decoration:none; cursor:pointer;`;
    if (document.querySelector(".fas.fa-volume-up") || (window.FontAwesome && window.FontAwesome.dom)) {
      a.innerHTML = `<i class="fas fa-volume-up" aria-hidden="true"></i>`;
    } else {
      a.textContent = "🔊";
    }
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const langue = (typeof getLngVoix === "function") ? getLngVoix("ar") : (window.lngVoixAR || "ar");
      const vitesse = (typeof getVitesseVoix === "function") ? getVitesseVoix("ar") : 1.0;
      if (typeof lireTexte === "function") {
        try { lireTexte(String(txt), langue, vitesse); } catch (err) { console.error(err); }
      } else {
        console.warn("lireTexte(txt, langue, vitesse) n'est pas défini.");
      }
    });
    return a;
  }
  const lienAudioRacine = createAudioLink(racine, `Lire la racine ${racine}`);

  // Bouton fermer
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.innerHTML = "✖";
  closeBtn.setAttribute("title", "Fermer");
  closeBtn.setAttribute("aria-label", "Fermer");
  closeBtn.className = "close-btnStatRacines";
  closeBtn.addEventListener("click", () => close());

  const titleCenter = document.createElement("div");
  titleCenter.id = titleId;
  titleCenter.textContent = "🧩Déclinaisons";
  titleCenter.style.cssText =
    "flex:1 1 auto;text-align:center;font-weight:600;font-size:1rem;color:var(--zc-text);";

  const row1 = document.createElement("div");
  row1.className = "zc-popup-header-actions";
  row1.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px;";
  row1.append(lienLexique, titleCenter, closeBtn);

  const lblRacine = document.createElement("span");
  lblRacine.textContent = "Racine:";
  lblRacine.style.cssText = "font-weight:600;color:var(--zc-text);";

  const row2 = document.createElement("div");
  row2.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;";
  row2.append(lblRacine, lienRacine, lienAudioRacine, countVariants);

  header.append(row1, row2);

  // --- Corps (scroll dans la hauteur max du shell)
  const body = document.createElement("div");
  body.style.cssText =
    "flex:1 1 auto;min-height:0;min-width:0;overflow:auto;padding:12px;";

  const list = document.createElement("div");
  list.style.cssText = `
    display: flex; flex-direction: column; gap: 8px; align-items: stretch;
  `;

  const lngVoixAR = (typeof getLngVoix === "function") ? getLngVoix("ar") : (window.lngVoixAR || "ar");

  // utilitaire échappement
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  for (const item of (mots || [])) {
    const isArr = Array.isArray(item);
    const w = isArr ? item[0] : item;
    const n = isArr ? item[1] : undefined;
    const t = isArr ? item[2] : undefined;

    const wHTML = esc(w);
    const tHTML = esc(t);

    const chip = document.createElement("div");
    chip.style.cssText = `
      padding: 8px 10px; background:var(--zc-popup-link-soft); border:1px solid var(--zc-border);
      border-radius: 12px; font-size: 14px; line-height: 1.35;
      user-select: text; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      direction: auto;
    `;

    // Lien MOT → recherche libre
    const lienMot = document.createElement("span");
    lienMot.style.cssText = "color:inherit;";
    lienMot.innerHTML = `${wHTML}${tHTML ? ` <span style="font-weight:500;">(${tHTML})</span>` : ``}`;

    const lienMenuCtx = document.createElement("a");
    lienMenuCtx.href = "#";
    lienMenuCtx.title = "Menu contextuel";
    lienMenuCtx.className = "zc-popup-ctx-tab";
    lienMenuCtx.textContent = "☰";
    lienMenuCtx.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof window.zcCtxFillMot === "function") window.zcCtxFillMot(String(w));
      else {
        const inp = document.getElementById("mot");
        if (inp) inp.value = String(w);
      }
      if (typeof window.zcShowSelectionContextMenuForWord === "function") {
        window.zcShowSelectionContextMenuForWord(String(w), lienMenuCtx);
      }
    });

    // Audio (mot)
    const lienAudioMot = document.createElement("a");
    lienAudioMot.href = "#";
    lienAudioMot.title = "Lire le mot";
    lienAudioMot.innerHTML = `<i class="fas fa-volume-up" aria-hidden="true"></i>`;
    lienAudioMot.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof lireTexte === "function") lireTexte(String(w), lngVoixAR, 1.0);
    });

    const strong = document.createElement("b");
    strong.appendChild(lienMot);

    chip.appendChild(strong);
    chip.appendChild(lienMenuCtx);
    chip.appendChild(document.createTextNode(" "));
    chip.appendChild(lienAudioMot);

    if (typeof n === "number") {
      const spanN = document.createElement("span");
      spanN.dir = "ltr";
      spanN.title = `${n} occurrence(s)`;
      spanN.setAttribute("aria-label", `${n} occurrence(s)`);
      spanN.style.cssText = "font-size:12px;color:var(--zc-text-muted);";
      spanN.textContent = `(${n})`;
      chip.appendChild(document.createTextNode(" "));
      chip.appendChild(spanN);
    }

    list.appendChild(chip);
  }

  body.appendChild(list);

  // --- Footer
  const footer = document.createElement("div");
  footer.style.cssText = `
    flex-shrink: 0;
    padding: 8px 14px; background: var(--zc-ui-soft-bg); border-top: 1px solid var(--zc-border);
    font-size: 12px; color: var(--zc-text-muted);
  `;
  footer.textContent = `Correspondance par positions : colonne 7 (racines) ↔ colonne 2 (mots). Doublons supprimés.`;

  popup.appendChild(header);
  popup.appendChild(body);
  popup.appendChild(footer);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // --- Accessibilité & UX (fermetures)
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  function close() {
    document.body.style.overflow = prevOverflow || "";
    overlay.remove();
    if (lastFocused && typeof lastFocused.focus === "function") {
      try { lastFocused.focus(); } catch (_) { }
    }
  }

  // Fermer au clic en dehors
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // Stopper la propagation dans le popup
  popup.addEventListener("click", (e) => e.stopPropagation());

  // ESC pour fermer
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });

  // Focus initial
  const lastFocused = document.activeElement;
  setTimeout(() => {
    try { closeBtn.focus(); } catch (_) { }
  }, 0);
}
