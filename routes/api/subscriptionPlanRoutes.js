const express = require("express");
const router = express.Router();
const subscriptionPlanController = require("../../controller/BusinessPlan/subscriptionPlanController");
const adminAuth = require("../../middleware/adminAuth");

// 🔹 Create a new subscription plan
router.post("/", adminAuth, subscriptionPlanController.createPlan);

// 🔹 Get all active plans
router.get("/", subscriptionPlanController.getPlans);

// 🔹 Get a single plan by ID
router.get("/:id", subscriptionPlanController.getPlanById);

// 🔹 Update a plan by ID
router.put("/:id", adminAuth, subscriptionPlanController.updatePlan);

// 🔹 Soft delete a plan (set is_active to false)
router.delete("/:id", adminAuth, subscriptionPlanController.deletePlan);

module.exports = router;
