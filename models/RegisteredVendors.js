const mongoose = require("mongoose");

const RegisteredVendorSchema = new mongoose.Schema(
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
    password: { type: String, required: true }, // Hashed password
    vendorId: { type: String, required: true, unique: true }, // Vendor ID
  },
  { timestamps: true }
);

module.exports = mongoose.model("RegisteredVendors", RegisteredVendorSchema);
