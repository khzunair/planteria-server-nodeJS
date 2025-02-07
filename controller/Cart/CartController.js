const Cart = require("../../models/Cart");
const Product = require("../../models/Product");

// <-------------------✅ Add Product to Cart-------------------------->
const addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id; // Assuming user ID is available from the authenticated user

  try {
    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    // Check if there is enough stock available
    if (product.stock < quantity) {
      return res
        .status(400)
        .json({ msg: `Only ${product.stock} units available` });
    }

    // Check if a cart exists for the user
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      // If no cart exists, create a new one
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if the product already exists in the cart
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      // If product is already in the cart, update the quantity
      existingItem.quantity += quantity;
    } else {
      // Otherwise, add the new product to the cart with the price
      cart.items.push({
        product: productId,
        quantity,
        price: product.price, // Add the price of the product
      });
    }

    // Calculate the total price of the cart
    cart.total = cart.items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );

    // Save the cart
    await cart.save();

    // Return success response
    return res.status(200).json({ msg: "Product added to cart", cart });
  } catch (error) {
    console.error("Error adding to cart:", error.message);
    return res.status(500).json({ msg: "Server Error" });
  }
};

// ✅ <--------------------Get User's Cart with Total-------------------->

const calculateTax = (total) => {
  return total * 0.1; // Example: 10% tax
};
const calculateShipping = (total) => {
  if (total === 0) return 0; // No shipping cost for an empty cart
  if (total < 50) return 5; // Small orders get a $5 shipping fee
  if (total < 150) return 10; // Medium orders get a $10 shipping fee
  return 15; // Large orders get a $15 shipping fee
};

const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    let cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        msg: "Cart is empty",
        cart: {
          items: [],
          subtotal: 0,
          discount: 0,
          tax: 0,
          shipping: 0,
          finalTotal: 0,
        },
      });
    }

    // Calculate subtotal (before tax, shipping, and discounts)
    let subtotal = cart.items.reduce(
      (total, item) => total + item.quantity * item.product.price,
      0
    );

    // Get the applied discount from the cart (already calculated in applyCoupon)
    const discount = cart.discount || 0;

    // Calculate tax (example: 10%)
    const tax = subtotal * 0.1;

    // Calculate shipping charges
    const shipping = subtotal > 50 ? 0 : 5;

    // Final total after applying discount, tax, and shipping
    const finalTotal = subtotal - discount + tax + shipping;

    res.status(200).json({
      msg: "Cart fetched successfully",
      cart: {
        items: cart.items,
        subtotal,
        discount,
        tax,
        shipping,
        finalTotal,
      },
    });
  } catch (error) {
    console.error("Error fetching cart:", error.message);
    return res.status(500).json({ msg: "Server Error" });
  }
};

//<---------------------- ✅ Update Cart Item Quantity---------------->

const updateCartItem = async (req, res) => {
  try {
    const { cartItemId, productId, quantity } = req.body;
    const userId = req.user.id;

    if (quantity <= 0) {
      return res.status(400).json({ msg: "Quantity must be greater than 0" });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ msg: "Cart not found" });
    }

    let cartItem;

    // Allow update by either cartItemId or productId
    if (cartItemId) {
      cartItem = cart.items.find((item) => item._id.equals(cartItemId));
    } else if (productId) {
      cartItem = cart.items.find((item) => item.product.equals(productId));
    }

    if (!cartItem) {
      return res.status(404).json({ msg: "Item not found in cart" });
    }

    const product = await Product.findById(cartItem.product);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    if (product.quantity < quantity) {
      return res
        .status(400)
        .json({ msg: `Only ${product.quantity} units available` });
    }

    cartItem.quantity = quantity;
    await cart.save();

    return res.status(200).json({ msg: "Cart updated", cart });
  } catch (error) {
    console.error("Error updating cart:", error.message);
    return res.status(500).json({ msg: "Server Error" });
  }
};

// <----------------------✅ Remove a Single Item from Cart------------------>
const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ msg: "Cart not found" });
    }

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    await cart.save();

    res.status(200).json({ msg: "Item removed from cart", cart });
  } catch (err) {
    console.error("Error removing item from cart:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// <---------------------✅ Clear Entire Cart---------------->
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ msg: "Cart not found" });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({ msg: "Cart cleared", cart });
  } catch (err) {
    console.error("Error clearing cart:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
