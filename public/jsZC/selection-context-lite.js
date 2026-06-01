(function () {
  "use strict";

  let menu = null;

  function escapeRegex(s) {
    return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function getSelectedText() {
    const sel = window.getSelection ? window.getSelection() : document.getSelection();
    if (!sel || sel.isCollapsed) return "";
    const txt = String(sel.toString() || "").trim();
    if (!/[A-Za-z\u0621-\u064A0-9]/.test(txt)) return "";
    return txt;
  }

  function hideMenu() {
    if (!menu) return;
    menu.style.display = "none";
  }

  function bringToFront(el) {
    if (!el) return;
    let z = 99999;
    const fn = typeof window.getNextZIndex === "function" ? window.getNextZIndex : null;
    if (fn) {
      try { z = fn(); } catch (_) { }
    }
    el.style.zIndex = String(z);
  }

  function ensureStyles() {
    if (document.getElementById("selectionContextMenuLiteStyles")) return;
    const st = document.createElement("style");
    st.id = "selectionContextMenuLiteStyles";
    st.textContent = `
#selectionContextMenu{
  position:fixed; min-width:220px; max-width:min(92vw,360px);
  background:#fff; border:1px solid #d1d5db; border-radius:12px;
  box-shadow:0 12px 28px rgba(0,0,0,.18); padding:6px; display:none;
  font:14px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
}
#selectionContextMenu .zc-ctx-row{
  display:flex; align-items:center; gap:8px; padding:9px 10px; border-radius:8px; cursor:pointer;
}
#selectionContextMenu .zc-ctx-row:hover{ background:#f3f4f6; }
#selectionContextMenu .zc-ctx-ico{ width:18px; text-align:center; }
#selectionContextMenu .zc-ctx-sep{ height:1px; background:#e5e7eb; margin:4px 2px; }
`;
    document.head.appendChild(st);
  }

  function runAction(action, word) {
    if (!word) return;
    switch (action) {
      case "copier":
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(word).catch(() => { });
        break;
      case "rech-auto":
        // Témoignages: priorité au filtre local
        const q = document.getElementById("q");
        if (q) {
          q.value = word;
          try { q.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) { }
          q.focus();
        }
        // Compat app: si #mot existe, le synchroniser aussi
        const mot = document.getElementById("mot");
        if (mot) {
          mot.value = word;
          try { mot.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) { }
        }
        break;
      case "rech-auto-racines":
        // Sur page standalone, garder comportement simple = même recherche locale
        runAction("rech-auto", word);
        break;
    }
  }

  function ensureMenu() {
    if (menu && document.body.contains(menu)) return menu;
    ensureStyles();
    menu = document.createElement("div");
    menu.id = "selectionContextMenu";
    menu.innerHTML = `
      <div class="zc-ctx-row" data-action="copier">
        <span class="zc-ctx-ico">📋</span><span>Copy</span>
      </div>
      <div class="zc-ctx-row" data-action="rech-auto">
        <span class="zc-ctx-ico">🔎</span><span>Auto search</span>
      </div>
      <div class="zc-ctx-row" data-action="rech-auto-racines">
        <span class="zc-ctx-ico">🔎</span><span id="ctx-roots-label">No roots found</span>
      </div>
      <div class="zc-ctx-sep"></div>
      <div class="zc-ctx-row" data-action="rech-auto">
        <span class="zc-ctx-ico">🔎</span><span id="ctx-word-label"></span>
      </div>
    `;
    menu.addEventListener("click", function (e) {
      const row = e.target.closest("[data-action]");
      if (!row) return;
      const action = row.getAttribute("data-action");
      const word = menu.dataset.selectedWord || "";
      runAction(action, word);
      hideMenu();
    });
    document.body.appendChild(menu);
    return menu;
  }

  function showMenuForSelection(evt) {
    const word = getSelectedText();
    if (!word) {
      hideMenu();
      return;
    }
    const m = ensureMenu();
    m.dataset.selectedWord = word;
    const wordLabel = m.querySelector("#ctx-word-label");
    if (wordLabel) wordLabel.textContent = word;
    const rootsLabel = m.querySelector("#ctx-roots-label");
    if (rootsLabel) rootsLabel.textContent = "No roots found";

    m.style.display = "block";
    const rect = m.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight, mg = 8;
    let x = evt?.clientX ?? vw / 2;
    let y = evt?.clientY ?? vh / 2;
    if (x + rect.width > vw - mg) x = vw - rect.width - mg;
    if (y + rect.height > vh - mg) y = vh - rect.height - mg;
    if (x < mg) x = mg;
    if (y < mg) y = mg;
    m.style.left = x + "px";
    m.style.top = y + "px";
    bringToFront(m);
  }

  document.addEventListener("contextmenu", function (e) {
    if (menu && menu.contains(e.target)) return;
    const txt = getSelectedText();
    if (!txt) return;
    e.preventDefault();
    showMenuForSelection(e);
  });

  document.addEventListener("dblclick", function (e) {
    if (menu && menu.contains(e.target)) return;
    setTimeout(function () { showMenuForSelection(e); }, 0);
  });

  document.addEventListener("click", function (e) {
    if (!menu || menu.style.display === "none") return;
    if (menu.contains(e.target)) return;
    hideMenu();
  });
  document.addEventListener("scroll", hideMenu, true);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hideMenu();
  });
})();

