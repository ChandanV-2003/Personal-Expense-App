const nodemailer = require("nodemailer");

const normalize = (value) => (typeof value === "string" ? value.trim() : value);

const smtpUser = normalize(process.env.SMTP_USER) || normalize(process.env.EMAIL_USER);
const smtpPass = normalize(process.env.SMTP_PASS) || normalize(process.env.EMAIL_PASS);
const smtpHost = normalize(process.env.SMTP_HOST);
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

const buildTransport = (config) =>
  nodemailer.createTransport({
    ...config,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 12000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 12000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000),
  });

const transports = [];

if (smtpHost) {
  transports.push(
    buildTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  );
} else if (smtpUser && smtpPass) {
  transports.push(
    buildTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  );
  transports.push(
    buildTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  );
}

const logTransportStatus = async () => {
  if (!smtpUser || !smtpPass) {
    console.error("Mailer is not configured. Set EMAIL_USER and EMAIL_PASS or SMTP_USER and SMTP_PASS.");
    return;
  }

  if (transports.length === 0) {
    console.error("Mailer transport could not be created. Check SMTP_HOST, SMTP_PORT, and credentials.");
    return;
  }

  try {
    await transports[0].verify();
    console.log("Mailer is ready to send emails");
  } catch (error) {
    console.error("Mailer connection failed:", error.message);
  }
};

const sendMailWithFallback = async (mailOptions) => {
  if (!smtpUser || !smtpPass) {
    throw new Error("Email service is not configured on server");
  }

  if (transports.length === 0) {
    throw new Error("No mail transport available");
  }

  let lastError;

  for (const transport of transports) {
    try {
      return await transport.sendMail(mailOptions);
    } catch (error) {
      lastError = error;
      console.error("Mail send attempt failed:", {
        message: error.message,
        code: error.code,
        host: transport.options?.host,
        port: transport.options?.port,
      });
    }
  }

  throw lastError || new Error("Failed to send email");
};

logTransportStatus();

module.exports = {
  sendMailWithFallback,
};
