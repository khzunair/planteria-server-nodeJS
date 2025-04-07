const mongoose = require("mongoose");

const VendorBalanceSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RegisteredVendors",
    required: true,
    unique: true,
  },
  totalEarned: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  lastPaid: { type: Date },
});

module.exports = mongoose.model("VendorBalance", VendorBalanceSchema);
