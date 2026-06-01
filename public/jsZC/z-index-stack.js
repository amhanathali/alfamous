/**
 * Pile z-index — une seule règle (pas de localStorage).
 *
 *   prochainZ = max( zMaxDOM (hors option), dernierZAllouéSession ) + STEP
 *
 * - getNextZIndex() : nouvelle surface.
 * - zcBringToFront(el) : au-dessus de tout sauf el avant assignation.
 * - zcZIndexPlaceOverlayAboveCaller(caller, target) : target au-dessus du caller et du reste.
 *
 * Les fenêtres « de base » restent en CSS z-index: auto tant qu’elles ne sont pas ouvertes ;
 * l’ouverture assigne le style inline via les fonctions ci-dessus.
 *
 * Après fermeture de fenêtres : appeler zcSyncSessionStackFromDom() pour aligner
 * lastAllocatedZ sur le max réel du DOM (sinon le compteur session monte sans redescendre).
 *
 * HUD visuel : désactivé par défaut — uniquement si alfamous_debug_z_hud=1 ou window.ZC_DEBUG_Z_INDEX_HUD (ne pas confondre avec alfamous_debug_z = logs console).
 */
(function () {

  var STEP = 2;
  var Z_HARD_CAP = 200000;
  var ZC_HUD_ID = "zcZIndexDebugHud";

  /** Compteur session uniquement (évite deux allocations identiques avant reflow). */
  var lastAllocatedZ = 0;

  try {
    localStorage.removeItem("alfamous_z_top");
  } catch (_) {}

  function zcDebugZIndexEnabled() {
    try {
      if (window.ZC_DEBUG_Z_INDEX === true) return true;
      if (window.ZC_DEBUG_Z_INDEX_HUD === true) return true;
      if (String(localStorage.getItem("alfamous_debug_z") || "") === "1") return true;
      if (String(localStorage.getItem("alfamous_debug_z_hud") || "") === "1") return true;
    } catch (_) {}
    return false;
  }

  /** Fenêtre HUD : uniquement si demandée explicitement (évite de polluer le DOM / le scan z-index quand on veut seulement les console.log). */
  function zcDebugZIndexHudEnabled() {
    try {
      if (window.ZC_DEBUG_Z_INDEX_HUD === true) return true;
      if (String(localStorage.getItem("alfamous_debug_z_hud") || "") === "1") return true;
    } catch (_) {}
    return false;
  }

  function zcDebugZIndexLog(tag, detail) {
    if (!zcDebugZIndexEnabled()) return;
    try {
      if (typeof console === "undefined" || typeof console.log !== "function") return;
      console.log("[zc-z] " + String(tag));
      if (detail !== undefined && detail !== null) console.log(detail);
    } catch (_) {}
  }

  function zcIsTrackedTopZWindow(el) {
    if (!el || !el.id) return false;
    var id = el.id;
    return (
      id === "popupResultats" ||
      id === "popupResultatsZ1" ||
      id === "popupResultatsZ2" ||
      id === "popupResultatsZ3" ||
      id === "popupHtml" ||
      id === "zcMesNotesReadOverlay" ||
      id === "afModalOverlay" ||
      id === "popupContextMenu" ||
      id === "audio-floating-container" ||
      id === "lecteurOverlay"
    );
  }

  function zcLogTopZ(label, payload) {
    if (!zcDebugZIndexEnabled()) return;
    try {
      if (typeof console === "undefined" || typeof console.log !== "function") return;
      console.log("[zc-z topZ] " + String(label));
      if (payload !== undefined && payload !== null) console.log(payload);
    } catch (_) {}
  }

  function zcReloadIfZStackExhausted(where) {
    try {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("[zc-z] plafond z-index (" + String(Z_HARD_CAP) + ") — rechargement. " + String(where || ""));
      }
    } catch (_) {}
    try {
      location.reload();
    } catch (_) {}
  }

  function getMaxZIndex() {
    var max = 0;
    try {
      if (!document.body) return max;
      var all = document.body.querySelectorAll("*");
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el && el.id === ZC_HUD_ID) continue;
        var z = parseInt(window.getComputedStyle(el).zIndex, 10);
        if (!Number.isNaN(z)) max = Math.max(max, z);
      }
    } catch (_) {}
    return max;
  }

  function getMaxZIndexExcluding(excludeEl) {
    var max = 0;
    try {
      if (!document.body) return max;
      var all = document.body.querySelectorAll("*");
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el && el.id === ZC_HUD_ID) continue;
        if (excludeEl && el === excludeEl) continue;
        var z = parseInt(window.getComputedStyle(el).zIndex, 10);
        if (!Number.isNaN(z)) max = Math.max(max, z);
      }
    } catch (_) {}
    return max;
  }

  /**
   * Prochain z-index global : max(DOM, pile mémoire session) + STEP.
   */
  function getNextZIndex() {
    var domMax = getMaxZIndex();
    var next = Math.max(domMax, lastAllocatedZ) + STEP;
    if (next >= Z_HARD_CAP) {
      zcReloadIfZStackExhausted("getNextZIndex");
      return Z_HARD_CAP - STEP;
    }
    lastAllocatedZ = next;
    return next;
  }

  /** Réaligne le compteur session sur le document (à appeler après suppression d’overlays / fermeture). */
  function zcSyncSessionStackFromDom() {
    try {
      lastAllocatedZ = getMaxZIndex();
    } catch (_) {}
  }

  function zIndexEffectiveZ(el) {
    if (!el || el.nodeType !== 1) return 0;
    var z = 0;
    try {
      var inline = parseInt(String(el.style.zIndex || ""), 10);
      if (Number.isFinite(inline)) z = Math.max(z, inline);
    } catch (_) {}
    try {
      if (typeof window.getComputedStyle === "function") {
        var cz = parseInt(String(window.getComputedStyle(el).zIndex || ""), 10);
        if (Number.isFinite(cz)) z = Math.max(z, cz);
      }
    } catch (_) {}
    return z;
  }

  function zcZIndexPlaceOverlayAboveCaller(callerEl, targetEl) {
    if (!targetEl) return 0;
    var callerId = callerEl && callerEl.id ? callerEl.id : "(null)";
    var callerZBefore =
      callerEl && typeof zIndexEffectiveZ === "function" ? zIndexEffectiveZ(callerEl) : 0;
    var maxSansTarget = getMaxZIndexExcluding(targetEl);
    var floor = Math.max(maxSansTarget, callerZBefore, lastAllocatedZ) + STEP;
    if (floor >= Z_HARD_CAP) {
      zcReloadIfZStackExhausted("zcZIndexPlaceOverlayAboveCaller");
      floor = Z_HARD_CAP - STEP;
    }
    lastAllocatedZ = floor;
    try {
      targetEl.style.zIndex = String(floor);
    } catch (_) {}
    try {
      if (
        callerEl &&
        document.body &&
        targetEl.parentNode === document.body &&
        typeof zIndexEffectiveZ === "function" &&
        zIndexEffectiveZ(targetEl) <= zIndexEffectiveZ(callerEl)
      ) {
        document.body.appendChild(targetEl);
      }
    } catch (_) {}
    if (
      zcIsTrackedTopZWindow(targetEl) ||
      (callerEl && zcIsTrackedTopZWindow(callerEl))
    ) {
      zcLogTopZ("zcZIndexPlaceOverlayAboveCaller (pile → nouvelle surface)", {
        callerId: callerId,
        callerZBefore: callerZBefore,
        targetId: targetEl.id || "",
        assignedToTarget: floor,
        domMaxExcludingTarget: maxSansTarget,
      });
    }
    return floor;
  }

  function bringToFront(el, offset) {
    if (!el) return 0;
    var off = Number(offset) || 0;
    var maxOther = getMaxZIndexExcluding(el);
    var currentZ = 0;
    try {
      currentZ = zIndexEffectiveZ(el);
    } catch (_) {}
    // Évite l'incrément infini : si la fenêtre est déjà au-dessus du reste,
    // ne pas réallouer un nouveau z-index.
    if (Number.isFinite(currentZ) && currentZ > maxOther + off) {
      return currentZ;
    }
    var prevLast = lastAllocatedZ;
    var topZ = Math.max(maxOther, lastAllocatedZ) + STEP + off;
    if (topZ >= Z_HARD_CAP) {
      zcReloadIfZStackExhausted("zcBringToFront");
      topZ = Z_HARD_CAP - STEP;
    }
    lastAllocatedZ = topZ;
    try {
      el.style.zIndex = String(topZ);
    } catch (_) {}
    if (zcIsTrackedTopZWindow(el)) {
      zcLogTopZ("zcBringToFront (pile → fenêtre suivie)", {
        windowId: el.id || "",
        maxOther: maxOther,
        lastAllocatedBefore: prevLast,
        offset: off,
        assigned: topZ,
      });
    }
    return topZ;
  }

  var zcHudTimer = null;

  function zcEscapeHud(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Le HUD est exclu du scan getMaxZIndex ; il ne doit pas réinjecter sa valeur dans
   * lastAllocatedZ à chaque tick (sinon +STEP toutes les ~450 ms sans rien d’autre au DOM).
   */
  function zcHudRefreshZIndex(hud) {
    if (!hud) return;
    try {
      var z = Math.max(getMaxZIndexExcluding(hud), lastAllocatedZ) + STEP;
      if (z >= Z_HARD_CAP) z = Z_HARD_CAP - STEP;
      hud.style.zIndex = String(z);
    } catch (_) {}
  }

  function zcDebugZIndexSnapshot(reason) {
    var ids = [
      "popupResultats",
      "popupResultatsZ1",
      "popupResultatsZ2",
      "popupResultatsZ3",
      "popupHtml",
      "zcMesNotesReadOverlay",
      "afModalOverlay",
      "popupContextMenu",
    ];
    var out = {
      reason: reason || "",
      maxDom: getMaxZIndex(),
      lastAllocatedZ: lastAllocatedZ,
      nodes: {},
    };
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var el = document.getElementById(id);
      if (!el) continue;
      try {
        var inl = parseInt(String(el.style.zIndex || ""), 10);
        var cz = window.getComputedStyle(el).zIndex;
        out.nodes[id] = {
          inline: Number.isFinite(inl) ? inl : null,
          computed: cz,
          display: window.getComputedStyle(el).display,
        };
      } catch (_) {
        out.nodes[id] = "?";
      }
    }
    return out;
  }

  function zcDebugZIndexHudRefresh() {
    var hud = document.getElementById(ZC_HUD_ID);
    if (!hud) return;
    zcHudRefreshZIndex(hud);
    var ids = [
      "popupResultats",
      "popupResultatsZ1",
      "popupResultatsZ2",
      "popupResultatsZ3",
      "popupHtml",
      "zcMesNotesReadOverlay",
      "afModalOverlay",
      "popupContextMenu",
      "audio-floating-container",
      "lecteurOverlay",
    ];
    var parts = [];
    parts.push(
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">',
      '<span style="font-weight:700;color:#f8fafc;">z-index — fenêtres</span>',
      '<button type="button" id="zcZIndexHudClose" style="flex-shrink:0;background:#334155;border:1px solid #64748b;color:#e2e8f0;border-radius:6px;padding:2px 8px;font:inherit;cursor:pointer;">Masquer</button>',
      "</div>"
    );
    parts.push(
      '<div style="opacity:.85;font-size:10px;margin-bottom:8px;color:#94a3b8;">pile session <code>lastAllocatedZ</code> : <strong>',
      String(lastAllocatedZ),
      "</strong> · max scan DOM : <strong>",
      String(getMaxZIndex()),
      "</strong></div>"
    );
    parts.push(
      '<table style="border-collapse:collapse;width:100%;font-size:11px;"><thead><tr style="color:#94a3b8;text-align:left;">',
      "<th>#élément</th><th>inline</th><th>computed</th><th>eff.</th><th>display</th>",
      "</tr></thead><tbody>"
    );
    for (var hi = 0; hi < ids.length; hi++) {
      var hid = ids[hi];
      var hel = document.getElementById(hid);
      if (!hel) {
        parts.push(
          '<tr style="opacity:.4;"><td colspan="5">#',
          zcEscapeHud(hid),
          " <em>(absent)</em></td></tr>"
        );
        continue;
      }
      var inl = parseInt(String(hel.style.zIndex || ""), 10);
      var cz = "";
      var disp = "";
      var eff = 0;
      try {
        cz = String(window.getComputedStyle(hel).zIndex || "");
        disp = String(window.getComputedStyle(hel).display || "");
        eff = zIndexEffectiveZ(hel);
      } catch (_) {}
      parts.push(
        "<tr><td style=\"padding:3px 6px 3px 0;word-break:break-all;\">#",
        zcEscapeHud(hid),
        '</td><td style="padding:3px 4px;">',
        Number.isFinite(inl) ? String(inl) : "—",
        '</td><td style="padding:3px 4px;">',
        zcEscapeHud(cz || "—"),
        '</td><td style="padding:3px 4px;font-weight:600;color:#fde68a;">',
        String(eff),
        '</td><td style="padding:3px 4px;font-size:10px;">',
        zcEscapeHud(disp),
        "</td></tr>"
      );
    }
    parts.push("</tbody></table>");
    parts.push(
      '<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(148,163,184,.35);font-size:11px;line-height:1.45;">',
      '<div style="color:#94a3b8;margin-bottom:4px;">Fenêtre appelante résolue <span style="opacity:.8;">(Zoom/Warsh visible)</span></div>'
    );
    try {
      if (typeof window.zcPickVisibleReadCallerEl === "function") {
        var c = window.zcPickVisibleReadCallerEl();
        if (c && c.id) {
          var ce = zIndexEffectiveZ(c);
          var ci = parseInt(String(c.style.zIndex || ""), 10);
          parts.push(
            '<div><strong style="color:#86efac;">#',
            zcEscapeHud(c.id),
            "</strong> · z eff. <strong>",
            String(ce),
            "</strong> · inline ",
            Number.isFinite(ci) ? String(ci) : "—",
            "</div>"
          );
        } else {
          parts.push('<div style="color:#fca5a5;"><em>Aucun popup Zoom / Warsh détecté comme visible</em></div>');
        }
      } else {
        parts.push(
          '<div style="color:#fcd34d;"><em>Zoom-Coran.js pas encore chargé → pas de zcPickVisibleReadCallerEl</em></div>'
        );
      }
    } catch (err) {
      parts.push("<div>", zcEscapeHud(String(err && err.message ? err.message : err)), "</div>");
    }
    parts.push("</div>");
    hud.innerHTML = parts.join("");
    var btn = hud.querySelector("#zcZIndexHudClose");
    if (btn) {
      btn.onclick = function () {
        zcDebugZIndexHudRemove();
        try {
          window.ZC_DEBUG_Z_INDEX_HUD = false;
        } catch (_) {}
      };
    }
  }

  function zcDebugZIndexHudRemove() {
    try {
      if (zcHudTimer) {
        clearInterval(zcHudTimer);
        zcHudTimer = null;
      }
    } catch (_) {}
    var hud = document.getElementById(ZC_HUD_ID);
    if (hud && hud.parentNode) {
      try {
        hud.parentNode.removeChild(hud);
      } catch (_) {}
    }
  }

  function zcDebugZIndexHudEnsure() {
    if (!zcDebugZIndexHudEnabled()) {
      zcDebugZIndexHudRemove();
      return;
    }
    if (!document.body) return;
    var hud = document.getElementById(ZC_HUD_ID);
    if (!hud) {
      hud = document.createElement("div");
      hud.id = ZC_HUD_ID;
      hud.setAttribute("role", "status");
      hud.setAttribute("aria-live", "polite");
      hud.style.cssText =
        "position:fixed;bottom:10px;left:10px;max-width:min(96vw,560px);max-height:48vh;overflow:auto;" +
        "background:rgba(15,23,42,.94);color:#e2e8f8;font-family:ui-monospace,Cascadia Code,Consolas,monospace;" +
        "padding:12px 14px;border-radius:12px;border:1px solid rgba(148,163,184,.45);" +
        "box-shadow:0 12px 40px rgba(0,0,0,.5);font-size:11px;line-height:1.35;pointer-events:auto;";
      document.body.appendChild(hud);
      zcHudRefreshZIndex(hud);
    }
    zcDebugZIndexHudRefresh();
    try {
      if (zcHudTimer) clearInterval(zcHudTimer);
    } catch (_) {}
    zcHudTimer = setInterval(zcDebugZIndexHudRefresh, 450);
  }

  function zcBootDebugHud() {
    try {
      if (zcDebugZIndexHudEnabled()) zcDebugZIndexHudEnsure();
      else zcDebugZIndexHudRemove();
    } catch (_) {}
  }

  function zcDebugZIndexOn() {
    try {
      localStorage.setItem("alfamous_debug_z", "1");
    } catch (e) {
      try {
        if (typeof console !== "undefined" && typeof console.warn === "function") {
          console.warn("[zc-z] localStorage indisponible — utilise window.ZC_DEBUG_Z_INDEX = true", e);
        }
      } catch (_) {}
    }
    try {
      window.ZC_DEBUG_Z_INDEX = true;
    } catch (_) {}
    try {
      if (typeof console !== "undefined" && typeof console.log === "function") {
        console.log("[zc-z] Debug ACTIVÉ.");
      }
    } catch (_) {}
    return true;
  }

  function zcDebugZIndexOff() {
    try {
      localStorage.removeItem("alfamous_debug_z");
      localStorage.removeItem("alfamous_debug_z_hud");
    } catch (_) {}
    try {
      window.ZC_DEBUG_Z_INDEX = false;
      window.ZC_DEBUG_Z_INDEX_HUD = false;
    } catch (_) {}
    try {
      zcDebugZIndexHudRemove();
    } catch (_) {}
    try {
      if (typeof console !== "undefined" && typeof console.log === "function") {
        console.log("[zc-z] Debug désactivé.");
      }
    } catch (_) {}
    return true;
  }

  function zcDebugZIndexStatus() {
    try {
      if (typeof console !== "undefined" && typeof console.log === "function") {
        console.log("[zc-z] statut | debug actif ?", zcDebugZIndexEnabled());
        console.log("[zc-z] lastAllocatedZ =", lastAllocatedZ);
        console.log("[zc-z] maxDom =", getMaxZIndex());
      }
    } catch (_) {}
  }

  function zcEnsureGlobalPopupsAttachedToBody() {
    var ids = ["popupResultats", "popupResultatsZ1", "popupResultatsZ2", "popupResultatsZ3", "popupHtml", "popupContextMenu"];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el || !document.body) continue;
      if (el.parentElement === document.body) continue;
      try {
        document.body.appendChild(el);
      } catch (_) {}
    }
  }

  var ZC_APP_WINDOW_IDS = [
    "popupHtml",
    "popupResultats",
    "popupResultatsZ1",
    "popupResultatsZ2",
    "popupResultatsZ3",
    "popupContextMenu",
    "popupCommentaireOverlay",
    "forumReplyOverlay",
    "forumReadOverlay",
    "forumEditOverlay",
    "zcHistorikOverlay",
    "zcTraductionOverlay",
    "customModal",
    "popupOverlay",
    "afModalOverlay",
    "zcMesNotesReadOverlay",
    "lecteurOverlay",
    "audio-floating-container"
  ];

  function zcGetAppWindowElement(ref) {
    if (!ref) return null;
    if (ref.nodeType === 1) return ref;
    if (typeof ref === "string") return document.getElementById(ref);
    return null;
  }

  function zcIsVisibleForStack(el) {
    if (!el || el.nodeType !== 1) return false;
    try {
      var cs = window.getComputedStyle(el);
      if (!cs) return false;
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      return true;
    } catch (_) {}
    return false;
  }

  function zcBringAppWindowToFront(ref) {
    var el = zcGetAppWindowElement(ref);
    if (!el || !zcIsVisibleForStack(el)) return 0;
    try {
      el.__zcLastRaiseAt = Date.now();
    } catch (_) {}
    return bringToFront(el);
  }

  function zcBindAppWindowStackPipeline() {
    for (var i = 0; i < ZC_APP_WINDOW_IDS.length; i++) {
      try {
        var winEl = document.getElementById(ZC_APP_WINDOW_IDS[i]);
        if (winEl) winEl.classList.add("zc-app-window");
      } catch (_) {}
    }

    function onActivate(ev) {
      var el = ev && ev.target && ev.target.closest ? ev.target.closest(".zc-app-window") : null;
      if (!el) return;
      zcBringAppWindowToFront(el);
    }

    document.addEventListener("pointerdown", onActivate, true);
    document.addEventListener("focusin", onActivate, true);

    // IMPORTANT: pas de remontée sur MutationObserver.
    // Les mutations de style/class pendant les rendus peuvent provoquer une boucle
    // d'allocations z-index (+STEP en continu). La montée se fait uniquement
    // sur activation explicite (pointerdown/focusin) ou appel direct métier.
  }

  window.STEP = STEP;
  window.ZC_Z_HARD_CAP = Z_HARD_CAP;
  window.getMaxZIndex = getMaxZIndex;
  window.getMaxZIndexExcluding = getMaxZIndexExcluding;
  window.zIndexMax = getMaxZIndex;
  window.getNextZIndex = getNextZIndex;
  window.zcBringToFront = bringToFront;
  window.zcZIndexPlaceOverlayAboveCaller = zcZIndexPlaceOverlayAboveCaller;
  window.zIndexEffectiveZ = zIndexEffectiveZ;
  window.zcDebugZIndexEnabled = zcDebugZIndexEnabled;
  window.zcDebugZIndexHudEnabled = zcDebugZIndexHudEnabled;
  window.zcDebugZIndexLog = zcDebugZIndexLog;
  window.zcDebugZIndexSnapshot = zcDebugZIndexSnapshot;
  window.zcDebugZIndexHudEnsure = zcDebugZIndexHudEnsure;
  window.zcDebugZIndexHudRefresh = zcDebugZIndexHudRefresh;
  window.zcDebugZIndexHudRemove = zcDebugZIndexHudRemove;
  window.zcLogTopZ = zcLogTopZ;
  window.zcIsTrackedTopZWindow = zcIsTrackedTopZWindow;
  window.zcDebugZIndexOn = zcDebugZIndexOn;
  window.zcDebugZIndexOff = zcDebugZIndexOff;
  window.zcDebugZIndexStatus = zcDebugZIndexStatus;
  window.zcEnsureGlobalPopupsAttachedToBody = zcEnsureGlobalPopupsAttachedToBody;
  window.zcSyncSessionStackFromDom = zcSyncSessionStackFromDom;
  window.zcBringAppWindowToFront = zcBringAppWindowToFront;
  window.ZC_APP_WINDOW_IDS = ZC_APP_WINDOW_IDS.slice();

  if (document.body) {
    zcEnsureGlobalPopupsAttachedToBody();
    zcBindAppWindowStackPipeline();
    zcSyncSessionStackFromDom();
    zcBootDebugHud();
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        zcEnsureGlobalPopupsAttachedToBody();
        zcBindAppWindowStackPipeline();
        zcSyncSessionStackFromDom();
        zcBootDebugHud();
      },
      { once: true }
    );
  }

  try {
    if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem("zc_z_hint_once")) {
      sessionStorage.setItem("zc_z_hint_once", "1");
      if (typeof console !== "undefined" && typeof console.log === "function") {
        console.log("[zc-z] z-index : max(DOM, lastAllocatedZ)+" + String(STEP) + " — zcDebugZIndexOn() pour les traces.");
      }
    }
  } catch (_) {}
})();
