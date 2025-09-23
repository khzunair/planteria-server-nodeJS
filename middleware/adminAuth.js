const jwt = require("jsonwebtoken");
const config = require("config");
const Admin = require("../models/Admin");

module.exports = async function (req, res, next) {
  // Get token from header
  const token = req.header("Authorization")?.replace("Bearer ", "");

  // If no token is found
  if (!token) {
    return res
      .status(401)
      .json({ errors: [{ msg: "Access denied. No token provided." }] });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);


    // Find the admin using the ID from the token
    const admin = await Admin.findById(decoded.admin.id);
    if (!admin) {
      return res.status(401).json({ errors: [{ msg: "Admin not found." }] });
    }

    // Attach admin details to req.admin
    req.admin = { id: admin.id };
    next();
  } catch (err) {
    console.error("Error verifying token:", err.message);
    res.status(401).json({ errors: [{ msg: "Invalid token." }] });
  }
};
