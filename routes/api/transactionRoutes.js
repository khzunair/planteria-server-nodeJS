const express = require("express");
const router = express.Router();
const {
  getAllPendingTransactions,
  getVendorPendingTransactions,
  getTransactionById,
  getTransactionByIdForVendor,
  markTransactionPaidAndGeneratePayout,
  getPlatformFeeSummary
} = require("../../controller/Transaction/TransactionController");
const adminAuth = require("../../middleware/adminAuth");
const  auth = require("../../middleware/vendorAuth");

// Admin route
// Get all pending transactions
router.get("/pending", adminAuth, getAllPendingTransactions);

// Get transaction by ID
router.get("/:id", adminAuth, getTransactionById);

// Update transaction status to "Paid" and generate payout
router.post("/mark-paid", adminAuth, markTransactionPaidAndGeneratePayout);


router.get("/admin-stats/platform-earning-summary", adminAuth, getPlatformFeeSummary);






// Vendor route
// Get pending transactions for a specific vendor
router.get("/vendor/pending", auth, getVendorPendingTransactions);

// Get pending transactions for a specific vendor by ID
router.get("/vendor/:id", auth, getTransactionByIdForVendor);


module.exports = router;
