const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true, // Ensures each coupon code is unique
  },
  discount: {
    type: Number, // Discount as percentage (e.g., 10 for 10% discount)
    required: true,
  },
  active: {
    type: Boolean,
    default: true, // If true, the coupon is active
  },
  expirationDate: {
    type: Date,
    required: false, // Optional expiration date for the coupon
  },
  applicableTo: {
    type: String,
    enum: ["product", "category", "cart"], // Defines whether coupon is for a product, category, or entire cart
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: false, // Only required if applicableTo is "product"
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductCategory",
    required: false, // Only required if applicableTo is "category"
  },
  usedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Tracks which users have used this coupon
    },
  ],
});

const Coupon = mongoose.model("Coupon", CouponSchema);

module.exports = Coupon;
