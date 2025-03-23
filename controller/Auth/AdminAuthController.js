const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { validationResult } = require("express-validator");
const Admin = require("../../models/Admin");

// ✅ Register Admin
const registerAdmin = async (req, res) => {
  const { name, username, password } = req.body;
  console.log("Register Admin Request Received");

  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin with this username already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const newAdmin = new Admin({
      name,
      username,
      password: hashedPassword,
      role: "admin",
    });

    await newAdmin.save();

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        id: newAdmin.id,
        name: newAdmin.name,
        username: newAdmin.username,
        role: newAdmin.role,
      },
    });
  } catch (err) {
    console.error("Error registering admin:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ✅ Admin Login
const loginAdmin = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
        statusCode: 400,
        error: { field: "username", msg: "Missing username or password" },
      });
    }

    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Admin not found",
        statusCode: 400,
        error: { field: "username", msg: "Admin not found" },
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
        statusCode: 400,
        error: { field: "password", msg: "Incorrect password" },
      });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const payload = { admin: { id: admin.id, role: "admin" } };

    jwt.sign(payload, config.get("jwtSecret"), { expiresIn: "10h" }, (err, token) => {
      if (err) throw err;
      res.json({
        success: true,
        message: "Admin login successful",
        statusCode: 200,
        token,
        user: {
          id: admin.id,
          name: admin.name,
          username: admin.username,
          role: "admin",
          lastLogin: admin.lastLogin,
        },
      });
    });
  } catch (err) {
    console.error("Error during admin login:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later.",
      statusCode: 500,
      error: { msg: err.message },
    });
  }
};


// ✅ Get Admin Details (Protected)
const getAdminDetails = async (req, res) => {
  try {
    console.log("Get Admin Details Request Received");

    const admin = await Admin.findById(req.admin.id).select("-password"); // Exclude password from response
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.status(200).json({ success: true, admin });
  } catch (err) {
    console.error("Error fetching admin details:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ✅ Change Password (Protected)
const changePassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  console.log("Change Admin Password Request Received");

  try {
    if (new_password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(current_password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    admin.password = await bcrypt.hash(new_password, 10);
    await admin.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Error changing password:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdminDetails,
  changePassword,
};
