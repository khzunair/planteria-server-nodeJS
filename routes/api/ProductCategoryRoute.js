const express = require("express");
const { check } = require("express-validator");
const {
  addCategory,
  getAllProductCategories,
  deleteProductCategory,
} = require("../../controller/Products/ProductCategory");
const adminAuth = require("../../middleware/adminAuth");

const router = express.Router();

// Route for admin to add a category
router.post(
  "/add-category",
  [
    adminAuth,
    check("categoryName", "Category name is required").not().isEmpty(),
  ],
  addCategory
);

// Route to fetch all product categories (public)
router.get("/get-all-categories", getAllProductCategories);

// Route for admin to delete a category by ID
router.delete("/delete-category/:id", adminAuth, deleteProductCategory);

module.exports = router;
