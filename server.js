require("dotenv").config(); // Load .env variables
const express = require("express");
const bodyParser = require("body-parser");
const ip = require("ip"); // Import IP module
// const errorHandler = require("./middleware/errorHandler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Initialize Stripe

// Connect Application to Database
const connectDB = require("./config/db");

const cors = require("cors");
const userRoutes = require("./routes/api/userRoutes");
const adminRoutes = require("./routes/api/adminRoutes");
const applicationsRoutes = require("./routes/api/applicationRoutes");
const productCategoryRoutes = require("./routes/api/ProductCategoryRoute");
const productRoutes = require("./routes/api/ProductRoutes");
const productActionsRoutes = require("./routes/api/ProductActionsRoutes");
const cartRoutes = require("./routes/api/cartRoutes");
const planRoutes = require("./routes/api/subscriptionPlanRoutes");
const subscriptionRoutes = require("./routes/api/subscriptionRoutes");
const ChatRoutes = require("./routes/api/chatRoutes");
const shipmentRoutes = require("./routes/api/shipmentRoutes");
const checkoutRoutes = require("./routes/api/checkoutRoutes");
const orderRoutes = require("./routes/api/orderRoutes");
const reviewRoutes = require("./routes/api/reviewRoutes");
// const couponsRoutes = require("./routes/api/couponsRoutes");

const app = express();

// app.use(errorHandler);
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(bodyParser.json({ limit: "10mb" })); // to support JSON-encoded bodies
app.use(express.json({ extended: false }));

// for Production
const path = require("path");

// Connect Database
connectDB();

app.use(cors());
// init middleware
// to get data in request.body
app.use(express.json({ extended: false }));

// ******* Routes *******

// Dummy Route
app.get("/", (req, res) => res.send("API Running"));
// Correct  Working path
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/productCategory", productCategoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/products/actions", productActionsRoutes);
app.use("/api/shipment", shipmentRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart/", cartRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/subscription-plans", planRoutes);


// Stripe Payment Intent API
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    console.log("Received payment request:", req.body);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: currency || "pkr",
      payment_method_types: ["card"],
    });

    console.log("Payment Intent Created:", paymentIntent);

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Payment Error:", error);
    res.status(500).json({ error: error.message });
  }
});



// app.use("/api/coupon", couponsRoutes);

// for production
// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  // set static folder
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

// const PORT = process.env.PORT || 5000;
const host = ip.address(); // Auto-detects the system's IP
const port = process.env.PORT || 5000;

app.listen(port, host, () => {
  console.log(`✅ Server running on http://${host}:${port}`);
});
