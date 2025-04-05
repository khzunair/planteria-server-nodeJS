const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true }, 
    email: { type: String, required: true },
    address: { type: String, required: true },
    province: { type: String, required: true },
    trackingId: { type: String, required: true, unique: true },
    orderStatus: { 
      type: String, 
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"], 
      default: "Pending" 
    },
    orderSummary: {
      items: [
        {
          product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
          quantity: { type: Number, required: true },
          price: { type: Number, required: true }
        }
      ],
      subtotal: { type: Number, required: true },
      shipment: {
        shippingMethod: { type: String, required: true },
        totalShippingCost: { type: Number, required: true }
      },
      grandTotal: { type: Number, required: true },
      canOrder: { type: Boolean, default: true }
    }
  },
  { timestamps: true } 
);

module.exports = mongoose.model("Order", OrderSchema);
