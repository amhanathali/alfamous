(function (global) {
  "use strict";

  /** Domaines personnalisés + URLs stables (secours si le domaine custom tombe). */
  var U = {
    app: {
      custom: "https://www.alfamous.ca",
      stable: "https://alfamous-amha.web.app",
    },
    blog: {
      custom: "https://blog.alfamous.ca",
      stable: "https://lexique-coran.blogspot.com",
    },
  };

  /** Liens fonctionnels : URL stable par défaut (résilience). */
  U.app.primary = U.app.stable;
  U.blog.primary = U.blog.stable;

  U.blogSearchUrl = function blogSearchUrl(query) {
    var q = String(query || "").replace(/\s+/g, " ").trim();
    var base = U.blog.primary + "/search";
    return q ? base + "?q=" + encodeURIComponent(q) + "&m=1" : base;
  };

  U.appShareUrl = function appShareUrl(query) {
    var q = String(query || "").replace(/^\?/, "");
    return U.app.primary + (q ? "?" + q : "");
  };

  U.blogSubscribeUrl = function blogSubscribeUrl() {
    return U.blog.primary + "/p/abonnement.html";
  };

  global.ALFAMOUS_URLS = U;
})(window);
