async function rechargerScript(src, id) {//utilisé par enregistrer
  return new Promise((resolve, reject) => {
    // Supprimer l'ancien script s'il existe
    const ancienScript = document.getElementById(id);
    if (ancienScript) {
      ancienScript.remove();
    }

    // Créer et insérer le nouveau script
    const script = document.createElement('script');
    script.src = src;
    script.id = id;
    script.onload = () => resolve(`✅ Script ${id} rechargé.`);
    script.onerror = () => reject(new Error(`🚫 Échec du chargement de ${id}`));
    document.head.appendChild(script);
  });
}


// Fonction pour mettre à jour le texte en fonction de la langue
function msgUser(messages) {
  const langMessages = { fr: messages.fr, ar: messages.ar, en: messages.en, kab: messages.kab, es: messages.es };
  return langMessages[userLang] || messages.fr;
}


// Exemple d'utilisation
/*
var msg = msgUser({
    fr: 'Bienvenue !',
    ar: 'مرحبا!',
    en: 'Hello!',
    es: '¡Hola!'
});
*/


////////////////////////////////////////////////////<script>

function demandeAya(input) {
  // Vérifie si 'input' satisfait la condition de 'detecterNombre'
  if (detecterNombre(input)) {
    // Charge le tableau de versets
    var tabVersets = fTabVersets();

    // Parcourt le tableau pour trouver une correspondance
    for (var i = 0; i < tabVersets.length; i++) {
      var mot = tabVersets[i][0] + "." + tabVersets[i][1];

      // Si une correspondance est trouvée, remplace 'input' par la valeur associée
      if (mot === input) {
        input = tabVersets[i][2];
        break; // Sort de la boucle dès qu'une correspondance est trouvée
      }
    }
    // Libération de la mémoire (optionnelle)
    tabVersets = null;
  }

  // Retourne la valeur de 'input'
  return input;
}
function ouvrirLienExterne(nL) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const target = isIOS ? '_blank' : '_popup';

  let texte0 = document.getElementById('mot').value.toLowerCase();
	let texte=texte0;
  texte = demandeAya(texte);
  const estArabeMot = detecterLangueTexte(texte);
  const estNombre = typeof detecterNombre === "function" ? detecterNombre(texte) : false;
  let url = '';
	//if (typeof sauvegarderMot === "function") try { sauvegarderMot(); } catch { }
  switch (nL) {
    case '1': // Reverso contexte
      if (estArabeMot || estNombre) {
        url = 'https://context.reverso.net/traduction/arabe-francais/' + texte;
      } else {
        url = 'https://context.reverso.net/traduction/francais-arabe/' + texte;
      }
      break;

    case '2': // Google Translate
      if (estArabeMot || estNombre) {
        url = 'https://translate.google.com/?sl=ar&tl=fr&text=' + texte + '&op=translate';
      } else {
        url = 'https://translate.google.com/?sl=fr&tl=ar&text=' + texte + '&op=translate';
      }
      break;

		case '3': // Blog articlesHtml
			// texte = ce que tu veux voir pré-rempli dans la barre de recherche
			//https://alfamous.ca?prog=articlesHtml&prefil=Racine%20JNH%20(%D8%AC%20%D9%86%20%D8%AD)%20%E2%80%94%20Nos%20%C2%AB%20ailes%20%C2%BB%20int%C3%A9rieures%20et%20les%20programmes%20des%20anges
			window.__articlesPrefilTexte = texte0 || "";  // ⬅️ on mémorise le préfil

			// On ouvre la popup "articlesHtml" comme avant
			url = "articlesHtml";
			ouvrirPopupHtml(url);
			return;
		case '4': // Blog articlesHtml
			// Module Médias intégré (sans page dédiée)
			window.__mediasPrefill = { texte: texte0 || "" };
			ouvrirPopupHtml("medias1");
			return;
		case '5': // Témoignages — module intégré (DOM principal, même collection Firestore)
			window.__temoignagesPrefilTexte = texte0 || "";
			ouvrirPopupHtml("temoignages");
			return;
    default:
      return;
  }

  const newWin = window.open(url, target);

  // Cas iOS : alerter si le lien ne s'est pas ouvert
  if (isIOS && !newWin) {
    alert(tMsg('popupBlocked'));
  }
}

