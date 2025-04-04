const express = require("express");
const router = express.Router();

const  userAuth  = require("../../middleware/userAuth");
const  adminAuth  = require("../../middleware/adminAuth");
const { createOrder, getUserOrders, updateOrderStatus, getOrderStatus, getOrderById, getCurrentOrders, getTotalOrders, getSubmittedOrders } = require("../../controller/Orders/OrdersController");

// ✅ Create Order (Only Users)  
router.post("/create", userAuth, createOrder);

// Get order status (User must be authenticated)
router.get("/status/:orderId", getOrderStatus);

// Update order status (Admin only)
router.put("/update-status/:orderId", adminAuth, updateOrderStatus);

// 📦 Get User Orders (Only Users)
router.get("/my-orders", userAuth, getUserOrders);

// ✅ Get order details by ID for a user
router.get("/:orderId", userAuth, getOrderById);

// ✅ Get current orders (Orders that are not delivered yet)
router.get("/current-orders", userAuth, getCurrentOrders);

// ✅ Get total orders count for the user
router.get("/total-orders", userAuth, getTotalOrders);

// ✅ Get submitted orders (Orders placed but not shipped)
router.get("/submitted-orders", userAuth, getSubmittedOrders);






module.exports = router;

