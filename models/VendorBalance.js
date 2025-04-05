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
});

module.exports = mongoose.model("VendorBalance", VendorBalanceSchema);
