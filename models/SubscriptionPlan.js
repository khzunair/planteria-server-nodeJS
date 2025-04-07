const mongoose = require("mongoose");

const SubscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 }, // 0 for free plan
  scans: { type: Number, required: true },
  chatbot_interactions: { type: Number, required: true },
  validity: { type: Number, required: true }, // number of days
  tags: { type: [String], default: [] },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);
