const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      default: ""
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    category: {
      type: String,
      default: "General",
      trim: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    billUrl: {
      type: String,
      trim: true,
    },
    billImage: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

expenseSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model("Expense", expenseSchema);