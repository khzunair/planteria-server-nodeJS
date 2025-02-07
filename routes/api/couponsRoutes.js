// routes/coupons.js
const express = require("express");
const {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
} = require("../../controller/Cart/CouponController");
const adminAuth = require("../../middleware/adminAuth");
const auth = require("../../middleware/userAuth");

const router = express.Router();

// Admin routes for coupon management
router.post("/create-coupon", adminAuth, createCoupon); // Admin creates a coupon
router.put("/update-coupon/:id", adminAuth, updateCoupon); // Admin updates a coupon
router.delete("/delete-coupon/:id", adminAuth, deleteCoupon); // Admin deletes a coupon
// Get Coupon
router.get("/get-coupon", getCoupons);

// User applies a coupon to their cart
router.post("/apply-coupon", auth, applyCoupon);

module.exports = router;
