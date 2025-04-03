const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    rating: { type: Number, min: 1, max: 5 },
    image: { type: String, default: null }, // Optional image
    feedback: { type: String, default: "" }, // Optional feedback
    status: { type: String, enum: ["Pending", "Submitted" , "Approved", "Rejected"], default: "Pending" }, // Admin approval system
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", ReviewSchema);
