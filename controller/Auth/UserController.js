const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { validationResult } = require("express-validator");
const User = require("../../models/User");
const Role = require("../../models/Role");
const Otp = require("../../models/Otp");
const { sendEmail } = require("../../utils/email");
const { successResponse, errorResponse } = require("../../utils/responseFormatter");

// Register User with OTP
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  // 🔍 1. Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, "Validation failed", errors.array(), 400);
  }

  try {
    // 🔍 2. Check for 'user' role
    const roleObj = await Role.findOne({ name: "user" });
    if (!roleObj) {
      return errorResponse(res, "Role setup error", [{ msg: "Default user role not found" }], 500);
    }

    // 🔍 3. Check for duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, "Duplicate email", [{ msg: "Email already registered" }], 400);
    }

    // 🔍 4. Check for active OTP
    const activeOtp = await Otp.findOne({
      email,
      status: "active",
      expire_time: { $gt: new Date() },
    });

    if (activeOtp) {
      const remainingMinutes = Math.ceil((new Date(activeOtp.expire_time) - Date.now()) / 60000);
      return errorResponse(res, "OTP already sent", [
        {
          msg: `An OTP has already been sent. Please wait ${remainingMinutes > 0 ? remainingMinutes : 5} minutes.`,
        },
      ], 429);
    }

    // 🔐 5. Create OTP and hash password
    const otpCode = Math.floor(10000 + Math.random() * 90000);
    const hashedPassword = await bcrypt.hash(password, 10);

    const otpEntry = new Otp({
      email,
      otp_code: otpCode,
      created_at: new Date(),
      expire_time: new Date(Date.now() + 5 * 60 * 1000),
      status: "active",
      temp_user_data: {
        name,
        email,
        password: hashedPassword,
        role: roleObj._id,
      },
    });

    await otpEntry.save();

    // 📧 6. Send Email
    try {
      await sendEmail(email, "Your Planteria OTP", `Hello ${name},\n\nYour OTP is: ${otpCode}`);
    } catch (emailErr) {
      console.error("Email error:", emailErr.message);
      return errorResponse(res, "Email delivery failed", [{ msg: "Failed to send OTP email" }], 500);
    }

    // 🎉 7. Success response
    return successResponse(res, "OTP sent to email. Please verify to complete registration.");
  } catch (err) {
    console.error("Registration error:", err.message);
    return errorResponse(res, "Server Error", [{ msg: err.message }], 500);
  }
};


// verifyOtp And Registered
const verifyOtpAndRegister = async (req, res) => {
  const { email, otp_code } = req.body;

  try {
    // 🔍 Find active OTP
    const otpEntry = await Otp.findOne({ email, otp_code, status: "active" });

    if (!otpEntry) {
      return errorResponse(res, "Invalid or expired OTP", [
        { msg: "Invalid or expired OTP" }
      ], 400);
    }

    // ⌛ Check if OTP has expired
    if (new Date() > otpEntry.expire_time) {
      return errorResponse(res, "OTP expired", [
        { msg: "OTP has expired" }
      ], 400);
    }

    // ❌ Ensure temp user data exists
    if (!otpEntry.temp_user_data) {
      return errorResponse(res, "No user data", [
        { msg: "No temporary user data found" }
      ], 400);
    }

    const { name, password, role } = otpEntry.temp_user_data;

    // 🔍 Check role
    const roleObj = await Role.findById(role);
    if (!roleObj) {
      return errorResponse(res, "Invalid role", [
        { msg: "Assigned role not found" }
      ], 400);
    }

    // ✅ Create user
    const user = new User({
      name,
      email,
      password,
      role: roleObj._id,
      isActive: true
    });

    await user.save();

    // ❌ Deactivate OTP and clear temp data
    otpEntry.status = "inactive";
    await otpEntry.save();
    await Otp.updateOne(
      { _id: otpEntry._id },
      { $unset: { temp_user_data: "" } }
    );

    // 📧 Send welcome email
    try {
      const subject = "Welcome to Planteria!";
      const text = `Hello ${name},\n\nWelcome to Planteria! Your account has been successfully created.`;
      await sendEmail(email, subject, text);
    } catch (emailErr) {
      console.error("Error sending welcome email:", emailErr.message);
      return errorResponse(res, "Email error", [
        { msg: "Failed to send welcome email" }
      ], 500);
    }

    // ✅ Success response
    return successResponse(res, "User registered successfully", {}, 201);

  } catch (err) {
    console.error("verifyOtpAndRegister error:", err.message);
    return errorResponse(res, "Server error", [{ msg: err.message }], 500);
  }
};


