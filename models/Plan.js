const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // Plan Name (e.g., Basic, Pro)
    price: { type: Number, required: true }, // Price of the plan
    totalChats: { type: Number, required: true }, // Total chats allowed in this plan
    duration: { type: Number, required: true }, // Plan validity in days
    description: { type: String }, // Optional description
    isActive: { type: Boolean, default: true }, // Whether the plan is available
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
