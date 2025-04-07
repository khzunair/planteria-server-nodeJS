const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  plan_id: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
  purchase_date: { type: Date, default: Date.now },
  expiry_date: { type: Date, required: true },
  remaining_scans: { type: Number, required: true },
  remaining_chatbot_interactions: { type: Number, required: true },
  status: {
    type: String,
    enum: ["active", "expired", "cancelled"],
    default: "active"
  }
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);
