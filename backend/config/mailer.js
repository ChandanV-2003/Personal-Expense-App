const nodemailer = require("nodemailer");

const normalize = (value) => (typeof value === "string" ? value.trim() : value);

const smtpUser = normalize(process.env.SMTP_USER) || normalize(process.env.EMAIL_USER);
const smtpPass = normalize(process.env.SMTP_PASS) || normalize(process.env.EMAIL_PASS);
const hasEmailCredentials = Boolean(smtpUser && smtpPass);
const smtpPort = Number(process.env.SMTP_PORT || 587);

const transportConfig = process.env.SMTP_HOST
  ? {
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    }
  : {
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    };

const transporter = nodemailer.createTransport({
  ...transportConfig,
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 30000,
});

// Verify transporter connection
transporter.verify((error) => {
  if (!hasEmailCredentials) {
    console.error("Mailer is not configured. Set EMAIL_USER and EMAIL_PASS.");
    return;
  }

  if (error) {
    console.error("Mailer connection failed:", error.message);
  } else {
    console.log("Mailer is ready to send emails");
  }
});

module.exports = transporter;