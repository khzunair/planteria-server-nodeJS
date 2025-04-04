const SubscriptionPlan = require("../../models/SubscriptionPlan");

// ✅ 1. Create a Subscription Plan
exports.createPlan = async (req, res) => {
  try {
    const { name, price, scans, chatbot_interactions, validity, tags } = req.body;

    const newPlan = await SubscriptionPlan.create({
      name,
      price,
      scans,
      chatbot_interactions,
      validity,
      tags,
    });

    res.status(201).json({ success: true, msg: "Plan created successfully", plan: newPlan });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

// ✅ 2. Get All Subscription Plans (Active Only)
exports.getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ is_active: true }).sort({ price: 1 });

    res.status(200).json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

// ✅ 3. Get a Single Plan by ID
exports.getPlanById = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);

    if (!plan) return res.status(404).json({ success: false, msg: "Plan not found" });

    res.status(200).json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

// ✅ 4. Update a Subscription Plan
exports.updatePlan = async (req, res) => {
  try {
    const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!updatedPlan) return res.status(404).json({ success: false, msg: "Plan not found" });

    res.status(200).json({ success: true, msg: "Plan updated successfully", plan: updatedPlan });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

// ✅ 5. Delete a Subscription Plan (Soft Delete - Set is_active: false)
exports.deletePlan = async (req, res) => {
  try {
    const deletedPlan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });

    if (!deletedPlan) return res.status(404).json({ success: false, msg: "Plan not found" });

    res.status(200).json({ success: true, msg: "Plan deleted successfully (soft delete)", plan: deletedPlan });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};
