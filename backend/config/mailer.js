const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
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