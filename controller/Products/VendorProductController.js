const { validationResult } = require("express-validator");
const Product = require("../../models/Product");
const ProductCategory = require("../../models/ProductCategory");
const fs = require("fs");
const { uploads } = require("../../config/cloudinary");


//<--------------- ADD PRODUCT --------------------->

// Add Product
const addProduct = async (req, res) => {
  try {
    // Validate Request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        msg: "Validation failed",
        errors: errors.array().map((error) => ({
          msg: error.msg,
          location: `${error.path || "Unknown field"} field`,
        })),
      });
    }

    const allowedImageFormats = ["image/jpeg", "image/png", "image/webp"];
if (!allowedImageFormats.includes(req.file.mimetype)) {
  return res.status(400).json({
    success: false,
    msg: "Only JPG, PNG, and WEBP images are allowed",
  });
}

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        msg: "Validation failed",
        errors: [{ msg: "Image is required", location: "image field" }],
      });
    }

    // Upload Image to Cloudinary
    const cloudinaryResult = await uploads(req.file.path);
    if (!cloudinaryResult || !cloudinaryResult.url) {
      return res.status(500).json({
        success: false,
        msg: "Image upload failed",
      });
    }

    // Remove local file after upload
    fs.unlinkSync(req.file.path);

    // Extract product details
    const { name, description, price, category, tags, quantity } = req.body;

    if (!price || isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        msg: "Validation failed",
        errors: [{ msg: "Price must be a positive number", location: "price field" }],
      });
    }
    
    if (quantity !== undefined && (isNaN(quantity) || quantity < 0)) {
      return res.status(400).json({
        success: false,
        msg: "Validation failed",
        errors: [{ msg: "Quantity cannot be negative", location: "quantity field" }],
      });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, msg: "Product name is required" });
    }
    
    if (!description || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        msg: "Product description must be at least 10 characters",
      });
    }
    
    if (!category || !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, msg: "Invalid category ID" });
    }

    // Prevent Duplicate Products for Vendor
    const existingProduct = await Product.findOne({ name, vendor: req.vendor.id });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        msg: "A product with this name already exists under your vendor ID.",
      });
    }

    // Save Product to DB
    const newProduct = new Product({
      vendor: req.vendor.id,
      name,
      description,
      price,
      category,
      image: cloudinaryResult.url, // Cloudinary Image URL
      tags: tags ? tags.split(",") : [],
      quantity: quantity || 0,
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      msg: "Product added successfully",
      product: newProduct,
    });
  } catch (err) {
    console.error("Error adding product:", err.message);
    res.status(500).json({
      success: false,
      msg: "Server Error",
      errors: [{ msg: err.message, location: "server" }],
    });
  }
};
//<--------------- GET ALL PRODUCTS --------------------->

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();

    if (products.length === 0) {
      return res.status(404).json({ msg: "No products found." });
    }

    res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).json({ errors: [{ msg: "Server Error" }] });
  }
};

//<--------------- GET PRODUCT BY ID --------------------->

const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the product by its ID
    const product = await Product.findById(id);

    // If the product doesn't exist, return "Product not found"
    if (!product) {
      return res.status(404).json({ msg: "Product not found." });
    }

    // Return the product if found
    res.status(200).json({
      success: true,
      product,
    });
  } catch (err) {
    console.error("Error fetching product by ID:", err.message);
    res.status(500).json({ errors: [{ msg: "Server Error" }] });
  }
};

//<--------------- UPDATE PRODUCT --------------------->

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, image, tags, quantity } =
    req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, msg: "Invalid product ID" });
    }
    // Find product by ID
    let product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    // If category is provided, find the corresponding category ObjectId
    let categoryId;
    if (category) {
      // Ensure category name is treated case-insensitively
      const upperCaseCategoryName = category.toUpperCase();

      const categoryDoc = await ProductCategory.findOne({
        name: upperCaseCategoryName,
      });

      if (!categoryDoc) {
        return res.status(404).json({ msg: "Category not found" });
      }
      categoryId = categoryDoc._id;
    }

    // Check if vendor is authorized to update the product
    if (product.vendor.toString() !== req.vendor.id) {
      return res
        .status(403)
        .json({ msg: "Not authorized to update this product" });
    }

    // Update fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = categoryId || product.category; // Use ObjectId for category
    product.image = image || product.image;
    product.tags = tags || product.tags;
    product.quantity = quantity || product.quantity;

    // Save the updated product
    await product.save();

    res.status(200).json({
      success: true,
      msg: "Product updated successfully",
      product,
    });
  } catch (err) {
    console.error("Error updating product:", err.message);
    res.status(500).json({ errors: [{ msg: "Server Error" }] });
  }
};

//<--------------- DELETE PRODUCT --------------------->

const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the product by ID
    const product = await Product.findById(id);

    // If the product doesn't exist, return "Product not found"
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    // Check if the product's vendor ID matches the logged-in vendor's ID
    if (product.vendor.toString() !== req.vendor.id) {
      return res
        .status(403)
        .json({ msg: "Not authorized to delete this product" });
    }

    // Delete the product
    await Product.findByIdAndDelete(id);

    // Return success message after deletion
    res.status(200).json({
      success: true,
      msg: "Product deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting product:", err.message);
    res.status(500).json({ errors: [{ msg: "Server Error" }] });
  }
};

module.exports = {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
