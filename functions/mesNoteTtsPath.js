/**
 * Chemin Storage MP3 Mes Notes (TTS) — aligné avec public/jsZC/mes-notes-tts.js
 * Même arbre que la bibliothèque Médias : préfixe bucket MesMedias (voir medias1.js).
 */

const MAX_BASE = 80;

/** Sous le bucket par défaut Firebase Storage : MesMedias/audio/MesNotesTts/{uid}/{base}.mp3 */
const MES_NOTES_TTS_STORAGE_REL_PREFIX = "MesMedias/audio/MesNotesTts";

/**
 * @param {string} subject
 * @returns {string} base fichier sans extension (jamais vide si subject non vide après trim)
 */
function sanitizeMesNoteMp3BaseName(subject) {
  let s = String(subject || "").trim();
  if (!s) return "";
  s = s
    .replace(/[\u0000-\u001f\u007f\\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (s.length > MAX_BASE) {
    s = s.slice(0, MAX_BASE).replace(/_+$/g, "");
  }
  return s || "sans-titre";
}

/**
 * @param {string} uid
 * @param {string} subject
 * @returns {string} chemin objet GCS / Firebase Storage
 */
function mesNoteMp3StoragePath(uid, subject) {
  const base = sanitizeMesNoteMp3BaseName(subject);
  const u = String(uid || "").trim();
  return `${MES_NOTES_TTS_STORAGE_REL_PREFIX}/${u}/${base}.mp3`;
}

module.exports = {
  sanitizeMesNoteMp3BaseName,
  mesNoteMp3StoragePath,
  MAX_BASE,
  MES_NOTES_TTS_STORAGE_REL_PREFIX,
};