////////////////////////////////////////////////////</script>




////////////////////////////////////////////////////<script>
// Actualiser la page
function partagerLien() {
  var input = document.getElementById('mot').value.trim();
  input = input.replace(/\ /g, "+");
  copierTexte(`https://alfamous.ca?texte=${input}`);
  alertMsgBoxTemp(tMsg('linkCopied', { url: "https://alfamous.ca?texte=" + input }));
  //alertMsgBoxPopup("Lien copié: https://alfamous.ca?texte=" + input);
  //alertMsgBoxPopup("Partagez le lien copié: https://alfamous.ca?texte=" + input)
}

function newInstanceDeZoomCoran() {
  //location.reload();
  //window.open('index.html', '_self');
  lireTexte(texteBienvenue(), userLang, vitesse = 1.0);
  setTimeout(() => location.reload(), 300);
}




////////////////////////////////////////////////////////////////////////
// Compatibilité: affichage du bloc paramètres (désormais bloc autonome)
////////////////////////////////////////////////////////////////////////
function afficherMasquerZoneAdesParametres(visible) {
  const panel = document.getElementById('panelParams');
  if (!panel) return;
  panel.style.display = visible ? '' : 'none';
}

// Gardé pour compatibilité d'anciens appels inline/scripts.
function toggleZoneA() {
  const panel = document.getElementById('panelParams');
  if (!panel) return;
  const hidden = getComputedStyle(panel).display === 'none';
  afficherMasquerZoneAdesParametres(hidden);
}

window.refreshZoneAToggleTitle = function () { };
////////////////////////////////////////////////////////////////////////








//<script>

/* ======= État interne ======= */
let listeSouras = [];   // [{valeur:1, texte:"1.1 Al-Faatiha ...", searchKey:"...", arSearch:"..."}]

