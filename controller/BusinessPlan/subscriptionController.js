const Subscription = require("../../models/Subscription");
const Plan = require("../../models/SubscriptionPlan");
const User = require("../../models/User");
const calculateExpiry = require("../../utils/calculateExpiry"); // Import utility function

// <---------------- Subscribe to a Plan ---------------->
const subscribePlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.id; // Assuming user is authenticated

    if (!planId) {
      return res.status(400).json({
        success: false,
        msg: "Plan ID is required.",
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        msg: "Plan not found.",
      });
    }

    // Ensure totalChats exists
    if (!plan.totalChats && plan.totalChats !== 0) {
      return res.status(400).json({
        success: false,
        msg: "Plan totalChats is missing.",
      });
    }

    // Check if User Already has an Active Subscription
    const existingSubscription = await Subscription.findOne({
      user: userId,
      expiryDate: { $gt: new Date() }, // Subscription should be active
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        msg: "You already have an active subscription.",
      });
    }

    // Calculate Expiry Date using utils function
    const expiryDate = calculateExpiry(plan.duration);

    // Create a New Subscription
    const newSubscription = new Subscription({
      user: userId,
      plan: planId,
      remainingChats: plan.totalChats, // ✅ Fixed here
      expiryDate,
    });

    await newSubscription.save();

    // Update User Model with Subscription Details
    await User.findByIdAndUpdate(userId, {
      $set: { subscription: newSubscription._id },
    });

    res.status(201).json({
      success: true,
      msg: "Subscription successful.",
      subscription: newSubscription,
    });
  } catch (error) {
    console.error("Error subscribing to plan:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

// <---------------- Renew Subscription ---------------->
const renewSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find User's Last Subscription
    const subscription = await Subscription.findOne({
      user: userId,
    }).sort({ expiryDate: -1 });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        msg: "No subscription found to renew.",
      });
    }

    const plan = await Plan.findById(subscription.plan);
    if (!plan) {
      return res.status(404).json({
        success: false,
        msg: "Plan associated with subscription not found.",
      });
    }

    // Calculate New Expiry Date using utils function
    const newExpiryDate = calculateExpiry(plan.duration);

    // Update Subscription
    subscription.expiryDate = newExpiryDate;
    subscription.remainingChats = plan.totalChats; // ✅ Fixed here
    await subscription.save();

    res.status(200).json({
      success: true,
      msg: "Subscription renewed successfully.",
      subscription,
    });
  } catch (error) {
    console.error("Error renewing subscription:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

// <---------------- Upgrade Subscription ---------------->
const upgradeSubscription = async (req, res) => {
  try {
    const { newPlanId } = req.body;
    const userId = req.user.id;

    if (!newPlanId) {
      return res.status(400).json({
        success: false,
        msg: "New plan ID is required.",
      });
    }

    const newPlan = await Plan.findById(newPlanId);
    if (!newPlan) {
      return res.status(404).json({
        success: false,
        msg: "New plan not found.",
      });
    }

    const currentSubscription = await Subscription.findOne({
      user: userId,
      expiryDate: { $gt: new Date() },
    });

    if (!currentSubscription) {
      return res.status(400).json({
        success: false,
        msg: "No active subscription found to upgrade.",
      });
    }

    // Prevent Downgrading
    const oldPlan = await Plan.findById(currentSubscription.plan);
    if (oldPlan.price >= newPlan.price) {
      return res.status(400).json({
        success: false,
        msg: "Upgrade to a higher-tier plan only.",
      });
    }

    // Ensure totalChats exists
    if (!newPlan.totalChats && newPlan.totalChats !== 0) {
      return res.status(400).json({
        success: false,
        msg: "New plan totalChats is missing.",
      });
    }

    // Calculate New Expiry Date using utils function
    const newExpiryDate = calculateExpiry(newPlan.duration);

    // Update Subscription
    currentSubscription.plan = newPlanId;
    currentSubscription.expiryDate = newExpiryDate;
    currentSubscription.remainingChats = newPlan.totalChats; // ✅ Fixed here
    await currentSubscription.save();

    res.status(200).json({
      success: true,
      msg: "Subscription upgraded successfully.",
      subscription: currentSubscription,
    });
  } catch (error) {
    console.error("Error upgrading subscription:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

// <---------------- Get User Subscription ---------------->
const getUserSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      user: userId,
      expiryDate: { $gt: new Date() },
    }).populate("plan");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        msg: "No active subscription found.",
      });
    }

    res.status(200).json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

//<--------------Cancel Subscription------------------>
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      user: userId,
      expiryDate: { $gt: new Date() }, // Only cancel active subscriptions
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        msg: "No active subscription found to cancel.",
      });
    }

    // Remove Subscription
    await Subscription.findByIdAndDelete(subscription._id);

    // Update User Model
    await User.findByIdAndUpdate(userId, { $unset: { subscription: "" } });

    res.status(200).json({
      success: true,
      msg: "Subscription canceled successfully.",
    });
  } catch (error) {
    console.error("Error canceling subscription:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

// Export All Functions
module.exports = {
  subscribePlan,
  renewSubscription,
  upgradeSubscription,
  getUserSubscription,
  cancelSubscription,
};
