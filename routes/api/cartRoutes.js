const express = require("express");

const auth = require("../../middleware/userAuth");
const {addToCart} = require("../../controller/Cart/CartController");

const router = express.Router();  

// Add product to cart
router.post("/add-cart", auth, addToCart);

// Get user's cart
// router.get("/getcart", auth, getCart);

// // Update cart item (change quantity)
// router.put("/update-cart/:itemId", auth, updateCartItem);

// // Remove a single item from cart
// router.delete("/remove-cart/:itemId", auth, removeCartItem);

// // Clear entire cart
// router.delete("/clear-cart", auth, clearCart);

module.exports = router;
