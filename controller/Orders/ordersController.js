const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const Shipment = require("../../models/Shipment");
const { sendOrderConfirmationEmail } = require("../../utils/email");
const crypto = require("crypto");

// Helper function: Generate Order Tracking ID
const generateTrackingId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const randomStr = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 random chars
  return `ORD-${date}-${randomStr}`;
};

// Helper function: Generate Order Summary Email (HTML)
const generateOrderSummaryEmail = (order) => {
  const itemsHtml = order.orderSummary.items
    .map((item, index) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.product.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.price} PKR</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity * item.price} PKR</td>
      </tr>
    `)
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #4CAF50;">Order Confirmation - Planteria</h2>
      <p>Dear <strong>${order.name}</strong>,</p>
      <p>Thank you for your order! Your order has been received and is being processed.</p>

      <h3 style="color: #333;">Order Details</h3>
      <p><strong>Tracking ID:</strong> ${order.trackingId}</p>
      <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;" border="1" cellspacing="0" cellpadding="5">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th>#</th>
            <th>Product Name</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <p><strong>Subtotal:</strong> ${order.orderSummary.subtotal} PKR</p>
      <p><strong>Shipping Cost:</strong> ${order.orderSummary.shipment.totalShippingCost} PKR</p>
      <p><strong>Grand Total:</strong> ${order.orderSummary.grandTotal} PKR</p>
      <p><strong>Shipping Address:</strong> ${order.address}, ${order.province}</p>

      <h3 style="color: #4CAF50;">Track Your Order</h3>
      <p>You can track your order using the tracking ID: <strong>${order.trackingId}</strong>.</p>
      <p><a href="https://yourwebsite.com/track?trackingId=${order.trackingId}" style="color: #fff; background-color: #4CAF50; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Order</a></p>

      <p>We appreciate your business!</p>
      <p><strong>- The Planteria Team</strong></p>
    </div>
  `;
};

// Create Order (COD Implementation)
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, address, province, paymentMethod = "COD" } = req.body;

    if (!name || !email || !address || !province) {
      return res.status(400).json({
        success: false,
        msg: "Validation failed",
        errors: [
          !name && { msg: "Name is required", location: "body.name" },
          !email && { msg: "Email is required", location: "body.email" },
          !address && { msg: "Address is required", location: "body.address" },
          !province && { msg: "Province is required", location: "body.province" },
        ].filter(Boolean),
      });
    }

    let cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, msg: "Cart is empty" });
    }

    let updatedItems = [];
    let subtotal = 0;
    for (let item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (!product || product.stock < item.quantity) continue;
      product.stock -= item.quantity;
      product.salesCount += item.quantity;
      await product.save();
      subtotal += item.quantity * product.price;
      updatedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    if (updatedItems.length === 0) {
      return res.status(400).json({ success: false, msg: "No valid products available for checkout" });
    }

    let shipmentPlan = await Shipment.findOne({ region: province }) || await Shipment.findOne({ region: "Other Regions" });
    if (!shipmentPlan) {
      return res.status(400).json({ success: false, msg: "No shipment plan available" });
    }

    let shipmentCost = shipmentPlan.fixedPrice || 500; // Default shipping cost
    let grandTotal = subtotal + shipmentCost;

    const orderTrackingId = generateTrackingId();

    const newOrder = new Order({
      userId,
      name,
      email,
      address,
      province,
      trackingId: orderTrackingId,  // ✅ FIXED: Correctly Assigning Tracking ID
      orderSummary: {
        items: updatedItems,
        subtotal,
        shipment: {
          shippingMethod: shipmentPlan.shippingMethod || "Standard",
          totalShippingCost: shipmentCost,
        },
        grandTotal,
      },
      paymentMethod,
    });

    await newOrder.save();
    await Cart.updateOne({ user: userId }, { $set: { items: [], totalAmount: 0 } });

    await newOrder.populate("orderSummary.items.product");

    // ✅ FIXED: Logging before sending email
    console.log("✅ Order Created Successfully:", newOrder);
    console.log("✅ Tracking ID Before Sending Email:", newOrder.trackingId);

    const orderSummaryEmail = generateOrderSummaryEmail(newOrder);

    try {
      await sendOrderConfirmationEmail(email, "Order Confirmation", orderSummaryEmail);
    } catch (emailError) {
      console.error("❌ Error sending email:", emailError);
    }

    res.status(201).json({
      success: true,
      msg: "Order placed successfully. Confirmation email sent.",
      order: newOrder,
    });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
      error: error.message,
    });
  }
};



// 📦 Get All Orders for a User
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .select("orderSummary.grandTotal paymentMethod createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalOrders = await Order.countDocuments({ userId });

    res.json({
      success: true,
      orders,
      pagination: { totalOrders, currentPage: Number(page), totalPages: Math.ceil(totalOrders / limit) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};
