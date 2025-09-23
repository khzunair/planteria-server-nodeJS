const express = require("express");
const router = express.Router();

const userAuth = require("../../middleware/userAuth");
const adminAuth = require("../../middleware/adminAuth");
const vendorAuth = require("../../middleware/vendorAuth");

const { createOrder, getUserOrders, updateOrderStatus, getOrderStatus, getOrderById, getTotalOrders, getSubmittedOrders, getCurrentOrders, getAllOrders, getOrdersByStatus, getOrderByIdAdmin, getAllOrdersVendor, getAllOrdersVendorForAdmin, getOrderByIdVendor, getOrdersByStatusVendor
    , updateOrderStatusVendor } = require("../../controller/Orders/OrdersController");

// ✅ Create Order (Only Users)  
router.post("/create", userAuth, createOrder);

// Get order status (User must be authenticated)
router.get("/status/:orderId", getOrderStatus);

// 📦 Get User Orders (Only Users)
router.get("/my-orders", userAuth, getUserOrders);

// ✅ Get order details by ID for a user
router.get("/order/:orderId", userAuth, getOrderById);

// ✅ Get current orders (Orders that are not delivered yet)
router.get("/c/current-orders", userAuth, getCurrentOrders);

// ✅ Get total orders count for the user
router.get("/total-orders", userAuth, getTotalOrders);

// ✅ Get submitted orders (Orders placed but not shipped)
router.get("/delivered-orders", userAuth, getSubmittedOrders);



// ADMIN APIs

router.get("/admin/getAlllOrders", adminAuth, getAllOrders);


// ✅ Get order details by ID for a user
router.get("/admin/order/:orderId", adminAuth, getOrderByIdAdmin);

// GEt orders by vendors (Admin only)
// Get all orders for a specific vendor (Admin only)
router.get("/admin/vendor-order/:vendorId", adminAuth, getAllOrdersVendorForAdmin);

// Get orders by status (Admin only)
router.get("/getOrdersByStatus/:status", adminAuth, getOrdersByStatus);

// Update order status (Admin only)
router.put("/update-status/:orderId", adminAuth, updateOrderStatus);



// Vendors APIs


// Get all orders for a specific vendor (Vendor only)
router.get("/vendor/getAllOrders", vendorAuth, getAllOrdersVendor);

// Get order details by ID for a vendor
// Get order by ID (Vendor only)
router.get("/vendor/order/:orderId", vendorAuth, getOrderByIdVendor);

// Update order status (Vendor only)
router.get("/vendor/getOrdersByStatus/:status", vendorAuth, getOrdersByStatusVendor);

// Get Update status (Vendor only)
router.put("/vendor/update-status/:orderId", vendorAuth, updateOrderStatusVendor);





module.exports = router;

