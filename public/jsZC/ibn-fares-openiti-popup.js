(function () {
  "use strict";
  let lastRenderedRows = [];

  function getDataset() {
    if (typeof window.fTabIbnFaresOpeniti === "function") {
      const rows = window.fTabIbnFaresOpeniti();
      if (Array.isArray(rows)) return rows;
    }
    return [];
  }

  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escRe(s) {
    return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function containsWholeWord(haystack, needle) {
    const n = String(needle || "").trim();
    if (!n) return false;
    const re = new RegExp("(^|[^\\p{L}\\p{N}_])" + escRe(n) + "($|[^\\p{L}\\p{N}_])", "iu");
    return re.test(String(haystack || ""));
  }

  function getSearchPrefs() {
    if (typeof window.zcGetSearchPrefs === "function") {
      try {
        const p = window.zcGetSearchPrefs() || {};
        return { me: !!p.me, mc: !!p.mc };
      } catch (_) {}
    }
    return {
      me: !!window.paramRechercheMotEntier,
      mc: !!window.paramRechercheOrdreContigu,
    };
  }

  function matchesByPrefs(haystack, query, prefs) {
    const text = normalize(haystack);
    const q = normalize(query);
    if (!q) return true;
    const meOn = !!(prefs && prefs.me);
    const mcOn = !!(prefs && prefs.mc);
    if (mcOn) return meOn ? containsWholeWord(text, q) : text.includes(q);
    const tokens = q.split(/\s+/).map(function (t) { return t.trim(); }).filter(Boolean);
    if (!tokens.length) return true;
    if (meOn) return tokens.every(function (t) { return containsWholeWord(text, t); });
    return tokens.every(function (t) { return text.includes(t); });
  }

  function tokenizeForHighlight(query, prefs) {
    const q = String(query || "").trim();
    if (!q) return [];
    const mcOn = !!(prefs && prefs.mc);
    const terms = mcOn ? [q] : q.split(/\s+/).map(function (t) { return t.trim(); }).filter(Boolean);
    return Array.from(new Set(terms)).filter(Boolean);
  }

  function buildNormalizedMap(src) {
    const original = String(src || "");
    let norm = "";
    const mapNormToOrig = [];
    for (let i = 0; i < original.length; i++) {
      const part = normalize(original.charAt(i));
      if (!part) continue;
      for (let j = 0; j < part.length; j++) {
        norm += part.charAt(j);
        mapNormToOrig.push(i);
      }
    }
    return { original, norm, mapNormToOrig };
  }

  function collectRangesByPrefs(normText, query, prefs) {
    const qTermsRaw = tokenizeForHighlight(query, prefs);
    const qTerms = qTermsRaw.map(function (t) { return normalize(t); }).filter(Boolean);
    const meOn = !!(prefs && prefs.me);
    const ranges = [];
    for (let i = 0; i < qTerms.length; i++) {
      const term = qTerms[i];
      if (!term) continue;
      if (meOn) {
        const re = new RegExp("(^|[^\\p{L}\\p{N}_])(" + escRe(term) + ")(?=$|[^\\p{L}\\p{N}_])", "giu");
        let m;
        while ((m = re.exec(normText))) {
          const lead = String(m[1] || "");
          const body = String(m[2] || "");
          const start = m.index + lead.length;
          const end = start + body.length;
          if (end > start) ranges.push([start, end]);
          if (!body.length) re.lastIndex++;
        }
      } else {
        let from = 0;
        while (from < normText.length) {
          const idx = normText.indexOf(term, from);
          if (idx < 0) break;
          const end = idx + term.length;
          if (end > idx) ranges.push([idx, end]);
          from = idx + Math.max(1, term.length);
        }
      }
    }
    if (!ranges.length) return [];
    ranges.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    const merged = [ranges[0].slice()];
    for (let k = 1; k < ranges.length; k++) {
      const cur = ranges[k];
      const last = merged[merged.length - 1];
      if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
      else merged.push(cur.slice());
    }
    return merged;
  }

  function highlightByPrefs(s, query, prefs) {
    const mapped = buildNormalizedMap(String(s || ""));
    const normText = mapped.norm;
    const mapNormToOrig = mapped.mapNormToOrig;
    const original = mapped.original;
    if (!normText) return { html: escapeHtml(original), hits: 0 };
    const rangesNorm = collectRangesByPrefs(normText, query, prefs);
    if (!rangesNorm.length) return { html: escapeHtml(original), hits: 0 };
    const rangesOrig = [];
    for (let i = 0; i < rangesNorm.length; i++) {
      const startN = rangesNorm[i][0];
      const endN = rangesNorm[i][1] - 1;
      const startO = mapNormToOrig[startN];
      const endOInc = mapNormToOrig[endN];
      if (!Number.isFinite(startO) || !Number.isFinite(endOInc)) continue;
      const endO = endOInc + 1;
      if (endO > startO) rangesOrig.push([startO, endO]);
    }
    if (!rangesOrig.length) return { html: escapeHtml(original), hits: 0 };
    rangesOrig.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    const merged = [rangesOrig[0].slice()];
    for (let j = 1; j < rangesOrig.length; j++) {
      const cur = rangesOrig[j];
      const last = merged[merged.length - 1];
      if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
      else merged.push(cur.slice());
    }
    let html = "";
    let lastPos = 0;
    for (let p = 0; p < merged.length; p++) {
      const start = merged[p][0];
      const end = merged[p][1];
      if (start > lastPos) html += escapeHtml(original.slice(lastPos, start));
      html += '<span class="zc-term-hit">' + escapeHtml(original.slice(start, end)) + "</span>";
      lastPos = end;
    }
    if (lastPos < original.length) html += escapeHtml(original.slice(lastPos));
    return { html: html, hits: merged.length };
  }

  function rowHasRenderableHit(root, text, query, prefs) {
    const hRoot = highlightByPrefs(root, query, prefs);
    if (hRoot.hits > 0) return true;
    const hText = highlightByPrefs(text, query, prefs);
    return hText.hits > 0;
  }

  function getTopZ() {
    if (typeof window.getNextZIndex === "function") {
      try {
        return String(window.getNextZIndex());
      } catch (_) {}
    }
    return "2";
  }

  function ensurePopup(id) {
    let el = document.getElementById(id);
    if (el) return el;
    el = document.createElement("div");
    el.id = id;
    el.style.cssText = [
      "position:fixed",
      "left:8px",
      "top:8px",
      "right:8px",
      "bottom:8px",
      "width:auto",
      "height:auto",
      "max-height:none",
      "display:none",
      "background:var(--zc-surface, #fff)",
      "color:var(--zc-text, #111827)",
      "border:1px solid var(--zc-border, #cfd8e3)",
      "border-radius:12px",
      "box-shadow:0 10px 30px rgba(0,0,0,.2)",
      "overflow:hidden",
      "z-index:auto",
    ].join(";");
    document.body.appendChild(el);
    return el;
  }

  function closePopup(id) {
    const p = document.getElementById(id);
    if (p) p.style.display = "none";
  }

  function openPopup(id) {
    const p = ensurePopup(id);
    p.style.zIndex = getTopZ();
    p.style.display = "block";
    return p;
  }

  function openSelectionContextMenu(buttonEl, word) {
    const selectedWord = String(word || "").trim();
    if (!selectedWord) return;
    if (typeof window.zcShowSelectionContextMenuForWord === "function") {
      window.zcShowSelectionContextMenuForWord(selectedWord, buttonEl || null);
      return;
    }
    if (typeof window.zcOpenSelectionContextMenu === "function") {
      window.zcOpenSelectionContextMenu(selectedWord, buttonEl || null);
    }
  }

  function getIbnFaresLang() {
    try {
      if (typeof window.getUILang === "function") {
        const v = String(window.getUILang() || "FR").toUpperCase();
        if (v) return v;
      }
    } catch (_) {}
    try {
      const sel = document.getElementById("uiLangSelect");
      const v = String(sel && sel.value ? sel.value : "FR").toUpperCase();
      if (v) return v;
    } catch (_) {}
    return "FR";
  }

  const IBN_FARES_I18N = {
    FR: {
      popupTitle: "Lexique Ibn Fares",
      helpBtnTitle: "À propos de ce lexique",
      searchLabel: "Recherche",
      searchPlaceholder: "Entrer un mot / racine",
      clearTitle: "Effacer",
      meTitle: "Mot entier",
      mcTitle: "Mots contigus",
      copyResultsTitle: "Copier les résultats",
      helpDialogTitle: "À propos du lexique Ibn Fāris",
      helpBodyHtml:
        '<p style="margin:0 0 12px 0;">Ce panneau repose sur le <em>Muʿjam Maqāyīs al-lugha</em> d’Aḥmad ibn Fāris al-Qazwīnī, intégré ici sous forme de racines et d’extraits de texte (édition issue du corpus <strong>OpenITI</strong>, non OCR) pour compléter l’exploration à côté du Coran.</p>' +
        '<h3 style="margin:16px 0 8px 0;font-size:15px;font-weight:700;color:var(--zc-text, #111827);">Pourquoi Ibn Fāris ?</h3>' +
        "<p style=\"margin:0 0 12px 0;\">Souvent, il ne se contente pas d’empiler des emplois : il cherche un noyau sémantique originel (<em>asl</em>) derrière la racine. C’est un repère utile pour l’histoire des sens et pour comparer des hypothèses — <strong>pas</strong> une autorité religieuse ni un arbitre du sens coranique.</p>" +
        '<h3 style="margin:16px 0 8px 0;font-size:15px;font-weight:700;color:var(--zc-text, #111827);">Distance historique</h3>' +
        "<p style=\"margin:0 0 12px 0;\">Ibn Fāris vit plusieurs siècles après la révélation, dans un contexte déjà marqué par la grammaire codifiée, les traditions et l’évolution de la langue. Nous traitons ce corpus comme un outil d’« archéologie linguistique » : il peut révéler des filiations et des usages, sans dire à lui seul ce qu’un mot « veut dire » dans le Coran.</p>" +
        '<h3 style="margin:16px 0 8px 0;font-size:15px;font-weight:700;color:var(--zc-text, #111827);">Méthode</h3>' +
        "<p style=\"margin:0 0 8px 0;\">L’analyse du sens reste centrée sur :</p>" +
        '<ul style="margin:0 0 12px 18px;padding:0;line-height:1.5;">' +
        "<li>le texte coranique, ses occurrences et ses contextes ;</li>" +
        "<li>les oppositions lexicales et la cohérence d’ensemble.</li>" +
        "</ul>" +
        "<p style=\"margin:0 0 12px 0;\">Traductions, dictionnaires classiques et corpus comme celui-ci servent de <strong>matériau de comparaison</strong> (texte vs traditions vs histoire des usages), sans substituer une autorité à une autre.</p>" +
        '<p style="margin:0 0 16px 0;font-size:13px;color:var(--zc-text-muted, #64748b);">Identifiant édition OpenITI (référence technique) : <code style="font-size:12px;">0395IbnFarisQazwini.MucjamMaqayis.Shamela0021710-ara1</code></p>' +
        '<p style="margin:0;font-size:14px;font-weight:600;color:var(--zc-text, #111827);">Ressources OpenITI</p>' +
        '<ul style="margin:8px 0 0 18px;padding:0;line-height:1.6;">' +
        '<li><a href="https://openiti.org/" target="_blank" rel="noopener noreferrer">openiti.org</a> — présentation du projet</li>' +
        '<li><a href="https://github.com/OpenITI" target="_blank" rel="noopener noreferrer">github.com/OpenITI</a> — corpus et outils</li>' +
        "</ul>",
    },
    EN: {
      popupTitle: "Ibn Fares Lexicon",
      helpBtnTitle: "About this lexicon",
      searchLabel: "Search",
      searchPlaceholder: "Enter a word / root",
      clearTitle: "Clear",
      meTitle: "Whole word",
      mcTitle: "Contiguous words",
      copyResultsTitle: "Copy results",
      helpDialogTitle: "About Ibn Fāris lexicon",
      helpBodyHtml:
        '<p style="margin:0 0 12px 0;">This panel is based on <em>Muʿjam Maqāyīs al-lugha</em> by Aḥmad ibn Fāris al-Qazwīnī, integrated here as roots and text excerpts (OpenITI corpus edition, non-OCR) to complement exploration alongside the Quran.</p>' +
        "<p style=\"margin:0 0 12px 0;\">It is used as a linguistic-historical comparison tool, not as religious authority. Meaning analysis remains centered on Quranic occurrences and contexts.</p>" +
        '<p style="margin:0 0 16px 0;font-size:13px;color:var(--zc-text-muted, #64748b);">OpenITI edition id: <code style="font-size:12px;">0395IbnFarisQazwini.MucjamMaqayis.Shamela0021710-ara1</code></p>' +
        '<p style="margin:0;font-size:14px;font-weight:600;color:var(--zc-text, #111827);">OpenITI resources</p>' +
        '<ul style="margin:8px 0 0 18px;padding:0;line-height:1.6;">' +
        '<li><a href="https://openiti.org/" target="_blank" rel="noopener noreferrer">openiti.org</a> — project presentation</li>' +
        '<li><a href="https://github.com/OpenITI" target="_blank" rel="noopener noreferrer">github.com/OpenITI</a> — corpus and tools</li>' +
        "</ul>",
    },
    AR: {
      popupTitle: "معجم ابن فارس",
      helpBtnTitle: "حول هذا المعجم",
      searchLabel: "بحث",
      searchPlaceholder: "أدخل كلمة / جذر",
      clearTitle: "مسح",
      meTitle: "كلمة كاملة",
      mcTitle: "كلمات متجاورة",
      copyResultsTitle: "نسخ النتائج",
      helpDialogTitle: "حول معجم ابن فارس",
      helpBodyHtml:
        '<p style="margin:0 0 12px 0;">تعتمد هذه النافذة على <em>معجم مقاييس اللغة</em> لأحمد بن فارس، مدمجًا هنا على شكل جذور ومقتطفات نصية (من مشروع <strong>OpenITI</strong>) لدعم الاستكشاف بجانب القرآن.</p>' +
        "<p style=\"margin:0 0 12px 0;\">نستخدمه كأداة مقارنة لغوية تاريخية، لا كمرجعية دينية. يبقى تحليل المعنى متمركزًا على سياقات القرآن واستعمالاته.</p>" +
        '<p style="margin:0 0 16px 0;font-size:13px;color:var(--zc-text-muted, #64748b);">معرّف نسخة OpenITI: <code style="font-size:12px;">0395IbnFarisQazwini.MucjamMaqayis.Shamela0021710-ara1</code></p>' +
        '<p style="margin:0;font-size:14px;font-weight:600;color:var(--zc-text, #111827);">روابط OpenITI</p>' +
        '<ul style="margin:8px 0 0 18px;padding:0;line-height:1.6;">' +
        '<li><a href="https://openiti.org/" target="_blank" rel="noopener noreferrer">openiti.org</a></li>' +
        '<li><a href="https://github.com/OpenITI" target="_blank" rel="noopener noreferrer">github.com/OpenITI</a></li>' +
        "</ul>",
    },
    KAB: {
      popupTitle: "Amawal Ibn Fares",
      helpBtnTitle: "Ɣef umawal-a",
      searchLabel: "Anadi",
      searchPlaceholder: "Sekcem awal / aẓar",
      clearTitle: "Sfeḍ",
      meTitle: "Awal ummid",
      mcTitle: "Awalen imezdayen",
      copyResultsTitle: "Nɣel igmaḍ",
      helpDialogTitle: "Ɣef umawal Ibn Fāris",
      helpBodyHtml:
        '<p style="margin:0 0 12px 0;">Agalis-a yebna ɣef <em>Muʿjam Maqāyīs al-lugha</em> n Ibn Fāris, i d-nefka d iẓuran akked yimeẓriyen n uḍris (OpenITI), i usemmed n unadi ɣer tama n Leqran.</p>' +
        "<p style=\"margin:0 0 12px 0;\">Nseqdec-it am allal n userwes utlay-anegrawan, mačči am tamsalt tasreligit. Anamek yezga yettuɣal ɣer usatal d ttwuriwin n Leqran.</p>" +
        '<p style="margin:0 0 16px 0;font-size:13px;color:var(--zc-text-muted, #64748b);">Asulay OpenITI: <code style="font-size:12px;">0395IbnFarisQazwini.MucjamMaqayis.Shamela0021710-ara1</code></p>',
    },
    ES: {
      popupTitle: "Léxico Ibn Fares",
      helpBtnTitle: "Sobre este léxico",
      searchLabel: "Buscar",
      searchPlaceholder: "Introducir palabra / raíz",
      clearTitle: "Borrar",
      meTitle: "Palabra entera",
      mcTitle: "Palabras contiguas",
      copyResultsTitle: "Copiar resultados",
      helpDialogTitle: "Sobre el léxico de Ibn Fāris",
      helpBodyHtml:
        '<p style="margin:0 0 12px 0;">Este panel se basa en <em>Muʿjam Maqāyīs al-lugha</em> de Ibn Fāris, integrado aquí como raíces y extractos (corpus <strong>OpenITI</strong>) para complementar la exploración junto al Corán.</p>' +
        "<p style=\"margin:0 0 12px 0;\">Se usa como herramienta de comparación lingüístico-histórica, no como autoridad religiosa. El análisis del sentido sigue centrado en los contextos coránicos.</p>" +
        '<p style="margin:0 0 16px 0;font-size:13px;color:var(--zc-text-muted, #64748b);">ID de edición OpenITI: <code style="font-size:12px;">0395IbnFarisQazwini.MucjamMaqayis.Shamela0021710-ara1</code></p>' +
        '<p style="margin:0;font-size:14px;font-weight:600;color:var(--zc-text, #111827);">Recursos OpenITI</p>' +
        '<ul style="margin:8px 0 0 18px;padding:0;line-height:1.6;">' +
        '<li><a href="https://openiti.org/" target="_blank" rel="noopener noreferrer">openiti.org</a></li>' +
        '<li><a href="https://github.com/OpenITI" target="_blank" rel="noopener noreferrer">github.com/OpenITI</a></li>' +
        "</ul>",
    },
  };

  function ibnFaresT(key) {
    const lang = getIbnFaresLang();
    const dict = IBN_FARES_I18N[lang] || IBN_FARES_I18N.FR;
    const fr = IBN_FARES_I18N.FR;
    const v = dict && Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : fr[key];
    return v != null ? String(v) : "";
  }

  async function copyHtmlPreserveStyleFromElement(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const html = el.innerHTML || "";
    const text = (el.innerText || el.textContent || "").trim();
    if (!html.trim() && !text) return;

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
        return;
      }
    } catch (_) {}

    try {
      const temp = document.createElement("div");
      temp.contentEditable = "true";
      temp.style.position = "fixed";
      temp.style.left = "-99999px";
      temp.style.top = "0";
      temp.innerHTML = html;
      document.body.appendChild(temp);
      const range = document.createRange();
      range.selectNodeContents(temp);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("copy");
      sel.removeAllRanges();
      temp.remove();
      return;
    } catch (_) {}

    if (typeof window.copierTexte === "function") {
      window.copierTexte(text);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
    }
  }

  function renderSuggestions(query, holder, opts) {
    const options = opts || {};
    const prefs = options.prefs || getSearchPrefs();
    const q = normalize(query);
    const rows = getDataset();
    const total = rows.length;
    lastRenderedRows = [];
    if (!q) {
      holder.innerHTML = "";
      return { matched: 0, total };
    }
    const out = [];
    let matched = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const root = String(r.root || "");
      const text = String(r.text || "");
      const inRoot = matchesByPrefs(root, q, prefs);
      const inText = matchesByPrefs(text, q, prefs);
      if ((inRoot || inText) && rowHasRenderableHit(root, text, query, prefs)) {
        matched++;
        if (lastRenderedRows.length < 300) {
          lastRenderedRows.push({ root, text });
        }
        if (out.length < 300) {
          const localIdx = out.length;
          const cardId = "ibnFaresResultCard_" + localIdx;
          const bodyId = "ibnFaresResultBody_" + localIdx;
          const ctxBtn =
            '<button type="button" class="menu-button active zc-top-action-btn" data-ctx-idx="' +
            localIdx +
            '" title="Menu contextuel (racine)" aria-label="Menu contextuel (racine)" style="padding:2px 6px;min-width:auto;line-height:1;border:none;background:transparent;box-shadow:none;">☰</button>';
          const copyBtn =
            '<button type="button" class="menu-button active zc-top-action-btn" data-copy-card="' +
            cardId +
            '" title="Copier ce résultat" aria-label="Copier ce résultat" style="padding:2px 6px;min-width:auto;line-height:1;border:none;background:transparent;box-shadow:none;"><i class="fas fa-copy" aria-hidden="true"></i></button>';
          const hRoot = highlightByPrefs(root, query, prefs);
          const hText = highlightByPrefs(text, query, prefs);
          out.push(
            '<div id="' + cardId + '" class="zc-record-languette" style="margin:6px 0;padding:8px 10px;">' +
              '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
              "<p style='margin:0;'><strong>" +
              hRoot.html +
              "</strong></p>" +
              '<div style="display:flex;align-items:center;gap:2px;">' + ctxBtn + copyBtn + "</div>" +
              "</div>" +
              '<p id="' + bodyId + "\" style='margin:4px 0 0 0;color:var(--zc-text-muted, #64748b);white-space:pre-wrap;'>" +
              hText.html +
              "</p>" +
              "</div>"
          );
        }
      }
    }
    holder.innerHTML = out.join("");
    return { matched, total };
  }

  function openMainPopup() {
    const popup = openPopup("popupIbnFaresSearch");
    const helpBodyHtml = ibnFaresT("helpBodyHtml");

    popup.innerHTML =
      '<div class="popup-header zc-popup-header-unified" style="position:relative;min-height:44px;padding:8px 46px;">' +
      '<button type="button" id="ibnFaresCtxBtnMain" class="zc-comment-popup-iconbtn zc-popup-ctx-tab" title="Menu contextuel" aria-label="Menu contextuel" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);z-index:2;color:var(--zc-link, #2563eb);display:inline-flex;align-items:center;justify-content:center;">☰</button>' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;line-height:28px;width:100%;">' +
      '<span class="zc-ibn-fares-ico" aria-hidden="true"><i class="fas fa-book" aria-hidden="true"></i></span>' +
      '<span>' + escapeHtml(ibnFaresT("popupTitle")) + '</span>' +
      '<button type="button" id="ibnFaresHelpBtn" class="menu-button active zc-top-action-btn" title="' + escapeHtml(ibnFaresT("helpBtnTitle")) + '" aria-label="' + escapeHtml(ibnFaresT("helpBtnTitle")) + '" aria-haspopup="dialog" style="padding:0;min-width:auto;line-height:1;border:none;background:transparent;color:var(--zc-link, #2563eb);font-size:18px;font-weight:700;box-shadow:none;">?</button>' +
      "</div>" +
      '<button type="button" class="popup-close" title="Fermer" aria-label="Fermer" onclick="window.closeIbnFaresOpenitiPopup()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);">×</button>' +
      "</div>" +
      '<div style="padding:12px 14px;border-bottom:1px solid var(--zc-border, #e5e7eb);background:var(--zc-ui-soft-bg, #f8fafc);color:var(--zc-text, #111827);height:calc(100% - 60px);display:flex;flex-direction:column;">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;justify-content:flex-end;">' +
      '<button id="ibnFaresTranslitBtn" type="button" class="menu-button active zc-top-action-btn" title="Translitérer" aria-label="Translitérer" style="padding:2px 4px;min-width:auto;line-height:1;border:none;background:transparent;box-shadow:none;">' +
      '<span class="zc-top-action-ico" aria-hidden="true">🔁</span>' +
      "</button>" +
      '<span id="ibnFaresCount" style="font-size:13px;color:var(--zc-text-muted, #64748b);white-space:nowrap;">0 / 0</span>' +
      '<button type="button" class="menu-button active zc-top-action-btn" id="btnIbnFaresInlineME" data-zc-pref-toggle="me" title="' + escapeHtml(ibnFaresT("meTitle")) + '" aria-label="' + escapeHtml(ibnFaresT("meTitle")) + '" style="border:none;background:transparent;box-shadow:none;padding:2px 2px;min-width:auto;"><span class="zc-module-tab-short-label">ME</span></button>' +
      '<button type="button" class="menu-button active zc-top-action-btn" id="btnIbnFaresInlineMC" data-zc-pref-toggle="mc" title="' + escapeHtml(ibnFaresT("mcTitle")) + '" aria-label="' + escapeHtml(ibnFaresT("mcTitle")) + '" style="border:none;background:transparent;box-shadow:none;padding:2px 2px;min-width:auto;"><span class="zc-module-tab-short-label">MC</span></button>' +
      '<button id="ibnFaresCopyResultsBtn" type="button" class="menu-button active zc-top-action-btn" title="' + escapeHtml(ibnFaresT("copyResultsTitle")) + '" aria-label="' + escapeHtml(ibnFaresT("copyResultsTitle")) + '" style="padding:2px 4px;min-width:auto;line-height:1;border:none;background:transparent;box-shadow:none;"><i class="fas fa-copy" aria-hidden="true"></i></button>' +
      "</div>" +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:nowrap;margin-bottom:6px;width:100%;">' +
      '<label for="ibnFaresMot" style="flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;color:var(--zc-link, #2563eb);margin:0;" title="' + escapeHtml(ibnFaresT("searchLabel")) + '" aria-label="' + escapeHtml(ibnFaresT("searchLabel")) + '"><i class="fas fa-search" aria-hidden="true"></i></label>' +
      '<div style="position:relative;flex:1 1 auto;min-width:0;max-width:100%;">' +
      '<input id="ibnFaresMot" dir="rtl" type="text" placeholder="' + escapeHtml(ibnFaresT("searchPlaceholder")) + '" style="width:100%;box-sizing:border-box;padding:8px 30px 8px 10px;border:1px solid var(--zc-border, #cbd5e1);border-radius:8px;background:var(--zc-surface, #fff);color:var(--zc-text, #111827);text-align:right;font-size:16px;line-height:1.35;" />' +
      '<button type="button" id="ibnFaresClearBtn" title="' + escapeHtml(ibnFaresT("clearTitle")) + '" aria-label="' + escapeHtml(ibnFaresT("clearTitle")) + '" style="display:none;position:absolute;top:50%;right:8px;transform:translateY(-50%);border:none;background:transparent;color:var(--zc-text-muted, #64748b);font-size:16px;line-height:1;padding:0;min-width:auto;cursor:pointer;">×</button>' +
      "</div>" +
      "</div>" +
      '<div id="ibnFaresSuggest" dir="rtl" style="margin-top:6px;overflow:auto;flex:1;min-height:120px;text-align:right;"></div>' +
      "</div>" +
      '<div id="ibnFaresHelpBackdrop" aria-hidden="true" style="display:none;position:absolute;inset:0;z-index:50;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.45);box-sizing:border-box;">' +
      '<div role="dialog" aria-modal="true" aria-labelledby="ibnFaresHelpTitle" dir="ltr" style="position:relative;max-width:560px;width:100%;max-height:min(85vh,640px);overflow:auto;padding:20px 22px;border-radius:12px;background:var(--zc-surface, #fff);color:var(--zc-text, #111827);border:1px solid var(--zc-border, #e5e7eb);box-shadow:0 20px 50px rgba(0,0,0,.25);text-align:left;line-height:1.55;font-size:14px;">' +
      '<button type="button" id="ibnFaresHelpClose" title="Fermer" aria-label="Fermer l’aide" style="position:absolute;top:10px;right:10px;width:32px;height:32px;padding:0;border:none;background:transparent;color:var(--zc-text-muted, #64748b);font-size:22px;line-height:1;cursor:pointer;border-radius:8px;">×</button>' +
      '<h2 id="ibnFaresHelpTitle" style="margin:0 36px 12px 0;font-size:17px;font-weight:700;color:var(--zc-text, #111827);">' + escapeHtml(ibnFaresT("helpDialogTitle")) + '</h2>' +
      helpBodyHtml +
      "</div>" +
      "</div>";

    const input = popup.querySelector("#ibnFaresMot");
    const suggest = popup.querySelector("#ibnFaresSuggest");
    const translitBtn = popup.querySelector("#ibnFaresTranslitBtn");
    const clearBtn = popup.querySelector("#ibnFaresClearBtn");
    const copyResultsBtn = popup.querySelector("#ibnFaresCopyResultsBtn");
    const countEl = popup.querySelector("#ibnFaresCount");
    const ctxBtnMain = popup.querySelector("#ibnFaresCtxBtnMain");
    const helpBtn = popup.querySelector("#ibnFaresHelpBtn");
    const helpBackdrop = popup.querySelector("#ibnFaresHelpBackdrop");
    const helpClose = popup.querySelector("#ibnFaresHelpClose");
    if (!input || !suggest || !countEl || !translitBtn || !clearBtn || !copyResultsBtn) return;

    function openIbnFaresHelp() {
      if (!helpBackdrop) return;
      helpBackdrop.style.display = "flex";
      helpBackdrop.setAttribute("aria-hidden", "false");
      if (helpClose) helpClose.focus();
    }
    function closeIbnFaresHelp() {
      if (!helpBackdrop) return;
      helpBackdrop.style.display = "none";
      helpBackdrop.setAttribute("aria-hidden", "true");
      if (helpBtn) helpBtn.focus();
    }
    if (helpBtn) {
      helpBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openIbnFaresHelp();
      });
    }
    if (helpClose) {
      helpClose.addEventListener("click", function (e) {
        e.preventDefault();
        closeIbnFaresHelp();
      });
    }
    if (helpBackdrop) {
      helpBackdrop.addEventListener("click", function (e) {
        if (e.target === helpBackdrop) closeIbnFaresHelp();
      });
      const helpPanel = helpBackdrop.firstElementChild;
      if (helpPanel) {
        helpPanel.addEventListener("click", function (e) {
          e.stopPropagation();
        });
      }
    }
    popup.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!helpBackdrop || helpBackdrop.style.display !== "flex") return;
      e.preventDefault();
      e.stopPropagation();
      closeIbnFaresHelp();
    });
    input.setAttribute("dir", "rtl");
    input.style.textAlign = "right";
    suggest.setAttribute("dir", "rtl");
    suggest.style.textAlign = "right";

    function renderAndSyncCount() {
      const r = renderSuggestions(input.value, suggest, {
        prefs: getSearchPrefs(),
      });
      countEl.textContent = (r ? r.matched : 0) + " / " + (r ? r.total : 0);
      try {
        if (typeof window.syncParamTogglesChrome === "function") window.syncParamTogglesChrome();
      } catch (_) {}
    }

    function getCtxSeedWord() {
      const a = String(input.value || "").trim();
      if (a) return a;
      const b = String((motInput && motInput.value) || "").trim();
      if (b) return b;
      const first = (lastRenderedRows && lastRenderedRows[0]) || null;
      const c = String((first && first.root) || "").trim();
      if (c) return c;
      const rows = getDataset();
      if (rows && rows.length) {
        const d = String((rows[0] && rows[0].root) || "").trim();
        if (d) return d;
      }
      return "ا";
    }

    function syncClearBtn() {
      clearBtn.style.display = String(input.value || "").trim() ? "" : "none";
    }

    const motInput = document.getElementById("mot");
    let syncLock = false;
    if (motInput) {
      input.value = motInput.value || "";
      renderAndSyncCount();
      syncClearBtn();
    }

    function syncToMainMot() {
      if (!motInput || syncLock) return;
      syncLock = true;
      motInput.value = input.value;
      try {
        motInput.dispatchEvent(new Event("input", { bubbles: true }));
        motInput.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (_) {}
      syncLock = false;
    }

    function syncFromMainMot() {
      if (!motInput || syncLock) return;
      syncLock = true;
      input.value = motInput.value || "";
      renderAndSyncCount();
      syncClearBtn();
      syncLock = false;
    }

    input.addEventListener("input", function () {
      syncToMainMot();
      renderAndSyncCount();
      syncClearBtn();
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        renderAndSyncCount();
      }
    });
    window.addEventListener("zc:search-prefs-changed", renderAndSyncCount);
    if (ctxBtnMain) {
      ctxBtnMain.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openSelectionContextMenu(ctxBtnMain, getCtxSeedWord());
      });
    }
    if (motInput) {
      motInput.addEventListener("input", syncFromMainMot);
      motInput.addEventListener("change", syncFromMainMot);
    }
    clearBtn.addEventListener("click", function (e) {
      e.preventDefault();
      input.value = "";
      syncToMainMot();
      renderAndSyncCount();
      syncClearBtn();
      input.focus();
    });
    translitBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof window.transliterateInput === "function") {
        window.transliterateInput("ibnFaresMot", true);
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    copyResultsBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const txt = (lastRenderedRows || [])
        .map((r) => String(r.root || "").trim() + " : " + String(r.text || "").trim())
        .join("\n\n");
      if (!txt.trim()) return;
      if (typeof window.copierTexte === "function") {
        window.copierTexte(txt);
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).catch(function () {});
      }
    });
    suggest.addEventListener("click", function (e) {
      const ctxBtn = e.target && e.target.closest ? e.target.closest("[data-ctx-idx]") : null;
      if (ctxBtn) {
        e.preventDefault();
        const idx = Number(ctxBtn.getAttribute("data-ctx-idx"));
        const row = Number.isFinite(idx) ? lastRenderedRows[idx] : null;
        const rootWord = row && row.root ? String(row.root) : "";
        if (rootWord) openSelectionContextMenu(ctxBtn, rootWord);
        return;
      }
      const btn = e.target && e.target.closest ? e.target.closest("[data-copy-card]") : null;
      if (!btn) return;
      e.preventDefault();
      const cardId = btn.getAttribute("data-copy-card");
      if (!cardId) return;
      copyHtmlPreserveStyleFromElement(cardId);
    });
    renderAndSyncCount();
    syncClearBtn();
    input.focus();
  }

  window.openIbnFaresOpenitiPopup = openMainPopup;
  window.closeIbnFaresOpenitiPopup = function () {
    closePopup("popupIbnFaresSearch");
  };
})();
