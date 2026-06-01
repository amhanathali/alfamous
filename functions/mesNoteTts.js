/**
 * Synthèse vocale (Google Cloud Text-to-Speech) + upload Storage MesMedias/audio/MesNotesTts/{uid}/…
 *
 * Authentification Google :
 * - Déployé : compte de service par défaut du runtime Cloud Functions (pas de fichier clé).
 *   Activer l’API « Cloud Text-to-Speech » et accorder au SA runtime le rôle texttospeech.user.
 * - Émulateur / machine locale : placer une clé JSON à la racine du repo (`key.json`) ou
 *   définir GOOGLE_APPLICATION_CREDENTIALS vers ce fichier.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const textToSpeech = require("@google-cloud/text-to-speech");
const { mesNoteMp3StoragePath } = require("./mesNoteTtsPath");

/** Hash du texte réellement envoyé au TTS : sujet + corps (voir buildMesNoteTtsInput). */
const META_INPUT_SHA = "zcTtsInputSha256";
/** Ancienne clé (corps seul) — acceptée un temps pour éviter une régénération inutile. */
const META_LEGACY_BODY_SHA = "zcTtsBodySha256";
const META_LANG_KEY = "zcTtsLangKey";

const SUBJECT_BODY_SEP = "\n\n";

/**
 * Texte lu par la synthèse : **sujet** puis **corps**, tronqué à MAX_CHARS au total.
 * @param {string} subjectTrim
 * @param {string} bodyRaw champ « Texte » (corps)
 */
function buildMesNoteTtsInput(subjectTrim, bodyRaw) {
  const subj = String(subjectTrim || "").trim();
  const body = String(bodyRaw || "").trim();
  if (!subj) return "";
  if (!body) {
    return subj.slice(0, MAX_CHARS);
  }
  const head = subj + SUBJECT_BODY_SEP;
  const maxBody = Math.max(0, MAX_CHARS - head.length);
  return head + body.slice(0, maxBody);
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s), "utf8").digest("hex");
}

const MAX_CHARS = 4500;

/** @type {import("@google-cloud/text-to-speech").TextToSpeechClient|null} */
let ttsClientSingleton = null;

/**
 * Client TTS réutilisable : privilégie GOOGLE_APPLICATION_CREDENTIALS, sinon fichiers à la racine
 * du dépôt / dossier functions (key.json).
 */
function getTextToSpeechClient() {
  if (ttsClientSingleton) {
    return ttsClientSingleton;
  }

  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (fromEnv && fs.existsSync(fromEnv)) {
    ttsClientSingleton = new textToSpeech.TextToSpeechClient();
    return ttsClientSingleton;
  }

  const names = ["key.json", "key.json.json", "serviceAccountKey.json"];
  const roots = [path.join(__dirname, ".."), path.join(__dirname)];
  for (let r = 0; r < roots.length; r++) {
    for (let n = 0; n < names.length; n++) {
      const full = path.join(roots[r], names[n]);
      try {
        if (fs.existsSync(full)) {
          ttsClientSingleton = new textToSpeech.TextToSpeechClient({
            keyFilename: full,
          });
          return ttsClientSingleton;
        }
      } catch (_) {}
    }
  }

  ttsClientSingleton = new textToSpeech.TextToSpeechClient();
  return ttsClientSingleton;
}

function mapLangKeyToLanguageCode(key) {
  const k = String(key || "fr").toLowerCase();
  if (k.startsWith("ar")) return "ar-XA";
  if (k === "en") return "en-US";
  if (k === "es") return "es-ES";
  if (k === "kab" || k.startsWith("kab")) return "fr-FR";
  return "fr-FR";
}

function getMesNoteTtsBucket(admin) {
  const envBucket =
    process.env.FIREBASE_STORAGE_BUCKET || process.env.GCLOUD_STORAGE_BUCKET;
  const bucket = envBucket
    ? admin.storage().bucket(String(envBucket).trim())
    : admin.storage().bucket();
  const bucketName = bucket.name || String(envBucket || "");
  return { bucket, bucketName };
}

/**
 * Lecture Storage uniquement — pas d’appel Text-to-Speech (sonde pour le client).
 * @param {import("firebase-admin")} admin
 * @param {string} uid
 * @param {string} inputText texte TTS complet (sujet + corps), déjà construit
 * @param {string} langKey
 * @param {string} subjectTrim
 */
