/**
 * Overlay de chargement global : <dialog> en showModal() → top layer du navigateur,
 * au-dessus des z-index classiques. Fallback plein écran si showModal indisponible.
 *
 * API : window.zcBusyStart(message?, onCancel?) / window.zcBusyStop() — réentrance (compteur).
 * Bouton ✕ et Échap : invoquent onCancel (couche courante puis dépilement si imbriqué),
 * puis ferment le dialogue.
 */
(function zcBusyDialogIife() {
  let depth = 0;
  /** @type {Array<(function(): void) | null>} */
  let cancelStack = [];
  let timerId = null;
  let elapsedSec = 0;

  let dialogEl = null;
  let msgEl = null;
  let timeEl = null;
  let closeBtn = null;

  function injectStylesOnce() {
    if (document.getElementById("zc-busy-dialog-styles")) return;
    const st = document.createElement("style");
    st.id = "zc-busy-dialog-styles";
    st.textContent =
      "dialog.zc-busy-dialog{border:none;padding:0;background:transparent;max-width:none;margin:0;}" +
      "dialog.zc-busy-dialog::backdrop{background:rgba(15,23,42,.48);}" +
      ".zc-busy-dialog-panel{" +
      "position:relative;min-width:260px;max-width:min(92vw,420px);" +
      "padding:2.65rem 1.35rem 1.25rem 1.35rem;border-radius:12px;" +
      "background:var(--zc-surface,#f8fafc);color:var(--zc-text,#0f172a);" +
      "box-shadow:0 16px 48px rgba(0,0,0,.25);" +
      "text-align:center;font:600 15px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;" +
      "}" +
      ".zc-busy-dialog-spinner{width:36px;height:36px;margin:0 auto 12px;border-radius:50%;" +
      "border:3px solid rgba(148,163,184,.45);border-top-color:var(--zc-accent,#0d9488);" +
      "animation:zcBusySpin .85s linear infinite;}" +
      "@keyframes zcBusySpin{to{transform:rotate(360deg);}}" +
      ".zc-busy-dialog-msg{margin:0 0 6px;}" +
      ".zc-busy-dialog-time{margin:0;font-size:12px;font-weight:500;color:var(--zc-text-muted,#64748b);}" +
      ".zc-busy-dialog-close{position:absolute;top:8px;right:8px;width:36px;height:36px;margin:0;padding:0;" +
      "border:none;border-radius:8px;background:rgba(148,163,184,.2);color:var(--zc-text,#0f172a);" +
      "font:600 20px/1 system-ui,sans-serif;cursor:pointer;line-height:36px;text-align:center;}" +
      ".zc-busy-dialog-close:hover{background:rgba(148,163,184,.35);}" +
      ".zc-busy-dialog-close:focus{outline:2px solid var(--zc-accent,#0d9488);outline-offset:2px;}" +
      "dialog.zc-busy-dialog.zc-busy-fallback{" +
      "position:fixed;inset:0;width:100vw;height:100vh;max-width:none;" +
      "display:flex;align-items:center;justify-content:center;" +
      "background:rgba(15,23,42,.48);" +
      "}";
    document.head.appendChild(st);
  }

  function ensureDialog() {
    if (dialogEl) return dialogEl;
    injectStylesOnce();
    const d = document.createElement("dialog");
    d.id = "zcBusyDialog";
    d.className = "zc-busy-dialog";
    d.setAttribute("aria-busy", "true");
    d.setAttribute("aria-live", "polite");
    d.innerHTML =
      '<div class="zc-busy-dialog-panel" role="presentation">' +
      '<button type="button" class="zc-busy-dialog-close" aria-label="">' +
      "\u00d7" +
      "</button>" +
      '<div class="zc-busy-dialog-spinner" aria-hidden="true"></div>' +
      '<p class="zc-busy-dialog-msg"></p>' +
      '<p class="zc-busy-dialog-time" aria-hidden="true"></p>' +
      "</div>";
    document.body.appendChild(d);
    msgEl = d.querySelector(".zc-busy-dialog-msg");
    timeEl = d.querySelector(".zc-busy-dialog-time");
    closeBtn = d.querySelector(".zc-busy-dialog-close");
    if (closeBtn) {
      closeBtn.setAttribute("aria-label", closeAriaLabel());
      closeBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        userCancelFromUi();
      });
    }
    d.addEventListener("cancel", function (ev) {
      ev.preventDefault();
      userCancelFromUi();
    });
    dialogEl = d;
    return d;
  }

  function closeAriaLabel() {
    try {
      const raw = (
        typeof window.getUILang === "function"
          ? String(window.getUILang() || "fr")
          : String(localStorage.getItem("uiLang") || "fr")
      )
        .toLowerCase()
        .trim();
      const lc = raw.startsWith("kab") ? "kab" : raw.slice(0, 2);
      if (lc === "en") return "Cancel and close";
      if (lc === "ar") return "\u0625\u0644\u063a\u0627\u0621 \u0648\u0625\u064a\u0642\u0627\u0641 \u0627\u0644\u062a\u062d\u0645\u064a\u0644";
      if (lc === "es") return "Cancelar y cerrar";
      if (lc === "kab") return "Sefsex akked mdel";
      return "Annuler et fermer";
    } catch (_) {
      return "Annuler et fermer";
    }
  }

  function openDialog(message) {
    const d = ensureDialog();
    const m = String(message || "").trim();
    if (msgEl) {
      msgEl.textContent = m || defaultMessage();
    }
    if (timeEl) timeEl.textContent = "";
    elapsedSec = 0;

    d.classList.remove("zc-busy-fallback");
    let opened = false;
    try {
      if (typeof d.showModal === "function") {
        d.showModal();
        opened = true;
      }
    } catch (_) {}
    if (!opened) {
      d.classList.add("zc-busy-fallback");
      if (typeof window.getNextZIndex === "function") {
        try {
          d.style.zIndex = String(window.getNextZIndex());
        } catch (_) {}
      } else {
        d.style.removeProperty("z-index");
      }
      try {
        d.setAttribute("open", "");
      } catch (_) {}
    }

    if (timerId) {
      try {
        clearInterval(timerId);
      } catch (_) {}
    }
    timerId = setInterval(function () {
      elapsedSec += 1;
      if (timeEl) timeEl.textContent = elapsedSec + " s";
    }, 1000);
  }

  function defaultMessage() {
    try {
      const raw = (
        typeof window.getUILang === "function"
          ? String(window.getUILang() || "fr")
          : String(localStorage.getItem("uiLang") || "fr")
      )
        .toLowerCase()
        .trim();
      const lc = raw.startsWith("kab") ? "kab" : raw.slice(0, 2);
      if (lc === "en") return "Processing…";
      if (lc === "ar") return "جارٍ المعالجة…";
      if (lc === "es") return "Procesando…";
      if (lc === "kab") return "Asali…";
      return "Traitement en cours…";
    } catch (_) {
      return "Traitement en cours…";
    }
  }

  function syncCloseButtonAria() {
    if (closeBtn) closeBtn.setAttribute("aria-label", closeAriaLabel());
  }

  function closeDialog() {
    if (timerId) {
      try {
        clearInterval(timerId);
      } catch (_) {}
      timerId = null;
    }
    if (!dialogEl) return;
    try {
      if (typeof dialogEl.close === "function") dialogEl.close();
    } catch (_) {}
    try {
      dialogEl.removeAttribute("open");
    } catch (_) {}
    try {
      dialogEl.style.removeProperty("z-index");
    } catch (_) {}
    dialogEl.classList.remove("zc-busy-fallback");
  }

  function stopOneLayer() {
    if (depth === 0) return;
    depth -= 1;
    cancelStack.pop();
    if (depth !== 0) return;
    closeDialog();
  }

  function userCancelFromUi() {
    while (depth > 0) {
      const cb = cancelStack[depth - 1];
      if (typeof cb === "function") {
        try {
          cb();
        } catch (_) {}
      }
      stopOneLayer();
    }
  }

  window.zcBusyStart = function zcBusyStart(message, onCancel) {
    depth += 1;
    cancelStack.push(typeof onCancel === "function" ? onCancel : null);
    if (depth !== 1) return;
    openDialog(message);
    syncCloseButtonAria();
  };

  window.zcBusyStop = function zcBusyStop() {
    stopOneLayer();
  };
})();
