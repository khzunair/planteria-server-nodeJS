const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    businessName: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    vendorType: {
      type: String,
      enum: ["Individual", "Small Business", "Large Supplier"],
      required: true,
    },
    profilePicture: { type: String, required: false }, // Store file path or URL
    category: { type: [String], required: true }, // Example: ["Plants", "Seeds"]
    coverLetter: { type: String, required: true },
    termsAccepted: { type: Boolean, required: true, default: false },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

module.exports = mongoose.model("Applications", ApplicationSchema);
