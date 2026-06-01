/*
var ponctuation = "ۓےۗۖ٩٨٧٦٥٤٣٢١۠۟٠۞٭۩۝܍܌܋܊܉܈܇܆܅܄܃܂܁۔٬٫٪ًٌٍَُِّْٜۭٟٕۣ۪ٞٝٛٚٙ٘ۢۨٓۧٔۘۜۚۡۤۦۙۥٖ۫ٗۛްޯޮޭެޫުީިާަܾܻܷܴܱ݆݄ܼܹܸ݈݂݊݉ܽܺܶܳܰ݅݃ܿܵܲ݇݁݀۬ـ" + "ٰ";
//var caracterepetitAlif = "ٰ";
//ponctuation = ponctuation.replace(caractereChedda, "");

// Fonction pour afficher/masquer le message d'avertissement
function toggleMessage() {
  var warningFR = document.getElementById('warningMessageFR');
  if (warningFR.style.display === 'none') {
    warningFR.style.display = 'block';
  } else {
    warningFR.style.display = 'none';
  }
}
*/
// var lettresAccepteesLexique = new RegExp(`[^${lettresAccepteesArabe}${lettresAccepteesLatin}0-9-#.$ ]`, 'g');
// var couleur = '<span style="color:red">';
// var finCouleur = '</span>';

// --- Helpers de sécurisation (non invasifs) ---
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Fallbacks doux si non fournis ailleurs (n'écrasent rien d'existant)
if (typeof couleur === 'undefined') { var couleur = '<span class="rouge">'; }
if (typeof finCouleur === 'undefined') { var finCouleur = '</span>'; }

function containsExactNumber(commentaire, input) {
  const inputString = String(input);
  const safe = escapeRegExp(inputString); // sécurise l'input dans la RegExp
  const regex = new RegExp(`(^|\\s)${safe}(\\s|$)`, 'g');
  return regex.test(commentaire);
}

function lexiqueContainsWholeWord(haystack, needle) {
  const n = String(needle || "").trim();
  if (!n) return false;
  const re = new RegExp("(^|[^\\p{L}\\p{N}_])" + escapeRegExp(n) + "($|[^\\p{L}\\p{N}_])", "iu");
  return re.test(String(haystack || ""));
}

function lexiqueGetSearchPrefs() {
  if (typeof window.zcGetSearchPrefs === 'function') {
    try { return window.zcGetSearchPrefs(); } catch (_) { }
  }
  return {
    me: !!window.paramRechercheMotEntier,
    mc: (typeof isOrdreContiguActive === 'function')
      ? !!isOrdreContiguActive()
      : !!document.getElementById('ordreExactCheckbox')?.checked
  };
}

function lexiqueMatchesByPrefs(haystack, query, prefs) {
  const text = String(haystack || "");
  const q = String(query || "").trim();
  if (!q) return true;
  const meOn = !!(prefs && prefs.me);
  const mcOn = !!(prefs && prefs.mc);
  if (mcOn) return meOn ? lexiqueContainsWholeWord(text, q) : text.includes(q);
  const tokens = q.split(/\s+/).map((t) => t.trim()).filter(Boolean);
  if (!tokens.length) return true;
  if (meOn) return tokens.every((t) => lexiqueContainsWholeWord(text, t));
  return tokens.every((t) => text.includes(t));
}

function colorerMotLexiqueSelonPrefs(texteOriginal, inputBrut, prefs) {
  const src = String(texteOriginal || "");
  const raw = String(inputBrut || "").trim();
  if (!src || !raw) return src;
  const meOn = !!(prefs && prefs.me);
  const mcOn = !!(prefs && prefs.mc);
  const terms = mcOn ? [raw] : Array.from(new Set(raw.split(/\s+/).map((t) => t.trim()).filter(Boolean)));
  let out = src;
  for (const term of terms) {
    if (!term) continue;
    if (!meOn) {
      out = colorerMot1(out, term);
      continue;
    }
    const rx = new RegExp("(^|[^\\p{L}\\p{N}_])(" + escapeRegExp(term) + ")(?=$|[^\\p{L}\\p{N}_])", "giu");
    out = out.replace(rx, (_m, g1, g2) => String(g1 || "") + couleur + String(g2 || "") + finCouleur);
  }
  return out;
}

