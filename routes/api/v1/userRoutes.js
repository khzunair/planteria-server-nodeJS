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
} = require("../../../controller/Auth/UserController");
const auth = require("../../../middleware/userAuth");
const { validateRegister, validateLogin } = require("../../../middleware/validators/userValidator");

const router = express.Router();

// Register
router.post( "/register",
  validateRegister,
  registerUser
);

//VerifyOtp
router.post("/verify-otp", verifyOtpAndRegister);

// Login
router.post( "/login",
validateLogin,
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
//Forget Password
router.post("/forget-Pswrd", auth, forgotPassword);
//verifyotp -reset pswrd
router.post("/verify-reset-Pswrd", auth, verifyOtpAndResetPassword);
//Change Password
router.post("/change-Pswrd", auth, changePassword);

module.exports = router;
