const express = require("express");
const { check } = require("express-validator");
const sendEmail = require("../../utils/email");
const {
  registerUser,
  loginUser,
  getUserDetails,
  verifyOtpAndRegister,
} = require("../../controller/Auth/UserController");
const auth = require("../../middleware/userAuth");

const router = express.Router();

// Register
router.post(
  "/register",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Include a valid email").isEmail(),
    check("password", "Password must be 6 or more characters").isLength({
      min: 6,
    }),
  ],
  registerUser
);

//VerifyOtp
router.post("/verify-otp", verifyOtpAndRegister);

// Login
router.post(
  "/login",
  [
    check("email", "Include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  loginUser
);

// Test Email Route
router.get("/test-email", async (req, res) => {
  try {
    const subject = "Test Email from Planteria";
    const text =
      "This is a test email to check if the email functionality is working.";

    const recipient = "roohaejaz69@gmail.com"; // Use recipient email here

    await sendEmail(recipient, subject, text); // Send email

    res.status(200).json({ msg: "Test email sent successfully!" });
  } catch (err) {
    console.error("Error sending test email:", err.message);
    res
      .status(500)
      .json({ msg: "Failed to send test email", error: err.message });
  }
});

// Get User Details
router.get("/details", auth, getUserDetails);

// Update Password
// router.put('/update-password', auth, updatePassword);

module.exports = router;
