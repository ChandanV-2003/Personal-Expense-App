require("dotenv").config();
const express = require("express");
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

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

/* =========================
   USER ROUTES (No router file)
========================= */

app.post("/api/users/send-otp", userController.sendOtp);
app.post("/api/users/verify-otp", userController.verifyOtp);

app.get("/api/test", authMiddleware, (req, res) => {
  res.json({
    message: "Protected route working",
    userId: req.userId,
  });
});
app.put("/api/users/monthly-limit", authMiddleware, userController.updateMonthlyLimit);
app.get("/api/dashboard", authMiddleware, expenseController.getDashboard);




// expense endpoint accepts optional bill file
const multerOld = require("multer");
const uploadOld = multerOld({ dest: "uploads/" });

app.post("/api/expenses", authMiddleware, uploadOld.single("bill"), expenseController.addExpense);
app.get("/api/expenses", authMiddleware, expenseController.getExpenses);
app.delete("/api/expenses/:id", authMiddleware, expenseController.deleteExpense);
app.put("/api/expenses/:id", authMiddleware, expenseController.updateExpense);

app.get("/api/analytics/categories", authMiddleware, expenseController.getCategoryAnalytics);

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