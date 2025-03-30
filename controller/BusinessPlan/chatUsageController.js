const Subscription = require("../../models/Subscription");
const chatDeduction = require("../../utils/chatDeduction");

// <---------------- Deduct Chat on Usage ---------------->
const deductChat = async (req, res) => {
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

    // Check if the user has remaining chats
    if (subscription.remainingChats <= 0) {
      return res.status(403).json({
        success: false,
        msg: "You have exhausted your chat limit. Please renew or upgrade your plan.",
      });
    }

    // Deduct a chat
    subscription.remainingChats = chatDeduction(subscription.remainingChats);
    await subscription.save();

    res.status(200).json({
      success: true,
      msg: "Chat deducted successfully.",
      remainingChats: subscription.remainingChats,
    });
  } catch (error) {
    console.error("Error deducting chat:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

// <---------------- Check Remaining Chats ---------------->
const checkRemainingChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find active subscription
    const subscription = await Subscription.findOne({
      user: userId,
      expiryDate: { $gt: new Date() },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        msg: "No active subscription found.",
      });
    }

    res.status(200).json({
      success: true,
      remainingChats: subscription.remainingChats,
    });
  } catch (error) {
    console.error("Error checking remaining chats:", error.message);
    res.status(500).json({ success: false, msg: `Error: ${error.message}` });
  }
};

// Export Controllers
module.exports = {
  deductChat,
  checkRemainingChats,
};
