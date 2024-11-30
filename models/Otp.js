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
  // Add the temp_user_data field here
  temp_user_data: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true }, // Linking to the Role model
  },
});

module.exports = mongoose.model("Otp", OtpSchema);
