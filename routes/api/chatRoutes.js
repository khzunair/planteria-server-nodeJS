const express = require("express");
const {
  deductChat,
  checkRemainingChats,
} = require("../../controller/BusinessPlan/chatUsageController");
const authMiddleware = require("../../middleware/userAuth");
const subscriptionMiddleware = require("../../middleware/subscriptionMiddleware");

const router = express.Router();

// Route to deduct a chat when the user interacts with the chatbot
router.post("/use-chat", authMiddleware, subscriptionMiddleware, deductChat);

// Route to check remaining chats
router.get("/remaining-chats", authMiddleware, checkRemainingChats);

module.exports = router;
