const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const Shipment = require("../../models/Shipment");
const RegisteredVendors = require("../../models/RegisteredVendors");
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

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      email,
      phoneNumber, 
      address,
      province,
      paymentMethod = "COD",
      message = ""
    } = req.body;

    // ✅ Validation
    if (!name || !email || !address || !province || !phoneNumber) {
      return res.status(400).json({
        success: false,
        msg: "Validation failed",
        errors: [
          !name && { msg: "Name is required", location: "body.name" },
          !email && { msg: "Email is required", location: "body.email" },
          !address && { msg: "Address is required", location: "body.address" },
          !province && { msg: "Province is required", location: "body.province" },
          !phoneNumber && { msg: "Phone number is required", location: "body.phoneNumber" },
        ].filter(Boolean),
      });
    }

    if (!["COD", "CARD"].includes(paymentMethod)) {
      return res.status(400).json({ success: false, msg: "Invalid payment method" });
    }

    // ✅ Fetch Cart
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, msg: "Cart is empty" });
    }

    // ✅ Single Vendor Check
    const vendors = new Set();
    cart.items.forEach(item => {
      if (item.product.vendor) vendors.add(item.product.vendor.toString());
    });

    if (vendors.size > 1) {
      return res.status(400).json({
        success: false,
        msg: "All products in the cart must be from the same vendor to place an order.",
      });
    }

    // ✅ Process Cart Items
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

    // ✅ Shipment Calculation
    let shipmentPlan = await Shipment.findOne({ region: province }) || await Shipment.findOne({ region: "Other Regions" });
    if (!shipmentPlan) {
      return res.status(400).json({ success: false, msg: "No shipment plan available" });
    }

    const shipmentCost = shipmentPlan.fixedPrice || 500;
    const grandTotal = subtotal + shipmentCost;
    const trackingId = generateTrackingId();
    const vendorId = cart.items[0].product.vendor;

    // ✅ Determine Order Status
    const paymentStatus = paymentMethod === "CARD" ? "Paid" : "Unpaid";

    // ✅ Create Order
    const newOrder = new Order({
      userId,
      vendor: vendorId,
      name,
      email,
      phoneNumber,
      address,
      province,
      trackingId,
      message,
      paymentStatus,
      paymentMethod,
      orderSummary: {
        items: updatedItems,
        subtotal,
        shipment: {
          shippingMethod: shipmentPlan.shippingMethod || "Standard",
          totalShippingCost: shipmentCost,
        },
        grandTotal,
      }
    });

    await newOrder.save();

    // ✅ Create Transaction
    const platformFee = parseFloat((grandTotal * 0.20).toFixed(2));
    const vendorEarning = grandTotal - platformFee;

    const newTransaction = new Transaction({
      orderId: newOrder._id,
      vendorId,
      userId,
      subtotal: grandTotal,
      platformFee,
      vendorEarning,
      status: "Pending", // Always pending at creation
      message,
    });

    await newTransaction.save();

    // ✅ Empty Cart
    await Cart.updateOne({ user: userId }, { $set: { items: [], totalAmount: 0 } });

    // ✅ Send Email to User
    await newOrder.populate("orderSummary.items.product");
    const orderSummaryHtml = generateOrderSummaryEmail(newOrder);

    try {
      await sendOrderConfirmationEmail(email, "Order Confirmation", orderSummaryHtml);
    } catch (emailError) {
      console.error("❌ Error sending email to buyer:", emailError);
    }

    // ✅ Send Email to Vendor
    const vendor = await RegisteredVendors.findById(vendorId);
    if (vendor?.email) {
      try {
        await sendOrderConfirmationEmail(
          vendor.email,
          "New Order Received - Planteria",
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #2196F3;">New Order Alert</h2>
            <p>Hello <strong>${vendor.name || "Vendor"}</strong>,</p>
            <p>You have received a new order. Here are the details:</p>
            ${orderSummaryHtml}
          </div>
          `
        );
      } catch (vendorEmailError) {
        console.error("❌ Error sending email to vendor:", vendorEmailError);
      }
    }

    res.status(201).json({
      success: true,
      msg: "Order placed successfully. Confirmation emails sent.",
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


exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const adminId = req.admin.id; // assuming you get admin from auth middleware

    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        msg: `Invalid order status: "${status}". Allowed values: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(orderId).populate("orderSummary.items.product");

    if (!order) {
      return res.status(404).json({ success: false, msg: "Order not found" });
    }

    // 🚀 Log status update before saving
    order.statusLogs.push({
      status,
      updatedAt: new Date(),
      updatedBy: adminId,
    });

    order.orderStatus = status;

    // 💸 Set paymentStatus to Paid if COD and Delivered
    if (status === "Delivered" && order.paymentMethod === "COD") {
      order.paymentStatus = "Paid";
    }

    await order.save();

    // 🌟 Generate Pending Reviews
    if (status === "Delivered") {
      const userId = order.userId;
      const productIds = order.orderSummary.items.map(item => item.product._id.toString());

      for (const productId of productIds) {
        const alreadyReviewed = await Review.exists({ user: userId, product: productId });
        if (!alreadyReviewed) {
          await new Review({
            user: userId,
            product: productId,
            status: "Pending",
          }).save();
        }
      }
    }

    // 📧 Send email
    if (["Shipped", "Delivered"].includes(status)) {
      const emailHtml = generateOrderStatusEmail(order);
      await sendOrderConfirmationEmail(
        order.email,
        `Your order is now ${status}`,
        emailHtml
      );
    }

    res.status(200).json({
      success: true,
      msg: `Order status updated to ${status}`,
      order,
    });

  } catch (error) {
    console.error("❌ Error in updateOrderStatus:", error);
    res.status(500).json({
      success: false,
      msg: "Internal server error while updating order status",
      error: error.message,
    });
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

exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 }) // Sort by latest createdAt
      .select("trackingId orderStatus orderSummary.grandTotal orderSummary.items orderSummary.shipment createdAt")
      .populate({
        path: "orderSummary.items.product",
        select: "name", // Fetch only the product name
      })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(); // Convert Mongoose documents to plain objects

    const formattedOrders = orders.map(order => ({
      id: order._id,
      trackingId: order.trackingId,
      orderStatus: order.orderStatus,
      orderDate: order.createdAt, // Include createdAt as orderDate
      grandTotal: order.orderSummary.grandTotal,
      shipment: {
        shippingMethod: order.orderSummary.shipment.shippingMethod,
        totalShippingCost: order.orderSummary.shipment.totalShippingCost,
      },
      products: order.orderSummary.items.map(item => ({
        productId: item.product?._id || null,
        name: item.product?.name || "Unknown Product",
        quantity: item.quantity
      }))
    }));

    const totalOrders = await Order.countDocuments({ userId });

    res.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        totalOrders,
        currentPage: Number(page),
        totalPages: Math.ceil(totalOrders / limit)
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};


