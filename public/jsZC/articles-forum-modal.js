/**
 * Modale « Articles » : notes / brouillons publiés sur le forum (fils privés par défaut).
 * Dépend de forum.js (forumSubmitNotesFromArticlesModal, forumOpenEditMessageById,
 * forumOpenReadMessageById, etc.) et de window.ouvrirPopupHtml (pageWarshJpg) pour le bouton Forum.
 */
(function () {
  "use strict";

  const COOLDOWN_MS = 20000;
  const LS_LAST = "articlesForumModalLastSentAt";
  const MIN_BODY = 2;
  const AUTHOR_SUBJECTS_TTL_MS = 90 * 1000;

  let authorSubjectsCache = { mail: "", at: 0, subjects: [] };
  let titleSuggestHideTimer = null;
  let titleSuggestLoading = false;
  /** True seulement après choix explicite dans la liste de suggestions (clic ou Entrée). */
  let afOpenEditFromTitleSuggest = false;
  let afEditTargetId = "";
  /** Nombre de réponses du fil résolu (lookup titre ou chargement par id). */
  let afResolvedReplyCount = 0;

  /** Dernière version « sauvegardée » des champs (après ouverture / lookup / envoi réussi). */
  let afModalBaseline = { title: "", body: "", priv: false };
  /** Titre stable avant une frappe qui pourrait effacer le corps (annulation → restauration). */
  let afLastStableTitleForRevert = "";
  /** Évite une double confirmation lors d’un choix dans la liste de sujets (dispatch input). */
  let afSuppressNextTitleInputConfirm = false;

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function displayAuthorAt() {
    const n = String(localStorage.getItem("nameUser") || "").trim() || "Auteur";
    return "@" + n;
  }

  function getAfModalLang() {
    try {
      if (typeof getLang === "function") return String(getLang() || "fr").toLowerCase();
    } catch (_) {}
    return String(localStorage.getItem("uiLang") || "fr").toLowerCase();
  }

  /** Répercute les changements programmatiques sur × / copier (bindSearchClearVisibility écoute `input`). */
  function afDispatchFieldInput(el) {
    if (!el) return;
    try {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (_) {}
  }

  /** Aide Mes Notes : contenu à jour (publication forum + lecture + MP3 / transcription). */
  const AF_MODAL_HELP = {
    fr: {
      title: "Mes Notes — guide d’utilisation",
      lead:
        "Cette fenêtre sert à rédiger une <strong>note</strong> (champs <strong>Sujet</strong> et <strong>Texte</strong>) et à la <strong>publier sur le forum</strong> Alfamous comme <strong>fil de discussion</strong> (nouveau fil ou fil existant).",
      pPub:
        "Le bouton d’<strong>envoi</strong> publie ou met à jour le <strong>message principal</strong> du fil identifié par le <strong>titre</strong> (sujet). Si aucun fil ne correspond encore, un <strong>nouveau sujet</strong> est créé.",
      pSugg:
        "La <strong>liste de suggestions</strong> sous le sujet reprend vos titres déjà utilisés ; en choisir un charge le contenu du fil correspondant (équivalent à ouvrir la fiche depuis le forum pour <strong>modifier</strong> le message).",
      pPriv:
        "La case <strong>Privé / Public</strong> règle si le fil n’est visible que pour vous ou pour tout le monde sur le forum.",
      pRail:
        "La ligne <strong>Actions</strong> regroupe l’envoi, les commentaires rapides, l’ouverture du forum, la lecture vocale, le <strong>MP3</strong> / transcription, et le bouton d’aide détaillée (ci-dessous : lecture et MP3)."
    },
    en: {
      title: "My Notes — user guide",
      lead:
        "This dialog lets you write a <strong>note</strong> (<strong>Subject</strong> and <strong>Text</strong>) and <strong>publish it on the Alfamous forum</strong> as a <strong>discussion thread</strong> (new or existing).",
      pPub:
        "The <strong>Send</strong> button publishes or updates the thread’s <strong>root post</strong> for the given <strong>title</strong>. If no thread matches yet, a <strong>new topic</strong> is created.",
      pSugg:
        "The <strong>suggestion list</strong> under the subject shows titles you already use; picking one loads that thread’s content (same idea as opening the post from the forum to <strong>edit</strong> it).",
      pPriv:
        "The <strong>Private / Public</strong> checkbox controls whether the thread is only visible to you or to everyone on the forum.",
      pRail:
        "The <strong>Actions</strong> row groups send, quick comments, forum, read-aloud, <strong>MP3</strong> / transcription, and detailed help (read-aloud &amp; MP3 below)."
    },
    ar: {
      title: "مذكراتي — دليل الاستخدام",
      lead:
        "تتيح هذه النافذة كتابة <strong>ملاحظة</strong> (<strong>الموضوع</strong> و<strong>النص</strong>) و<strong>نشرها في منتدى</strong> Alfamous كـ<strong>نقاش</strong> (جديد أو موجود).",
      pPub:
        "زر <strong>الإرسال</strong> ينشر أو يحدّث <strong>المنشور الرئيسي</strong> للنقاش حسب <strong>العنوان</strong>. إن لم يوجد تطابق بعد، يُنشأ <strong>موضوع جديد</strong>.",
      pSugg:
        "تعرض <strong>قائمة الاقتراحات</strong> تحت العنوان عناوين استخدمتها من قبل؛ اختيار عنوان يحمّل محتوى ذلك النقاش (مماثل لفتح المنشور من المنتدى لـ<strong>تعديله</strong>).",
      pPriv:
        "تحدد خانة <strong>خاص / عام</strong> ما إذا كان النقاش مرئياً لك فقط أم للجميع في المنتدى.",
      pRail:
        "صف <strong>الإجراءات</strong> يضم الإرسال والتعليقات السريعة والمنتدى والاستماع و<strong>MP3</strong> / التفريغ النصي وزر المساعدة (التفاصيل أدناه)."
    },
    kab: {
      title: "Tizmilin-inu — amnir n useqdec",
      lead:
        "Asfaylu-a ad taruḍ <strong>tazmilt</strong> (<strong>Asentel</strong> d <strong>aḍris</strong>) sakin ad <strong>tsuffeɣeḍ ɣer lmunada</strong> Alfamous am <strong>asnflul</strong> (amaynut neɣ yellan).",
      pPub:
        "Taɣeccalt n <strong>uzen</strong> ad tessuffeɣ neɣ ad teslelli <strong>izen agejdan</strong> n usnflul s <strong>uzwel</strong>. Ma yella ulac amsaḍa, ad yettwarna <strong>asentel amaynut</strong>.",
      pSugg:
        "<strong>Tabdart n yisumar</strong> daw uzwel tesskan-d izwal i tesseqdaceḍ yakan; ma tferneḍ yiwen ad yuli agbur n usnflul-nni ( am usali n yizen seg lmunada i <strong>usẓreg</strong>).",
      pPriv:
        "Taxxat <strong>Uslig / Azayez</strong> ad d-yemmal ma yella usnflul kan i kečč neɣ i yal yiwen deg lmunada.",
      pRail:
        "Azrig <strong>Tigawin</strong> yesdukel azen, iwenniten, lmunada, taɣuri, <strong>MP3</strong> / transcripçun, d tallalt leqqayen (daw-a)."
    },
    es: {
      title: "Mis notas — guía",
      lead:
        "Este cuadro sirve para redactar una <strong>nota</strong> (<strong>Asunto</strong> y <strong>Texto</strong>) y <strong>publicarla en el foro</strong> Alfamous como <strong>hilo</strong> (nuevo o existente).",
      pPub:
        "El botón de <strong>enviar</strong> publica o actualiza el <strong>mensaje raíz</strong> del hilo según el <strong>título</strong>. Si aún no hay coincidencia, se crea un <strong>tema nuevo</strong>.",
      pSugg:
        "La <strong>lista de sugerencias</strong> bajo el asunto muestra títulos que ya usó; al elegir uno se carga el contenido de ese hilo (equivalente a abrir la publicación en el foro para <strong>editarla</strong>).",
      pPriv:
        "La casilla <strong>Privado / Público</strong> fija si el hilo lo ve solo usted o todos en el foro.",
      pRail:
        "La fila <strong>Acciones</strong> agrupa enviar, comentarios, foro, lectura en voz alta, <strong>MP3</strong> / transcripción y la ayuda detallada (lectura y MP3 abajo)."
    }
  };

  /** Libellé visible du bouton « ? » dans la liste Actions dépliée (plus explicite que « Aide » seul). */
  const AF_HELP_ACTION_LABEL = {
    fr: "Aide détaillée — Mes Notes (forum, lecture, MP3, transcription)",
    en: "Detailed help — My Notes (forum, read aloud, MP3, transcription)",
    ar: "مساعدة تفصيلية — مذكراتي (المنتدى، القراءة، MP3، التفريغ)",
    kab: "Tallalt leqqayen — Tizmilin-inu (lmunada, taɣuri, MP3, transcripçun)",
    es: "Ayuda detallada — Mis notas (foro, lectura, MP3, transcripción)"
  };

  const AF_ACTIONS_RAIL_TITLE = {
    fr: "Actions",
    en: "Actions",
    ar: "إجراءات",
    kab: "Tigawin",
    es: "Acciones"
  };

  const AF_MODAL_CONFIRM_CLOSE = {
    fr: "Fermer Mes Notes sans enregistrer sur le forum ? Les modifications seront perdues.",
    en: "Close My Notes without saving to the forum? Your changes will be lost.",
    ar: "إغلاق « مذكراتي » دون الحفظ في المنتدى؟ ستفقد التعديلات.",
    kab: "Mdel « Tizmilin-inu » war asekles deg lmunada? Ibeddilen ad ttwakkesen.",
    es: "¿Cerrar Mis notas sin guardar en el foro? Se perderán los cambios."
  };

  // Même placeholder que Mes Commentaires (phSubject) : verset / racine / mot.
  const AF_MODAL_PH_SUBJECT = {
    fr: "Verset (ex. 2.255), racine, mot…",
    en: "Verse (e.g. 2.255), root, word…",
    ar: "آية (مثال 2.255)، جذر، كلمة…",
    kab: "Tazmilt (amedya 2.255), aɣer, awal…",
    es: "Verso (ej. 2.255), raíz, palabra…"
  };

  const AF_MODAL_PH_BODY = {
    fr: "Votre commentaire...",
    en: "Your comment...",
    ar: "تعليقك...",
    kab: "Awennit-ik...",
    es: "Su comentario..."
  };

  const AF_MODAL_CONFIRM_CLEAR = {
    fr: "Vider ce champ ? Le contenu saisi sera perdu.",
    en: "Clear this field? The content you entered will be lost.",
    ar: "إفراغ هذا الحقل؟ سيُفقد المحتوى المكتوب.",
    kab: "Sfeḍ aferdis-a? Aḍris ara yettwaru ad iruḥ.",
    es: "¿Vaciar este campo? Se perderá el contenido escrito."
  };

  /** Limite du champ Texte Mes Notes (caractères). ~3 Mo permet d’insérer tout le mushaf + en-têtes #s.v ; l’envoi forum peut échouer si le document Firestore dépasse ~1 Moio. */
  const AF_BODY_MAX_LEN = 3000000;

  function captureAfModalBaseline() {
    const ti = document.getElementById("afModalTitleIn");
    const bi = document.getElementById("afModalBody");
    const pr = document.getElementById("afModalPrivate");
    afModalBaseline = {
      title: String(ti && ti.value || "").trim(),
      body: String(bi && bi.value || ""),
      priv: !!(pr && pr.checked)
    };
  }

  function isAfModalDirty() {
    const ti = document.getElementById("afModalTitleIn");
    const bi = document.getElementById("afModalBody");
    const pr = document.getElementById("afModalPrivate");
    const t = String(ti && ti.value || "").trim();
    const b = String(bi && bi.value || "");
    const p = !!(pr && pr.checked);
    return t !== afModalBaseline.title || b !== afModalBaseline.body || p !== afModalBaseline.priv;
  }

  async function afModalConfirmAsync(message) {
    try {
      if (typeof window.alertConfirm === "function") return !!(await window.alertConfirm(message));
      if (typeof alertConfirm === "function") return !!(await alertConfirm(message));
    } catch (_) {}
    try {
      return window.confirm(message);
    } catch (_) {
      return false;
    }
  }

  function showAfModalHelp() {
    const lc = getAfModalLang();
    const H = AF_MODAL_HELP[lc] || AF_MODAL_HELP.fr;
    const isAr = lc === "ar";
    const dir = isAr ? "rtl" : "ltr";
    const align = isAr ? "right" : "left";
    let media = "";
    try {
      if (typeof window.zcGetMesNotesTtsHelpFragments === "function") {
        const F = window.zcGetMesNotesTtsHelpFragments();
        if (F) {
          if (F.listenHeading && F.listenHtml) {
            media +=
              '<h4 style="margin:0.85rem 0 0.35rem 0;font-size:0.98rem;color:var(--zc-text);">' +
              esc(F.listenHeading) +
              "</h4>" +
              F.listenHtml;
          }
          if (F.mp3Heading && F.mp3Html) {
            media +=
              '<h4 style="margin:0.85rem 0 0.35rem 0;font-size:0.98rem;color:var(--zc-text);">' +
              esc(F.mp3Heading) +
              "</h4>" +
              F.mp3Html;
          }
        }
      }
    } catch (_) {}
    const html =
      `<div dir="${dir}" style="line-height:1.5;text-align:${align};">` +
      `<h3 style="margin:.1rem 0 .55rem 0;color:var(--zc-text);">${esc(H.title)}</h3>` +
      `<p style="margin:.2rem 0 .45rem 0;color:var(--zc-text);">${H.lead}</p>` +
      `<p style="margin:.2rem 0 .45rem 0;color:var(--zc-text);">${H.pPub}</p>` +
      `<p style="margin:.2rem 0 .45rem 0;color:var(--zc-text);">${H.pSugg}</p>` +
      `<p style="margin:.2rem 0 .45rem 0;color:var(--zc-text);">${H.pPriv}</p>` +
      `<p style="margin:.2rem 0 .45rem 0;color:var(--zc-text);">${H.pRail}</p>` +
      `${media}` +
      `</div>`;
    if (typeof alertMsgBoxPopup === "function") {
      alertMsgBoxPopup(html);
    }
  }
  window.showAfModalHelp = showAfModalHelp;

  const AF_MODAL_PRIVACY = {
    fr: { private: "Privé", public: "Public" },
    en: { private: "Private", public: "Public" },
    ar: { private: "خاص", public: "عام" },
    kab: { private: "Uslig", public: "Azayez" },
    es: { private: "Privado", public: "Público" }
  };

  /** Bouton icône → popup « Commentaires » (infobulle = cible Lexique / Coran). */
  const AF_OPEN_COMMENTAIRES = {
    fr: { hint: "Ajouter commentaires au Lexique / Coran" },
    en: { hint: "Add comments to the Lexicon / Quran" },
    ar: { hint: "إضافة تعليقات إلى المعجم / القرآن" },
    kab: { hint: "Rnu iwenniten ɣer umawal / Leqran" },
    es: { hint: "Añadir comentarios al léxico / Corán" }
  };

  /** Bouton Actions → même commande / libellés que #ouvrirForum1 (panelChokr). */
  const AF_OPEN_FORUM = {
    fr: {
      label: "Forum",
      title: "Forum des idées 💡 : publications privées et publiques",
      ariaLabel: "Forum des idées : publications privées et publiques"
    },
    en: {
      label: "Forum",
      title: "Ideas forum 💡 — private and public posts",
      ariaLabel: "Ideas forum — private and public posts"
    },
    ar: {
      label: "المنتدى",
      title: "منتدى الأفكار 💡 — منشورات خاصة وعامة",
      ariaLabel: "منتدى الأفكار — منشورات خاصة وعامة"
    },
    kab: {
      label: "Lmunada",
      title: "Agraw n yismenyifen 💡 — suffeɣ uslig akked wid yettwakcamen",
      ariaLabel: "Agraw n yismenyifen — suffeɣ uslig akked wid yettwakcamen"
    },
    es: {
      label: "Foro",
      title: "Foro de ideas 💡 — publicaciones privadas y públicas",
      ariaLabel: "Foro de ideas — publicaciones privadas y públicas"
    }
  };

  const AF_OPEN_FORUM_UNAVAILABLE = {
    fr: "Ouverture du forum indisponible (rechargez la page).",
    en: "Cannot open the forum (try reloading the page).",
    ar: "تعذّر فتح المنتدى (أعد تحميل الصفحة).",
    kab: "Ur izmir ara ad yeldi lmunada (ales asali n usebter).",
    es: "No se puede abrir el foro (recargue la página)."
  };

  /** Libellé du champ titre / sujet du fil (remplace « Titre du fil sur le forum »). */
  const AF_MODAL_SUBJECT_FIELD = {
    fr: { label: "Sujet" },
    en: { label: "Subject" },
    ar: { label: "الموضوع" },
    kab: { label: "Asentel" },
    es: { label: "Asunto" }
  };

  /** Bouton 🔁 translittération sur la ligne Sujet (comme Mes Commentaires / #btn-popup-translit-subject). */
  const AF_MODAL_SUBJECT_TRANSLIT = {
    fr: { title: "Translitérer", sr: "Translitérer" },
    en: { title: "Transliterate", sr: "Transliterate" },
    ar: { title: "تحويل حرفي", sr: "تحويل حرفي" },
    kab: { title: "Beddel isekkilen", sr: "Beddel isekkilen" },
    es: { title: "Transliterar", sr: "Transliterar" }
  };

  /** Bouton près du sujet : interprète le champ Sujet comme références (ex. 3.10-3.14 5.6 ; + = espace) et insère l’arabe dans Texte. */
  const AF_MODAL_SUBJECT_INSERT_VERSES = {
    fr: {
      title:
        "Insérer les versets cités dans le champ Texte (références : sourate.verset ou sourate.verset-sourate.verset ; + compte comme espace)",
      sr: "Insérer les versets dans le texte",
      noFtab: "Table des versets indisponible (rechargez la page ou attendez le chargement complet).",
      noToken: "Aucune référence reconnue (ex. 3.10-3.14 5.6 2.13-2.15).",
      skipped: (t) => `Fragments ignorés : ${t}`,
      appended: (n) => `${n} verset(s) ajouté(s) au champ Texte.`,
      truncated: "Insertion tronquée : limite du champ Texte atteinte.",
      missingAya: "(verset absent du tableau local)"
    },
    en: {
      title:
        "Insert cited verses into the Text field (refs: surah.verse or surah.verse-surah.verse; + counts as space)",
      sr: "Insert verses into text",
      noFtab: "Verse table unavailable (reload the page or wait for full load).",
      noToken: "No recognized reference (e.g. 3.10-3.14 5.6 2.13-2.15).",
      skipped: (t) => "Ignored fragments: " + t,
      appended: (n) => n + " verse(s) appended to the Text field.",
      truncated: "Insertion truncated: Text field limit reached.",
      missingAya: "(verse missing in local table)"
    },
    ar: {
      title:
        "إدراج الآيات المشار إليها في النص (سورة.آية أو سورة.آية-سورة.آية؛ + يُعدّ مسافة)",
      sr: "إدراج الآيات في النص",
      noFtab: "جدول الآيات غير متاح (أعد تحميل الصفحة).",
      noToken: "لا مرجع معروف (مثال 3.10-3.14 5.6 2.13-2.15).",
      skipped: (t) => "أجزاء متجاهلة: " + t,
      appended: (n) => "أُضيف " + n + " آية إلى النص.",
      truncated: "تم اقتصاص الإدراج: بلوغ الحد الأقصى للحقل.",
      missingAya: "(الآية غير موجودة في الجدول المحلي)"
    },
    kab: {
      title:
        "Sekcem tizmilin n warrat deg uḍris (taduliwin: sura.aya neɣ sura.aya-sura.aya; + am usmatt)",
      sr: "Sekcem arrat deg uḍris",
      noFtab: "Tafel n yarrat ulac-it (ales asali n usebter).",
      noToken: "Ulac taduliwin yettwassen (amedya 3.10-3.14 5.6 2.13-2.15).",
      skipped: (t) => "Iḥder yettwattuy: " + t,
      appended: (n) => "Yerna " + n + " n yarrat ɣer uḍris.",
      truncated: "Asekcem yettwaseḥḥu: talast n uḍris.",
      missingAya: "(array ulac-it deg tfelwit tadiganit)"
    },
    es: {
      title:
        "Insertar en Texto los versos citados (refs: sura.versículo o sura.vers-sura.vers; + cuenta como espacio)",
      sr: "Insertar versos en el texto",
      noFtab: "Tabla de versos no disponible (recargue la página).",
      noToken: "Ninguna referencia reconocida (ej. 3.10-3.14 5.6 2.13-2.15).",
      skipped: (t) => "Fragmentos ignorados: " + t,
      appended: (n) => n + " verso(s) añadido(s) al campo Texto.",
      truncated: "Inserción truncada: límite del campo alcanzado.",
      missingAya: "(verso ausente en la tabla local)"
    }
  };

  /** Bouton Actions : analyse du champ Texte (panneau par défaut ; surcharger window.zcAfAnalyzeMesNoteText). */
  const AF_MODAL_BODY_ANALYZE = {
    fr: {
      label: "Analyse",
      title: "Ouvrir l’analyse du texte (champ Texte). Pour un traitement personnalisé : window.zcAfAnalyzeMesNoteText.",
      empty: "Le champ Texte est vide : rien à analyser."
    },
    en: {
      label: "Analyze",
      title: "Open text analysis (Text field). Custom handler: window.zcAfAnalyzeMesNoteText.",
      empty: "The Text field is empty."
    },
    ar: {
      label: "تحليل",
      title: "فتح تحليل النص (حقل النص). للتخصيص: window.zcAfAnalyzeMesNoteText.",
      empty: "حقل النص فارغ."
    },
    kab: {
      label: "Aslaɣ",
      title: "Ldi aslaɣ n uḍris. S wudem udmawan: window.zcAfAnalyzeMesNoteText.",
      empty: "Aḍris d ilem."
    },
    es: {
      label: "Análisis",
      title: "Abrir el análisis del texto (campo Texto). Personalizar: window.zcAfAnalyzeMesNoteText.",
      empty: "El campo Texto está vacío."
    }
  };

  /** Panneau « Analyse du Texte » (Mes Notes). */
  const AF_TEXT_ANALYSIS_PANEL = {
    fr: {
      title: "Analyse — champ Texte",
      close: "Fermer",
      closeSr: "Fermer l’analyse",
      summaryTitle: "Synthèse",
      freqTitle: "Fréquences (segments arabes ou mots latins, ≥ 2 caractères)",
      noFreq: "Aucun segment compté pour les fréquences.",
      chars: (n) => "Caractères : " + n,
      nonSpace: (n) => "Sans espaces : " + n,
      lines: (n) => "Lignes : " + n,
      tokens: (n, u) => "Segments : " + n + " (" + u + " distincts)",
      arabChars: (n) => "Lettres arabes (approx.) : " + n,
      latinWords: (n) => "Mots latins (approx.) : " + n,
      preview: "Aperçu (début)",
      countCol: "Occurrences",
      tokenCol: "Segment"
    },
    en: {
      title: "Analysis — Text field",
      close: "Close",
      closeSr: "Close analysis",
      summaryTitle: "Summary",
      freqTitle: "Frequencies (Arabic runs or Latin words, ≥ 2 chars)",
      noFreq: "No segments counted for frequencies.",
      chars: (n) => "Characters: " + n,
      nonSpace: (n) => "Non-space: " + n,
      lines: (n) => "Lines: " + n,
      tokens: (n, u) => "Segments: " + n + " (" + u + " unique)",
      arabChars: (n) => "Arabic letters (approx.): " + n,
      latinWords: (n) => "Latin words (approx.): " + n,
      preview: "Preview (start)",
      countCol: "Count",
      tokenCol: "Segment"
    },
    ar: {
      title: "تحليل — حقل النص",
      close: "إغلاق",
      closeSr: "إغلاق التحليل",
      summaryTitle: "ملخص",
      freqTitle: "تكرار (قطع عربية أو كلمات لاتينية، طولها ≥ 2)",
      noFreq: "لا قطع محسوبة للتكرار.",
      chars: (n) => "أحرف: " + n,
      nonSpace: (n) => "بلا فراغات: " + n,
      lines: (n) => "أسطر: " + n,
      tokens: (n, u) => "قطع: " + n + " (" + u + " مميزة)",
      arabChars: (n) => "حروف عربية (تقريبًا): " + n,
      latinWords: (n) => "كلمات لاتينية (تقريبًا): " + n,
      preview: "معاينة (البداية)",
      countCol: "التكرار",
      tokenCol: "القطعة"
    },
    kab: {
      title: "Aslaɣ — aḍris",
      close: "Mdel",
      closeSr: "Mdel aslaɣ",
      summaryTitle: "Agmuḍ",
      freqTitle: "Aṭṭraf (iqtiɛen n teɣrift neɣ wawalen latinit, ≥ 2 n yisekkilen)",
      noFreq: "Ulac iqiɛen i yettwabḍan.",
      chars: (n) => "Isekkilen: " + n,
      nonSpace: (n) => "War imasnawen: " + n,
      lines: (n) => "Izrigen: " + n,
      tokens: (n, u) => "Iqiɛen: " + n + " (" + u + " udmawanen)",
      arabChars: (n) => "Isekkilen n teɣrift (arurad): " + n,
      latinWords: (n) => "Awalen latinit (arurad): " + n,
      preview: "Taskantit (tazwara)",
      countCol: "Aṭraf",
      tokenCol: "Aqiɛ"
    },
    es: {
      title: "Análisis — campo Texto",
      close: "Cerrar",
      closeSr: "Cerrar el análisis",
      summaryTitle: "Resumen",
      freqTitle: "Frecuencias (segmentos árabes o palabras latinas, ≥ 2 caracteres)",
      noFreq: "No hay segmentos contados para frecuencias.",
      chars: (n) => "Caracteres: " + n,
      nonSpace: (n) => "Sin espacios: " + n,
      lines: (n) => "Líneas: " + n,
      tokens: (n, u) => "Segmentos: " + n + " (" + u + " únicos)",
      arabChars: (n) => "Letras árabes (aprox.): " + n,
      latinWords: (n) => "Palabras latinas (aprox.): " + n,
      preview: "Vista previa (inicio)",
      countCol: "Veces",
      tokenCol: "Segmento"
    }
  };

  /** Onglet « simulation analyse MP3 » (dérivé du texte, pas d’audio réel). */
  const AF_MP3_SIM_PANEL = {
    fr: {
      tabText: "Texte",
      tabMp3: "Simu. MP3",
      disclaimer:
        "Simulation uniquement : aucun fichier audio n’est lu. Les indicateurs sont dérivés du champ Texte (durée indicative, niveaux pseudo-niveau sonore par segment).",
      unitsTitle: "Segments type « forme d’onde » (illustration)",
      thT0: "Début",
      thT1: "Fin",
      thLv: "Niveau relatif",
      durEst: (s) => "Durée indicative de lecture : " + s,
      units: (n) => "Segments simulés : " + n,
      silences: (n) => "Pauses (lignes vides / doubles sauts) : " + n,
      cpsHint: (cps) => "Débit équivalent (sim.) : ~" + cps + " car./s (somme durées fixes par type de caractère).",
      confHint: (p) => "Clarté estimée (heuristique sur le texte) : " + p + " %",
      previewCol: "Aperçu",
      noSegments: "(Aucun segment — texte vide.)"
    },
    en: {
      tabText: "Text",
      tabMp3: "MP3 sim.",
      disclaimer:
        "Simulation only: no audio file is decoded. Metrics are inferred from the Text field (rough duration, pseudo loudness per segment).",
      unitsTitle: "Pseudo-waveform segments (illustration)",
      thT0: "Start",
      thT1: "End",
      thLv: "Rel. level",
      durEst: (s) => "Estimated speech duration: " + s,
      units: (n) => "Simulated segments: " + n,
      silences: (n) => "Pauses (blank / double line breaks): " + n,
      cpsHint: (cps) => "Equivalent rate (sim.): ~" + cps + " chars/s (sum of fixed durations per character type).",
      confHint: (p) => "Estimated clarity (text heuristic): " + p + " %",
      previewCol: "Preview",
      noSegments: "(No segments — empty text.)"
    },
    ar: {
      tabText: "النص",
      tabMp3: "MP3 محاكاة",
      disclaimer:
        "محاكاة فقط: لا يُفكّر أي ملف صوتي. المؤشرات مُستخرجة من النص (مدة تقريبية، مستويات شبه-صوتية لكل جزء).",
      unitsTitle: "مقاطع شبه-موجية (توضيح)",
      thT0: "البداية",
      thT1: "النهاية",
      thLv: "مستوى نسبي",
      durEst: (s) => "مدة قراءة تقريبية: " + s,
      units: (n) => "مقاطع محاكاة: " + n,
      silences: (n) => "توقفات (أسطر فارغة / مزدوجة): " + n,
      cpsHint: (cps) => "معدل مكافئ (محاكاة): ~" + cps + " حرف/ث (مجموع مدد ثابتة لكل نوع حرف).",
      confHint: (p) => "وضوح تقديري (من النص): " + p + "٪",
      previewCol: "معاينة",
      noSegments: "(لا مقاطع — نص فارغ.)"
    },
    kab: {
      tabText: "Aḍris",
      tabMp3: "MP3 arurad",
      disclaimer:
        "Arurad kan: ulac afaylu ameslaw. Iḍanen llan-d seg uḍris (akud, taɣara n yimiḍanen s yiqtiɛen).",
      unitsTitle: "Iqiɛen am uẓṛiḍ (askan)",
      thT0: "Bdu",
      thT1: "Tfuk",
      thLv: "Aswir",
      durEst: (s) => "Akud n taɣuri (arurad): " + s,
      units: (n) => "Iqiɛen n useɣwen: " + n,
      silences: (n) => "Ibdan (izrigyen ilem): " + n,
      cpsHint: (cps) => "Arurad (~" + cps + " n yisekkilen/s, taggara s wanaw n usekkil).",
      confHint: (p) => "Leqqayen (seg uḍris): " + p + " %",
      previewCol: "Taskantit",
      noSegments: "(Ulac iqiɛen.)"
    },
    es: {
      tabText: "Texto",
      tabMp3: "Sim. MP3",
      disclaimer:
        "Solo simulación: no se analiza ningún MP3. Los datos se infieren del campo Texto (duración orientativa, niveles pseudo-sonoros por trozo).",
      unitsTitle: "Segmentos tipo forma de onda (ilustración)",
      thT0: "Inicio",
      thT1: "Fin",
      thLv: "Nivel rel.",
      durEst: (s) => "Duración orientativa de habla: " + s,
      units: (n) => "Segmentos simulados: " + n,
      silences: (n) => "Pausas (líneas vacías / dobles): " + n,
      cpsHint: (cps) => "Ritmo equivalente (sim.): ~" + cps + " car./s (suma de duraciones fijas por tipo de carácter).",
      confHint: (p) => "Claridad estimada (heurística): " + p + " %",
      previewCol: "Vista",
      noSegments: "(Sin segmentos — texto vacío.)"
    }
  };

  /**
   * Durée indicative (simu. MP3) : somme des durées fixes par catégorie de caractère.
   * Chaque lettre / chiffre / ponctuation compte ; espace et saut de ligne ont leurs
   * propres durées (\\n > espace pour marquer les coupures entre versets). Les mots
   * « longs » pèsent plus car chaque caractère (y compris ponctuation collée) s’ajoute.
   * Unités : secondes par code point (boucle for…of).
   */
  const AF_READING_DURATION_SEC = {
    arLetter: 0.079,
    latinLetter: 0.051,
    digit: 0.046,
    punct: 0.105,
    space: 0.036,
    newline: 0.175,
    tab: 0.032,
    other: 0.054
  };

  function classifyAfReadingCategory(ch) {
    if (ch === "\n") return "newline";
    if (ch === "\t") return "tab";
    if (ch === " " || ch === "\u00a0" || ch === "\u2003" || ch === "\u2009" || ch === "\u202f")
      return "space";
    if (ch >= "0" && ch <= "9") return "digit";
    if (ch >= "\u0660" && ch <= "\u0669") return "digit";
    if (ch >= "\u06f0" && ch <= "\u06f9") return "digit";
    if (/[A-Za-z\u00c0-\u024f]/.test(ch)) return "latinLetter";
    if (/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/.test(ch)) {
      if (/[\u060c\u061b\u061f\u066a-\u066d\u06d4\ufd3e\ufd3f\u0610-\u0615]/.test(ch)) return "punct";
      return "arLetter";
    }
    if (/[.,;:!?…\-–—'"«»()[\]{}_/\\@#&*+=<>`~|^%$€،؟؛٫٬]/.test(ch)) return "punct";
    return "other";
  }

  function estimateReadingSecondsFromText(norm) {
    const s = String(norm || "").replace(/\r/g, "");
    if (!s.length) return 0;
    const T = AF_READING_DURATION_SEC;
    let sum = 0;
    for (const ch of s) {
      const cat = classifyAfReadingCategory(ch);
      sum += T[cat] != null ? T[cat] : T.other;
    }
    return sum;
  }

  /** Compteur + infobulle du lien vers la popup lecture forum (comme la liste forum). */
  const AF_MODAL_REPLIES = {
    fr: { prefix: "Réponses : %n", openRead: "Ouvrir ce message sur le forum avec les réponses" },
    en: { prefix: "Replies: %n", openRead: "Open this post on the forum with replies" },
    ar: { prefix: "الردود: %n", openRead: "فتح هذا المنشور في المنتدى مع الردود" },
    kab: { prefix: "Tiriririn: %n", openRead: "Ldi iznan-a deg lmunada s triririn" },
    es: { prefix: "Respuestas: %n", openRead: "Abrir esta publicación en el foro con las respuestas" }
  };

  /** Bouton à côté de « Réponses » : lecture du MP3 Mes Notes déjà sur Firebase pour le sujet saisi. */
  const AF_MODAL_STORED_MP3 = {
    fr: {
      label: "Lire",
      title: "Ouvrir le fichier audio MP3 enregistré pour ce sujet (Firebase)"
    },
    en: {
      label: "Listen",
      title: "Open the stored MP3 audio file for this subject (Firebase)"
    },
    ar: {
      label: "استمع",
      title: "فتح ملف MP3 الصوتي المحفوظ لهذا الموضوع (Firebase)"
    },
    kab: {
      label: "Sṭel",
      title: "Ldi afaylu ameslaw MP3 id-yettwasklas i uzwel-a (Firebase)"
    },
    es: {
      label: "Escuchar",
      title: "Abrir el archivo MP3 guardado para este asunto (Firebase)"
    }
  };

  /** Requêtes Storage imbriquées (frappe rapide sur le sujet). */
  let afStoredMp3ReqGen = 0;
  let afStoredMp3DebounceTimer = null;

  function syncAfModalPrivateLabel() {
    const cb = document.getElementById("afModalPrivate");
    const span = document.getElementById("afModalPrivateLabel");
    if (!cb || !span) return;
    const lc = getAfModalLang();
    const W = AF_MODAL_PRIVACY[lc] || AF_MODAL_PRIVACY.fr;
    if (cb.checked) {
      span.textContent = W.private;
      span.style.color = getComputedStyle(document.documentElement).getPropertyValue('--zc-accent-hover').trim() || "#15803d";
    } else {
      span.textContent = W.public;
      span.style.color = getComputedStyle(document.documentElement).getPropertyValue('--zc-danger').trim() || "#b91c1c";
    }
    span.style.fontWeight = "700";
    const hint =
      lc === "en"
        ? "Checked: private. Unchecked: public."
        : lc === "ar"
          ? "محدد: خاص. غير محدد: عام."
          : lc === "kab"
            ? "Yettwaxḍay: uslig. Ur yettwaxḍay ara: azayez."
            : lc === "es"
              ? "Marcado: privado. Sin marcar: público."
              : "Coché : privé. Décoché : public.";
    cb.title = hint;
    cb.setAttribute("aria-label", hint);
  }

  function injectStylesOnce() {
    if (document.getElementById("articlesForumModalStyles")) return;
    const s = document.createElement("style");
    s.id = "articlesForumModalStyles";
    s.textContent = `
      #afModalOverlay.af-modal-overlay {
        display: none;
        position: fixed;
        inset: 0;
        z-index: auto;
        background: rgba(15, 23, 42, 0.45);
        align-items: stretch;
        justify-content: center;
        padding: 0.35rem 0.5rem;
        box-sizing: border-box;
      }
      #afModalOverlay .af-modal-panel.popup-box.zc-comment-popup-box {
        background: var(--zc-surface);
        border-radius: 12px;
        width: 100%;
        max-width: min(96vw, 720px);
        align-self: center;
        height: min(96dvh, 960px);
        max-height: min(96dvh, 960px);
        min-height: min(70dvh, 560px);
        display: flex;
        flex-direction: column;
        box-shadow: 0 12px 40px rgba(0,0,0,0.2);
        overflow: hidden;
        box-sizing: border-box;
      }
      #afModalOverlay .af-modal-body-grow {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      #afModalOverlay .zc-comment-popup-header.af-modal-head {
        flex: 0 0 auto;
        margin-bottom: 0.35rem;
        padding-bottom: 0.45rem;
      }
      #afModalOverlay .zc-comment-popup-title.af-modal-title {
        flex: 1 1 auto;
        margin: 0;
        font-weight: 800;
      }
      #afModalOverlay #afModalOpenCommentaires.af-modal-open-comments-btn .zc-top-action-ico,
      #afModalOverlay #afModalOpenCommentaires.af-modal-open-comments-btn .af-modal-open-comments-ico {
        display: inline-block;
        font-size: 1.28rem;
        line-height: 1;
      }
      #afModalOverlay .zc-af-actions-toolbar .zc-af-actions-spacer {
        flex: 1 1 12px;
        min-width: 6px;
        height: 1px;
      }
      #afModalOverlay .af-modal-fields {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        padding: 0 14px 4px;
        gap: 4px;
        overflow: auto;
      }
      #afModalOverlay #afModalMsg {
        flex: 0 0 auto;
        min-height: 1.2em;
        font-size: 13px;
        padding: 0 14px 4px;
      }
      #afModalOverlay .af-title-toolbar-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 0.35rem 0.55rem;
        flex-wrap: wrap;
        margin-top: 1px;
      }
      #afModalOverlay .af-title-toolbar-row--subject {
        flex-wrap: nowrap;
        justify-content: space-between;
        align-items: center;
        gap: 0.25rem 0.4rem;
        min-width: 0;
        overflow: hidden;
        padding-bottom: 0;
      }
      #afModalOverlay .af-title-toolbar-row--subject .af-title-field-label {
        flex: 0 0 auto;
        white-space: nowrap;
      }
      #afModalOverlay .af-subject-toolbar-tail {
        display: flex;
        align-items: center;
        gap: 0.28rem;
        flex: 1 1 auto;
        min-width: 0;
        justify-content: flex-end;
        flex-wrap: nowrap;
      }
      #afModalOverlay .af-subject-toolbar-tail .af-subject-translit-btn.zc-popup-tool-btn {
        flex-shrink: 0;
        width: 1.38rem;
        height: 1.38rem;
        min-width: 1.38rem;
        padding: 0;
        font-size: 0.92rem;
        line-height: 1;
      }
      #afModalOverlay .af-subject-toolbar-tail .af-subject-insert-verses-btn.zc-popup-tool-btn {
        flex-shrink: 0;
        width: 1.38rem;
        height: 1.38rem;
        min-width: 1.38rem;
        padding: 0;
        font-size: 0.78rem;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      #afModalOverlay .af-subject-toolbar-tail .af-subject-insert-verses-btn.zc-popup-tool-btn .fas {
        pointer-events: none;
      }
      #afModalOverlay .af-body-toolbar-tail {
        display: flex;
        align-items: center;
        gap: 0.28rem;
        flex: 1 1 auto;
        min-width: 0;
        justify-content: flex-end;
        flex-wrap: nowrap;
      }
      #afModalOverlay .af-body-toolbar-tail .zc-transcribe-lang-wrap {
        margin-left: 0;
        flex-shrink: 0;
      }
      #afModalOverlay .af-body-toolbar-tail .zc-af-modal-transcribe-btn {
        position: static;
        flex-shrink: 0;
        width: 2.05rem;
        height: 2.05rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        margin: 0;
        border: none;
        border-radius: var(--zc-radius-xs, 4px);
        background: transparent;
        color: var(--zc-text-muted, #666);
        font-size: var(--zc-fs-md, 1rem);
        cursor: pointer;
        line-height: 1;
        -webkit-tap-highlight-color: transparent;
      }
      #afModalOverlay .af-body-toolbar-tail .zc-af-modal-transcribe-btn:hover {
        background: var(--zc-hover-bg, rgba(0, 0, 0, 0.06));
        color: var(--zc-text, inherit);
      }
      #afModalOverlay .zc-transcribe-lang-wrap .zc-mesnote-audio-file-btn {
        min-width: 2rem;
        padding: 0 0.35rem;
      }
      #afModalOverlay .zc-transcribe-lang-wrap .zc-mesnote-audio-file-btn .fas {
        font-size: 0.95rem;
        pointer-events: none;
      }
      #afModalOverlay .af-subject-toolbar-tail .af-private-row {
        flex: 0 0 auto;
      }
      #afModalOverlay .af-subject-toolbar-tail .af-modal-replies-wrap {
        flex: 1 1 0;
        min-width: 0;
        font-size: 12px;
        line-height: 1.25;
        color: var(--zc-text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #afModalOverlay .af-modal-replies-link {
        color: var(--zc-accent-hover);
        text-decoration: underline;
        cursor: pointer;
      }
      #afModalOverlay .af-modal-replies-link:hover {
        color: var(--zc-accent);
      }
      #afModalOverlay .af-modal-replies-link--disabled {
        color: var(--zc-text-muted);
        text-decoration: none;
        cursor: default;
        pointer-events: none;
      }
      #afModalOverlay .af-modal-stored-mp3-btn {
        flex: 0 0 auto;
        display: none;
        align-items: center;
        gap: 4px;
        margin: 0;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--zc-accent-hover);
        background: rgba(148, 163, 184, 0.15);
        border: 1px solid var(--zc-border);
        border-radius: 6px;
        cursor: pointer;
        white-space: nowrap;
      }
      #afModalOverlay .af-modal-stored-mp3-btn:hover {
        color: var(--zc-text);
        background: rgba(148, 163, 184, 0.22);
      }
      #afModalOverlay .af-modal-stored-mp3-btn .fas {
        font-size: 0.85rem;
        pointer-events: none;
      }
      #afModalOverlay .af-title-toolbar-row--subject .af-modal-private-label {
        min-width: 0;
      }
      #afModalOverlay .af-title-toolbar-row--subject .af-field-actions-inline {
        flex: 0 0 auto;
        margin-left: auto;
      }
      #afModalOverlay .af-title-field-label {
        margin: 0;
        font-size: 12px;
        font-weight: 600;
        color: var(--zc-text-muted);
      }
      #afModalOverlay .af-field-actions-inline {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        flex-shrink: 0;
      }
      #afModalOverlay .af-field-actions-inline .zc-popup-tool-btn {
        width: 1.38rem;
        height: 1.38rem;
        min-width: 1.38rem;
        border: none;
        color: var(--zc-text-muted);
        background: transparent;
        padding: 0;
        border-radius: 0;
        font-size: 1rem;
      }
      #afModalOverlay .af-field-actions-inline .zc-popup-tool-btn:hover {
        background: transparent;
        color: var(--zc-text);
      }
      #afModalOverlay .af-body-toolbar-row {
        margin-top: 2px;
        flex-wrap: nowrap;
        justify-content: space-between;
        align-items: center;
        gap: 0.25rem 0.4rem;
        min-width: 0;
      }
      #afModalOverlay .af-modal-title-field-wrap {
        position: relative;
        width: 100%;
        flex: 0 0 auto;
      }
      #afModalOverlay #afModalTitleIn {
        width: 100%;
        box-sizing: border-box;
        font-size: 15px;
        padding: 6px 9px;
        min-height: 2.05rem;
        line-height: 1.2;
        border: 1px solid var(--zc-border);
        border-radius: 8px;
      }
      #afModalOverlay #afModalTitleSuggest.suggestions-liste {
        z-index: 20;
        text-align: left;
        left: 0;
        right: 0;
      }
      #afModalOverlay .af-private-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        cursor: pointer;
        user-select: none;
        flex: 0 0 auto;
        margin: 0;
      }
      #afModalOverlay .af-modal-private-label {
        font-size: 15px;
        line-height: 1.3;
        min-width: 3.5em;
      }
      #afModalOverlay #afModalBody {
        width: 100%;
        box-sizing: border-box;
        flex: 1 1 auto;
        min-height: 110px;
        font-size: 15px;
        padding: 8px 9px;
        border: 1px solid var(--zc-border);
        border-radius: 8px;
        resize: none;
        font-family: inherit;
        line-height: 1.35;
      }
      #afModalOverlay .zc-af-actions-panel.toolbar1.zc-module-panel {
        margin: 4px 0 3px;
        flex: 0 0 auto;
        max-width: 100%;
      }
      #afModalOverlay .zc-af-actions-panel .zc-module-head.Modules {
        padding-inline-end: 42px !important;
        justify-content: flex-start !important;
        gap: 0.35rem;
      }
      #afModalOverlay .zc-af-actions-toolbar {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
        padding: 6px 7px 7px !important;
      }
      #afModalOverlay .zc-af-actions-toolbar .zc-popup-tool-btn,
      #afModalOverlay .zc-af-actions-toolbar .af-btn.af-btn-icon,
      #afModalOverlay .zc-af-actions-toolbar .zc-comment-popup-action-tile {
        width: 100%;
        min-width: 0;
        min-height: 2.1rem;
        height: auto;
        padding: 0.32rem 0.55rem;
        border-radius: 8px;
      }
      #afModalOverlay .zc-af-actions-toolbar .zc-comment-popup-action-tile {
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        gap: 0.38rem;
      }
      #afModalOverlay .zc-af-actions-toolbar .zc-top-action-label {
        font-size: 0.92rem;
        line-height: 1.22;
        font-weight: 600;
        color: var(--zc-text-muted);
        max-width: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      /* Déplié : Lire / MP3 = libellé complet (plusieurs lignes si besoin). */
      #afModalOverlay .zc-af-actions-toolbar #afModalBodyTtsListen-label,
      #afModalOverlay .zc-af-actions-toolbar #afModalBodyTtsFirebase-label,
      #afModalOverlay .zc-af-actions-toolbar #afModalBodyAnalyze-label {
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
        line-height: 1.2;
        flex: 1 1 auto;
        min-width: 0;
      }
      #afModalOverlay .zc-af-actions-toolbar #afModalBodyTtsListen.zc-comment-popup-action-tile,
      #afModalOverlay .zc-af-actions-toolbar #afModalBodyTtsFirebase.zc-comment-popup-action-tile,
      #afModalOverlay .zc-af-actions-toolbar #afModalBodyAnalyze.zc-comment-popup-action-tile {
        align-items: flex-start;
      }
      #afModalOverlay .zc-af-actions-toolbar.zc-module-actions-list > .menu-button.zc-top-action-btn,
      #afModalOverlay .zc-af-actions-toolbar .zc-popup-tool-btn,
      #afModalOverlay .zc-af-actions-toolbar .af-btn.af-btn-icon {
        background: transparent !important;
        border: none !important;
        color: var(--zc-text) !important;
        box-shadow: none !important;
      }
      #afModalOverlay .zc-af-actions-toolbar.zc-module-actions-list > .menu-button.zc-top-action-btn:hover,
      #afModalOverlay .zc-af-actions-toolbar .zc-popup-tool-btn:hover,
      #afModalOverlay .zc-af-actions-toolbar .af-btn.af-btn-icon:hover {
        background: color-mix(in srgb, var(--zc-text) 8%, transparent) !important;
        border: none !important;
        box-shadow: none !important;
      }
      /* Hors liste Actions : garder un gabarit bouton si besoin (pas les .zc-comment-popup-action-tile du rail). */
      #afModalOverlay .af-btn.af-btn-icon:not(.zc-comment-popup-action-tile) {
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        width: 100%;
        font-size: 0.98rem;
        line-height: 1.15;
        border-radius: 8px;
        cursor: pointer;
        font-family: inherit;
        border: 1px solid var(--zc-border);
        background: var(--zc-surface);
      }
      #afModalOverlay .af-btn.af-btn-icon.af-btn-primary:not(.zc-comment-popup-action-tile) {
        border-color: var(--zc-panel-action-border) !important;
        background: var(--zc-ui-soft-bg) !important;
        color: var(--zc-text) !important;
        font-weight: 700;
      }
      #afModalOverlay .af-btn.af-btn-icon.af-btn-primary:not(.zc-comment-popup-action-tile) .zc-top-action-label {
        color: var(--zc-text);
      }
      #afModalOverlay .af-btn.af-btn-icon.af-btn-danger:not(.zc-comment-popup-action-tile) {
        border-color: var(--zc-panel-action-border) !important;
        background: var(--zc-ui-soft-bg) !important;
        color: var(--zc-text) !important;
        font-weight: 700;
      }
      /* Icônes Mes Notes : gabarit lisible (rétabli après migration tokens / slot 16px global) */
      #afModalOverlay .zc-comment-popup-header .zc-comment-popup-iconbtn {
        width: var(--zc-popup-head-icon-box);
        height: var(--zc-popup-head-icon-box);
        font-size: var(--zc-popup-head-icon-fs);
      }
      #afModalOverlay .zc-comment-popup-header .zc-comment-popup-iconbtn .zc-top-action-ico {
        font-size: var(--zc-popup-head-icon-fs);
      }
      #afModalOverlay .zc-af-actions-toolbar.zc-module-actions-list .zc-top-action-ico {
        flex: 0 0 2.35rem !important;
        width: 2.35rem !important;
        min-width: 2.35rem !important;
      }
      #afModalOverlay .zc-af-actions-toolbar .zc-top-action-ico .fas,
      #afModalOverlay .zc-af-actions-toolbar .zc-top-action-ico .far {
        font-size: 1.22rem !important;
        line-height: 1;
      }
      #afModalOverlay #afModalHelp.zc-comment-popup-action-tile {
        font-size: 1.38rem !important;
        font-weight: 800;
      }
      /* Panneau analyse Texte (Mes Notes) — au-dessus de la modale */
      #zcAfTextAnalysisOverlay.zc-af-ta-overlay {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 100002;
        align-items: center;
        justify-content: center;
        padding: 0.5rem;
        box-sizing: border-box;
        background: rgba(15, 23, 42, 0.5);
      }
      #zcAfTextAnalysisOverlay.zc-af-ta-overlay.is-open {
        display: flex;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-panel {
        width: 100%;
        max-width: min(96vw, 640px);
        max-height: min(92dvh, 720px);
        background: var(--zc-surface, #fff);
        color: var(--zc-text, #111);
        border-radius: 12px;
        box-shadow: 0 16px 48px rgba(0,0,0,0.25);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--zc-border, #e5e7eb);
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 10px 12px;
        border-bottom: 1px solid var(--zc-border, #e5e7eb);
        background: var(--zc-ui-soft-bg, #f8fafc);
        flex: 0 0 auto;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-main {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        line-height: 1.25;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-close {
        flex: 0 0 auto;
        border: none;
        background: transparent;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        color: var(--zc-text-muted, #64748b);
        padding: 2px 8px;
        border-radius: 6px;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-close:hover {
        background: color-mix(in srgb, var(--zc-text) 8%, transparent);
        color: var(--zc-text);
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-section {
        margin-bottom: 1rem;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-section h3 {
        margin: 0 0 6px;
        font-size: 0.88rem;
        font-weight: 700;
        color: var(--zc-text-muted, #64748b);
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-kv {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-kv li {
        margin: 3px 0;
        line-height: 1.35;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-preview {
        margin-top: 8px;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid var(--zc-border, #e5e7eb);
        background: var(--zc-ui-soft-bg, #f8fafc);
        font-size: 0.88rem;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 7.5rem;
        overflow: auto;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-table-wrap {
        overflow-x: auto;
        border-radius: 8px;
        border: 1px solid var(--zc-border, #e5e7eb);
      }
      #zcAfTextAnalysisOverlay table.zc-af-ta-freq {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.88rem;
      }
      #zcAfTextAnalysisOverlay table.zc-af-ta-freq th,
      #zcAfTextAnalysisOverlay table.zc-af-ta-freq td {
        padding: 5px 8px;
        border-bottom: 1px solid var(--zc-border, #e5e7eb);
        vertical-align: middle;
      }
      #zcAfTextAnalysisOverlay table.zc-af-ta-freq th {
        text-align: left;
        font-weight: 700;
        background: var(--zc-ui-soft-bg, #f8fafc);
      }
      #zcAfTextAnalysisOverlay table.zc-af-ta-freq td.zc-af-ta-token {
        font-family: inherit;
        max-width: 12rem;
        word-break: break-word;
      }
      #zcAfTextAnalysisOverlay table.zc-af-ta-freq td.zc-af-ta-token[dir="rtl"] {
        text-align: right;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-bar-cell {
        min-width: 120px;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-bar-track {
        height: 12px;
        border-radius: 8px;
        background: var(--zc-ui-soft-bg, #e2e8f0);
        overflow: hidden;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-bar-fill {
        height: 100%;
        border-radius: 8px;
        background: var(--zc-popup-link, #2563eb);
        max-width: 100%;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-muted {
        color: var(--zc-text-muted, #64748b);
        font-size: 0.88rem;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-tabs {
        display: flex;
        flex-direction: row;
        gap: 4px;
        padding: 6px 10px 0;
        border-bottom: 1px solid var(--zc-border, #e5e7eb);
        background: var(--zc-ui-soft-bg, #f8fafc);
        flex: 0 0 auto;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-tab {
        flex: 1 1 0;
        min-width: 0;
        padding: 8px 10px;
        border: 1px solid transparent;
        border-bottom: none;
        border-radius: 8px 8px 0 0;
        background: transparent;
        cursor: pointer;
        font: inherit;
        font-size: 0.88rem;
        font-weight: 700;
        color: var(--zc-text-muted, #64748b);
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-tab:hover {
        color: var(--zc-text, #111);
        background: color-mix(in srgb, var(--zc-text) 5%, transparent);
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-tab[aria-selected="true"] {
        color: var(--zc-text, #111);
        background: var(--zc-surface, #fff);
        border-color: var(--zc-border, #e5e7eb);
        border-bottom-color: var(--zc-surface, #fff);
        margin-bottom: -1px;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-panes {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-pane {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        padding: 10px 12px 14px;
        font-size: 0.94rem;
        display: none;
      }
      #zcAfTextAnalysisOverlay .zc-af-ta-pane.is-active {
        display: block;
      }
    `;
    document.head.appendChild(s);
  }

  function ensureOverlay() {
    if (document.getElementById("afModalOverlay")) return;
    const wrap = document.createElement("div");
    wrap.id = "afModalOverlay";
    wrap.className = "af-modal-overlay";
    wrap.setAttribute("aria-hidden", "true");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "afModalTitle");
    wrap.innerHTML = `
      <div class="af-modal-panel popup-box zc-comment-popup-box" onclick="event.stopPropagation();">
        <div class="zc-comment-popup-header af-modal-head">
          <button type="button" id="afModalCtxMenu"
            class="zc-comment-popup-iconbtn zc-popup-ctx-tab"
            data-zc-opens-selection-ctx="1"
            onclick="return window.zcShowSelectionContextMenuFromMot && window.zcShowSelectionContextMenuFromMot(this);"
            title="Menu contextuel" aria-label="Menu contextuel">
            <span class="zc-top-action-ico" aria-hidden="true">☰</span>
          </button>
          <h3 id="afModalTitle" class="zc-comment-popup-title af-modal-title"></h3>
          <button type="button" id="afModalClose" class="zc-comment-popup-iconbtn" aria-label="Fermer" title="Fermer">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div id="zcAfModalActionsPanel" class="toolbar1 zc-module-panel zc-af-actions-panel"
          data-zc-defer-collapse-init="1" data-zc-no-toolbar-autocollapse="1" data-zc-tab-id-prefix="tipAf__">
          <div class="Modules zc-module-head">
            <span id="afModalActionsRailTitle" class="zc-comment-popup-actions-head-title">Actions</span>
            <span class="zc-module-tab-icons"></span>
          </div>
          <div class="toolbar zc-panel-soura-inner zc-module-toolbar-inner zc-af-actions-toolbar zc-module-actions-list">
            <button type="button" class="menu-button active zc-top-action-btn af-btn af-btn-icon af-btn-primary zc-comment-popup-action-tile" id="afModalSend" title="" aria-label="">
              <span class="zc-top-action-ico" aria-hidden="true"><i class="fas fa-paper-plane"></i></span>
              <span class="zc-top-action-label" id="afModalSend-label">Envoyer</span>
              <span class="zc-sr-only" id="afModalSend-sr">Envoyer vers le forum</span>
            </button>
            <button type="button" class="menu-button active zc-top-action-btn af-btn af-btn-icon af-btn-danger zc-comment-popup-action-tile" id="afModalDelete" style="display:none;" title="" aria-label="">
              <span class="zc-top-action-ico" aria-hidden="true"><i class="fas fa-trash-alt"></i></span>
              <span class="zc-top-action-label" id="afModalDelete-label">Supprimer</span>
              <span class="zc-sr-only" id="afModalDelete-sr">Supprimer la note</span>
            </button>
            <button type="button" id="afModalOpenCommentaires" class="menu-button active zc-top-action-btn zc-popup-tool-btn af-modal-open-comments-btn zc-comment-popup-action-tile" title="" aria-label="">
              <span class="zc-top-action-ico af-modal-open-comments-ico" aria-hidden="true">✍️</span>
              <span class="zc-top-action-label" id="afModalOpenCommentaires-label">Commentaires</span>
            </button>
            <button type="button" id="afModalOpenForum" class="menu-button active zc-top-action-btn zc-title-sync-btn zc-comment-popup-action-tile" title="" aria-label="">
              <span class="zc-top-action-ico" aria-hidden="true"><i class="fas fa-comment-alt"></i></span>
              <span class="zc-top-action-label zc-title-sync-label" id="afModalOpenForum-label">Forum</span>
              <span id="afModalForumBadge" class="zc-forum-msg-badge" aria-live="polite"></span>
            </button>
            <button type="button" id="afModalBodyTtsListen" class="menu-button active zc-top-action-btn zc-popup-tool-btn zc-comment-popup-action-tile" title="" aria-label="">
              <span class="zc-top-action-ico" aria-hidden="true"><i class="fas fa-volume-up"></i></span>
              <span class="zc-top-action-label" id="afModalBodyTtsListen-label">Lire</span>
            </button>
            <button type="button" id="afModalBodyTtsFirebase" class="menu-button active zc-top-action-btn zc-popup-tool-btn zc-comment-popup-action-tile" title="" aria-label="">
              <span class="zc-top-action-ico" aria-hidden="true"><i class="fas fa-cloud-upload-alt"></i></span>
              <span class="zc-top-action-label" id="afModalBodyTtsFirebase-label">MP3</span>
            </button>
            <button type="button" id="afModalBodyAnalyze" class="menu-button active zc-top-action-btn zc-popup-tool-btn zc-comment-popup-action-tile" title="" aria-label="">
              <span class="zc-top-action-ico" aria-hidden="true"><i class="fas fa-chart-line"></i></span>
              <span class="zc-top-action-label" id="afModalBodyAnalyze-label">Analyse</span>
            </button>
            <button type="button" id="afModalHelp" class="menu-button active zc-top-action-btn af-btn af-btn-icon zc-comment-popup-action-tile" aria-label="Aide" title="Aide">?</button>
          </div>
        </div>
        <input type="file" id="afModalMesNoteAudioFileInput"
          accept=".m4a,.mp3,.wav,.aac,.caf,.flac,.ogg,.opus,.webm,audio/mp4,audio/x-m4a,audio/m4a,audio/mpeg,audio/aac,audio/x-aac,audio/wav,audio/x-wav,audio/webm,audio/ogg,audio/opus,audio/flac,audio/x-caf,audio/caf"
          style="position:absolute;width:0.01px;height:0.01px;opacity:0;overflow:hidden;z-index:-1;" tabindex="-1" aria-hidden="true" />
        <div class="af-modal-body-grow">
        <div class="af-modal-fields">
          <div class="af-title-toolbar-row af-title-toolbar-row--subject">
            <label for="afModalTitleIn" id="afModalSubjectFieldLabel" class="af-title-field-label">Sujet</label>
            <div class="af-subject-toolbar-tail">
              <button type="button" id="afModalSubjectTranslitBtn" class="zc-popup-tool-btn af-subject-translit-btn"
                title="Translitérer" aria-label="Translitérer">
                <span aria-hidden="true">🔁</span>
                <span class="zc-sr-only" id="afModalSubjectTranslitBtn-sr">Translitérer</span>
              </button>
              <button type="button" id="afModalSubjectInsertVersesBtn" class="zc-popup-tool-btn af-subject-insert-verses-btn"
                title="" aria-label="">
                <span class="zc-top-action-ico" aria-hidden="true"><i class="fas fa-book-open"></i></span>
                <span class="zc-sr-only" id="afModalSubjectInsertVersesBtn-sr">Versets</span>
              </button>
              <label class="af-private-row">
                <input type="checkbox" id="afModalPrivate" checked />
                <span id="afModalPrivateLabel" class="af-modal-private-label" aria-live="polite"></span>
              </label>
              <span id="afModalRepliesWrap" class="af-modal-replies-wrap" style="display:none;">
                <a href="#" id="afModalRepliesLink" class="af-modal-replies-link"></a>
              </span>
              <button type="button" id="afModalSubjectStoredMp3" class="af-modal-stored-mp3-btn" style="display:none;">
                <i class="fas fa-volume-up" aria-hidden="true"></i>
                <span id="afModalSubjectStoredMp3-label"></span>
              </button>
            </div>
            <!-- Les boutons × / copier sont désormais À L'INTÉRIEUR du champ (zc-search-wrap). -->
          </div>
          <div class="af-modal-title-field-wrap zc-search-wrap">
            <button type="button" id="afModalTitleClearInline" class="zc-search-clear is-hidden"
              title="Effacer le sujet" aria-label="Effacer le sujet">✕</button>
            <input type="text" id="afModalTitleIn" class="zc-ui-search-field" maxlength="500" autocomplete="off" spellcheck="true" />
            <div id="afModalTitleSuggestCount" aria-live="polite" style="display:none;font-size:12px;color:var(--zc-text-muted);padding:2px 0 0;"></div>
            <ul id="afModalTitleSuggest" class="suggestions-liste" role="listbox" style="display: none;" aria-hidden="true"></ul>
          </div>
          <div class="af-title-toolbar-row af-body-toolbar-row">
            <label for="afModalBody" class="af-title-field-label">Texte</label>
            <div class="af-body-toolbar-tail">
              <span id="afModalTitleTranscribeLang" class="zc-transcribe-lang-wrap" role="group"
                title="Langue de reconnaissance pour la dictée" aria-label="Langue de reconnaissance pour la dictée">
                <button type="button" class="zc-transcribe-lang-btn" data-zc-reco-lang="fr-FR" data-zc-lang-key="fr"
                  title="Français" aria-pressed="false">FR</button>
                <button type="button" class="zc-transcribe-lang-btn" data-zc-reco-lang="ar-SA" data-zc-lang-key="ar"
                  title="العربية" aria-pressed="false">ع</button>
                <button type="button" class="zc-transcribe-lang-btn" data-zc-reco-lang="es-ES" data-zc-lang-key="es"
                  title="Español" aria-pressed="false">ES</button>
                <button type="button" class="zc-transcribe-lang-btn" data-zc-reco-lang="en-US" data-zc-lang-key="en"
                  title="English" aria-pressed="false">EN</button>
                <button type="button" class="zc-transcribe-lang-btn" data-zc-reco-lang="fr-FR" data-zc-lang-key="kab"
                  title="Taqbaylit (dictée en français)" aria-pressed="false">Kab</button>
                <button type="button" id="afModalMesNoteAudioFileBtn" class="zc-transcribe-lang-btn zc-mesnote-audio-file-btn"
                  title="Choisir un fichier audio sur l’appareil (transcription)" aria-label="Choisir un fichier audio">
                  <i class="fas fa-folder-open" aria-hidden="true"></i>
                </button>
              </span>
              <button type="button" id="afModalTitleTranscribeInline" class="zc-af-modal-transcribe-btn"
                title="Transcription vocale" aria-label="Transcription vocale" aria-pressed="false">
                <i class="fas fa-microphone" aria-hidden="true"></i>
              </button>
            </div>
            <!-- Les boutons × / copier sont désormais À L'INTÉRIEUR du textarea (zc-search-wrap--textarea). -->
          </div>
          <div class="zc-search-wrap zc-search-wrap--textarea">
            <button type="button" id="afModalBodyClearInline" class="zc-search-clear is-hidden"
              title="Effacer le texte" aria-label="Effacer le texte">✕</button>
            <textarea id="afModalBody" class="zc-ui-search-field" maxlength="${AF_BODY_MAX_LEN}" spellcheck="true"></textarea>
            <button type="button" id="afModalBodyCopyInline" class="zc-search-copy is-hidden"
              title="Copier le texte" aria-label="Copier le texte">
              <i class="fas fa-copy" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div id="afModalMsg"></div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    syncAfModalBodyMaxLengthAttr();
    try {
      if (typeof window.zcInitDeferredModulePanels === "function") {
        window.zcInitDeferredModulePanels(wrap);
      }
    } catch (e) {
      console.warn("[articles-forum-modal] zcInitDeferredModulePanels", e);
    }
  }

  /** Anciennes sessions : privé / réponses / MP3 stockés alignés à droite au-dessus du champ Sujet. */
  function ensureAfModalSubjectInsertVersesBtnMarkup() {
    if (document.getElementById("afModalSubjectInsertVersesBtn")) return;
    const translitBtn = document.getElementById("afModalSubjectTranslitBtn");
    if (!translitBtn || !translitBtn.parentNode) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "afModalSubjectInsertVersesBtn";
    btn.className = "zc-popup-tool-btn af-subject-insert-verses-btn";
    btn.innerHTML =
      '<span class="zc-top-action-ico" aria-hidden="true"><i class="fas fa-book-open"></i></span>' +
      '<span class="zc-sr-only" id="afModalSubjectInsertVersesBtn-sr">Versets</span>';
    translitBtn.insertAdjacentElement("afterend", btn);
  }

  /** Anciennes sessions : privé / réponses / MP3 stocké alignés à droite au-dessus du champ Sujet. */
  function ensureAfModalSubjectToolbarTail() {
    const row = document.querySelector("#afModalOverlay .af-title-toolbar-row--subject");
    if (!row) return;
    ensureAfModalSubjectInsertVersesBtnMarkup();
    let tail = row.querySelector(".af-subject-toolbar-tail");
    const translitBtn = document.getElementById("afModalSubjectTranslitBtn");
    const insertVersesBtn = document.getElementById("afModalSubjectInsertVersesBtn");
    const priv = row.querySelector("label.af-private-row");
    const replies = document.getElementById("afModalRepliesWrap");
    const storedMp3 = document.getElementById("afModalSubjectStoredMp3");
    if (!tail) {
      tail = document.createElement("div");
      tail.className = "af-subject-toolbar-tail";
      if (translitBtn && translitBtn.parentNode) tail.appendChild(translitBtn);
      if (insertVersesBtn && insertVersesBtn.parentNode) tail.appendChild(insertVersesBtn);
      if (priv && priv.parentNode) tail.appendChild(priv);
      if (replies && replies.parentNode) tail.appendChild(replies);
      if (storedMp3 && storedMp3.parentNode) tail.appendChild(storedMp3);
      row.appendChild(tail);
    } else {
      const order = [translitBtn, insertVersesBtn, priv, replies, storedMp3];
      for (let i = 0; i < order.length; i++) {
        const el = order[i];
        if (!el || !el.parentNode) continue;
        tail.appendChild(el);
      }
    }
    ensureAfModalBodyToolbarTail();
  }

  /** Langues dictée + dossier + micro à droite de la ligne Texte (migre l’ancien markup si besoin). */
  function ensureAfModalBodyToolbarTail() {
    const row = document.querySelector("#afModalOverlay .af-body-toolbar-row");
    if (!row) return;
    let tail = row.querySelector(".af-body-toolbar-tail");
    if (!tail) {
      tail = document.createElement("div");
      tail.className = "af-body-toolbar-tail";
      row.appendChild(tail);
    }
    const lang = document.getElementById("afModalTitleTranscribeLang");
    const mic = document.getElementById("afModalTitleTranscribeInline");
    if (lang) tail.appendChild(lang);
    if (mic) tail.appendChild(mic);
  }

  /** Ancien markup : input titre sans liste — insère wrap + ul suggestions. */
  function ensureAfModalTitleFieldMarkup() {
    if (document.getElementById("afModalTitleSuggest")) return;
    const input = document.getElementById("afModalTitleIn");
    if (!input || !input.parentNode) return;
    const wrap = document.createElement("div");
    wrap.className = "af-modal-title-field-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const cnt = document.createElement("div");
    cnt.id = "afModalTitleSuggestCount";
    cnt.setAttribute("aria-live", "polite");
    cnt.style.cssText = "display:none;font-size:12px;color:var(--zc-text-muted);padding:2px 0 0;";
    wrap.appendChild(cnt);
    const ul = document.createElement("ul");
    ul.id = "afModalTitleSuggest";
    ul.className = "suggestions-liste";
    ul.style.display = "none";
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-hidden", "true");
    wrap.appendChild(ul);
  }

  function docTimestampMs(data) {
    if (!data || !data.timestamp) return 0;
    const t = data.timestamp;
    try {
      if (typeof t.toMillis === "function") return t.toMillis();
    } catch (_) { }
    if (typeof t.seconds === "number") return t.seconds * 1000;
    return 0;
  }

  function subjectKeyForSuggest(sujet) {
    if (typeof window.forumNormalizeSubjectKey === "function") {
      return window.forumNormalizeSubjectKey(sujet);
    }
    return String(sujet || "")
      .trim()
      .toLowerCase();
  }

  function extractSubjectsFromForumSnap(snap) {
    const rows = [];
    snap.forEach(function (doc) {
      rows.push({ id: doc.id, data: doc.data() });
    });
    rows.sort(function (a, b) {
      return docTimestampMs(b.data) - docTimestampMs(a.data);
    });
    const byKey = new Map();
    for (let i = 0; i < rows.length; i++) {
      const sujet = String(rows[i].data.sujet || "").trim();
      if (!sujet) continue;
      const key = subjectKeyForSuggest(sujet);
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, sujet);
    }
    return Array.from(byKey.values());
  }

  function suggestUiStrings() {
    const lc = getAfModalLang();
    if (lc === "en") {
      return {
        loading: "Loading your topics…",
        empty: "No thread title yet for your account.",
        none: "No match.",
        aria: "Suggestions: your forum thread titles"
      };
    }
    if (lc === "ar") {
      return {
        loading: "جاري تحميل عناوينك…",
        empty: "لا عنوان نقاش بعد لهذا الحساب.",
        none: "لا يوجد تطابق.",
        aria: "اقتراحات: عناوين نقاشاتك في المنتدى"
      };
    }
    if (lc === "es") {
      return {
        loading: "Cargando sus títulos…",
        empty: "Aún no hay título de hilo para su cuenta.",
        none: "Sin coincidencias.",
        aria: "Sugerencias: títulos de sus hilos en el foro"
      };
    }
    return {
      loading: "Chargement de vos titres…",
      empty: "Aucun titre de fil pour votre compte pour l’instant.",
      none: "Aucune correspondance.",
      aria: "Suggestions : titres de vos fils sur le forum"
    };
  }

  async function loadAuthorForumSubjects() {
    const auth = typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser;
    const email = auth && auth.email ? String(auth.email).trim().toLowerCase() : "";
    if (!email) return [];

    const now = Date.now();
    if (
      authorSubjectsCache.mail === email &&
      Array.isArray(authorSubjectsCache.subjects) &&
      now - authorSubjectsCache.at < AUTHOR_SUBJECTS_TTL_MS
    ) {
      return authorSubjectsCache.subjects;
    }

    if (typeof db === "undefined" || !db.collection) {
      return authorSubjectsCache.mail === email ? authorSubjectsCache.subjects || [] : [];
    }

    try {
      const snap = await db.collection("forumMessages").where("mail", "==", email).limit(160).get();
      const list = extractSubjectsFromForumSnap(snap);
      authorSubjectsCache = { mail: email, at: Date.now(), subjects: list };
      return list;
    } catch (e) {
      console.warn("[articles-forum-modal] sujets auteur", e);
      return [];
    }
  }

  function hideAfTitleSuggest() {
    const ul = document.getElementById("afModalTitleSuggest");
    if (ul) {
      ul.style.display = "none";
      ul.setAttribute("aria-hidden", "true");
      ul.innerHTML = "";
    }
    const cnt = document.getElementById("afModalTitleSuggestCount");
    if (cnt) {
      cnt.textContent = "";
      cnt.style.display = "none";
    }
  }

  function setAfTitleSuggestCount(found, total) {
    const cnt = document.getElementById("afModalTitleSuggestCount");
    if (!cnt) return;
    const f = typeof found === "number" ? found : 0;
    const t = typeof total === "number" ? total : 0;
    cnt.textContent = `${f} / ${t}`;
    cnt.style.display = "block";
  }

  function filterSubjectsForQuery(all, q) {
    const needle = String(q || "")
      .trim()
      .toLowerCase();
    if (!needle) return all.slice();
    return all.filter(function (s) {
      return String(s).toLowerCase().indexOf(needle) !== -1;
    });
  }

  function renderAfTitleSuggest() {
    const ul = document.getElementById("afModalTitleSuggest");
    const input = document.getElementById("afModalTitleIn");
    if (!ul || !input) return;

    const S = suggestUiStrings();
    ul.setAttribute("aria-label", S.aria);

    if (titleSuggestLoading) {
      const cnt0 = document.getElementById("afModalTitleSuggestCount");
      if (cnt0) {
        cnt0.textContent = "";
        cnt0.style.display = "none";
      }
      ul.innerHTML = '<li class="empty" style="cursor:default;color:var(--zc-text-muted);">' + esc(S.loading) + "</li>";
      ul.style.display = "block";
      ul.setAttribute("aria-hidden", "false");
      return;
    }

    const all = Array.isArray(authorSubjectsCache.subjects) ? authorSubjectsCache.subjects : [];
    const filtered = filterSubjectsForQuery(all, input.value);

    if (!all.length) {
      setAfTitleSuggestCount(0, 0);
      ul.innerHTML = '<li class="empty" style="cursor:default;color:var(--zc-text-muted);">' + esc(S.empty) + "</li>";
      ul.style.display = "block";
      ul.setAttribute("aria-hidden", "false");
      return;
    }

    if (!filtered.length) {
      setAfTitleSuggestCount(0, all.length);
      ul.innerHTML = '<li class="empty" style="cursor:default;color:var(--zc-text-muted);">' + esc(S.none) + "</li>";
      ul.style.display = "block";
      ul.setAttribute("aria-hidden", "false");
      return;
    }

    setAfTitleSuggestCount(filtered.length, all.length);
    ul.innerHTML = "";
    const max = 24;
    const slice = filtered.slice(0, max);
    for (let i = 0; i < slice.length; i++) {
      const s = slice[i];
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.className = "af-title-suggest-item";
      li.style.textAlign = "left";
      li.textContent = s;
      li.addEventListener("mousedown", function (ev) {
        ev.preventDefault();
        applyAfTitleSuggestion(s);
      });
      ul.appendChild(li);
    }
    ul.style.display = "block";
    ul.setAttribute("aria-hidden", "false");
  }

  function pickFirstAfTitleSuggestion() {
    const ul = document.getElementById("afModalTitleSuggest");
    if (!ul || ul.style.display === "none") return;
    const li = ul.querySelector("li.af-title-suggest-item");
    if (!li) return;
    applyAfTitleSuggestion(li.textContent || "");
  }

  function applyAfTitleSuggestion(sujet) {
    const input = document.getElementById("afModalTitleIn");
    if (!input) return;
    afSuppressNextTitleInputConfirm = true;
    input.value = sujet;
    hideAfTitleSuggest();
    lastLookupKey = "";
    afOpenEditFromTitleSuggest = true;
    try {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (_) { }
    // Même pattern que pour #mot et #mediaMot : retirer le focus puis forcer la fermeture
    // des suggestions après le dispatch (le listener input pourrait sinon les rouvrir via
    // runAfTitleInputSideEffects → renderAfTitleSuggest).
    try { input.blur(); } catch (_) { }
    hideAfTitleSuggest();
    clearTimeout(titleDebounce);
    titleDebounce = setTimeout(onTitleLookup, 320);
  }

  /** Anciennes sessions : le libellé dynamique sans id — répare le markup sans recréer toute la modale. */
  function ensureAfModalPrivateMarkup() {
    const row = document.querySelector("#afModalOverlay label.af-private-row");
    if (!row) return;
    if (document.getElementById("afModalPrivateLabel")) return;
    const oldCb = document.getElementById("afModalPrivate");
    const checked = oldCb ? !!oldCb.checked : true;
    row.innerHTML =
      '<input type="checkbox" id="afModalPrivate"' +
      (checked ? " checked" : "") +
      " />" +
      '<span id="afModalPrivateLabel" class="af-modal-private-label" aria-live="polite"></span>';
  }

  /** Anciennes sessions : compteur réponses + lien lecture forum à côté du privé/public. */
  function ensureAfModalRepliesMarkup() {
    if (!document.getElementById("afModalRepliesWrap")) {
      const priv = document.querySelector("#afModalOverlay .af-title-toolbar-row--subject label.af-private-row");
      if (!priv || !priv.parentNode) return;
      const actions = priv.parentNode.querySelector(".af-field-actions-inline");
      const w = document.createElement("span");
      w.id = "afModalRepliesWrap";
      w.className = "af-modal-replies-wrap";
      w.style.display = "none";
      const a = document.createElement("a");
      a.id = "afModalRepliesLink";
      a.href = "#";
      a.className = "af-modal-replies-link";
      w.appendChild(a);
      if (actions) priv.parentNode.insertBefore(w, actions);
      else priv.after(w);
    }
    ensureAfModalStoredMp3ButtonMarkup();
  }

  /** Anciennes sessions : bouton lecture MP3 Firebase à côté du lien Réponses. */
  function ensureAfModalStoredMp3ButtonMarkup() {
    if (document.getElementById("afModalSubjectStoredMp3")) return;
    const repliesWrap = document.getElementById("afModalRepliesWrap");
    if (!repliesWrap || !repliesWrap.parentNode) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "afModalSubjectStoredMp3";
    btn.className = "af-modal-stored-mp3-btn";
    btn.style.display = "none";
    btn.innerHTML =
      '<i class="fas fa-volume-up" aria-hidden="true"></i> ' +
      '<span id="afModalSubjectStoredMp3-label"></span>';
    repliesWrap.after(btn);
    syncAfModalStoredMp3BtnLabels();
  }

  function syncAfModalStoredMp3BtnLabels() {
    const lc = getAfModalLang();
    const W = AF_MODAL_STORED_MP3[lc] || AF_MODAL_STORED_MP3.fr;
    const btn = document.getElementById("afModalSubjectStoredMp3");
    const lab = document.getElementById("afModalSubjectStoredMp3-label");
    if (btn) {
      btn.title = W.title;
      btn.setAttribute("aria-label", W.title);
    }
    if (lab) lab.textContent = W.label;
  }

  function scheduleRefreshAfModalStoredMp3Btn() {
    try {
      if (afStoredMp3DebounceTimer) clearTimeout(afStoredMp3DebounceTimer);
    } catch (_) {}
    afStoredMp3DebounceTimer = setTimeout(function () {
      afStoredMp3DebounceTimer = null;
      void refreshAfModalStoredMp3Btn();
    }, 220);
  }

  async function refreshAfModalStoredMp3Btn() {
    const token = ++afStoredMp3ReqGen;
    const btn = document.getElementById("afModalSubjectStoredMp3");
    if (!btn) return;
    const title = String(document.getElementById("afModalTitleIn")?.value || "").trim();
    if (!title) {
      btn.style.display = "none";
      return;
    }
    if (typeof window.zcCheckMesNoteStoredMp3Exists !== "function") {
      btn.style.display = "none";
      return;
    }
    let exists = false;
    try {
      exists = !!(await window.zcCheckMesNoteStoredMp3Exists(title));
    } catch (_) {
      exists = false;
    }
    if (token !== afStoredMp3ReqGen) return;
    btn.style.display = exists ? "inline-flex" : "none";
  }

  function updateAfModalRepliesUi() {
    ensureAfModalRepliesMarkup();
    const wrap = document.getElementById("afModalRepliesWrap");
    const a = document.getElementById("afModalRepliesLink");
    if (!wrap || !a) return;
    const id = String(afEditTargetId || "").trim();
    if (!id) {
      wrap.style.display = "none";
      return;
    }
    const lc = getAfModalLang();
    const R = AF_MODAL_REPLIES[lc] || AF_MODAL_REPLIES.fr;
    const n = Number(afResolvedReplyCount) || 0;
    a.textContent = R.prefix.replace("%n", String(n));
    a.title = R.openRead;
    a.setAttribute("aria-label", R.openRead);
    wrap.style.display = "";
    a.classList.remove("af-modal-replies-link--disabled");
  }

  async function refreshAfModalReplyCountFromFirestore(msgId) {
    const id = String(msgId || "").trim();
    if (!id) {
      afResolvedReplyCount = 0;
      updateAfModalRepliesUi();
      return;
    }
    try {
      if (typeof db === "undefined" || !db.collection) {
        afResolvedReplyCount = 0;
        updateAfModalRepliesUi();
        return;
      }
      const snap = await db.collection("forumMessages").doc(id).get();
      if (!snap.exists) afResolvedReplyCount = 0;
      else {
        const d = snap.data() || {};
        afResolvedReplyCount = Array.isArray(d.reponses) ? d.reponses.length : 0;
      }
      updateAfModalRepliesUi();
    } catch (e) {
      console.warn("[articles-forum-modal] reply count", e);
      afResolvedReplyCount = 0;
      updateAfModalRepliesUi();
    }
  }

  /** Anciennes sessions : bouton « ? » sans structure icône + libellé (onglets / barre). */
  function ensureAfModalHelpButtonMarkup() {
    const hBtn = document.getElementById("afModalHelp");
    if (!hBtn || hBtn.querySelector(".zc-top-action-ico")) return;
    hBtn.className =
      "menu-button active zc-top-action-btn af-btn af-btn-icon zc-popup-tool-btn zc-comment-popup-action-tile";
    hBtn.innerHTML =
      '<span class="zc-top-action-ico" aria-hidden="true">?</span>' +
      '<span class="zc-top-action-label" id="afModalHelp-label"></span>';
  }

  /** Anciennes sessions : bouton « Forum » dans le rail Actions. */
  function ensureAfModalOpenForumButtonMarkup() {
    if (document.getElementById("afModalOpenForum")) return;
    const tb = document.querySelector("#zcAfModalActionsPanel .zc-af-actions-toolbar");
    if (!tb) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "afModalOpenForum";
    btn.className =
      "menu-button active zc-top-action-btn zc-title-sync-btn zc-comment-popup-action-tile";
    btn.innerHTML =
      '<span class="zc-top-action-ico" aria-hidden="true"><i class="fas fa-comment-alt"></i></span>' +
      '<span class="zc-top-action-label zc-title-sync-label" id="afModalOpenForum-label">Forum</span>' +
      '<span id="afModalForumBadge" class="zc-forum-msg-badge" aria-live="polite"></span>';
    const ref = document.getElementById("afModalOpenCommentaires");
    if (ref && ref.parentNode) ref.insertAdjacentElement("afterend", btn);
    else tb.appendChild(btn);
  }

  /** Bouton Analyse (source : champ Texte) — ajouté si absent (sessions sans le markup à jour). */
  function ensureAfModalBodyAnalyzeButtonMarkup() {
    if (document.getElementById("afModalBodyAnalyze")) return;
    const tb = document.querySelector("#zcAfModalActionsPanel .zc-af-actions-toolbar");
    if (!tb) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "afModalBodyAnalyze";
    btn.className =
      "menu-button active zc-top-action-btn zc-popup-tool-btn zc-comment-popup-action-tile";
    btn.innerHTML =
      '<span class="zc-top-action-ico" aria-hidden="true"><i class="fas fa-chart-line"></i></span>' +
      '<span class="zc-top-action-label" id="afModalBodyAnalyze-label">Analyse</span>';
    const help = document.getElementById("afModalHelp");
    if (help && help.parentNode) help.parentNode.insertBefore(btn, help);
    else tb.appendChild(btn);
  }

  /** Anciennes sessions : boutons Lire / MP3 dans le rail Actions (plus dans le champ Texte). */
  function ensureAfModalTtsRailButtonsMarkup() {
    const tb = document.querySelector("#zcAfModalActionsPanel .zc-af-actions-toolbar");
    if (!tb) {
      ensureAfModalBodyAnalyzeButtonMarkup();
      return;
    }
    if (!document.getElementById("afModalBodyTtsListen")) {
      const listen = document.createElement("button");
      listen.type = "button";
      listen.id = "afModalBodyTtsListen";
      listen.className =
        "menu-button active zc-top-action-btn zc-popup-tool-btn zc-comment-popup-action-tile";
      listen.innerHTML =
        '<span class="zc-top-action-ico" aria-hidden="true"><i class="fas fa-volume-up"></i></span>' +
        '<span class="zc-top-action-label" id="afModalBodyTtsListen-label">Lire</span>';
      const mp3 = document.createElement("button");
      mp3.type = "button";
      mp3.id = "afModalBodyTtsFirebase";
      mp3.className =
        "menu-button active zc-top-action-btn zc-popup-tool-btn zc-comment-popup-action-tile";
      mp3.innerHTML =
        '<span class="zc-top-action-ico" aria-hidden="true"><i class="fas fa-cloud-upload-alt"></i></span>' +
        '<span class="zc-top-action-label" id="afModalBodyTtsFirebase-label">MP3</span>';
      const help = document.getElementById("afModalHelp");
      if (help && help.parentNode) {
        help.parentNode.insertBefore(mp3, help);
        help.parentNode.insertBefore(listen, mp3);
      } else {
        tb.appendChild(listen);
        tb.appendChild(mp3);
      }
    }
    ensureAfModalBodyAnalyzeButtonMarkup();
  }

  function removeLegacyTtsButtonsBesideBodyField() {
    const wrap = document.querySelector("#afModalOverlay .zc-search-wrap--textarea");
    if (!wrap) return;
    ["afModalBodyTtsListen", "afModalBodyTtsFirebase"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el && wrap.contains(el)) el.remove();
    });
  }

  function refreshTitles() {
    ensureAfModalHelpButtonMarkup();
    ensureAfModalOpenForumButtonMarkup();
    removeLegacyTtsButtonsBesideBodyField();
    ensureAfModalTtsRailButtonsMarkup();
    const t = document.getElementById("afModalTitle");
    if (t) {
      const title = "Mes Notes " + displayAuthorAt();
      t.innerHTML =
        '<span class="zc-popup-title-ico" aria-hidden="true">📝</span>' +
        '<span class="zc-popup-title-text">' + esc(title) + "</span>";
    }
    const lc = getAfModalLang();
    const railT = document.getElementById("afModalActionsRailTitle");
    if (railT) railT.textContent = AF_ACTIONS_RAIL_TITLE[lc] || AF_ACTIONS_RAIL_TITLE.fr;
    const helpAct = AF_HELP_ACTION_LABEL[lc] || AF_HELP_ACTION_LABEL.fr;
    const hBtn = document.getElementById("afModalHelp");
    const hBtnLbl = document.getElementById("afModalHelp-label");
    if (hBtn) {
      hBtn.setAttribute("title", helpAct);
      hBtn.setAttribute("aria-label", helpAct);
      hBtn.setAttribute("data-zc-tab-title", helpAct);
      if (hBtnLbl) hBtnLbl.textContent = helpAct;
    }
    const cBtn = document.getElementById("afModalClose");
    if (cBtn) {
      const closeW =
        lc === "en"
          ? "Close"
          : lc === "ar"
            ? "إغلاق"
            : lc === "kab"
              ? "Mdel"
              : lc === "es"
                ? "Cerrar"
                : "Fermer";
      cBtn.setAttribute("title", closeW);
      cBtn.setAttribute("aria-label", closeW);
    }
    syncAfModalPrivateLabel();
    updateAfModalRepliesUi();
    syncAfModalStoredMp3BtnLabels();
    scheduleRefreshAfModalStoredMp3Btn();
    syncAfSendButtonLabel();
    let subjLab = document.getElementById("afModalSubjectFieldLabel");
    if (!subjLab) {
      subjLab = document.querySelector('#afModalOverlay label[for="afModalTitleIn"].af-title-field-label');
      if (subjLab && !subjLab.id) subjLab.id = "afModalSubjectFieldLabel";
    }
    if (subjLab) {
      const S = AF_MODAL_SUBJECT_FIELD[lc] || AF_MODAL_SUBJECT_FIELD.fr;
      subjLab.textContent = S.label;
    }
    const trSubj = document.getElementById("afModalSubjectTranslitBtn");
    const trSubjSr = document.getElementById("afModalSubjectTranslitBtn-sr");
    const TRS = AF_MODAL_SUBJECT_TRANSLIT[lc] || AF_MODAL_SUBJECT_TRANSLIT.fr;
    if (trSubj) {
      trSubj.title = TRS.title;
      trSubj.setAttribute("aria-label", TRS.title);
    }
    if (trSubjSr) trSubjSr.textContent = TRS.sr;
    const ivBtn = document.getElementById("afModalSubjectInsertVersesBtn");
    const ivSr = document.getElementById("afModalSubjectInsertVersesBtn-sr");
    const IV = AF_MODAL_SUBJECT_INSERT_VERSES[lc] || AF_MODAL_SUBJECT_INSERT_VERSES.fr;
    if (ivBtn) {
      ivBtn.title = IV.title;
      ivBtn.setAttribute("aria-label", IV.title);
    }
    if (ivSr) ivSr.textContent = IV.sr;
    const anBtn = document.getElementById("afModalBodyAnalyze");
    const anLab = document.getElementById("afModalBodyAnalyze-label");
    const AN = AF_MODAL_BODY_ANALYZE[lc] || AF_MODAL_BODY_ANALYZE.fr;
    if (anBtn) {
      anBtn.title = AN.title;
      anBtn.setAttribute("aria-label", AN.title || AN.label);
      anBtn.setAttribute("data-zc-tab-title", AN.label);
    }
    if (anLab) anLab.textContent = AN.label;
    const oc = document.getElementById("afModalOpenCommentaires");
    const ocLab = document.getElementById("afModalOpenCommentaires-label");
    if (oc) {
      const W = AF_OPEN_COMMENTAIRES[lc] || AF_OPEN_COMMENTAIRES.fr;
      oc.title = W.hint;
      oc.setAttribute("aria-label", W.hint);
      if (ocLab) ocLab.textContent = W.hint;
    }
    const ofBtn = document.getElementById("afModalOpenForum");
    const ofLab = document.getElementById("afModalOpenForum-label");
    const FO = AF_OPEN_FORUM[lc] || AF_OPEN_FORUM.fr;
    if (ofBtn) {
      ofBtn.title = FO.title || "";
      ofBtn.setAttribute("aria-label", FO.ariaLabel || FO.title || "");
      if (ofLab) ofLab.textContent = FO.label || "Forum";
    }
    const wClear =
      lc === "en" ? "Clear"
        : lc === "ar" ? "مسح"
          : lc === "kab" ? "Sfeḍ"
            : lc === "es" ? "Borrar"
              : "Effacer";
    const wCopy =
      lc === "en" ? "Copy"
        : lc === "ar" ? "نسخ"
          : lc === "kab" ? "Nɣel"
            : lc === "es" ? "Copiar"
              : "Copier";
    const wSubject =
      lc === "en" ? "Subject"
        : lc === "ar" ? "الموضوع"
          : lc === "kab" ? "Asentel"
            : lc === "es" ? "Asunto"
              : "Sujet";
    const wText =
      lc === "en" ? "Text"
        : lc === "ar" ? "النص"
          : lc === "kab" ? "Aḍris"
            : lc === "es" ? "Texto"
              : "Texte";
    const tci = document.getElementById("afModalTitleClearInline");
    const bci = document.getElementById("afModalBodyClearInline");
    const bcoi = document.getElementById("afModalBodyCopyInline");
    if (tci) { tci.title = `${wClear} ${wSubject}`; tci.setAttribute("aria-label", `${wClear} ${wSubject}`); }
    if (bci) { bci.title = `${wClear} ${wText}`; bci.setAttribute("aria-label", `${wClear} ${wText}`); }
    if (bcoi) { bcoi.title = `${wCopy} ${wText}`; bcoi.setAttribute("aria-label", `${wCopy} ${wText}`); }
    const tcl = document.getElementById("afModalTitleClear-label");
    const tcpl = document.getElementById("afModalTitleCopy-label");
    const bcl = document.getElementById("afModalBodyClear-label");
    const bcpl = document.getElementById("afModalBodyCopy-label");
    if (tcl) tcl.textContent = `${wClear} ${wSubject}`;
    if (tcpl) tcpl.textContent = `${wCopy} ${wSubject}`;
    if (bcl) bcl.textContent = `${wClear} ${wText}`;
    if (bcpl) bcpl.textContent = `${wCopy} ${wText}`;
    try {
      if (typeof window.zcSyncAfModalTranscribeTitles === "function") window.zcSyncAfModalTranscribeTitles();
    } catch (_) {}
    try {
      if (typeof window.zcSyncMesNotesTtsLabels === "function") window.zcSyncMesNotesTtsLabels();
    } catch (_) {}
    try {
      const pAct = document.getElementById("zcAfModalActionsPanel");
      if (pAct && typeof window.zcSyncOneModulePanelTabs === "function") {
        window.zcSyncOneModulePanelTabs(pAct);
      }
    } catch (_) { }
    syncAfModalBodyMaxLengthAttr();
  }

  /** Met à jour maxlength sur #afModalBody (sessions créées avant hausse de AF_BODY_MAX_LEN). */
  function syncAfModalBodyMaxLengthAttr() {
    const ta = document.getElementById("afModalBody");
    if (!ta) return;
    try {
      ta.setAttribute("maxlength", String(AF_BODY_MAX_LEN));
      ta.maxLength = AF_BODY_MAX_LEN;
    } catch (_) { }
  }

  function openCommentairesFromAfModal() {
    const titleIn = document.getElementById("afModalTitleIn");
    const bodyIn = document.getElementById("afModalBody");
    const tit = titleIn ? String(titleIn.value || "").trim() : "";
    const body = bodyIn ? String(bodyIn.value || "") : "";
    try {
      if (typeof window.afficherPopupCommentaire === "function") {
        window.afficherPopupCommentaire("msgForum", tit, body);
      }
    } catch (_) { }
  }

  function afCopyText(text) {
    const t = String(text == null ? "" : text);
    try {
      if (typeof window.copierTexte === "function") {
        window.copierTexte(t);
        return;
      }
    } catch (_) { }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).catch(function () { });
      }
    } catch (_) { }
  }

  function showAfModalTempMsg(text, color) {
    const t = String(text || "").trim();
    if (!t) return;
    try {
      if (typeof alertMsgBoxTemp === "function") {
        alertMsgBoxTemp(t, color || "gray", 2600);
        return;
      }
    } catch (_) { }
  }

  function cmpVerseRef(a, b) {
    if (a.s !== b.s) return a.s < b.s ? -1 : 1;
    if (a.v !== b.v) return a.v < b.v ? -1 : 1;
    return 0;
  }

  function inferMaxVerseInTab(tab, s) {
    let mx = 0;
    for (let i = 0; i < tab.length; i++) {
      const r = tab[i];
      if (!r) continue;
      if (Number(r[0]) === s) {
        const vv = Number(r[1]);
        if (Number.isFinite(vv) && vv > mx) mx = vv;
      }
    }
    return mx;
  }

  function maxVerseForSurah(s, tab) {
    if (typeof nbVers === "function") {
      const n = Number(nbVers(s));
      if (Number.isFinite(n) && n > 0) return n;
    }
    const inferred = inferMaxVerseInTab(tab, s);
    return inferred > 0 ? inferred : 286;
  }

  function clampSv(s, v, tab) {
    let ss = Math.floor(Number(s));
    if (!Number.isFinite(ss)) ss = 1;
    ss = Math.max(1, Math.min(114, ss));
    const cap = maxVerseForSurah(ss, tab);
    let vv = Math.floor(Number(v));
    if (!Number.isFinite(vv)) vv = 1;
    vv = Math.max(1, Math.min(cap, vv));
    return { s: ss, v: vv };
  }

  function verseStepForward(cur, tab) {
    const cap = maxVerseForSurah(cur.s, tab);
    if (cur.v < cap) return { s: cur.s, v: cur.v + 1 };
    if (cur.s < 114) return { s: cur.s + 1, v: 1 };
    return null;
  }

  function expandMushafRange(a, b, tab) {
    const out = [];
    let cur = { s: a.s, v: a.v };
    const end = { s: b.s, v: b.v };
    let guard = 0;
    while (guard++ < 20000) {
      out.push({ s: cur.s, v: cur.v });
      if (cmpVerseRef(cur, end) === 0) break;
      const nx = verseStepForward(cur, tab);
      if (!nx || cmpVerseRef(nx, end) > 0) break;
      cur = nx;
    }
    return out;
  }

  function parseAfSubjectVerseSpecs(subjectRaw) {
    const normalized = String(subjectRaw || "")
      .replace(/\+/g, " ")
      .trim();
    if (!normalized) return { specs: [], skipped: [] };
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const specs = [];
    const skipped = [];
    const rangeRe = /^(\d+)\.(\d+)-(\d+)\.(\d+)$/;
    /** Plage « fin » sans point sur la sourate finale : ex. 1.1-114-6 → 1.1 à 114.6 (tout le Coran jusqu’à cette ayah). */
    const rangeAltEndRe = /^(\d+)\.(\d+)-(\d{1,3})-(\d{1,3})$/;
    const singleRe = /^(\d+)\.(\d+)$/;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      let m = rangeRe.exec(t);
      if (m) {
        specs.push({
          type: "range",
          a: { s: +m[1], v: +m[2] },
          b: { s: +m[3], v: +m[4] },
          raw: t
        });
        continue;
      }
      m = rangeAltEndRe.exec(t);
      if (m) {
        specs.push({
          type: "range",
          a: { s: +m[1], v: +m[2] },
          b: { s: +m[3], v: +m[4] },
          raw: t
        });
        continue;
      }
      m = singleRe.exec(t);
      if (m) {
        specs.push({
          type: "single",
          a: { s: +m[1], v: +m[2] },
          raw: t
        });
        continue;
      }
      skipped.push(t);
    }
    return { specs, skipped };
  }

  function materializeVerseSpecs(specs, tab) {
    const flat = [];
    for (let i = 0; i < specs.length; i++) {
      const item = specs[i];
      if (item.type === "single") {
        flat.push(clampSv(item.a.s, item.a.v, tab));
        continue;
      }
      let a = clampSv(item.a.s, item.a.v, tab);
      let b = clampSv(item.b.s, item.b.v, tab);
      if (cmpVerseRef(a, b) > 0) {
        const t = a;
        a = b;
        b = t;
      }
      const chunk = expandMushafRange(a, b, tab);
      for (let j = 0; j < chunk.length; j++) flat.push(chunk[j]);
    }
    return flat;
  }

  function buildAfVerseRowMap(tab) {
    const m = new Map();
    for (let i = 0; i < tab.length; i++) {
      const r = tab[i];
      if (!r) continue;
      const s = Number(r[0]);
      const v = Number(r[1]);
      if (!Number.isFinite(s) || !Number.isFinite(v)) continue;
      m.set(s + "." + v, r);
    }
    return m;
  }

  function insertVersesFromSubjectIntoBody() {
    const lc = getAfModalLang();
    const S = AF_MODAL_SUBJECT_INSERT_VERSES[lc] || AF_MODAL_SUBJECT_INSERT_VERSES.fr;
    const titleIn = document.getElementById("afModalTitleIn");
    const bodyIn = document.getElementById("afModalBody");
    if (!titleIn || !bodyIn) return;
    if (typeof fTabVersets !== "function") {
      showAfModalTempMsg(S.noFtab, "orange");
      return;
    }
    const raw = String(titleIn.value || "");
    const parsed = parseAfSubjectVerseSpecs(raw);
    if (parsed.skipped.length) {
      showAfModalTempMsg(S.skipped(parsed.skipped.join(", ")), "orange");
    }
    if (!parsed.specs.length) {
      showAfModalTempMsg(S.noToken, "orange");
      return;
    }
    let tab;
    try {
      tab = fTabVersets();
    } catch (e) {
      showAfModalTempMsg(S.noFtab, "red");
      return;
    }
    if (!tab || !tab.length) {
      showAfModalTempMsg(S.noFtab, "orange");
      return;
    }
    const refs = materializeVerseSpecs(parsed.specs, tab);
    if (!refs.length) {
      showAfModalTempMsg(S.noToken, "orange");
      return;
    }
    const map = buildAfVerseRowMap(tab);
    const lines = [];
    for (let i = 0; i < refs.length; i++) {
      const r = refs[i];
      const key = r.s + "." + r.v;
      const row = map.get(key);
      const ar = row ? String(row[2] != null ? row[2] : "").replace(/\r/g, "").trim() : "";
      lines.push("#" + key);
      lines.push(ar || S.missingAya);
    }
    let block = lines.join("\n").trim();
    if (!block) {
      showAfModalTempMsg(S.noToken, "orange");
      return;
    }
    const prev = String(bodyIn.value || "");
    const sep = prev.trim() ? "\n\n" : "";
    let next = prev + sep + block;
    let truncated = false;
    if (next.length > AF_BODY_MAX_LEN) {
      truncated = true;
      next = next.slice(0, AF_BODY_MAX_LEN);
    }
    bodyIn.value = next;
    afDispatchFieldInput(bodyIn);
    showAfModalTempMsg(S.appended(refs.length) + (truncated ? " " + S.truncated : ""), truncated ? "orange" : "green");
  }

  let afTextAnalysisEscBound = false;

  function countArabicLetters(txt) {
    const s = String(txt || "");
    const re = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
    let n = 0;
    let m;
    while ((m = re.exec(s)) !== null) n++;
    return n;
  }

  function countLatinWordsLen2(txt) {
    const s = String(txt || "");
    const re = /[A-Za-zÀ-ÿ\u00C0-\u024F]{2,}/g;
    let n = 0;
    let m;
    while ((m = re.exec(s)) !== null) n++;
    return n;
  }

  /** Lignes seules type « #1.1 » (repères d’ayah insérés) — exclues de l’analyse Texte / MP3 sim. */
  function stripAfVerseRefHeaderLines(txt) {
    const raw = String(txt || "").replace(/\r/g, "");
    const lines = raw.split(/\n/);
    const verseLineRe = /^[ \t]*#+[ \t]*\d{1,3}\.\d{1,3}[ \t]*$/;
    const kept = [];
    for (let i = 0; i < lines.length; i++) {
      if (verseLineRe.test(lines[i])) continue;
      kept.push(lines[i]);
    }
    return kept.join("\n");
  }

  function collectAfAnalysisSegments(txt) {
    const body = stripAfVerseRefHeaderLines(txt);
    const out = [];
    const AR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]{2,}/g;
    const LAT = /[A-Za-zÀ-ÿ\u00C0-\u024F]{2,}/g;
    let m;
    while ((m = AR.exec(body)) !== null) {
      let t = m[0];
      try {
        t = t.normalize("NFC");
      } catch (_) { }
      out.push(t);
    }
    while ((m = LAT.exec(body)) !== null) out.push(m[0].toLowerCase());
    return out;
  }

  function buildAfFreqSorted(segments) {
    const map = new Map();
    for (let i = 0; i < segments.length; i++) {
      const k = segments[i];
      if (!k) continue;
      map.set(k, (map.get(k) || 0) + 1);
    }
    const rows = [];
    map.forEach(function (n, tok) {
      rows.push({ tok, n });
    });
    rows.sort(function (a, b) {
      if (b.n !== a.n) return b.n - a.n;
      return a.tok < b.tok ? -1 : a.tok > b.tok ? 1 : 0;
    });
    return rows;
  }

  function activateAfTextAnalysisTab(which) {
    const tText = document.getElementById("zcAfTaTabText");
    const tMp3 = document.getElementById("zcAfTaTabMp3");
    const pText = document.getElementById("zcAfTaPaneText");
    const pMp3 = document.getElementById("zcAfTaPaneMp3");
    const isText = which !== "mp3";
    if (tText) {
      tText.setAttribute("aria-selected", isText ? "true" : "false");
      tText.tabIndex = isText ? 0 : -1;
    }
    if (tMp3) {
      tMp3.setAttribute("aria-selected", !isText ? "true" : "false");
      tMp3.tabIndex = !isText ? 0 : -1;
    }
    if (pText) {
      pText.classList.toggle("is-active", isText);
      pText.setAttribute("aria-hidden", isText ? "false" : "true");
    }
    if (pMp3) {
      pMp3.classList.toggle("is-active", !isText);
      pMp3.setAttribute("aria-hidden", !isText ? "false" : "true");
    }
  }

  function bindAfTextAnalysisTabsOnce(root) {
    const o = root || document.getElementById("zcAfTextAnalysisOverlay");
    if (!o || o.dataset.zcAfTaTabsBound === "1") return;
    o.dataset.zcAfTaTabsBound = "1";
    document.getElementById("zcAfTaTabText")?.addEventListener("click", function (e) {
      e.preventDefault();
      activateAfTextAnalysisTab("text");
    });
    document.getElementById("zcAfTaTabMp3")?.addEventListener("click", function (e) {
      e.preventDefault();
      activateAfTextAnalysisTab("mp3");
    });
  }

  function formatAfMmSs(secFloat) {
    const s = Math.max(0, Math.floor(Number(secFloat) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function formatAfDurationHuman(sec, lc) {
    const s = Math.max(0, Math.round(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (lc === "ar") return m ? m + " د " + r + " ث" : r + " ث";
    return m ? m + " min " + r + " s" : r + " s";
  }

  function countAfMp3SilenceBlocks(norm) {
    return (String(norm).match(/\n(?:\s*\n)+/g) || []).length;
  }

  function afTextClarityHeuristic(norm, arabN) {
    const n = Math.max(1, String(norm || "").length);
    const punct = (String(norm).match(/[.,;:!?،؟…]/g) || []).length;
    const ratio = Math.min(1, punct / Math.max(8, n / 35));
    const ar = arabN / n;
    return Math.max(38, Math.min(97, Math.round(55 + ratio * 22 + (ar > 0.45 ? 12 : 0))));
  }

  function pseudoLevelForMp3SimChunk(chunk, idx) {
    let h = (idx + 1) * 1315423911;
    const s = String(chunk || "");
    for (let k = 0; k < s.length; k++) {
      h = ((h << 5) - h + s.charCodeAt(k)) | 0;
    }
    return 8 + (Math.abs(h) % 93);
  }

  function buildMp3SimChunks(norm, maxUnits) {
    const raw = String(norm || "").replace(/\r/g, "");
    const n = raw.length;
    if (!n) return [];
    const cap = Math.min(140, Math.max(24, Math.ceil(n / Math.min(maxUnits, Math.max(1, n)))));
    const out = [];
    let i = 0;
    while (i < n) {
      let j = Math.min(n, i + cap);
      if (j < n) {
        const slice = raw.slice(i, j);
        const br = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "));
        if (br > Math.floor(slice.length * 0.28)) j = i + br + 1;
      }
      const piece = raw.slice(i, j).trim();
      if (piece) out.push(piece);
      i = j;
    }
    return out;
  }

  function populateAfMp3SimPanel(norm, lc, arabN) {
    const M = AF_MP3_SIM_PANEL[lc] || AF_MP3_SIM_PANEL.fr;
    const dis = document.getElementById("zcAfMp3SimDisclaimer");
    if (dis) dis.textContent = M.disclaimer;
    const uh = document.getElementById("zcAfMp3SimUnitsH");
    if (uh) uh.textContent = M.unitsTitle;
    const thR = document.getElementById("zcAfMp3ThRange");
    const thL = document.getElementById("zcAfMp3ThLv");
    const thP = document.getElementById("zcAfMp3ThPv");
    if (thR) thR.textContent = M.thT0 + " – " + M.thT1;
    if (thL) thL.textContent = M.thLv;
    if (thP) thP.textContent = M.previewCol;

    const secTotal = estimateReadingSecondsFromText(norm);
    const cps = secTotal > 0 ? Math.round((norm.length / secTotal) * 10) / 10 : 0;
    const sil = countAfMp3SilenceBlocks(norm);
    const clar = afTextClarityHeuristic(norm, arabN);
    const chunks = buildMp3SimChunks(norm, 100);
    const durStr = formatAfDurationHuman(secTotal, lc);

    const sumUl = document.getElementById("zcAfMp3SimSummary");
    if (sumUl) {
      sumUl.innerHTML = "";
      [
        M.durEst(durStr),
        M.units(chunks.length),
        M.silences(sil),
        M.cpsHint(cps),
        M.confHint(clar)
      ].forEach(function (line) {
        const li = document.createElement("li");
        li.textContent = line;
        sumUl.appendChild(li);
      });
    }

    const tbody = document.querySelector("#zcAfMp3SimTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!chunks.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.className = "zc-af-ta-muted";
      td.textContent = M.noSegments;
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    const maxLv = Math.max.apply(
      null,
      chunks.map(function (c, i) {
        return pseudoLevelForMp3SimChunk(c, i);
      })
    );
    let tAcc = 0;
    const per = secTotal / Math.max(1, chunks.length);
    for (let i = 0; i < chunks.length; i++) {
      const t0 = tAcc;
      tAcc += per;
      const t1 = i === chunks.length - 1 ? secTotal : tAcc;
      const lv = pseudoLevelForMp3SimChunk(chunks[i], i);
      const tr = document.createElement("tr");
      const td0 = document.createElement("td");
      td0.textContent = String(i + 1);
      const tdR = document.createElement("td");
      tdR.textContent = formatAfMmSs(t0) + " – " + formatAfMmSs(t1);
      const tdBar = document.createElement("td");
      tdBar.className = "zc-af-ta-bar-cell";
      const w = Math.round((lv / maxLv) * 100);
      tdBar.innerHTML =
        '<div class="zc-af-ta-bar-track"><div class="zc-af-ta-bar-fill" style="width:' +
        w +
        '%;"></div></div>';
      const tdP = document.createElement("td");
      tdP.className = "zc-af-ta-token";
      const prev = chunks[i].length > 72 ? chunks[i].slice(0, 72) + "…" : chunks[i];
      const isAr = /[\u0600-\u06FF]/.test(prev);
      if (isAr) tdP.setAttribute("dir", "rtl");
      else tdP.removeAttribute("dir");
      tdP.textContent = prev;
      tr.appendChild(td0);
      tr.appendChild(tdR);
      tr.appendChild(tdBar);
      tr.appendChild(tdP);
      tbody.appendChild(tr);
    }
  }

  function closeAfTextAnalysisPanel() {
    activateAfTextAnalysisTab("text");
    const o = document.getElementById("zcAfTextAnalysisOverlay");
    if (!o) return;
    o.classList.remove("is-open");
    o.setAttribute("aria-hidden", "true");
  }

  function ensureAfTextAnalysisOverlay() {
    let o = document.getElementById("zcAfTextAnalysisOverlay");
    if (o) {
      const legacyRefs = o.querySelector("#zcAfTextAnalysisRefs");
      if (legacyRefs) {
        const sec = legacyRefs.closest(".zc-af-ta-section");
        if (sec) sec.remove();
      }
      if (!o.querySelector("#zcAfTaTabText")) {
        o.remove();
        o = null;
      } else {
        bindAfTextAnalysisTabsOnce(o);
        return o;
      }
    }
    o = document.createElement("div");
    o.id = "zcAfTextAnalysisOverlay";
    o.className = "zc-af-ta-overlay";
    o.setAttribute("aria-hidden", "true");
    o.innerHTML =
      '<div class="zc-af-ta-panel" role="dialog" aria-modal="true" aria-labelledby="zcAfTextAnalysisTitle">' +
      '<div class="zc-af-ta-head">' +
      '<h2 class="zc-af-ta-title" id="zcAfTextAnalysisTitle"></h2>' +
      '<button type="button" class="zc-af-ta-close" id="zcAfTextAnalysisClose" title="" aria-label="">' +
      '<span aria-hidden="true">×</span>' +
      '<span class="zc-sr-only" id="zcAfTextAnalysisClose-sr"></span>' +
      "</button></div>" +
      '<div class="zc-af-ta-main">' +
      '<div class="zc-af-ta-tabs" role="tablist">' +
      '<button type="button" class="zc-af-ta-tab" id="zcAfTaTabText" role="tab" aria-controls="zcAfTaPaneText" aria-selected="true"></button>' +
      '<button type="button" class="zc-af-ta-tab" id="zcAfTaTabMp3" role="tab" aria-controls="zcAfTaPaneMp3" aria-selected="false" tabindex="-1"></button>' +
      "</div>" +
      '<div class="zc-af-ta-panes">' +
      '<div class="zc-af-ta-pane is-active" id="zcAfTaPaneText" role="tabpanel" aria-labelledby="zcAfTaTabText" aria-hidden="false">' +
      '<div class="zc-af-ta-section"><h3 id="zcAfTextAnalysisSummaryH"></h3><ul class="zc-af-ta-kv" id="zcAfTextAnalysisSummary"></ul>' +
      '<div class="zc-af-ta-preview" id="zcAfTextAnalysisPreview" style="display:none;"></div></div>' +
      '<div class="zc-af-ta-section"><h3 id="zcAfTextAnalysisFreqH"></h3><div class="zc-af-ta-table-wrap"><table class="zc-af-ta-freq" id="zcAfTextAnalysisFreq">' +
      '<thead><tr><th>#</th><th id="zcAfTextAnalysisFreqThTok"></th><th id="zcAfTextAnalysisFreqThN"></th><th aria-hidden="true"></th></tr></thead><tbody></tbody></table></div></div>' +
      "</div>" +
      '<div class="zc-af-ta-pane" id="zcAfTaPaneMp3" role="tabpanel" aria-labelledby="zcAfTaTabMp3" aria-hidden="true">' +
      '<div class="zc-af-ta-section">' +
      '<p class="zc-af-ta-muted" id="zcAfMp3SimDisclaimer"></p>' +
      '<ul class="zc-af-ta-kv" id="zcAfMp3SimSummary"></ul>' +
      '<h3 id="zcAfMp3SimUnitsH"></h3>' +
      '<div class="zc-af-ta-table-wrap"><table class="zc-af-ta-freq" id="zcAfMp3SimTable">' +
      "<thead><tr><th>#</th><th id=\"zcAfMp3ThRange\"></th><th id=\"zcAfMp3ThLv\"></th><th id=\"zcAfMp3ThPv\"></th></tr></thead><tbody></tbody></table></div>" +
      "</div></div></div></div></div>";
    document.body.appendChild(o);
    bindAfTextAnalysisTabsOnce(o);
    o.addEventListener("click", function (ev) {
      if (ev.target === o) closeAfTextAnalysisPanel();
    });
    const btn = document.getElementById("zcAfTextAnalysisClose");
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        closeAfTextAnalysisPanel();
      });
    }
    if (!afTextAnalysisEscBound) {
      afTextAnalysisEscBound = true;
      document.addEventListener(
        "keydown",
        function (ev) {
          if (ev.key !== "Escape") return;
          const el = document.getElementById("zcAfTextAnalysisOverlay");
          if (!el || !el.classList.contains("is-open")) return;
          ev.preventDefault();
          closeAfTextAnalysisPanel();
        },
        true
      );
    }
    return o;
  }

  function populateAfTextAnalysisPanel(txt, lc) {
    const P = AF_TEXT_ANALYSIS_PANEL[lc] || AF_TEXT_ANALYSIS_PANEL.fr;
    const t = document.getElementById("zcAfTextAnalysisTitle");
    if (t) t.textContent = P.title;
    const closeBtn = document.getElementById("zcAfTextAnalysisClose");
    const closeSr = document.getElementById("zcAfTextAnalysisClose-sr");
    if (closeBtn) {
      closeBtn.title = P.close;
      closeBtn.setAttribute("aria-label", P.close);
    }
    if (closeSr) closeSr.textContent = P.closeSr;

    const sumH = document.getElementById("zcAfTextAnalysisSummaryH");
    const freqH = document.getElementById("zcAfTextAnalysisFreqH");
    if (sumH) sumH.textContent = P.summaryTitle;
    if (freqH) freqH.textContent = P.freqTitle;

    const normAn = stripAfVerseRefHeaderLines(String(txt || "").replace(/\r/g, ""));
    const lines = normAn.split(/\n/).length;
    const chars = normAn.length;
    const nonSpace = normAn.replace(/\s/g, "").length;
    const arabN = countArabicLetters(normAn);
    const latinW = countLatinWordsLen2(normAn);
    const segs = collectAfAnalysisSegments(normAn);
    const freqRows = buildAfFreqSorted(segs);
    const uniq = freqRows.length;

    const sumUl = document.getElementById("zcAfTextAnalysisSummary");
    if (sumUl) {
      sumUl.innerHTML = "";
      const items = [
        P.chars(chars),
        P.nonSpace(nonSpace),
        P.lines(lines),
        P.tokens(segs.length, uniq),
        P.arabChars(arabN),
        P.latinWords(latinW)
      ];
      for (let i = 0; i < items.length; i++) {
        const li = document.createElement("li");
        li.textContent = items[i];
        sumUl.appendChild(li);
      }
    }

    const prev = document.getElementById("zcAfTextAnalysisPreview");
    if (prev) {
      const clip = normAn.length > 480 ? normAn.slice(0, 480) + "…" : normAn;
      if (clip.trim()) {
        prev.style.display = "";
        prev.setAttribute("dir", arabN >= latinW && arabN > 0 ? "rtl" : "ltr");
        prev.textContent = P.preview + "\n" + clip;
      } else {
        prev.style.display = "none";
        prev.textContent = "";
      }
    }

    const thTok = document.getElementById("zcAfTextAnalysisFreqThTok");
    const thN = document.getElementById("zcAfTextAnalysisFreqThN");
    if (thTok) thTok.textContent = P.tokenCol;
    if (thN) thN.textContent = P.countCol;

    const table = document.getElementById("zcAfTextAnalysisFreq");
    const tbody = table && table.querySelector("tbody");
    if (tbody) {
      tbody.innerHTML = "";
      const top = freqRows;
      const maxN = top.length ? top[0].n : 1;
      if (!top.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4;
        td.className = "zc-af-ta-muted";
        td.textContent = P.noFreq;
        tr.appendChild(td);
        tbody.appendChild(tr);
      } else {
        for (let i = 0; i < top.length; i++) {
          const row = top[i];
          const tr = document.createElement("tr");
          const td1 = document.createElement("td");
          td1.textContent = String(i + 1);
          const td2 = document.createElement("td");
          td2.textContent = String(row.n);
          const tdTok = document.createElement("td");
          tdTok.className = "zc-af-ta-token";
          const isAr = /[\u0600-\u06FF]/.test(row.tok);
          if (isAr) tdTok.setAttribute("dir", "rtl");
          else tdTok.removeAttribute("dir");
          tdTok.textContent = row.tok;
          const tdBar = document.createElement("td");
          tdBar.className = "zc-af-ta-bar-cell";
          const w = Math.round((row.n / maxN) * 100);
          tdBar.innerHTML =
            '<div class="zc-af-ta-bar-track"><div class="zc-af-ta-bar-fill" style="width:' +
            w +
            '%;"></div></div>';
          tr.appendChild(td1);
          tr.appendChild(tdTok);
          tr.appendChild(td2);
          tr.appendChild(tdBar);
          tbody.appendChild(tr);
        }
      }
    }

    const Mtab = AF_MP3_SIM_PANEL[lc] || AF_MP3_SIM_PANEL.fr;
    const tabT = document.getElementById("zcAfTaTabText");
    const tabM = document.getElementById("zcAfTaTabMp3");
    if (tabT) tabT.textContent = Mtab.tabText;
    if (tabM) tabM.textContent = Mtab.tabMp3;
    populateAfMp3SimPanel(normAn, lc, arabN);
    activateAfTextAnalysisTab("text");
  }

  function openAfModalTextAnalysisPanel() {
    injectStylesOnce();
    const lc = getAfModalLang();
    const W = AF_MODAL_BODY_ANALYZE[lc] || AF_MODAL_BODY_ANALYZE.fr;
    const ta = document.getElementById("afModalBody");
    const txt = ta ? String(ta.value || "") : "";
    if (!String(txt).trim()) {
      showAfModalTempMsg(W.empty, "orange");
      return;
    }
    const o = ensureAfTextAnalysisOverlay();
    populateAfTextAnalysisPanel(txt, lc);
    o.classList.add("is-open");
    o.setAttribute("aria-hidden", "false");
    try {
      const b = document.getElementById("zcAfTextAnalysisClose");
      if (b) b.focus();
    } catch (_) { }
  }

  function runAfModalDefaultTextAnalyze() {
    openAfModalTextAnalysisPanel();
  }

  function syncAfSendButtonLabel() {
    const btn = document.getElementById("afModalSend");
    const del = document.getElementById("afModalDelete");
    const sendSr = document.getElementById("afModalSend-sr");
    const sendLbl = document.getElementById("afModalSend-label");
    const delSr = document.getElementById("afModalDelete-sr");
    const delLbl = document.getElementById("afModalDelete-label");
    if (!btn) return;
    const lc = getAfModalLang();
    const isEdit = !!afEditTargetId;
    let txt = isEdit ? "Enregistrer" : "Envoyer vers le forum";
    let delTxt = "Supprimer la note";
    let sendTitle = isEdit ? "Enregistrer cette note sur le forum" : "Publier cette note sur le forum";
    let delTitle = "Supprimer définitivement cette note";
    if (lc === "en") txt = isEdit ? "Save" : "Send to forum";
    else if (lc === "ar") txt = isEdit ? "حفظ" : "إرسال إلى المنتدى";
    else if (lc === "kab") txt = isEdit ? "Sekles" : "Azen ɣer lmunada";
    else if (lc === "es") txt = isEdit ? "Guardar" : "Enviar al foro";
    if (lc === "en") sendTitle = isEdit ? "Save this forum note" : "Publish this note to the forum";
    else if (lc === "ar") sendTitle = isEdit ? "حفظ هذه الملاحظة في المنتدى" : "نشر هذه الملاحظة في المنتدى";
    else if (lc === "kab") sendTitle = isEdit ? "Sekles tazmilt-a deg lmunada" : "Suffeɣ tazmilt-a ɣer lmunada";
    else if (lc === "es") sendTitle = isEdit ? "Guardar esta nota en el foro" : "Publicar esta nota en el foro";
    if (lc === "en") delTxt = "Delete note";
    else if (lc === "ar") delTxt = "حذف الملاحظة";
    else if (lc === "kab") delTxt = "Kkes tazmilt";
    else if (lc === "es") delTxt = "Eliminar nota";
    if (lc === "en") delTitle = "Delete this note permanently";
    else if (lc === "ar") delTitle = "حذف هذه الملاحظة نهائيًا";
    else if (lc === "kab") delTitle = "Kkes tazmilt-a i lebda";
    else if (lc === "es") delTitle = "Eliminar esta nota de forma permanente";
    if (sendSr) sendSr.textContent = txt;
    if (sendLbl) sendLbl.textContent = txt;
    btn.setAttribute("aria-label", txt);
    btn.title = sendTitle;
    const ico = btn.querySelector("i");
    if (ico) {
      ico.className = isEdit ? "fas fa-save" : "fas fa-paper-plane";
      ico.setAttribute("aria-hidden", "true");
    }
    if (del) {
      if (delSr) delSr.textContent = delTxt;
      if (delLbl) delLbl.textContent = delTxt;
      del.setAttribute("aria-label", delTxt);
      del.title = delTitle;
      del.style.display = isEdit ? "" : "none";
    }
    try {
      const pAct = document.getElementById("zcAfModalActionsPanel");
      if (pAct && typeof window.zcSyncOneModulePanelTabs === "function") {
        window.zcSyncOneModulePanelTabs(pAct);
      }
    } catch (_) { }
  }

  let titleDebounce = null;
  let lastLookupKey = "";
  let afLastResolvedSubjectKey = "";

  async function onTitleLookup() {
    const titleIn = document.getElementById("afModalTitleIn");
    const bodyIn = document.getElementById("afModalBody");
    const priv = document.getElementById("afModalPrivate");
    if (!titleIn || !bodyIn) return;

    afOpenEditFromTitleSuggest = false;

    const lcMsg = getAfModalLang();
    async function wipeBodyWithConfirm() {
      return true;
    }

    try {
      const auth = typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser;
      const email = auth && auth.email ? String(auth.email).trim().toLowerCase() : "";
      const normKey =
        typeof window.forumNormalizeSubjectKey === "function"
          ? window.forumNormalizeSubjectKey(titleIn.value)
          : "";
      const rawT = String(titleIn.value || "").trim();
      if (!email || !normKey || rawT.length < 3) {
        if (!(await wipeBodyWithConfirm())) return;
        lastLookupKey = "";
        afEditTargetId = "";
        afLastResolvedSubjectKey = "";
        afResolvedReplyCount = 0;
        updateAfModalRepliesUi();
        syncAfSendButtonLabel();
        bodyIn.value = "";
        afDispatchFieldInput(bodyIn);
        const hintShort = document.getElementById("afModalMsg");
        if (hintShort) {
          hintShort.textContent = "";
          hintShort.style.color = "";
        }
        return;
      }
      const keySig = normKey + "|" + email;
      if (keySig === lastLookupKey) return;
      lastLookupKey = keySig;

      const findFn = window.forumFindExistingTopicBySubjectKeyAndAuthor;
      if (typeof findFn !== "function") return;

      const ex = await findFn(normKey, email);
      if (!ex || !ex.id) {
        if (!(await wipeBodyWithConfirm())) {
          lastLookupKey = "";
          return;
        }
        afEditTargetId = "";
        afLastResolvedSubjectKey = "";
        afResolvedReplyCount = 0;
        updateAfModalRepliesUi();
        syncAfSendButtonLabel();
        bodyIn.value = "";
        afDispatchFieldInput(bodyIn);
        const hintNone = document.getElementById("afModalMsg");
        if (hintNone) {
          hintNone.textContent = "";
          hintNone.style.color = "";
        }
        return;
      }
      const plain =
        typeof window.forumHtmlToEditablePlain === "function"
          ? window.forumHtmlToEditablePlain(ex.data && ex.data.message)
          : String((ex.data && ex.data.message) || "").replace(/<br\s*\/?>/gi, "\n");
      const curBody = String(bodyIn.value || "");
      bodyIn.value = plain;
      afDispatchFieldInput(bodyIn);
      if (priv) priv.checked = !!(ex.data && ex.data.isPrivate === true);
      syncAfModalPrivateLabel();

      afEditTargetId = String(ex.id || "");
      afLastResolvedSubjectKey = normKey;
      afResolvedReplyCount = Array.isArray(ex.data && ex.data.reponses) ? ex.data.reponses.length : 0;
      updateAfModalRepliesUi();
      syncAfSendButtonLabel();
      const hint = document.getElementById("afModalMsg");
      if (hint) {
        hint.textContent = "";
        hint.style.color = "";
      }
    } catch (e) {
      console.warn("[articles-forum-modal] lookup titre", e);
      afResolvedReplyCount = 0;
      updateAfModalRepliesUi();
    } finally {
      captureAfModalBaseline();
      afLastStableTitleForRevert = String(titleIn.value || "");
    }
  }

  /** Mes Notes : le bloc Actions doit être replié à chaque ouverture (y compris si déjà déplié avant fermeture). */
  function collapseAfModalActionsPanelOnOpen() {
    const panel = document.getElementById("zcAfModalActionsPanel");
    if (!panel || panel.classList.contains("zc-panel-collapsed")) return;
    const btn = panel.querySelector(".zc-panel-collapse-btn");
    if (!btn) return;
    try {
      btn.click();
    } catch (_) { }
  }

  function openModal(opts) {
    opts = opts || {};
    afOpenEditFromTitleSuggest = false;
    injectStylesOnce();
    ensureOverlay();
    ensureAfModalSubjectToolbarTail();
    ensureAfModalTitleFieldMarkup();
    ensureAfModalPrivateMarkup();
    ensureAfModalRepliesMarkup();
    ensureAfModalOpenForumButtonMarkup();
    const privReset = document.getElementById("afModalPrivate");
    if (privReset) privReset.checked = true;
    const titleInOpen = document.getElementById("afModalTitleIn");
    const motOpen = document.getElementById("mot");
    if (titleInOpen && motOpen) {
      const t0 = String(titleInOpen.value || "").trim();
      const m0 = String(motOpen.value || "").trim();
      if (!t0 && m0) {
        titleInOpen.value = motOpen.value;
        try { titleInOpen.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) { }
      }
    }
    const ov = document.getElementById("afModalOverlay");
    if (!ov) return;
    try {
      if (ov.parentElement !== document.body) document.body.appendChild(ov);
    } catch (_) { }
    if (typeof window.getNextZIndex === "function") {
      ov.style.zIndex = String(window.getNextZIndex());
    }
    ov.setAttribute("data-overlay", "true");
    const msg = document.getElementById("afModalMsg");
    if (msg) {
      msg.textContent = "";
      msg.style.color = "";
    }
    afEditTargetId = String(opts.editMessageId || "").trim();
    afLastResolvedSubjectKey = "";
    afResolvedReplyCount = 0;
    const bodyIn = document.getElementById("afModalBody");
    if (bodyIn) {
      bodyIn.value = String(opts.prefillBody || "");
      const lcPh = getAfModalLang();
      bodyIn.setAttribute("placeholder", AF_MODAL_PH_BODY[lcPh] || AF_MODAL_PH_BODY.fr);
      try { bodyIn.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) { }
    }
    // Placeholder du sujet (même pattern que Mes Commentaires — phSubject).
    if (titleInOpen) {
      const lcPhT = getAfModalLang();
      titleInOpen.setAttribute("placeholder", AF_MODAL_PH_SUBJECT[lcPhT] || AF_MODAL_PH_SUBJECT.fr);
    }
    // Forcer (re)bind de la visibilité × / copier en fonction du contenu — robuste même si
    // l'observer auto de zc-utils.js a déjà été déconnecté (après 10 s de chargement).
    if (typeof window.bindSearchClearVisibility === "function") {
      [
        ["afModalTitleIn", "afModalTitleClearInline"],
        ["afModalBody", "afModalBodyClearInline"],
        ["afModalBody", "afModalBodyCopyInline"]
      ].forEach(function (pair) {
        try { window.bindSearchClearVisibility(pair[0], pair[1]); } catch (_) { }
      });
    }
    if (titleInOpen) {
      titleInOpen.value = String(opts.prefillTitle || titleInOpen.value || "");
      try { titleInOpen.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) { }
    }
    const privEl = document.getElementById("afModalPrivate");
    if (privEl && typeof opts.isPrivate === "boolean") privEl.checked = !!opts.isPrivate;
    syncAfModalPrivateLabel();
    syncAfSendButtonLabel();
    refreshTitles();
    collapseAfModalActionsPanelOnOpen();
    try {
      if (typeof window.zcResetAfModalSpeechRecoFromUi === "function") {
        window.zcResetAfModalSpeechRecoFromUi();
      }
    } catch (_) {}
    lastLookupKey = "";
    if (afEditTargetId && titleInOpen && String(titleInOpen.value || "").trim().length < 3) {
      void refreshAfModalReplyCountFromFirestore(afEditTargetId);
    } else {
      updateAfModalRepliesUi();
    }
    captureAfModalBaseline();
    afLastStableTitleForRevert = String(titleInOpen && titleInOpen.value || "");
    ov.style.display = "flex";
    ov.setAttribute("aria-hidden", "false");
    window.setTimeout(function () {
      captureAfModalBaseline();
      afLastStableTitleForRevert = String(document.getElementById("afModalTitleIn")?.value || "");
    }, 900);
    // À l'ouverture : si le sujet correspond à un fil existant, charger le texte automatiquement.
    if (titleInOpen && String(titleInOpen.value || "").trim().length >= 3) {
      clearTimeout(titleDebounce);
      titleDebounce = setTimeout(onTitleLookup, 120);
    }
    const titleFocus = document.getElementById("afModalTitleIn");
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (!titleFocus) return;
        try {
          titleFocus.focus({ preventScroll: true });
        } catch (_) {
          titleFocus.focus();
        }
        window.setTimeout(function () {
          const panel = document.getElementById("afModalOverlay");
          const sug = document.getElementById("afModalTitleSuggest");
          if (
            panel &&
            panel.style.display === "flex" &&
            document.activeElement === titleFocus &&
            sug &&
            sug.style.display === "none"
          ) {
            titleFocus.dispatchEvent(new Event("focus", { bubbles: false }));
          }
        }, 50);
      });
    });
  }

  function closeModalDo() {
    closeAfTextAnalysisPanel();
    try {
      if (typeof window.zcStopAfModalSpeechTranscription === "function") {
        window.zcStopAfModalSpeechTranscription();
      }
    } catch (_) {}
    try {
      if (typeof window.zcStopAfModalListenPlayback === "function") {
        window.zcStopAfModalListenPlayback();
      }
    } catch (_) {}
    afOpenEditFromTitleSuggest = false;
    afEditTargetId = "";
    afLastResolvedSubjectKey = "";
    afResolvedReplyCount = 0;
    updateAfModalRepliesUi();
    syncAfSendButtonLabel();
    if (titleSuggestHideTimer) {
      clearTimeout(titleSuggestHideTimer);
      titleSuggestHideTimer = null;
    }
    hideAfTitleSuggest();
    const ov = document.getElementById("afModalOverlay");
    if (!ov) return;
    ov.style.display = "none";
    ov.setAttribute("aria-hidden", "true");
  }

  async function closeModal() {
    if (isAfModalDirty()) {
      const lc = getAfModalLang();
      const msg = AF_MODAL_CONFIRM_CLOSE[lc] || AF_MODAL_CONFIRM_CLOSE.fr;
      if (!(await afModalConfirmAsync(msg))) return;
    }
    closeModalDo();
  }

  /** Effets du champ sujet : vide le corps, relance lookup (debounce) — après confirmation si besoin. */
  function runAfTitleInputSideEffects() {
    const msg = document.getElementById("afModalMsg");
    const body = document.getElementById("afModalBody");
    const titleInEl = document.getElementById("afModalTitleIn");
    if (body) {
      body.value = "";
      afDispatchFieldInput(body);
    }
    lastLookupKey = "";
    afEditTargetId = "";
    afLastResolvedSubjectKey = "";
    afResolvedReplyCount = 0;
    updateAfModalRepliesUi();
    syncAfSendButtonLabel();
    if (msg) {
      msg.textContent = "";
      msg.style.color = "";
    }
    clearTimeout(titleDebounce);
    titleDebounce = setTimeout(function () {
      void onTitleLookup();
    }, 120);
    renderAfTitleSuggest();
    if (titleInEl) afLastStableTitleForRevert = String(titleInEl.value || "");
    scheduleRefreshAfModalStoredMp3Btn();
  }

  let formBound = false;
  function bindFormOnce() {
    ensureOverlay();
    ensureAfModalSubjectToolbarTail();
    ensureAfModalTitleFieldMarkup();
    ensureAfModalPrivateMarkup();
    ensureAfModalRepliesMarkup();
    ensureAfModalSubjectToolbarTail();
    ensureAfModalOpenForumButtonMarkup();
    if (formBound) return;
    formBound = true;

    const titleIn = document.getElementById("afModalTitleIn");
    document.getElementById("afModalHelp")?.addEventListener("click", function (e) {
      e.preventDefault();
      showAfModalHelp();
    });
    document.getElementById("afModalClose")?.addEventListener("click", function (ev) {
      ev.preventDefault();
      void closeModal();
    });
    document.getElementById("afModalDelete")?.addEventListener("click", async function () {
      const id = String(afEditTargetId || "").trim();
      const msg = document.getElementById("afModalMsg");
      if (!id) return;
      let ok = false;
      try {
        if (typeof window.alertConfirm === "function") {
          ok = !!(await window.alertConfirm("Supprimer définitivement cette note ?"));
        } else if (typeof alertConfirm === "function") {
          ok = !!(await alertConfirm("Supprimer définitivement cette note ?"));
        } else {
          ok = !!window.confirm("Supprimer définitivement cette note ?");
        }
      } catch (_) {
        ok = !!window.confirm("Supprimer définitivement cette note ?");
      }
      if (!ok) return;
      try {
        if (typeof window.forumDeleteTopicFromNotes !== "function") {
          throw new Error("Suppression indisponible (rechargez la page).");
        }
        const titleInForMp3 = document.getElementById("afModalTitleIn");
        const subjectForMp3 = String(
          titleInForMp3 && titleInForMp3.value ? titleInForMp3.value : ""
        ).trim();
        const wasPersistedInFirestore = !!id;
        await window.forumDeleteTopicFromNotes(id);
        if (
          !wasPersistedInFirestore &&
          subjectForMp3 &&
          typeof window.zcDeleteMesNoteAudioForSubject === "function"
        ) {
          try {
            await window.zcDeleteMesNoteAudioForSubject(subjectForMp3);
            if (typeof window.zcScheduleAfModalStoredMp3Check === "function") {
              window.zcScheduleAfModalStoredMp3Check();
            }
          } catch (_) {}
        }
        authorSubjectsCache = { mail: "", at: 0, subjects: [] };
        if (msg) msg.textContent = "";
        showAfModalTempMsg("Note supprimée.", "green");
        afEditTargetId = "";
        afLastResolvedSubjectKey = "";
        afResolvedReplyCount = 0;
        updateAfModalRepliesUi();
        syncAfSendButtonLabel();
        const titleIn = document.getElementById("afModalTitleIn");
        const bodyIn = document.getElementById("afModalBody");
        if (titleIn) {
          titleIn.value = "";
          try { titleIn.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) { }
          try { titleIn.focus(); } catch (_) { }
        }
        if (bodyIn) {
          bodyIn.value = "";
          afDispatchFieldInput(bodyIn);
        }
        try {
          const priv = document.getElementById("afModalPrivate");
          if (priv) priv.checked = true;
          syncAfModalPrivateLabel();
        } catch (_) { }
        try {
          if (typeof zcRefreshForumIfOpen === "function") zcRefreshForumIfOpen();
          else if (typeof window.zcRefreshForumIfOpen === "function") window.zcRefreshForumIfOpen();
        } catch (_) { }
      } catch (e) {
        if (msg) {
          msg.style.color = "var(--zc-danger)";
          msg.textContent = e && e.message ? e.message : String(e);
        }
      }
    });
    function clearTitleFieldAf() {
      const input = document.getElementById("afModalTitleIn");
      if (!input) return;
      input.value = "";
      afEditTargetId = "";
      afResolvedReplyCount = 0;
      updateAfModalRepliesUi();
      scheduleRefreshAfModalStoredMp3Btn();
      syncAfSendButtonLabel();
      try { input.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) { }
      input.focus();
    }
    function copyTitleFieldAf() {
      afCopyText(document.getElementById("afModalTitleIn")?.value || "");
    }
    async function clearBodyFieldAf() {
      const ta = document.getElementById("afModalBody");
      if (!ta) return;
      const lcClr = getAfModalLang();
      const msgClr = AF_MODAL_CONFIRM_CLEAR[lcClr] || AF_MODAL_CONFIRM_CLEAR.fr;
      if (typeof window.confirmClearField === "function") {
        const ok = await window.confirmClearField(ta, msgClr);
        if (!ok) return;
      } else {
        ta.value = "";
        afDispatchFieldInput(ta);
      }
      ta.focus();
    }
    function copyBodyFieldAf() {
      afCopyText(document.getElementById("afModalBody")?.value || "");
    }
    document.getElementById("afModalTitleClear")?.addEventListener("click", clearTitleFieldAf);
    document.getElementById("afModalTitleCopy")?.addEventListener("click", copyTitleFieldAf);
    document.getElementById("afModalTitleClearInline")?.addEventListener("click", clearTitleFieldAf);
    document.getElementById("afModalBodyClear")?.addEventListener("click", clearBodyFieldAf);
    document.getElementById("afModalBodyCopy")?.addEventListener("click", copyBodyFieldAf);
    document.getElementById("afModalBodyClearInline")?.addEventListener("click", clearBodyFieldAf);
    document.getElementById("afModalBodyCopyInline")?.addEventListener("click", copyBodyFieldAf);
    document.getElementById("afModalSubjectTranslitBtn")?.addEventListener("click", function (e) {
      e.preventDefault();
      const input = document.getElementById("afModalTitleIn");
      if (!input) return;
      if (typeof transliterateInput === "function") {
        try {
          transliterateInput("afModalTitleIn", true);
        } catch (_) { }
      }
      try {
        input.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (_) { }
    });
    document.getElementById("afModalSubjectInsertVersesBtn")?.addEventListener("click", function (e) {
      e.preventDefault();
      insertVersesFromSubjectIntoBody();
    });
    document.getElementById("afModalBodyAnalyze")?.addEventListener("click", function (e) {
      e.preventDefault();
      try {
        if (typeof window.zcAfAnalyzeMesNoteText === "function") {
          window.zcAfAnalyzeMesNoteText();
        } else {
          runAfModalDefaultTextAnalyze();
        }
      } catch (err) {
        console.warn("[articles-forum-modal] zcAfAnalyzeMesNoteText", err);
        runAfModalDefaultTextAnalyze();
      }
    });
    try {
      if (typeof window.zcBindAfModalSpeechTranscription === "function") {
        window.zcBindAfModalSpeechTranscription();
      }
    } catch (_) {}
    document.getElementById("afModalOpenCommentaires")?.addEventListener("click", function (e) {
      e.preventDefault();
      openCommentairesFromAfModal();
    });
    document.getElementById("afModalOpenForum")?.addEventListener("click", function (e) {
      e.preventDefault();
      const lc = getAfModalLang();
      const noOpen = AF_OPEN_FORUM_UNAVAILABLE[lc] || AF_OPEN_FORUM_UNAVAILABLE.fr;
      if (typeof window.ouvrirPopupHtml !== "function") {
        showAfModalTempMsg(noOpen, "orange");
        return;
      }
      try {
        window.ouvrirPopupHtml("forum");
      } catch (err) {
        console.warn("[articles-forum-modal] open forum", err);
        showAfModalTempMsg(noOpen, "red");
      }
    });

    if (titleIn) {
      titleIn.addEventListener("focus", function () {
        afLastStableTitleForRevert = String(titleIn.value || "");
        if (titleSuggestHideTimer) {
          clearTimeout(titleSuggestHideTimer);
          titleSuggestHideTimer = null;
        }
        titleSuggestLoading = true;
        renderAfTitleSuggest();
        void loadAuthorForumSubjects().then(function () {
          titleSuggestLoading = false;
          const panel = document.getElementById("afModalOverlay");
          if (panel && panel.style.display === "flex" && document.activeElement === titleIn) {
            renderAfTitleSuggest();
          }
        });
      });

      titleIn.addEventListener("blur", function () {
        titleSuggestHideTimer = setTimeout(function () {
          hideAfTitleSuggest();
          titleSuggestHideTimer = null;
        }, 220);
      });

      titleIn.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          hideAfTitleSuggest();
          return;
        }
        if (e.key === "Enter") {
          const sug = document.getElementById("afModalTitleSuggest");
          if (sug && sug.style.display !== "none" && sug.querySelector("li.af-title-suggest-item")) {
            e.preventDefault();
            pickFirstAfTitleSuggestion();
          }
        }
      });

      titleIn.addEventListener("input", function (e) {
        // Events synthétiques : propagés par le sync com12.js depuis #mot / #popupInputMot /
        // #searchInput / etc. L'utilisateur n'a pas saisi ici, on ne doit pas déclencher le
        // dialog « texte risque d'être écrasé ». On met juste à jour la référence de revert
        // pour rester cohérent et on appelle les side-effects (lookup du sujet, etc.).
        if (e && e.isTrusted === false) {
          afLastStableTitleForRevert = String(titleIn.value || "");
          runAfTitleInputSideEffects();
          return;
        }
        if (afSuppressNextTitleInputConfirm) {
          afSuppressNextTitleInputConfirm = false;
          runAfTitleInputSideEffects();
          return;
        }
        runAfTitleInputSideEffects();
      });
    }
    document.addEventListener(
      "mousedown",
      function (e) {
        const t = e.target;
        if (!(t instanceof Element)) return;
        const panel = document.getElementById("afModalOverlay");
        if (!panel || panel.style.display !== "flex") return;
        const wrap = panel.querySelector(".af-modal-title-field-wrap");
        if (wrap && wrap.contains(t)) return;
        hideAfTitleSuggest();
      },
      true
    );

    document.getElementById("afModalOverlay")?.addEventListener("change", function (ev) {
      const t = ev.target;
      if (t && t.id === "afModalPrivate") syncAfModalPrivateLabel();
    });
    // Listener en phase CAPTURE : le panneau interne (.af-modal-panel) a un
    // onclick="event.stopPropagation()" en phase bubbling, qui empêcherait ce handler de
    // se déclencher s'il était en phase bubbling aussi. En capture on attrape le click
    // avant que stopPropagation ne soit appelé.
    document.getElementById("afModalOverlay")?.addEventListener("click", function (e) {
      const raw = e.target;
      const t = raw instanceof Element ? raw : raw && raw.parentElement;
      if (!(t instanceof Element) || typeof t.closest !== "function") return;
      if (t.closest("#afModalSubjectStoredMp3")) {
        e.preventDefault();
        const subj = String(document.getElementById("afModalTitleIn")?.value || "").trim();
        if (!subj || typeof window.zcOpenMesNoteStoredMp3 !== "function") return;
        void window.zcOpenMesNoteStoredMp3(subj);
        return;
      }
      if (!t.closest("#afModalRepliesLink")) return;
      e.preventDefault();
      const id = String(afEditTargetId || "").trim();
      if (!id) return;
      const n = Number(afResolvedReplyCount) || 0;
      if (typeof window.forumOpenReadMessageById !== "function") return;
      void window.forumOpenReadMessageById(id, { scrollToReplies: n > 0 });
    }, true);
    document.getElementById("afModalOverlay")?.addEventListener("mousedown", function (ev) {
      const t = ev.target instanceof Element ? ev.target.closest("#afModalSend") : null;
      if (!t) return;
      if (!t.disabled) return;
      showAfModalTempMsg("Renseignez un sujet et un texte valides pour enregistrer.", "orange");
    }, true);

    document.getElementById("afModalSend")?.addEventListener("click", async function () {
      const msg = document.getElementById("afModalMsg");
      const sendBtn = document.getElementById("afModalSend");
      const title = String(document.getElementById("afModalTitleIn")?.value || "").trim();
      const body = String(document.getElementById("afModalBody")?.value || "").trim();
      const isPrivate = !!(document.getElementById("afModalPrivate") && document.getElementById("afModalPrivate").checked);
      const editId = String(afEditTargetId || "").trim();
      if (msg) {
        msg.textContent = "";
        msg.style.color = "";
      }

      const auth = typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser;
      if (!auth || !auth.email) {
        showAfModalTempMsg("Connectez-vous pour publier sur le forum.", "orange");
        if (msg) {
          msg.style.color = "#b91c1c";
          msg.textContent = "Connectez-vous (Firebase, e-mail réel) pour publier sur le forum.";
        }
        return;
      }
      if (title.length < 3) {
        showAfModalTempMsg("Titre trop court.", "orange");
        if (msg) {
          msg.style.color = "var(--zc-danger)";
          msg.textContent = "Titre trop court.";
        }
        return;
      }
      if (body.length < MIN_BODY) {
        showAfModalTempMsg("Texte trop court.", "orange");
        if (msg) {
          msg.style.color = "var(--zc-danger)";
          msg.textContent = "Texte trop court (min. " + MIN_BODY + " caractères).";
        }
        return;
      }

      const now = Date.now();
      const last = Number(localStorage.getItem(LS_LAST) || 0);
      if (now - last < COOLDOWN_MS) {
        showAfModalTempMsg("Patientez quelques secondes avant un nouvel envoi.", "orange");
        if (msg) {
          msg.style.color = "var(--zc-text-muted)";
          msg.textContent = "Patientez " + Math.ceil((COOLDOWN_MS - (now - last)) / 1000) + " s.";
        }
        return;
      }

      const submitFn = window.forumSubmitNotesFromArticlesModal;
      const updateFn = window.forumUpdateTopicMainFromNotes;
      if (typeof submitFn !== "function") {
        showAfModalTempMsg("Module forum indisponible, rechargez la page.", "red");
        if (msg) {
          msg.style.color = "var(--zc-danger)";
          msg.textContent = "Module forum indisponible (rechargez la page).";
        }
        return;
      }

      if (sendBtn) sendBtn.disabled = true;
      try {
        if (editId) {
          if (typeof updateFn !== "function") throw new Error("Édition indisponible (rechargez la page).");
          await updateFn({ id: editId, title: title, body: body, isPrivate: isPrivate });
        } else {
          await submitFn({ title: title, body: body, isPrivate: isPrivate });
        }
        authorSubjectsCache = { mail: "", at: 0, subjects: [] };
        localStorage.setItem(LS_LAST, String(Date.now()));
        captureAfModalBaseline();
        afLastStableTitleForRevert = String(document.getElementById("afModalTitleIn")?.value || "");
        if (msg) {
          msg.style.color = "var(--zc-accent-hover)";
          msg.textContent = "✅ Envoyé sur le forum.";
        }
        showAfModalTempMsg("Message enregistré sur le forum.", "green");
        try {
          if (typeof zcRefreshForumIfOpen === "function") zcRefreshForumIfOpen();
          else if (typeof window.zcRefreshForumIfOpen === "function") window.zcRefreshForumIfOpen();
        } catch (_) { }
      } catch (e) {
        console.error(e);
        if (msg) {
          msg.style.color = "var(--zc-danger)";
          msg.textContent = e && e.message ? e.message : String(e);
        }
        showAfModalTempMsg(e && e.message ? e.message : "Échec d'enregistrement.", "red");
      } finally {
        if (sendBtn) sendBtn.disabled = false;
      }
    });
  }

  function bindArticlesForumModal() {
    injectStylesOnce();
    ensureOverlay();
    ensureAfModalSubjectToolbarTail();
    ensureAfModalTitleFieldMarkup();
    ensureAfModalPrivateMarkup();
    refreshTitles();
    bindFormOnce();
    try {
      if (typeof window.zcSyncMotClones === "function") window.zcSyncMotClones();
    } catch (_) { }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindArticlesForumModal, { once: true });
  } else {
    bindArticlesForumModal();
  }

  window.__bindArticlesForumModal = bindArticlesForumModal;
  window.openArticlesForumNotesModal = openModal;
  window.zcLoadAuthorForumSubjectsForCurrentUser = loadAuthorForumSubjects;
  /** Lit le champ Sujet (+ → espace), insère les textes arabes des versets dans #afModalBody. */
  window.zcAfInsertVersesFromSubjectIntoBody = insertVersesFromSubjectIntoBody;
  /** Ouvre le panneau d’analyse du champ Texte (Mes Notes). */
  window.zcAfOpenMesNoteTextAnalysisPanel = openAfModalTextAnalysisPanel;
  window.zcInvalidateAuthorForumSubjectsCache = function () {
    authorSubjectsCache = { mail: "", at: 0, subjects: [] };
  };
  window.zcScheduleAfModalStoredMp3Check = scheduleRefreshAfModalStoredMp3Btn;
})();
