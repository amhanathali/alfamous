/**
 * Mode « écriture étendue » pour les textareas (popup commentaire / forum).
 * Agrandit la zone utile ; sortie : Échap, focus hors du bloc, bouton ×.
 */
(function (win) {
  "use strict";
  if (!win || !win.document) return;

  var CLS_SHELL = "zc-ta-zen-expanded";
  var CLS_POPUP = "zc-comment-popup--zen";
  var CLS_CARD = "zc-forum-post--zen-open";
  var CLOSE_CLS = "zc-ta-zen-close-overlay";

  var activeTa = null;
  var docBound = false;

  function shellFor(ta) {
    if (!ta) return null;
    return ta.closest(".zc-popup-field-row") || ta.closest(".zc-forum-reply-editor");
  }

  function syncToggles(ta, expanded) {
    var id = ta && ta.id;
    if (!id) return;
    win.document.querySelectorAll('[data-zc-ta-for="' + id + '"]').forEach(function (btn) {
      btn.setAttribute("aria-pressed", expanded ? "true" : "false");
      btn.setAttribute("title", expanded ? "Réduire (Échap)" : "Agrandir la zone de texte");
    });
  }

  function ensureCloseButton(sh) {
    if (!sh || sh.querySelector("." + CLOSE_CLS)) return;
    var b = win.document.createElement("button");
    b.type = "button";
    b.className = CLOSE_CLS;
    b.setAttribute("aria-label", "Réduire l’éditeur");
    b.setAttribute("title", "Réduire");
    b.innerHTML = "&times;";
    sh.appendChild(b);
  }

  function removeCloseButton(sh) {
    if (!sh) return;
    var b = sh.querySelector("." + CLOSE_CLS);
    if (b) b.remove();
  }

  function docListeners(add) {
    if (add && !docBound) {
      win.document.addEventListener("keydown", onDocKey, true);
      win.document.addEventListener("focusin", onDocFocusIn, true);
      docBound = true;
    }
    if (!add && docBound) {
      win.document.removeEventListener("keydown", onDocKey, true);
      win.document.removeEventListener("focusin", onDocFocusIn, true);
      docBound = false;
    }
  }

  function onDocKey(e) {
    if (e.key !== "Escape" || !activeTa) return;
    e.preventDefault();
    e.stopPropagation();
    collapseTa(activeTa);
  }

  function onDocFocusIn(e) {
    if (!activeTa) return;
    var sh = shellFor(activeTa);
    if (!sh) return;
    if (sh.contains(e.target)) return;
    collapseTa(activeTa);
  }

  function collapseTa(ta) {
    if (!ta) return;
    var sh = shellFor(ta);
    if (sh) {
      sh.classList.remove(CLS_SHELL);
      removeCloseButton(sh);
    }
    var pop = ta.closest(".zc-comment-popup-box");
    if (pop) pop.classList.remove(CLS_POPUP);
    var card = ta.closest(".zc-forum-post");
    if (card) card.classList.remove(CLS_CARD);
    ta.style.height = "";
    syncToggles(ta, false);
    if (activeTa === ta) {
      activeTa = null;
      docListeners(false);
    }
  }

  function expandTa(ta) {
    if (!ta) return;
    if (activeTa && activeTa !== ta) collapseTa(activeTa);
    activeTa = ta;
    var sh = shellFor(ta);
    if (sh) {
      sh.classList.add(CLS_SHELL);
      ensureCloseButton(sh);
    }
    var pop = ta.closest(".zc-comment-popup-box");
    if (pop) pop.classList.add(CLS_POPUP);
    var card = ta.closest(".zc-forum-post");
    if (card) card.classList.add(CLS_CARD);
    ta.style.height = "";
    syncToggles(ta, true);
    docListeners(true);
    try {
      ta.focus();
    } catch (_) { }
  }

  function toggleTa(ta) {
    if (!ta) return;
    var sh = shellFor(ta);
    if (sh && sh.classList.contains(CLS_SHELL)) collapseTa(ta);
    else expandTa(ta);
  }

  win.zcToggleTextareaZen = toggleTa;
  win.zcCollapseTextareaZen = collapseTa;
  win.zcCollapseAllTextareaZen = function () {
    if (activeTa) collapseTa(activeTa);
  };

  win.document.addEventListener("click", function (e) {
    var cx = e.target.closest("." + CLOSE_CLS);
    if (cx) {
      var sh0 = cx.closest("." + CLS_SHELL);
      var ta0 = sh0 && sh0.querySelector("textarea");
      if (ta0) {
        e.preventDefault();
        collapseTa(ta0);
      }
      return;
    }
    var btn = e.target.closest(".zc-ta-zen-toggle");
    if (!btn) return;
    var id = btn.getAttribute("data-zc-ta-for");
    var ta = id ? win.document.getElementById(id) : null;
    if (!ta && btn.closest(".zc-forum-reply-editor")) {
      ta = btn.closest(".zc-forum-reply-editor").querySelector("textarea");
    }
    if (!ta) return;
    e.preventDefault();
    toggleTa(ta);
  });

  win.document.addEventListener("dblclick", function (e) {
    if (!e.target.matches("textarea.zc-popup-textarea, textarea.zc-forum-reply-ta")) return;
    toggleTa(e.target);
  });
})(typeof window !== "undefined" ? window : globalThis);
