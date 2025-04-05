const mongoose = require("mongoose");

const PayoutSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amountPaid: { type: Number, required: true },
  transactionIds: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  ],
  method: {
    type: String,
    enum: ["BankTransfer", "Easypaisa", "JazzCash"],
    required: true,
  },
  status: {
    type: String,
    enum: ["Transferred", "Failed"],
    default: "Transferred",
  },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  paidAt: { type: Date, default: Date.now },
  note: { type: String },
});

module.exports = mongoose.model("Payout", PayoutSchema);