const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // 🔍 1. Input Validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, "Validation failed", errors.array(), 400);
  }

  // 🔍 2. Custom Field Checks
  if (!email || !password) {
    return errorResponse(res, "Missing fields", [
      {
        field: !email ? "email" : "password",
        msg: !email ? "Email is required" : "Password is required",
      },
    ], 400);
  }

  // 🔍 3. Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return errorResponse(res, "Invalid email format", [
      { field: "email", msg: "Please enter a valid email address" }
    ], 400);
  }

  // 🔍 4. Password length
  if (password.length < 6) {
    return errorResponse(res, "Weak password", [
      { field: "password", msg: "Password must be at least 6 characters long" }
    ], 400);
  }

  try {
    // 🔍 5. Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return errorResponse(res, "User not found", [
        { field: "email", msg: "No account associated with this email" }
      ], 400);
    }

    if (!user.isActive) {
      return errorResponse(res, "Inactive account", [
        { msg: "User is not active. Contact admin." }
      ], 403);
    }

    // 🔐 6. Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, "Invalid credentials", [
        { field: "password", msg: "Incorrect password" }
      ], 400);
    }

    // 🔐 7. Generate JWT token
    const payload = {
      user: {
        id: user.id,
        role: "user",
      },
    };

    jwt.sign(payload, config.get("jwtSecret"), { expiresIn: "10h" }, (err, token) => {
      if (err) {
        console.error("JWT generation error:", err.message);
        return errorResponse(res, "Token generation failed", [{ msg: err.message }], 500);
      }

      // ✅ Success response
      return successResponse(res, "User login successful", {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: "user",
        },
      });
    });

  } catch (err) {
    console.error("Login error:", err.message);
    return errorResponse(res, "Server Error", [{ msg: err.message }], 500);
  }
};

//Get User Details
const getUserDetails = async (req, res) => {
  try {
    // Fetch the user details using the user ID from req.user
    const user = await User.findById(req.user.id).select("-password"); // Exclude password from the response

    if (!user) {
      return res.status(404).json({ errors: [{ msg: "User not found" }] });
    }

    // Return user details
    res.status(200).json({ user });
  } catch (err) {
    console.error("Error fetching user details:", err.message);
    res.status(500).send("Server Error");
  }
};

// Forgot Password - Send OTP
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ errors: [{ msg: "User not found" }] });
    }

    // Generate OTP
    const otpCode = Math.floor(10000 + Math.random() * 90000);

    // Create OTP entry in the database
    const otpEntry = new Otp({
      email,
      otp_code: otpCode,
      created_at: new Date(),
      expire_time: new Date(Date.now() + 5 * 60 * 1000), // OTP expires in 5 minutes
      status: "active",
    });

    await otpEntry.save();

    // Send OTP email
    const subject = "Password Reset OTP";
    const text = `Hello,\n\nYour OTP for resetting your password is: ${otpCode}. This OTP is valid for 5 minutes.`;
    await sendEmail(email, subject, text);

    // Respond with success message
    res.status(200).json({
      msg: "OTP sent to email. Use this OTP to reset your password.",
      otp: process.env.NODE_ENV === "development" ? otpCode : undefined, // For development only
    });

    // Uncomment the below line if needed for debugging in the future
    // console.log("OTP sent to email:", otpCode);
  } catch (err) {
    console.error("Error in forgot password:", err.message);
    res.status(500).send("Server Error");
  }
};

// VerifyOtp & Reset Password
const verifyOtpAndResetPassword = async (req, res) => {
  const { email, otp_code, new_password } = req.body;

  try {
    // Find the OTP entry in the database
    const otpEntry = await Otp.findOne({ email, otp_code, status: "active" });

    if (!otpEntry) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Invalid or expired OTP" }] });
    }

    // Check if OTP is expired
    if (new Date() > otpEntry.expire_time) {
      return res.status(400).json({ errors: [{ msg: "OTP has expired" }] });
    }

    // Hash the new password before saving
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Find the user to update the password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ errors: [{ msg: "User not found" }] });
    }

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    // Mark OTP as used (inactive)
    otpEntry.status = "inactive";
    await otpEntry.save();

    res.status(200).json({ msg: "Password updated successfully" });
  } catch (err) {
    // console.error("Error in reset password:", err.message); // Commented out for future debugging
    res.status(500).send("Server Error");
  }
};

//Change Password
const changePassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  try {
    // Check if new password and confirm password match
    if (new_password !== confirm_password) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Passwords do not match" }] });
    }

    // Fetch the user from the database using the user id from JWT token (already in req.user)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ errors: [{ msg: "User not found" }] });
    }

    // Compare the current password with the hashed password in the database
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Incorrect current password" }] });
    }

    // Hash the new password before saving it
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update the user's password in the database
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ msg: "Password changed successfully" });
  } catch (err) {
    console.error("Error changing password:", err.message);
    res.status(500).send("Server Error");
  }
};

// Export the controllers
module.exports = {
  registerUser,
  loginUser,
  getUserDetails,
  verifyOtpAndRegister,
  forgotPassword,
  verifyOtpAndResetPassword,
  changePassword,
};
