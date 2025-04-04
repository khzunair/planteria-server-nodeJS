const Cart = require("../../models/Cart");
const Product = require("../../models/Product");

// Add to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id; // Extracted from middleware

    let cart = await Cart.findOne({ user: userId });

    if (!cart) cart = new Cart({ user: userId, items: [], totalAmount: 0 });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, msg: "Product not found" });

    // Validate stock availability
    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        msg: `Only ${product.stock} units of ${product.name} are available in stock`,
      });
    }

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (itemIndex > -1) {
      const updatedQuantity = cart.items[itemIndex].quantity + quantity;

      // Ensure the updated quantity does not exceed stock
      if (updatedQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          msg: `Only ${product.stock} units of ${product.name} are available in stock`,
        });
      }

      cart.items[itemIndex].quantity = updatedQuantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    // Ensure cart.items contains updated quantities before calculating total
    await cart.populate("items.product");

    cart.totalAmount = cart.items.reduce((sum, item) => {
      const itemPrice = item.product.price; // Ensure price is fetched correctly
      return sum + item.quantity * itemPrice;
    }, 0);

    await cart.save();

    res.json({ success: true, totalAmount: cart.totalAmount, cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Error adding to cart", error });
  }
};

exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id; // Extracted from middleware
    
    // Find the cart for the user
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart) {
      return res.status(404).json({ success: false, msg: "Cart not found" });
    }

    // Calculate total amount if needed (optional, as it might already be calculated)
    cart.totalAmount = cart.items.reduce((sum, item) => {
      const itemPrice = item.product.price; // Ensure price is fetched correctly
      return sum + item.quantity * itemPrice;
    }, 0);

    res.json({ success: true, cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Error fetching cart", error });
  }
};


// Remove product from cart
exports.removeProductFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    let cart = await Cart.findOne({ user: userId });

    if (!cart) return res.status(404).json({ success: false, msg: "Cart not found" });

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (itemIndex === -1) return res.status(404).json({ success: false, msg: "Product not in cart" });

    cart.items.splice(itemIndex, 1); // Remove the product from cart items

    // Recalculate total amount after removal
    cart.totalAmount = cart.items.reduce((sum, item) => {
      const itemPrice = item.product.price;
      return sum + item.quantity * itemPrice;
    }, 0);

    await cart.save();

    res.json({ success: true, totalAmount: cart.totalAmount, cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Error removing product from cart", error });
  }
};

// Update product quantity in cart
exports.updateCartQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { quantity } = req.body; // New quantity

    let cart = await Cart.findOne({ user: userId });

    if (!cart) return res.status(404).json({ success: false, msg: "Cart not found" });

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (itemIndex === -1) return res.status(404).json({ success: false, msg: "Product not in cart" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, msg: "Product not found" });

    // Validate stock availability
    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        msg: `Only ${product.stock} units of ${product.name} are available in stock`,
      });
    }

    // Update the quantity of the product in the cart
    cart.items[itemIndex].quantity = quantity;

    // Recalculate total amount
    cart.totalAmount = cart.items.reduce((sum, item) => {
      const itemPrice = item.product.price;
      return sum + item.quantity * itemPrice;
    }, 0);

    await cart.save();

    res.json({ success: true, totalAmount: cart.totalAmount, cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Error updating cart quantity", error });
  }
};


// Clear entire cart
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({ user: userId });

    if (!cart) return res.status(404).json({ success: false, msg: "Cart not found" });

    cart.items = []; // Empty the cart items array
    cart.totalAmount = 0; // Reset total amount

    await cart.save();

    res.json({ success: true, msg: "Cart cleared", cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Error clearing cart", error });
  }
};
