const Expense = require("../model/expense");
const User = require("../model/user");
const mongoose = require("mongoose");

/* =========================
   ADD EXPENSE
========================= */
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

// configure cloudinary with env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const axios = require("axios");

// simple AI extraction (if Deepseek is available)
async function extractBillData(fileUrl) {
  // if no endpoint configured, skip AI extraction
  if (!process.env.DEEPSEEK_ENDPOINT) {
    return {};
  }

  try {
    // NOTE: Deepseek API may need a different payload structure
    // adjust according to your API documentation
    const res = await axios.post(
      process.env.DEEPSEEK_ENDPOINT,
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: `Extract the following from this bill image and return JSON: date, amount, category, description. Image URL: ${fileUrl}`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
      }
    );
    // parse response - adjust based on API response structure
    if (res.data?.choices?.[0]?.message?.content) {
      try {
        return JSON.parse(res.data.choices[0].message.content);
      } catch {
        return {};
      }
    }
    return {};
  } catch (e) {
    console.warn("AI extraction skipped:", e.message);
    return {};
  }
}

exports.addExpense = async (req, res) => {
  try {
    console.log("🔵 [ADD EXPENSE] Received request");
    console.log("   userId:", req.userId);
    console.log("   body:", req.body);
    console.log("   file:", req.file ? `${req.file.filename} (size: ${req.file.size})` : "none");

    const { date, description, amount, category } = req.body;
    const numericAmount = Number(amount);

    console.log("   parsed amount:", numericAmount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.error("   ❌ Invalid amount:", amount);
      return res.status(400).json({ message: "Valid amount is required" });
    }

    let expenseData = {
      user: req.userId,
      amount: numericAmount,
      description: description?.trim() || "",
      category: (category || "General").trim(),
      date: date ? new Date(date) : new Date(),
    };

    console.log("   📝 expenseData before save:", expenseData);

    // handle file upload to cloudinary if provided
    if (req.file) {
      try {
        console.log("   📸 Uploading file to Cloudinary...");
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          folder: "bills",
          resource_type: "auto",
        });
        expenseData.billUrl = uploadResult.secure_url;
        console.log("   ✅ File uploaded:", expenseData.billUrl);

        // clean up temp file
        await fs.promises.unlink(req.file.path).catch(() => {});

        // call AI to extract additional info from bill
        const extracted = await extractBillData(expenseData.billUrl);
        if (extracted && Object.keys(extracted).length > 0) {
          console.log("   🤖 AI extraction result:", extracted);
          if (extracted.date) expenseData.date = new Date(extracted.date);
          if (extracted.amount) expenseData.amount = Number(extracted.amount);
          if (extracted.category) expenseData.category = extracted.category.trim();
          if (extracted.description) expenseData.description = extracted.description.trim();
        }
      } catch (uploadErr) {
        console.error("   ⚠️  File upload/extraction error:", uploadErr.message);
        // continue without file, don't fail the whole request
      }
    }

    console.log("   💾 Saving to database...");
    const expense = await Expense.create(expenseData);
    console.log("   ✅ Expense created:", expense._id);

    res.status(201).json(expense);
  } catch (error) {
    console.error("❌ ADD EXPENSE ERROR:", error.message);
    console.error("   Stack:", error.stack);
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

    console.log("🔵 [GET EXPENSES] userId:", req.userId, "search:", search, "category:", category);

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

    console.log("   🔍 Query filter:", JSON.stringify(filter));

    const expenses = await Expense.find(filter).sort({ date: -1 });

    console.log("   ✅ Found expenses:", expenses.length);

    res.json(expenses);
  } catch (error) {
    console.error("❌ GET EXPENSES ERROR:", error.message);
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
    console.error("DELETE ERROR:", error);
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
    console.error("UPDATE ERROR:", error);
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

    const result = await Expense.aggregate([
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

    const totalSpent = result[0]?.total || 0;
    const monthlyLimit = user.monthlyLimit || 0;
    const remaining = monthlyLimit - totalSpent;

    const percentageUsed =
      monthlyLimit > 0
        ? Number(((totalSpent / monthlyLimit) * 100).toFixed(2))
        : 0;

    res.json({
      monthlyLimit,
      totalSpent,
      remaining,
      percentageUsed,
    });
  } catch (error) {
    console.error("DASHBOARD ERROR:", error);
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