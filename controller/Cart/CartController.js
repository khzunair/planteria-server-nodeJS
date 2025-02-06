const Cart = require("../../models/Cart");
const Product = require("../../models/Product");

// <-------------------✅ Add Product to Cart-------------------------->
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id; // Get user ID from token

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [{ product: productId, quantity, price: product.price }],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ product: productId, quantity, price: product.price });
      }
    }

    // Calculate total price
    cart.total = cart.items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );

    await cart.save();
    res.status(200).json({ msg: "Product added to cart", cart });
  } catch (err) {
    console.error("Error adding to cart:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// ✅ <--------------------Get User's Cart with Total-------------------->
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res
        .status(200)
        .json({ msg: "Cart is empty", cart: { items: [], total: 0 } });
    }

    res.status(200).json({ cart });
  } catch (err) {
    console.error("Error fetching cart:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

//<---------------------- ✅ Update Cart Item Quantity---------------->
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ msg: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = quantity;
      await cart.save();
      return res.status(200).json({ msg: "Cart updated", cart });
    } else {
      return res.status(404).json({ msg: "Item not found in cart" });
    }
  } catch (err) {
    console.error("Error updating cart:", err.message);
    res.status(500).json({ msg: "Server error" });
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
