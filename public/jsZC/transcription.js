/**
 * Dictée vocale pour Mes Notes : micro sur la ligne **Texte** (#afModalTitleTranscribeInline),
 * onglets = langue de **secours** si la phrase est ambiguë ; ils sont alignés sur **#uiLangSelect**
 * (setLang) — clic onglet ⇄ changement de langue interface.
 *
 * L’API Web Speech ne déduit pas la langue depuis l’audio : on utilise une heuristique sur le **texte**
 * reconnu (final) pour choisir la prochaine locale (FR / EN / ES / AR) et redémarrer le moteur si besoin.
 * Ambiguïté → locale de l’onglet actif (ou UI). Kab → dictée en français (fr-FR).
 */
(function initAfNotesSpeechTranscription() {
  const state = {
    listening: false,
    recognition: null,
    mediaStream: null,
    mediaRecorder: null,
    /** Locale active pour cette session de reconnaissance (mise à jour après détection ou secours). */
    dynamicRecoLang: null,
    /** Secours si phrase ambiguë : fr-FR, ar-SA, etc. (onglets / UI, pas une contrainte permanente). */
    fallbackRecoLocale: null,
    restartRecognitionAfterEnd: false,
    /** Ancrage insertion dictée si le textarea n’a plus le focus { start, end }. */
    bodyInsertAnchor: null
  };

  function clampBodyOffsets(ta, start, end) {
    const len = ta.value.length;
    let s = Number(start);
    if (Number.isNaN(s)) s = 0;
    s = Math.max(0, Math.min(s, len));
    let e = end == null || Number.isNaN(Number(end)) ? s : Number(end);
    e = Math.max(0, Math.min(e, len));
    if (e < s) e = s;
    return { start: s, end: e };
  }

  /** Insère le transcript au curseur ; focus + sélection après le texte inséré. */
  function insertTranscriptAtBodyCursor(ta, rawText) {
    const piece = String(rawText || "").trim();
    if (!piece) return;
    let start;
    let end;
    if (document.activeElement === ta) {
      start = ta.selectionStart;
      end = ta.selectionEnd;
    } else if (state.bodyInsertAnchor && typeof state.bodyInsertAnchor.start === "number") {
      start = state.bodyInsertAnchor.start;
      end = state.bodyInsertAnchor.end;
    } else {
      const len = ta.value.length;
      start = end = len;
    }
    const c = clampBodyOffsets(ta, start, end);
    start = c.start;
    end = c.end;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    let ins = piece;
    if (before.length && ins.length && !/\s$/.test(before) && !/^\s/.test(ins)) {
      ins = " " + ins;
    }
    const newPos = before.length + ins.length;
    ta.value = before + ins + after;
    state.bodyInsertAnchor = { start: newPos, end: newPos };
    try {
      ta.focus();
      ta.setSelectionRange(newPos, newPos);
    } catch (_) {}
    try {
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (_) {}
    try {
      if (typeof window.refreshSearchFieldToolVisibility === "function") {
        window.refreshSearchFieldToolVisibility("afModalBody");
      }
    } catch (_) {}
  }

  function getLc() {
    const raw = (typeof window.getUILang === "function" ? String(window.getUILang() || "fr") : "fr").toLowerCase().trim();
    if (raw.startsWith("kab")) return "kab";
    if (raw.startsWith("zgh")) return "zgh";
    return raw.slice(0, 2);
  }

  /** Alignement onglets dictée ↔ sélecteur uiLang (index) — ne pas utiliser slice(0,2) seul (kab). */
  function getUiLangTabKey() {
    const u = typeof window.getUILang === "function" ? String(window.getUILang() || "fr").toLowerCase().trim() : "fr";
    if (u.startsWith("kab")) return "kab";
    if (u.startsWith("zgh")) return "kab";
    const two = u.slice(0, 2);
    if (two === "fr" || two === "ar" || two === "es" || two === "en") return two;
    return "fr";
  }

  function txt() {
    const lc = getLc();
    const T = {
      fr: {
        start: "Démarrer la transcription vocale",
        stop: "Arrêter la transcription (micro actif)",
        unsupported: "Dictée vocale indisponible sur ce navigateur.",
        denied: "Accès au micro refusé."
      },
      en: {
        start: "Start speech transcription",
        stop: "Stop transcription (recording)",
        unsupported: "Speech transcription unavailable in this browser.",
        denied: "Microphone access denied."
      },
      ar: {
        start: "بدء التفريغ الصوتي",
        stop: "إيقاف التفريغ",
        unsupported: "التفريغ الصوتي غير متاح.",
        denied: "تم رفض الميكروفون."
      },
      es: {
        start: "Iniciar dictado por voz",
        stop: "Detener dictado",
        unsupported: "Dictado no disponible en este navegador.",
        denied: "Acceso al micrófono denegado."
      }
    };
    return T[lc] || T.fr;
  }

  /** Langue interface (selectLangue / getUILang) → tag SpeechRecognition. */
  function pickRecoLang() {
    const lc = getLc();
    if (lc === "ar") return "ar-SA";
    if (lc === "en") return "en-US";
    if (lc === "es") return "es-ES";
    if (lc === "kab" || lc === "zgh") return "fr-FR";
    return "fr-FR";
  }

  /**
   * Convertit une balise lang (fr, fr-FR, en-GB…) en locale utilisable par SpeechRecognition.
   * Retourne null si non reconnu — le chaînage passera au signal suivant.
   */
  function tagToSpeechLocale(tag) {
    const raw = String(tag || "").trim().replace(/_/g, "-");
    if (!raw) return null;
    const parts = raw.split("-").filter(Boolean);
    const base = (parts[0] || "").toLowerCase();
    if (base.length < 2) return null;

    if (parts.length >= 2 && /^[A-Za-z]{2}$/.test(parts[1])) {
      return base + "-" + parts[1].toUpperCase();
    }

    const map = {
      fr: "fr-FR",
      en: "en-US",
      ar: "ar-SA",
      es: "es-ES",
      de: "de-DE",
      it: "it-IT",
      pt: "pt-PT",
      nl: "nl-NL",
      pl: "pl-PL",
      ru: "ru-RU",
      tr: "tr-TR",
      ja: "ja-JP",
      ko: "ko-KR",
      zh: "zh-CN",
      sv: "sv-SE",
      da: "da-DK",
      no: "nb-NO",
      fi: "fi-FI",
      ca: "ca-ES",
      el: "el-GR",
      he: "he-IL",
      hi: "hi-IN",
      vi: "vi-VN",
      kab: "fr-FR",
      zgh: "fr-FR"
    };
    if (map[base]) return map[base];
    return null;
  }

  /**
   * Locale SpeechRecognition : d’abord la langue sélectionnée dans l’UI (index / uiLang),
   * puis signaux du document et du navigateur si aucune locale exploitable n’est trouvée avant.
   */
  function resolveSpeechRecognitionLang() {
    const candidates = [];
    try {
      const ui = pickRecoLang();
      if (ui) candidates.push(ui);
    } catch (_) {}
    try {
      const h = document.documentElement && document.documentElement.getAttribute("lang");
      if (h) candidates.push(h);
    } catch (_) {}
    try {
      if (navigator.languages && navigator.languages.length) {
        for (let i = 0; i < navigator.languages.length; i++) {
          candidates.push(navigator.languages[i]);
        }
      }
    } catch (_) {}
    try {
      if (navigator.language) candidates.push(navigator.language);
    } catch (_) {}

    for (let j = 0; j < candidates.length; j++) {
      const loc = tagToSpeechLocale(candidates[j]);
      if (loc) return loc;
    }
    return pickRecoLang();
  }

  /** Locale pour recog.lang : détection récente > secours onglets > résolution UI/navigateur. */
  function effectiveRecoLang() {
    if (state.dynamicRecoLang != null && String(state.dynamicRecoLang).trim() !== "") {
      return String(state.dynamicRecoLang);
    }
    if (state.fallbackRecoLocale != null && String(state.fallbackRecoLocale).trim() !== "") {
      return String(state.fallbackRecoLocale);
    }
    return resolveSpeechRecognitionLang();
  }

  /**
   * Heuristique sur le texte déjà transcrit (l’audio brut n’est pas accessible à l’API navigateur).
   * Ambiguïté → utiliser fallbackRecoLocale dans l’appelant.
   */
  function detectLangHint(text) {
    const s = String(text || "").trim();
    if (!s) return { lang: null, ambiguous: true };
    if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s)) {
      return { lang: "ar-SA", ambiguous: false };
    }
    const lower = s.toLowerCase();
    const frHit = /\b(le|la|les|un|une|des|du|de|l'|d'|et|est|sont|avec|pour|dans|sur|pas|plus|très|maison|être|monsieur|madame)\b/i.test(lower);
    const enHit = /\b(the|a|an|and|or|is|are|was|were|have|has|had|this|that|with|from|what|when|how|not|very|house|hello)\b/i.test(lower);
    const esHit = /\b(el|la|los|las|un|una|y|o|que|con|por|para|casa|muy|más|pero|esta|esto|como|pero)\b/i.test(lower);
    const nHits = (frHit ? 1 : 0) + (enHit ? 1 : 0) + (esHit ? 1 : 0);
    if (nHits > 1) return { lang: null, ambiguous: true };
    if (frHit) return { lang: "fr-FR", ambiguous: false };
    if (enHit) return { lang: "en-US", ambiguous: false };
    if (esHit) return { lang: "es-ES", ambiguous: false };
    if (/[àâäéèêëïîôùûçœæ]/i.test(s)) return { lang: "fr-FR", ambiguous: false };
    if (/[¿¡ñáéíóúü]/i.test(s)) return { lang: "es-ES", ambiguous: false };
    return { lang: null, ambiguous: true };
  }

  function normRecoLangBase(loc) {
    const x = String(loc || "")
      .toLowerCase()
      .replace(/_/g, "-")
      .split("-")[0];
    return x || "";
  }

  function nextRecoLangAfterFinal(hint) {
    if (!hint.ambiguous && hint.lang) return hint.lang;
    return (
      state.fallbackRecoLocale ||
      resolveSpeechRecognitionLang()
    );
  }

  const TRANSCRIBE_LANG_INNER =
    '<button type="button" class="zc-transcribe-lang-btn" data-zc-reco-lang="fr-FR" data-zc-lang-key="fr" title="Français" aria-pressed="false">FR</button>' +
    '<button type="button" class="zc-transcribe-lang-btn" data-zc-reco-lang="ar-SA" data-zc-lang-key="ar" title="العربية" aria-pressed="false">ع</button>' +
    '<button type="button" class="zc-transcribe-lang-btn" data-zc-reco-lang="es-ES" data-zc-lang-key="es" title="Español" aria-pressed="false">ES</button>' +
    '<button type="button" class="zc-transcribe-lang-btn" data-zc-reco-lang="en-US" data-zc-lang-key="en" title="English" aria-pressed="false">EN</button>' +
    '<button type="button" class="zc-transcribe-lang-btn" data-zc-reco-lang="fr-FR" data-zc-lang-key="kab" title="Taqbaylit (dictée en français)" aria-pressed="false">Kab</button>' +
    '<button type="button" id="afModalMesNoteAudioFileBtn" class="zc-transcribe-lang-btn zc-mesnote-audio-file-btn" title="" aria-label="">' +
    '<i class="fas fa-folder-open" aria-hidden="true"></i></button>';

  function ensureTranscribeLangToggle() {
    let wrap = document.getElementById("afModalTitleTranscribeLang");
    const tail =
      document.querySelector("#afModalOverlay .af-body-toolbar-tail") ||
      document.querySelector("#afModalOverlay .af-subject-toolbar-tail");
    const mic = document.getElementById("afModalTitleTranscribeInline");
    if (!wrap) {
      wrap = document.createElement("span");
      wrap.id = "afModalTitleTranscribeLang";
      wrap.className = "zc-transcribe-lang-wrap";
      wrap.setAttribute("role", "group");
      wrap.setAttribute("title", "Langue de secours si la phrase est ambiguë (FR/EN/ES/AR)");
      wrap.setAttribute("aria-label", "Langue de secours si la phrase est ambiguë");
      wrap.innerHTML = TRANSCRIBE_LANG_INNER;
      if (tail) {
        if (mic && tail.contains(mic)) tail.insertBefore(wrap, mic);
        else tail.appendChild(wrap);
      } else if (mic && mic.parentNode) mic.parentNode.insertBefore(wrap, mic.nextSibling);
      else return;
    } else if (
      !wrap.querySelector('[data-zc-lang-key="es"]') ||
      !wrap.querySelector("#afModalMesNoteAudioFileBtn")
    ) {
      wrap.innerHTML = TRANSCRIBE_LANG_INNER;
    }
    if (document.getElementById("afModalOverlay")) {
      try {
        if (typeof window.zcSyncMesNotesTtsLabels === "function") {
          window.zcSyncMesNotesTtsLabels();
        }
      } catch (_) {}
    }
  }

  function syncTranscribeLangButtons() {
    const wrap = document.getElementById("afModalTitleTranscribeLang");
    if (!wrap) return;
    /** Aligné sur #uiLangSelect / setLang — les onglets reflètent la langue interface (pas d’override séparé). */
    const activeKey = getUiLangTabKey();
    const buttons = wrap.querySelectorAll(".zc-transcribe-lang-btn[data-zc-lang-key]");
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      const key = b.getAttribute("data-zc-lang-key");
      const on = key === activeKey;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) {
        const lr = b.getAttribute("data-zc-reco-lang");
        if (lr) state.fallbackRecoLocale = lr;
      }
    }
  }

  function bindTranscribeLangControls() {
    ensureTranscribeLangToggle();
    const wrap = document.getElementById("afModalTitleTranscribeLang");
    if (!wrap) return;
    if (wrap.dataset.zcLangBound !== "1") {
      wrap.dataset.zcLangBound = "1";
      wrap.addEventListener("click", function (ev) {
        const t = ev.target && ev.target.closest && ev.target.closest("[data-zc-reco-lang]");
        if (!t || !wrap.contains(t)) return;
        ev.preventDefault();
        const lang = t.getAttribute("data-zc-reco-lang");
        const tabKey = t.getAttribute("data-zc-lang-key");
        if (!lang || !tabKey) return;
        state.fallbackRecoLocale = lang;
        state.dynamicRecoLang = null;
        try {
          if (typeof setLang === "function") {
            setLang(tabKey);
          }
        } catch (_) {}
        syncTranscribeLangButtons();
        if (state.listening && state.recognition) {
          state.restartRecognitionAfterEnd = true;
          try {
            state.recognition.stop();
          } catch (_) {}
        }
      });
    }
    syncTranscribeLangButtons();
  }

  function zcResetAfModalSpeechRecoFromUi() {
    state.dynamicRecoLang = null;
    state.fallbackRecoLocale = null;
    state.bodyInsertAnchor = null;
    syncTranscribeLangButtons();
  }

  function getBodyTa() {
    return document.getElementById("afModalBody");
  }

  function setRecordingUi(active) {
    const btn = document.getElementById("afModalTitleTranscribeInline");
    if (!btn) return;
    const T = txt();
    btn.classList.toggle("zc-transcribe-recording", !!active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    const label = active ? T.stop : T.start;
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }

  function stopRecorderOnly() {
    try {
      if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") state.mediaRecorder.stop();
    } catch (_) {}
    state.mediaRecorder = null;
    try {
      if (state.mediaStream) state.mediaStream.getTracks().forEach(function (tr) { tr.stop(); });
    } catch (_) {}
    state.mediaStream = null;
  }

  function stopAfModalSpeechTranscription() {
    state.restartRecognitionAfterEnd = false;
    state.dynamicRecoLang = null;
    try {
      if (state.recognition) state.recognition.stop();
    } catch (_) {}
    state.recognition = null;
    stopRecorderOnly();
    state.listening = false;
    setRecordingUi(false);
  }

  function syncAfModalTranscribeTitles() {
    setRecordingUi(state.listening);
  }

  function wireSpeechRecognition(recog, Ctor) {
    recog.lang = effectiveRecoLang();
    recog.continuous = true;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    recog.onstart = function () {
      state.listening = true;
      setRecordingUi(true);
      syncTranscribeLangButtons();
    };

    recog.onresult = function (ev) {
      const textarea = getBodyTa();
      if (!textarea) return;
      let finalChunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const tx = r && r[0] ? String(r[0].transcript || "") : "";
        if (r.isFinal && tx) finalChunk += tx + " ";
      }
      const trimmed = finalChunk.trim();
      if (trimmed) {
        insertTranscriptAtBodyCursor(textarea, trimmed);
        const hint = detectLangHint(trimmed);
        const nextLang = nextRecoLangAfterFinal(hint);
        const curBase = normRecoLangBase(recog.lang);
        const nextBase = normRecoLangBase(nextLang);
        if (nextBase && nextBase !== curBase) {
          state.dynamicRecoLang = nextLang;
          state.restartRecognitionAfterEnd = true;
          try {
            recog.stop();
          } catch (_) {}
        }
      }
    };

    recog.onerror = function () {
      stopAfModalSpeechTranscription();
    };

    recog.onend = function () {
      if (state.restartRecognitionAfterEnd && state.mediaStream) {
        state.restartRecognitionAfterEnd = false;
        state.recognition = null;
        try {
          const next = new Ctor();
          state.recognition = next;
          wireSpeechRecognition(next, Ctor);
          next.start();
        } catch (_) {
          stopAfModalSpeechTranscription();
        }
        return;
      }
      state.dynamicRecoLang = null;
      stopRecorderOnly();
      state.listening = false;
      state.recognition = null;
      setRecordingUi(false);
    };
  }

  function startSpeechRecognitionSession(Ctor) {
    const recog = new Ctor();
    state.recognition = recog;
    wireSpeechRecognition(recog, Ctor);
    try {
      recog.start();
    } catch (_) {
      stopAfModalSpeechTranscription();
    }
  }

  function toggleAfModalSpeechTranscription() {
    if (state.listening) {
      stopAfModalSpeechTranscription();
      return;
    }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const T = txt();
    if (!Ctor) {
      try {
        if (typeof window.alertMsgBoxTemp === "function") window.alertMsgBoxTemp(T.unsupported);
        else alert(T.unsupported);
      } catch (_) {}
      return;
    }
    const ta = getBodyTa();
    if (!ta) return;

    (async function () {
      try {
        state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (window.MediaRecorder) {
          state.mediaRecorder = new MediaRecorder(state.mediaStream);
          state.mediaRecorder.start();
        }
      } catch (_) {
        try {
          if (typeof window.alertMsgBoxTemp === "function") window.alertMsgBoxTemp(T.denied);
        } catch (_) {}
        stopRecorderOnly();
        return;
      }

      const ta0 = getBodyTa();
      if (ta0 && document.activeElement === ta0) {
        try {
          state.bodyInsertAnchor = { start: ta0.selectionStart, end: ta0.selectionEnd };
        } catch (_) {}
      }

      state.dynamicRecoLang = null;
      state.restartRecognitionAfterEnd = false;
      startSpeechRecognitionSession(Ctor);
    })();
  }

  function bindBodySelectionTracking() {
    const ta = getBodyTa();
    if (!ta || ta.dataset.zcBodySelBound === "1") return;
    ta.dataset.zcBodySelBound = "1";
    const sync = function () {
      try {
        state.bodyInsertAnchor = { start: ta.selectionStart, end: ta.selectionEnd };
      } catch (_) {}
    };
    ta.addEventListener("keyup", sync);
    ta.addEventListener("mouseup", sync);
    ta.addEventListener("select", sync);
    ta.addEventListener("input", sync);
  }

  function bindAfModalSpeechTranscription() {
    bindBodySelectionTracking();
    const btn = document.getElementById("afModalTitleTranscribeInline");
    if (!btn || btn.dataset.zcSpeechBound === "1") return;
    btn.dataset.zcSpeechBound = "1";
    btn.addEventListener("pointerdown", function () {
      if (state.listening) return;
      const ta = getBodyTa();
      if (!ta) return;
      try {
        state.bodyInsertAnchor = { start: ta.selectionStart, end: ta.selectionEnd };
      } catch (_) {}
    }, true);
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      toggleAfModalSpeechTranscription();
    });
    bindTranscribeLangControls();
    syncAfModalTranscribeTitles();
  }

  window.zcBindAfModalSpeechTranscription = bindAfModalSpeechTranscription;
  window.zcStopAfModalSpeechTranscription = stopAfModalSpeechTranscription;
  window.zcSyncAfModalTranscribeTitles = syncAfModalTranscribeTitles;
  window.zcResetAfModalSpeechRecoFromUi = zcResetAfModalSpeechRecoFromUi;

  try {
    window.addEventListener("uiLangChanged", function () {
      syncAfModalTranscribeTitles();
      syncTranscribeLangButtons();
    });
  } catch (_) {}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAfModalSpeechTranscription, { once: true });
  } else {
    bindAfModalSpeechTranscription();
  }
})();
