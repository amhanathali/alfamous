/**
 * Liste d’URL pour charger articles-format-html.js : Storage (getDownloadURL + anti-cache), puis jsZC/.
 * Nécessite Firebase compat + init (firebase-local-init) avant ce script si on veut Storage.
 */
(function () {
  'use strict';

  window.__buildArticlesHtmlLoadUrls = async function __buildArticlesHtmlLoadUrls() {
    const STORAGE_PATH = 'MesDonnes/MesJS/articles-format-html.js';
    const LOCAL_REL = 'jsZC/articles-format-html.js';

    const v = (window.textVersion || window.dateVersion || localStorage.getItem('zcVersion') || '');
    function withV(url) {
      if (!url || !v) return url;
      return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(v);
    }
    function bustRemote(url) {
      if (!url) return url;
      return url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
    }

    const offline =
      typeof navigator !== 'undefined' && 'onLine' in navigator ? !navigator.onLine : false;

    let remoteBase = '';
    if (!offline) {
      try {
        if (typeof firebase !== 'undefined' && firebase.storage) {
          const p = firebase.storage().ref(STORAGE_PATH).getDownloadURL();
          const t = new Promise(function (_, rej) {
            setTimeout(function () { rej(new Error('timeout articles-format-html')); }, 10000);
          });
          remoteBase = await Promise.race([p, t]);
        }
      } catch (e) {
        console.warn('[articles-format-html] getDownloadURL (repli local):', e);
      }
    }

    const r = remoteBase ? bustRemote(withV(remoteBase)) : '';
    const loc = withV(LOCAL_REL);
    if (offline) return [loc];
    if (r) return [r, loc];
    return [loc];
  };
})();
