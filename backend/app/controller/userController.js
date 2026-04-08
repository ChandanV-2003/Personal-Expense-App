const User = require("../model/user");
const { sendMailWithFallback } = require("../../config/mailer");
const jwt = require("jsonwebtoken");

/* =========================
   Generate 6 Digit OTP
========================= */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/* =========================
   SEND OTP
========================= */
exports.sendOtp = async (req, res) => {
  try {
    const { name, email } = req.body;
    const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
    const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || "").trim();
    const brevoApiKey = (process.env.BREVO_API_KEY || "").trim();
    const isDemoMode = process.env.OTP_DEMO_MODE === "true";

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (!brevoApiKey && (!smtpUser || !smtpPass)) {
      if (!isDemoMode) {
        return res.status(500).json({
          message: "Email service is not configured on server",
        });
      }
    }

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = new User({
        name: name?.trim() || "User",
        email: normalizedEmail,
      });
    }

    const otp = generateOTP();

    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    await user.save();

    try {
      await sendMailWithFallback({
        from: process.env.MAIL_FROM || smtpUser || "no-reply@example.com",
        to: normalizedEmail,
        subject: "Expense App - OTP Verification",
        html: `
          <h2>Your OTP Code</h2>
          <p>Your OTP is: <b>${otp}</b></p>
          <p>This OTP will expire in 5 minutes.</p>
        `,
      });

      console.log(`[OTP] Successfully sent to: ${normalizedEmail}`);
      res.json({ message: "OTP sent successfully" });
    } catch (mailError) {
      if (isDemoMode) {
        console.log(`[OTP DEMO] OTP code ${otp} for ${normalizedEmail} (email send failed, demo mode enabled)`);
        res.json({
          message: "OTP sent successfully",
          demo: true,
          otp: otp,
          note: "Demo mode: OTP displayed in response for testing",
        });
        return;
      }
      throw mailError;
    }
  } catch (error) {
    console.error("Send OTP error:", {
      message: error.message,
      code: error.code,
      command: error.command,
    });

    const deliveryErrorCodes = ["ETIMEDOUT", "EAUTH", "EENVELOPE", "ECONNECTION", "ESOCKET", "ECONNRESET"];
    const isDeliveryError = deliveryErrorCodes.includes(error.code);

    res.status(500).json({
      message: isDeliveryError
        ? "Failed to send OTP email. Please verify SMTP settings and try again."
        : "Failed to send OTP",
    });
  }
};

/* =========================
   VERIFY OTP
========================= */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!user.otpExpiry || Date.now() > user.otpExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        monthlyLimit: user.monthlyLimit,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error.message);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

/* =========================
   UPDATE MONTHLY LIMIT
========================= */
exports.updateMonthlyLimit = async (req, res) => {
  try {
    const { monthlyLimit } = req.body;

    const numericLimit = Number(monthlyLimit);

    if (isNaN(numericLimit) || numericLimit < 0) {
      return res.status(400).json({
        message: "Monthly limit must be a positive number",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { monthlyLimit: numericLimit },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Monthly limit updated",
      monthlyLimit: user.monthlyLimit,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update monthly limit" });
  }
};
