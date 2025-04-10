const { validationResult } = require("express-validator");

const { uploads } = require("../../config/cloudinary");
const fs = require("fs");
const Product = require("../../models/Product");
const Review = require("../../models/Review");
const mongoose = require("mongoose");
const ProductCategory = require("../../models/ProductCategory");


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
          location: `${error.path || "Unknown field"}`,
        })),
      });
    }

    // Extract product details
    const { name, description, price, discountPrice, category, tags, quantity, weight } = req.body;

    // Check if product weight is valid
    if (!weight || isNaN(weight) || weight <= 0) {
      return res.status(400).json({
        success: false,
        msg: "Validation failed",
        errors: [{ msg: "Weight is required and must be a positive number", location: "weight" }],
      });
    }

    // Prevent Duplicate Product for Vendor
    const existingProduct = await Product.findOne({ name, vendor: req.vendor.id });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        msg: "A product with this name already exists under your vendor ID.",
      });
    }

    // Validate Image Upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        msg: "Validation failed",
        errors: [{ msg: "Image is required", location: "image field" }],
      });
    }

    // Upload Image to Cloudinary
    let imageUrl;
    try {
      const cloudinaryResult = await uploads(req.file.path);
      if (!cloudinaryResult || !cloudinaryResult.url) {
        throw new Error("Image upload failed");
      }
      imageUrl = cloudinaryResult.url;
    } catch (err) {
      console.error("Cloudinary Upload Error:", err.message);
      return res.status(500).json({ success: false, msg: "Image upload failed" });
    } finally {
      // Remove file from local storage
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Error deleting local file:", err.message);
      }
    }

    // Save Product to Database
    const newProduct = new Product({
      vendor: req.vendor.id,
      name,
      description,
      price,
      discountPrice: discountPrice || null,
      category,
      image: imageUrl,
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      stock: quantity || 1,
      weight,
    });

    await newProduct.save();

    return res.status(201).json({
      success: true,
      msg: "Product added successfully",
      product: newProduct,
    });
  } catch (err) {
    console.error("Error adding product:", err.message);
    return res.status(500).json({
      success: false,
      msg: "Server Error",
      errors: [{ msg: err.message, location: "server" }],
    });
  }
};


const getUserProducts = async (req, res) => {
  try {
    // Get the vendor ID from the authenticated request
    const vendorId = req.vendor.id;
    // console.log("Vendor ID:", vendorId);

    // Fetch all products created by the specific vendor
    const products = await Product.find({ vendor: vendorId })
      .sort({ createdAt: -1 }) // Sort by most recent first
      .populate('category', 'name') // Optionally populate category name
      .select('-__v'); // Exclude version key

    res.status(200).json({
      success: true,
      data: products,
      totalProducts: products.length
    });
  } catch (err) {
    console.error("Error fetching vendor products:", err.message);
    res.status(500).json({
      success: false,
      msg: "Server Error",
      errors: [{ msg: err.message, location: "server" }],
    });
  }
};
// Get products by category
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    // console.log(category)
    const products = await Product.find({ category });

    if (!products.length) {
      return res.status(404).json({
        success: false,
        msg: "No products found in this category",
      });
    }

    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Server error", error });
  }
};

// Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true });
    
    if (!products.length) {
      return res.status(404).json({
        success: false,
        msg: "No featured products available",
      });
    }

    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Server error", error });
  }
};

//<--------------- UPDATE PRODUCT --------------------->
const updateProduct = async (req, res) => {
  try {
    // ✅ Validate Request
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

    const { id } = req.params;
    const { name, description, price, category, stock, weight, size } = req.body;

    // ✅ Check if Product Exists
    let product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, msg: "Product not found" });
    }

    // ✅ Handle Image Update (If New Image is Uploaded)
    if (req.file) {
      // ✅ Delete Old Image from Cloudinary (If Exists)
      if (product.image) {
        const publicId = product.image.split("/").pop().split(".")[0]; // Extract Cloudinary Public ID
        await cloudinary.uploader.destroy(publicId);
      }

      // ✅ Upload New Image to Cloudinary
      const cloudinaryResult = await uploads(req.file.path);
      if (!cloudinaryResult || !cloudinaryResult.url) {
        return res.status(500).json({ success: false, msg: "Image upload failed" });
      }

      // ✅ Remove Local File After Upload
      fs.unlinkSync(req.file.path);

      // ✅ Update Product Image
      product.image = cloudinaryResult.url;
    }

    // ✅ Update Product Details
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = category || product.category;
    product.stock = stock || product.stock;
    product.weight = weight || product.weight;
    product.size = size || product.size;

    await product.save();

    res.json({
      success: true,
      msg: "Product updated successfully",
      product,
    });
  } catch (err) {
    console.error("Error updating product:", err.message);
    res.status(500).json({
      success: false,
      msg: "Server Error",
      errors: [{ msg: err.message, location: "server" }],
    });
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
      return res.status(404).json({ success: false, msg: "Product not found" });
    }

    // Check if the product's vendor ID matches the logged-in vendor's ID
    if (product.vendor.toString() !== req.vendor.id) {
      return res.status(403).json({
        success: false,
        msg: "Not authorized to delete this product",
      });
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
    res.status(500).json({
      success: false,
      msg: "Server Error",
      errors: [{ msg: err.message, location: "server" }],
    });
  }
};

