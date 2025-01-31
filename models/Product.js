const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RegisteredVendors",
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId, // Reference to category model
      ref: "ProductCategory",
      required: true,
    },
    image: { type: String, required: false }, // Image as text (URL or path)
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
