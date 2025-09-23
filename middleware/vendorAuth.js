const jwt = require("jsonwebtoken");

const RegisteredVendor = require("../models/RegisteredVendors");

module.exports = async function (req, res, next) {
  // Get token from header
  const token = req.header("Authorization")?.replace("Bearer ", "");

  // If no token is found
  if (!token) {
    return res.status(401).json({
      errors: [{ msg: "Access denied. No token provided." }],
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the vendor using the ID from the token
    const vendor = await RegisteredVendor.findById(decoded.vendor.id);
    if (!vendor) {
      return res.status(401).json({ errors: [{ msg: "Vendor not found." }] });
    }

    // Attach vendor details to req.vendor
    req.vendor = { id: vendor.id, vendorId: vendor.vendorId };
    next();
  } catch (err) {
    console.error("Error verifying token:", err.message);
    res.status(401).json({ errors: [{ msg: "Invalid token." }] });
  }
};
