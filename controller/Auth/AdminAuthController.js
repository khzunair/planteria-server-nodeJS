const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { validationResult } = require("express-validator");
const Admin = require("../../models/Admin");

// Register Admin (Direct Registration)
const registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if admin email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Admin already exists with this email" }] });
    }

    // Create a new Admin object
    const newAdmin = new Admin({
      name,
      email,
      password,
    });

    // Save the admin to the database
    await newAdmin.save();

    res.status(201).json({ msg: "Admin registered successfully" });
  } catch (err) {
    console.error("Error during admin registration:", err.message);
    res.status(500).send("Server Error");
  }
};

// Admin Login
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ errors: [{ msg: "Admin not found" }] });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ errors: [{ msg: "Invalid credentials" }] });
    }

    // Create a JWT token
    const payload = { admin: { id: admin.id } };

    jwt.sign(
      payload,
      config.get("jwtSecret"),
      { expiresIn: "10h" }, // Token valid for 10 hours
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          admin: { id: admin.id, name: admin.name, email: admin.email },
        });
      }
    );
  } catch (err) {
    console.error("Error during admin login:", err.message);
    res.status(500).send("Server Error");
  }
};

// Get Admin Details (Protected)
const getAdminDetails = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-password"); // Exclude password from response
    if (!admin) {
      return res.status(404).json({ errors: [{ msg: "Admin not found" }] });
    }
    res.status(200).json({ admin });
  } catch (err) {
    console.error("Error fetching admin details:", err.message);
    res.status(500).send("Server Error");
  }
};

// Change Password (Protected)
const changePassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  try {
    if (new_password !== confirm_password) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Passwords do not match" }] });
    }

    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ errors: [{ msg: "Admin not found" }] });
    }

    const isMatch = await bcrypt.compare(current_password, admin.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Incorrect current password" }] });
    }

    admin.password = await bcrypt.hash(new_password, 10);
    await admin.save();

    res.status(200).json({ msg: "Password changed successfully" });
  } catch (err) {
    console.error("Error changing password:", err.message);
    res.status(500).send("Server Error");
  }
};

// Forgot Password (Unprotected)
const forgotPassword = async (req, res) => {
  const { email, new_password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ errors: [{ msg: "Admin not found" }] });
    }

    admin.password = await bcrypt.hash(new_password, 10);
    await admin.save();

    res.status(200).json({ msg: "Password reset successfully" });
  } catch (err) {
    console.error("Error in forgot password:", err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdminDetails,
  changePassword,
  forgotPassword,
};