// --- Cache du lexique normalisé pour accélérer moduleLexique ---
// Structure: Array<{ motOriginal, commentaireOriginal, motSansP, commSansP, racineTexte, racineAttr }>
// Helper construit dans Zoom-Coran.js

function moduleLexique() {
  // 🧹 Nettoyer la toolbar multi-versets si elle existe encore
  try {
    const toolbarZone = document.getElementById('toolbarPageMulti');
    if (toolbarZone && toolbarZone.parentNode) {
      toolbarZone.parentNode.removeChild(toolbarZone);
    }
  } catch (e) {
    console.warn('Impossible de retirer toolbarPageMulti :', e);
  }

  let input = document.getElementById('mot').value;
  input = input.split('-')[0];
  //input = input.replace(/\+/g, " ");
  if (input === "") input = "بسم الله";
//console.log("INPUT0= "+input);
  //detecterAwy();
  //input = dedoubleSheddaSafe(input);
//console.log("INPUT1= "+input);
  let inputNet = nettoyerTexteMixte(input,true);
  inputNet = inputNet.trim();
	input=inputNet;
  const prefs = lexiqueGetSearchPrefs();
//console.log("INPUT2= "+input);
  if (input.length < 3) {
    alertMsgBoxTemp(input + " <3 caractères");
    return 0;
  }

  // --- Gestion langue des commentaires (multi-lang)
  if (!Number.isInteger(lngCom)) {
    lngCom = 3;
    try { localStorage.setItem('lngCom', String(lngCom)); } catch { }
  }
  const sel = document.getElementById('Traduction');
  const nomTraducteur = sel ? (sel.options[sel.selectedIndex]?.text || '').trim() : '';
  let txtCommentaires = (nomTraducteur === 'No Comment') ? `` : nomTraducteur;
  if (txtCommentaires === '@everyone - Lexique') txtCommentaires = '';
  const inlineTradTitle = (typeof window.zcFormatTraductionPickerFullTitle === 'function')
    ? window.zcFormatTraductionPickerFullTitle()
    : 'Choisir la source des commentaires';
  function getInlineTradHtml(refKey, idx) {
    if (typeof renderInlineTraductionSelect === 'function') {
      return `<span class="zc-result-traducteur" style="display:block;margin-top:2px;color:#64748b;font-size:0.88em;">${
        renderInlineTraductionSelect({
          id: `zcTradInlineLex_${String(refKey || '').replace(/[^\w.-]/g, '_')}_${idx}`,
          className: 'zc-result-trad-select',
          style: 'max-width:100%;font-size:0.98em;',
          title: inlineTradTitle,
          sourceKind: 'lexique'
        })
      }</span>`;
    }
    return txtCommentaires
      ? `<span class="zc-result-traducteur" style="display:block;margin-top:2px;color:#64748b;font-size:0.88em;">${txtCommentaires}</span>`
      : '';
  }

  const tabLexique = (typeof fTabLexique === "function") ? fTabLexique() : [];
  const tabVersets = (typeof fTabVersets === "function") ? fTabVersets() : [];
  const max = 100;

  let compteurLignes = 0;
  let compteurLexique = 0;
  let compteurAyas = 0;
  const lignesHTML = [];
  const estNombre = detecterNombre(inputNet);

  // Historik (même gabarit que afficherPageMulti) : injecté dans progEnCours.
  let inputHistoric = '';
  if (typeof renderButtonHistorik === 'function') {
    inputHistoric = `
      ${renderButtonHistorik({
        id: 'btnHistorikFromLexiqueZ3',
        style: 'padding:4px 8px; font-size:12px; flex:0 0 auto;',
        chercheMode: 4,
        withLoupe: true
      })}`;
  }

  // ==== LEXIQUE (optimisé avec cache) ====
  const lexiqueCache = getLexiqueCache(); // tableau déjà normalisé

  for (const entry of lexiqueCache) {
    const {
      motOriginal,
      commentaireOriginal,
      motSansP,
      commSansP,
      racineTexte,
      racineAttr
    } = entry;

    // Filtre sur texte nettoyé
    const fullHaystack = String((motSansP || "") + " " + (commSansP || ""));
    if (lexiqueMatchesByPrefs(fullHaystack, inputNet, prefs) && motSansP !== "" && commSansP !== "") {
      // Si on cherche un nombre, on vérifie le nombre exact
      if (estNombre && !containsExactNumber(commSansP, inputNet)) continue;

      compteurLignes++;
      compteurLexique++;

      // ⚠️ ON PASSE L’INPUT BRUT POUR LE COLORIAGE
      const motCoul = colorerMotLexiqueSelonPrefs(motOriginal, input, prefs);
      const commCoul = colorerMotLexiqueSelonPrefs(commentaireOriginal, input, prefs);

      // Ajout icônes
      const commentaireHTML = nettoyerCommentairePourHtml(commCoul);
      const defForOnclick = String(commentaireOriginal || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\n/g, "\\n");
      const canReadDef = Number(lngCom) !== 0 && String(commentaireOriginal || "").trim() !== "";
      const audioLinkDef = canReadDef ? `<a href="#"
           onclick="lireTexte('${defForOnclick}', '${getLngVoix(lngCom)}', 1.0); event.preventDefault();"
           title="Lire la définition">🔊</a>` : "";

      // Liens / actions (on réutilise racineAttr du cache)
      const lienZoomRacine = `
        <a href="#"
           onclick="document.getElementById('mot').value='${racineAttr}'; ChercheMotsMain(2); return false;"
           title="Recherche dans le Coran par correspondance des racines">
           ${motCoul} 📖
        </a>`;

      const lienLireTexte = `
        <a href="#"
           onclick="lireTexte('${racineAttr}', (window.lngVoixAR || 'ar-SA'), 1.0); return false;"
           title="Lire racine">
           <i class="fas fa-volume-up" aria-hidden="true"></i>
        </a>`;

      const lienMenuCtx = `
        <a href="#"
           class="zc-popup-ctx-tab"
           onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${racineAttr}'); } else { document.getElementById('mot').value='${racineAttr}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${racineAttr}', this); } return false;"
           title="Menu contextuel">☰
        </a>`;

      lignesHTML.push(`
        <div class="zc-record-languette zc-record-languette--lexique">
        <p dir="ltr" style="text-align:center;color:green;">
          <span>(${compteurLignes})</span>
          ${lienZoomRacine}&nbsp;
          ${lienLireTexte}&nbsp;
          ${lienMenuCtx}
        </p>
        <div class="zc-record-languette__body" dir="ltr">
          ${canReadDef ? `<hr/>${audioLinkDef}&nbsp;` : ``}${commentaireHTML}
        </div>
        </div>
      `);
    }
  }

  const escAyaAr = (s) => (typeof escapeHtml === 'function'
    ? escapeHtml(String(s ?? ''))
    : String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const blocVersetArabe = (v) => {
    const ar = String(v[2] ?? '').trim();
    if (!ar) return '';
    return `<div class="zc-lexique-verset-arabe" dir="rtl" style="text-align:right;margin:0 0 0.35em;font-size:1.05em;line-height:1.55;">${escAyaAr(ar)}</div>` +
      `<hr class="zc-lexique-sep-ar-comment" aria-hidden="true" style="border:0;border-top:1px solid #cbd5e1;margin:0.4em 0 0.55em;" />`;
  };

  const lngVoixAy = (typeof getLngVoix === 'function') ? getLngVoix(7) : 'ar-SA';
  /** Référence puis PDF, audio, sélection (comme Zoom 0), puis ☰ */
  function lexiqueToolbarAyaHtml(v, compteurLignes, cleCoul, commentaireBrut) {
    const refKey = `${v[0]}.${v[1]}`;
    let srcAr = String(v[2] ?? '');
    if (typeof decodeTexte === 'function') srcAr = decodeTexte(srcAr);
    const textePourAudioAr = String(srcAr).replace(/<[^>]*>/g, '').replace(/'/g, '’');
    const escAudio = textePourAudioAr.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, "\\n");
    let commCopy = String(commentaireBrut || '').replace(/'/g, '’').replace(/"/g, '”');
    if (typeof nettoyerCommentairePourHtml === 'function') commCopy = nettoyerCommentairePourHtml(commCopy);
    const arCopy = typeof nettoyerCommentairePourHtml === 'function'
      ? nettoyerCommentairePourHtml(String(v[2] || ''))
      : escAyaAr(v[2]);
    const payload = `[#${v[0]}.${v[1]}] &nbsp; ${arCopy}<br>----<br>${commCopy}<br>${txtCommentaires}`;
    const isSel = (typeof _isRefSelected === 'function') ? _isRefSelected(refKey) : false;
    const warshArg = (v[8] != null && String(v[8]).trim() !== '')
      ? String(v[8]).replace(/'/g, "\\'")
      : refKey.replace(/'/g, "\\'");
    const cbId = `lex_aya_${v[0]}_${v[1]}`;
    return `<div class="zc-lexique-aya-head zc-result-card-head" dir="ltr" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;color:#2563eb;margin:0 0 6px;">
      <a href="#" onclick="moduleSourat(${v[0]}, ${v[1]}); return false;" title="Voir verset" style="color:inherit;">
        (${compteurLignes}) &nbsp;${cleCoul} 📖
      </a>
      <a href="#" onclick="document.getElementById('mot').value='${refKey}'; moduleWarsh('${warshArg}'); return false;" title="Afficher page Warsh">
        <i class="fas fa-file-pdf" aria-hidden="true"></i>
      </a>
      <a href="#" onclick="lireTexte('${escAudio}', '${lngVoixAy}', 1.0); event.preventDefault();" title="Lire ce verset">
        <i class="fas fa-volume-up" aria-hidden="true"></i>
      </a>
      <label class="bouton zc-result-copy-sel" title="Copier versets multiples">
        <i class="fas fa-copy" aria-hidden="true"></i>
        <input type="checkbox" id="${cbId}" data-ref="${refKey}"
          data-texte-html="${encodeURIComponent(payload)}"
          ${isSel ? 'checked' : ''}
          onclick="copierTexteTabSelection(this.id, this.dataset.ref, decodeURIComponent(this.dataset.texteHtml), 0); event.stopPropagation();">
      </label>
      <a href="#" class="zc-popup-ctx-tab"
         onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${refKey}'); } else { document.getElementById('mot').value='${refKey}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${refKey}', this); } return false;"
         title="Menu contextuel">☰</a>
    </div>`;
  }

  // ==== VERSETS ====
  for (const v of tabVersets) {
    const cle = `${v[0]}.${v[1]}`;
    let commentaireLX = typeof v[3] === 'string' ? v[3] : "";
    let commentaireBrut = typeof v[lngCom] === 'string' ? v[lngCom] : "";
    if (lngCom != 3) {
      if (commentaireLX) { commentaireLX = commentaireLX + '\n----\n'; }
      commentaireBrut = commentaireLX + commentaireBrut;
    }
    const commentaireNet = nettoyerTexteMixte(commentaireBrut.trim() || "");
    const defForOnclickAya = String(commentaireBrut || "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n");
    const canReadDefAya = Number(lngCom) !== 0 && String(commentaireBrut || "").trim() !== "";
    const audioLinkDefAya = canReadDefAya ? `<a href="#"
        onclick="lireTexte('${defForOnclickAya}', '${getLngVoix(lngCom)}', 1.0); event.preventDefault();"
        title="Lire la définition">🔊</a>` : "";

    // Cas 1 : clé exacte
    if (cle === input && cle !== "") {
      compteurLignes++;
      compteurAyas++;

      const cleCoul = colorerMotLexiqueSelonPrefs(cle, input, prefs);
      const commentaireCoul = colorerMotLexiqueSelonPrefs(commentaireBrut, input, prefs) || "Aucun commentaire";

      lignesHTML.push(`
        <div class="zc-record-languette zc-record-languette--aya">
        ${lexiqueToolbarAyaHtml(v, compteurLignes, cleCoul, commentaireBrut)}
        <div class="zc-record-languette__body" dir="ltr">
          ${blocVersetArabe(v)}${canReadDefAya ? `<hr/>${audioLinkDefAya}&nbsp;` : ``}${nettoyerCommentairePourHtml(commentaireCoul)}${getInlineTradHtml(cle, compteurLignes)}
        </div>
        </div>
      `);
      continue;
    }

    // Cas 2 : on cherche dans le commentaire net
    if (commentaireNet && lexiqueMatchesByPrefs(commentaireNet, inputNet, prefs)) {
      // Si input est un nombre, on vérifie la présence exacte
      if (estNombre && !containsExactNumber(commentaireNet, inputNet)) continue;

      compteurLignes++;
      compteurAyas++;

      const cleCoul = colorerMotLexiqueSelonPrefs(cle, input, prefs);
      const commentaireCoul = colorerMotLexiqueSelonPrefs(commentaireBrut, input, prefs) || "Aucun commentaire";

      lignesHTML.push(`
        <div class="zc-record-languette zc-record-languette--aya">
        ${lexiqueToolbarAyaHtml(v, compteurLignes, cleCoul, commentaireBrut)}
        <div class="zc-record-languette__body" dir="ltr">
          ${blocVersetArabe(v)}${canReadDefAya ? `<hr/>${audioLinkDefAya}&nbsp;` : ``}${nettoyerCommentairePourHtml(commentaireCoul)}${getInlineTradHtml(cle, compteurLignes)}
        </div>
        </div>
      `);
    }
  }

  // ==== AFFICHAGE ==== (gabarit identique à afficherPageMulti — mots-coran.js : zcPreparePopupResultatsShell)
  const shell =
    typeof window.zcPreparePopupResultatsShell === "function"
      ? window.zcPreparePopupResultatsShell(3)
      : null;
  if (!shell) return;
  const { container, body } = shell;

  body.innerHTML = "";

  const htmlLimite = lignesHTML.slice(0, max).join("");
  body.innerHTML = htmlLimite;

  if (compteurLignes > max) {
    const btnAfficherTout = document.createElement("button");
    btnAfficherTout.innerHTML = `Afficher les ${compteurLignes} entrées<br>`;
    btnAfficherTout.className = "btn-afficher-tout";
    btnAfficherTout.onclick = () => {
      body.innerHTML = lignesHTML.join("");
      btnAfficherTout.remove();
    };
    body.appendChild(btnAfficherTout);
  }

  // ----- Barre d’info + cases à cocher (Mot entier / Mots contigus) -----

  const getChk = id => !!document.getElementById(id)?.checked;

  const lblAlif = (() => {
    const base = `[و/ي/ى/ا | a o u i e → ø]`;
    const cible = (typeof awy !== 'undefined' && awy) ? awy : "";
    return cible
      ? `[و/ي/ى/ا | a o u i e → ${cible}]`
      : base;
  })();
  console.log("Transformée de caractères: " + lblAlif);

  // Libellé "Mot entier" localisé
  let labelModeMot = localizedMotEntier();
  labelModeMot = '[' + labelModeMot + ']';

  // Libellé "Mots contigus" localisé
  const motsContigusLabel = localizedMotsContigus();

  // État global "Mot entier" (comme dans chercheExpressionMultiLingue)
  const useExact = !!prefs.me;

  // État global "mots contigus" (ordre & contiguïté → interprété comme contiguïté seule)
  const motsContiguous = !!prefs.mc;

  const exactOn = !!useExact;

  const contigOn = (typeof isOrdreContiguActive === 'function')
    ? !!isOrdreContiguActive()
    : !!motsContiguous;

  // Raccourcir le label pour l’affichage
  input = shortenLabel(input || '');
  const inputEsc = escapeHtml(input);
  const escTA = (typeof zcEscapeHtmlAttr === 'function')
    ? (s) => zcEscapeHtmlAttr(String(s || ''))
    : (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const titleME = escTA((typeof window.zcI18nTitleForId === 'function')
    ? window.zcI18nTitleForId('labelRechercheMotEntier', labelModeMot.replace(/^\[|\]$/g, ''))
    : labelModeMot);
  const titleMC = escTA((typeof window.zcI18nTitleForId === 'function')
    ? window.zcI18nTitleForId('labelOrdreExactCheckbox', motsContigusLabel)
    : motsContigusLabel);

  progEnCours = `📒 Zoom 3 > Lexique @everyone <br>
    <div class="toolbar1 zc-lexique-popup-motline zc-popup-zoom-motline">
      Mots == 
      <span class="rouge">
        <a href="#"
           class="zc-popup-mot-hit"
           onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${inputEsc}'); } else { document.getElementById('mot').value='${inputEsc}'; } return false;"
           style="text-decoration:underline;">${inputEsc}</a>
      </span><a href="#"
           class="zc-popup-ctx-tab"
           onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${inputEsc}'); } else { document.getElementById('mot').value='${inputEsc}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${inputEsc}', this); } return false;"
           title="Menu contextuel">☰</a>&nbsp;
    </div>
    <div class="toolbar zc-popup-header-tools-row zc-popup-header-tools-row--uniform zc-popup-zoom-params-frame">
      <button type="button"
        class="zc-popup-toggle-btn ${exactOn ? 'is-on' : ''}"
        data-zc-pref-toggle="me"
        title="${titleME}"
        aria-label="${titleME}"
        onclick="if(window.applyToolbarParamChange)window.applyToolbarParamChange('exact', ${exactOn ? 'false' : 'true'}); return false;">ME</button>
      <button type="button"
        class="zc-popup-toggle-btn ${contigOn ? 'is-on' : ''}"
        data-zc-pref-toggle="mc"
        title="${titleMC}"
        aria-label="${titleMC}"
        onclick="if(window.applyToolbarParamChange)window.applyToolbarParamChange('contig', ${contigOn ? 'false' : 'true'}); return false;">MC</button>
      ${inputHistoric}
    </div>
    <div class="zc-popup-zoom-copy-tools zc-popup-zoom-copy-tools--labeled zc-popup-zoom-copy-tools--linkrow" role="group" aria-label="Sélection versets">
      <button type="button" class="bouton zc-popup-zoom-sel-btn"
        title="Copier tout"
        onclick="if (typeof copierTousVersetsAffiches === 'function') copierTousVersetsAffiches('popupResultatsBodyZ3'); return false;">
        <i class="fas fa-copy" aria-hidden="true"></i>
        <span class="zc-popup-zoom-sel-label">Copier tout</span>
      </button>
      <button type="button" class="bouton zc-popup-zoom-sel-btn"
        title="Copier sélection"
        onclick="if (typeof copySelectedVersesAsRich === 'function') copySelectedVersesAsRich(); return false;">
        <i class="fas fa-copy" aria-hidden="true"></i>
        <span class="zc-popup-zoom-sel-label">Copier sélection</span>
        <span class="badgeSel zc-popup-zoom-sel-badge" id="badgeSelectMultiVersetsZ3"
          title="Nombre d’éléments sélectionnés">${(typeof tabSelectMultiVersets !== 'undefined' && tabSelectMultiVersets) ? tabSelectMultiVersets.length : 0}</span>
      </button>
      <button type="button" class="bouton zc-popup-zoom-sel-btn"
        title="Effacer la sélection"
        onclick="if (typeof viderSelectionVersets === 'function') viderSelectionVersets(); return false;">
        <i class="fas fa-paint-brush" aria-hidden="true"></i>
        <span class="zc-sr-only">Effacer sélection</span>
      </button>
    </div>
  `;

  totalMotsTrouves = compteurLignes;
	if(totalMotsTrouves>0){
		if (typeof sauvegarderMot === "function") try { sauvegarderMot(); } catch { }
	}
	//if(!totalMotsTrouves) {ouvrirLienExterne('3');return;}//en dernier recours, chercher dans Articles
  progEnCours +=
    `<div class="zc-popup-zoom-stats-lines">` +
    `${compteurLignes} enregistrement(s)<br>` +
    `${compteurLexique} entrée(s) Lexique / ${tabLexique.length - 1}<br>` +
    `${compteurAyas} aya(s) / ${tabVersets.length - 1} versets` +
    `</div>`;
  const progBody = String(progEnCours || "").replace(/^[\s\S]*?<br>\s*/i, "");
  const infosEl = document.getElementById("infosProgEnCoursZ3");
  if (infosEl) {
    infosEl.innerHTML = progBody;
    try {
      // Sécurité anti-doublon: conserver une seule rangée ME/MC/Livre/H dans l'entête Lexique.
      const rows = infosEl.querySelectorAll(".zc-popup-header-tools-row");
      if (rows.length > 1) {
        for (let i = 1; i < rows.length; i++) {
          try { rows[i].remove(); } catch (_) { }
        }
      }
    } catch (_) { }
    try { if (typeof window.syncTraductionPickerButtonLabels === 'function') window.syncTraductionPickerButtonLabels(); } catch (_) { }
    try { if (typeof window.syncParamTogglesChrome === 'function') window.syncParamTogglesChrome(); } catch (_) { }
    try { if (typeof _updateBadges === 'function') _updateBadges(); } catch (_) { }
  }
  try {
    const oldTools = document.getElementById("toolbarPageMulti");
    if (oldTools) oldTools.remove();
  } catch (_) { }
  try {
    // Homogénéité: aucune barre de controls dupliquée dans le body (une seule barre en header).
    body.querySelectorAll(".zc-popup-header-tools-row").forEach((el) => { try { el.remove(); } catch (_) { } });
  } catch (_) { }
  try {
    if (typeof window.zcRaiseResultPopupAboveAll === "function") window.zcRaiseResultPopupAboveAll(3);
    else if (typeof window.zcBringToFront === "function") window.zcBringToFront(container, 0);
  } catch (_) { }
  try {
    const topActions = container?.querySelector(".zc-popup-header-actions");
    if (topActions) {
      let topTitle = topActions.querySelector(".zc-popup-top-title");
      if (!topTitle) {
        topTitle = document.createElement("div");
        topTitle.className = "zc-popup-top-title";
        topActions.appendChild(topTitle);
      }
      const firstLine = String(progEnCours || "").split(/<br\s*\/?>/i)[0] || "";
      topTitle.textContent = firstLine.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "Zoom";
    }
  } catch (_) { }
  try {
    if (typeof window.zcLowerZoom0Below === "function") window.zcLowerZoom0Below(container);
  } catch (_) { }

}



// Helper : détecter si un texte contient des caractères arabes
function isTexteNonArabe(str) {
  if (!str) return true;
  // Plages Unicode arabe principales
  return !/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(str);
}

/**
 * Surlignage robuste SANS décalage, compatible avec:
 * - ligatures (FE → "لا"),
 * - dédoublement de šadda,
 * - diacritiques supprimés,
 * - et points "." injectés par finalizeTokens.
 *
 * Optimisation :
 * - Si texte & motif sont NON arabes → fast path RegExp (pour les traductions).
 *
 * On lui passe toujours l'INPUT BRUT (ce qu'a tapé l'utilisateur).
 */
function colorerMot1(texteOriginal, inputBrut) {
  if (!texteOriginal || !inputBrut) return texteOriginal;

  // ⚡ FAST PATH : textes non arabes (traductions)
  if (isTexteNonArabe(texteOriginal) && isTexteNonArabe(inputBrut)) {
    const motif = String(inputBrut || '').trim();
    if (!motif) return texteOriginal;

    const safe = escapeRegExp(motif);
    const re = new RegExp(safe, 'gi'); // insensible à la casse pour FR/EN/...

    return texteOriginal.replace(re, match => `${couleur}${match}${finCouleur}`);
  }

  // 🧠 PATH COMPLET pour l’arabe (ou mix arabe/latin)

  // 1) Nettoyages complets
  const netFullRaw = nettoyerTexteMixte(texteOriginal);
  const motifRaw   = nettoyerTexteMixte(inputBrut);

  // 2) Neutralise les points fantômes pour l'indexation
  const netFull = netFullRaw.replace(/\./g, '');
  const motif   = motifRaw.replace(/\./g, '');

  if (!motif) return texteOriginal;

  // 3) Recherche dans le texte nettoyé
  const startNet = netFull.indexOf(motif);
  if (startNet === -1) return texteOriginal;
  const endNet = startNet + motif.length; // non inclus

  // 4) Carte cumulative des longueurs nettoyées (sans '.')
  const prefixLen = new Array(texteOriginal.length);
  for (let i = 0; i < texteOriginal.length; i++) {
    const slice = texteOriginal.slice(0, i + 1);
    const ln = nettoyerTexteMixte(slice).replace(/\./g, '').length;
    prefixLen[i] = ln;
  }

  // 5) Bornes dans l’original
  let startOrig = -1;
  let endOrig   = -1;

  const needStart = startNet + 1; // 1-based
  for (let i = 0; i < prefixLen.length; i++) {
    if (prefixLen[i] >= needStart) { startOrig = i; break; }
  }
  for (let i = 0; i < prefixLen.length; i++) {
    if (prefixLen[i] >= endNet) { endOrig = i; break; }
  }

  if (startOrig === -1 || endOrig === -1) return texteOriginal;

  const avant = texteOriginal.slice(0, startOrig);
  const match = texteOriginal.slice(startOrig, endOrig + 1);
  const apres = texteOriginal.slice(endOrig + 1);

  return `${avant}${couleur}${match}${finCouleur}${apres}`;
}
