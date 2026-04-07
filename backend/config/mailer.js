const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 30000
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Mailer Error:", error.message);
  } else {
    console.log("✅ Mailer is ready to send emails");
  }
});

module.exports = transporter;