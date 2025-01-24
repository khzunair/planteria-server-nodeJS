const express = require("express");
const { check } = require("express-validator");
const {
  createApplication,
  getAllApplications,
  getApplicationDetails,
  deleteApplication,
  updateApplicationStatus,
} = require("../../controller/Applications/ApplicationController");
const {
  getAllRegisteredVendors,
  loginVendor,
} = require("../../controller/Auth/VendorAuthController");

const router = express.Router();

// Create application
router.post(
  "/create-application",
  [
    check("fullName", "Full Name is required").not().isEmpty(),
    check("businessName", "Business Name is required").not().isEmpty(),
    check("phone", "Phone number is required").not().isEmpty(),
    check("email", "Valid email is required").isEmail(),
    check("address", "Address is required").not().isEmpty(),
    check("vendorType", "Vendor Type is required").not().isEmpty(),
    check("category", "Category is required").not().isEmpty(),
    check("coverLetter", "Cover Letter is required").not().isEmpty(),
  ],
  createApplication
);

// GETALL application
router.get("/get-allapp", getAllApplications);
// GETALL Detail application(specific)
router.get("/get-appdetail/:id", getApplicationDetails);
// DELETE application
router.delete("/delete-application/:id", deleteApplication);
// Update Application Status Route (Approve/Reject)
router.put("/update-status", updateApplicationStatus);

//VendorAuth Routes
// Route to fetch all registered vendors
router.get("/registered-vendors", getAllRegisteredVendors);
//Vendor Login
router.post("/vendor-login", loginVendor);

module.exports = router;
