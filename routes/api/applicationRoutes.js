const express = require("express");
const { check } = require("express-validator");
const adminAuth = require("../../middleware/adminAuth");
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
    check("fullName").not().isEmpty().withMessage("Full Name is required."),
    check("email").isEmail().withMessage("Valid email is required."),
    check("phone").not().isEmpty().withMessage("Phone number is required."),
    check("address").not().isEmpty().withMessage("Address is required."),
    check("vendorType")
      .isIn(["Individual", "Small Business", "Large Supplier"])
      .withMessage("Invalid vendor type. Choose from Individual, Small Business, Large Supplier."),
    check("category").isArray({ min: 1 }).withMessage("At least one category is required."),
    check("coverLetter").not().isEmpty().withMessage("Cover Letter is required."),
    check("termsAccepted")
      .isBoolean()
      .withMessage("Terms must be accepted.")
      .custom((value) => value === true)
      .withMessage("You must accept the terms to proceed."),
  ],
  createApplication
);

// GET all applications (admin only)
router.get("/get-allapp", adminAuth, getAllApplications);

// GET single application details (admin only)
router.get("/get-appdetail/:id", adminAuth, getApplicationDetails);

// DELETE application (admin only)
router.delete("/delete-application/:id", adminAuth, deleteApplication);

// Update application status (admin only)
router.put("/update-status", adminAuth, updateApplicationStatus);

//VendorAuth Routes
// Route to fetch all registered vendors
router.get("/registered-vendors", getAllRegisteredVendors);
//Vendor Login
router.post("/vendor-login", loginVendor);

module.exports = router;