async function checkMesNoteMp3Unchanged(admin, uid, inputText, langKey, subjectTrim) {
  const languageCode = mapLangKeyToLanguageCode(langKey);
  const lk = String(langKey || "fr").toLowerCase();
  const { bucket, bucketName } = getMesNoteTtsBucket(admin);
  const dest = mesNoteMp3StoragePath(uid, subjectTrim);
  const file = bucket.file(dest);
  const inputHash = sha256Hex(inputText);
  const [exists] = await file.exists();
  if (!exists) {
    return {
      unchanged: false,
      storagePath: dest,
      bucket: bucketName || null,
      languageCode,
    };
  }
  try {
    const [meta] = await file.getMetadata();
    const custom = (meta && meta.metadata) || {};
    const storedHash =
      custom[META_INPUT_SHA] || custom[META_LEGACY_BODY_SHA] || "";
    if (
      storedHash === inputHash &&
      String(custom[META_LANG_KEY] || "fr") === lk
    ) {
      return {
        unchanged: true,
        storagePath: dest,
        bucket: bucketName || null,
        languageCode,
      };
    }
  } catch (_) {
    /* inchangé = false */
  }
  return {
    unchanged: false,
    storagePath: dest,
    bucket: bucketName || null,
    languageCode,
  };
}

/**
 * @param {import("firebase-admin")} admin
 * @param {string} uid
 * @param {string} text
 * @param {string} langKey fr|en|ar|es|kab
 * @param {string} subject sujet Mes Notes (nom du fichier .mp3)
 */
async function synthesizeMesNoteAudioImpl(admin, uid, text, langKey, subject) {
  const subjectTrim = String(subject || "").trim();
  if (!subjectTrim) {
    const err = new Error("empty_subject");
    err.code = "EMPTY_SUBJECT";
    throw err;
  }

  const client = getTextToSpeechClient();
  const languageCode = mapLangKeyToLanguageCode(langKey);
  const lk = String(langKey || "fr").toLowerCase();
  const bodyRaw = String(text || "").trim();
  if (!bodyRaw) {
    const err = new Error("empty_text");
    err.code = "EMPTY";
    throw err;
  }
  const inputText = buildMesNoteTtsInput(subjectTrim, bodyRaw);
  if (!inputText) {
    const err = new Error("empty_text");
    err.code = "EMPTY";
    throw err;
  }

  const { bucket, bucketName } = getMesNoteTtsBucket(admin);
  const dest = mesNoteMp3StoragePath(uid, subjectTrim);
  const file = bucket.file(dest);

  const inputHash = sha256Hex(inputText);
  const unchangedStatus = await checkMesNoteMp3Unchanged(
    admin,
    uid,
    inputText,
    langKey,
    subjectTrim
  );
  if (unchangedStatus.unchanged) {
    return {
      unchanged: true,
      storagePath: dest,
      bucket: bucketName || null,
      downloadURL: null,
      charsUsed: 0,
      languageCode,
    };
  }

  const [response] = await client.synthesizeSpeech({
    input: { text: inputText },
    voice: {
      languageCode,
      ssmlGender: "NEUTRAL",
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 1.0,
      pitch: 0,
    },
  });

  const audioBuffer = Buffer.from(response.audioContent, "base64");

  await file.save(audioBuffer, {
    metadata: {
      contentType: "audio/mpeg",
      cacheControl: "public, max-age=31536000",
      metadata: {
        [META_INPUT_SHA]: inputHash,
        [META_LANG_KEY]: lk,
      },
    },
    resumable: false,
  });

  /**
   * Pas de getSignedUrl() côté serveur ; URL côté client via getDownloadURL().
   */
  return {
    unchanged: false,
    storagePath: dest,
    bucket: bucketName || null,
    downloadURL: null,
    charsUsed: inputText.length,
    languageCode,
  };
}

/**
 * Sonde seule (pas de TTS) — pour afficher « inchangé » avant confirmation côté client.
 */
async function probeMesNoteAudioUnchanged(admin, uid, text, langKey, subject) {
  const subjectTrim = String(subject || "").trim();
  if (!subjectTrim) {
    const err = new Error("empty_subject");
    err.code = "EMPTY_SUBJECT";
    throw err;
  }
  const bodyRaw = String(text || "").trim();
  if (!bodyRaw) {
    const err = new Error("empty_text");
    err.code = "EMPTY";
    throw err;
  }
  const inputText = buildMesNoteTtsInput(subjectTrim, bodyRaw);
  if (!inputText) {
    const err = new Error("empty_text");
    err.code = "EMPTY";
    throw err;
  }
  return checkMesNoteMp3Unchanged(admin, uid, inputText, langKey, subjectTrim);
}

module.exports = {
  synthesizeMesNoteAudioImpl,
  probeMesNoteAudioUnchanged,
  MAX_CHARS,
};
