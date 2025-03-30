const mongoose = require("mongoose");

const ShipmentSchema = new mongoose.Schema(
    {
        shippingMethod: { type: String, required: true }, // e.g., Standard, Express
        minWeight: { type: Number, required: true }, // Minimum weight range
        maxWeight: { type: Number, required: true }, // Maximum weight range
        fixedPrice: { type: Number, required: true }, // Fixed cost based on weight
        deliveryTime: { type: String, required: true }, // Estimated delivery time
        region: { type: String, required: true }, // E.g., Punjab, Non-Punjab, International
    },
    { timestamps: true }
);

module.exports = mongoose.model("Shipment", ShipmentSchema);
