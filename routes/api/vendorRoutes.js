const express = require("express");
const router = express.Router();
const vendorAuth = require("../../middleware/vendorAuth"); // Middleware to check vendor authentication
const {
  createOrUpdateVendorAccount,
  getVendorAccount,
} = require("../../controllers/vendorAccount.controller");

router.post("/account", vendorAuth, createOrUpdateVendorAccount); // Create/update
router.get("/account", vendorAuth, getVendorAccount);             // Get info

module.exports = router;
