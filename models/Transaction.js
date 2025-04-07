const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RegisteredVendors",
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subtotal: { type: Number, required: true },
  platformFee: { type: Number, required: true },
  vendorEarning: { type: Number, required: true },
  status: { type: String, enum: ["Pending", "Paid", "Cancelled"], default: "Pending" },
  message: {
    type: String,
    default: ""
  },
  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("Transaction", TransactionSchema);
