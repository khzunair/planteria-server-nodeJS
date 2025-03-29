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