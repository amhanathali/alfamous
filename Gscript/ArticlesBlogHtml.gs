//const BLOG_ID = "6781498195311411257";

// Clé API : définie dans secrets.gs (local, exclu de Git) ou dans les Propriétés du script.

/** Clé PropertiesService : empreinte id+updated de tous les billets LIVE (déclencheur temps). */
var ALFAMOUS_PROP_BLOGGER_FP = "ALFAMOUS_BLOGGER_ARTICLES_FP";
/** Dernière valeur blog.updated connue (pré-check ultra léger). */
var ALFAMOUS_PROP_BLOGGER_BLOG_UPDATED = "ALFAMOUS_BLOGGER_BLOG_UPDATED";
/** Anti-boucle en cas de quota Blogger: timestamp ms du dernier échec quota. */
var ALFAMOUS_PROP_BLOGGER_QUOTA_LAST_MS = "ALFAMOUS_BLOGGER_QUOTA_LAST_MS";

/**
 * blogId / apiKey : lire BLOGGER_BLOG_ID et BLOGGER_API_KEY dans Propriétés du script si défini,
 * sinon valeurs par défaut ci-dessous (même comportement qu’avant).
 */
function getBloggerSyncConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    blogId: props.getProperty("BLOGGER_BLOG_ID") || "6781498195311411257",
    apiKey: props.getProperty("BLOGGER_API_KEY")
            || (typeof ALFAMOUS_BLOGGER_API_KEY !== "undefined" ? ALFAMOUS_BLOGGER_API_KEY : "")
  };
}

/** MD5 hex sur les paires id|updated (méta légère ou billets complets). */
function fingerprintFromPostItems(items) {
  if (!items || !items.length) {
    throw new Error("Aucun billet pour l’empreinte.");
  }
  var lines = items
    .map(function (p) {
      return String(p.id || "") + "|" + String(p.updated || "");
    })
    .sort()
    .join("\n");
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, lines, Utilities.Charset.UTF_8);
  var hex = "";
  for (var i = 0; i < digest.length; i++) {
    var b = (digest[i] + 256) % 256;
    var h = b.toString(16);
    if (h.length === 1) h = "0" + h;
    hex += h;
  }
  return hex;
}

/** Empreinte côté Blogger sans télécharger les corps des billets. */
function computeBloggerPostsFingerprint(blogId, apiKey) {
  return fingerprintFromPostItems(fetchAllBloggerPostMeta(blogId, apiKey));
}

function getStoredBloggerFingerprint() {
  return PropertiesService.getScriptProperties().getProperty(ALFAMOUS_PROP_BLOGGER_FP) || "";
}

function setStoredBloggerFingerprint(fp) {
  PropertiesService.getScriptProperties().setProperty(ALFAMOUS_PROP_BLOGGER_FP, String(fp || ""));
}

function getStoredBlogUpdated() {
  return PropertiesService.getScriptProperties().getProperty(ALFAMOUS_PROP_BLOGGER_BLOG_UPDATED) || "";
}

function setStoredBlogUpdated(v) {
  PropertiesService.getScriptProperties().setProperty(ALFAMOUS_PROP_BLOGGER_BLOG_UPDATED, String(v || ""));
}

function isBloggerQuotaExceededError(err) {
  var msg = String((err && err.message) || err || "").toLowerCase();
  return msg.indexOf("bandwidth quota exceeded") >= 0 ||
    msg.indexOf("quota exceeded") >= 0 ||
    msg.indexOf("rate limit") >= 0 ||
    msg.indexOf("userrate limit") >= 0 ||
    msg.indexOf("dailylimitexceeded") >= 0;
}

function getLastQuotaExceededMs() {
  var raw = PropertiesService.getScriptProperties().getProperty(ALFAMOUS_PROP_BLOGGER_QUOTA_LAST_MS) || "";
  var n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function setLastQuotaExceededNow() {
  PropertiesService.getScriptProperties().setProperty(ALFAMOUS_PROP_BLOGGER_QUOTA_LAST_MS, String(Date.now()));
}

function clearLastQuotaExceeded() {
  PropertiesService.getScriptProperties().deleteProperty(ALFAMOUS_PROP_BLOGGER_QUOTA_LAST_MS);
}

/** Endpoint très léger: blogs/{blogId}?fields=updated */
function fetchBloggerBlogUpdated(blogId, apiKey) {
  var url = "https://www.googleapis.com/blogger/v3/blogs/" + encodeURIComponent(blogId)
    + "?key=" + encodeURIComponent(apiKey)
    + "&fields=updated";
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error("Blogger blog.updated (" + code + ") : " + response.getContentText());
  }
  var json = JSON.parse(response.getContentText() || "{}");
  return String(json.updated || "");
}

