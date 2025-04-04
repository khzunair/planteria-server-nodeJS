const mongoose = require("mongoose");

const UsageLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subscription_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true },
  action: { type: String, enum: ["scan", "chatbot"], required: true },
  used_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("UsageLog", UsageLogSchema);
