const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User who subscribed
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true }, // Plan details
    remainingChats: { type: Number, required: true }, // Chats left for the user
    expiryDate: { type: Date, required: true }, // Subscription expiry date
    isActive: { type: Boolean, default: true }, // Whether subscription is active
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
