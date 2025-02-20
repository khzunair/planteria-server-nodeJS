const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const RegisteredVendor = require("../../models/RegisteredVendors");

// <------------------- Get All Registered Vendors -------------------->
const getAllRegisteredVendors = async (req, res) => {
  try {
    const vendors = await RegisteredVendor.find().select("-password");
    if (!vendors || vendors.length === 0) {
      return res.status(404).json({ msg: "No registered vendors found" });
    }
    res.status(200).json({ vendors });
  } catch (err) {
    console.error("Error fetching registered vendors:", err.message);
    res.status(500).send("Server Error");
  }
};

// <--------------------------------Vendor Login------------------------------------>

const loginVendor = async (req, res) => {
  // Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, vendorId, password } = req.body;

  try {
    // Ensure at least one of email or vendorId is provided
    if (!email && !vendorId) {
      return res.status(400).json({
        success: false,
        errors: [{ msg: "Either email or vendor ID is required." }],
      });
    }

    // Find vendor by email or vendorId
    const vendor = await RegisteredVendor.findOne({
      $or: [{ email }, { vendorId }],
    });

    if (!vendor) {
      return res.status(400).json({
        success: false,
        errors: [{ msg: "Vendor not found. Please check your credentials." }],
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        errors: [{ msg: "Invalid credentials. Please try again." }],
      });
    }

    // Generate JWT token
    const payload = {
      vendor: {
        id: vendor.id,
        vendorId: vendor.vendorId,
      },
    };

    jwt.sign(
      payload,
      config.get("jwtSecret"),
      { expiresIn: "10h" }, // Token valid for 10 hours
      (err, token) => {
        if (err) throw err;
        res.json({
          success: true,
          token,
          vendor: {
            id: vendor.id,
            fullName: vendor.fullName,
            email: vendor.email,
            vendorId: vendor.vendorId,
          },
        });
      }
    );
  } catch (err) {
    console.error("Error during vendor login:", err.message);
    res.status(500).json({
      success: false,
      msg: "Internal Server Error. Please try again later.",
    });
  }
};

module.exports = {
  getAllRegisteredVendors,
  loginVendor,
};
