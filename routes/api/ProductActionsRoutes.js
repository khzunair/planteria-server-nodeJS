const express = require("express");
const {
  getAllProductsByCategory,
  getProductsByCategoryName,
  searchProducts,
  filterProducts,
} = require("../../controller/Products/ProductActionsController");

const router = express.Router();

// Route to get all products categorized by their category
router.get("/categorized-products", getAllProductsByCategory);

// Route to get products by a specific category name
router.get("/category/:categoryName", getProductsByCategoryName);

// Route to search products
router.get("/search-products", searchProducts);

// Route to filter products
router.get("/filter-products", filterProducts);

module.exports = router;