/* ======= Utils ======= */
// Normalisation pour la recherche : minuscules, sans accents latins, sans diacritiques arabes
function normalizeForSearch(str) {
  return (str || '')
    .toLowerCase()
    // diacritiques arabes
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // diacritiques latines
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // apostrophes homogènes
    .replace(/[’`]+/g, "'")
    // espaces multiples -> simple
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrait le numéro de sourate et le texte "propre"
function parseListingLine(line) {
  const s = (line || '').trim();
  // On attend un début "#num.1" (le .1 ne nous sert qu'à l'affichage)
  const m = s.match(/^#\s*(\d{1,3})\.\d+\s+(.*)$/);
  if (!m) return null;

  const num = parseInt(m[1], 10);
  // On enlève juste le "#" pour afficher "1.1 ..."
  const texte = s.replace(/^\s*#\s*/, '').replace(/\s{2,}/g, ' ').trim();

  // Optionnel : repérer un bloc arabe dominant (pour enrichir la clé de recherche)
  const arMatch = texte.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*/);
  const ar = arMatch ? arMatch[0] : '';

  return {
    valeur: num,          // numéro de sourate
    texte,                // ex: "1.1 Al-Faatiha الفاتحة The Opening (7Ayas) - Coran des Historiens p.17"
    searchKey: normalizeForSearch(texte),
    arSearch: normalizeForSearch(ar),
  };
}

function buildListeSouras() {
  listeSouras = (listingSourates || [])
    .map(parseListingLine)
    .filter(Boolean);

  // Sécurité : si tableau incomplet, on tronque à 114 max
  if (listeSouras.length > 114) {
    listeSouras = listeSouras.slice(0, 114);
  }
}

function zcMaxVersPourSoura(num) {
  const s = Math.min(114, Math.max(1, parseInt(num, 10) || 1));
  if (typeof nbVers === "function") {
    try {
      const n = nbVers(s);
      if (Number.isFinite(n) && n > 0) return n;
    } catch (_) { }
  }
  if (Array.isArray(window.fTabNomSouraNombreVersets) && Number.isFinite(window.fTabNomSouraNombreVersets[s]))
    return window.fTabNomSouraNombreVersets[s];
  return 286;
}

function filtrerSouraVers() {
  const wrap = document.getElementById("zcSouraVerseSpinWrap");
  const vin = document.getElementById("inputSouraVers");
  const vul = document.getElementById("suggestionsSouraVers");
  if (!wrap || wrap.hasAttribute("hidden") || !vin || !vul) return;
  const maxV = parseInt(wrap.getAttribute("data-max-verse") || "1", 10) || 1;
  const qRaw = String(vin.value || "").trim();
  const onlyDigits = /^\d{0,3}$/.test(qRaw);
  vul.innerHTML = "";
  vul.style.display = "block";
  const anchor = document.querySelector("#zcSouraVerseSpinWrap .zc-soura-verse-input-slot") || vin;
  zcFitSuggestionListToViewport(vul, anchor);
  zcBringToFrontDynamic(vul);
  let rows = [];
  if (qRaw !== "" && !onlyDigits) {
    rows = [1];
  } else {
    const q = onlyDigits ? qRaw : "";
    for (let i = 1; i <= maxV; i++) {
      if (!q || String(i).startsWith(q)) rows.push(i);
    }
    if (rows.length === 0 && q !== "") {
      const parsed = parseInt(q, 10);
      if (Number.isFinite(parsed)) {
        if (parsed < 1) rows = [1];
        else if (parsed > maxV) rows = [maxV];
        else rows = [Math.min(maxV, Math.max(1, parsed))];
      } else {
        rows = [1];
      }
    }
  }
  if (rows.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Aucun verset.";
    vul.appendChild(li);
    return;
  }
  for (let j = 0; j < rows.length; j++) {
    const n = rows[j];
    const li = document.createElement("li");
    li.textContent = String(n);
    li.dataset.v = String(n);
    li.addEventListener("mousedown", function () {
      selectSouraVers(n);
    });
    vul.appendChild(li);
  }
}

function selectSouraVers(v) {
  const wrap = document.getElementById("zcSouraVerseSpinWrap");
  const vin = document.getElementById("inputSouraVers");
  const vul = document.getElementById("suggestionsSouraVers");
  if (!wrap || wrap.hasAttribute("hidden")) return;
  const maxV = parseInt(wrap.getAttribute("data-max-verse") || "1", 10) || 1;
  let vv = parseInt(v, 10);
  if (!Number.isFinite(vv)) return;
  vv = Math.min(maxV, Math.max(1, vv));
  if (vin) vin.value = String(vv);
  if (vul) vul.style.display = "none";
  const num = Number(window.numSourat);
  const mot = document.getElementById("mot");
  if (mot && Number.isFinite(num) && num >= 1 && num <= 114) {
    mot.value = num + "." + vv;
    try {
      mot.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (_) { }
  }
}

function zcTryApplyVerseFromInput() {
  const wrap = document.getElementById("zcSouraVerseSpinWrap");
  const vin = document.getElementById("inputSouraVers");
  if (!wrap || wrap.hasAttribute("hidden") || !vin) return;
  const t = String(vin.value || "").trim();
  if (!/^\d+$/.test(t)) return;
  const vv = parseInt(t, 10);
  if (!Number.isFinite(vv)) return;
  selectSouraVers(vv);
}

function zcHideSouraVerseSpinner() {
  const wrap = document.getElementById("zcSouraVerseSpinWrap");
  const vin = document.getElementById("inputSouraVers");
  const vul = document.getElementById("suggestionsSouraVers");
  if (wrap) {
    wrap.setAttribute("hidden", "");
    wrap.setAttribute("aria-hidden", "true");
  }
  if (vul) {
    vul.style.display = "none";
    vul.innerHTML = "";
  }
  if (vin) vin.value = "";
}

function zcShowSouraVerseSpinner(numSoura, verseOpt) {
  const wrap = document.getElementById("zcSouraVerseSpinWrap");
  const vin = document.getElementById("inputSouraVers");
  const vul = document.getElementById("suggestionsSouraVers");
  if (!wrap || !vin) return;
  const s = Math.min(114, Math.max(1, parseInt(numSoura, 10) || 1));
  const maxV = zcMaxVersPourSoura(s);
  wrap.setAttribute("data-max-verse", String(maxV));
  let v = verseOpt != null ? parseInt(verseOpt, 10) : 1;
  if (!Number.isFinite(v) || v < 1) v = 1;
  if (v > maxV) v = maxV;
  vin.placeholder = "1–" + maxV;
  vin.value = String(v);
  if (vul) {
    vul.style.display = "none";
    vul.innerHTML = "";
  }
  wrap.removeAttribute("hidden");
  wrap.setAttribute("aria-hidden", "false");
}

try {
  window.zcHideSouraVerseSpinner = zcHideSouraVerseSpinner;
  window.zcShowSouraVerseSpinner = zcShowSouraVerseSpinner;
  window.filtrerSouraVers = filtrerSouraVers;
  window.selectSouraVers = selectSouraVers;
} catch (_) { }

function zcSignalSouraCounterReady(lbl) {
  try {
    if (window.__zcSouraCounterReadyDone) return;
    if (!lbl || !lbl.isConnected) return;
    window.__zcSouraCounterReadyDone = true;
    window.dispatchEvent(new CustomEvent("zcSouraCounterReady"));
  } catch (_) { }
}
/* ======= UI : filtrage & sélection ======= */
function filtrerSoura() {
  const input = document.getElementById("inputSoura");
  const ul = document.getElementById("suggestionsSoura");
  const lbl = document.getElementById("nombreSouraTrouvees");

  // n=0 => label vide, sinon "(n)"
  const setCount = (n) => {
    if (lbl) lbl.textContent = Number(n) ? `(${Number(n)})` : '';
    zcSignalSouraCounterReady(lbl);
  };
  const hideList = () => { if (ul) ul.style.display = 'none'; setCount(0); };

  if (!input || !ul) { setCount(0); return; }

  const q = normalizeForSearch(input.value);
  ul.innerHTML = '';
  ul.style.display = 'block';
  zcFitSuggestionListToViewport(ul, document.querySelector("#SelecteurSoura .zc-soura-input-slot") || document.getElementById("SelecteurSoura") || input);
  zcBringToFrontDynamic(ul);

  // Si l’utilisateur tape juste des chiffres, on privilégie le début par numéro
  const onlyDigits = /^\d{1,3}(\.\d+)?$/.test(q);

  let results = listeSouras.filter(item => {
    if (!q) return true;
    if (onlyDigits) {
      // correspondance au début du texte par numéro (ex: "2" ou "2.1")
      return item.texte.startsWith(q) || item.texte.startsWith(q.replace(/\.\d+$/, '') + '.');
    }
    // sinon, recherche plein-texte normalisée (latin + arabe)
    return item.searchKey.includes(q) || item.arSearch.includes(q);
  });

  // Limite d’affichage pour rester fluide
  results = results.slice(0, 150);

  // 🔢 maj du compteur (après limitation)
  setCount(results.length);

  if (results.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Aucune sourate trouvée.';
    ul.appendChild(li);
    return;
  }

  results.forEach(soura => {
    const li = document.createElement('li');
    li.textContent = soura.texte;
    li.dataset.num = soura.valeur;
    // mousedown (plutôt que click) pour éviter le blur qui masque la liste avant l’onclick
    li.addEventListener('mousedown', () => selectSoura(soura.valeur, soura.texte));
    ul.appendChild(li);
  });
}

function selectSoura(numSoura, texteAffiche) {
  const input = document.getElementById("inputSoura");
  const ul = document.getElementById("suggestionsSoura");
  const mot = document.getElementById("mot");
  const lbl = document.getElementById("nombreSouraTrouvees");

  if (input) input.value = texteAffiche;    // Remplit le champ par la ligne complète
  if (mot) mot.value = `${numSoura}.1`; // Synchro avec le format attendu
  try { window.numSourat = numSoura; } catch (_) { }
  try {
    zcShowSouraVerseSpinner(numSoura, 1);
  } catch (_) { }
  try {
    if (mot) mot.dispatchEvent(new Event("input", { bubbles: true }));
  } catch (_) { }

  // faire === 1 quand une soura est sélectionnée
  try { window.faire = 1; } catch { }

  // Masquer la liste + remettre le compteur à vide (n=0 => '')
  if (ul) ul.style.display = 'none';
  if (lbl) lbl.textContent = '';
}

function zcFitSuggestionListToViewport(listEl, anchorEl) {
  if (!listEl || !anchorEl) return;
  const listStyle = window.getComputedStyle(listEl);
  if (listStyle.display === 'none') return;
  const rect = anchorEl.getBoundingClientRect();
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
  const marginBottom = 10;
  const available = Math.floor(viewportH - rect.bottom - marginBottom);
  const safeMax = Math.max(140, available);
  listEl.style.maxHeight = `${safeMax}px`;
}

function zcBringToFrontDynamic(el) {
  if (!el) return;
  try {
    if (typeof window.getNextZIndex === 'function') {
      const z = Number(window.getNextZIndex());
      if (Number.isFinite(z) && z > 0) {
        el.style.zIndex = String(z);
        return;
      }
    }
  } catch (_) { }
  let max = 0;
  try {
    const all = document.body ? document.body.querySelectorAll('*') : [];
    for (let i = 0; i < all.length; i++) {
      const z = parseInt(window.getComputedStyle(all[i]).zIndex, 10);
      if (!Number.isNaN(z) && z > max) max = z;
    }
  } catch (_) { }
  el.style.zIndex = String(max + 2);
}

/* ======= Wiring ======= */
document.addEventListener('DOMContentLoaded', () => {
  buildListeSouras();

  const input = document.getElementById('inputSoura');
  const ul = document.getElementById('suggestionsSoura');
  const lbl = document.getElementById('nombreSouraTrouvees');
  const toggleBtn = document.getElementById('tipTabSouraSearch');
  const suraWrap = document.querySelector('#SelecteurSoura .zc-soura-input-slot') || document.getElementById('SelecteurSoura');
  const spinWrap = document.getElementById('zcSouraVerseSpinWrap');
  const motWrap = document.querySelector('#panelVersets .zc-mot-search-wrap, #panelVersets .zc-mot-field-wrap');
  const motSuggestions = document.getElementById('suggestions-container-mot');
  const vin = document.getElementById("inputSouraVers");
  const vUl = document.getElementById("suggestionsSouraVers");
  const verseSlot = document.querySelector("#zcSouraVerseSpinWrap .zc-soura-verse-input-slot");

  const hideVerseList = () => {
    if (vUl) vUl.style.display = "none";
  };

  // n=0 => label vide, sinon "(n)"
  const setCount = (n) => {
    if (lbl) lbl.textContent = Number(n) ? `(${Number(n)})` : '';
    zcSignalSouraCounterReady(lbl);
  };
  const isSouraSuggestionsOpen = () => {
    if (!ul) return false;
    const hasItems = ul.children.length > 0;
    if (!hasItems) return false;
    const inlineOpen = ul.style.display === 'block' || ul.style.display === 'flex';
    if (inlineOpen) return true;
    try {
      const cs = window.getComputedStyle(ul);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    } catch (_) { }
    return false;
  };
  const refreshToggleIcon = () => {
    if (!toggleBtn) return;
    const ico = toggleBtn.querySelector('i');
    const open = isSouraSuggestionsOpen();
    if (ico) {
      ico.classList.toggle('fa-chevron-up', open);
      ico.classList.toggle('fa-chevron-down', !open);
    }
    toggleBtn.setAttribute(
      'aria-label',
      open ? 'Fermer les suggestions du champ Soura' : 'Ouvrir les suggestions du champ Soura'
    );
    toggleBtn.setAttribute(
      'title',
      open ? 'Fermer les suggestions du champ Soura' : 'Ouvrir les suggestions du champ Soura'
    );
  };
  const hideList = () => {
    if (ul) ul.style.display = 'none';
    setCount(0);
    refreshToggleIcon();
  };

  if (!input || !ul) return;
  zcSignalSouraCounterReady(lbl);

  const refreshOpenSuggestionHeights = () => {
    zcFitSuggestionListToViewport(ul, suraWrap || input);
    zcFitSuggestionListToViewport(motSuggestions, motWrap || document.getElementById('mot'));
    if (vUl) zcFitSuggestionListToViewport(vUl, verseSlot || vin);
    zcBringToFrontDynamic(ul);
    zcBringToFrontDynamic(motSuggestions);
    if (vUl) zcBringToFrontDynamic(vUl);
    refreshToggleIcon();
  };

  // Afficher immédiatement la liste au focus (et vider le champ)
  input.addEventListener('focus', () => {
    input.value = '';
    try { zcHideSouraVerseSpinner(); } catch (_) { }
    filtrerSoura(); // mettra aussi le compteur à jour
    refreshOpenSuggestionHeights();
  });

  // Filtrage en temps réel
  input.addEventListener('input', filtrerSoura);
  input.addEventListener('input', refreshOpenSuggestionHeights);
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = isSouraSuggestionsOpen();
      if (isOpen) {
        hideList();
        return;
      }
      try { input.focus(); } catch (_) { }
      filtrerSoura();
      refreshOpenSuggestionHeights();
    });
  }

  // Entrée = sélectionner la première entrée visible
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = ul.querySelector('li:not(.empty)');
      if (first && first.dataset.num) {
        selectSoura(parseInt(first.dataset.num, 10), first.textContent);
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      hideList();
    }
  });

  // Clic en dehors : masquer listes + compteurs
  document.addEventListener('click', (event) => {
    if (
      !input.contains(event.target) &&
      !ul.contains(event.target) &&
      !(toggleBtn && toggleBtn.contains(event.target)) &&
      !(spinWrap && spinWrap.contains(event.target))
    ) {
      hideList();
    }
    if (spinWrap && !spinWrap.contains(event.target)) {
      hideVerseList();
    }
  });

  window.addEventListener('resize', refreshOpenSuggestionHeights, { passive: true });
  window.addEventListener('scroll', refreshOpenSuggestionHeights, { passive: true, capture: true });
  refreshToggleIcon();

  if (vin && vUl) {
    vin.addEventListener("focus", () => {
      if (spinWrap && spinWrap.hasAttribute("hidden")) return;
      vin.value = "";
      filtrerSouraVers();
      refreshOpenSuggestionHeights();
    });
    vin.addEventListener("input", () => {
      filtrerSouraVers();
      refreshOpenSuggestionHeights();
    });
    vin.addEventListener("blur", () => {
      window.setTimeout(zcTryApplyVerseFromInput, 120);
    });
    vin.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const first = vUl.querySelector("li:not(.empty)");
        if (first && first.dataset.v) {
          selectSouraVers(parseInt(first.dataset.v, 10));
          e.preventDefault();
        }
      } else if (e.key === "Escape") {
        hideVerseList();
      }
    });
  }

  // Important: pas d'observer sur `style`, sinon boucle possible
  // (refresh => zIndex/style change => observer => refresh ...).
});





//</script>
// === Helpers robustes pour nombre & sélecteur de sourate (priorité: suggestions -> listeSouras) ===
(function () {
  // Utilitaire: récupérer le label EXACT depuis la suggestion ou la liste
  function labelPourSoura(soura) {
    // 1) si la liste de suggestions est présente/peuplée, on lit le libellé affiché
    const ul = document.getElementById('suggestionsSoura');
    if (ul) {
      const li = Array.from(ul.querySelectorAll('li'))
        .find(el => !el.classList.contains('empty') && Number(el.dataset.num) === Number(soura));
      if (li && li.textContent) return li.textContent.trim();
    }
    // 2) sinon, piocher dans listeSouras (si construite)
    if ((!Array.isArray(window.listeSouras) || !window.listeSouras.length) && typeof buildListeSouras === 'function') {
      try { buildListeSouras(); } catch { }
    }
    if (Array.isArray(window.listeSouras) && window.listeSouras.length) {
      const it = window.listeSouras.find(x => Number(x?.valeur) === Number(soura));
      if (it && it.texte) return it.texte;
    }
    // 3) aucun label disponible → null (on laissera le fallback plus bas si besoin)
    return null;
  }

  window.detecterNombre = window.detecterNombre || function (s) {
    const ai = "٠١٢٣٤٥٦٧٨٩", pe = "۰۱۲۳۴۵۶۷۸۹";
    const norm = String(s ?? "")
      .replace(/[٠-٩]/g, ch => String(ai.indexOf(ch)))
      .replace(/[۰-۹]/g, ch => String(pe.indexOf(ch)))
      .replace(/\u066B/g, ".").replace(/\u066C/g, "").replace(/,/g, ".").trim();
    return /^\d+(?:\.\d+)?$/.test(norm);
  };

  window.updateInputTextSelecteur = function (raw) {
    // --- 0) Normalisation nombre (chiffres ar/persans, virgule → point) ---
    const ai = "٠١٢٣٤٥٦٧٨٩", pe = "۰۱۲۳۴۵۶۷۸۹";
    let s = String(raw ?? "")
      .replace(/[٠-٩]/g, ch => String(ai.indexOf(ch)))
      .replace(/[۰-۹]/g, ch => String(pe.indexOf(ch)))
      .replace(/\u066B/g, ".")   // décimale arabe "٫"
      .replace(/\u066C/g, "")    // séparateur milliers "٬"
      .replace(/,/g, ".")
      .trim();

    if (!/^\d+(?:\.\d+)?$/.test(s)) return; // pas numérique → on ne touche pas

    // --- 1) Déterminer soura (entier 1..114) ---
    const n = parseFloat(s);
    let soura = Math.floor(n);
    if (!Number.isFinite(soura)) return;
    soura = Math.min(114, Math.max(1, soura));

    // --- helper: récupérer le label EXACT depuis listeSouras / listingSourates ---
    function labelDepuisListes(num) {
      // (a) s'assurer que listeSouras est construite
      try {
        if (!Array.isArray(listeSouras) || listeSouras.length === 0) {
          if (typeof buildListeSouras === 'function') {
            buildListeSouras(); // remplit la variable locale listeSouras
          } else if (Array.isArray(listingSourates) && typeof parseListingLine === 'function') {
            listeSouras = listingSourates.map(parseListingLine).filter(Boolean).slice(0, 114);
          }
        }
      } catch (_) { }

      // (b) chercher dans listeSouras (⚠️ sans window.)
      if (Array.isArray(listeSouras) && listeSouras.length) {
        const it = listeSouras.find(x => Number(x && x.valeur) === Number(num));
        if (it && it.texte) return it.texte;
      }

      // (c) fallback: parser directement listingSourates si dispo
      if (Array.isArray(listingSourates) && typeof parseListingLine === 'function') {
        const rawLine = listingSourates.find(line =>
          new RegExp(`^#\\s*${num}\\.\\d+\\s+`).test(String(line))
        );
        const parsed = rawLine ? parseListingLine(rawLine) : null;
        if (parsed && parsed.texte) return parsed.texte;
      }
      return null;
    }

    // --- 2) MAJ #inputSoura avec le label EXACT ---
    const inS = document.getElementById('inputSoura');
    if (inS) {
      const label = labelDepuisListes(soura);
      inS.value = label || String(soura); // (label trouvé dans listeSouras → affiché tel quel)
    }

    // --- 3) Normalisation de #mot -> soura.aya quand décimal ---
    const mot = document.getElementById('mot');
    if (mot && s.includes('.')) {
      let ayaPart = s.split('.')[1] ?? '';
      let aya = Math.max(1, parseInt(ayaPart, 10) || 1);

      const maxAya =
        (typeof nbVers === 'function' && Number.isFinite(nbVers(soura))) ? nbVers(soura)
          : (Array.isArray(window.fTabNomSouraNombreVersets) && Number.isFinite(window.fTabNomSouraNombreVersets[soura]))
            ? window.fTabNomSouraNombreVersets[soura]
            : 286; // fallback sûr

      aya = Math.min(maxAya, aya);
      mot.value = `${soura}.${aya}`;
    }

    // --- 4) Synchronisation éventuelle d’un <select> natif ---
    const sel = document.getElementById('selectSourat') || document.getElementById('selectSoura');
    if (sel) {
      sel.value = String(soura);
      try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) { }
    }

    // --- 5) État global ---
    window.numSourat = soura;
    if (mot && s.includes(".")) {
      try {
        if (typeof window.zcShowSouraVerseSpinner === "function") {
          const parts = String(mot.value).trim().split(".");
          const ay = parseInt(parts[1], 10) || 1;
          window.zcShowSouraVerseSpinner(soura, ay);
        }
      } catch (_) { }
    }
  };


})();
