const express = require("express");
const {
  subscribePlan,
  renewSubscription,
  upgradeSubscription,
  getUserSubscription,
  cancelSubscription,
} = require("../../controller/BusinessPlan/subscriptionController");
const authMiddleware = require("../../middleware/userAuth");

const router = express.Router();

// Subscribe to a plan
router.post("/subscribe-plan", authMiddleware, subscribePlan);

// Renew subscription
router.post("/renew", authMiddleware, renewSubscription);

// Upgrade subscription
router.post("/upgrade-subcription", authMiddleware, upgradeSubscription);

// Get user subscription details
router.get("/my-subscription", authMiddleware, getUserSubscription);

// Cancel Subscription
router.delete("/cancel-subscription", authMiddleware, cancelSubscription);

module.exports = router;
