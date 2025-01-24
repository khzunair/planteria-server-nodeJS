const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema({
  otp_code: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  expire_time: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  email: {
    type: String,
    required: true,
  },
  // Updated temp_user_data field: now optional
  temp_user_data: {
    name: { type: String },
    email: { type: String },
    password: { type: String },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" }, // Linking to the Role model
  },
});

module.exports = mongoose.model("Otp", OtpSchema);
