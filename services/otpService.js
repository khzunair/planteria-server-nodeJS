// otpService.js
const Otp = require("../models/Otp");
const Role = require("../models/Role");
const User = require("../models/User");

exports.verifyOtpEntry = async (email, otp_code) => {
  const otp = await Otp.findOne({ email, otp_code, status: "active" });
  if (!otp) throw new Error("Invalid or expired OTP");
  if (new Date() > otp.expire_time) throw new Error("OTP expired");
  return otp;
};

exports.createUserFromOtp = async (otpEntry) => {
  const { name, password, role } = otpEntry.temp_user_data;
  const roleObj = await Role.findById(role);
  if (!roleObj) throw new Error("Assigned role not found");

  const user = new User({
    name,
    email: otpEntry.email,
    password,
    role: roleObj._id,
    isActive: true,
  });

  await user.save();
  return user;
};
