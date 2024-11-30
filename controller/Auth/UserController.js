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

    // Generate  OTP
    const otpCode = Math.floor(10000 + Math.random() * 90000);
    // console.log("Temp User Data:", { name, email, password, role: "user" });

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
        password,
        role: roleObj._id,
      },
    });

    // console.log("OTP Entry before saving:", otpEntry);

    const savedOtpEntry = await otpEntry.save();
    // console.log("OTP Entry saved:", savedOtpEntry);

    // Send OTP email
    const subject = "Your Planteria OTP";
    const text = `Hello ${name},\n\nYour OTP for completing registration is: ${otpCode}`;
    await sendEmail(email, subject, text);

    res.status(200).json({
      msg: "OTP sent to email. Please verify to complete registration.",
    });
  } catch (err) {
    console.error("Error during registration:", err.message);
    res.status(500).send("Server Error");
  }
};

//VerifyOTP & Registered
const verifyOtpAndRegister = async (req, res) => {
  const { email, otp_code } = req.body;

  try {
    const otpEntry = await Otp.findOne({ email, otp_code, status: "active" });

    // Check if the OTP is valid and active
    if (!otpEntry) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Invalid or expired OTP" }] });
    }

    if (new Date() > otpEntry.expire_time) {
      return res.status(400).json({ errors: [{ msg: "OTP has expired" }] });
    }

    if (!otpEntry.temp_user_data) {
      // console.log("No temporary user data found in OTP entry");
      return res
        .status(400)
        .json({ errors: [{ msg: "No temporary user data found" }] });
    }

    // console.log(
    //   "Temp User Data retrieved from OTP entry:",
    //   otpEntry.temp_user_data
    // );

    const { name, password, role } = otpEntry.temp_user_data;

    // Validate the role
    const roleObj = await Role.findOne({ _id: role });
    if (!roleObj) {
      return res.status(400).json({ errors: [{ msg: "Invalid role" }] });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: roleObj._id,
      isActive: true,
    });

    await user.save();

    // Mark OTP as inactive to prevent reuse
    otpEntry.status = "inactive";
    await otpEntry.save();

    // Send a welcome email to the user
    const subject = "Welcome to Planteria!";
    const text = `Hello ${name},\n\nWelcome to Planteria! Your account has been successfully created.`;
    await sendEmail(email, subject, text);

    res.status(201).json({ msg: "User registered successfully" });
  } catch (err) {
    console.error("Error during OTP verification:", err.message);
    res.status(500).send("Server Error");
  }
};

// Log in user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ errors: [{ msg: "User not found" }] });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ errors: [{ msg: "User is not active. Contact admin." }] });
    }

    // console.log("User password from DB:", user.password);
    // console.log("Provided password:", password);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ errors: [{ msg: "Invalid credentials" }] });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      config.get("jwtSecret"),
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: { id: user.id, name: user.name, email: user.email },
        });
      }
    );
  } catch (err) {
    console.error("Error during login:", err.message);
    res.status(500).send("Server Error");
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

// Export the controllers
module.exports = {
  registerUser,
  loginUser,
  getUserDetails,
  verifyOtpAndRegister,
};
