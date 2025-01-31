const express = require("express");
const { check } = require("express-validator");
const {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../../controller/Products/ProductController");
const vendorAuth = require("../../middleware/vendorAuth");

const router = express.Router();

// Route for vendors to add a product
router.post(
  "/add-product",
  [
    vendorAuth,
    check("name", "Product name is required").not().isEmpty(),
    check("description", "Product description is required").not().isEmpty(),
    check("price", "Product price is required").isNumeric(),
    check("category", "Product category is required").not().isEmpty(),
    check("image", "Product image URL is required").not().isEmpty(),
  ],
  addProduct
);

// Route to get all products
router.get("/get-allproducts", getAllProducts);

// Route to get a product by ID
router.get("/get-product/:id", getProductById);

// Route for vendors to update a product
router.patch(
  "/update-product/:id",
  vendorAuth,
  [
    check("name", "Product name is required").optional().not().isEmpty(),
    check("description", "Product description is required")
      .optional()
      .not()
      .isEmpty(),
    check("price", "Product price is required").optional().isNumeric(),
    check("category", "Product category is required")
      .optional()
      .not()
      .isEmpty(),
    check("image", "Product image URL is required").optional().not().isEmpty(),
  ],
  updateProduct
);

// Route for vendors to delete a product
router.delete("/delete-product/:id", vendorAuth, deleteProduct);

module.exports = router;
