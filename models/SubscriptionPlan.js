const mongoose = require("mongoose");

const SubscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 }, // 0 for free plan
  scans: { type: Number, required: true },
  chatbot_interactions: { type: Number, required: true },
  validity: { type: String, required: true }, // e.g., "1 Month", "3 Months"
  tags: { type: [String], default: [] }, // Tags like "Best Selling", "Popular"
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);
