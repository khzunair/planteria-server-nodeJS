const express = require("express");
const router = express.Router();
const subscriptionController = require("../../controller/BusinessPlan/subscriptionController");
const auth = require("../../middleware/userAuth"); // user authentication

// 🔹 Subscribe to a plan
router.post("/subscribe/:planId", auth, subscriptionController.subscribeToPlan);

// 🔹 Get active subscription
router.get("/current", auth, subscriptionController.getActiveSubscription);

// 🔹 Use a scan (for plant disease detection, etc.)
router.post("/use-scan", auth, subscriptionController.useScan);

// 🔹 Use chatbot interaction
router.post("/use-chatbot", auth, subscriptionController.useChatbot);

// POST /api/chat
router.post("/chat", auth, subscriptionController.chatWithFlaskBot);

// 🔹 Get usage stats (remaining scans & interactions)
// router.get("/usage", auth, subscriptionController.getUsageStats);

module.exports = router;
