const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function (req, res, next) {
  // Get token from the header
  //const token = req.header("x-auth-token");
  const token = req.header("Authorization")?.replace("Bearer ", "");

  // Check if token exists
  if (!token) {
    return res
      .status(401)
      .json({ errors: [{ msg: "AUTHORIZATION DENIED | Token is missing" }] });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token,process.env.JWT_SECRET);

    // Find the User using the ID from the decoded token
    const user = await User.findById(decoded.user.id);

    if (!user) {
      return res
        .status(401)
        .json({ errors: [{ msg: "AUTHORIZATION DENIED | User not found" }] });
    }

    // Attach the User object to req.user
    req.user = { id: user.id, role: user.role }; // Attach other fields if needed
    next(); // Pass control to the next middleware or route handler
  } catch (err) {
    console.error("Token validation error:", err.message);
    res
      .status(401)
      .json({ errors: [{ msg: "AUTHORIZATION DENIED | Invalid token" }] });
  }
};
