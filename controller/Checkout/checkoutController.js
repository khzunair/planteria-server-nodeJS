const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const Shipment = require("../../models/Shipment");

exports.checkout = async (req, res) => {
  try {
    const userId = req.user.id; // Extract user ID from middleware
    const { province, address } = req.body;

    // Fetch user's cart
    let cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, msg: "Cart is empty", canOrder: false });
    }

    let updatedItems = [];
    let stockIssues = [];
    let subtotal = 0;
    let uniqueVendors = new Set();

    // Fetch all product details at once
    const productIds = cart.items.map(item => item.product?._id);
    const products = await Product.find({ _id: { $in: productIds } }).populate("vendor");

    // Create a product map for quick lookup
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (let item of cart.items) {
      let product = productMap.get(item.product?._id?.toString());

      if (!product) {
        stockIssues.push({ productId: item.product?._id, msg: "Product no longer available" });
        continue;
      }

      if (!product.vendor) {
        return res.status(500).json({
          success: false,
          msg: `Product ${product.name} has no assigned vendor. Please contact support.`,
        });
      }

      uniqueVendors.add(product.vendor._id.toString());

      if (product.stock === 0) {
        stockIssues.push({ productId: product._id, name: product.name, msg: "Out of stock" });
        continue;
      }

      if (product.stock < item.quantity) {
        stockIssues.push({ productId: product._id, name: product.name, msg: `Only ${product.stock} available` });
        item.quantity = product.stock;
      }

      // Update price and subtotal
      subtotal += item.quantity * product.price;
      updatedItems.push({ product: product._id, quantity: item.quantity, weight: product.weight });
    }

    // ✅ **Enforce Single Vendor Policy**
    if (uniqueVendors.size > 1) {
      return res.status(400).json({
        success: false,
        msg: "All products in your cart must be from the same vendor. Please remove items from different stores.",
        canOrder: false,
      });
    }

    // Round subtotal
    subtotal = Math.round(subtotal);

    if (updatedItems.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "No valid products available for checkout",
        stockIssues,
        canOrder: false,
      });
    }

    await Cart.updateOne({ user: userId }, { items: updatedItems, totalAmount: subtotal });

    if (!province || !address) {
      return res.json({
        success: true,
        orderSummary: {
          items: updatedItems,
          subtotal,
          shipment: null,
          grandTotal: null,
          canOrder: false,
        },
        stockIssues: stockIssues.length > 0 ? stockIssues : null,
      });
    }

    // Fetch shipment plan
    let shipmentPlan = await Shipment.findOne({ region: province }) || await Shipment.findOne({ region: "Other Regions" });

    if (!shipmentPlan) {
      return res.status(400).json({ success: false, msg: "No shipment plan available", canOrder: false });
    }

    // Calculate total weight
    let totalWeight = updatedItems.reduce((sum, item) => sum + (item.quantity * item.weight), 0);

    // **Apply Tier-Based Shipping**
    let shipmentCost = 0;
    if (totalWeight <= 0.5) shipmentCost = 250;
    else if (totalWeight <= 1.0) shipmentCost = 350;
    else if (totalWeight <= 1.5) shipmentCost = 500;
    else if (totalWeight <= 2.0) shipmentCost = 700;
    else shipmentCost = shipmentPlan.basePrice + shipmentPlan.pricePerKg * totalWeight;

    // Round cost values
    shipmentCost = Math.round(shipmentCost);
    let grandTotal = Math.round(subtotal + shipmentCost);

    res.json({
      success: true,
      orderSummary: {
        items: updatedItems,
        subtotal,
        shipment: {
          shippingMethod: shipmentPlan.shippingMethod || "Standard",
          totalWeight,
          totalShippingCost: shipmentCost,
        },
        grandTotal,
        canOrder: true,
      },
      stockIssues: stockIssues.length > 0 ? stockIssues : null,
    });
  } catch (error) {
    console.error("Checkout Error:", error);
    res.status(500).json({ success: false, msg: "Server error", canOrder: false });
  }
};