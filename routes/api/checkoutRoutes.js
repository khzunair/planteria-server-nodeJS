const express = require("express");
const router = express.Router();
const checkoutController = require("../../controller/Checkout/checkoutController")
const authMiddleware = require("../../middleware/userAuth");

router.post("/", authMiddleware, checkoutController.checkout);

module.exports = router;
  