const { validationResult } = require("express-validator");
const Application = require("../../models/Applications");
const sendEmail = require("../../utils/email");
const bcrypt = require("bcryptjs");

const RegisteredVendor = require("../../models/RegisteredVendors");

// <-------------------Create Application ------------------------->

const createApplication = async (req, res) => {
  // Validate the request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Destructure the request body
  const {
    fullName,
    businessName,
    phone,
    email,
    address,
    vendorType,
    category,
    coverLetter,
  } = req.body;

  try {
    // Check if the email already exists in the database
    const existingApplication = await Application.findOne({ email });
    if (existingApplication) {
      // Send email notifying the user that the email is already registered
      const subject = "Application Already Registered";
      const text = `Hello ${fullName},\n\nYour email is already registered with us for an application. Please check your details.`;
      await sendEmail(email, subject, text);

      return res
        .status(400)
        .json({ errors: [{ msg: "Email is already in use" }] });
    }

    // Create a new application
    const newApplication = new Application({
      fullName,
      businessName,
      phone,
      email,
      address,
      vendorType,
      category,
      coverLetter,
      termsAccepted: req.body.termsAccepted || false, // Default value if not provided
    });

    // Save the application to the database
    await newApplication.save();

    // Send email to the user confirming the successful submission of the application
    const subject = "Application Submitted Successfully";
    const text = `Hello ${fullName},\n\nYour application has been successfully submitted. We will review it shortly and get back to you.`;
    await sendEmail(email, subject, text);

    // Return a success response
    res.status(201).json({ msg: "Application submitted successfully" });
  } catch (err) {
    console.error("Error submitting application:", err.message);
    res.status(500).send("Server Error");
  }
};

// <-------------------Get all applications (fetches from the database) ----------------->

const getAllApplications = async (req, res) => {
  try {
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
  const { applicationId, status } = req.body;

  try {
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ msg: "Application not found" });
    }

    if (application.status === "Approved") {
      return res
        .status(400)
        .json({ msg: "This application is already approved" });
    }

    application.status = status;
    await application.save();

    if (status === "Rejected") {
      await sendEmail(
        application.email,
        "Vendor Application Rejected",
        `Hello ${application.fullName},\n\nWe regret to inform you that your vendor application has been rejected.`
      );
      return res
        .status(200)
        .json({ msg: "Application rejected, email sent to vendor" });
    }

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

      return res
        .status(200)
        .json({ msg: "Application approved, credentials sent to vendor" });
    }
  } catch (err) {
    console.error("Error updating application status:", err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  createApplication,
  getAllApplications,
  getApplicationDetails,
  deleteApplication,
  updateApplicationStatus,
};
