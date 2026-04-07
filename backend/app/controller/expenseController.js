const Expense = require("../model/expense");
const User = require("../model/user");
const mongoose = require("mongoose");

/* =========================
   ADD EXPENSE
========================= */
const cloudinary = require('../../config/cloudinary');
const { processBillImage } = require('../../services/aiBillParser');

exports.addExpense = async (req, res) => {
  try {
    const { date, description, amount, category } = req.body;
    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    let expenseData = {
      user: req.userId,
      amount: numericAmount,
      description: description?.trim() || "",
      category: (category || "General").trim(),
      date: date ? new Date(date) : new Date(),
    };

    // handle file upload to cloudinary if provided
    if (req.file) {
      try {
        // Step 1: Upload to Cloudinary using upload_stream (for memory buffer)
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "bills" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });

        expenseData.billImage = uploadResult.secure_url;
        expenseData.billUrl = uploadResult.secure_url;

        // Step 2: call AI to extract/refine additional info from bill
        const extracted = await processBillImage(req.file.buffer);
        if (extracted) {
          if (extracted.date) expenseData.date = new Date(extracted.date);
          if (extracted.amount) expenseData.amount = Number(extracted.amount);
          if (extracted.category) expenseData.category = extracted.category;
          if (extracted.description && !expenseData.description) {
            expenseData.description = extracted.description;
          }
        }
      } catch (uploadErr) {
        console.error("   ⚠️  File upload/extraction error:", uploadErr.message);
        // continue without file, don't fail the whole request
      }
    }

    const expense = await Expense.create(expenseData);
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add expense" });
  }
};

/* =========================
   GET USER EXPENSES
========================= */
exports.getExpenses = async (req, res) => {
  try {
    const { search = "", category = "" } = req.query;
    const filter = { user: req.userId };

    if (search) {
      // text search on description or category or date?
      filter.$or = [
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
};

/* =========================
   DELETE EXPENSE
========================= */
exports.deleteExpense = async (req, res) => {
  try {
    const deleted = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!deleted) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete expense" });
  }
};

/* =========================
   UPDATE EXPENSE
========================= */
exports.updateExpense = async (req, res) => {
  try {
    const { date, description, amount, category } = req.body;
    const update = {};

    if (date) update.date = new Date(date);
    if (description !== undefined) update.description = description.trim();
    if (amount !== undefined) update.amount = Number(amount);
    if (category !== undefined) update.category = category.trim();

    const updated = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: update },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update expense" });
  }
};

/* =========================
   DASHBOARD SUMMARY
========================= */
exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    // Get Monthly Spent
    const monthlyResult = await Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.userId),
          date: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const totalSpent = monthlyResult[0]?.total || 0;
    const monthlyLimit = user.monthlyLimit || 0;
    const remaining = monthlyLimit - totalSpent;

    const percentageUsed =
      monthlyLimit > 0
        ? Number(((totalSpent / monthlyLimit) * 100).toFixed(2))
        : 0;

    res.json({
      monthlyLimit,
      totalSpent,
      remaining: remaining > 0 ? remaining : 0,
      percentageUsed,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
};

/* =========================
   CATEGORY ANALYTICS
========================= */
exports.getCategoryAnalytics = async (req, res) => {
  try {
    const analytics = await Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.userId),
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const formatted = {};

    analytics.forEach((item) => {
      formatted[item._id] = item.total;
    });

    res.json(formatted);
  } catch (error) {
    console.error("ANALYTICS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
};