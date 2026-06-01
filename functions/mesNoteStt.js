const { SpeechClient } = require("@google-cloud/speech");

const MAX_URL_LEN = 2000;
const MAX_BYTES = 25 * 1024 * 1024; // 25 Mo
const TRANSCRIPT_MAX = 20000;

/** @type {SpeechClient|null} */
let speechClientSingleton = null;

function getSpeechClient() {
  if (speechClientSingleton) return speechClientSingleton;
  speechClientSingleton = new SpeechClient();
  return speechClientSingleton;
}

function normalizeLangForStt(langKey) {
  const k = String(langKey || "fr").toLowerCase();
  if (k.startsWith("ar")) return "ar-SA";
  if (k === "en") return "en-US";
  if (k === "es") return "es-ES";
  if (k === "kab" || k.startsWith("kab")) return "fr-FR";
  return "fr-FR";
}

function detectEncodingFromContentType(contentType, url) {
  const ct = String(contentType || "").toLowerCase();
  const u = String(url || "").toLowerCase();
  if (u.includes(".flac") || ct.includes("audio/flac")) return "FLAC";
  if (u.includes(".wav") || ct.includes("audio/wav") || ct.includes("audio/x-wav")) return "LINEAR16";
  if (u.includes(".mp3") || ct.includes("audio/mpeg") || ct.includes("audio/mp3")) return "MP3";
  if (u.includes(".ogg") || u.includes(".opus") || ct.includes("audio/ogg")) return "OGG_OPUS";
  if (u.includes(".webm") || ct.includes("audio/webm")) return "WEBM_OPUS";
  return "ENCODING_UNSPECIFIED";
}

function isSupportedMedia(contentType, url) {
  const ct = String(contentType || "").toLowerCase();
  const u = String(url || "").toLowerCase();
  if (ct.startsWith("audio/")) return true;
  /** Firebase Storage renvoie souvent application/octet-stream sur les URLs signées. */
  if (
    ct === "application/octet-stream" &&
    /\.(mp3|wav|flac|ogg|opus|webm)(\?|&|$)/i.test(u)
  ) {
    return true;
  }
  if (/\.(mp3|wav|flac|ogg|opus|webm)(\?|&|$)/i.test(u)) return true;
  return false;
}

async function downloadAudioBufferFromUrl(url) {
  const u = String(url || "").trim();
  if (!u || u.length > MAX_URL_LEN) {
    const err = new Error("invalid_url");
    err.code = "INVALID_URL";
    throw err;
  }
  let parsed;
  try {
    parsed = new URL(u);
  } catch (_) {
    const err = new Error("invalid_url");
    err.code = "INVALID_URL";
    throw err;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    const err = new Error("invalid_protocol");
    err.code = "INVALID_URL";
    throw err;
  }

  const res = await fetch(parsed.toString(), { method: "GET", redirect: "follow" });
  if (!res.ok) {
    const err = new Error(`media_fetch_${res.status}`);
    err.code = "MEDIA_FETCH";
    throw err;
  }

  const ct = String(res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!isSupportedMedia(ct, parsed.href)) {
    const err = new Error("unsupported_media");
    err.code = "UNSUPPORTED_MEDIA";
    throw err;
  }
  const lenRaw = Number(res.headers.get("content-length") || 0);
  if (Number.isFinite(lenRaw) && lenRaw > MAX_BYTES) {
    const err = new Error("media_too_large");
    err.code = "MEDIA_TOO_LARGE";
    throw err;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) {
    const err = new Error("empty_media");
    err.code = "EMPTY_MEDIA";
    throw err;
  }
  if (buf.length > MAX_BYTES) {
    const err = new Error("media_too_large");
    err.code = "MEDIA_TOO_LARGE";
    throw err;
  }
  return { buffer: buf, contentType: ct, sourceUrl: parsed.toString() };
}

async function transcribeFromMediaUrlImpl(mediaUrl, langKey) {
  const languageCode = normalizeLangForStt(langKey);
  const { buffer, contentType, sourceUrl } = await downloadAudioBufferFromUrl(mediaUrl);
  const encoding = detectEncodingFromContentType(contentType, sourceUrl);
  const speech = getSpeechClient();
  const [resp] = await speech.recognize({
    config: {
      languageCode,
      encoding,
      model: "latest_long",
      enableAutomaticPunctuation: true,
    },
    audio: {
      content: buffer.toString("base64"),
    },
  });

  const transcript = ((resp && resp.results) || [])
    .map((r) => (((r || {}).alternatives || [])[0] || {}).transcript || "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TRANSCRIPT_MAX);

  return {
    transcript,
    transcriptLen: transcript.length,
    languageCode,
    sourceUrl,
    bytes: buffer.length,
    contentType,
  };
}

module.exports = {
  transcribeFromMediaUrlImpl,
};
