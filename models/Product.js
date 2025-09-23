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
    image: { type: String, required: true },
    tags: [{ type: String }],
    stock: { type: Number, required: true, default: 1 },
    weight: { 
      type: Number, 
      required: true, 
    },
    // rating is the average rating that will be updated with every review
    rating: { type: Number, default: 0 },
    // reviews: [{ user: mongoose.Schema.Types.ObjectId, rating: Number, comment: String, image: String }],
    isFeatured: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0 },
    isFeatured : { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Create a compound index for fast searches by name and category
ProductSchema.index({ name: 1, category: 1 });

// Optionally, create a text index for full-text search capabilities
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' }); 

module.exports = mongoose.model("Product", ProductSchema);
  