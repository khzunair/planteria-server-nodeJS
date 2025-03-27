const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    lastLogin: { type: Date, default: Date.now },
    walletBalance: { type: Number, default: 0 },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }], // Customer Wishlist
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
  },
  { timestamps: true }
);



// Hash password before saving
// userSchema.pre('save', async function (next) {
//     if (!this.isModified('password')) return next();
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
// });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // Skip if password is already hashed
  const isHashed = /^\$2[aby]?\$/.test(this.password); // Check if password starts with bcrypt hash identifier
  if (isHashed) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("User", userSchema);