/**
 * À brancher sur un déclencheur temporel : compare l’empreinte Blogger à la dernière exécution ;
 * n’appelle uploadArticlesHtmlToFirebase() que si un billet a changé (id/updated).
 */
function syncArticlesIfBloggerChanged(forceUpload) {
  try {
    var cfg = getBloggerSyncConfig();
    var forced = String(forceUpload || "").toLowerCase() === "true" || forceUpload === true;
    var cooldownMs = 30 * 60 * 1000; // 30 min
    var now = Date.now();
    var lastQuotaMs = getLastQuotaExceededMs();
    if (!forced && lastQuotaMs && (now - lastQuotaMs) < cooldownMs) {
      var waitMin = Math.ceil((cooldownMs - (now - lastQuotaMs)) / 60000);
      var cooled = "⏸ Quota Blogger récemment dépassé. Nouvelle tentative dans ~" + waitMin + " min.";
      Logger.log("[syncArticlesIfBloggerChanged] %s", cooled);
      return cooled;
    }

    var previousBlogUpdated = getStoredBlogUpdated();
    var currentBlogUpdated = "";
    try {
      currentBlogUpdated = fetchBloggerBlogUpdated(cfg.blogId, cfg.apiKey);
    } catch (eUpdated) {
      if (isBloggerQuotaExceededError(eUpdated)) {
        setLastQuotaExceededNow();
        var qMsg = "⏸ Quota Blogger dépassé pendant pré-check blog.updated.";
        Logger.log("[syncArticlesIfBloggerChanged] %s", qMsg);
        return qMsg;
      }
      throw eUpdated;
    }

    if (!forced && previousBlogUpdated && currentBlogUpdated && previousBlogUpdated === currentBlogUpdated) {
      var skippedByBlogUpdated = "⏭ Aucun changement blog.updated — pas d’upload.";
      Logger.log("[syncArticlesIfBloggerChanged] %s", skippedByBlogUpdated);
      return skippedByBlogUpdated;
    }

    var previous = getStoredBloggerFingerprint();
    var current = "";
    try {
      current = computeBloggerPostsFingerprint(cfg.blogId, cfg.apiKey);
    } catch (eFp) {
      if (isBloggerQuotaExceededError(eFp)) {
        setLastQuotaExceededNow();
        var qMsg2 = "⏸ Quota Blogger dépassé pendant calcul empreinte posts.";
        Logger.log("[syncArticlesIfBloggerChanged] %s", qMsg2);
        return qMsg2;
      }
      throw eFp;
    }

    Logger.log("[syncArticlesIfBloggerChanged] forced=%s", forced);
    Logger.log("[syncArticlesIfBloggerChanged] previousBlogUpdated=%s", previousBlogUpdated || "(empty)");
    Logger.log("[syncArticlesIfBloggerChanged] currentBlogUpdated=%s", currentBlogUpdated || "(empty)");
    Logger.log("[syncArticlesIfBloggerChanged] previous=%s", previous || "(empty)");
    Logger.log("[syncArticlesIfBloggerChanged] current=%s", current || "(empty)");

    if (!forced && previous && current === previous) {
      var skipped = "⏭ Aucun changement détecté sur Blogger — pas d’upload.";
      Logger.log("[syncArticlesIfBloggerChanged] %s", skipped);
      if (currentBlogUpdated) setStoredBlogUpdated(currentBlogUpdated);
      return skipped;
    }

    Logger.log("[syncArticlesIfBloggerChanged] changement détecté (ou mode force): upload déclenché.");
    var result = uploadArticlesHtmlToFirebase();
    if (currentBlogUpdated) setStoredBlogUpdated(currentBlogUpdated);
    clearLastQuotaExceeded();
    Logger.log("[syncArticlesIfBloggerChanged] résultat upload: %s", result);
    return result;
  } catch (e) {
    var msg = "❌ syncArticlesIfBloggerChanged : " + e.message;
    Logger.log(msg);
    throw new Error(msg);
  }
}

/** Helper manuel : force l'upload même si l'empreinte n'a pas changé. */
function syncArticlesIfBloggerChangedForce() {
  return syncArticlesIfBloggerChanged(true);
}

