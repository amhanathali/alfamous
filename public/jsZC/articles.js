// articles.js — Module d’affichage des articles de blog dans l’appli principale

(function () {
  'use strict';

  // ================== Injection du CSS ==================
  function injectArticlesStyles() {
    if (document.getElementById('articlesAppStyles')) return;

    const css = `
      .articles-module-root .zc-record-languette {
        box-sizing: border-box;
        border: 1px solid var(--zc-border);
        border-radius: 14px;
        background: var(--zc-surface);
        padding: 12px 14px;
        box-shadow: var(--zc-shadow);
        transition: background 0.2s ease, transform 0.05s ease, box-shadow 0.15s ease;
      }
      .articles-module-root .zc-record-languette:hover {
        background: var(--zc-hover-bg);
      }
      .articles-module-root .zc-record-languette:active {
        transform: translateY(1px);
      }
      .articles-module-root .zc-record-languette--article {
        border-left: 3px solid var(--zc-accent);
      }

      .articles-module-root {
        font-family: sans-serif;
        margin: 0;
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }

      .articles-module-root .app-recherche{
        flex: 1 1 auto;
        min-height: 0;
        display:flex;
        flex-direction:column;
      }

      .articles-module-root .app-header {
        margin-bottom: 6px;
      }

      .articles-module-root .zc-articles-head-bar {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        width: 100%;
        box-sizing: border-box;
      }

      .articles-module-root .zc-forum-head-title {
        min-width: 0;
      }

      .articles-module-root .zc-forum-head-title .zc-forum-page-title {
        font-size: 0.92rem;
        line-height: 1.25;
      }

      .articles-module-root .zc-forum-head-title a {
        color: #1976D2;
        text-decoration: none;
      }

      .articles-module-root .app-recherche select,
      .articles-module-root .app-recherche input:not(.zc-ui-search-field),
      .articles-module-root .app-recherche textarea:not(.zc-ui-search-field) {
        font-size: 16px;
        border: 1px solid #ccc;
        border-radius: 6px;
        padding: 6px 8px;
        box-sizing: border-box;
        font-family: inherit;
      }

      .articles-module-root .search-bar-line {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        gap: 8px;
        margin: 2px 0 0;
        flex-wrap: nowrap;
        width: 100%;
        min-width: 0;
      }

      @media (max-width: 520px) {
        .articles-module-root .search-bar-line {
          flex-wrap: wrap;
        }
        .articles-module-root .search-input-wrap {
          flex: 1 1 160px;
        }
      }

      .articles-module-root #resultCount {
        font-weight: bold;
        margin: 2px 0 1px;
        line-height: 1.1;
        font-size: 0.95em;
      }

      .articles-module-root .articles-count-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 2px 0 1px;
      }

      .articles-module-root .articles-count-row #resultCount {
        margin: 0;
        flex: 1 1 auto;
      }

      .articles-module-root .articles-inline-toggle {
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
        padding: 2px 2px !important;
        min-width: auto !important;
      }

      .articles-module-root .articles-inline-toggle .zc-module-tab-short-label {
        margin-left: 0;
        font-weight: 800;
        font-size: 12px;
      }

      .articles-module-root .search-input-wrap {
        position: relative;
        flex: 1 1 auto;
        min-width: 0;
        width: 100%;
      }

      .articles-module-root .search-input-wrap textarea#searchInput {
        width: 100%;
        box-sizing: border-box;
        min-height: 44px;
        max-height: 200px;
        line-height: 1.35;
        display: block;
      }

      .articles-module-root .articles-search-loupe.zc-search-go:disabled {
        opacity: 0.65;
      }

      .articles-module-root .app-recherche ul.zc-forum-reader-list {
        list-style: none;
        margin: 0;
        padding: var(--zc-space-5);
        background: var(--zc-ui-soft-bg);
        border: 1px solid var(--zc-border);
        border-radius: 14px;
        max-height: none;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--zc-space-5);
        flex: 1 1 auto;
        min-height: 0;
      }

      .articles-module-root .app-recherche li.zc-record-languette {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 0;
      }

      .articles-module-root .app-recherche a {
        color: var(--zc-link);
        font-weight: bold;
        text-decoration: none;
      }

      .articles-module-root .app-recherche a:hover {
        text-decoration: underline;
      }

      .articles-module-root .text-content {
        flex: 1;
        text-align: left;
      }

      .articles-module-root .text-content div {
        margin-top: 2px;
        font-size: 0.82em;
        color: var(--zc-text-muted);
        line-height: 1.25;
      }

      .articles-module-root .text-content p.article-list-snippet {
        margin: 2px 0 0;
        font-size: 0.76em;
        color: var(--zc-text-muted);
        line-height: 1.22;
        max-height: calc(1.22em * 2 + 2px);
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow: hidden;
        word-break: break-word;
      }

      .articles-module-root .article-img {
        width: 45px;
        height: auto;
        border-radius: 6px;
        flex-shrink: 0;
        margin-right: 8px;
      }

      .articles-module-root .article-term-hit,
      #popupArticleHtml #contenuTexteArticle .article-term-hit,
      #popupArticleHtml #contenuTexteArticle .zc-term-hit {
        background: var(--zc-hit-bg, #fff2a8) !important;
        color: var(--zc-hit-fg, inherit) !important;
        border-radius: 3px;
        padding: 0 1px;
      }

      /* ===================== Popup indépendante Articles ===================== */
      #popupArticleHtml {
        display: none;
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: var(--zc-popup-unified-max-width, min(98vw, 980px));
        max-width: var(--zc-popup-unified-max-width, min(98vw, 980px));
        height: var(--zc-popup-unified-max-height, 100dvh);
        max-height: var(--zc-popup-unified-max-height, 100dvh);
        background: var(--zc-surface);
        color: var(--zc-text);
        border: 1px solid var(--zc-border);
        border-radius: 12px;
        overflow-y: auto;
        box-shadow: 0 0 20px rgba(0,0,0,0.3);
      }
      #popupArticleHtml #contenuTexteArticle,
      #popupArticleHtml #contenuTexteArticle .article,
      #popupArticleHtml #contenuTexteArticle .corps {
        color: var(--zc-text) !important;
        background: transparent !important;
      }
      #popupArticleHtml #contenuTexteArticle .date,
      #popupArticleHtml #contenuTexteArticle figcaption {
        color: var(--zc-text-muted) !important;
      }
      #popupArticleHtml #contenuTexteArticle a {
        color: var(--zc-link) !important;
      }
      @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle,
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle .article,
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle .corps {
          color: var(--zc-text) !important;
          background: transparent !important;
        }
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle :is(p, div, span, li, ul, ol, blockquote, h1, h2, h3, h4, h5, h6, td, th):not(.article-term-hit):not(.zc-term-hit) {
          color: var(--zc-text) !important;
          background: transparent !important;
        }
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle :is(strong, b) {
          color: color-mix(in srgb, var(--zc-text) 92%, white) !important;
        }
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle :is(em, i) {
          color: color-mix(in srgb, var(--zc-text) 88%, var(--zc-link) 12%) !important;
        }
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle :is(pre, code, blockquote) {
          background: color-mix(in srgb, var(--zc-surface) 78%, black) !important;
          border: 1px solid color-mix(in srgb, var(--zc-border) 78%, black) !important;
          border-radius: 8px;
          color: var(--zc-text) !important;
        }
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle table,
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle thead,
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle tbody,
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle tr {
          background: color-mix(in srgb, var(--zc-surface) 86%, black) !important;
          color: var(--zc-text) !important;
        }
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle th,
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle td {
          background: color-mix(in srgb, var(--zc-surface) 84%, black) !important;
          color: var(--zc-text) !important;
          border-color: color-mix(in srgb, var(--zc-border) 80%, black) !important;
        }
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle a {
          color: var(--zc-link) !important;
        }
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle .article-term-hit,
        :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle .zc-term-hit {
          color: inherit !important;
        }
      }

      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle,
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle .article,
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle .corps {
        color: var(--zc-text) !important;
        background: transparent !important;
      }
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle :is(p, div, span, li, ul, ol, blockquote, h1, h2, h3, h4, h5, h6, td, th):not(.article-term-hit):not(.zc-term-hit) {
        color: var(--zc-text) !important;
        background: transparent !important;
      }
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle :is(strong, b) {
        color: color-mix(in srgb, var(--zc-text) 92%, white) !important;
      }
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle :is(em, i) {
        color: color-mix(in srgb, var(--zc-text) 88%, var(--zc-link) 12%) !important;
      }
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle :is(pre, code, blockquote) {
        background: color-mix(in srgb, var(--zc-surface) 78%, black) !important;
        border: 1px solid color-mix(in srgb, var(--zc-border) 78%, black) !important;
        border-radius: 8px;
        color: var(--zc-text) !important;
      }
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle table,
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle thead,
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle tbody,
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle tr {
        background: color-mix(in srgb, var(--zc-surface) 86%, black) !important;
        color: var(--zc-text) !important;
      }
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle th,
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle td {
        background: color-mix(in srgb, var(--zc-surface) 84%, black) !important;
        color: var(--zc-text) !important;
        border-color: color-mix(in srgb, var(--zc-border) 80%, black) !important;
      }
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle a {
        color: var(--zc-link) !important;
      }
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle .article-term-hit,
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle .zc-term-hit {
        color: inherit !important;
      }

      /* IMPORTANT: ce bloc doit rester APRES les resets génériques sur span/div
         afin de ne pas perdre visuellement le surlignage dans l'article ouvert. */
      #popupArticleHtml #contenuTexteArticle .article-term-hit,
      #popupArticleHtml #contenuTexteArticle .zc-term-hit,
      :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle .article-term-hit,
      :root:not([data-theme="light"]) #popupArticleHtml #contenuTexteArticle .zc-term-hit,
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle .article-term-hit,
      :root[data-theme="dark"] #popupArticleHtml #contenuTexteArticle .zc-term-hit {
        background: var(--zc-hit-bg, #fff2a8) !important;
        color: var(--zc-hit-fg, inherit) !important;
        border-radius: 3px !important;
        padding: 0 1px !important;
      }

      @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]) {
          --zc-hit-bg: color-mix(in srgb, #fff2a8 68%, transparent);
          --zc-hit-fg: var(--zc-text);
        }
      }
      :root[data-theme="dark"] {
        --zc-hit-bg: color-mix(in srgb, #fff2a8 68%, transparent);
        --zc-hit-fg: var(--zc-text);
      }

      @media (max-width:700px) {
        #popupArticleHtml {
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          height: 100dvh;
          border-radius: 0;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = 'articlesAppStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ================== Construction du layout ==================
  function buildArticlesLayout(root) {
    root.classList.add('articles-module-root');

    root.innerHTML = `
      <div class="app-recherche">
        <header class="app-header zc-forum-head">
          <div class="zc-forum-head-bar zc-articles-head-bar">
            <button type="button" class="zc-comment-popup-iconbtn zc-forum-head-close zc-open-selection-ctx zc-popup-ctx-tab"
              data-zc-opens-selection-ctx="1"
              onclick="return window.zcShowSelectionContextMenuFromMot && window.zcShowSelectionContextMenuFromMot(this);"
              aria-label="Menu contextuel" title="Menu contextuel">☰</button>
            <div class="zc-forum-head-title">
              <span class="zc-forum-page-title">📚 Articles du blog <a id="linkDigneDeFoiBlogHeader" href="https://lexique-coran.blogspot.com/search" target="_blank" rel="noopener noreferrer"
                title="Recherche blog (blog.alfamous.ca · lexique-coran.blogspot.com)">blog.alfamous.ca · lexique-coran.blogspot.com</a></span>
            </div>
          </div>
        </header>

        <div class="search-bar-line">
          <div class="search-input-wrap zc-search-wrap zc-search-wrap--textarea">
            <button id="btnClearInput" type="button" class="zc-search-clear is-hidden" title="Effacer" aria-label="Effacer la recherche">✕</button>
            <textarea id="searchInput" rows="2" class="zc-ui-search-field zc-ui-search-field--multiline" placeholder="Mots-clés…" autocomplete="off" spellcheck="true"></textarea>
            <button type="button" class="articles-search-loupe zc-search-go" disabled tabindex="-1" aria-hidden="true" title="Recherche pendant la saisie">🔍</button>
          </div>
        </div>

        <div class="articles-count-row">
          <p id="resultCount">📄 Articles trouvés : 0</p>
          <button type="button" class="menu-button active zc-top-action-btn articles-inline-toggle" id="btnArticlesInlineME" data-zc-pref-toggle="me"
            title="Recherche Mot Entier" aria-label="Recherche Mot Entier">
            <span class="zc-module-tab-short-label">ME</span>
          </button>
          <button type="button" class="menu-button active zc-top-action-btn articles-inline-toggle" id="btnArticlesInlineMC" data-zc-pref-toggle="mc"
            title="Recherche Mots Contigus" aria-label="Recherche Mots Contigus">
            <span class="zc-module-tab-short-label">MC</span>
          </button>
        </div>
        <ul id="articleList" class="zc-forum-reader-list">
          <li>Chargement des articles...</li>
        </ul>
      </div>

      <div id="contenuLocal" style="display:none;"></div>
    `;

    // Créer la popup indépendante pour les articles
    let popup = document.getElementById("popupArticleHtml");
    if (!popup) {
      popup = document.createElement("div");
      popup.id = "popupArticleHtml";
      document.body.appendChild(popup);
    }
  }
////////////////////////////////////////
  // ================== Utilitaires ==================
  function sanitizeCorruptedHighlightText(text) {
    return String(text || "")
      // Balises de highlight réelles/encodées
      .replace(/<\/?span\b[^>]*>/gi, " ")
      .replace(/&lt;\/?span\b[^&]*&gt;/gi, " ")
      // Fragments de type: class="...term-hit" style="..."> (même si "class" est tronqué)
      .replace(
        /(?:^|\s)[a-z-]*class\s*=\s*["'][^"']*term-hit[^"']*["'](?:\s+style\s*=\s*["'][^"']*["'])?\s*>?/gi,
        " "
      )
      // Fragments résiduels de style=...>
      .replace(/(?:^|\s)style\s*=\s*["'][^"']*["']\s*>?/gi, " ")
      // Fragments restant apres casse partielle: "...term-hit" style="...zc-hit-bg..."
      .replace(/(?:^|\s)["'][^"']*term-hit[^"']*["'](?:\s+style\s*=\s*["'][^"']*zc-hit-bg[^"']*["'])?\s*>?/gi, " ")
      .replace(/(?:^|\s)[^<>\s]*term-hit[^<>\s]*/gi, " ")
      .replace(/(?:^|\s)[^<>\s]*zc-hit-bg[^<>\s]*/gi, " ")
      .replace(/^\s*>+/, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extraitApercuDepuisPremierP(html, max = 200) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    const root = tmp.querySelector('.corps') || tmp;
    root.querySelectorAll('style, script, noscript, link, meta').forEach(n => n.remove());

    const paras = Array.from(root.querySelectorAll('p'));
    const pick =
      paras.find(el => el.textContent.replace(/\s+/g, ' ').trim().length > 10) || paras[0];

    const texte = (pick ? pick.textContent : root.textContent) || '';
    const propre = sanitizeCorruptedHighlightText(texte);
    if (!propre) return '';

    if (propre.length > max) {
      const cut = propre.lastIndexOf(' ', max);
      return propre.slice(0, cut > -1 ? cut : max) + '…';
    }
    return propre;
  }

  function preSanitizeHtml(raw) {
    if (typeof raw !== 'string') return raw;

    raw = raw.replace(/<svg\b[^>]*>/gi, (m) =>
      m.replace(/\s+(height|width)\s*=\s*(['"])auto\2/gi, '')
       .replace(/\s+(height|width)\s*=\s*auto\b/gi, '')
    );

    raw = raw.replace(/([?&])autoplay=1/gi, '$1autoplay=0');
    raw = raw.replace(/<video\b([^>]*?)\sautoplay\b/gi, '<video$1');

    return raw;
  }

  function sanitizeAutoDimensions(listArticleDivs) {
    const TAGS = ['svg', 'img', 'video', 'iframe'];
    listArticleDivs.forEach(div => {
      TAGS.forEach(tag => {
        div.querySelectorAll(tag).forEach(el => {

          ['width', 'height'].forEach(attr => {
            const v = (el.getAttribute(attr) || '').trim().toLowerCase();
            if (v === 'auto') el.removeAttribute(attr);
          });

          const tn = el.tagName.toLowerCase();
          if (tn === 'svg') {
            if (!el.style.maxWidth) el.style.maxWidth = '100%';
            if (!el.style.width) el.style.width = '100%';
            if (!el.style.height) el.style.height = 'auto';
						} else if (tn === 'iframe') {
							el.style.width = '100%';

							// hauteur par défaut sûre
							if (!el.style.height || el.style.height === 'auto') {
								el.style.height = '75vh';
								el.style.minHeight = '500px';
							}

							el.style.border = '0';
						} else if (tn === 'img' || tn === 'video') {
							if (!el.style.maxWidth) el.style.maxWidth = '100%';
							if (!el.style.height) el.style.height = 'auto';
						}

          if ((tn === 'img' || tn === 'iframe') && !el.hasAttribute('loading')) {
            el.setAttribute('loading', 'lazy');
          }
        });
      });
    });
  }

function sanitizeMediaPermissions(listArticleDivs) {
  listArticleDivs.forEach(div => {

    div.querySelectorAll('iframe').forEach(f => {
      // 0) Supprimer systématiquement allowfullscreen (évite le warning Chrome)
      //    Le fullscreen doit être géré uniquement via l'attribut "allow".
      if (f.hasAttribute('allowfullscreen')) {
        f.removeAttribute('allowfullscreen');
      }

      // 1) empêcher autoplay=1 (si présent)
      try {
        const u = new URL(f.src, location.href);
        if (u.searchParams.get('autoplay') === '1') {
          u.searchParams.set('autoplay', '0');
          f.src = u.toString();
        }
      } catch {}

      // 2) Permissions iframe via "allow" (inclut fullscreen)
      //    NB: c'est la méthode moderne et suffisante.
      const allowWanted = 'autoplay; encrypted-media; picture-in-picture; fullscreen';

      const curr = (f.getAttribute('allow') || '').toLowerCase();
      const needsAutoplay = !curr.includes('autoplay');
      const needsFullscreen = !curr.includes('fullscreen');
      const needsPip = !curr.includes('picture-in-picture');
      const needsEncrypted = !curr.includes('encrypted-media');

      if (needsAutoplay || needsFullscreen || needsPip || needsEncrypted) {
        f.setAttribute('allow', allowWanted);
      }

      // 3) Bonnes pratiques / perf
      f.setAttribute('loading', 'lazy');
      f.style.width = '100%';
    });

    div.querySelectorAll('video').forEach(v => {
      v.removeAttribute('autoplay');
      v.setAttribute('playsinline', '');
      v.setAttribute('controls', '');
    });

  });
}



  // URLs articles : window.__buildArticlesHtmlLoadUrls (articles-format-html-urls.js, Storage + jsZC/)

//ajout récent pour traiter le cas des articles avec seulement iframe
	function isArticleIframeOnly(articleDiv) {
		if (!articleDiv) return false;

		const iframes = articleDiv.querySelectorAll("iframe");
		if (iframes.length !== 1) return false;

		// Texte réel (hors iframe)
		const clone = articleDiv.cloneNode(true);
		clone.querySelectorAll("iframe, style, script").forEach(n => n.remove());

		const text = clone.textContent.replace(/\s+/g, "").trim();
		return text.length < 30; // seuil volontairement bas
	}
  // ================== Loader scripts ==================
  (function initScriptFallbackUtils() {
    const w = window;

    // Versioning partagé
    if (typeof w.__withV !== 'function') {
      const v = (w.textVersion || w.dateVersion || localStorage.getItem('zcVersion') || '');
      w.__withV = function withV(url) {
        if (!url || !v) return url;
        return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(v);
      };
    }

    // Déduplication promesse
    if (!w.__loadedScripts) w.__loadedScripts = Object.create(null);

    if (typeof w.loadScriptOnce !== 'function') {
      w.loadScriptOnce = function loadScriptOnce(url) {
        if (!url) return Promise.resolve();
        if (w.__loadedScripts[url]) return w.__loadedScripts[url];

        const p = new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = url;
          s.async = false;
          s.onload = () => resolve(url);
          s.onerror = () => reject(new Error('Échec chargement: ' + url));
          document.head.appendChild(s);
        });

        w.__loadedScripts[url] = p;
        return p;
      };
    }

    if (typeof w.loadFirstAvailable !== 'function') {
      w.loadFirstAvailable = async function (urls) {
        let last;
        for (const u of urls) {
          try { return await w.loadScriptOnce(u); }
          catch (e) { last = e; console.warn('[loader]', e?.message || e); }
        }
        throw last || new Error('Aucune source valide');
      };
    }
  })();

  // ================== État interne ==================
  let allArticlesDOM = [];
  let filteredArticles = [];
  let lastArticlesQueryText = "";

  // ================== Titres ==================
  function setH2Safe(div, text) {
    let h2 = div.querySelector('h2');
    if (!h2) {
      h2 = document.createElement('h2');
      div.insertBefore(h2, div.firstChild || null);
    }
    h2.textContent = text || 'Sans titre';
  }

  function completerTitresDepuisCorps(list) {
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();

    (list || []).forEach((div, idx) => {
      try {
        let h2 = div.querySelector('h2');
        if (!h2) {
          h2 = document.createElement('h2');
          div.insertBefore(h2, div.firstChild || null);
        }

        const current = norm(h2.textContent);
        if (current && !/^sans\s*titre$/i.test(current)) return;

        let titre = '';
        const corps = div.querySelector('.corps');
        const art = corps ? corps.querySelector('article[id]') : null;

        if (art) {
          for (const a of ['data-title', 'title', 'aria-label']) {
            const v = norm(art.getAttribute(a) || '');
            if (v) { titre = v; break; }
          }

          if (!titre) {
            const hh = art.querySelector('h1, h2, header h1, .post-title, .entry-title');
            if (hh && norm(hh.textContent)) titre = norm(hh.textContent);
          }

          if (!titre) {
            const txt = norm(art.textContent || '');
            if (txt.length > 10) titre = txt.split(/\n|\./)[0].slice(0, 140);
          }
        }

        if (!titre && corps) {
          const h = corps.querySelector('h1, h2, .post-title, .entry-title');
          if (h && norm(h.textContent)) titre = norm(h.textContent);

          if (!titre) {
            const txt = norm(corps.textContent || '');
            titre = txt.length > 10 ? txt.split(/\n|\./)[0].slice(0, 140) : '';
          }
        }

        if (!titre) {
          const fb = norm(div.textContent || '');
          titre = fb ? fb.split(/\n|\./)[0].slice(0, 140) : 'Sans titre';
        }

        h2.textContent = titre || 'Sans titre';

      } catch (e) {
        console.warn('Titre non généré pour article #' + idx, e);
        try { setH2Safe(div, 'Sans titre'); } catch {}
      }
    });
  }

	//////////////////////////////////////////
  // ================== Recherche & affichage ==================
  function initSearch() {
    filteredArticles = allArticlesDOM;
    displayArticles();
    try { if (typeof window.syncParamTogglesChrome === "function") window.syncParamTogglesChrome(); } catch (_) {}

    const input = document.getElementById('searchInput');
    const btnClear = document.getElementById('btnClearInput');
    if (!input) return;
    if (btnClear && typeof window.bindSearchClearVisibility === "function") {
      window.bindSearchClearVisibility(input, btnClear);
    }

    input.addEventListener('input', () => {
      filterArticles();
      syncDigneDeFoiBlogHeaderLink();
    });

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        input.value = '';
        try {
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (_) {}
        filterArticles();
        syncDigneDeFoiBlogHeaderLink();
        input.focus();
      });
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.value = '';
        try {
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (_) {}
        filterArticles();
        syncDigneDeFoiBlogHeaderLink();
      }
    });

    syncDigneDeFoiBlogHeaderLink();

    if (!window.__articlesSearchPrefsListenerBound) {
      window.__articlesSearchPrefsListenerBound = true;
      window.addEventListener("zc:search-prefs-changed", () => {
        const inp = document.getElementById("searchInput");
        const list = document.getElementById("articleList");
        if (!inp || !list) return;
        try { inp.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) {}
        filterArticles();
        displayArticles();
        setTimeout(() => {
          try { filterArticles(); displayArticles(); } catch (_) {}
        }, 0);
        try { if (typeof window.syncParamTogglesChrome === "function") window.syncParamTogglesChrome(); } catch (_) {}
      });
    }
  }

  function normalizeArticlesSearchText(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function articlesGetSearchPrefs() {
    if (typeof window.zcGetSearchPrefs === "function") {
      try { return window.zcGetSearchPrefs(); } catch (_) { }
    }
    return {
      me: !!window.paramRechercheMotEntier,
      mc: !!window.paramRechercheOrdreContigu
    };
  }

  function articlesContainsWholeWord(haystack, needle) {
    const n = String(needle || "").trim();
    if (!n) return false;
    const re = new RegExp("(^|[^\\p{L}\\p{N}_])" + escapeRegex(n) + "($|[^\\p{L}\\p{N}_])", "iu");
    return re.test(String(haystack || ""));
  }

  function articlesMatchesByPrefs(haystack, query, prefs) {
    const text = normalizeArticlesSearchText(haystack);
    const q = normalizeArticlesSearchText(query);
    if (!q) return true;
    const meOn = !!(prefs && prefs.me);
    const mcOn = !!(prefs && prefs.mc);
    if (mcOn) return meOn ? articlesContainsWholeWord(text, q) : text.includes(q);
    const tokens = q.split(/\s+/).map((t) => t.trim()).filter(Boolean);
    if (!tokens.length) return true;
    if (meOn) return tokens.every((t) => articlesContainsWholeWord(text, t));
    return tokens.every((t) => text.includes(t));
  }

  function filterArticles() {
    const input = document.getElementById("searchInput");
    if (!input) return;

    const q = normalizeArticlesSearchText(input.value);
    lastArticlesQueryText = String(input.value || "");
    const prefs = articlesGetSearchPrefs();

    filteredArticles = allArticlesDOM.filter(article => {
      const titre = article.querySelector("h2")?.textContent || "";
      const contenu = article.textContent || "";
      const full = String(titre || "") + " " + String(contenu || "");
      return !q || articlesMatchesByPrefs(full, q, prefs);
    });

    displayArticles();
  }

  function displayArticles() {
    const ul = document.getElementById("articleList");
    const counter = document.getElementById("resultCount");
    if (!ul || !counter) return;

    ul.innerHTML = "";
    const searchInput = document.getElementById("searchInput");
    const queryText = searchInput ? String(searchInput.value || "") : "";
    lastArticlesQueryText = queryText;
    const prefs = articlesGetSearchPrefs();

    const totalArticles = Array.isArray(allArticlesDOM) ? allArticlesDOM.length : 0;
    if (filteredArticles.length === 0) {
      ul.innerHTML = "<li>Aucun résultat</li>";
      counter.textContent = `📄 Aucun article trouvé : 0 / ${totalArticles}`;
      return;
    }

    let i = 1;

    filteredArticles.forEach(article => {
      const li = document.createElement("li");
      li.className = "zc-forum-reader-li zc-record-languette zc-record-languette--article";

      // Image d'aperçu
			const img = article.querySelector("img");
			if (img) {
				const src = (img.currentSrc || img.src || "").trim();
				if (src) {
					const c = document.createElement("img");
					c.src = src;
					c.className = "article-img";
					c.alt = img.alt || "Illustration de l’article";
					li.appendChild(c);
				}
			}

      const textDiv = document.createElement("div");
      textDiv.className = "text-content";

      const titreRaw = article.querySelector("h2")?.textContent || "Sans titre";
      const titre = sanitizeCorruptedHighlightText(titreRaw) || "Sans titre";
      const a = document.createElement("a");
      a.href = "#";
      applyHighlightsToElementText(a, titre, queryText, prefs);
      a.onclick = () => {
        afficherArticleDansPopup(titre);
        return false;
      };

      const dateTxt = article.querySelector(".date")?.textContent || "";
      const date = document.createElement("div");
      date.textContent = `(${i++}) 🗓 ${dateTxt}`;

      const p = document.createElement("p");
      p.className = "article-list-snippet";
      const snippetText = isArticleIframeOnly(article)
        ? "📄 Article interactif (contenu externe)"
        : extraitApercuDepuisPremierP(article.innerHTML, 320);
      // Evite toute injection/artefact HTML dans les extraits tronqués.
      applyHighlightsToElementText(p, snippetText, queryText, prefs);

      textDiv.appendChild(a);
      textDiv.appendChild(date);
      textDiv.appendChild(p);

      li.appendChild(textDiv);
      ul.appendChild(li);
    });

    counter.textContent = `📄 Articles trouvés : ${filteredArticles.length} / ${totalArticles}`;
  }

  // =============== Déduplication ======================
  function dedupArticles(list) {
    const seen = new Map();
    const out = [];
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();

    for (const a of list) {
      const titre = norm(a.querySelector('h2')?.textContent || a.getAttribute('data-titre') || '');

      const apercu = (() => {
        const tmp = document.createElement('div');
        tmp.innerHTML = a.innerHTML;
        const root = tmp.querySelector('.corps') || tmp;
        const p = Array.from(root.querySelectorAll('p')).find(
          el => norm(el.textContent).length > 10
        );
        return norm(p ? p.textContent : root.textContent).slice(0, 120);
      })();

      const key = titre + "|" + apercu;
      if (!seen.has(key)) {
        seen.set(key, true);
        out.push(a);
      }
    }

    return out;
  }

  // ================== Fonctions de copie ==================
  (function exposeCopyHelpers() {
    const w = window;

    if (typeof w.copierContenuModal !== 'function') {
      w.copierContenuModal = function (contenuId) {
        try {
          const el = document.getElementById(contenuId);
          if (!el) return false;

          const txt = el.innerText || el.textContent || '';
          if (!txt.trim()) return false;

          if (navigator.clipboard?.writeText) {
            return navigator.clipboard.writeText(txt)
              .then(() => true)
              .catch(() => false);
          }

          const ta = document.createElement('textarea');
          ta.value = txt;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();

          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          return ok;

        } catch {
          return false;
        }
      };
    }

    if (typeof w._materialiserHtmlPourCopie !== 'function') {
      w._materialiserHtmlPourCopie = function (root, link) {
        const clone = root.cloneNode(true);

        clone.querySelectorAll('img').forEach(img => {
          try {
            let s = img.currentSrc || img.src || '';
            if (s) {
              try { s = new URL(s, location.href).toString(); } catch {}
              img.src = s;
            }
            img.removeAttribute('loading');
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
          } catch {}
        });

        clone.querySelectorAll('iframe[src]').forEach(f => {
          try { f.src = new URL(f.src, location.href).toString(); } catch {}
          f.setAttribute('loading', 'lazy');
          f.style.width = '100%';
        });

        clone.querySelectorAll('video,source').forEach(el => {
          ['src', 'poster'].forEach(attr => {
            const v = el.getAttribute(attr);
            if (v) {
              try { el.setAttribute(attr, new URL(v, location.href).toString()); } catch {}
            }
          });
        });

        const foot = document.createElement('div');
        foot.style.marginTop = '20px';
        foot.innerHTML =
          `<hr><p>Source : <a href="${link}" target="_blank">${link}</a></p>`;
        clone.appendChild(foot);

        return clone.innerHTML;
      };
    }

    if (typeof w.copierHtmlDepuisElement !== 'function') {
      w.copierHtmlDepuisElement = async function (id, zone, link) {
        try {
          const el = document.getElementById(id);
          if (!el) return false;

          const html = w._materialiserHtmlPourCopie(el, link || '');
          const txt = el.innerText || el.textContent || '';

          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({
              'text/html': new Blob([html], { type: 'text/html' }),
              'text/plain': new Blob([txt], { type: 'text/plain' })
            });
            await navigator.clipboard.write([item]);
            return true;
          }

          const helper = document.createElement('div');
          helper.contentEditable = 'true';
          helper.style.position = 'fixed';
          helper.style.left = '-9999px';
          helper.innerHTML = html;
          document.body.appendChild(helper);

          const range = document.createRange();
          range.selectNodeContents(helper);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);

          const ok = document.execCommand('copy');
          sel.removeAllRanges();
          document.body.removeChild(helper);

          return ok;

        } catch {
          return false;
        }
      };
    }

  })();

  // ================== Lien de partage ==================
  function buildShareLink(el, titre) {
    let href = '';
    try { href = el?.querySelector('a[href*="blogspot.com"]')?.href || ''; } catch {}
    if (href) return href;

    const raw = (titre || '').trim();
    try {
      const u = new URL(window.location.href);
      // Partir de l'URL en cours (host local ou prod), puis injecter les params de partage.
      u.searchParams.set("prog", "articlesHtml");
      u.searchParams.set("prefil", raw);
      return u.toString();
    } catch (_) {
      const pre = encodeURIComponent(raw);
      return `?prog=articlesHtml&prefil=${pre}`;
    }
  }

  /**
   * Modèle URL blog (stable) : …/search?q=…&m=1
   * Si query vide → …/search (sans query string).
   */
  function buildDigneDeFoiSearchUrl(queryText) {
    const q = String(queryText || "").replace(/\s+/g, " ").trim();
    if (window.ALFAMOUS_URLS && typeof window.ALFAMOUS_URLS.blogSearchUrl === "function") {
      return window.ALFAMOUS_URLS.blogSearchUrl(q);
    }
    const base = "https://lexique-coran.blogspot.com/search";
    if (!q) return base;
    return base + "?q=" + encodeURIComponent(q) + "&m=1";
  }

  function syncDigneDeFoiBlogHeaderLink() {
    const a = document.getElementById("linkDigneDeFoiBlogHeader");
    const inp = document.getElementById("searchInput");
    if (!a) return;
    a.href = buildDigneDeFoiSearchUrl(inp ? inp.value : "");
  }

  function syncDigneDeFoiArticleLink(a, articleTitle) {
    if (a) a.href = buildDigneDeFoiSearchUrl(articleTitle);
  }

  function escapeRegex(s) {
    return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function tokenizeHighlightTerms(text) {
    return Array.from(
      new Set(
        String(text || "")
          .split(/\s+/)
          .map(t => t.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => b.length - a.length);
  }

  function articlesPickSearchText() {
    const active = document.activeElement;
    if (active && active.id === "searchInput") return active.value || "";
    const inputVal = document.getElementById("searchInput")?.value || "";
    const motVal = document.getElementById("mot")?.value || "";
    let best = String(lastArticlesQueryText || "");
    if (String(inputVal).length > best.length) best = String(inputVal);
    if (String(motVal).length > best.length) best = String(motVal);
    return best;
  }

  function articlesPickHighlightTexts() {
    const searchText = document.getElementById("searchInput")?.value || "";
    const motText = document.getElementById("mot")?.value || "";
    const articleText = articlesPickSearchText();
    const primary = tokenizeHighlightTerms(searchText);
    const fallback = tokenizeHighlightTerms(motText);
    const tertiary = tokenizeHighlightTerms(articleText);
    return { primary, fallback, tertiary, searchText, motText, articleText };
  }

  function applyHighlightsToElementText(el, text, queryText, prefs) {
    if (!el) return;
    el.textContent = String(text || "");
    const phrase = String(queryText || "").trim();
    if (!phrase) return;
    const meOn = !!(prefs && prefs.me);
    const mcOn = !!(prefs && prefs.mc);
    const terms = mcOn ? [phrase] : tokenizeHighlightTerms(phrase);
    if (!terms.length) return;
    highlightTermsInNode(el, terms, { wholeWord: meOn });
  }

  function highlightTermsInNode(rootEl, terms, opts) {
    if (!rootEl || !terms || !terms.length) return 0;
    const options = opts || {};
    const wholeWord = !!options.wholeWord;
    const escaped = terms.map(escapeRegex).join("|");
    const rx = wholeWord
      ? new RegExp("(^|[^\\p{L}\\p{N}_])(" + escaped + ")(?=$|[^\\p{L}\\p{N}_])", "giu")
      : new RegExp("(" + escaped + ")", "gi");
    let hits = 0;

    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);

    for (const node of textNodes) {
      const parent = node.parentElement;
      if (!parent) continue;
      if (/(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|PRE)/.test(parent.tagName)) continue;
      if (parent.closest(".article-term-hit, .zc-term-hit")) continue;
      const txt = node.nodeValue || "";
      if (!txt.trim()) continue;
      if (!rx.test(txt)) continue;
      rx.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let last = 0;
      if (wholeWord) {
        txt.replace(rx, (m, g1, g2, off) => {
          const start = off + String(g1 || "").length;
          if (start > last) frag.appendChild(document.createTextNode(txt.slice(last, start)));
          const mark = document.createElement("span");
          mark.className = "article-term-hit";
          mark.style.background = "var(--zc-hit-bg, #fff2a8)";
          mark.style.color = "var(--zc-hit-fg, inherit)";
          mark.style.borderRadius = "3px";
          mark.style.padding = "0 1px";
          mark.textContent = String(g2 || "");
          frag.appendChild(mark);
          hits++;
          last = off + m.length;
          return m;
        });
      } else {
        txt.replace(rx, (m, _g1, off) => {
          if (off > last) frag.appendChild(document.createTextNode(txt.slice(last, off)));
          const mark = document.createElement("span");
          mark.className = "article-term-hit";
          mark.style.background = "var(--zc-hit-bg, #fff2a8)";
          mark.style.color = "var(--zc-hit-fg, inherit)";
          mark.style.borderRadius = "3px";
          mark.style.padding = "0 1px";
          mark.textContent = m;
          frag.appendChild(mark);
          hits++;
          last = off + m.length;
          return m;
        });
      }
      if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
      parent.replaceChild(frag, node);
    }
    return hits;
  }

  function highlightContiguousPhraseInNode(rootEl, phrase, opts) {
    const q = String(phrase || "").trim();
    if (!rootEl || !q) return 0;
    const options = opts || {};
    const wholeWord = !!options.wholeWord;
    const safe = escapeRegex(q);
    const rx = wholeWord
      ? new RegExp("(^|[^\\p{L}\\p{N}_])(" + safe + ")(?=$|[^\\p{L}\\p{N}_])", "giu")
      : new RegExp("(" + safe + ")", "gi");

    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
    const chunks = [];
    let joined = "";
    let n;
    while ((n = walker.nextNode())) {
      const parent = n.parentElement;
      if (!parent) continue;
      if (/(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|PRE)/.test(parent.tagName)) continue;
      if (parent.closest(".article-term-hit, .zc-term-hit")) continue;
      const txt = n.nodeValue || "";
      if (!txt) continue;
      const start = joined.length;
      joined += txt;
      chunks.push({ node: n, start, end: joined.length });
    }
    if (!joined.trim() || !chunks.length) return 0;

    const matches = [];
    let m;
    while ((m = rx.exec(joined))) {
      if (!m) break;
      const g1 = wholeWord ? String(m[1] || "") : "";
      const g2 = wholeWord ? String(m[2] || "") : String(m[1] || "");
      const start = m.index + g1.length;
      const end = start + g2.length;
      if (end > start) matches.push({ start, end });
      if (rx.lastIndex === m.index) rx.lastIndex++;
    }
    if (!matches.length) return 0;

    const locate = (idx) => {
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        if (idx >= c.start && idx < c.end) return { node: c.node, offset: idx - c.start };
      }
      const last = chunks[chunks.length - 1];
      return { node: last.node, offset: (last.node.nodeValue || "").length };
    };

    let hits = 0;
    for (let i = matches.length - 1; i >= 0; i--) {
      const r = matches[i];
      const a = locate(r.start);
      const b = locate(r.end);
      if (!a || !b || !a.node || !b.node) continue;
      try {
        const range = document.createRange();
        range.setStart(a.node, a.offset);
        range.setEnd(b.node, b.offset);
        const mark = document.createElement("span");
        mark.className = "article-term-hit zc-term-hit";
        const frag = range.extractContents();
        mark.appendChild(frag);
        range.insertNode(mark);
        hits++;
      } catch (_) { }
    }
    return hits;
  }

  function applyPopupHighlights(rootEl) {
    if (!rootEl) return;
    const prefs = articlesGetSearchPrefs();
    const wholeWord = !!prefs.me;
    const contig = !!prefs.mc;
    const picks = articlesPickHighlightTexts();
    const primaryPhrase = String(picks.articleText || picks.searchText || "").trim();
    const fallbackPhrase = String(picks.motText || "").trim();
    let hits = 0;
    if (contig) {
      if (primaryPhrase) hits = highlightContiguousPhraseInNode(rootEl, primaryPhrase, { wholeWord });
      if (!hits && fallbackPhrase) hits = highlightContiguousPhraseInNode(rootEl, fallbackPhrase, { wholeWord });
      return;
    }
    if (picks.primary.length) hits = highlightTermsInNode(rootEl, picks.primary, { wholeWord });
    if (!hits && picks.fallback.length) hits = highlightTermsInNode(rootEl, picks.fallback, { wholeWord });
    if (!hits && picks.tertiary.length) highlightTermsInNode(rootEl, picks.tertiary, { wholeWord });
  }

  function schedulePopupHighlights() {
    const run = () => {
      try {
        const mounted = document.getElementById("contenuTexteArticle");
        if (mounted) applyPopupHighlights(mounted);
      } catch (_) { }
    };
    requestAnimationFrame(run);
    setTimeout(run, 60);
  }
//////////////////////////////////////
  // ================== Popup indépendante Articles ==================
  function ouvrirPopupHtmlArticle() {
    const popup = document.getElementById("popupArticleHtml");
    if (!popup) return;

    const topZ = getNextZIndex();
    popup.style.zIndex = String(topZ);
    popup.style.display = "block";
  }

  function fermerPopupHtmlArticle() {
    const popup = document.getElementById("popupArticleHtml");
    if (!popup) return;

    popup.style.display = "none";
    popup.style.zIndex = "";
  }

  function articlePopupAlert(msg) {
    if (typeof alertMsgBoxPopup === "function") {
      try {
        alertMsgBoxPopup(msg);
        return;
      } catch (_) {}
    }
    try {
      window.alert(msg);
    } catch (_) {}
  }

  function sanitizeArticleVideoFileBase(name) {
    let s = String(name || "article").trim();
    s = s
      .replace(/[\u0000-\u001f\u007f\\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (s.length > 80) s = s.slice(0, 80).replace(/_+$/g, "");
    return s || "article";
  }

  function pickArticleVideoRecorderMime() {
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== "function") {
      return "";
    }
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ];
    for (let i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return "";
  }

  function articleVideoNotifyDone(opts, ok) {
    if (opts && typeof opts.onDone === "function") {
      try {
        opts.onDone(!!ok);
      } catch (_) {}
    }
  }

  function latinLangKeyForArticleVideo() {
    try {
      if (typeof window.getUILang === "function") {
        const ui = String(window.getUILang() || "fr")
          .toLowerCase()
          .slice(0, 2);
        if (ui === "en" || ui === "es") return ui;
        if (ui === "ar") return "fr";
      }
    } catch (_) {}
    return "fr";
  }

  function langTagToLangKey(langTag) {
    const t = String(langTag || "").toLowerCase();
    if (t.indexOf("ar") === 0) return "ar";
    if (t.indexOf("en") === 0) return "en";
    if (t.indexOf("es") === 0) return "es";
    return "fr";
  }

  function splitArticleTextForVideo(text) {
    const latinTag =
      latinLangKeyForArticleVideo() === "en"
        ? "en-US"
        : latinLangKeyForArticleVideo() === "es"
          ? "es-ES"
          : "fr-FR";
    let segs = [];
    if (typeof window.zcSplitTextByScriptForTts === "function") {
      segs = window.zcSplitTextByScriptForTts(text, latinTag) || [];
    }
    if (!segs.length) {
      segs = [{ text: text, lang: latinTag, start: 0 }];
    }
    /* Fusionner les segments adjacents de même langue. */
    const merged = [];
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const prev = merged[merged.length - 1];
      if (prev && prev.lang === s.lang) {
        prev.text += s.text;
      } else {
        merged.push({ text: s.text, lang: s.lang, start: s.start });
      }
    }
    return merged;
  }

  function downloadArticleVideoBlob(blob, fileBase) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sanitizeArticleVideoFileBase(fileBase) + ".webm";
    document.body.appendChild(a);
    a.click();
    try {
      a.remove();
    } catch (_) {}
    window.setTimeout(function () {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {}
    }, 2500);
  }

  function normalizeArticleVideoText(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t\u00a0\f\v]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function wrapArticleVideoWords(text) {
    const words = [];
    const re = /\S+|\n+/g;
    let m;
    const s = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    while ((m = re.exec(s)) !== null) {
      if (/^\n+$/.test(m[0])) {
        words.push({
          text: m[0],
          start: m.index,
          end: m.index + m[0].length,
          weight: 0,
          isBreak: true,
          breakLines: m[0].length >= 2 ? 2 : 1
        });
      } else {
        const isAr = /[\u0600-\u06FF]/.test(m[0]);
        const chars = Array.from(m[0]).length;
        let weight = Math.max(1, Math.round(chars * (isAr ? 1.8 : 1)));
        /* Réfs de versets (#55.1) : la synthèse FR dure plus longtemps que le nb de caractères. */
        if (/^#?\d+(?:[.:]\d+)+$/.test(m[0]) || /^#\d+/.test(m[0])) {
          weight = Math.max(weight * 4, 18);
        }
        words.push({
          text: m[0],
          start: m.index,
          end: m.index + m[0].length,
          weight: weight,
          isBreak: false,
          breakLines: 0,
          isAr: isAr
        });
      }
    }
    return words;
  }

  function wordIndexFromWeightedProgress(segWords, progress01) {
    if (!segWords.length) return 0;
    const speakable = [];
    for (let i = 0; i < segWords.length; i++) {
      if (segWords[i] && segWords[i].weight > 0 && !segWords[i].isBreak) {
        speakable.push({ local: i, weight: segWords[i].weight });
      }
    }
    if (!speakable.length) return 0;
    const total = speakable.reduce(function (acc, w) {
      return acc + w.weight;
    }, 0);
    const target = Math.min(1, Math.max(0, progress01)) * total;
    let acc = 0;
    for (let i = 0; i < speakable.length; i++) {
      acc += speakable[i].weight;
      if (target <= acc) return speakable[i].local;
    }
    return speakable[speakable.length - 1].local;
  }

  /**
   * Aligne les mots affichés sur le texte réellement envoyé au TTS (spokenText).
   */
  function attachSegmentSyncWords(allWords, seg) {
    const spokenWords = wrapArticleVideoWords(seg.spokenText || "").filter(function (w) {
      return !w.isBreak && w.weight > 0;
    });
    const raw = String(seg.text || "");
    const end = seg.start + raw.length;
    const inRange = [];
    for (let wi = 0; wi < allWords.length; wi++) {
      if (allWords[wi].isBreak) continue;
      if (allWords[wi].start >= seg.start && allWords[wi].start < end) {
        inRange.push(wi);
      }
    }
    seg.wordIndexes = [];
    seg.segWords = [];
    const n = Math.min(spokenWords.length, inRange.length);
    for (let i = 0; i < n; i++) {
      const gi = inRange[i];
      seg.wordIndexes.push(gi);
      seg.segWords.push({
        text: spokenWords[i].text,
        start: allWords[gi].start,
        end: allWords[gi].end,
        weight: spokenWords[i].weight,
        isBreak: false
      });
    }
  }

  async function resolveMesNoteMp3Url(payload) {
    if (payload && payload.downloadURL) return String(payload.downloadURL);
    const storagePath = payload && payload.storagePath;
    if (!storagePath || typeof firebase === "undefined" || !firebase.storage) return "";
    try {
      return await firebase.storage().ref(storagePath).getDownloadURL();
    } catch (_) {
      return "";
    }
  }

  async function synthesizeArticleVideoSegment(segText, langKey, subject) {
    const fn = firebase
      .app()
      .functions("europe-west1")
      .httpsCallable("synthesizeMesNoteAudio", { timeout: 120000 });
    const res = await fn({
      text: segText,
      subject: subject,
      langKey: langKey,
      speechBodyOnly: true
    });
    const payload = res && res.data;
    const mp3Url = await resolveMesNoteMp3Url(payload);
    if (!mp3Url) throw new Error("mp3_url");
    const resp = await fetch(mp3Url);
    if (!resp.ok) throw new Error("fetch_mp3");
    return await resp.arrayBuffer();
  }

  /**
   * Karaoke canvas + buffers audio (segments ar/fr) muxés → WebM synchronisé.
   * Défilement auto sur le mot actif ; ✖ / Échap annule sans téléchargement.
   */
  function recordCanvasKaraokeWithAudioBuffers(fullText, preparedSegs, opts) {
    return new Promise(function (resolve) {
      const words = wrapArticleVideoWords(fullText);
      preparedSegs.forEach(function (seg) {
        attachSegmentSyncWords(words, seg);
      });

      const wrap = document.createElement("div");
      wrap.id = "zcArticleVideoRecOverlay";
      Object.assign(wrap.style, {
        position: "fixed",
        inset: "0",
        zIndex: "2147483000",
        background: "rgba(15,23,42,.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box"
      });

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.textContent = "✖";
      closeBtn.title = "Fermer sans télécharger";
      closeBtn.setAttribute("aria-label", "Fermer sans télécharger la vidéo");
      Object.assign(closeBtn.style, {
        position: "fixed",
        top: "14px",
        right: "18px",
        zIndex: "2147483001",
        width: "44px",
        height: "44px",
        border: "none",
        borderRadius: "10px",
        background: "rgba(15,23,42,.85)",
        color: "#fff",
        fontSize: "22px",
        fontWeight: "700",
        cursor: "pointer",
        lineHeight: "1",
        boxShadow: "0 4px 16px rgba(0,0,0,.35)"
      });

      const canvas = document.createElement("canvas");
      canvas.width = Math.min(1280, Math.max(640, window.innerWidth || 1280));
      canvas.height = Math.min(720, Math.max(360, window.innerHeight || 720));
      Object.assign(canvas.style, {
        width: "min(96vw, 1280px)",
        height: "auto",
        maxHeight: "92vh",
        borderRadius: "12px",
        background: "#0b1220",
        boxShadow: "0 12px 40px rgba(0,0,0,.35)"
      });
      wrap.appendChild(canvas);
      wrap.appendChild(closeBtn);
      document.body.appendChild(wrap);

      const headerTitle = String(
        (opts && (opts.title || opts.fileBase)) || "Alfamous"
      ).trim() || "Alfamous";

      const ctx2d = canvas.getContext("2d");
      let activeWi = 0;
      let raf = 0;
      let stopped = false;
      let wantDownload = true;
      let highlightFn = function () {};
      let currentSource = null;
      let wordLayout = null;

      function buildWordLayout() {
        if (!ctx2d) return [];
        const w = canvas.width;
        const leftM = 40;
        const rightM = w - 40;
        const lineH = 44;
        const fontBody = "32px Tahoma, 'Segoe UI', 'Noto Naskh Arabic', sans-serif";
        ctx2d.font = fontBody;
        const layout = [];
        let y = 0;
        let inRtl = false;
        let xLtr = leftM;
        let xRtl = rightM;
        let lineHasGlyph = false;

        function newLine() {
          y += lineH;
          xLtr = leftM;
          xRtl = rightM;
          lineHasGlyph = false;
        }

        for (let i = 0; i < words.length; i++) {
          const W = words[i];
          if (W.isBreak) {
            inRtl = false;
            xLtr = leftM;
            xRtl = rightM;
            y += lineH * (W.breakLines || 1);
            lineHasGlyph = false;
            continue;
          }
          const isAr = /[\u0600-\u06FF]/.test(W.text);
          ctx2d.direction = isAr ? "rtl" : "ltr";
          const word = W.text + " ";
          const ww = Math.max(1, ctx2d.measureText(word).width);

          if (isAr) {
            if (!inRtl) {
              if (lineHasGlyph) newLine();
              inRtl = true;
              xRtl = rightM;
            }
            if (xRtl - ww < leftM && lineHasGlyph) {
              newLine();
              inRtl = true;
              xRtl = rightM;
            }
            const xLeft = xRtl - ww;
            layout.push({
              i: i,
              x: xLeft,
              y: y,
              w: ww,
              lineH: lineH,
              isAr: true,
              word: word
            });
            xRtl = xLeft;
            lineHasGlyph = true;
          } else {
            if (inRtl) {
              if (lineHasGlyph) newLine();
              inRtl = false;
              xLtr = leftM;
            }
            if (xLtr + ww > rightM && lineHasGlyph) {
              newLine();
            }
            layout.push({
              i: i,
              x: xLtr,
              y: y,
              w: ww,
              lineH: lineH,
              isAr: false,
              word: word
            });
            xLtr += ww;
            lineHasGlyph = true;
          }
        }
        ctx2d.direction = "ltr";
        return layout;
      }

      function drawHeaderTitle(w) {
        ctx2d.fillStyle = "#e2e8f0";
        ctx2d.font = "bold 26px Tahoma, 'Segoe UI', 'Noto Naskh Arabic', sans-serif";
        ctx2d.textAlign = "center";
        ctx2d.direction = "ltr";
        const maxTitleW = w - 100;
        let label = headerTitle;
        if (ctx2d.measureText(label).width > maxTitleW) {
          while (label.length > 4 && ctx2d.measureText(label + "…").width > maxTitleW) {
            label = label.slice(0, -1);
          }
          label += "…";
        }
        const isAr = /[\u0600-\u06FF]/.test(headerTitle);
        ctx2d.direction = isAr ? "rtl" : "ltr";
        ctx2d.fillText(label, w / 2, 48);
        ctx2d.direction = "ltr";
      }

      function drawFrame() {
        if (!ctx2d) return;
        if (!wordLayout) wordLayout = buildWordLayout();
        const w = canvas.width;
        const h = canvas.height;
        const headerH = 88;
        const footerPad = 28;
        const viewH = h - headerH - footerPad;

        let scrollY = 0;
        let activeLayout = null;
        for (let li = 0; li < wordLayout.length; li++) {
          if (wordLayout[li].i === activeWi) {
            activeLayout = wordLayout[li];
            break;
          }
        }
        if (activeLayout) {
          const target = activeLayout.y + activeLayout.lineH / 2 - viewH / 2;
          scrollY = Math.max(0, target);
        }

        ctx2d.fillStyle = "#0b1220";
        ctx2d.fillRect(0, 0, w, h);
        drawHeaderTitle(w);

        ctx2d.save();
        ctx2d.beginPath();
        ctx2d.rect(0, headerH, w, viewH);
        ctx2d.clip();

        /* textBaseline top : la 1re ligne (y=0) reste visible sous le titre. */
        ctx2d.textBaseline = "top";
        ctx2d.textAlign = "left";
        ctx2d.direction = "ltr";
        ctx2d.font = "32px Tahoma, 'Segoe UI', 'Noto Naskh Arabic', sans-serif";
        for (let i = 0; i < wordLayout.length; i++) {
          const L = wordLayout[i];
          const drawY = headerH + L.y - scrollY;
          if (drawY + L.lineH < headerH || drawY > headerH + viewH) continue;
          ctx2d.fillStyle = L.i === activeWi ? "#fbbf24" : "#e2e8f0";
          ctx2d.fillText(L.word, L.x, drawY);
        }
        ctx2d.restore();
        ctx2d.textBaseline = "alphabetic";
        ctx2d.textAlign = "left";
        ctx2d.direction = "ltr";
      }

      function tick() {
        if (stopped) return;
        try {
          highlightFn();
        } catch (_) {}
        drawFrame();
        raf = window.requestAnimationFrame(tick);
      }

      const canvasStream = canvas.captureStream(30);
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const tracks = canvasStream.getVideoTracks().slice();
      const audioTracks = dest.stream.getAudioTracks();
      for (let i = 0; i < audioTracks.length; i++) tracks.push(audioTracks[i]);

      if (!audioTracks.length) {
        try {
          wrap.remove();
        } catch (_) {}
        try {
          audioCtx.close();
        } catch (_) {}
        articlePopupAlert("Impossible d’attacher la piste audio à la vidéo.");
        resolve(false);
        return;
      }

      const mixed = new MediaStream(tracks);
      const mime = pickArticleVideoRecorderMime();
      let recorder;
      try {
        recorder = mime
          ? new MediaRecorder(mixed, { mimeType: mime, videoBitsPerSecond: 2500000 })
          : new MediaRecorder(mixed);
      } catch (_) {
        try {
          wrap.remove();
        } catch (_) {}
        try {
          audioCtx.close();
        } catch (_) {}
        articlePopupAlert("Impossible de démarrer l’enregistreur vidéo.");
        resolve(false);
        return;
      }

      const chunks = [];
      recorder.ondataavailable = function (e) {
        if (e && e.data && e.data.size) chunks.push(e.data);
      };
      recorder.onstop = function () {
        stopped = true;
        try {
          window.cancelAnimationFrame(raf);
        } catch (_) {}
        try {
          document.removeEventListener("keydown", onEsc, true);
        } catch (_) {}
        try {
          wrap.remove();
        } catch (_) {}
        try {
          canvasStream.getTracks().forEach(function (t) {
            t.stop();
          });
        } catch (_) {}
        try {
          audioCtx.close();
        } catch (_) {}
        if (!wantDownload || !chunks.length) {
          resolve(false);
          return;
        }
        downloadArticleVideoBlob(
          new Blob(chunks, { type: recorder.mimeType || "video/webm" }),
          opts && opts.fileBase
        );
        resolve(true);
      };

      function finish(download) {
        if (stopped) return;
        wantDownload = download !== false;
        stopped = true;
        highlightFn = function () {};
        try {
          if (currentSource) currentSource.stop();
        } catch (_) {}
        currentSource = null;
        try {
          if (recorder.state === "recording" && typeof recorder.requestData === "function") {
            recorder.requestData();
          }
        } catch (_) {}
        try {
          if (recorder.state !== "inactive") recorder.stop();
        } catch (_) {}
      }

      function onEsc(ev) {
        if (ev.key === "Escape") {
          ev.preventDefault();
          finish(false);
        }
      }
      document.addEventListener("keydown", onEsc, true);
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      });

      function playBuffer(audioBuffer, seg) {
        return new Promise(function (resolvePlay) {
          if (stopped) {
            resolvePlay();
            return;
          }
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(dest);
          source.connect(audioCtx.destination);
          currentSource = source;
          const startedAt = audioCtx.currentTime;
          const dur = audioBuffer.duration || 0.01;
          /* Compense le silence / padding fréquent en tête des MP3 Google TTS. */
          const leadIn = Math.min(0.28, Math.max(0.08, dur * 0.04));
          const trail = Math.min(0.12, Math.max(0.02, dur * 0.02));
          const effective = Math.max(0.08, dur - leadIn - trail);
          highlightFn = function () {
            const t = audioCtx.currentTime - startedAt - leadIn;
            const p = Math.min(1, Math.max(0, t / effective));
            if (seg.segWords && seg.segWords.length && seg.wordIndexes && seg.wordIndexes.length) {
              const local = wordIndexFromWeightedProgress(seg.segWords, p);
              activeWi = seg.wordIndexes[local];
            }
          };
          source.onended = function () {
            if (currentSource === source) currentSource = null;
            highlightFn = function () {};
            resolvePlay();
          };
          try {
            source.start(0);
          } catch (_) {
            currentSource = null;
            resolvePlay();
          }
        });
      }

      (async function run() {
        try {
          recorder.start(1000);
        } catch (_) {
          articlePopupAlert("Échec du démarrage de l’enregistrement.");
          finish(false);
          resolve(false);
          return;
        }
        if (audioCtx.state === "suspended") {
          try {
            await audioCtx.resume();
          } catch (_) {}
        }
        drawFrame();
        tick();
        for (let i = 0; i < preparedSegs.length; i++) {
          if (stopped) break;
          const seg = preparedSegs[i];
          try {
            const audioBuffer = await audioCtx.decodeAudioData(seg.arrayBuffer.slice(0));
            await playBuffer(audioBuffer, seg);
          } catch (_) {
            /* segment suivant */
          }
        }
        if (!stopped) window.setTimeout(function () {
          finish(true);
        }, 400);
      })();
    });
  }

  /**
   * Vidéo karaoke : titre + corps lus/surlignés ; réfs #s.v en segment FR séparé.
   */
  async function recordArticleReadAloudVideo(text, opts) {
    opts = opts || {};
    const raw = String(text || "").trim();
    if (!raw) {
      articlePopupAlert("Aucun texte à lire dans cet article.");
      articleVideoNotifyDone(opts, false);
      return;
    }
    if (typeof window.MediaRecorder !== "function") {
      articlePopupAlert("MediaRecorder non supporté par ce navigateur.");
      articleVideoNotifyDone(opts, false);
      return;
    }
    if (typeof firebase === "undefined" || !firebase.auth || !firebase.auth().currentUser) {
      articlePopupAlert(
        "Pour une vidéo avec son, connectez-vous : la voix est générée comme le MP3 (Firebase)."
      );
      articleVideoNotifyDone(opts, false);
      return;
    }
    if (!firebase.app || typeof firebase.app().functions !== "function") {
      articlePopupAlert("Firebase Functions indisponible pour la synthèse audio.");
      articleVideoNotifyDone(opts, false);
      return;
    }

    const title = normalizeArticleVideoText(opts.title || "");
    const maxChars = 4500;
    let body = normalizeArticleVideoText(raw);
    let fullText = title ? title + "\n\n" + body : body;
    let truncated = false;
    if (fullText.length > maxChars) {
      fullText = fullText.slice(0, maxChars);
      truncated = true;
    }

    let scriptSegs = splitArticleTextForVideo(fullText);
    if (scriptSegs.length > 12) {
      scriptSegs = scriptSegs.slice(0, 12);
    }
    const proceed = window.confirm(
      "Générer une vidéo karaoke avec son\n\n" +
        "Titre + texte, segments FR/AR auto (réfs #s.v en FR).\n" +
        "Segments : " +
        scriptSegs.length +
        (truncated ? "\nTexte tronqué à " + maxChars + " caractères." : "") +
        "\n\nContinuer ?"
    );
    if (!proceed) {
      articleVideoNotifyDone(opts, false);
      return;
    }

    const base = sanitizeArticleVideoFileBase(opts.fileBase || title || "article");
    const stamp = Date.now();
    const prepared = [];
    try {
      for (let i = 0; i < scriptSegs.length; i++) {
        const seg = scriptSegs[i];
        const segText = normalizeArticleVideoText(seg.text || "");
        if (!segText) continue;
        const langKey = langTagToLangKey(seg.lang);
        const subject = base + "_v" + stamp + "_" + i + "_" + langKey;
        const arrayBuffer = await synthesizeArticleVideoSegment(
          segText,
          langKey,
          subject
        );
        prepared.push({
          text: seg.text,
          spokenText: segText,
          start: seg.start,
          lang: seg.lang,
          langKey: langKey,
          arrayBuffer: arrayBuffer
        });
      }
    } catch (err) {
      articlePopupAlert(
        "Échec de la synthèse audio Firebase" +
          (err && err.message ? " : " + err.message : ".") +
          "\n(Déployez les functions si speechBodyOnly est nouveau.)"
      );
      articleVideoNotifyDone(opts, false);
      return;
    }

    if (!prepared.length) {
      articlePopupAlert("Aucun segment audio produit.");
      articleVideoNotifyDone(opts, false);
      return;
    }

    const ok = await recordCanvasKaraokeWithAudioBuffers(fullText, prepared, opts);
    articleVideoNotifyDone(opts, ok);
  }

  /** API partagée (Mes Notes, articles, …) : corps = text, titre = opts.title. */
  window.zcRecordReadAloudVideo = recordArticleReadAloudVideo;

  function afficherArticleDansPopup(titre) {
    const q = (titre || '').trim().toLowerCase();

    let article = allArticlesDOM.find(a => {
      const t1 = (a.querySelector("h2")?.textContent || "").trim().toLowerCase();
      const t2 = (a.getAttribute("data-titre") || "").trim().toLowerCase();
      return t1 === q || t2 === q;
    }) || allArticlesDOM[0];

    const titrePourDdf = (
      article
        ? (article.querySelector("h2")?.textContent || article.getAttribute("data-titre") || "").trim()
        : ""
    ) || String(titre || "").trim();

    const popup = document.getElementById("popupArticleHtml");
    if (!popup) return;

    popup.innerHTML = '';

    // ======= HEADER =======
    const header = document.createElement("div");
    header.style.position = "sticky";
    header.style.top = "0";
    header.style.background = "var(--zc-surface)";
    header.style.zIndex = "1";
    header.style.padding = "8px 12px";
    header.style.borderBottom = "1px solid var(--zc-border)";
    header.style.display = "flex";
    header.style.flexDirection = "column";
    header.style.alignItems = "stretch";
    header.style.gap = "6px";

    const actionsRow = document.createElement("div");
    actionsRow.style.display = "flex";
    actionsRow.style.justifyContent = "space-between";
    actionsRow.style.alignItems = "center";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.gap = "10px";

    const linkDdf = document.createElement("a");
    syncDigneDeFoiArticleLink(linkDdf, titrePourDdf);
    linkDdf.addEventListener("mousedown", () => syncDigneDeFoiArticleLink(linkDdf, titrePourDdf));
    linkDdf.addEventListener("focus", () => syncDigneDeFoiArticleLink(linkDdf, titrePourDdf));
    linkDdf.target = "_blank";
    linkDdf.rel = "noopener noreferrer";
    linkDdf.addEventListener("click", (e) => {
      e.preventDefault();
      const url = buildDigneDeFoiSearchUrl(titrePourDdf);
      window.open(url, "_blank", "noopener,noreferrer");
    });
    linkDdf.textContent = "🔍 Rechercher sur le blog (blog.alfamous.ca · lexique-coran.blogspot.com)";
    linkDdf.setAttribute(
      "aria-label",
      "Rechercher cet article sur le blog d’après le titre (nouvel onglet)"
    );
    Object.assign(linkDdf.style, {
      display: "inline-flex",
      alignItems: "center",
      background: "var(--zc-ui-soft-bg)",
      color: "var(--zc-text)",
      border: "1px solid var(--zc-border)",
      borderRadius: "6px",
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: "14px",
      textDecoration: "none",
      fontWeight: "600",
      lineHeight: "1.2",
      maxWidth: "11em",
      textAlign: "center"
    });

    const btnCopyLink = document.createElement("button");
    btnCopyLink.textContent = "🔗 Copier le lien";
    Object.assign(btnCopyLink.style, {
      background: "var(--zc-popup-link)",
      color: "#fff",
      border: "1px solid var(--zc-popup-link)",
      borderRadius: "6px",
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: "14px"
    });

    const btnListen = document.createElement("button");
    btnListen.textContent = "🔊 Lire";
    btnListen.title = "Lis (Voix IA & Lecture)";
    btnListen.setAttribute("aria-label", "Lis (Voix IA & Lecture)");
    Object.assign(btnListen.style, {
      background: "var(--zc-popup-link)",
      color: "#fff",
      border: "1px solid var(--zc-popup-link)",
      borderRadius: "6px",
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: "14px"
    });

    const btnVideo = document.createElement("button");
    btnVideo.textContent = "🎬 Vidéo";
    btnVideo.title = "Générer une vidéo karaoke (texte + voix) — test";
    btnVideo.setAttribute("aria-label", "Générer une vidéo karaoke");
    Object.assign(btnVideo.style, {
      background: "var(--zc-popup-link)",
      color: "#fff",
      border: "1px solid var(--zc-popup-link)",
      borderRadius: "6px",
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: "14px"
    });

    const close = document.createElement("button");
    close.textContent = "✖";
    close.onclick = fermerPopupHtmlArticle;
    close.className = "zc-comment-popup-iconbtn";
    Object.assign(close.style, {
      width: "var(--zc-popup-head-icon-box)",
      height: "var(--zc-popup-head-icon-box)",
      background: "transparent",
      color: "var(--zc-text)",
      border: "none",
      borderRadius: "8px",
      padding: "0",
      lineHeight: "1",
      cursor: "pointer",
      fontSize: "var(--zc-popup-head-icon-fs)",
      fontWeight: "700",
      boxShadow: "none"
    });

    left.appendChild(linkDdf);
    left.appendChild(btnCopyLink);
    left.appendChild(btnListen);
    left.appendChild(btnVideo);
    actionsRow.appendChild(left);
    actionsRow.appendChild(close);
    header.appendChild(actionsRow);
    popup.appendChild(header);

    // ======= CONTENU =======
    const content = document.createElement("div");
    content.style.padding = "20px";

    const wrap = document.createElement("div");
    wrap.id = "contenuTexteArticle";

    let clone = null;
    if (article) {
      clone = article.cloneNode(true);
      sanitizeAutoDimensions([clone]);
      sanitizeMediaPermissions([clone]);
			if (isArticleIframeOnly(clone)) {
				content.style.padding = "0";
				wrap.style.padding = "0";

				const iframe = clone.querySelector("iframe");
				if (iframe) {
					iframe.style.height = "85vh";
					iframe.style.minHeight = "600px";
					iframe.style.display = "block";
				}
			}
      wrap.appendChild(clone);
    } else {
      wrap.innerHTML = "<p>Article introuvable.</p>";
    }

    content.appendChild(wrap);
    popup.appendChild(content);

    const link = buildShareLink(clone || article, titre);

    // ======= Boutons =======
    btnCopyLink.onclick = async () => {
      try {
        await navigator.clipboard.writeText(link);
        const old = btnCopyLink.textContent;
        btnCopyLink.textContent = "✅ Copié";
        setTimeout(() => btnCopyLink.textContent = old, 1200);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = link;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch {}
        document.body.removeChild(ta);

        const old = btnCopyLink.textContent;
        btnCopyLink.textContent = "✅ Copié";
        setTimeout(() => btnCopyLink.textContent = old, 1200);
      }
    };

    if (clone && isArticleIframeOnly(clone)) {
      btnListen.disabled = true;
      btnListen.style.opacity = "0.55";
      btnListen.style.cursor = "not-allowed";
      btnListen.title = "Lecture indisponible (article iframe)";
      btnVideo.disabled = true;
      btnVideo.style.opacity = "0.55";
      btnVideo.style.cursor = "not-allowed";
      btnVideo.title = "Vidéo indisponible (article iframe)";
    } else {
      btnListen.onclick = () => {
        const root =
          (clone && (clone.querySelector(".corps") || clone)) ||
          document.getElementById("contenuTexteArticle");
        const text = (root && (root.innerText || root.textContent) || "").trim();
        if (!text) {
          if (typeof alertMsgBoxPopup === "function") {
            alertMsgBoxPopup("Aucun texte à lire dans cet article.");
          }
          return;
        }
        if (typeof window.zcReadTextWithOverlay === "function") {
          window.zcReadTextWithOverlay(text, {
            title: "Lis (Voix IA & Lecture)",
            callerEl: document.getElementById("popupArticleHtml")
          });
        } else if (typeof lireTexte === "function") {
          lireTexte(text, "fr-FR", 1.0);
        } else if (typeof alertMsgBoxPopup === "function") {
          alertMsgBoxPopup("La lecture vocale n'est pas disponible pour le moment.");
        }
      };

      btnVideo.onclick = () => {
        const root =
          (clone && (clone.querySelector(".corps") || clone)) ||
          document.getElementById("contenuTexteArticle");
        const text = (root && (root.innerText || root.textContent) || "").trim();
        if (!text) {
          if (typeof alertMsgBoxPopup === "function") {
            alertMsgBoxPopup("Aucun texte à lire dans cet article.");
          }
          return;
        }
        const oldLabel = btnVideo.textContent;
        btnVideo.disabled = true;
        btnVideo.textContent = "⏺ …";
        recordArticleReadAloudVideo(text, {
          fileBase: titre || "article",
          title: titrePourDdf || titre || "",
          callerEl: document.getElementById("popupArticleHtml"),
          onDone: function () {
            btnVideo.disabled = false;
            btnVideo.textContent = oldLabel;
          }
        }).catch(function () {
          btnVideo.disabled = false;
          btnVideo.textContent = oldLabel;
        });
      };
    }

    ouvrirPopupHtmlArticle();
    popup.scrollTop = 0;
    // Même stratégie que Forum: surlignage après insertion réelle dans le DOM.
    if (clone) schedulePopupHighlights();
  }

  // ================== Préfiltrage ==================
  function prefil(txt, opts = {}) {
    const open = !!opts.open;

    try {
      const input = document.getElementById("searchInput");

      if (input) {
        input.value = txt || "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }

      if (open) {
        const q = (txt || '').trim().toLowerCase();
        const match = allArticlesDOM.find(a => {
          const t1 = (a.querySelector("h2")?.textContent || "").trim().toLowerCase();
          const t2 = (a.getAttribute("data-titre") || "").trim().toLowerCase();
          return t1 === q || t2 === q;
        });

        if (match) {
          const titreExact =
            (match.querySelector("h2")?.textContent || match.getAttribute("data-titre") || '').trim();
          if (titreExact) afficherArticleDansPopup(titreExact);
        } else {
          const list = document.getElementById("articleList");
          const first = list ? list.querySelector("li a") : null;
          if (first) first.click();
        }
      }

    } catch (e) {
      console.warn("prefil error:", e);
    }
  }

  function getQueryParam(k) {
    const m = location.search.match(new RegExp('[?&]' + k + '=([^&]+)'));
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  // ================== Chargement articles-format-html.js ==================
  async function chargerTousLesScripts() {
    try {
      const build =
        typeof window.__buildArticlesHtmlLoadUrls === 'function'
          ? window.__buildArticlesHtmlLoadUrls
          : null;
      if (!build) {
        throw new Error('__buildArticlesHtmlLoadUrls manquant (articles-format-html-urls.js)');
      }
      const list = await build();
      await window.loadFirstAvailable(list);

      const tmp = document.createElement("div");
      const cleaned = preSanitizeHtml(window.contenuArticlesHtml);
      tmp.innerHTML = cleaned;

      allArticlesDOM = Array.from(tmp.querySelectorAll("div.article"));
      allArticlesDOM = allArticlesDOM.filter(a => !a.parentElement.closest("div.article"));
      allArticlesDOM = dedupArticles(allArticlesDOM);

      sanitizeAutoDimensions(allArticlesDOM);
      sanitizeMediaPermissions(allArticlesDOM);
      completerTitresDepuisCorps(allArticlesDOM);

      window.allArticlesDOM = allArticlesDOM;

      initSearch();

      const pre = getQueryParam('prefil');
      if (pre) prefil(pre, { open: false });

      if (window.__articlesPrefilTexte) {
        prefil(window.__articlesPrefilTexte, { open: false });
        window.__articlesPrefilTexte = "";
      }

    } catch (err) {
      console.error("[loader] Échec chargement articles", err);

      try {
        await window.loadScriptOnce(window.__withV('jsZC/articles-format-html.js'));

        const tmp = document.createElement("div");
        const cleaned = preSanitizeHtml(window.contenuArticlesHtml);
        tmp.innerHTML = cleaned;

        allArticlesDOM = Array.from(tmp.querySelectorAll("div.article"));
        allArticlesDOM = allArticlesDOM.filter(a => !a.parentElement.closest("div.article"));
        allArticlesDOM = dedupArticles(allArticlesDOM);

        sanitizeAutoDimensions(allArticlesDOM);
        sanitizeMediaPermissions(allArticlesDOM);
        completerTitresDepuisCorps(allArticlesDOM);

        window.allArticlesDOM = allArticlesDOM;

        initSearch();

        const pre = getQueryParam('prefil');
        if (pre) prefil(pre, { open: false });

        if (window.__articlesPrefilTexte) {
          prefil(window.__articlesPrefilTexte, { open: false });
          window.__articlesPrefilTexte = "";
        }

      } catch (err2) {
        console.error("[loader] Échec fallback articles", err2);
      }
    }
  }

  // ================== API publique ==================
  window.initArticlesApp = function (container) {
    injectArticlesStyles();

    let root = container;
    if (typeof container === 'string') {
      root = document.getElementById(container);
    }
    if (!root) {
      console.error("[articles.js] Conteneur introuvable :", container);
      return;
    }

    buildArticlesLayout(root);

    function kickoff() {
      if (typeof window.__bindArticlesForumModal === "function") {
        window.__bindArticlesForumModal();
      }
      void chargerTousLesScripts();
    }

    if (typeof window.__bindArticlesForumModal === "function") {
      kickoff();
    } else {
      window
        .loadScriptOnce(window.__withV("jsZC/articles-forum-modal.js"))
        .then(kickoff)
        .catch(function (e) {
          console.warn("[articles] articles-forum-modal.js :", e);
          kickoff();
        });
    }
  };

})();
///////////////////////////////////////
