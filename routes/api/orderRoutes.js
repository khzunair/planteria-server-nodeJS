const express = require("express");
const router = express.Router();

const  userAuth  = require("../../middleware/userAuth");
const  adminAuth  = require("../../middleware/adminAuth");
const { createOrder, getUserOrders, updateOrderStatus, getOrderStatus } = require("../../controller/Orders/OrdersController");

// ✅ Create Order (Only Users)  
router.post("/create", userAuth, createOrder);

// Get order status (User must be authenticated)
router.get("/status/:orderId", getOrderStatus);

// Update order status (Admin only)
router.put("/update-status/:orderId", adminAuth, updateOrderStatus);

// 📦 Get User Orders (Only Users)
router.get("/my-orders", userAuth, getUserOrders);



module.exports = router;