// GET ADMIN ALL ORDERS
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const orders = await Order.find()
      .sort({ createdAt: -1 }) // Sort by latest createdAt
      .select("trackingId orderStatus orderSummary.grandTotal orderSummary.items orderSummary.shipment createdAt")
      .populate({
        path: "orderSummary.items.product",
        select: "name", // Fetch only the product name
      })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(); // Convert Mongoose documents to plain objects

    const formattedOrders = orders.map(order => ({
      id: order._id,
      trackingId: order.trackingId,
      orderStatus: order.orderStatus,
      orderDate: order.createdAt, // Include createdAt as orderDate
      grandTotal: order.orderSummary.grandTotal,
      shipment: {
        shippingMethod: order.orderSummary.shipment.shippingMethod,
        totalShippingCost: order.orderSummary.shipment.totalShippingCost,
      },
      products: order.orderSummary.items.map(item => ({
        productId: item.product?._id || null,
        name: item.product?.name || "Unknown Product",
        quantity: item.quantity
      }))
    }));

    const totalOrders = await Order.countDocuments();

    res.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        totalOrders,
        currentPage: Number(page),
        totalPages: Math.ceil(totalOrders / limit)
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

exports.getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params; // Get status from URL params
    // res.json({ success: true, msg: "Status", status });

    // Define allowed statuses
    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

    // Validate order status
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid order status. Allowed values: Pending, Processing, Shipped, Delivered, Cancelled",
      });
    }

    // Fetch orders with the given status
    const orders = await Order.find({ orderStatus: status })
      .sort({ createdAt: -1 })
      .select("trackingId orderStatus orderSummary.grandTotal orderSummary.items orderSummary.shipment createdAt")
      .populate({
        path: "orderSummary.items.product",
        select: "name",
      })
      .lean(); // Convert Mongoose documents to plain objects

    // Format the response
    const formattedOrders = orders.map(order => ({
      id: order._id,
      trackingId: order.trackingId,
      orderStatus: order.orderStatus,
      orderDate: order.createdAt,
      grandTotal: order.orderSummary.grandTotal,
      shipment: {
        shippingMethod: order.orderSummary.shipment?.shippingMethod || "N/A",
        totalShippingCost: order.orderSummary.shipment?.totalShippingCost || 0,
      },
      products: order.orderSummary.items.map(item => ({
        productId: item.product?._id || null,
        name: item.product?.name || "Unknown Product",
        quantity: item.quantity,
      })),
    }));

    const totalOrders = await Order.countDocuments({ orderStatus: status });

    res.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        totalOrders,
        currentPage: 1, // Just show the first page since pagination is removed
        totalPages: 1,   // Assuming no pagination for now
      },
    });
  } catch (error) {
    console.error("Error fetching orders by status:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};


// ✅ Get Order by ID with Detailed Information
exports.getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, userId })
      .select("trackingId orderSummary.grandTotal orderSummary.items orderSummary.shipment paymentMethod orderStatus createdAt")
      .populate({
        path: "orderSummary.items.product",
        select: "name price image"
      })
      .lean(); // Convert Mongoose document to plain object

    if (!order) {
      return res.status(404).json({ success: false, msg: "Order not found" });
    }

    res.json({
      success: true,
      order: {
        id: order._id,
        trackingId: order.trackingId,
        orderDate: order.createdAt, // Renamed for consistency
        grandTotal: order.orderSummary.grandTotal,
        paymentMethod: order.paymentMethod,
        status: order.orderStatus,
        shipment: {
          shippingMethod: order.orderSummary.shipment.shippingMethod,
          totalShippingCost: order.orderSummary.shipment.totalShippingCost,
        },
        items: order.orderSummary.items.map(item => ({
          productId: item.product?._id || null,
          name: item.product?.name || "Unknown Product",
          price: item.product?.price || 0,
          quantity: item.quantity,
          image: item.product?.image || null,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

// ✅ Get Order by ID with Detailed Information
exports.getOrderByIdAdmin = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId })
      .select("trackingId orderSummary.grandTotal orderSummary.items orderSummary.shipment paymentMethod orderStatus createdAt")
      .populate({
        path: "orderSummary.items.product",
        select: "name price image"
      })
      .lean(); // Convert Mongoose document to plain object

    if (!order) {
      return res.status(404).json({ success: false, msg: "Order not found" });
    }

    res.json({
      success: true,
      order: {
        id: order._id,
        trackingId: order.trackingId,
        orderDate: order.createdAt, // Renamed for consistency
        grandTotal: order.orderSummary.grandTotal,
        paymentMethod: order.paymentMethod,
        status: order.orderStatus,
        shipment: {
          shippingMethod: order.orderSummary.shipment.shippingMethod,
          totalShippingCost: order.orderSummary.shipment.totalShippingCost,
        },
        items: order.orderSummary.items.map(item => ({
          productId: item.product?._id || null,
          name: item.product?.name || "Unknown Product",
          price: item.product?.price || 0,
          quantity: item.quantity,
          image: item.product?.image || null,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

exports.getCurrentOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Fetch orders with statuses "Pending", "Processing", "Shipped"
    const orders = await Order.find({
      userId,
      orderStatus: { $in: ["Pending", "Processing", "Shipped"] }
    })
      .sort({ createdAt: -1 }) // Sort by latest createdAt
      .select("trackingId orderStatus orderSummary.grandTotal orderSummary.items orderSummary.shipment createdAt")
      .populate({
        path: "orderSummary.items.product",
        select: "name", // Fetch only the product name
      })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(); // Convert Mongoose documents to plain objects

    const formattedOrders = orders.map(order => ({
      id: order._id,
      trackingId: order.trackingId,
      orderStatus: order.orderStatus,
      orderDate: order.createdAt, // Include createdAt as orderDate
      grandTotal: order.orderSummary.grandTotal,
      shipment: {
        shippingMethod: order.orderSummary.shipment?.shippingMethod || "N/A",
        totalShippingCost: order.orderSummary.shipment?.totalShippingCost || 0,
      },
      products: order.orderSummary.items.map(item => ({
        productId: item.product?._id || null,
        name: item.product?.name || "Unknown Product",
        quantity: item.quantity
      }))
    }));

    // Count total orders based on applied filter (statuses "Pending", "Processing", "Shipped")
    const totalOrders = await Order.countDocuments({
      userId,
      orderStatus: { $in: ["Pending", "Processing", "Shipped"] }
    });

    res.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        totalOrders,
        currentPage: Number(page),
        totalPages: Math.ceil(totalOrders / limit)
      },
    });
  } catch (error) {
    console.error("Error fetching current orders:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};





// ✅ Get Total Orders Count
exports.getTotalOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const totalOrders = await Order.countDocuments({ userId });

    res.json({ success: true, totalOrders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};



exports.getSubmittedOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Fetch orders except "Delivered" and "Pending"
    const orders = await Order.find({
      userId,
      orderStatus: "Delivered"
    })
      .sort({ createdAt: -1 }) // Sort by latest createdAt
      .select("trackingId orderStatus orderSummary.grandTotal orderSummary.items orderSummary.shipment createdAt")
      .populate({
        path: "orderSummary.items.product",
        select: "name", // Fetch only the product name
      })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(); // Convert Mongoose documents to plain objects

    const formattedOrders = orders.map(order => ({
      id: order._id,
      trackingId: order.trackingId,
      orderStatus: order.orderStatus,
      orderDate: order.createdAt, // Include createdAt as orderDate
      grandTotal: order.orderSummary.grandTotal,
      shipment: {
        shippingMethod: order.orderSummary.shipment.shippingMethod,
        totalShippingCost: order.orderSummary.shipment.totalShippingCost,
      },
      products: order.orderSummary.items.map(item => ({
        productId: item.product?._id || null,
        name: item.product?.name || "Unknown Product",
        quantity: item.quantity
      }))
    }));

    // Count total orders based on applied filter (excluding "Delivered" & "Pending")
    const totalOrders = await Order.countDocuments({
      userId,
      orderStatus: { $nin: ["Delivered", "Pending"] }
    });

    res.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        totalOrders,
        currentPage: Number(page),
        totalPages: Math.ceil(totalOrders / limit)
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};


exports.getAllOrdersVendor = async (req, res) => {
  try {
    const vendorId = req.vendor.id;

    const orders = await Order.find({ vendor: vendorId })
      .populate("userId", "name email") // buyer info
      .populate("orderSummary.items.product", "title price") // product info
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      msg: "Orders fetched successfully",
      orders,
    });

  } catch (error) {
    console.error("❌ Error fetching vendor orders:", error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
      error: error.message,
    });
  }
};


exports.getAllOrdersVendorForAdmin = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;

    const orders = await Order.find({ vendor: vendorId })
      .populate("userId", "name email") // buyer info
      .populate("orderSummary.items.product", "title price") // product info
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      msg: "Orders fetched successfully",
      orders,
    });

  } catch (error) {
    console.error("❌ Error fetching vendor orders:", error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
      error: error.message,
    });
  }
};

