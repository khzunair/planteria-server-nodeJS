const express = require("express");
const router = express.Router();
const vendorAuth = require("../../middleware/vendorAuth"); // Middleware to check vendor authentication
const adminAuth = require("../../middleware/adminAuth"); // Middleware to check admin  authentication
const {
  createOrUpdateVendorAccount,
  getVendorAccount,
  getVendorAccountById,
  getAllVendorAccount,
} = require("../../controller/VendorAccount/vendorAccountController");

router.post("/account", vendorAuth, createOrUpdateVendorAccount); // Create/update
router.get("/account", vendorAuth, getVendorAccount);             // Get info


// ADMIN ROUTES
router.get("/account/:vendorId", adminAuth, getVendorAccountById);             
router.get("/allAccounts", adminAuth, getAllVendorAccount);             

// get all vendors accounts


module.exports = router;
