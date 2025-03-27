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
    discountPrice: { type: Number }, // Optional discount price
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: true,
    },
    image: { type: String, required: true }, // Now required!
    tags: [{ type: String }],
    stock: { type: Number, required: true, default: 1 },
    rating: { type: Number, default: 0 },
    reviews: [{ user: mongoose.Schema.Types.ObjectId, rating: Number, comment: String }],
    isFeatured: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
