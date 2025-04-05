const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    province: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ["COD", "CARD"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Unpaid"],
      default: "Unpaid",
    },
    message: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          // Basic validation for Pakistani phone numbers (starting with 03)
          return /^03\d{9}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`
      }
    },
    statusLogs: [
      {
        status: {
          type: String,
          enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // assuming the admin is also a User
        },
      }
    ],
    trackingId: { type: String, required: true, unique: true },
    orderStatus: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    orderSummary: {
      items: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          quantity: { type: Number, required: true },
          price: { type: Number, required: true },
        },
      ],
      subtotal: { type: Number, required: true },
      shipment: {
        shippingMethod: { type: String, required: true },
        totalShippingCost: { type: Number, required: true },
      },
      grandTotal: { type: Number, required: true },
      canOrder: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
