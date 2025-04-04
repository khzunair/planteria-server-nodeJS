const express = require("express");

const auth = require("../../middleware/userAuth");
const {addToCart, getCart, removeProductFromCart, updateCartQuantity, clearCart} = require("../../controller/Cart/CartController");

const router = express.Router();  

// Add product to cart
router.post("/add-cart", auth, addToCart);

// Get user's cart
router.get("/getcart", auth, getCart); 

// Remove product from cart
router.delete("/remove-product/:productId", auth, removeProductFromCart);

// Update product quantity in cart
router.put("/update-cart/:productId", auth, updateCartQuantity);

// Clear entire cart
router.delete("/clear-cart", auth, clearCart);



module.exports = router;
