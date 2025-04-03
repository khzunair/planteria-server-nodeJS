const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const Shipment = require("../../models/Shipment");
const Transaction = require("../../models/Transaction");
const Review = require("../../models/Review");
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
    if (req.body.paymentMethod !== "COD" && req.body.paymentMethod !== "CARD") {
      return res.status(400).json({ success: false, msg: "Invalid payment method" });
    }
    // if (req.body.paymentMethod === "COD") {
    //   return res.status(200).json({ success: true, msg: "payment method" });
    // }
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

    // soon need to add verification setup where if the payment is from card then it do validates
    const transactionStatus = paymentMethod === "CARD" ? "Completed" : "Pending";

    const newTransaction = new Transaction({
      order: newOrder._id,
      paymentMethod : req.body.paymentMethod,
      amount : grandTotal,
      status : transactionStatus
    });

    await newTransaction.save();
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


// ✅ Update Order Status (Admin Only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Allowed order status updates
    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, msg: "Invalid order status" });
    }

    // Find the order
    let order = await Order.findById(orderId).populate("orderSummary.items.product");
    if (!order) {
      return res.status(404).json({ success: false, msg: "Order not found" });
    }

    order.orderStatus = status;
    await order.save();

    // If order is delivered, create pending reviews for each product
    if (status === "Delivered") {
      const userId = order.userId;
      const products = order.orderSummary.items.map(item => item.product._id);

      for (const productId of products) {
        const existingReview = await Review.findOne({ user: userId, product: productId });
        if (!existingReview) {
          const newReview = new Review({
            user: userId,
            product: productId,
            status: "Pending", // Default status
          });
          await newReview.save();
        }
      }
    }

    // 📧 Send email notifications ONLY for "Shipped" and "Delivered"
    if (status === "Shipped" || status === "Delivered") {
      const emailHtml = generateOrderStatusEmail(order);
      await sendOrderConfirmationEmail(order.email, `Your order is now ${status}. Please leave us a review!`, emailHtml);
    }

    res.status(200).json({ success: true, msg: "Order status updated successfully", order });
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    res.status(500).json({ success: false, msg: "Internal server error", error: error.message });
  }
};

// ✅ Generate Email Content for "Shipped" and "Delivered"
const generateOrderStatusEmail = (order) => {
  let emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #4CAF50;">Planteria - Order Update</h2>
      <p>Dear <strong>${order.name}</strong>,</p>
  `;

  if (order.orderStatus === "Shipped") {
    emailContent += `
      <p>Your order is now <strong style="color: #FF5733;">out for delivery</strong>.</p>
      <p>Tracking ID: <strong>${order.trackingId}</strong></p>
      <p>You can track your order <a href="https://yourwebsite.com/track?trackingId=${order.trackingId}" style="color: #fff; background-color: #4CAF50; padding: 10px 20px; text-decoration: none; border-radius: 5px;">here</a>.</p>
    `;
  } else if (order.orderStatus === "Delivered") {
    emailContent += `
      <p>Your order has been <strong style="color: #4CAF50;">delivered</strong>! 🎉</p>
      <p>We would love to hear your feedback. Please leave a review:</p>
      <p><a href="https://yourwebsite.com/review?orderId=${order._id}" style="color: #fff; background-color: #FF5733; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Leave a Review</a></p>
    `;
  }

  emailContent += `
      <p>Thank you for shopping with Planteria!</p>
      <p><strong>- The Planteria Team</strong></p>
    </div>
  `;

  return emailContent;
};

// 🟢 Get Order Status & Summary
exports.getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Find order and populate products
    const order = await Order.findById(orderId)
      .populate("orderSummary.items.product", "name") // Only fetch product names
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, msg: "Order not found" });
    }

    // Construct order summary
    const orderSummary = {
      items: order.orderSummary.items.map(item => ({
        name: item.product?.name || "Unknown Product",
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.orderSummary.subtotal,
      shipping: order.orderSummary.shipment.totalShippingCost,
      grandTotal: order.orderSummary.grandTotal,
      trackingId: order.trackingId,
      orderStatus: order.orderStatus,
      estimatedDelivery: order.estimatedDelivery,
      trackingUrl: `https://yourwebsite.com/track?orderId=${orderId}`,
    };

    return res.status(200).json({
      success: true,
      msg: "Order status retrieved successfully",
      order: orderSummary,
    });
  } catch (error) {
    console.error("Error fetching order status:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
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
