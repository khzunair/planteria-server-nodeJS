const Plan = require("../../models/Plan"); // Import Plan Model
const { validationResult } = require("express-validator");

// <---------------- Create a New Plan ---------------->
const createPlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, price, chatLimit, duration, totalChats } =
      req.body;

    // Check if any required field is missing
    if (
      !name ||
      !description ||
      !price ||
      !chatLimit ||
      !duration ||
      !totalChats
    ) {
      return res.status(400).json({
        success: false,
        msg: "All fields (name, description, price, chatLimit, duration, totalChats) are required.",
      });
    }

    // Check if the plan already exists
    const existingPlan = await Plan.findOne({ name });
    if (existingPlan) {
      return res
        .status(400)
        .json({ success: false, msg: "Plan already exists" });
    }

    const newPlan = new Plan({
      name,
      description,
      price,
      chatLimit,
      duration,
      totalChats,
    });

    await newPlan.save();

    res.status(201).json({
      success: true,
      msg: "Plan created successfully",
      plan: newPlan,
    });
  } catch (error) {
    console.error("Error creating plan:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

// <---------------- Get All Plans ---------------->
const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    if (!plans.length) {
      return res.status(404).json({ success: false, msg: "No plans found" });
    }
    res.status(200).json({ success: true, plans });
  } catch (error) {
    console.error("Error fetching plans:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

// <---------------- Get Plan by ID ---------------->
const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id);

    if (!plan) {
      return res.status(404).json({ success: false, msg: "Plan not found" });
    }

    res.status(200).json({ success: true, plan });
  } catch (error) {
    console.error("Error fetching plan:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

// <---------------- Update Plan ---------------->
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // Get fields to update

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        msg: "At least one field must be provided for an update.",
      });
    }

    const updatedPlan = await Plan.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedPlan) {
      return res.status(404).json({ success: false, msg: "Plan not found" });
    }

    let updatedFields = Object.keys(updates)
      .map((field) => `${field} is updated to ${updates[field]}`)
      .join(", ");

    res.status(200).json({
      success: true,
      msg: `Plan updated successfully. ${updatedFields}`,
      plan: updatedPlan,
    });
  } catch (error) {
    console.error("Error updating plan:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

// <---------------- Delete Plan ---------------->
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPlan = await Plan.findByIdAndDelete(id);
    if (!deletedPlan) {
      return res.status(404).json({ success: false, msg: "Plan not found" });
    }

    res.status(200).json({
      success: true,
      msg: "Plan deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting plan:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

// Export All Functions
module.exports = {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
};
