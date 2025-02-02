const Product = require("../../models/Product");
const ProductCategory = require("../../models/ProductCategory");

// <--------------Get all products categorized by their category--------------->
const getAllProductsByCategory = async (req, res) => {
  try {
    // Fetch all products from the database, populating both vendor and category details
    const products = await Product.find()
      .populate("vendor", "fullName email")
      .populate("category", "name"); // Populating category to get the category name

    if (!products || products.length === 0) {
      return res.status(404).json({ msg: "No products found" });
    }

    // Group products by category
    const categorizedProducts = {};
    products.forEach((product) => {
      const categoryName = product.category
        ? product.category.name.toUpperCase()
        : "Uncategorized";

      if (!categorizedProducts[categoryName]) {
        categorizedProducts[categoryName] = [];
      }
      // Include tags in each product
      categorizedProducts[categoryName].push({
        ...product.toObject(),
        tags: product.tags || [],
      });
    });

    // Return the grouped products with category names
    res.status(200).json({
      success: true,
      categorizedProducts,
    });
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).send("Server Error");
  }
};

// <--------------Get all products of specific category NAME--------------->

const getProductsByCategoryName = async (req, res) => {
  const { categoryName } = req.params; // Get the category name from the URL parameter

  try {
    // Fetch the category from the ProductCategory model
    const category = await ProductCategory.findOne({
      name: categoryName.toUpperCase(),
    });

    if (!category) {
      return res.status(404).json({ msg: "Category not found" });
    }

    // Fetch all products for that specific category, populating vendor and category details
    const products = await Product.find({ category: category._id })
      .populate("vendor", "fullName email")
      .populate("category", "name");

    if (!products || products.length === 0) {
      return res
        .status(404)
        .json({ msg: "No products found in this category" });
    }

    // Return the products for the specific category, including tags
    res.status(200).json({
      success: true,
      category: category.name,
      products: products.map((product) => ({
        ...product.toObject(),
        tags: product.tags || [],
      })),
    });
  } catch (err) {
    console.error("Error fetching products by category:", err.message);
    res.status(500).send("Server Error");
  }
};

// <--------------Search for products based on the search query (name, description, category, or tags)--------------->

const searchProducts = async (req, res) => {
  const { query } = req.query; // Get the search query from the URL parameter

  if (!query) {
    return res.status(400).json({ msg: "Search query is required" });
  }

  try {
    // Step 1: Search for the category by name (case-insensitive)
    const categories = await ProductCategory.find({
      name: { $regex: query, $options: "i" }, // Case-insensitive search
    });

    // Step 2: Extract category IDs from the found categories
    const categoryIds = categories.map((category) => category._id);

    // Step 3: Search for products matching the query in name, description, tags, or category
    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: "i" } }, // Search by product name (case-insensitive)
        { description: { $regex: query, $options: "i" } }, // Search by description (case-insensitive)
        { tags: { $regex: query, $options: "i" } }, // Search by tags (case-insensitive)
        { category: { $in: categoryIds } }, // Search by category IDs
      ],
    })
      .populate("vendor", "fullName email")
      .populate("category", "name"); // Populate category name

    if (!products || products.length === 0) {
      return res
        .status(404)
        .json({ msg: "No products found matching your search" });
    }

    // Return the products that match the search query
    res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    console.error("Error searching products:", err.message);
    res.status(500).send("Server Error");
  }
};

//<----------------FILTER PRODUCT ---------------->

const filterProducts = async (req, res) => {
  const { sortBy } = req.query;

  // Set default sort options
  let sortOption = {};

  // Determine the sort option based on the provided sortBy parameter
  switch (sortBy) {
    case "best-selling":
      sortOption = { soldCount: -1 }; // Assuming soldCount is the field for best-selling products
      break;
    case "name-asc":
      sortOption = { name: 1 }; // Alphabetically A-Z
      break;
    case "name-desc":
      sortOption = { name: -1 }; // Alphabetically Z-A
      break;
    case "price-asc":
      sortOption = { price: 1 }; // Price low to high
      break;
    case "price-desc":
      sortOption = { price: -1 }; // Price high to low
      break;
    case "latest":
      sortOption = { createdAt: -1 }; // Latest products
      break;
    default:
      sortOption = {}; // No sorting (default)
  }

  try {
    // Fetch all products based on the sort option
    const products = await Product.find()
      .populate("vendor", "fullName email")
      .populate("category", "name")
      .sort(sortOption);

    if (!products || products.length === 0) {
      return res.status(404).json({ msg: "No products found" });
    }

    // Return the sorted products
    res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    console.error("Error filtering products:", err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  getAllProductsByCategory,
  getProductsByCategoryName,
  searchProducts,
  filterProducts,
};
