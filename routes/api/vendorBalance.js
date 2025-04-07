const express = require("express");
const router = express.Router();
const { getVendorBalanceSummary } = require("../../controller/VendorAccount/vendorBalanceController");
const vendorAuth = require("../../middleware/vendorAuth"); // Replace with your actual middleware

// GET /api/vendor/balance-summary
router.get("/balance-summary", vendorAuth, getVendorBalanceSummary);

module.exports = router;
