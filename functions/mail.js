/* eslint-disable max-len, indent, object-curly-spacing, comma-dangle,
   require-jsdoc, valid-jsdoc */
/**
 * Envoi d’e-mails via SMTP (nodemailer).
 *
 * Configuration après déploiement :
 *   firebase functions:config:set \
 *     smtp.host="smtp.gmail.com" \
 *     smtp.port="587" \
 *     smtp.secure="false" \
 *     smtp.user="VOTRE_COMPTE@gmail.com" \
 *     smtp.pass="MOT_DE_PASSE_APPLICATION" \
 *     email.from='"Alfamous" <VOTRE_COMPTE@gmail.com>' \
 *     email.contact_to="boite.admin@example.com" \
 *     app.public_url="https://alfamous-amha.web.app"
 *
 * email.contact_to : destinataire des alertes « nouveau message Contact »
 * (sinon repli sur smtp.user = la boîte qui envoie).
 *
 * Puis : firebase deploy --only functions
 *
 * Sans cette config, les fonctions tournent mais n’envoient pas de mail (log d’avertissement).
 */

const nodemailer = require("nodemailer");
const functions = require("firebase-functions");

/**
 * @returns {{
 *   host: string,
 *   port: number,
 *   secure: boolean,
 *   user: string,
 *   pass: string,
 *   from: string,
 *   appUrl: string,
 *   contactNotifyTo: string
 * }}
 */
function getMailConfig() {
  try {
    const c = functions.config();
    const smtp = c.smtp || {};
    const port = parseInt(String(smtp.port || "587"), 10) || 587;
    const secure =
      String(smtp.secure || "").toLowerCase() === "true" || port === 465;
    const user = String(smtp.user || "").trim();
    return {
      host: String(smtp.host || "").trim(),
      port,
      secure,
      user,
      pass: String(smtp.pass || "").trim(),
      from: String((c.email && c.email.from) || smtp.user || "").trim(),
      appUrl: String((c.app && c.app.public_url) || "https://alfamous-amha.web.app")
        .trim()
        .replace(/\/$/, ""),
      contactNotifyTo: String((c.email && c.email.contact_to) || user || "").trim(),
    };
  } catch (e) {
    return {
      host: "",
      port: 587,
      secure: false,
      user: "",
      pass: "",
      from: "",
      appUrl: "https://alfamous-amha.web.app",
      contactNotifyTo: "",
    };
  }
}

function isSmtpConfigured() {
  const cfg = getMailConfig();
  return !!(cfg.host && cfg.user && cfg.pass && cfg.from);
}

function createTransport() {
  const cfg = getMailConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return null;
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

/**
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 * @returns {Promise<{ ok: boolean, skipped?: boolean }>}
 */
async function sendMail(opts) {
  const cfg = getMailConfig();
  const transport = createTransport();
  if (!transport || !cfg.from) {
    functions.logger.warn(
      "[mail] SMTP incomplet : définir functions:config smtp.host, smtp.user, smtp.pass, email.from"
    );
    return { ok: false, skipped: true };
  }
  const to = String(opts.to || "").trim();
  if (!to || !to.includes("@")) {
    return { ok: false, skipped: true };
  }
  await transport.sendMail({
    from: cfg.from,
    to,
    subject: String(opts.subject || "").slice(0, 998),
    text: opts.text != null ? String(opts.text) : undefined,
    html: opts.html != null ? String(opts.html) : undefined,
  });
  return { ok: true };
}

module.exports = {
  getMailConfig,
  isSmtpConfigured,
  sendMail,
};
