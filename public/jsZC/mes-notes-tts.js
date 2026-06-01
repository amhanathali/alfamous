/**
 * Mes Notes — lecture du champ Texte (speechSynthesis) avec surbrillance mot à mot,
 * export MP3 via Cloud Function (Storage).
 */
(function initMesNotesTts() {
  const TTS_MAX_CALL = 4500;

  /** Aligné sur functions/mesNoteTtsPath.js (sanitisation du sujet → nom de fichier). */
  const MP3_BASE_MAX = 80;
  /** Même bucket / zone que Médias (medias1.js) : plus de MesNotesAudio pour le MP3 TTS. */
  const MES_NOTES_TTS_STORAGE_PREFIX = "MesMedias/audio/MesNotesTts";
  /** Fichiers temporaires dictée (STT) — aussi sous MesMedias pour un seul préfixe « bibliothèque ». */
  const MES_NOTES_STT_TEMP_PREFIX = "MesMedias/stt-input";
  /**
   * iOS Safari / WebKit : `accept="audio/*"` masque ou grise les fichiers (ex. Mémos vocaux .m4a).
   * Liste explicite de MIME + extensions ; renforcée à l’init dans bindMesNoteAudioFilePicker.
   */
  const MES_NOTE_AUDIO_FILE_ACCEPT =
    ".m4a,.mp3,.wav,.aac,.caf,.flac,.ogg,.opus,.webm," +
    "audio/mp4,audio/x-m4a,audio/m4a,audio/mpeg,audio/aac,audio/x-aac," +
    "audio/wav,audio/x-wav,audio/webm,audio/ogg,audio/opus,audio/flac," +
    "audio/x-caf,audio/caf";
  function sanitizeMesNoteMp3BaseName(subject) {
    let s = String(subject || "").trim();
    if (!s) return "";
    s = s
      .replace(/[\u0000-\u001f\u007f\\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (s.length > MP3_BASE_MAX) {
      s = s.slice(0, MP3_BASE_MAX).replace(/_+$/g, "");
    }
    return s || "sans-titre";
  }
  function mesNoteMp3StoragePath(uid, subject) {
    const base = sanitizeMesNoteMp3BaseName(subject);
    const u = String(uid || "").trim();
    return MES_NOTES_TTS_STORAGE_PREFIX + "/" + u + "/" + base + ".mp3";
  }

  /** Référence overlay lecture plein écran (surbrillance). */
  let readOverlayRoot = null;
  let readEscBound = false;
  let readUnderlayLireBound = false;
  let readOverlayKeepTopTimer = null;
  let readOverlayCallerEl = null;
  let readOverlayBoundaryLiftAt = 0;
  let readOverlayPaused = false;

  function getLc() {
    const raw = (
      typeof window.getUILang === "function"
        ? String(window.getUILang() || "fr")
        : "fr"
    ).toLowerCase().trim();
    if (raw.startsWith("kab")) return "kab";
    return raw.slice(0, 2);
  }

  function langKeyForTts() {
    const lc = getLc();
    if (lc === "ar" || lc === "en" || lc === "es" || lc === "kab") return lc;
    return "fr";
  }

  function speechSynthLangTag() {
    const k = langKeyForTts();
    if (k === "ar") return "ar-SA";
    if (k === "en") return "en-US";
    if (k === "es") return "es-ES";
    if (k === "kab") return "fr-FR";
    return "fr-FR";
  }

  const TXT = {
    fr: {
      listen: "Lire le texte",
      listenTitle: "Lis (Voix IA & Lecture)",
      mp3: "MP3",
      /** Infobulle + libellé Actions (court). */
      mp3TitleShort: "MP3 — synthèse sur Firebase ou transcription audio",
      listenHelpHeading: "Lecture du texte",
      listenHelpHtml:
        "<p>Le bouton <strong>Lire</strong> utilise la <strong>synthèse vocale du navigateur</strong> pour lire à voix haute le contenu du champ <em>Texte</em>. Aucun enregistrement n’est envoyé sur le serveur pour cette lecture.</p>",
      mp3HelpHeading: "MP3, Firebase et transcription",
      mp3HelpHtml:
        "<p>Le bouton <strong>MP3</strong> sert à deux usages selon le contexte :</p>" +
        "<ul style=\"margin:.35rem 0 .45rem 1.1rem;padding:0;\">" +
        "<li><strong>Synthèse</strong> : le texte du champ <em>Texte</em> est converti en fichier <strong>MP3</strong> stocké sur <strong>Firebase</strong>. Le nom du fichier repose sur le <em>Sujet</em>. Une facturation Google peut s’appliquer si le texte a changé depuis la dernière génération.</li>" +
        "<li><strong>Transcription</strong> (Speech-to-Text) : si le <em>Sujet</em> contient un lien <code>https://</code> vers un fichier audio accessible, le <strong>même</strong> bouton peut envoyer ce média au serveur pour remplir (ou compléter) le champ <em>Texte</em> avec le texte reconnu.</li>" +
        "</ul>" +
        "<p>Sur la ligne <em>Texte</em>, le bouton <strong>📂</strong> permet aussi de choisir un fichier audio <strong>sur l’appareil</strong> pour une transcription vers le champ <em>Texte</em>.</p>",
      needLogin: "Connectez-vous pour enregistrer l’audio.",
      empty: "Aucun texte à lire.",
      genOk: "Audio enregistré sur Firebase.",
      genFail: "Échec de la synthèse ou de l’upload.",
      mp3NeedSubject:
        "Indiquez un sujet (titre de la note) pour nommer le fichier MP3.",
      mp3Checking: "Vérification (sans synthèse vocale)…",
      mp3Confirm:
        "Générer ou mettre à jour le MP3 pour le sujet « {0} » ? (facturation Google si le texte a changé.)",
      mp3Unchanged:
        "Texte inchangé : le MP3 sur Firebase est déjà à jour (aucune synthèse).",
      sttChecking: "Lien détecté dans le sujet : transcription en cours…",
      sttDone: "Transcription terminée et ajoutée au champ Texte.",
      sttNoResult: "Aucun texte détecté dans le média.",
      sttFail: "Échec de transcription du lien média.",
      sttFilePickTitle:
        "Choisir un fichier audio sur l’appareil (transcription dans le champ Texte).",
      sttFileUploading: "Envoi du fichier vers Firebase…",
      sttFileTooBig: "Fichier trop volumineux (max 25 Mo).",
      sttFileBadType: "Format non pris en charge (audio : mp3, wav, flac, ogg, webm, m4a…).",
      sttFileReasonSubjectExists: "ce sujet existe déjà dans vos notes forum",
      sttFileReasonBodyNotEmpty: "le champ Texte n’est pas vide",
      sttFileConfirmOverwrite:
        "Le sujet « {0} » est déjà utilisé ou le texte actuel n’est pas vide ({1}). Continuer et remplacer le contenu via transcription ?",
      sttSaveToMediasConfirm:
        "Enregistrer ce fichier audio dans la bibliothèque Médias (Firebase Storage + liste), comme « Ajouter fichier » ?",
      sttSaveToMediasDesc: "Mes Notes — fichier audio source après transcription",
      readClose: "Fermer",
      readPause: "Pause",
      readResume: "Continuer",
      readHint: "Surbrillance pendant la lecture (mot à mot si le navigateur le permet).",
    },
    en: {
      listen: "Read aloud",
      listenTitle: "Read text aloud (browser)",
      mp3: "MP3",
      mp3TitleShort: "MP3 — Firebase synthesis or audio transcription",
      listenHelpHeading: "Read aloud",
      listenHelpHtml:
        "<p>The <strong>Read</strong> button uses your browser’s <strong>speech synthesis</strong> to read the <em>Text</em> field aloud. Nothing is uploaded to the server for this playback.</p>",
      mp3HelpHeading: "MP3, Firebase, and transcription",
      mp3HelpHtml:
        "<p>The <strong>MP3</strong> button covers two different cases:</p>" +
        "<ul style=\"margin:.35rem 0 .45rem 1.1rem;padding:0;\">" +
        "<li><strong>Synthesis</strong>: the <em>Text</em> field is turned into an <strong>MP3</strong> file stored on <strong>Firebase</strong>, named from the <em>Subject</em>. Google may charge if the text changed since the last run.</li>" +
        "<li><strong>Transcription</strong> (Speech-to-Text): if the <em>Subject</em> contains an <code>https://</code> link to a reachable audio file, the <strong>same</strong> button can send that media to the server to fill (or append to) the <em>Text</em> field with the transcript.</li>" +
        "</ul>" +
        "<p>On the <em>Text</em> row, the <strong>📂</strong> button also lets you pick a <strong>local</strong> audio file for transcription into <em>Text</em>.</p>",
      needLogin: "Sign in to save audio.",
      empty: "No text to read.",
      genOk: "Audio saved to Firebase.",
      genFail: "Synthesis or upload failed.",
      mp3NeedSubject: "Enter a note title so the MP3 file can be named.",
      mp3Checking: "Checking (no speech synthesis yet)…",
      mp3Confirm:
        "Generate or update the MP3 for subject “{0}”? (Google charges if the text changed.)",
      mp3Unchanged:
        "Text unchanged: the Firebase MP3 is already up to date (no synthesis).",
      sttChecking: "Link detected in subject: transcribing…",
      sttDone: "Transcription finished and inserted into Text.",
      sttNoResult: "No transcript detected in this media.",
      sttFail: "Media-link transcription failed.",
      sttFilePickTitle:
        "Pick an audio file on this device (transcription into the Text field).",
      sttFileUploading: "Uploading file to Firebase…",
      sttFileTooBig: "File too large (max 25 MB).",
      sttFileBadType: "Unsupported format (use audio: mp3, wav, flac, ogg, webm, m4a…).",
      sttFileReasonSubjectExists: "this subject already exists in your forum notes",
      sttFileReasonBodyNotEmpty: "the Text field is not empty",
      sttFileConfirmOverwrite:
        "Subject “{0}” is already used or the current text is not empty ({1}). Continue and replace content using transcription?",
      sttSaveToMediasConfirm:
        "Save this audio file to the Media library (Firebase Storage + list), like “Add file”?",
      sttSaveToMediasDesc: "My Notes — source audio file after transcription",
      readClose: "Close",
      readPause: "Pause",
      readResume: "Resume",
      readHint: "Highlighting while reading (word-by-word when supported).",
    },
    ar: {
      listen: "استمع",
      listenTitle: "قراءة النص بصوت عالٍ",
      mp3: "MP3",
      mp3TitleShort: "MP3 — تركيب على Firebase أو تفريغ صوتي",
      listenHelpHeading: "قراءة النص",
      listenHelpHtml:
        "<p>زر <strong>استمع</strong> يستخدم <strong>تركيب الصوت في المتصفح</strong> لقراءة حقل <em>النص</em> بصوت عالٍ. لا يُرفع أي ملف للخادم لهذه القراءة.</p>",
      mp3HelpHeading: "MP3 وFirebase والتفريغ النصي",
      mp3HelpHtml:
        "<p>زر <strong>MP3</strong> يغطي حالتين:</p>" +
        "<ul style=\"margin:.35rem 0 .45rem 1.1rem;padding:0;\">" +
        "<li><strong>التركيب</strong>: يُحوَّل نص حقل <em>النص</em> إلى ملف <strong>MP3</strong> على <strong>Firebase</strong> باسم يعتمد على <em>العنوان</em>. قد تُحتسب تكلفة Google إذا تغيّر النص.</li>" +
        "<li><strong>التفريغ النصي</strong>: إن احتوى <em>العنوان</em> على رابط <code>https://</code> لملف صوتي يمكن الوصول إليه، فنفس الزر قد يرسل الوسيط إلى الخادم لملء (أو إضافة) حقل <em>النص</em> بالنص المستخرج.</li>" +
        "</ul>" +
        "<p>في سطر <em>النص</em>، زر <strong>📂</strong> يتيح أيضاً اختيار ملف صوتي <strong>من الجهاز</strong> للتفريغ إلى حقل <em>النص</em>.</p>",
      needLogin: "سجّل الدخول لحفظ الصوت.",
      empty: "لا نص للقراءة.",
      genOk: "تم حفظ الصوت.",
      genFail: "فشل الإنشاء أو الرفع.",
      mp3NeedSubject: "أدخل عنوان الملاحظة لتسمية ملف MP3.",
      mp3Checking: "جارٍ التحقق (دون تركيب صوتي)…",
      mp3Confirm:
        "إنشاء MP3 أو تحديثه للعنوان « {0} »؟ (قد تُحتسب تكلفة Google إذا تغيّر النص.)",
      mp3Unchanged: "النص لم يتغيّر: ملف MP3 على Firebase محدّث (لا تركيب صوتي).",
      sttChecking: "تم اكتشاف رابط في العنوان: جارٍ التفريغ النصي…",
      sttDone: "اكتمل التفريغ النصي وتمت إضافته إلى حقل النص.",
      sttNoResult: "لم يتم العثور على نص في هذا الوسيط.",
      sttFail: "فشل تفريغ الرابط الصوتي.",
      sttFilePickTitle: "اختر ملفاً صوتياً من الجهاز (التفريغ في حقل النص).",
      sttFileUploading: "جارٍ رفع الملف إلى Firebase…",
      sttFileTooBig: "الملف كبير جداً (حد أقصى 25 ميغابايت).",
      sttFileBadType: "صيغة غير مدعومة (صوت: mp3، wav، flac، ogg، webm، m4a…).",
      sttFileReasonSubjectExists: "هذا العنوان موجود مسبقاً في ملاحظات المنتدى",
      sttFileReasonBodyNotEmpty: "حقل النص غير فارغ",
      sttFileConfirmOverwrite:
        "العنوان « {0} » مستخدم مسبقاً أو النص الحالي غير فارغ ({1}). المتابعة واستبدال المحتوى عبر التفريغ؟",
      sttSaveToMediasConfirm:
        "هل تريد حفظ هذا الملف الصوتي في مكتبة الوسائط (التخزين + القائمة) كما في « إضافة ملف »؟",
      sttSaveToMediasDesc: "مذكراتي — ملف الصوت المستخدم بعد التفريغ",
      readClose: "إغلاق",
      readPause: "إيقاف مؤقت",
      readResume: "متابعة",
      readHint: "تمييز أثناء القراءة (كلمة بكلمة إن أمكن).",
    },
    es: {
      listen: "Leer",
      listenTitle: "Leer el texto en voz alta",
      mp3: "MP3",
      mp3TitleShort: "MP3 — síntesis en Firebase o transcripción de audio",
      listenHelpHeading: "Lectura del texto",
      listenHelpHtml:
        "<p>El botón <strong>Leer</strong> usa la <strong>síntesis de voz del navegador</strong> para leer en voz alta el campo <em>Texto</em>. No se sube ningún archivo al servidor para esta lectura.</p>",
      mp3HelpHeading: "MP3, Firebase y transcripción",
      mp3HelpHtml:
        "<p>El botón <strong>MP3</strong> cubre dos casos:</p>" +
        "<ul style=\"margin:.35rem 0 .45rem 1.1rem;padding:0;\">" +
        "<li><strong>Síntesis</strong>: el <em>Texto</em> se convierte en un archivo <strong>MP3</strong> en <strong>Firebase</strong>, nombrado según el <em>Asunto</em>. Google puede cobrar si el texto cambió.</li>" +
        "<li><strong>Transcripción</strong>: si el <em>Asunto</em> contiene un enlace <code>https://</code> a un audio accesible, el <strong>mismo</strong> botón puede enviar ese medio al servidor para rellenar (o ampliar) el <em>Texto</em> con la transcripción.</li>" +
        "</ul>" +
        "<p>En la fila <em>Texto</em>, el botón <strong>📂</strong> también permite elegir un audio <strong>local</strong> para transcribir al <em>Texto</em>.</p>",
      needLogin: "Inicia sesión para guardar el audio.",
      empty: "Sin texto para leer.",
      genOk: "Audio guardado en Firebase.",
      genFail: "Fallo al generar o subir.",
      mp3NeedSubject: "Indica un título de nota para nombrar el MP3.",
      mp3Checking: "Comprobando (aún sin síntesis)…",
      mp3Confirm:
        "¿Generar o actualizar el MP3 para el asunto « {0} »? (Google cobra si el texto cambió.)",
      mp3Unchanged:
        "Texto sin cambios: el MP3 en Firebase ya está al día (sin síntesis).",
      sttChecking: "Enlace detectado en el asunto: transcribiendo…",
      sttDone: "Transcripción terminada e insertada en Texto.",
      sttNoResult: "No se detectó texto en este medio.",
      sttFail: "Falló la transcripción del enlace multimedia.",
      sttFilePickTitle:
        "Elegir un archivo de audio en el dispositivo (transcripción en Texto).",
      sttFileUploading: "Subiendo archivo a Firebase…",
      sttFileTooBig: "Archivo demasiado grande (máx. 25 MB).",
      sttFileBadType: "Formato no admitido (audio: mp3, wav, flac, ogg, webm, m4a…).",
      sttFileReasonSubjectExists: "este asunto ya existe en tus notas del foro",
      sttFileReasonBodyNotEmpty: "el campo Texto no está vacío",
      sttFileConfirmOverwrite:
        "El asunto « {0} » ya existe o el texto actual no está vacío ({1}). ¿Continuar y reemplazar el contenido con la transcripción?",
      sttSaveToMediasConfirm:
        "¿Guardar este archivo de audio en la biblioteca de Medios (Storage + lista), como « Añadir archivo »?",
      sttSaveToMediasDesc: "Mis notas — audio de origen tras la transcripción",
      readClose: "Cerrar",
      readPause: "Pausa",
      readResume: "Continuar",
      readHint: "Resaltado durante la lectura (palabra a palabra si el navegador lo permite).",
    },
  };

  function tstrings() {
    const lc = getLc();
    return TXT[lc] || TXT.fr;
  }

  function getBodyText() {
    const ta = document.getElementById("afModalBody");
    return ta ? String(ta.value || "").trim() : "";
  }

  function getSubjectText() {
    const ti = document.getElementById("afModalTitleIn");
    return ti ? String(ti.value || "").trim() : "";
  }

  function firstHttpUrlInText(text) {
    const s = String(text || "");
    const m = s.match(/https?:\/\/[^\s<>"']+/i);
    return m && m[0] ? String(m[0]).trim() : "";
  }

  async function confirmMp3Async(message) {
    try {
      if (typeof window.alertConfirm === "function") {
        return !!(await window.alertConfirm(message));
      }
      if (typeof alertConfirm === "function") {
        return !!(await alertConfirm(message));
      }
    } catch (_) {}
    try {
      return window.confirm(message);
    } catch (_) {
      return false;
    }
  }

  function toast(msg, color) {
    const m = String(msg || "").trim();
    if (!m) return;
    try {
      if (typeof window.alertMsgBoxTemp === "function") {
        window.alertMsgBoxTemp(m, color || "gray", 3200);
      }
    } catch (_) {}
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Message modal (fermeture manuelle) — pour copier/coller les erreurs MP3, etc. */
  function popupPlainMessage(msg) {
    const m = String(msg || "").trim();
    if (!m) return;
    const html =
      '<p class="zc-mesnotes-dialog-msg" style="margin:0;white-space:pre-wrap;word-break:break-word;text-align:left;">' +
      escHtml(m).replace(/\n/g, "<br>") +
      "</p>";
    try {
      if (typeof window.alertMsgBoxPopup === "function") {
        window.alertMsgBoxPopup(html);
        return;
      }
    } catch (_) {}
    try {
      window.alert(m);
    } catch (_) {}
  }

  /** Même nettoyage que lireTexte (Zoom-Coran) pour garder les indices alignés. */
  function cleanTextForSpeak(raw) {
    if (typeof nettoyerCommentairePourChampTexte === "function") {
      return nettoyerCommentairePourChampTexte(String(raw || ""));
    }
    return String(raw || "");
  }

  function injectReadAloudStyles() {
    const legacySt = document.getElementById("zc-mesnotes-read-styles");
    if (legacySt && legacySt.parentNode) {
      try {
        legacySt.parentNode.removeChild(legacySt);
      } catch (_) {}
    }
    if (document.getElementById("zc-mesnotes-read-styles-v2")) return;
    const st = document.createElement("style");
    st.id = "zc-mesnotes-read-styles-v2";
    st.textContent =
      "#zcMesNotesReadOverlay.zc-mesnotes-read-overlay{" +
      "border:none;background:transparent;padding:.35rem .5rem;box-sizing:border-box;" +
      "max-width:none;width:100vw;height:100vh;}" +
      "#zcMesNotesReadOverlay.zc-mesnotes-read-overlay.zc-read-fallback{" +
      "display:flex!important;position:fixed;inset:0;" +
      "pointer-events:none;" +
      "background:rgba(15,23,42,.45);align-items:stretch;justify-content:center;" +
      "opacity:1;visibility:visible}" +
      "#zcMesNotesReadOverlay.zc-read-fallback .af-modal-panel.popup-box.zc-mesnotes-read-dialog{" +
      "pointer-events:auto;animation:zcMnReadIn .18s ease-out}" +
      "@keyframes zcMnReadIn{from{opacity:0}to{opacity:1}}" +
      "#zcMesNotesReadOverlay .af-modal-panel.popup-box.zc-comment-popup-box.zc-mesnotes-read-dialog{" +
      "background:var(--zc-surface,#f8fbfd);color:var(--zc-text,#0f172a);" +
      "border-radius:12px;width:calc(100vw - 12px);max-width:none;align-self:center;" +
      "height:calc(100dvh - 12px);max-height:none;min-height:calc(100dvh - 12px);" +
      "display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.2);" +
      "overflow:hidden;box-sizing:border-box;border:1px solid var(--zc-border,rgba(0,0,0,.08))}" +
      "#zcMesNotesReadOverlay .zc-mesnotes-read-grow{" +
      "flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden;" +
      "padding:0 14px 14px}" +
      "#zcMesNotesReadOverlay .zc-mesnotes-read-body{" +
      "flex:1 1 auto;min-height:120px;overflow:auto;margin:0;" +
      "padding:10px 6px 12px 4px;font-size:clamp(15px,1.05vw + 13px,19px);" +
      "line-height:1.65;white-space:pre-wrap;word-break:break-word;" +
      "color:var(--zc-text,#0f172a)}" +
      "#zcMesNotesReadOverlay .zc-mesnotes-read-w{" +
      "border-radius:3px;padding:0 1px;transition:background .12s,color .12s;" +
      "color:var(--zc-text,#0f172a)}" +
      "#zcMesNotesReadOverlay .zc-mesnotes-read-w.is-active{" +
      "background:var(--zc-hit-bg,#fff2a8);color:var(--zc-text,#0f172a);" +
      "box-shadow:0 0 0 1px rgba(234,179,8,.35)}";
    document.head.appendChild(st);
  }

  function computeDynamicTopZ() {
    try {
      if (typeof window.getNextZIndex === "function") {
        const z = Number(window.getNextZIndex());
        if (Number.isFinite(z)) return z;
      }
    } catch (_) {}
    const step =
      typeof window.STEP === "number" && window.STEP > 0 ? window.STEP : 1;
    let maxZ = 0;
    try {
      const nodes = document.body ? document.body.querySelectorAll("*") : [];
      for (let i = 0; i < nodes.length; i++) {
        const z = Number(window.getComputedStyle(nodes[i]).zIndex);
        if (Number.isFinite(z) && z > maxZ) maxZ = z;
      }
    } catch (_) {}
    return maxZ + step;
  }

  function stopReadOverlayKeepTop() {
    if (!readOverlayKeepTopTimer) return;
    try {
      clearInterval(readOverlayKeepTopTimer);
    } catch (_) {}
    readOverlayKeepTopTimer = null;
  }

  /** Appelant réellement visible (évite Z3 masqué alors que Z1 est ouvert). */
  function resolveReadCallerElForLift(explicitCaller) {
    const tryEl = (el) => {
      if (!el || !el.isConnected) return null;
      try {
        const st = window.getComputedStyle(el);
        if (st.display === "none" || st.visibility === "hidden") return null;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return null;
        return el;
      } catch (_) {
        return null;
      }
    };
    let c = tryEl(explicitCaller);
    if (c) return c;
    if (typeof window.zcPickVisibleReadCallerEl === "function") {
      c = window.zcPickVisibleReadCallerEl();
      if (c) return c;
    }
    return (
      tryEl(document.getElementById("popupHtml")) ||
      tryEl(document.getElementById("popupResultatsZ3")) ||
      tryEl(document.getElementById("popupResultats"))
    );
  }

  /** Une passe z-index (sans toucher au timer d’intervalle). phase = diagnostic ([zc-z] si alfamous_debug_z=1). */
  function liftReadOverlayZ(overlayEl, callerEl, phase) {
    if (!overlayEl || !overlayEl.isConnected) return;
    if (overlayEl !== readOverlayRoot) return;
    const caller = resolveReadCallerElForLift(callerEl);
    /* Court-circuit si l’overlay est déjà au-dessus du reste (hors lui-même). Inclut le z inline en priorité :
     * <dialog> en top layer peut donner un getComputedStyle().zIndex "auto" même avec style.zIndex mis par la pile. */
    try {
      if (typeof window.getMaxZIndexExcluding === "function") {
        const maxEx = Number(window.getMaxZIndexExcluding(overlayEl)) || 0;
        const inlineZ = parseInt(String(overlayEl.style.zIndex || ""), 10);
        if (Number.isFinite(inlineZ) && Number.isFinite(maxEx) && inlineZ > maxEx) {
          return;
        }
        if (typeof window.zIndexEffectiveZ === "function") {
          const ozEff = window.zIndexEffectiveZ(overlayEl);
          if (Number.isFinite(ozEff) && Number.isFinite(maxEx) && ozEff > maxEx) {
            return;
          }
        }
      }
    } catch (_) {}
    /*
     * Toujours remonter le lecteur via zcBringToFront : doit passer au-dessus de tout le monde,
     * y compris #audio-floating-container (souvent > #popupHtml) — placeOverlayAboveCaller(caller)
     * ne suffisait pas quand caller.w z < lecteur audio.
     */
    try {
      if (typeof window.zcBringToFront === "function") {
        window.zcBringToFront(overlayEl, 0);
        return;
      }
    } catch (_) {}
    try {
      if (caller && typeof window.zcZIndexPlaceOverlayAboveCaller === "function") {
        window.zcZIndexPlaceOverlayAboveCaller(caller, overlayEl);
        return;
      }
    } catch (_) {}
    try {
      overlayEl.style.zIndex = String(computeDynamicTopZ());
    } catch (_) {}
  }

  /**
   * Premier rendu (Zoom0–3, Warsh) : l’appelant peut encore monter en z-index après notre lift ;
   * enchaînement explicite double rAF + délais courts puis placement final au-dessus de callerEl.
   */
  function scheduleReadOverlayPostRenderLift(overlayEl, callerEl) {
    if (!overlayEl) return;
    const run = function () {
      if (overlayEl !== readOverlayRoot || !overlayEl.isConnected) return;
      liftReadOverlayZ(overlayEl, callerEl, "postRender");
    };
    try {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          run();
          try {
            setTimeout(run, 120);
          } catch (_) {}
        });
      });
    } catch (_) {}
  }

  function keepReadOverlayOnTop(overlayEl, callerEl) {
    stopReadOverlayKeepTop();
    if (!overlayEl) return;
    const lift = function (phase) {
      liftReadOverlayZ(overlayEl, callerEl, phase || "interval");
    };
    lift("immediate");
    try {
      requestAnimationFrame(function () {
        lift("rAF1");
      });
    } catch (_) {}
    readOverlayKeepTopTimer = setInterval(function () {
      if (!overlayEl || !overlayEl.isConnected) {
        stopReadOverlayKeepTop();
        return;
      }
      lift("interval1200");
    }, 1200);
  }

  /** Début de chaque « mot » (segment \\S+) pour boundary.charIndex → index mot. */
  function buildWordStarts(text) {
    const starts = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text)) !== null) starts.push(m.index);
    return starts;
  }

  function wordIndexFromChar(charIndex, wordStarts) {
    if (!wordStarts.length) return 0;
    let lo = 0;
    let hi = wordStarts.length - 1;
    let ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (wordStarts[mid] <= charIndex) {
        ans = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return ans;
  }

  /** HTML : espaces conservés (pre-wrap), mots dans des spans numérotés. */
  function buildReadOverlayInnerHtml(text) {
    const re = /(\s+|\S+)/g;
    let m;
    let html = "";
    let wi = 0;
    while ((m = re.exec(text)) !== null) {
      const chunk = m[0];
      if (/^\s+$/.test(chunk)) {
        html += escHtml(chunk);
      } else {
        html += '<span class="zc-mesnotes-read-w" data-wi="' + wi + '">' + escHtml(chunk) + "</span>";
        wi++;
      }
    }
    return html;
  }

  function pickVoiceForRead(langTag) {
    if (typeof window.pickVoiceForLireTexte === "function") {
      try {
        return window.pickVoiceForLireTexte(langTag);
      } catch (_) {}
    }
    const voices = window.speechSynthesis.getVoices() || [];
    const base = String(langTag || "").split("-")[0];
    for (let i = 0; i < voices.length; i++) {
      if (voices[i].lang === langTag) return voices[i];
    }
    for (let j = 0; j < voices.length; j++) {
      if (voices[j].lang && voices[j].lang.indexOf(base) === 0) return voices[j];
    }
    return null;
  }

  function bindReadEscOnce() {
    if (readEscBound) return;
    readEscBound = true;
    document.addEventListener(
      "keydown",
      function (ev) {
        if (ev.key !== "Escape") return;
        if (!readOverlayRoot || !readOverlayRoot.parentNode) return;
        ev.preventDefault();
        stopAfModalListenPlayback();
      },
      true
    );
  }

  /**
   * Second clic sur un lien « lireTexte » sous le lecteur : le panneau couvre l’icône,
   * donc le hit-test ne voit pas le <a>. On neutralise temporairement pointer-events sur
   * l’overlay pour lire l’élément réellement sous le curseur.
   */
  function bindReadUnderlayLireStopOnce() {
    if (readUnderlayLireBound) return;
    readUnderlayLireBound = true;
    document.addEventListener(
      "click",
      function (ev) {
        const ov = document.getElementById("zcMesNotesReadOverlay");
        if (!ov || !ov.isConnected) return;
        const closeBtn = ov.querySelector("#zcMesNotesReadClose");
        const ctxBtn = ov.querySelector("#zcMesNotesReadCtx");
        try {
          if (closeBtn && (ev.target === closeBtn || closeBtn.contains(ev.target))) return;
          if (ctxBtn && (ev.target === ctxBtn || ctxBtn.contains(ev.target))) return;
        } catch (_) {}

        const panel = ov.querySelector(".zc-mesnotes-read-dialog");
        const prevOvPe = ov.style.pointerEvents;
        const prevPanelPe = panel ? panel.style.pointerEvents : "";
        let below = null;
        try {
          ov.style.pointerEvents = "none";
          if (panel) panel.style.pointerEvents = "none";
          below = document.elementFromPoint(ev.clientX, ev.clientY);
        } catch (_) {
          below = null;
        } finally {
          try {
            ov.style.pointerEvents = prevOvPe || "";
            if (panel) panel.style.pointerEvents = prevPanelPe || "";
          } catch (_) {}
        }
        if (!below) return;
        const link =
          below.closest &&
          (below.closest("a[onclick*='lireTexte']") ||
            below.closest("button[onclick*='lireTexte']"));
        if (!link) return;
        const oc = link.getAttribute("onclick") || "";
        if (oc.indexOf("lireTexte") === -1) return;
        try {
          if (
            !link.closest(".popup-container") &&
            !link.closest("#popupHtml") &&
            !link.closest("#afModalOverlay")
          ) {
            return;
          }
        } catch (_) {}
        ev.preventDefault();
        ev.stopPropagation();
        try {
          ev.stopImmediatePropagation();
        } catch (_) {}
        try {
          if (typeof window.zcStopLireTexte === "function") {
            window.zcStopLireTexte();
          } else {
            stopAfModalListenPlayback();
          }
        } catch (_) {}
      },
      true
    );
  }

  function closeReadAloudOverlay() {
    if (!readOverlayRoot) return;
    stopReadOverlayKeepTop();
    try {
      if (
        readOverlayRoot.tagName === "DIALOG" &&
        typeof readOverlayRoot.close === "function" &&
        readOverlayRoot.open
      ) {
        readOverlayRoot.close();
      }
    } catch (_) {}
    try {
      readOverlayRoot.remove();
    } catch (_) {}
    readOverlayRoot = null;
    readOverlayCallerEl = null;
    readOverlayBoundaryLiftAt = 0;
    readOverlayPaused = false;
    try {
      document.body.style.overflow = "";
    } catch (_) {}
    try {
      if (typeof window.zcSyncSessionStackFromDom === "function") {
        window.zcSyncSessionStackFromDom();
      }
    } catch (_) {}
  }

  function setWordHighlight(container, wiActive) {
    if (!container) return;
    const spans = container.querySelectorAll(".zc-mesnotes-read-w[data-wi]");
    for (let i = 0; i < spans.length; i++) {
      const sp = spans[i];
      const wi = Number(sp.getAttribute("data-wi"));
      const on = wi === wiActive;
      sp.classList.toggle("is-active", on);
      if (on) {
        try {
          sp.scrollIntoView({ block: "nearest", behavior: "smooth" });
        } catch (_) {
          try {
            sp.scrollIntoView(false);
          } catch (_) {}
        }
      }
    }
  }

  function clearWordHighlight(container) {
    if (!container) return;
    container.querySelectorAll(".zc-mesnotes-read-w.is-active").forEach(function (el) {
      el.classList.remove("is-active");
    });
  }

  function maybeLiftReadOverlayOnBoundary() {
    const overlayEl = readOverlayRoot;
    if (!overlayEl || !overlayEl.isConnected) return;
    const now = Date.now();
    // Throttle strict : évite de pousser la pile z-index à chaque mot.
    if (now - readOverlayBoundaryLiftAt < 380) return;
    readOverlayBoundaryLiftAt = now;
    try {
      liftReadOverlayZ(overlayEl, readOverlayCallerEl, "boundary-throttled");
    } catch (_) {}
  }

  function setReadPauseButtonState(btn, T) {
    if (!btn) return;
    const paused = !!readOverlayPaused;
    const label = paused ? T.readResume : T.readPause;
    btn.setAttribute("title", label);
    btn.setAttribute("aria-label", label);
    btn.textContent = paused ? "▶" : "⏸";
  }

  /**
   * Lance la synthèse avec événements boundary (Chrome/Edge : mot à mot ; autres : audio sans surbrillance détaillée).
   */
  function speakWithHighlight(fullText, wordStarts, bodyEl, opts) {
    opts = opts || {};
    const langTag = String(opts.langTag || speechSynthLangTag());
    const rate = Number(opts.rate);

    function runSpeak() {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
      readOverlayPaused = false;
      try {
        setReadPauseButtonState(
          readOverlayRoot ? readOverlayRoot.querySelector("#zcMesNotesReadPause") : null,
          tstrings()
        );
      } catch (_) {}

      const u = new SpeechSynthesisUtterance(fullText);
      u.lang = langTag;
      u.rate = Number.isFinite(rate) && rate > 0 ? rate : 1;
      const voice = pickVoiceForRead(langTag);
      if (voice) u.voice = voice;

      u.onboundary = function (ev) {
        if (ev.charIndex == null || Number.isNaN(Number(ev.charIndex))) return;
        const wi = wordIndexFromChar(Number(ev.charIndex), wordStarts);
        setWordHighlight(bodyEl, wi);
        maybeLiftReadOverlayOnBoundary();
      };

      u.onend = function () {
        readOverlayPaused = false;
        if (wordStarts.length > 0) setWordHighlight(bodyEl, wordStarts.length - 1);
        window.setTimeout(function () {
          clearWordHighlight(bodyEl);
          closeReadAloudOverlay();
          if (typeof opts.onDone === "function") opts.onDone();
        }, 520);
      };

      u.onerror = function () {
        readOverlayPaused = false;
        closeReadAloudOverlay();
        if (typeof opts.onDone === "function") opts.onDone();
      };

      try {
        window.speechSynthesis.speak(u);
      } catch (_) {
        closeReadAloudOverlay();
      }
    }

    void window.speechSynthesis.getVoices();
    if ((window.speechSynthesis.getVoices() || []).length === 0) {
      window.speechSynthesis.onvoiceschanged = function () {
        try {
          window.speechSynthesis.onvoiceschanged = null;
        } catch (_) {}
        runSpeak();
      };
    }
    runSpeak();
  }

  function openReadAloudFullscreenDisplayThenSpeak(displayText, speakText, wordStarts, opts) {
    opts = opts || {};
    injectReadAloudStyles();
    bindReadEscOnce();
    bindReadUnderlayLireStopOnce();
    closeReadAloudOverlay();

    const T = tstrings();
    readOverlayCallerEl = opts && opts.callerEl ? opts.callerEl : null;
    readOverlayBoundaryLiftAt = 0;
    /* <div> : évite dialog:not([open]) / top-layer UA qui masquent malgré z-index inline correct. */
    const wrap = document.createElement("div");
    wrap.id = "zcMesNotesReadOverlay";
    wrap.className = "af-modal-overlay zc-mesnotes-read-overlay";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "zcMesNotesReadTitle");
    wrap.innerHTML =
      '<div class="af-modal-panel popup-box zc-comment-popup-box zc-mesnotes-read-dialog" onclick="event.stopPropagation();">' +
      '<div class="zc-comment-popup-header af-modal-head">' +
      '<button type="button" id="zcMesNotesReadPause" class="zc-comment-popup-iconbtn" title="" aria-label="">' +
      '<span aria-hidden="true">⏸</span>' +
      "</button>" +
      '<h3 id="zcMesNotesReadTitle" class="zc-comment-popup-title af-modal-title"></h3>' +
      '<button type="button" id="zcMesNotesReadClose" class="zc-comment-popup-iconbtn" title="" aria-label="">' +
      '<span aria-hidden="true">×</span>' +
      "</button>" +
      "</div>" +
      '<div class="zc-comment-popup-body-grow af-modal-body-grow zc-mesnotes-read-grow">' +
      '<div id="zcMesNotesReadBody" class="zc-mesnotes-read-body" dir="auto"></div>' +
      "</div>" +
      "</div>";

    const titleEl = wrap.querySelector("#zcMesNotesReadTitle");
    const pauseBtn = wrap.querySelector("#zcMesNotesReadPause");
    const btn = wrap.querySelector("#zcMesNotesReadClose");
    const body = wrap.querySelector("#zcMesNotesReadBody");
    if (titleEl) titleEl.textContent = String(opts.title || "Lis (Voix IA & Lecture)");
    if (pauseBtn) {
      readOverlayPaused = false;
      setReadPauseButtonState(pauseBtn, T);
      pauseBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (!window.speechSynthesis) return;
          if (readOverlayPaused) {
            window.speechSynthesis.resume();
            readOverlayPaused = false;
          } else {
            window.speechSynthesis.pause();
            readOverlayPaused = true;
          }
          setReadPauseButtonState(pauseBtn, T);
        } catch (_) {}
      });
    }
    if (btn) {
      btn.setAttribute("title", T.readClose);
      btn.setAttribute("aria-label", T.readClose);
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        stopAfModalListenPlayback();
      });
    }

    if (body) body.innerHTML = buildReadOverlayInnerHtml(displayText);

    wrap.addEventListener("click", function (e) {
      if (e.target === wrap) stopAfModalListenPlayback();
    });

    document.body.appendChild(wrap);
    readOverlayRoot = wrap;

    /*
     * Pas de <dialog> showModal() : top-layer native ≠ pile z-index (#popupHtml / Zoom).
     * Empilement = position fixed + zcBringToFront + keepReadOverlayOnTop.
     */
    wrap.classList.add("zc-read-fallback");
    try {
      wrap.style.visibility = "visible";
      wrap.style.opacity = "1";
    } catch (_) {}
    /* 1er frame : forcer le z avant tout paint async (évite « premier clic » derrière audio / popup). */
    try {
      if (typeof window.zcBringToFront === "function") {
        window.zcBringToFront(wrap, 0);
      }
    } catch (_) {}
    keepReadOverlayOnTop(wrap, opts && opts.callerEl ? opts.callerEl : null);
    try {
      document.body.style.overflow = "hidden";
    } catch (_) {}
    try {
      if (btn) btn.focus();
    } catch (_) {}

    speakWithHighlight(speakText, wordStarts, body, opts);
    scheduleReadOverlayPostRenderLift(wrap, opts && opts.callerEl ? opts.callerEl : null);
  }

  /** Arrête la lecture vocale du champ Texte (navigateur). Appelée à la fermeture du modal ou si le texte change. */
  function stopAfModalListenPlayback() {
    closeReadAloudOverlay();
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (_) {}
    try {
      if (typeof window.isSpeechSynthesisPlaying !== "undefined") {
        window.isSpeechSynthesisPlaying = false;
      }
    } catch (_) {}
  }

  window.zcStopAfModalListenPlayback = stopAfModalListenPlayback;

  function speakBodyText() {
    const T = tstrings();
    const raw = getBodyText();
    if (!raw) {
      toast(T.empty, "orange");
      return;
    }
    if (!window.speechSynthesis) {
      toast(T.genFail, "red");
      return;
    }
    const cleaned = cleanTextForSpeak(raw).trim();
    if (!cleaned) {
      toast(T.empty, "orange");
      return;
    }
    try {
      const wordStarts = buildWordStarts(cleaned);
      openReadAloudFullscreenDisplayThenSpeak(cleaned, cleaned, wordStarts);
    } catch (_) {
      toast(T.genFail, "red");
    }
  }

  /**
   * API globale réutilisable : lecture popup + surlignage mot à mot.
   * @param {string} text
   * @param {{langTag?: string, rate?: number, title?: string, onDone?: Function}} [opts]
   */
  window.zcReadTextWithOverlay = function zcReadTextWithOverlay(text, opts) {
    if (!window.speechSynthesis) return false;
    const cleaned = cleanTextForSpeak(String(text || "")).trim();
    if (!cleaned) return false;
    const wordStarts = buildWordStarts(cleaned);
    openReadAloudFullscreenDisplayThenSpeak(cleaned, cleaned, wordStarts, opts || {});
    return true;
  };

  /**
   * Résout l’URL (downloadURL ou getDownloadURL) et ouvre l’audio dans un nouvel onglet.
   * @returns {Promise<boolean>}
   */
  async function openMesNoteMp3FromPayload(payload, toastMsg, toastColor) {
    const storagePath = payload && payload.storagePath;
    let url = payload && payload.downloadURL;
    if (!url && storagePath && typeof firebase !== "undefined" && firebase.storage) {
      try {
        url = await firebase.storage().ref(storagePath).getDownloadURL();
      } catch (refErr) {
        const rm =
          refErr && typeof refErr.message === "string"
            ? refErr.message.trim()
            : String(refErr || "");
        popupPlainMessage(
          rm ||
            "Impossible d’obtenir le lien de téléchargement (Storage)."
        );
        return false;
      }
    }
    if (!url) return false;
    const m = String(toastMsg || "").trim();
    if (m) toast(m, toastColor || "green");
    try {
      window.open(String(url), "_blank", "noopener,noreferrer");
    } catch (_) {}
    try {
      invalidateMesNoteMp3DirListCache();
      if (typeof window.zcScheduleAfModalStoredMp3Check === "function") {
        window.zcScheduleAfModalStoredMp3Check();
      }
    } catch (_) {}
    return true;
  }

  const STT_LOCAL_MAX_BYTES = 25 * 1024 * 1024;

  /** Overlay global (dialog top layer via zc-busy-dialog.js). Chaque start doit avoir son stop ; imbriqué = plusieurs couches. */
  function startBusyProgress(onCancel) {
    try {
      if (typeof window.zcBusyStart === "function") window.zcBusyStart(undefined, onCancel);
    } catch (_) {}
  }
  function stopBusyProgress() {
    try {
      if (typeof window.zcBusyStop === "function") window.zcBusyStop();
    } catch (_) {}
  }

  function sanitizeSttLocalFilename(name) {
    const s = String(name || "audio")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(0, 80);
    return s || "audio.bin";
  }

  function subjectBaseNameFromFilename(name) {
    const raw = String(name || "").trim();
    if (!raw) return "";
    const noPath = raw.split(/[\\/]/).pop() || raw;
    const dot = noPath.lastIndexOf(".");
    const base = dot > 0 ? noPath.slice(0, dot) : noPath;
    const compact = base.replace(/\s+/g, " ").trim();
    return compact.slice(0, 220);
  }

  function setSubjectText(nextSubject) {
    const ti = document.getElementById("afModalTitleIn");
    if (!ti) return;
    ti.value = String(nextSubject || "").trim();
    try {
      ti.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (_) {}
  }

  function fallbackNormalizeSubjectKey(subject) {
    return String(subject || "")
      .toLowerCase()
      .trim()
      .replace(/\+/g, " ")
      .replace(/[’']/g, "'")
      .replace(/\s+/g, " ")
      .replace(/[^a-z0-9\s._'-]/g, "")
      .trim();
  }

  async function doesForumSubjectExistForCurrentUser(subjectNoExt) {
    const s = String(subjectNoExt || "").trim();
    if (!s) return false;
    try {
      if (
        typeof firebase === "undefined" ||
        !firebase.auth ||
        !firebase.auth().currentUser
      ) {
        return false;
      }
      const u = firebase.auth().currentUser;
      const email = String((u && u.email) || "").trim().toLowerCase();
      if (!email || !firebase.firestore) return false;
      const key =
        typeof window.forumNormalizeSubjectKey === "function"
          ? String(window.forumNormalizeSubjectKey(s) || "")
          : fallbackNormalizeSubjectKey(s);
      if (!key) return false;
      if (typeof window.forumFindExistingTopicBySubjectKeyAndAuthor === "function") {
        const match = await window.forumFindExistingTopicBySubjectKeyAndAuthor(
          key,
          email
        );
        return !!(match && match.id);
      }
      const db = firebase.firestore();
      const snap = await db
        .collection("forum")
        .where("emailAuteur", "==", email)
        .where("sujetKey", "==", key)
        .limit(1)
        .get();
      return !!(snap && !snap.empty);
    } catch (_) {
      return false;
    }
  }

  /**
   * Transcription Speech-to-Text depuis une URL accessible par le serveur.
   * @param {string} mediaUrl
   * @returns {Promise<boolean>} true si texte inséré
   */
  async function transcribeMediaUrlToBody(mediaUrl) {
    const T = tstrings();
    const url = String(mediaUrl || "").trim();
    if (!url) return false;
    if (typeof firebase === "undefined" || !firebase.auth || !firebase.auth().currentUser) {
      popupPlainMessage(T.needLogin);
      return false;
    }
    if (!firebase.app || typeof firebase.app().functions !== "function") {
      popupPlainMessage(T.genFail);
      return false;
    }
    const langKey = langKeyForTts();
    let transcribeAborted = false;
    startBusyProgress(function () {
      transcribeAborted = true;
    });
    try {
      toast(T.sttChecking || "", "gray");
      const sttFn = firebase
        .app()
        .functions("europe-west1")
        .httpsCallable("transcribeMesNoteMediaUrl", { timeout: 120000 });
      const sttRes = await sttFn({
        mediaUrl: url,
        langKey,
      });
      if (transcribeAborted) return false;
      const transcript = String(
        sttRes && sttRes.data && sttRes.data.transcript
          ? sttRes.data.transcript
          : ""
      ).trim();
      if (!transcript) {
        popupPlainMessage(T.sttNoResult || T.sttFail || T.genFail);
        return false;
      }
      const ta = document.getElementById("afModalBody");
      if (ta) {
        const prev = String(ta.value || "").trim();
        ta.value = prev ? prev + "\n\n" + transcript : transcript;
        try {
          ta.dispatchEvent(new Event("input", { bubbles: true }));
        } catch (_) {}
      }
      toast(T.sttDone || T.genOk, "green");
      return true;
    } catch (e) {
      let m = T.sttFail || T.genFail;
      const code = e && e.code ? String(e.code) : "";
      const detail =
        e && typeof e.message === "string" ? e.message.trim() : "";
      if (code === "functions/unauthenticated") {
        m = T.needLogin;
      } else if (detail) {
        m = detail;
      }
      popupPlainMessage(m);
      return false;
    } finally {
      stopBusyProgress();
    }
  }

  async function handleLocalAudioFileForStt(file) {
    const T = tstrings();
    if (!file) return;
    if (typeof firebase === "undefined" || !firebase.auth || !firebase.auth().currentUser) {
      popupPlainMessage(T.needLogin);
      return;
    }
    if (!firebase.storage) {
      popupPlainMessage(T.genFail);
      return;
    }
    if (!file.size || file.size > STT_LOCAL_MAX_BYTES) {
      popupPlainMessage(T.sttFileTooBig || T.genFail);
      return;
    }
    const ct = String(file.type || "").toLowerCase();
    const nm = String(file.name || "");
    const extOk = /\.(mp3|wav|flac|ogg|opus|webm|m4a|aac|caf)$/i.test(nm);
    const ctAudio = ct.startsWith("audio/");
    const ctIosBlob =
      ct === "application/octet-stream" ||
      ct === "video/mp4" ||
      ct === "application/mp4";
    if (!ctAudio && !(ctIosBlob && extOk) && !extOk) {
      popupPlainMessage(T.sttFileBadType || T.sttFail);
      return;
    }

    const fb = document.getElementById("afModalMesNoteAudioFileBtn");
    let ref = null;
    if (fb) fb.disabled = true;
    let localSttAborted = false;
    startBusyProgress(function () {
      localSttAborted = true;
    });
    try {
      const subjectNoExt = subjectBaseNameFromFilename(nm);
      const subjectExists = await doesForumSubjectExistForCurrentUser(subjectNoExt);
      if (localSttAborted) return;
      if (subjectExists) {
        setSubjectText(subjectNoExt || nm);
        return;
      }
      const reasons = [];
      if (getBodyText()) {
        reasons.push(T.sttFileReasonBodyNotEmpty || "texte non vide");
      }
      if (reasons.length > 0) {
        const msg = String(T.sttFileConfirmOverwrite || "")
          .replace(/\{0\}/g, subjectNoExt || "audio")
          .replace(/\{1\}/g, reasons.join(" ; "));
        const ok = await confirmMp3Async(msg);
        if (!ok) return;
      }
      if (localSttAborted) return;
      setSubjectText(subjectNoExt || nm);

      toast(T.sttFileUploading || T.sttChecking || "", "gray");
      const u = firebase.auth().currentUser.uid;
      const safe = sanitizeSttLocalFilename(nm);
      const path =
        MES_NOTES_STT_TEMP_PREFIX + "/" + u + "/" + Date.now() + "_" + safe;
      ref = firebase.storage().ref(path);
      await ref.put(file, {
        contentType: file.type || "application/octet-stream",
      });
      if (localSttAborted) return;
      const dlUrl = await ref.getDownloadURL();
      if (localSttAborted) return;
      const transOk = await transcribeMediaUrlToBody(dlUrl);
      if (localSttAborted) return;
      if (transOk) {
        try {
          stopBusyProgress();
        } catch (_) {}
        const Tm = tstrings();
        const qSave = String(Tm.sttSaveToMediasConfirm || "").trim();
        const wantSaveMedias = !!qSave && !!(await confirmMp3Async(qSave));
        if (wantSaveMedias) {
          if (typeof window.zcMesMediasUploadFileLikeAjouter !== "function") {
            popupPlainMessage(Tm.genFail || "");
          } else {
            startBusyProgress(function () {
              localSttAborted = true;
            });
            try {
              if (!localSttAborted) {
                const priv = document.getElementById("afModalPrivate");
                await window.zcMesMediasUploadFileLikeAjouter(file, {
                  isPrivate: !!(priv && priv.checked),
                  description:
                    String(Tm.sttSaveToMediasDesc || "").trim() || undefined,
                });
              }
            } finally {
              stopBusyProgress();
            }
          }
        }
      }
    } catch (e) {
      let m = T.sttFail || T.genFail;
      const detail =
        e && typeof e.message === "string" ? e.message.trim() : "";
      if (detail) m = detail;
      popupPlainMessage(m);
    } finally {
      if (ref) {
        try {
          await ref.delete();
        } catch (_) {}
      }
      if (fb) fb.disabled = false;
      stopBusyProgress();
    }
  }

  function bindMesNoteAudioFilePicker() {
    if (document.body.dataset.zcMesNoteAudioFileBound === "1") return;
    document.body.dataset.zcMesNoteAudioFileBound = "1";
    const fileInp = document.getElementById("afModalMesNoteAudioFileInput");
    if (fileInp) {
      try {
        fileInp.setAttribute("accept", MES_NOTE_AUDIO_FILE_ACCEPT);
      } catch (_) {}
    }
    document.body.addEventListener(
      "click",
      function (ev) {
        const t = ev.target;
        if (t && t.closest && t.closest("#afModalMesNoteAudioFileBtn")) {
          ev.preventDefault();
          const inp = document.getElementById("afModalMesNoteAudioFileInput");
          if (inp) inp.click();
        }
      },
      true
    );
    document.body.addEventListener(
      "change",
      function (ev) {
        const t = ev.target;
        if (!t || t.id !== "afModalMesNoteAudioFileInput") return;
        const f = t.files && t.files[0];
        try {
          t.value = "";
        } catch (_) {}
        if (!f) return;
        void handleLocalAudioFileForStt(f);
      },
      true
    );
  }

  async function synthesizeAndUploadFirebase() {
    const T = tstrings();
    const raw = getBodyText();
    const subjectRaw = getSubjectText();
    if (!subjectRaw) {
      popupPlainMessage(T.mp3NeedSubject || T.empty);
      return;
    }
    const mediaUrl = firstHttpUrlInText(subjectRaw);
    if (!raw && !mediaUrl) {
      popupPlainMessage(T.empty);
      return;
    }
    if (typeof firebase === "undefined" || !firebase.auth || !firebase.auth().currentUser) {
      popupPlainMessage(T.needLogin);
      return;
    }
    if (!mediaUrl && raw.length > TTS_MAX_CALL) {
      const lc = getLc();
      popupPlainMessage(
        lc === "fr"
          ? `Texte trop long pour la synthèse (${TTS_MAX_CALL} caractères max).`
          : lc === "ar"
            ? `النص طويل جداً (حد أقصى ${TTS_MAX_CALL}).`
            : `Text too long for synthesis (max ${TTS_MAX_CALL} characters).`
      );
      return;
    }
    if (!firebase.app || typeof firebase.app().functions !== "function") {
      popupPlainMessage(T.genFail);
      return;
    }

    const fn = firebase
      .app()
      .functions("europe-west1")
      .httpsCallable("synthesizeMesNoteAudio", { timeout: 120000 });

    if (!mediaUrl) {
      toast(T.mp3Checking || "", "gray");
      await new Promise(function (resolve) {
        window.setTimeout(resolve, 220);
      });
    }

    const btn = document.getElementById("afModalBodyTtsFirebase");
    if (btn) btn.disabled = true;
    let synthAborted = false;
    startBusyProgress(function () {
      synthAborted = true;
    });
    try {
      const langKey = langKeyForTts();
      if (mediaUrl) {
        await transcribeMediaUrlToBody(mediaUrl);
        return;
      }

      const textPayload = String(raw).trim().slice(0, TTS_MAX_CALL);
      if (!textPayload.length) {
        popupPlainMessage(T.empty);
        return;
      }
      const probeRes = await fn({
        text: textPayload,
        subject: subjectRaw,
        langKey,
        phase: "probe",
      });
      if (synthAborted) return;
      const probeData = probeRes && probeRes.data;
      if (probeData && probeData.unchanged) {
        const opened = await openMesNoteMp3FromPayload(
          probeData,
          T.mp3Unchanged || T.genOk,
          "gray"
        );
        if (!opened) {
          popupPlainMessage(T.genFail);
        }
        return;
      }

      const confirmMsg = String(T.mp3Confirm || "").replace(/\{0\}/g, subjectRaw);
      const okConfirm = await confirmMp3Async(confirmMsg);
      if (!okConfirm) return;
      if (synthAborted) return;

      const res = await fn({
        text: textPayload,
        subject: subjectRaw,
        langKey,
      });
      if (synthAborted) return;
      const payload = res && res.data;
      if (payload && payload.unchanged) {
        const opened = await openMesNoteMp3FromPayload(
          payload,
          T.mp3Unchanged || T.genOk,
          "gray"
        );
        if (!opened) popupPlainMessage(T.genFail);
        return;
      }
      const opened = await openMesNoteMp3FromPayload(payload, T.genOk, "green");
      if (!opened) popupPlainMessage(T.genFail);
    } catch (e) {
      let m = T.genFail;
      const code = e && e.code ? String(e.code) : "";
      const detail =
        e && typeof e.message === "string" ? e.message.trim() : "";
      if (code === "functions/unauthenticated") {
        m = T.needLogin;
      } else if (detail) {
        m = detail;
      }
      popupPlainMessage(m);
    } finally {
      if (btn) btn.disabled = false;
      stopBusyProgress();
    }
  }

  function syncMesNotesTtsLabels() {
    const T = tstrings();
    const listen = document.getElementById("afModalBodyTtsListen");
    const mp3 = document.getElementById("afModalBodyTtsFirebase");
    const labListen = document.getElementById("afModalBodyTtsListen-label");
    const labMp3 = document.getElementById("afModalBodyTtsFirebase-label");
    if (listen) {
      listen.setAttribute("title", T.listenTitle);
      listen.setAttribute("aria-label", T.listenTitle);
      listen.setAttribute("data-zc-tab-title", T.listenTitle);
    }
    if (labListen) labListen.textContent = T.listenTitle;
    const mp3Short = T.mp3TitleShort || T.mp3 || "MP3";
    if (mp3) {
      mp3.setAttribute("title", mp3Short);
      mp3.setAttribute("aria-label", mp3Short);
      mp3.setAttribute("data-zc-tab-title", mp3Short);
    }
    if (labMp3) labMp3.textContent = mp3Short;
    const fileBtn = document.getElementById("afModalMesNoteAudioFileBtn");
    if (fileBtn) {
      const tit = T.sttFilePickTitle || "";
      fileBtn.setAttribute("title", tit);
      fileBtn.setAttribute("aria-label", tit);
    }
    try {
      const pAct = document.getElementById("zcAfModalActionsPanel");
      if (pAct && typeof window.zcSyncOneModulePanelTabs === "function") {
        window.zcSyncOneModulePanelTabs(pAct);
      }
    } catch (_) {}
  }

  function zcGetMesNotesTtsHelpFragments() {
    const T = tstrings();
    return {
      listenHeading: T.listenHelpHeading || "",
      listenHtml: T.listenHelpHtml || "",
      mp3Heading: T.mp3HelpHeading || "",
      mp3Html: T.mp3HelpHtml || ""
    };
  }
  window.zcGetMesNotesTtsHelpFragments = zcGetMesNotesTtsHelpFragments;

  window.zcSyncMesNotesTtsLabels = syncMesNotesTtsLabels;

  /**
   * Cache court pour lister les .mp3 sous MesMedias/audio/MesNotesTts/{uid}/ sans GET 404 par fichier
   * (getMetadata sur un objet absent logge une erreur réseau dans la console).
   */
  let mesNoteMp3DirListCache = {
    uid: "",
    /** @type {Set<string>|null} */
    lowerBasenames: null,
    at: 0,
  };
  const MES_NOTE_MP3_LIST_TTL_MS = 12000;

  function invalidateMesNoteMp3DirListCache() {
    mesNoteMp3DirListCache = { uid: "", lowerBasenames: null, at: 0 };
  }

  /**
   * Noms de fichiers .mp3 directement sous MesMedias/audio/MesNotesTts/{uid}/.
   */
  async function getMesNoteRootMp3LowerNames(uid) {
    const u = String(uid || "").trim();
    if (!u || typeof firebase === "undefined" || !firebase.storage) {
      return new Set();
    }
    const now = Date.now();
    if (
      mesNoteMp3DirListCache.uid === u &&
      mesNoteMp3DirListCache.lowerBasenames &&
      now - mesNoteMp3DirListCache.at < MES_NOTE_MP3_LIST_TTL_MS
    ) {
      return mesNoteMp3DirListCache.lowerBasenames;
    }
    const lower = new Set();
    try {
      const dirRef = firebase.storage().ref(
        MES_NOTES_TTS_STORAGE_PREFIX + "/" + u
      );
      const res = await dirRef.listAll();
      const items = (res && res.items) || [];
      for (let i = 0; i < items.length; i++) {
        const nm = String(items[i].name || "");
        if (/\.mp3$/i.test(nm)) lower.add(nm.toLowerCase());
      }
    } catch (_) {}
    mesNoteMp3DirListCache = {
      uid: u,
      lowerBasenames: lower,
      at: now,
    };
    return lower;
  }

  window.zcInvalidateMesNoteMp3DirListCache = invalidateMesNoteMp3DirListCache;

  /** Chemin Storage `MesMedias/audio/MesNotesTts/{uid}/{sanitized}.mp3` (même zone que Médias). */
  window.zcMesNoteMp3StoragePathForCurrentUser = function zcMesNoteMp3StoragePathForCurrentUser(
    subject
  ) {
    const s = String(subject || "").trim();
    if (!s || typeof firebase === "undefined" || !firebase.auth) return "";
    const u = firebase.auth().currentUser && firebase.auth().currentUser.uid;
    if (!u) return "";
    return mesNoteMp3StoragePath(u, s);
  };

  /**
   * Indique si un MP3 TTS existe pour ce sujet (dossier MesMedias/audio/MesNotesTts/{uid}/).
   * La transcription STT seule ne crée pas ce fichier : seul le bouton MP3 (synthèse TTS) l’écrit.
   */
  window.zcCheckMesNoteStoredMp3Exists = async function zcCheckMesNoteStoredMp3Exists(
    subject
  ) {
    const s = String(subject || "").trim();
    if (!s || typeof firebase === "undefined" || !firebase.auth) return false;
    const u = firebase.auth().currentUser && firebase.auth().currentUser.uid;
    if (!u || !firebase.storage) return false;
    const want = (sanitizeMesNoteMp3BaseName(s) + ".mp3").toLowerCase();
    const names = await getMesNoteRootMp3LowerNames(u);
    return names.has(want);
  };

  /** Ouvre le MP3 stocké dans un nouvel onglet (même logique que la synthèse). */
  window.zcOpenMesNoteStoredMp3 = async function zcOpenMesNoteStoredMp3(subject) {
    const s = String(subject || "").trim();
    if (!s) return false;
    const path = window.zcMesNoteMp3StoragePathForCurrentUser(s);
    if (!path) {
      const T = tstrings();
      popupPlainMessage(T.needLogin || "");
      return false;
    }
    return openMesNoteMp3FromPayload({ storagePath: path }, "", "green");
  };

  /**
   * Supprime le MP3 Mes Notes pour ce sujet (même chemin que la synthèse).
   * Appelé après suppression confirmée de la note sur le forum.
   * @param {string} subject
   */
  window.zcDeleteMesNoteAudioForSubject = async function zcDeleteMesNoteAudioForSubject(
    subject
  ) {
    const s = String(subject || "").trim();
    if (!s || typeof firebase === "undefined" || !firebase.auth) return;
    const u = firebase.auth().currentUser && firebase.auth().currentUser.uid;
    if (!u || !firebase.storage) return;
    const path = mesNoteMp3StoragePath(u, s);
    const ref = firebase.storage().ref(path);
    try {
      await ref.delete();
      invalidateMesNoteMp3DirListCache();
    } catch (e) {
      const code = e && e.code ? String(e.code) : "";
      const msg = e && e.message ? String(e.message) : "";
      const status = e && e.status_ != null ? String(e.status_) : "";
      if (
        code === "storage/object-not-found" ||
        code === "object-not-found" ||
        status === "404" ||
        /\b404\b/.test(msg) ||
        /object.*(not\s*found|does\s*not\s*exist)/i.test(msg)
      ) {
        invalidateMesNoteMp3DirListCache();
        return;
      }
      throw e;
    }
  };

  function bindDelegation() {
    if (document.body.dataset.zcMesNotesTtsBound === "1") return;
    document.body.dataset.zcMesNotesTtsBound = "1";
    document.body.addEventListener(
      "click",
      function (ev) {
        const t = ev.target;
        if (t && t.closest && t.closest("#afModalBodyTtsListen")) {
          ev.preventDefault();
          speakBodyText();
          return;
        }
        if (t && t.closest && t.closest("#afModalBodyTtsFirebase")) {
          ev.preventDefault();
          void synthesizeAndUploadFirebase();
        }
      },
      true
    );
    try {
      window.addEventListener("uiLangChanged", syncMesNotesTtsLabels);
    } catch (_) {}
  }

  function bindStopListenOnBodyChange() {
    if (document.body.dataset.zcMesNotesTtsBodyInputBound === "1") return;
    document.body.dataset.zcMesNotesTtsBodyInputBound = "1";
    document.addEventListener(
      "input",
      function (ev) {
        const t = ev.target;
        if (!t || t.id !== "afModalBody") return;
        stopAfModalListenPlayback();
      },
      true
    );
  }

  function bootMesNotesTtsUi() {
    bindDelegation();
    bindStopListenOnBodyChange();
    bindMesNoteAudioFilePicker();
    syncMesNotesTtsLabels();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        bootMesNotesTtsUi();
      },
      { once: true }
    );
  } else {
    bootMesNotesTtsUi();
  }
})();
