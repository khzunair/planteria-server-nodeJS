const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const authAdmin = require("../../middleware/adminAuth");
const {
  registerAdmin,
  loginAdmin,
  getAdminDetails,
  changePassword,
  // forgotPassword,
} = require("../../controller/Auth/AdminAuthController");
const adminAuth = require("../../middleware/adminAuth");

// ✅ Admin Register
router.post(
  "/register",
  [
    check("name", "Name is required").not().isEmpty(),
    check("username", "Username is required").not().isEmpty(),
    check("password", "Password must be at least 6 characters").isLength({ min: 6 }),
  ],
  registerAdmin
);

// ✅ Admin Login
router.post(
  "/login",
  [
    check("username", "Username is required").not().isEmpty(),
    check("password", "Password is required").not().isEmpty(),
  ],
  loginAdmin
);

// ✅ Get Admin Details (Protected)
router.get("/details", authAdmin, getAdminDetails);

// ✅ Change Password (Protected)
router.put(
  "/change-password",
  authAdmin,
  [
    check("current_password", "Current password is required").not().isEmpty(),
    check("new_password", "New password must be at least 6 characters").isLength({ min: 6 }),
    check("confirm_password", "Confirm password is required").not().isEmpty(),
  ],
  changePassword
);

// // Forgot Password
// router.post(
//   "/forgot-password",
//   [
//     check("email", "Please include a valid email").isEmail(),
//     check(
//       "new_password",
//       "New password must be at least 6 characters"
//     ).isLength({ min: 6 }),
//   ],
//   forgotPassword
// );

module.exports = router;
