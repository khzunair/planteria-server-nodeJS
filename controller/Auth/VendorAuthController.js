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
  const { email, vendorId, password } = req.body;

  try {
    if (!email && !vendorId) {
      return res.status(400).json({
        success: false,
        message: "Either email or vendor ID is required.",
        statusCode: 400,
        error: { field: "identifier", msg: "Missing identifier" },
      });
    }

    const vendor = await RegisteredVendor.findOne({ $or: [{ email }, { vendorId }] });

    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor not found. Please check your credentials.",
        statusCode: 400,
        error: { field: "identifier", msg: "Vendor not found" },
      });
    }

    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials. Please try again.",
        statusCode: 400,
        error: { field: "password", msg: "Incorrect password" },
      });
    }

    const payload = { vendor: { id: vendor.id, vendorId: vendor.vendorId, role: "vendor" } };

    jwt.sign(payload, config.get("jwtSecret"), { expiresIn: "10h" }, (err, token) => {
      if (err) throw err;
      res.json({
        success: true,
        message: "Vendor login successful",
        statusCode: 200,
        token,
        user: {
          id: vendor.id,
          name: vendor.fullName,
          email: vendor.email,
          vendorId: vendor.vendorId,
          role: "vendor",
        },
      });
    });
  } catch (err) {
    console.error("Error during vendor login:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later.",
      statusCode: 500,
      error: { msg: err.message },
    });
  }
};


module.exports = {
  getAllRegisteredVendors,
  loginVendor,
};