// const getAllProducts = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, search = "" } = req.query;

//     // Define search criteria (if any)
//     const searchQuery = search
//       ? {
//           $or: [
//             { name: { $regex: search, $options: "i" } }, // Case-insensitive name search
//             { description: { $regex: search, $options: "i" } }, // Case-insensitive description search
//           ],
//         }
//       : {};

//     // Fetch products with pagination and search filter
//     const products = await Product.find(searchQuery)
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit));

//     // Count total products for pagination info
//     const totalProducts = await Product.countDocuments(searchQuery);

//     res.status(200).json({
//       success: true,
//       data: products,
//       totalProducts,
//       totalPages: Math.ceil(totalProducts / limit),
//       currentPage: parseInt(page),
//     });
//   } catch (err) {
//     console.error("Error fetching products:", err.message);
//     res.status(500).json({
//       success: false,
//       msg: "Server Error",
//       errors: [{ msg: err.message, location: "server" }],
//     });
//   }
// };

const getAllProducts = async (req, res) => {
  try {
    // Get the current date
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Create start and end dates for the current month
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Fetch products created in the current month
    const products = await Product.find({
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });

    res.status(200).json({
      success: true,
      data: products,
      totalProducts: products.length
    });
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).json({
      success: false,
      msg: "Server Error",
      errors: [{ msg: err.message, location: "server" }],
    });
  }
};


const searchProducts = async (req, res) => {
  try {
    const { query } = req.body;
    console.log(req.body)
    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        msg: "Search query is required",
        errors: [{ msg: "Search query is required", location: "body" }],
      });
    }

  

    // Create a regex pattern for case-insensitive search
    const searchPattern = new RegExp(query, "i");

    // Search in multiple fields: name, description, and tags
    const products = await Product.find({
      $or: [
        { name: searchPattern },
        { description: searchPattern },
        { tags: { $in: [searchPattern] } },
      ],
    }).populate("category vendor");

    res.status(200).json({
      success: true,
      data: products,
      count: products.length,
      query: query,
    });
  } catch (err) {
    console.error("Error searching products:", err.message);
    res.status(500).json({
      success: false,
      msg: "Server Error",
      errors: [{ msg: err.message, location: "server" }],
    });
  }
};




const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch product by ID
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, msg: "Product not found" });
    }

    // Fetch reviews associated with the product
    const reviews = await Review.find({ product: id })
      .populate("user", "name") // Populate user field with name
      .sort({ createdAt: -1 }); // Sort by latest reviews first

    res.status(200).json({
      success: true,
      data: {
        product,
        reviews,
      },
    });
  } catch (err) {
    console.error("Error fetching product by ID:", err.message);
    res.status(500).json({
      success: false,
      msg: "Server Error",
      errors: [{ msg: err.message, location: "server" }],
    });
  }
};
// Get products by category with a limit of 6 (for homepage)
const getSixProductsByCategory = async (req, res) => {
  try {
    // Fetch all categories
    const categories = await ProductCategory.find();

    // Fetch products for each category (limited to 6)
    const categoryProducts = await Promise.all(
      categories.map(async (category) => {
        const products = await Product.find({ category: category._id }).limit(5);
        return { category: category.name, products };
      })
    );

    res.status(200).json({
      success: true,
      categories: categoryProducts,
    });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({ success: false, msg: "Server error", error });
  }
};


const findProductByRecommendation = async (req, res) => {
  try {
    const { recommendation } = req.body;

    if (!recommendation || recommendation.trim() === "") {
      return res.status(400).json({
        success: false,
        msg: "Product recommendation is required",
        errors: [{ msg: "Product recommendation is required", location: "body" }],
      });
    }

    // Create a regex pattern for partial match, case-insensitive
    const searchPattern = new RegExp(recommendation, "i");

    // First try to find an exact match in the name
    let product = await Product.findOne({
      name: searchPattern
    }).populate("category vendor");

    // If no exact match found, try to find a product that contains the recommendation
    if (!product) {
      product = await Product.findOne({
        $or: [
          { name: { $regex: searchPattern } },
          { description: { $regex: searchPattern } },
          { tags: { $in: [searchPattern] } },
        ]
      }).populate("category vendor");
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        msg: "No matching product found for the recommendation",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error("Error finding product by recommendation:", err.message);
    res.status(500).json({
      success: false,
      msg: "Server Error",
      errors: [{ msg: err.message, location: "server" }],
    });
  }
}



module.exports = {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getFeaturedProducts,
  getSixProductsByCategory,
  getUserProducts,
  searchProducts,
  findProductByRecommendation
};
