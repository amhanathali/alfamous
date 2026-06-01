/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Retourne le texte "épuré" : 
 * chaque caractère n'apparaît qu'une seule fois, 
 * dans l'ordre de sa première apparition.
 * 
 * Exemple : "abbcddaccd" → "abcd"
 */
function epurerTexte(texte) {
	// Sécuriser l'entrée
	texte = String(texte ?? '');

	const dejaVu = new Set();
	let resultat = '';

	// Parcourt chaque caractère (UTF-16, donc OK pour l'arabe aussi)
	for (const ch of texte) {
		if (!dejaVu.has(ch)) {
			dejaVu.add(ch);     // mémoriser le caractère
			resultat += ch;     // l'ajouter une seule fois
		}
	}

	return resultat;
}
function moduleSynonymes(racine) {

	let input = racine || document.getElementById("mot").value.trim();
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
	input = nettoyerTexteMixte(input,true);//besoin de nettoyer la ponctuation
	//AlifHamza = tstParam;//remettre à sa valeur initiale
	// ===== fin vérification =====
	document.getElementById("mot").value=input;
	//if (typeof sauvegarderMot === "function") try { sauvegarderMot(); } catch { }
	input = epurerTexte(input);//garder un seul caractère représentatif
	afficherSynonymesDansModal(input);

}
////////////////////////////////////////////////////////////////////////////////afficherSynonymesDansModal(racine)////////////////////
function afficherSynonymesDansModal(racine) {
	const ancienne = document.getElementById("modalSynonymes");
	if (ancienne) ancienne.remove();

	// Création du conteneur modal
	const modal = document.createElement("div");
	modal.id = "modalSynonymes";
	modal.dataset.racineOriginale = racine; // 🔁 mémorisation
	//fenetre 3
	modal.style = `
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  background: var(--zc-surface);
  color: var(--zc-text);
  border: 2px solid var(--zc-border);
  padding: 10px 12px;
  border-radius: 10px;
  box-shadow: var(--zc-shadow);
  /*z-index: 101; */
  width: var(--zc-popup-unified-max-width, min(98vw, 980px));
  max-width: var(--zc-popup-unified-max-width, min(98vw, 980px));
  height: var(--zc-popup-unified-max-height, 100dvh);
  max-height: var(--zc-popup-unified-max-height, 100dvh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

	const topZ = getNextZIndex();
	modal.style.zIndex = topZ;

	const racineStr = String(racine || "");
	const racineJs = racineStr.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
	const racineHtmlEsc = (typeof escapeHtml === "function")
		? escapeHtml(racineStr)
		: racineStr
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");

	modal.innerHTML = `
	<div id="modalHeader" style="flex:0 0 auto;background:var(--zc-ui-soft-bg);border-bottom:1px solid var(--zc-border);padding:12px 14px;">
		<div class="zc-popup-header-unified" style="gap:10px;">
			<div class="zc-popup-header-actions">
				<a href="#"
					class="zc-popup-ctx-tab"
					onclick="event.preventDefault();var w='${racineJs}';if(typeof window.zcCtxFillMot==='function'){window.zcCtxFillMot(w);}else{var m=document.getElementById('mot');if(m)m.value=w;}if(typeof window.zcShowSelectionContextMenuForWord==='function'){window.zcShowSelectionContextMenuForWord(w,this);}return false;"
					title="Menu contextuel" aria-label="Menu contextuel">☰</a>
				<div style="flex:1 1 auto;text-align:center;font-weight:600;font-size:1rem;color:var(--zc-text);">⚛️ Synonymes et atomes (sons)</div>
				<button type="button" class="close-btnStatRacines" onclick="document.getElementById('modalSynonymes').remove()" title="Fermer" aria-label="Fermer">✖</button>
			</div>
			<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;">
				<span style="font-weight:600;color:var(--zc-text-muted);">Racines:</span>
				<span id="racineAffichee" style="font-weight:600;color:var(--zc-text);" dir="rtl">${racineHtmlEsc}</span>
				<span aria-hidden="true">🧬</span>
				<a href="#"
					onclick="document.getElementById('mot').value='${racineJs}';ChercheMotsMain(2);return false;"
					title="Recherche dans le Coran par correspondance des racines"
					style="color:var(--zc-link);text-decoration:none;font-size:1.1rem;line-height:1;">📖</a>
				<button type="button" onclick="copierContenuModal('contenuTexte3', 3)"
					title="Copier tout le contenu du panneau"
					style="margin-left:auto;background:transparent;border:1px solid var(--zc-border);color:var(--zc-link);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">
					Copier Tout
				</button>
			</div>
		</div>
		<div id="message-boxVersets4" class="message-boxVersets"></div>
		<div id="message-boxVersets3" class="message-boxVersets"></div>
		<div style="margin-top:8px;">
			<label>
				<input type="checkbox" id="sensInverseCheckbox" onchange="rafraichirSynonymesAutomatique()" />
				Sens inverse (palindrome)
			</label>
		</div>
	</div>
	<div id="contenuTexte3" style="flex:1 1 auto; min-height:0; overflow-y:auto; border-top: 1px solid var(--zc-border); padding-top: 10px;"></div>
`;

	document.body.appendChild(modal);

	genererSynonymesDansDiv("contenuTexte3", racine, 1);
}

function rafraichirSynonymesAutomatique() {
	const modal = document.getElementById("modalSynonymes");
	const racineOrig = modal.dataset.racineOriginale;
	const estInverse = document.getElementById("sensInverseCheckbox").checked;
	const racine = estInverse ? racineOrig.split("").reverse().join("") : racineOrig;
	const combinaison = 1; // 🔁 toujours 1, car la racine est déjà inversée

	document.getElementById("racineAffichee").textContent = racine;
	genererSynonymesDansDiv("contenuTexte3", racine, combinaison);
}

function generateCombinaisons(mot, sens) {
	const combinaisons = [];

	// Générer toutes les sous-chaînes dans le sens choisi
	for (let start = 0; start < mot.length; start++) {
		for (let end = start + 2; end <= mot.length; end++) {
			const sousChaine = mot.slice(start, end);
			if (sens === 1) {
				combinaisons.push(sousChaine); // Direct
			} else if (sens === -1) {
				combinaisons.push(sousChaine.split("").reverse().join("")); // Inversé
			}
		}
	}

	return combinaisons;
}

async function genererSynonymesDansDiv(idDiv, racine, combinationOption = 1) {//fenetre 4
	const mot = racine || "بسم";
	const tabLexique = fTabLexique();
	const combinaisons = generateCombinaisons(mot, combinationOption);
	const div = document.getElementById(idDiv);
	if (!div) return;

	// Résultats principaux
	const resultatsSynonymes = tabLexique
		.filter((entry) => combinaisons.some((comb) => entry[0].includes(comb)))
		.map((entry) => {
			const racine = entry[0];
			var commentaire = entry[1] || "";
			commentaire = nettoyerCommentairePourHtml(commentaire);
			//Boutons pour synonymes
			const racineJS = String(racine).replace(/'/g, "\\'");
			const lienZoomRacine = `
				<a href="#"
					onclick="document.getElementById('mot').value='${racine}'; ChercheMotsMain(2); return false;"
					title="Recherche dans le Coran par correspondance des racines">
					📖${racineJS}
				</a>`;

			const menuCtxLink = `<a href="#"
					class="zc-popup-ctx-tab"
					onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${racineJS}'); } else { document.getElementById('mot').value='${racineJS}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${racineJS}', this); } return false;"
					title="Menu contextuel">☰</a>`;

			const lienLireTexte = `<a href="#"
				onclick="lireTexte('${racine}', '${lngVoixAR}', 1.0); event.preventDefault();">
				<i class="fas fa-volume-up" title="Lire racine"> </i>
				</a>`;

			return {
				mot: `<span dir="ltr"
						 style="display:inline-flex; align-items:left; gap:8px; white-space:nowrap; unicode-bidi:isolate;">
					   ${lienZoomRacine}&nbsp;
					   ${menuCtxLink}&nbsp;
					   ${lienLireTexte}
					</span>`,
				commentaire: commentaire,
			};
		});

	// Lettres spéciales $x
	const lettresSpeciales = [];
	for (const lettre of mot) {
		const chaineSpeciale = `$${lettre}`;
		tabLexique.forEach(([motLexique, commentaire]) => {
			if (motLexique.startsWith(chaineSpeciale)) {
				const racine = motLexique;
				const racineJS = String(racine).replace(/'/g, "\\'").replace("$", "");
				const lienZoomRacine = `
						<a href="#"
							onclick="document.getElementById('mot').value='${racineJS}'; ChercheMotsMain(2); return false;"
							title="Recherche dans le Coran par correspondance des racines">
							${racineJS}📖
						</a>`;

				/*const lexiqueLink = `<a href="#"
							onclick="document.getElementById('mot').value='${racineJS}'; if (typeof ChercheMotsMain === 'function') {ChercheMotsMain(4);} return false;"
							title="Recherche dans le Lexique">
							📒 
						</a>`;
				*/
				const lienLireTexte = `<a href="#"
						onclick="lireTexte('${racineJS}', '${lngVoixAR}', 1.0); event.preventDefault();">
						<i class="fas fa-volume-up" title="Lire racine"> </i>
						</a>`;
				const lienMenuCtx = `<a href="#" class="zc-popup-ctx-tab" onclick="if (typeof window.zcCtxFillMot === 'function') { window.zcCtxFillMot('${racineJS}'); } else { document.getElementById('mot').value='${racineJS}'; } if (typeof window.zcShowSelectionContextMenuForWord === 'function') { window.zcShowSelectionContextMenuForWord('${racineJS}', this); } return false;" title="Menu contextuel">☰</a>`;

				lettresSpeciales.push({
					mot: `<span dir="ltr"
								 style="display:inline-flex; align-items:left; gap:8px; white-space:nowrap; unicode-bidi:isolate;">
							  ${lienZoomRacine}&nbsp;
								 
							  ${lienLireTexte}&nbsp;
							  ${lienMenuCtx}
							</span>`,
					commentaire: commentaire || ""
				});
			}
		});
	}

	const tousResultats = [...lettresSpeciales, ...resultatsSynonymes];
	div.innerHTML = "";

	if (tousResultats.length === 0) {
		div.innerHTML = `<p style="color:var(--zc-danger); font-weight:bold; font-size:16px;">Aucun mot trouvé pour "${mot}".</p>`;
		return;
	}

	const estInverse = document.getElementById("sensInverseCheckbox")?.checked;
	const sensTexte = estInverse ? " ←" : " →";

	let contenuHTML = `<div style="margin-bottom:10px; font-weight:bold; color:var(--zc-text);">Synonymes pour (${mot}${sensTexte}) : ${tousResultats.length}</div>`;
	//<div id="message-boxVersets4" class="message-boxVersets"></div>
	tousResultats.forEach((res, index) => {
		var def = res.commentaire;
		defTexte = def.replace(/'/g, "’").replace(/"/g, "”");//corriger SyntaxError: Invalid or unexpected token
		defTexte = nettoyerCommentairePourHtml(defTexte);
		contenuHTML += `
			<div id="message-boxVersets4" class="message-boxVersets"></div>
			<div style="margin-bottom:12px; padding:8px; border-bottom:1px solid var(--zc-border);">
				<div style="font-size:16px; font-weight:bold;">
					${index + 1}. ${res.mot}
				</div>
				<div style="margin-left:20px; color:var(--zc-text);">
					${defTexte}
				</div>
			</div>
			`;
	});

	div.innerHTML = contenuHTML;
}