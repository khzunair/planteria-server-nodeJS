const Subscription = require("../../models/Subscription");
const SubscriptionPlan = require("../../models/SubscriptionPlan");
const Payment = require("../../models/Payment");
const mongoose = require("mongoose");

const axios = require("axios");

// Helper to calculate expiry date
const calculateExpiryDate = (validityInDays) => {
  const now = new Date();
  now.setDate(now.getDate() + validityInDays);
  return now;
};

// 🔹 Subscribe User to Plan
exports.subscribeToPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.params;
    // console.log(req.params)

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.is_active) return res.status(404).json({ success: false, msg: "Plan not found" });

    const activeSub = await Subscription.findOne({ user_id: userId, status: "active" });
    if (activeSub) return res.status(400).json({ success: false, msg: "User already has an active subscription" });

    const expiryDate = calculateExpiryDate(plan.validity);

    const newSubscription = new Subscription({
      user_id: userId,
      plan_id: plan._id,
      expiry_date: expiryDate,
      remaining_scans: plan.scans,
      remaining_chatbot_interactions: plan.chatbot_interactions,
    });

    await newSubscription.save();

    res.status(201).json({ success: true, msg: "Subscribed successfully", data: newSubscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

// 🔹 Get Current Active Subscription
exports.getActiveSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user_id: req.user.id,
      status: "active",
      expiry_date: { $gte: new Date() },
    }).populate("plan_id");

    if (!subscription)
      return res.status(404).json({ success: false, msg: "No active subscription found" });

    res.json({ success: true, data: subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

// 🔹 Use 1 Scan
exports.useScan = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user_id: req.user.id,
      status: "active",
      expiry_date: { $gte: new Date() },
    });

    if (!subscription) return res.status(403).json({ success: false, msg: "No active subscription" });

    if (subscription.remaining_scans <= 0)
      return res.status(403).json({ success: false, msg: "No scans left" });

    subscription.remaining_scans -= 1;
    await subscription.save();

    res.json({ success: true, msg: "Scan used", remaining_scans: subscription.remaining_scans });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

// 🔹 Use 1 Chatbot Interaction
exports.useChatbot = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user_id: req.user.id,
      status: "active",
      expiry_date: { $gte: new Date() },
    });

    if (!subscription) return res.status(403).json({ success: false, msg: "No active subscription" });

    if (subscription.remaining_chatbot_interactions <= 0)
      return res.status(403).json({ success: false, msg: "No chatbot interactions left" });

    subscription.remaining_chatbot_interactions -= 1;
    await subscription.save();

    res.json({ success: true, msg: "Chatbot interaction used", remaining_chatbot_interactions: subscription.remaining_chatbot_interactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};


// 🔹 POST /api/chat
exports.chatWithFlaskBot = async (req, res) => {
  const { message, chatHistory } = req.body;

  // 🔸 Validate request body
  if (!message || typeof message !== "string") {
    return res.status(400).json({
      success: false,
      msg: "'message' is required and must be a string.",
    });
  }

  if (!Array.isArray(chatHistory)) {
    return res.status(400).json({
      success: false,
      msg: "'chatHistory' is required and must be an array.",
    });
  }

  try {
    // 🔹 Call Flask API
    const response = await axios.post(`${process.env.FLASK_API_URL}/chat`, {
      message,
      chatHistory,
    });

    const botReply = response.data.response;

    return res.status(200).json({
      success: true,
      msg: "Chat successful",
      data: botReply,
    });
  } catch (error) {
    console.error("Error calling Flask API:", error.message);

    return res.status(500).json({
      success: false,
      msg: "Failed to communicate with Flask service",
    });
  }
};