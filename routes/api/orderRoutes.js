const express = require("express");
const router = express.Router();

const  userAuth  = require("../../middleware/userAuth");
const { createOrder, getUserOrders } = require("../../controller/Orders/OrdersController");

// ✅ Create Order (Only Users)
router.post("/create", userAuth, createOrder);

// 📦 Get User Orders (Only Users)
router.get("/my-orders", userAuth, getUserOrders);



module.exports = router;

