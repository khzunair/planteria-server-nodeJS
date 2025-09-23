const express = require("express");
const sendEmail = require("../../../utils/email");
const {
  registerUser,
  loginUser,
  getUserDetails,
  verifyOtpAndRegister,
  forgotPassword,
  verifyOtpAndResetPassword,
  changePassword,
  logoutUser,
  refreshTokens,
} = require("../../../controller/Auth/UserController");
const auth = require("../../../middleware/userAuth");
const { validateRegister, validateLogin, validateOtp } = require("../../../middleware/validators/userValidator");
const validate = require("../../../middleware/validators/validateHandler");
const router = express.Router();

// Register
router.post( "/register",
  validateRegister,
  validate, 
  registerUser
);

//VerifyOtp
router.post("/verify-otp", validateOtp, validate, verifyOtpAndRegister);

// Login
router.post( "/login",
validateLogin,
  loginUser
);

// Logout
router.post('/logout', logoutUser);

// Refresh Token
router.post('/refresh-token', refreshTokens);


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
//Forget Password
router.post("/forget-Pswrd", auth, forgotPassword);
//verifyotp -reset pswrd
router.post("/verify-reset-Pswrd", auth, verifyOtpAndResetPassword);
//Change Password
router.post("/change-Pswrd", auth, changePassword);

module.exports = router;
