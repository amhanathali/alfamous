/**
 * CHOKR — pastille dans la languette + compteurs « nouveaux » (forum, témoignages).
 * Contact : reprend messagesNonTraites (admin, messages non traités).
 */
(function () {
  "use strict";

  var LS_FORUM = "chokrForumSeenAt";
  var LS_TEMOIGNAGES = "chokrTemoignagesSeenAt";
  var COL_TEMOIGNAGES = "temoignages";
  var STATUS_PUBLIC = "approved";
  var forumUnsub = null;
  var temoUnsub = null;

  function isAdmin() {
    try { return Number(localStorage.getItem("niveauUser") || 0) > 2; }
    catch (_) { return false; }
  }

  function tsToMs(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (ts.seconds != null) return ts.seconds * 1000;
    return 0;
  }

  function isChokrCollapsed() {
    var p = document.getElementById("panelChokr");
    return !!(p && p.classList.contains("zc-panel-collapsed"));
  }

  function contactPendingCount() {
    var n = parseInt(localStorage.getItem("messagesNonTraites") || "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function hasContactAlert() {
    return isAdmin() && contactPendingCount() > 0;
  }

  function updateChokrHeadDot() {
    var el = document.getElementById("chokrHeadNotify");
    if (!el) return;
    var forumN = window.__chokrForumNewCount | 0;
    var temoN = window.__chokrTemoignagesNewCount | 0;
    var activity = hasContactAlert() || forumN > 0 || temoN > 0;
    var show = activity && isChokrCollapsed();
    el.hidden = !show;
    el.classList.toggle("zc-chokr-notify--on", show);
    el.setAttribute("aria-hidden", show ? "false" : "true");
    if (show) {
      var parts = [];
      if (hasContactAlert()) parts.push("Contact (" + contactPendingCount() + ")");
      if (forumN > 0) parts.push("Forum (" + forumN + ")");
      if (temoN > 0) parts.push("Témoignages (" + temoN + ")");
      el.title = "Nouvelle activité : ouvrez le bloc — " + parts.join(", ");
    } else {
      el.title = activity
        ? "Ouvrez ou refermez le bloc pour voir les compteurs Contact, Forum, Témoignages"
        : "";
    }
  }

  window.updateChokrNotifyDot = updateChokrHeadDot;

  function setForumBadge(n) {
    var text = n > 0 ? String(n) : "";
    var aria = n > 0 ? n + " nouveaux messages forum" : "";
    var b = document.getElementById("badgeForumCount");
    if (b) {
      b.textContent = text;
      b.setAttribute("aria-label", aria);
    }
    var bAf = document.getElementById("afModalForumBadge");
    if (bAf) {
      bAf.textContent = text;
      bAf.setAttribute("aria-label", aria);
    }
  }

  function setTemoignagesBadge(newCount, totalApproved) {
    var b = document.getElementById("badgeTemoignagesCount");
    if (!b) return;
    b.textContent = newCount > 0 ? " " + newCount : "";
    b.setAttribute("aria-label", newCount > 0
      ? newCount + " nouveaux témoignages publiés"
      : (totalApproved ? "Total publiés : " + totalApproved : ""));
    var btn = document.getElementById("t-temoignages");
    if (btn && totalApproved != null) {
      if (!btn.dataset.chokrTitleBase) {
        btn.dataset.chokrTitleBase = (btn.getAttribute("title") || "Témoignages").trim();
      }
      btn.title = btn.dataset.chokrTitleBase + (totalApproved ? " — " + totalApproved + " publié(s)" : "");
    }
  }

  window.markChokrChannelSeen = function (channel) {
    var now = new Date().toISOString();
    if (channel === "forum") {
      try { localStorage.setItem(LS_FORUM, now); } catch (_) {}
      window.__chokrForumNewCount = 0;
      setForumBadge(0);
    }
    if (channel === "temoignages") {
      try { localStorage.setItem(LS_TEMOIGNAGES, now); } catch (_) {}
      window.__chokrTemoignagesNewCount = 0;
      var t = window.__chokrTemoignagesTotalApproved | 0;
      setTemoignagesBadge(0, t);
    }
    updateChokrHeadDot();
  };

  function stopChokrFirestoreListeners() {
    if (forumUnsub) {
      try {
        forumUnsub();
      } catch (_) {}
      forumUnsub = null;
    }
    if (temoUnsub) {
      try {
        temoUnsub();
      } catch (_) {}
      temoUnsub = null;
    }
    window.__chokrForumNewCount = 0;
    window.__chokrTemoignagesNewCount = 0;
    window.__chokrTemoignagesTotalApproved = 0;
    setForumBadge(0);
    setTemoignagesBadge(0, 0);
    updateChokrHeadDot();
  }

  function appProfileIsNonAnonyme() {
    try {
      var m = String(localStorage.getItem("mailUser") || "").trim().toLowerCase();
      if (!m) return false;
      if (typeof zcIsAnonymeCourriel === "function" && zcIsAnonymeCourriel(m)) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  function syncChokrFirestoreListeners() {
    var authOk =
      typeof window.zcFirebaseHasRealSignedInUser === "function" &&
      window.zcFirebaseHasRealSignedInUser();
    var ok = appProfileIsNonAnonyme() && authOk;
    if (!ok) {
      stopChokrFirestoreListeners();
      return;
    }
    if (!window.db || !window.db.collection) return;
    if (!forumUnsub) startForumListener(window.db);
    if (!temoUnsub) startTemoignagesListener(window.db);
  }

  window.chokrNotifySyncFirestore = syncChokrFirestoreListeners;

  function startForumListener(db) {
    if (forumUnsub) return;
    forumUnsub = db.collection("forumMessages").onSnapshot(function (snap) {
      if (!localStorage.getItem(LS_FORUM)) {
        try { localStorage.setItem(LS_FORUM, new Date().toISOString()); } catch (_) {}
        window.__chokrForumNewCount = 0;
        setForumBadge(0);
        updateChokrHeadDot();
        return;
      }
      var seenMs = 0;
      try {
        var iso = localStorage.getItem(LS_FORUM);
        if (iso) seenMs = new Date(iso).getTime();
      } catch (_) {}
      var n = 0;
      snap.forEach(function (doc) {
        var ts = doc.data() && doc.data().timestamp;
        var ms = tsToMs(ts);
        if (ms > seenMs) n++;
      });
      window.__chokrForumNewCount = n;
      setForumBadge(n);
      updateChokrHeadDot();
    }, function (err) {
      console.warn("[chokr-notify] forum:", err && (err.message || err));
    });
  }

  function startTemoignagesListener(db) {
    if (temoUnsub) return;
    var q = db.collection(COL_TEMOIGNAGES).where("status", "==", STATUS_PUBLIC);
    temoUnsub = q.onSnapshot(function (snap) {
      var total = snap.size | 0;
      window.__chokrTemoignagesTotalApproved = total;

      if (!localStorage.getItem(LS_TEMOIGNAGES)) {
        try { localStorage.setItem(LS_TEMOIGNAGES, new Date().toISOString()); } catch (_) {}
        window.__chokrTemoignagesNewCount = 0;
        setTemoignagesBadge(0, total);
        updateChokrHeadDot();
        return;
      }

      var seenMs = 0;
      try {
        var iso = localStorage.getItem(LS_TEMOIGNAGES);
        if (iso) seenMs = new Date(iso).getTime();
      } catch (_) {}

      var n = 0;
      snap.forEach(function (doc) {
        var d = doc.data() || {};
        var ms = tsToMs(d.createdAt);
        if (ms > seenMs) n++;
      });

      window.__chokrTemoignagesNewCount = n;
      setTemoignagesBadge(n, total);
      updateChokrHeadDot();
    }, function (err) {
      console.warn("[chokr-notify] témoignages:", err && (err.message || err));
      if (isAdmin()) {
        db.collection(COL_TEMOIGNAGES).get().then(function (s) {
          var total = s.size | 0;
          window.__chokrTemoignagesTotalApproved = total;
          setTemoignagesBadge(0, total);
        }).catch(function () {});
      }
    });
  }

  function watchChokrPanelCollapse() {
    var p = document.getElementById("panelChokr");
    if (!p || typeof MutationObserver === "undefined") return;
    var obs = new MutationObserver(function () {
      updateChokrHeadDot();
    });
    obs.observe(p, { attributes: true, attributeFilter: ["class"] });
  }

  function boot() {
    if (typeof window.db === "undefined" || !window.db) {
      if (window.firebase && typeof window.firebase.firestore === "function") {
        try { window.db = window.firebase.firestore(); } catch (_) {}
      }
    }
    if (!window.db || !window.db.collection) {
      console.warn("[chokr-notify] Firestore indisponible");
      return;
    }

    watchChokrPanelCollapse();
    window.addEventListener("storage", function (e) {
      if (e.key === "messagesNonTraites") updateChokrHeadDot();
    });

    syncChokrFirestoreListeners();
    updateChokrHeadDot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
