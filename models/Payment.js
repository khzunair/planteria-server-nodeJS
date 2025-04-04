const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subscription_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true },
  amount: { type: Number, required: true },
  payment_method: { type: String, enum: ["Credit Card", "Bank Transfer", "COD"], required: true },
  transaction_id: { type: String, required: true, unique: true },
  status: { type: String, enum: ["successful", "failed", "pending"], default: "pending" },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Payment", PaymentSchema);
