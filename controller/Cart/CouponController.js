const Coupon = require("../../models/Coupon");
const Cart = require("../../models/Cart");
const { validationResult } = require("express-validator");

// <--------------Admin can create a coupon------------------->
const createCoupon = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      msg: "Validation failed. Please provide all required fields.",
      errors: errors.array().map((error) => {
        const fieldName = error.path || "Unknown field";
        return {
          msg: error.msg,
          location: `${fieldName} field`,
        };
      }),
    });
  }

  const {
    code,
    discount,
    expirationDate,
    applicableTo,
    active = true,
    productId,
    categoryId,
  } = req.body;

  // Ensure that applicableTo is either 'product', 'category', or 'cart'
  if (!["product", "category", "cart"].includes(applicableTo)) {
    return res
      .status(400)
      .json({ success: false, msg: "Invalid 'applicableTo' value" });
  }

  // If 'applicableTo' is 'product', make sure 'productId' is provided
  if (applicableTo === "product" && !productId) {
    return res.status(400).json({
      success: false,
      msg: "'productId' is required when 'applicableTo' is 'product'",
    });
  }

  // If 'applicableTo' is 'category', make sure 'categoryId' is provided
  if (applicableTo === "category" && !categoryId) {
    return res.status(400).json({
      success: false,
      msg: "'categoryId' is required when 'applicableTo' is 'category'",
    });
  }

  try {
    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res
        .status(400)
        .json({ success: false, msg: "Coupon code already exists" });
    }

    // Create new coupon
    const newCoupon = new Coupon({
      code,
      discount,
      expirationDate,
      applicableTo,
      active,
      productId,
      categoryId, // Optional, only set if applicableTo is 'product' or 'category'
    });

    await newCoupon.save();

    res.status(201).json({
      success: true,
      msg: "Coupon created successfully",
      coupon: newCoupon,
    });
  } catch (err) {
    console.error("Error creating coupon:", err.message);
    res.status(500).json({ errors: [{ msg: "Server Error" }] });
  }
};

// <-------------------Admin and User can  get all coupons----------------->
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    if (coupons.length === 0) {
      return res.status(404).json({ msg: "No coupons found" });
    }
    res.status(200).json({ success: true, coupons });
  } catch (err) {
    console.error("Error fetching coupons:", err.message);
    res.status(500).json({ errors: [{ msg: "Server Error" }] });
  }
};

// <----------------Admin can update a coupon------------------->
const updateCoupon = async (req, res) => {
  const { id } = req.params;
  const { code, discount, expirationDate, active } = req.body;

  try {
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ msg: "Coupon not found" });
    }

    // Update coupon fields
    coupon.code = code || coupon.code;
    coupon.discount = discount || coupon.discount;
    coupon.expirationDate = expirationDate || coupon.expirationDate;
    coupon.active = active !== undefined ? active : coupon.active;

    await coupon.save();
    res.status(200).json({ success: true, msg: "Coupon updated", coupon });
  } catch (err) {
    console.error("Error updating coupon:", err.message);
    res.status(500).json({ errors: [{ msg: "Server Error" }] });
  }
};

// <-----------------Admin can delete a coupon----------------------->
const deleteCoupon = async (req, res) => {
  const { id } = req.params;

  try {
    // Use findByIdAndDelete to delete the coupon by ID
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({ msg: "Coupon not found" });
    }

    res.status(200).json({ success: true, msg: "Coupon deleted successfully" });
  } catch (err) {
    console.error("Error deleting coupon:", err.message);
    res.status(500).json({ errors: [{ msg: "Server Error" }] });
  }
};

// <--------------------- User applies coupon -------------------->
const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.user.id;

    // Find user's cart
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ msg: "Cart is empty" });
    }

    // Find the coupon
    const coupon = await Coupon.findOne({ code: couponCode, active: true });
    if (!coupon) {
      return res.status(400).json({ msg: "Invalid or expired coupon" });
    }

    let discountAmount = 0;
    if (coupon.applicableTo === "cart") {
      // Apply discount on the entire cart
      discountAmount = (cart.total * coupon.discount) / 100;
    } else if (coupon.applicableTo === "product") {
      // Apply discount only to a specific product
      const discountedProduct = cart.items.find(
        (item) => item.product._id.toString() === coupon.productId.toString()
      );

      if (discountedProduct) {
        discountAmount =
          (discountedProduct.price *
            discountedProduct.quantity *
            coupon.discount) /
          100;
      }
    } else if (coupon.applicableTo === "category") {
      // Apply discount to products from a specific category
      cart.items.forEach((item) => {
        if (item.product.category.toString() === coupon.categoryId.toString()) {
          discountAmount +=
            (item.price * item.quantity * coupon.discount) / 100;
        }
      });
    }

    // Save the applied discount in the cart
    cart.discount = discountAmount;
    await cart.save();

    res.status(200).json({ msg: "Coupon applied successfully", cart });
  } catch (error) {
    console.error("Error applying coupon:", error.message);
    res.status(500).json({ msg: "Server Error" });
  }
};

module.exports = {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
};
