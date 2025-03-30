const express = require("express");
const { check } = require("express-validator");
const {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
} = require("../../controller/BusinessPlan/planController");
const AdminMiddleware = require("../../middleware/adminAuth");

const router = express.Router();

// <---------------- Route Definitions ---------------->

// Create Plan (Admin Only)
router.post(
  "/create-plan",
  [
    check("name", "Plan name is required").not().isEmpty(),
    check("description", "Description is required").not().isEmpty(),
    check("price", "Price must be a number").isFloat({ gt: 0 }),
    check("chatLimit", "Chat limit must be a number").isInt({ gt: 0 }),
    check("duration", "Duration must be a number").isInt({ gt: 0 }),
  ],
  AdminMiddleware,
  createPlan
);

// Get All Plans
router.get("/get-plan", getPlans);

// Get Plan by ID
router.get("/get-plan/:id", getPlanById);

// Update Plan (Admin Only)
router.put("/update-plan/:id", AdminMiddleware, updatePlan);

// Delete Plan (Admin Only)
router.delete("/delete-plan/:id", AdminMiddleware, deletePlan);

module.exports = router;
