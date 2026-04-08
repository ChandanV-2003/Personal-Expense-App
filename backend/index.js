require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const configureDB = require("./config/db");
const userController = require("./app/controller/userController.js");
const expenseController = require("./app/controller/expenseController.js");
const billScanController = require("./app/controller/billScanController.js");
const authMiddleware = require("./app/middleware/authMiddleware.js");
const { upload, handleMulterError } = require("./middleware/uploadMiddleware");

const app = express();

configureDB();

const allowedOrigins = [
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from tools/server-to-server where Origin may be absent.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

// Health check route for deployment monitoring.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    port: process.env.PORT,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

/* =========================
   USER ROUTES (No router file)
========================= */

app.post("/api/users/send-otp", userController.sendOtp);
app.post("/api/users/verify-otp", userController.verifyOtp);
app.put("/api/users/monthly-limit", authMiddleware, userController.updateMonthlyLimit);
app.get("/api/dashboard", authMiddleware, expenseController.getDashboard);

// expense endpoint accepts optional bill file
app.post("/api/expenses", authMiddleware, upload.single("bill"), handleMulterError, expenseController.addExpense);
app.get("/api/expenses", authMiddleware, expenseController.getExpenses);
app.delete("/api/expenses/:id", authMiddleware, expenseController.deleteExpense);
app.put("/api/expenses/:id", authMiddleware, expenseController.updateExpense);

/* =========================
   AI BILL SCAN ROUTES
========================= */

// Scan bill and save expense
app.post(
  "/api/expenses/scan-bill",
  authMiddleware,
  upload.single("billImage"),
  handleMulterError,
  billScanController.scanBill
);

// Preview bill scan without saving
app.post(
  "/api/expenses/scan-bill/preview",
  authMiddleware,
  upload.single("billImage"),
  handleMulterError,
  billScanController.previewBillScan
);

/* ========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});