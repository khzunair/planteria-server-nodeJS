const express = require("express");
const { check } = require("express-validator");
const {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductsByCategory,
  getSixProductsByCategory,
  getUserProducts,
  searchProducts,
  searchProductByName
} = require("../../controller/Products/ProductController");
const vendorAuth = require("../../middleware/vendorAuth");
const userAuth = require("../../middleware/userAuth");
const { upload } = require("../../config/multer");


const router = express.Router();

// Route for vendors to add a product


router.post(
  "/add-product",
  vendorAuth,
  upload.single("image"), // Image Upload Middleware
  [
    check("name", "Product name is required").not().isEmpty(),
    check("description", "Product description is required").not().isEmpty(),
    check("price", "Product price is required").isNumeric(),
    check("category", "Product category is required").not().isEmpty(),
  ],
  addProduct
);

router.get("/search/without-index/:productName", searchProductByName)

// Route to get all products
router.get("/get-allproducts", getAllProducts);


router.get("/get-allvendorproducts",vendorAuth, getUserProducts);
// Route to get a product by ID
router.get("/get-product/:id", getProductById);


router.post("/searchproducts", searchProducts);



// Route for vendors to update a product
router.patch(
  "/update-product/:id",
  vendorAuth,
  upload.single("image"), // Image Upload Middleware
  [
    check("name", "Product name is required").optional().not().isEmpty(),
    check("description", "Product description is required").optional().not().isEmpty(),
    check("price", "Product price must be a number").optional().isNumeric(),
    check("category", "Product category is required").optional().not().isEmpty(),
    check("quantity", "Product stock must be a non-negative number").optional().isInt({ min: 0 }),
  ],
  updateProduct
);

// Route for vendors to delete a product
router.delete("/delete-product/:id", vendorAuth, deleteProduct);

router.get("/featured", getFeaturedProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/products-by-category", getSixProductsByCategory);

module.exports = router;
