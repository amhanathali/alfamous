/**
 * Notifications auteur (forum) : lecture de forumAuthorNotifications pour le mail profil (hors anonyme).
 * L’écriture est déclenchée côté forum.js après ajout d’une réponse.
 */
(function () {
  "use strict";

  var unsub = null;
  var lastItems = [];
  var __forumNotifyMail = null;
  var panelOpen = false;

  function getMyMail() {
    return String(localStorage.getItem("mailUser") || "").trim().toLowerCase();
  }

  function isRecipientEligible() {
    var m = getMyMail();
    if (!m) return false;
    if (typeof zcIsAnonymeCourriel === "function" && zcIsAnonymeCourriel(m)) return false;
    if (m === "anonyme@blog.alfamous.ca") return false;
    if (typeof window.zcFirebaseHasRealSignedInUser === "function" && !window.zcFirebaseHasRealSignedInUser()) {
      return false;
    }
    return true;
  }

  function strF() {
    return typeof getForumStrings === "function" ? getForumStrings() : {};
  }

  function tsLabel(ts) {
    if (!ts) return "";
    try {
      if (typeof ts.toDate === "function") return ts.toDate().toLocaleString();
      if (ts.seconds != null) return new Date(ts.seconds * 1000).toLocaleString();
    } catch (_) { }
    return "";
  }

  // Alias local → helper central (zc-utils.js)
  var escapeHtml = (window.zc && window.zc.escapeSimple) || window.escapeHtml || String;

  function setBadge(n) {
    var badges = document.querySelectorAll(".zc-forum-notify-badge");
    var bells = document.querySelectorAll(".zc-forum-notify-bell");
    if (!badges.length) return;
    badges.forEach(function (badge) {
      if (n > 0) {
        badge.hidden = false;
        badge.textContent = n > 99 ? "99+" : String(n);
      } else {
        badge.hidden = true;
        badge.textContent = "";
      }
    });
    bells.forEach(function (bell) {
      if (n > 0) bell.classList.add("zc-forum-notify-bell--has");
      else bell.classList.remove("zc-forum-notify-bell--has");
    });
  }

  function publishUnreadFromDocs(docs) {
    var ids = {};
    if (docs && docs.length) {
      docs.forEach(function (d) {
        var x = typeof d.data === "function" ? d.data() : d;
        if (x && !x.read && x.forumMessageId) ids[String(x.forumMessageId)] = true;
      });
    }
    window.__zcForumNotifyUnreadMessageIds = Object.keys(ids);
    try {
      if (typeof window.forumReaderRefreshNotifyBell === "function") {
        window.forumReaderRefreshNotifyBell();
      }
    } catch (_) { }
  }

  function renderList(docs) {
    var panels = document.querySelectorAll(".zc-forum-notify-list");
    var F = strF();
    if (!panels.length) {
      if (!docs || !docs.length) {
        setBadge(0);
        publishUnreadFromDocs([]);
      } else {
        var unreadOnly = 0;
        docs.forEach(function (d) {
          var x = typeof d.data === "function" ? d.data() : d;
          if (x && !x.read) unreadOnly++;
        });
        setBadge(unreadOnly);
        publishUnreadFromDocs(docs);
      }
      return;
    }
    if (!docs || !docs.length) {
      var emptyHtml =
        '<p class="zc-forum-notify-empty">' + escapeHtml(F.notifyEmpty || "") + "</p>";
      panels.forEach(function (el) {
        el.innerHTML = emptyHtml;
      });
      setBadge(0);
      publishUnreadFromDocs([]);
      return;
    }
    var unread = 0;
    var html = docs
      .map(function (d) {
        var x = typeof d.data === "function" ? d.data() : d;
        var id = d.id != null ? d.id : "";
        if (!x.read) unread++;
        var sub = escapeHtml(String(x.subject || "—").slice(0, 140));
        var nameRaw = String(x.replierName || "—").replace(/^@/, "").trim();
        var metaTpl = F.notifyItemMeta || "@%s";
        var meta = escapeHtml(metaTpl.replace("%s", nameRaw));
        var cls = x.read ? "zc-forum-notify-item zc-forum-notify-item--read" : "zc-forum-notify-item";
        var mid = escapeHtml(String(x.forumMessageId || ""));
        var nid = escapeHtml(String(id));
        return (
          '<button type="button" class="' +
          cls +
          '" data-nid="' +
          nid +
          '" data-mid="' +
          mid +
          '">' +
          '<span class="zc-forum-notify-item-subject">' +
          sub +
          "</span>" +
          '<span class="zc-forum-notify-item-meta">' +
          meta +
          "</span>" +
          '<span class="zc-forum-notify-item-when">' +
          escapeHtml(tsLabel(x.createdAt)) +
          "</span>" +
          "</button>"
        );
      })
      .join("");
    panels.forEach(function (el) {
      el.innerHTML = html;
    });
    setBadge(unread);
    publishUnreadFromDocs(docs);
  }

  function markRead(notifId) {
    if (!notifId || !window.db) return;
    window.db
      .collection("forumAuthorNotifications")
      .doc(notifId)
      .update({ read: true })
      .catch(function () { });
  }

  function closeAllNotifyPanels() {
    panelOpen = false;
    document.querySelectorAll(".zc-forum-notify-panel").forEach(function (p) {
      p.hidden = true;
    });
    document.querySelectorAll(".zc-forum-notify-bell").forEach(function (bell) {
      bell.setAttribute("aria-expanded", "false");
    });
  }

  function setPanelOpen(open) {
    if (!open) closeAllNotifyPanels();
  }

  function stopListener() {
    if (unsub) {
      try {
        unsub();
      } catch (_) { }
      unsub = null;
    }
    __forumNotifyMail = null;
    lastItems = [];
    renderList([]);
  }

  function startListener() {
    if (!window.db || !isRecipientEligible()) return;
    var mail = getMyMail();
    if (!mail) return;
    stopListener();
    __forumNotifyMail = mail;
    function docCreatedSec(doc) {
      try {
        var x = typeof doc.data === "function" ? doc.data() : {};
        var ts = x.createdAt;
        if (!ts) return 0;
        if (typeof ts.toMillis === "function") return ts.toMillis() / 1000;
        if (ts.seconds != null) return Number(ts.seconds) + (ts.nanoseconds || 0) / 1e9;
      } catch (_) { }
      return 0;
    }
    try {
      unsub = window.db
        .collection("forumAuthorNotifications")
        .where("targetMail", "==", mail)
        .limit(80)
        .onSnapshot(
          function (snap) {
            var arr = [];
            snap.forEach(function (doc) {
              arr.push(doc);
            });
            arr.sort(function (a, b) {
              return docCreatedSec(b) - docCreatedSec(a);
            });
            if (arr.length > 40) arr = arr.slice(0, 40);
            lastItems = arr;
            renderList(arr);
          },
          function (err) {
            console.warn("[forum-notify]", err && (err.message || err));
          }
        );
    } catch (err) {
      console.warn("[forum-notify] startListener", err);
      __forumNotifyMail = null;
    }
  }

  window.forumNotifyMarkReadForMessage = function (messageId) {
    if (!messageId || !lastItems || !lastItems.length) return;
    var mid = String(messageId);
    lastItems.forEach(function (doc) {
      try {
        var x = typeof doc.data === "function" ? doc.data() : {};
        if (String(x.forumMessageId || "") === mid && !x.read) {
          markRead(doc.id);
        }
      } catch (_) { }
    });
  };

  window.forumNotifyClosePanel = closeAllNotifyPanels;
  window.forumNotifyBindWraps = bindNotifyWrapStopPropagation;

  window.forumNotifyEnsureSubscribed = function () {
    if (!document.querySelector(".zc-forum-notify-wrap")) return;
    var hide = !window.db || !isRecipientEligible();
    document.querySelectorAll(".zc-forum-notify-wrap").forEach(function (wrap) {
      wrap.hidden = hide;
    });
    if (hide) {
      stopListener();
      return;
    }
    var m = getMyMail();
    if (m === __forumNotifyMail && unsub) return;
    startListener();
  };

  function bindNotifyWrapStopPropagation() {
    document.querySelectorAll(".zc-forum-notify-wrap").forEach(function (wrap) {
      if (wrap.dataset.stopOut) return;
      wrap.dataset.stopOut = "1";
      wrap.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    });
  }

  window.refreshForumNotifyInboxI18n = function () {
    var F = strF();
    document.querySelectorAll(".zc-forum-notify-bell").forEach(function (bell) {
      bell.title = F.notifyBellTitle || "";
      bell.setAttribute("aria-label", F.notifyBellAria || F.notifyBellTitle || "");
    });
    document.querySelectorAll(".zc-forum-notify-panel-title").forEach(function (h) {
      h.textContent = F.notifyPanelHeading || "Notifications";
    });
    renderList(lastItems);
  };

  function bindListClicks() {
    if (document.documentElement.dataset.forumNotifyListDeleg) return;
    document.documentElement.dataset.forumNotifyListDeleg = "1";
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest && e.target.closest(".zc-forum-notify-item");
      if (!btn || !btn.closest(".zc-forum-notify-list")) return;
      var nid = btn.getAttribute("data-nid");
      var mid = btn.getAttribute("data-mid");
      markRead(nid);
      btn.classList.add("zc-forum-notify-item--read");
      setPanelOpen(false);
      if (mid && typeof openForumReadPopup === "function") {
        openForumReadPopup(mid, { scrollToReplies: true });
      }
    });
  }

  function boot() {
    if (typeof window.firebase !== "undefined" && window.firebase.firestore && !window.db) {
      try {
        window.db = window.firebase.firestore();
      } catch (_) { }
    }
    bindListClicks();
    if (!document.documentElement.dataset.forumNotifyBellDeleg) {
      document.documentElement.dataset.forumNotifyBellDeleg = "1";
      document.addEventListener("click", function (e) {
        var bell = e.target && e.target.closest && e.target.closest(".zc-forum-notify-bell");
        if (!bell || !bell.closest(".zc-forum-notify-wrap")) return;
        e.preventDefault();
        e.stopPropagation();
        var wrap = bell.closest(".zc-forum-notify-wrap");
        var panel = wrap && wrap.querySelector(".zc-forum-notify-panel");
        if (!panel) return;
        var wasOpen = !panel.hidden;
        closeAllNotifyPanels();
        if (!wasOpen) {
          panel.hidden = false;
          panelOpen = true;
          bell.setAttribute("aria-expanded", "true");
        }
      });
    }
    bindNotifyWrapStopPropagation();
    document.addEventListener("click", function () {
      if (panelOpen) setPanelOpen(false);
    });
    function go() {
      try {
        if (typeof window.whenDbReady === "function") {
          window.whenDbReady(function () {
            window.forumNotifyEnsureSubscribed();
          });
        } else {
          window.forumNotifyEnsureSubscribed();
        }
      } catch (_) {
        window.forumNotifyEnsureSubscribed();
      }
    }
    try {
      if (typeof window.refreshForumNotifyInboxI18n === "function") {
        window.refreshForumNotifyInboxI18n();
      }
    } catch (_) { }
    go();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
