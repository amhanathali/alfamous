const nodemailer = require('nodemailer');

// Configurer le transporteur nodemailer avec Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',     // Remplacez par votre adresse e-mail
    pass: 'your-email-password'       // Remplacez par votre mot de passe
  }
});

/**
 * Envoie un email avec les options spécifiées.
 * @param {string} to - Adresse email du destinataire.
 * @param {string} subject - Sujet de l'email.
 * @param {string} text - Contenu de l'email.
 * @returns {Promise} - Une promesse qui se résout lorsque l'email est envoyé.
 */
function sendEmail(to, subject, text) {
  const mailOptions = {
    from: 'your-email@gmail.com',  // Remplacez par votre adresse e-mail
    to: to,
    subject: subject,
    text: text
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Erreur d\'envoi:', error);
        return reject(error);
      }
      console.log('Email envoyé:', info.response);
      resolve(info.response);
    });
  });
}

module.exports = { sendEmail };
