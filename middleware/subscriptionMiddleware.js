const Subscription = require("../models/Subscription");

const subscriptionMiddleware = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find active subscription
    const subscription = await Subscription.findOne({
      user: userId,
      expiryDate: { $gt: new Date() },
    });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        msg: "No active subscription found. Please subscribe to continue.",
      });
    }

    // Check if user has remaining chats
    if (subscription.remainingChats <= 0) {
      return res.status(403).json({
        success: false,
        msg: "Chat limit exceeded. Please renew or upgrade your plan.",
      });
    }

    next();
  } catch (error) {
    console.error("Subscription Check Error:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

module.exports = subscriptionMiddleware;