exports.getOrderByIdVendor = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("userId", "name email")
      .populate("orderSummary.items.product", "title price");

    if (!order) {
      return res.status(404).json({
        success: false,
        msg: "Order not found",
      });
    }

    // ✅ Check if order belongs to the current vendor
    if (order.vendor.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        msg: "Unauthorized access. This order does not belong to you.",
      });
    }

    res.status(200).json({
      success: true,
      msg: "Order fetched successfully",
      order,
    });

  } catch (error) {
    console.error("❌ Error fetching order by ID:", error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
      error: error.message,
    });
  }
};

exports.getOrdersByStatusVendor = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { status } = req.params;

    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

    // ✅ Validate status
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid order status",
      });
    }

    // ✅ Find orders matching vendor & status
    const orders = await Order.find({ vendor: vendorId, orderStatus: status })
      .populate("userId", "name email")
      .populate("orderSummary.items.product", "title price");

    res.status(200).json({
      success: true,
      msg: `Orders with status '${status}' fetched successfully`,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("❌ Error fetching orders by status:", error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
      error: error.message,
    });
  }
};

exports.updateOrderStatusVendor = async (req, res) => {
  try {
    const vendorId = req.vendor.id;  // The vendor ID from the auth token
    const { orderId } = req.params;
    const { status } = req.body;
    // console.log(req.params)
    // console.log(req.body)
    // Allowed order status updates
    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, msg: "Invalid order status" });
    }

    // ✅ Find the order and check if it belongs to the vendor
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, msg: "Order not found" });
    }

    if (order.vendor.toString() !== vendorId) {
      return res.status(403).json({ success: false, msg: "You are not authorized to update this order" });
    }

    // Update order status
    order.orderStatus = status;
    await order.save();

    // 📧 Send email notifications ONLY for "Shipped" and "Delivered"
    if (status === "Shipped" || status === "Delivered") {
      const emailHtml = generateOrderStatusEmail(order); // Make sure to have this email HTML generator
      await sendOrderConfirmationEmail(order.email, `Your order is now ${status}. Please leave us a review!`, emailHtml);
    }

    res.status(200).json({
      success: true,
      msg: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    res.status(500).json({
      success: false,
      msg: "Internal server error",
      error: error.message,
    });
  }
};