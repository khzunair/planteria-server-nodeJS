const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { validationResult } = require("express-validator");
const User = require("../../models/User");
const Role = require("../../models/Role");
const Otp = require("../../models/Otp");
const sendEmail = require("../../utils/email");

// Register User with OTP

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if the "user" role exists
    const roleObj = await Role.findOne({ name: "user" });
    if (!roleObj) {
      return res
        .status(500)
        .json({ errors: [{ msg: "Default user role not found" }] });
    }

    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Email already registered" }] });
    }

    // Check for existing active OTP
    const activeOtp = await Otp.findOne({
      email,
      status: "active",
      expire_time: { $gt: new Date() }, // OTP is still valid
    });

    if (activeOtp) {
      const remainingTime =
        (new Date(activeOtp.expire_time).getTime() - Date.now()) / 1000; // in seconds
      const remainingMinutes = Math.ceil(remainingTime / 60); // in minutes

      return res.status(429).json({
        errors: [
          {
            msg: `An OTP has already been sent. Please wait ${
              remainingMinutes > 0 ? remainingMinutes : 5
            } minutes before requesting another OTP.`,
          },
        ],
      });
    }

    // Generate OTP
    const otpCode = Math.floor(10000 + Math.random() * 90000);

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save OTP entry
    const otpEntry = new Otp({
      email,
      otp_code: otpCode,
      created_at: new Date(),
      expire_time: new Date(Date.now() + 5 * 60 * 1000), // OTP expires in 5 minutes
      status: "active",
      temp_user_data: {
        name,
        email,
        password: hashedPassword, // Save hashed password
        role: roleObj._id,
      },
    });

    const savedOtpEntry = await otpEntry.save();

    // Send OTP email
    const subject = "Your Planteria OTP";
    const text = `Hello ${name},\n\nYour OTP for completing registration is: ${otpCode}`;
    await sendEmail(email, subject, text);

    res.status(200).json({
      msg: "OTP sent to email. Please verify to complete registration.",
    });
  } catch (err) {
    //console.error("Error during registration:", err.message);
    res.status(500).send("Server Error");
  }
};

// verifyOtp And Registered
const verifyOtpAndRegister = async (req, res) => {
  const { email, otp_code } = req.body;

  try {
    const otpEntry = await Otp.findOne({ email, otp_code, status: "active" });

    if (!otpEntry) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Invalid or expired OTP" }] });
    }

    if (new Date() > otpEntry.expire_time) {
      return res.status(400).json({ errors: [{ msg: "OTP has expired" }] });
    }

    // Ensure that temporary user data exists in the OTP entry
    if (!otpEntry.temp_user_data) {
      return res
        .status(400)
        .json({ errors: [{ msg: "No temporary user data found" }] });
    }

    // Extract temporary user data from the OTP entry
    const { name, password, role } = otpEntry.temp_user_data;

    const roleObj = await Role.findOne({ _id: role });
    if (!roleObj) {
      return res.status(400).json({ errors: [{ msg: "Invalid role" }] });
    }

    const user = new User({
      name,
      email,
      password,
      role: roleObj._id,
      isActive: true,
    });

    await user.save();

    // OTP  inactive to prevent reuse
    otpEntry.status = "inactive";

    //  update the OTP entry
    await Otp.updateOne(
      { _id: otpEntry._id },
      { $unset: { temp_user_data: "" } }
    );

    const subject = "Welcome to Planteria!";
    const text = `Hello ${name},\n\nWelcome to Planteria! Your account has been successfully created.`;
    await sendEmail(email, subject, text);

    res.status(201).json({ msg: "User registered successfully" });
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

// Log in user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
        statusCode: 400,
        error: { field: "email", msg: "No account associated with this email" },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "User is not active. Contact admin.",
        statusCode: 403,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
        statusCode: 400,
        error: { field: "password", msg: "Incorrect password" },
      });
    }

    const payload = { user: { id: user.id, role: "user" } };

    jwt.sign(payload, config.get("jwtSecret"), { expiresIn: "10h" }, (err, token) => {
      if (err) throw err;
      res.json({
        success: true,
        message: "User login successful",
        statusCode: 200,
        token,
        user: { id: user.id, name: user.name, email: user.email, role: "user" },
      });
    });
  } catch (err) {
    console.error("Error during user login:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      statusCode: 500,
      error: { msg: err.message },
    });
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
