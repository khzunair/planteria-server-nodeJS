const { validationResult } = require("express-validator");

const { uploads } = require("../../config/cloudinary");
const fs = require("fs");
const Product = require("../../models/Product");



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

        // Extract product details
        const { name, description, price, category, tags, quantity } = req.body;

        // Prevent Duplicate Products for Vendor
        const existingProduct = await Product.findOne({ name, vendor: req.vendor.id });
        if (existingProduct) {
          return res.status(400).json({
            success: false,
            msg: "A product with this name already exists under your vendor ID.",
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
  const { name, description, price, category, image } = req.body;

  try {
    // Find product by ID
    let product = await Product.findById(id);

    // If product does not exist
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    // Check if the vendor is authorized to update the product
    if (product.vendor.toString() !== req.vendor.id) {
      return res
        .status(403)
        .json({ msg: "Not authorized to update this product" });
    }

    // Update the product details
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = category || product.category;
    product.image = image || product.image;

    // Save the updated product
    await product.save();

    res.status(200).json({
      success: true,
      msg: "Product updated successfully",
      product: {
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        image: product.image,
      },
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
