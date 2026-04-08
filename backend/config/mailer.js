const nodemailer = require("nodemailer");

const hasEmailCredentials = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const smtpPort = Number(process.env.SMTP_PORT || 587);

const transportConfig = process.env.SMTP_HOST
  ? {
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    }
  : {
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
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