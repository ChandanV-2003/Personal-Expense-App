const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
  family: 4 // Force IPv4
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