/** Même pagination que fetchAllBloggerPosts, mais sans corps (réponses légères). */
function fetchAllBloggerPostMeta(blogId, apiKey) {
  var baseUrl = "https://www.googleapis.com/blogger/v3/blogs/" + blogId + "/posts";
  var all = [];
  var pageToken = "";
  var seenPageTokens = {};
  var MAX_PAGES = 50;
  var pageCount = 0;
  var fieldsParam = encodeURIComponent("nextPageToken,items(id,updated)");

  do {
    pageCount++;
    if (pageCount > MAX_PAGES) {
      throw new Error("Arrêt de sécurité: trop de pages Blogger parcourues (méta).");
    }

    var params = [
      "key=" + encodeURIComponent(apiKey),
      "maxResults=500",
      "status=LIVE",
      "fetchBodies=false",
      "orderBy=UPDATED",
      "fields=" + fieldsParam
    ];
    if (pageToken) params.push("pageToken=" + encodeURIComponent(pageToken));

    var response = UrlFetchApp.fetch(baseUrl + "?" + params.join("&"), {
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      throw new Error("Blogger API méta (" + code + ") : " + response.getContentText());
    }

    var json = JSON.parse(response.getContentText() || "{}");
    if (json.items && json.items.length) {
      for (var j = 0; j < json.items.length; j++) {
        all.push(json.items[j]);
      }
    }

    var nextToken = json.nextPageToken || "";
    if (!nextToken) {
      pageToken = "";
      break;
    }
    if (seenPageTokens[nextToken]) {
      throw new Error("Arrêt de sécurité: pagination Blogger cyclique (méta).");
    }
    seenPageTokens[nextToken] = true;
    pageToken = nextToken;
  } while (pageToken);

  return all;
}

// Fonction principale

// =======================
// Export articles → Firebase + Copie locale dans le dossier du classeur
// =======================

// --------- Fonction principale (mise à jour) -----------
function uploadArticlesHtmlToFirebase() {
  try {
    const cfg = getBloggerSyncConfig();
    const posts = fetchAllBloggerPosts(cfg.blogId, cfg.apiKey);
    if (!posts.length) {
      throw new Error("Aucun article trouvé.");
    }
    const htmlContent = buildArticlesHtmlFromPosts(posts);

    // Wrapper JS identique à la version Firebase
    const wrappedJsContent = 'window.contenuArticlesHtml = ' + JSON.stringify(htmlContent) + ';';
    const fileName = "articles-format-html.js";

    // 1) Upload vers Firebase (inchangé)
    uploadFilesToFirebase(fileName, wrappedJsContent);
    Logger.log("[uploadArticlesHtmlToFirebase] Upload Storage OK: %s", fileName);

    // 2) Sauvegarde locale dans le même dossier Drive que le classeur Sheets
    const savedPath = saveLocalArticlesJsInSheetFolder(fileName, wrappedJsContent);

    // 3) Même empreinte que la vérif « léger » — sans second aller-retour API
    var fp = fingerprintFromPostItems(posts);
    setStoredBloggerFingerprint(fp);
    Logger.log("[uploadArticlesHtmlToFirebase] Empreinte enregistrée: %s", fp);

    return "✅ " + fileName + " envoyé sur Firebase ET sauvegardé localement: " + savedPath;
  } catch (e) {
    return "❌ Erreur : " + e.message;
  }
}

// --------- Sauvegarde locale dans le dossier de la feuille -----------
function saveLocalArticlesJsInSheetFolder(fileName, content) {
  // Dossier cible = dossier du classeur contenant le script (container-bound)
  var targetFolder = null;
  try {
    var ssId = SpreadsheetApp.getActive().getId();
    var file = DriveApp.getFileById(ssId);
    var parents = file.getParents();
    targetFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  } catch (err) {
    // Si non lié à Sheets (standalone), on tombe sur le dossier "Mon Drive"
    targetFolder = DriveApp.getRootFolder();
  }

  // S'il existe déjà des fichiers portant ce nom dans ce dossier, on les met à jour,
  // sinon on le crée (MimeType JavaScript).
  var updated = false;
  var it = targetFolder.getFilesByName(fileName);
  while (it.hasNext()) {
    var f = it.next();
    f.setContent(content);
    updated = true;
  }

  if (!updated) {
    targetFolder.createFile(fileName, content, MimeType.JAVASCRIPT);
  }

  // Retour "chemin" lisible
  var path = "/" + targetFolder.getName() + "/" + fileName;
  return path;
}



/**
 * Titres d’articles Blogger pour le HTML Alfamous (≠ preparerCommentairePourExporter du Lexique / export JSON).
 * extrairePremiereImage / stripHtml : voir code.gs
 */
function preparerTitreArticleBlog(str) {
  if (typeof str !== 'string') {
    str = String(str || '');
  }
  return str.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim();
}

/** HTML de la section articles à partir des billets déjà chargés (un seul fetch API). */
function buildArticlesHtmlFromPosts(posts) {
  const articlesHtml = posts.map(post => {
    const titreBrut = post.title || "Sans titre";
    const titre = preparerTitreArticleBlog(titreBrut);
    const contenuComplet = post.content || "";

    // 1) Image extraite (peut être "")
    const imageExtraite = extrairePremiereImage(contenuComplet);
    const image = (imageExtraite || "").trim();

    // 2) Date + lien (lien pas injecté dans le HTML final ici)
    const date = new Date(post.updated).toLocaleDateString();
    const lien = post.url || "#";

    // 3) Supprime l'image principale du contenu si on la met en header
    const contenuNettoye = nettoyerContenuAvantAffichage(contenuComplet, image);

    // 4) Bloc image uniquement si src non vide
    const blocImg = image
      ? `<img src="${escapeHtml(image)}" alt="Image de l'article" style="max-width:100%;height:auto;" loading="lazy" />`
      : "";

    return `
      <div class="article" data-titre="${escapeHtml(titre)}">
        <h2>${escapeHtml(titre)}</h2>
        ${blocImg}
        <div class="date" style="color:#555;font-size:0.9em;margin-bottom:10px;">${escapeHtml(date)}</div>
        <div class="corps">${contenuNettoye}</div>
      </div>
    `;
  }).join("\n");

  return `
    <section id="liste-articles" style="font-family:sans-serif; line-height:1.5;">
      ${articlesHtml}
    </section>
  `;
}

function genererArticlesFormatsHtml() {
  const cfg = getBloggerSyncConfig();
  const posts = fetchAllBloggerPosts(cfg.blogId, cfg.apiKey);
  if (!posts.length) {
    throw new Error("Aucun article trouvé.");
  }
  return buildArticlesHtmlFromPosts(posts);
}

function fetchAllBloggerPosts(blogId, apiKey) {
  const baseUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`;
  const allPosts = [];
  let pageToken = "";
  const seenPageTokens = {};
  const MAX_PAGES = 50;
  let pageCount = 0;

  do {
    pageCount++;
    if (pageCount > MAX_PAGES) {
      throw new Error("Arrêt de sécurité: trop de pages Blogger parcourues.");
    }

    const params = [
      `key=${encodeURIComponent(apiKey)}`,
      "maxResults=500",
      "status=LIVE",
      "fetchBodies=true",
      "orderBy=UPDATED"
    ];
    if (pageToken) params.push(`pageToken=${encodeURIComponent(pageToken)}`);

    const response = UrlFetchApp.fetch(`${baseUrl}?${params.join("&")}`, {
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      throw new Error(`Blogger API (${code}) : ${response.getContentText()}`);
    }

    const json = JSON.parse(response.getContentText() || "{}");
    if (json.items && json.items.length) {
      allPosts.push.apply(allPosts, json.items);
    }

    const nextToken = json.nextPageToken || "";
    if (!nextToken) {
      pageToken = "";
      break;
    }
    if (seenPageTokens[nextToken]) {
      throw new Error("Arrêt de sécurité: pagination Blogger cyclique détectée.");
    }
    seenPageTokens[nextToken] = true;
    pageToken = nextToken;
  } while (pageToken);

  return allPosts;
}

/*
//Ce bout de code était prévu à la fin de chaque article
//Je trouve qu'il n'est pas vraiment necessaire de sortir de l'application
//surtout qu'on a un lien bien visible du blog en haut de l'application et en haut de la recjerche des articles
        <div class="lien-blog" style="margin-top:10px;">
          <a href="${lien}" target="_blank" rel="noopener noreferrer">Lire l'article sur le blog originel</a>
        </div>
*/

function nettoyerContenuAvantAffichage(html, imageSrc) {
  // Supprimer les balises de lien autour d'une image
  html = html.replace(/<a[^>]*>\s*(<img[^>]+>)\s*<\/a>/gi, '$1');
  // Supprimer les div class="separator" contenant une image
  html = html.replace(/<div[^>]*class="separator"[^>]*>\s*(<img[^>]+>)\s*<\/div>/gi, '$1');
  // Supprimer l'image principale si déjà utilisée en en-tête
  if (imageSrc) {
    const escapedImage = imageSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`<img[^>]*src=["']${escapedImage}["'][^>]*>`, "i");
    html = html.replace(regex, '');
  }
  return html;
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
