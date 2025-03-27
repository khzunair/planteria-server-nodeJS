const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "RegisteredVendors", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    commission: { type: Number, default: 5 }, // 5% Commission Deduction
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
