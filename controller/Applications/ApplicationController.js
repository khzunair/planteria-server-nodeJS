const { validationResult } = require("express-validator");
const Application = require("../../models/Applications");
const {sendEmail} = require("../../utils/email");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const RegisteredVendor = require("../../models/RegisteredVendors");

// <-------------------Create Application ------------------------->

const createApplication = async (req, res) => {
  try {
    // Validate request body
    console.log(req.body)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Destructure request body
    const {
      fullName,
      businessName,
      phone,
      email,
      address,
      vendorType,
      category,
      coverLetter,
      profilePicture,
      termsAccepted,
    } = req.body;

    // Check if the email already exists
    const existingApplication = await Application.findOne({ email });

    if (existingApplication) {
      // Notify user that the email is already registered
      const subject = "Application Already Registered";
      const text = `Hello ${fullName},\n\nYour email is already registered for an application. Please check your details.`;
      // await sendEmail(email, subject, text);

      return res.status(400).json({
        success: false,
        message: "Application with this email already exists",
      });
    }

    // Create new application
    const newApplication = new Application({
      fullName,
      businessName,
      phone,
      email,
      address,
      vendorType,
      category,
      coverLetter,
      profilePicture: profilePicture || "", // Default to empty if not provided
      termsAccepted: termsAccepted || false, // Default to false if not provided
      status: "Pending", // Default application status
    });

    // Save to database
    await newApplication.save();

    // Notify user of successful submission
    const subject = "Application Submitted Successfully";
    const text = `Hello ${fullName},\n\nYour application has been successfully submitted. We will review it shortly and get back to you.`;
    // await sendEmail(email, subject, text);

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully. We'll email you shortly about the confirmation. Our team will review your application within 24 hours.",
      data: newApplication,
    });
  } catch (err) {
    console.error("Error submitting application:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later.",
    });
  }
};

// <-------------------Get all applications (fetches from the database) ----------------->

const getAllApplications = async (req, res) => {
  try {
    // console.log("hello")
    // Fetch all applications from the database
    const applications = await Application.find();

    // If no applications are found, send a proper response
    if (!applications || applications.length === 0) {
      return res.status(404).json({ msg: "No applications found" });
    }

    // Respond with the list of applications
    res.status(200).json({ applications });
  } catch (err) {
    console.error("Error fetching applications:", err.message);
    res.status(500).send("Server Error");
  }
};

// <-------------------Get Single Application Details -------------------->

const getApplicationDetails = async (req, res) => {
  const { id } = req.params; // Get the application ID from request parameters

  try {
    // Find the application by its ID
    const application = await Application.findById(id);

    // If application not found, return an error
    if (!application) {
      return res
        .status(404)
        .json({ errors: [{ msg: "Application not found" }] });
    }

    // Return the application details
    res.status(200).json({ application });
  } catch (err) {
    console.error("Error fetching application details:", err.message);
    res.status(500).send("Server Error");
  }
};

// <-------------------Delete Application(ID) by admin-------------------->

const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    // Find application by ID
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Delete application
    await Application.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting application:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Function to generate unique Vendor ID
const generateVendorId = async () => {
  const lastVendor = await RegisteredVendor.findOne().sort({ createdAt: -1 });
  let lastIdNumber = 0;

  if (lastVendor && lastVendor.vendorId) {
    const lastId = lastVendor.vendorId.split("-")[1]; // Extract number from ID
    lastIdNumber = parseInt(lastId, 10);
  }

  return `PLN-${String(lastIdNumber + 1).padStart(3, "0")}`;
};

// Function to generate random 8-character password
const generateRandomPassword = () => {
  return Math.random().toString(36).slice(-8);
};

// <----------------------------Function to update application status (Approve/Reject)--------------------->
const updateApplicationStatus = async (req, res) => {
  // Validate request body
  console.log(req.body)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { applicationId, status } = req.body;

  try {

    if (!(applicationId)) {
      return res.status(400).json({
        success: false,
        msg: "Application ID is required.",
      });
    }


    // Check if applicationId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid application ID format.",
      });
    }

    // Check if application exists
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        msg: "Application not found.",
      });
    }

    // Prevent re-approval of an already approved application
    if (application.status === "Approved") {
      return res.status(400).json({
        success: false,
        msg: "This application is already approved.",
      });
    }

    // Update status
    application.status = status;
    await application.save();

    // Handle rejection
    if (status === "Rejected") {

      return res.status(200).json({
        success: true,
        msg: "Application rejected, email sent to vendor.",
      });
    }

    // Handle approval
    if (status === "Approved") {
      const vendorId = await generateVendorId();
      const plainPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const newVendor = new RegisteredVendor({
        fullName: application.fullName,
        businessName: application.businessName,
        email: application.email,
        phone: application.phone,
        address: application.address,
        vendorType: application.vendorType,
        category: application.category,
        vendorId,
        password: hashedPassword,
      });

      await newVendor.save();

      await sendEmail(
        application.email,
        "Vendor Application Approved - Login Details",
        `Hello ${application.fullName},\n\nYour application has been approved.\n\nYour login credentials:\nVendor ID: ${vendorId}\nPassword: ${plainPassword}\n\nPlease log in and change your password immediately.`
      );

      return res.status(200).json({
        success: true,
        msg: "Application approved, credentials sent to vendor.",
      });
    }
  } catch (err) {
    console.error("Error updating application status:", err.message);
    return res.status(500).json({
      success: false,
      msg: "Internal Server Error. Please try again later.",
    });
  }
};


module.exports = {
  createApplication,
  getAllApplications,
  getApplicationDetails,
  deleteApplication,
  updateApplicationStatus,
};
