const mongoose = require("mongoose");

const VendorAccountSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RegisteredVendors", 
    required: true,
    unique: true,
  },
  accountTitle: { type: String, required: true },
  bankName: { type: String },
  iban: { type: String },
  accountNumber: { type: String },
  paymentMethod: {
    type: String,
    enum: ["Bank", "JazzCash", "Easypaisa"],
    required: true,
  },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("VendorAccount", VendorAccountSchema);
